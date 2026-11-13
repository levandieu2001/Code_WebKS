// ============================================================
// LOCALMATE — Điền thông tin liên hệ vào trang
// ============================================================
// Số điện thoại và email trước đây gõ cứng ở 15 tệp. Đổi số thật thì phải
// sửa 25 chỗ, mà sót một chỗ là có khách gọi vào số cũ — và mình không biết
// là họ đã gọi.
//
// Nay máy chủ giữ một bản duy nhất, tệp này điền vào mọi chỗ có đánh dấu:
//   <span data-lienhe="hotline"></span>   → số điện thoại
//   <a data-lienhe="tel">...</a>          → cả href tel: lẫn chữ hiện ra
//   <span data-lienhe="email"></span>     → email
//   <a data-lienhe="mailto">...</a>       → cả href mailto: lẫn chữ
//   <span data-lienhe="address"></span>   → địa chỉ
//
// Chưa gọi được máy chủ thì để nguyên chữ đang có trong HTML, không xoá
// trắng: trang liên hệ trống trơn thì khách tưởng web hỏng.
// ============================================================

(() => {
    'use strict';

    async function dien() {
        if (!document.querySelector('[data-lienhe]')) return;

        let d;
        try {
            const r = await fetch('/v1/contact');
            d = (await r.json()).data;
        } catch (_) {
            return;   // giữ nguyên chữ có sẵn
        }
        if (!d) return;

        document.querySelectorAll('[data-lienhe]').forEach((el) => {
            const loai = el.getAttribute('data-lienhe');
            if (loai === 'hotline') el.textContent = d.hotline;
            else if (loai === 'email') el.textContent = d.email;
            else if (loai === 'address') el.textContent = d.address;
            else if (loai === 'tel') {
                el.setAttribute('href', 'tel:' + d.hotline_tel);
                if (!el.querySelector('*')) el.textContent = d.hotline;
                else {
                    const chu = el.querySelector('[data-lienhe-chu]');
                    if (chu) chu.textContent = d.hotline;
                }
            } else if (loai === 'mailto') {
                el.setAttribute('href', 'mailto:' + d.email);
                if (!el.querySelector('*')) el.textContent = d.email;
            }
        });
    }

    document.addEventListener('DOMContentLoaded', dien);
})();
