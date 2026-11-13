// ============================================================
// LOCALMATE — Tra cứu & huỷ đơn của khách
// ============================================================
// Trước đây khách đặt xong chỉ nhận một mã rồi thôi: không xem lại được,
// không huỷ được. Trang này có hai lối vào:
//   • Đã đăng nhập  → hiện thẳng đơn của tài khoản
//   • Chưa đăng nhập → tra bằng số điện thoại đã dùng khi đặt
//
// Có đơn xe đang chạy thì hiện luôn vị trí tài xế và thời gian tới nơi.
// ============================================================

const MyOrders = (() => {
    const $ = (id) => document.getElementById(id);
    const money = (n) => Number(n || 0).toLocaleString('vi-VN') + 'đ';
    const esc = (s) => String(s == null ? '' : s)
        .replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const dmy = (iso) => {
        const [y, m, d] = String(iso || '').split('-');
        return d ? `${d}/${m}/${y}` : (iso || '');
    };

    const BADGE = {
        pending: 'wait', confirmed: 'ok', completed: 'ok', cancelled: 'off',
    };

    let rows = [];
    let phone = '';
    let trackTimer = null;

    /**
     * Đã đăng nhập hay chưa.
     *
     * Trang này từng đọc khoá 'baynui_token' — không tồn tại. Bộ đăng nhập lưu
     * ở 'baynui_user_token', nên trang không bao giờ thấy phiên nào và cứ bắt
     * khách gõ số điện thoại dù họ vừa đăng nhập xong.
     */
    const daDangNhap = () => Boolean(window.BayNuiUser && BayNuiUser.coPhien());

    async function api(path, options = {}) {
        // Đi qua bộ giữ phiên: nó tự gia hạn token trước khi hết hạn và thử lại
        // một lần nếu máy chủ vẫn trả 401.
        if (daDangNhap()) return BayNuiUser.api(path, options);

        const res = await fetch(path, {
            ...options,
            headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((body.error && body.error.message) || 'Có lỗi xảy ra.');
        return body;
    }

    function init() {
        const saved = localStorage.getItem('baynui_lookup_phone');
        if (saved && $('mo-phone')) $('mo-phone').value = saved;
        const codeFromLink = new URLSearchParams(location.search).get('code');
        if (codeFromLink && $('mo-code')) $('mo-code').value = codeFromLink.slice(0, 30);

        // Đăng nhập rồi thì giấu hẳn ô tra cứu và mở đơn luôn — bắt gõ lại số
        // điện thoại trong khi đã biết họ là ai chỉ làm khách bực.
        if (daDangNhap()) {
            anOTraCuu(true);
            loadMine();
        } else if (saved) {
            lookup();
        }
    }

    function anOTraCuu(an) {
        const form = document.getElementById('mo-form');
        if (form) form.style.display = an ? 'none' : '';
    }

    async function loadMine() {
        setStatus('Đang tải đơn của bạn…');
        try {
            const result = await api('/v1/my/bookings');
            rows = result.data || [];
            render(rows.length ? '' : 'Tài khoản này chưa có đơn nào.');
        } catch (_) {
            // Token hỏng — cho ô tra cứu hiện lại để khách vẫn xem được đơn
            anOTraCuu(false);
            setStatus('');
        }
    }

    async function lookup(event) {
        if (event) event.preventDefault();
        phone = $('mo-phone').value.trim();
        const code = ($('mo-code').value || '').trim();

        if (!/^(0\d{9}|\+84\d{9})$/.test(phone.replace(/[\s.-]/g, ''))) {
            setStatus('Số điện thoại chưa đúng — 10 số, bắt đầu bằng 0.');
            return;
        }

        setStatus('Đang tra cứu…');
        try {
            const q = `?phone=${encodeURIComponent(phone)}${code ? `&code=${encodeURIComponent(code)}` : ''}`;
            const result = await api('/v1/bookings/lookup' + q);
            rows = result.data || [];
            localStorage.setItem('baynui_lookup_phone', phone);
            render(result.message || '');
        } catch (err) {
            setStatus(err.message);
        }
    }

    const setStatus = (text) => { $('mo-status').textContent = text; };

    function render(emptyNote) {
        setStatus('');
        const host = $('mo-list');
        if (!rows.length) {
            host.innerHTML = `<div class="notice">${esc(emptyNote || 'Chưa có đơn nào.')}</div>`;
            return;
        }
        host.innerHTML = rows.map(card).join('');
        if (window.lucide) lucide.createIcons();

        // Đơn xe đã xác nhận thì theo dõi vị trí tài xế
        clearInterval(trackTimer);
        const live = rows.filter(b => b.kind === 'transport' && b.status === 'confirmed');
        if (live.length) {
            live.forEach(b => track(b.id));
            trackTimer = setInterval(() => live.forEach(b => track(b.id)), 15000);
        }
    }

    function card(b) {
        const kindLabel = KIND_LABEL[b.kind] || b.kind;
        // Đơn đặc sản không có ngày nhận phòng — hiện ngày đặt thay vào, chứ
        // để trống thì thẻ nhìn như thiếu dữ liệu.
        const when = b.kind === 'food'
            ? `Đặt ${dmy(String(b.created_at).slice(0, 10))}`
            : b.kind === 'transport'
                ? `${dmy(b.check_in)} lúc ${esc(b.pickup_time)}`
                : `${dmy(b.check_in)}${b.check_out && b.check_out !== b.check_in ? ' → ' + dmy(b.check_out) : ''}`;

        return `
        <div class="mo-card" id="mo-${esc(b.id)}">
            <div class="mo-head">
                <div>
                    <span class="mo-kind">${esc(kindLabel)}</span>
                    <b>${esc(b.summary || '—')}</b>
                    <span class="mo-when">${when}</span>
                </div>
                <span class="status-pill ${BADGE[b.status] || 'wait'}">${esc(b.status_label)}</span>
            </div>

            ${b.kind === 'transport' && b.pickup
                ? `<p class="mo-route"><span class="dot from"></span>${esc(b.pickup)}
                   <span class="dot to"></span>${esc(b.dropoff)}</p>` : ''}

            <div class="mo-pay" id="mo-pay-${esc(b.id)}"></div>
            <div class="mo-track" id="mo-track-${esc(b.id)}"></div>

            <button type="button" class="mo-more" aria-expanded="false" aria-controls="mo-ct-${esc(b.id)}"
                    onclick="MyOrders.moChiTiet('${esc(b.id)}', this)">
                <i data-lucide="chevron-down"></i>Xem chi tiết &amp; đơn tới đâu
            </button>
            <div class="mo-chitiet" id="mo-ct-${esc(b.id)}" hidden></div>

            <div class="mo-foot">
                <div>
                    <span class="mo-code">Mã đơn ${esc(b.code)}</span>
                    ${b.partner_name ? `<span class="mo-partner">${esc(b.partner_name)}</span>` : ''}
                </div>
                <div class="mo-actions">
                    <strong>${money(b.total_price)}</strong>
                    ${b.service_url
                        ? `<a class="btn-sm-outline" href="${esc(b.service_url)}">${esc(b.service_link_label || 'Xem dịch vụ')}</a>`
                        : ''}
                    ${b.payment_status && b.payment_status !== 'unpaid'
                        ? `<span class="mo-paid ${esc(b.payment_status)}">${esc(b.payment_status_label)}</span>`
                        : ''}
                    ${b.can_cancel && b.payment_status === 'unpaid'
                        ? `<button class="btn-sm-solid" onclick="MyOrders.pay('${esc(b.id)}')">Đặt cọc</button>`
                        : ''}
                    ${b.can_review
                        ? `<button class="btn-sm-solid" onclick="MyOrders.review('${esc(b.id)}')">Đánh giá</button>`
                        : ''}
                    ${b.can_cancel
                        ? `<button class="btn-sm-outline danger" onclick="MyOrders.cancel('${esc(b.id)}')">Huỷ đơn</button>`
                        : ''}
                </div>
            </div>
        </div>`;
    }

    // ── Chi tiết đơn và đường đi ─────────────────────────────
    // Trước đây thẻ đơn chỉ có một cái nhãn "Chờ xác nhận" — khách biết trạng
    // thái nhưng không biết ĐƯỜNG ĐI: đặt lúc nào, đối tác nhận chưa, đã cọc
    // chưa, còn bao lâu nữa. Đó đúng là câu họ hỏi khi gọi điện.

    /** "2026-09-05T07:30:00Z" → "05/09 lúc 14:30" (giờ Việt Nam). */
    function lucNao(iso) {
        if (!iso) return '';
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return '';
        const vn = new Date(d.getTime() + 7 * 3600000);
        const hai = (n) => String(n).padStart(2, '0');
        return `${hai(vn.getUTCDate())}/${hai(vn.getUTCMonth() + 1)} lúc `
            + `${hai(vn.getUTCHours())}:${hai(vn.getUTCMinutes())}`;
    }

    const KIND_LABEL = { hotel: 'Phòng nghỉ', tour: 'Tour', transport: 'Xe đưa đón',
                         food: 'Đặc sản' };

    function moChiTiet(id, nut) {
        const o = $(`mo-ct-${id}`);
        if (!o) return;
        if (!o.hidden) {
            o.hidden = true;
            nut.classList.remove('mo');
            nut.setAttribute('aria-expanded', 'false');
            nut.lastChild.textContent = 'Xem chi tiết & đơn tới đâu';
            return;
        }
        const b = rows.find(x => x.id === id);
        if (!b) return;
        o.innerHTML = veChiTiet(b);
        o.hidden = false;
        nut.classList.add('mo');
        nut.setAttribute('aria-expanded', 'true');
        nut.lastChild.textContent = 'Thu gọn';
        if (window.lucide) lucide.createIcons();
    }

    function veChiTiet(b) {
        const hang = [];

        // Bóc tách giá: khách phải cộng tay ra đúng con số cuối, không thì
        // họ nghi mình tính thừa mà không biết hỏi ở đâu.
        if (b.kind === 'food' && b.quantity) {
            hang.push(['Đơn giá', `${money(b.unit_price)} / ${esc(b.unit || 'phần')}`]);
            hang.push(['Số lượng', `${b.quantity} ${esc(b.unit || 'phần')}`]);
        } else if (b.kind === 'hotel' && b.nights) {
            hang.push(['Giá phòng', `${money(b.unit_price)} / đêm`]);
            hang.push(['Số đêm', `${b.nights} đêm`]);
        } else if (b.kind === 'tour' && b.guests) {
            hang.push(['Giá tour', `${money(b.unit_price)} / khách`]);
            hang.push(['Số khách', `${b.guests} khách`]);
        }

        if (b.kind === 'food' && b.delivery_address) {
            hang.push(['Giao tới', esc(b.delivery_address)]);
        }
        if (b.note) hang.push(['Ghi chú của bạn', esc(b.note)]);
        if (b.guest_name) hang.push(['Người nhận', esc(b.guest_name)]);

        let bang = hang.map(([k, v]) =>
            `<div class="mo-hang${k === 'Giao tới' ? ' dia-chi' : ''}">`
            + `<span>${k}</span><span>${v}</span></div>`).join('');

        bang += `<div class="mo-hang tong"><span>${
            b.kind === 'food' ? 'Tiền hàng' : 'Tổng cộng'}</span><span>${money(b.total_price)}</span></div>`;

        if (b.kind === 'food') {
            bang += '<div class="mo-hang"><span>Cước gửi hàng</span>'
                + '<span style="font-weight:500;color:var(--muted)">'
                + (b.shipping_note ? esc(b.shipping_note) + ' — ' : '')
                + 'cơ sở báo khi gọi xác nhận</span></div>';
        } else if (b.deposit_amount > 0) {
            bang += `<div class="mo-hang"><span>Trong đó tiền cọc</span><span>${
                money(b.deposit_amount)}${b.payment_status === 'paid' ? ' · đã nhận' : ''}</span></div>`;
            bang += `<div class="mo-hang"><span>Trả khi nhận dịch vụ</span><span>${
                money(Math.max(0, b.total_price - b.deposit_amount))}</span></div>`;
        }

        if (b.partner_phone) {
            bang += `<div class="mo-hang"><span>Gọi bên cung cấp</span>`
                + `<span><a href="tel:${esc(b.partner_phone.replace(/\s/g, ''))}"
                     style="color:var(--brand);font-weight:700">${esc(b.partner_phone)}</a></span></div>`;
        }

        // ── Đường đi ──
        const buoc = (b.timeline || []).map((x) => {
            const lop = ['mo-buoc', x.xong ? 'xong' : 'cho', x.xau ? 'xau' : '']
                .filter(Boolean).join(' ');
            return `<li class="${lop}"><b>${esc(x.ten)}</b>`
                + (x.mo_ta ? `<p>${esc(x.mo_ta)}</p>` : '')
                + (x.luc ? `<time>${esc(lucNao(x.luc))}</time>` : '')
                + '</li>';
        }).join('');

        return bang
            + '<div class="mo-buoc-tieu-de">Đơn đã tới đâu</div>'
            + `<ul class="mo-duong">${buoc}</ul>`;
    }

    /** Vị trí tài xế trên đường tới đón. */
    async function track(bookingId) {
        const host = $(`mo-track-${bookingId}`);
        if (!host) return;
        try {
            const t = await (await fetch(`/v1/bookings/${bookingId}/track`)).json();
            if (!t.tracking) { host.innerHTML = ''; return; }

            // Bản đồ nhúng bằng iframe để dùng lại y nguyên /theoxe.html —
            // web và app cùng chạy một đoạn mã, khỏi lệch nhau về sau.
            // Chỉ dựng iframe MỘT lần rồi giữ nguyên: mỗi 15 giây vẽ lại cả
            // khối sẽ nạp lại bản đồ từ đầu, xe nhấp nháy và tile tải lại liên tục.
            // TUYỆT ĐỐI không ghi đè innerHTML của host khi đã có bản đồ:
            // gỡ một <iframe> ra khỏi DOM rồi chèn lại làm trình duyệt NẠP LẠI
            // nó từ đầu. Cứ 15 giây một lần thì bản đồ reset, tile tải lại và
            // xe nhảy về chỗ cũ. Vì vậy host chỉ được dựng đúng một lần, sau đó
            // chỉ thay chữ trong khối .mo-live.
            let slot = host.querySelector('.mo-live');
            if (!slot) {
                const frame = document.createElement('iframe');
                frame.className = 'mo-map';
                frame.title = 'Vị trí xe trên bản đồ';
                frame.src = `/theoxe.html?embed=1&id=${encodeURIComponent(bookingId)}`;
                host.textContent = '';
                host.appendChild(frame);

                slot = document.createElement('div');
                slot.className = 'mo-live';
                host.appendChild(slot);
            }

            slot.classList.toggle('stale', !!t.stale);
            slot.innerHTML = `
                <i data-lucide="car-front"></i>
                <div>
                    <b>${esc(t.stage_label)}</b>
                    ${t.remaining_km != null
                        ? `<span>Còn ${String(t.remaining_km).replace('.', ',')} km · khoảng ${t.eta_minutes} phút</span>`
                        : '<span>Đang cập nhật vị trí…</span>'}
                    ${t.driver_name ? `<span>${esc(t.driver_name)} · ${esc(t.plate)}</span>` : ''}
                </div>
                ${t.driver_phone ? `<a class="btn-sm-outline" href="tel:${esc(t.driver_phone)}">Gọi tài xế</a>` : ''}`;
            if (window.lucide) lucide.createIcons();
        } catch (_) { /* mất mạng tạm thời, lần sau thử lại */ }
    }

    /**
     * Huỷ đơn.
     *
     * Nói rõ SỐ TIỀN trước khi hỏi, không nói chung chung "sẽ hoàn theo chính
     * sách". Câu chung chung đó chỉ đẩy việc sang một cuộc gọi điện, và cuộc
     * gọi đó chắc chắn cãi nhau vì hai bên nhớ hai điều khác nhau.
     */
    async function cancel(id) {
        const row = rows.find(r => r.id === id);
        const hoan = row && row.cancel_refund;
        let hoi = `Huỷ đơn ${row ? row.code : ''}?`;
        if (hoan) {
            hoi += '\n\n' + hoan.ly_do;
            if (row.payment_status === 'paid') {
                hoi += hoan.so_tien > 0
                    ? `\n\nBạn sẽ được hoàn ${money(hoan.so_tien)} trong 3–5 ngày làm việc.`
                    : '\n\nTiền cọc đã chuyển sẽ KHÔNG được hoàn lại.';
            } else {
                hoi += '\n\nBạn chưa chuyển cọc nên không mất khoản nào.';
            }
        }
        hoi += '\n\nHuỷ rồi thì không đặt lại được đơn này, phải đặt đơn mới.';
        if (!confirm(hoi)) return;

        const reason = prompt('Lý do huỷ (không bắt buộc):', '') || '';
        try {
            const result = await api(`/v1/bookings/${id}/cancel`, {
                method: 'POST',
                body: JSON.stringify({ phone: phone || (row ? row.phone : ''), reason }),
            });
            alert(result.message);
            // Nạp lại danh sách
            if (daDangNhap()) await loadMine();
            else await lookup();
        } catch (err) {
            alert(err.message);
        }
    }

    // ── Đánh giá ──────────────────────────────────────────────
    // Chỉ hiện với đơn đã hoàn thành và chưa đánh giá; máy chủ vẫn kiểm tra
    // lại số điện thoại nên có sửa nút trên trình duyệt cũng không lách được.
    function review(id) {
        const row = rows.find(r => r.id === id);
        if (!row) return;
        const targets = row.review_targets || [];
        if (!targets.length) return;

        const host = document.getElementById(`mo-review-${id}`) || (() => {
            const el = document.createElement('div');
            el.id = `mo-review-${id}`;
            el.className = 'mo-review';
            document.getElementById(`mo-${id}`).appendChild(el);
            return el;
        })();

        if (host.dataset.open === '1') { host.innerHTML = ''; host.dataset.open = '0'; return; }
        host.dataset.open = '1';

        const t = targets[0];
        host.innerHTML = `
            <p class="mo-review-title">Bạn thấy <b>${esc(t.label || 'dịch vụ')}</b> thế nào?</p>
            <div class="mo-stars" id="mo-stars-${esc(id)}">
                ${[1, 2, 3, 4, 5].map(n => `<button type="button" data-n="${n}" aria-label="${n} sao">★</button>`).join('')}
            </div>
            <label class="mo-review-label" for="mo-cmt-${esc(id)}">Chia sẻ trải nghiệm (không bắt buộc)</label>
            <textarea id="mo-cmt-${esc(id)}" name="review" rows="3" maxlength="1000"
                placeholder="Điều bạn thích hoặc điều chỗ ở nên cải thiện…"></textarea>
            <div class="mo-review-actions">
                <button class="btn-sm-solid" id="mo-send-${esc(id)}">Gửi đánh giá</button>
                <button class="btn-sm-outline" onclick="MyOrders.review('${esc(id)}')">Để sau</button>
            </div>`;

        let stars = 0;
        const starBox = document.getElementById(`mo-stars-${id}`);
        starBox.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;
            stars = Number(btn.dataset.n);
            [...starBox.children].forEach((b2, i) => b2.classList.toggle('on', i < stars));
        });

        document.getElementById(`mo-send-${id}`).addEventListener('click', async () => {
            if (!stars) { alert('Bạn chọn số sao trước nhé.'); return; }
            try {
                const result = await api('/v1/reviews', {
                    method: 'POST',
                    body: JSON.stringify({
                        booking_id: id,
                        phone: phone || row.phone,
                        target_type: t.type,
                        target_id: t.id,
                        rating: stars,
                        comment: document.getElementById(`mo-cmt-${id}`).value,
                    }),
                });
                host.innerHTML = `<p class="mo-review-done">${esc(result.message)}</p>`;
                host.dataset.open = '0';
                if (daDangNhap()) await loadMine(); else await lookup();
            } catch (err) {
                alert(err.message);
            }
        });
    }

    // ── Đặt cọc ───────────────────────────────────────────────
    // Hiện mã QR chuyển khoản có sẵn số tiền và mã đơn trong nội dung, nên
    // khách không gõ nhầm và chủ nhà đối chiếu sao kê được ngay.
    async function pay(id) {
        const row = rows.find(r => r.id === id);
        if (!row) return;
        const host = $(`mo-pay-${id}`);
        if (host.dataset.open === '1') { host.innerHTML = ''; host.dataset.open = '0'; return; }

        host.dataset.open = '1';
        host.innerHTML = '<p class="mo-pay-loading">Đang lấy thông tin đặt cọc…</p>';

        let p;
        try {
            p = await api(`/v1/bookings/${id}/payment?phone=${encodeURIComponent(phone || row.phone)}`);
        } catch (err) {
            host.innerHTML = `<p class="mo-pay-loading">${esc(err.message)}</p>`;
            return;
        }

        // Chưa cấu hình ngân hàng thì nói thật, không vẽ ra một mã QR rỗng
        if (!p.transfer.ok) {
            host.innerHTML = `
                <div class="mo-pay-box">
                    <b>Đặt cọc ${money(p.deposit_amount)}</b>
                    <p class="mo-pay-note">${esc(p.transfer.reason)}</p>
                    <p class="mo-pay-note">Bạn có thể chọn <b>trả khi nhận dịch vụ</b>, hoặc gọi LOCALMATE để được hướng dẫn.</p>
                </div>`;
            return;
        }

        host.innerHTML = `
            <div class="mo-pay-box">
                <div class="mo-pay-qr">
                    <!-- KHÔNG dùng loading="lazy": khối này chỉ hiện khi khách bấm
                         "Đặt cọc", trình duyệt hoãn tải thì họ nhìn vào ô trống.
                         Mất mạng thì báo thẳng, vì số tài khoản bên cạnh vẫn đủ
                         để chuyển khoản tay. -->
                    <img src="${esc(p.transfer.qr_image)}" alt="Mã QR chuyển khoản đặt cọc"
                         onerror="this.replaceWith(Object.assign(document.createElement('p'),{className:'mo-pay-note',textContent:'Không tải được mã QR (mất mạng). Bạn chuyển khoản thủ công theo thông tin bên cạnh nhé.'}))">
                </div>
                <div class="mo-pay-info">
                    <b>Đặt cọc ${money(p.deposit_amount)}</b>
                    <p>Còn lại ${money(p.total_price - p.deposit_amount)} trả khi nhận dịch vụ.</p>
                    <dl>
                        <dt>Ngân hàng</dt><dd>${esc(p.transfer.account_name || '—')}</dd>
                        <dt>Số tài khoản</dt><dd>${esc(p.transfer.account)}</dd>
                        <dt>Nội dung</dt><dd><code>${esc(p.transfer.content)}</code></dd>
                    </dl>
                    <p class="mo-pay-note">Quét mã bằng app ngân hàng — số tiền và nội dung đã điền sẵn.
                       Giữ nguyên nội dung để LOCALMATE đối chiếu đúng đơn của bạn.</p>
                    <button class="btn-sm-solid" id="mo-paid-${esc(id)}">Tôi đã chuyển khoản</button>
                </div>
            </div>`;

        $(`mo-paid-${id}`).addEventListener('click', async () => {
            try {
                const result = await api(`/v1/bookings/${id}/payment/claim`, {
                    method: 'POST',
                    body: JSON.stringify({ phone: phone || row.phone, method: 'vietqr' }),
                });
                host.innerHTML = `<p class="mo-review-done">${esc(result.message)}</p>`;
                host.dataset.open = '0';
                if (daDangNhap()) await loadMine(); else await lookup();
            } catch (err) {
                alert(err.message);
            }
        });
    }

    document.addEventListener('DOMContentLoaded', init);

    // Vừa đăng nhập hoặc đăng xuất ngay trên trang này thì vẽ lại.
    //
    // Hai dòng này TRƯỚC ĐÂY NẰM SAU return nên chưa bao giờ chạy: đăng nhập
    // xong danh sách đơn vẫn trống, phải tải lại trang mới thấy.
    document.addEventListener('baynui:signin', () => { anOTraCuu(true); loadMine(); });
    document.addEventListener('baynui:signout', () => {
        anOTraCuu(false);
        rows = [];
        render('');
        setStatus('');
    });

    return { lookup, cancel, moChiTiet, review, pay };
})();
