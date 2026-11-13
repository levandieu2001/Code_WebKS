package vn.baynuistay.feature.auth.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Visibility
import androidx.compose.material.icons.rounded.VisibilityOff
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import vn.baynuistay.core.ui.components.BrandMark
import vn.baynuistay.core.ui.theme.LmBlue
import vn.baynuistay.core.ui.lang.tr

@Composable
fun AuthScreen(
    onDone: () -> Unit,
    onSkip: () -> Unit,
    viewModel: AuthViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    var showPassword by remember { mutableStateOf(false) }

    LaunchedEffect(state.success) {
        if (state.success) onDone()
    }

    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 24.dp, vertical = 32.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        BrandMark()
        Spacer(Modifier.height(6.dp))

        Text(
            if (state.isRegister) tr("Tạo tài khoản", "Create an account") else tr("Chào mừng trở lại", "Welcome back"),
            style = MaterialTheme.typography.displaySmall,
        )
        Text(
            if (state.isRegister)
                tr("Đăng ký để lưu lịch trình, theo dõi đơn đặt và nhận dấu ấn LOCALMATE Passport.", "Sign up to save itineraries, track bookings and collect LOCALMATE Passport stamps.")
            else
                tr("Đăng nhập để xem đơn của bạn và tiếp tục hành trình.", "Sign in to see your bookings and pick up where you left off."),
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )

        // Chuyển giữa Đăng nhập / Đăng ký
        Surface(shape = RoundedCornerShape(50), color = MaterialTheme.colorScheme.surface) {
            Row(Modifier.padding(4.dp)) {
                TabButton(tr("Đăng nhập", "Sign in"), !state.isRegister, Modifier.weight(1f)) { viewModel.setMode(false) }
                TabButton(tr("Đăng ký", "Sign up"), state.isRegister, Modifier.weight(1f)) { viewModel.setMode(true) }
            }
        }

        if (state.isRegister) {
            OutlinedTextField(
                value = state.fullName,
                onValueChange = viewModel::setFullName,
                label = { Text(tr("Họ và tên", "Full name")) },
                singleLine = true,
                modifier = Modifier.fillMaxWidth(),
            )
        }

        OutlinedTextField(
            value = state.email,
            onValueChange = viewModel::setEmail,
            label = { Text("Email") },
            placeholder = { Text("ban@example.com") },
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Next),
            modifier = Modifier.fillMaxWidth(),
        )

        OutlinedTextField(
            value = state.password,
            onValueChange = viewModel::setPassword,
            label = { Text(tr("Mật khẩu", "Password")) },
            placeholder = { Text(tr("Ít nhất 6 ký tự", "At least 6 characters")) },
            singleLine = true,
            visualTransformation = if (showPassword) VisualTransformation.None else PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Done),
            trailingIcon = {
                IconButton(onClick = { showPassword = !showPassword }) {
                    Icon(
                        if (showPassword) Icons.Rounded.VisibilityOff else Icons.Rounded.Visibility,
                        if (showPassword) tr("Ẩn mật khẩu", "Hide password") else tr("Hiện mật khẩu", "Show password"),
                    )
                }
            },
            modifier = Modifier.fillMaxWidth(),
        )

        state.error?.let { message ->
            Surface(shape = RoundedCornerShape(14.dp), color = MaterialTheme.colorScheme.errorContainer) {
                Text(
                    message,
                    Modifier.padding(14.dp),
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onErrorContainer,
                )
            }
        }

        Button(
            onClick = viewModel::submit,
            enabled = !state.loading,
            modifier = Modifier.fillMaxWidth().height(54.dp),
            shape = RoundedCornerShape(15.dp),
            colors = ButtonDefaults.buttonColors(containerColor = LmBlue),
        ) {
            if (state.loading) {
                CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp, color = MaterialTheme.colorScheme.onPrimary)
                Spacer(Modifier.width(10.dp))
                Text(tr("Đang xử lý…", "Working…"))
            } else {
                Text(if (state.isRegister) tr("Đăng ký", "Sign up") else tr("Đăng nhập", "Sign in"))
            }
        }

        Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
            TextButton(onClick = onSkip) { Text(tr("Để sau, xem trước đã", "Later, just browsing")) }
        }
    }
}

@Composable
private fun TabButton(label: String, selected: Boolean, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Surface(
        onClick = onClick,
        modifier = modifier,
        shape = RoundedCornerShape(50),
        color = if (selected) LmBlue else MaterialTheme.colorScheme.surface,
    ) {
        Box(Modifier.padding(vertical = 12.dp), contentAlignment = Alignment.Center) {
            Text(
                label,
                style = MaterialTheme.typography.titleSmall,
                color = if (selected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}
