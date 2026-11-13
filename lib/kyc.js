// ============================================================
// LOCALMATE — Giấy tờ tuỳ thân của đối tác
// ============================================================
// Trước đây ai điền xong biểu mẫu cũng thành đối tác chờ duyệt, mà Admin
// duyệt thì chỉ nhìn được cái tên với số điện thoại. Tên gõ vào ô trống thì
// gõ gì chẳng được. Khách đặt phòng là gửi tiền cọc cho người lạ, nên phải
// biết người đứng sau tài khoản đó là ai thật.
//
// Ở đây giữ ảnh CCCD hai mặt. Khác hẳn ảnh phòng nên chỗ cất cũng phải khác:
//
//   Ảnh phòng   → public/uploads/  → ai có đường dẫn cũng xem được. Đúng, vì
//                 ảnh phòng vốn để khoe.
//   Ảnh CCCD    → THƯ MỤC KÍN, express.static KHÔNG chạm tới. Ra được ngoài
//                 chỉ qua đúng một cửa /v1/admin/... có kiểm tra quyền Admin.
//
// Nếu để chung public/uploads/ thì tên tệp tuy khó đoán nhưng vẫn là công
// khai: lộ một đường dẫn trong lịch sử trình duyệt, trong log, trong một cái
// ảnh chụp màn hình — là CCCD của người ta nằm ngoài đường. Rủi ro đó không
// đáng để đổi lấy vài dòng mã tiết kiệm được.
//
// Số CCCD cũng không trả nguyên vẹn cho bất kỳ màn hình nào ngoài màn hình
// Admin đang xét duyệt: mọi nơi khác chỉ thấy 4 số cuối.
// ============================================================

const fs = require('fs');
const path = require('path');
const { sniffImage, MAX_BYTES } = require('./uploads');

/**
 * Thư mục kín. Mặc định data/kyc/ — cùng chỗ với dữ liệu, tức là NGOÀI thư
 * mục public, nên không có route tĩnh nào phục vụ nó.
 */
const KYC_DIR = process.env.BAYNUI_KYC_DIR
    ? path.resolve(process.env.BAYNUI_KYC_DIR)
    : path.join(
        process.env.BAYNUI_DATA_DIR
            ? path.resolve(process.env.BAYNUI_DATA_DIR)
            : path.join(__dirname, '..', 'data'),
        'kyc',
    );

/** Hai mặt của thẻ. */
const SIDES = ['front', 'back'];
const SIDE_LABEL = { front: 'mặt trước', back: 'mặt sau' };

function ensureDir() {
    if (!fs.existsSync(KYC_DIR)) {
        // 0o700: chỉ chủ tiến trình đọc được. Trên Windows cờ này bị bỏ qua,
        // nhưng máy chủ thật chạy Linux nên vẫn có tác dụng ở nơi cần.
        fs.mkdirSync(KYC_DIR, { recursive: true, mode: 0o700 });
    }
}

/** Chỉ giữ chữ số: người ta hay gõ "079 123 456 789". */
const chiSo = (s) => String(s || '').replace(/\D/g, '');

/**
 * CCCD 12 số, CMND cũ 9 số. Nhiều bác lớn tuổi vẫn dùng CMND 9 số và giấy đó
 * còn hiệu lực, chặn cứng 12 số là loại nhầm họ ra ngoài.
 */
function hopLe(soGiayTo) {
    const so = chiSo(soGiayTo);
    return so.length === 9 || so.length === 12;
}

/** "079123456789" → "••••••••6789". Dùng cho mọi màn hình không phải xét duyệt. */
function che(soGiayTo) {
    const so = chiSo(soGiayTo);
    if (!so) return '';
    if (so.length <= 4) return so;
    return '•'.repeat(so.length - 4) + so.slice(-4);
}

/**
 * Lưu một mặt thẻ. Trả về tên tệp (KHÔNG phải đường dẫn web — cố tình, để
 * không ai lỡ tay nhét thẳng vào thẻ <img> của trang công khai).
 */
function luuAnh(buffer, partnerId, side) {
    if (!SIDES.includes(side)) {
        const e = new Error('Chỉ nhận mặt trước hoặc mặt sau.'); e.code = 'BAD_SIDE'; throw e;
    }
    if (!buffer || !buffer.length) {
        const e = new Error('Không nhận được dữ liệu ảnh.'); e.code = 'EMPTY'; throw e;
    }
    if (buffer.length > MAX_BYTES) {
        const e = new Error('Ảnh quá lớn.'); e.code = 'TOO_BIG'; throw e;
    }
    // Kiểm bằng chữ ký đầu tệp, không tin phần mở rộng client khai
    const kind = sniffImage(buffer);
    if (!kind) {
        const e = new Error('Tệp không phải ảnh JPG, PNG hay WebP.'); e.code = 'BAD_TYPE'; throw e;
    }

    ensureDir();
    const chu = String(partnerId).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32) || 'unknown';
    const ten = `${chu}_${side}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}.${kind.ext}`;

    const dich = path.join(KYC_DIR, ten);
    const tam = `${dich}.tmp`;
    fs.writeFileSync(tam, buffer, { mode: 0o600 });
    fs.renameSync(tam, dich);

    return { file: ten, bytes: buffer.length, mime: kind.mime };
}

/** Chặn ../ và mọi thứ không phải tên tệp do chính mình sinh ra. */
function tenAnToan(file) {
    const ten = String(file || '');
    if (!ten || ten.includes('/') || ten.includes('\\') || ten.includes('..')) return '';
    if (!/^[A-Za-z0-9_.-]+$/.test(ten)) return '';
    return ten;
}

/** Đọc một mặt thẻ để Admin xem. Trả null nếu không còn tệp. */
function docAnh(file) {
    const ten = tenAnToan(file);
    if (!ten) return null;
    try {
        const buffer = fs.readFileSync(path.join(KYC_DIR, ten));
        const kind = sniffImage(buffer);
        return { buffer, mime: kind ? kind.mime : 'application/octet-stream' };
    } catch (_) {
        return null;
    }
}

function xoaAnh(file) {
    const ten = tenAnToan(file);
    if (!ten) return false;
    try {
        fs.unlinkSync(path.join(KYC_DIR, ten));
        return true;
    } catch (_) {
        return false;
    }
}

/**
 * Xoá sạch giấy tờ của một hồ sơ.
 *
 * Gọi khi Admin xoá hồ sơ đối tác. Đã hứa với người ta là giữ kín thì hồ sơ
 * đi rồi ảnh CCCD phải đi theo — để lại một thư mục đầy ảnh CCCD của những
 * người không còn liên quan gì tới mình là chuyện không nên có.
 */
function xoaHetCua(profile) {
    let n = 0;
    for (const side of SIDES) {
        const file = profile && profile[side === 'front' ? 'idFrontFile' : 'idBackFile'];
        if (file && xoaAnh(file)) n += 1;
    }
    return n;
}

/** Đủ giấy tờ để Admin xét chưa. */
const duGiayTo = (p) => Boolean(p && p.idNumber && p.idFrontFile && p.idBackFile);

/**
 * Phần giấy tờ hiện cho Admin trong DANH SÁCH — vẫn là số đã che.
 * Số đầy đủ chỉ lộ ra ở cửa xem chi tiết, và mỗi lần xem đều có ghi nhật ký.
 */
function tomTat(p) {
    return {
        id_name: p.idName || '',
        id_masked: che(p.idNumber),
        id_has_front: Boolean(p.idFrontFile),
        id_has_back: Boolean(p.idBackFile),
        id_complete: duGiayTo(p),
        id_submitted_at: p.idSubmittedAt || '',
        id_verified: Boolean(p.idVerified),
    };
}

module.exports = {
    KYC_DIR, SIDES, SIDE_LABEL,
    chiSo, hopLe, che,
    luuAnh, docAnh, xoaAnh, xoaHetCua,
    duGiayTo, tomTat,
};
