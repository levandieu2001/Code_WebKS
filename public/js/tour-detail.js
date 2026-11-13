// Trang chi tiết đúng một tour: xem đủ lịch trình trước rồi mới đặt.
(() => {
    'use strict';

    const root = document.getElementById('tour-detail-root');
    const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
    const money = value => Number(value || 0).toLocaleString('vi-VN') + 'đ';
    let tour = null;

    function slug() {
        return new URLSearchParams(location.search).get('slug') || '';
    }

    function schedule(items) {
        if (!items?.length) return '<p class="tour-detail-empty">Đơn vị tour sẽ xác nhận lịch trình cụ thể sau khi nhận đơn.</p>';
        return `<ol class="tour-detail-timeline">${items.map(item => `
            <li><time>${esc(item.time)}</time><span>${esc(item.label)}</span></li>`).join('')}</ol>`;
    }

    function render(t) {
        const included = (t.includes || []).map(item => `
            <li><i data-lucide="circle-check"></i><span>${esc(item)}</span></li>`).join('');
        return `
            <section class="page-hero tour-detail-hero">
                <div class="page-hero-bg"><img src="${esc(t.image)}" alt="${esc(t.name)}"></div>
                <div class="page-hero-overlay"></div>
                <div class="page-hero-content">
                    <a class="tour-detail-back" href="index.html#tour"><i data-lucide="arrow-left"></i> Tour địa phương</a>
                    <span class="hero-badge">${esc(t.duration || 'Tour địa phương')}</span>
                    <h1>${esc(t.name)}</h1>
                    ${t.partner_name ? `<p class="tour-detail-provider"><i data-lucide="building-2"></i>Đơn vị tổ chức: <b>${esc(t.partner_name)}</b></p>` : ''}
                    <p>${esc(t.stops || '')}</p>
                    <div class="tour-detail-hero-meta">
                        <span><i data-lucide="users"></i>${esc(t.pax || 'Liên hệ')}</span>
                        <span><i data-lucide="star"></i>${esc(t.rating || '4.5')}</span>
                        <strong>${money(t.price)}<small>/khách</small></strong>
                    </div>
                </div>
            </section>
            <section class="section-container tour-detail-layout">
                <article class="tour-detail-main">
                    <span class="section-tag">Lịch trình</span>
                    <h2 class="section-title">Bạn sẽ đi những đâu?</h2>
                    ${schedule(t.schedule)}
                </article>
                <aside class="tour-detail-book">
                    <span class="tour-detail-price">${money(t.price)}<small>/khách</small></span>
                    ${t.partner_name ? `<p class="tour-detail-book-provider">Đơn vị: <b>${esc(t.partner_name)}</b></p>` : ''}
                    <p>${esc(t.duration || '')} · ${esc(t.pax || '')}</p>
                    <button type="button" class="btn-primary" id="tour-detail-book">Đặt đúng tour này</button>
                    <small>Bạn chọn ngày đi và số khách ở bước tiếp theo.</small>
                </aside>
            </section>
            <section class="section-container tour-detail-included">
                <div class="section-header">
                    <span class="section-tag">Đã bao gồm</span>
                    <h2 class="section-title">Dịch vụ trong giá tour</h2>
                </div>
                <ul>${included || '<li><span>Đơn vị tour sẽ xác nhận chi tiết khi liên hệ.</span></li>'}</ul>
            </section>`;
    }

    async function load() {
        const value = slug();
        if (!value) {
            root.innerHTML = '<section class="tour-detail-error"><h1>Thiếu mã tour</h1><a class="btn-primary" href="index.html#tour">Xem các tour</a></section>';
            return;
        }
        try {
            const res = await fetch('/v1/tours/' + encodeURIComponent(value));
            const body = await res.json();
            if (!res.ok) throw new Error(body?.error?.message || 'Không tải được tour.');
            tour = body.data;
            root.innerHTML = render(tour);
            document.title = tour.name + ' | LOCALMATE';
            document.getElementById('tour-detail-book').addEventListener('click', () => BayNuiBooking.open('tour', tour));
            if (window.lucide) lucide.createIcons();
            if (typeof window.observeReveals === 'function') window.observeReveals();
        } catch (err) {
            root.innerHTML = `<section class="tour-detail-error"><h1>Không mở được tour</h1><p>${esc(err.message)}</p><a class="btn-primary" href="index.html#tour">Xem các tour khác</a></section>`;
        }
    }

    window.addEventListener('DOMContentLoaded', load);
})();
