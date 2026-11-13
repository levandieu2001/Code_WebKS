package vn.baynuistay.feature.auth.ui

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
import vn.baynuistay.feature.auth.data.AuthRepository
import vn.baynuistay.core.ui.lang.AppLangHolder.pick

data class AuthUiState(
    val isRegister: Boolean = false,
    val fullName: String = "",
    val email: String = "",
    val password: String = "",
    val loading: Boolean = false,
    val error: String? = null,
    val success: Boolean = false,
)

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val repository: AuthRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(AuthUiState())
    val state: StateFlow<AuthUiState> = _state.asStateFlow()

    fun setMode(register: Boolean) = _state.update { it.copy(isRegister = register, error = null) }
    fun setFullName(value: String) = _state.update { it.copy(fullName = value) }
    fun setEmail(value: String) = _state.update { it.copy(email = value) }
    fun setPassword(value: String) = _state.update { it.copy(password = value) }

    fun submit() {
        val current = _state.value
        if (current.loading) return

        // Kiểm tra tại chỗ cho phản hồi nhanh; backend vẫn kiểm tra lại.
        val email = current.email.trim()
        if (!Regex("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$").matches(email)) {
            _state.update { it.copy(error = pick("Email chưa đúng định dạng.", "That email address is not valid.")) }
            return
        }
        if (current.password.length < 6) {
            _state.update { it.copy(error = pick("Mật khẩu phải có ít nhất 6 ký tự.", "Password must be at least 6 characters.")) }
            return
        }
        if (current.isRegister && current.fullName.trim().length < 2) {
            _state.update { it.copy(error = pick("Bạn nhập họ tên giúp mình nhé.", "Please enter your full name.")) }
            return
        }

        viewModelScope.launch {
            _state.update { it.copy(loading = true, error = null) }
            runCatching {
                if (current.isRegister) {
                    repository.register(email, current.password, current.fullName.trim())
                } else {
                    repository.login(email, current.password)
                }
            }.onSuccess {
                _state.update { it.copy(loading = false, success = true) }
            }.onFailure { error ->
                _state.update { it.copy(loading = false, error = ApiError.message(error)) }
            }
        }
    }
}
