// ============================================================
// LOCALMATE — Nhờ Gemini viết lời dẫn cho lịch trình
// ============================================================
// Gemini CHỈ được giao phần chữ nghĩa: một đoạn giới thiệu và vài lời
// khuyên. Toàn bộ con số (giá, giờ, khoảng cách, tên quán, tên khách sạn)
// do lib/itinerary.js tính từ dữ liệu thật và KHÔNG gửi cho model sửa.
//
// Nhờ vậy: hết quota, mất mạng, hay Gemini trả 503 thì lịch trình vẫn
// dùng được — chỉ là phần lời dẫn quay về bản viết sẵn.
//
// Việc xoay vòng nhiều API key nằm ở lib/gemini.js.
// ============================================================

const gemini = require('./gemini');

// Lịch trình đã dựng xong rồi, không đáng để khách chờ lâu vì phần lời văn
const AI_TIMEOUT_MS = 12_000;

/** Lời dẫn viết sẵn, dùng khi không gọi được Gemini. */
function fallbackSummary(trip) {
    const places = trip.plan
        .flatMap(d => d.items.filter(i => i.kind === 'place').map(i => i.title.split('—')[0].trim()));
    const unique = [...new Set(places)].slice(0, 4);
    return `${trip.days} ngày quanh vùng Thất Sơn cho ${trip.people} khách, đi qua ${unique.join(', ')}. `
        + `Lịch trình xếp theo cụm địa lý để bạn không phải chạy tới chạy lui, `
        + `chỗ nghỉ chọn gần điểm dừng cuối mỗi ngày.`;
}

const FALLBACK_TIPS = [
    'Mang giày bám tốt nếu có leo núi, và áo khoác mỏng cho buổi sáng sớm trên cao.',
    'Vào chùa Khmer nên mặc kín đáo, bỏ giày trước chánh điện và xin phép trước khi chụp ảnh.',
    'Đặt xe trước một hôm sẽ dễ có tài xế hơn, nhất là dịp lễ.',
];

/**
 * Bổ sung summary + tips cho lịch trình.
 * Luôn trả về trip đã có đủ hai trường đó, dù Gemini có lỗi hay không.
 */
async function enrichWithAI(trip) {
    trip.summary = fallbackSummary(trip);
    trip.tips = FALLBACK_TIPS;
    trip.ai_written = false;

    if (!gemini.hasKeys) return trip;

    // Chỉ gửi phần khung — không gửi giá để model khỏi "sửa" thành số bịa
    const outline = trip.plan.map(d => ({
        ngay: d.day,
        diem: d.items.filter(i => i.kind !== 'transport').map(i => `${i.time} ${i.title}`),
    }));

    const prompt = `Bạn là hướng dẫn viên am hiểu vùng Bảy Núi (Thất Sơn), An Giang.
Dưới đây là khung lịch trình đã được hệ thống sắp sẵn:

${JSON.stringify(outline, null, 1)}

Khách: ${trip.people} người, đi ${trip.days} ngày, xuất phát từ ${trip.start_point}.
Sở thích: ${trip.preferences.join(', ') || 'chưa nêu rõ'}.

Trả về JSON thuần (không rào code, không giải thích) đúng dạng:
{"summary": "...", "tips": ["...", "...", "..."]}

- summary: 2–3 câu giới thiệu chuyến đi, giọng thân thiện, tiếng Việt.
- tips: đúng 3 lời khuyên thực tế cho chuyến này (trang phục, giờ giấc, ứng xử nơi tâm linh, thời tiết).
- TUYỆT ĐỐI không nhắc tới giá tiền, số km hay tên quán/khách sạn cụ thể.`;

    try {
        // Hết quota key này thì lib/gemini tự chuyển sang key kế tiếp
        const parsed = await gemini.generateJson(prompt, { timeoutMs: AI_TIMEOUT_MS });
        if (!parsed) return trip;

        if (typeof parsed.summary === 'string' && parsed.summary.length > 20) {
            trip.summary = parsed.summary.trim();
            trip.ai_written = true;
        }
        if (Array.isArray(parsed.tips) && parsed.tips.length) {
            trip.tips = parsed.tips.filter(t => typeof t === 'string').slice(0, 3);
        }
    } catch (err) {
        // Hết sạch quota mọi key, hoặc mạng lỗi — giữ bản viết sẵn
        console.warn('[itinerary-ai] dùng lời dẫn dự phòng:', err.message);
    }

    return trip;
}

module.exports = { enrichWithAI, hasAI: gemini.hasKeys };
