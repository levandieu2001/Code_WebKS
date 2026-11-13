package vn.baynuistay.core.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// ════════════════════════════════════════════════════════════
// BẢNG MÀU GIAO DIỆN
// ════════════════════════════════════════════════════════════
// BÀI HỌC XƯƠNG MÁU: phải khai ĐỦ bộ màu, không được khai vài cái rồi thôi.
//
// Trước đây bảng màu tối chỉ khai 6 màu (primary, secondary, background,
// onBackground, surface, onSurface). Mọi màu còn lại rơi về mặc định của
// Material 3 — mà mặc định đó là MÀU TÍM. Máy ảo để chế độ sáng nên không lộ;
// mở trên điện thoại thật đang bật chế độ tối thì nút bấm, thẻ giá, chữ nhấn
// đều hoá tím, chẳng còn chút nào của LOCALMATE.
//
// Vì vậy bên dưới khai đủ cả hai bảng, kể cả những màu tưởng như không dùng
// tới — Material 3 lấy chúng cho ripple, viền, thẻ nổi, hộp thoại…
//
// Ba vai trò, đúng như bên web:
//   primary   = xanh  → nút thường, chữ nhấn, mục đang chọn
//   tertiary  = cam   → CHỈ nút hành động chính (đặt phòng, đặt món)
//   secondary = xanh lá → trạng thái tốt, đã xong

private val LightColors = lightColorScheme(
    primary = LmBlue,
    onPrimary = Color.White,
    primaryContainer = LmBlueSoft,
    onPrimaryContainer = LmBlueDark,

    secondary = LmGreen,
    onSecondary = Color.White,
    secondaryContainer = Color(0xFFDCF5E6),
    onSecondaryContainer = Color(0xFF0B5B2A),

    // Cam: nút hành động chính. Material gọi là "tertiary" nhưng ở đây nó là
    // màu đáng chú ý nhất — dùng đúng một chỗ mỗi màn hình.
    tertiary = LmOrange,
    onTertiary = Color.White,
    tertiaryContainer = Color(0xFFFFE3D2),
    onTertiaryContainer = LmOrangeDark,

    background = LmBgSoft,
    onBackground = LmInk,
    surface = LmSurface,
    onSurface = LmInk,
    surfaceVariant = Color(0xFFEDF2F9),
    onSurfaceVariant = LmMuted,
    surfaceContainerLowest = Color(0xFFFFFFFF),
    surfaceContainerLow = Color(0xFFFAFCFF),
    surfaceContainer = LmBgSoft,
    surfaceContainerHigh = Color(0xFFEEF3FA),
    surfaceContainerHighest = Color(0xFFE7EEF7),
    inverseSurface = LmNavy,
    inverseOnSurface = Color(0xFFEDF3FB),
    inversePrimary = Color(0xFF8FC2F5),

    outline = Color(0xFFB3C0D2),
    outlineVariant = LmLine,
    scrim = Color(0xFF000000),

    error = Color(0xFFB3261E),
    onError = Color.White,
    errorContainer = Color(0xFFF9DEDC),
    onErrorContainer = Color(0xFF601410),
)

// Bảng tối: vẫn là xanh LOCALMATE, chỉ đảo sáng–tối. Không mượn tím của
// Material, cũng không lấy màu theo hình nền máy người dùng — thương hiệu phải
// giữ nguyên trên mọi máy.
private val DarkColors = darkColorScheme(
    primary = Color(0xFF8FC2F5),
    onPrimary = Color(0xFF00305F),
    primaryContainer = LmBlueDark,
    onPrimaryContainer = LmBlueSoft,

    secondary = Color(0xFF7EDCA4),
    onSecondary = Color(0xFF00391A),
    secondaryContainer = Color(0xFF0B5B2A),
    onSecondaryContainer = Color(0xFFDCF5E6),

    tertiary = Color(0xFFFFB185),
    onTertiary = Color(0xFF5A2400),
    tertiaryContainer = LmOrangeDark,
    onTertiaryContainer = Color(0xFFFFE3D2),

    background = Color(0xFF0B1420),
    onBackground = Color(0xFFE4EBF5),
    surface = Color(0xFF0B1420),
    onSurface = Color(0xFFE4EBF5),
    surfaceVariant = Color(0xFF243247),
    onSurfaceVariant = Color(0xFFB8C4D6),
    surfaceContainerLowest = Color(0xFF070E17),
    surfaceContainerLow = Color(0xFF111C2B),
    surfaceContainer = Color(0xFF152131),
    surfaceContainerHigh = Color(0xFF1D2B3D),
    surfaceContainerHighest = Color(0xFF263549),
    inverseSurface = Color(0xFFE4EBF5),
    inverseOnSurface = LmInk,
    inversePrimary = LmBlue,

    outline = Color(0xFF7E8B9E),
    outlineVariant = Color(0xFF33415A),
    scrim = Color(0xFF000000),

    error = Color(0xFFF2B8B5),
    onError = Color(0xFF601410),
    errorContainer = Color(0xFF8C1D18),
    onErrorContainer = Color(0xFFF9DEDC),
)

/**
 * @param darkTheme mặc định FALSE — app luôn dùng giao diện sáng.
 *
 * Vì sao không bám theo chế độ tối của máy: bản thiết kế của LOCALMATE là nền
 * trắng, xanh biển, điểm cam — giống hệt trang web. Điện thoại đang bật chế độ
 * tối thì app hoá nền đen, không còn nhận ra là cùng một thương hiệu với web
 * nữa. Bảng màu tối vẫn giữ ở trên, sẵn sàng cho khi nào muốn bật.
 */
@Composable
fun BayNuiTheme(
    darkTheme: Boolean = false,
    content: @Composable () -> Unit,
) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColors else LightColors,
        typography = BayNuiTypography,
        content = content,
    )
}
