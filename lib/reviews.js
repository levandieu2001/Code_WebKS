// ============================================================
// LOCALMATE — Đánh giá & xếp hạng
// ============================================================
// Nguyên tắc: CHỈ người đã thật sự dùng dịch vụ mới được đánh giá.
//
// Mỗi đánh giá phải gắn với một đơn đã hoàn thành, và số điện thoại người gửi
// phải khớp số trên đơn. Nhờ vậy không ai vào bơm sao cho mình hay dìm đối thủ
// — đây là điểm khiến số sao có giá trị thật, chứ không phải con số trang trí.
//
// Mỗi đơn chỉ đánh giá được một lần cho mỗi đối tượng (phòng và tài xế là hai
// đối tượng khác nhau, nên một chuyến có thể có hai đánh giá riêng).
// ============================================================

const store = require('./store');

const COLLECTION = 'reviews';
const TARGET_TYPES = ['room', 'stay', 'tour', 'place', 'driver', 'partner'];
const MAX_COMMENT = 1000;

const now = () => new Date().toISOString();
const clampRating = (n) => {
    const v = Math.round(Number(n));
    return Number.isFinite(v) ? Math.min(5, Math.max(1, v)) : 0;
};
const digits = (s) => String(s || '').replace(/[^\d]/g, '');

/** Ẩn bớt số điện thoại khi hiển thị công khai: 0912345678 → 0912***678 */
function maskPhone(phone) {
    const d = digits(phone);
    if (d.length < 7) return '';
    return `${d.slice(0, 4)}***${d.slice(-3)}`;
}

/** Chỉ hiện tên và chữ cái đầu của họ: "Nguyễn Văn An" → "An N." */
function displayName(fullName) {
    const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'Khách';
    if (parts.length === 1) return parts[0];
    return `${parts[parts.length - 1]} ${parts[0][0]}.`;
}

function all() {
    return store.readAll(COLLECTION) || [];
}

/** Đánh giá đang hiển thị công khai của một đối tượng. */
function listFor(type, id) {
    return all()
        .filter(r => r.status === 'published' && r.targetType === type && r.targetId === String(id))
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

/**
 * Tổng hợp điểm của một đối tượng.
 *
 * Trả về average = null khi CHƯA CÓ đánh giá nào — cố tình không trả 0 hay
 * một con số đẹp mặc định, vì "chưa ai đánh giá" và "bị chấm 0 sao" là hai
 * chuyện hoàn toàn khác nhau, hiển thị lẫn lộn là nói dối khách.
 */
function summaryFor(type, id) {
    return summarize(listFor(type, id));
}

/** Tổng hợp đúng tập đánh giá đang được trả về cho giao diện. */
function summarize(rows) {
    if (!rows.length) {
        return { count: 0, average: null, breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
    }
    const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let total = 0;
    for (const r of rows) {
        breakdown[r.rating] = (breakdown[r.rating] || 0) + 1;
        total += r.rating;
    }
    return {
        count: rows.length,
        average: Math.round((total / rows.length) * 10) / 10,
        breakdown,
    };
}

/** Tổng hợp cho nhiều đối tượng cùng lúc, tránh quét lại mảng nhiều lần. */
function summaryMap(type) {
    const map = new Map();
    for (const r of all()) {
        if (r.status !== 'published' || r.targetType !== type) continue;
        const cur = map.get(r.targetId) || { count: 0, total: 0 };
        cur.count += 1;
        cur.total += r.rating;
        map.set(r.targetId, cur);
    }
    const out = {};
    for (const [id, v] of map) {
        out[id] = { count: v.count, average: Math.round((v.total / v.count) * 10) / 10 };
    }
    return out;
}

/** Đơn này đã đánh giá đối tượng đó chưa. */
function reviewedAlready(bookingId, type, id) {
    return all().some(r => r.bookingId === bookingId && r.targetType === type && r.targetId === String(id));
}

/** Những gì một đơn đã hoàn thành có thể đánh giá. */
function targetsForBooking(booking) {
    if (!booking) return [];
    const targets = [];

    if (booking.kind === 'transport') {
        if (booking.partnerId) {
            targets.push({ type: 'driver', id: booking.partnerId, label: booking.partnerName || 'Tài xế' });
        }
    } else if (booking.kind === 'tour') {
        if (booking.tourSlug) targets.push({ type: 'tour', id: booking.tourSlug, label: booking.roomName || 'Tour' });
        else if (booking.partnerId) targets.push({ type: 'partner', id: booking.partnerId, label: booking.partnerName || 'Đơn vị tour' });
    } else {
        // Đặt phòng: đánh giá đúng phòng đã ở
        if (booking.roomId) targets.push({ type: 'room', id: booking.roomId, label: booking.roomName || 'Phòng' });
        else if (booking.partnerId) targets.push({ type: 'partner', id: booking.partnerId, label: booking.partnerName || 'Nơi lưu trú' });
    }

    return targets.filter(t => !reviewedAlready(booking.id, t.type, t.id));
}

/**
 * Ghi một đánh giá.
 * @throws Error có .status và .code để tầng API trả đúng thông báo tiếng Việt.
 */
function create({ booking, targetType, targetId, targetLabel, rating, comment, phone }) {
    const bad = (status, code, message) => {
        const err = new Error(message);
        err.status = status;
        err.code = code;
        throw err;
    };

    if (!booking) bad(404, 'BOOKING_NOT_FOUND', 'Không tìm thấy đơn này.');
    if (booking.status !== 'completed') {
        bad(400, 'NOT_COMPLETED', 'Chỉ đánh giá được sau khi đã dùng xong dịch vụ.');
    }
    if (digits(booking.phone) !== digits(phone)) {
        bad(403, 'PHONE_MISMATCH', 'Số điện thoại không khớp với đơn này.');
    }
    if (!TARGET_TYPES.includes(targetType)) {
        bad(400, 'INVALID_TARGET', 'Không đánh giá được đối tượng này.');
    }

    const stars = clampRating(rating);
    if (!stars) bad(400, 'INVALID_RATING', 'Chọn số sao từ 1 đến 5.');
    if (reviewedAlready(booking.id, targetType, String(targetId))) {
        bad(409, 'ALREADY_REVIEWED', 'Bạn đã đánh giá đơn này rồi. Cảm ơn bạn!');
    }

    return store.insert(COLLECTION, {
        id: `rv_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        bookingId: booking.id,
        bookingCode: String(booking.id || '').slice(-8).toUpperCase(),
        targetType,
        targetId: String(targetId),
        targetLabel: targetLabel || '',
        rating: stars,
        comment: String(comment || '').slice(0, MAX_COMMENT).trim(),
        guestName: booking.guestName || '',
        phone: digits(booking.phone),
        status: 'published',
        reply: null,
        createdAt: now(),
    });
}

/**
 * Đánh giá này có phải nói về đối tác đó không.
 *
 * Hai đường:
 *   1. Khách đánh giá thẳng đối tác  → targetId chính là mã đối tác.
 *   2. Khách đánh giá CÁI PHÒNG / CÁI TOUR họ vừa dùng → targetId là mã tin
 *      đăng, phải tra ngược xem tin đó của ai.
 *
 * Đường thứ hai mới là đường hay gặp: khách nhớ cái phòng chứ ít khi nhớ tên
 * công ty. Bỏ sót nó thì chủ nhà không trả lời được đúng loại đánh giá mà họ
 * cần trả lời nhất.
 */
function belongsToPartner(row, partnerId) {
    const pid = String(partnerId);
    if (['driver', 'partner'].includes(row.targetType)) return row.targetId === pid;
    if (['stay', 'tour', 'room'].includes(row.targetType)) {
        try {
            // eslint-disable-next-line global-require
            const listings = require('./listings');
            const l = listings.find(row.targetId);
            return Boolean(l && String(l.partnerId) === pid);
        } catch (_) {
            return false;
        }
    }
    return false;
}

/** Mọi đánh giá nói về một đối tác, mới nhất trước. */
function listForPartner(partnerId) {
    return all()
        .filter(r => r.status !== 'hidden')
        .filter(r => belongsToPartner(r, partnerId))
        .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}

/** Đối tác trả lời đánh giá về mình. */
function reply(reviewId, partnerId, text) {
    const row = store.find(COLLECTION, r => r.id === reviewId);
    if (!row) return null;
    // Chỉ đối tác bị đánh giá mới được trả lời
    if (!belongsToPartner(row, partnerId)) return null;
    return store.update(COLLECTION, reviewId, {
        reply: { text: String(text || '').slice(0, MAX_COMMENT).trim(), at: now() },
    });
}

/** Quản trị ẩn/hiện đánh giá (dùng cho nội dung bậy bạ, không phải để giấu sao thấp). */
function setStatus(reviewId, status) {
    if (!['published', 'hidden'].includes(status)) return null;
    return store.update(COLLECTION, reviewId, { status });
}

/** Dạng công khai — che bớt số điện thoại và rút gọn tên. */
function toPublic(r) {
    return {
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        guest_name: displayName(r.guestName),
        phone_masked: maskPhone(r.phone),
        booking_code: r.bookingCode,
        target_type: r.targetType,
        target_id: r.targetId,
        target_label: r.targetLabel,
        reply: r.reply,
        created_at: r.createdAt,
    };
}

module.exports = {
    listFor, summaryFor, summarize, summaryMap, targetsForBooking, reviewedAlready,
    create, reply, setStatus, toPublic, all,
    TARGET_TYPES, displayName, maskPhone,
    belongsToPartner, listForPartner,
};
