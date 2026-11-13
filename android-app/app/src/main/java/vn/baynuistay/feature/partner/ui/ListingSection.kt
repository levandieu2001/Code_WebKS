@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package vn.baynuistay.feature.partner.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.MyLocation
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import vn.baynuistay.core.network.ListingDto
import vn.baynuistay.core.ui.components.SectionHeader
import vn.baynuistay.core.ui.components.formatPrice
import vn.baynuistay.core.ui.theme.LmSuccess
import vn.baynuistay.core.ui.theme.LmBlue

// ════════════════════════════════════════════════════════════
// DỊCH VỤ ĐỐI TÁC TỰ ĐĂNG
// ════════════════════════════════════════════════════════════
// Khách sạn đăng phòng, đơn vị tour đăng tour — ngay trên app, không phải
// mở web. Tin mới ở trạng thái chờ duyệt cho tới khi LOCALMATE bật.

/** Tiêu đề mục + nút đăng mới. */
@Composable
fun ListingHeader(state: PartnerUiState, onAdd: () -> Unit) {
    val isStay = state.listingType == "stay"
    Row(
        Modifier.fillMaxWidth().padding(top = 10.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.Bottom,
    ) {
        // SectionHeader chiếm hết bề ngang nếu không giới hạn, đẩy nút ra ngoài màn hình
        SectionHeader(
            eyebrow = "Dịch vụ của bạn",
            title = if (isStay) "Phòng & chỗ nghỉ" else "Tour bạn tổ chức",
            modifier = Modifier.weight(1f),
        )
        Spacer(Modifier.width(10.dp))
        OutlinedButton(onClick = onAdd, shape = RoundedCornerShape(14.dp)) {
            Icon(Icons.Rounded.Add, null, Modifier.size(17.dp))
            Spacer(Modifier.width(6.dp))
            Text("Đăng")
        }
    }
}

@Composable
fun ListingEmpty(isStay: Boolean) {
    Surface(shape = RoundedCornerShape(16.dp), color = MaterialTheme.colorScheme.primaryContainer) {
        Text(
            "Bạn chưa đăng ${if (isStay) "phòng" else "tour"} nào. Bấm Đăng để khách nhìn thấy và " +
                "đặt được ngay trên web, trên app, và trong lịch trình hệ thống gợi ý.",
            Modifier.padding(16.dp),
            style = MaterialTheme.typography.bodyMedium,
        )
    }
}

@Composable
fun ListingCard(
    row: ListingDto,
    onEdit: () -> Unit,
    onToggle: () -> Unit,
    onDelete: () -> Unit,
) {
    var confirmDelete by remember { mutableStateOf(false) }
    val isStay = row.type == "stay"
    val live = row.status == "approved"

    Surface(
        shape = RoundedCornerShape(18.dp),
        color = MaterialTheme.colorScheme.surface,
        modifier = Modifier.fillMaxWidth(),
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            // Ảnh bìa ngay trên thẻ: đối tác vừa đăng ảnh xong phải thấy được
            // đúng tấm khách sẽ thấy, chứ không phải tin lời báo "đã tải lên".
            val anhBia = row.images.firstOrNull().orEmpty().ifBlank { row.image }
            if (anhBia.isNotBlank()) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    coil3.compose.AsyncImage(
                        model = vn.baynuistay.core.network.AssetUrl(anhBia),
                        contentDescription = null,
                        contentScale = androidx.compose.ui.layout.ContentScale.Crop,
                        modifier = Modifier
                            .weight(1f)
                            .height(120.dp)
                            .clip(RoundedCornerShape(12.dp)),
                    )
                    // Còn mấy tấm nữa thì nói bằng số, khỏi bày hết ra cho chật
                    if (row.images.size > 1) {
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = MaterialTheme.colorScheme.surfaceVariant,
                            modifier = Modifier.height(120.dp).width(64.dp),
                        ) {
                            Column(
                                Modifier.fillMaxWidth(),
                                verticalArrangement = Arrangement.Center,
                                horizontalAlignment = Alignment.CenterHorizontally,
                            ) {
                                Text("+${row.images.size - 1}", style = MaterialTheme.typography.titleMedium)
                                Text("ảnh", style = MaterialTheme.typography.labelSmall)
                            }
                        }
                    }
                }
            }

            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top,
            ) {
                Column(Modifier.weight(1f)) {
                    Text(row.name, style = MaterialTheme.typography.titleMedium)
                    Text(
                        if (isStay) "${row.area} · ${row.capacity ?: 0} khách"
                        else "${row.duration.ifBlank { "${row.days ?: 1} ngày" }} · ${row.pax}",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Spacer(Modifier.width(10.dp))
                Surface(
                    shape = RoundedCornerShape(50),
                    color = if (live) LmSuccess.copy(alpha = .16f) else LmBlue.copy(alpha = .16f),
                ) {
                    Text(
                        row.statusLabel,
                        Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                        style = MaterialTheme.typography.labelSmall,
                        color = if (live) LmSuccess else LmBlue,
                    )
                }
            }

            if (row.description.isNotBlank()) {
                Text(
                    row.description,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }

            if (row.rejectNote.isNotBlank()) {
                Surface(shape = RoundedCornerShape(10.dp), color = MaterialTheme.colorScheme.errorContainer) {
                    Text(
                        row.rejectNote,
                        Modifier.padding(10.dp),
                        style = MaterialTheme.typography.bodySmall,
                    )
                }
            }

            Row(
                Modifier.fillMaxWidth().padding(top = 6.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    formatPrice(row.price) + if (isStay) " / đêm" else " / khách",
                    style = MaterialTheme.typography.titleSmall,
                    fontWeight = FontWeight.Bold,
                    color = LmBlue,
                )
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    if (row.status == "approved" || row.status == "paused") {
                        TextButton(onClick = onToggle) {
                            Text(if (row.status == "paused") "Bật lại" else "Tạm ẩn")
                        }
                    }
                    TextButton(onClick = onEdit) { Text("Sửa") }
                    TextButton(onClick = { confirmDelete = true }) { Text("Xoá") }
                }
            }
        }
    }

    if (confirmDelete) {
        AlertDialog(
            onDismissRequest = { confirmDelete = false },
            title = { Text("Xoá \"${row.name}\"?") },
            text = { Text("Khách sẽ không còn nhìn thấy mục này nữa.") },
            confirmButton = {
                TextButton(onClick = { confirmDelete = false; onDelete() }) { Text("Xoá") }
            },
            dismissButton = { TextButton(onClick = { confirmDelete = false }) { Text("Giữ lại") } },
        )
    }
}

/** Biểu mẫu đăng / sửa, hiện dưới dạng hộp thoại toàn màn hình thu gọn. */
@Composable
fun ListingFormDialog(state: PartnerUiState, viewModel: PartnerViewModel, onRequestLocation: () -> Unit) {
    val form = state.listingForm ?: return
    val isStay = state.listingType == "stay"

    AlertDialog(
        onDismissRequest = viewModel::closeListingForm,
        title = {
            Text(
                (if (form.isEditing) "Sửa " else "Đăng ") + if (isStay) "phòng / chỗ nghỉ" else "tour",
            )
        },
        text = {
            Column(
                Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Text(
                    if (isStay)
                        "Điền đúng khu vực và toạ độ để hệ thống gợi ý phòng của bạn cho khách đang ở gần."
                    else "Tour của bạn sẽ hiện ở mục Khám phá và được đề xuất trong lịch trình phù hợp.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )

                state.listingError?.let { err ->
                    Surface(shape = RoundedCornerShape(10.dp), color = MaterialTheme.colorScheme.errorContainer) {
                        Text(err, Modifier.padding(10.dp), style = MaterialTheme.typography.bodySmall)
                    }
                }

                OutlinedTextField(
                    value = form.name,
                    onValueChange = { v -> viewModel.updateListingForm { it.copy(name = v) } },
                    label = { Text(if (isStay) "Tên phòng *" else "Tên tour *") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )

                AnhTinDang(
                    urls = form.images,
                    dangTai = form.uploading,
                    ghiChu = form.uploadHint,
                    isStay = isStay,
                    onThem = viewModel::themAnh,
                    onXoa = viewModel::xoaAnh,
                    onDatBia = viewModel::datAnhBia,
                )

                OutlinedTextField(
                    value = form.price,
                    onValueChange = { v -> viewModel.updateListingForm { it.copy(price = v.filter { c -> c.isDigit() }) } },
                    label = { Text(if (isStay) "Giá mỗi đêm (đồng) *" else "Giá mỗi khách (đồng) *") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )

                if (isStay) {
                    OutlinedTextField(
                        value = form.capacity,
                        onValueChange = { v -> viewModel.updateListingForm { it.copy(capacity = v.filter { c -> c.isDigit() }) } },
                        label = { Text("Sức chứa (số khách) *") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    OutlinedTextField(
                        value = form.area,
                        onValueChange = { v -> viewModel.updateListingForm { it.copy(area = v) } },
                        label = { Text("Khu vực *") },
                        placeholder = { Text("Núi Sam, Châu Đốc, An Giang") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    OutlinedTextField(
                        value = form.coordsText,
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Vị trí cơ sở *") },
                        placeholder = { Text("Chưa có toạ độ") },
                        trailingIcon = {
                            IconButton(onClick = onRequestLocation, enabled = !form.locating) {
                                if (form.locating) {
                                    CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp, color = LmBlue)
                                } else {
                                    Icon(Icons.Rounded.MyLocation, "Lấy vị trí", tint = LmBlue)
                                }
                            }
                        },
                        modifier = Modifier.fillMaxWidth(),
                    )
                    Text(
                        "Bấm biểu tượng định vị khi bạn đang đứng tại cơ sở của mình.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    OutlinedTextField(
                        value = form.amenities,
                        onValueChange = { v -> viewModel.updateListingForm { it.copy(amenities = v) } },
                        label = { Text("Tiện nghi") },
                        placeholder = { Text("Điều hòa, Wifi, Ăn sáng") },
                        modifier = Modifier.fillMaxWidth(),
                    )
                } else {
                    OutlinedTextField(
                        value = form.days,
                        onValueChange = { v -> viewModel.updateListingForm { it.copy(days = v.filter { c -> c.isDigit() }) } },
                        label = { Text("Số ngày *") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    OutlinedTextField(
                        value = form.duration,
                        onValueChange = { v -> viewModel.updateListingForm { it.copy(duration = v) } },
                        label = { Text("Thời lượng") },
                        placeholder = { Text("2 ngày 1 đêm") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    OutlinedTextField(
                        value = form.pax,
                        onValueChange = { v -> viewModel.updateListingForm { it.copy(pax = v) } },
                        label = { Text("Số khách nhận") },
                        placeholder = { Text("2–10 khách") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    OutlinedTextField(
                        value = form.stops,
                        onValueChange = { v -> viewModel.updateListingForm { it.copy(stops = v) } },
                        label = { Text("Điểm dừng") },
                        modifier = Modifier.fillMaxWidth(),
                    )
                    OutlinedTextField(
                        value = form.includes,
                        onValueChange = { v -> viewModel.updateListingForm { it.copy(includes = v) } },
                        label = { Text("Giá đã gồm") },
                        placeholder = { Text("Hướng dẫn viên, Xe đưa đón, Bữa trưa") },
                        modifier = Modifier.fillMaxWidth(),
                    )
                }

                OutlinedTextField(
                    value = form.description,
                    onValueChange = { v -> viewModel.updateListingForm { it.copy(description = v) } },
                    label = { Text("Mô tả") },
                    modifier = Modifier.fillMaxWidth(),
                )

                if (form.isEditing) {
                    Text(
                        "Sửa nội dung thì tin sẽ chờ LOCALMATE duyệt lại trước khi hiện cho khách.",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        },
        confirmButton = {
            Button(
                onClick = viewModel::saveListing,
                enabled = !state.listingSaving,
                shape = RoundedCornerShape(12.dp),
            ) {
                if (state.listingSaving) {
                    CircularProgressIndicator(Modifier.size(17.dp), strokeWidth = 2.dp)
                } else {
                    Text(if (form.isEditing) "Lưu" else "Gửi đăng")
                }
            }
        },
        dismissButton = { TextButton(onClick = viewModel::closeListingForm) { Text("Huỷ") } },
    )
}

/**
 * Chọn và xem ảnh của tin đăng.
 *
 * Trước đây đăng tin trên app không gắn được ảnh nào — muốn có ảnh phải mở
 * trang web trên máy tính. Tin không ảnh thì hiện ra bằng ảnh mặc định, khách
 * lướt qua luôn.
 *
 * Dùng bộ chọn ảnh của Android (Photo Picker): khách chỉ đưa đúng mấy tấm họ
 * chọn, app KHÔNG xin quyền đọc toàn bộ thư viện ảnh.
 */
@Composable
private fun AnhTinDang(
    urls: List<String>,
    dangTai: Boolean,
    ghiChu: String,
    isStay: Boolean,
    onThem: (List<android.net.Uri>) -> Unit,
    onXoa: (String) -> Unit,
    onDatBia: (String) -> Unit,
) {
    val chonAnh = androidx.activity.compose.rememberLauncherForActivityResult(
        androidx.activity.result.contract.ActivityResultContracts.PickMultipleVisualMedia(6),
    ) { uris -> onThem(uris) }

    Column(Modifier.fillMaxWidth()) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                if (isStay) "Ảnh phòng" else "Ảnh tour",
                style = MaterialTheme.typography.labelLarge,
                modifier = Modifier.weight(1f),
            )
            OutlinedButton(
                onClick = {
                    chonAnh.launch(
                        androidx.activity.result.PickVisualMediaRequest(
                            androidx.activity.result.contract.ActivityResultContracts
                                .PickVisualMedia.ImageOnly,
                        ),
                    )
                },
                enabled = !dangTai,
                shape = RoundedCornerShape(12.dp),
            ) {
                if (dangTai) {
                    CircularProgressIndicator(Modifier.size(16.dp), strokeWidth = 2.dp)
                } else {
                    Icon(Icons.Rounded.Add, null, Modifier.size(18.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("Thêm ảnh")
                }
            }
        }

        if (urls.isNotEmpty()) {
            LazyRow(
                Modifier.fillMaxWidth().padding(top = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                itemsIndexed(urls) { i, url ->
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        coil3.compose.AsyncImage(
                            model = vn.baynuistay.core.network.AssetUrl(url),
                            contentDescription = null,
                            contentScale = androidx.compose.ui.layout.ContentScale.Crop,
                            modifier = Modifier
                                .size(92.dp)
                                .clip(RoundedCornerShape(12.dp)),
                        )
                        Row {
                            if (i == 0) {
                                Text(
                                    "Ảnh bìa",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = LmSuccess,
                                )
                            } else {
                                TextButton(onClick = { onDatBia(url) }) {
                                    Text("Làm bìa", style = MaterialTheme.typography.labelSmall)
                                }
                            }
                            TextButton(onClick = { onXoa(url) }) {
                                Text("Xoá", style = MaterialTheme.typography.labelSmall, color = LmBlue)
                            }
                        }
                    }
                }
            }
        }

        Text(
            ghiChu.ifBlank {
                if (urls.isEmpty()) "Chưa có ảnh nào. Ảnh thật chụp bằng điện thoại là đủ."
                else "Ảnh đầu tiên là ảnh bìa khách nhìn thấy trước."
            },
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(top = 4.dp),
        )
    }
}

