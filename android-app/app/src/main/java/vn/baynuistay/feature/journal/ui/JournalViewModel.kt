package vn.baynuistay.feature.journal.ui

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
import vn.baynuistay.core.network.ApiError
import vn.baynuistay.core.network.BayNuiApi
import vn.baynuistay.core.network.JournalResponse

data class JournalUiState(
    val loading: Boolean = true,
    val data: JournalResponse? = null,
    val error: String? = null,
)

/**
 * Nhật ký chuyến đi.
 *
 * Không hỏi khách nhập gì cả: họ đã đăng nhập nên token là đủ để máy chủ biết
 * đơn nào của ai.
 *
 * Vẫn gửi kèm số điện thoại đã lưu từ lần đặt trước. Lý do: khách hay đặt
 * phòng lúc chưa đăng nhập — những đơn đó chỉ gắn với số điện thoại chứ không
 * gắn tài khoản. Bỏ qua thì nhật ký thiếu mất đúng phần đầu tiên của câu
 * chuyện, mà đó lại là chuyến đi khiến họ tải app.
 */
@HiltViewModel
class JournalViewModel @Inject constructor(
    private val api: BayNuiApi,
    private val tokenStore: TokenStore,
) : ViewModel() {

    private val _state = MutableStateFlow(JournalUiState())
    val state: StateFlow<JournalUiState> = _state.asStateFlow()

    init { load() }

    fun load() {
        _state.update { it.copy(loading = true, error = null) }
        viewModelScope.launch {
            val phone = runCatching { tokenStore.bookingPhoneOnce() }.getOrDefault("")
            try {
                _state.update { it.copy(loading = false, data = api.journal(phone)) }
            } catch (e: Exception) {
                _state.update { it.copy(loading = false, error = ApiError.message(e)) }
            }
        }
    }
}
