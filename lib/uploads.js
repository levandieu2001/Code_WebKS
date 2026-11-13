// ============================================================
// LOCALMATE — Nhận ảnh đối tác tải lên
// ============================================================
// Ô "Ảnh" trong biểu mẫu đăng phòng trước đây là Ô CHỮ, đối tác phải gõ
// đường dẫn kiểu "assets/stay-villa.jpg". Chủ khách sạn thật không ai làm
// được — ảnh của họ nằm trong điện thoại. Không có ảnh thật thì tin đăng
// coi như vô dụng.
//
// Ở đây nhận thẳng byte của tệp ảnh (Content-Type: image/*), kiểm tra bằng
// CHỮ KÝ ĐẦU TỆP chứ không tin phần mở rộng hay header do client khai, rồi
// ghi ra public/uploads/ và trả về đường dẫn công khai.
//
// Vì sao ghi ra tệp mà không nhúng base64 vào cơ sở dữ liệu: ảnh phòng
// khoảng 1–3 MB, nhúng vào JSON sẽ phình mọi truy vấn có chứa nó — đã gặp
// đúng lỗi này với ảnh phòng của admin trước đây.
// ============================================================

const fs = require('fs');
const path = require('path');

/**
 * Nơi cất ảnh đối tác tải lên.
 *
 * Mặc định public/uploads/ cho tiện chạy ở máy nhà — express.static phục vụ
 * luôn, khỏi cấu hình gì.
 *
 * Trên máy chủ thật thì đặt BAYNUI_UPLOAD_DIR ra NGOÀI thư mục mã nguồn, cùng
 * lý do với BAYNUI_DATA_DIR: cập nhật web là kéo mã mới đè lên, ảnh phòng thật
 * của khách sạn đối tác sẽ mất sạch và tin đăng của họ thành trắng trơn.
 * server.js đọc cùng biến này để phục vụ ảnh ở đường dẫn /uploads.
 */
const UPLOAD_DIR = process.env.BAYNUI_UPLOAD_DIR
    ? path.resolve(process.env.BAYNUI_UPLOAD_DIR)
    : path.join(__dirname, '..', 'public', 'uploads');
// 12 MB. Trình duyệt đã nén ảnh xuống vài trăm KB trước khi gửi, nên trần này
// chỉ là lưới an toàn. Để 5 MB như trước thì ảnh chụp bằng điện thoại đời mới
// (thường 4–8 MB) bị chặn thẳng, mà đó đúng là thứ chủ khách sạn hay gửi nhất.
const MAX_BYTES = 12 * 1024 * 1024;

/** Nhận diện định dạng bằng vài byte đầu tệp. */
function sniffImage(buffer) {
    if (!buffer || buffer.length < 12) return null;

    // JPEG: FF D8 FF
    if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
        return { ext: 'jpg', mime: 'image/jpeg' };
    }
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (buffer.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))) {
        return { ext: 'png', mime: 'image/png' };
    }
    // WebP: "RIFF" .... "WEBP"
    if (buffer.slice(0, 4).toString('ascii') === 'RIFF'
        && buffer.slice(8, 12).toString('ascii') === 'WEBP') {
        return { ext: 'webp', mime: 'image/webp' };
    }
    return null;
}

function ensureDir() {
    if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/**
 * Lưu ảnh, trả về { url, bytes, mime }.
 * Ném lỗi có .code để route dịch thành thông báo tiếng Việt.
 */
function saveImage(buffer, ownerId = 'anon') {
    if (!buffer || !buffer.length) {
        const e = new Error('Không nhận được dữ liệu ảnh.'); e.code = 'EMPTY'; throw e;
    }
    if (buffer.length > MAX_BYTES) {
        const e = new Error('Ảnh lớn hơn 5 MB.'); e.code = 'TOO_BIG'; throw e;
    }

    const kind = sniffImage(buffer);
    if (!kind) {
        const e = new Error('Tệp không phải ảnh JPG, PNG hay WebP.'); e.code = 'BAD_TYPE'; throw e;
    }

    ensureDir();
    const safeOwner = String(ownerId).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24) || 'anon';
    const name = `${safeOwner}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}.${kind.ext}`;

    // Ghi ra tệp tạm rồi đổi tên, để không sinh ra tệp hỏng nếu đứt giữa chừng
    const target = path.join(UPLOAD_DIR, name);
    const temp = `${target}.tmp`;
    fs.writeFileSync(temp, buffer);
    fs.renameSync(temp, target);

    return { url: `/uploads/${name}`, bytes: buffer.length, mime: kind.mime };
}

/** Xoá ảnh cũ khi đối tác thay ảnh khác. Bỏ qua nếu tệp không còn. */
function removeImage(url) {
    const name = String(url || '').replace(/^\/uploads\//, '');
    if (!name || name.includes('/') || name.includes('..')) return false;
    try {
        fs.unlinkSync(path.join(UPLOAD_DIR, name));
        return true;
    } catch (_) {
        return false;
    }
}

module.exports = { saveImage, removeImage, sniffImage, MAX_BYTES, UPLOAD_DIR };
