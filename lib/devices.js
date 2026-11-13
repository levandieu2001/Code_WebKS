// ============================================================
// LOCALMATE — Danh bạ thiết bị nhận push
// ============================================================
// FCM gửi tới TOKEN THIẾT BỊ, không gửi tới "tài khoản". Nên phải nhớ máy nào
// là của ai:
//   audience 'partner' → theo partnerId  (tài xế, khách sạn, tour)
//   audience 'guest'   → theo số điện thoại đã đặt
//   audience 'admin'   → máy của chủ nhà
//
// Một người có thể có nhiều máy (điện thoại + máy tính bảng), và một máy có
// thể đổi chủ (tài xế nghỉ, người khác đăng nhập). Vì vậy token là KHOÁ CHÍNH:
// đăng ký lại cùng token thì ghi đè chủ mới, chứ không tạo thêm bản ghi — nếu
// không, chuyến của tài xế cũ sẽ nổ sang máy người khác.
// ============================================================

const store = require('./store');

const COLLECTION = 'devices';
const STALE_MS = 60 * 24 * 60 * 60 * 1000;   // 60 ngày không dùng thì bỏ

const digits = (s) => String(s || '').replace(/[^\d]/g, '');
const now = () => new Date().toISOString();

/** Ghi nhận một thiết bị. Trả về bản ghi đã lưu, hoặc null nếu thiếu dữ liệu. */
function register({ token, audience, partnerId = '', phone = '', platform = 'android' }) {
    if (!token || !['admin', 'partner', 'guest'].includes(audience)) return null;

    const existing = store.find(COLLECTION, d => d.token === token);
    const data = {
        token,
        audience,
        partnerId: String(partnerId || ''),
        phone: digits(phone),
        platform,
        updatedAt: now(),
    };

    // Cùng token = cùng một cái máy → ghi đè chủ mới
    if (existing) return store.update(COLLECTION, existing.id, data);

    return store.insert(COLLECTION, {
        id: `dv_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        ...data,
        createdAt: now(),
    });
}

function remove(token) {
    const row = store.find(COLLECTION, d => d.token === token);
    if (!row) return false;
    store.remove(COLLECTION, row.id);
    return true;
}

/** Token của những máy cần nhận một thông báo. */
function tokensFor({ audience, partnerId = '', phone = '' }) {
    const key = digits(phone);
    return (store.readAll(COLLECTION) || [])
        .filter((d) => {
            if (d.audience !== audience) return false;
            if (audience === 'partner') return d.partnerId === String(partnerId);
            if (audience === 'guest') return d.phone === key;
            return true;   // admin: mọi máy quản trị
        })
        .map(d => d.token);
}

/**
 * Mọi token đã đăng ký, không phân biệt là khách hay đối tác.
 *
 * Chỉ dùng cho thông báo gửi cho TẤT CẢ — hiện tại là báo có bản app mới.
 * Đừng dùng cho việc khác: thông báo đơn hàng mà gửi cho cả làng thì phiền
 * người ta và họ sẽ tắt thông báo, mất luôn cả những tin thật sự cần.
 */
const allTokens = () => (store.readAll(COLLECTION) || []).map(d => d.token).filter(Boolean);

/** Dọn token quá lâu không dùng, cho khỏi gửi vào hư không. */
function prune() {
    const rows = store.readAll(COLLECTION) || [];
    const cutoff = Date.now() - STALE_MS;
    const keep = rows.filter(d => new Date(d.updatedAt || d.createdAt).getTime() >= cutoff);
    if (keep.length !== rows.length) store.writeAll(COLLECTION, keep);
}

const count = () => (store.readAll(COLLECTION) || []).length;

module.exports = { register, remove, tokensFor, allTokens, prune, count };
