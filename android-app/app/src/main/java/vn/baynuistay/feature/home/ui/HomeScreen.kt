package vn.baynuistay.feature.home.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.AutoAwesome
import androidx.compose.material.icons.rounded.Cloud
import androidx.compose.material.icons.rounded.Explore
import androidx.compose.material.icons.rounded.NotificationsNone
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil3.compose.AsyncImage
import vn.baynuistay.core.network.AssetUrl
import vn.baynuistay.core.ui.components.BrandMark
import vn.baynuistay.core.ui.components.DestinationCard
import vn.baynuistay.core.ui.components.ExperienceCard
import vn.baynuistay.core.ui.components.SectionHeader
import vn.baynuistay.core.ui.theme.LmNavy
import vn.baynuistay.core.ui.theme.LmAmber
import vn.baynuistay.core.ui.theme.LmBlue
import vn.baynuistay.core.ui.lang.tr
import vn.baynuistay.core.ui.lang.trData

@Composable
fun HomeScreen(
    onOpenAi: () -> Unit,
    onOpenExplore: () -> Unit,
    onOpenCulture: () -> Unit,
    onOpenPlace: (String) -> Unit,
    onOpenNotifications: () -> Unit = {},
    onOpenRooms: () -> Unit = {},
    onOpenRide: () -> Unit = {},
    onOpenTours: () -> Unit = {},
    onOpenFood: () -> Unit = {},
    onOpenOrders: () -> Unit = {},
    viewModel: HomeViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.spacedBy(26.dp),
    ) {
        item {
            Row(
                Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 10.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                BrandMark()
                IconButton(onClick = onOpenNotifications) {
                    Icon(Icons.Rounded.NotificationsNone, contentDescription = tr("Thông báo", "Notifications"))
                }
            }
        }

        item { HeroCard(onOpenAi, onOpenExplore) }
        item { vn.baynuistay.feature.commerce.ServiceShortcuts(onOpenRooms, onOpenRide, onOpenTours, onOpenFood, onOpenOrders) }

        when {
            state.loading -> item {
                Box(Modifier.fillMaxWidth().height(180.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = LmBlue)
                }
            }
            state.error != null -> item {
                Surface(
                    modifier = Modifier.padding(horizontal = 20.dp).fillMaxWidth(),
                    shape = RoundedCornerShape(18.dp),
                    color = MaterialTheme.colorScheme.errorContainer,
                ) {
                    Text(state.error.orEmpty(), Modifier.padding(18.dp))
                }
            }
            else -> {
                val data = state.data ?: return@LazyColumn
                item {
                    WeatherStrip(
                        data.temperature,
                        trData(data.weatherText, data.weatherTextEn),
                        data.isLiveWeather,
                    )
                }
                item {
                    Column {
                        SectionHeader(
                            eyebrow = tr("Khám phá theo trải nghiệm", "Explore by experience"),
                            title = tr("Bạn muốn đi theo cách nào?", "How do you want to travel?"),
                            modifier = Modifier.padding(horizontal = 20.dp),
                            action = tr("Tất cả", "See all"),
                            onAction = onOpenExplore,
                        )
                        Spacer(Modifier.height(14.dp))
                        LazyRow(
                            contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 20.dp),
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                        ) {
                            items(data.experiences) { item ->
                                Box(Modifier.width(215.dp)) {
                                    ExperienceCard(item, Modifier.fillMaxWidth()) { onOpenPlace(item.slug) }
                                }
                            }
                        }
                    }
                }
                item { CultureFeature(onOpenCulture) }
                item {
                    Column {
                        SectionHeader(
                            eyebrow = tr("Gần bạn lúc này", "Near you right now"),
                            title = tr("Điểm đến nổi bật", "Featured destinations"),
                            modifier = Modifier.padding(horizontal = 20.dp),
                            action = tr("Xem tất cả", "See all"),
                            onAction = onOpenExplore,
                        )
                        Spacer(Modifier.height(14.dp))
                        LazyRow(
                            contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 20.dp),
                            horizontalArrangement = Arrangement.spacedBy(14.dp),
                        ) {
                            items(data.destinations) { destination ->
                                Box(Modifier.width(310.dp)) {
                                    DestinationCard(destination, Modifier.fillMaxWidth()) { onOpenPlace(destination.slug) }
                                }
                            }
                        }
                    }
                }
            }
        }
        item { Spacer(Modifier.height(88.dp)) }
    }
}

@Composable
private fun HeroCard(onOpenAi: () -> Unit, onOpenExplore: () -> Unit) {
    Box(
        Modifier
            .padding(horizontal = 14.dp)
            .fillMaxWidth()
            .height(480.dp)
            .clip(RoundedCornerShape(30.dp)),
    ) {
        AsyncImage(
            model = AssetUrl("assets/nui-cam-1.jpg"),
            contentDescription = tr("Núi Cấm, An Giang", "Núi Cấm, An Giang"),
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Crop,
        )
        Box(
            Modifier.fillMaxSize().background(
                Brush.verticalGradient(
                    listOf(Color.Black.copy(alpha = .08f), LmNavy.copy(alpha = .88f)),
                    startY = 40f,
                ),
            ),
        )
        Column(
            Modifier.align(Alignment.BottomStart).padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            Surface(shape = RoundedCornerShape(50), color = Color.White.copy(alpha = .17f)) {
                Text(
                    tr("HOMESTAY SINH THÁI · NÚI CẤM", "ECO HOMESTAY · NÚI CẤM"),
                    Modifier.padding(horizontal = 13.dp, vertical = 7.dp),
                    color = Color.White,
                    style = MaterialTheme.typography.labelMedium,
                )
            }
            Text(
                tr("Khám phá Bảy Núi\ntheo cách của riêng bạn.", "Discover Bảy Núi\nyour own way."),
                style = MaterialTheme.typography.displaySmall,
                color = Color.White,
            )
            Text(
                tr("AI đồng hành từ lúc lên kế hoạch đến từng trải nghiệm văn hóa địa phương.", "An AI companion from planning right through to every local cultural experience."),
                style = MaterialTheme.typography.bodyLarge,
                color = Color.White.copy(alpha = .88f),
            )
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Button(
                    onClick = onOpenAi,
                    colors = ButtonDefaults.buttonColors(containerColor = LmBlue),
                    shape = RoundedCornerShape(14.dp),
                ) {
                    Icon(Icons.Rounded.AutoAwesome, null, Modifier.size(18.dp))
                    Spacer(Modifier.width(7.dp))
                    Text(tr("Lập hành trình", "Plan a trip"))
                }
                Button(
                    onClick = onOpenExplore,
                    colors = ButtonDefaults.buttonColors(containerColor = Color.White.copy(alpha = .16f)),
                    shape = RoundedCornerShape(14.dp),
                ) {
                    Icon(Icons.Rounded.Explore, null, Modifier.size(18.dp))
                    Spacer(Modifier.width(7.dp))
                    Text(tr("Khám phá", "Explore"))
                }
            }
        }
    }
}

@Composable
private fun WeatherStrip(temp: Int, text: String, isLive: Boolean) {
    Surface(
        modifier = Modifier.padding(horizontal = 20.dp).fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        color = LmNavy,
    ) {
        Row(Modifier.padding(18.dp), verticalAlignment = Alignment.CenterVertically) {
            Surface(shape = CircleShape, color = Color.White.copy(alpha = .12f)) {
                Icon(Icons.Rounded.Cloud, null, Modifier.padding(11.dp), tint = LmAmber)
            }
            Spacer(Modifier.width(14.dp))
            Column(Modifier.weight(1f)) {
                Text(tr("Núi Cấm, An Giang", "Núi Cấm, An Giang"), color = Color.White, style = MaterialTheme.typography.titleMedium)
                Text(text, color = Color.White.copy(alpha = .7f), style = MaterialTheme.typography.bodyMedium)
            }
            Column(horizontalAlignment = Alignment.End) {
                Text("$temp°C", color = Color.White, style = MaterialTheme.typography.headlineMedium)
                Text(if (isLive) tr("Thời tiết trực tiếp", "Live weather") else tr("Bản demo offline", "Offline demo"), color = LmAmber, style = MaterialTheme.typography.labelMedium)
            }
        }
    }
}

@Composable
private fun CultureFeature(onClick: () -> Unit) {
    Surface(
        onClick = onClick,
        modifier = Modifier.padding(horizontal = 20.dp).fillMaxWidth(),
        shape = RoundedCornerShape(26.dp),
        color = MaterialTheme.colorScheme.surface,
    ) {
        Column(Modifier.padding(22.dp), verticalArrangement = Arrangement.spacedBy(9.dp)) {
            Text(tr("TRẢI NGHIỆM VĂN HÓA NỔI BẬT", "FEATURED CULTURAL EXPERIENCE"), style = MaterialTheme.typography.labelMedium, color = LmBlue)
            Text(
                tr(
                    "Không chỉ tham quan.\nHãy thực sự sống trong văn hóa Khmer.",
                    "More than sightseeing.\nLive inside Khmer culture.",
                ),
                style = MaterialTheme.typography.headlineMedium,
            )
            Text(
                tr("Chùa vàng, làng thốt nốt, gà đốt Ô Thum và những câu chuyện từ chính người Bảy Núi.", "Golden pagodas, palm sugar villages, Ô Thum grilled chicken, and stories told by the people of Bảy Núi."),
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Text(tr("Khám phá hành trình Khmer  →", "Explore the Khmer journey  →"), style = MaterialTheme.typography.labelLarge, color = LmBlue)
        }
    }
}
