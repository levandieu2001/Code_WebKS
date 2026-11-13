package vn.baynuistay.feature.passport.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import vn.baynuistay.core.local.TokenStore
import vn.baynuistay.core.location.LocationProvider
import vn.baynuistay.core.network.StampClaimRequest
import vn.baynuistay.core.network.ApiError
import vn.baynuistay.core.network.BayNuiApi
import vn.baynuistay.core.network.PassportResponse

data class PassportUiState(
    val loading: Boolean = true,
    val book: PassportResponse? = null,
    val error: String? = null,
    // Đang xin vị trí / gọi máy chủ sau khi quét xong
    val stamping: Boolean = false,
    // Kết quả lần đóng dấu vừa rồi, hiện trong hộp thoại
    val stampResult: String? = null,
    val stampOk: Boolean = false,
)

/**
 * Hộ chiếu LOCALMATE.
 *
 * Trước đây màn này là 6 con dấu viết cứng trong mã nguồn — bấm vào là lộ ngay.
 * Giờ lấy đúng dữ liệu mà web dùng, nên khách đóng dấu ngoài thực địa xong mở
 * app ra là thấy.
 */
@HiltViewModel
class PassportViewModel @Inject constructor(
    private val api: BayNuiApi,
    private val tokenStore: TokenStore,
    private val locationProvider: LocationProvider,
) : ViewModel() {

    private val _state = MutableStateFlow(PassportUiState())
    val state: StateFlow<PassportUiState> = _state.asStateFlow()

    init { load() }

    fun load() {
        viewModelScope.launch {
            _state.update { it.copy(loading = true, error = null) }
            // Đăng nhập rồi thì máy chủ nhận ra qua token; chưa thì tra bằng
            // số điện thoại đã dùng lúc đóng dấu.
            val phone = runCatching { tokenStore.bookingPhoneOnce() }.getOrDefault("")
            runCatching { api.passport(phone) }
                .onSuccess { book -> _state.update { it.copy(loading = false, book = book) } }
                .onFailure { e -> _state.update { it.copy(loading = false, error = ApiError.message(e)) } }
        }
    }

    /**
     * Xử lý nội dung vừa quét được từ mã QR.
     *
     * Mã QR dán tại điểm trỏ tới một đường link dạng
     *     https://…/dau.html?s=<mã điểm>&k=<mã bí mật>
     * Trang web đó dùng cho khách KHÔNG cài app. Khách đã cài app thì làm ngay
     * trong app cho gọn — nhưng vẫn phải gửi kèm toạ độ, vì máy chủ chỉ đóng
     * dấu khi khách thật sự có mặt tại điểm.
     */
    fun onScanned(raw: String) {
        val slug = paramOf(raw, "s")
        val code = paramOf(raw, "k")

        if (slug.isBlank() || code.isBlank()) {
            _state.update {
                it.copy(
                    stampResult = "Mã này không phải mã đóng dấu của LOCALMATE. "
                        + "Bạn quét đúng tấm dán tại điểm nhé.",
                    stampOk = false,
                )
            }
            return
        }

        viewModelScope.launch {
            _state.update { it.copy(stamping = true, stampResult = null) }

            if (!locationProvider.hasPermission()) {
                _state.update {
                    it.copy(
                        stamping = false,
                        stampResult = "Cần cho phép truy cập vị trí. Con dấu chỉ đóng được khi "
                            + "xác nhận bạn đang đứng tại điểm.",
                        stampOk = false,
                    )
                }
                return@launch
            }

            val here = runCatching { locationProvider.current() }.getOrNull()
            if (here == null) {
                _state.update {
                    it.copy(
                        stamping = false,
                        stampResult = "Chưa lấy được vị trí. Bạn ra chỗ thoáng rồi thử lại giúp mình.",
                        stampOk = false,
                    )
                }
                return@launch
            }

            val phone = runCatching { tokenStore.bookingPhoneOnce() }.getOrDefault("")
            runCatching {
                api.claimStamp(
                    StampClaimRequest(
                        slug = slug,
                        code = code,
                        lat = here.latitude,
                        lng = here.longitude,
                        phone = phone,
                    ),
                )
            }
                .onSuccess { res ->
                    _state.update {
                        it.copy(
                            stamping = false,
                            book = res.passport,
                            stampResult = res.message.ifBlank { "Đã đóng dấu!" },
                            stampOk = true,
                        )
                    }
                }
                .onFailure { e ->
                    _state.update {
                        it.copy(stamping = false, stampResult = ApiError.message(e), stampOk = false)
                    }
                }
        }
    }

    fun dismissStampResult() = _state.update { it.copy(stampResult = null) }

    /** Rút một tham số ra khỏi đường link đã quét. */
    private fun paramOf(url: String, key: String): String =
        Regex("[?&]${'$'}key=([^&#]+)").find(url)?.groupValues?.get(1).orEmpty()
}
