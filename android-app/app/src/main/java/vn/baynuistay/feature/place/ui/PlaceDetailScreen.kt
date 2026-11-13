@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package vn.baynuistay.feature.place.ui

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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.ArrowBack
import androidx.compose.material.icons.rounded.DirectionsCar
import androidx.compose.material.icons.rounded.Info
import androidx.compose.material.icons.rounded.LocationOn
import androidx.compose.material.icons.rounded.Schedule
import androidx.compose.material.icons.rounded.Star
import androidx.compose.material.icons.rounded.Wallet
import androidx.compose.material.icons.rounded.WbSunny
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil3.compose.AsyncImage
import vn.baynuistay.core.network.FoodDto
import vn.baynuistay.core.network.PlaceDto
import vn.baynuistay.core.network.PlaceSummaryDto
import vn.baynuistay.core.network.RoomDto
import vn.baynuistay.core.network.TourDto
import vn.baynuistay.core.ui.components.SectionHeader
import vn.baynuistay.core.ui.components.formatPrice
import vn.baynuistay.core.ui.theme.LmNavy
import vn.baynuistay.core.ui.theme.LmAmber
import vn.baynuistay.core.ui.theme.LmSuccess
import vn.baynuistay.core.ui.theme.LmBlue
import vn.baynuistay.core.ui.lang.tr
import vn.baynuistay.core.ui.lang.trData

@Composable
fun PlaceDetailScreen(
    onBack: () -> Unit,
    onOpenPlace: (String) -> Unit,
    onBookRoom: (RoomDto) -> Unit,
    onBookTour: (TourDto) -> Unit,
    onBookTransport: (String) -> Unit,
    viewModel: PlaceDetailViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    when {
        state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator(color = LmBlue)
        }

        state.error != null -> Box(Modifier.fillMaxSize().padding(28.dp), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(tr("Không mở được điểm đến", "Could not open this place"), style = MaterialTheme.typography.titleLarge)
                Text(
                    state.error.orEmpty(),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Button(
                    onClick = viewModel::load,
                    colors = ButtonDefaults.buttonColors(containerColor = LmBlue),
                ) { Text(tr("Thử lại", "Try again")) }
            }
        }

        else -> {
            val data = state.data ?: return
            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(bottom = 110.dp),
                verticalArrangement = Arrangement.spacedBy(24.dp),
            ) {
                item { PlaceHero(data.place, onBack) }
                item { PlaceInfo(data.place) }

                if (data.foods.isNotEmpty()) {
                    item {
                        Column {
                            SectionHeader(
                                eyebrow = tr("Ăn gì gần đây", "What to eat nearby"),
                                title = tr("Món nên thử", "Dishes to try"),
                                modifier = Modifier.padding(horizontal = 20.dp),
                            )
                            Spacer(Modifier.height(14.dp))
                            LazyRow(
                                contentPadding = PaddingValues(horizontal = 20.dp),
                                horizontalArrangement = Arrangement.spacedBy(12.dp),
                            ) {
                                items(data.foods) { food -> FoodCard(food) }
                            }
                        }
                    }
                }

                if (data.stays.isNotEmpty()) {
                    item {
                        SectionHeader(
                            eyebrow = tr("Ở đâu gần đây", "Where to stay nearby"),
                            title = tr("Phòng nghỉ gần điểm đến", "Rooms near this place"),
                            modifier = Modifier.padding(horizontal = 20.dp),
                        )
                    }
                    items(data.stays) { room ->
                        StayCard(room, Modifier.padding(horizontal = 20.dp)) { onBookRoom(room) }
                    }
                }

                if (data.tours.isNotEmpty()) {
                    item {
                        SectionHeader(
                            eyebrow = tr("Tour liên quan", "Related tours"),
                            title = tr("Đi cùng người bản địa", "Go with a local guide"),
                            modifier = Modifier.padding(horizontal = 20.dp),
                        )
                    }
                    items(data.tours) { tour ->
                        TourCard(tour, Modifier.padding(horizontal = 20.dp)) { onBookTour(tour) }
                    }
                }

                item { TransportCta(data.transport.hint) { onBookTransport(data.place.name) } }

                if (data.nearby.isNotEmpty()) {
                    item {
                        Column {
                            SectionHeader(
                                eyebrow = tr("Kết hợp trong ngày", "Combine in one day"),
                                title = tr("Địa điểm gần đó", "Places nearby"),
                                modifier = Modifier.padding(horizontal = 20.dp),
                            )
                            Spacer(Modifier.height(14.dp))
                            LazyRow(
                                contentPadding = PaddingValues(horizontal = 20.dp),
                                horizontalArrangement = Arrangement.spacedBy(12.dp),
                            ) {
                                items(data.nearby) { near -> NearbyCard(near) { onOpenPlace(near.slug) } }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun PlaceHero(place: PlaceDto, onBack: () -> Unit) {
    Box(Modifier.fillMaxWidth().height(340.dp)) {
        AsyncImage(
            model = place.image,
            contentDescription = place.name,
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Crop,
        )
        Box(
            Modifier.fillMaxSize().background(
                Brush.verticalGradient(listOf(Color.Black.copy(alpha = .3f), LmNavy.copy(alpha = .9f))),
            ),
        )
        IconButton(
            onClick = onBack,
            modifier = Modifier.padding(12.dp).align(Alignment.TopStart),
        ) {
            Surface(shape = CircleShape, color = Color.White.copy(alpha = .22f)) {
                Icon(Icons.Rounded.ArrowBack, tr("Quay lại", "Back"), Modifier.padding(8.dp), tint = Color.White)
            }
        }
        Column(
            Modifier.align(Alignment.BottomStart).padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Surface(shape = RoundedCornerShape(50), color = Color.White.copy(alpha = .18f)) {
                Text(
                    trData(place.category, place.categoryEn),
                    Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                    color = Color.White,
                    style = MaterialTheme.typography.labelMedium,
                )
            }
            Text(trData(place.name, place.nameEn), style = MaterialTheme.typography.displaySmall, color = Color.White)
            Text(
                trData(place.summary, place.summaryEn),
                style = MaterialTheme.typography.bodyLarge,
                color = Color.White.copy(alpha = .88f),
            )
        }
    }
}

@Composable
private fun PlaceInfo(place: PlaceDto) {
    Column(Modifier.padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            item { InfoChip(Icons.Rounded.Star, "${place.rating}") }
            item { InfoChip(Icons.Rounded.LocationOn, tr("Cách homestay ${place.distanceKm} km", "${place.distanceKm} km from the homestay")) }
            item { InfoChip(Icons.Rounded.Schedule, trData(place.duration, place.durationEn)) }
            item { InfoChip(Icons.Rounded.Wallet, trData(place.ticket, place.ticketEn)) }
        }
        Text(place.content, style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)

        NoteCard(
            Icons.Rounded.WbSunny,
            tr("Nên đi khi nào", "When to go"),
            trData(place.bestTime, place.bestTimeEn) + "\n" +
                tr("Giờ mở cửa: ", "Opening hours: ") + trData(place.openTime, place.openTimeEn),
            LmSuccess,
        )
        NoteCard(Icons.Rounded.Info, tr("Lưu ý", "Notes"), trData(place.tips, place.tipsEn), LmBlue)
    }
}

@Composable
private fun InfoChip(icon: ImageVector, label: String) {
    Surface(shape = RoundedCornerShape(50), color = MaterialTheme.colorScheme.surface) {
        Row(
            Modifier.padding(horizontal = 13.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(icon, null, Modifier.size(15.dp), tint = LmBlue)
            Spacer(Modifier.width(6.dp))
            Text(label, style = MaterialTheme.typography.labelLarge, maxLines = 1)
        }
    }
}

@Composable
private fun NoteCard(icon: ImageVector, title: String, body: String, tone: Color) {
    Surface(shape = RoundedCornerShape(18.dp), color = tone.copy(alpha = .10f), modifier = Modifier.fillMaxWidth()) {
        Row(Modifier.padding(16.dp), verticalAlignment = Alignment.Top) {
            Icon(icon, null, Modifier.size(19.dp), tint = tone)
            Spacer(Modifier.width(11.dp))
            Column {
                Text(title, style = MaterialTheme.typography.titleSmall)
                Text(body, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}

@Composable
private fun FoodCard(food: FoodDto) {
    Card(
        modifier = Modifier.width(200.dp),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
    ) {
        Column {
            AsyncImage(
                model = food.image,
                contentDescription = food.name,
                modifier = Modifier.fillMaxWidth().height(120.dp),
                contentScale = ContentScale.Crop,
            )
            Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(food.cul, style = MaterialTheme.typography.labelMedium, color = LmBlue, maxLines = 1)
                Text(food.name, style = MaterialTheme.typography.titleMedium, maxLines = 2, overflow = TextOverflow.Ellipsis)
                Text(formatPrice(food.price), style = MaterialTheme.typography.titleSmall, color = LmBlue)
            }
        }
    }
}

@Composable
private fun StayCard(room: RoomDto, modifier: Modifier = Modifier, onBook: () -> Unit) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
    ) {
        Row(Modifier.padding(14.dp)) {
            AsyncImage(
                model = room.imageUrl,
                contentDescription = room.name,
                modifier = Modifier.size(92.dp).clip(RoundedCornerShape(16.dp)),
                contentScale = ContentScale.Crop,
            )
            Spacer(Modifier.width(14.dp))
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(room.name, style = MaterialTheme.typography.titleMedium, maxLines = 2, overflow = TextOverflow.Ellipsis)
                Text(
                    tr("${room.capacity} khách", "${room.capacity} guests"),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(formatPrice(room.price), style = MaterialTheme.typography.titleMedium, color = LmBlue)
                    Text(tr("/đêm", "/night"), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(Modifier.weight(1f))
                    Button(
                        onClick = onBook,
                        enabled = room.isAvailable,
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = LmBlue),
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                    ) { Text(tr("Đặt phòng", "Book"), style = MaterialTheme.typography.labelLarge) }
                }
            }
        }
    }
}

@Composable
private fun TourCard(tour: TourDto, modifier: Modifier = Modifier, onBook: () -> Unit) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
    ) {
        Column {
            Box {
                AsyncImage(
                    model = tour.image,
                    contentDescription = tour.name,
                    modifier = Modifier.fillMaxWidth().height(150.dp),
                    contentScale = ContentScale.Crop,
                )
                Surface(
                    modifier = Modifier.align(Alignment.TopEnd).padding(11.dp),
                    shape = RoundedCornerShape(11.dp),
                    color = Color.White.copy(alpha = .93f),
                ) {
                    Row(Modifier.padding(horizontal = 9.dp, vertical = 5.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Rounded.Star, null, Modifier.size(14.dp), tint = LmAmber)
                        Spacer(Modifier.width(4.dp))
                        Text("${tour.rating}", style = MaterialTheme.typography.labelMedium, color = LmNavy)
                    }
                }
            }
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(tour.name, style = MaterialTheme.typography.titleLarge)
                Text(
                    "${tour.duration} · ${tour.pax}",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Text(
                    tour.stops,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                Row(Modifier.fillMaxWidth().padding(top = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                    Column {
                        Text(formatPrice(tour.price), style = MaterialTheme.typography.headlineSmall, color = LmBlue)
                        Text(tr("/khách", "/guest"), style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    Spacer(Modifier.weight(1f))
                    Button(
                        onClick = onBook,
                        shape = RoundedCornerShape(13.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = LmBlue),
                    ) { Text(tr("Đặt tour", "Book tour")) }
                }
            }
        }
    }
}

@Composable
private fun TransportCta(hint: String, onBook: () -> Unit) {
    Surface(
        modifier = Modifier.padding(horizontal = 20.dp).fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        color = LmNavy,
    ) {
        Column(Modifier.padding(22.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Icon(Icons.Rounded.DirectionsCar, null, Modifier.size(26.dp), tint = LmAmber)
            Text(hint, style = MaterialTheme.typography.headlineSmall, color = Color.White)
            Text(
                tr("Chọn điểm đón hoặc dùng vị trí hiện tại, xem ngay giá của các nhà xe địa phương.", "Pick a pick-up point or use your current location to see prices from local operators."),
                style = MaterialTheme.typography.bodyMedium,
                color = Color.White.copy(alpha = .74f),
            )
            Button(
                onClick = onBook,
                modifier = Modifier.padding(top = 4.dp),
                shape = RoundedCornerShape(13.dp),
                colors = ButtonDefaults.buttonColors(containerColor = LmAmber, contentColor = LmNavy),
            ) { Text(tr("Tìm xe & đặt", "Find a ride")) }
        }
    }
}

@Composable
private fun NearbyCard(place: PlaceSummaryDto, onClick: () -> Unit) {
    Card(
        onClick = onClick,
        modifier = Modifier.width(220.dp),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
    ) {
        Column {
            AsyncImage(
                model = place.image,
                contentDescription = place.name,
                modifier = Modifier.fillMaxWidth().height(120.dp),
                contentScale = ContentScale.Crop,
            )
            Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(trData(place.name, place.nameEn), style = MaterialTheme.typography.titleMedium, maxLines = 2, overflow = TextOverflow.Ellipsis)
                Text(
                    "${place.distanceKm} km · " + trData(place.category, place.categoryEn),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1,
                )
            }
        }
    }
}
