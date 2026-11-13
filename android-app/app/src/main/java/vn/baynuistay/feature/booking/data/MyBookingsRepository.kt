package vn.baynuistay.feature.booking.data

import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.first
import vn.baynuistay.core.local.OrderDao
import vn.baynuistay.core.local.OrderEntity
import vn.baynuistay.core.local.TokenStore
import vn.baynuistay.core.network.BayNuiApi
import vn.baynuistay.core.network.CancelBookingRequest
import vn.baynuistay.core.network.MyBookingDto
import vn.baynuistay.core.network.PaymentClaimRequest
import vn.baynuistay.core.network.PaymentDto
import vn.baynuistay.core.network.ReviewRequest
import vn.baynuistay.core.network.TrackResponse

/**
 * Đơn của khách — dùng đúng các endpoint mà trang "Đơn của tôi" trên web gọi,
 * nên đơn đặt ở web mở trên app vẫn thấy, và ngược lại.
 *
 * Có hai đường tra:
 *   - Đăng nhập rồi → /v1/my/bookings, gom đơn của mọi thiết bị.
 *   - Chưa đăng nhập → /v1/bookings/lookup?phone=…, vì phần lớn khách đặt xe
 *     không tạo tài khoản, mà vẫn phải xem được xe đang tới đâu.
 */
@Singleton
class MyBookingsRepository @Inject constructor(
    private val api: BayNuiApi,
    private val tokenStore: TokenStore,
    private val orderDao: OrderDao,
) {
    /**
     * Số điện thoại để tra. Ưu tiên số đã lưu; chưa có thì lấy từ đơn gần nhất
     * đặt trên chính máy này — khách vừa đặt xong mở màn này ra là thấy đơn,
     * không phải gõ lại số.
     */
    suspend fun savedPhone(): String {
        val saved = tokenStore.bookingPhone.first()
        if (saved.isNotBlank()) return saved
        return orderDao.observeAll().first().firstOrNull()?.phone?.filter { it.isDigit() } ?: ""
    }

    /**
     * Đơn đã lưu trên máy — dùng khi mất mạng. Trạng thái ở đây là trạng thái
     * lúc đặt, nên chỉ dùng làm bản dự phòng, có mạng thì luôn lấy theo máy chủ.
     */
    suspend fun cached(): List<OrderEntity> = orderDao.observeAll().first()

    suspend fun isSignedIn(): Boolean = !tokenStore.token.first().isNullOrBlank()

    /** Đơn của tài khoản đang đăng nhập. */
    suspend fun mine(): List<MyBookingDto> = api.myBookings().data

    /** Tra theo số điện thoại; nhớ số lại cho lần sau. */
    suspend fun lookup(phone: String, code: String = ""): List<MyBookingDto> {
        val rows = api.lookupBookings(phone.filter { it.isDigit() }, code.trim().uppercase()).data
        tokenStore.saveBookingPhone(phone.filter { it.isDigit() })
        return rows
    }

    /** Vị trí xe + quãng đường còn lại. Chỉ có ý nghĩa với đơn đặt xe. */
    suspend fun track(bookingId: String): TrackResponse = api.trackBooking(bookingId)

    suspend fun cancel(bookingId: String, phone: String, reason: String): String =
        api.cancelBooking(bookingId, CancelBookingRequest(phone = phone, reason = reason)).message

    /** Tiền cọc và mã QR chuyển khoản — cùng endpoint web dùng. */
    suspend fun payment(bookingId: String, phone: String): PaymentDto =
        api.payment(bookingId, phone.filter { it.isDigit() })

    /** Khách báo đã chuyển. Chưa phải là đã thu được tiền, chủ nhà còn phải đối chiếu. */
    suspend fun claimPayment(bookingId: String, phone: String): String =
        api.claimPayment(bookingId, PaymentClaimRequest(phone = phone.filter { it.isDigit() })).message

    /** Gửi đánh giá sau khi dùng xong dịch vụ. */
    suspend fun review(
        bookingId: String,
        phone: String,
        targetType: String,
        targetId: String,
        rating: Int,
        comment: String,
    ): String = api.createReview(
        ReviewRequest(
            bookingId = bookingId,
            phone = phone.filter { it.isDigit() },
            targetType = targetType,
            targetId = targetId,
            rating = rating,
            comment = comment,
        ),
    ).message

    /** Thông báo của khách, tra theo số điện thoại đã đặt. */
    suspend fun notifications(phone: String) =
        api.guestNotifications(phone.filter { it.isDigit() })
}
