@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package vn.baynuistay.feature.trip.ui

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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.AutoAwesome
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.Celebration
import androidx.compose.material.icons.rounded.CloudQueue
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import vn.baynuistay.core.network.ItineraryItemDto
import vn.baynuistay.core.ui.components.formatDate
import vn.baynuistay.core.ui.components.formatPrice
import vn.baynuistay.core.ui.theme.LmNavy
import vn.baynuistay.core.ui.theme.LmAmber
import vn.baynuistay.core.ui.theme.LmSuccess
import vn.baynuistay.core.ui.theme.LmBlue
import vn.baynuistay.core.ui.lang.tr

@Composable
fun TripScreen(
    onBookTransport: (pickup: String, dropoff: String) -> Unit = { _, _ -> },
    onBookStay: (stayId: String, checkIn: String, checkOut: String) -> Unit = { _, _, _ -> },
    onOpenPlace: (String) -> Unit = {},
    onCreateTrip: () -> Unit = {},
    viewModel: TripViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    if (state.loading) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator(color = LmBlue)
        }
        return
    }

    val trip = state.trip
    if (trip == null) {
        Column(
            Modifier.fillMaxSize().padding(28.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Icon(Icons.Rounded.AutoAwesome, null, Modifier.size(40.dp), tint = LmBlue)
            Spacer(Modifier.height(14.dp))
            Text(
                state.error ?: tr("Chưa có lịch trình nào.", "No itinerary yet."),
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(Modifier.height(18.dp))
            Button(onClick = onCreateTrip, shape = RoundedCornerShape(14.dp)) {
                Text(tr("Tạo lịch trình cho tôi", "Create my itinerary"))
            }
        }
        return
    }

    val allItems = trip.plan.flatMap { day -> day.items.map { "${day.day}:${it.time}" } }
    val doneCount = allItems.count { it in state.done }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(20.dp, 20.dp, 20.dp, 110.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            Text(trip.title, style = MaterialTheme.typography.displaySmall)
            Text(
                tr("${formatDate(trip.startDate)} – ${formatDate(trip.endDate)} · ${trip.people} khách", "${formatDate(trip.startDate)} – ${formatDate(trip.endDate)} · ${trip.people} guests"),
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }

        item {
            Surface(shape = RoundedCornerShape(22.dp), color = LmNavy) {
                Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(9.dp)) {
                    Row(
                        horizontalArrangement = Arrangement.SpaceBetween,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Text(tr("Tiến độ hành trình", "Trip progress"), color = Color.White, style = MaterialTheme.typography.titleMedium)
                        Text("$doneCount / ${allItems.size}", color = LmAmber, style = MaterialTheme.typography.titleMedium)
                    }
                    LinearProgressIndicator(
                        progress = { if (allItems.isEmpty()) 0f else doneCount.toFloat() / allItems.size },
                        modifier = Modifier.fillMaxWidth(),
                        color = LmAmber,
                        trackColor = Color.White.copy(alpha = .15f),
                    )
                    Text(
                        trip.budgetNote,
                        color = Color.White.copy(alpha = .72f),
                        style = MaterialTheme.typography.bodySmall,
                    )
                }
            }
        }

        // Lễ hội trùng ngày đi — điểm đặc sắc nhất của vùng, đưa lên trên
        if (trip.eventHighlight.isNotBlank()) {
            item {
                Surface(shape = RoundedCornerShape(18.dp), color = LmAmber.copy(alpha = .22f)) {
                    Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Rounded.Celebration, null, tint = LmBlue)
                        Spacer(Modifier.width(10.dp))
                        Text(trip.eventHighlight, style = MaterialTheme.typography.bodyMedium)
                    }
                }
            }
        }

        // Đề nghị đổi lịch vì sắp mưa ở điểm ngoài trời kế tiếp
        state.replan?.let { replan ->
            item {
                Surface(
                    shape = RoundedCornerShape(18.dp),
                    color = if (replan.state == "suggest") LmBlue.copy(alpha = .16f)
                    else MaterialTheme.colorScheme.surfaceVariant,
                ) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Rounded.CloudQueue, null, Modifier.size(18.dp), tint = LmBlue)
                            Spacer(Modifier.width(8.dp))
                            Text(
                                if (replan.state == "suggest") tr("Sắp mưa ở điểm tiếp theo", "Rain expected at your next stop") else tr("Nhớ mang áo mưa", "Bring a raincoat"),
                                style = MaterialTheme.typography.titleSmall,
                            )
                        }
                        Text(replan.message, style = MaterialTheme.typography.bodyMedium)
                        if (replan.state == "suggest") {
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Button(
                                    onClick = viewModel::applyReplan,
                                    enabled = !state.replanning,
                                    shape = RoundedCornerShape(12.dp),
                                ) { Text(if (state.replanning) tr("Đang xếp lại…", "Rearranging…") else tr("Đổi giúp tôi", "Rearrange for me")) }
                                OutlinedButton(
                                    onClick = viewModel::dismissReplan,
                                    shape = RoundedCornerShape(12.dp),
                                ) { Text(tr("Giữ nguyên", "Keep as is")) }
                            }
                        }
                    }
                }
            }
        }

        if (trip.summary.isNotBlank()) {
            item {
                Surface(shape = RoundedCornerShape(20.dp), color = MaterialTheme.colorScheme.primaryContainer) {
                    Row(Modifier.padding(17.dp), verticalAlignment = Alignment.Top) {
                        Icon(Icons.Rounded.AutoAwesome, null, tint = LmBlue)
                        Spacer(Modifier.width(10.dp))
                        Column {
                            Text("Bay Nui", style = MaterialTheme.typography.titleMedium)
                            Text(trip.summary, style = MaterialTheme.typography.bodyMedium)
                        }
                    }
                }
            }
        }

        trip.plan.forEach { day ->
            item(key = "day-${day.day}") {
                Row(
                    Modifier.fillMaxWidth().padding(top = 8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.Bottom,
                ) {
                    Text(tr("Ngày ${day.day}", "Day ${day.day}"), style = MaterialTheme.typography.titleLarge)
                    Text(
                        "${formatDate(day.date)} · ${formatPrice(day.cost)}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                day.weather?.let { w ->
                    Surface(
                        shape = RoundedCornerShape(50),
                        color = if (w.rainProbability >= 70) LmBlue.copy(alpha = .16f)
                        else MaterialTheme.colorScheme.surfaceVariant,
                        modifier = Modifier.padding(top = 6.dp),
                    ) {
                        Text(
                            tr("${w.tempMin.toInt()}–${w.tempMax.toInt()}°C · mưa ${w.rainProbability}% · ${w.textVi}", "${w.tempMin.toInt()}–${w.tempMax.toInt()}°C · rain ${w.rainProbability}% · ${w.textEn.ifBlank { w.textVi }}"),
                            Modifier.padding(horizontal = 12.dp, vertical = 5.dp),
                            style = MaterialTheme.typography.labelSmall,
                        )
                    }
                }
            }
            // Đặt tên là "stop" chứ không phải "item" — trùng tên sẽ che mất
            // hàm item() của LazyColumn.
            day.items.forEachIndexed { index, stop ->
                val key = "${day.day}:${stop.time}"
                item(key = "stop-$key-$index") {
                    TimelineItem(
                        stop = stop,
                        done = key in state.done,
                        isLast = index == day.items.lastIndex,
                        onToggle = { viewModel.toggleDone(key) },
                        onBookTransport = onBookTransport,
                        onBookStay = onBookStay,
                        onOpenPlace = onOpenPlace,
                    )
                }
            }
        }

        if (trip.tips.isNotEmpty()) {
            item {
                Surface(
                    shape = RoundedCornerShape(20.dp),
                    color = MaterialTheme.colorScheme.surface,
                    modifier = Modifier.padding(top = 8.dp),
                ) {
                    Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(tr("Mẹo cho chuyến này", "Tips for this trip"), style = MaterialTheme.typography.titleMedium)
                        trip.tips.forEach { tip ->
                            Text(
                                "· $tip",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun TimelineItem(
    stop: ItineraryItemDto,
    done: Boolean,
    isLast: Boolean,
    onToggle: () -> Unit,
    onBookTransport: (String, String) -> Unit,
    onBookStay: (String, String, String) -> Unit,
    onOpenPlace: (String) -> Unit,
) {
    Row(Modifier.fillMaxWidth()) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Surface(
                onClick = onToggle,
                shape = CircleShape,
                color = if (done) LmSuccess else MaterialTheme.colorScheme.surfaceVariant,
                modifier = Modifier.size(32.dp),
            ) {
                Box(contentAlignment = Alignment.Center) {
                    if (done) {
                        Icon(Icons.Rounded.Check, tr("Đã đi", "Done"), Modifier.size(18.dp), tint = Color.White)
                    } else {
                        Text("•", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
            if (!isLast) {
                Box(
                    Modifier
                        .width(2.dp)
                        .height(76.dp)
                        .background(MaterialTheme.colorScheme.outline.copy(alpha = .35f)),
                )
            }
        }
        Spacer(Modifier.width(12.dp))
        Surface(
            modifier = Modifier.weight(1f),
            shape = RoundedCornerShape(18.dp),
            color = MaterialTheme.colorScheme.surface,
        ) {
            Column(Modifier.padding(15.dp), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                Text(stop.time, style = MaterialTheme.typography.labelMedium, color = LmBlue)
                Text(stop.title, style = MaterialTheme.typography.titleMedium)
                Text(
                    stop.subtitle,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )

                if (stop.weatherNote.isNotBlank()) {
                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 4.dp)) {
                        Icon(Icons.Rounded.CloudQueue, null, Modifier.size(15.dp), tint = LmBlue)
                        Spacer(Modifier.width(6.dp))
                        Text(stop.weatherNote, style = MaterialTheme.typography.bodySmall, color = LmBlue)
                    }
                }

                Row(
                    Modifier.fillMaxWidth().padding(top = 8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    if (stop.price > 0) {
                        Text(formatPrice(stop.price), style = MaterialTheme.typography.titleSmall)
                    } else {
                        Spacer(Modifier.width(1.dp))
                    }

                    // Mỗi mục nối thẳng vào phần đặt chỗ đang chạy của app
                    when (stop.action) {
                        "book_transport" -> OutlinedButton(
                            onClick = {
                                onBookTransport(stop.payload?.pickup ?: "", stop.payload?.dropoff ?: "")
                            },
                            shape = RoundedCornerShape(12.dp),
                        ) { Text(stop.actionLabel.ifBlank { tr("Đặt xe", "Book a ride") }) }

                        "book_stay" -> OutlinedButton(
                            onClick = {
                                onBookStay(
                                stop.payload?.stayId ?: "",
                                stop.payload?.checkIn ?: "",
                                stop.payload?.checkOut ?: "",
                            )
                            },
                            shape = RoundedCornerShape(12.dp),
                        ) { Text(stop.actionLabel.ifBlank { tr("Giữ phòng", "Hold a room") }) }

                        "view_place" -> if (stop.kind == "place" && stop.slug.isNotBlank()) {
                            OutlinedButton(
                                onClick = { onOpenPlace(stop.slug) },
                                shape = RoundedCornerShape(12.dp),
                            ) { Text(stop.actionLabel.ifBlank { tr("Xem chi tiết", "View details") }) }
                        }
                    }
                }
            }
        }
    }
}
