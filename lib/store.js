// ============================================================
// LOCALMATE — Kho lưu trữ JSON đơn giản trên máy chủ
// ============================================================
// Dùng cho hồ sơ đối tác.
//
// Vì sao không dùng Firestore cho phần này:
//   Ghi vào collection mới đòi hỏi deploy lại firestore.rules — một thao tác
//   thủ công trên Firebase Console. Nếu quên hoặc rules bị đặt lại thì toàn bộ
//   luồng đăng ký đối tác chết mà không rõ nguyên nhân. Lưu tại đây thì chạy
//   được ngay, không phụ thuộc cấu hình bên ngoài.
//
// Đơn đặt dịch vụ vẫn nằm ở Firestore như cũ (rules cho bookings đã có sẵn),
// nên Web, App và trang Admin vẫn dùng chung một nguồn đơn hàng.
//
// Khi lên production nhiều máy chủ thì thay bằng PostgreSQL — xem PHẦN C của
// KE_HOACH_PHAT_TRIEN_BAY_NUI_STAY.txt.
// ============================================================

const fs = require('fs');
const path = require('path');

/**
 * Nơi cất dữ liệu.
 *
 * Mặc định là thư mục data/ ngay trong dự án — tiện khi chạy ở máy nhà.
 *
 * Trên máy chủ thật thì PHẢI đặt BAYNUI_DATA_DIR ra một chỗ NGOÀI thư mục mã
 * nguồn. Lý do: mỗi lần cập nhật web là kéo mã mới về đè lên thư mục cũ; để
 * data/ nằm bên trong thì hồ sơ đối tác, tin phòng, sổ quỹ và hộ chiếu của
 * khách bay theo lần deploy đó. Mất tiền thật, không phải mất file tạm.
 */
const DATA_DIR = process.env.BAYNUI_DATA_DIR
    ? path.resolve(process.env.BAYNUI_DATA_DIR)
    : path.join(__dirname, '..', 'data');

function filePathOf(name) {
    return path.join(DATA_DIR, `${name}.json`);
}

function ensureDir() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

/** Đọc toàn bộ bản ghi. Trả mảng rỗng nếu chưa có file hoặc file hỏng. */
function readAll(name) {
    try {
        const raw = fs.readFileSync(filePathOf(name), 'utf8');
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
        if (err.code !== 'ENOENT') console.error(`[store:${name}] đọc lỗi:`, err.message);
        return [];
    }
}

/** Ghi đè toàn bộ. Ghi ra file tạm rồi đổi tên để không hỏng dữ liệu nếu tắt máy giữa chừng. */
function writeAll(name, rows) {
    ensureDir();
    const target = filePathOf(name);
    const temp = `${target}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(rows, null, 2), 'utf8');
    fs.renameSync(temp, target);
    return rows;
}

function nextId(prefix) {
    return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

/** Thêm bản ghi mới, tự sinh id. */
function insert(name, data, idPrefix = 'rec') {
    const rows = readAll(name);
    const row = { id: nextId(idPrefix), ...data };
    rows.push(row);
    writeAll(name, rows);
    return row;
}

/** Cập nhật một vài trường của bản ghi. Trả về bản ghi mới hoặc null. */
function update(name, id, patch) {
    const rows = readAll(name);
    const index = rows.findIndex(r => r.id === id);
    if (index === -1) return null;
    rows[index] = { ...rows[index], ...patch };
    writeAll(name, rows);
    return rows[index];
}

function remove(name, id) {
    const rows = readAll(name);
    const next = rows.filter(r => r.id !== id);
    if (next.length === rows.length) return false;
    writeAll(name, next);
    return true;
}

const find = (name, predicate) => readAll(name).find(predicate) || null;

module.exports = { readAll, writeAll, insert, update, remove, find };
