@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package vn.baynuistay.feature.booking.ui

import android.content.Context
import android.content.Intent
import android.net.Uri
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Call
import androidx.compose.material.icons.rounded.LocalTaxi
import androidx.compose.material.icons.rounded.Map
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.compose.foundation.clickable
import androidx.compose.ui.layout.ContentScale
import coil3.compose.AsyncImage
import vn.baynuistay.core.network.MyBookingDto
import vn.baynuistay.core.network.PaymentDto
import vn.baynuistay.core.network.TrackResponse
import vn.baynuistay.core.ui.components.formatPrice
import vn.baynuistay.core.ui.theme.LmNavy
import vn.baynuistay.core.ui.theme.LmAmber
import vn.baynuistay.core.ui.theme.LmMuted
import vn.baynuistay.core.ui.theme.LmSuccess
import vn.baynuistay.core.ui.theme.LmBlue
import vn.baynuistay.core.ui.lang.tr

// ════════════════════════════════════════════════════════════
// ĐƠN CỦA TÔI
// ════════════════════════════════════════════════════════════
// Bản trên app của trang /donhang.html. Cùng endpoint, cùng dữ liệu — khách
// đặt bên web mở app ra vẫn thấy đúng đơn đó và ngược lại.
//
// Với cuốc xe đang chạy, thẻ đơn hiện thêm: tài xế là ai, xe còn cách bao xa,
// bao nhiêu phút nữa tới, và nút mở Google Maps xem xe đang ở đâu.

/**
 * Mở Google Maps tại vị trí xe. Khách chỉ cần "nó đang ở đâu", không cần dẫn đường.
 *
 * Thử lần lượt Google Maps → ứng dụng bản đồ bất kỳ → trình duyệt. Máy nào cũng
 * thiếu cả ba thì thôi, chứ không để văng ActivityNotFoundException làm sập app.
 */
private fun openCarOnMap(context: Context, lat: Double, lng: Double) {
    val web = "https://www.google.com/maps/search/?api=1&query=$lat,$lng"
    val attempts = listOf(
        Intent(Intent.ACTION_VIEW, Uri.parse("geo:$lat,$lng?q=$lat,$lng(Xe của bạn)"))
            .apply { setPackage("com.google.android.apps.maps") },
        Intent(Intent.ACTION_VIEW, Uri.parse("geo:$lat,$lng?q=$lat,$lng")),
        Intent(Intent.ACTION_VIEW, Uri.parse(web)),
    )
    for (intent in attempts) {
        if (runCatching { context.startActivity(intent) }.isSuccess) return
    }
}

private fun callDriver(context: Context, phone: String) {
    if (phone.isBlank()) return
    runCatching { context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:$phone"))) }
}

@Composable
fun MyBookingsScreen(viewModel: MyBookingsViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(20.dp, 16.dp, 20.dp, 40.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            Text(tr("Đơn của tôi", "My bookings"), style = MaterialTheme.typography.headlineSmall, color = LmNavy)
            Spacer(Modifier.height(4.dp))
            Text(
                tr("Nhập số điện thoại đã dùng khi đặt để xem lại đơn và theo dõi xe.", "Enter the phone number you booked with to see your bookings and track your ride."),
                style = MaterialTheme.typography.bodyMedium,
                color = LmMuted,
            )
        }

        item {
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                OutlinedTextField(
                    value = state.phone,
                    onValueChange = viewModel::onPhoneChange,
                    label = { Text(tr("Số điện thoại", "Phone number")) },
                    singleLine = true,
                    shape = RoundedCornerShape(14.dp),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                    modifier = Modifier.weight(1f),
                )
                Button(
                    onClick = viewModel::search,
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = LmBlue),
                    modifier = Modifier.height(56.dp),
                ) {
                    if (state.loading) {
                        CircularProgressIndicator(Modifier.size(18.dp), color = Color.White, strokeWidth = 2.dp)
                    } else {
                        Icon(Icons.Rounded.Search, tr("Tra cứu", "Look up"), Modifier.size(20.dp))
                    }
                }
            }
        }

        (state.error ?: state.notice)?.let { msg ->
            item {
                Surface(
                    onClick = viewModel::dismissNotice,
                    shape = RoundedCornerShape(14.dp),
                    color = if (state.error != null) LmBlue.copy(alpha = .12f) else LmSuccess.copy(alpha = .12f),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(
                        msg,
                        Modifier.padding(14.dp),
                        style = MaterialTheme.typography.bodyMedium,
                        color = if (state.error != null) LmBlue else LmSuccess,
                    )
                }
            }
        }

        items(state.bookings, key = { it.id }) { booking ->
            BookingCard(
                booking = booking,
                track = state.tracks[booking.id],
                cancelling = state.cancelling == booking.id,
                payment = if (state.payingId == booking.id) state.payment else null,
                paymentOpen = state.payingId == booking.id,
                paymentLoading = state.paymentLoading && state.payingId == booking.id,
                reviewOpen = state.reviewingId == booking.id,
                reviewSending = state.reviewSending,
                onCancel = { viewModel.cancel(booking) },
                onTogglePayment = { viewModel.togglePayment(booking) },
                onClaimPaid = { viewModel.claimPaid(booking) },
                onToggleReview = { viewModel.toggleReview(booking) },
                onSendReview = { stars, text -> viewModel.sendReview(booking, stars, text) },
            )
        }

        if (state.searched && state.bookings.isEmpty() && !state.loading) {
            item {
                Box(Modifier.fillMaxWidth().padding(top = 30.dp), contentAlignment = Alignment.Center) {
                    Text(
                        tr("Chưa có đơn nào.", "No bookings yet."),
                        style = MaterialTheme.typography.bodyMedium,
                        color = LmMuted,
                    )
                }
            }
        }
    }
}

@Composable
private fun BookingCard(
    booking: MyBookingDto,
    track: TrackResponse?,
    cancelling: Boolean,
    payment: PaymentDto?,
    paymentOpen: Boolean,
    paymentLoading: Boolean,
    reviewOpen: Boolean,
    reviewSending: Boolean,
    onCancel: () -> Unit,
    onTogglePayment: () -> Unit,
    onClaimPaid: () -> Unit,
    onToggleReview: () -> Unit,
    onSendReview: (Int, String) -> Unit,
) {
    var confirming by remember { mutableStateOf(false) }

    Surface(
        shape = RoundedCornerShape(18.dp),
        color = MaterialTheme.colorScheme.surface,
        tonalElevation = 1.dp,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Text(
                    booking.code,
                    style = MaterialTheme.typography.titleMedium,
                    color = LmNavy,
                    modifier = Modifier.weight(1f),
                )
                StatusChip(booking.status, booking.statusLabel)
            }

            Text(
                when (booking.kind) {
                    "transport" -> "${booking.pickup} → ${booking.dropoff}"
                    "tour" -> booking.summary.ifBlank { "Tour" }
                    "food" -> booking.summary.ifBlank { tr("Đặc sản", "Local food") }
                    else -> booking.summary.ifBlank { tr("Phòng nghỉ", "Room") }
                },
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurface,
            )

            if (booking.kind == "food" && booking.deliveryAddress.isNotBlank()) {
                Text(tr("Giao đến: ", "Deliver to: ") + booking.deliveryAddress, style = MaterialTheme.typography.bodyMedium)
            }
            val ride = booking.kind == "transport"
            val detail = buildList {
                if (ride && booking.pickupTime.isNotBlank()) add(booking.pickupTime)
                // Cuốc xe thì ngày đó là ngày đi, không phải ngày "nhận phòng"
                if (booking.checkIn.isNotBlank()) {
                    add(if (ride) tr("Ngày ${booking.checkIn.formatDayMonth()}", "On ${booking.checkIn.formatDayMonth()}") else tr("Nhận ${booking.checkIn.formatDayMonth()}", "Check in ${booking.checkIn.formatDayMonth()}"))
                }
                if (booking.nights > 0) add(tr("${booking.nights} đêm", "${booking.nights} nights"))
                if (booking.guests > 0) add(tr("${booking.guests} khách", "${booking.guests} guests"))
                if (booking.partnerName.isNotBlank()) add(booking.partnerName)
            }.joinToString(" · ")
            if (detail.isNotBlank()) {
                Text(detail, style = MaterialTheme.typography.bodySmall, color = LmMuted)
            }

            if (booking.totalPrice > 0) {
                Text(
                    formatPrice(booking.totalPrice.toInt()),
                    style = MaterialTheme.typography.titleMedium,
                    color = LmBlue,
                )
            }

            if (track != null) TrackPanel(booking.id, track)

            // ── Tiền cọc ──
            if (booking.paymentStatus != "unpaid") {
                Text(
                    booking.paymentStatusLabel,
                    style = MaterialTheme.typography.labelLarge,
                    color = if (booking.paymentStatus == "paid") LmSuccess else LmBlue,
                )
            }
            if (booking.canCancel && booking.paymentStatus == "unpaid" && booking.depositAmount > 0) {
                OutlinedButton(onClick = onTogglePayment, shape = RoundedCornerShape(12.dp)) {
                    Text(if (paymentOpen) tr("Đóng", "Close") else tr("Đặt cọc ${formatPrice(booking.depositAmount.toInt())}", "Pay deposit ${formatPrice(booking.depositAmount.toInt())}"))
                }
            }
            if (paymentOpen) {
                PaymentPanel(payment, paymentLoading, onClaimPaid)
            }

            // ── Đánh giá ──
            if (booking.canReview) {
                OutlinedButton(onClick = onToggleReview, shape = RoundedCornerShape(12.dp)) {
                    Text(if (reviewOpen) tr("Để sau", "Later") else tr("Đánh giá", "Rate it"))
                }
            }
            if (reviewOpen) {
                ReviewPanel(
                    label = booking.reviewTargets.firstOrNull()?.label
                        ?: tr("dịch vụ", "the service"),
                    sending = reviewSending,
                    onSend = onSendReview,
                )
            }

            if (booking.canCancel) {
                Spacer(Modifier.height(2.dp))
                if (!confirming) {
                    TextButton(onClick = { confirming = true }) {
                        Text(tr("Huỷ đơn", "Cancel booking"), color = LmMuted)
                    }
                } else {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(
                            onClick = onCancel,
                            enabled = !cancelling,
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = LmBlue),
                        ) {
                            Text(if (cancelling) tr("Đang huỷ…", "Cancelling…") else tr("Xác nhận huỷ", "Confirm cancel"))
                        }
                        TextButton(onClick = { confirming = false }) { Text(tr("Giữ đơn", "Keep it")) }
                    }
                }
            }
        }
    }
}

/** Xe đang ở đâu, còn bao xa. Hiện đúng những gì máy chủ thật sự biết. */
@Composable
private fun TrackPanel(bookingId: String, track: TrackResponse) {
    val context = LocalContext.current

    Surface(shape = RoundedCornerShape(14.dp), color = LmNavy, modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            // Bản đồ xe chạy ngay trong app — khách nhìn là hình dung được tài
            // xế tới đâu, thay vì phải đọc con số km rồi tự tưởng tượng.
            LiveMapView(bookingId = bookingId, height = 200.dp)

            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Rounded.LocalTaxi, null, Modifier.size(18.dp), tint = LmAmber)
                Spacer(Modifier.width(8.dp))
                Text(
                    track.stageLabel.ifBlank { tr("Tài xế đang trên đường", "Your driver is on the way") },
                    style = MaterialTheme.typography.titleSmall,
                    color = Color.White,
                )
            }

            if (track.driverName.isNotBlank()) {
                Text(
                    listOfNotNull(
                        track.driverName.takeIf { it.isNotBlank() },
                        track.plate.takeIf { it.isNotBlank() },
                    ).joinToString(" · "),
                    style = MaterialTheme.typography.bodySmall,
                    color = LmAmber,
                )
            }

            // Chỉ nói "còn bao xa" khi máy chủ tính được, không đoán bừa
            val remaining = track.remainingKm
            if (remaining != null && track.etaMinutes != null) {
                Text(
                    tr("Còn ${remaining.toString().replace('.', ',')} km · khoảng ${track.etaMinutes} phút", "${remaining.toString().replace('.', ',')} km left · about ${track.etaMinutes} min"),
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color.White,
                )
            }

            if (track.stale) {
                Text(
                    tr("Tài xế đang mất sóng, vị trí có thể chưa cập nhật.", "The driver has lost signal, so this position may be out of date."),
                    style = MaterialTheme.typography.bodySmall,
                    color = LmAmber.copy(alpha = .85f),
                )
            }

            Row(Modifier.padding(top = 4.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                // Bản đồ đã nằm ngay trên, nút này để mở Google Maps xem rộng hơn
                if (track.lat != null && track.lng != null) {
                    Button(
                        onClick = { openCarOnMap(context, track.lat, track.lng) },
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = LmAmber, contentColor = LmNavy),
                    ) {
                        Icon(Icons.Rounded.Map, null, Modifier.size(16.dp))
                        Spacer(Modifier.width(6.dp))
                        Text(tr("Mở bản đồ lớn", "Open full map"))
                    }
                }
                if (track.driverPhone.isNotBlank()) {
                    OutlinedButton(
                        onClick = { callDriver(context, track.driverPhone) },
                        shape = RoundedCornerShape(12.dp),
                    ) {
                        Icon(Icons.Rounded.Call, tr("Gọi tài xế", "Call driver"), Modifier.size(16.dp), tint = Color.White)
                    }
                }
            }
        }
    }
}

@Composable
private fun StatusChip(status: String, label: String) {
    val color = when (status) {
        "confirmed" -> LmSuccess
        "completed" -> LmNavy
        "cancelled" -> LmMuted
        else -> LmBlue
    }
    Surface(shape = RoundedCornerShape(20.dp), color = color.copy(alpha = .14f)) {
        Text(
            label.ifBlank { status },
            Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
            style = MaterialTheme.typography.labelMedium,
            color = color,
        )
    }
}

/** "2026-08-14" → "14/08". Máy chủ trả ISO, người Việt đọc ngày trước. */
private fun String.formatDayMonth(): String {
    val parts = split("-")
    return if (parts.size >= 3) "${parts[2].take(2)}/${parts[1]}" else this
}


// ── Khối đặt cọc ─────────────────────────────────────────────
// Mã QR đã nhúng sẵn số tiền và nội dung có mã đơn, nên khách quét là xong,
// không gõ nhầm số tài khoản. Chưa cấu hình ngân hàng thì nói thẳng.
@Composable
private fun PaymentPanel(
    payment: PaymentDto?,
    loading: Boolean,
    onClaimPaid: () -> Unit,
) {
    Surface(
        shape = RoundedCornerShape(14.dp),
        color = MaterialTheme.colorScheme.surfaceVariant,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            when {
                loading || payment == null -> Text(
                    tr("Đang lấy thông tin đặt cọc…", "Loading deposit details…"),
                    style = MaterialTheme.typography.bodyMedium,
                    color = LmMuted,
                )

                !payment.transfer.ok -> {
                    Text(
                        tr("Chưa bật chuyển khoản", "Bank transfer is not enabled"),
                        style = MaterialTheme.typography.titleSmall,
                    )
                    Text(
                        payment.transfer.reason,
                        style = MaterialTheme.typography.bodySmall,
                        color = LmMuted,
                    )
                    Text(
                        tr("Bạn có thể chọn trả khi nhận dịch vụ, hoặc gọi Bảy Núi để được hướng dẫn.", "You can pay on arrival, or call Bảy Núi for help."),
                        style = MaterialTheme.typography.bodySmall,
                        color = LmMuted,
                    )
                }

                else -> {
                    Text(
                        tr("Đặt cọc ${formatPrice(payment.depositAmount.toInt())}", "Deposit ${formatPrice(payment.depositAmount.toInt())}"),
                        style = MaterialTheme.typography.titleMedium,
                        color = LmBlue,
                    )
                    Text(
                        tr("Còn lại ${formatPrice((payment.totalPrice - payment.depositAmount).toInt())}", "Remaining ${formatPrice((payment.totalPrice - payment.depositAmount).toInt())}")
                            + tr(" trả khi nhận dịch vụ.", " due on arrival."),
                        style = MaterialTheme.typography.bodySmall,
                        color = LmMuted,
                    )
                    AsyncImage(
                        model = payment.transfer.qrImage,
                        contentDescription = tr("Mã QR chuyển khoản đặt cọc", "Deposit transfer QR code"),
                        contentScale = ContentScale.Fit,
                        modifier = Modifier.fillMaxWidth().height(230.dp),
                    )
                    Text(
                        "${payment.transfer.accountName} · ${payment.transfer.account}",
                        style = MaterialTheme.typography.bodySmall,
                    )
                    Text(
                        tr("Nội dung: ${payment.transfer.content}", "Reference: ${payment.transfer.content}"),
                        style = MaterialTheme.typography.bodySmall,
                        color = LmBlue,
                    )
                    Text(
                        tr("Giữ nguyên nội dung để Bảy Núi đối chiếu đúng đơn của bạn.", "Keep the reference exactly as shown so Bảy Núi can match it to your booking."),
                        style = MaterialTheme.typography.bodySmall,
                        color = LmMuted,
                    )
                    Button(
                        onClick = onClaimPaid,
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = LmBlue),
                        modifier = Modifier.fillMaxWidth(),
                    ) { Text(tr("Tôi đã chuyển khoản", "I have transferred")) }
                }
            }
        }
    }
}

// ── Khối đánh giá ────────────────────────────────────────────
@Composable
private fun ReviewPanel(
    label: String,
    sending: Boolean,
    onSend: (Int, String) -> Unit,
) {
    var stars by remember { mutableStateOf(0) }
    var comment by remember { mutableStateOf("") }

    Surface(
        shape = RoundedCornerShape(14.dp),
        color = MaterialTheme.colorScheme.surfaceVariant,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text(tr("Bạn thấy $label thế nào?", "How was $label?"), style = MaterialTheme.typography.titleSmall)

            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                (1..5).forEach { n ->
                    Text(
                        "★",
                        style = MaterialTheme.typography.headlineMedium,
                        color = if (n <= stars) LmAmber else LmMuted.copy(alpha = .35f),
                        modifier = Modifier
                            .size(40.dp)
                            .clickable { stars = n },
                    )
                }
            }

            OutlinedTextField(
                value = comment,
                onValueChange = { comment = it.take(1000) },
                placeholder = { Text(tr("Kể lại trải nghiệm để người sau tham khảo (không bắt buộc)", "Tell others about your experience (optional)")) },
                shape = RoundedCornerShape(12.dp),
                minLines = 2,
                modifier = Modifier.fillMaxWidth(),
            )

            Button(
                // Chưa chọn sao thì khoá nút, chứ đừng gửi lên rồi để máy chủ từ chối
                onClick = { onSend(stars, comment) },
                enabled = stars > 0 && !sending,
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(containerColor = LmBlue),
                modifier = Modifier.fillMaxWidth(),
            ) { Text(if (sending) tr("Đang gửi…", "Sending…") else tr("Gửi đánh giá", "Submit review")) }
        }
    }
}
