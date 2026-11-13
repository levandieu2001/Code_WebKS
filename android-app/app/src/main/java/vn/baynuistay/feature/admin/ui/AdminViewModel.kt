package vn.baynuistay.feature.admin.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import vn.baynuistay.core.network.AdminBookingDto
import vn.baynuistay.core.network.AdminContactDto
import vn.baynuistay.core.network.AdminListingDto
import vn.baynuistay.core.network.AdminTodayDto
import vn.baynuistay.core.network.ApiError
import vn.baynuistay.core.network.BayNuiApi
import vn.baynuistay.core.network.PartnerDto
import vn.baynuistay.core.network.PaymentStatusRequest
import vn.baynuistay.core.network.StatusRequest
import vn.baynuistay.core.ui.lang.AppLangHolder.pick

enum class AdminTab { DUYET, DON, TIN_NHAN }

data class AdminUiState(
    val tab: AdminTab = AdminTab.DUYET,
    val loading: Boolean = true,
    val today: AdminTodayDto = AdminTodayDto(),
    val partners: List<PartnerDto> = emptyList(),
    val listings: List<AdminListingDto> = emptyList(),
    val bookings: List<AdminBookingDto> = emptyList(),
    val contacts: List<AdminContactDto> = emptyList(),
    /** Id đang xử lý, để khoá đúng thẻ đó chứ không khoá cả màn hình. */
    val working: String = "",
    val error: String? = null,
    val notice: String = "",
) {
    val pendingPartners get() = partners.filter { it.status == "pending" }
    val pendingListings get() = listings.filter { it.status == "pending" }
}

/**
 * Quản trị trên điện thoại.
 *
 * Cố tình KHÔNG bê nguyên trang admin của web sang. Ngồi máy tính thì xem báo
 * cáo, sổ quỹ, in mã QR đều tiện hơn — bảng nhiều cột nhìn trên màn hình 6 inch
 * chỉ tổ bấm nhầm. Ở đây chỉ giữ những việc gắn với lúc đang đi lại:
 *
 *   • Duyệt đối tác và tin đăng — để họ chờ hai ngày là họ bỏ đi mất
 *   • Đơn mới — ai vừa đặt gì, gọi ngay, xác nhận đã nhận cọc
 *   • Tin nhắn khách gửi — trả lời chậm là mất khách
 */
@HiltViewModel
class AdminViewModel @Inject constructor(
    private val api: BayNuiApi,
) : ViewModel() {

    private val _state = MutableStateFlow(AdminUiState())
    val state: StateFlow<AdminUiState> = _state.asStateFlow()

    init { load() }

    fun moTab(tab: AdminTab) = _state.update { it.copy(tab = tab, notice = "", error = null) }

    fun load() {
        _state.update { it.copy(loading = true, error = null) }
        viewModelScope.launch {
            try {
                // Số của hôm nay lấy trước và hiện trước: nó nhẹ nhất, mà cũng
                // là thứ mở màn hình lên là muốn thấy ngay.
                val today = api.adminToday().data
                _state.update { it.copy(today = today) }

                val partners = api.adminPartners().data
                val listings = api.adminListings().data
                val bookings = api.adminBookings().data
                val contacts = api.adminContacts().data
                _state.update {
                    it.copy(
                        loading = false,
                        partners = partners,
                        listings = listings,
                        bookings = bookings,
                        contacts = contacts,
                    )
                }
            } catch (e: Exception) {
                _state.update { it.copy(loading = false, error = ApiError.message(e)) }
            }
        }
    }

    fun setPartner(id: String, status: String) = doi(id) {
        api.adminSetPartnerStatus(id, StatusRequest(status))
        if (status == "approved") pick("Đã duyệt đối tác.", "Partner approved.")
        else pick("Đã từ chối đối tác.", "Partner rejected.")
    }

    fun setListing(id: String, status: String) = doi(id) {
        api.adminSetListingStatus(id, StatusRequest(status))
        if (status == "approved") pick("Đã duyệt tin đăng.", "Listing approved.")
        else pick("Đã từ chối tin đăng.", "Listing rejected.")
    }

    /**
     * Xác nhận đã nhận cọc của khách.
     *
     * Máy chủ tự chuyển đơn sang "đã nhận" và nhắn cho khách, nên không cần
     * bấm thêm bước nào nữa.
     */
    fun nhanCoc(id: String) = doi(id) {
        api.adminSetPayment(id, PaymentStatusRequest("paid"))
        pick("Đã ghi nhận cọc và báo cho khách.", "Deposit recorded, guest notified.")
    }

    fun danhDauDaDoc(id: String) = doi(id) {
        api.adminMarkContactRead(id)
        pick("Đã đánh dấu đã đọc.", "Marked as read.")
    }

    /** Chạy một thao tác rồi tải lại danh sách, khoá đúng thẻ đang xử lý. */
    private fun doi(id: String, block: suspend () -> String) {
        if (_state.value.working.isNotBlank()) return
        _state.update { it.copy(working = id, notice = "", error = null) }
        viewModelScope.launch {
            try {
                val msg = block()
                _state.update { it.copy(working = "", notice = msg) }
                load()
            } catch (e: Exception) {
                _state.update { it.copy(working = "", error = ApiError.message(e)) }
            }
        }
    }

    fun clearNotice() = _state.update { it.copy(notice = "", error = null) }
}
