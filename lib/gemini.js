// ============================================================
// LOCALMATE — Gọi Gemini có xoay vòng nhiều API key
// ============================================================
// Bản miễn phí của gemini-2.5-flash chỉ cho khoảng 20 lượt MỖI NGÀY cho
// mỗi project. Chatbot và phần viết lời dẫn lịch trình dùng chung hạn mức
// đó, nên chỉ cần vài chục câu hỏi là hết — đúng lúc demo thì hỏng.
//
// Module này giữ NHIỀU key: gặp lỗi hết quota (429) hoặc key hỏng (401/403)
// thì tự chuyển sang key kế tiếp và gọi lại, cho tới khi hết key mới chịu
// thua. Key nào hết quota được ghi nhớ tới cuối ngày để khỏi thử lại vô ích.
//
// Cấu hình trong .env:
//   GEMINI_API_KEYS=key1,key2,key3,key4     (ưu tiên)
//   GEMINI_API_KEY=key1                     (bản cũ, vẫn dùng được)
// ============================================================

const { GoogleGenerativeAI } = require('@google/generative-ai');

const MODEL = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';

/** Tách danh sách key, bỏ trùng và bỏ rỗng. */
function readKeys() {
    const raw = [
        ...(process.env.GEMINI_API_KEYS || '').split(','),
        process.env.GEMINI_API_KEY || '',
    ];
    return [...new Set(raw.map(k => k.trim()).filter(Boolean))];
}

const KEYS = readKeys();

/** Key nào đang bị khoá vì hết quota: key -> mốc thời gian được thử lại. */
const cooldown = new Map();

// Hết quota theo ngày thì chờ tới nửa đêm mới có ý nghĩa, nhưng chờ 1 giờ
// là đủ an toàn mà vẫn tự phục hồi nếu đó chỉ là giới hạn theo phút.
const COOLDOWN_MS = 60 * 60 * 1000;

let cursor = 0;

const isQuotaError = (err) => {
    const status = err?.status || 0;
    const text = String(err?.message || '');
    return status === 429 || /quota|rate limit|too many requests/i.test(text);
};

const isDeadKey = (err) => {
    const status = err?.status || 0;
    return status === 401 || status === 403 || /api key not valid/i.test(String(err?.message || ''));
};

/** Những key còn dùng được lúc này, bắt đầu từ key đang tới lượt. */
function usableKeys() {
    const now = Date.now();
    const live = KEYS.filter(k => (cooldown.get(k) || 0) <= now);
    if (!live.length) return [];
    // Xoay vòng để không dồn hết vào key đầu
    const start = cursor % live.length;
    return [...live.slice(start), ...live.slice(0, start)];
}

const clientCache = new Map();
function modelFor(key) {
    if (!clientCache.has(key)) {
        clientCache.set(key, new GoogleGenerativeAI(key).getGenerativeModel({ model: MODEL }));
    }
    return clientCache.get(key);
}

/**
 * Chạy một thao tác cần model Gemini, tự chuyển key khi gặp lỗi quota.
 * Nhận cả hàm để bên gọi tự quyết cách dùng (generateContent, startChat…).
 *
 * @param work hàm nhận model, trả về kết quả
 * @param options.timeoutMs bỏ cuộc sau bao lâu (mặc định 20 giây)
 * @throws lỗi cuối cùng nếu mọi key đều hỏng
 */
async function withModel(work, { timeoutMs = 20000 } = {}) {
    const keys = usableKeys();
    if (!keys.length) {
        const err = new Error('Hết toàn bộ hạn mức Gemini hôm nay.');
        err.code = 'NO_KEY';
        throw err;
    }

    let lastError = null;
    for (const key of keys) {
        try {
            const result = await Promise.race([
                work(modelFor(key)),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Gemini phản hồi quá chậm.')), timeoutMs)),
            ]);
            cursor += 1;   // lần sau bắt đầu từ key khác cho đều tải
            return result;
        } catch (err) {
            lastError = err;
            if (isQuotaError(err)) {
                cooldown.set(key, Date.now() + COOLDOWN_MS);
                console.warn(`[gemini] key ...${key.slice(-6)} hết quota, chuyển key khác`);
                continue;
            }
            if (isDeadKey(err)) {
                cooldown.set(key, Date.now() + 24 * COOLDOWN_MS);
                console.warn(`[gemini] key ...${key.slice(-6)} không hợp lệ, bỏ qua`);
                continue;
            }
            // Lỗi khác (mạng, quá chậm) — thử key kế tiếp một lần nữa
            console.warn('[gemini]', err.message);
        }
    }
    throw lastError || new Error('Không gọi được Gemini.');
}

/** Gọi nhanh với một prompt, trả về chuỗi. */
async function generate(prompt, options) {
    const result = await withModel(model => model.generateContent(prompt), options);
    return result.response.text();
}

/**
 * Gọi và mong đợi JSON. Tự bóc rào ```json nếu model trả kèm.
 * Trả về null nếu không phân tích được, để bên gọi dùng bản dự phòng.
 */
async function generateJson(prompt, options) {
    const raw = await generate(prompt, options);
    try {
        return JSON.parse(raw.replace(/```json|```/g, '').trim());
    } catch (_) {
        return null;
    }
}

/** Tình trạng hiện tại, dùng cho trang admin và để chẩn đoán. */
function status() {
    const now = Date.now();
    return {
        model: MODEL,
        total_keys: KEYS.length,
        available: KEYS.filter(k => (cooldown.get(k) || 0) <= now).length,
        cooling_down: KEYS
            .filter(k => (cooldown.get(k) || 0) > now)
            .map(k => ({
                key: `...${k.slice(-6)}`,
                minutes_left: Math.ceil((cooldown.get(k) - now) / 60000),
            })),
    };
}

module.exports = {
    withModel, generate, generateJson, status,
    hasKeys: KEYS.length > 0,
    MODEL,
    // Tên cũ, giữ để server.js và các chỗ đang dùng không phải sửa
    hasAI: KEYS.length > 0,
    KEY_COUNT: KEYS.length,
    MODEL_NAME: MODEL,
};
