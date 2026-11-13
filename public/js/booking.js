// ============================================================
// LOCALMATE — Đặt dịch vụ (dùng chung cho mọi trang)
// ============================================================
// Một modal duy nhất phục vụ 3 loại đơn: phòng · tour · xe đưa đón.
// Tất cả đều gửi lên POST /v1/bookings — CÙNG endpoint mà app Android
// đang dùng, nên đơn từ web và app nằm chung một chỗ, Admin thấy hết.
// ============================================================

const BayNuiBooking = (() => {
    const $ = (id) => document.getElementById(id);
    const money = (n) => Number(n || 0).toLocaleString('vi-VN') + 'đ';
    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

    // Ngày tính theo lịch địa phương của khách, KHÔNG qua toISOString()
    // vì hàm đó đổi sang UTC và ở Việt Nam (UTC+7) sẽ lùi mất một ngày.
    const isoOf = (date) => {
        const p = (n) => String(n).padStart(2, '0');
        return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
    };
    const isoToday = () => isoOf(new Date());
    const isoTomorrow = () => {
        const d = new Date(); d.setDate(d.getDate() + 1);
        return isoOf(d);
    };
    const addDays = (iso, days) => {
        const [y, m, d] = String(iso).split('-').map(Number);
        if (!y || !m || !d) return iso;
        const date = new Date(y, m - 1, d);
        date.setDate(date.getDate() + days);
        return isoOf(date);
    };
    const nightsBetween = (a, b) => {
        const parse = (iso) => {
            const [y, m, d] = String(iso).split('-').map(Number);
            return (y && m && d) ? new Date(y, m - 1, d) : null;
        };
        const from = parse(a), to = parse(b);
        if (!from || !to) return 0;
        return Math.round((to - from) / 86400000);
    };
    const dmy = (iso) => {
        const [y, m, d] = String(iso).split('-');
        return d && m && y ? `${d}/${m}/${y}` : iso;
    };

    let context = null;
    let submitting = false;
    let quoteVersion = 0;

    // ── Khung form dùng chung ──
    function guestFields() {
        return `
            <div class="form-grid">
                <div class="form-group"><label for="bk-name">Họ và tên *</label><input type="text" id="bk-name" name="name" autocomplete="name" class="form-input" required placeholder="Ví dụ: Nguyễn Văn A…"></div>
                <div class="form-group"><label for="bk-phone">Số điện thoại *</label><input type="tel" id="bk-phone" name="phone" autocomplete="tel" inputmode="tel" class="form-input" required placeholder="Ví dụ: 0909 123 456…"></div>
            </div>
            <div class="form-group"><label for="bk-note">Ghi chú</label><textarea id="bk-note" name="note" autocomplete="off" class="form-input" rows="2" placeholder="Yêu cầu thêm (nếu có)…"></textarea></div>`;
    }

    function summaryBox(rows, total) {
        return `
            <div class="booking-summary">
                <h4>Tóm tắt</h4>
                ${rows.map(r => `<div class="summary-row"><span>${esc(r[0])}</span><span class="summary-price">${esc(r[1])}</span></div>`).join('')}
                <div class="summary-row summary-total"><span>Tổng cộng</span><span id="bk-total" class="summary-price">${money(total)}</span></div>
            </div>`;
    }

    // ── 1. ĐẶT PHÒNG — chọn ngày nhận và ngày trả ──
    function roomForm(room) {
        const checkIn = /^\d{4}-\d{2}-\d{2}$/.test(room.checkIn || '') && room.checkIn >= isoToday()
            ? room.checkIn : isoTomorrow();
        const checkOut = /^\d{4}-\d{2}-\d{2}$/.test(room.checkOut || '') && room.checkOut > checkIn
            ? room.checkOut : addDays(checkIn, 1);
        return `
            <h2 class="booking-title" id="service-modal-title">Đặt phòng</h2>
            <div class="booking-room-info">
                <img src="${esc(room.image_url)}" alt="${esc(room.name)}">
                <div class="room-info-text"><h4>${esc(room.name)}</h4>
                    ${room.partner_name ? `<span class="booking-provider">Chủ nhà: <b>${esc(room.partner_name)}</b></span>` : ''}
                    <span>${money(room.price)} / đêm</span></div>
            </div>
            <form onsubmit="BayNuiBooking.submit(event)">
                <div class="form-grid">
                    <div class="form-group"><label>Ngày nhận phòng *</label>
                        <input type="date" id="bk-date" class="form-input" required value="${checkIn}" min="${isoToday()}" onchange="BayNuiBooking.recalc()">
                    </div>
                    <div class="form-group"><label>Ngày trả phòng *</label>
                        <input type="date" id="bk-date-end" class="form-input" required value="${checkOut}" min="${addDays(checkIn, 1)}" onchange="BayNuiBooking.recalc()">
                    </div>
                </div>
                <p id="bk-range-note" class="booking-range-note">1 đêm · nhận phòng 14:00, trả phòng 12:00</p>
                <p id="bk-busy-note" class="booking-range-note" style="display:none"></p>
                <p id="bk-cancel-note" class="booking-range-note" style="display:none"></p>
                ${guestFields()}
                ${summaryBox([[room.name, money(room.price) + ' × 1 đêm']], room.price)}
                <button type="submit" id="bk-submit" class="btn-primary btn-confirm-booking">Xác nhận đặt phòng</button>
            </form>`;
    }

    // ── 2. ĐẶT TOUR ──
    function tourForm(tour) {
        const schedule = (tour.schedule || []).map(s =>
            `<div class="summary-row"><span style="color:var(--brand-dark);font-weight:600;min-width:96px">${esc(s.time)}</span><span style="text-align:left;flex:1">${esc(s.label)}</span></div>`,
        ).join('');
        return `
            <h2 class="booking-title" id="service-modal-title">Đặt tour</h2>
            <div class="booking-room-info">
                <img src="${esc(tour.image)}" alt="${esc(tour.name)}">
                <div class="room-info-text"><h4>${esc(tour.name)}</h4>
                    ${tour.partner_name ? `<span class="booking-provider">Đơn vị: <b>${esc(tour.partner_name)}</b></span>` : ''}
                    <span>${money(tour.price)} / khách · ${esc(tour.duration)}</span></div>
            </div>
            ${schedule ? `<div style="margin-bottom:18px"><h4 style="font-family:var(--font-body);font-size:12.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin-bottom:10px">Lịch trình</h4>${schedule}</div>` : ''}
            <form onsubmit="BayNuiBooking.submit(event)">
                <div class="form-grid">
                    <div class="form-group"><label>Ngày đi *</label>
                        <input type="date" id="bk-date" class="form-input" required value="${isoTomorrow()}" min="${isoToday()}" onchange="BayNuiBooking.recalc()">
                    </div>
                    <div class="form-group"><label>Ngày về</label>
                        <input type="date" id="bk-date-end" class="form-input" readonly value="${addDays(isoTomorrow(), (tour.days || 1) - 1)}">
                    </div>
                </div>
                <p id="bk-range-note" class="booking-range-note">Tour ${esc(tour.duration)} — ngày về tính tự động theo lịch trình.</p>
                <div class="form-group"><label>Số khách *</label>
                    <select id="bk-guests" class="form-input" onchange="BayNuiBooking.recalc()">
                        ${[1, 2, 3, 4, 5, 6, 8, 10].map(n => `<option value="${n}"${n === 2 ? ' selected' : ''}>${n} khách</option>`).join('')}
                    </select>
                </div>
                ${guestFields()}
                ${summaryBox([[tour.name, money(tour.price) + ' × 2 khách']], tour.price * 2)}
                <button type="submit" id="bk-submit" class="btn-primary btn-confirm-booking">Đăng ký tour</button>
            </form>`;
    }

    // ── 3. ĐẶT XE ĐƯA ĐÓN ──
    function transportForm(info) {
        const places = info.pickup_suggestions || ['Châu Đốc', 'Long Xuyên', 'Tịnh Biên', 'Tri Tôn', 'Cần Thơ'];
        const pickup = String(info.pickup || '');
        const tripDate = /^\d{4}-\d{2}-\d{2}$/.test(info.date || '') && info.date >= isoToday()
            ? info.date : isoTomorrow();
        return `
            <h2 class="booking-title" id="service-modal-title">Đặt xe đưa đón</h2>
            <p style="color:var(--muted);margin-bottom:18px">Điểm đến: <strong style="color:var(--ink)">${esc(info.dropoff)}</strong></p>
            <div class="form-group">
                <label for="bk-pickup">Điểm đón *</label>
                <div class="pickup-row">
                    <input type="text" id="bk-pickup" name="pickup" class="form-input" required
                           autocomplete="street-address" list="bk-pickup-list"
                           placeholder="Ví dụ: 12 Nguyễn Huệ, Châu Đốc…"
                           value="${esc(pickup)}" onchange="BayNuiBooking.onPickupTyped()">
                    <datalist id="bk-pickup-list">
                        ${places.map(p => `<option value="${esc(p)}"></option>`).join('')}
                    </datalist>
                    <button type="button" id="bk-gps" class="pickup-gps" onclick="BayNuiBooking.useMyLocation()" title="Dùng vị trí hiện tại của tôi">
                        <i data-lucide="locate-fixed" aria-hidden="true"></i><span>Vị trí của tôi</span>
                    </button>
                </div>
                <div class="pickup-chips">
                    ${places.map(p => `<button type="button" class="pickup-chip" onclick="BayNuiBooking.setPickup('${esc(p)}')">${esc(p)}</button>`).join('')}
                </div>
                <p id="bk-pickup-note" class="pickup-note hidden"></p>
            </div>
            <div class="form-grid">
                <div class="form-group"><label for="bk-date">Ngày đi *</label><input type="date" id="bk-date" name="date" class="form-input" required value="${tripDate}" min="${isoToday()}" onchange="BayNuiBooking.syncReturn()"></div>
                <div class="form-group"><label>Giờ đón *</label><input type="time" id="bk-time" class="form-input" required value="08:00"></div>
            </div>
            <label class="round-trip-toggle">
                <input type="checkbox" id="bk-roundtrip" onchange="BayNuiBooking.toggleRoundTrip()">
                <span>Đón cả chiều về (khứ hồi) — tiết kiệm 5% so với đặt 2 lượt riêng</span>
            </label>
            <div id="bk-return-fields" class="form-grid hidden">
                <div class="form-group"><label>Ngày về *</label><input type="date" id="bk-date-end" class="form-input" value="${isoTomorrow()}" min="${isoTomorrow()}"></div>
                <div class="form-group"><label>Giờ về *</label><input type="time" id="bk-return-time" class="form-input" value="16:00"></div>
            </div>
            <h4 style="font-family:var(--font-body);font-size:12.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);margin:8px 0 12px">Nhà xe phục vụ tuyến này</h4>
            <div id="bk-pool"></div>
            <div id="bk-quotes" style="display:flex;flex-direction:column;gap:10px;margin-bottom:18px">
                <p style="color:var(--muted)">Đang tìm xe…</p>
            </div>
            <form onsubmit="BayNuiBooking.submit(event)">
                <div class="form-group"><label>Đi mấy người? *</label>
                    <select id="bk-seats" class="form-input">
                        ${[1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 16].map(n => `<option value="${n}"${n === 2 ? ' selected' : ''}>${n} người</option>`).join('')}
                    </select>
                    <small class="form-hint">Dùng để ghép chuyến với khách cùng tuyến — không đổi giá xe bạn đã chọn.</small>
                </div>
                ${guestFields()}
                <button type="submit" id="bk-submit" class="btn-primary btn-confirm-booking" disabled>Chọn một nhà xe ở trên</button>
            </form>`;
    }

    // ── Mở modal ──
    function open(kind, payload) {
        if (submitting) return;
        context = { kind, payload, quote: null, pickupCoords: null };
        const body = $('service-modal-body');
        if (kind === 'hotel') body.innerHTML = roomForm(payload);
        else if (kind === 'tour') body.innerHTML = tourForm(payload);
        else body.innerHTML = transportForm(payload);

        $('service-modal').classList.remove('hidden');
        $('service-modal').setAttribute('role', 'dialog');
        $('service-modal').setAttribute('aria-modal', 'true');
        $('service-modal').setAttribute('aria-labelledby', 'service-modal-title');
        document.body.style.overflow = 'hidden';
        document.body.classList.add('booking-open');
        if (window.chatbotWidget?.isOpen) chatbotWidget.close();
        if (window.lucide) lucide.createIcons();
        if (kind === 'transport') findCars(); else recalc();

        // Lich ban nap SAU khi da ve xong bieu mau: khong bat khach cho mang
        // moi thay o chon ngay. Nap xong thi tu to do nhung dem da kin.
        if (kind === 'hotel') {
            napLichBan(payload.id);
            veMucHuy(payload);
        }
        dienHoSo();
    }

    /** Lưu đúng một đơn gần nhất để chuông, trang Đơn của tôi và chatbot cùng biết. */
    function rememberBooking(data, request) {
        try {
            localStorage.setItem('localmate_last_booking', JSON.stringify({
                id: data.id,
                code: data.code,
                phone: String(request.phone || '').replace(/[\s.-]/g, ''),
                kind: data.kind,
                summary: data.summary || '',
                status: data.status || 'pending',
                total_price: Number(data.total_price) || 0,
                created_at: new Date().toISOString(),
            }));
        } catch (_) { /* Chế độ riêng tư có thể chặn localStorage. */ }
    }

    function showBookingSuccess(data, message) {
        const body = $('service-modal-body');
        if (!body) return;
        body.innerHTML = `
            <div class="booking-success" role="status" aria-live="polite">
                <span class="booking-success-icon"><i data-lucide="circle-check-big" aria-hidden="true"></i></span>
                <h2 id="service-modal-title">Đã nhận đơn của bạn</h2>
                <p>${esc(message || 'Đơn đã được ghi nhận.')}</p>
                <div class="dispatch-recap">
                    <div><span>Mã đơn</span><b>${esc(data.code)}</b></div>
                    <div><span>Trạng thái</span><b>Chờ xác nhận</b></div>
                </div>
                <p class="booking-success-note">Bạn có thể xem lại chi tiết, hủy đơn đúng điều kiện và đánh giá sau khi hoàn thành dịch vụ.</p>
                <div class="booking-success-actions">
                    <a class="btn-primary" href="donhang.html?code=${encodeURIComponent(data.code)}">
                        <i data-lucide="luggage" aria-hidden="true"></i> Xem đơn &amp; trạng thái
                    </a>
                    <button type="button" class="btn-outline" onclick="BayNuiBooking.askAboutLastBooking()">
                        <i data-lucide="messages-square" aria-hidden="true"></i> Hỏi trợ lý về đơn này
                    </button>
                </div>
            </div>`;
        if (window.lucide) lucide.createIcons();
    }

    function askAboutLastBooking() {
        close();
        if (!window.chatbotWidget) {
            location.href = 'donhang.html';
            return;
        }
        if (!chatbotWidget.isOpen) chatbotWidget.toggle();
        const input = document.getElementById('chatbot-input');
        if (!input) return;
        input.value = 'Đơn tôi vừa đặt đang ở trạng thái nào?';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        chatbotWidget.send();
    }

    /**
     * Điền sẵn họ tên và số điện thoại từ hồ sơ đã lưu.
     *
     * Chỉ điền vào ô đang TRỐNG: khách gõ dở rồi hồ sơ nạp xong mà ghi đè lên
     * thì mất công họ gõ. Chưa đăng nhập thì không có gì xảy ra — biểu mẫu
     * vẫn gõ tay được như thường.
     */
    async function dienHoSo() {
        if (!window.LMHoSo) return;
        const hs = await LMHoSo.doc();
        if (!hs) return;
        const md = LMHoSo.diaChiMacDinh();
        const dat = (id, gt) => {
            const o = $(id);
            if (o && !o.value && gt) o.value = gt;
        };
        dat('bk-name', (md && md.receiver) || hs.full_name);
        dat('bk-phone', (md && md.phone) || hs.phone);
    }

    function close(event) {
        if (event && event.target !== event.currentTarget) return;
        if (submitting) return;
        clearInterval(searchTimer);
        $('service-modal').classList.add('hidden');
        document.body.style.overflow = '';
        document.body.classList.remove('booking-open');
        context = null;
    }

    // ── Tính lại tổng tiền hiển thị (backend vẫn là nơi chốt giá) ──
    function recalc() {
        if (!context) return;
        const totalEl = $('bk-total');
        if (!totalEl) return;
        const row = document.querySelector('#service-modal-body .summary-row .summary-price');
        const note = $('bk-range-note');

        if (context.kind === 'hotel') {
            const start = $('bk-date').value;
            const endEl = $('bk-date-end');
            // Ngày trả luôn phải sau ngày nhận ít nhất 1 đêm
            endEl.min = addDays(start, 1);
            if (nightsBetween(start, endEl.value) < 1) endEl.value = addDays(start, 1);

            const nights = nightsBetween(start, endEl.value);
            let total = context.payload.price * nights;
            const discounted = nights >= 7;
            if (discounted) total = Math.round(total * 0.9);

            totalEl.textContent = money(total);
            if (row) row.textContent = `${money(context.payload.price)} × ${nights} đêm`;
            if (note) {
                note.textContent = `${dmy(start)} → ${dmy(endEl.value)} · ${nights} đêm`
                    + (discounted ? ' · đã giảm 10% cho 7 đêm trở lên' : '')
                    + ' · nhận phòng 14:00, trả phòng 12:00';
            }
            kiemNgay();
        } else if (context.kind === 'tour') {
            const guests = parseInt($('bk-guests').value, 10) || 1;
            const start = $('bk-date').value;
            const end = addDays(start, (context.payload.days || 1) - 1);
            $('bk-date-end').value = end;

            totalEl.textContent = money(context.payload.price * guests);
            if (row) row.textContent = `${money(context.payload.price)} × ${guests} khách`;
            if (note) {
                note.textContent = start === end
                    ? `Đi và về trong ngày ${dmy(start)} · ${context.payload.duration}`
                    : `${dmy(start)} → ${dmy(end)} · ${context.payload.duration}`;
            }
        }
    }

    // ── Lịch bận của phòng ──
    // Máy chủ vẫn chặn lúc gửi đơn, và đó mới là chốt chặn thật. Nhưng để
    // khách điền xong họ tên, số điện thoại rồi mới báo "phòng đã có khách"
    // thì họ mất công vô ích — lần sau không quay lại nữa.

    let demBan = [];

    /**
     * Nạp danh sách đêm đã kín của chỗ nghỉ này.
     *
     * ĐƯỢC GỌI TỪ open() — sửa hay đổi tên thì nhớ sửa cả ở đó.
     *
     * Không lấy được lịch thì im lặng bỏ qua: máy chủ vẫn chặn lúc gửi đơn,
     * báo lỗi ở đây chỉ làm khách lo mà không giúp được gì.
     */
    async function napLichBan(roomId) {
        demBan = [];
        const note = $('bk-busy-note');
        if (note) { note.style.display = 'none'; note.textContent = ''; }

        try {
            const r = await fetch('/v1/rooms/' + encodeURIComponent(roomId) + '/busy');
            const j = await r.json();
            demBan = j.data || [];
        } catch (_) {
            return;
        }

        if (note && demBan.length) {
            const sapToi = demBan.slice(0, 6).map(dmy).join(', ');
            note.style.display = '';
            note.innerHTML = 'Những đêm đã kín: <b>' + esc(sapToi) + '</b>'
                + (demBan.length > 6 ? ' và ' + (demBan.length - 6) + ' đêm khác' : '');
        }
        kiemNgay();
    }

    /**
     * Mức huỷ đơn của chỗ nghỉ này.
     *
     * Hiện TRƯỚC khi khách bấm đặt, không phải sau khi đã đặt rồi mới đọc
     * được ở trang đơn. Đọc sau thì họ đã chuyển cọc, biết luật chặt cũng
     * không làm gì được nữa.
     */
    const CHU_HUY = {
        linh_hoat: 'huỷ trước 24 giờ được hoàn đủ tiền cọc.',
        vua: 'huỷ trước 5 ngày hoàn đủ tiền cọc, trong 5 ngày hoàn một nửa, '
            + 'trong 24 giờ cuối không hoàn.',
        chat: 'huỷ trước 14 ngày hoàn đủ tiền cọc, từ 14 đến 7 ngày hoàn một nửa, '
            + 'trong 7 ngày cuối không hoàn.',
    };
    const TEN_HUY = { linh_hoat: 'Linh hoạt', vua: 'Vừa phải', chat: 'Chặt' };

    function veMucHuy(stay) {
        const o = $('bk-cancel-note');
        if (!o) return;
        const muc = (stay && stay.cancel_policy) || 'vua';
        o.style.display = '';
        o.innerHTML = '<b>Mức huỷ đơn — ' + esc(TEN_HUY[muc] || TEN_HUY.vua) + ':</b> '
            + esc(CHU_HUY[muc] || CHU_HUY.vua);
    }

    /** Khoảng khách đang chọn có chạm vào đêm nào đã kín không. */
    function ngayTrung(start, end) {
        const trung = [];
        for (let d = start; d < end; d = addDays(d, 1)) {
            if (demBan.indexOf(d) !== -1) trung.push(d);
        }
        return trung;
    }

    /**
     * Kiểm ngay khi khách đổi ngày. Trùng thì khoá nút gửi lại — cho bấm rồi
     * mới báo trượt cũng chẳng khác gì không kiểm.
     */
    function kiemNgay() {
        const nut = $('bk-submit');
        const note = $('bk-busy-note');
        if (!nut || !$('bk-date') || !$('bk-date-end')) return;

        const trung = ngayTrung($('bk-date').value, $('bk-date-end').value);
        if (!trung.length) {
            nut.disabled = false;
            nut.textContent = 'Xác nhận đặt phòng';
            if (note) note.style.color = '';
            return;
        }
        nut.disabled = true;
        nut.textContent = 'Khoảng ngày này đã có khách';
        if (note) {
            note.style.display = '';
            note.style.color = '#c0392b';
            note.innerHTML = 'Đêm <b>' + esc(trung.slice(0, 4).map(dmy).join(', ')) + '</b>'
                + (trung.length > 4 ? ' và ' + (trung.length - 4) + ' đêm nữa' : '')
                + ' đã có khách. Bạn chọn khoảng khác giúp mình nhé.';
        }
    }

    // ── Xe khứ hồi ──
    function toggleRoundTrip() {
        const on = $('bk-roundtrip').checked;
        $('bk-return-fields').classList.toggle('hidden', !on);
        syncReturn();
        updateCarButton();
    }

    function syncReturn() {
        const start = $('bk-date');
        const end = $('bk-date-end');
        if (!start || !end) return;
        end.min = start.value;
        if (end.value < start.value) end.value = start.value;
    }

    // ── Điểm đón ──
    function setPickup(name) {
        $('bk-pickup').value = name;
        context.pickupCoords = null;   // chọn tên địa danh thì bỏ toạ độ GPS cũ
        hidePickupNote();
        findCars();
    }

    function onPickupTyped() {
        // Khách sửa địa chỉ bằng tay -> toạ độ GPS không còn khớp nữa
        context.pickupCoords = null;
        hidePickupNote();
        findCars();
    }

    function hidePickupNote() {
        const note = $('bk-pickup-note');
        if (note) { note.classList.add('hidden'); note.textContent = ''; }
    }

    function showPickupNote(text) {
        const note = $('bk-pickup-note');
        if (note) { note.classList.remove('hidden'); note.textContent = text; }
    }

    async function useMyLocation() {
        if (!navigator.geolocation) {
            showPickupNote('Trình duyệt không hỗ trợ định vị. Bạn nhập địa chỉ giúp mình nhé.');
            return;
        }
        const btn = $('bk-gps');
        btn.disabled = true;
        showPickupNote('Đang lấy vị trí của bạn…');

        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const { latitude, longitude } = pos.coords;
                try {
                    const res = await fetch(`/v1/geocode/reverse?lat=${latitude}&lng=${longitude}`);
                    const data = await res.json();
                    $('bk-pickup').value = data.short_name || data.address;
                    context.pickupCoords = { lat: latitude, lng: longitude };
                    showPickupNote(`Đã lấy vị trí — cách homestay khoảng ${data.distance_to_home_km} km. Bạn có thể sửa lại địa chỉ cho chính xác hơn.`);
                    findCars();
                } catch (err) {
                    showPickupNote('Không đọc được địa chỉ. Bạn nhập tay giúp mình nhé.');
                } finally {
                    btn.disabled = false;
                }
            },
            (err) => {
                btn.disabled = false;
                showPickupNote(
                    err.code === err.PERMISSION_DENIED
                        ? 'Bạn chưa cho phép truy cập vị trí. Hãy nhập địa chỉ đón bằng tay.'
                        : 'Không lấy được vị trí. Bạn nhập địa chỉ đón giúp mình nhé.',
                );
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
        );
    }

    // ── Tìm xe theo tuyến ──
    async function findCars() {
        if (!context || context.kind !== 'transport') return;
        const activeContext = context;
        const version = ++quoteVersion;
        const host = $('bk-quotes');
        const pickup = $('bk-pickup').value.trim();
        context.quote = null;
        updateCarButton();

        if (pickup.length < 3) {
            host.innerHTML = '<p style="color:var(--muted)">Nhập điểm đón để xem giá xe.</p>';
            return;
        }
        host.innerHTML = '<p style="color:var(--muted)">Đang tìm xe…</p>';

        const coords = context.pickupCoords
            ? `&lat=${context.pickupCoords.lat}&lng=${context.pickupCoords.lng}`
            : '';
        try {
            const res = await fetch(`/v1/transport/quotes?from=${encodeURIComponent(pickup)}&to=${encodeURIComponent(context.payload.dropoff)}${coords}`);
            if (!res.ok) throw new Error('Không tải được báo giá');
            const json = await res.json();
            if (context !== activeContext || version !== quoteVersion) return;
            const quotes = json.data.slice(0, 5);
            if (!quotes.length) { host.innerHTML = '<p style="color:var(--muted)">Chưa có nhà xe phù hợp.</p>'; return; }

            host.innerHTML = quotes.map((q, i) => `
                <button type="button" class="quote-option" data-index="${i}" onclick="BayNuiBooking.pickCar(${i})">
                    <span class="quote-main">
                        <strong>${esc(q.partner_name)}</strong>
                        <small>${esc(q.vehicle_label)} · tối đa ${q.seats} khách · ~${q.duration_min} phút · ${q.distance_km} km</small>
                    </span>
                    <span class="quote-price">${money(q.price)}</span>
                </button>`).join('');
            context.quotes = quotes;
        } catch (err) {
            if (context !== activeContext || version !== quoteVersion) return;
            host.innerHTML = `<p style="color:var(--muted)">${esc(err.message)}</p>`;
        }
    }

    function pickCar(index) {
        if (!context || !context.quotes) return;
        context.quote = context.quotes[index];
        document.querySelectorAll('.quote-option').forEach((el, i) => el.classList.toggle('selected', i === index));
        updateCarButton();
        checkPool();
    }

    // ── Ghép chuyến: có ai đi cùng tuyến, cùng khung giờ không ──
    async function checkPool() {
        const host = $('bk-pool');
        if (!host || !context?.quote) return;
        host.innerHTML = '';
        context.pool = false;

        try {
            const res = await fetch('/v1/transport/pool-check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date: $('bk-date').value,
                    time: $('bk-time').value,
                    pickup: $('bk-pickup').value,
                    pickup_lat: context.pickupCoords?.lat,
                    pickup_lng: context.pickupCoords?.lng,
                    dropoff: context.payload.dropoff,
                    seats: parseInt($('bk-seats').value, 10),
                    vehicle_type: context.quote.vehicle_type,
                    price: context.quote.price,
                }),
            });
            const p = await res.json();
            if (!res.ok || !p.available) return;

            host.innerHTML = `
                <div class="pool-offer">
                    <i data-lucide="users"></i>
                    <div>
                        <b>Có ${p.matches.length} khách đi cùng tuyến quanh giờ này</b>
                        <p>Ghép chung xe thì mỗi người chỉ còn <strong>${money(p.per_person)}</strong>
                           thay vì ${money(p.solo_price)} — tiết kiệm ${money(p.saved)} (${p.discount_percent}%).
                           Giờ đón có thể lệch tối đa ${p.window_minutes} phút.</p>
                        <label>
                            <input type="checkbox" id="bk-pool-opt" onchange="BayNuiBooking.togglePool()">
                            Tôi đồng ý ghép chuyến
                        </label>
                    </div>
                </div>`;
            if (window.lucide) lucide.createIcons();
        } catch (_) { /* không có gợi ý ghép thì đặt xe riêng như bình thường */ }
    }

    function togglePool() {
        context.pool = Boolean($('bk-pool-opt')?.checked);
        updateCarButton();
    }

    function updateCarButton() {
        const btn = $('bk-submit');
        if (!btn) return;
        if (context && context.quote) {
            const roundTrip = ($('bk-roundtrip') || {}).checked;
            // Khứ hồi = 2 lượt giảm 5%, khớp với cách backend tính
            let price = roundTrip
                ? Math.round(context.quote.price * 1.9 / 5000) * 5000
                : context.quote.price;
            // Ghép chuyến thì mỗi khách trả phần rẻ hơn
            if (context.pool) price = Math.round(price * 0.65 / 1000) * 1000;
            btn.disabled = false;
            btn.textContent = `Đặt xe · ${money(price)}${roundTrip ? ' (khứ hồi)' : ''}${context.pool ? ' · ghép chuyến' : ''}`;
        } else {
            btn.disabled = true;
            btn.textContent = 'Chọn một nhà xe ở trên';
        }
    }

    // ── Gửi đơn ──
    async function submit(event) {
        event.preventDefault();
        if (!context || submitting) return;
        if (context.kind === 'transport' && !context.quote) return;

        const btn = $('bk-submit');
        const original = btn.textContent;
        btn.disabled = true;
        btn.textContent = 'Đang gửi đơn…';

        const base = {
            guest_name: $('bk-name').value.trim(),
            phone: $('bk-phone').value.trim(),
            note: ($('bk-note') || {}).value || '',
            source: 'web',
        };

        let body;
        if (context.kind === 'hotel') {
            body = {
                ...base, kind: 'hotel',
                room_id: context.payload.id,
                check_in: $('bk-date').value,
                check_out: $('bk-date-end').value,
            };
        } else if (context.kind === 'tour') {
            body = {
                ...base, kind: 'tour',
                tour_slug: context.payload.slug,
                date: $('bk-date').value,
                guests: parseInt($('bk-guests').value, 10),
            };
        } else {
            const roundTrip = $('bk-roundtrip').checked;
            body = {
                ...base, kind: 'transport',
                pickup: $('bk-pickup').value,
                dropoff: context.payload.dropoff,
                date: $('bk-date').value,
                time: $('bk-time').value,
                seats: parseInt($('bk-seats').value, 10),
                vehicle_type: context.quote.vehicle_type,
                partner_id: context.quote.partner_id,
                pickup_lat: context.pickupCoords ? context.pickupCoords.lat : undefined,
                pickup_lng: context.pickupCoords ? context.pickupCoords.lng : undefined,
                pool: Boolean(context.pool),
                round_trip: roundTrip,
                return_date: roundTrip ? $('bk-date-end').value : undefined,
                return_time: roundTrip ? $('bk-return-time').value : undefined,
            };
        }

        submitting = true;
        try {
            // Kèm thẻ đăng nhập nếu khách có tài khoản: máy chủ gắn đơn vào
            // tài khoản đó, và trang "Đơn của tôi" tự hiện ra — khỏi phải gõ
            // lại số điện thoại để tra. Không đăng nhập thì vẫn đặt được như
            // thường, tra bằng số điện thoại + mã đơn.
            const the = (window.BayNuiUser && BayNuiUser.coPhien())
                ? await BayNuiUser.token().catch(() => null)
                : null;

            const res = await fetch('/v1/bookings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(the ? { Authorization: 'Bearer ' + the } : {}),
                },
                body: JSON.stringify(body),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json?.error?.message || 'Không gửi được đơn.');
            rememberBooking(json.data, body);

            // Nhớ số vừa đặt.
            //
            // Chuông thông báo tra theo SỐ ĐIỆN THOẠI (phần lớn khách đặt xe
            // không đăng ký tài khoản). Không lưu số ở đây thì máy chủ có gửi
            // thông báo cũng chẳng ai đọc: chuông không biết mình đang là của
            // ai nên hỏi rỗng. Đây là chỗ duy nhất chắc chắn biết được số.
            try {
                localStorage.setItem('baynui_lookup_phone',
                    String(body.phone || '').replace(/[\s.-]/g, ''));
                if (window.BayNuiNotify && BayNuiNotify.refresh) BayNuiNotify.refresh();
            } catch (_) { /* trinh duyet chan luu tru thi thoi */ }

            // Khách đã chủ động chọn một nhà xe trong bảng báo giá. LOCALMATE
            // là sàn kết nối nên đơn phải về đúng nhà xe đó, không tiếp tục
            // "tìm tài xế gần nhất" như một ứng dụng gọi xe.
            if (body.kind === 'transport') {
                showSearching(json.data.id, json.data);
                return;
            }
            showBookingSuccess(json.data, json.message);
        } catch (err) {
            alert(err.message);
            btn.disabled = false;
            btn.textContent = original;
        } finally {
            submitting = false;
        }
    }

    // ════════════════════════════════════════════════
    // ĐÃ GỬI ĐẾN NHÀ XE
    // ════════════════════════════════════════════════
    // Đơn xe là đơn marketplace: khách chọn nhà xe nào thì nhà xe đó nhận.
    // Màn này nói rõ bên nhận để khách không tưởng LOCALMATE còn chuyển đơn
    // vòng quanh cho những tài xế/nhà xe khác.
    let searchTimer = null;

    function showSearching(bookingId, data) {
        clearInterval(searchTimer);
        const body = $('service-modal-body');
        const bookingCode = String(data.code || bookingId || '').slice(-8).toUpperCase();
        const partnerName = data.partner_name || 'Nhà xe đã chọn';
        body.innerHTML = `
            <div class="dispatch-box found" id="dispatch-box">
                <div class="booking-success-icon"><i data-lucide="circle-check-big"></i></div>
                <h3 id="dispatch-title">Đã gửi đơn đến ${esc(partnerName)}</h3>
                <p id="dispatch-sub">Nhà xe sẽ xem đơn, xác nhận và liên hệ với bạn. Trạng thái mới sẽ hiện ở chuông thông báo và trang Đơn của tôi.</p>
                <div class="dispatch-recap">
                    <div><span>Mã đơn</span><b>${esc(bookingCode)}</b></div>
                    <div><span>Nhà xe nhận đơn</span><b>${esc(partnerName)}</b></div>
                    <div><span>Chuyến</span><b>${esc(data.summary || 'Xe đưa đón')}</b></div>
                    <div><span>Tổng tiền</span><b>${money(data.total_price)}</b></div>
                </div>
                <div class="dispatch-actions" id="dispatch-actions">
                    <a class="btn-primary" href="donhang.html?code=${encodeURIComponent(bookingCode)}">Xem đơn của tôi</a>
                    <button class="btn-outline" type="button" onclick="BayNuiBooking.close()">Đóng</button>
                </div>
            </div>`;
        if (window.lucide) lucide.createIcons();
    }

    async function pollDispatch(bookingId, bookingCode = '') {
        bookingCode = bookingCode || String(bookingId || '').slice(-8).toUpperCase();
        const box = $('dispatch-box');
        if (!box) { clearInterval(searchTimer); return; }
        let s;
        try {
            s = await (await fetch(`/v1/bookings/${bookingId}/dispatch`)).json();
        } catch (_) { return; }

        const title = $('dispatch-title');
        const sub = $('dispatch-sub');
        const actions = $('dispatch-actions');

        if (s.state === 'accepted') {
            clearInterval(searchTimer);
            box.classList.add('found');
            title.textContent = `${s.driver_name || 'Tài xế'} đã nhận chuyến của bạn`;
            sub.innerHTML = `${esc(s.plate || '')} · cách bạn ${String(s.distance_km).replace('.', ',')} km<br>
                <a href="tel:${esc(s.driver_phone)}" class="dispatch-phone">${esc(s.driver_phone)}</a>`;
            actions.innerHTML = `
                <a class="btn-primary" href="donhang.html?code=${encodeURIComponent(bookingCode)}">Xem đơn của tôi</a>
                <button class="btn-outline" type="button" onclick="BayNuiBooking.close()">Đóng</button>`;
            return;
        }

        if (s.state === 'timeout' || (s.state === 'no_driver' && s.can_retry)) {
            clearInterval(searchTimer);
            box.classList.add('failed');
            title.textContent = 'Chưa tìm được tài xế';
            sub.textContent = s.message
                || `Sau ${s.giveup_minutes || 10} phút vẫn chưa có tài xế nào nhận chuyến này.`;
            actions.innerHTML = `
                <button class="btn-primary" onclick="BayNuiBooking.retryDriver('${esc(bookingId)}')">
                    <i data-lucide="refresh-cw"></i> Tìm lại tài xế
                </button>
                <a class="btn-outline" href="donhang.html?code=${encodeURIComponent(bookingCode)}">Xem đơn của tôi</a>
                <button class="btn-outline" type="button" onclick="BayNuiBooking.close()">Để tổng đài gọi lại</button>`;
            if (window.lucide) lucide.createIcons();
            return;
        }

        // Vẫn đang tìm
        const left = Number(s.seconds_left || 0);
        title.textContent = 'Đang tìm tài xế gần bạn…';
        sub.textContent = s.tried
            ? `Đã hỏi ${s.tried} tài xế. Còn tìm thêm ${Math.ceil(left / 60)} phút nữa.`
            : 'Chúng tôi đang gọi lần lượt các tài xế quanh điểm đón.';
        if (!actions.innerHTML) {
            actions.innerHTML = `
                <a class="btn-outline" href="donhang.html?code=${encodeURIComponent(bookingCode)}">Xem đơn của tôi</a>
                <button class="btn-outline" type="button" onclick="BayNuiBooking.close()">Đóng, tôi chờ điện thoại</button>`;
        }
    }

    async function retryDriver(bookingId) {
        const box = $('dispatch-box');
        if (box) box.classList.remove('failed');
        $('dispatch-title').textContent = 'Đang tìm lại tài xế…';
        $('dispatch-sub').textContent = 'Lần này hỏi lại cả những tài xế đã bỏ qua.';
        $('dispatch-actions').innerHTML = '';
        try {
            await fetch(`/v1/bookings/${bookingId}/redispatch`, { method: 'POST' });
        } catch (_) { /* vẫn để vòng poll xử lý */ }
        clearInterval(searchTimer);
        pollDispatch(bookingId);
        searchTimer = setInterval(() => pollDispatch(bookingId), 4000);
    }

    // ── Lối tắt: mở thẳng từ nơi chỉ biết slug ──
    async function openTour(slug) {
        try {
            const res = await fetch('/v1/tours');
            const json = await res.json();
            const tour = (json.data || []).find(t => t.slug === slug);
            if (!tour) throw new Error('Không tìm thấy tour.');
            open('tour', tour);
        } catch (err) {
            alert(err.message);
        }
    }

    function openTransport(input) {
        const opts = input && typeof input === 'object' ? input : { dropoff: input };
        open('transport', {
            pickup: opts.pickup || '',
            dropoff: opts.dropoff || 'LOCALMATE, Núi Cấm',
            date: opts.date || '',
            pickup_suggestions: ['Châu Đốc', 'Long Xuyên', 'Tịnh Biên', 'Tri Tôn', 'Cần Thơ'],
        });
    }

    return { open, openTour, openTransport, close, retryDriver, togglePool, recalc, findCars, pickCar, submit, toggleRoundTrip, syncReturn, setPickup, onPickupTyped, useMyLocation, askAboutLastBooking };
})();

window.BayNuiBooking = BayNuiBooking;
