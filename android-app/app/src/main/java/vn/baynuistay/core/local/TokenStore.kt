package vn.baynuistay.core.local

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.authDataStore by preferencesDataStore(name = "auth")

@Singleton
class TokenStore @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    private val tokenKey = stringPreferencesKey("access_token")
    // Token đăng nhập chỉ sống 1 tiếng; refresh token thì rất lâu và đổi được
    // lấy token mới bao nhiêu lần cũng được. Không giữ nó thì khách bị đăng
    // xuất sau mỗi tiếng mà chẳng có lý do gì.
    private val refreshKey = stringPreferencesKey("refresh_token")
    private val languageKey = stringPreferencesKey("language")
    private val nameKey = stringPreferencesKey("display_name")
    private val emailKey = stringPreferencesKey("email")
    // Lịch trình vừa tạo, để tab "Chuyến đi" mở lại đúng chuyến đó
    private val tripKey = stringPreferencesKey("last_trip_id")
    // Số điện thoại khách đã dùng khi đặt — nhớ lại để lần sau mở "Đơn của tôi"
    // là thấy đơn ngay, không phải gõ lại số.
    private val bookingPhoneKey = stringPreferencesKey("booking_phone")
    // Bản app khách đã bấm "Để sau". Nhớ lại để không hỏi đi hỏi lại mỗi lần
    // mở app — phiền tới mức khách tắt thông báo luôn thì mất cả bản bắt buộc.
    private val skippedVersionKey = androidx.datastore.preferences.core.intPreferencesKey("skipped_version")

    val token: Flow<String?> = context.authDataStore.data.map { it[tokenKey] }
    val refreshToken: Flow<String> = context.authDataStore.data.map { it[refreshKey] ?: "" }
    val language: Flow<String> = context.authDataStore.data.map { it[languageKey] ?: "vi" }
    val displayName: Flow<String> = context.authDataStore.data.map { it[nameKey] ?: "" }
    val email: Flow<String> = context.authDataStore.data.map { it[emailKey] ?: "" }
    val lastTripId: Flow<String> = context.authDataStore.data.map { it[tripKey] ?: "" }
    val bookingPhone: Flow<String> = context.authDataStore.data.map { it[bookingPhoneKey] ?: "" }

    suspend fun saveLastTripId(value: String) {
        context.authDataStore.edit { it[tripKey] = value }
    }

    /** Đọc một lần, dùng ở chỗ không tiện thu thập Flow (như dịch vụ nhận push). */
    suspend fun bookingPhoneOnce(): String = bookingPhone.first()

    suspend fun saveBookingPhone(value: String) {
        if (value.isBlank()) return
        context.authDataStore.edit { it[bookingPhoneKey] = value }
    }

    /** Lưu cặp token sau khi đăng nhập hoặc sau mỗi lần gia hạn. */
    suspend fun saveTokens(token: String, refresh: String) {
        context.authDataStore.edit { prefs ->
            if (token.isNotBlank()) prefs[tokenKey] = token
            if (refresh.isNotBlank()) prefs[refreshKey] = refresh
        }
    }

    suspend fun saveToken(value: String?) {
        context.authDataStore.edit { prefs ->
            if (value == null) prefs.remove(tokenKey) else prefs[tokenKey] = value
        }
    }

    /** Lưu phiên đăng nhập. Truyền token = null để giữ token cũ, chỉ cập nhật hồ sơ. */
    suspend fun saveSession(token: String?, fullName: String, email: String) {
        context.authDataStore.edit { prefs ->
            if (!token.isNullOrBlank()) prefs[tokenKey] = token
            if (fullName.isNotBlank()) prefs[nameKey] = fullName
            if (email.isNotBlank()) prefs[emailKey] = email
        }
    }

    suspend fun clear() {
        context.authDataStore.edit { prefs ->
            prefs.remove(tokenKey)
            prefs.remove(refreshKey)
            prefs.remove(nameKey)
            prefs.remove(emailKey)
        }
    }

    /** Bản app khách đã bỏ qua. 0 = chưa bỏ qua bản nào. */
    suspend fun skippedVersionOnce(): Int =
        context.authDataStore.data.map { it[skippedVersionKey] ?: 0 }.first()

    suspend fun skipVersion(code: Int) {
        context.authDataStore.edit { it[skippedVersionKey] = code }
    }

    suspend fun setLanguage(value: String) {
        context.authDataStore.edit { it[languageKey] = value }
    }
}
