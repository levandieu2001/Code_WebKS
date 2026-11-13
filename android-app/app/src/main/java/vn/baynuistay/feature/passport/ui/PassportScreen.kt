package vn.baynuistay.feature.passport.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items as gridItems
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.TextButton
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.platform.LocalContext
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.codescanner.GmsBarcodeScannerOptions
import com.google.mlkit.vision.codescanner.GmsBarcodeScanning
import vn.baynuistay.core.network.PassportRewardDto
import vn.baynuistay.core.network.PassportStampDto
import vn.baynuistay.core.ui.theme.LmNavy
import vn.baynuistay.core.ui.theme.LmAmber
import vn.baynuistay.core.ui.theme.LmMuted
import vn.baynuistay.core.ui.theme.LmSuccess
import vn.baynuistay.core.ui.theme.LmBlue
import vn.baynuistay.core.ui.lang.tr

// ════════════════════════════════════════════════════════════
// HỘ CHIẾU BẢY NÚI
// ════════════════════════════════════════════════════════════
// Khách tới tận điểm, quét mã QR dán ở đó, được một con dấu. Việc đóng dấu
// diễn ra trên trang web (camera điện thoại mở thẳng link) vì con dấu bắt
// buộc phải kèm toạ độ GPS thật. Màn này chỉ để XEM và để khoe.

@Composable
fun PassportScreen(viewModel: PassportViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val context = LocalContext.current

    /**
     * Mở bộ quét mã của Google Play services.
     *
     * Chọn cách này thay vì tự dựng camera: KHÔNG cần xin quyền camera, giao
     * diện quét do hệ thống lo nên quen thuộc với người dùng, và phần nhận
     * dạng chỉ tải về lần đầu nên app không phình thêm chục MB.
     */
    fun openScanner() {
        val scanner = GmsBarcodeScanning.getClient(
            context,
            GmsBarcodeScannerOptions.Builder()
                .setBarcodeFormats(Barcode.FORMAT_QR_CODE)
                .enableAutoZoom()
                .build(),
        )
        scanner.startScan()
            .addOnSuccessListener { code -> viewModel.onScanned(code.rawValue.orEmpty()) }
            .addOnFailureListener { /* khách bấm huỷ hoặc máy thiếu Play services */ }
    }

    // Kết quả đóng dấu — báo thành công hay lý do không đóng được
    state.stampResult?.let { message ->
        AlertDialog(
            onDismissRequest = viewModel::dismissStampResult,
            title = { Text(if (state.stampOk) tr("Đã đóng dấu!", "Stamped!") else tr("Chưa đóng được dấu", "Could not stamp")) },
            text = { Text(message) },
            confirmButton = {
                TextButton(onClick = viewModel::dismissStampResult) { Text(tr("Đóng", "Close")) }
            },
        )
    }

    if (state.loading) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator(color = LmBlue)
        }
        return
    }

    val book = state.book
    if (book == null) {
        Column(
            Modifier.fillMaxSize().padding(28.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(
                state.error ?: tr("Chưa mở được hộ chiếu.", "Could not open the passport."),
                style = MaterialTheme.typography.bodyLarge,
                color = LmMuted,
                textAlign = TextAlign.Center,
            )
            Spacer(Modifier.height(14.dp))
            Button(onClick = viewModel::load, shape = RoundedCornerShape(14.dp)) { Text(tr("Thử lại", "Try again")) }
        }
        return
    }

    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(20.dp, 18.dp, 20.dp, 40.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item {
            Text(tr("Hộ chiếu LOCALMATE", "LOCALMATE Passport"), style = MaterialTheme.typography.headlineMedium, color = LmNavy)
            Text(
                tr("Tới tận nơi, quét mã QR tại điểm để nhận con dấu.", "Go there in person and scan the QR code on site to earn a stamp."),
                style = MaterialTheme.typography.bodyMedium,
                color = LmMuted,
            )
            Spacer(Modifier.height(12.dp))
            Button(
                onClick = { openScanner() },
                enabled = !state.stamping,
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(containerColor = LmBlue),
                modifier = Modifier.fillMaxWidth().height(52.dp),
            ) {
                Text(
                    if (state.stamping) tr("Đang xác nhận vị trí…", "Checking your location…") else tr("Quét mã đóng dấu", "Scan to stamp"),
                    style = MaterialTheme.typography.titleMedium,
                )
            }
        }

        // Thẻ hộ chiếu
        item {
            Surface(shape = RoundedCornerShape(22.dp), color = LmNavy, modifier = Modifier.fillMaxWidth()) {
                Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    // Chưa biết tên thì đừng lặp lại tên cấp bậc ngay bên dưới —
                    // nhìn như lỗi hiển thị.
                    Text(
                        book.holderName.ifBlank { tr("Hộ chiếu của bạn", "Your passport") }.uppercase(),
                        style = MaterialTheme.typography.labelLarge,
                        color = LmAmber,
                    )
                    Row(
                        Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column(Modifier.weight(1f)) {
                            Text(
                                book.levelName,
                                style = MaterialTheme.typography.headlineSmall,
                                color = Color.White,
                            )
                            Text(
                                tr("Cấp ${book.level}", "Level ${book.level}"),
                                style = MaterialTheme.typography.bodySmall,
                                color = Color.White.copy(alpha = .6f),
                            )
                        }
                        Text(
                            "${book.count}/${book.total}",
                            style = MaterialTheme.typography.headlineMedium,
                            fontWeight = FontWeight.ExtraBold,
                            color = LmAmber,
                        )
                    }
                    LinearProgressIndicator(
                        progress = {
                            if (book.total > 0) book.count.toFloat() / book.total else 0f
                        },
                        color = LmAmber,
                        trackColor = Color.White.copy(alpha = .15f),
                        modifier = Modifier.fillMaxWidth().height(8.dp),
                    )
                    Text(
                        if (book.nextLevelIn > 0) tr("Còn ${book.nextLevelIn} dấu nữa để lên cấp.", "${book.nextLevelIn} more stamps to level up.")
                        else tr("Bạn đã đi đủ Bảy Núi. Hiếm ai làm được!", "You have covered all of Bảy Núi. Very few people do!"),
                        style = MaterialTheme.typography.bodySmall,
                        color = Color.White.copy(alpha = .72f),
                    )
                }
            }
        }

        item { Text(tr("Con dấu", "Stamps"), style = MaterialTheme.typography.titleMedium, color = LmNavy) }

        // Lưới con dấu. Dùng chiều cao cố định vì lưới lồng trong LazyColumn
        // không tự đo được — để nó tự do thì Compose ném lỗi lúc chạy.
        item {
            val rows = (book.stamps.size + 2) / 3
            LazyVerticalGrid(
                columns = GridCells.Fixed(3),
                modifier = Modifier.fillMaxWidth().height((rows * 132).dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
                userScrollEnabled = false,
            ) {
                gridItems(book.stamps, key = { it.slug }) { StampCard(it) }
            }
        }

        item { Text(tr("Ưu đãi", "Rewards"), style = MaterialTheme.typography.titleMedium, color = LmNavy) }

        items(book.rewards) { RewardRow(it) }

        item {
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = MaterialTheme.colorScheme.surfaceVariant,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(tr("Đóng dấu thế nào?", "How does stamping work?"), style = MaterialTheme.typography.titleSmall)
                    Text(
                        tr("Tới điểm → giơ camera lên mã QR dán tại đó → cho phép định vị. ", "Go to the spot → point your camera at the QR code posted there → allow location. ")
                            + tr("Con dấu chỉ đóng được khi bạn thật sự có mặt, nên mỗi con dấu đều đáng tin.", "A stamp only registers when you are genuinely there, so every stamp means something."),
                        style = MaterialTheme.typography.bodySmall,
                        color = LmMuted,
                    )
                }
            }
        }
    }
}

@Composable
private fun StampCard(stamp: PassportStampDto) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(6.dp),
        modifier = Modifier
            .background(
                if (stamp.earned) LmSuccess.copy(alpha = .10f) else MaterialTheme.colorScheme.surfaceVariant,
                RoundedCornerShape(16.dp),
            )
            .padding(vertical = 14.dp, horizontal = 6.dp),
    ) {
        Box(
            Modifier
                .size(56.dp)
                .background(if (stamp.earned) LmNavy else Color.Transparent, CircleShape)
                .border(2.dp, if (stamp.earned) LmAmber else LmMuted.copy(alpha = .35f), CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                stamp.symbol,
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.ExtraBold,
                color = if (stamp.earned) LmAmber else LmMuted.copy(alpha = .5f),
            )
        }
        Text(
            stamp.name,
            style = MaterialTheme.typography.labelMedium,
            textAlign = TextAlign.Center,
            maxLines = 2,
        )
        Text(
            if (stamp.earned) stamp.earnedAt.toDayMonth() else tr("Chưa tới", "Not yet"),
            style = MaterialTheme.typography.labelSmall,
            color = LmMuted,
        )
    }
}

@Composable
private fun RewardRow(reward: PassportRewardDto) {
    Surface(
        shape = RoundedCornerShape(14.dp),
        color = if (reward.unlocked) LmSuccess.copy(alpha = .12f) else MaterialTheme.colorScheme.surfaceVariant,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Row(
            Modifier.padding(15.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(Modifier.weight(1f)) {
                Text(reward.title, style = MaterialTheme.typography.titleSmall)
                Text(reward.note, style = MaterialTheme.typography.bodySmall, color = LmMuted)
            }
            if (reward.unlocked) {
                Surface(shape = RoundedCornerShape(9.dp), color = LmNavy) {
                    Text(
                        reward.code,
                        Modifier.padding(horizontal = 11.dp, vertical = 6.dp),
                        style = MaterialTheme.typography.labelLarge,
                        color = LmAmber,
                    )
                }
            } else {
                Text(
                    tr("Còn ${reward.missing} dấu", "${reward.missing} stamps to go"),
                    style = MaterialTheme.typography.labelMedium,
                    color = LmMuted,
                )
            }
        }
    }
}

/** "2026-08-13T…" → "13/08". Máy chủ trả ISO, người Việt đọc ngày trước. */
private fun String.toDayMonth(): String {
    val parts = take(10).split("-")
    return if (parts.size >= 3) "${parts[2]}/${parts[1]}" else this
}
