package vn.baynuistay.feature.admin.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.ArrowBack
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import vn.baynuistay.core.ui.components.formatPrice
import vn.baynuistay.core.ui.lang.tr
import vn.baynuistay.core.ui.theme.LmNavy
import vn.baynuistay.core.ui.theme.LmAmber
import vn.baynuistay.core.ui.theme.LmMuted
import vn.baynuistay.core.ui.theme.LmSuccess
import vn.baynuistay.core.ui.theme.LmBlue

@Composable
fun AdminScreen(
    onBack: () -> Unit,
    viewModel: AdminViewModel = hiltViewModel(),
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
                        tr("Quản trị", "Admin"),
                        style = MaterialTheme.typography.titleMedium,
                        color = Color.White,
                    )
                    Text(
                        tr("Việc cần làm ngay hôm nay", "What needs doing today"),
                        style = MaterialTheme.typography.bodySmall,
                        color = Color.White.copy(alpha = .65f),
                    )
                }
                IconButton(onClick = viewModel::load) {
                    Icon(Icons.Rounded.Refresh, tr("Tải lại", "Refresh"), tint = Color.White)
                }
            }
        }

        if (state.notice.isNotBlank() || state.error != null) {
            Surface(
                color = if (state.error != null) MaterialTheme.colorScheme.errorContainer
                        else MaterialTheme.colorScheme.primaryContainer,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Row(
                    Modifier.padding(horizontal = 20.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(state.error ?: state.notice, Modifier.weight(1f))
                    Text(
                        tr("Đóng", "Close"),
                        color = LmBlue,
                        modifier = Modifier
                            .padding(start = 12.dp)
                            .clickableNoRipple(viewModel::clearNotice),
                    )
                }
            }
        }

        if (state.loading) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = LmBlue)
            }
            return@Column
        }

        // Dải ba tab. Con số trên tab là thứ quyết định bấm vào đâu trước, nên
        // nó nằm ngay trên nhãn chứ không giấu bên trong.
        Row(
            Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            listOf(
                Triple(AdminTab.DUYET, tr("Cần duyệt", "To approve"),
                       state.today.partnersPending + state.today.listingsPending),
                Triple(AdminTab.DON, tr("Đơn mới", "Bookings"), state.today.bookingsToday),
                Triple(AdminTab.TIN_NHAN, tr("Tin nhắn", "Messages"), state.today.contactsUnread),
            ).forEach { (tab, nhan, so) ->
                val chon = state.tab == tab
                Surface(
                    onClick = { viewModel.moTab(tab) },
                    shape = RoundedCornerShape(50),
                    color = if (chon) LmBlue else MaterialTheme.colorScheme.surface,
                    border = if (chon) null else BorderStroke(1.5.dp, MaterialTheme.colorScheme.outlineVariant),
                    modifier = Modifier.weight(1f),
                ) {
                    Text(
                        if (so > 0) "$nhan · $so" else nhan,
                        Modifier.padding(vertical = 9.dp),
                        style = MaterialTheme.typography.labelLarge,
                        color = if (chon) Color.White else MaterialTheme.colorScheme.onSurface,
                        textAlign = TextAlign.Center,
                        maxLines = 1,
                    )
                }
            }
        }

        LazyColumn(
            contentPadding = PaddingValues(20.dp, 6.dp, 20.dp, 110.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item { SoHomNay(state.today) }

            if (state.tab == AdminTab.DON) {
                item {
                    Text(
                        tr("Đơn mới nhất", "Latest bookings"),
                        style = MaterialTheme.typography.titleMedium,
                        modifier = Modifier.padding(top = 6.dp),
                    )
                }
                if (state.bookings.isEmpty()) {
                    item { Trong(tr("Chưa có đơn nào.", "No bookings yet.")) }
                }
                items(state.bookings, key = { it.id }) { b ->
                    TheDon(
                        don = b,
                        dangXuLy = state.working == b.id,
                        khoa = state.working.isNotBlank(),
                        onNhanCoc = { viewModel.nhanCoc(b.id) },
                    )
                }
                item { GhiChuCuoi() }
                return@LazyColumn
            }

            if (state.tab == AdminTab.TIN_NHAN) {
                item {
                    Text(
                        tr("Khách gửi từ trang Liên hệ", "Sent from the contact page"),
                        style = MaterialTheme.typography.titleMedium,
                        modifier = Modifier.padding(top = 6.dp),
                    )
                }
                if (state.contacts.isEmpty()) {
                    item { Trong(tr("Chưa có tin nhắn nào.", "No messages yet.")) }
                }
                items(state.contacts, key = { it.id }) { c ->
                    TheTinNhan(
                        tin = c,
                        dangXuLy = state.working == c.id,
                        khoa = state.working.isNotBlank(),
                        onDaDoc = { viewModel.danhDauDaDoc(c.id) },
                    )
                }
                item { GhiChuCuoi() }
                return@LazyColumn
            }

            item {
                Text(
                    tr("Đối tác chờ duyệt", "Partners awaiting approval"),
                    style = MaterialTheme.typography.titleMedium,
                    modifier = Modifier.padding(top = 6.dp),
                )
            }
            if (state.pendingPartners.isEmpty()) {
                item { Trong(tr("Không có đối tác nào chờ.", "No partners waiting.")) }
            }
            items(state.pendingPartners, key = { it.id }) { p ->
                TheDuyet(
                    tieuDe = p.name,
                    dong2 = listOfNotNull(
                        LOAI_DOI_TAC[p.type],
                        p.phone.takeIf { it.isNotBlank() },
                        p.address.takeIf { it.isNotBlank() },
                    ).joinToString(" · "),
                    dong3 = if (p.isDriver) {
                        listOfNotNull(p.vehicleType.takeIf { it.isNotBlank() },
                                      p.plate.takeIf { it.isNotBlank() }).joinToString(" · ")
                    } else "",
                    dangXuLy = state.working == p.id,
                    khoa = state.working.isNotBlank(),
                    onDuyet = { viewModel.setPartner(p.id, "approved") },
                    onTuChoi = { viewModel.setPartner(p.id, "rejected") },
                )
            }

            item {
                Text(
                    tr("Tin đăng chờ duyệt", "Listings awaiting approval"),
                    style = MaterialTheme.typography.titleMedium,
                    modifier = Modifier.padding(top = 10.dp),
                )
            }
            if (state.pendingListings.isEmpty()) {
                item { Trong(tr("Không có tin nào chờ.", "No listings waiting.")) }
            }
            items(state.pendingListings, key = { it.id }) { l ->
                TheDuyet(
                    tieuDe = l.name,
                    dong2 = listOfNotNull(
                        l.partnerName.takeIf { it.isNotBlank() },
                        l.area.takeIf { it.isNotBlank() },
                    ).joinToString(" · "),
                    dong3 = if (l.price > 0) formatPrice(l.price.toInt()) else "",
                    dangXuLy = state.working == l.id,
                    khoa = state.working.isNotBlank(),
                    onDuyet = { viewModel.setListing(l.id, "approved") },
                    onTuChoi = { viewModel.setListing(l.id, "rejected") },
                )
            }

            item { GhiChuCuoi() }
        }
    }
}

private val LOAI_DOI_TAC = mapOf(
    "hotel" to "Khách sạn",
    "tour" to "Tour",
    "transport" to "Nhà xe",
    "food" to "Đặc sản",
)

/**
 * Hôm nay của LOCALMATE.
 *
 * Ba con số đứng cạnh nhau vì chúng trả lời ba câu khác nhau: hôm nay có việc
 * không, được bao nhiêu tiền, và có ai đang chờ mình xác nhận cọc không. Số
 * cuối in màu cam khi khác 0 — đó là tiền của khách đang treo.
 */
@Composable
private fun SoHomNay(t: vn.baynuistay.core.network.AdminTodayDto) {
    Surface(shape = RoundedCornerShape(20.dp), color = LmNavy) {
        Column(Modifier.fillMaxWidth().padding(18.dp)) {
            Row(horizontalArrangement = Arrangement.SpaceAround, modifier = Modifier.fillMaxWidth()) {
                listOf(
                    Triple("${t.bookingsToday}", tr("đơn hôm nay", "bookings today"), LmAmber),
                    Triple(formatPrice(t.revenueToday.toInt()), tr("tiền hôm nay", "revenue today"), LmAmber),
                    Triple("${t.depositWaiting}", tr("chờ đối chiếu", "to check"),
                           if (t.depositWaiting > 0) LmBlue else LmAmber),
                ).forEach { (so, nhan, mau) ->
                    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.weight(1f)) {
                        Text(
                            so,
                            color = mau,
                            style = MaterialTheme.typography.titleLarge,
                            textAlign = TextAlign.Center,
                            maxLines = 1,
                        )
                        Text(
                            nhan,
                            color = Color.White.copy(alpha = .7f),
                            style = MaterialTheme.typography.labelSmall,
                            textAlign = TextAlign.Center,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun GhiChuCuoi() {
    Text(
        tr(
            "Báo cáo, sổ quỹ, đối soát và in mã QR làm trên trang admin ở máy tính.",
            "Reports, ledger, settlements and QR printing are on the desktop admin page.",
        ),
        style = MaterialTheme.typography.bodySmall,
        color = LmMuted,
        textAlign = TextAlign.Center,
        modifier = Modifier.fillMaxWidth().padding(top = 16.dp),
    )
}

/** Một đơn khách vừa đặt. Số điện thoại bấm được để gọi thẳng. */
@Composable
private fun TheDon(
    don: vn.baynuistay.core.network.AdminBookingDto,
    dangXuLy: Boolean,
    khoa: Boolean,
    onNhanCoc: () -> Unit,
) {
    val context = LocalContext.current
    Surface(shape = RoundedCornerShape(18.dp), color = MaterialTheme.colorScheme.surface) {
        Column(Modifier.fillMaxWidth().padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(don.guestName.ifBlank { tr("Khách", "Guest") },
                     style = MaterialTheme.typography.titleSmall, modifier = Modifier.weight(1f))
                Text(
                    don.paymentStatusLabel,
                    style = MaterialTheme.typography.labelSmall,
                    color = if (don.daNhanCoc) LmSuccess else if (don.choDoiChieu) LmBlue else LmMuted,
                )
            }
            if (don.detail.isNotBlank()) {
                Text(don.detail, style = MaterialTheme.typography.bodySmall, color = LmMuted)
            }
            Text(
                listOfNotNull(
                    don.checkIn.takeIf { it.isNotBlank() },
                    formatPrice(don.totalPrice.toInt()),
                    don.code,
                ).joinToString(" · "),
                style = MaterialTheme.typography.bodySmall,
                color = LmMuted,
            )

            Spacer(Modifier.height(12.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                if (don.phone.isNotBlank()) {
                    OutlinedButton(
                        onClick = { goi(context, don.phone) },
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.weight(1f),
                    ) {
                        Text(tr("Gọi ", "Call ") + don.phone, maxLines = 1)
                    }
                }
                // Chỉ hiện khi CHƯA nhận cọc — bấm lại lần nữa chẳng để làm gì
                if (!don.daNhanCoc) {
                    Button(
                        onClick = onNhanCoc,
                        enabled = !khoa,
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = LmSuccess),
                        modifier = Modifier.weight(1f),
                    ) {
                        if (dangXuLy) {
                            CircularProgressIndicator(
                                Modifier.size(16.dp), color = Color.White, strokeWidth = 2.dp,
                            )
                        } else {
                            Text(tr("Đã nhận cọc", "Deposit in"), maxLines = 1)
                        }
                    }
                }
            }
        }
    }
}

/** Một tin khách gửi từ trang Liên hệ. Chưa đọc thì nổi lên bằng viền cam. */
@Composable
private fun TheTinNhan(
    tin: vn.baynuistay.core.network.AdminContactDto,
    dangXuLy: Boolean,
    khoa: Boolean,
    onDaDoc: () -> Unit,
) {
    val context = LocalContext.current
    Surface(
        shape = RoundedCornerShape(18.dp),
        color = MaterialTheme.colorScheme.surface,
        border = if (tin.isRead) null else BorderStroke(1.5.dp, LmBlue),
    ) {
        Column(Modifier.fillMaxWidth().padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(tin.name.ifBlank { tr("Khách", "Guest") },
                     style = MaterialTheme.typography.titleSmall, modifier = Modifier.weight(1f))
                if (!tin.isRead) {
                    Text(tr("Chưa đọc", "Unread"),
                         style = MaterialTheme.typography.labelSmall, color = LmBlue)
                }
            }
            if (tin.message.isNotBlank()) {
                Text(tin.message, style = MaterialTheme.typography.bodyMedium,
                     modifier = Modifier.padding(top = 6.dp))
            }
            val phu = listOfNotNull(
                tin.phone.takeIf { it.isNotBlank() },
                tin.email.takeIf { it.isNotBlank() },
                tin.createdAt.take(10).takeIf { it.isNotBlank() },
            ).joinToString(" · ")
            if (phu.isNotBlank()) {
                Text(phu, style = MaterialTheme.typography.bodySmall, color = LmMuted,
                     modifier = Modifier.padding(top = 4.dp))
            }

            Spacer(Modifier.height(12.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                if (tin.phone.isNotBlank()) {
                    OutlinedButton(
                        onClick = { goi(context, tin.phone) },
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.weight(1f),
                    ) {
                        Text(tr("Gọi lại", "Call back"), maxLines = 1)
                    }
                }
                if (!tin.isRead) {
                    Button(
                        onClick = onDaDoc,
                        enabled = !khoa,
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = LmSuccess),
                        modifier = Modifier.weight(1f),
                    ) {
                        if (dangXuLy) {
                            CircularProgressIndicator(
                                Modifier.size(16.dp), color = Color.White, strokeWidth = 2.dp,
                            )
                        } else {
                            Text(tr("Đã đọc", "Mark read"), maxLines = 1)
                        }
                    }
                }
            }
        }
    }
}

/** Mở trình gọi điện với số đã điền sẵn. Không tự bấm gọi — đó là việc của chủ máy. */
private fun goi(context: android.content.Context, phone: String) {
    runCatching {
        context.startActivity(
            android.content.Intent(
                android.content.Intent.ACTION_DIAL,
                android.net.Uri.parse("tel:" + phone.filter { it.isDigit() || it == '+' }),
            ),
        )
    }
}

@Composable
private fun Trong(text: String) {
    Text(text, style = MaterialTheme.typography.bodyMedium, color = LmMuted)
}

/**
 * Thẻ một mục chờ duyệt.
 *
 * `khoa` khoá tất cả các nút khi đang có một thao tác chạy — bấm Duyệt hai thẻ
 * cùng lúc rồi tải lại danh sách giữa chừng là dễ ra kết quả khó hiểu.
 */
@Composable
private fun TheDuyet(
    tieuDe: String,
    dong2: String,
    dong3: String,
    dangXuLy: Boolean,
    khoa: Boolean,
    onDuyet: () -> Unit,
    onTuChoi: () -> Unit,
) {
    Surface(shape = RoundedCornerShape(18.dp), color = MaterialTheme.colorScheme.surface) {
        Column(Modifier.fillMaxWidth().padding(16.dp)) {
            Text(tieuDe, style = MaterialTheme.typography.titleSmall)
            if (dong2.isNotBlank()) {
                Text(dong2, style = MaterialTheme.typography.bodySmall, color = LmMuted)
            }
            if (dong3.isNotBlank()) {
                Text(dong3, style = MaterialTheme.typography.bodySmall, color = LmBlue)
            }

            Spacer(Modifier.height(12.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Button(
                    onClick = onDuyet,
                    enabled = !khoa,
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = LmSuccess),
                    modifier = Modifier.weight(1f),
                ) {
                    if (dangXuLy) {
                        CircularProgressIndicator(
                            Modifier.size(16.dp), color = Color.White, strokeWidth = 2.dp,
                        )
                    } else {
                        Text(tr("Duyệt", "Approve"))
                    }
                }
                OutlinedButton(
                    onClick = onTuChoi,
                    enabled = !khoa,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.weight(1f),
                ) {
                    Text(tr("Từ chối", "Reject"))
                }
            }
        }
    }
}

/** Bấm được nhưng không có hiệu ứng gợn — dùng cho chữ "Đóng" trong dải thông báo. */
@Composable
private fun Modifier.clickableNoRipple(onClick: () -> Unit): Modifier =
    this.clickable(
        indication = null,
        interactionSource = remember { MutableInteractionSource() },
        onClick = onClick,
    )
