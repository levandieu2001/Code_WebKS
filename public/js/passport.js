// ============================================================
// LOCALMATE — Hộ chiếu LOCALMATE
// ============================================================
// Trang này chỉ để XEM. Việc đóng dấu diễn ra ở /dau.html khi khách quét mã
// QR tại điểm — vì con dấu bắt buộc phải kèm toạ độ thật.
// ============================================================

const Passport = (() => {
    const $ = (id) => document.getElementById(id);
    const esc = (s) => String(s == null ? '' : s)
        .replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const dmy = (iso) => {
        if (!iso) return '';
        const d = new Date(iso);
        return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    };

    async function load(event) {
        if (event) event.preventDefault();
        const raw = ($('hc-phone').value || '').replace(/[\s.-]/g, '');
        const token = localStorage.getItem('baynui_token');

        // Đăng nhập rồi thì khỏi cần số; chưa thì phải có số để biết dấu của ai
        if (!token && !/^0\d{9}$/.test(raw)) {
            $('hc-status').textContent = 'Nhập số điện thoại bạn đã dùng khi đóng dấu (10 số).';
            return;
        }
        if (raw) localStorage.setItem('baynui_lookup_phone', raw);

        $('hc-status').textContent = 'Đang mở hộ chiếu…';
        try {
            const res = await fetch(`/v1/passport${raw ? `?phone=${encodeURIComponent(raw)}` : ''}`, {
                headers: token ? { Authorization: 'Bearer ' + token } : {},
            });
            render(await res.json());
            $('hc-status').textContent = '';
        } catch (_) {
            $('hc-status').textContent = 'Không tải được. Kiểm tra mạng rồi thử lại nhé.';
        }
    }

    function render(p) {
        const percent = p.total ? Math.round((p.count / p.total) * 100) : 0;

        $('hc-book').innerHTML = `
            <article class="hc-card">
                <div class="hc-card-head">
                    <div>
                        <span class="hc-holder">${esc(p.holder_name || 'Khách phương xa')}</span>
                        <h2>${esc(p.level_name)}</h2>
                        <span class="hc-level">Cấp ${p.level}</span>
                    </div>
                    <div class="hc-big">${p.count}<small>/${p.total}</small></div>
                </div>
                <div class="hc-bar"><i style="width:${percent}%"></i></div>
                <p class="hc-next">${
                    p.next_level_in > 0
                        ? `Còn ${p.next_level_in} dấu nữa để lên cấp.`
                        : 'Bạn đã đi đủ Bảy Núi. Hiếm ai làm được!'
                }</p>
            </article>

            <h2 class="hc-h">Con dấu</h2>
            <div class="hc-grid">
                ${p.stamps.map(s => `
                    <div class="hc-stamp ${s.earned ? 'got' : ''}">
                        <div class="hc-seal">${esc(s.symbol)}</div>
                        <b>${esc(s.name)}</b>
                        <span>${s.earned ? esc(dmy(s.earned_at)) : 'Chưa tới'}</span>
                    </div>`).join('')}
            </div>

            <h2 class="hc-h">Ưu đãi</h2>
            <div class="hc-rewards">
                ${p.rewards.map(r => `
                    <div class="hc-reward ${r.unlocked ? 'open' : ''}">
                        <div>
                            <b>${esc(r.title)}</b>
                            <span>${esc(r.note)}</span>
                        </div>
                        ${r.unlocked
                            ? `<code>${esc(r.code)}</code>`
                            : `<span class="hc-lock">Còn ${r.missing} dấu</span>`}
                    </div>`).join('')}
            </div>`;

        if (window.lucide) lucide.createIcons();
    }

    /** Mở trang là hiện luôn bộ dấu trống, để khách biết cần đi những đâu. */
    async function init() {
        const saved = localStorage.getItem('baynui_lookup_phone');
        if (saved) $('hc-phone').value = saved;

        try {
            const st = await (await fetch('/v1/passport/stations')).json();
            const radius = $('hc-radius');
            if (radius) radius.textContent = st.radius_m;
        } catch (_) { /* để nguyên số mặc định trong HTML */ }

        load();
    }

    document.addEventListener('DOMContentLoaded', init);
    return { load };
})();
