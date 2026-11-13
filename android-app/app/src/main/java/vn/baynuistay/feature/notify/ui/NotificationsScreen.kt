package vn.baynuistay.feature.notify.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.ArrowBack
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import vn.baynuistay.core.ui.lang.tr
import vn.baynuistay.core.ui.theme.LmNavy
import vn.baynuistay.core.ui.theme.LmMuted
import vn.baynuistay.core.ui.theme.LmBlue

/**
 * Màn hình Thông báo.
 *
 * Trước đây cái chuông trên đầu trang chủ chỉ để đó, bấm không ra gì. Mọi thông
 * báo máy chủ gửi (đơn mới, xác nhận cọc, chuyến ghép chắc chạy hay bị huỷ) đều
 * chỉ hiện lên thanh thông báo của điện thoại rồi trôi mất — vuốt đi là không
 * còn đường nào xem lại.
 */
@Composable
fun NotificationsScreen(
    onBack: () -> Unit,
    viewModel: NotificationsViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    Column(Modifier.fillMaxSize()) {
        Surface(color = LmNavy) {
            Row(
                Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                IconButton(onClick = onBack) {
                    Icon(Icons.Rounded.ArrowBack, tr("Quay lại", "Back"), tint = Color.White)
                }
                Column(Modifier.weight(1f)) {
                    Text(
                        tr("Thông báo", "Notifications"),
                        style = MaterialTheme.typography.titleMedium,
                        color = Color.White,
                    )
                    Text(
                        if (state.unread > 0) {
                            tr("${state.unread} tin chưa đọc", "${state.unread} unread")
                        } else {
                            tr("Đơn đặt, chuyến xe và chuyến ghép", "Bookings, rides and shared tours")
                        },
                        style = MaterialTheme.typography.bodySmall,
                        color = Color.White.copy(alpha = .65f),
                    )
                }
                if (state.unread > 0) {
                    TextButton(onClick = viewModel::danhDauDaDoc) {
                        Text(tr("Đọc hết", "Mark all"), color = Color.White)
                    }
                }
            }
        }

        when {
            state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = LmBlue)
            }

            state.items.isEmpty() -> Column(
                Modifier.fillMaxSize().padding(32.dp),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(
                    tr("Chưa có thông báo nào", "No notifications yet"),
                    style = MaterialTheme.typography.titleMedium,
                )
                Spacer(Modifier.height(8.dp))
                Text(
                    if (state.chuaCoNguon) {
                        tr(
                            "Đặt phòng hoặc đặt xe một lần là từ đó LOCALMATE báo cho bạn ngay tại đây: "
                                + "đơn được xác nhận, tài xế nhận chuyến, chuyến ghép đủ khách.",
                            "Book a room or a ride once, and from then on Bảy Núi will tell you here: "
                                + "booking confirmed, driver on the way, shared tour filled up.",
                        )
                    } else {
                        tr(
                            "Khi có đơn mới, xe nhận chuyến hay chuyến ghép đủ khách, tin sẽ hiện ở đây.",
                            "New bookings, accepted rides and confirmed shared tours will show up here.",
                        )
                    },
                    style = MaterialTheme.typography.bodyMedium,
                    color = LmMuted,
                    textAlign = TextAlign.Center,
                )
            }

            else -> LazyColumn(
                contentPadding = PaddingValues(16.dp, 14.dp, 16.dp, 110.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                items(state.items, key = { it.id }) { n ->
                    Surface(
                        shape = RoundedCornerShape(16.dp),
                        color = MaterialTheme.colorScheme.surface,
                    ) {
                        Row(Modifier.fillMaxWidth().padding(16.dp)) {
                            // Chấm cam ở đầu dòng cho tin chưa đọc — nhìn lướt
                            // là biết còn gì chưa xem, khỏi đọc lại từ đầu.
                            Box(
                                Modifier.padding(top = 6.dp, end = 12.dp).size(8.dp),
                            ) {
                                if (!n.read) {
                                    Surface(
                                        shape = CircleShape,
                                        color = LmBlue,
                                        modifier = Modifier.size(8.dp),
                                    ) {}
                                }
                            }
                            Column(Modifier.weight(1f)) {
                                Text(n.title, style = MaterialTheme.typography.titleSmall)
                                if (n.body.isNotBlank()) {
                                    Text(
                                        n.body,
                                        style = MaterialTheme.typography.bodyMedium,
                                        modifier = Modifier.padding(top = 3.dp),
                                    )
                                }
                                Text(
                                    thoiGian(n.createdAt),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = LmMuted,
                                    modifier = Modifier.padding(top = 4.dp),
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

/** 2026-08-15T03:12:00.000Z → 15/08 · 10:12 (giờ Việt Nam). */
private fun thoiGian(iso: String): String = runCatching {
    val t = java.time.Instant.parse(iso).atZone(java.time.ZoneId.of("Asia/Ho_Chi_Minh"))
    "%02d/%02d · %02d:%02d".format(t.dayOfMonth, t.monthValue, t.hour, t.minute)
}.getOrDefault(iso.take(10))
