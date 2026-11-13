@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package vn.baynuistay.feature.booking.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.CalendarMonth
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DatePicker
import androidx.compose.material3.DatePickerDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
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
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.unit.dp
import java.time.Instant
import java.time.ZoneOffset
import vn.baynuistay.core.network.RoomDto
import vn.baynuistay.core.ui.components.formatDate
import vn.baynuistay.core.ui.components.formatPrice
import vn.baynuistay.core.ui.theme.LmSuccess
import vn.baynuistay.core.ui.theme.LmBlue
import vn.baynuistay.core.ui.lang.tr

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RoomBookingForm(
    room: RoomDto,
    state: RoomsUiState,
    viewModel: RoomsViewModel,
) {
    var showDatePicker by remember { mutableStateOf(false) }
    var showCheckOutPicker by remember { mutableStateOf(false) }

    // PHẢI cuộn được. Form này nằm trong ModalBottomSheet, mà sheet không tự
    // cho cuộn: nội dung dài hơn chiều cao tấm sheet là phần dưới bị CẮT MẤT
    // hẳn, không kéo tới được. Trên máy ảo màn hình cao thì vừa đủ nên không
    // lộ; trên điện thoại thật, nút tr("Đặt phòng ngay", "Book now") biến mất — khách điền
    // xong hết rồi không đặt được, mà chẳng có lỗi nào báo ra.
    //
    // navigationBarsPadding: chừa chỗ cho thanh điều hướng của máy, không thì
    // nút bị ba phím Android che mất.
    Column(
        Modifier
            .verticalScroll(rememberScrollState())
            .navigationBarsPadding()
            .padding(horizontal = 22.dp)
            .padding(bottom = 28.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Text(tr("Đặt phòng", "Book a room"), style = MaterialTheme.typography.headlineSmall)
        Text(
            room.name,
            style = MaterialTheme.typography.titleMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        // ── Ngày nhận phòng ──
        Surface(
            onClick = { showDatePicker = true },
            shape = RoundedCornerShape(14.dp),
            color = MaterialTheme.colorScheme.surface,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Rounded.CalendarMonth, null, Modifier.size(20.dp), tint = LmBlue)
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text(
                        tr("Ngày nhận phòng", "Check-in"),
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Text(formatDate(state.checkIn), style = MaterialTheme.typography.titleMedium)
                }
                Text(tr("Đổi", "Change"), color = LmBlue, style = MaterialTheme.typography.labelLarge)
            }
        }

        // ── Ngày trả phòng ──
        Surface(
            onClick = { showCheckOutPicker = true },
            shape = RoundedCornerShape(14.dp),
            color = MaterialTheme.colorScheme.surface,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Rounded.CalendarMonth, null, Modifier.size(20.dp), tint = LmBlue)
                Spacer(Modifier.width(12.dp))
                Column(Modifier.weight(1f)) {
                    Text(
                        tr("Ngày trả phòng", "Check-out"),
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Text(formatDate(state.checkOut), style = MaterialTheme.typography.titleMedium)
                }
                Text(tr("Đổi", "Change"), color = LmBlue, style = MaterialTheme.typography.labelLarge)
            }
        }
        Surface(shape = RoundedCornerShape(12.dp), color = LmSuccess.copy(alpha = .12f)) {
            Text(
                tr("${state.nights} đêm", "${state.nights} nights")
                    + (if (state.hasDiscount) tr(" · đã giảm 10% cho 7 đêm trở lên", " · 10% off for 7 nights or more") else "")
                    + tr(" · nhận phòng 14:00, trả phòng 12:00", " · check in 14:00, check out 12:00"),
                Modifier.padding(12.dp),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }

        // ── Thông tin khách ──
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
            value = state.email,
            onValueChange = viewModel::setEmail,
            label = { Text(tr("Email (không bắt buộc)", "Email (optional)")) },
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
            modifier = Modifier.fillMaxWidth(),
        )
        OutlinedTextField(
            value = state.note,
            onValueChange = viewModel::setNote,
            label = { Text(tr("Ghi chú cho homestay", "Note for the homestay")) },
            minLines = 2,
            modifier = Modifier.fillMaxWidth(),
        )

        // ── Tạm tính ──
        // KHÔNG dùng primaryContainer ở đây. Một khối màu đặc, to bằng cả bề
        // ngang màn hình trông y hệt nút bấm — người dùng thật đã bấm vào nó
        // rồi tưởng app hỏng, trong khi nút đặt phòng nằm ngay bên dưới.
        Surface(
            shape = RoundedCornerShape(16.dp),
            color = MaterialTheme.colorScheme.surfaceContainerHigh,
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
        ) {
            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text(tr("${formatPrice(room.price)} × ${state.nights} đêm", "${formatPrice(room.price)} × ${state.nights} nights"))
                    Text(formatPrice(room.price * state.nights))
                }
                if (state.hasDiscount) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text(tr("Ưu đãi 7 đêm", "7-night discount"), color = LmBlue)
                        Text("-10%", color = LmBlue)
                    }
                }
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text(tr("Tạm tính", "Subtotal"), fontWeight = FontWeight.Bold)
                    Text(
                        formatPrice(state.estimatedTotal),
                        style = MaterialTheme.typography.titleLarge,
                        color = LmBlue,
                    )
                }
            }
        }

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
                Text(tr("Đang gửi đơn…", "Sending…"))
            } else {
                Text(
                    tr("Đặt phòng ngay", "Book now"),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                )
            }
        }
        Text(
            tr("Giá cuối cùng do homestay xác nhận. Bạn chưa bị trừ tiền ở bước này.", "The homestay confirms the final price. Nothing is charged at this step."),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }

    if (showCheckOutPicker) {
        val pickerState = rememberDatePickerState(
            initialSelectedDateMillis = System.currentTimeMillis() + 2 * 86_400_000L,
        )
        DatePickerDialog(
            onDismissRequest = { showCheckOutPicker = false },
            confirmButton = {
                TextButton(onClick = {
                    pickerState.selectedDateMillis?.let { millis ->
                        viewModel.setCheckOut(
                            Instant.ofEpochMilli(millis).atZone(ZoneOffset.UTC).toLocalDate().toString(),
                        )
                    }
                    showCheckOutPicker = false
                }) { Text(tr("Chọn", "Select")) }
            },
            dismissButton = { TextButton(onClick = { showCheckOutPicker = false }) { Text(tr("Huỷ", "Cancel")) } },
        ) { DatePicker(state = pickerState) }
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
                        val date = Instant.ofEpochMilli(millis).atZone(ZoneOffset.UTC).toLocalDate()
                        viewModel.setCheckIn(date.toString())
                    }
                    showDatePicker = false
                }) { Text(tr("Chọn", "Select")) }
            },
            dismissButton = { TextButton(onClick = { showDatePicker = false }) { Text(tr("Huỷ", "Cancel")) } },
        ) { DatePicker(state = pickerState) }
    }
}
