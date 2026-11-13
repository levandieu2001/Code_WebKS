package vn.baynuistay.feature.understand.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil3.compose.AsyncImage
import vn.baynuistay.core.network.AssetUrl
import vn.baynuistay.core.network.ClusterDto
import vn.baynuistay.core.network.MonthDto
import vn.baynuistay.core.network.PeopleDto
import vn.baynuistay.core.ui.lang.tr
import vn.baynuistay.core.ui.theme.LmNavy
import vn.baynuistay.core.ui.theme.LmAmber
import vn.baynuistay.core.ui.theme.LmMuted
import vn.baynuistay.core.ui.theme.LmSuccess
import vn.baynuistay.core.ui.theme.LmBlue
import vn.baynuistay.core.ui.theme.LmInk
import vn.baynuistay.core.ui.theme.LmOrangeDark

// Màu theo mực nước — nhìn dải 12 tháng là thấy ngay nhịp mùa cả năm, không
// phải đọc từng chữ. Đây là thứ khách ngoài tỉnh cần nắm trước tiên.
private val MAU_NUOC = mapOf(
    "low" to Color(0xFFE7EEF7),
    "rising" to Color(0xFF9BC9F0),
    "flood" to Color(0xFF0F6FD0),
    "falling" to Color(0xFF63A8E2),
)

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun UnderstandScreen(
    onBack: () -> Unit,
    onOpenPlace: (String) -> Unit = {},
    viewModel: UnderstandViewModel = hiltViewModel(),
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
                        tr("Hiểu về An Giang", "About An Giang"),
                        style = MaterialTheme.typography.titleMedium,
                        color = Color.White,
                    )
                    Text(
                        tr("Đi tháng nào · Gặp ai · Sắp lịch mấy ngày",
                           "When to come · Who you meet · How to plan"),
                        style = MaterialTheme.typography.bodySmall,
                        color = Color.White.copy(alpha = .65f),
                    )
                }
            }
        }

        // ── Ba tab ──
        Row(
            Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            listOf(
                UnderstandTab.MUA to tr("Đi tháng nào", "When to come"),
                UnderstandTab.DAN_TOC to tr("Bốn dân tộc", "Four peoples"),
                UnderstandTab.CUM to tr("Sắp lịch", "Plan days"),
            ).forEach { (tab, nhan) ->
                val chon = state.tab == tab
                Surface(
                    onClick = { viewModel.moTab(tab) },
                    shape = RoundedCornerShape(50),
                    color = if (chon) LmBlue else MaterialTheme.colorScheme.surface,
                    border = if (chon) null else BorderStroke(1.5.dp, MaterialTheme.colorScheme.outlineVariant),
                    modifier = Modifier.weight(1f),
                ) {
                    Text(
                        nhan,
                        Modifier.padding(vertical = 9.dp),
                        style = MaterialTheme.typography.labelLarge,
                        color = if (chon) Color.White else MaterialTheme.colorScheme.onSurface,
                        textAlign = TextAlign.Center,
                        maxLines = 1,
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
                Button(onClick = viewModel::taiLai) { Text(tr("Thử lại", "Try again")) }
            }

            else -> LazyColumn(
                contentPadding = PaddingValues(16.dp, 4.dp, 16.dp, 110.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                when (state.tab) {
                    UnderstandTab.MUA -> {
                        val s = state.seasons
                        if (s != null) {
                            item { DaiThang(s.data, state.chonThang, s.now, viewModel::chonThang) }
                            state.thangDangXem?.let { m -> item { TheThang(m) } }
                            item {
                                Text(
                                    tr("Đi vì mục đích gì?", "What are you coming for?"),
                                    style = MaterialTheme.typography.titleMedium,
                                    modifier = Modifier.padding(top = 8.dp),
                                )
                            }
                            items(s.bestFor) { b ->
                                Surface(shape = RoundedCornerShape(14.dp), color = MaterialTheme.colorScheme.surface) {
                                    Column(Modifier.fillMaxWidth().padding(14.dp)) {
                                        Text(
                                            tr("Tháng ", "Months ") + b.months.joinToString(", "),
                                            style = MaterialTheme.typography.labelLarge,
                                            color = LmBlue,
                                        )
                                        Text(b.note, style = MaterialTheme.typography.bodyMedium)
                                    }
                                }
                            }
                        }
                    }

                    UnderstandTab.DAN_TOC -> items(state.peoples) { p -> TheDanToc(p) }

                    UnderstandTab.CUM -> items(state.clusters) { c -> TheCum(c, onOpenPlace) }
                }
            }
        }
    }
}

@Composable
private fun DaiThang(months: List<MonthDto>, chon: Int, now: Int, onChon: (Int) -> Unit) {
    Column {
        // Hai hàng 6 tháng: 12 ô trên một hàng thì mỗi ô hẹp tới mức khó bấm
        listOf(months.take(6), months.drop(6)).forEach { hang ->
            Row(
                Modifier.fillMaxWidth().padding(bottom = 6.dp),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                hang.forEach { m ->
                    Box(
                        Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(10.dp))
                            .background(MAU_NUOC[m.water] ?: MAU_NUOC["low"]!!)
                            // Viền quanh ô cho tháng đang chọn. Trước đây dùng
                            // một gạch ở đáy ô, nhưng ô chỉ cao khoảng 40dp nên
                            // gạch đè lên chính con số.
                            .then(
                                if (m.month == chon) {
                                    Modifier.border(2.dp, LmInk, RoundedCornerShape(10.dp))
                                } else Modifier,
                            )
                            .clickable { onChon(m.month) }
                            .padding(vertical = 11.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            "${m.month}",
                            style = MaterialTheme.typography.labelLarge,
                            color = LmInk,
                        )
                        if (m.month == now) {
                            Box(
                                Modifier
                                    .align(Alignment.TopEnd)
                                    .padding(3.dp)
                                    .size(6.dp)
                                    .clip(CircleShape)
                                    .background(LmBlue),
                            )
                        }

                    }
                }
            }
        }
        Text(
            tr("Màu đậm = mùa nước nổi. Chấm cam = tháng này.",
               "Darker green = floating season. Orange dot = current month."),
            style = MaterialTheme.typography.bodySmall,
            color = LmMuted,
            modifier = Modifier.padding(top = 2.dp),
        )
    }
}

@Composable
private fun TheThang(m: MonthDto) {
    Surface(shape = RoundedCornerShape(18.dp), color = MaterialTheme.colorScheme.surface) {
        Column(Modifier.fillMaxWidth().padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(
                    shape = RoundedCornerShape(50),
                    color = MAU_NUOC[m.water] ?: MAU_NUOC["low"]!!,
                ) {
                    Text(
                        m.waterLabel,
                        Modifier.padding(horizontal = 11.dp, vertical = 4.dp),
                        style = MaterialTheme.typography.labelMedium,
                        color = LmInk,
                    )
                }
                Spacer(Modifier.width(10.dp))
                Text(
                    tr("Tháng ${m.month}", "Month ${m.month}"),
                    style = MaterialTheme.typography.titleMedium,
                )
            }

            Spacer(Modifier.height(10.dp))
            Text(m.waterNote, style = MaterialTheme.typography.bodyMedium)
            Spacer(Modifier.height(6.dp))
            Text(m.weather, style = MaterialTheme.typography.bodySmall, color = LmMuted)

            Muc(tr("Nên làm gì", "What to do"), m.good, LmSuccess)
            Muc(tr("Lưu ý", "Watch out"), m.avoid, LmOrangeDark)
            Muc(tr("Đang mùa", "In season"), m.food, LmBlue)

            if (m.festivals.isNotEmpty()) {
                NhanMuc(tr("Lễ hội", "Festivals"))
                m.festivals.forEach { f ->
                    Surface(
                        shape = RoundedCornerShape(10.dp),
                        color = MaterialTheme.colorScheme.primaryContainer,
                        modifier = Modifier.fillMaxWidth().padding(top = 6.dp),
                    ) {
                        Column(Modifier.padding(12.dp)) {
                            Text(f.name, style = MaterialTheme.typography.titleSmall)
                            if (f.`when`.isNotBlank()) {
                                Text(f.`when`, style = MaterialTheme.typography.bodySmall, color = LmMuted)
                            }
                            if (f.crowd.isNotBlank()) {
                                Text(
                                    f.crowd,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = LmOrangeDark,
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

@Composable
private fun NhanMuc(text: String) {
    Text(
        text.uppercase(),
        style = MaterialTheme.typography.labelSmall,
        color = LmBlue,
        modifier = Modifier.padding(top = 14.dp, bottom = 2.dp),
    )
}

@Composable
private fun Muc(nhan: String, items: List<String>, mauDau: Color) {
    if (items.isEmpty()) return
    NhanMuc(nhan)
    items.forEach { x ->
        Row(Modifier.padding(top = 3.dp)) {
            Box(
                Modifier.padding(top = 7.dp, end = 8.dp).size(5.dp)
                    .clip(CircleShape).background(mauDau),
            )
            Text(x, style = MaterialTheme.typography.bodyMedium)
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun TheDanToc(p: PeopleDto) {
    Surface(shape = RoundedCornerShape(18.dp), color = MaterialTheme.colorScheme.surface) {
        Column {
            AsyncImage(
                model = AssetUrl(p.image),
                contentDescription = p.name,
                modifier = Modifier.fillMaxWidth().height(170.dp),
                contentScale = ContentScale.Crop,
            )
            Column(Modifier.padding(16.dp)) {
                Text(p.name, style = MaterialTheme.typography.titleMedium)
                Text(p.where, style = MaterialTheme.typography.bodySmall, color = LmMuted)
                Spacer(Modifier.height(8.dp))
                Text(p.summary, style = MaterialTheme.typography.bodyMedium)

                Muc(tr("Xem gì", "What to see"), p.see, LmBlue)

                if (p.food.isNotEmpty()) {
                    NhanMuc(tr("Ăn gì", "What to eat"))
                    FlowRow(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        p.food.forEach { m ->
                            Surface(
                                shape = RoundedCornerShape(50),
                                color = MaterialTheme.colorScheme.primaryContainer,
                            ) {
                                Text(
                                    m,
                                    Modifier.padding(horizontal = 11.dp, vertical = 5.dp),
                                    style = MaterialTheme.typography.bodySmall,
                                )
                            }
                        }
                    }
                }

                Muc(tr("Lễ hội", "Festivals"), p.festivals, LmAmber)

                // Phép lịch sự: khách không cố tình phạm, chỉ là không ai nói
                // cho họ biết. Vài dòng ở đây tránh được cảnh khó xử tại chỗ.
                Muc(tr("Nên", "Do"), p.etiquette.should, LmSuccess)
                Muc(tr("Không nên", "Don't"), p.etiquette.shouldNot, LmOrangeDark)
            }
        }
    }
}

@Composable
private fun TheCum(c: ClusterDto, onOpenPlace: (String) -> Unit) {
    Surface(shape = RoundedCornerShape(18.dp), color = MaterialTheme.colorScheme.surface) {
        Column(Modifier.fillMaxWidth().padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(shape = RoundedCornerShape(50), color = LmBlue) {
                    Text(
                        tr("Ngày ${c.day}", "Day ${c.day}"),
                        Modifier.padding(horizontal = 11.dp, vertical = 4.dp),
                        style = MaterialTheme.typography.labelMedium,
                        color = Color.White,
                    )
                }
                Spacer(Modifier.width(10.dp))
                Text(c.title, style = MaterialTheme.typography.titleSmall)
            }

            Spacer(Modifier.height(8.dp))
            Text(c.note, style = MaterialTheme.typography.bodySmall, color = LmMuted)
            Spacer(Modifier.height(12.dp))

            c.places.forEachIndexed { i, p ->
                Row(
                    Modifier.fillMaxWidth().clickable { onOpenPlace(p.slug) }.padding(vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Surface(shape = CircleShape, color = MaterialTheme.colorScheme.primaryContainer) {
                        Box(Modifier.size(26.dp), contentAlignment = Alignment.Center) {
                            Text("${i + 1}", style = MaterialTheme.typography.labelMedium, color = LmBlue)
                        }
                    }
                    Spacer(Modifier.width(10.dp))
                    Column(Modifier.weight(1f)) {
                        Text(p.name, style = MaterialTheme.typography.bodyLarge)
                        if (p.duration.isNotBlank()) {
                            Text(p.duration, style = MaterialTheme.typography.bodySmall, color = LmMuted)
                        }
                    }
                }
                // Quãng đường tới điểm kế tiếp — thứ khách tự sắp lịch không biết
                c.legs.getOrNull(i)?.let { l ->
                    Text(
                        "↓  ${l.label}",
                        style = MaterialTheme.typography.bodySmall,
                        color = LmMuted,
                        modifier = Modifier.padding(start = 36.dp, bottom = 2.dp),
                    )
                }
            }
        }
    }
}
