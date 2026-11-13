// ============================================================
// LOCALMATE — Lịch phòng: những đêm chủ nhà tự đóng
// ============================================================
// Trước đây chỗ nghỉ chỉ có một cái công tắc "còn / hết" dùng chung cho MỌI
// ngày. Chủ nhà nghỉ Tết ba hôm thì phải tắt cả phòng, thành ra mất luôn đơn
// của những ngày khác trong tháng. Khách quen gọi điện đặt thẳng hai đêm cuối
// tuần thì trên hệ thống hai đêm đó vẫn trống, ai đặt online cũng nhận —
// và tới nơi mới vỡ ra là trùng.
//
// Ở đây giữ danh sách TỪNG ĐÊM chủ nhà tự đóng. Nó cộng với những đêm đã có
// khách đặt qua hệ thống thành lịch thật của phòng.
//
// Quy ước ngày giống hệt chỗ tính đơn: mỗi bản ghi là MỘT ĐÊM. Khách nhận
// phòng 20 trả phòng 22 là chiếm đêm 20 và 21, không chiếm đêm 22 — tính cả
// hai đầu thì mỗi lượt khách tự làm mất một đêm trống.
// ============================================================

const store = require('./store');

const COLLECTION = 'room_blocks';

/** "2026-09-20" — chỉ nhận đúng dạng này, khỏi lẫn với giờ giấc múi giờ. */
const laNgay = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));

const khoa = (listingId, date) => `${listingId}|${date}`;

/** Những đêm đã đóng của một tin đăng, trong khoảng [from, to). */
function dongTrongKhoang(listingId, from, to) {
    return store.readAll(COLLECTION)
        .filter(r => String(r.listingId) === String(listingId))
        .filter(r => r.date >= from && r.date < to)
        .map(r => r.date)
        .sort();
}

/** Toàn bộ đêm đã đóng của một tin đăng, từ hôm nay trở đi. */
function dongSapToi(listingId) {
    const homNay = new Date().toISOString().slice(0, 10);
    return store.readAll(COLLECTION)
        .filter(r => String(r.listingId) === String(listingId) && r.date >= homNay)
        .map(r => r.date)
        .sort();
}

/** Đêm này có bị chủ nhà đóng không. */
function daDong(listingId, date) {
    return Boolean(store.find(COLLECTION, r =>
        String(r.listingId) === String(listingId) && r.date === date));
}

/**
 * Đóng một loạt đêm.
 *
 * Bỏ qua ngày đã đóng rồi thay vì báo lỗi: chủ nhà quét chọn cả tuần trong đó
 * có hai hôm đã đóng từ trước là chuyện bình thường, bắt họ bỏ chọn từng ngày
 * mới cho bấm thì phiền vô ích.
 *
 * KHÔNG cho đóng ngày đã có khách đặt — việc đó phải huỷ đơn đàng hoàng và
 * báo cho khách, chứ không phải lặng lẽ đóng lịch rồi coi như xong.
 */
function dong(listingId, dates, { lyDo = '', boQua = [] } = {}) {
    const homNay = new Date().toISOString().slice(0, 10);
    const daCoKhach = new Set(boQua);
    const them = [];
    const tuChoi = [];

    for (const d of dates) {
        if (!laNgay(d)) continue;
        if (d < homNay) continue;                   // quá khứ đóng cũng vô nghĩa
        if (daCoKhach.has(d)) { tuChoi.push(d); continue; }
        if (daDong(listingId, d)) continue;
        them.push(store.insert(COLLECTION, {
            id: `bl_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
            key: khoa(listingId, d),
            listingId: String(listingId),
            date: d,
            reason: String(lyDo || '').slice(0, 120),
            createdAt: new Date().toISOString(),
        }));
    }
    return { added: them.length, blocked_by_booking: tuChoi };
}

/** Mở lại một loạt đêm. */
function mo(listingId, dates) {
    let n = 0;
    for (const d of dates) {
        const row = store.find(COLLECTION, r =>
            String(r.listingId) === String(listingId) && r.date === d);
        if (row && store.remove(COLLECTION, row.id)) n += 1;
    }
    return { removed: n };
}

/** Xoá sạch lịch của một tin đăng — gọi khi tin bị xoá hẳn. */
function xoaHetCua(listingId) {
    const rows = store.readAll(COLLECTION)
        .filter(r => String(r.listingId) === String(listingId));
    for (const r of rows) store.remove(COLLECTION, r.id);
    return rows.length;
}

module.exports = {
    COLLECTION, laNgay,
    dongTrongKhoang, dongSapToi, daDong, dong, mo, xoaHetCua,
};
