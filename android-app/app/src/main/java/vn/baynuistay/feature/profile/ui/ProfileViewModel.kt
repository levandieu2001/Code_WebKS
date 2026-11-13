package vn.baynuistay.feature.profile.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import vn.baynuistay.core.local.TokenStore
import vn.baynuistay.feature.auth.data.AuthRepository

data class ProfileUiState(
    val loggedIn: Boolean = false,
    val name: String = "",
    val email: String = "",
    /** Máy chủ xác nhận tài khoản này có quyền quản trị. */
    val isAdmin: Boolean = false,
)

@HiltViewModel
class ProfileViewModel @Inject constructor(
    private val repository: AuthRepository,
    private val tokenStore: TokenStore,
) : ViewModel() {
    private val _state = MutableStateFlow(ProfileUiState())
    val state: StateFlow<ProfileUiState> = _state.asStateFlow()

    init {
        viewModelScope.launch {
            combine(tokenStore.token, tokenStore.displayName, tokenStore.email) { token, name, email ->
                ProfileUiState(loggedIn = !token.isNullOrBlank(), name = name, email = email)
            }.collect { next ->
                // Giữ lại cờ quản trị đã hỏi được. Dựng thẳng ProfileUiState mới
                // là xoá nó về false, mà tên với email thì cập nhật liên tục —
                // mục Quản trị vừa hiện ra đã biến mất.
                _state.value = next.copy(isAdmin = next.loggedIn && _state.value.isAdmin)
            }
        }

        // Hỏi máy chủ xem tài khoản này có quyền quản trị không. Không tự đoán
        // theo email ở máy khách: danh sách admin nằm ở máy chủ và có thể đổi.
        //
        // Theo dõi token chứ KHÔNG hỏi một lần lúc mở màn hình. Bản trước hỏi
        // đúng một lần trong init: khách mở tab Cá nhân lúc chưa đăng nhập là
        // lời gọi đó trả 401, rồi họ đăng nhập bằng tài khoản admin ngay tại
        // đó — nhưng ViewModel vẫn sống nên không ai hỏi lại. Kết quả: đăng
        // nhập đúng tài khoản admin mà mục Quản trị không hiện, phải tắt hẳn
        // app mở lại mới thấy.
        viewModelScope.launch {
            tokenStore.token
                .map { it.orEmpty() }
                .distinctUntilChanged()
                .collect { token ->
                    if (token.isBlank()) {
                        _state.update { it.copy(isAdmin = false) }
                        return@collect
                    }
                    val me = repository.refreshProfile()
                    if (me != null) _state.update { it.copy(isAdmin = me.isAdmin) }
                }
        }
    }

    /**
     * Đổi ngôn ngữ hiển thị.
     *
     * Chỉ ghi vào ổ lưu; MainActivity đang thu thập giá trị này nên Compose tự
     * vẽ lại toàn app. Header `Accept-Language` gửi lên máy chủ cũng đọc cùng
     * chỗ, nên nội dung do máy chủ trả về đổi theo luôn.
     */
    fun setLanguage(code: String) {
        viewModelScope.launch { tokenStore.setLanguage(code) }
    }

    fun logout() {
        viewModelScope.launch {
            repository.logout()
            _state.update { ProfileUiState() }
        }
    }
}
