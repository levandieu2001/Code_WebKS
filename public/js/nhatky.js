// ============================================================
// LOCALMATE — Nhật ký chuyến đi
// ============================================================
// Gọi /v1/journal rồi vẽ ra một dòng thời gian. Khách nhớ lại chuyến đi, và
// quan trọng hơn: đây là trang họ chụp màn hình gửi bạn bè.
// ============================================================

const Journal = (() => {
    'use strict';

    const $ = (id) => document.getElementById(id);
    const esc = (s) => String(s == null ? '' : s)
        .replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const tien = (n) => Number(n || 0).toLocaleString('vi-VN') + 'đ';

    const ngayVN = (iso) => {
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
        return m ? `${Number(m[3])}/${Number(m[2])}/${m[1]}` : (iso || '');
    };

    // Mỗi loại mục một biểu tượng và một màu, để mắt lướt qua là phân biệt được
    const LOAI = {
        stay: { icon: 'bed-double', ten: 'Lưu trú' },
        transport: { icon: 'car-front', ten: 'Di chuyển' },
        tour: { icon: 'backpack', ten: 'Tour' },
        stamp: { icon: 'stamp', ten: 'Con dấu' },
    };

    function theTongKet(s) {
        const o = [
            [s.trips, 'chuyến đi'],
            [s.nights, 'đêm nghỉ'],
            [`${s.stamps}/${s.stations_total}`, 'con dấu'],
            [tien(s.spent), 'đã chi'],
        ];
        return `<div class="nk-stats">${o.map(([v, l]) => `
            <div class="nk-stat"><b>${esc(String(v))}</b><span>${esc(l)}</span></div>`).join('')}</div>`;
    }

    function mucThoiGian(m) {
        const loai = LOAI[m.type] || LOAI.stay;
        return `
        <li class="nk-item${m.cancelled ? ' cancelled' : ''}">
            <div class="nk-dot"><i data-lucide="${loai.icon}"></i></div>
            <div class="nk-content">
                <div class="nk-when">${esc(ngayVN(m.date))} · ${esc(loai.ten)}</div>
                <div class="nk-title">${esc(m.title)}${m.symbol ? ` <span class="nk-symbol">${esc(m.symbol)}</span>` : ''}</div>
                ${m.detail ? `<div class="nk-detail">${esc(m.detail)}</div>` : ''}
                ${m.partner ? `<div class="nk-detail">${esc(m.partner)}</div>` : ''}
                ${m.cancelled ? '<div class="nk-cancel">Đã huỷ</div>'
                              : (m.amount > 0 ? `<div class="nk-amount">${tien(m.amount)}</div>` : '')}
            </div>
        </li>`;
    }

    /** Khách chưa đi lần nào — đừng để trang trống trơn, mời họ bắt đầu. */
    function trongTrơn() {
        return `
        <div class="nk-empty">
            <h2>Chưa có gì trong nhật ký</h2>
            <p>${daDangNhap()
                ? 'Tài khoản này chưa có đơn đặt hay con dấu nào.'
                : 'Số điện thoại này chưa có đơn đặt hay con dấu nào.'}
               Đặt phòng hoặc tới một điểm bất kỳ quét mã QR để mở trang đầu tiên.</p>
            <div class="nk-empty-actions">
                <a class="btn-primary" href="phongnghi.html">Xem phòng</a>
                <a class="btn-outline" href="hochieu.html">Hộ chiếu LOCALMATE</a>
            </div>
        </div>`;
    }

    function ve(d) {
        const host = $('nk-body');
        if (!d.timeline.length) { host.innerHTML = trongTrơn(); return; }

        const s = d.summary;
        const ten = d.holder.name || 'Bạn';
        const khoang = s.first_visit
            ? `Từ ${ngayVN(s.first_visit)} đến ${ngayVN(s.last_visit)}`
            : '';

        host.innerHTML = `
        <article class="nk-card">
            <header class="nk-head">
                <div>
                    <span class="nk-eyebrow">Nhật ký của</span>
                    <h2>${esc(ten)}</h2>
                    ${khoang ? `<p class="nk-range">${esc(khoang)}</p>` : ''}
                </div>
                <button class="btn-outline nk-share" onclick="Journal.share()">
                    <i data-lucide="share-2"></i> Chia sẻ
                </button>
            </header>

            ${theTongKet(s)}

            ${d.stamps.length ? `
            <div class="nk-stamps">
                <h3>Con dấu đã có</h3>
                <div class="nk-stamp-row">
                    ${d.stamps.map(x => `
                        <div class="nk-stamp" title="${esc(x.name)} · ${esc(ngayVN(x.date))}">
                            <b>${esc(x.symbol || x.name.charAt(0))}</b>
                            <span>${esc(x.name)}</span>
                        </div>`).join('')}
                </div>
            </div>` : ''}

            <div class="nk-timeline">
                <h3>Dòng thời gian</h3>
                <ul>${d.timeline.map(mucThoiGian).join('')}</ul>
            </div>
        </article>`;

        if (window.lucide) lucide.createIcons();
    }

    /** Đã đăng nhập thì không hỏi gì cả — token đủ để máy chủ biết đơn nào của ai. */
    const daDangNhap = () => Boolean(window.BayNuiUser && BayNuiUser.coPhien());

    async function load(event) {
        if (event) event.preventDefault();
        const status = $('nk-status');
        const nhapTay = ($('nk-phone')?.value || '').replace(/\D/g, '');

        // Số điện thoại vẫn gửi kèm khi có: khách hay đặt phòng lúc CHƯA đăng
        // nhập, những đơn đó chỉ gắn với số điện thoại chứ không gắn tài khoản.
        const phone = nhapTay || localStorage.getItem('baynui_phone') || '';

        if (!daDangNhap() && phone.length < 10) {
            status.textContent = 'Nhập số điện thoại đã dùng khi đặt, hoặc đăng nhập để xem luôn.';
            return;
        }

        status.textContent = 'Đang dựng nhật ký…';
        $('nk-body').innerHTML = '';

        try {
            const duong = '/v1/journal' + (phone ? '?phone=' + encodeURIComponent(phone) : '');
            const body = daDangNhap()
                ? await BayNuiUser.api(duong)
                : await (async () => {
                    const res = await fetch(duong);
                    const b = await res.json();
                    if (!res.ok) throw new Error(b?.error?.message || 'Không xem được nhật ký.');
                    return b;
                })();

            if (phone) localStorage.setItem('baynui_phone', phone);
            status.textContent = '';
            ve(body);
        } catch (err) {
            status.textContent = err.message;
        }
    }

    /** Chia sẻ bằng hộp thoại sẵn có của máy; máy tính thì chép link. */
    async function share() {
        const url = location.href;
        const text = 'Nhật ký chuyến đi Bảy Núi của mình';
        if (navigator.share) {
            try { await navigator.share({ title: text, url }); return; } catch (_) { /* khách bấm huỷ */ }
        }
        try {
            await navigator.clipboard.writeText(url);
            $('nk-status').textContent = 'Đã chép đường dẫn.';
        } catch (_) {
            $('nk-status').textContent = url;
        }
    }

    // Khách đã tra đơn hoặc xem hộ chiếu trước đó thì điền sẵn số, xem luôn.
    document.addEventListener('DOMContentLoaded', () => {
        const nho = localStorage.getItem('baynui_phone');
        if (nho && $('nk-phone')) $('nk-phone').value = nho;

        // Đăng nhập rồi thì ô nhập số chỉ làm rối — giấu đi và mở nhật ký luôn.
        if (daDangNhap()) {
            const form = document.getElementById('nk-form');
            if (form) form.style.display = 'none';
            load();
        } else if (nho) {
            load();
        }
    });

    // Vừa đăng nhập / đăng xuất ngay trên trang này thì vẽ lại
    document.addEventListener('baynui:signin', () => {
        const form = document.getElementById('nk-form');
        if (form) form.style.display = 'none';
        load();
    });
    document.addEventListener('baynui:signout', () => {
        const form = document.getElementById('nk-form');
        if (form) form.style.display = '';
        $('nk-body').innerHTML = '';
        $('nk-status').textContent = '';
    });

    return { load, share };
})();
