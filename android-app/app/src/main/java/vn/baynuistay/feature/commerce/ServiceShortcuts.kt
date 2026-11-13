package vn.baynuistay.feature.commerce

import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import vn.baynuistay.core.ui.lang.tr

@Composable
fun ServiceShortcuts(onRooms: () -> Unit, onRide: () -> Unit, onTours: () -> Unit, onFood: () -> Unit, onOrders: () -> Unit) {
    Column(Modifier.fillMaxWidth().padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(tr("Đặt dịch vụ", "Book services"), style = MaterialTheme.typography.titleLarge)
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedButton(onClick = onRooms, modifier = Modifier.weight(1f)) { Text(tr("Chỗ nghỉ", "Stays")) }
            OutlinedButton(onClick = onRide, modifier = Modifier.weight(1f)) { Text(tr("Xe đưa đón", "Rides")) }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedButton(onClick = onTours, modifier = Modifier.weight(1f)) { Text("Tour") }
            Button(onClick = onFood, modifier = Modifier.weight(1f)) { Text(tr("Đặc sản", "Local food")) }
        }
        TextButton(onClick = onOrders, modifier = Modifier.fillMaxWidth()) { Text(tr("Xem đơn của tôi", "View my orders")) }
    }
}
