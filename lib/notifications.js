// ============================================================
// LOCALMATE — Thông báo
// ============================================================
// Trước đây mọi việc quan trọng đều diễn ra trong im lặng: tài xế phải MỞ app
// và nhìn màn hình mới biết có đơn; khách đặt xong không biết ai nhận chuyến;
// chủ nhà không biết khách vừa chuyển cọc. Ai lỡ tay tắt màn hình là mất đơn.
//
// Module này là một dòng sự kiện có địa chỉ nhận:
//   audience 'admin'   — chủ nhà / quản trị
//   audience 'partner' — đúng một đối tác, theo partnerId
//   audience 'guest'   — đúng một khách, theo số điện thoại đã đặt
//
// Có hai đường tới tay người nhận, và cần cả hai:
//   1. Push thật qua FCM — tới được cả khi đã tắt app và tắt màn hình.
//   2. Web/app tự hỏi dòng sự kiện này — để xem lại lịch sử, và làm chỗ dựa
//      khi push bị chặn (khách tắt quyền thông báo, máy Trung Quốc cắt nền…).
//
// Vì vậy MỌI thông báo đều được ghi vào đây trước, gửi push sau. Gửi push hỏng
// cũng không mất thông tin: mở app lên là đọc được.
// ============================================================

const store = require('./store');
const fcm = require('./fcm');
const devices = require('./devices');

const COLLECTION = 'notifications';
const MAX_KEEP = 500;          // giữ lại bấy nhiêu bản ghi gần nhất
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const digits = (s) => String(s || '').replace(/[^\d]/g, '');
const now = () => new Date().toISOString();

/**
 * Ghi một thông báo.
 * Trả về bản ghi đã lưu. Không bao giờ ném lỗi ra ngoài: thông báo hỏng thì
 * mặc kệ, chứ không được làm hỏng luôn việc chính (đặt đơn, nhận cọc…).
 */
function push({ audience, partnerId = '', phone = '', kind = '', title = '', body = '', bookingId = '', data = {} }) {
    try {
        if (!['admin', 'partner', 'guest'].includes(audience)) return null;

        const row = store.insert(COLLECTION, {
            id: `nt_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
            audience,
            partnerId: String(partnerId || ''),
            phone: digits(phone),
            kind,
            title: String(title || '').slice(0, 160),
            body: String(body || '').slice(0, 400),
            bookingId: String(bookingId || ''),
            data,
            read: false,
            createdAt: now(),
        });

        prune();
        deliverPush(row);
        return row;
    } catch (err) {
        console.error('[notifications/push]', err.message);
        return null;
    }
}

/**
 * Đẩy thông báo tới điện thoại qua Firebase Cloud Messaging.
 *
 * Chạy KHÔNG chờ (không await): việc chính — đặt đơn, nhận cọc, nổ chuyến —
 * không được đứng lại chờ mạng Google. Gửi hỏng thì chỉ ghi log, vì bản thân
 * thông báo đã nằm trong dòng sự kiện rồi, app mở lên vẫn đọc được.
 *
 * Chưa cấu hình khoá thì im lặng bỏ qua, app vẫn tự hỏi máy chủ như cũ.
 */
function deliverPush(row) {
    if (!fcm.enabled) return;

    const tokens = devices.tokensFor({
        audience: row.audience,
        partnerId: row.partnerId,
        phone: row.phone,
    });
    if (!tokens.length) return;

    const urgent = row.kind === 'ride_offer';

    for (const token of tokens) {
        fcm.send(token, {
            title: row.title,
            body: row.body,
            urgent,
            data: { kind: row.kind, booking_id: row.bookingId, notification_id: row.id },
        })
            .then((res) => {
                // Máy đã gỡ app hoặc cài lại → xoá token, đừng gửi vào hư không
                if (res.gone) devices.remove(token);
                else if (!res.ok) console.warn('[fcm]', res.reason);
            })
            .catch(err => console.warn('[fcm]', err.message));
    }
}

/**
 * Gửi cho MỌI máy đã cài app.
 *
 * Chỉ dùng cho tin cả làng cần biết — hiện tại là báo có bản app mới. Khác
 * push() ở chỗ không lưu vào hộp thông báo của ai cả: đây là tin một lần, lưu
 * lại thì hộp thông báo của mọi khách đều có một dòng giống hệt nhau.
 *
 * @return số máy đã gửi tới
 */
function broadcast({ title, body, data = {} }) {
    if (!fcm.enabled) return 0;
    const tokens = devices.allTokens();

    for (const token of tokens) {
        fcm.send(token, { title, body, urgent: false, data })
            .then((res) => {
                if (res.gone) devices.remove(token);
                else if (!res.ok) console.warn('[fcm/broadcast]', res.reason);
            })
            .catch(err => console.warn('[fcm/broadcast]', err.message));
    }
    return tokens.length;
}

/** Xoá bản ghi quá cũ và cắt bớt cho khỏi phình file. */
function prune() {
    const rows = store.readAll(COLLECTION) || [];
    const cutoff = Date.now() - MAX_AGE_MS;
    const keep = rows
        .filter(r => new Date(r.createdAt).getTime() >= cutoff)
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
        .slice(0, MAX_KEEP);
    if (keep.length !== rows.length) store.writeAll(COLLECTION, keep);
}

/**
 * Thông báo của một người nhận.
 * @param since ISO time — chỉ lấy cái mới hơn mốc này, để app hỏi liên tục mà
 * không phải tải lại toàn bộ danh sách.
 */
function listFor({ audience, partnerId = '', phone = '', since = '', limit = 50 }) {
    const key = digits(phone);
    return (store.readAll(COLLECTION) || [])
        .filter((r) => {
            if (r.audience !== audience) return false;
            if (audience === 'partner' && r.partnerId !== String(partnerId)) return false;
            if (audience === 'guest' && r.phone !== key) return false;
            if (since && String(r.createdAt) <= String(since)) return false;
            return true;
        })
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
        .slice(0, limit);
}

function unreadCount(target) {
    return listFor({ ...target, limit: MAX_KEEP }).filter(r => !r.read).length;
}

/** Đánh dấu đã đọc. Không truyền id nào thì đánh dấu hết của người đó. */
function markRead(target, ids = null) {
    const rows = listFor({ ...target, limit: MAX_KEEP });
    let count = 0;
    for (const r of rows) {
        if (ids && !ids.includes(r.id)) continue;
        if (r.read) continue;
        store.update(COLLECTION, r.id, { read: true });
        count += 1;
    }
    return count;
}

const toPublic = (r) => ({
    id: r.id,
    kind: r.kind,
    title: r.title,
    body: r.body,
    booking_id: r.bookingId,
    data: r.data || {},
    read: !!r.read,
    created_at: r.createdAt,
});

module.exports = { push, broadcast, listFor, unreadCount, markRead, toPublic, prune };
