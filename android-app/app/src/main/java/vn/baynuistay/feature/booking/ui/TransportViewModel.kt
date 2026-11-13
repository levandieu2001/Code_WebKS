package vn.baynuistay.feature.booking.ui

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import vn.baynuistay.core.network.ApiError
import vn.baynuistay.core.network.DispatchStatusDto
import vn.baynuistay.core.network.PoolCheckRequest
import vn.baynuistay.core.network.PoolCheckResponse
import vn.baynuistay.core.network.TransportQuoteDto
import vn.baynuistay.core.ui.components.tomorrow
import vn.baynuistay.core.location.LocationProvider
import vn.baynuistay.feature.booking.data.BookingRepository
import vn.baynuistay.core.ui.lang.AppLangHolder.pick

val PICKUP_SUGGESTIONS = listOf(
    "Châu Đốc", "Long Xuyên", "Tịnh Biên", "Tri Tôn", "Cần Thơ", "TP.HCM",
)

data class TransportUiState(
    val pickup: String = "Châu Đốc",
    val dropoff: String = "LOCALMATE, Núi Cấm",
    val pickupLat: Double? = null,
    val pickupLng: Double? = null,
    val locating: Boolean = false,
    val pickupNote: String? = null,
    val date: String = tomorrow(),
    val time: String = "08:00",
    val roundTrip: Boolean = false,
    val returnDate: String = tomorrow(),
    val returnTime: String = "16:00",
    val seats: Int = 2,
    val searching: Boolean = false,
    val quotes: List<TransportQuoteDto> = emptyList(),
    val distanceKm: Int = 0,
    val searchError: String? = null,
    val selectedQuote: TransportQuoteDto? = null,
    // Có khách khác đi cùng tuyến để ghép chuyến không
    val pool: PoolCheckResponse? = null,
    val poolAccepted: Boolean = false,
    val guestName: String = "",
    val phone: String = "",
    val note: String = "",
    val submitting: Boolean = false,
    val formError: String? = null,
    val success: BookingSuccess? = null,
    // Theo dõi hệ thống gọi tài xế sau khi đặt xong
    val dispatch: DispatchStatusDto? = null,
    val retrying: Boolean = false,
)

@HiltViewModel
class TransportViewModel @Inject constructor(
    private val repository: BookingRepository,
    private val locationProvider: LocationProvider,
    savedStateHandle: SavedStateHandle,
) : ViewModel() {
    // Mở từ một dòng trong lịch trình thì điền sẵn điểm đón/điểm đến
    private val _state = MutableStateFlow(
        TransportUiState().let { base ->
            val pickup = savedStateHandle.get<String>("pickup").orEmpty()
            val dropoff = savedStateHandle.get<String>("dropoff").orEmpty()
            base.copy(
                pickup = pickup.ifBlank { base.pickup },
                dropoff = dropoff.ifBlank { base.dropoff },
            )
        },
    )
    val state: StateFlow<TransportUiState> = _state.asStateFlow()

    fun setPickup(value: String) = _state.update {
        // Sửa địa chỉ bằng tay thì toạ độ GPS cũ không còn khớp nữa
        it.copy(pickup = value, pickupLat = null, pickupLng = null, pickupNote = null, quotes = emptyList())
    }

    fun setRoundTrip(value: Boolean) = _state.update {
        it.copy(roundTrip = value, returnDate = maxOf(it.returnDate, it.date))
    }
    fun setReturnDate(value: String) = _state.update { it.copy(returnDate = value) }
    fun setReturnTime(value: String) = _state.update { it.copy(returnTime = value) }
    fun setDate(value: String) = _state.update {
        it.copy(date = value, returnDate = maxOf(it.returnDate, value))
    }
    fun setTime(value: String) = _state.update { it.copy(time = value) }
    fun setSeats(value: Int) = _state.update { it.copy(seats = value, quotes = emptyList()) }
    fun setGuestName(value: String) = _state.update { it.copy(guestName = value) }
    fun setPhone(value: String) = _state.update { it.copy(phone = value) }
    fun setNote(value: String) = _state.update { it.copy(note = value) }

    fun selectQuote(quote: TransportQuoteDto) {
        _state.update { it.copy(selectedQuote = quote, formError = null, pool = null, poolAccepted = false) }
        checkPool(quote)
    }

    /** Hỏi server xem có ai đi cùng tuyến, cùng khung giờ không. */
    private fun checkPool(quote: TransportQuoteDto) {
        val s = _state.value
        viewModelScope.launch {
            val res = runCatching {
                repository.poolCheck(
                    PoolCheckRequest(
                        date = s.date,
                        time = s.time,
                        pickup = s.pickup,
                        pickupLat = s.pickupLat,
                        pickupLng = s.pickupLng,
                        dropoff = s.dropoff,
                        seats = s.seats,
                        vehicleType = quote.vehicleType,
                        price = quote.price,
                    ),
                )
            }.getOrNull()
            if (res?.available == true) _state.update { it.copy(pool = res) }
        }
    }

    fun setPoolAccepted(value: Boolean) = _state.update { it.copy(poolAccepted = value) }

    fun dismissSheet() = _state.update { it.copy(selectedQuote = null, formError = null) }
    fun dismissSuccess() {
        dispatchJob?.cancel(); dispatchJob = null
        _state.update { it.copy(success = null, dispatch = null) }
    }

    // ── Theo dõi "đang tìm tài xế" ──
    private var dispatchJob: Job? = null

    /**
     * Hỏi server 4 giây/lần xem đã có tài xế nhận chưa. Dừng khi có người nhận,
     * hoặc khi hệ thống tìm đủ 10 phút mà không ai nhận (state = timeout).
     */
    private fun watchDispatch(bookingId: String) {
        dispatchJob?.cancel()
        dispatchJob = viewModelScope.launch {
            while (isActive) {
                val status = runCatching { repository.dispatchStatus(bookingId) }.getOrNull()
                if (status != null) {
                    _state.update { it.copy(dispatch = status) }
                    if (status.state == "accepted" || status.state == "timeout") return@launch
                }
                delay(4_000)
            }
        }
    }

    /** Khách bấm "Tìm lại tài xế" sau khi hệ thống báo không tìm được. */
    fun retryDriver() {
        val bookingId = _state.value.success?.id ?: return
        if (_state.value.retrying) return
        viewModelScope.launch {
            _state.update { it.copy(retrying = true) }
            val status = runCatching { repository.retryDriver(bookingId) }.getOrNull()
            _state.update { it.copy(retrying = false, dispatch = status ?: it.dispatch) }
            watchDispatch(bookingId)
        }
    }

    override fun onCleared() {
        dispatchJob?.cancel()
        super.onCleared()
    }

    /** Lấy vị trí hiện tại rồi đổi thành địa chỉ để điền vào ô điểm đón. */
    fun useMyLocation() {
        if (_state.value.locating) return
        if (!locationProvider.hasPermission()) {
            _state.update { it.copy(pickupNote = pick(
                "Bạn cần cho phép truy cập vị trí, hoặc nhập địa chỉ đón bằng tay.",
                "Allow location access, or type the pick-up address yourself.",
            )) }
            return
        }
        viewModelScope.launch {
            _state.update { it.copy(locating = true, pickupNote = pick("Đang lấy vị trí của bạn…", "Getting your location…")) }
            val location = locationProvider.current()
            if (location == null) {
                _state.update {
                    it.copy(locating = false, pickupNote = pick(
                        "Không lấy được vị trí (GPS có thể đang tắt). Bạn nhập địa chỉ giúp mình nhé.",
                        "Could not get your location (GPS may be off). Please type the address.",
                    ))
                }
                return@launch
            }
            runCatching { repository.reverseGeocode(location.latitude, location.longitude) }
                .onSuccess { geo ->
                    _state.update {
                        it.copy(
                            locating = false,
                            pickup = geo.shortName.ifBlank { geo.address },
                            pickupLat = location.latitude,
                            pickupLng = location.longitude,
                            pickupNote = pick(
                                "Đã lấy vị trí — cách homestay khoảng ${geo.distanceToHomeKm} km. Bạn có thể sửa lại cho chính xác hơn.",
                                "Location found — about ${geo.distanceToHomeKm} km from the homestay. You can refine it.",
                            ),
                            quotes = emptyList(),
                        )
                    }
                    search()
                }
                .onFailure {
                    _state.update {
                        it.copy(locating = false, pickupNote = pick(
                            "Không đọc được địa chỉ. Bạn nhập tay giúp mình nhé.",
                            "Could not read that address. Please type it in.",
                        ))
                    }
                }
        }
    }

    fun search() {
        val current = _state.value
        if (current.searching) return
        viewModelScope.launch {
            _state.update { it.copy(searching = true, searchError = null) }
            runCatching { repository.transportQuotes(current.pickup, current.seats, current.pickupLat, current.pickupLng, current.dropoff) }
                .onSuccess { response ->
                    _state.update {
                        it.copy(
                            searching = false,
                            quotes = response.data,
                            distanceKm = response.route.distanceKm,
                        )
                    }
                }
                .onFailure { error ->
                    _state.update { it.copy(searching = false, searchError = ApiError.message(error)) }
                }
        }
    }

    fun submit() {
        val current = _state.value
        val quote = current.selectedQuote ?: return
        if (current.submitting) return

        validate(current.guestName, current.phone)?.let { message ->
            _state.update { it.copy(formError = message) }
            return
        }

        viewModelScope.launch {
            _state.update { it.copy(submitting = true, formError = null) }
            runCatching {
                repository.bookTransport(
                    quote = quote,
                    pickup = current.pickup,
                    dropoff = current.dropoff,
                    date = current.date,
                    time = current.time,
                    seats = current.seats,
                    pickupLat = current.pickupLat,
                    pickupLng = current.pickupLng,
                    roundTrip = current.roundTrip,
                    pool = current.poolAccepted,
                    returnDate = if (current.roundTrip) current.returnDate else null,
                    returnTime = if (current.roundTrip) current.returnTime else null,
                    guestName = current.guestName.trim(),
                    phone = current.phone.trim(),
                    note = current.note.trim(),
                )
            }.onSuccess { result ->
                _state.update {
                    it.copy(
                        submitting = false,
                        selectedQuote = null,
                        guestName = "",
                        phone = "",
                        note = "",
                        success = BookingSuccess(
                            id = result.data.id,
                            code = result.data.code,
                            summary = result.data.summary,
                            totalPrice = result.data.totalPrice,
                            message = result.message,
                        ),
                    )
                }
                watchDispatch(result.data.id)
            }.onFailure { error ->
                _state.update { it.copy(submitting = false, formError = ApiError.message(error)) }
            }
        }
    }
}
