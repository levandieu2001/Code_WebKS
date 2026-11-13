package vn.baynuistay.core.notify

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import vn.baynuistay.MainActivity
import vn.baynuistay.R

// ════════════════════════════════════════════════════════════
// THÔNG BÁO TRÊN MÁY
// ════════════════════════════════════════════════════════════
// App hỏi máy chủ theo chu kỳ rồi tự bắn thông báo tại máy. Nhờ vậy tài xế
// nghe được chuông khi app chạy nền, không phải dán mắt vào màn hình.
//
// GIỚI HẠN PHẢI NÓI RÕ: đây KHÔNG phải push thật. Tắt hẳn app (vuốt khỏi danh
// sách gần đây) là tiến trình chết, không còn ai hỏi máy chủ nên không nhận
// được gì. Muốn như Grab thì phải nối Firebase Cloud Messaging — chỗ cắm đã
// để sẵn ở lib/notifications.js phía máy chủ.

object AppNotifier {

    /** Chuyến mới: kênh riêng, chuông to, ưu tiên cao — tài xế mất đơn là mất tiền. */
    const val CHANNEL_RIDE = "baynui_ride_offers"

    /** Mọi thứ còn lại: đơn được duyệt, đã nhận cọc… */
    const val CHANNEL_GENERAL = "baynui_general"

    private var nextId = 1000

    fun ensureChannels(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = context.getSystemService(NotificationManager::class.java) ?: return

        val ride = NotificationChannel(
            CHANNEL_RIDE,
            "Chuyến mới",
            NotificationManager.IMPORTANCE_HIGH,
        ).apply {
            description = "Báo khi có khách đặt xe gần bạn"
            enableVibration(true)
            vibrationPattern = longArrayOf(0, 400, 200, 400)
            setSound(
                RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION),
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build(),
            )
        }

        val general = NotificationChannel(
            CHANNEL_GENERAL,
            "Cập nhật đơn hàng",
            NotificationManager.IMPORTANCE_DEFAULT,
        ).apply { description = "Tài xế nhận chuyến, xác nhận cọc, đơn được duyệt…" }

        manager.createNotificationChannel(ride)
        manager.createNotificationChannel(general)
    }

    /** Android 13 trở lên phải xin quyền mới hiện được thông báo. */
    fun canNotify(context: Context): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return true
        return ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.POST_NOTIFICATIONS,
        ) == PackageManager.PERMISSION_GRANTED
    }

    /**
     * Bắn một thông báo.
     * @param key khoá duy nhất (id thông báo từ máy chủ) — dùng làm id để cùng
     * một sự kiện hỏi lại nhiều lần cũng chỉ hiện một lần, không dội chuông liên tục.
     */
    fun show(
        context: Context,
        title: String,
        body: String,
        urgent: Boolean = false,
        key: String = "",
    ) {
        if (!canNotify(context)) return
        ensureChannels(context)

        val open = PendingIntent.getActivity(
            context,
            0,
            Intent(context, MainActivity::class.java)
                .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val note = NotificationCompat.Builder(
            context,
            if (urgent) CHANNEL_RIDE else CHANNEL_GENERAL,
        )
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(if (urgent) NotificationCompat.PRIORITY_HIGH else NotificationCompat.PRIORITY_DEFAULT)
            .setCategory(if (urgent) NotificationCompat.CATEGORY_CALL else NotificationCompat.CATEGORY_STATUS)
            .setAutoCancel(true)
            .setContentIntent(open)
            .build()

        val id = if (key.isNotBlank()) key.hashCode() else nextId++
        runCatching { NotificationManagerCompat.from(context).notify(id, note) }
    }
}
