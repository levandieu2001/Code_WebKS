package vn.baynuistay.feature.booking.ui

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import vn.baynuistay.core.network.ApiError
import vn.baynuistay.core.network.MyBookingDto
import vn.baynuistay.core.network.PaymentDto
import vn.baynuistay.core.notify.AppNotifier
import vn.baynuistay.core.network.TrackResponse
import vn.baynuistay.feature.booking.data.MyBookingsRepository
import vn.baynuistay.core.ui.lang.AppLangHolder.pick

data class MyBookingsUiState(
    val phone: String = "",
    val loading: Boolean = false,
    val searched: Boolean = false,
    val bookings: List<MyBookingDto> = emptyList(),
    val error: String? = null,
    val notice: String? = null,
    // Bám đường theo id đơn — chỉ đơn đặt xe mới có
    val tracks: Map<String, TrackResponse> = emptyMap(),
    val cancelling: String? = null,
    // Đang xem bản lưu trên máy vì không gọi được máy chủ
    val offline: Boolean = false,
    // Đặt cọc: id đơn đang mở khối thanh toán, và dữ liệu lấy về
    val payingId: String? = null,
    val payment: PaymentDto? = null,
    val paymentLoading: Boolean = false,
    // Đánh giá: id đơn đang mở khối đánh giá
    val reviewingId: String? = null,
    val reviewSending: Boolean = false,
)

/**
 * Màn "Đơn của tôi" trên app, ghép đúng dữ liệu của trang /donhang.html trên web.
 *
 * Điểm quan trọng: khi trong danh sách có cuốc xe đang chạy thì cứ 15 giây hỏi
 * lại vị trí xe một lần — đó là thứ khách mở app ra để xem. Vòng lặp này dừng
 * ngay khi không còn chuyến nào đang chạy, để đỡ tốn pin và tốn 4G của khách.
 */
@HiltViewModel
class MyBookingsViewModel @Inject constructor(
    private val repository: MyBookingsRepository,
    @ApplicationContext private val appContext: Context,
) : ViewModel() {

    private val _state = MutableStateFlow(MyBookingsUiState())
    val state: StateFlow<MyBookingsUiState> = _state.asStateFlow()

    private var pollJob: Job? = null
    private var notifyJob: Job? = null

    // Thông báo đã kêu rồi thì thôi, không dội lại mỗi lần hỏi máy chủ
    private val seenNotificationIds = mutableSetOf<String>()

    init {
        viewModelScope.launch {
            val saved = repository.savedPhone()
            if (saved.isNotBlank()) _state.update { it.copy(phone = saved) }
            // Đăng nhập rồi thì khỏi phải gõ gì, tải luôn
            if (repository.isSignedIn()) loadSignedIn() else if (saved.isNotBlank()) search()
        }
    }

    fun onPhoneChange(value: String) {
        _state.update { it.copy(phone = value.filter { c -> c.isDigit() }.take(11), error = null) }
    }

    /**
     * Gộp đơn gắn với tài khoản và đơn đặt bằng số điện thoại đã nhớ.
     *
     * Phải gộp chứ không thể chọn một: rất nhiều khách đặt xe lúc chưa đăng
     * nhập rồi mới tạo tài khoản sau, hoặc đăng nhập bằng tài khoản đối tác
     * nhưng vẫn tự đặt phòng cho mình. Chỉ lấy một nguồn là mất đơn của họ.
     */
    private fun loadSignedIn() {
        viewModelScope.launch {
            _state.update { it.copy(loading = true, error = null) }

            val account = runCatching { repository.mine() }
            val phone = _state.value.phone
            val byPhone = if (phone.length >= 9) runCatching { repository.lookup(phone) } else null

            if (account.isFailure && byPhone?.isSuccess != true) {
                // Token Firebase hết hạn sau ~1 giờ và app chưa có cơ chế làm mới.
                // Thay vì để màn hình trống, cho khách xem bản lưu trên máy.
                fallbackToCache(ApiError.message(account.exceptionOrNull()!!))
                return@launch
            }

            val merged = (account.getOrDefault(emptyList()) + byPhone?.getOrDefault(emptyList()).orEmpty())
                .distinctBy { it.id }
                .sortedByDescending { it.createdAt }
            finish(merged, fromPhone = false)
        }
    }

    fun search() {
        val phone = _state.value.phone
        if (phone.length < 9) {
            _state.update { it.copy(error = pick(
                "Nhập số điện thoại đã dùng khi đặt (10 số).",
                "Enter the 10-digit phone number you booked with.",
            )) }
            return
        }
        viewModelScope.launch {
            _state.update { it.copy(loading = true, error = null, notice = null) }
            runCatching { repository.lookup(phone) }
                .onSuccess { rows -> finish(rows) }
                .onFailure { err -> fallbackToCache(ApiError.message(err)) }
        }
    }

    /**
     * @param fromPhone true khi khách vừa bấm tra theo số. Phân biệt để không
     * báo "không tìm thấy đơn nào với số này" ngay lúc mới mở màn hình, khi
     * khách còn chưa gõ số nào cả.
     */
    private fun finish(rows: List<MyBookingDto>, fromPhone: Boolean = true) {
        _state.update {
            it.copy(
                loading = false,
                searched = true,
                offline = false,
                bookings = rows,
                notice = if (rows.isEmpty() && fromPhone) pick(
                    "Không tìm thấy đơn nào với số này.",
                    "No bookings found for that number.",
                ) else null,
            )
        }
        startPolling()
        startNotifications()
    }

    /**
     * Mất mạng thì vẫn cho khách xem đơn đã đặt trên máy này — nhưng nói thẳng
     * đây là bản lưu, vì trạng thái duyệt có thể đã đổi bên homestay.
     */
    private suspend fun fallbackToCache(message: String) {
        val cached = runCatching { repository.cached() }.getOrDefault(emptyList())
        if (cached.isEmpty()) {
            _state.update { it.copy(loading = false, searched = true, error = message) }
            return
        }
        _state.update {
            it.copy(
                loading = false,
                searched = true,
                offline = true,
                error = null,
                notice = message + pick(
                    " Đang xem bản lưu trên máy, trạng thái có thể chưa mới nhất.",
                    " Showing the copy saved on this phone; the status may be out of date.",
                ),
                tracks = emptyMap(),
                bookings = cached.map { o ->
                    MyBookingDto(
                        id = o.id,
                        code = o.id.takeLast(8).uppercase(),
                        kind = o.kind,
                        summary = o.summary,
                        status = o.status,
                        statusLabel = when (o.status) {
                            "confirmed" -> pick("Đã xác nhận", "Confirmed")
                            "completed" -> pick("Đã hoàn thành", "Completed")
                            "cancelled" -> pick("Đã huỷ", "Cancelled")
                            else -> pick("Chờ xác nhận", "Awaiting confirmation")
                        },
                        totalPrice = o.totalPrice.toLong(),
                        checkIn = o.checkIn,
                        checkOut = o.checkOut,
                        guestName = o.guestName,
                        phone = o.phone,
                        // Không có mạng thì không huỷ được — đừng bày nút bấm vô ích
                        canCancel = false,
                    )
                },
            )
        }
    }

    fun cancel(booking: MyBookingDto, reason: String = "Khách tự huỷ trên app") {
        viewModelScope.launch {
            _state.update { it.copy(cancelling = booking.id) }
            runCatching { repository.cancel(booking.id, _state.value.phone.ifBlank { booking.phone }, reason) }
                .onSuccess { msg ->
                    _state.update { it.copy(cancelling = null, notice = msg.ifBlank { pick("Đã huỷ đơn.", "Booking cancelled.") }) }
                    // Tải lại để trạng thái trên app khớp với admin và bên đối tác
                    if (repository.isSignedIn()) loadSignedIn() else search()
                }
                .onFailure { err ->
                    _state.update { it.copy(cancelling = null, error = ApiError.message(err)) }
                }
        }
    }

    /** Hỏi vị trí xe cho những cuốc đang chạy, 15 giây/lần. */
    private fun startPolling() {
        pollJob?.cancel()
        val rides = _state.value.bookings.filter {
            it.kind == "transport" && it.status in setOf("pending", "confirmed")
        }
        if (rides.isEmpty()) {
            _state.update { it.copy(tracks = emptyMap()) }
            return
        }
        pollJob = viewModelScope.launch {
            while (isActive) {
                val fresh = mutableMapOf<String, TrackResponse>()
                for (ride in rides) {
                    runCatching { repository.track(ride.id) }
                        .getOrNull()
                        ?.takeIf { it.tracking }
                        ?.let { fresh[ride.id] = it }
                }
                _state.update { it.copy(tracks = fresh) }
                delay(15_000)
            }
        }
    }

    // ── Đặt cọc ──────────────────────────────────────────────
    fun togglePayment(booking: MyBookingDto) {
        if (_state.value.payingId == booking.id) {
            _state.update { it.copy(payingId = null, payment = null) }
            return
        }
        viewModelScope.launch {
            _state.update { it.copy(payingId = booking.id, payment = null, paymentLoading = true) }
            runCatching { repository.payment(booking.id, _state.value.phone.ifBlank { booking.phone }) }
                .onSuccess { p -> _state.update { it.copy(payment = p, paymentLoading = false) } }
                .onFailure { e ->
                    _state.update {
                        it.copy(paymentLoading = false, payingId = null, error = ApiError.message(e))
                    }
                }
        }
    }

    fun claimPaid(booking: MyBookingDto) {
        viewModelScope.launch {
            _state.update { it.copy(paymentLoading = true) }
            runCatching { repository.claimPayment(booking.id, _state.value.phone.ifBlank { booking.phone }) }
                .onSuccess { msg ->
                    _state.update {
                        it.copy(paymentLoading = false, payingId = null, payment = null, notice = msg)
                    }
                    reload()
                }
                .onFailure { e -> _state.update { it.copy(paymentLoading = false, error = ApiError.message(e)) } }
        }
    }

    // ── Đánh giá ─────────────────────────────────────────────
    fun toggleReview(booking: MyBookingDto) {
        _state.update { it.copy(reviewingId = if (it.reviewingId == booking.id) null else booking.id) }
    }

    fun sendReview(booking: MyBookingDto, rating: Int, comment: String) {
        val target = booking.reviewTargets.firstOrNull() ?: return
        viewModelScope.launch {
            _state.update { it.copy(reviewSending = true) }
            runCatching {
                repository.review(
                    bookingId = booking.id,
                    phone = _state.value.phone.ifBlank { booking.phone },
                    targetType = target.type,
                    targetId = target.id,
                    rating = rating,
                    comment = comment,
                )
            }
                .onSuccess { msg ->
                    _state.update { it.copy(reviewSending = false, reviewingId = null, notice = msg) }
                    reload()
                }
                .onFailure { e -> _state.update { it.copy(reviewSending = false, error = ApiError.message(e)) } }
        }
    }

    private fun reload() {
        viewModelScope.launch {
            if (repository.isSignedIn()) loadSignedIn() else search()
        }
    }

    // ── Thông báo ────────────────────────────────────────────
    // Hỏi máy chủ 25 giây một lần rồi tự bắn thông báo tại máy, nên khách vẫn
    // biết tài xế đã nhận chuyến dù đang mở app làm việc khác.
    private fun startNotifications() {
        notifyJob?.cancel()
        val phone = _state.value.phone
        if (phone.length < 9) return
        notifyJob = viewModelScope.launch {
            while (isActive) {
                runCatching { repository.notifications(phone) }
                    .getOrNull()
                    ?.data
                    ?.filter { !it.read && it.id !in seenNotificationIds }
                    ?.forEach { n ->
                        seenNotificationIds += n.id
                        AppNotifier.show(appContext, n.title, n.body, urgent = false, key = n.id)
                    }
                delay(25_000)
            }
        }
    }

    fun dismissNotice() = _state.update { it.copy(notice = null, error = null) }

    override fun onCleared() {
        pollJob?.cancel()
        notifyJob?.cancel()
        super.onCleared()
    }
}
