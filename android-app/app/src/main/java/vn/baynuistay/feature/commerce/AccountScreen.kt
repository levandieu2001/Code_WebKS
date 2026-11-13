package vn.baynuistay.feature.commerce

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject
import vn.baynuistay.core.network.*
import vn.baynuistay.core.local.TokenStore
import vn.baynuistay.core.ui.lang.tr

data class AccountState(val profile: CustomerProfileDto = CustomerProfileDto(), val loading: Boolean = true,
    val loggedIn: Boolean = false, val saving: Boolean = false, val error: String? = null,
    val editing: DeliveryAddressDto? = null)
@HiltViewModel
class AccountViewModel @Inject constructor(private val api: BayNuiApi, private val tokens: TokenStore) : ViewModel() {
    private val _state = MutableStateFlow(AccountState()); val state = _state.asStateFlow()
    init { load() }
    fun load() = viewModelScope.launch {
        val logged = !tokens.token.first().isNullOrBlank()
        _state.update { it.copy(loggedIn = logged, loading = logged, error = null) }
        if (logged) runCatching { api.customerProfile().data }
            .onSuccess { p -> _state.update { it.copy(profile = p, loading = false) } }
            .onFailure { e -> _state.update { it.copy(error = ApiError.message(e), loading = false) } }
    }
    fun edit(a: DeliveryAddressDto?) { if (!state.value.saving) _state.update { it.copy(editing = a, error = null) } }
    private fun save(action: suspend () -> CustomerProfileResponse) {
        if (state.value.saving) return
        _state.update { it.copy(saving = true, error = null) }
        viewModelScope.launch {
            runCatching { action().data }.onSuccess { p -> _state.update { it.copy(profile = p, editing = null) } }
                .onFailure { e -> _state.update { it.copy(error = ApiError.message(e)) } }
            _state.update { it.copy(saving = false) }
        }
    }
    fun saveProfile(name: String, phone: String) = save { api.saveCustomerProfile(CustomerProfileRequest(name.trim(), phone.trim())) }
    fun saveAddress(a: DeliveryAddressDto) = save { api.saveDeliveryAddress(a.copy(label = a.label.trim(), receiver = a.receiver.trim(), phone = a.phone.trim(), address = a.address.trim())) }
    fun remove(a: DeliveryAddressDto) = save { api.deleteDeliveryAddress(a.id) }
}

@Composable
fun AccountDetailsScreen(onLogin: () -> Unit, viewModel: AccountViewModel = hiltViewModel()) {
    val lifecycleOwner = androidx.lifecycle.compose.LocalLifecycleOwner.current
    DisposableEffect(lifecycleOwner) {
        val observer = androidx.lifecycle.LifecycleEventObserver { _, event ->
            if (event == androidx.lifecycle.Lifecycle.Event.ON_RESUME) viewModel.load()
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }
    val s by viewModel.state.collectAsStateWithLifecycle()
    var name by remember(s.profile.fullName) { mutableStateOf(s.profile.fullName) }
    var phone by remember(s.profile.phone) { mutableStateOf(s.profile.phone) }
    var deleting by remember { mutableStateOf<DeliveryAddressDto?>(null) }
    LazyColumn(Modifier.fillMaxSize().imePadding(), contentPadding = PaddingValues(16.dp, 18.dp, 16.dp, 100.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item { Text(tr("Tài khoản & sổ địa chỉ", "Account & addresses"), style = MaterialTheme.typography.headlineSmall) }
        if (s.loading) item { LinearProgressIndicator(Modifier.fillMaxWidth()) }
        if (!s.loggedIn && !s.loading) item { Button(onClick = onLogin) { Text(tr("Đăng nhập để đồng bộ", "Sign in to sync")) } }
        s.error?.let { item { Text(it, color = MaterialTheme.colorScheme.error); TextButton(onClick = { viewModel.load() }) { Text(tr("Thử lại", "Retry")) } } }
        if (s.loggedIn && !s.loading) {
            item { OutlinedTextField(name, { name = it.take(120) }, label = { Text(tr("Họ tên", "Name")) }, enabled = !s.saving, modifier = Modifier.fillMaxWidth()) }
            item { OutlinedTextField(phone, { phone = it.take(20) }, label = { Text(tr("Số điện thoại", "Phone")) }, enabled = !s.saving, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone), modifier = Modifier.fillMaxWidth()) }
            item { Button(onClick = { viewModel.saveProfile(name, phone) }, enabled = !s.saving) { Text(tr("Lưu thông tin", "Save profile")) } }
            item { Text(tr("Sổ địa chỉ giao hàng", "Delivery addresses"), style = MaterialTheme.typography.titleLarge) }
            items(s.profile.addresses, key = { it.id }) { a ->
                Card(Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(a.label.ifBlank { tr("Địa chỉ", "Address") }, style = MaterialTheme.typography.titleMedium)
                        if (a.isDefault) Text(tr("Mặc định", "Default"), color = MaterialTheme.colorScheme.primary)
                        Text(a.receiver + " · " + a.phone); Text(a.address)
                        Row {
                            TextButton(onClick = { viewModel.edit(a) }, enabled = !s.saving) { Text(tr("Sửa", "Edit")) }
                            TextButton(onClick = { deleting = a }, enabled = !s.saving) { Text(tr("Xóa", "Delete")) }
                        }
                        if (!a.isDefault) TextButton(onClick = { viewModel.saveAddress(a.copy(isDefault = true)) }, enabled = !s.saving) { Text(tr("Đặt mặc định", "Make default")) }
                    }
                }
            }
            item { OutlinedButton(onClick = { viewModel.edit(DeliveryAddressDto(receiver = name, phone = phone, isDefault = s.profile.addresses.isEmpty())) }, enabled = !s.saving && s.profile.addresses.size < 8) { Text(tr("Thêm địa chỉ", "Add address")) } }
        }
    }
    s.editing?.let { a ->
        var edited by remember(a) { mutableStateOf(a) }
        AlertDialog(onDismissRequest = { viewModel.edit(null) }, title = { Text(tr("Địa chỉ giao hàng", "Delivery address")) }, text = {
            Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(edited.label, { edited = edited.copy(label = it.take(40)) }, enabled = !s.saving, label = { Text(tr("Tên gợi nhớ", "Label")) })
                OutlinedTextField(edited.receiver, { edited = edited.copy(receiver = it.take(120)) }, enabled = !s.saving, label = { Text(tr("Người nhận *", "Recipient *")) })
                OutlinedTextField(edited.phone, { edited = edited.copy(phone = it.take(20)) }, enabled = !s.saving, label = { Text(tr("Số điện thoại *", "Phone *")) }, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone))
                OutlinedTextField(edited.address, { edited = edited.copy(address = it.take(300)) }, enabled = !s.saving, label = { Text(tr("Địa chỉ đầy đủ *", "Full address *")) })
                s.error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
            }
        }, confirmButton = { TextButton(onClick = { viewModel.saveAddress(edited) }, enabled = !s.saving) { Text(tr("Lưu", "Save")) } },
            dismissButton = { TextButton(onClick = { viewModel.edit(null) }, enabled = !s.saving) { Text(tr("Bỏ qua", "Cancel")) } })
    }
    deleting?.let { a -> AlertDialog(onDismissRequest = { deleting = null }, title = { Text(tr("Xóa địa chỉ này?", "Delete this address?")) }, text = { Text(a.label + "\n" + a.address) },
        confirmButton = { TextButton(onClick = { deleting = null; viewModel.remove(a) }) { Text(tr("Xóa", "Delete")) } }, dismissButton = { TextButton(onClick = { deleting = null }) { Text(tr("Giữ lại", "Keep")) } }) }
}
