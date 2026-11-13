// ============================================================
// LOCALMATE — Ghép tour
// ============================================================
// Tour ở Bảy Núi phần lớn do đơn vị nhỏ chạy: một xe, một hướng dẫn viên.
// Hai khách lẻ thì chạy là LỖ, nên họ hay từ chối hoặc hét giá. Kết quả là
// khách lẻ không đi được tour, còn đơn vị tour thì để xe nằm không.
//
// Ghép tour giải quyết đúng chỗ đó: khách lẻ đăng ký vào một CHUYẾN KHỞI HÀNH
// theo ngày. Đủ số khách tối thiểu thì chuyến chạy và mọi người được giá rẻ;
// tới hạn chót mà không đủ thì báo sớm để khách còn kịp tính đường khác.
//
// Điều quan trọng nhất về mặt trung thực: khi khách đăng ký, chuyến CHƯA chắc
// chạy. Phải nói thẳng điều đó và cho thấy còn thiếu mấy người — chứ không
// được để khách tưởng đã đặt xong rồi sát ngày mới báo huỷ.
// ============================================================

const store = require('./store');
const listings = require('./listings');

/**
 * Tìm tour thật do đối tác đã duyệt tự đăng.
 */
function timTour(slug) {
    const row = listings.liveTours().find(r => r.id === slug);
    return row ? listings.toTourShape(row) : null;
}

const COLLECTION = 'departures';

// Đủ bấy nhiêu khách thì chuyến chạy
const MIN_GUESTS = Number(process.env.TOUR_POOL_MIN) || 6;
// Chốt danh sách trước ngày đi bấy nhiêu ngày
const CUTOFF_DAYS = Number(process.env.TOUR_POOL_CUTOFF_DAYS) || 2;
// Giảm giá cho khách chịu đi ghép
const DISCOUNT = Number(process.env.TOUR_POOL_DISCOUNT) || 0.25;

const now = () => new Date().toISOString();
const digits = (s) => String(s || '').replace(/[^\d]/g, '');
const dayOf = (iso) => String(iso || '').slice(0, 10);

/** Số khách đã đăng ký một chuyến. */
const joinedCount = (dep) => (dep.members || []).reduce((sum, m) => sum + (m.guests || 1), 0);

/** Hạn chót chốt danh sách của một chuyến. */
function cutoffOf(dep) {
    const d = new Date(`${dep.date}T00:00:00`);
    d.setDate(d.getDate() - CUTOFF_DAYS);
    return d.toISOString().slice(0, 10);
}

/** Giá mỗi khách khi đi ghép. */
const pooledPrice = (tour) => Math.round((tour.price * (1 - DISCOUNT)) / 1000) * 1000;

function all() {
    return store.readAll(COLLECTION) || [];
}

/** Các chuyến đang gom khách của một tour, từ hôm nay trở đi. */
function openDepartures(tourSlug = '') {
    const today = dayOf(new Date().toISOString());
    return all()
        .filter(d => d.status === 'forming' && d.date >= today && (!tourSlug || d.tourSlug === tourSlug))
        .sort((a, b) => a.date.localeCompare(b.date));
}

/** Dạng trả ra ngoài — luôn kèm còn thiếu mấy người. */
function toPublic(dep) {
    const tour = timTour(dep.tourSlug);
    const count = joinedCount(dep);
    const missing = Math.max(0, dep.minGuests - count);

    return {
        id: dep.id,
        tour_slug: dep.tourSlug,
        tour_name: tour?.name || dep.tourSlug,
        date: dep.date,
        status: dep.status,
        status_label: {
            forming: 'Đang gom khách',
            confirmed: 'Chắc chắn khởi hành',
            cancelled: 'Không đủ khách, đã huỷ',
        }[dep.status] || dep.status,
        joined: count,
        min_guests: dep.minGuests,
        missing,
        // Câu nói thẳng vào mặt khách: chuyến này đã chắc chạy chưa
        note: dep.status === 'confirmed'
            ? 'Đủ khách rồi, chuyến chắc chắn khởi hành.'
            : `Còn thiếu ${missing} khách nữa là chuyến chạy.`,
        price: dep.price,
        full_price: tour?.price || 0,
        saving: Math.max(0, (tour?.price || 0) - dep.price),
        cutoff: cutoffOf(dep),
        progress: dep.minGuests ? Math.min(100, Math.round((count / dep.minGuests) * 100)) : 0,
    };
}

/**
 * Khách đăng ký đi ghép.
 * Có chuyến cùng tour cùng ngày đang gom thì vào chung; không thì mở chuyến mới.
 *
 * @returns { departure, confirmedNow } — confirmedNow = true nghĩa là chính
 * người này làm chuyến đủ khách, nơi gọi dựa vào đó để báo cho cả đoàn.
 */
function join({ tourSlug, date, guests = 1, bookingId = '', guestName = '', phone = '' }) {
    const bad = (status, code, message) => {
        const err = new Error(message);
        err.status = status;
        err.code = code;
        throw err;
    };

    const tour = timTour(tourSlug);
    if (!tour) bad(404, 'TOUR_NOT_FOUND', 'Không tìm thấy tour này.');

    const day = dayOf(date);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) bad(400, 'INVALID_DATE', 'Ngày khởi hành chưa hợp lệ.');
    if (day < dayOf(new Date().toISOString())) bad(400, 'PAST_DATE', 'Ngày khởi hành đã qua.');

    let dep = all().find(d => d.tourSlug === tourSlug && d.date === day && d.status === 'forming');

    if (!dep) dep = taoChuyen({ tour, tourSlug, date: day });

    const members = [...(dep.members || [])];
    // Cùng số điện thoại đăng ký lại thì cập nhật, không nhân đôi chỗ
    const existing = members.findIndex(m => digits(m.phone) === digits(phone) && phone);
    const member = { bookingId, guestName, phone: digits(phone), guests: Math.max(1, guests), joinedAt: now() };
    if (existing >= 0) members[existing] = member;
    else members.push(member);

    const count = members.reduce((sum, m) => sum + m.guests, 0);
    const confirmedNow = count >= dep.minGuests && dep.status === 'forming';

    const saved = store.update(COLLECTION, dep.id, {
        members,
        status: confirmedNow ? 'confirmed' : dep.status,
        confirmedAt: confirmedNow ? now() : dep.confirmedAt || '',
    });

    return { departure: saved, confirmedNow };
}

/** Tạo một chuyến mới ở trạng thái đang gom khách. */
function taoChuyen({ tour, tourSlug, date, minGuests = 0, price = 0 }) {
    return store.insert(COLLECTION, {
        id: `dp_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
        tourSlug,
        // Ghi luôn chủ tour lên chuyến. Có thể tra ngược từ tourSlug mỗi lần
        // cần, nhưng tin đăng đổi chủ hoặc bị gỡ thì chuyến đang chạy dở mất
        // luôn chủ — mà tiền và khách thì vẫn đó.
        partnerId: tour?.partnerId || '',
        date: dayOf(date),
        minGuests: minGuests > 0 ? minGuests : MIN_GUESTS,
        price: price > 0 ? price : pooledPrice(tour),
        status: 'forming',
        members: [],
        createdAt: now(),
    });
}

/**
 * Đơn vị tour tự mở một ngày khởi hành.
 *
 * Khác với join(): ở đây chưa có khách nào, đơn vị tour chỉ đang treo ngày lên
 * để khách thấy mà đăng ký. Đây là cách họ chủ động chạy tour thay vì ngồi chờ
 * khách lẻ tự trùng ngày với nhau.
 */
function moChuyen({ tourSlug, date, minGuests = 0, price = 0, partnerId = '' }) {
    const bad = (status, code, message) => {
        const err = new Error(message);
        err.status = status;
        err.code = code;
        throw err;
    };

    const tour = timTour(tourSlug);
    if (!tour) bad(404, 'TOUR_NOT_FOUND', 'Không tìm thấy tour này.');
    if (partnerId && tour.partnerId && tour.partnerId !== partnerId) {
        bad(403, 'NOT_YOUR_TOUR', 'Tour này không phải của bạn.');
    }

    const day = dayOf(date);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) bad(400, 'INVALID_DATE', 'Ngày khởi hành chưa hợp lệ.');
    if (day < dayOf(new Date().toISOString())) bad(400, 'PAST_DATE', 'Ngày khởi hành đã qua.');

    const trung = all().find(d => d.tourSlug === tourSlug && d.date === day && d.status !== 'cancelled');
    if (trung) bad(409, 'DEPARTURE_EXISTS', 'Ngày này đã có chuyến rồi.');

    return taoChuyen({ tour, tourSlug, date: day, minGuests, price });
}

/** Chuyến của một đơn vị tour — kể cả đã chạy xong và đã huỷ. */
function departuresOfPartner(partnerId) {
    if (!partnerId) return [];
    // Chuyến cũ (trước khi có trường partnerId) thì tra ngược qua tour.
    const cuaToi = (dep) => (dep.partnerId
        ? dep.partnerId === partnerId
        : timTour(dep.tourSlug)?.partnerId === partnerId);

    return all().filter(cuaToi).sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Đơn vị tour chốt chạy sớm hoặc huỷ chuyến.
 *
 * Chốt sớm khi chưa đủ số khách tối thiểu là chuyện BÌNH THƯỜNG: họ có đoàn
 * riêng ghép vào, hoặc chấp nhận chạy ít khách. Số tối thiểu chỉ là mốc để hệ
 * thống tự chốt hộ, không phải luật cấm.
 */
function datTrangThai(id, status, partnerId = '') {
    const bad = (s, code, message) => {
        const err = new Error(message);
        err.status = s;
        err.code = code;
        throw err;
    };
    if (!['confirmed', 'cancelled'].includes(status)) {
        bad(400, 'INVALID_STATUS', 'Trạng thái phải là confirmed hoặc cancelled.');
    }

    const dep = store.find(COLLECTION, d => d.id === id);
    if (!dep) bad(404, 'DEPARTURE_NOT_FOUND', 'Không tìm thấy chuyến này.');

    const chu = dep.partnerId || timTour(dep.tourSlug)?.partnerId || '';
    if (partnerId && chu && chu !== partnerId) bad(403, 'NOT_YOURS', 'Chuyến này không phải của bạn.');

    return store.update(COLLECTION, id, {
        status,
        confirmedAt: status === 'confirmed' ? (dep.confirmedAt || now()) : dep.confirmedAt || '',
        cancelledAt: status === 'cancelled' ? now() : dep.cancelledAt || '',
    });
}

/**
 * Dạng cho ĐƠN VỊ TOUR xem: có kèm danh sách khách.
 *
 * Không dùng chung với toPublic() được, và cũng không được lỡ tay dùng nhầm:
 * toPublic() đi ra trang khách, mà tên với số điện thoại của người khác thì
 * không có việc gì ở đó cả.
 */
function toPartner(dep) {
    return {
        ...toPublic(dep),
        created_at: dep.createdAt || '',
        members: (dep.members || []).map(m => ({
            name: m.guestName || '',
            phone: m.phone || '',
            guests: m.guests || 1,
            joined_at: m.joinedAt || '',
            booking_id: m.bookingId || '',
        })),
    };
}

/**
 * Quét các chuyến quá hạn chốt mà vẫn chưa đủ khách.
 * Trả về danh sách chuyến vừa bị huỷ, để nơi gọi báo cho từng người trong đoàn.
 */
function sweepExpired() {
    const today = dayOf(new Date().toISOString());
    const cancelled = [];

    for (const dep of all()) {
        if (dep.status !== 'forming') continue;
        if (cutoffOf(dep) > today) continue;      // chưa tới hạn chốt

        const saved = store.update(COLLECTION, dep.id, { status: 'cancelled', cancelledAt: now() });
        cancelled.push(saved);
    }
    return cancelled;
}

/** Chuyến mà một số điện thoại đang tham gia. */
function departuresOf(phone) {
    const key = digits(phone);
    if (!key) return [];
    return all()
        .filter(d => (d.members || []).some(m => digits(m.phone) === key))
        .sort((a, b) => a.date.localeCompare(b.date));
}

/** Tour nào đang có chuyến gom khách — để trang tour hiện huy hiệu "đang gom". */
function summaryByTour() {
    const out = {};
    for (const dep of openDepartures()) {
        if (!out[dep.tourSlug]) out[dep.tourSlug] = [];
        out[dep.tourSlug].push(toPublic(dep));
    }
    return out;
}

module.exports = {
    join, sweepExpired, openDepartures, departuresOf, summaryByTour, toPublic,
    moChuyen, departuresOfPartner, datTrangThai, toPartner, timTour,
    joinedCount, cutoffOf, pooledPrice,
    MIN_GUESTS, CUTOFF_DAYS, DISCOUNT,
};

// ── Bộ quét tự động ─────────────────────────────────────────
// Chạy mỗi giờ. Chuyến quá hạn chốt mà chưa đủ khách thì huỷ và BÁO NGAY cho
// từng người — báo sớm để khách còn kịp tính đường khác, chứ để tới sát ngày
// mới nói thì họ hỏng cả chuyến đi.
setInterval(() => {
    try {
        // eslint-disable-next-line global-require
        const notifications = require('./notifications');
        for (const dep of sweepExpired()) {
            const view = toPublic(dep);
            for (const m of dep.members || []) {
                notifications.push({
                    audience: 'guest',
                    phone: m.phone,
                    kind: 'tour_cancelled',
                    title: 'Chuyến ghép không đủ khách',
                    body: `${view.tour_name} ngày ${view.date} chỉ có ${view.joined}/${view.min_guests} khách nên không chạy được. `
                        + 'Bạn xem ngày khác hoặc đặt tour riêng nhé.',
                });
            }
            notifications.push({
                audience: 'admin',
                kind: 'tour_cancelled',
                title: 'Chuyến ghép bị huỷ',
                body: `${view.tour_name} · ${view.date} · chỉ ${view.joined}/${view.min_guests} khách`,
            });
        }
    } catch (err) {
        console.error('[tourpool/sweep]', err.message);
    }
}, 60 * 60 * 1000).unref();
