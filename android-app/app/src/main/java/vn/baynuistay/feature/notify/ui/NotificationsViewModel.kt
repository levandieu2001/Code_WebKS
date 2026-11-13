package vn.baynuistay.feature.notify.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import vn.baynuistay.core.local.TokenStore
import vn.baynuistay.core.network.AppNotificationDto
import vn.baynuistay.core.network.ApiError
import vn.baynuistay.core.network.BayNuiApi

data class NotificationsUiState(
    val loading: Boolean = true,
    val items: List<AppNotificationDto> = emptyList(),
    val unread: Int = 0,
    val error: String? = null,
    /** Chưa từng đặt gì và cũng không phải đối tác — chưa có gì để hiện. */
    val chuaCoNguon: Boolean = false,
)

/**
 * Thông báo của người đang dùng máy này.
 *
 * Máy chủ chia thông báo theo ba nhóm người nhận, và một người có thể thuộc
 * nhiều nhóm cùng lúc: chủ nhà xe vừa là đối tác vừa là khách đi chơi. Nên ở
 * đây hỏi cả ba đường mà mình có quyền rồi trộn lại theo thời gian, thay vì
 * bắt họ đoán xem tin của mình nằm ở mục nào.
 *
 *   • khách  → theo số điện thoại đã dùng khi đặt (máy tự nhớ, khỏi gõ lại)
 *   • đối tác → theo phiên đăng nhập đối tác
 *   • quản trị → chỉ tài khoản trong danh sách admin của máy chủ
 *
 * Đường nào không có quyền thì máy chủ trả lỗi và mình bỏ qua im lặng — đó là
 * chuyện bình thường, không phải hỏng.
 */
@HiltViewModel
class NotificationsViewModel @Inject constructor(
    private val api: BayNuiApi,
    private val tokenStore: TokenStore,
) : ViewModel() {

    private val _state = MutableStateFlow(NotificationsUiState())
    val state: StateFlow<NotificationsUiState> = _state.asStateFlow()

    init { load() }

    fun load() {
        _state.update { it.copy(loading = true, error = null) }
        viewModelScope.launch {
            val gom = mutableListOf<AppNotificationDto>()
            var coNguon = false

            val phone = runCatching { tokenStore.bookingPhoneOnce() }.getOrDefault("")
            if (phone.isNotBlank()) {
                runCatching { api.guestNotifications(phone) }.onSuccess {
                    coNguon = true
                    gom += it.data
                }
            }

            runCatching { api.partnerNotifications() }.onSuccess {
                coNguon = true
                gom += it.data
            }

            runCatching { api.adminNotifications() }.onSuccess {
                coNguon = true
                gom += it.data
            }

            // Cùng một tin có thể tới từ hai đường (đối tác kiêm quản trị chẳng
            // hạn) — lọc trùng theo id trước khi hiện.
            val list = gom.distinctBy { it.id }.sortedByDescending { it.createdAt }

            _state.update {
                it.copy(
                    loading = false,
                    items = list,
                    unread = list.count { n -> !n.read },
                    chuaCoNguon = !coNguon,
                    error = null,
                )
            }
        }
    }

    /**
     * Đánh dấu đã đọc hết.
     *
     * Gọi cả ba đường: không biết tin nào thuộc nhóm nào sau khi đã trộn, mà
     * đường không có quyền thì máy chủ tự chặn nên gọi thừa cũng vô hại.
     */
    fun danhDauDaDoc() {
        viewModelScope.launch {
            val phone = runCatching { tokenStore.bookingPhoneOnce() }.getOrDefault("")
            if (phone.isNotBlank()) runCatching { api.markGuestNotificationsRead(MarkReadBody(phone)) }
            runCatching { api.markPartnerNotificationsRead() }
            runCatching { api.markAdminNotificationsRead() }
            _state.update { s -> s.copy(items = s.items.map { it.copy(read = true) }, unread = 0) }
        }
    }
}

@kotlinx.serialization.Serializable
data class MarkReadBody(val phone: String)
