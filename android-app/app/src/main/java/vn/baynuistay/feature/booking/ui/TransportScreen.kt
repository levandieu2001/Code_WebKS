@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package vn.baynuistay.feature.booking.ui

import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.Arrangement
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
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.CalendarMonth
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.DirectionsCar
import androidx.compose.material.icons.rounded.Group
import androidx.compose.material.icons.rounded.MyLocation
import androidx.compose.material.icons.rounded.Schedule
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material.icons.rounded.SearchOff
import androidx.compose.material.icons.rounded.Star
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TimePicker
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.material3.rememberTimePickerState
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import java.time.Instant
import java.time.ZoneOffset
import vn.baynuistay.core.network.TransportQuoteDto
import vn.baynuistay.core.ui.components.SectionHeader
import vn.baynuistay.core.ui.components.formatDate
import vn.baynuistay.core.ui.components.formatPrice
import vn.baynuistay.core.ui.theme.LmAmber
import vn.baynuistay.core.ui.theme.LmSuccess
import vn.baynuistay.core.ui.theme.LmBlue
import vn.baynuistay.core.ui.lang.tr
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow

private val SEAT_OPTIONS = listOf(1, 2, 4, 7, 16)

@OptIn(ExperimentalMaterial3Api::class, ExperimentalLayoutApi::class)
@Composable
fun TransportScreen(
    onOpenOrders: () -> Unit = {},
    viewModel: TransportViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
    var showDatePicker by remember { mutableStateOf(false) }
    var showTimePicker by remember { mutableStateOf(false) }
    var showReturnDatePicker by remember { mutableStateOf(false) }
    var showReturnTimePicker by remember { mutableStateOf(false) }

    // Xin quyền vị trí ngay tại chỗ, cấp xong thì lấy toạ độ luôn
    val locationPermission = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions(),
    ) { granted ->
        if (granted.values.any { it }) viewModel.useMyLocation()
    }
    val onRequestLocation: () -> Unit = {
        locationPermission.launch(
            arrayOf(
                android.Manifest.permission.ACCESS_FINE_LOCATION,
                android.Manifest.permission.ACCESS_COARSE_LOCATION,
            ),
        )
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(20.dp, 20.dp, 20.dp, 110.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item { SectionHeader(eyebrow = tr("Dịch vụ", "Services"), title = tr("Đặt xe đưa đón", "Book a ride")) }

        item {
            Card(
                shape = RoundedCornerShape(22.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            ) {
                Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    // Điểm đón: gõ địa chỉ bất kỳ hoặc lấy vị trí hiện tại
                    OutlinedTextField(
                        value = state.pickup,
                        onValueChange = viewModel::setPickup,
                        label = { Text(tr("Điểm đón", "Pick-up")) },
                        placeholder = { Text(tr("Nhập địa chỉ, ví dụ: 12 Nguyễn Huệ, Châu Đốc", "Type an address, e.g. 12 Nguyễn Huệ, Châu Đốc")) },
                        singleLine = true,
                        trailingIcon = {
                            IconButton(
                                onClick = { onRequestLocation() },
                                enabled = !state.locating,
                            ) {
                                if (state.locating) {
                                    CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp, color = LmBlue)
                                } else {
                                    Icon(Icons.Rounded.MyLocation, tr("Dùng vị trí của tôi", "Use my location"), tint = LmBlue)
                                }
                            }
                        },
                        modifier = Modifier.fillMaxWidth(),
                    )
                    state.pickupNote?.let { note ->
                        Surface(shape = RoundedCornerShape(12.dp), color = LmSuccess.copy(alpha = .12f)) {
                            Text(
                                note,
                                Modifier.padding(12.dp),
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        items(PICKUP_SUGGESTIONS) { place ->
                            FilterChip(
                                selected = state.pickup == place,
                                onClick = { viewModel.setPickup(place); viewModel.search() },
                                label = { Text(place) },
                            )
                        }
                    }
                    OutlinedTextField(
                        value = state.dropoff,
                        onValueChange = {},
                        label = { Text(tr("Điểm đến", "Drop-off")) },
                        readOnly = true,
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )

                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        PickerBox(
                            icon = Icons.Rounded.CalendarMonth,
                            label = tr("Ngày đi", "Date"),
                            value = formatDate(state.date),
                            modifier = Modifier.weight(1f),
                        ) { showDatePicker = true }
                        PickerBox(
                            icon = Icons.Rounded.Schedule,
                            label = tr("Giờ đón", "Pick-up time"),
                            value = state.time,
                            modifier = Modifier.weight(1f),
                        ) { showTimePicker = true }
                    }

                    // Khứ hồi — có ngày về
                    Surface(
                        onClick = { viewModel.setRoundTrip(!state.roundTrip) },
                        shape = RoundedCornerShape(14.dp),
                        color = if (state.roundTrip) MaterialTheme.colorScheme.primaryContainer
                        else MaterialTheme.colorScheme.background,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                            Checkbox(
                                checked = state.roundTrip,
                                onCheckedChange = viewModel::setRoundTrip,
                            )
                            Spacer(Modifier.width(6.dp))
                            Column {
                                Text(tr("Đón cả chiều về (khứ hồi)", "Include the return trip"), style = MaterialTheme.typography.titleSmall)
                                Text(
                                    tr("Tiết kiệm 5% so với đặt 2 lượt riêng", "Save 5% versus booking two one-way trips"),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }
                    }
                    if (state.roundTrip) {
                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            PickerBox(
                                icon = Icons.Rounded.CalendarMonth,
                                label = tr("Ngày về", "Return date"),
                                value = formatDate(state.returnDate),
                                modifier = Modifier.weight(1f),
                            ) { showReturnDatePicker = true }
                            PickerBox(
                                icon = Icons.Rounded.Schedule,
                                label = tr("Giờ về", "Return time"),
                                value = state.returnTime,
                                modifier = Modifier.weight(1f),
                            ) { showReturnTimePicker = true }
                        }
                    }

                    Text(tr("Số khách", "Guests"), style = MaterialTheme.typography.labelLarge)
                    // Xem chú thích ở PartnerScreen: Row không xuống dòng nên trên
                    // máy màn hẹp chip cuối bị bóp vỡ chữ.
                    FlowRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        SEAT_OPTIONS.forEach { seats ->
                            FilterChip(
                                selected = state.seats == seats,
                                onClick = { viewModel.setSeats(seats) },
                                label = { Text("$seats") },
                            )
                        }
                    }

                    Button(
                        onClick = viewModel::search,
                        enabled = !state.searching && state.pickup.isNotBlank(),
                        modifier = Modifier.fillMaxWidth().height(52.dp),
                        shape = RoundedCornerShape(15.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = LmBlue),
                    ) {
                        if (state.searching) {
                            CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp, color = MaterialTheme.colorScheme.onPrimary)
                            Spacer(Modifier.width(10.dp))
                            Text(tr("Đang tìm xe…", "Finding a ride…"))
                        } else {
                            Icon(Icons.Rounded.DirectionsCar, null, Modifier.size(19.dp))
                            Spacer(Modifier.width(8.dp))
                            Text(tr("Tìm xe", "Find a ride"))
                        }
                    }
                }
            }
        }

        state.searchError?.let { error ->
            item { ErrorBox(error, viewModel::search) }
        }

        if (state.quotes.isNotEmpty()) {
            item {
                Text(
                    tr("${state.quotes.size} lựa chọn · quãng đường khoảng ${state.distanceKm} km", "${state.quotes.size} options · about ${state.distanceKm} km"),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            items(state.quotes) { quote ->
                QuoteCard(quote) { viewModel.selectQuote(quote) }
            }
        }
    }

    state.selectedQuote?.let { quote ->
        ModalBottomSheet(
            onDismissRequest = viewModel::dismissSheet,
            sheetState = sheetState,
            containerColor = MaterialTheme.colorScheme.background,
        ) {
            TransportBookingForm(quote = quote, state = state, viewModel = viewModel)
        }
    }

    state.success?.let { success ->
        val d = state.dispatch
        val accepted = d?.state == "accepted"
        val failed = d?.state == "timeout" || (d?.state == "no_driver" && d.canRetry)

        AlertDialog(
            onDismissRequest = viewModel::dismissSuccess,
            icon = {
                Icon(
                    when {
                        accepted -> Icons.Rounded.CheckCircle
                        failed -> Icons.Rounded.SearchOff
                        else -> Icons.Rounded.Search
                    },
                    null,
                    tint = if (failed) LmBlue else LmSuccess,
                )
            },
            title = {
                Text(
                    when {
                        accepted -> "${d.driverName.ifBlank { tr("Tài xế", "Driver") }} đã nhận chuyến!"
                        failed -> tr("Chưa tìm được tài xế", "No driver found yet")
                        d != null -> tr("Đang tìm tài xế gần bạn…", "Looking for a driver near you…")
                        else -> tr("Đã gửi yêu cầu!", "Request sent!")
                    },
                )
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    when {
                        accepted -> {
                            Text(tr("${d.plate} · cách bạn ${d.distanceKm} km", "${d.plate} · ${d.distanceKm} km away"))
                            Text(
                                d.driverPhone,
                                style = MaterialTheme.typography.headlineSmall,
                                color = LmBlue,
                            )
                            Text(
                                tr("Gọi cho tài xế để hẹn chính xác điểm đón.", "Call the driver to agree on the exact pick-up spot."),
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        failed -> {
                            Text(d.message.ifBlank { tr("Sau ${d.giveupMinutes} phút vẫn chưa có tài xế nào nhận chuyến.", "No driver accepted the trip within ${d.giveupMinutes} minutes.") })
                            Text(
                                tr("Bạn có thể tìm lại, hoặc để tổng đài LOCALMATE gọi xác nhận giúp.", "You can search again, or let the Bảy Núi desk call you back."),
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                        d != null -> Text(
                            if (d.tried > 0)
                                tr("Đã hỏi ${d.tried} tài xế. Còn tìm thêm ${(d.secondsLeft + 59) / 60} phút nữa.", "Asked ${d.tried} drivers. Still searching for ${(d.secondsLeft + 59) / 60} more minutes.")
                            else tr("Chúng tôi đang gọi lần lượt các tài xế quanh điểm đón.", "We are calling drivers around your pick-up point one by one."),
                        )
                        else -> Text(success.message)
                    }

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
            confirmButton = {
                if (failed) {
                    TextButton(onClick = viewModel::retryDriver, enabled = !state.retrying) {
                        Text(if (state.retrying) tr("Đang tìm lại…", "Searching again…") else tr("Tìm lại tài xế", "Search again"))
                    }
                } else {
                    TextButton(onClick = {
                        viewModel.dismissSuccess()
                        onOpenOrders()
                    }) { Text(tr("Xem đơn của tôi", "View my bookings")) }
                }
            },
            dismissButton = {
                TextButton(onClick = viewModel::dismissSuccess) {
                    Text(if (failed) tr("Để tổng đài gọi lại", "Have the desk call me") else tr("Đóng", "Close"))
                }
            },
        )
    }

    if (showDatePicker) {
        val pickerState = rememberDatePickerState(
            initialSelectedDateMillis = System.currentTimeMillis() + 86_400_000L,
        )
        DatePickerDialog(
            onDismissRequest = { showDatePicker = false },
            confirmButton = {
                TextButton(onClick = {
                    pickerState.selectedDateMillis?.let { millis ->
                        viewModel.setDate(
                            Instant.ofEpochMilli(millis).atZone(ZoneOffset.UTC).toLocalDate().toString(),
                        )
                    }
                    showDatePicker = false
                }) { Text(tr("Chọn", "Select")) }
            },
            dismissButton = { TextButton(onClick = { showDatePicker = false }) { Text(tr("Huỷ", "Cancel")) } },
        ) { DatePicker(state = pickerState) }
    }

    if (showReturnDatePicker) {
        val pickerState = rememberDatePickerState(initialSelectedDateMillis = System.currentTimeMillis() + 86_400_000L)
        DatePickerDialog(
            onDismissRequest = { showReturnDatePicker = false },
            confirmButton = {
                TextButton(onClick = {
                    pickerState.selectedDateMillis?.let { millis ->
                        viewModel.setReturnDate(Instant.ofEpochMilli(millis).atZone(ZoneOffset.UTC).toLocalDate().toString())
                    }
                    showReturnDatePicker = false
                }) { Text(tr("Chọn", "Select")) }
            },
            dismissButton = { TextButton(onClick = { showReturnDatePicker = false }) { Text(tr("Huỷ", "Cancel")) } },
        ) { DatePicker(state = pickerState) }
    }

    if (showReturnTimePicker) {
        val timeState = rememberTimePickerState(initialHour = 16, initialMinute = 0, is24Hour = true)
        AlertDialog(
            onDismissRequest = { showReturnTimePicker = false },
            title = { Text(tr("Giờ về", "Return time")) },
            text = { TimePicker(state = timeState) },
            confirmButton = {
                TextButton(onClick = {
                    viewModel.setReturnTime("%02d:%02d".format(timeState.hour, timeState.minute))
                    showReturnTimePicker = false
                }) { Text(tr("Chọn", "Select")) }
            },
            dismissButton = { TextButton(onClick = { showReturnTimePicker = false }) { Text(tr("Huỷ", "Cancel")) } },
        )
    }

    if (showTimePicker) {
        val timeState = rememberTimePickerState(initialHour = 8, initialMinute = 0, is24Hour = true)
        AlertDialog(
            onDismissRequest = { showTimePicker = false },
            title = { Text(tr("Giờ đón", "Pick-up time")) },
            text = { TimePicker(state = timeState) },
            confirmButton = {
                TextButton(onClick = {
                    viewModel.setTime("%02d:%02d".format(timeState.hour, timeState.minute))
                    showTimePicker = false
                }) { Text(tr("Chọn", "Select")) }
            },
            dismissButton = { TextButton(onClick = { showTimePicker = false }) { Text(tr("Huỷ", "Cancel")) } },
        )
    }
}

@Composable
private fun PickerBox(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    value: String,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
) {
    Surface(
        onClick = onClick,
        modifier = modifier,
        shape = RoundedCornerShape(14.dp),
        color = MaterialTheme.colorScheme.background,
    ) {
        Row(Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, null, Modifier.size(18.dp), tint = LmBlue)
            Spacer(Modifier.width(9.dp))
            Column {
                Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text(value, style = MaterialTheme.typography.titleSmall)
            }
        }
    }
}

@Composable
private fun QuoteCard(quote: TransportQuoteDto, onSelect: () -> Unit) {
    Card(
        onClick = onSelect,
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
    ) {
        Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(7.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(quote.partnerName, style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
                Icon(Icons.Rounded.Star, null, Modifier.size(15.dp), tint = LmAmber)
                Spacer(Modifier.width(4.dp))
                Text("${quote.rating}", style = MaterialTheme.typography.labelLarge)
                Text(
                    " (${quote.reviews})",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Text(
                tr("${quote.vehicleLabel} · tối đa ${quote.seats} khách · khoảng ${quote.durationMin} phút", "${quote.vehicleLabel} · up to ${quote.seats} guests · about ${quote.durationMin} min"),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            if (quote.note.isNotBlank()) {
                Text(quote.note, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Text(formatPrice(quote.price), style = MaterialTheme.typography.headlineSmall, color = LmBlue)
                Button(
                    onClick = onSelect,
                    shape = RoundedCornerShape(13.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = LmBlue),
                ) { Text(tr("Chọn xe này", "Choose this ride")) }
            }
        }
    }
}

@Composable
private fun TransportBookingForm(
    quote: TransportQuoteDto,
    state: TransportUiState,
    viewModel: TransportViewModel,
) {
    // Cùng lỗi với form đặt phòng: ModalBottomSheet không tự cho cuộn, nội dung
    // dài hơn tấm sheet là nút đặt ở cuối bị cắt mất, khách không đặt được.
    Column(
        Modifier
            .verticalScroll(rememberScrollState())
            .navigationBarsPadding()
            .padding(horizontal = 22.dp)
            .padding(bottom = 28.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Text(tr("Xác nhận đặt xe", "Confirm your ride"), style = MaterialTheme.typography.headlineSmall)

        // Có khách khác đi cùng tuyến, cùng khung giờ → mời ghép chuyến cho rẻ
        state.pool?.let { pool ->
            Surface(shape = RoundedCornerShape(16.dp), color = LmSuccess.copy(alpha = .14f)) {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Rounded.Group, null, Modifier.size(18.dp), tint = LmSuccess)
                        Spacer(Modifier.width(8.dp))
                        Text(
                            tr("Có ${pool.matches.size} khách đi cùng tuyến quanh giờ này", "${pool.matches.size} other guests are travelling this route around the same time"),
                            style = MaterialTheme.typography.titleSmall,
                        )
                    }
                    Text(
                        tr("Ghép chung xe thì mỗi người chỉ còn ${formatPrice(pool.perPerson)} ", "Share the ride and each person pays only ${formatPrice(pool.perPerson)} ") +
                            tr("thay vì ${formatPrice(pool.soloPrice)} — tiết kiệm ${formatPrice(pool.saved)} ", "instead of ${formatPrice(pool.soloPrice)} — saving ${formatPrice(pool.saved)} ") +
                            tr("(${pool.discountPercent}%). Giờ đón có thể lệch tối đa ${pool.windowMinutes} phút.", "(${pool.discountPercent}%). Pick-up time may shift by up to ${pool.windowMinutes} minutes."),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Checkbox(
                            checked = state.poolAccepted,
                            onCheckedChange = viewModel::setPoolAccepted,
                        )
                        Text(tr("Tôi đồng ý ghép chuyến", "Yes, share the ride"), style = MaterialTheme.typography.bodyMedium)
                    }
                }
            }
        }

        Surface(shape = RoundedCornerShape(16.dp), color = MaterialTheme.colorScheme.primaryContainer) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
                Text("${quote.partnerName} · ${quote.vehicleLabel}", style = MaterialTheme.typography.titleMedium)
                Text("${state.pickup} → ${state.dropoff}", style = MaterialTheme.typography.bodyMedium)
                Text(
                    tr("${formatDate(state.date)} lúc ${state.time} · ${state.seats} khách", "${formatDate(state.date)} at ${state.time} · ${state.seats} guests"),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text(tr("Tạm tính", "Subtotal"), fontWeight = FontWeight.Bold)
                    val estimate = transportEstimate(quote.price, state.roundTrip, state.poolAccepted)
                    Text(formatPrice(estimate), style = MaterialTheme.typography.titleLarge, color = LmBlue)
                }
            }
        }

        OutlinedTextField(
            value = state.guestName,
            onValueChange = viewModel::setGuestName,
            label = { Text(tr("Họ và tên *", "Full name *")) },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )
        OutlinedTextField(
            value = state.phone,
            onValueChange = viewModel::setPhone,
            label = { Text(tr("Số điện thoại *", "Phone number *")) },
            placeholder = { Text("0909 xxx xxx") },
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
            modifier = Modifier.fillMaxWidth(),
        )
        OutlinedTextField(
            value = state.note,
            onValueChange = viewModel::setNote,
            label = { Text(tr("Ghi chú cho tài xế", "Note for the driver")) },
            minLines = 2,
            modifier = Modifier.fillMaxWidth(),
        )

        state.formError?.let { error ->
            Text(error, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium)
        }

        Button(
            onClick = viewModel::submit,
            enabled = !state.submitting,
            modifier = Modifier.fillMaxWidth().height(54.dp),
            shape = RoundedCornerShape(15.dp),
            colors = ButtonDefaults.buttonColors(containerColor = LmBlue),
        ) {
            if (state.submitting) {
                CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp, color = MaterialTheme.colorScheme.onPrimary)
                Spacer(Modifier.width(10.dp))
                Text(tr("Đang gửi…", "Sending…"))
            } else {
                Text(tr("Đặt xe", "Book the ride"))
            }
        }
        Text(
            tr("Nhà xe sẽ gọi lại xác nhận. Thanh toán trực tiếp với tài xế.", "The operator will call to confirm. Pay the driver directly."),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}
