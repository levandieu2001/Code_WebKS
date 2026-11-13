package vn.baynuistay.feature.profile.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.ArrowForwardIos
import androidx.compose.material.icons.rounded.AutoStories
import androidx.compose.material.icons.rounded.BookmarkBorder
import androidx.compose.material.icons.rounded.ConfirmationNumber
import androidx.compose.material.icons.rounded.Handshake
import androidx.compose.material.icons.rounded.Language
import androidx.compose.material.icons.rounded.Logout
import androidx.compose.material.icons.rounded.Luggage
import androidx.compose.material.icons.rounded.NotificationsNone
import androidx.compose.material.icons.rounded.Person
import androidx.compose.material.icons.rounded.Shield
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import vn.baynuistay.core.ui.lang.AppLang
import vn.baynuistay.core.ui.lang.LocalAppLang
import vn.baynuistay.core.ui.lang.tr
import vn.baynuistay.core.ui.theme.LmNavy
import vn.baynuistay.core.ui.theme.LmAmber
import vn.baynuistay.core.ui.theme.LmBlue

@Composable
fun ProfileScreen(
    onOpenPassport: () -> Unit,
    onOpenJournal: () -> Unit = {},
    onOpenAdmin: () -> Unit = {},
    onOpenNotifications: () -> Unit = {},
    onOpenOrders: () -> Unit = {},
    onOpenAuth: () -> Unit = {},
    onOpenPartner: () -> Unit = {},
    onOpenFood: () -> Unit = {},
    onOpenAccount: () -> Unit = {},
    viewModel: ProfileViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(20.dp, 20.dp, 20.dp, 110.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Surface(shape = CircleShape, color = MaterialTheme.colorScheme.primaryContainer) {
                    Icon(Icons.Rounded.Person, null, Modifier.padding(18.dp).size(32.dp), tint = MaterialTheme.colorScheme.primary)
                }
                Spacer(Modifier.size(14.dp))
                Column {
                    Text(
                        state.name.ifBlank { tr("Khách", "Guest") },
                        style = MaterialTheme.typography.headlineMedium,
                    )
                    Text(
                        if (state.loggedIn) state.email
                        else tr("Chưa đăng nhập", "Not signed in"),
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }

        // Nút đổi ngôn ngữ để NGAY TRÊN ĐẦU, không giấu dưới đáy danh sách.
        // Khách nước ngoài mở app ra thấy toàn tiếng Việt — thứ họ cần tìm đầu
        // tiên chính là nút này, mà lúc đó họ chưa đọc được chữ nào để mò.
        item { LanguageCard(onPick = viewModel::setLanguage) }

        // Thẻ đăng nhập / đăng xuất
        item {
            if (state.loggedIn) {
                ProfileMenu(
                    Icons.Rounded.Logout,
                    tr("Đăng xuất", "Sign out"),
                    tr("Thoát khỏi tài khoản trên thiết bị này", "Sign out of this device"),
                    viewModel::logout,
                )
            } else {
                Surface(
                    onClick = onOpenAuth,
                    shape = RoundedCornerShape(20.dp),
                    color = MaterialTheme.colorScheme.primaryContainer,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(
                            tr("Đăng nhập hoặc tạo tài khoản", "Sign in or create an account"),
                            style = MaterialTheme.typography.titleMedium,
                        )
                        Text(
                            tr(
                                "Để lưu lịch trình, theo dõi đơn đặt và nhận dấu ấn LOCALMATE Passport.",
                                "Save itineraries, track your bookings and collect LOCALMATE Passport stamps.",
                            ),
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Text(
                            tr("Bắt đầu  →", "Get started  →"),
                            style = MaterialTheme.typography.labelLarge,
                            color = LmBlue,
                        )
                    }
                }
            }
        }
        item { ProfileMenu(Icons.Rounded.Person, tr("Tài khoản & sổ địa chỉ", "Account & addresses"), tr("Đồng bộ thông tin với website", "Sync with the website"), onOpenAccount) }
        item { ProfileMenu(Icons.Rounded.Handshake, tr("Đặc sản địa phương", "Local specialties"), tr("Chọn món, đặt giao hàng", "Browse and order delivery"), onOpenFood) }
        item {
            Text(
                tr("Tài khoản du lịch", "Travel account"),
                style = MaterialTheme.typography.headlineMedium,
            )
        }
        item {
            ProfileMenu(
                Icons.Rounded.Luggage,
                tr("Đơn của tôi", "My bookings"),
                tr("Phòng, tour, xe và đặc sản đã đặt", "Stays, tours, rides and food orders"),
                onOpenOrders,
            )
        }
        item {
            ProfileMenu(
                Icons.Rounded.ConfirmationNumber,
                "LOCALMATE Passport",
                tr("Dấu ấn và thành tựu", "Stamps and achievements"),
                onOpenPassport,
            )
        }
        item {
            ProfileMenu(
                Icons.Rounded.AutoStories,
                tr("Nhật ký chuyến đi", "Trip journal"),
                tr("Đã đi đâu, ở đâu, tiêu bao nhiêu", "Where you went, stayed and spent"),
                onOpenJournal,
            )
        }
        item {
            ProfileMenu(
                Icons.Rounded.NotificationsNone,
                tr("Thông báo", "Notifications"),
                tr("Cập nhật hành trình và đơn hàng", "Trip and booking updates"),
                onOpenNotifications,
            )
        }
        // Chỉ hiện khi MÁY CHỦ xác nhận tài khoản có quyền quản trị. Không tự
        // đoán theo email ở máy khách — danh sách admin nằm ở máy chủ và đổi
        // được bất cứ lúc nào.
        if (state.isAdmin) {
            item {
                Text(
                    tr("Quản trị", "Admin"),
                    style = MaterialTheme.typography.headlineMedium,
                    modifier = Modifier.padding(top = 6.dp),
                )
            }
            item {
                ProfileMenu(
                    Icons.Rounded.Shield,
                    tr("Duyệt đối tác & tin đăng", "Approve partners & listings"),
                    tr("Việc cần xử lý ngay", "Things that cannot wait"),
                    onOpenAdmin,
                )
            }
        }

        item {
            ProfileMenu(
                Icons.Rounded.Handshake,
                tr("Trở thành đối tác", "Become a partner"),
                tr(
                    "Nhà xe · Khách sạn · Tour · Đặc sản",
                    "Drivers · Hotels · Tours · Local food",
                ),
                onOpenPartner,
            )
        }
    }
}

/**
 * Thẻ chọn ngôn ngữ.
 *
 * Nhãn của mỗi nút luôn viết bằng CHÍNH ngôn ngữ đó ("Tiếng Việt", "English"),
 * không dịch theo ngôn ngữ đang bật — người đang mắc kẹt ở thứ tiếng mình
 * không đọc được vẫn nhận ra nút của mình.
 */
@Composable
private fun LanguageCard(onPick: (String) -> Unit) {
    val current = LocalAppLang.current

    Surface(shape = RoundedCornerShape(18.dp), color = MaterialTheme.colorScheme.surface) {
        Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Surface(shape = CircleShape, color = MaterialTheme.colorScheme.primaryContainer) {
                Icon(Icons.Rounded.Language, null, Modifier.padding(10.dp), tint = MaterialTheme.colorScheme.primary)
            }
            Spacer(Modifier.size(12.dp))
            Text(
                tr("Ngôn ngữ", "Language"),
                style = MaterialTheme.typography.titleMedium,
                modifier = Modifier.weight(1f),
            )
            LangChip("Tiếng Việt", selected = current == AppLang.VI) { onPick("vi") }
            Spacer(Modifier.size(8.dp))
            LangChip("English", selected = current == AppLang.EN) { onPick("en") }
        }
    }
}

@Composable
private fun LangChip(label: String, selected: Boolean, onClick: () -> Unit) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(12.dp),
        color = if (selected) LmBlue else MaterialTheme.colorScheme.surfaceVariant,
    ) {
        Text(
            label,
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
            style = MaterialTheme.typography.labelLarge,
            color = if (selected) androidx.compose.ui.graphics.Color.White
                    else MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
private fun ProfileStat(value: String, label: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(value, color = LmAmber, style = MaterialTheme.typography.headlineMedium)
        Text(label, color = androidx.compose.ui.graphics.Color.White.copy(alpha = .7f), style = MaterialTheme.typography.labelMedium)
    }
}

@Composable
private fun ProfileMenu(icon: ImageVector, title: String, subtitle: String, onClick: () -> Unit = {}) {
    Surface(onClick = onClick, shape = RoundedCornerShape(18.dp), color = MaterialTheme.colorScheme.surface) {
        Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Surface(shape = CircleShape, color = MaterialTheme.colorScheme.primaryContainer) {
                Icon(icon, null, Modifier.padding(10.dp), tint = MaterialTheme.colorScheme.primary)
            }
            Spacer(Modifier.size(12.dp))
            Column(Modifier.weight(1f)) {
                Text(title, style = MaterialTheme.typography.titleMedium)
                Text(subtitle, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Icon(Icons.Rounded.ArrowForwardIos, null, Modifier.size(16.dp), tint = MaterialTheme.colorScheme.outline)
        }
    }
}
