// ============================================================
// LOCALMATE — Ghép tour
// ============================================================
// Tour nhỏ ở Bảy Núi chỉ chạy khi đủ khách. Khách lẻ đăng ký vào một chuyến
// theo ngày; đủ người thì chạy và ai cũng được giá rẻ hơn.
//
// Nguyên tắc hiển thị: LUÔN nói rõ chuyến đã chắc chạy chưa và còn thiếu mấy
// người. Không được để khách tưởng mình đã đặt xong rồi sát ngày mới báo huỷ.
// ============================================================

const TourPool = (() => {
    const esc = (s) => String(s == null ? '' : s)
        .replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const money = (n) => Number(n || 0).toLocaleString('vi-VN') + 'đ';
    const dmy = (iso) => {
        const [y, m, d] = String(iso || '').split('-');
        return d ? `${d}/${m}` : iso;
    };

    let config = { min_guests: 6, discount: 0.25, cutoff_days: 2 };

    /** Gắn khối "chuyến đang gom khách" vào từng thẻ tour. */
    async function attach() {
        const cards = document.querySelectorAll('.tour-card');
        if (!cards.length) return;

        let byTour = {};
        try {
            const all = await (await fetch('/v1/departures')).json();
            for (const d of all.data || []) {
                (byTour[d.tour_slug] = byTour[d.tour_slug] || []).push(d);
            }
        } catch (_) { return; }

        cards.forEach((card) => {
            const btn = card.querySelector('.tour-btn');
            const slug = (btn?.getAttribute('onclick') || '').match(/openTour\('([^']+)'\)/)?.[1];
            if (!slug) return;

            const list = byTour[slug] || [];
            const body = card.querySelector('.tour-body');
            if (!body) return;

            const host = document.createElement('div');
            host.className = 'tp-strip';
            host.innerHTML = list.length
                ? list.slice(0, 2).map(d => `
                    <button type="button" class="tp-dep" onclick="TourPool.open('${esc(slug)}','${esc(d.date)}')">
                        <span class="tp-date">${esc(dmy(d.date))}</span>
                        <span class="tp-bar"><i style="width:${d.progress}%"></i></span>
                        <span class="tp-need">${d.joined}/${d.min_guests}</span>
                    </button>`).join('')
                : `<button type="button" class="tp-dep tp-new" onclick="TourPool.open('${esc(slug)}')">
                       Đi ghép — rẻ hơn ${Math.round(config.discount * 100)}%
                   </button>`;
            body.appendChild(host);
        });
    }

    /** Mở form đăng ký ghép. */
    async function open(slug, date = '') {
        let deps = [];
        try {
            const r = await (await fetch(`/v1/tours/${encodeURIComponent(slug)}/departures`)).json();
            deps = r.data || [];
            config = { min_guests: r.min_guests, discount: r.discount, cutoff_days: r.cutoff_days };
        } catch (_) { /* vẫn cho đăng ký chuyến mới */ }

        const phone = localStorage.getItem('baynui_lookup_phone') || '';
        const tomorrow = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10);

        const box = document.createElement('div');
        box.className = 'tp-modal';
        box.innerHTML = `
            <div class="tp-panel" role="dialog" aria-label="Đăng ký ghép tour">
                <button class="tp-close" onclick="TourPool.close()" aria-label="Đóng">×</button>
                <h3>Đi ghép cho rẻ</h3>
                <p class="tp-lead">
                    Tour chỉ chạy khi đủ <b>${config.min_guests}</b> khách. Đủ người thì bạn được giảm
                    <b>${Math.round(config.discount * 100)}%</b>; không đủ thì LOCALMATE báo trước
                    <b>${config.cutoff_days}</b> ngày để bạn còn kịp tính đường khác.
                </p>

                ${deps.length ? `
                    <div class="tp-list">
                        ${deps.map(d => `
                            <label class="tp-opt">
                                <input type="radio" name="tp-date" value="${esc(d.date)}"
                                       ${d.date === date || (!date && d === deps[0]) ? 'checked' : ''}>
                                <div>
                                    <b>${esc(dmy(d.date))}</b>
                                    <span>${esc(d.note)}</span>
                                </div>
                                <span class="tp-price">${money(d.price)}</span>
                            </label>`).join('')}
                        <label class="tp-opt">
                            <input type="radio" name="tp-date" value="__new">
                            <div><b>Ngày khác</b><span>Mở một chuyến mới, chờ người khác vào ghép</span></div>
                        </label>
                    </div>` : ''}

                <div class="tp-fields">
                    <input id="tp-newdate" type="date" value="${tomorrow}" ${deps.length ? 'hidden' : ''}
                           min="${new Date().toISOString().slice(0, 10)}">
                    <input id="tp-name" placeholder="Họ tên" autocomplete="name">
                    <input id="tp-phone" type="tel" inputmode="numeric" maxlength="11"
                           placeholder="Số điện thoại" value="${esc(phone)}">
                    <input id="tp-guests" type="number" min="1" max="8" value="1" aria-label="Số khách">
                </div>

                <p class="tp-err" id="tp-err" hidden></p>
                <button class="btn-primary tp-submit" onclick="TourPool.submit('${esc(slug)}')">Đăng ký ghép</button>
            </div>`;

        document.body.appendChild(box);
        // Chọn "Ngày khác" thì mới hiện ô chọn ngày
        box.querySelectorAll('input[name="tp-date"]').forEach((radio) => {
            radio.addEventListener('change', () => {
                document.getElementById('tp-newdate').hidden = radio.value !== '__new';
            });
        });
    }

    const close = () => document.querySelector('.tp-modal')?.remove();

    async function submit(slug) {
        const picked = document.querySelector('input[name="tp-date"]:checked');
        const date = (!picked || picked.value === '__new')
            ? document.getElementById('tp-newdate').value
            : picked.value;

        const name = document.getElementById('tp-name').value.trim();
        const phone = document.getElementById('tp-phone').value.replace(/[\s.-]/g, '');
        const guests = Number(document.getElementById('tp-guests').value) || 1;
        const err = document.getElementById('tp-err');

        const show = (m) => { err.textContent = m; err.hidden = false; };
        if (name.length < 2) return show('Bạn nhập họ tên giúp mình nhé.');
        if (!/^0\d{9}$/.test(phone)) return show('Số điện thoại gồm 10 số, bắt đầu bằng 0.');
        if (!date) return show('Chọn ngày khởi hành.');

        err.hidden = true;
        try {
            const res = await fetch(`/v1/tours/${encodeURIComponent(slug)}/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ guest_name: name, phone, date, guests }),
            });
            const body = await res.json();
            if (!res.ok) return show(body.error?.message || 'Chưa đăng ký được.');

            localStorage.setItem('baynui_lookup_phone', phone);
            const d = body.data;
            document.querySelector('.tp-panel').innerHTML = `
                <button class="tp-close" onclick="TourPool.close()" aria-label="Đóng">×</button>
                <h3>${d.status === 'confirmed' ? 'Chuyến chắc chắn khởi hành!' : 'Đã ghi nhận'}</h3>
                <p class="tp-lead">${esc(body.message)}</p>
                <div class="tp-result">
                    <div><span>Chuyến</span><b>${esc(d.tour_name)}</b></div>
                    <div><span>Ngày</span><b>${esc(dmy(d.date))}</b></div>
                    <div><span>Đã có</span><b>${d.joined}/${d.min_guests} khách</b></div>
                    <div><span>Giá ghép</span><b>${money(d.price)}</b></div>
                </div>
                <p class="tp-save">Rẻ hơn ${money(d.saving)} so với đi lẻ.</p>
                <button class="btn-primary tp-submit" onclick="TourPool.close()">Xong</button>`;
        } catch (_) {
            show('Mất mạng. Bạn thử lại nhé.');
        }
    }

    document.addEventListener('DOMContentLoaded', () => setTimeout(attach, 600));
    return { attach, open, close, submit };
})();

window.TourPool = TourPool;
