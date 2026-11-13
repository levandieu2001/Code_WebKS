// ============================================================
// LOCALMATE — Đoán ý người hỏi (dùng cho chế độ offline)
// ============================================================
// VÌ SAO CẦN FILE NÀY:
//
// Bộ trả lời offline trước đây chạy theo kiểu "gặp nhánh nào khớp trước thì
// lấy nhánh đó". Câu hỏi thật của khách:
//
//     "cho hỏi thời tiết ngày 14/8/2026 ở Núi Cấm buổi sáng có mưa không"
//
// đụng nhánh "địa điểm" trước (vì có chữ "núi") nên bot trả về danh sách điểm
// tham quan — sai hoàn toàn, dù dữ liệu thời tiết có sẵn ngay trong tay.
//
// Ở đây chấm điểm TẤT CẢ ý định rồi chọn cái cao nhất. Từ khoá đặc trưng
// ("thời tiết", "mưa") ăn điểm cao; danh từ chung hay lẫn vào tên riêng
// ("núi", "chùa", "hồ") chỉ ăn điểm thấp — đúng như sức nặng thật của chúng.
//
// Không dùng AI ở đây: chế độ offline tồn tại chính là để lúc AI hỏng.
// ============================================================

/** Bỏ dấu để bắt được cả khi khách gõ không dấu. */
const plain = (s) => String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd');

/**
 * Bảng ý định. `strong` là từ chỉ đích danh việc khách muốn hỏi; `weak` là từ
 * gợi ý mờ, hay xuất hiện trong ngữ cảnh khác nên chỉ tính điểm nhẹ.
 */
const INTENTS = [
    {
        id: 'weather',
        strong: ['thoi tiet', 'du bao', 'co mua', 'mua khong', 'nang khong', 'nhiet do',
                 'weather', 'forecast', 'rain', 'temperature'],
        weak: ['mua', 'nang', 'lanh', 'nong', 'do c'],
    },
    {
        id: 'room',
        strong: ['dat phong', 'gia phong', 'con phong', 'thue phong', 'homestay gia',
                 'book room', 'room rate', 'room price'],
        weak: ['phong', 'ngu', 'luu tru', 'khach san', 'room', 'rooms', 'stay', 'homestay',
               'accommodation', 'night', 'nights'],
    },
    {
        id: 'transport',
        strong: ['dat xe', 'thue xe', 'gia xe', 'don khach', 'di chuyen', 'bao nhieu tien xe',
                 'taxi', 'xe om', 'transport', 'ride'],
        weak: ['xe', 'don', 'tra khach', 'car', 'cars', 'driver', 'shuttle', 'motorbike'],
    },
    {
        id: 'itinerary',
        strong: ['lich trinh', 'hanh trinh', 'nen di dau', 'di may ngay', 'choi gi',
                 'goi y di', 'ke hoach di', 'itinerary', 'plan trip'],
        weak: ['may ngay', 'lam gi', 'di dau'],
    },
    {
        id: 'place',
        strong: ['diem tham quan', 'dia diem', 'cho nao dep', 'check in o dau',
                 'attraction', 'sightseeing', 'places to visit'],
        weak: ['diem', 'tham quan', 'nui', 'chua', 'ho', 'rung', 'canh', 'place', 'places',
               'visit', 'mountain', 'pagoda', 'temple', 'lake', 'forest'],
    },
    {
        id: 'food',
        strong: ['mon ngon', 'dac san', 'an gi', 'quan an', 'am thuc',
                 'what to eat', 'local food', 'restaurant'],
        weak: ['an', 'mon', 'quan', 'food', 'eat', 'dish', 'dishes', 'meal', 'meals'],
    },
    {
        id: 'event',
        strong: ['le hoi', 'su kien', 'dua bo', 'sen dolta', 'chol chnam', 'ok om bok',
                 'via ba', 'festival', 'event'],
        weak: ['le', 'hoi'],
    },
    {
        id: 'pool',
        strong: ['ghep chuyen', 'di chung', 'chia tien xe', 'ghep tour', 'di ghep',
                 'carpool', 'share ride'],
        weak: ['ghep', 'chung'],
    },
    {
        id: 'tour',
        strong: ['dat tour', 'gia tour', 'tour tron goi', 'huong dan vien',
                 'book tour', 'tour price', 'guide'],
        weak: ['tour', 'tours', 'trip', 'trips'],
    },
    {
        id: 'passport',
        strong: ['ho chieu', 'dong dau', 'con dau', 'passport', 'stamp'],
        weak: ['dau', 'thuong'],
    },
    {
        id: 'payment',
        strong: ['dat coc', 'chuyen khoan', 'thanh toan', 'tra tien', 'hoa don',
                 'deposit', 'payment', 'pay'],
        weak: ['coc', 'tien', 'money', 'price', 'cost', 'refund', 'bank'],
    },
    {
        id: 'contact',
        strong: ['so dien thoai', 'lien he', 'goi cho ai', 'dia chi o dau', 'hotline',
                 'contact', 'phone number', 'address'],
        weak: ['lien he', 'goi'],
    },
];

const STRONG_POINT = 10;
const WEAK_POINT = 2;

/**
 * Chọn ý định phù hợp nhất.
 *
 * @returns { id, score, scores } — score = 0 nghĩa là không đoán được, nơi gọi
 * nên trả lời chung chung thay vì đoán bừa một chủ đề.
 */
function detectIntent(message) {
    const q = plain(message);
    const scores = {};

    for (const intent of INTENTS) {
        let score = 0;
        for (const kw of intent.strong) if (q.includes(kw)) score += STRONG_POINT;
        for (const kw of intent.weak) {
            // Ràng biên từ để "an" không khớp vào "ban", "mua" không khớp "mua sam"
            if (new RegExp(`(^|[^a-z0-9])${kw}([^a-z0-9]|$)`).test(q)) score += WEAK_POINT;
        }
        if (score > 0) scores[intent.id] = score;
    }

    const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
    return { id: best ? best[0] : '', score: best ? best[1] : 0, scores };
}

/**
 * Rút ngày khách nhắc tới trong câu hỏi.
 *
 * Nhận "14/8", "14/8/2026", "ngày mai", "hôm nay", "cuối tuần". Trả về chuỗi
 * YYYY-MM-DD, hoặc rỗng nếu khách không nói ngày nào cả.
 *
 * @param now cho phép truyền mốc thời gian khác để kiểm thử.
 */
function extractDate(message, now = new Date()) {
    const q = plain(message);
    const iso = (d) => d.toISOString().slice(0, 10);
    const shift = (days) => {
        const d = new Date(now);
        d.setDate(d.getDate() + days);
        return iso(d);
    };

    if (/hom nay|today|toi nay/.test(q)) return iso(now);
    if (/ngay mai|tomorrow|mai/.test(q)) return shift(1);
    if (/ngay kia|mot/.test(q)) return shift(2);

    // Cuối tuần gần nhất — nhắm tới thứ bảy
    if (/cuoi tuan|weekend/.test(q)) {
        const day = now.getDay();               // 0 = CN
        return shift(((6 - day) + 7) % 7 || 7);
    }

    // "14/8" hoặc "14/8/2026" hoặc "14-8"
    const m = q.match(/(\d{1,2})\s*[\/\-.]\s*(\d{1,2})(?:\s*[\/\-.]\s*(\d{4}))?/);
    if (m) {
        const day = Number(m[1]);
        const month = Number(m[2]);
        const year = m[3] ? Number(m[3]) : now.getFullYear();
        if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
            return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
    }
    return '';
}

/** Khách hỏi riêng buổi nào trong ngày. */
function extractPartOfDay(message) {
    const q = plain(message);
    if (/buoi sang|sang som|morning/.test(q)) return 'sáng';
    if (/buoi trua|trua/.test(q)) return 'trưa';
    if (/buoi chieu|chieu/.test(q)) return 'chiều';
    if (/buoi toi|toi|dem|night|evening/.test(q)) return 'tối';
    return '';
}

module.exports = { detectIntent, extractDate, extractPartOfDay, plain, INTENTS, STRONG_POINT, WEAK_POINT };
