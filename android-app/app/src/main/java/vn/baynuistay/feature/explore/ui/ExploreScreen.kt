package vn.baynuistay.feature.explore.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.FilterChip
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedTextField
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import vn.baynuistay.core.ui.components.DestinationCard
import vn.baynuistay.core.ui.components.SectionHeader
import vn.baynuistay.feature.home.data.DemoContent
import vn.baynuistay.core.ui.lang.tr
import vn.baynuistay.core.ui.theme.LmBlue

@Composable
fun ExploreScreen(
    onOpenCulture: () -> Unit,
    onOpenUnderstand: () -> Unit = {},
    onOpenPlace: (String) -> Unit,
    viewModel: ExploreViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    // Cặp (khoá lọc, nhãn hiển thị). Khoá giữ nguyên tiếng Việt để so với dữ
    // liệu máy chủ; chỉ nhãn mới dịch.
    val categories = listOf(
        ALL_CATEGORY to tr("Tất cả", "All"),
        "Văn hóa" to tr("Văn hóa", "Culture"),
        "Thiên nhiên" to tr("Thiên nhiên", "Nature"),
        "Ẩm thực" to tr("Ẩm thực", "Food"),
        "Tâm linh" to tr("Tâm linh", "Spiritual"),
    )

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(bottom = 100.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item {
            Column(Modifier.padding(start = 20.dp, end = 20.dp, top = 18.dp)) {
                Text(tr("Khám phá", "Explore"), style = MaterialTheme.typography.displaySmall)
                Text(
                    tr("Chạm vào văn hóa, thiên nhiên và câu chuyện của vùng Thất Sơn.", "Touch the culture, nature and stories of the Seven Mountains."),
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }

        // Tìm nhanh địa điểm — gõ không dấu vẫn ra
        item {
            OutlinedTextField(
                value = state.query,
                onValueChange = viewModel::setQuery,
                placeholder = { Text(tr("Tìm địa điểm… (ví dụ: nui cam, ta pa)", "Search places… (e.g. nui cam, ta pa)")) },
                leadingIcon = { Icon(Icons.Rounded.Search, null) },
                trailingIcon = {
                    if (state.query.isNotBlank()) {
                        IconButton(onClick = viewModel::clearQuery) {
                            Icon(Icons.Rounded.Close, tr("Xoá tìm kiếm", "Clear search"))
                        }
                    }
                },
                singleLine = true,
                shape = RoundedCornerShape(50),
                modifier = Modifier.padding(horizontal = 20.dp).fillMaxWidth(),
            )
        }
        item {
            LazyRow(
                contentPadding = PaddingValues(horizontal = 20.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                items(categories) { (key, label) ->
                    FilterChip(
                        selected = state.category == key,
                        onClick = { viewModel.setCategory(key) },
                        label = { Text(label) },
                    )
                }
            }
        }
        // Đặt TRƯỚC thẻ Văn hoá Khmer: khách ngoài tỉnh cần biết "đi tháng nào"
        // trước khi quan tâm tới chủ đề nào — đi lệch mùa thì thấy một An Giang
        // khác hẳn ảnh trên mạng.
        item {
            androidx.compose.material3.Surface(
                onClick = onOpenUnderstand,
                modifier = Modifier.padding(horizontal = 20.dp).fillMaxWidth(),
                shape = androidx.compose.foundation.shape.RoundedCornerShape(24.dp),
                color = MaterialTheme.colorScheme.surface,
                border = androidx.compose.foundation.BorderStroke(1.5.dp, LmBlue),
            ) {
                Column(Modifier.padding(22.dp)) {
                    Text(
                        tr("LẦN ĐẦU TỚI AN GIANG?", "FIRST TIME IN AN GIANG?"),
                        style = MaterialTheme.typography.labelMedium,
                        color = LmBlue,
                    )
                    Spacer(Modifier.height(8.dp))
                    Text(
                        tr("Hiểu về An Giang", "About An Giang"),
                        style = MaterialTheme.typography.headlineMedium,
                    )
                    Spacer(Modifier.height(6.dp))
                    Text(
                        tr(
                            "Đi tháng nào, gặp những ai, sắp lịch mấy ngày cho khỏi chạy lòng vòng.",
                            "When to come, who you will meet, and how to plan your days without zigzagging.",
                        ),
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Spacer(Modifier.height(14.dp))
                    Text(
                        tr("Xem ngay  →", "Read it  →"),
                        color = LmBlue,
                        style = MaterialTheme.typography.labelLarge,
                    )
                }
            }
        }

        item {
            androidx.compose.material3.Surface(
                onClick = onOpenCulture,
                modifier = Modifier.padding(horizontal = 20.dp).fillMaxWidth(),
                shape = androidx.compose.foundation.shape.RoundedCornerShape(24.dp),
                color = MaterialTheme.colorScheme.secondary,
            ) {
                Column(Modifier.padding(22.dp)) {
                    Text(tr("CHỦ ĐỀ NỔI BẬT", "FEATURED TOPIC"), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary)
                    Spacer(Modifier.height(8.dp))
                    Text(tr("Văn hóa Khmer Bảy Núi", "Khmer culture of Bảy Núi"), style = MaterialTheme.typography.headlineMedium, color = MaterialTheme.colorScheme.onSecondary)
                    Spacer(Modifier.height(6.dp))
                    Text(tr("12 nhánh trải nghiệm được kết nối thành một hành trình hoàn chỉnh.", "Twelve branches of experience linked into one complete journey."), color = MaterialTheme.colorScheme.onSecondary.copy(alpha = .74f))
                    Spacer(Modifier.height(14.dp))
                    Text(tr("Mở Culture Graph  →", "Open the Culture Graph  →"), color = MaterialTheme.colorScheme.primary, style = MaterialTheme.typography.labelLarge)
                }
            }
        }
        item {
            SectionHeader(
                eyebrow = if (state.query.isBlank()) categories.firstOrNull { it.first == state.category }?.second.orEmpty()
                else tr("${state.visible.size} kết quả cho “${state.query}”", "${state.visible.size} results for “${state.query}”"),
                title = tr("Điểm đến dành cho bạn", "Places picked for you"),
                modifier = Modifier.padding(horizontal = 20.dp),
            )
        }
        if (state.visible.isEmpty()) {
            item {
                Text(
                    // Trống vì LỌC THEO NHÓM khác hẳn trống vì TÌM KIẾM. Câu cũ
                    // dùng chung một mẫu nên khi chưa gõ gì lại hiện dấu ngoặc
                    // rỗng: No place matches “”.
                    when {
                        state.loading -> tr("Đang tải điểm đến…", "Loading places…")
                        state.query.isNotBlank() -> tr(
                            "Không tìm thấy địa điểm nào khớp “${state.query}”.",
                            "No place matches “${state.query}”.",
                        )
                        else -> tr(
                            "Chưa có địa điểm nào trong nhóm này.",
                            "No places in this group yet.",
                        )
                    },
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(horizontal = 20.dp),
                )
            }
        }
        items(state.visible, key = { it.slug }) { destination ->
            DestinationCard(destination, Modifier.padding(horizontal = 20.dp).fillMaxWidth()) { onOpenPlace(destination.slug) }
        }
    }
}
