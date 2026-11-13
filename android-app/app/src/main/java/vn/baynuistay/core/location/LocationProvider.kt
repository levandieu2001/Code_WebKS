package vn.baynuistay.core.location

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationManager
import android.os.Build
import androidx.core.content.ContextCompat
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton
import kotlin.coroutines.resume
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withTimeoutOrNull

/**
 * Lấy vị trí hiện tại bằng LocationManager của hệ thống.
 *
 * Cố tình KHÔNG dùng Google Play Services Location để khỏi thêm phụ thuộc —
 * với nhu cầu "lấy điểm đón gần đúng" thì độ chính xác này là đủ.
 */
@Singleton
class LocationProvider @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    fun hasPermission(): Boolean =
        ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED ||
            ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) ==
            PackageManager.PERMISSION_GRANTED

    /** Trả về vị trí, hoặc null nếu thiếu quyền / tắt GPS / quá thời gian chờ. */
    suspend fun current(timeoutMs: Long = 12_000): Location? {
        if (!hasPermission()) return null
        val manager = context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager ?: return null

        // Vị trí đã biết gần đây — trả ngay nếu còn mới (dưới 2 phút)
        lastKnown(manager)?.let { last ->
            if (System.currentTimeMillis() - last.time < 120_000) return last
        }

        return withTimeoutOrNull(timeoutMs) { requestFresh(manager) } ?: lastKnown(manager)
    }

    private fun lastKnown(manager: LocationManager): Location? = try {
        listOf(LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER, LocationManager.PASSIVE_PROVIDER)
            .mapNotNull { provider -> runCatching { manager.getLastKnownLocation(provider) }.getOrNull() }
            .maxByOrNull { it.time }
    } catch (security: SecurityException) {
        null
    }

    private suspend fun requestFresh(manager: LocationManager): Location? =
        suspendCancellableCoroutine { continuation ->
            val provider = when {
                manager.isProviderEnabled(LocationManager.GPS_PROVIDER) -> LocationManager.GPS_PROVIDER
                manager.isProviderEnabled(LocationManager.NETWORK_PROVIDER) -> LocationManager.NETWORK_PROVIDER
                else -> null
            }
            if (provider == null) {
                continuation.resume(null)
                return@suspendCancellableCoroutine
            }

            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    val signal = android.os.CancellationSignal()
                    continuation.invokeOnCancellation { signal.cancel() }
                    manager.getCurrentLocation(
                        provider,
                        signal,
                        context.mainExecutor,
                    ) { location -> if (continuation.isActive) continuation.resume(location) }
                } else {
                    @Suppress("DEPRECATION")
                    manager.requestSingleUpdate(
                        provider,
                        { location -> if (continuation.isActive) continuation.resume(location) },
                        context.mainLooper,
                    )
                }
            } catch (security: SecurityException) {
                continuation.resume(null)
            }
        }
}
