// ============================================================
// LOCALMATE — Tạo lịch trình cho khách
// ============================================================
// Ba bước, mỗi bước một câu hỏi. Xong thì ra một lịch trình BẤM ĐƯỢC:
// mỗi dòng gắn thẳng vào modal đặt xe / đặt phòng / xem địa điểm đang có.
//
// Lịch trình do POST /v1/ai/itinerary dựng từ dữ liệu thật (địa điểm,
// món ăn, khách sạn đối tác, thời tiết) — không phải nội dung viết cứng.
// ============================================================

const Trip = (() => {
    const $ = (id) => document.getElementById(id);
    const money = (n) => Number(n || 0).toLocaleString('vi-VN') + 'đ';
    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const dmy = (iso) => {
        const [y, m, d] = String(iso || '').split('-');
        return d ? `${d}/${m}/${y}` : (iso || '');
    };
    const isoOf = (date) => {
        const p = (n) => String(n).padStart(2, '0');
        return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
    };

    const DAY_OPTIONS = [1, 2, 3, 4];

    let step = 1;
    let form = {
        preferences: [],
        days: 2,
        people: 2,
        budget: 1000000,
        start_point: 'Châu Đốc',
        start_date: '',
    };
    let options = null;
    let trip = null;

    // ── Khởi tạo ──
    async function init() {
        if (!$('trip-wizard')) return;

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        form.start_date = isoOf(tomorrow);
        const dateInput = $('wiz-date');
        if (dateInput) {
            dateInput.value = form.start_date;
            dateInput.min = isoOf(new Date());
            dateInput.onchange = () => { form.start_date = dateInput.value; };
        }
        const startInput = $('wiz-start');
        if (startInput) startInput.onchange = () => { form.start_point = startInput.value.trim(); };

        try {
            options = await (await fetch('/v1/itinerary/options')).json();
        } catch (_) {
            options = {
                preferences: [
                    { value: 'van-hoa', label: 'Văn hoá' },
                    { value: 'thien-nhien', label: 'Thiên nhiên' },
                    { value: 'am-thuc', label: 'Ẩm thực' },
                    { value: 'nghi-duong', label: 'Nghỉ dưỡng' },
                ],
                budgets: [
                    { value: 500000, label: 'Dưới 500k' },
                    { value: 1000000, label: '500k – 1 triệu' },
                    { value: 2000000, label: '1 – 2 triệu' },
                    { value: 5000000, label: 'Thoải mái' },
                ],
            };
        }
        renderChips();
    }

    function renderChips() {
        $('wiz-prefs').innerHTML = options.preferences.map(p => `
            <button type="button" class="wiz-chip ${form.preferences.includes(p.value) ? 'on' : ''}"
                onclick="Trip.togglePref('${esc(p.value)}')">${esc(p.label)}</button>`).join('');

        $('wiz-days').innerHTML = DAY_OPTIONS.map(d => `
            <button type="button" class="wiz-chip ${form.days === d ? 'on' : ''}"
                onclick="Trip.setDays(${d})">${d} ngày</button>`).join('');

        $('wiz-budget').innerHTML = options.budgets.map(b => `
            <button type="button" class="wiz-chip ${form.budget === b.value ? 'on' : ''}"
                onclick="Trip.setBudget(${b.value})">${esc(b.label)}</button>`).join('');

        $('wiz-people').textContent = form.people;
    }

    // ── Điều khiển từng bước ──
    function show(target) {
        step = target;
        document.querySelectorAll('#trip-wizard .wiz-step').forEach(el => {
            el.classList.toggle('on', el.dataset.step === String(target));
        });
        document.querySelectorAll('#trip-wizard .wiz-progress span').forEach((el, i) => {
            el.classList.toggle('on', typeof target === 'number' && i < target);
        });
    }

    function next() {
        show(Math.min(step + 1, 3));
        // Sang bước 3 là đã chốt ngày → xem trước thời tiết mấy hôm đó
        if (step === 3) loadOutlook();
    }
    const back = () => show(Math.max(step - 1, 1));

    // ── Xem trước thời tiết ngày khách định đi ──
    async function loadOutlook() {
        const host = $('wiz-outlook');
        if (!host) return;
        const dateInput = $('wiz-date');
        if (dateInput) form.start_date = dateInput.value;

        host.innerHTML = '<p class="wiz-hint">Đang xem dự báo mấy ngày đó…</p>';
        try {
            const r = await fetch(`/v1/weather/outlook?from=${form.start_date}&days=${form.days}`);
            const o = await r.json();
            if (!r.ok) throw new Error('Chưa lấy được dự báo.');

            const level = (p) => (p >= 70 ? 'bad' : p >= 40 ? 'warn' : 'good');
            host.innerHTML = `
                <div class="wiz-outlook">
                    <label class="wiz-label" style="margin-top:0">Thời tiết mấy ngày bạn đi</label>
                    <div class="outlook-row">
                        ${o.days.map(d => `
                            <div class="outlook-day ${level(d.rain_probability)}">
                                <span class="od-date">${dmy(d.date).slice(0, 5)}</span>
                                <span class="od-rain">${d.rain_probability}%</span>
                                <span class="od-temp">${Math.round(d.temp_min)}–${Math.round(d.temp_max)}°</span>
                                <span class="od-text">${esc(d.text_vi)}</span>
                            </div>`).join('')}
                    </div>
                    <p class="wiz-hint">${esc(o.summary)}</p>
                </div>`;
        } catch (_) {
            host.innerHTML = '<p class="wiz-hint">Chưa xem được dự báo lúc này — lịch trình vẫn dựng bình thường.</p>';
        }
    }

    function togglePref(value) {
        form.preferences = form.preferences.includes(value)
            ? form.preferences.filter(v => v !== value)
            : [...form.preferences, value];
        renderChips();
    }
    function setDays(value) { form.days = value; renderChips(); }
    function setBudget(value) { form.budget = value; renderChips(); }
    function addPeople(delta) {
        form.people = Math.min(Math.max(form.people + delta, 1), 20);
        renderChips();
    }

    function useMyLocation() {
        const input = $('wiz-start');
        if (!navigator.geolocation) return alert('Trình duyệt không hỗ trợ định vị.');
        input.value = 'Đang lấy vị trí…';
        navigator.geolocation.getCurrentPosition(async (pos) => {
            try {
                const geo = await (await fetch(`/v1/geocode/reverse?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`)).json();
                input.value = geo.short_name || geo.address;
                form.start_point = input.value;
            } catch (_) {
                input.value = 'Châu Đốc';
            }
        }, () => {
            input.value = 'Châu Đốc';
            alert('Cần cho phép truy cập vị trí, hoặc bạn nhập nơi xuất phát bằng tay.');
        }, { enableHighAccuracy: true, timeout: 10000 });
    }

    // ── Gọi backend dựng lịch trình ──
    const LOADING_STEPS = [
        'Đọc sở thích và ngân sách của bạn',
        'Gom địa điểm theo cụm để đỡ chạy lòng vòng',
        'Xem dự báo thời tiết từng khung giờ',
        'Chọn quán ăn và chỗ nghỉ đối tác gần nhất',
        'Cộng chi phí và hoàn thiện lịch trình',
    ];

    async function generate() {
        const startInput = $('wiz-start');
        if (startInput) form.start_point = startInput.value.trim() || 'Châu Đốc';
        const dateInput = $('wiz-date');
        if (dateInput) form.start_date = dateInput.value;

        show('loading');
        const host = $('ai-steps');
        host.innerHTML = LOADING_STEPS.map((s, i) => `
            <div class="ai-step" data-i="${i}">
                <span class="ai-step-dot"><i data-lucide="circle" style="width:12px;height:12px"></i></span>
                <span>${esc(s)}</span>
            </div>`).join('');
        if (window.lucide) lucide.createIcons();

        // Bật dần từng dòng cho khách thấy hệ thống đang làm gì
        let tick = 0;
        const timer = setInterval(() => {
            const el = host.querySelector(`.ai-step[data-i="${tick}"]`);
            if (el) el.classList.add('on');
            tick += 1;
            if (tick >= LOADING_STEPS.length) clearInterval(timer);
        }, 420);

        try {
            const res = await fetch('/v1/ai/itinerary', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json?.error?.message || 'Chưa dựng được lịch trình.');
            clearInterval(timer);
            host.querySelectorAll('.ai-step').forEach(el => el.classList.add('on'));
            trip = json;
            setTimeout(() => renderTrip(json), 350);
        } catch (err) {
            clearInterval(timer);
            alert(err.message);
            show(3);
        }
    }

    // ── Hiển thị lịch trình ──
    function renderTrip(t) {
        const host = $('trip-wizard');
        host.classList.add('done');
        host.innerHTML = `
            <div class="trip-result">
                <div class="trip-head">
                    <div>
                        <h4>${esc(t.title)}</h4>
                        <p class="trip-dates">${dmy(t.start_date)} – ${dmy(t.end_date)} · ${t.people} khách${t.ai_written ? ' · lời dẫn do AI viết' : ''}</p>
                    </div>
                    <button class="btn-ghost-dark" onclick="Trip.restart()">Tạo lại</button>
                </div>

                <p class="trip-summary">${esc(t.summary)}</p>

                <div class="trip-budget ${t.over_budget ? 'over' : ''}">
                    <i data-lucide="${t.over_budget ? 'alert-triangle' : 'wallet'}" style="width:17px;height:17px"></i>
                    <span>${esc(t.budget_note)}</span>
                </div>

                ${t.event_highlight ? `
                <div class="trip-event-hit">
                    <i data-lucide="party-popper" style="width:17px;height:17px"></i>
                    <span>${esc(t.event_highlight)}</span>
                </div>` : ''}

                ${t.weather_warning ? `
                <div class="trip-budget over">
                    <i data-lucide="cloud-rain" style="width:17px;height:17px"></i>
                    <span>${esc(t.weather_warning)}</span>
                </div>` : ''}

                <div id="trip-replan"></div>

                ${t.plan.map(day => `
                    <div class="trip-day">
                        <div class="trip-day-head">
                            <b>Ngày ${day.day}</b>
                            <span>${dmy(day.date)} · ${money(day.cost)}</span>
                        </div>
                        ${day.weather ? `
                        <div class="trip-day-weather ${day.weather.rain_probability >= 70 ? 'bad' : day.weather.rain_probability >= 40 ? 'warn' : 'good'}">
                            <i data-lucide="cloud" style="width:14px;height:14px"></i>
                            ${Math.round(day.weather.temp_min)}–${Math.round(day.weather.temp_max)}°C ·
                            mưa ${day.weather.rain_probability}% · ${esc(day.weather.text_vi)}
                        </div>` : ''}
                        <div class="trip-timeline">
                            ${day.items.map(renderItem).join('')}
                        </div>
                    </div>`).join('')}

                ${t.tips && t.tips.length ? `
                <div class="trip-tips">
                    <h5><i data-lucide="lightbulb" style="width:16px;height:16px"></i> Mẹo cho chuyến này</h5>
                    <ul>${t.tips.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
                </div>` : ''}

                ${t.tours && t.tours.length ? `
                <div class="trip-tours">
                    <h5>Hoặc đi trọn gói cho nhẹ đầu</h5>
                    ${t.tours.map(tour => `
                        <div class="trip-tour">
                            <div>
                                <b>${esc(tour.name)}</b>
                                <span>${esc(tour.duration)} · ${esc(tour.stops)}</span>
                            </div>
                            <button class="btn-warm" onclick="BayNuiBooking.openTour('${esc(tour.slug)}')">
                                ${money(tour.total)} · Đặt
                            </button>
                        </div>`).join('')}
                </div>` : ''}

                <div class="trip-actions">
                    <button class="btn-warm" onclick="Trip.bookAll()">
                        <i data-lucide="check-check" style="width:17px;height:17px"></i> Đặt tất cả
                    </button>
                    <button class="btn-ghost-dark" onclick="Trip.share()">
                        <i data-lucide="share-2" style="width:17px;height:17px"></i> Chia sẻ
                    </button>
                </div>
            </div>`;
        if (window.lucide) lucide.createIcons();
        checkReplan(t);
    }

    // ── Né mưa khi khách đang trên đường ──
    // Chỉ hỏi server khi hôm nay nằm trong lịch trình — không thì chẳng có gì để đổi.
    async function checkReplan(t) {
        const host = $('trip-replan');
        if (!host || !t?.trip_id) return;
        const today = new Date().toISOString().slice(0, 10);
        if (!t.plan.some(d => d.date === today)) return;

        let s;
        try {
            s = await (await fetch(`/v1/itineraries/${t.trip_id}/replan`)).json();
        } catch (_) { return; }

        if (s.state === 'suggest') {
            host.innerHTML = `
                <div class="trip-replan">
                    <div>
                        <b><i data-lucide="cloud-rain" style="width:16px;height:16px"></i> Sắp mưa ở điểm tiếp theo</b>
                        <p>${esc(s.message)}</p>
                    </div>
                    <div class="trip-replan-actions">
                        <button class="btn-warm" onclick="Trip.applyReplan()">Đổi giúp tôi</button>
                        <button class="btn-ghost-dark" onclick="Trip.dismissReplan()">Giữ nguyên</button>
                    </div>
                </div>`;
        } else if (s.state === 'warn') {
            host.innerHTML = `
                <div class="trip-replan warn">
                    <div>
                        <b><i data-lucide="umbrella" style="width:16px;height:16px"></i> Nhớ mang áo mưa</b>
                        <p>${esc(s.message)}</p>
                    </div>
                </div>`;
        }
        if (window.lucide) lucide.createIcons();
    }

    async function applyReplan() {
        if (!trip?.trip_id) return;
        const host = $('trip-replan');
        host.innerHTML = '<p class="trip-summary">Đang xếp lại lịch trình…</p>';
        try {
            const res = await fetch(`/v1/itineraries/${trip.trip_id}/replan`, { method: 'POST' });
            const json = await res.json();
            if (!res.ok) throw new Error(json?.error?.message || 'Chưa đổi được.');
            trip.plan = json.plan;
            renderTrip(trip);
            if (typeof showToast === 'function') showToast(json.message);
        } catch (err) {
            host.innerHTML = `<p class="trip-summary">${esc(err.message)}</p>`;
        }
    }

    const dismissReplan = () => { const h = $('trip-replan'); if (h) h.innerHTML = ''; };

    const ICONS = { transport: 'car-front', place: 'map-pin', food: 'utensils', stay: 'bed-double', event: 'party-popper' };

    function renderItem(item, index) {
        const button = item.action === 'book_transport'
            ? `<button class="trip-btn" onclick="Trip.bookTransport('${esc(item.payload.pickup)}','${esc(item.payload.dropoff)}')">${esc(item.action_label)}</button>`
            : item.action === 'book_stay'
                ? `<button class="trip-btn" onclick="Trip.bookStay('${esc(item.payload.stay_id)}','${esc(item.payload.check_in)}','${esc(item.payload.check_out)}')">${esc(item.action_label)}</button>`
                : item.kind === 'place'
                    ? `<a class="trip-btn" href="diadiem.html?slug=${esc(item.slug)}">${esc(item.action_label)}</a>`
                    : '';

        return `
            <div class="trip-item ${item.kind}">
                <span class="trip-time">${esc(item.time)}</span>
                <span class="trip-dot"><i data-lucide="${ICONS[item.kind] || 'circle'}" style="width:13px;height:13px"></i></span>
                <div class="trip-body">
                    <b>${esc(item.title)}</b>
                    <span>${esc(item.subtitle)}</span>
                    ${item.weather_note ? `<em class="trip-weather"><i data-lucide="cloud-rain" style="width:13px;height:13px"></i> ${esc(item.weather_note)}</em>` : ''}
                    ${item.tip ? `<em class="trip-tip">${esc(item.tip)}</em>` : ''}

                    ${(item.ride_options || []).length ? `
                    <div class="trip-options">
                        ${item.ride_options.map(r => `
                            <span class="trip-option">${esc(r.label)} · ${money(r.price)}</span>`).join('')}
                    </div>` : ''}

                    ${item.area ? `<em class="trip-tip"><i data-lucide="map-pin" style="width:12px;height:12px"></i> ${esc(item.area)}</em>` : ''}
                    ${(item.alternatives || []).length ? `
                    <div class="trip-options">
                        <span class="trip-option-label">Hoặc:</span>
                        ${item.alternatives.map(a => `
                            <button class="trip-option alt" onclick="Trip.bookStay('${esc(a.id)}','${esc(item.payload?.check_in || '')}','${esc(item.payload?.check_out || '')}')">
                                ${esc(a.name)} · ${money(a.price)} · ${esc(a.note)}
                            </button>`).join('')}
                    </div>` : ''}
                </div>
                <div class="trip-right">
                    ${item.price ? `<span class="trip-price">${money(item.price)}</span>` : ''}
                    ${button}
                </div>
            </div>`;
    }

    // ── Hành động trên từng dòng ──
    function bookTransport(pickup, dropoff) {
        if (typeof BayNuiBooking === 'undefined') return;
        BayNuiBooking.openTransport(dropoff);
        // Điền sẵn điểm đón lấy từ lịch trình
        setTimeout(() => {
            const el = document.getElementById('bk-pickup');
            if (el) { el.value = pickup; BayNuiBooking.onPickupTyped(); }
        }, 300);
    }

    async function bookStay(stayId, checkIn, checkOut) {
        try {
            const rooms = (await (await fetch('/v1/rooms')).json()).data || [];
            const room = rooms.find(r => r.id === stayId) || rooms[0];
            if (!room) throw new Error('Chưa lấy được thông tin phòng.');
            BayNuiBooking.open('hotel', room);
            setTimeout(() => {
                const a = document.getElementById('bk-date');
                const b = document.getElementById('bk-date-end');
                if (a && b) { a.value = checkIn; b.value = checkOut; BayNuiBooking.recalc(); }
            }, 250);
        } catch (err) {
            alert(err.message);
        }
    }

    /** Đặt cả chuyến: mở lần lượt từng đơn cần đặt, bắt đầu từ chặng xe đầu tiên. */
    function bookAll() {
        if (!trip) return;
        const rides = trip.plan.flatMap(d => d.items.filter(i => i.action === 'book_transport'));
        const stays = trip.plan.flatMap(d => d.items.filter(i => i.action === 'book_stay'));
        const lines = [
            ...rides.map(r => `• Xe: ${r.payload.pickup} → ${r.payload.dropoff} lúc ${r.payload.time}`),
            ...stays.map(s => `• Phòng: ${s.title} (${dmy(s.payload.check_in)} – ${dmy(s.payload.check_out)})`),
        ];
        const ok = confirm(
            `Chuyến này cần đặt ${rides.length} chặng xe và ${stays.length} đêm nghỉ:\n\n${lines.join('\n')}\n\n`
            + 'Bấm OK để bắt đầu đặt từng mục, mình sẽ điền sẵn thông tin cho bạn.',
        );
        if (!ok) return;
        if (rides[0]) bookTransport(rides[0].payload.pickup, rides[0].payload.dropoff);
        else if (stays[0]) bookStay(stays[0].payload.stay_id, stays[0].payload.check_in, stays[0].payload.check_out);
    }

    async function share() {
        if (!trip?.trip_id) return;
        const url = `${location.origin}/lichtrinh.html?id=${trip.trip_id}`;
        if (navigator.share) {
            try { await navigator.share({ title: trip.title, url }); return; } catch (_) { /* khách huỷ */ }
        }
        try {
            await navigator.clipboard.writeText(url);
            if (typeof showToast === 'function') showToast('Đã chép link lịch trình. Gửi cho bạn bè nhé!');
            else alert(url);
        } catch (_) {
            prompt('Chép link này để chia sẻ:', url);
        }
    }

    function restart() {
        const host = $('trip-wizard');
        host.classList.remove('done');
        location.reload();
    }

    /** Trang lichtrinh.html gọi vào để dựng lại lịch trình đã lưu. */
    async function load(tripId, hostId) {
        const host = $(hostId);
        try {
            const res = await fetch(`/v1/itineraries/${tripId}`);
            const json = await res.json();
            if (!res.ok) throw new Error(json?.error?.message || 'Không tìm thấy lịch trình.');
            trip = json;
            host.id = 'trip-wizard';
            renderTrip(json);
        } catch (err) {
            host.innerHTML = `<p class="trip-summary">${esc(err.message)}</p>`;
        }
    }

    document.addEventListener('DOMContentLoaded', init);

    return {
        next, back, togglePref, setDays, setBudget, addPeople, useMyLocation,
        generate, restart, share, bookAll, bookTransport, bookStay, load,
        applyReplan, dismissReplan,
    };
})();
