@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package vn.baynuistay.feature.ai.ui

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.compose.material.icons.rounded.AutoAwesome
import androidx.compose.material.icons.rounded.CalendarMonth
import androidx.compose.material.icons.rounded.MyLocation
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberDatePickerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import java.time.Instant
import java.time.ZoneOffset
import vn.baynuistay.core.network.DayWeatherDto
import vn.baynuistay.core.ui.components.formatDate
import vn.baynuistay.core.ui.components.formatPrice
import vn.baynuistay.core.ui.theme.LmNavy
import vn.baynuistay.core.ui.theme.LmAmber
import vn.baynuistay.core.ui.theme.LmSuccess
import vn.baynuistay.core.ui.theme.LmBlue
import vn.baynuistay.core.ui.lang.tr
import vn.baynuistay.core.ui.lang.trData

private val DAY_OPTIONS = listOf(1, 2, 3, 4)

@Composable
fun AiTripScreen(
    onOpenTrip: (String) -> Unit,
    viewModel: AiTripViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var showDatePicker by remember { mutableStateOf(false) }

    val locationPermission = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions(),
    ) { granted -> if (granted.values.any { it }) viewModel.useMyLocation() }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(20.dp, 20.dp, 20.dp, 110.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item {
            Surface(shape = CircleShape, color = MaterialTheme.colorScheme.primaryContainer) {
                Icon(Icons.Rounded.AutoAwesome, null, Modifier.padding(12.dp), tint = LmBlue)
            }
            Spacer(Modifier.height(12.dp))
            Text("Bay Nui", style = MaterialTheme.typography.displaySmall)
            Text(
                tr("Ba câu hỏi thôi — lịch trình dựng từ điểm đến, quán ăn và chỗ nghỉ thật, đặt được ngay.", "Just three questions — your itinerary is built from real places, restaurants and rooms you can book."),
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }

        // Lịch trình đã dựng xong
        state.tripId?.let { tripId ->
            item { TripReadyCard(state, onOpen = { onOpenTrip(tripId) }, onRedo = viewModel::reset) }
            return@LazyColumn
        }

        if (state.generating) {
            item { GeneratingCard() }
            return@LazyColumn
        }

        item {
            Surface(
                shape = RoundedCornerShape(22.dp),
                color = MaterialTheme.colorScheme.surface,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    StepBar(state.step)

                    when (state.step) {
                        1 -> StepPreferences(state, viewModel)
                        2 -> StepWhen(state, viewModel) { showDatePicker = true }
                        else -> StepBudget(state, viewModel) {
                            locationPermission.launch(
                                arrayOf(
                                    android.Manifest.permission.ACCESS_FINE_LOCATION,
                                    android.Manifest.permission.ACCESS_COARSE_LOCATION,
                                ),
                            )
                        }
                    }

                    state.error?.let { error ->
                        Surface(shape = RoundedCornerShape(12.dp), color = MaterialTheme.colorScheme.errorContainer) {
                            Text(error, Modifier.padding(12.dp), style = MaterialTheme.typography.bodySmall)
                        }
                    }

                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        if (state.step > 1) {
                            OutlinedButton(onClick = viewModel::back, shape = RoundedCornerShape(14.dp)) {
                                Text(tr("Quay lại", "Back"))
                            }
                        }
                        Button(
                            onClick = { if (state.step < 3) viewModel.next() else viewModel.generate() },
                            shape = RoundedCornerShape(14.dp),
                            modifier = Modifier.weight(1f).height(50.dp),
                        ) {
                            if (state.step < 3) {
                                Text(tr("Tiếp tục", "Continue"))
                            } else {
                                Icon(Icons.Rounded.AutoAwesome, null, Modifier.size(18.dp))
                                Spacer(Modifier.width(8.dp))
                                Text(tr("Tạo lịch trình cho tôi", "Create my itinerary"))
                            }
                        }
                    }
                }
            }
        }
    }

    if (showDatePicker) {
        val pickerState = rememberDatePickerState()
        DatePickerDialog(
            onDismissRequest = { showDatePicker = false },
            confirmButton = {
                TextButton(onClick = {
                    pickerState.selectedDateMillis?.let { millis ->
                        viewModel.setStartDate(
                            Instant.ofEpochMilli(millis).atZone(ZoneOffset.UTC).toLocalDate().toString(),
                        )
                    }
                    showDatePicker = false
                }) { Text(tr("Chọn", "Select")) }
            },
            dismissButton = { TextButton(onClick = { showDatePicker = false }) { Text(tr("Huỷ", "Cancel")) } },
        ) { DatePicker(state = pickerState) }
    }
}

// ── Thanh tiến độ 3 bước ──
@Composable
private fun StepBar(step: Int) {
    Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
        repeat(3) { i ->
            Box(
                Modifier
                    .weight(1f)
                    .height(4.dp),
            ) {
                LinearProgressIndicator(
                    progress = { if (i < step) 1f else 0f },
                    modifier = Modifier.fillMaxWidth().height(4.dp),
                    color = LmBlue,
                    trackColor = MaterialTheme.colorScheme.surfaceVariant,
                )
            }
        }
    }
}

@Composable
private fun StepPreferences(state: AiTripUiState, viewModel: AiTripViewModel) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text(tr("Bạn muốn chuyến đi thế nào?", "What kind of trip do you want?"), style = MaterialTheme.typography.titleLarge)
        Text(
            tr("Chọn một hoặc nhiều, hoặc bỏ qua để mình gợi ý những nơi hay nhất.", "Pick one or several, or skip and we will suggest the best spots."),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            items(state.prefOptions, key = { it.value }) { option ->
                FilterChip(
                    selected = option.value in state.preferences,
                    onClick = { viewModel.togglePreference(option.value) },
                    label = { Text(trData(option.label, option.labelEn)) },
                    shape = RoundedCornerShape(12.dp),
                )
            }
        }
    }
}

@Composable
private fun StepWhen(state: AiTripUiState, viewModel: AiTripViewModel, onPickDate: () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text(tr("Đi mấy ngày, mấy người?", "How many days, how many people?"), style = MaterialTheme.typography.titleLarge)

        Text(tr("Số ngày", "Days"), style = MaterialTheme.typography.labelLarge)
        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            items(DAY_OPTIONS) { d ->
                FilterChip(
                    selected = state.days == d,
                    onClick = { viewModel.setDays(d) },
                    label = { Text(tr("$d ngày", "$d days")) },
                    shape = RoundedCornerShape(12.dp),
                )
            }
        }

        Text(tr("Số khách", "Guests"), style = MaterialTheme.typography.labelLarge)
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            OutlinedButton(onClick = { viewModel.addPeople(-1) }, shape = CircleShape) { Text("−") }
            Text("${state.people}", style = MaterialTheme.typography.headlineSmall)
            OutlinedButton(onClick = { viewModel.addPeople(1) }, shape = CircleShape) { Text("+") }
        }

        OutlinedTextField(
            value = formatDate(state.startDate),
            onValueChange = {},
            readOnly = true,
            label = { Text(tr("Ngày khởi hành", "Departure date")) },
            trailingIcon = {
                IconButton(onClick = onPickDate) { Icon(Icons.Rounded.CalendarMonth, tr("Chọn ngày", "Pick a date")) }
            },
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

@Composable
private fun StepBudget(state: AiTripUiState, viewModel: AiTripViewModel, onRequestLocation: () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text(tr("Ngân sách mỗi khách?", "Budget per guest?"), style = MaterialTheme.typography.titleLarge)
        Text(
            tr("Mình chọn chỗ nghỉ và điểm đến vừa túi tiền của bạn.", "We will pick rooms and places that fit your budget."),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            items(state.budgetOptions, key = { it.value }) { option ->
                FilterChip(
                    selected = state.budget == option.value,
                    onClick = { viewModel.setBudget(option.value) },
                    label = { Text(trData(option.label, option.labelEn)) },
                    shape = RoundedCornerShape(12.dp),
                )
            }
        }

        // Dự báo cho đúng mấy ngày khách chọn — xem TRƯỚC khi dựng lịch trình
        if (state.loadingOutlook) {
            Text(
                tr("Đang xem dự báo mấy ngày đó…", "Checking the forecast for those days…"),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        } else if (state.outlook.isNotEmpty()) {
            Text(tr("Thời tiết mấy ngày bạn đi", "Weather for your travel days"), style = MaterialTheme.typography.labelLarge)
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(state.outlook, key = { it.date }) { day -> OutlookChip(day) }
            }
            if (state.outlookSummary.isNotBlank()) {
                Text(
                    state.outlookSummary,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }

        OutlinedTextField(
            value = state.startPoint,
            onValueChange = viewModel::setStartPoint,
            label = { Text(tr("Xuất phát từ", "Starting from")) },
            singleLine = true,
            trailingIcon = {
                IconButton(onClick = onRequestLocation, enabled = !state.locating) {
                    if (state.locating) {
                        CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp, color = LmBlue)
                    } else {
                        Icon(Icons.Rounded.MyLocation, tr("Dùng vị trí của tôi", "Use my location"), tint = LmBlue)
                    }
                }
            },
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

/** Một ngày trong dải dự báo: ngày · % mưa · nhiệt độ. */
@Composable
private fun OutlookChip(day: DayWeatherDto) {
    val tone = when {
        day.rainProbability >= 70 -> LmBlue
        day.rainProbability >= 40 -> LmAmber
        else -> LmSuccess
    }
    Surface(
        shape = RoundedCornerShape(14.dp),
        color = tone.copy(alpha = .14f),
        modifier = Modifier.width(104.dp),
    ) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text(
                // "2026-08-13" → "13/08", không phải "08/13"
                "${day.date.takeLast(2)}/${day.date.substring(5, 7)}",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Text("${day.rainProbability}%", style = MaterialTheme.typography.titleMedium, color = tone)
            Text(
                "${day.tempMin.toInt()}–${day.tempMax.toInt()}°C",
                style = MaterialTheme.typography.bodySmall,
            )
            Text(
                trData(day.textVi, day.textEn),
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun GeneratingCard() {
    val steps = listOf(
        tr("Đọc sở thích và ngân sách của bạn", "Reading your interests and budget"),
        tr("Gom địa điểm theo cụm để đỡ chạy lòng vòng", "Grouping places by area so you drive less"),
        tr("Xem dự báo thời tiết từng khung giờ", "Checking the hourly forecast"),
        tr("Chọn quán ăn và chỗ nghỉ đối tác gần nhất", "Picking the nearest partner restaurants and rooms"),
        tr("Cộng chi phí và hoàn thiện lịch trình", "Adding up costs and finishing the plan"),
    )
    Surface(shape = RoundedCornerShape(22.dp), color = LmNavy, modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(22.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp, color = LmAmber)
                Spacer(Modifier.width(12.dp))
                Text(tr("Đang dựng lịch trình…", "Building your itinerary…"), color = Color.White, style = MaterialTheme.typography.titleMedium)
            }
            steps.forEach { s ->
                Text("· $s", color = Color.White.copy(alpha = .72f), style = MaterialTheme.typography.bodyMedium)
            }
        }
    }
}

@Composable
private fun TripReadyCard(state: AiTripUiState, onOpen: () -> Unit, onRedo: () -> Unit) {
    Surface(shape = RoundedCornerShape(22.dp), color = LmNavy, modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(22.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(state.tripTitle, style = MaterialTheme.typography.headlineSmall, color = Color.White)
            if (state.tripSummary.isNotBlank()) {
                Text(
                    state.tripSummary,
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color.White.copy(alpha = .78f),
                )
            }
            Text(
                tr("Tạm tính ${formatPrice(state.estimatedTotal)} cho ${state.people} khách", "About ${formatPrice(state.estimatedTotal)} for ${state.people} guests"),
                style = MaterialTheme.typography.titleMedium,
                color = LmAmber,
            )
            Button(
                onClick = onOpen,
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier.fillMaxWidth().height(50.dp),
            ) { Text(tr("Xem lịch trình chi tiết", "View the full itinerary")) }
            TextButton(onClick = onRedo) { Text(tr("Tạo lịch trình khác", "Create another itinerary"), color = Color.White.copy(alpha = .8f)) }
        }
    }
}
