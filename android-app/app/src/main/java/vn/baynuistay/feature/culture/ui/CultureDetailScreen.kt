package vn.baynuistay.feature.culture.ui

import androidx.compose.foundation.background
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
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.ArrowBack
import androidx.compose.material.icons.rounded.AutoAwesome
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import vn.baynuistay.core.ui.components.SectionHeader
import vn.baynuistay.core.ui.theme.LmNavy
import vn.baynuistay.core.ui.theme.LmAmber
import vn.baynuistay.core.ui.lang.tr

// Hai bản ngôn ngữ nằm ngay trong bảng dữ liệu, không gọi tr() ở đây được:
// tr() là hàm @Composable, mà bảng này là hằng ở cấp cao nhất của file, chạy
// trước khi có cây giao diện nào. Chọn bản nào là việc của lúc vẽ.
private data class CultureItem(val title: String, val subtitleVi: String, val subtitleEn: String)
private data class CultureGroup(
    val titleVi: String,
    val titleEn: String,
    val eyebrowVi: String,
    val eyebrowEn: String,
    val items: List<CultureItem>,
)

private val cultureGroups = listOf(
    CultureGroup(
        "Điểm tham quan", "Places to visit", "Khám phá", "Explore",
        listOf(
            CultureItem("Chùa Tà Pạ", "Tri Tôn · 9,1 km", "Tri Tôn · 9.1 km"),
            CultureItem("Chùa Xvayton", "Di sản Khmer", "Khmer heritage"),
            CultureItem("Hồ Tà Pạ", "Check-in · 8,4 km", "Photo spot · 8.4 km"),
        ),
    ),
    CultureGroup(
        "Hương vị Khmer", "Khmer flavours", "Ẩm thực", "Food",
        listOf(
            CultureItem("Gà đốt lá chúc", "Từ 260.000đ", "From 260,000d"),
            CultureItem("Cốm dẹp Ambok", "Từ 25.000đ", "From 25,000d"),
            CultureItem("Bánh bò thốt nốt", "Từ 10.000đ", "From 10,000d"),
        ),
    ),
    CultureGroup(
        "Lễ hội sắp tới", "Upcoming festivals", "Dòng thời gian", "Timeline",
        listOf(
            CultureItem("Đua bò Bảy Núi", "28/09/2026", "28 Sep 2026"),
            CultureItem("Sene Đôn Ta", "30/09/2026", "30 Sep 2026"),
            CultureItem("Ok Om Bok", "14/11/2026", "14 Nov 2026"),
        ),
    ),
    CultureGroup(
        "Ở đâu gần đây?", "Where to stay nearby?", "Lưu trú", "Stay",
        listOf(
            CultureItem("LOCALMATE", "Từ 850.000đ/đêm", "From 850,000d/night"),
            CultureItem("Bungalow Ven Suối", "Từ 1.200.000đ/đêm", "From 1,200,000d/night"),
        ),
    ),
)

@Composable
fun CultureDetailScreen(onBack: () -> Unit, onCreateTrip: () -> Unit) {
    Box(Modifier.fillMaxSize()) {
        LazyColumn(contentPadding = PaddingValues(bottom = 112.dp)) {
            item { CultureHero(onBack) }
            item {
                Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(tr("Không chỉ tham quan.", "More than sightseeing."), style = MaterialTheme.typography.headlineLarge)
                    Text(
                        tr("Hãy thực sự sống trong văn hóa địa phương qua chùa Khmer, lễ hội, ẩm thực và câu chuyện của người Bảy Núi.", "Live inside the local culture through Khmer pagodas, festivals, food and the stories of Bảy Núi people."),
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf(tr("12 nhánh", "12 branches"), tr("60+ liên kết", "60+ links"), tr("Nội dung xác thực", "Verified content")).forEach { label ->
                            Surface(shape = RoundedCornerShape(50), color = MaterialTheme.colorScheme.primaryContainer) {
                                Text(label, Modifier.padding(horizontal = 10.dp, vertical = 6.dp), style = MaterialTheme.typography.labelMedium)
                            }
                        }
                    }
                }
            }
            items(cultureGroups) { group -> CultureGroupSection(group) }
            item {
                Surface(
                    modifier = Modifier.padding(20.dp).fillMaxWidth(),
                    shape = RoundedCornerShape(24.dp),
                    color = LmNavy,
                ) {
                    Column(Modifier.padding(22.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Rounded.CheckCircle, null, tint = LmAmber)
                            Spacer(Modifier.width(8.dp))
                            Text("Verified Local Story", color = LmAmber, style = MaterialTheme.typography.labelLarge)
                        }
                        Spacer(Modifier.height(10.dp))
                        Text(tr("“Mỗi ngôi chùa là một kho ký ức của phum sóc.”", "“Every pagoda is a storehouse of the village's memory.”"), color = Color.White, style = MaterialTheme.typography.titleLarge)
                        Text(tr("— Câu chuyện từ người dân Tri Tôn", "— A story from the people of Tri Tôn"), color = Color.White.copy(alpha = .7f), style = MaterialTheme.typography.bodyMedium)
                    }
                }
            }
        }

        Button(
            onClick = onCreateTrip,
            modifier = Modifier.align(Alignment.BottomCenter).padding(20.dp).fillMaxWidth().height(54.dp),
            shape = RoundedCornerShape(16.dp),
        ) {
            Icon(Icons.Rounded.AutoAwesome, null)
            Spacer(Modifier.width(9.dp))
            Text(tr("Tạo hành trình văn hóa bằng AI", "Build a cultural itinerary with AI"))
        }
    }
}

@Composable
private fun CultureHero(onBack: () -> Unit) {
    Box(Modifier.fillMaxWidth().height(390.dp)) {
        AsyncImage(
            model = "http://10.0.2.2:3000/assets/chua-ta-pa.jpg",
            contentDescription = "Chùa Khmer Tà Pạ",
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Crop,
        )
        Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Color.Black.copy(alpha = .12f), LmNavy.copy(alpha = .9f)))))
        IconButton(
            onClick = onBack,
            modifier = Modifier.padding(16.dp).clip(RoundedCornerShape(14.dp)).background(Color.White.copy(alpha = .9f)),
        ) { Icon(Icons.Rounded.ArrowBack, tr("Quay lại", "Back"), tint = LmNavy) }
        Column(Modifier.align(Alignment.BottomStart).padding(22.dp)) {
            Text(tr("VĂN HÓA BẢY NÚI", "BẢY NÚI CULTURE"), color = LmAmber, style = MaterialTheme.typography.labelLarge)
            Text(tr("Văn hóa Khmer", "Khmer culture"), color = Color.White, style = MaterialTheme.typography.displaySmall)
            Text(tr("Một trong những lớp văn hóa đặc sắc nhất vùng Thất Sơn.", "One of the richest cultural layers of the Seven Mountains."), color = Color.White.copy(alpha = .8f))
        }
    }
}

@Composable
private fun CultureGroupSection(group: CultureGroup) {
    Column(Modifier.padding(vertical = 14.dp)) {
        SectionHeader(
            tr(group.eyebrowVi, group.eyebrowEn),
            tr(group.titleVi, group.titleEn),
            Modifier.padding(horizontal = 20.dp),
            action = tr("Xem tất cả", "See all"),
        )
        Spacer(Modifier.height(12.dp))
        LazyRow(contentPadding = PaddingValues(horizontal = 20.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            items(group.items) { item ->
                Surface(
                    modifier = Modifier.width(220.dp),
                    shape = RoundedCornerShape(20.dp),
                    color = MaterialTheme.colorScheme.surface,
                ) {
                    Column(Modifier.padding(18.dp)) {
                        Text(item.title, style = MaterialTheme.typography.titleLarge)
                        Spacer(Modifier.height(6.dp))
                        Text(tr(item.subtitleVi, item.subtitleEn), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        Spacer(Modifier.height(16.dp))
                        Text(tr("Khám phá  →", "Explore  →"), style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.primary)
                    }
                }
            }
        }
    }
}
