@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package vn.baynuistay.feature.booking.ui

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
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.Group
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.material3.OutlinedTextField
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil3.compose.AsyncImage
import vn.baynuistay.core.network.RoomDto
import vn.baynuistay.core.ui.components.SectionHeader
import vn.baynuistay.core.ui.components.formatPrice
import vn.baynuistay.core.ui.theme.LmSuccess
import vn.baynuistay.core.ui.theme.LmBlue
import vn.baynuistay.core.ui.lang.tr

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RoomsScreen(
    onOpenTransport: () -> Unit,
    onOpenFood: () -> Unit = {},
    onOpenTours: () -> Unit = {},
    onOpenOrders: () -> Unit = {},
    viewModel: RoomsViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var query by rememberSaveable { mutableStateOf("") }
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(20.dp, 20.dp, 20.dp, 110.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item { vn.baynuistay.feature.commerce.ServiceShortcuts({}, onOpenTransport, onOpenTours, onOpenFood, onOpenOrders) }
        item {
            SectionHeader(
                eyebrow = tr("Lưu trú", "Stay"),
                title = tr("Chỗ nghỉ địa phương", "Local stays"),
            )
        }
        item { OutlinedTextField(query, { query = it }, label = { Text(tr("Tìm chỗ nghỉ, khu vực", "Search stays, areas")) }, singleLine = true, modifier = Modifier.fillMaxWidth()) }
        item {
            Surface(
                onClick = onOpenTransport,
                shape = RoundedCornerShape(18.dp),
                color = MaterialTheme.colorScheme.primaryContainer,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text(tr("Cần xe đưa đón?", "Need a ride?"), style = MaterialTheme.typography.titleMedium)
                        Text(
                            tr("Đặt xe từ Châu Đốc, Long Xuyên, Tịnh Biên… tới homestay", "Book a ride from Châu Đốc, Long Xuyên, Tịnh Biên… to the homestay"),
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    Text("→", style = MaterialTheme.typography.titleLarge, color = LmBlue)
                }
            }
        }

        when {
            state.loading -> item {
                Box(Modifier.fillMaxWidth().height(220.dp), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = LmBlue)
                }
            }
            state.error != null -> item { ErrorBox(state.error.orEmpty(), viewModel::load) }
            state.rooms.isEmpty() -> item {
                Text(
                    tr("Chưa có phòng nào được đăng.", "No rooms have been published yet."),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            else -> items(state.rooms.filter { vn.baynuistay.feature.commerce.plain(it.name + " " + it.description).contains(vn.baynuistay.feature.commerce.plain(query)) }, key = { it.id }) { room ->
                RoomCard(room = room, onBook = { viewModel.selectRoom(room) })
            }
        }
    }

    state.selectedRoom?.let { room ->
        ModalBottomSheet(
            onDismissRequest = viewModel::dismissSheet,
            sheetState = sheetState,
            containerColor = MaterialTheme.colorScheme.background,
        ) {
            RoomBookingForm(room = room, state = state, viewModel = viewModel)
        }
    }

    state.success?.let { success ->
        AlertDialog(
            onDismissRequest = viewModel::dismissSuccess,
            icon = { Icon(Icons.Rounded.CheckCircle, null, tint = LmSuccess) },
            title = { Text(tr("Đã gửi đơn!", "Request sent!")) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(success.message)
                    Text(success.summary, style = MaterialTheme.typography.titleMedium)
                    Text(
                        tr("Tổng cộng: ${formatPrice(success.totalPrice)}", "Total: ${formatPrice(success.totalPrice)}"),
                        style = MaterialTheme.typography.titleMedium,
                        color = LmBlue,
                    )
                    Text(
                        tr(
                            "Mã đơn: ${success.code.ifBlank { success.id.takeLast(8).uppercase() }}",
                            "Booking ID: ${success.code.ifBlank { success.id.takeLast(8).uppercase() }}",
                        ),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            },
            confirmButton = { TextButton(onClick = { viewModel.dismissSuccess(); onOpenOrders() }) { Text(tr("Xem đơn của tôi", "My orders")) } },
            dismissButton = { TextButton(onClick = viewModel::dismissSuccess) { Text(tr("Đóng", "Close")) } },
        )
    }
}

@Composable
internal fun ErrorBox(message: String, onRetry: () -> Unit) {
    Surface(
        shape = RoundedCornerShape(18.dp),
        color = MaterialTheme.colorScheme.errorContainer,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text(message, style = MaterialTheme.typography.bodyMedium)
            TextButton(onClick = onRetry) {
                Icon(Icons.Rounded.Refresh, null, Modifier.size(17.dp))
                Spacer(Modifier.width(6.dp))
                Text(tr("Thử lại", "Try again"))
            }
        }
    }
}

@Composable
private fun RoomCard(room: RoomDto, onBook: () -> Unit) {
    Card(
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
    ) {
        Column {
            AsyncImage(
                model = room.imageUrl,
                contentDescription = room.name,
                modifier = Modifier.fillMaxWidth().height(180.dp),
                contentScale = ContentScale.Crop,
            )
            Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(verticalAlignment = Alignment.Top) {
                    Text(room.name, style = MaterialTheme.typography.titleLarge, modifier = Modifier.weight(1f))
                    Surface(
                        shape = RoundedCornerShape(50),
                        color = if (room.isAvailable) LmSuccess.copy(alpha = .14f)
                        else MaterialTheme.colorScheme.errorContainer,
                    ) {
                        Text(
                            if (room.isAvailable) tr("Còn phòng", "Available") else tr("Hết phòng", "Sold out"),
                            Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                            style = MaterialTheme.typography.labelMedium,
                            color = if (room.isAvailable) LmSuccess else MaterialTheme.colorScheme.error,
                        )
                    }
                }
                if (room.description.isNotBlank()) {
                    Text(
                        room.description,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Rounded.Group, null, Modifier.size(16.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
                    Spacer(Modifier.width(5.dp))
                    Text(
                        tr("${room.capacity} khách", "${room.capacity} guests"),
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                if (room.amenities.isNotEmpty()) {
                    Row(horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                        room.amenities.take(3).forEach { amenity ->
                            AssistChip(onClick = {}, label = { Text(amenity, maxLines = 1) })
                        }
                    }
                }
                Row(
                    Modifier.fillMaxWidth().padding(top = 6.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column {
                        Text(
                            tr("Giá từ", "From"),
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Text(
                            formatPrice(room.price),
                            style = MaterialTheme.typography.headlineSmall,
                            color = LmBlue,
                        )
                    }
                    Button(
                        onClick = onBook,
                        enabled = room.isAvailable,
                        shape = RoundedCornerShape(14.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = LmBlue),
                    ) { Text(tr("Đặt phòng", "Book")) }
                }
            }
        }
    }
}
