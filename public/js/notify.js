// ============================================================
// LOCALMATE — Chuông thông báo
// ============================================================
// Gắn vào mọi trang. Khách tra đơn bằng số điện thoại nào thì nhận thông báo
// của số đó — không cần tạo tài khoản, vì phần lớn khách đặt xe không đăng ký.
//
// GIỚI HẠN: đây là hỏi máy chủ theo chu kỳ, chỉ chạy khi trang đang mở. Muốn
// nhận khi đã đóng trình duyệt thì cần Web Push / FCM (xem lib/notifications.js).
// ============================================================

const BayNuiNotify = (() => {
    const POLL_MS = 20000;
    const KEY_PHONE = 'baynui_lookup_phone';
    const KEY_SEEN = 'baynui_notify_seen';

    let timer = null;
    let items = [];
    let unread = 0;

    const esc = (s) => String(s == null ? '' : s)
        .replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

    const phone = () => (localStorage.getItem(KEY_PHONE) || '').replace(/[\s.-]/g, '');

    /** "2026-08-13T05:20:00Z" → "5 phút trước" */
    function ago(iso) {
        const diff = Date.now() - new Date(iso).getTime();
        const mins = Math.round(diff / 60000);
        if (mins < 1) return 'vừa xong';
        if (mins < 60) return `${mins} phút trước`;
        const hours = Math.round(mins / 60);
        if (hours < 24) return `${hours} giờ trước`;
        return `${Math.round(hours / 24)} ngày trước`;
    }

    function mount() {
        if (document.getElementById('bn-bell')) return;
        const actions = document.querySelector('.nav-actions');
        if (!actions) return;

        const wrap = document.createElement('div');
        wrap.className = 'bn-bell-wrap';
        wrap.innerHTML = `
            <button class="nav-icon-btn bn-bell" id="bn-bell" title="Thông báo" aria-label="Thông báo">
                <i data-lucide="bell"></i>
                <span class="bn-dot" id="bn-dot" hidden></span>
            </button>
            <div class="bn-panel" id="bn-panel" hidden>
                <div class="bn-panel-head">
                    <b>Thông báo</b>
                    <button type="button" id="bn-read">Đánh dấu đã đọc</button>
                </div>
                <div class="bn-list" id="bn-list"></div>
            </div>`;
        // Chèn trước nút đặt phòng để chuông không đẩy nút chính ra rìa
        actions.insertBefore(wrap, actions.querySelector('.btn-book-nav') || null);

        document.getElementById('bn-bell').addEventListener('click', toggle);
        document.getElementById('bn-read').addEventListener('click', markRead);
        document.addEventListener('click', (e) => {
            if (!wrap.contains(e.target)) document.getElementById('bn-panel').hidden = true;
        });
        if (window.lucide) lucide.createIcons();
    }

    function toggle(e) {
        e.stopPropagation();
        const panel = document.getElementById('bn-panel');
        panel.hidden = !panel.hidden;
        if (!panel.hidden) render();
    }

    async function poll() {
        const p = phone();
        if (!p || p.length < 9) return;
        try {
            const res = await fetch(`/v1/notifications?phone=${encodeURIComponent(p)}`);
            if (!res.ok) return;
            const body = await res.json();
            items = body.data || [];
            unread = body.unread || 0;

            const dot = document.getElementById('bn-dot');
            if (dot) dot.hidden = unread === 0;

            // Cái mới nhất mà khách chưa từng thấy thì nảy lên một lần, để
            // người đang mở trang khác trong tab này vẫn biết có chuyện xảy ra
            const newest = items[0];
            if (newest && !newest.read && localStorage.getItem(KEY_SEEN) !== newest.id) {
                localStorage.setItem(KEY_SEEN, newest.id);
                toast(newest);
            }
            if (!document.getElementById('bn-panel')?.hidden) render();
        } catch (_) { /* mất mạng tạm thời, lần sau hỏi lại */ }
    }

    function render() {
        const host = document.getElementById('bn-list');
        if (!host) return;
        if (!items.length) {
            host.innerHTML = `<p class="bn-empty">${
                phone() ? 'Chưa có thông báo nào.' : 'Tra đơn ở trang "Đơn của tôi" để nhận thông báo.'
            }</p>`;
            return;
        }
        host.innerHTML = items.map(n => `
            <article class="bn-item ${n.read ? '' : 'unread'}">
                <b>${esc(n.title)}</b>
                <p>${esc(n.body)}</p>
                <time>${esc(ago(n.created_at))}</time>
            </article>`).join('');
    }

    async function markRead() {
        const p = phone();
        if (!p) return;
        await fetch('/v1/notifications/read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: p }),
        }).catch(() => {});
        items = items.map(n => ({ ...n, read: true }));
        unread = 0;
        const dot = document.getElementById('bn-dot');
        if (dot) dot.hidden = true;
        render();
    }

    function toast(n) {
        const el = document.createElement('div');
        el.className = 'bn-toast';
        el.innerHTML = `<b>${esc(n.title)}</b><span>${esc(n.body)}</span>`;
        document.body.appendChild(el);
        requestAnimationFrame(() => el.classList.add('in'));
        setTimeout(() => {
            el.classList.remove('in');
            setTimeout(() => el.remove(), 400);
        }, 6000);
    }

    function start() {
        mount();
        poll();
        clearInterval(timer);
        timer = setInterval(poll, POLL_MS);
    }

    document.addEventListener('DOMContentLoaded', start);
    return {
        poll, start, markRead,
        // booking.js goi ngay sau khi dat don: vua co so dien thoai thi hoi
        // lai luon, khong doi het 20 giay cua vong hoi dinh ky — bien nhan
        // den cham nua phut thi khach da dong trang roi.
        refresh: poll,
    };
})();
