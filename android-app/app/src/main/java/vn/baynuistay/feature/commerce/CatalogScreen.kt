@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
package vn.baynuistay.feature.commerce

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.Alignment
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import coil3.compose.AsyncImage
import vn.baynuistay.core.network.AssetUrl
import vn.baynuistay.core.ui.lang.tr
import java.text.NumberFormat
import java.util.Locale
import java.time.Instant
import java.time.ZoneOffset

internal fun money(value: Long) = NumberFormat.getNumberInstance(Locale("vi", "VN")).format(value) + "đ"

@Composable
fun CatalogScreen(onOrders: () -> Unit, onAccount: () -> Unit, viewModel: CatalogViewModel = hiltViewModel()) {
    val s by viewModel.state.collectAsStateWithLifecycle()
    val foods = remember(s.foods, s.query, s.area, s.available, s.sort) { filterSpecialties(s.foods, s.query, s.area, s.available, s.sort) }
    val tours = s.tours.filter { plain(it.name + " " + it.stops).contains(plain(s.query)) }
    var picker by remember { mutableStateOf(false) }
    BackHandler(s.sending) { /* Keep receipt available while server accepts the order. */ }
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(16.dp, 18.dp, 16.dp, 100.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        item {
            Text(tr(if (s.foodMode) "Đặc sản địa phương" else "Tour người bản địa", if (s.foodMode) "Local specialties" else "Local tours"), style = MaterialTheme.typography.headlineSmall)
            Text(tr("Dữ liệu và đơn hàng dùng chung với localmate.click", "Same listings and orders as localmate.click"), style = MaterialTheme.typography.bodySmall)
        }
        item { OutlinedTextField(s.query, { viewModel.filters(query = it) }, label = { Text(tr("Tìm tên món / tour", "Search items / tours")) }, singleLine = true, modifier = Modifier.fillMaxWidth()) }
        if (s.foodMode) {
            item { OutlinedTextField(s.area, { viewModel.filters(area = it) }, label = { Text(tr("Khu vực", "Area")) }, singleLine = true, modifier = Modifier.fillMaxWidth()) }
            item {
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    item { FilterChip(s.available, { viewModel.filters(available = !s.available) }, label = { Text(tr("Còn hàng", "Available")) }) }
                    item { FilterChip(s.sort == 1, { viewModel.filters(sort = if (s.sort == 1) 0 else 1) }, label = { Text(tr("Giá tăng dần", "Price: low first")) }) }
                    item { FilterChip(s.sort == 2, { viewModel.filters(sort = if (s.sort == 2) 0 else 2) }, label = { Text(tr("Giá giảm dần", "Price: high first")) }) }
                }
            }
        }
        item { Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            TextButton(onClick = { viewModel.load() }, enabled = !s.loading) { Text(tr("Làm mới", "Refresh")) }
            TextButton(onClick = onOrders) { Text(tr("Đơn của tôi", "My orders")) }
        } }
        when {
            s.loading -> item { LinearProgressIndicator(Modifier.fillMaxWidth()) }
            s.error != null -> item { Text(s.error.orEmpty(), color = MaterialTheme.colorScheme.error) }
            (s.foodMode && foods.isEmpty()) || (!s.foodMode && tours.isEmpty()) -> item {
                Text(tr("Chưa có kết quả phù hợp. Thử bỏ bộ lọc hoặc quay lại sau.", "No matching results. Clear the filters or check back later."))
                TextButton(onClick = { viewModel.filters(query = "", area = "", available = false, sort = 0) }) { Text(tr("Bỏ bộ lọc", "Clear filters")) }
            }
        }
        if (!s.loading && s.error == null) {
            if (s.foodMode) items(foods, key = { it.id }) { f ->
                Card(onClick = { viewModel.selectFood(f) }, modifier = Modifier.fillMaxWidth()) {
                    AsyncImage(AssetUrl(f.image), contentDescription = f.name, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxWidth().height(170.dp))
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(f.name, style = MaterialTheme.typography.titleMedium)
                        Text(listOf(f.shop, f.area).filter { it.isNotBlank() }.joinToString(" · "), style = MaterialTheme.typography.bodySmall)
                        Text(money(f.price) + "/" + f.unit.ifBlank { tr("phần", "serving") }, color = MaterialTheme.colorScheme.primary)
                        Text(if (f.canOrder()) tr("Xem chi tiết & đặt món", "Details & order") else tr("Tạm hết hàng", "Unavailable"))
                    }
                }
            } else items(tours, key = { it.slug }) { t ->
                Card(onClick = { viewModel.selectTour(t) }, modifier = Modifier.fillMaxWidth()) {
                    AsyncImage(AssetUrl(t.image), contentDescription = t.name, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxWidth().height(170.dp))
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(t.name, style = MaterialTheme.typography.titleMedium)
                        Text(t.stops, style = MaterialTheme.typography.bodySmall)
                        Text(money(t.price.toLong()) + tr(" / khách", " / guest"))
                        Text(tr("Xem lịch trình & đặt tour", "Itinerary & booking"))
                    }
                }
            }
        }
    }
    if (s.food != null || s.tour != null) {
        ModalBottomSheet(onDismissRequest = viewModel::close, sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)) {
            Column(Modifier.fillMaxWidth().imePadding().navigationBarsPadding().verticalScroll(rememberScrollState()).padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(s.food?.name ?: s.tour?.name.orEmpty(), style = MaterialTheme.typography.titleLarge)
                if (!s.ordering) {
                    val photo = s.food?.image ?: s.tour?.image.orEmpty()
                    AsyncImage(AssetUrl(photo), null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxWidth().height(190.dp))
                    Text(money(s.food?.price ?: s.tour!!.price.toLong()))
                    s.food?.let { f ->
                        Text(f.description)
                        Text(tr("Cơ sở: ", "Seller: ") + f.shop.ifBlank { "LOCALMATE" })
                        Text(tr("Khu vực: ", "Area: ") + f.area)
                        Text(tr("Giao hàng: ", "Shipping: ") + f.shipping.ifBlank { tr("Liên hệ cơ sở để xác nhận", "Confirm with seller") })
                        Text(tr("Bảo quản: ", "Storage: ") + f.keeping.ifBlank { tr("Hỏi cơ sở trước khi đặt", "Ask seller before ordering") })
                        if (f.stockTracked || f.stock > 0) Text(tr("Còn: ", "In stock: ") + f.stock + " " + f.unit)
                    }
                    s.tour?.let { t ->
                        Text(t.duration + " · " + t.pax)
                        Text(t.includes.joinToString(" · "))
                        t.schedule.forEach { stop -> Text(stop.time + " — " + stop.label) }
                    }
                    Button(onClick = viewModel::order, enabled = s.food?.canOrder() ?: (s.tour?.soldOut != true && (s.tour?.price ?: 0) > 0), modifier = Modifier.fillMaxWidth()) { Text(tr("Đặt dịch vụ này", "Book this service")) }
                } else {
                    Text(tr(if (s.foodMode) "Số lượng" else "Số khách", if (s.foodMode) "Quantity" else "Guests"))
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                        val less = tr("Giảm số lượng", "Decrease quantity")
                        val more = tr("Tăng số lượng", "Increase quantity")
                        OutlinedButton(onClick = { viewModel.quantity(s.quantity - 1) }, enabled = !s.sending && s.quantity > 1, modifier = Modifier.semantics { contentDescription = less }) { Text("−") }
                        Text(s.quantity.toString(), style = MaterialTheme.typography.titleLarge)
                        OutlinedButton(onClick = { viewModel.quantity(s.quantity + 1) }, enabled = !s.sending && s.quantity < (s.food?.limit() ?: 20), modifier = Modifier.semantics { contentDescription = more }) { Text("+") }
                        Text(s.food?.unit.orEmpty(), modifier = Modifier.weight(1f))
                    }
                    Text(tr("Tạm tính: ", "Subtotal: ") + money((s.food?.price ?: s.tour!!.price.toLong()) * s.quantity), style = MaterialTheme.typography.titleMedium)
                    if (s.foodMode) {
                        Text(tr("Chưa bao gồm phí giao hàng. Cơ sở sẽ gọi xác nhận và báo phí; bạn chưa cần thanh toán bây giờ.", "Shipping excluded. Seller confirms the fee by phone; no payment is required now."))
                        if (s.addresses.isNotEmpty()) LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            items(s.addresses, key = { it.id }) { a -> AssistChip(onClick = { viewModel.chooseAddress(a) }, enabled = !s.sending, label = { Text(a.label.ifBlank { a.address.take(35) }) }) }
                        }
                        TextButton(onClick = { viewModel.close(); onAccount() }, enabled = !s.sending) { Text(tr("Quản lý sổ địa chỉ", "Manage addresses")) }
                    } else OutlinedButton(onClick = { picker = true }, enabled = !s.sending) { Text(tr("Ngày đi: ", "Travel date: ") + s.date) }
                    OutlinedTextField(s.name, viewModel::name, label = { Text(tr("Họ tên *", "Name *")) }, enabled = !s.sending, singleLine = true, modifier = Modifier.fillMaxWidth())
                    OutlinedTextField(s.phone, viewModel::phone, label = { Text(tr("Số điện thoại *", "Phone *")) }, enabled = !s.sending, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone), singleLine = true, modifier = Modifier.fillMaxWidth())
                    if (s.foodMode) OutlinedTextField(s.address, viewModel::address, label = { Text(tr("Địa chỉ nhận hàng *", "Delivery address *")) }, enabled = !s.sending, modifier = Modifier.fillMaxWidth())
                    OutlinedTextField(s.note, viewModel::note, label = { Text(tr("Ghi chú", "Note")) }, enabled = !s.sending, modifier = Modifier.fillMaxWidth())
                    s.formError?.let { Text(it, color = MaterialTheme.colorScheme.error) }
                    Button(onClick = viewModel::submit, enabled = !s.sending, modifier = Modifier.fillMaxWidth()) { Text(if (s.sending) tr("Đang gửi…", "Sending…") else tr("Xác nhận đặt", "Confirm booking")) }
                }
                TextButton(onClick = viewModel::close, enabled = !s.sending, modifier = Modifier.fillMaxWidth()) { Text(tr("Đóng", "Close")) }
            }
        }
    }
    if (picker) {
        val dateState = rememberDatePickerState()
        DatePickerDialog(onDismissRequest = { picker = false }, confirmButton = {
            TextButton(onClick = { dateState.selectedDateMillis?.let { viewModel.date(Instant.ofEpochMilli(it).atZone(ZoneOffset.UTC).toLocalDate().toString()) }; picker = false }) { Text(tr("Chọn", "Select")) }
        }) { DatePicker(dateState) }
    }
    s.receipt?.let { r ->
        AlertDialog(onDismissRequest = viewModel::dismissReceipt, title = { Text(tr("Đã nhận đơn", "Order received")) }, text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(tr("Mã đơn: ", "Order code: ") + r.data.code.ifBlank { r.data.id.takeLast(8).uppercase() })
                Text(r.data.summary); Text(money(r.data.totalPrice.toLong())); Text(r.message)
            }
        }, confirmButton = { TextButton(onClick = { viewModel.dismissReceipt(); onOrders() }) { Text(tr("Xem đơn của tôi", "View my orders")) } },
            dismissButton = { TextButton(onClick = viewModel::dismissReceipt) { Text(tr("Đóng", "Close")) } })
    }
}
