// ============================================================
// LOCALMATE — OpenAI (lớp dự phòng cho Gemini)
// ============================================================
// VÌ SAO CẦN:
// Gemini bản miễn phí chỉ cho ~20 lượt/ngày mỗi key. Bốn key là ~80 lượt/ngày
// — nghe nhiều nhưng một buổi demo trước ban giám khảo là hết. Hết lượt thì
// chatbot rơi xuống chế độ trả lời theo từ khoá, và câu trả lời tệ hẳn đi.
//
// Nên xếp ba lớp, cứ lớp trên hỏng thì xuống lớp dưới:
//   1. Gemini  — miễn phí, dùng trước cho đỡ tốn tiền
//   2. OpenAI  — trả tiền theo lượt, gánh khi Gemini hết lượt hoặc lỗi
//   3. Offline — dữ liệu thật của hệ thống, chạy kể cả khi mất mạng ra ngoài
//
// Mặc định dùng gpt-4o-mini: rẻ hơn gpt-4o khoảng 20 lần mà thừa sức trả lời
// câu hỏi du lịch, vì toàn bộ số liệu (giá phòng, thời tiết, lễ hội) đã được
// đưa sẵn vào prompt — mô hình chỉ cần diễn đạt lại cho tự nhiên.
// ============================================================

const API_URL = 'https://api.openai.com/v1/chat/completions';
const TIMEOUT_MS = Number(process.env.OPENAI_TIMEOUT_MS) || 20000;

// Ưu tiên tên riêng BAYNUI_OPENAI_KEY.
//
// Lý do: OPENAI_API_KEY là cái tên quá phổ biến, máy nào cũng có thể đã có sẵn
// một biến cùng tên do phần mềm khác đặt — và biến của HỆ ĐIỀU HÀNH luôn thắng
// giá trị trong .env. Đúng chuyện đã xảy ra: máy này có sẵn
// OPENAI_API_KEY=viet-tts nên khoá thật bị che, OpenAI trả 401 mà nhìn .env
// thì thấy khoá vẫn nằm nguyên đó.
//
// Kèm kiểm tra định dạng: khoá OpenAI luôn bắt đầu bằng "sk-". Không đúng dạng
// thì coi như chưa cấu hình, còn hơn là gọi API rồi ăn 401 mỗi lần.
const RAW_KEY = (process.env.BAYNUI_OPENAI_KEY || process.env.OPENAI_API_KEY || '').trim();
const KEY = RAW_KEY.startsWith('sk-') ? RAW_KEY : '';

if (RAW_KEY && !KEY) {
    console.warn('[openai] Khoá không đúng định dạng (phải bắt đầu bằng "sk-"). Bỏ qua.');
}
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

const enabled = Boolean(KEY);

// Hết tiền hoặc bị chặn thì nghỉ một tiếng, đừng gọi lại liên tục cho tốn thời
// gian chờ của khách.
let cooldownUntil = 0;
const COOLDOWN_MS = 60 * 60 * 1000;

const available = () => enabled && Date.now() >= cooldownUntil;

/**
 * Hỏi OpenAI.
 *
 * @param messages mảng { role, content } theo chuẩn OpenAI. Nơi gọi tự dựng
 * để giữ nguyên lịch sử hội thoại đang có.
 * @returns chuỗi trả lời.
 * @throws Error khi không gọi được — nơi gọi bắt lấy rồi xuống lớp offline.
 */
async function chat(messages, { maxTokens = 900, temperature = 0.7 } = {}) {
    if (!enabled) throw new Error('Chưa cấu hình OPENAI_API_KEY.');
    if (!available()) throw new Error('OpenAI đang tạm nghỉ sau lỗi trước đó.');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: MODEL,
                messages,
                max_tokens: maxTokens,
                temperature,
            }),
            signal: controller.signal,
        });

        const body = await res.json().catch(() => ({}));

        if (!res.ok) {
            const code = body?.error?.code || body?.error?.type || `HTTP ${res.status}`;
            // 401 sai khoá, 429 hết hạn mức, 402 hết tiền → nghỉ hẳn một tiếng
            if ([401, 402, 403, 429].includes(res.status)) {
                cooldownUntil = Date.now() + COOLDOWN_MS;
                console.warn(`[openai] tạm nghỉ 1 giờ vì ${code}`);
            }
            throw new Error(body?.error?.message || String(code));
        }

        const text = body?.choices?.[0]?.message?.content;
        if (!text) throw new Error('OpenAI trả về rỗng.');
        return text.trim();
    } finally {
        clearTimeout(timer);
    }
}

/** Trạng thái để trang quản trị biết lớp nào đang sống. */
const status = () => ({
    enabled,
    model: MODEL,
    available: available(),
    cooling_down_until: cooldownUntil > Date.now() ? new Date(cooldownUntil).toISOString() : '',
});

module.exports = { chat, status, available, enabled, MODEL };
