package vn.baynuistay.core.notify

import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import vn.baynuistay.core.local.TokenStore
import vn.baynuistay.core.network.BayNuiApi
import vn.baynuistay.core.network.DeviceRegisterRequest

// ════════════════════════════════════════════════════════════
// NHẬN PUSH TỪ FIREBASE
// ════════════════════════════════════════════════════════════
// Đây là thứ khiến tài xế nghe được chuyến kể cả khi đã VUỐT TẮT app và tắt
// màn hình. Android tự đánh thức dịch vụ này khi có tin từ Google, không cần
// app đang chạy.
//
// Vì sao vẫn tự vẽ thông báo thay vì để Firebase tự hiện:
// Firebase chỉ tự hiện khi app đang tắt; app đang mở thì tin rơi vào
// onMessageReceived và KHÔNG hiện gì cả. Vẽ tay ở đây thì hai trường hợp
// giống hệt nhau, và chuyến mới luôn vào đúng kênh chuông to.

@AndroidEntryPoint
class BayNuiMessagingService : FirebaseMessagingService() {

    @Inject lateinit var api: BayNuiApi
    @Inject lateinit var tokenStore: TokenStore

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    /** Firebase cấp token mới (cài lại app, xoá dữ liệu, đổi máy…). */
    override fun onNewToken(token: String) {
        scope.launch { registerToken(api, tokenStore, token) }
    }

    override fun onMessageReceived(message: RemoteMessage) {
        val kind = message.data["kind"] ?: ""
        val title = message.notification?.title ?: message.data["title"] ?: "LOCALMATE"
        val body = message.notification?.body ?: message.data["body"] ?: ""

        AppNotifier.show(
            context = applicationContext,
            title = title,
            body = body,
            // Chuyến mới kêu to và rung; còn lại báo nhẹ
            urgent = kind == "ride_offer",
            // Dùng id thông báo của máy chủ làm khoá, để cùng một sự kiện
            // không hiện hai lần (push tới + app tự hỏi cũng thấy)
            key = message.data["notification_id"] ?: message.messageId ?: "",
        )
    }

    companion object {
        /**
         * Báo token của máy này cho máy chủ.
         *
         * Đăng nhập đối tác thì máy chủ tự gắn vào đúng đối tác đó; khách
         * thường thì gắn theo số điện thoại đã dùng khi đặt. Chưa có cả hai
         * thì bỏ qua — không có cách nào biết máy này của ai để mà gửi.
         */
        suspend fun registerToken(api: BayNuiApi, tokenStore: TokenStore, token: String) {
            val phone = runCatching { tokenStore.bookingPhoneOnce() }.getOrDefault("")
            runCatching {
                api.registerDevice(DeviceRegisterRequest(token = token, phone = phone))
            }
        }
    }
}
