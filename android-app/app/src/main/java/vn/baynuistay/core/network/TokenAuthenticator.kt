package vn.baynuistay.core.network

import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.Json
import okhttp3.Authenticator
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import okhttp3.Route
import vn.baynuistay.BuildConfig
import vn.baynuistay.core.local.TokenStore

/**
 * Xin token mới khi máy chủ trả 401.
 *
 * Token đăng nhập của Firebase chỉ sống 1 tiếng. Trước đây app lưu token rồi
 * dùng mãi, và tệ hơn: `refreshProfile()` gọi lỗi là XOÁ LUÔN phiên đăng nhập.
 * Nên khách đăng nhập hôm nay, mai mở app ra thấy mình bị đăng xuất mà chẳng
 * hiểu vì sao — trong khi Firebase vẫn cho gia hạn thoải mái.
 *
 * Dùng Authenticator của OkHttp chứ không phải Interceptor: OkHttp chỉ gọi
 * Authenticator KHI đã nhận 401, rồi tự phát lại đúng lời gọi vừa hỏng. Nghĩa
 * là mọi màn hình đều được vá mà không phải sửa dòng nào trong chúng.
 */
@Singleton
class TokenAuthenticator @Inject constructor(
    private val tokenStore: TokenStore,
) : Authenticator {

    // Client riêng, KHÔNG gắn authenticator này. Dùng chung client thì lời gọi
    // gia hạn mà lỗi 401 sẽ lại gọi chính nó — quay vòng vô tận.
    private val bare by lazy { OkHttpClient.Builder().build() }
    private val json = Json { ignoreUnknownKeys = true }

    override fun authenticate(route: Route?, response: Response): Request? {
        // Đã thử gia hạn ở lần trước mà vẫn 401 thì dừng, đừng lặp.
        if (response.priorResponse != null) return boCuoc()

        val refreshToken = runBlocking { tokenStore.refreshToken.first() }
        // Phiên cũ lưu từ bản 0.1.0 chỉ có token đăng nhập, không có refresh
        // token. Token đó chết sau một tiếng và không gia hạn được, nên phải
        // xoá — xem boCuoc() để biết vì sao chuyện này quan trọng.
        if (refreshToken.isBlank()) return boCuoc()

        val moi = runCatching { xinTokenMoi(refreshToken) }.getOrNull()
            // Refresh token cũng hỏng — lúc này mới thật sự phải đăng nhập lại.
            ?: return boCuoc()

        runBlocking { tokenStore.saveTokens(moi.first, moi.second) }

        return response.request.newBuilder()
            .header("Authorization", "Bearer ${moi.first}")
            .build()
    }

    /**
     * Hết đường gia hạn: xoá phiên rồi báo OkHttp thôi thử lại.
     *
     * Phải xoá chứ không được để yên. Màn hình Cá nhân coi "còn token" là
     * "đang đăng nhập", nên một token chết mà vẫn nằm đó thì app hiện tên
     * khách với nút Đăng xuất, KHÔNG hiện chỗ đăng nhập — trong khi mọi lời
     * gọi đều bị 401. Khách thấy đúng một điều: app không đăng nhập được, và
     * cũng chẳng có nút nào để đăng nhập lại.
     *
     * Xoá xong thì màn hình tự về trạng thái khách vãng lai (nó đang theo dõi
     * token trong ổ lưu), thẻ "Đăng nhập hoặc tạo tài khoản" hiện lại ngay.
     *
     * Chỉ 401 mới vào tới đây. Mất mạng thì lời gọi ném lỗi chứ không có mã
     * 401, nên đi chơi vùng sóng yếu không bị đăng xuất oan. Endpoint quản
     * trị mà thiếu quyền thì máy chủ trả 403, cũng không rơi vào đây.
     */
    private fun boCuoc(): Request? {
        runBlocking { tokenStore.clear() }
        return null
    }

    /** @return cặp (token mới, refresh token mới) */
    private fun xinTokenMoi(refreshToken: String): Pair<String, String>? {
        val body = """{"refresh_token":"$refreshToken"}"""
            .toRequestBody("application/json".toMediaType())

        val req = Request.Builder()
            .url(BuildConfig.API_BASE_URL.trimEnd('/') + "/v1/auth/refresh")
            .post(body)
            .build()

        bare.newCall(req).execute().use { res ->
            if (!res.isSuccessful) return null
            val text = res.body?.string().orEmpty()
            val parsed = runCatching { json.decodeFromString<RefreshResponse>(text) }.getOrNull()
                ?: return null
            if (parsed.token.isBlank()) return null
            return parsed.token to parsed.refreshToken.ifBlank { refreshToken }
        }
    }
}

@kotlinx.serialization.Serializable
private data class RefreshResponse(
    val token: String = "",
    @kotlinx.serialization.SerialName("refresh_token") val refreshToken: String = "",
)
