package vn.baynuistay.feature.partner.ui

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import vn.baynuistay.core.location.LocationProvider
import vn.baynuistay.core.notify.AppNotifier
import vn.baynuistay.core.notify.DriverOnlineService
import vn.baynuistay.core.network.AcceptedRideDto
import vn.baynuistay.core.network.CashflowResponse
import vn.baynuistay.core.network.DepartureDto
import vn.baynuistay.core.network.DepartureMeta
import vn.baynuistay.core.network.DepartureTourDto
import vn.baynuistay.core.network.ApiError
import vn.baynuistay.core.network.DriverOfferDto
import vn.baynuistay.core.network.ListingDto
import vn.baynuistay.core.network.ListingRequest
import vn.baynuistay.core.network.PartnerBookingDto
import vn.baynuistay.core.network.PartnerDto
import vn.baynuistay.core.network.PartnerRegisterRequest
import vn.baynuistay.core.network.ServiceAreaDto
import vn.baynuistay.feature.partner.data.PartnerRepository

data class PartnerUiState(
    val loading: Boolean = true,
    // null = tài khoản này chưa phải đối tác → hiện màn đăng ký
    val partner: PartnerDto? = null,
    val bookings: List<PartnerBookingDto> = emptyList(),
    val error: String? = null,
    val message: String? = null,
    // Tài xế
    val online: Boolean = false,
    val busy: Boolean = false,
    val offers: List<DriverOfferDto> = emptyList(),
    // Khu vực nhận đơn
    val areas: List<ServiceAreaDto> = emptyList(),
    val selectedArea: String? = null,      // null = dùng vị trí GPS hiện tại
    val activeAreaName: String = "",       // khu vực đang bật, do server trả về
    val radiusKm: Int = 30,
    // Chuyến tài xế đang chạy — hiện thẻ chỉ đường và gửi vị trí cho khách
    val activeTrip: AcceptedRideDto? = null,
    val tripStage: String = "pickup",      // pickup → onboard → done
    // Đã thật sự gửi được vị trí lần nào chưa — đừng hứa với tài xế điều chưa làm được
    val tripSharing: Boolean = false,
    val tripNeedsLocation: Boolean = false,
    // Dịch vụ đối tác tự đăng (khách sạn / tour)
    val listings: List<ListingDto> = emptyList(),
    val listingType: String = "",
    val listingForm: ListingFormState? = null,   // khác null = đang mở biểu mẫu
    val listingSaving: Boolean = false,
    val listingError: String? = null,
    // Lịch khởi hành — chỉ đơn vị tour mới có
    val departures: List<DepartureDto> = emptyList(),
    val departureTours: List<DepartureTourDto> = emptyList(),
    val departureMeta: DepartureMeta = DepartureMeta(),
    val departureBusy: String = "",          // id chuyến đang xử lý
    val departureError: String? = null,
    val openingDeparture: Boolean = false,   // đang mở biểu mẫu mở chuyến
    // Dòng tiền của riêng đối tác
    val cashflow: CashflowResponse? = null,
    val cashflowLoading: Boolean = false,
    val cashflowError: String? = null,
    // Form đăng ký
    val form: PartnerFormState = PartnerFormState(),
    val submitting: Boolean = false,
    val formError: String? = null,
)

/** Dữ liệu biểu mẫu đăng phòng / đăng tour. */
data class ListingFormState(
    val editingId: String = "",          // rỗng = đăng mới
    val name: String = "",
    val price: String = "",
    val description: String = "",
    // Chỗ nghỉ
    val area: String = "",
    val capacity: String = "2",
    val lat: Double? = null,
    val lng: Double? = null,
    val amenities: String = "",
    val locating: Boolean = false,
    // Tour
    val days: String = "1",
    val duration: String = "",
    val pax: String = "",
    val stops: String = "",
    val includes: String = "",
    // Thư viện ảnh. Ảnh đầu tiên là ảnh bìa.
    val images: List<String> = emptyList(),
    val uploading: Boolean = false,
    val uploadHint: String = "",
) {
    val isEditing: Boolean get() = editingId.isNotBlank()
    val coordsText: String get() = if (lat != null && lng != null) "$lat, $lng" else ""
}

data class PartnerFormState(
    val type: String = "transport",
    val name: String = "",
    val phone: String = "",
    val address: String = "",
    val email: String = "",
    val password: String = "",
    val note: String = "",
    val vehicleType: String = "4-seat",
    val plate: String = "",
)

@HiltViewModel
class PartnerViewModel @Inject constructor(
    private val repository: PartnerRepository,
    private val locationProvider: LocationProvider,
    @ApplicationContext private val appContext: Context,
) : ViewModel() {
    private val _state = MutableStateFlow(PartnerUiState())
    val state: StateFlow<PartnerUiState> = _state.asStateFlow()

    private var pollJob: Job? = null
    private var heartbeatJob: Job? = null

    // Đã kêu chuông cho lời mời nào rồi. Không có cái này thì mỗi 3 giây hỏi
    // lại là chuông reo lại, tài xế phát điên.
    private val seenOfferIds = mutableSetOf<String>()

    init { load() }

    override fun onCleared() {
        pollJob?.cancel()
        heartbeatJob?.cancel()
        tripJob?.cancel()
        super.onCleared()
    }

    fun load() {
        viewModelScope.launch {
            _state.update { it.copy(loading = true, error = null) }
            runCatching { repository.me() }
                .onSuccess { session ->
                    _state.update {
                        it.copy(loading = false, partner = session.partner, online = session.online)
                    }
                    loadBookings()
                    if (session.partner.type == "hotel" || session.partner.type == "tour") loadListings()
                    // Lịch khởi hành chỉ có nghĩa với đơn vị tour: khách sạn
                    // không có chuyến, nhà xe chạy theo từng đơn lẻ.
                    if (session.partner.type == "tour") loadDepartures()
                    if (session.partner.isApproved) loadCashflow()
                    if (session.partner.isDriver) { loadAreas(); restoreActiveTrip() }
                    if (session.online) {
                        startPolling()
                        DriverOnlineService.start(appContext)
                    }
                }
                .onFailure { error ->
                    // 403 = đã đăng nhập nhưng chưa đăng ký đối tác → cho đăng ký
                    val message = ApiError.message(error)
                    _state.update {
                        it.copy(
                            loading = false,
                            partner = null,
                            error = if (message.contains("chưa đăng ký")) null else message,
                        )
                    }
                }
        }
    }

    fun loadBookings() {
        viewModelScope.launch {
            runCatching { repository.bookings() }
                .onSuccess { list -> _state.update { it.copy(bookings = list) } }
        }
    }

    fun setBookingStatus(id: String, status: String) {
        viewModelScope.launch {
            runCatching { repository.setBookingStatus(id, status) }
                .onSuccess { loadBookings() }
                .onFailure { error -> _state.update { it.copy(error = ApiError.message(error)) } }
        }
    }

    fun dismissMessage() = _state.update { it.copy(message = null, error = null) }

    // ── Đăng ký đối tác ──
    fun updateForm(transform: (PartnerFormState) -> PartnerFormState) =
        _state.update { it.copy(form = transform(it.form), formError = null) }

    fun submitRegistration() {
        val form = _state.value.form
        if (_state.value.submitting) return

        val error = when {
            form.name.trim().length < 2 -> "Vui lòng nhập tên đơn vị hoặc tên của bạn."
            !Regex("^(0\\d{9}|\\+84\\d{9})$").matches(form.phone.filter { it.isDigit() || it == '+' }) ->
                "Số điện thoại chưa đúng (10 số, bắt đầu bằng 0)."
            !Regex("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$").matches(form.email.trim()) -> "Email chưa đúng định dạng."
            form.password.length < 6 -> "Mật khẩu phải có ít nhất 6 ký tự."
            else -> null
        }
        if (error != null) {
            _state.update { it.copy(formError = error) }
            return
        }

        viewModelScope.launch {
            _state.update { it.copy(submitting = true, formError = null) }
            runCatching {
                repository.register(
                    PartnerRegisterRequest(
                        type = form.type,
                        name = form.name.trim(),
                        phone = form.phone.trim(),
                        address = form.address.trim(),
                        email = form.email.trim(),
                        password = form.password,
                        note = form.note.trim(),
                        vehicleType = if (form.type == "transport") form.vehicleType else "",
                        vehicleSeats = if (form.type == "transport") seatsOf(form.vehicleType) else 0,
                        plate = if (form.type == "transport") form.plate.trim() else "",
                    ),
                )
            }.onSuccess { (partner, message) ->
                _state.update { it.copy(submitting = false, partner = partner, message = message) }
            }.onFailure { error ->
                _state.update { it.copy(submitting = false, formError = ApiError.message(error)) }
            }
        }
    }

    private fun seatsOf(vehicleType: String) = when (vehicleType) {
        "motorbike" -> 1
        "7-seat" -> 7
        "16-seat" -> 16
        else -> 4
    }

    // ════════════════════════════════════════════════
    // DỊCH VỤ ĐỐI TÁC TỰ ĐĂNG
    // ════════════════════════════════════════════════
    // ── Lịch khởi hành ─────────────────────────────────────
    // Đây là thứ đơn vị tour cần lúc SẮP chạy tour: đang ở bến, gọi từng khách
    // xác nhận giờ đón. Lúc đó họ cầm điện thoại chứ không ngồi máy tính, nên
    // mục này đáng nằm trong app hơn cả trên web.
    fun loadDepartures() {
        viewModelScope.launch {
            runCatching { repository.departures() }
                .onSuccess { res ->
                    _state.update {
                        it.copy(
                            departures = res.data,
                            departureTours = res.tours,
                            departureMeta = res.meta,
                            departureError = null,
                        )
                    }
                }
                .onFailure { e -> _state.update { it.copy(departureError = ApiError.message(e)) } }
        }
    }

    fun moFormChuyen(mo: Boolean) = _state.update { it.copy(openingDeparture = mo, departureError = null) }

    /** Đơn vị tour tự treo một ngày lên để khách thấy mà đăng ký. */
    fun moChuyen(tourSlug: String, date: String, minGuests: Int) {
        if (_state.value.departureBusy.isNotBlank()) return
        _state.update { it.copy(departureBusy = "moi", departureError = null) }
        viewModelScope.launch {
            runCatching { repository.openDeparture(tourSlug, date, minGuests) }
                .onSuccess {
                    _state.update { it.copy(departureBusy = "", openingDeparture = false) }
                    loadDepartures()
                }
                .onFailure { e ->
                    _state.update { it.copy(departureBusy = "", departureError = ApiError.message(e)) }
                }
        }
    }

    /**
     * Chốt chạy hoặc huỷ. Máy chủ nhắn cho từng khách đã đăng ký, nên bấm xong
     * là khách biết ngay — không phải gọi tay từng người để báo.
     */
    fun doiTrangThaiChuyen(id: String, status: String) {
        if (_state.value.departureBusy.isNotBlank()) return
        _state.update { it.copy(departureBusy = id, departureError = null) }
        viewModelScope.launch {
            runCatching { repository.setDeparture(id, status) }
                .onSuccess {
                    _state.update { it.copy(departureBusy = "") }
                    loadDepartures()
                }
                .onFailure { e ->
                    _state.update { it.copy(departureBusy = "", departureError = ApiError.message(e)) }
                }
        }
    }

    // ── Dòng tiền ──────────────────────────────────────────
    fun loadCashflow(month: String = "") {
        _state.update { it.copy(cashflowLoading = true, cashflowError = null) }
        viewModelScope.launch {
            runCatching { repository.cashflow(month) }
                .onSuccess { r -> _state.update { it.copy(cashflowLoading = false, cashflow = r) } }
                .onFailure { e ->
                    _state.update { it.copy(cashflowLoading = false, cashflowError = ApiError.message(e)) }
                }
        }
    }

    // Khách sạn tự đăng phòng, đơn vị tour tự đăng tour. Tin mới nằm ở
    // trạng thái chờ duyệt cho tới khi LOCALMATE bật — khách không thấy
    // nội dung chưa kiểm chứng.

    fun loadListings() {
        viewModelScope.launch {
            runCatching { repository.listings() }
                .onSuccess { res ->
                    _state.update { it.copy(listings = res.data, listingType = res.listingType) }
                }
        }
    }

    /** Mở biểu mẫu. Truyền id để sửa tin đã có. */
    fun openListingForm(id: String = "") {
        val row = _state.value.listings.firstOrNull { it.id == id }
        _state.update {
            it.copy(
                listingError = null,
                listingForm = if (row == null) ListingFormState() else ListingFormState(
                    editingId = row.id,
                    name = row.name,
                    price = row.price.toString(),
                    description = row.description,
                    area = row.area,
                    capacity = (row.capacity ?: 2).toString(),
                    lat = row.lat,
                    lng = row.lng,
                    amenities = row.amenities.joinToString(", "),
                    days = (row.days ?: 1).toString(),
                    duration = row.duration,
                    pax = row.pax,
                    stops = row.stops,
                    includes = row.includes.joinToString(", "),
                    images = row.images.ifEmpty { listOfNotNull(row.image.takeIf { u -> u.isNotBlank() }) },
                ),
            )
        }
    }

    fun closeListingForm() = _state.update { it.copy(listingForm = null, listingError = null) }

    fun updateListingForm(transform: (ListingFormState) -> ListingFormState) = _state.update {
        it.copy(listingForm = it.listingForm?.let(transform), listingError = null)
    }

    /** Lấy toạ độ cơ sở — đối tác bấm khi đang đứng tại chỗ của mình. */
    fun useListingLocation() {
        if (!locationProvider.hasPermission()) {
            _state.update { it.copy(listingError = "Cần quyền vị trí để lấy toạ độ cơ sở.") }
            return
        }
        viewModelScope.launch {
            updateListingForm { it.copy(locating = true) }
            val location = locationProvider.current()
            if (location == null) {
                updateListingForm { it.copy(locating = false) }
                _state.update { it.copy(listingError = "Không lấy được vị trí. Kiểm tra GPS đã bật chưa.") }
                return@launch
            }
            updateListingForm {
                it.copy(
                    locating = false,
                    lat = Math.round(location.latitude * 1e6) / 1e6,
                    lng = Math.round(location.longitude * 1e6) / 1e6,
                )
            }
        }
    }

    /**
     * Tải ảnh khách vừa chọn lên máy chủ.
     *
     * Thu nhỏ trước khi gửi: ảnh chụp bằng điện thoại bây giờ 4–8 MB, mà máy
     * chủ chỉ nhận tối đa 5 MB và đối tác ở Tri Tôn thường dùng 3G. Nhưng thu
     * vừa phải thôi — cạnh dài 1600px, chất lượng 85. Nén tay quá là ra đúng
     * lỗi "ảnh mờ quá" từng gặp ở trang admin.
     */
    fun themAnh(uris: List<android.net.Uri>) {
        if (uris.isEmpty()) return
        val form = _state.value.listingForm ?: return
        if (form.uploading) return

        capNhatForm { it.copy(uploading = true, uploadHint = "Đang tải ảnh…") }
        viewModelScope.launch {
            var xong = 0
            for ((i, uri) in uris.withIndex()) {
                capNhatForm { it.copy(uploadHint = "Đang tải ảnh ${i + 1}/${uris.size}…") }
                val bytes = runCatching { thuNhoAnh(uri) }.getOrNull()
                if (bytes == null) {
                    capNhatForm { it.copy(uploading = false, uploadHint = "Không đọc được ảnh này.") }
                    return@launch
                }
                val res = runCatching {
                    repository.uploadImage(
                        bytes.toRequestBody("image/jpeg".toMediaType()),
                    )
                }
                res.onSuccess { r ->
                    xong += 1
                    capNhatForm { it.copy(images = it.images + r.url) }
                }.onFailure { e ->
                    capNhatForm { it.copy(uploading = false, uploadHint = ApiError.message(e)) }
                    return@launch
                }
            }
            capNhatForm {
                it.copy(
                    uploading = false,
                    uploadHint = "Đã thêm $xong ảnh. Ảnh đầu tiên là ảnh bìa.",
                )
            }
        }
    }

    fun xoaAnh(url: String) = capNhatForm { it.copy(images = it.images.filterNot { u -> u == url }) }

    /** Đưa một ảnh lên đầu để làm ảnh bìa. */
    fun datAnhBia(url: String) = capNhatForm {
        it.copy(images = listOf(url) + it.images.filterNot { u -> u == url })
    }

    private fun capNhatForm(block: (ListingFormState) -> ListingFormState) {
        _state.update { s -> s.listingForm?.let { s.copy(listingForm = block(it)) } ?: s }
    }

    /** Đọc ảnh từ máy, xoay đúng chiều rồi nén lại thành JPEG. */
    private suspend fun thuNhoAnh(uri: android.net.Uri): ByteArray? =
        kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) {
            val goc = appContext.contentResolver.openInputStream(uri)?.use { it.readBytes() }
                ?: return@withContext null

            val anh = android.graphics.BitmapFactory.decodeByteArray(goc, 0, goc.size)
                ?: return@withContext null

            val canhDai = maxOf(anh.width, anh.height)
            val ti = if (canhDai > 1600) 1600f / canhDai else 1f
            val nho = if (ti < 1f) {
                android.graphics.Bitmap.createScaledBitmap(
                    anh, (anh.width * ti).toInt(), (anh.height * ti).toInt(), true,
                )
            } else anh

            val ra = java.io.ByteArrayOutputStream()
            nho.compress(android.graphics.Bitmap.CompressFormat.JPEG, 85, ra)
            if (nho !== anh) nho.recycle()
            anh.recycle()
            ra.toByteArray()
        }

    fun saveListing() {
        val form = _state.value.listingForm ?: return
        if (_state.value.listingSaving) return
        val isStay = _state.value.listingType == "stay"

        val price = form.price.filter { it.isDigit() }.toIntOrNull() ?: 0
        val error = when {
            form.name.trim().length < 3 -> "Tên phải có ít nhất 3 ký tự."
            price <= 0 -> "Vui lòng nhập giá."
            isStay && form.area.isBlank() -> "Vui lòng nhập khu vực."
            isStay && (form.lat == null || form.lng == null) ->
                "Chưa có toạ độ. Bạn bấm nút \"Lấy vị trí\" khi đang đứng tại cơ sở nhé."
            else -> null
        }
        if (error != null) {
            _state.update { it.copy(listingError = error) }
            return
        }

        val request = ListingRequest(
            name = form.name.trim(),
            price = price,
            description = form.description.trim(),
            area = if (isStay) form.area.trim() else null,
            lat = if (isStay) form.lat else null,
            lng = if (isStay) form.lng else null,
            capacity = if (isStay) form.capacity.toIntOrNull() ?: 2 else null,
            amenities = if (isStay) form.amenities.trim() else null,
            days = if (!isStay) form.days.toIntOrNull() ?: 1 else null,
            duration = if (!isStay) form.duration.trim() else null,
            pax = if (!isStay) form.pax.trim() else null,
            stops = if (!isStay) form.stops.trim() else null,
            includes = if (!isStay) form.includes.trim() else null,
            image = form.images.firstOrNull().orEmpty(),
            images = form.images.takeIf { it.isNotEmpty() },
        )

        viewModelScope.launch {
            _state.update { it.copy(listingSaving = true, listingError = null) }
            runCatching {
                if (form.isEditing) repository.updateListing(form.editingId, request)
                else repository.createListing(request)
            }.onSuccess { res ->
                _state.update {
                    it.copy(listingSaving = false, listingForm = null, message = res.message)
                }
                loadListings()
            }.onFailure { e ->
                _state.update { it.copy(listingSaving = false, listingError = ApiError.message(e)) }
            }
        }
    }

    /** Bật lại hoặc tạm ẩn một tin đã duyệt. */
    fun toggleListing(id: String, status: String) {
        viewModelScope.launch {
            runCatching {
                repository.setListingStatus(id, if (status == "paused") "approved" else "paused")
            }.onSuccess { loadListings() }
                .onFailure { e -> _state.update { it.copy(error = ApiError.message(e)) } }
        }
    }

    fun deleteListing(id: String) {
        viewModelScope.launch {
            runCatching { repository.deleteListing(id) }
                .onSuccess { loadListings() }
                .onFailure { e -> _state.update { it.copy(error = ApiError.message(e)) } }
        }
    }

    // ── Khu vực nhận đơn ──
    fun loadAreas() {
        if (_state.value.areas.isNotEmpty()) return
        viewModelScope.launch {
            runCatching { repository.serviceAreas() }
                .onSuccess { res -> _state.update { it.copy(areas = res.data, radiusKm = res.radiusKm) } }
        }
    }

    /** slug = khu vực cụ thể, null = dùng vị trí hiện tại. */
    fun selectArea(slug: String?) = _state.update { it.copy(selectedArea = slug, error = null) }

    // ── Tài xế: bật/tắt nhận đơn ──
    fun toggleOnline() {
        if (_state.value.busy) return
        viewModelScope.launch {
            _state.update { it.copy(busy = true, error = null) }

            if (_state.value.online) {
                runCatching { repository.goOffline() }
                    .onSuccess {
                        stopPolling()
                        // Tắt nhận đơn thì gỡ luôn thông báo thường trực
                        DriverOnlineService.stop(appContext)
                        _state.update {
                            it.copy(busy = false, online = false, offers = emptyList(), activeAreaName = "")
                        }
                    }
                    .onFailure { e -> _state.update { it.copy(busy = false, error = ApiError.message(e)) } }
                return@launch
            }

            val area = _state.value.selectedArea
            var lat: Double? = null
            var lng: Double? = null

            // Chỉ cần GPS khi tài xế KHÔNG chọn khu vực cố định
            if (area == null) {
                if (!locationProvider.hasPermission()) {
                    _state.update {
                        it.copy(busy = false, error = "Hãy chọn khu vực nhận đơn, hoặc cho phép truy cập vị trí.")
                    }
                    return@launch
                }
                val location = locationProvider.current()
                if (location == null) {
                    _state.update {
                        it.copy(busy = false, error = "Không lấy được vị trí. Bạn chọn khu vực nhận đơn ở trên nhé.")
                    }
                    return@launch
                }
                lat = location.latitude
                lng = location.longitude
            }

            runCatching { repository.goOnline(area, lat, lng) }
                .onSuccess { res ->
                    _state.update {
                        it.copy(
                            busy = false,
                            online = true,
                            activeAreaName = res.area?.name ?: "vị trí hiện tại",
                            message = res.message.ifBlank { "Đã bật nhận đơn." },
                        )
                    }
                    startPolling()
                    // Dịch vụ nền giữ cho app còn nghe được chuyến khi thu nhỏ
                    DriverOnlineService.start(appContext)
                }
                .onFailure { e -> _state.update { it.copy(busy = false, error = ApiError.message(e)) } }
        }
    }

    /** Hỏi server 3 giây/lần để "nổ đơn", và gửi vị trí 45 giây/lần. */
    private fun startPolling() {
        stopPolling()
        pollJob = viewModelScope.launch {
            while (isActive) {
                runCatching { repository.offers() }
                    .onSuccess { res ->
                        // Có chuyến mới so với lần hỏi trước → báo cho tài xế biết
                        val isNew = res.data.size > _state.value.offers.size

                        // Chuông + rung tại máy. Trước đây chỉ đổi một dòng chữ
                        // trên màn hình, nên tài xế đang cầm điện thoại làm việc
                        // khác thì mất đơn mà không biết.
                        if (isNew) {
                            res.data.firstOrNull { it.id !in seenOfferIds }?.let { offer ->
                                seenOfferIds += offer.id
                                AppNotifier.show(
                                    context = appContext,
                                    title = "Chuyến mới cách bạn ${offer.distanceKm} km",
                                    body = "${offer.pickup} → ${offer.dropoff}",
                                    urgent = true,
                                    key = offer.id,
                                )
                            }
                        }

                        _state.update {
                            it.copy(
                                online = res.online,
                                offers = res.data,
                                message = if (isNew) "🔔 Có chuyến mới gần bạn!" else it.message,
                                radiusKm = res.radiusKm,
                                // Server là nguồn sự thật về khu vực đang bật (kể cả sau khi mở lại app)
                                activeAreaName = res.area?.name ?: it.activeAreaName,
                                selectedArea = res.area?.slug ?: it.selectedArea,
                            )
                        }
                    }
                delay(3_000)
            }
        }
        heartbeatJob = viewModelScope.launch {
            while (isActive) {
                delay(45_000)
                // Chọn khu vực cố định → chỉ báo "còn online", không gửi toạ độ.
                if (_state.value.selectedArea != null) {
                    runCatching { repository.heartbeat(null, null) }
                    continue
                }
                val location = locationProvider.current(timeoutMs = 8_000) ?: continue
                runCatching { repository.heartbeat(location.latitude, location.longitude) }
            }
        }
    }

    private fun stopPolling() {
        pollJob?.cancel(); pollJob = null
        heartbeatJob?.cancel(); heartbeatJob = null
    }

    /**
     * Lấy lại chuyến đang chạy dở từ máy chủ.
     *
     * Chuyến chỉ nằm trong bộ nhớ của app, nên điện thoại hết pin, app bị hệ
     * thống tắt hay tài xế lỡ vuốt tắt là mất sạch: không còn bản đồ, không còn
     * nút "Đã đón khách", và app cũng thôi gửi vị trí cho khách theo dõi —
     * trong khi xe vẫn đang chạy thật ngoài đường.
     */
    private fun restoreActiveTrip() {
        viewModelScope.launch {
            val trip = runCatching { repository.activeTrip() }.getOrNull() ?: return@launch
            if (!trip.active) return@launch
            _state.update {
                it.copy(
                    activeTrip = trip.toRide(),
                    tripStage = trip.stage.ifBlank { "pickup" },
                    message = "Đã khôi phục chuyến đang chạy của bạn.",
                )
            }
            startTripTracking(trip.bookingId)
        }
    }

    fun acceptOffer(offerId: String) {
        viewModelScope.launch {
            runCatching { repository.accept(offerId) }
                .onSuccess { ride ->
                    _state.update {
                        it.copy(
                            offers = it.offers.filterNot { o -> o.id == offerId },
                            activeTrip = ride,
                            tripStage = "pickup",
                            tripSharing = false,
                            tripNeedsLocation = false,
                            message = "Đã nhận chuyến! Bấm Chỉ đường để tới đón khách.",
                        )
                    }
                    startTripTracking(ride.bookingId)
                    loadBookings()
                }
                .onFailure { e -> _state.update { it.copy(error = ApiError.message(e)) } }
        }
    }

    // ════════════════════════════════════════════════
    // CHUYẾN ĐANG CHẠY
    // ════════════════════════════════════════════════
    private var tripJob: Job? = null

    /**
     * Gửi vị trí xe 20 giây một lần để khách theo dõi trên bản đồ.
     * Dừng khi trả khách xong hoặc khi thoát màn hình.
     */
    private fun startTripTracking(bookingId: String) {
        tripJob?.cancel()
        if (bookingId.isBlank()) return

        // Không có quyền vị trí thì không gửi được gì — phải nói thẳng cho tài xế
        // biết, thay vì hiện "đang gửi vị trí" trong khi thực tế chẳng gửi được.
        if (!locationProvider.hasPermission()) {
            _state.update { it.copy(tripSharing = false, tripNeedsLocation = true) }
            return
        }

        _state.update { it.copy(tripNeedsLocation = false) }
        tripJob = viewModelScope.launch {
            while (isActive) {
                val location = locationProvider.current(timeoutMs = 10_000)
                if (location != null) {
                    runCatching {
                        repository.sendTripLocation(bookingId, location.latitude, location.longitude)
                    }.onSuccess {
                        _state.update { it.copy(tripSharing = true, tripNeedsLocation = false) }
                    }
                }
                delay(20_000)
            }
        }
    }

    /** Tài xế vừa cấp quyền vị trí — bắt đầu gửi cho chuyến đang chạy. */
    fun retryTripTracking() {
        val trip = _state.value.activeTrip ?: return
        startTripTracking(trip.bookingId)
    }

    /** "onboard" khi đã đón được khách, "done" khi đã trả khách. */
    fun setTripStage(stage: String) {
        val trip = _state.value.activeTrip ?: return
        viewModelScope.launch {
            runCatching { repository.setTripStage(trip.bookingId, stage) }
                .onSuccess { res ->
                    if (stage == "done") {
                        tripJob?.cancel(); tripJob = null
                        _state.update {
                            it.copy(activeTrip = null, tripStage = "pickup", message = res.message)
                        }
                        loadBookings()
                    } else {
                        _state.update { it.copy(tripStage = res.stage, message = res.message) }
                    }
                }
                .onFailure { e -> _state.update { it.copy(error = ApiError.message(e)) } }
        }
    }

    /** Tài xế bỏ theo dõi (ví dụ tự gọi khách rồi xử lý ngoài app). */
    fun dismissTrip() {
        tripJob?.cancel(); tripJob = null
        _state.update { it.copy(activeTrip = null, tripStage = "pickup") }
    }

    fun declineOffer(offerId: String) {
        viewModelScope.launch {
            runCatching { repository.decline(offerId) }
                .onSuccess {
                    _state.update { it.copy(offers = it.offers.filterNot { o -> o.id == offerId }) }
                }
        }
    }
}
