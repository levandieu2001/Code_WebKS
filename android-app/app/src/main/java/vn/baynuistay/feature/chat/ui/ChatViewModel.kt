package vn.baynuistay.feature.chat.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import vn.baynuistay.core.local.TokenStore
import vn.baynuistay.core.network.ApiError
import vn.baynuistay.core.network.BayNuiApi
import vn.baynuistay.core.network.ChatRequest
import vn.baynuistay.core.network.ChatTurnDto
import vn.baynuistay.core.ui.lang.AppLangHolder.pick

/** Một dòng trong khung chat. `fromUser = false` là lời của bot. */
data class ChatLine(
    val text: String,
    val fromUser: Boolean,
)

data class ChatUiState(
    val lines: List<ChatLine> = emptyList(),
    val quickReplies: List<String> = emptyList(),
    /** Gợi ý mở màn hình khác: open_rooms, open_transport, open_trip, open_tours. */
    val action: String? = null,
    val draft: String = "",
    val sending: Boolean = false,
    /** Đúng khi câu trả lời cuối do lớp dự phòng trả lời, không phải AI. */
    val offline: Boolean = false,
)

/**
 * Trợ lý chat trong app.
 *
 * Gọi thẳng /api/chat — cùng endpoint với ô chat trên web — nên bot ở đây biết
 * đúng những gì bot trên web biết. Toàn bộ phần khó (đoán ngôn ngữ, ghép dữ
 * liệu phòng/thời tiết thật, chuyển sang OpenAI khi Gemini lỗi, rồi tới lớp trả
 * lời offline) đã nằm ở máy chủ; ở đây chỉ giữ mạch hội thoại và vẽ ra.
 */
@HiltViewModel
class ChatViewModel @Inject constructor(
    private val api: BayNuiApi,
    private val tokenStore: TokenStore,
) : ViewModel() {

    private val _state = MutableStateFlow(ChatUiState())
    val state: StateFlow<ChatUiState> = _state.asStateFlow()

    init {
        // Lời chào mở màn: không gọi máy chủ, để mở màn hình ra là thấy ngay
        // thay vì nhìn khung trắng chờ mạng.
        _state.update {
            it.copy(
                lines = listOf(
                    ChatLine(
                        pick(
                            "Chào bạn! Mình là trợ lý LOCALMATE 👋 Bạn cần hỏi gì về phòng, " +
                                "xe đưa đón, điểm tham quan hay thời tiết cũng được nhé.",
                            "Hi there! I'm the Bảy Núi assistant 👋 Ask me anything about rooms, " +
                                "rides, places to visit or the weather.",
                        ),
                        fromUser = false,
                    ),
                ),
                quickReplies = if (vn.baynuistay.core.ui.lang.AppLangHolder.current.isEn) {
                    listOf("Room prices", "Book a ride", "What to see")
                } else {
                    listOf("Giá phòng", "Đặt xe", "Có gì chơi")
                },
            )
        }
    }

    fun setDraft(value: String) = _state.update { it.copy(draft = value) }

    /** Bấm một nút gợi ý = gửi đúng câu đó đi. */
    fun sendQuickReply(text: String) = send(text)

    fun send(raw: String = _state.value.draft) {
        val text = raw.trim()
        if (text.isEmpty() || _state.value.sending) return

        // Vẽ câu của khách ra NGAY, đừng chờ máy chủ trả lời — gõ xong mà chữ
        // chưa hiện thì ai cũng tưởng app treo và bấm gửi lần nữa.
        _state.update {
            it.copy(
                lines = it.lines + ChatLine(text, fromUser = true),
                draft = "",
                quickReplies = emptyList(),
                action = null,
                sending = true,
            )
        }

        viewModelScope.launch {
            // Chỉ gửi vài lượt gần nhất: máy chủ cũng chỉ đọc 10 lượt cuối, gửi
            // cả cuộc trò chuyện chỉ tốn dữ liệu di động của khách.
            val history = _state.value.lines
                .dropLast(1)
                .takeLast(8)
                .map { ChatTurnDto(role = if (it.fromUser) "user" else "bot", text = it.text) }

            val lang = runCatching { tokenStore.language.first() }.getOrDefault("vi")

            try {
                val res = api.chat(ChatRequest(message = text, history = history, lang = lang))
                _state.update {
                    it.copy(
                        lines = it.lines + ChatLine(res.message, fromUser = false),
                        quickReplies = res.quickReplies,
                        action = res.action,
                        sending = false,
                        offline = res.model == "offline",
                    )
                }
            } catch (e: Exception) {
                // Mất mạng thì nói thẳng là mất mạng, kèm số điện thoại —
                // khách đang cần hỏi thì gọi được người thật vẫn hơn.
                _state.update {
                    it.copy(
                        lines = it.lines + ChatLine(
                            ApiError.message(e) + pick(
                                "\n\nBạn gọi hotline 0833 385 601 giúp mình nhé.",
                                "\n\nYou can also call us at 0833 385 601.",
                            ),
                            fromUser = false,
                        ),
                        sending = false,
                        offline = true,
                    )
                }
            }
        }
    }

    /** Đã bấm nút mở màn hình rồi thì bỏ gợi ý đi, khỏi hiện lại lần sau. */
    fun consumeAction() = _state.update { it.copy(action = null) }
}
