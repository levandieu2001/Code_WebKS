@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package vn.baynuistay.feature.partner.ui

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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.ArrowBack
import androidx.compose.material.icons.rounded.Verified
import androidx.compose.material.icons.rounded.DirectionsCar
import androidx.compose.material.icons.rounded.Hotel
import androidx.compose.material.icons.rounded.NearMe
import androidx.compose.material.icons.rounded.Power
import androidx.compose.material.icons.rounded.PowerOff
import androidx.compose.material.icons.rounded.Route
import androidx.compose.material.icons.rounded.Schedule
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import vn.baynuistay.core.network.DriverOfferDto
import vn.baynuistay.core.network.PartnerBookingDto
import vn.baynuistay.core.ui.components.SectionHeader
import vn.baynuistay.core.ui.components.formatDate
import vn.baynuistay.core.ui.components.formatPrice
import vn.baynuistay.core.ui.theme.LmNavy
import vn.baynuistay.core.ui.theme.LmAmber
import vn.baynuistay.core.ui.theme.LmSuccess
import vn.baynuistay.core.ui.theme.LmBlue
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun PartnerScreen(
    onBack: () -> Unit,
    viewModel: PartnerViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    // Hai nơi cần quyền vị trí nhưng làm hai việc khác nhau, nên phải tách
    // riêng: một để bật nhận đơn, một để lấy toạ độ cơ sở khi đăng phòng.
    val locationPermission = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions(),
    ) { granted -> if (granted.values.any { it }) viewModel.toggleOnline() }

    val listingLocationPermission = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions(),
    ) { granted -> if (granted.values.any { it }) viewModel.useListingLocation() }

    // Quyền vị trí cho chuyến đang chạy — để khách theo dõi xe trên bản đồ
    val tripLocationPermission = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions(),
    ) { granted -> if (granted.values.any { it }) viewModel.retryTripTracking() }

    Column(Modifier.fillMaxSize()) {
        Row(
            Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(onClick = onBack) { Icon(Icons.Rounded.ArrowBack, "Quay lại") }
            Text("Cổng đối tác", style = MaterialTheme.typography.titleLarge)
        }

        when {
            state.loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = LmBlue)
            }
            state.partner == null -> RegisterForm(state, viewModel)
            else -> Dashboard(
                state,
                viewModel,
                onGrantTripLocation = {
                    tripLocationPermission.launch(
                        arrayOf(
                            android.Manifest.permission.ACCESS_FINE_LOCATION,
                            android.Manifest.permission.ACCESS_COARSE_LOCATION,
                        ),
                    )
                },
            ) {
                // Chọn khu vực rồi thì không cần GPS; chỉ xin quyền khi dùng vị trí hiện tại.
                if (state.online || state.selectedArea != null) viewModel.toggleOnline()
                else locationPermission.launch(
                    arrayOf(
                        android.Manifest.permission.ACCESS_FINE_LOCATION,
                        android.Manifest.permission.ACCESS_COARSE_LOCATION,
                    ),
                )
            }
        }
    }

    // Biểu mẫu đăng / sửa dịch vụ
    if (state.listingForm != null) {
        ListingFormDialog(state, viewModel) {
            listingLocationPermission.launch(
                arrayOf(
                    android.Manifest.permission.ACCESS_FINE_LOCATION,
                    android.Manifest.permission.ACCESS_COARSE_LOCATION,
                ),
            )
        }
    }
}

// ════════════════════════════════════════════════
// ĐĂNG KÝ ĐỐI TÁC
// ════════════════════════════════════════════════
private data class TypeOption(val value: String, val label: String, val icon: ImageVector)

private val TYPE_OPTIONS = listOf(
    TypeOption("transport", "Nhà xe / Tài xế", Icons.Rounded.DirectionsCar),
    TypeOption("hotel", "Khách sạn / Nhà nghỉ", Icons.Rounded.Hotel),
    TypeOption("tour", "Đơn vị tour", Icons.Rounded.Route),
)

private val VEHICLES = listOf(
    "motorbike" to "Xe máy",
    "4-seat" to "Xe 4 chỗ",
    "7-seat" to "Xe 7 chỗ",
    "16-seat" to "Xe 16 chỗ",
)

@Composable
private fun RegisterForm(state: PartnerUiState, viewModel: PartnerViewModel) {
    val form = state.form

    LazyColumn(
        contentPadding = PaddingValues(20.dp, 8.dp, 20.dp, 120.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            SectionHeader(eyebrow = "Cùng Bảy Núi đón khách", title = "Đăng ký làm đối tác")
        }
        item {
            Text(
                "Nhà xe nhận đơn theo vị trí gần nhất. Khách sạn hiện lên khi khách xem điểm đến gần bạn.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }

        item {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text("Bạn hợp tác mảng nào?", style = MaterialTheme.typography.labelLarge)
                TYPE_OPTIONS.forEach { option ->
                    Surface(
                        onClick = { viewModel.updateForm { it.copy(type = option.value) } },
                        shape = RoundedCornerShape(16.dp),
                        color = if (form.type == option.value) MaterialTheme.colorScheme.primaryContainer
                        else MaterialTheme.colorScheme.surface,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        Row(Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                option.icon, null, Modifier.size(21.dp),
                                tint = if (form.type == option.value) LmBlue else MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                            Spacer(Modifier.width(12.dp))
                            Text(option.label, style = MaterialTheme.typography.titleSmall)
                        }
                    }
                }
            }
        }

        item {
            OutlinedTextField(
                value = form.name,
                onValueChange = { v -> viewModel.updateForm { it.copy(name = v) } },
                label = { Text("Tên đơn vị / tên bạn *") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
        }
        item {
            OutlinedTextField(
                value = form.phone,
                onValueChange = { v -> viewModel.updateForm { it.copy(phone = v) } },
                label = { Text("Số điện thoại *") },
                placeholder = { Text("0909 xxx xxx") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone),
                modifier = Modifier.fillMaxWidth(),
            )
        }
        item {
            OutlinedTextField(
                value = form.address,
                onValueChange = { v -> viewModel.updateForm { it.copy(address = v) } },
                label = { Text("Khu vực hoạt động") },
                placeholder = { Text("Tri Tôn, An Giang") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
        }

        if (form.type == "transport") {
            item {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Loại xe", style = MaterialTheme.typography.labelLarge)
                    // FlowRow chứ không phải Row: bốn loại xe không nằm vừa một hàng
                    // trên máy màn hẹp. Row không biết xuống dòng nên nó bóp chip
                    // cuối lại cho vừa, ép chữ "Xe 16 chỗ" vỡ thành mỗi dòng một
                    // chữ cái. FlowRow thì cho chip tràn xuống hàng dưới.
                    FlowRow(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        VEHICLES.forEach { (value, label) ->
                            FilterChip(
                                selected = form.vehicleType == value,
                                onClick = { viewModel.updateForm { it.copy(vehicleType = value) } },
                                label = { Text(label) },
                            )
                        }
                    }
                }
            }
            item {
                OutlinedTextField(
                    value = form.plate,
                    onValueChange = { v -> viewModel.updateForm { it.copy(plate = v) } },
                    label = { Text("Biển số xe") },
                    placeholder = { Text("67A-123.45") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        }

        item {
            OutlinedTextField(
                value = form.email,
                onValueChange = { v -> viewModel.updateForm { it.copy(email = v) } },
                label = { Text("Email đăng nhập *") },
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                modifier = Modifier.fillMaxWidth(),
            )
        }
        item {
            OutlinedTextField(
                value = form.password,
                onValueChange = { v -> viewModel.updateForm { it.copy(password = v) } },
                label = { Text("Mật khẩu *") },
                placeholder = { Text("Ít nhất 6 ký tự") },
                singleLine = true,
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                modifier = Modifier.fillMaxWidth(),
            )
        }
        item {
            OutlinedTextField(
                value = form.note,
                onValueChange = { v -> viewModel.updateForm { it.copy(note = v) } },
                label = { Text("Giới thiệu ngắn") },
                minLines = 2,
                modifier = Modifier.fillMaxWidth(),
            )
        }

        state.formError?.let { error ->
            item {
                Surface(shape = RoundedCornerShape(14.dp), color = MaterialTheme.colorScheme.errorContainer) {
                    Text(error, Modifier.padding(14.dp), style = MaterialTheme.typography.bodyMedium)
                }
            }
        }

        item {
            Button(
                onClick = viewModel::submitRegistration,
                enabled = !state.submitting,
                modifier = Modifier.fillMaxWidth().height(54.dp),
                shape = RoundedCornerShape(15.dp),
                colors = ButtonDefaults.buttonColors(containerColor = LmBlue),
            ) {
                if (state.submitting) {
                    CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp, color = MaterialTheme.colorScheme.onPrimary)
                    Spacer(Modifier.width(10.dp))
                    Text("Đang gửi hồ sơ…")
                } else Text("Gửi hồ sơ đối tác")
            }
        }
    }
}

// ════════════════════════════════════════════════
// BẢNG ĐIỀU KHIỂN ĐỐI TÁC
// ════════════════════════════════════════════════
@Composable
private fun Dashboard(
    state: PartnerUiState,
    viewModel: PartnerViewModel,
    onGrantTripLocation: () -> Unit,
    onToggleOnline: () -> Unit,
) {
    val partner = state.partner ?: return

    LazyColumn(
        contentPadding = PaddingValues(20.dp, 8.dp, 20.dp, 120.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(partner.name, style = MaterialTheme.typography.displaySmall)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Surface(
                        shape = RoundedCornerShape(50),
                        color = if (partner.isApproved) LmSuccess.copy(alpha = .15f) else LmBlue.copy(alpha = .15f),
                    ) {
                        Row(
                            Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Icon(
                                if (partner.isApproved) Icons.Rounded.Verified else Icons.Rounded.Schedule,
                                null, Modifier.size(15.dp),
                                tint = if (partner.isApproved) LmSuccess else LmBlue,
                            )
                            Spacer(Modifier.width(6.dp))
                            Text(
                                if (partner.isApproved) "Đã duyệt" else "Chờ LOCALMATE duyệt",
                                style = MaterialTheme.typography.labelMedium,
                                color = if (partner.isApproved) LmSuccess else LmBlue,
                            )
                        }
                    }
                    Spacer(Modifier.width(10.dp))
                    Text(
                        "Hoa hồng ${(partner.commission * 100).toInt()}%",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }

        if (!partner.isApproved) {
            item {
                Surface(shape = RoundedCornerShape(18.dp), color = MaterialTheme.colorScheme.primaryContainer) {
                    Text(
                        "Hồ sơ đang chờ duyệt. Sau khi Bảy Núi xác nhận, bạn sẽ bắt đầu nhận được đơn từ khách.",
                        Modifier.padding(18.dp),
                        style = MaterialTheme.typography.bodyMedium,
                    )
                }
            }
        }

        // Thông báo ngắn: đã bật nhận đơn, có chuyến mới, đã nhận chuyến…
        state.message?.let { message ->
            item {
                Surface(
                    onClick = { viewModel.dismissMessage() },
                    shape = RoundedCornerShape(14.dp),
                    color = LmSuccess.copy(alpha = .16f),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(
                        message,
                        Modifier.padding(14.dp),
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.Medium,
                    )
                }
            }
        }

        // Chuyến đang chạy — chỉ đường, gọi khách, báo đã đón/đã trả
        state.activeTrip?.let { trip ->
            item {
                ActiveTripCard(
                    trip = trip,
                    stage = state.tripStage,
                    sharing = state.tripSharing,
                    needsLocation = state.tripNeedsLocation,
                    onStage = viewModel::setTripStage,
                    onGrantLocation = onGrantTripLocation,
                    onDismiss = viewModel::dismissTrip,
                )
            }
        }

        // ── Tài xế: công tắc nhận đơn + lời mời ──
        if (partner.isDriver && partner.isApproved) {
            item { DriverSwitch(state, onToggleOnline) { slug -> viewModel.selectArea(slug) } }

            if (state.online) {
                if (state.offers.isEmpty()) {
                    item {
                        Text(
                            "Đang chờ chuyến… Giữ màn hình này mở để nhận lời mời.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                } else {
                    items(state.offers, key = { it.id }) { offer ->
                        OfferCard(
                            offer = offer,
                            onAccept = { viewModel.acceptOffer(offer.id) },
                            onDecline = { viewModel.declineOffer(offer.id) },
                        )
                    }
                }
            }
        }

        state.error?.let { error ->
            item {
                Surface(shape = RoundedCornerShape(14.dp), color = MaterialTheme.colorScheme.errorContainer) {
                    Text(error, Modifier.padding(14.dp), style = MaterialTheme.typography.bodyMedium)
                }
            }
        }

        // ── Khách sạn / đơn vị tour: tự đăng dịch vụ ──
        if (partner.isApproved && state.listingType.isNotBlank()) {
            item { ListingHeader(state) { viewModel.openListingForm() } }
            if (state.listings.isEmpty()) {
                item { ListingEmpty(state.listingType == "stay") }
            } else {
                items(state.listings, key = { it.id }) { row ->
                    ListingCard(
                        row = row,
                        onEdit = { viewModel.openListingForm(row.id) },
                        onToggle = { viewModel.toggleListing(row.id, row.status) },
                        onDelete = { viewModel.deleteListing(row.id) },
                    )
                }
            }
        }

        // ── Đơn vị tour: lịch khởi hành ──
        // Đặt TRƯỚC mục đơn hàng: sắp tới ngày chạy thì việc gấp là gọi cho
        // từng khách trong chuyến, chứ không phải xem lại đơn cũ.
        if (partner.isApproved && partner.type == "tour") {
            item { DepartureHeader(state.departures.size) { viewModel.moFormChuyen(true) } }

            if (state.openingDeparture) {
                item {
                    DepartureForm(
                        tours = state.departureTours,
                        minGuestsMacDinh = state.departureMeta.minGuests,
                        dangGui = state.departureBusy == "moi",
                        loi = state.departureError,
                        onHuy = { viewModel.moFormChuyen(false) },
                        onGui = { slug, ngay, toiThieu -> viewModel.moChuyen(slug, ngay, toiThieu) },
                    )
                }
            } else if (state.departureError != null) {
                item {
                    Surface(shape = RoundedCornerShape(14.dp), color = MaterialTheme.colorScheme.errorContainer) {
                        Text(state.departureError!!, Modifier.padding(14.dp),
                             style = MaterialTheme.typography.bodyMedium)
                    }
                }
            }

            items(state.departures, key = { it.id }) { dep ->
                DepartureCard(
                    dep = dep,
                    dangXuLy = state.departureBusy == dep.id,
                    khoa = state.departureBusy.isNotBlank(),
                    onChotChay = { viewModel.doiTrangThaiChuyen(dep.id, "confirmed") },
                    onHuyChuyen = { viewModel.doiTrangThaiChuyen(dep.id, "cancelled") },
                )
            }
        }

        // ── Dòng tiền ──
        if (partner.isApproved) {
            state.cashflow?.let { cf -> item { CashflowSection(cf) } }
        }

        item {
            SectionHeader(eyebrow = "Đơn hàng", title = "Đơn của bạn", modifier = Modifier.padding(top = 10.dp))
        }
        if (state.bookings.isEmpty()) {
            item {
                Text(
                    "Chưa có đơn nào.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        } else {
            items(state.bookings, key = { it.id }) { booking ->
                BookingCard(booking) { status -> viewModel.setBookingStatus(booking.id, status) }
            }
        }
    }
}

@Composable
private fun DriverSwitch(
    state: PartnerUiState,
    onToggle: () -> Unit,
    onSelectArea: (String?) -> Unit,
) {
    Surface(
        shape = RoundedCornerShape(24.dp),
        color = LmNavy,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(Modifier.padding(22.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text(
                if (state.online) "Đang nhận đơn" else "Đang tắt nhận đơn",
                style = MaterialTheme.typography.headlineSmall,
                color = Color.White,
            )
            Text(
                if (state.online)
                    "Đang nhận đơn quanh ${state.activeAreaName.ifBlank { "vị trí của bạn" }}, " +
                        "bán kính ${state.radiusKm} km."
                else "Chọn khu vực bạn đang chạy, rồi bật lên để nhận đơn của khách gần bạn nhất.",
                style = MaterialTheme.typography.bodyMedium,
                color = Color.White.copy(alpha = .74f),
            )

            // ── Khu vực nhận đơn: chỉ đổi được khi đang tắt ──
            if (!state.online && state.areas.isNotEmpty()) {
                Text(
                    "Khu vực nhận đơn",
                    style = MaterialTheme.typography.labelLarge,
                    color = Color.White.copy(alpha = .9f),
                    modifier = Modifier.padding(top = 4.dp),
                )
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    item {
                        AreaChip(
                            label = "Vị trí hiện tại",
                            selected = state.selectedArea == null,
                            onClick = { onSelectArea(null) },
                        )
                    }
                    items(state.areas, key = { it.slug }) { area ->
                        AreaChip(
                            label = area.name,
                            selected = state.selectedArea == area.slug,
                            onClick = { onSelectArea(area.slug) },
                        )
                    }
                }
                Text(
                    "Hệ thống sẽ nổ đơn của khách trong bán kính ${state.radiusKm} km quanh khu vực này.",
                    style = MaterialTheme.typography.bodySmall,
                    color = Color.White.copy(alpha = .6f),
                )
            }

            Button(
                onClick = onToggle,
                enabled = !state.busy,
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (state.online) Color.White.copy(alpha = .18f) else LmAmber,
                    contentColor = if (state.online) Color.White else LmNavy,
                ),
            ) {
                if (state.busy) {
                    CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp, color = Color.White)
                } else {
                    Icon(if (state.online) Icons.Rounded.PowerOff else Icons.Rounded.Power, null, Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                    Text(if (state.online) "Tắt nhận đơn" else "Bật nhận đơn")
                }
            }
        }
    }
}

/** Chip chọn khu vực, tô màu sáng để đọc được trên nền xanh rừng. */
@Composable
private fun AreaChip(label: String, selected: Boolean, onClick: () -> Unit) {
    FilterChip(
        selected = selected,
        onClick = onClick,
        label = { Text(label) },
        shape = RoundedCornerShape(12.dp),
        colors = FilterChipDefaults.filterChipColors(
            containerColor = Color.White.copy(alpha = .12f),
            labelColor = Color.White.copy(alpha = .82f),
            selectedContainerColor = LmAmber,
            selectedLabelColor = LmNavy,
        ),
        border = null,
    )
}

@Composable
private fun OfferCard(offer: DriverOfferDto, onAccept: () -> Unit, onDecline: () -> Unit) {
    Card(
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
    ) {
        Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(9.dp)) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Rounded.NearMe, null, Modifier.size(16.dp), tint = LmBlue)
                Spacer(Modifier.width(6.dp))
                Text(
                    "Cách bạn ${offer.distanceKm} km",
                    style = MaterialTheme.typography.labelLarge,
                    color = LmBlue,
                )
                Spacer(Modifier.weight(1f))
                Surface(shape = RoundedCornerShape(50), color = LmBlue) {
                    Text(
                        "${offer.secondsLeft}s",
                        Modifier.padding(horizontal = 11.dp, vertical = 4.dp),
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onPrimary,
                    )
                }
            }
            Text(offer.pickup, style = MaterialTheme.typography.titleMedium)
            Text(
                "→ ${offer.dropoff}",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Text(
                "${formatDate(offer.date)} lúc ${offer.time} · ${offer.seats} khách · ${offer.guestName}",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Row(Modifier.fillMaxWidth().padding(top = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                Text(
                    formatPrice(offer.price),
                    style = MaterialTheme.typography.headlineSmall,
                    color = LmBlue,
                    fontWeight = FontWeight.Bold,
                )
                Spacer(Modifier.weight(1f))
                Button(
                    onClick = onDecline,
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color.Transparent,
                        contentColor = MaterialTheme.colorScheme.onSurfaceVariant,
                    ),
                ) { Text("Bỏ qua") }
                Spacer(Modifier.width(6.dp))
                Button(
                    onClick = onAccept,
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = LmBlue),
                ) { Text("Nhận chuyến") }
            }
        }
    }
}

@Composable
private fun BookingCard(booking: PartnerBookingDto, onStatus: (String) -> Unit) {
    val kindLabel = when (booking.kind) {
        "transport" -> "Xe đưa đón"
        "tour" -> "Tour"
        else -> "Đặt phòng"
    }
    val statusLabel = when (booking.status) {
        "confirmed" -> "Đã nhận"
        "completed" -> "Hoàn thành"
        "cancelled" -> "Đã huỷ"
        else -> "Chờ xác nhận"
    }

    Card(
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
    ) {
        Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(7.dp)) {
            Row {
                Surface(shape = RoundedCornerShape(50), color = LmBlue.copy(alpha = .12f)) {
                    Text(
                        kindLabel,
                        Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                        style = MaterialTheme.typography.labelMedium,
                        color = LmBlue,
                    )
                }
                Spacer(Modifier.width(8.dp))
                Surface(shape = RoundedCornerShape(50), color = MaterialTheme.colorScheme.surfaceVariant) {
                    Text(
                        statusLabel,
                        Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                        style = MaterialTheme.typography.labelMedium,
                    )
                }
            }
            Text(booking.roomName, style = MaterialTheme.typography.titleMedium)
            Text(
                buildString {
                    append(formatDate(booking.checkIn))
                    if (booking.checkOut.isNotBlank() && booking.checkOut != booking.checkIn) {
                        append(" → ${formatDate(booking.checkOut)}")
                    }
                    if (booking.pickupTime.isNotBlank()) append(" · đón ${booking.pickupTime}")
                },
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Text(
                "${booking.guestName} · ${booking.phone}",
                style = MaterialTheme.typography.bodyMedium,
            )
            Row(Modifier.fillMaxWidth().padding(top = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                Text(formatPrice(booking.totalPrice), style = MaterialTheme.typography.titleLarge, color = LmBlue)
                Spacer(Modifier.weight(1f))
                when (booking.status) {
                    "pending" -> {
                        Button(
                            onClick = { onStatus("cancelled") },
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color.Transparent,
                                contentColor = MaterialTheme.colorScheme.onSurfaceVariant,
                            ),
                        ) { Text("Từ chối") }
                        Spacer(Modifier.width(6.dp))
                        Button(
                            onClick = { onStatus("confirmed") },
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = LmBlue),
                        ) { Text("Xác nhận") }
                    }
                    "confirmed" -> Button(
                        onClick = { onStatus("completed") },
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = LmBlue),
                    ) { Text("Đã hoàn thành") }
                }
            }
        }
    }
}
