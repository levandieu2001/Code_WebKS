package vn.baynuistay.core.notify

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import vn.baynuistay.MainActivity
import vn.baynuistay.R
import vn.baynuistay.core.network.BayNuiApi

// ════════════════════════════════════════════════════════════
// DỊCH VỤ CHẠY NỀN CHO TÀI XẾ
// ════════════════════════════════════════════════════════════
// VÌ SAO PHẢI CÓ:
// Ban đầu app chỉ hỏi máy chủ trong ViewModel. Đo thực tế trên máy Android 14
// thì thu nhỏ app khoảng vài giây là hệ thống ĐÓNG BĂNG tiến trình — tiến trình
// vẫn còn trong danh sách nhưng coroutine ngừng chạy, nên chuyến nổ ra mà tài
// xế không hề nghe chuông. Với nghề chạy xe thì mất đơn là mất tiền thật.
//
// Dịch vụ nền có thông báo thường trực là cách các app gọi xe vẫn làm: hệ thống
// không đóng băng tiến trình đang chạy foreground service, và tài xế nhìn thấy
// rõ ràng app đang bật nhận đơn (không có chuyện chạy lén sau lưng).
//
// VẪN CÒN GIỚI HẠN: tài xế vuốt tắt app khỏi danh sách gần đây thì dịch vụ cũng
// dừng. Muốn nhận cả khi tắt hẳn thì phải nối FCM — chỗ cắm đã để sẵn ở
// lib/notifications.js bên máy chủ.

@AndroidEntryPoint
class DriverOnlineService : Service() {

    @Inject lateinit var api: BayNuiApi

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var pollJob: Job? = null

    // Thông báo nào đã kêu rồi thì thôi, không dội lại mỗi vòng hỏi
    private val seen = mutableSetOf<String>()
    private var since = ""

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startForeground(ONGOING_ID, ongoingNotification())
        startPolling()
        // START_STICKY: hệ thống thu hồi bộ nhớ rồi thì bật lại giúp
        return START_STICKY
    }

    override fun onDestroy() {
        pollJob?.cancel()
        scope.cancel()
        super.onDestroy()
    }

    private fun startPolling() {
        if (pollJob?.isActive == true) return
        pollJob = scope.launch {
            // Vòng ĐẦU TIÊN chỉ ghi nhận mốc thời gian, không kêu chuông.
            // Máy chủ giữ thông báo 7 ngày, nên nếu kêu hết từ đầu thì tài xế
            // vừa bật nhận đơn đã bị dội một tràng thông báo của mấy hôm trước.
            var first = true

            while (isActive) {
                runCatching { api.partnerNotifications(since) }
                    .getOrNull()
                    ?.data
                    ?.reversed()          // cũ trước, mới sau, cho đúng thứ tự
                    ?.forEach { n ->
                        if (n.id in seen) return@forEach
                        seen += n.id
                        if (n.createdAt > since) since = n.createdAt
                        if (first) return@forEach

                        AppNotifier.show(
                            context = applicationContext,
                            title = n.title,
                            body = n.body,
                            // Chuyến mới thì kêu to, còn lại báo nhẹ
                            urgent = n.kind == "ride_offer",
                            key = n.id,
                        )
                    }
                first = false
                delay(POLL_MS)
            }
        }
    }

    /** Thông báo thường trực — bắt buộc phải có với foreground service. */
    private fun ongoingNotification(): Notification {
        ensureOngoingChannel()
        val open = PendingIntent.getActivity(
            this,
            1,
            Intent(this, MainActivity::class.java)
                .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        return NotificationCompat.Builder(this, CHANNEL_ONGOING)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle("Đang nhận đơn")
            .setContentText("LOCALMATE sẽ báo ngay khi có khách gần bạn.")
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .setContentIntent(open)
            .build()
    }

    private fun ensureOngoingChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = getSystemService(NotificationManager::class.java) ?: return
        manager.createNotificationChannel(
            NotificationChannel(
                CHANNEL_ONGOING,
                "Đang nhận đơn",
                // Thấp để không kêu chuông; đây chỉ là dấu hiệu app đang chạy
                NotificationManager.IMPORTANCE_LOW,
            ).apply { description = "Hiện khi bạn đang bật nhận đơn" },
        )
    }

    companion object {
        private const val CHANNEL_ONGOING = "baynui_driver_online"
        private const val ONGOING_ID = 4242
        private const val POLL_MS = 5_000L

        fun start(context: Context) {
            val intent = Intent(context, DriverOnlineService::class.java)
            runCatching {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(intent)
                } else {
                    context.startService(intent)
                }
            }
        }

        fun stop(context: Context) {
            runCatching { context.stopService(Intent(context, DriverOnlineService::class.java)) }
        }
    }
}
