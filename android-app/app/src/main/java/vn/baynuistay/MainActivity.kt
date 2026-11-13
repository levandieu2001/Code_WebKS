package vn.baynuistay

import android.Manifest
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.lifecycle.lifecycleScope
import com.google.firebase.messaging.FirebaseMessaging
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import vn.baynuistay.core.local.TokenStore
import vn.baynuistay.core.network.BayNuiApi
import vn.baynuistay.core.notify.AppNotifier
import vn.baynuistay.core.notify.BayNuiMessagingService
import vn.baynuistay.core.ui.lang.AppLang
import vn.baynuistay.core.ui.lang.AppLangHolder
import vn.baynuistay.core.ui.lang.provideLang
import vn.baynuistay.core.ui.theme.BayNuiTheme
import vn.baynuistay.core.update.UpdateDialog
import vn.baynuistay.navigation.BayNuiApp

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject lateinit var api: BayNuiApi
    @Inject lateinit var tokenStore: TokenStore

    // Android 13 trở lên bắt buộc xin quyền mới hiện được thông báo. Không xin
    // thì app vẫn chạy, chỉ là tài xế không nghe chuông khi có chuyến — hỏng
    // đúng thứ quan trọng nhất mà chẳng có lỗi nào báo ra.
    private val askNotify = registerForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { /* từ chối cũng không sao, app vẫn dùng được bình thường */ }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        AppNotifier.ensureChannels(this)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && !AppNotifier.canNotify(this)) {
            askNotify.launch(Manifest.permission.POST_NOTIFICATIONS)
        }

        // Báo token FCM của máy này cho máy chủ mỗi lần mở app. Token có thể
        // đổi (cài lại app, khôi phục máy), và số điện thoại của khách cũng có
        // thể vừa được nhập, nên đăng ký lại mỗi lần là cách chắc chắn nhất.
        lifecycleScope.launch {
            runCatching {
                val token = FirebaseMessaging.getInstance().token.await()
                BayNuiMessagingService.registerToken(api, tokenStore, token)
            }
        }

        setContent {
            // Ngôn ngữ đọc từ ổ lưu, thu thập theo Flow nên khách bấm đổi ở tab
            // Cá nhân là toàn bộ app vẽ lại ngay — không phải khởi động lại app.
            val lang by tokenStore.language.collectAsState(initial = "vi")
            val appLang = AppLang.from(lang)

            // ViewModel và lớp mạng cũng sinh câu chữ cho khách đọc nhưng không
            // ở trong cây Compose — chép sang chỗ chúng đọc được.
            AppLangHolder.current = appLang

            BayNuiTheme {
                CompositionLocalProvider(provideLang(appLang)) {
                    BayNuiApp()
                    // Đặt ở gốc cây giao diện: hộp thoại cập nhật hiện được dù
                    // khách đang ở màn hình nào.
                    UpdateDialog()
                }
            }
        }
    }
}
