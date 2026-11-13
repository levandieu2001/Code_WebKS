package vn.baynuistay.feature.chat.ui

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.wrapContentWidth
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.ArrowBack
import androidx.compose.material.icons.rounded.AutoAwesome
import androidx.compose.material.icons.rounded.Send
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import vn.baynuistay.R
import vn.baynuistay.core.ui.lang.tr
import vn.baynuistay.core.ui.theme.LmNavy
import vn.baynuistay.core.ui.theme.LmAmber
import vn.baynuistay.core.ui.theme.LmMuted
import vn.baynuistay.core.ui.theme.LmBlue

/**
 * Màn hình trợ lý chat.
 *
 * Trên web ô chat là một cửa sổ nhỏ nổi ở góc. Trong app thì làm hẳn một màn
 * hình riêng: màn điện thoại vốn đã hẹp, một cửa sổ nổi chiếm nửa màn mà vẫn
 * che nội dung phía dưới thì khó dùng hơn là mở thẳng ra.
 *
 * @param onAction mở màn hình mà bot gợi ý (xem phòng, đặt xe, tạo lịch trình…).
 */
@Composable
fun ChatScreen(
    onBack: () -> Unit,
    onAction: (String) -> Unit = {},
    viewModel: ChatViewModel = hiltViewModel(),
) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val listState = rememberLazyListState()

    // Có tin mới thì tự cuộn xuống đáy. Thiếu cái này thì bot trả lời xong
    // khách vẫn đứng ở giữa cuộc trò chuyện và tưởng bot chưa trả lời.
    LaunchedEffect(state.lines.size, state.sending) {
        val last = state.lines.lastIndex
        if (last >= 0) listState.animateScrollToItem(last)
    }

    Column(Modifier.fillMaxSize().imePadding()) {
        ChatHeader(onBack, offline = state.offline)

        LazyColumn(
            state = listState,
            modifier = Modifier.fillMaxWidth().weight(1f),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            items(state.lines) { line -> Bubble(line) }
            if (state.sending) item { TypingBubble() }
        }

        // Nút mở thẳng màn hình liên quan — bot nói "xem phòng đi" thì phải
        // bấm được luôn, chứ bắt khách tự tìm lại tab là mất mạch.
        state.action?.let { action ->
            ActionButton(action) {
                viewModel.consumeAction()
                onAction(action)
            }
        }

        if (state.quickReplies.isNotEmpty()) {
            LazyRow(
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                items(state.quickReplies) { reply ->
                    Surface(
                        onClick = { viewModel.sendQuickReply(reply) },
                        shape = RoundedCornerShape(50),
                        color = MaterialTheme.colorScheme.surface,
                        border = androidx.compose.foundation.BorderStroke(1.5.dp, LmBlue),
                    ) {
                        Text(
                            reply,
                            Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
                            style = MaterialTheme.typography.labelLarge,
                            color = LmBlue,
                        )
                    }
                }
            }
        }

        InputBar(
            draft = state.draft,
            sending = state.sending,
            onDraft = viewModel::setDraft,
            onSend = { viewModel.send() },
        )
    }
}

@Composable
private fun ChatHeader(onBack: () -> Unit, offline: Boolean) {
    Surface(color = LmNavy) {
        Row(
            Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            IconButton(onClick = onBack) {
                Icon(Icons.Rounded.ArrowBack, tr("Quay lại", "Back"), tint = Color.White)
            }
            Image(
                painter = painterResource(R.drawable.ic_chatbot),
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier.size(40.dp).clip(CircleShape),
            )
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Text(
                    tr("Trợ lý Bảy Núi", "Bảy Núi Assistant"),
                    style = MaterialTheme.typography.titleMedium,
                    color = Color.White,
                )
                // Nói thật là đang chạy chế độ dự phòng. Câu trả lời lúc đó
                // mộc hơn nhiều, khách nên biết để không tưởng bot dở đi.
                Text(
                    if (offline) tr("Chế độ dự phòng", "Fallback mode")
                    else tr("Đang trực tuyến", "Online"),
                    style = MaterialTheme.typography.bodySmall,
                    color = if (offline) LmAmber else Color.White.copy(alpha = .65f),
                )
            }
        }
    }
}

@Composable
private fun Bubble(line: ChatLine) {
    Row(
        Modifier.fillMaxWidth(),
        horizontalArrangement = if (line.fromUser) Arrangement.End else Arrangement.Start,
    ) {
        Surface(
            shape = RoundedCornerShape(
                topStart = 16.dp,
                topEnd = 16.dp,
                bottomStart = if (line.fromUser) 16.dp else 4.dp,
                bottomEnd = if (line.fromUser) 4.dp else 16.dp,
            ),
            color = if (line.fromUser) LmBlue else MaterialTheme.colorScheme.surface,
            modifier = Modifier.fillMaxWidth(.86f).wrapContentWidthSafely(line.fromUser),
        ) {
            Text(
                withBold(line.text),
                Modifier.padding(horizontal = 14.dp, vertical = 11.dp),
                style = MaterialTheme.typography.bodyMedium,
                color = if (line.fromUser) Color.White else MaterialTheme.colorScheme.onSurface,
            )
        }
    }
}

/**
 * Bong bóng chỉ rộng bằng nội dung, tối đa 86% bề ngang.
 *
 * `fillMaxWidth(.86f)` một mình sẽ kéo mọi bong bóng dài đúng 86% kể cả khi
 * chỉ có một chữ "Ừ" — nhìn như tin nhắn rỗng. `wrapContentWidth` bó lại vừa
 * chữ, còn 86f giữ vai trò trần trên.
 */
private fun Modifier.wrapContentWidthSafely(fromUser: Boolean): Modifier =
    this.wrapContentWidth(if (fromUser) Alignment.End else Alignment.Start)

@Composable
private fun TypingBubble() {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Start) {
        Surface(shape = RoundedCornerShape(16.dp, 16.dp, 4.dp, 16.dp), color = MaterialTheme.colorScheme.surface) {
            Row(
                Modifier.padding(horizontal = 14.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                CircularProgressIndicator(Modifier.size(14.dp), color = LmBlue, strokeWidth = 2.dp)
                Spacer(Modifier.width(10.dp))
                Text(
                    tr("Đang soạn…", "Typing…"),
                    style = MaterialTheme.typography.bodySmall,
                    color = LmMuted,
                )
            }
        }
    }
}

@Composable
private fun ActionButton(action: String, onClick: () -> Unit) {
    val label = when (action) {
        "open_rooms" -> tr("🛏  Xem & đặt phòng", "🛏  View & book rooms")
        "open_transport" -> tr("🚗  Đặt xe ngay", "🚗  Book a ride")
        "open_trip" -> tr("✨  Tạo lịch trình cho tôi", "✨  Create my itinerary")
        "open_tours" -> tr("🎒  Xem tour", "🎒  See tours")
        else -> return
    }

    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(14.dp),
        color = LmBlue,
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 6.dp),
    ) {
        Text(
            label,
            Modifier.padding(vertical = 13.dp),
            style = MaterialTheme.typography.titleSmall,
            color = Color.White,
            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
        )
    }
}

@Composable
private fun InputBar(
    draft: String,
    sending: Boolean,
    onDraft: (String) -> Unit,
    onSend: () -> Unit,
) {
    Surface(color = MaterialTheme.colorScheme.surface) {
        Row(
            Modifier
                .fillMaxWidth()
                .navigationBarsPadding()
                .padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            OutlinedTextField(
                value = draft,
                onValueChange = onDraft,
                modifier = Modifier.weight(1f),
                placeholder = { Text(tr("Hỏi mình điều gì đó…", "Ask me anything…")) },
                shape = RoundedCornerShape(22.dp),
                maxLines = 4,
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Send),
                keyboardActions = KeyboardActions(onSend = { onSend() }),
            )
            Spacer(Modifier.width(8.dp))
            Surface(
                onClick = onSend,
                enabled = draft.isNotBlank() && !sending,
                shape = CircleShape,
                color = if (draft.isNotBlank() && !sending) LmBlue
                        else MaterialTheme.colorScheme.surfaceVariant,
            ) {
                Box(Modifier.size(46.dp), contentAlignment = Alignment.Center) {
                    Icon(
                        Icons.Rounded.Send,
                        tr("Gửi", "Send"),
                        tint = if (draft.isNotBlank() && !sending) Color.White else LmMuted,
                    )
                }
            }
        }
    }
}

/**
 * Đổi **chữ đậm** kiểu markdown thành chữ đậm thật.
 *
 * Máy chủ dùng chung một câu trả lời cho cả web lẫn app, mà web thì render
 * markdown. Không xử lý ở đây thì khách đọc được nguyên dấu sao:
 * "**SunDay Núi Cấm**: 700.000đ" — nhìn như bot bị lỗi.
 *
 * Chỉ làm mỗi phần in đậm. Bot hiếm khi dùng cú pháp khác, và một bộ phân tích
 * markdown đầy đủ cho vài dòng chat là thừa.
 */
private fun withBold(input: String): AnnotatedString = buildAnnotatedString {
    val raw = tidyBullets(input)
    var i = 0
    while (i < raw.length) {
        val open = raw.indexOf("**", i)
        if (open < 0) {
            append(raw.substring(i))
            break
        }
        val close = raw.indexOf("**", open + 2)
        if (close < 0) {
            // Dấu sao lẻ không có cặp đóng — giữ nguyên, đừng nuốt mất chữ.
            append(raw.substring(i))
            break
        }
        append(raw.substring(i, open))
        withStyle(SpanStyle(fontWeight = FontWeight.Bold)) {
            append(raw.substring(open + 2, close))
        }
        i = close + 2
    }
}

/**
 * Đổi dấu đầu dòng markdown ("* ", "- ") thành "• ".
 *
 * Gemini lúc trả "•" sẵn, lúc lại trả "*   " tuỳ câu hỏi. Web có bộ render
 * markdown nên không thấy, còn ở đây thì dấu sao hiện nguyên ra màn hình.
 *
 * Chỉ đổi dấu ở ĐẦU dòng — dấu sao giữa câu có thể là phần của chữ in đậm
 * hoặc chính là nội dung khách cần đọc.
 */
private fun tidyBullets(raw: String): String = raw
    .lines()
    .joinToString("\n") { line ->
        val trimmed = line.trimStart()
        val indent = line.take(line.length - trimmed.length)
        when {
            trimmed.startsWith("* ") -> indent + "• " + trimmed.removePrefix("* ").trimStart()
            trimmed.startsWith("- ") -> indent + "• " + trimmed.removePrefix("- ").trimStart()
            else -> line
        }
    }
