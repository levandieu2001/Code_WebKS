// ============================================================
// LOCALMATE — Đọc hồ sơ khách để điền sẵn biểu mẫu
// ============================================================
// Khách đã lưu họ tên, số điện thoại và sổ địa chỉ ở trang Cài đặt tài khoản
// thì mọi ô đặt hàng nên điền sẵn — chứ lưu rồi mà vẫn phải gõ lại thì cái
// sổ đó chỉ để trang trí.
//
// Chưa đăng nhập thì trả về rỗng và mọi thứ chạy như cũ. Sổ địa chỉ là thứ
// đỡ mất công, không phải hàng rào bắt người ta đăng ký.
//
// Đọc MỘT lần rồi giữ lại: một trang có thể mở ô đặt nhiều lần, gọi máy chủ
// mỗi lần là thừa.
// ============================================================

const LMHoSo = (() => {
    'use strict';

    let daDoc = false;
    let HS = null;

    const coPhien = () => Boolean(window.BayNuiUser && BayNuiUser.coPhien());

    /** Hồ sơ khách, hoặc null nếu chưa đăng nhập / chưa đọc được. */
    async function doc() {
        if (daDoc) return HS;
        daDoc = true;
        if (!coPhien()) return null;
        try {
            HS = (await BayNuiUser.api('/v1/my/profile')).data || null;
        } catch (_) {
            HS = null;   // hỏng thì thôi, biểu mẫu vẫn gõ tay được
        }
        return HS;
    }

    /** Quên bản đã đọc — gọi sau khi khách sửa hồ sơ hoặc đăng xuất. */
    function quen() {
        daDoc = false;
        HS = null;
    }

    const diaChiMacDinh = () => {
        const ds = (HS && HS.addresses) || [];
        return ds.find(a => a.is_default) || ds[0] || null;
    };

    const soDiaChi = () => (HS && HS.addresses) || [];

    document.addEventListener('baynui:signout', quen);
    document.addEventListener('baynui:signin', quen);

    return { doc, quen, diaChiMacDinh, soDiaChi, hoSo: () => HS, coPhien };
})();

window.LMHoSo = LMHoSo;
