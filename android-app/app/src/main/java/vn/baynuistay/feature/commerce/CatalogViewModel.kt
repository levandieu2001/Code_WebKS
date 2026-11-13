package vn.baynuistay.feature.commerce

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import vn.baynuistay.core.network.*
import vn.baynuistay.core.local.TokenStore
import vn.baynuistay.core.ui.lang.AppLangHolder.pick
import vn.baynuistay.feature.booking.data.BookingRepository
import vn.baynuistay.feature.booking.data.BookingResult
import java.time.LocalDate

data class CatalogState(
    val foodMode: Boolean = true, val loading: Boolean = true, val error: String? = null,
    val foods: List<SpecialtyDto> = emptyList(), val tours: List<TourDto> = emptyList(),
    val query: String = "", val area: String = "", val available: Boolean = false, val sort: Int = 0,
    val food: SpecialtyDto? = null, val tour: TourDto? = null, val ordering: Boolean = false,
    val quantity: Int = 1, val date: String = LocalDate.now().plusDays(1).toString(),
    val name: String = "", val phone: String = "", val address: String = "", val note: String = "",
    val addresses: List<DeliveryAddressDto> = emptyList(), val sending: Boolean = false,
    val formError: String? = null, val receipt: BookingResult? = null,
)
@HiltViewModel
class CatalogViewModel @Inject constructor(
    private val api: BayNuiApi, private val bookings: BookingRepository,
    private val tokens: TokenStore, saved: SavedStateHandle,
) : ViewModel() {
    private val _state = MutableStateFlow(CatalogState(foodMode = saved.get<String>("kind") != "tour"))
    val state = _state.asStateFlow()
    private var wanted = saved.get<String>("item").orEmpty()
    init { load(); loadProfile() }
    private fun loadProfile() = viewModelScope.launch {
        val profile = if (!tokens.token.first().isNullOrBlank()) runCatching { api.customerProfile().data }.getOrNull() else null
        val address = profile?.addresses?.firstOrNull { it.isDefault }
        val savedPhone = tokens.bookingPhone.first()
        val savedName = tokens.displayName.first()
        _state.update { it.copy(name = it.name.ifBlank { address?.receiver ?: profile?.fullName ?: savedName },
            phone = it.phone.ifBlank { address?.phone ?: profile?.phone?.ifBlank { savedPhone } ?: savedPhone },
            address = it.address.ifBlank { address?.address.orEmpty() }, addresses = profile?.addresses.orEmpty()) }
    }
    fun load() = viewModelScope.launch {
        _state.update { it.copy(loading = true, error = null) }
        runCatching {
            if (_state.value.foodMode) { val rows = api.specialties().data; _state.update { it.copy(foods = rows) } }
            else { val rows = api.tours().data; _state.update { it.copy(tours = rows) } }
        }.onFailure { e -> _state.update { it.copy(error = ApiError.message(e)) } }
        _state.update { it.copy(loading = false) }
        if (wanted.isNotBlank()) {
            _state.value.tours.find { it.slug == wanted }?.let(::selectTour)
            wanted = ""
        }
    }
    fun filters(query: String = state.value.query, area: String = state.value.area, available: Boolean = state.value.available, sort: Int = state.value.sort) {
        _state.update { it.copy(query = query, area = area, available = available, sort = sort) }
    }
    fun selectFood(food: SpecialtyDto) { if (!state.value.sending) _state.update { it.copy(food = food, tour = null, ordering = false, quantity = 1, formError = null) } }
    fun selectTour(tour: TourDto) { if (!state.value.sending) _state.update { it.copy(tour = tour, food = null, ordering = false, quantity = 1, formError = null) } }
    fun order() { _state.update { it.copy(ordering = true, formError = null) }; loadProfile() }
    fun close() { if (!state.value.sending) _state.update { it.copy(food = null, tour = null, ordering = false, formError = null) } }
    fun dismissReceipt() { _state.update { it.copy(receipt = null) } }
    fun quantity(value: Int) { val max = state.value.food?.limit() ?: 20; _state.update { it.copy(quantity = value.coerceIn(1, max.coerceAtLeast(1))) } }
    fun name(v: String) { if (!state.value.sending) _state.update { it.copy(name = v.take(120)) } }
    fun phone(v: String) { if (!state.value.sending) _state.update { it.copy(phone = v.take(20)) } }
    fun address(v: String) { if (!state.value.sending) _state.update { it.copy(address = v.take(300)) } }
    fun date(v: String) { _state.update { it.copy(date = v) } }
    fun note(v: String) { if (!state.value.sending) _state.update { it.copy(note = v.take(300)) } }
    fun chooseAddress(a: DeliveryAddressDto) { if (!state.value.sending) _state.update { it.copy(name = a.receiver, phone = a.phone, address = a.address) } }
    fun submit() {
        val s = state.value
        if (s.sending || (s.food == null && s.tour == null)) return
        val phone = s.phone.replace(Regex("[\\s.-]"), "").replace(Regex("^\\+84"), "0")
        val invalid = when {
            s.name.trim().length < 2 -> pick("Nhập họ tên người nhận.", "Enter your name.")
            !Regex("0\\d{9}").matches(phone) -> pick("Nhập số điện thoại 10 số hợp lệ.", "Enter a valid 10-digit phone number.")
            s.food != null && s.address.trim().length < 8 -> pick("Nhập địa chỉ giao hàng đầy đủ.", "Enter a complete delivery address.")
            s.food != null && !s.food.canOrder() -> pick("Món này tạm hết hàng.", "This item is unavailable.")
            s.tour != null && (s.tour.soldOut || s.tour.price <= 0) -> pick("Tour này chưa nhận đặt.", "This tour is unavailable.")
            s.tour != null && runCatching { LocalDate.parse(s.date) < LocalDate.now() }.getOrDefault(true) -> pick("Chọn ngày đi hợp lệ.", "Choose a valid travel date.")
            else -> null
        }
        if (invalid != null) { _state.update { it.copy(formError = invalid) }; return }
        _state.update { it.copy(sending = true, formError = null) }
        viewModelScope.launch {
            runCatching {
                if (s.food != null) bookings.bookFood(s.food.id, s.quantity, s.address.trim(), s.name.trim(), phone, s.note.trim())
                else bookings.bookTour(s.tour!!.slug, s.date, s.quantity, s.name.trim(), phone, s.note.trim())
            }.onSuccess { receipt ->
                _state.update { it.copy(sending = false, receipt = receipt, food = null, tour = null, ordering = false, note = "") }
                load()
            }.onFailure { e -> _state.update { it.copy(sending = false, formError = ApiError.message(e)) } }
        }
    }
}
