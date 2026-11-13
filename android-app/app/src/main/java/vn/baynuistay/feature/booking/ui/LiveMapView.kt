package vn.baynuistay.feature.booking.ui

import android.annotation.SuppressLint
import android.view.ViewGroup
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import vn.baynuistay.BuildConfig

// ════════════════════════════════════════════════════════════
// BẢN ĐỒ XE CHẠY (dùng chung với web)
// ════════════════════════════════════════════════════════════
// App KHÔNG tự vẽ lại bản đồ mà mở thẳng trang /theoxe.html của máy chủ trong
// một WebView. Lý do:
//   - Google Maps SDK cho Android bắt buộc API key có gắn thẻ thanh toán;
//     dự án phải chạy được ngay, không phụ thuộc vào thẻ.
//   - Web và app dùng CHUNG một đoạn mã, nên xe chạy, ghim điểm đến và cách
//     tính quãng đường luôn giống hệt nhau. Sửa một chỗ là cả hai cùng đúng.

/**
 * @param bookingId mã đơn cần bám.
 * @param embed true = chỉ hiện bản đồ (thẻ đơn đã in sẵn tên tài xế, số km);
 *              false = hiện cả thanh thông tin bên dưới.
 */
@SuppressLint("SetJavaScriptEnabled")
@Composable
fun LiveMapView(
    bookingId: String,
    modifier: Modifier = Modifier,
    height: Dp = 220.dp,
    embed: Boolean = true,
) {
    // API_BASE_URL có sẵn dấu "/" ở cuối
    val url = "${BuildConfig.API_BASE_URL}theoxe.html?id=$bookingId" + if (embed) "&embed=1" else ""

    AndroidView(
        modifier = modifier.fillMaxWidth().height(height).clip(RoundedCornerShape(14.dp)),
        factory = { context ->
            WebView(context).apply {
                layoutParams = ViewGroup.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT,
                )
                // Trang bản đồ chạy bằng JavaScript nên bắt buộc bật.
                // Chỉ tải đúng trang của máy chủ mình, không mở link ngoài.
                settings.javaScriptEnabled = true
                settings.domStorageEnabled = true
                // Bản đồ đổi liên tục trong lúc phát triển; đừng để WebView giữ
                // bản cũ rồi báo lỗi "đã sửa rồi mà không thấy đổi".
                settings.cacheMode = android.webkit.WebSettings.LOAD_NO_CACHE
                webViewClient = WebViewClient()
                // Không có cái này thì lỗi JavaScript trong trang im lặng hoàn
                // toàn — bản đồ trắng mà không biết vì sao.
                webChromeClient = object : android.webkit.WebChromeClient() {
                    override fun onConsoleMessage(m: android.webkit.ConsoleMessage): Boolean {
                        android.util.Log.d(
                            "BayNuiMap",
                            "${m.messageLevel()} ${m.message()} @${m.sourceId()}:${m.lineNumber()}",
                        )
                        return true
                    }
                }
                setBackgroundColor(android.graphics.Color.parseColor("#DFE6D5"))
                isHorizontalScrollBarEnabled = false
                isVerticalScrollBarEnabled = false
                tag = url
                loadUrl(url)
            }
        },
        // Chỉ nạp lại khi ĐỔI đơn. Gọi loadUrl mỗi lần Compose vẽ lại sẽ làm
        // bản đồ giật và tile tải lại liên tục.
        update = { web ->
            if (web.tag != url) {
                web.tag = url
                web.loadUrl(url)
            }
        },
    )
}
