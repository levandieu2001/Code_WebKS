// ============================================================
// LOCALMATE — Hộ chiếu LOCALMATE
// ============================================================
// Khách tới tận nơi, quét mã QR dán tại điểm đó, và được đóng một con dấu số.
// Đủ dấu thì đổi được ưu đãi tại đối tác.
//
// ĐIỂM SỐNG CÒN: PHẢI kiểm tra toạ độ GPS.
// Không có bước đó thì ai chụp lại cái QR rồi gửi cho bạn bè cũng đóng được
// dấu ở nhà — con dấu mất sạch ý nghĩa, và ưu đãi của đối tác bị lạm dụng.
// Vì vậy mỗi lần đóng dấu đều so vị trí khách với toạ độ thật của điểm.
//
// Vì sao QR trỏ tới một TRANG WEB chứ không phải mã riêng của app:
// Camera mặc định của mọi điện thoại đều mở được link. Khách không cần cài
// app, không cần trình quét mã — giơ camera lên là xong. App cài rồi thì
// Android tự hỏi có muốn mở bằng app không.
// ============================================================

const crypto = require('crypto');
const store = require('./store');
const { PLACES } = require('./content');
const { haversineKm } = require('./geo');

const COLLECTION = 'stamps';

// Bán kính chấp nhận. Rộng tay 600 m vì:
//   - Chùa và khu du lịch rất rộng, cổng cách chính điện vài trăm mét
//   - GPS trong thung lũng và dưới tán rừng tràm sai số lớn
// Rộng quá thì gian lận được, hẹp quá thì khách đứng ngay tại chỗ vẫn bị từ chối.
const RADIUS_M = Number(process.env.PASSPORT_RADIUS_M) || 600;

// Khoá ký mã QR. Đặt PASSPORT_SECRET trong .env cho bản thật; không đặt thì
// sinh theo máy — mã in ra vẫn dùng được cho tới khi đổi khoá.
const SECRET = process.env.PASSPORT_SECRET || 'baynui-passport-2026';

const digits = (s) => String(s || '').replace(/[^\d]/g, '');
const now = () => new Date().toISOString();

/**
 * Mã bí mật của một trạm, suy ra từ slug + khoá.
 * Không lưu đâu cả: cùng slug và cùng khoá thì luôn ra cùng một mã, nên in
 * QR một lần dùng mãi, mà người ngoài không đoán được.
 */
function codeFor(slug) {
    return crypto.createHmac('sha256', SECRET).update(String(slug)).digest('hex').slice(0, 10);
}

const STATIONS = 'stations';
const REWARDS_COLL = 'rewards';

/** Bỏ dấu tiếng Việt để dựng slug. */
const slugify = (s) => String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);

const symbolOf = (name) =>
    String(name).replace(/[^A-Za-zÀ-ỹ]/g, '').charAt(0).toUpperCase() || '?';

/**
 * Lần đầu chạy thì lấy các địa điểm có toạ độ trong content.js làm điểm khởi
 * đầu, để admin có sẵn cái mà sửa thay vì nhìn màn hình trống.
 */
function seedIfEmpty() {
    if ((store.readAll(STATIONS) || []).length) return;
    for (const p of PLACES) {
        if (!Number.isFinite(p.lat) || !Number.isFinite(p.lng)) continue;
        store.insert(STATIONS, {
            id: `sta_${p.slug}`,
            slug: p.slug,
            name: String(p.name).split('—')[0].trim(),
            area: p.area || '',
            lat: p.lat,
            lng: p.lng,
            image: p.image || '',
            symbol: symbolOf(p.name),
            active: true,
            createdAt: now(),
        });
    }
}

/**
 * Các điểm đóng dấu đang bật.
 *
 * Admin thêm/sửa/xoá được, vì mỗi homestay có bộ điểm khác nhau và mùa nào
 * cũng có thể đổi. Riêng SLUG thì cố định sau khi tạo — mã QR ký theo slug,
 * đổi slug là toàn bộ tấm đã in ra ngoài thực địa hỏng hết.
 */
function stations({ includeHidden = false } = {}) {
    seedIfEmpty();
    return (store.readAll(STATIONS) || [])
        .filter(s => includeHidden || s.active !== false)
        .map(s => ({
            id: s.id,
            slug: s.slug,
            name: s.name,
            short: s.name,
            area: s.area || '',
            lat: s.lat,
            lng: s.lng,
            image: s.image || '',
            symbol: s.symbol || symbolOf(s.name),
            active: s.active !== false,
        }));
}

/** Thêm mới hoặc sửa một điểm đóng dấu. */
function saveStation({ id = '', name, area = '', lat, lng, image = '', symbol = '', active = true }) {
    const bad = (message, code = 'INVALID_STATION') => {
        const err = new Error(message);
        err.status = 400; err.code = code;
        throw err;
    };

    const title = String(name || '').trim();
    if (title.length < 2) bad('Nhập tên điểm đóng dấu.');
    const la = Number.parseFloat(lat);
    const ln = Number.parseFloat(lng);
    if (!Number.isFinite(la) || !Number.isFinite(ln)) bad('Toạ độ chưa hợp lệ.');
    if (la < 8 || la > 24 || ln < 102 || ln > 110) {
        bad('Toạ độ nằm ngoài Việt Nam. Bạn kiểm tra lại vĩ độ/kinh độ có bị đảo không.');
    }

    seedIfEmpty();
    const data = {
        name: title,
        area: String(area || '').trim(),
        lat: la,
        lng: ln,
        image: String(image || '').trim(),
        symbol: (String(symbol || '').trim() || symbolOf(title)).charAt(0).toUpperCase(),
        active: active !== false,
        updatedAt: now(),
    };

    if (id) {
        const existing = store.find(STATIONS, s => s.id === id);
        if (!existing) bad('Không tìm thấy điểm này.', 'STATION_NOT_FOUND');
        // KHÔNG đổi slug: mã QR đã in ngoài thực địa ký theo slug này
        return store.update(STATIONS, id, data);
    }

    let slug = slugify(title);
    if (!slug) bad('Tên điểm không tạo được mã. Bạn đặt tên khác giúp mình.');
    // Trùng slug thì thêm số, không thì hai điểm dùng chung một mã QR
    const taken = new Set((store.readAll(STATIONS) || []).map(s => s.slug));
    if (taken.has(slug)) {
        let n = 2;
        while (taken.has(`${slug}-${n}`)) n += 1;
        slug = `${slug}-${n}`;
    }

    return store.insert(STATIONS, {
        id: `sta_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
        slug,
        ...data,
        createdAt: now(),
    });
}

/**
 * Xoá một điểm.
 * Con dấu khách đã đóng thì GIỮ NGUYÊN — xoá đi là cướp mất thành quả của họ,
 * và cuốn hộ chiếu sẽ hụt số một cách khó hiểu.
 */
function removeStation(id) {
    const row = store.find(STATIONS, s => s.id === id);
    if (!row) return false;
    store.remove(STATIONS, id);
    return true;
}

const findStation = (slug) => stations().find(s => s.slug === slug) || null;

/**
 * Cấp bậc theo số dấu. Đặt mốc thấp ở đầu để khách thấy tiến bộ ngay từ dấu
 * đầu tiên — không ai kiên nhẫn với thanh tiến trình đứng yên.
 */
const LEVELS = [
    { min: 0, name: 'Khách phương xa', level: 1 },
    { min: 1, name: 'Người ghé Bảy Núi', level: 2 },
    { min: 3, name: 'Người thuộc đường', level: 3 },
    { min: 5, name: 'Người giữ chuyện', level: 4 },
    { min: 6, name: 'Người Bảy Núi', level: 5 },
];

const levelFor = (count) => [...LEVELS].reverse().find(l => count >= l.min) || LEVELS[0];

/**
 * Ưu đãi mở khoá theo số dấu.
 *
 * Đây là chỗ đối tác trả tiền để có mặt — cũng là lý do hộ chiếu này không
 * chỉ để chơi vui. Vì vậy admin phải tự thêm sửa được: hôm nay là quà lưu
 * niệm của homestay, mai là voucher của quán ăn đối tác mới ký.
 */
const DEFAULT_REWARDS = [
    { need: 3, code: 'BAYNUI3', title: 'Giảm 10% một bữa ăn', note: 'Áp dụng tại quán đối tác của LOCALMATE.', partner: '' },
    { need: 5, code: 'BAYNUI5', title: 'Giảm 15% một đêm lưu trú', note: 'Đặt qua LOCALMATE, trừ ngày lễ.', partner: '' },
    { need: 6, code: 'BAYNUI6', title: 'Tặng một chuyến xe trong vùng', note: 'Cự ly dưới 15 km, đặt trước 1 ngày.', partner: '' },
];

function seedRewardsIfEmpty() {
    if ((store.readAll(REWARDS_COLL) || []).length) return;
    for (const r of DEFAULT_REWARDS) {
        store.insert(REWARDS_COLL, {
            id: `rw_${r.code.toLowerCase()}`,
            ...r,
            active: true,
            createdAt: now(),
        });
    }
}

/** Danh sách ưu đãi, sắp theo số dấu cần có. */
function rewardList({ includeHidden = false } = {}) {
    seedRewardsIfEmpty();
    return (store.readAll(REWARDS_COLL) || [])
        .filter(r => includeHidden || r.active !== false)
        .sort((a, b) => a.need - b.need);
}

/** Thêm mới hoặc sửa một ưu đãi. */
function saveReward({ id = '', title, note = '', need, code = '', partner = '', active = true }) {
    const bad = (message, errCode = 'INVALID_REWARD') => {
        const err = new Error(message);
        err.status = 400; err.code = errCode;
        throw err;
    };

    const name = String(title || '').trim();
    if (name.length < 2) bad('Nhập tên phần thưởng.');

    const total = stations().length;
    const needed = Math.round(Number(need));
    if (!Number.isFinite(needed) || needed < 1) bad('Số dấu cần có phải từ 1 trở lên.');
    if (needed > total) {
        bad(`Hiện chỉ có ${total} điểm đóng dấu, nên không ai đạt được ${needed} dấu. `
            + 'Bạn thêm điểm trước, hoặc hạ mốc này xuống.');
    }

    seedRewardsIfEmpty();
    const data = {
        title: name,
        note: String(note || '').trim(),
        need: needed,
        // Mã để khách đọc cho nhân viên. Không đặt thì tự sinh theo mốc dấu.
        code: (String(code || '').trim() || `BAYNUI${needed}`).toUpperCase().slice(0, 20),
        partner: String(partner || '').trim(),
        active: active !== false,
        updatedAt: now(),
    };

    if (id) {
        const existing = store.find(REWARDS_COLL, r => r.id === id);
        if (!existing) bad('Không tìm thấy phần thưởng này.', 'REWARD_NOT_FOUND');
        return store.update(REWARDS_COLL, id, data);
    }
    return store.insert(REWARDS_COLL, {
        id: `rw_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
        ...data,
        createdAt: now(),
    });
}

function removeReward(id) {
    const row = store.find(REWARDS_COLL, r => r.id === id);
    if (!row) return false;
    store.remove(REWARDS_COLL, id);
    return true;
}

/** Chủ sở hữu một cuốn hộ chiếu: theo tài khoản nếu có, không thì theo số điện thoại. */
function ownerKey({ userId = '', phone = '' }) {
    if (userId) return `u:${userId}`;
    const d = digits(phone);
    return d ? `p:${d}` : '';
}

function stampsOf(owner) {
    if (!owner) return [];
    return (store.readAll(COLLECTION) || [])
        .filter(s => s.owner === owner)
        .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
}

/**
 * Đóng dấu.
 * @throws Error có .status/.code để tầng API trả thông báo tiếng Việt.
 */
function claim({ slug, code, lat, lng, userId = '', phone = '', name = '' }) {
    const bad = (status, errCode, message, extra = {}) => {
        const err = new Error(message);
        err.status = status;
        err.code = errCode;
        Object.assign(err, extra);
        throw err;
    };

    const station = findStation(slug);
    if (!station) bad(404, 'STATION_NOT_FOUND', 'Không nhận ra điểm đóng dấu này.');

    // So sánh theo thời gian hằng định, khỏi bị dò mã bằng cách đo thời gian
    const expected = codeFor(slug);
    const given = String(code || '');
    const okCode = given.length === expected.length
        && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
    if (!okCode) bad(403, 'BAD_CODE', 'Mã QR không hợp lệ. Bạn quét lại mã dán tại điểm nhé.');

    const owner = ownerKey({ userId, phone });
    if (!owner) bad(400, 'NEED_IDENTITY', 'Cần đăng nhập hoặc nhập số điện thoại để giữ con dấu.');

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        bad(400, 'NEED_LOCATION',
            'Cần bật định vị để xác nhận bạn đang ở đây. Con dấu chỉ đóng được khi bạn tới tận nơi.');
    }

    // Kiểm tra khoảng cách — đây là thứ giữ cho con dấu có giá trị
    const distanceM = Math.round(haversineKm(lat, lng, station.lat, station.lng) * 1000);
    if (distanceM > RADIUS_M) {
        bad(403, 'TOO_FAR',
            `Bạn đang cách ${station.short} khoảng ${(distanceM / 1000).toFixed(1)} km. `
            + 'Con dấu chỉ đóng được khi bạn có mặt tại điểm.',
            { distance_m: distanceM });
    }

    const already = stampsOf(owner).find(s => s.slug === slug);
    if (already) {
        bad(409, 'ALREADY_STAMPED', `Bạn đã có dấu ${station.short} rồi. Thử điểm khác nhé!`);
    }

    return store.insert(COLLECTION, {
        id: `st_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        owner,
        slug,
        name: station.short,
        symbol: station.symbol,
        holderName: String(name || '').slice(0, 80),
        lat,
        lng,
        distanceM,
        createdAt: now(),
    });
}

/** Toàn bộ cuốn hộ chiếu để vẽ ra màn hình. */
function view({ userId = '', phone = '', name = '' }) {
    const owner = ownerKey({ userId, phone });
    const mine = stampsOf(owner);
    const earned = new Set(mine.map(s => s.slug));
    const count = mine.length;
    const all = stations();
    const level = levelFor(count);

    return {
        holder_name: name || mine.find(s => s.holderName)?.holderName || '',
        count,
        total: all.length,
        level: level.level,
        level_name: level.name,
        // Còn bao nhiêu dấu nữa lên cấp — thanh tiến trình cần con số này
        next_level_in: (LEVELS.find(l => l.min > count)?.min ?? count) - count,
        stamps: all.map((s) => {
            const got = mine.find(m => m.slug === s.slug);
            return {
                slug: s.slug,
                name: s.short,
                symbol: s.symbol,
                area: s.area,
                image: s.image,
                lat: s.lat,
                lng: s.lng,
                earned: Boolean(got),
                earned_at: got?.createdAt || '',
            };
        }),
        rewards: rewardList().map(r => ({
            id: r.id,
            need: r.need,
            title: r.title,
            note: r.note,
            partner: r.partner || '',
            unlocked: count >= r.need,
            // Chỉ đưa mã khi đã đủ dấu, không thì ai cũng chép mã đem đi dùng
            code: count >= r.need ? r.code : '',
            missing: Math.max(0, r.need - count),
        })),
    };
}

/**
 * Nội dung in ra mã QR cho từng trạm.
 * Trỏ vào trang web để camera mặc định mở được, không cần app.
 */
function qrTargets(baseUrl) {
    const root = String(baseUrl || '').replace(/\/$/, '');
    return stations().map(s => ({
        slug: s.slug,
        name: s.short,
        area: s.area,
        lat: s.lat,
        lng: s.lng,
        url: `${root}/dau.html?s=${encodeURIComponent(s.slug)}&k=${codeFor(s.slug)}`,
    }));
}

module.exports = {
    stations, findStation, codeFor, claim, view, qrTargets,
    stampsOf, ownerKey, levelFor,
    saveStation, removeStation,
    rewardList, saveReward, removeReward,
    RADIUS_M, LEVELS,
};
