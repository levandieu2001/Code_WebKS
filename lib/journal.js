// ============================================================
// LOCALMATE — Nhật ký chuyến đi
// ============================================================
// Gom lại tất cả những gì một khách đã làm ở Bảy Núi thành MỘT dòng thời gian:
// đã ngủ ở đâu, đi xe tuyến nào, tham gia tour gì, đóng được con dấu nào, tiêu
// hết bao nhiêu.
//
// Không tạo thêm dữ liệu mới. Mọi thứ đã nằm sẵn trong đơn đặt (Firestore) và
// con dấu hộ chiếu (kho JSON) — chỉ là chưa ai ghép chúng lại. Nhờ vậy nhật ký
// luôn khớp với thực tế, không có chuyện hai nơi lệch nhau.
//
// Vì sao đáng làm: khách đi xong thì chuyến đi tan biến, chẳng còn gì để nhớ
// hay để khoe. Một trang tổng kết đẹp là thứ họ chụp màn hình gửi bạn bè —
// quảng cáo không mất tiền, và là lý do để họ quay lại cho đủ bộ con dấu.
// ============================================================

const passport = require('./passport');

const digits = (s) => String(s || '').replace(/\D/g, '');

/** "2026-09-28" hoặc ISO đầy đủ → "2026-09-28". Không đọc được thì trả rỗng. */
function ngay(value) {
    if (!value) return '';
    const s = String(value);
    const m = /^(\d{4}-\d{2}-\d{2})/.exec(s);
    if (m) return m[1];
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
}

const KIND_LABEL = {
    hotel: 'Lưu trú',
    transport: 'Di chuyển',
    tour: 'Tour',
};

/**
 * Một đơn → một mục trong dòng thời gian.
 *
 * Đơn đã huỷ vẫn giữ lại nhưng đánh dấu rõ: khách nhớ mình từng định đi mà
 * không đi được cũng là một phần của câu chuyện, giấu đi thì họ tưởng hệ thống
 * mất đơn.
 */
function tuDon(b) {
    const huy = b.status === 'cancelled' || b.status === 'rejected';
    const base = {
        date: ngay(b.checkIn) || ngay(b.createdAt),
        type: b.kind === 'hotel' ? 'stay' : b.kind,
        cancelled: huy,
        amount: huy ? 0 : Number(b.totalPrice || 0),
        booking_id: b.id,
    };

    if (b.kind === 'hotel') {
        return {
            ...base,
            title: b.roomName || 'Phòng nghỉ',
            detail: b.nights > 0 ? `${b.nights} đêm` : '',
            partner: b.partnerName || '',
        };
    }
    if (b.kind === 'transport') {
        return {
            ...base,
            title: `${b.pickup || '?'} → ${b.dropoff || '?'}`,
            detail: b.pickupTime ? `Đón lúc ${b.pickupTime}` : '',
            partner: b.partnerName || '',
        };
    }
    return {
        ...base,
        title: b.tourName || b.summary || 'Tour',
        detail: b.guests > 0 ? `${b.guests} khách` : '',
        partner: b.partnerName || '',
    };
}

/** Một con dấu → một mục trong dòng thời gian. */
function tuDau(s) {
    return {
        date: ngay(s.createdAt),
        type: 'stamp',
        title: s.name || 'Điểm đến',
        detail: 'Đã đóng dấu hộ chiếu',
        slug: s.slug || '',
        symbol: s.symbol || '',
        amount: 0,
        cancelled: false,
    };
}

/**
 * Dựng nhật ký cho một khách.
 *
 * @param bookings toàn bộ đơn (đã lọc sẵn theo khách ở nơi gọi)
 * @param identity { userId, phone, name }
 */
function build(bookings, { userId = '', phone = '', name = '' } = {}) {
    const rows = Array.isArray(bookings) ? bookings : [];

    const owner = passport.ownerKey({ userId, phone });
    const stamps = owner ? passport.stampsOf(owner) : [];
    const timeline = [...rows.map(tuDon), ...stamps.map(tuDau)]
        .filter(x => x.date)
        // Mới nhất lên đầu — khách vào xem thường quan tâm chuyến vừa rồi.
        .sort((a, b) => b.date.localeCompare(a.date));

    const hopLe = rows.filter(b => b.status !== 'cancelled' && b.status !== 'rejected');
    const dem = hopLe.reduce((t, b) => t + (Number(b.nights) || 0), 0);
    const tieu = hopLe.reduce((t, b) => t + (Number(b.totalPrice) || 0), 0);

    // "Chuyến đi" = một đợt khách tới Bảy Núi. Gom theo ngày: các đơn cách nhau
    // dưới 5 ngày coi như cùng một chuyến, vì khách hay đặt phòng, xe và tour
    // riêng lẻ cho cùng một kỳ nghỉ. Đếm từng đơn thì con số phồng lên vô nghĩa.
    const ngayDi = [...new Set(hopLe.map(b => ngay(b.checkIn)).filter(Boolean))].sort();
    let soChuyen = 0;
    let truoc = '';
    for (const d of ngayDi) {
        if (!truoc || cachNhau(truoc, d) > 5) soChuyen += 1;
        truoc = d;
    }

    return {
        holder: {
            name: name || rows.find(b => b.guestName)?.guestName || '',
            phone: digits(phone),
        },
        summary: {
            trips: soChuyen,
            nights: dem,
            bookings: hopLe.length,
            stamps: stamps.length,
            stations_total: passport.stations().length,
            spent: tieu,
            first_visit: ngayDi[0] || '',
            last_visit: ngayDi[ngayDi.length - 1] || '',
        },
        timeline,
        stamps: stamps.map(s => ({
            slug: s.slug,
            name: s.name,
            symbol: s.symbol,
            date: ngay(s.createdAt),
        })),
    };
}

/** Số ngày giữa hai mốc YYYY-MM-DD. */
function cachNhau(a, b) {
    const x = new Date(`${a}T00:00:00Z`).getTime();
    const y = new Date(`${b}T00:00:00Z`).getTime();
    if (Number.isNaN(x) || Number.isNaN(y)) return 999;
    return Math.abs(y - x) / 86400000;
}

module.exports = { build };
