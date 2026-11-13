package vn.baynuistay.core.network

import java.io.IOException
import java.net.SocketTimeoutException
import kotlinx.serialization.json.Json
import retrofit2.HttpException
import vn.baynuistay.core.ui.lang.AppLangHolder.pick

/**
 * Đổi exception kỹ thuật thành câu hiển thị được cho người dùng.
 *
 * Backend trả lỗi theo dạng { "error": { "code": "...", "message": "..." } }
 * nên ưu tiên lấy đúng câu backend gửi về — câu đó sát tình huống hơn bất kỳ
 * câu chung chung nào ở đây. Nhược điểm: câu của backend hiện vẫn là tiếng
 * Việt, nên khách dùng tiếng Anh có thể gặp một câu tiếng Việt lọt qua. Phần
 * dự phòng bên dưới thì đã có cả hai thứ tiếng.
 */
object ApiError {
    private val json = Json { ignoreUnknownKeys = true }

    fun message(throwable: Throwable): String = when (throwable) {
        is HttpException -> fromHttp(throwable)
        is SocketTimeoutException -> pick(
            "Máy chủ phản hồi quá chậm. Bạn thử lại giúp mình nhé.",
            "The server took too long to answer. Please try again.",
        )
        is IOException -> pick(
            "Không có kết nối mạng. Kiểm tra wifi/4G rồi thử lại.",
            "No internet connection. Check your wifi or mobile data and try again.",
        )
        else -> throwable.message ?: pick(
            "Có lỗi xảy ra, vui lòng thử lại.",
            "Something went wrong. Please try again.",
        )
    }

    private fun fromHttp(exception: HttpException): String {
        val body = runCatching { exception.response()?.errorBody()?.string() }.getOrNull()
        val parsed = body
            ?.takeIf { it.isNotBlank() }
            ?.let { runCatching { json.decodeFromString<ApiErrorEnvelope>(it) }.getOrNull() }

        parsed?.error?.message?.takeIf { it.isNotBlank() }?.let { return it }

        return when (exception.code()) {
            400 -> pick(
                "Thông tin chưa hợp lệ, bạn kiểm tra lại giúp mình.",
                "Some details are not valid. Please check them again.",
            )
            404 -> pick(
                "Không tìm thấy dữ liệu. Máy chủ có thể chưa bật đúng phiên bản.",
                "Data not found. The server may be running a different version.",
            )
            429 -> pick(
                "Bạn thao tác hơi nhanh, chờ một chút rồi thử lại nhé.",
                "That was a bit fast. Wait a moment and try again.",
            )
            in 500..599 -> pick(
                "Máy chủ đang gặp sự cố. Thử lại sau ít phút.",
                "The server is having trouble. Try again in a few minutes.",
            )
            else -> pick(
                "Có lỗi xảy ra (HTTP ${exception.code()}).",
                "Something went wrong (HTTP ${exception.code()}).",
            )
        }
    }
}
