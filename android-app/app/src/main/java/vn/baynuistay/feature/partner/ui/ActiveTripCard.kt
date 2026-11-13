package vn.baynuistay.feature.partner.ui

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Call
import androidx.compose.material.icons.rounded.Navigation
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import vn.baynuistay.core.network.AcceptedRideDto
import vn.baynuistay.feature.booking.ui.LiveMapView
import vn.baynuistay.core.ui.theme.LmNavy
import vn.baynuistay.core.ui.theme.LmAmber

// ════════════════════════════════════════════════════════════
// CHUYẾN ĐANG CHẠY
// ════════════════════════════════════════════════════════════
// Nhận chuyến xong, tài xế cần đúng ba thứ: đường tới điểm đón, số điện
// thoại khách, và một nút báo đã đón. Trong lúc đó app gửi vị trí xe về
// máy chủ 20 giây/lần để khách theo dõi trên bản đồ.

/**
 * Mở Google Maps ở chế độ chỉ đường. Ưu tiên toạ độ vì tên địa danh vùng
 * Bảy Núi hay bị Maps hiểu sai; không có toạ độ mới dùng tên.
 */
private fun openNavigation(context: Context, lat: Double?, lng: Double?, label: String) {
    val target = if (lat != null && lng != null) "$lat,$lng" else Uri.encode(label)
    // google.navigation mở thẳng chế độ dẫn đường, không phải chỉ xem bản đồ.
    // Thử lần lượt cho tới khi mở được; máy thiếu cả Maps lẫn trình duyệt thì
    // thôi, chứ không để văng ActivityNotFoundException giữa lúc đang chạy xe.
    val attempts = listOf(
        Intent(Intent.ACTION_VIEW, Uri.parse("google.navigation:q=$target"))
            .apply { setPackage("com.google.android.apps.maps") },
        Intent(Intent.ACTION_VIEW, Uri.parse("google.navigation:q=$target")),
        Intent(Intent.ACTION_VIEW, Uri.parse("https://www.google.com/maps/dir/?api=1&destination=$target")),
    )
    for (intent in attempts) {
        if (runCatching { context.startActivity(intent) }.isSuccess) return
    }
}

private fun callGuest(context: Context, phone: String) {
    if (phone.isBlank()) return
    runCatching { context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:$phone"))) }
}

@Composable
fun ActiveTripCard(
    trip: AcceptedRideDto,
    stage: String,
    sharing: Boolean,
    needsLocation: Boolean,
    onStage: (String) -> Unit,
    onGrantLocation: () -> Unit,
    onDismiss: () -> Unit,
) {
    val context = LocalContext.current
    val onboard = stage == "onboard"

    Surface(
        shape = RoundedCornerShape(22.dp),
        color = LmNavy,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text(
                if (onboard) "Đang chở khách" else "Đang tới đón khách",
                style = MaterialTheme.typography.titleLarge,
                color = Color.White,
            )
            Text(
                if (onboard) "Điểm đến: ${trip.dropoff}" else "Điểm đón: ${trip.pickup}",
                style = MaterialTheme.typography.bodyMedium,
                color = Color.White.copy(alpha = .78f),
            )
            Text(
                "${trip.guestName} · ${trip.guestPhone}",
                style = MaterialTheme.typography.bodyMedium,
                color = LmAmber,
            )

            // Cùng một bản đồ mà khách đang xem: tài xế thấy mình đang ở đâu so
            // với điểm đón, đón khách xong thì ghim tự chuyển sang điểm đến.
            // Đây là bản đồ để LIẾC, còn dẫn đường từng chặng thì bấm "Chỉ đường".
            LiveMapView(bookingId = trip.bookingId, height = 180.dp)
            // Chỉ nói "đang gửi" khi thật sự đã gửi được, không hứa suông
            when {
                needsLocation -> Surface(
                    onClick = onGrantLocation,
                    shape = RoundedCornerShape(12.dp),
                    color = LmAmber.copy(alpha = .18f),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(
                        "Chưa chia sẻ được vị trí cho khách. Chạm để cho phép truy cập vị trí.",
                        Modifier.padding(12.dp),
                        style = MaterialTheme.typography.bodySmall,
                        color = LmAmber,
                    )
                }
                sharing -> Text(
                    "Vị trí xe đang được gửi cho khách theo dõi.",
                    style = MaterialTheme.typography.bodySmall,
                    color = Color.White.copy(alpha = .55f),
                )
                else -> Text(
                    "Đang lấy vị trí xe…",
                    style = MaterialTheme.typography.bodySmall,
                    color = Color.White.copy(alpha = .55f),
                )
            }

            Row(
                Modifier.fillMaxWidth().padding(top = 4.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Button(
                    onClick = {
                        if (onboard) openNavigation(context, null, null, trip.dropoff)
                        else openNavigation(context, trip.pickupLat, trip.pickupLng, trip.pickup)
                    },
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = LmAmber, contentColor = LmNavy),
                    modifier = Modifier.weight(1f).height(48.dp),
                ) {
                    Icon(Icons.Rounded.Navigation, null, Modifier.size(18.dp))
                    Spacer(Modifier.width(7.dp))
                    Text("Chỉ đường")
                }
                OutlinedButton(
                    onClick = { callGuest(context, trip.guestPhone) },
                    shape = RoundedCornerShape(14.dp),
                    modifier = Modifier.height(48.dp),
                ) {
                    Icon(Icons.Rounded.Call, "Gọi khách", Modifier.size(18.dp), tint = Color.White)
                }
            }

            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Button(
                    onClick = { onStage(if (onboard) "done" else "onboard") },
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color.White.copy(alpha = .16f),
                        contentColor = Color.White,
                    ),
                    modifier = Modifier.weight(1f).height(46.dp),
                ) {
                    Text(if (onboard) "Đã trả khách" else "Đã đón khách")
                }
                TextButton(onClick = onDismiss) {
                    Text("Ẩn", color = Color.White.copy(alpha = .6f))
                }
            }
        }
    }
}
