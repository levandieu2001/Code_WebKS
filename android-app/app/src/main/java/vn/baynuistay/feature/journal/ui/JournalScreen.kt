package vn.baynuistay.feature.journal.ui

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.ArrowBack
import androidx.compose.material.icons.rounded.Backpack
import androidx.compose.material.icons.rounded.Bed
import androidx.compose.material.icons.rounded.DirectionsCar
import androidx.compose.material.icons.rounded.Verified
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import vn.baynuistay.core.network.JournalEntryDto
import vn.baynuistay.core.network.JournalSummaryDto
import vn.baynuistay.core.ui.components.formatPrice
import vn.baynuistay.core.ui.lang.tr
import vn.baynuistay.core.ui.theme.LmNavy
import vn.baynuistay.core.ui.theme.LmAmber
import vn.baynuistay.core.ui.theme.LmMuted
import vn.baynuistay.core.ui.theme.LmBlue

/** "2026-09-28" → "28/9/2026". Trả nguyên chuỗi nếu không đọc được. */
private fun ngayVN(iso: String): String {
    val p = iso.split("-")
    if (p.size != 3) return iso
    return "${p[2].trimStart('0')}/${p[1].trimStart('0')}/${p[0]}"
}

@OptIn(ExperimentalLayoutApi::class, ExperimentalFoundationApi::class)
@Composable
fun JournalScreen(
    onBack: () -> Unit,
    viewModel: JournalViewModel = hiltViewModel(),
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
                        tr("Nhật ký chuyến đi", "Trip journal"),
                        style = MaterialTheme.typography.titleMedium,
                        color = Color.White,
                    )
                    Text(
                        state.data?.holder?.name?.takeIf { it.isNotBlank() }
                            ?: tr("Tất cả những gì bạn đã đi", "Everything you have done"),
                        style = MaterialTheme.typography.bodySmall,
                        color = Color.White.copy(alpha = .65f),
                    )
                }
            }
        }

        when {
            state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = LmBlue)
            }

            state.error != null -> Column(
                Modifier.fillMaxSize().padding(28.dp),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(state.error.orEmpty(), textAlign = TextAlign.Center)
                Spacer(Modifier.height(14.dp))
                Button(onClick = viewModel::load) { Text(tr("Thử lại", "Try again")) }
            }

            // Chưa đi lần nào — đừng để màn hình trắng trơn, nói rõ vì sao trống.
            state.data?.timeline.isNullOrEmpty() -> Column(
                Modifier.fillMaxSize().padding(28.dp),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(
                    tr("Nhật ký còn trống", "Your journal is empty"),
                    style = MaterialTheme.typography.headlineSmall,
                )
                Spacer(Modifier.height(8.dp))
                Text(
                    tr(
                        "Đặt phòng, đặt xe hoặc tới một điểm bất kỳ quét mã QR — " +
                            "trang đầu tiên sẽ được mở ra.",
                        "Book a room or a ride, or scan a QR code at any spot — " +
                            "that opens your first page.",
                    ),
                    textAlign = TextAlign.Center,
                    color = LmMuted,
                )
            }

            else -> {
                val d = state.data!!
                LazyColumn(
                    contentPadding = PaddingValues(20.dp, 20.dp, 20.dp, 110.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp),
                ) {
                    item { TongKet(d.summary) }

                    if (d.stamps.isNotEmpty()) {
                        item {
                            Text(
                                tr("Con dấu đã có", "Stamps collected"),
                                style = MaterialTheme.typography.titleMedium,
                            )
                        }
                        item {
                            FlowRow(
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                verticalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                d.stamps.forEach { s ->
                                    Surface(
                                        shape = RoundedCornerShape(50),
                                        color = MaterialTheme.colorScheme.surface,
                                        border = androidx.compose.foundation.BorderStroke(1.5.dp, LmBlue),
                                    ) {
                                        Row(
                                            Modifier.padding(start = 6.dp, end = 12.dp, top = 5.dp, bottom = 5.dp),
                                            verticalAlignment = Alignment.CenterVertically,
                                        ) {
                                            Surface(shape = CircleShape, color = LmBlue) {
                                                Box(Modifier.size(26.dp), contentAlignment = Alignment.Center) {
                                                    Text(
                                                        s.symbol.ifBlank { s.name.take(1) },
                                                        color = Color.White,
                                                        style = MaterialTheme.typography.labelMedium,
                                                    )
                                                }
                                            }
                                            Spacer(Modifier.width(8.dp))
                                            Text(s.name, style = MaterialTheme.typography.bodyMedium)
                                        }
                                    }
                                }
                            }
                        }
                    }

                    item {
                        Text(
                            tr("Dòng thời gian", "Timeline"),
                            style = MaterialTheme.typography.titleMedium,
                            modifier = Modifier.padding(top = 6.dp),
                        )
                    }
                    items(d.timeline) { m -> MucThoiGian(m) }
                }
            }
        }
    }
}

@Composable
private fun TongKet(s: JournalSummaryDto) {
    val o = listOf(
        s.trips.toString() to tr("chuyến đi", "trips"),
        s.nights.toString() to tr("đêm nghỉ", "nights"),
        "${s.stamps}/${s.stationsTotal}" to tr("con dấu", "stamps"),
        formatPrice(s.spent.toInt()) to tr("đã chi", "spent"),
    )

    Surface(shape = RoundedCornerShape(22.dp), color = LmNavy) {
        Column(Modifier.padding(18.dp)) {
            if (s.firstVisit.isNotBlank()) {
                Text(
                    tr(
                        "Từ ${ngayVN(s.firstVisit)} đến ${ngayVN(s.lastVisit)}",
                        "From ${ngayVN(s.firstVisit)} to ${ngayVN(s.lastVisit)}",
                    ),
                    style = MaterialTheme.typography.bodySmall,
                    color = Color.White.copy(alpha = .6f),
                )
                Spacer(Modifier.height(12.dp))
            }
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                o.forEach { (giaTri, nhan) ->
                    Column(
                        Modifier.weight(1f),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Text(
                            giaTri,
                            color = LmAmber,
                            style = MaterialTheme.typography.titleMedium,
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
private fun MucThoiGian(m: JournalEntryDto) {
    val icon: ImageVector = when (m.type) {
        "transport" -> Icons.Rounded.DirectionsCar
        "tour" -> Icons.Rounded.Backpack
        "stamp" -> Icons.Rounded.Verified
        else -> Icons.Rounded.Bed
    }
    val nhanLoai = when (m.type) {
        "transport" -> tr("Di chuyển", "Ride")
        "tour" -> tr("Tour", "Tour")
        "stamp" -> tr("Con dấu", "Stamp")
        else -> tr("Lưu trú", "Stay")
    }
    // Đơn đã huỷ vẫn hiện nhưng làm mờ. Giấu hẳn thì khách tưởng hệ thống mất đơn.
    val mo = if (m.cancelled) .5f else 1f

    Surface(shape = RoundedCornerShape(16.dp), color = MaterialTheme.colorScheme.surface) {
        Row(Modifier.fillMaxWidth().padding(14.dp), verticalAlignment = Alignment.Top) {
            Surface(shape = CircleShape, color = MaterialTheme.colorScheme.primaryContainer) {
                Icon(
                    icon,
                    null,
                    Modifier.padding(9.dp).size(18.dp),
                    tint = LmBlue.copy(alpha = mo),
                )
            }
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(
                    "${ngayVN(m.date)} · $nhanLoai",
                    style = MaterialTheme.typography.labelSmall,
                    color = LmMuted,
                )
                Text(
                    m.title,
                    style = MaterialTheme.typography.titleSmall,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = mo),
                )
                if (m.detail.isNotBlank()) {
                    Text(m.detail, style = MaterialTheme.typography.bodySmall, color = LmMuted)
                }
                if (m.partner.isNotBlank()) {
                    Text(m.partner, style = MaterialTheme.typography.bodySmall, color = LmMuted)
                }
                when {
                    m.cancelled -> Text(
                        tr("Đã huỷ", "Cancelled"),
                        style = MaterialTheme.typography.labelSmall,
                        color = LmMuted,
                    )
                    m.amount > 0 -> Text(
                        formatPrice(m.amount.toInt()),
                        style = MaterialTheme.typography.labelLarge,
                        color = LmBlue,
                    )
                }
            }
        }
    }
}
