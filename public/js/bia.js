// ============================================================
// LOCALMATE — băng trượt ảnh bìa trang chủ
// ============================================================
// Năm tấm ảnh trượt từ phải sang trái, mỗi tấm đứng 5 giây.
//
// Ba thứ hay bị bỏ quên ở loại băng trượt này, làm luôn cho gọn:
//   - Đang rê chuột vào thì dừng, khách còn đang nhìn thì đừng kéo đi.
//   - Chuyển sang tab khác thì dừng hẳn, không chạy nền cho hao pin.
//   - Máy đặt "giảm chuyển động" thì không tự chạy nữa — có người chóng
//     mặt thật với mấy thứ tự động trượt.
(function () {
    'use strict';

    const track = document.getElementById('lm-bia-track');
    const hopCham = document.getElementById('lm-bia-cham');
    if (!track) return;

    const tam = Array.from(track.children);
    if (tam.length < 2) return;

    const DUNG_MOI_TAM = 5000;
    const itChuyenDong = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let i = 0;
    let hen = null;

    // Hàng chấm dựng theo số ảnh thật, thêm bớt ảnh trong HTML là tự khớp
    const cham = tam.map((_, k) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'lm-cham' + (k === 0 ? ' on' : '');
        b.setAttribute('aria-label', 'Ảnh ' + (k + 1));
        b.addEventListener('click', () => { den(k); dat(); });
        hopCham.appendChild(b);
        return b;
    });

    function den(k) {
        i = (k + tam.length) % tam.length;
        track.style.transform = 'translateX(' + (-i * 100) + '%)';
        cham.forEach((c, n) => c.classList.toggle('on', n === i));
        tam.forEach((t, n) => t.classList.toggle('on', n === i));
    }

    function dat() {
        clearTimeout(hen);
        if (itChuyenDong) return;
        hen = setTimeout(() => { den(i + 1); dat(); }, DUNG_MOI_TAM);
    }

    document.getElementById('lm-bia-truoc').addEventListener('click', () => { den(i - 1); dat(); });
    document.getElementById('lm-bia-sau').addEventListener('click', () => { den(i + 1); dat(); });

    const khung = document.getElementById('lm-bia');
    khung.addEventListener('mouseenter', () => clearTimeout(hen));
    khung.addEventListener('mouseleave', dat);

    // Vuốt trên điện thoại
    let x0 = null;
    khung.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    khung.addEventListener('touchend', (e) => {
        if (x0 === null) return;
        const dx = e.changedTouches[0].clientX - x0;
        if (Math.abs(dx) > 45) { den(dx < 0 ? i + 1 : i - 1); dat(); }
        x0 = null;
    }, { passive: true });

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) clearTimeout(hen); else dat();
    });

    den(0);
    dat();
})();
