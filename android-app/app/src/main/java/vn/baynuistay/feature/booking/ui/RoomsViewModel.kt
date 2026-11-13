package vn.baynuistay.feature.booking.ui

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import vn.baynuistay.core.network.ApiError
import vn.baynuistay.core.network.RoomDto
import vn.baynuistay.core.ui.components.nightsBetween
import vn.baynuistay.core.ui.components.plusDays
import vn.baynuistay.core.ui.components.tomorrow
import vn.baynuistay.feature.booking.data.BookingRepository
import vn.baynuistay.core.ui.lang.AppLangHolder.pick

data class RoomsUiState(
    val loading: Boolean = true,
    val rooms: List<RoomDto> = emptyList(),
    val error: String? = null,
    // Form đặt phòng
    val selectedRoom: RoomDto? = null,
    val checkIn: String = tomorrow(),
    val checkOut: String = plusDays(tomorrow(), 1),
    val guestName: String = "",
    val phone: String = "",
    val email: String = "",
    val note: String = "",
    val submitting: Boolean = false,
    val formError: String? = null,
    val success: BookingSuccess? = null,
    // Ngày do lịch trình truyền sang, không phải mặc định
    val datesFromTrip: Boolean = false,
) {
    val nights: Int get() = nightsBetween(checkIn, checkOut).coerceAtLeast(1)

    /** Tạm tính để người dùng thấy trước; giá chính thức do backend quyết định. */
    val estimatedTotal: Int
        get() {
            val room = selectedRoom ?: return 0
            val raw = room.price * nights
            return if (nights >= 7) (raw * 0.9).toInt() else raw
        }

    val hasDiscount: Boolean get() = nights >= 7
}

data class BookingSuccess(
    val id: String,
    val code: String = "",
    val summary: String,
    val totalPrice: Int,
    val message: String,
)

@HiltViewModel
class RoomsViewModel @Inject constructor(
    private val repository: BookingRepository,
    savedStateHandle: SavedStateHandle,
) : ViewModel() {
    // Mở từ dòng "Giữ phòng" trong lịch trình thì điền sẵn ngày nhận/trả,
    // và tự chọn luôn phòng gợi ý nếu có.
    private val wantedStayId: String = savedStateHandle.get<String>("stay").orEmpty()

    private val _state = MutableStateFlow(
        RoomsUiState().let { base ->
            val checkIn = savedStateHandle.get<String>("checkIn").orEmpty()
            val checkOut = savedStateHandle.get<String>("checkOut").orEmpty()
            if (checkIn.isBlank() || checkOut.isBlank()) base
            else base.copy(checkIn = checkIn, checkOut = checkOut, datesFromTrip = true)
        },
    )
    val state: StateFlow<RoomsUiState> = _state.asStateFlow()

    init { load() }

    fun load() {
        viewModelScope.launch {
            _state.update { it.copy(loading = true, error = null) }
            runCatching { repository.allStays() }
                .onSuccess { rooms ->
                    // Lịch trình gợi ý phòng nào thì mở sẵn form đặt phòng đó
                    val suggested = rooms.firstOrNull { it.id == wantedStayId }
                    _state.update {
                        it.copy(loading = false, rooms = rooms, selectedRoom = suggested ?: it.selectedRoom)
                    }
                }
                .onFailure { error -> _state.update { it.copy(loading = false, error = ApiError.message(error)) } }
        }
    }

    fun selectRoom(room: RoomDto) = _state.update {
        it.copy(selectedRoom = room, formError = null, success = null)
    }

    fun dismissSheet() = _state.update { it.copy(selectedRoom = null, formError = null) }
    fun dismissSuccess() = _state.update { it.copy(success = null) }

    fun setCheckIn(value: String) = _state.update {
        // Ngày trả luôn phải sau ngày nhận ít nhất một đêm
        val end = if (nightsBetween(value, it.checkOut) < 1) plusDays(value, 1) else it.checkOut
        it.copy(checkIn = value, checkOut = end)
    }

    fun setCheckOut(value: String) = _state.update {
        if (nightsBetween(it.checkIn, value) < 1) it else it.copy(checkOut = value)
    }
    fun setGuestName(value: String) = _state.update { it.copy(guestName = value) }
    fun setPhone(value: String) = _state.update { it.copy(phone = value) }
    fun setEmail(value: String) = _state.update { it.copy(email = value) }
    fun setNote(value: String) = _state.update { it.copy(note = value) }

    fun submit() {
        val current = _state.value
        val room = current.selectedRoom ?: return
        if (current.submitting) return

        validate(current.guestName, current.phone)?.let { message ->
            _state.update { it.copy(formError = message) }
            return
        }

        viewModelScope.launch {
            _state.update { it.copy(submitting = true, formError = null) }
            runCatching {
                repository.bookRoom(
                    roomId = room.id,
                    checkIn = current.checkIn,
                    checkOut = current.checkOut,
                    guestName = current.guestName.trim(),
                    phone = current.phone.trim(),
                    email = current.email.trim(),
                    note = current.note.trim(),
                )
            }.onSuccess { result ->
                _state.update {
                    it.copy(
                        submitting = false,
                        selectedRoom = null,
                        guestName = "",
                        phone = "",
                        email = "",
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
            }.onFailure { error ->
                _state.update { it.copy(submitting = false, formError = ApiError.message(error)) }
            }
        }
    }
}

/** Kiểm tra ở client cho phản hồi nhanh; backend vẫn kiểm tra lại lần nữa. */
internal fun validate(name: String, phone: String): String? {
    if (name.trim().length < 2) return pick("Bạn nhập họ tên giúp mình nhé.", "Please enter your full name.")
    val digits = phone.filter { it.isDigit() || it == '+' }
    if (!Regex("^(0\\d{9}|\\+84\\d{9})$").matches(digits)) {
        return pick(
            "Số điện thoại chưa đúng (10 số, bắt đầu bằng 0).",
            "That phone number is not valid (10 digits starting with 0).",
        )
    }
    return null
}
