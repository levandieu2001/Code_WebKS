package vn.baynuistay.feature.partner.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import vn.baynuistay.core.network.CashflowResponse
import vn.baynuistay.core.ui.components.SectionHeader
import vn.baynuistay.core.ui.components.formatPrice
import vn.baynuistay.core.ui.theme.LmNavy
import vn.baynuistay.core.ui.theme.LmAmber
import vn.baynuistay.core.ui.theme.LmMuted
import vn.baynuistay.core.ui.theme.LmSuccess
import vn.baynuistay.core.ui.theme.LmBlue

// ============================================================
// Dòng tiền của riêng đối tác
// ============================================================
// Mọi con số ở đây đều của CHÍNH đối tác đang đăng nhập — máy chủ lấy id từ
// phiên chứ không lấy từ tham số gửi lên, nên không ai xem được tiền của người
// khác dù có sửa lệnh trên máy.
//
// Chỗ đối tác hay hiểu nhầm nhất: LOCALMATE chỉ giữ hộ PHẦN TIỀN CỌC khách
// chuyển qua hệ thống. Phần còn lại khách trả thẳng cho họ lúc nhận dịch vụ
// nên không xuất hiện ở đây. Câu đó phải nói ngay dưới mấy con số, không được
// để họ tự đoán rồi tưởng LOCALMATE giữ thiếu tiền.
// ============================================================

@Composable
fun CashflowSection(r: CashflowResponse) {
    val s = r.summary

    Column(Modifier.fillMaxWidth()) {
        SectionHeader(
            eyebrow = "Tháng ${thangVN(r.month)}",
            title = "Dòng tiền của bạn",
            modifier = Modifier.padding(top = 10.dp),
        )

        Surface(shape = RoundedCornerShape(20.dp), color = LmNavy) {
            Column(Modifier.fillMaxWidth().padding(18.dp)) {
                Dong("LOCALMATE thu hộ bạn", formatPrice(s.depositCollected.toInt()), LmAmber)
                Dong(
                    "Hoa hồng đã trừ (${Math.round(r.commissionRate * 100)}%)",
                    "−" + formatPrice(s.commissionDeducted.toInt()),
                    LmBlue,
                )
                Dong("Đã chuyển cho bạn", formatPrice(s.paidToYou.toInt()), LmSuccess)
                Spacer(Modifier.height(10.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text(
                            "LOCALMATE còn phải trả",
                            color = Color.White,
                            style = MaterialTheme.typography.labelLarge,
                        )
                        Text(
                            "sẽ chuyển vào cuối kỳ",
                            color = Color.White.copy(alpha = .55f),
                            style = MaterialTheme.typography.labelSmall,
                        )
                    }
                    Text(
                        formatPrice(s.owedToYou.toInt()),
                        color = LmAmber,
                        style = MaterialTheme.typography.titleLarge,
                    )
                }
            }
        }

        Text(
            "LOCALMATE chỉ giữ hộ phần tiền cọc khách chuyển qua hệ thống. Phần còn lại khách "
                + "trả thẳng cho bạn lúc nhận dịch vụ nên không có trong bảng này. Hoa hồng được "
                + "trừ vào phần cọc LOCALMATE đang giữ.",
            style = MaterialTheme.typography.bodySmall,
            color = LmMuted,
            modifier = Modifier.padding(top = 10.dp),
        )

        if (r.entries.isEmpty()) {
            Text(
                "Kỳ này chưa phát sinh khoản nào.",
                style = MaterialTheme.typography.bodyMedium,
                color = LmMuted,
                modifier = Modifier.padding(top = 12.dp),
            )
        } else {
            Spacer(Modifier.height(12.dp))
            r.entries.take(20).forEach { e ->
                Surface(
                    shape = RoundedCornerShape(14.dp),
                    color = MaterialTheme.colorScheme.surface,
                    modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
                ) {
                    Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(e.typeLabel, style = MaterialTheme.typography.bodyMedium)
                            Text(
                                listOfNotNull(
                                    ngayVN(e.date).takeIf { it.isNotBlank() },
                                    e.bookingCode.takeIf { it.isNotBlank() },
                                ).joinToString(" · "),
                                style = MaterialTheme.typography.bodySmall,
                                color = LmMuted,
                            )
                        }
                        Text(
                            (if (e.type == "commission") "−" else "") + formatPrice(e.amount.toInt()),
                            style = MaterialTheme.typography.titleSmall,
                            color = if (e.type == "commission") LmBlue else LmSuccess,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun Dong(nhan: String, so: String, mau: Color) {
    Row(
        Modifier.fillMaxWidth().padding(vertical = 5.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(nhan, color = Color.White.copy(alpha = .78f), style = MaterialTheme.typography.bodyMedium)
        Text(so, color = mau, style = MaterialTheme.typography.titleSmall)
    }
}

/** 2026-08 → 08/2026 */
private fun thangVN(iso: String): String {
    val p = iso.split("-")
    return if (p.size >= 2) "${p[1]}/${p[0]}" else iso
}
