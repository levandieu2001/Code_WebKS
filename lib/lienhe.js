// ============================================================
// LOCALMATE — Thông tin liên hệ, khai ở MỘT chỗ
// ============================================================
// Số điện thoại và email đang nằm rải ở 15 tệp khác nhau. Đổi số thật thì
// phải sửa 25 chỗ, mà sót một chỗ là có khách gọi vào số cũ — và mình không
// biết là họ đã gọi.
//
// Khai ở đây, mọi nơi đọc về. Đổi số là sửa đúng một dòng.
//
// Đọc từ biến môi trường trước, để đổi được mà không phải sửa mã và deploy
// lại — chỉ cần sửa .env trên máy chủ rồi khởi động lại.
// ============================================================

const HOTLINE = process.env.LOCALMATE_HOTLINE || '0833 385 601';
const EMAIL = process.env.LOCALMATE_EMAIL || 'mrdieu37@gmail.com';
const DIA_CHI = process.env.LOCALMATE_ADDRESS || 'Phường Bình Đức, Long Xuyên, An Giang';

/** Dạng bấm gọi được: "0833 385 601" → "+84833385601". */
function soGoi(so = HOTLINE) {
    const s = String(so).replace(/\D/g, '');
    return s.startsWith('0') ? '+84' + s.slice(1) : s;
}

/**
 * Cờ báo "vẫn còn dùng số mẫu".
 *
 * Số và email ở trên đã là CỦA THẬT (đổi ngày 09/09/2026), nên cả hai cờ này
 * đều false. Giữ lại phép kiểm tra chứ không xoá: ai đó lỡ đặt lại biến môi
 * trường về số mẫu cũ thì vẫn có chỗ phát hiện ra.
 *
 * Vì sao phải có cờ này: khách gọi vào số mẫu là gọi cho một người lạ nào đó,
 * còn thư gửi vào tên miền đã chết thì rơi vào hư không mà không ai báo lại —
 * hai kiểu hỏng không bao giờ tự lộ ra.
 */
const LA_MAU = {
    hotline: HOTLINE === '0909 123 456',
    email: EMAIL.endsWith('@baynuieco.vn'),
};

module.exports = { HOTLINE, EMAIL, DIA_CHI, soGoi, LA_MAU };
