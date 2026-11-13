package vn.baynuistay.core.ui.lang

import androidx.compose.runtime.Composable
import androidx.compose.runtime.ProvidedValue
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.runtime.compositionLocalOf

/**
 * Ngôn ngữ hiển thị của app.
 *
 * Không dùng `res/values-en/strings.xml` như cách thường thấy, vì hai lý do:
 *
 *  1. Bản dịch nằm ngay cạnh câu tiếng Việt trong file màn hình. Sửa một câu
 *     là thấy luôn cả hai bản, khỏi nhảy sang file khác dò theo tên khoá —
 *     kiểu tách file rất dễ để sót câu chưa dịch mà không ai biết.
 *  2. Khách đổi ngôn ngữ NGAY TRONG app chứ không đổi ngôn ngữ điện thoại.
 *     Với resource của Android, muốn đổi ngôn ngữ trong app phải dựng lại
 *     Activity; ở đây chỉ cần đổi một giá trị là Compose tự vẽ lại.
 *
 * Nội dung do máy chủ trả về (tên địa điểm, mô tả) đã có sẵn trường tiếng Anh
 * riêng — xem `AppLang.pick`.
 */
enum class AppLang(val code: String) {
    VI("vi"),
    EN("en");

    val isEn: Boolean get() = this == EN

    companion object {
        fun from(code: String?): AppLang = if (code == "en") EN else VI
    }
}

/**
 * Mặc định tiếng Việt để bản xem trước trong Android Studio và mọi màn hình
 * chưa kịp bọc `ProvideAppLang` vẫn hiển thị đúng thay vì rỗng.
 */
val LocalAppLang = compositionLocalOf { AppLang.VI }

/**
 * Bản sao ngôn ngữ cho phần KHÔNG phải giao diện.
 *
 * ViewModel và lớp mạng cũng sinh ra câu chữ cho khách đọc — chủ yếu là thông
 * báo lỗi — nhưng chúng không nằm trong cây Compose nên không đọc được
 * CompositionLocal. Không có chỗ này thì khách đang dùng tiếng Anh mất mạng sẽ
 * nhận đúng một câu tiếng Việt.
 *
 * MainActivity ghi vào đây mỗi lần ngôn ngữ đổi. Chỉ một luồng ghi, nhiều
 * luồng đọc, nên `@Volatile` là đủ.
 */
object AppLangHolder {
    @Volatile
    var current: AppLang = AppLang.VI

    /** Chọn câu ngoài Compose. Cùng vai trò với [tr] nhưng gọi được ở mọi nơi. */
    fun pick(vi: String, en: String): String = if (current.isEn) en else vi
}

/** Bọc quanh cây giao diện để mọi màn hình bên trong đọc được ngôn ngữ. */
fun provideLang(lang: AppLang): ProvidedValue<AppLang> = LocalAppLang provides lang

/**
 * Chọn câu theo ngôn ngữ đang bật.
 *
 * Đặt tên ngắn vì gọi rất nhiều lần trong mỗi màn hình:
 * `Text(tr("Đặt phòng", "Book a room"))`
 */
@Composable
@ReadOnlyComposable
fun tr(vi: String, en: String): String = if (LocalAppLang.current.isEn) en else vi

/**
 * Chọn bản dịch cho dữ liệu MÁY CHỦ trả về.
 *
 * Trường tiếng Anh có thể rỗng khi nội dung mới thêm chưa kịp dịch — lúc đó
 * trả bản tiếng Việt còn hơn để trống một khoảng trắng trên màn hình.
 */
@Composable
@ReadOnlyComposable
fun trData(vi: String?, en: String?): String =
    if (LocalAppLang.current.isEn && !en.isNullOrBlank()) en else vi.orEmpty()
