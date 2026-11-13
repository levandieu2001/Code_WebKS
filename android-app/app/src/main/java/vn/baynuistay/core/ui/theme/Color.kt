package vn.baynuistay.core.ui.theme

import androidx.compose.ui.graphics.Color

// ════════════════════════════════════════════════════════════
// MÀU LOCALMATE
// ════════════════════════════════════════════════════════════
// Lấy đúng bộ màu của web (public/css/localmate.css) để app và web nhìn ra là
// cùng một thương hiệu. Trước đây app còn dùng bộ màu đất — nâu terracotta,
// nền cát, xanh rừng — của bản thiết kế cũ, mở app cạnh web là thấy hai nơi
// khác hẳn nhau.
//
// Xanh lấy từ chữ trong logo, cam lấy từ mặt trời trong logo.
//
// LUẬT DÙNG CAM: chỉ cho nút hành động chính. Rải cam khắp nơi thì không còn
// chỗ nào nổi bật nữa — đây là luật bên web, app giữ y như vậy.

/** Xanh chủ đạo — chữ LOCALMATE trong logo. */
val LmBlue = Color(0xFF0F6FD0)

/** Xanh đậm hơn — chữ nhấn, trạng thái đã bấm. */
val LmBlueDark = Color(0xFF0A4F97)

/** Xanh rất đậm — chân trang, nền tối, thanh bên. */
val LmNavy = Color(0xFF012D6B)

/** Xanh đậm vừa — nền tối nhạt hơn một bậc. */
val LmNavySoft = Color(0xFF073B7F)

/** Xanh rất nhạt — nền ô đang chọn, nhãn nhẹ. */
val LmBlueSoft = Color(0xFFEAF4FE)

/** Cam — CHỈ cho nút hành động chính. */
val LmOrange = Color(0xFFFF7A2F)
val LmOrangeDark = Color(0xFFED6414)

/** Vàng hổ phách — huy hiệu, con dấu hộ chiếu, sao đánh giá. Không phải cam:
 *  cam để dành riêng cho nút hành động. */
val LmAmber = Color(0xFFF5A623)

/** Xanh lá — trạng thái tốt, đã xong. */
val LmGreen = Color(0xFF16A34A)
val LmSuccess = Color(0xFF16A34A)

/** Nền trang và mặt thẻ. */
val LmBgSoft = Color(0xFFF6F9FD)
val LmSurface = Color(0xFFFFFFFF)

/** Chữ. */
val LmInk = Color(0xFF16233A)
val LmBody = Color(0xFF46536B)
val LmMuted = Color(0xFF7A879C)

/** Đường kẻ mảnh. */
val LmLine = Color(0xFFE3E9F2)
