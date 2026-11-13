package vn.baynuistay.feature.auth.data

import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import vn.baynuistay.core.local.TokenStore
import vn.baynuistay.core.network.AuthRequest
import vn.baynuistay.core.network.BayNuiApi
import vn.baynuistay.core.network.UserDto

@Singleton
class AuthRepository @Inject constructor(
    private val api: BayNuiApi,
    private val tokenStore: TokenStore,
) {
    val isLoggedIn: Flow<Boolean> = tokenStore.token.map { !it.isNullOrBlank() }
    val savedName: Flow<String> = tokenStore.displayName

    suspend fun register(email: String, password: String, fullName: String): UserDto {
        val res = api.register(AuthRequest(email = email, password = password, fullName = fullName))
        tokenStore.saveSession(res.token, res.user.fullName, res.user.email)
        tokenStore.saveTokens(res.token, res.refreshToken)
        return res.user
    }

    suspend fun login(email: String, password: String): UserDto {
        val res = api.login(AuthRequest(email = email, password = password))
        tokenStore.saveSession(res.token, res.user.fullName, res.user.email)
        tokenStore.saveTokens(res.token, res.refreshToken)
        return res.user
    }

    /**
     * Lấy lại hồ sơ để biết phiên còn dùng được không.
     *
     * KHÔNG xoá phiên khi gọi lỗi. Bản trước xoá ngay, nên chỉ cần mất mạng
     * một lúc — hoặc token vừa quá hạn một tiếng — là khách bị đăng xuất.
     * Token quá hạn đã có TokenAuthenticator lo gia hạn rồi tự gọi lại; nó chỉ
     * xoá phiên khi chính refresh token cũng hỏng.
     */
    suspend fun refreshProfile(): UserDto? = runCatching { api.me().user }
        .onSuccess { tokenStore.saveSession(null, it.fullName, it.email) }
        .getOrNull()

    suspend fun logout() = tokenStore.clear()
}
