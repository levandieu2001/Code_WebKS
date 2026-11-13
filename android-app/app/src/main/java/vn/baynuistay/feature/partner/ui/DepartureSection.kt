package vn.baynuistay.feature.partner.ui

import android.app.DatePickerDialog
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import java.time.LocalDate
import vn.baynuistay.core.network.DepartureDto
import vn.baynuistay.core.ui.components.SectionHeader
import vn.baynuistay.core.ui.components.formatPrice
import vn.baynuistay.core.ui.theme.LmMuted
import vn.baynuistay.core.ui.theme.LmSuccess
import vn.baynuistay.core.ui.theme.LmBlue

// ============================================================
// Lịch khởi hành — chỉ đơn vị tour
// ============================================================
// Khách lẻ đăng ký ghép chuyến theo ngày. Trước đây đơn vị tour không có đường
// nào nhìn thấy chuyện đó: không biết ngày nào có mấy khách, không có tên và
// số điện thoại để gọi, không tự mở được ngày chạy. Muốn biết phải hỏi Bảy Núi.
//
// Mỗi chuyến là một thẻ chứ không phải một dòng bảng: thứ cần thấy ngay là còn
// thiếu mấy khách và ai đã đăng ký, chứ không phải bấm mở từng dòng ra xem.
// ============================================================

@Composable
fun DepartureHeader(soChuyen: Int, onMoForm: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().padding(top = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        SectionHeader(
            eyebrow = "Ghép chuyến",
            title = "Lịch khởi hành",
            modifier = Modifier.weight(1f),
        )
        OutlinedButton(onClick = onMoForm, shape = RoundedCornerShape(12.dp)) {
            Text("Mở chuyến")
        }
    }
    if (soChuyen == 0) {
        Text(
            "Chưa có chuyến nào. Mở một ngày để khách thấy mà đăng ký ghép.",
            style = MaterialTheme.typography.bodyMedium,
            color = LmMuted,
        )
    }
}

/**
 * Biểu mẫu mở một ngày khởi hành.
 *
 * Ngày mặc định là một tuần nữa: mở chuyến cho ngày mai thì khách không kịp
 * biết mà đăng ký, trong khi danh sách chốt trước ngày đi vài ngày.
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun DepartureForm(
    tours: List<vn.baynuistay.core.network.DepartureTourDto>,
    minGuestsMacDinh: Int,
    dangGui: Boolean,
    loi: String?,
    onHuy: () -> Unit,
    onGui: (tourSlug: String, date: String, minGuests: Int) -> Unit,
) {
    val context = LocalContext.current
    var tourChon by remember { mutableStateOf(tours.firstOrNull()?.slug.orEmpty()) }
    var ngay by remember { mutableStateOf(LocalDate.now().plusDays(7)) }
    var soToiThieu by remember { mutableIntStateOf(minGuestsMacDinh) }

    Surface(shape = RoundedCornerShape(18.dp), color = MaterialTheme.colorScheme.surface) {
        Column(Modifier.fillMaxWidth().padding(16.dp)) {
            Text("Mở ngày khởi hành", style = MaterialTheme.typography.titleSmall)

            if (tours.isEmpty()) {
                Text(
                    "Bạn chưa có tour nào được duyệt. Đăng tour ở mục trên, LOCALMATE duyệt xong "
                        + "bạn mới mở được ngày khởi hành.",
                    style = MaterialTheme.typography.bodySmall,
                    color = LmMuted,
                    modifier = Modifier.padding(top = 8.dp),
                )
                Spacer(Modifier.height(12.dp))
                OutlinedButton(onClick = onHuy, shape = RoundedCornerShape(12.dp)) { Text("Đóng") }
                return@Column
            }

            Spacer(Modifier.height(10.dp))
            Text("Tour", style = MaterialTheme.typography.labelMedium, color = LmMuted)
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                tours.forEach { t ->
                    val chon = t.slug == tourChon
                    Surface(
                        onClick = { tourChon = t.slug },
                        shape = RoundedCornerShape(50),
                        color = if (chon) LmBlue else MaterialTheme.colorScheme.surfaceVariant,
                    ) {
                        Text(
                            t.name,
                            Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
                            style = MaterialTheme.typography.labelLarge,
                            color = if (chon) Color.White else MaterialTheme.colorScheme.onSurface,
                        )
                    }
                }
            }

            Spacer(Modifier.height(12.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("Ngày khởi hành", style = MaterialTheme.typography.labelMedium, color = LmMuted)
                    Text(ngayVN(ngay.toString()), style = MaterialTheme.typography.titleMedium)
                }
                OutlinedButton(
                    onClick = { chonNgay(context, ngay) { ngay = it } },
                    shape = RoundedCornerShape(12.dp),
                ) { Text("Chọn ngày") }
            }

            Spacer(Modifier.height(12.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("Tối thiểu để chạy", style = MaterialTheme.typography.labelMedium, color = LmMuted)
                    Text("$soToiThieu khách", style = MaterialTheme.typography.titleMedium)
                }
                OutlinedButton(
                    onClick = { if (soToiThieu > 1) soToiThieu-- },
                    shape = RoundedCornerShape(12.dp),
                ) { Text("−") }
                Spacer(Modifier.size(8.dp))
                OutlinedButton(
                    onClick = { if (soToiThieu < 40) soToiThieu++ },
                    shape = RoundedCornerShape(12.dp),
                ) { Text("+") }
            }

            if (loi != null) {
                Text(
                    loi,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.error,
                    modifier = Modifier.padding(top = 10.dp),
                )
            }

            Spacer(Modifier.height(14.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedButton(
                    onClick = onHuy,
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier.weight(1f),
                ) { Text("Huỷ") }
                Button(
                    onClick = { onGui(tourChon, ngay.toString(), soToiThieu) },
                    enabled = !dangGui && tourChon.isNotBlank(),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = LmBlue),
                    modifier = Modifier.weight(1f),
                ) {
                    if (dangGui) {
                        CircularProgressIndicator(Modifier.size(16.dp), color = Color.White, strokeWidth = 2.dp)
                    } else Text("Mở chuyến")
                }
            }
        }
    }
}

@Composable
fun DepartureCard(
    dep: DepartureDto,
    dangXuLy: Boolean,
    khoa: Boolean,
    onChotChay: () -> Unit,
    onHuyChuyen: () -> Unit,
) {
    val context = LocalContext.current
    val daXong = dep.status == "cancelled" || dep.date < LocalDate.now().toString()

    Surface(
        shape = RoundedCornerShape(18.dp),
        color = MaterialTheme.colorScheme.surface,
        border = if (dep.status == "confirmed") BorderStroke(1.5.dp, LmSuccess) else null,
    ) {
        Column(Modifier.fillMaxWidth().padding(16.dp)) {
            Row(verticalAlignment = Alignment.Top) {
                Column(Modifier.weight(1f)) {
                    Text(ngayVN(dep.date), style = MaterialTheme.typography.titleMedium)
                    Text(dep.tourName, style = MaterialTheme.typography.bodySmall, color = LmMuted)
                }
                Text(
                    dep.statusLabel,
                    style = MaterialTheme.typography.labelSmall,
                    color = when (dep.status) {
                        "confirmed" -> LmSuccess
                        "cancelled" -> LmMuted
                        else -> LmBlue
                    },
                )
            }

            // Thanh chạy: nhìn là biết còn thiếu bao nhiêu, khỏi đọc số
            Spacer(Modifier.height(12.dp))
            Box(
                Modifier
                    .fillMaxWidth()
                    .height(8.dp)
                    .clip(RoundedCornerShape(50))
                    .background(MaterialTheme.colorScheme.surfaceVariant),
            ) {
                Box(
                    Modifier
                        .fillMaxWidth(fraction = (dep.progress.coerceIn(0, 100)) / 100f)
                        .height(8.dp)
                        .clip(RoundedCornerShape(50))
                        .background(if (dep.duKhach) LmSuccess else LmBlue),
                )
            }

            Spacer(Modifier.height(7.dp))
            Text(
                buildString {
                    append("${dep.joined}/${dep.minGuests} khách")
                    append(if (dep.missing > 0) " · còn thiếu ${dep.missing}" else " · đã đủ")
                    if (dep.price > 0) append(" · ${formatPrice(dep.price.toInt())}/khách")
                },
                style = MaterialTheme.typography.bodySmall,
                color = LmMuted,
            )
            if (dep.cutoff.isNotBlank() && !daXong) {
                Text(
                    "Chốt danh sách trước ${ngayVN(dep.cutoff)}",
                    style = MaterialTheme.typography.bodySmall,
                    color = LmMuted,
                )
            }

            if (dep.members.isNotEmpty()) {
                Spacer(Modifier.height(10.dp))
                dep.members.forEach { m ->
                    Row(
                        Modifier.fillMaxWidth().padding(vertical = 3.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            "${m.name.ifBlank { "Khách" }} · ${m.guests} người",
                            style = MaterialTheme.typography.bodyMedium,
                            modifier = Modifier.weight(1f),
                        )
                        if (m.phone.isNotBlank()) {
                            Text(
                                m.phone,
                                style = MaterialTheme.typography.bodyMedium,
                                color = LmBlue,
                                modifier = Modifier.padding(start = 8.dp),
                            )
                        }
                    }
                }
                // Gọi thẳng người đầu danh sách; số của từng người vẫn hiện ở trên
                dep.members.firstOrNull { it.phone.isNotBlank() }?.let { dau ->
                    Spacer(Modifier.height(8.dp))
                    OutlinedButton(
                        onClick = { goiSo(context, dau.phone) },
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.fillMaxWidth(),
                    ) { Text("Gọi ${dau.name.ifBlank { dau.phone }}") }
                }
            }

            if (dep.dangGom) {
                Spacer(Modifier.height(12.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Button(
                        onClick = onChotChay,
                        enabled = !khoa,
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = LmSuccess),
                        modifier = Modifier.weight(1f),
                    ) {
                        if (dangXuLy) {
                            CircularProgressIndicator(Modifier.size(16.dp), color = Color.White, strokeWidth = 2.dp)
                        } else Text("Chốt chạy")
                    }
                    OutlinedButton(
                        onClick = onHuyChuyen,
                        enabled = !khoa,
                        shape = RoundedCornerShape(12.dp),
                        modifier = Modifier.weight(1f),
                    ) { Text("Huỷ chuyến") }
                }
            }
        }
    }
}

/** 2026-08-24 → 24/08/2026. Đọc ngày kiểu Việt thì khỏi phải dịch trong đầu. */
internal fun ngayVN(iso: String): String {
    val p = iso.split("-")
    return if (p.size == 3) "${p[2]}/${p[1]}/${p[0]}" else iso
}

private fun chonNgay(context: Context, dangChon: LocalDate, onChon: (LocalDate) -> Unit) {
    val hopThoai = DatePickerDialog(
        context,
        { _, y, m, d -> onChon(LocalDate.of(y, m + 1, d)) },
        dangChon.year, dangChon.monthValue - 1, dangChon.dayOfMonth,
    )
    // Không cho chọn ngày đã qua: máy chủ cũng chặn, nhưng chặn ngay tại đây
    // thì khách khỏi bấm xong mới thấy báo lỗi.
    hopThoai.datePicker.minDate = System.currentTimeMillis()
    hopThoai.show()
}

private fun goiSo(context: Context, phone: String) {
    runCatching {
        context.startActivity(
            Intent(Intent.ACTION_DIAL, Uri.parse("tel:" + phone.filter { it.isDigit() || it == '+' })),
        )
    }
}
