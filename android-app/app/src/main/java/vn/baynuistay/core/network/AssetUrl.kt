package vn.baynuistay.core.network

import vn.baynuistay.BuildConfig

/**
 * Ghép đường dẫn tương đối với địa chỉ backend đang cấu hình.
 *
 * Trước đây các URL ảnh bị viết cứng "http://10.0.2.2:3000/..." — địa chỉ này
 * CHỈ tồn tại trên máy ảo, nên cắm điện thoại thật là ảnh trắng hết. Dùng hàm
 * này để ảnh luôn theo đúng API_BASE_URL của bản build.
 */
object AssetUrl {
    private val base = BuildConfig.API_BASE_URL.trimEnd('/')

    operator fun invoke(path: String): String = when {
        path.isBlank() -> ""
        path.startsWith("http://", ignoreCase = true) -> path
        path.startsWith("https://", ignoreCase = true) -> path
        path.startsWith("data:", ignoreCase = true) -> path
        else -> "$base/${path.trimStart('/')}"
    }
}
