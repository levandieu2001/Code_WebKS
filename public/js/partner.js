// ============================================================
// LOCALMATE — Cổng đối tác
// ============================================================
// Đăng ký / đăng nhập đối tác và xem đơn của chính mình. Với nhà xe,
// khách chọn báo giá của ai thì đơn đi thẳng về đúng nhà xe đó.
// ============================================================

const Partner = (() => {
    const $ = (id) => document.getElementById(id);
    const money = (n) => Number(n || 0).toLocaleString('vi-VN') + 'đ';
    const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const dmy = (iso) => {
        const [y, m, d] = String(iso || '').split('-');
        return d ? `${d}/${m}/${y}` : (iso || '');
    };

    const TOKEN_KEY = 'baynui_partner_token';
    const emptyState = () => ({
        partner: null, orders: [], filter: 'all', online: false, offers: [],
        // Khu vực nhận đơn của tài xế; selectedArea rỗng = dùng vị trí hiện tại
        areas: [], selectedArea: '', activeAreaName: '', radiusKm: 30,
    });
    let state = emptyState();
    let pollTimer = null;
    let heartbeatTimer = null;

    // ── Gọi API kèm token ──
    async function api(path, options = {}) {
        const token = localStorage.getItem(TOKEN_KEY);
        const res = await fetch(path, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                ...(options.headers || {}),
            },
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body?.error?.message || 'Có lỗi xảy ra.');
        return body;
    }

    function showError(id, message) {
        const el = $(id);
        el.textContent = message;
        el.classList.remove('hidden');
    }

    function toast(message) {
        const el = $('toast');
        $('toast-msg').textContent = message;
        el.classList.add('show');
        setTimeout(() => el.classList.remove('show'), 3200);
    }

    // ── Đăng ký ──
    function onTypeChange() {
        const type = document.querySelector('input[name="ptype"]:checked').value;
        $('vehicle-fields').style.display = type === 'transport' ? '' : 'none';
    }

    /**
     * Đăng ký làm đối tác.
     *
     * Hai bước, không gộp được: TẠO TÀI KHOẢN trước, GỬI ẢNH CCCD sau. Cửa
     * nhận ảnh chỉ mở cho người đã đăng nhập — mở cho khách vãng lai thì ai
     * cũng đổ ảnh vào ổ đĩa được. Mà nhét luôn ảnh vào chính lời gọi đăng ký
     * thì phải mã hoá base64, gói tin phồng lên gấp rưỡi và cả hồ sơ hỏng
     * theo nếu ảnh gửi lỗi.
     *
     * Đổi lại: ảnh gửi hụt thì tài khoản đã có rồi, người ta đăng nhập vào
     * nộp bù được (thẻ "Giấy tờ tuỳ thân" trong kênh đối tác) — chứ không
     * mất trắng phải khai lại từ đầu.
     */
    async function register(event) {
        event.preventDefault();
        $('reg-error').classList.add('hidden');
        const btn = $('reg-btn');
        btn.disabled = true;
        btn.textContent = 'Đang gửi hồ sơ…';

        const type = document.querySelector('input[name="ptype"]:checked').value;
        const anhTruoc = $('reg-idfront').files[0];
        const anhSau = $('reg-idback').files[0];

        // Chặn tại chỗ: gửi lên rồi mới biết thiếu ảnh thì đã tạo tài khoản
        // dở dang, người ta đăng ký lại lần nữa lại vướng "email đã tồn tại".
        if (!anhTruoc || !anhSau) {
            showError('reg-error', 'Bạn chọn đủ ảnh CCCD mặt trước và mặt sau giúp mình nhé.');
            btn.disabled = false;
            btn.textContent = 'Gửi hồ sơ đối tác';
            return;
        }

        try {
            const result = await api('/v1/partners/register', {
                method: 'POST',
                body: JSON.stringify({
                    type,
                    name: $('reg-name').value.trim(),
                    phone: $('reg-phone').value.trim(),
                    address: $('reg-address').value.trim(),
                    email: $('reg-email').value.trim(),
                    password: $('reg-password').value,
                    note: $('reg-note').value.trim(),
                    id_name: $('reg-idname').value.trim(),
                    id_number: $('reg-idnumber').value.trim(),
                    vehicle_type: type === 'transport' ? $('reg-vehicle').value : '',
                    vehicle_seats: type === 'transport' ? parseInt($('reg-vehicle').value, 10) || 4 : 0,
                    plate: type === 'transport' ? $('reg-plate').value.trim() : '',
                }),
            });
            BayNuiAuth.save(result);

            // Ảnh CCCD vài MB trên sóng 3G ở quê là chuyện vài chục giây. Im
            // lặng chừng đó thì người ta tưởng treo và bấm lại.
            try {
                await BayNuiKyc.guiCaHai({ front: anhTruoc, back: anhSau }, (tin) => {
                    btn.textContent = tin;
                });
                toast('Đã gửi hồ sơ và ảnh CCCD. LOCALMATE sẽ đối chiếu và phản hồi trong 24 giờ.');
            } catch (loiAnh) {
                // Tài khoản đã tạo xong rồi, đừng để họ tưởng mất trắng
                toast('Đã tạo hồ sơ nhưng chưa gửi được ảnh CCCD — bạn nộp lại ngay bên dưới nhé.');
                showError('reg-error', loiAnh.message);
            }

            await loadPartner();
        } catch (err) {
            showError('reg-error', err.message);
        } finally {
            btn.disabled = false;
            btn.textContent = 'Gửi hồ sơ đối tác';
        }
    }

    // ── Nộp bù giấy tờ (khi đã đăng nhập mà hồ sơ còn thiếu) ──

    /**
     * Thẻ nhắc nộp giấy. Chỉ hiện khi còn thiếu thật — hồ sơ đủ rồi mà vẫn
     * chình ình cái khung đòi CCCD thì người ta tưởng nộp hụt, nộp đi nộp lại.
     */
    function renderKyc() {
        const host = $('kyc-panel');
        if (!host) return;
        const p = state.partner || {};

        if (p.source === 'seed') { host.innerHTML = ''; return; }

        if (p.id_complete) {
            host.innerHTML = '<div class="glass-card" style="padding:16px 18px;margin-bottom:20px">'
                + '<div class="kyc-status done"><i data-lucide="shield-check"></i>'
                + (p.id_verified
                    ? 'LOCALMATE đã đối chiếu xong giấy tờ của bạn.'
                    : 'Đã nhận đủ giấy tờ — LOCALMATE đang đối chiếu.')
                + '</div>'
                + '<p style="margin:8px 0 0;font-size:12.5px;color:var(--muted-ink)">CCCD '
                + esc(p.id_masked || '') + ' · Ảnh được cất ở khu riêng, chỉ quản trị viên mở được.</p>'
                + '</div>';
            if (window.lucide) lucide.createIcons();
            return;
        }

        const thieu = [];
        if (!p.id_masked) thieu.push('số CCCD');
        if (!p.id_has_front) thieu.push('ảnh mặt trước');
        if (!p.id_has_back) thieu.push('ảnh mặt sau');

        host.innerHTML = '<div class="glass-card kyc-block" style="margin:0 0 20px">'
            + '<div class="kyc-head"><i data-lucide="shield-alert"></i><div>'
            + '<b>Hồ sơ còn thiếu giấy tờ</b>'
            + '<span>Chưa có ' + esc(thieu.join(', ')) + ' nên LOCALMATE chưa duyệt được.</span>'
            + '</div></div>'
            + '<div class="form-grid">'
            + '<div class="form-group"><label>Ảnh mặt trước' + (p.id_has_front ? ' (đã có)' : '') + '</label>'
            + '<input type="file" id="kyc-front" class="form-input" accept="image/jpeg,image/png,image/webp">'
            + '<div class="kyc-preview" id="kyc-front-pv"></div></div>'
            + '<div class="form-group"><label>Ảnh mặt sau' + (p.id_has_back ? ' (đã có)' : '') + '</label>'
            + '<input type="file" id="kyc-back" class="form-input" accept="image/jpeg,image/png,image/webp">'
            + '<div class="kyc-preview" id="kyc-back-pv"></div></div>'
            + '</div>'
            + '<div id="kyc-error" class="auth-error hidden"></div>'
            + '<button type="button" class="btn-primary" id="kyc-btn" onclick="Partner.guiGiayTo()" '
            + 'style="width:100%;padding:14px">Gửi ảnh CCCD</button>'
            + '<p class="kyc-note"><i data-lucide="lock"></i>'
            + 'Ảnh không nằm trên trang công khai, không hiện cho khách hay đối tác khác, '
            + 'và bị xoá theo khi hồ sơ bị xoá.</p>'
            + '</div>';
        if (window.lucide) lucide.createIcons();
        BayNuiKyc.ganXemTruoc('kyc-front', 'kyc-front-pv');
        BayNuiKyc.ganXemTruoc('kyc-back', 'kyc-back-pv');
    }

    async function guiGiayTo() {
        const btn = $('kyc-btn');
        const front = $('kyc-front').files[0];
        const back = $('kyc-back').files[0];
        if (!front && !back) {
            showError('kyc-error', 'Bạn chọn ảnh trước đã nhé.');
            return;
        }
        $('kyc-error').classList.add('hidden');
        btn.disabled = true;
        try {
            await BayNuiKyc.guiCaHai({ front, back }, (tin) => { btn.textContent = tin; });
            toast('Đã nhận ảnh. LOCALMATE sẽ đối chiếu và phản hồi sớm.');
            await loadPartner();
        } catch (err) {
            showError('kyc-error', err.message);
        } finally {
            btn.disabled = false;
            btn.textContent = 'Gửi ảnh CCCD';
        }
    }

    // ── Đăng nhập ──
    async function login(event) {
        event.preventDefault();
        $('login-error').classList.add('hidden');
        const btn = $('login-btn');
        btn.disabled = true;
        btn.textContent = 'Đang đăng nhập…';
        try {
            const result = await api('/v1/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email: $('login-email').value.trim(), password: $('login-password').value }),
            });
            BayNuiAuth.save(result);

            // Đã duyệt thì vào thẳng kênh làm việc. Họ vào đây để xem đơn
            // mới, không phải để đọc lại lời mời hợp tác.
            try {
                const me = await api('/v1/partner/me');
                if (me.partner && me.partner.status === 'approved') {
                    btn.textContent = 'Đang mở kênh đối tác…';
                    location.href = 'doitac-quanly.html';
                    return;
                }
            } catch (_) {
                // Chưa phải đối tác, hoặc mạng hỏng — để loadPartner bên dưới
                // xử lý và hiện đúng thông báo.
            }

            await loadPartner();
        } catch (err) {
            showError('login-error', err.message);
        } finally {
            btn.disabled = false;
            btn.textContent = 'Đăng nhập';
        }
    }

    function logout() {
        localStorage.removeItem(TOKEN_KEY);
        clearInterval(pollTimer);
        clearInterval(heartbeatTimer);
        state = emptyState();
        $('guest-view').classList.remove('hidden');
        $('partner-view').classList.add('hidden');
        $('logout-btn').classList.add('hidden');
    }

    // ── Nạp hồ sơ đối tác ──
    async function loadPartner() {
        if (!localStorage.getItem(TOKEN_KEY)) return;
        try {
            const result = await api('/v1/partner/me');
            state.partner = result.partner;
            state.online = Boolean(result.online);
            $('guest-view').classList.add('hidden');
            $('partner-view').classList.remove('hidden');
            $('logout-btn').classList.remove('hidden');
            renderHeader();
            renderKyc();
            renderDriverPanel();
            // Khách sạn / đơn vị tour: hiện mục tự đăng dịch vụ
            if (typeof Listing !== 'undefined') Listing.load(result.partner);
            await loadOrders();
        } catch (err) {
            // Token hỏng hoặc chưa phải đối tác
            localStorage.removeItem(TOKEN_KEY);
            if (String(err.message).includes('chưa đăng ký')) {
                showError('login-error', 'Tài khoản này chưa đăng ký làm đối tác. Bạn dùng form đăng ký bên trái nhé.');
            }
        }
    }

    function renderHeader() {
        const p = state.partner;
        const typeLabel = { transport: 'Nhà xe', tour: 'Đơn vị tour', hotel: 'Lưu trú' }[p.type] || p.type;
        const approved = p.status === 'approved';
        $('partner-header').innerHTML = `
            <div class="partner-head">
                <div>
                    <span class="section-tag">${esc(typeLabel)} · hoa hồng ${Math.round((p.commission || 0) * 100)}%</span>
                    <h1 class="section-title" style="font-size:clamp(26px,3.4vw,40px);margin-top:10px">${esc(p.name)}</h1>
                    <p style="color:var(--muted);margin-top:6px">${esc(p.address || '')} · ${esc(p.phone || '')}</p>
                </div>
                <span class="status-pill ${approved ? 'ok' : 'wait'}">
                    <i data-lucide="${approved ? 'badge-check' : 'clock'}"></i>
                    ${approved ? 'Đã duyệt' : 'Chờ LOCALMATE duyệt'}
                </span>
            </div>
            ${approved ? '' : `
            <div class="notice">
                Hồ sơ của bạn đang chờ duyệt. Sau khi LOCALMATE xác nhận, bạn sẽ bắt đầu nhận được đơn từ khách.
            </div>`}`;
        if (window.lucide) lucide.createIcons();
    }

    // ── Cách nhận đơn xe ──
    function renderDriverPanel() {
        const host = $('driver-panel');
        const p = state.partner;
        if (p.type !== 'transport' || p.status !== 'approved') { host.innerHTML = ''; return; }
        host.innerHTML = `
            <div class="driver-panel online">
                <div class="driver-toggle-row">
                    <div>
                        <h3>Đơn về thẳng nhà xe</h3>
                        <p>Khách xem báo giá và chọn nhà xe của bạn thì đơn sẽ xuất hiện ngay trong kênh đối tác. Bạn không cần bật định vị hay chờ hệ thống phân đơn.</p>
                    </div>
                    <a class="btn-primary" href="doitac-quanly.html"><i data-lucide="inbox"></i>Xem đơn khách đặt</a>
                </div>
            </div>`;
        if (window.lucide) lucide.createIcons();
    }

    // ── Khu vực nhận đơn ──
    async function loadAreas() {
        if (state.areas.length) return;
        try {
            const result = await api('/v1/service-areas');
            state.areas = result.data || [];
            state.radiusKm = result.radius_km || 30;
        } catch (_) { /* không có khu vực thì vẫn dùng được GPS */ }
    }

    /** slug rỗng = dùng vị trí hiện tại. */
    function selectArea(slug) {
        state.selectedArea = slug || '';
        renderDriverPanel();
    }

    async function toggleOnline() {
        const btn = $('online-btn');
        btn.disabled = true;
        try {
            if (state.online) {
                await api('/v1/driver/offline', { method: 'POST' });
                state.online = false;
                state.activeAreaName = '';
                clearInterval(pollTimer);
                clearInterval(heartbeatTimer);
                toast('Đã tắt nhận đơn.');
            } else {
                // Chọn khu vực rồi thì không cần hỏi định vị trình duyệt.
                const body = state.selectedArea
                    ? { area: state.selectedArea }
                    : await currentPosition();
                const result = await api('/v1/driver/online', {
                    method: 'POST',
                    body: JSON.stringify(body),
                });
                state.online = true;
                state.activeAreaName = result.area ? result.area.name : 'vị trí hiện tại';
                startPolling();
                toast(result.message || 'Đã bật nhận đơn. Giữ trang này mở để nhận lời mời.');
            }
            renderDriverPanel();
        } catch (err) {
            alert(err.message);
        } finally {
            btn.disabled = false;
        }
    }

    function currentPosition() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) return reject(new Error('Trình duyệt không hỗ trợ định vị.'));
            navigator.geolocation.getCurrentPosition(
                (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                () => reject(new Error('Cần cho phép truy cập vị trí để nhận đơn gần bạn.')),
                { enableHighAccuracy: true, timeout: 10000 },
            );
        });
    }

    // ── Vòng lặp nhận lời mời ──
    function startPolling() {
        clearInterval(pollTimer);
        clearInterval(heartbeatTimer);
        pollTimer = setInterval(pollOffers, 4000);
        heartbeatTimer = setInterval(async () => {
            if (!state.online) return;
            try {
                const pos = await currentPosition();
                await api('/v1/driver/heartbeat', { method: 'POST', body: JSON.stringify(pos) });
            } catch (_) { /* mất tín hiệu tạm thời, lần sau thử lại */ }
        }, 45000);
        pollOffers();
    }

    async function pollOffers() {
        if (!state.partner || state.partner.type !== 'transport') return;
        try {
            const result = await api('/v1/driver/offers');
            state.online = result.online;
            if (result.radius_km) state.radiusKm = result.radius_km;
            if (result.area) { state.selectedArea = result.area.slug; state.activeAreaName = result.area.name; }
            const had = state.offers.length;
            state.offers = result.data;
            renderOffers();
            if (state.offers.length > had) toast('🔔 Có chuyến mới gần bạn!');
        } catch (_) { /* bỏ qua, lần sau thử lại */ }
    }

    function renderOffers() {
        const host = $('offer-list');
        if (!host) return;
        if (!state.online) { host.innerHTML = ''; return; }
        if (!state.offers.length) {
            host.innerHTML = '<p class="offer-empty">Đang chờ chuyến… Giữ trang này mở nhé.</p>';
            return;
        }
        host.innerHTML = state.offers.map(o => `
            <div class="offer-card">
                <div class="offer-head">
                    <span class="offer-distance"><i data-lucide="navigation"></i>Cách bạn ${String(o.distance_km).replace('.', ',')} km</span>
                    <span class="offer-timer">${o.seconds_left}s</span>
                </div>
                <div class="offer-route">
                    <div><span class="dot from"></span>${esc(o.pickup)}</div>
                    <div><span class="dot to"></span>${esc(o.dropoff)}</div>
                </div>
                <p class="offer-meta">${dmy(o.date)} lúc ${esc(o.time)} · ${o.seats} khách · khách: ${esc(o.guest_name)}</p>
                <div class="offer-actions">
                    <span class="offer-price">${money(o.price)}</span>
                    <button class="btn-outline" onclick="Partner.decline('${o.id}')">Bỏ qua</button>
                    <button class="btn-primary" onclick="Partner.accept('${o.id}')">Nhận chuyến</button>
                </div>
            </div>`).join('');
        if (window.lucide) lucide.createIcons();
    }

    async function accept(offerId) {
        try {
            await api(`/v1/driver/offers/${offerId}/accept`, { method: 'POST' });
            toast('Đã nhận chuyến! Gọi cho khách để xác nhận giờ đón.');
            state.offers = state.offers.filter(o => o.id !== offerId);
            renderOffers();
            await loadOrders();
        } catch (err) {
            alert(err.message);
            pollOffers();
        }
    }

    async function decline(offerId) {
        try {
            await api(`/v1/driver/offers/${offerId}/decline`, { method: 'POST' });
            state.offers = state.offers.filter(o => o.id !== offerId);
            renderOffers();
        } catch (err) { alert(err.message); }
    }

    // ── Đơn hàng ──
    async function loadOrders() {
        try {
            const result = await api('/v1/partner/bookings');
            state.orders = result.data;
            renderStats();
            renderOrders();
            loadRevenue();
        } catch (err) {
            $('partner-orders').innerHTML = `<p class="offer-empty">${esc(err.message)}</p>`;
        }
    }

    function renderStats() {
        const orders = state.orders;
        const revenue = orders
            .filter(o => o.status === 'confirmed' || o.status === 'completed')
            .reduce((sum, o) => sum + (o.totalPrice || 0), 0);
        const cards = [
            ['inbox', 'Đơn mới', orders.filter(o => o.status === 'pending').length],
            ['check-circle', 'Đã nhận', orders.filter(o => o.status === 'confirmed').length],
            ['flag', 'Hoàn thành', orders.filter(o => o.status === 'completed').length],
            ['wallet', 'Doanh thu', money(revenue)],
        ];
        $('partner-stats').innerHTML = cards.map(([icon, label, value]) => `
            <div class="pstat">
                <span class="pstat-icon"><i data-lucide="${icon}"></i></span>
                <div><span class="pstat-label">${label}</span><b>${value}</b></div>
            </div>`).join('');
        if (window.lucide) lucide.createIcons();
    }

    // ── Đối soát doanh thu ──────────────────────────────────
    // Liệt kê TỪNG ĐƠN chứ không chỉ tổng: đối tác cần đối chiếu được với sổ
    // tay của họ, không thì con số nào đưa ra họ cũng nghi ngờ.
    async function loadRevenue() {
        const host = $('partner-revenue');
        if (!host) return;
        const month = ($('rv-month') && $('rv-month').value) || '';

        host.innerHTML = '<p class="rv-empty">Đang tính…</p>';
        try {
            const r = await api(`/v1/partner/revenue${month ? `?month=${month}` : ''}`);
            if ($('rv-month') && !$('rv-month').value) $('rv-month').value = r.month;

            if (!r.orders) {
                host.innerHTML = `<p class="rv-empty">Kỳ ${esc(r.month)} chưa có đơn nào hoàn thành.
                    Chỉ đơn đã hoàn thành mới được tính — đơn đang chờ chưa phải tiền thật.</p>`;
                return;
            }

            host.innerHTML = `
                <div class="rv-sum">
                    <div><span>Đơn hoàn thành</span><b>${r.orders}</b></div>
                    <div><span>Doanh thu</span><b>${money(r.gross)}</b></div>
                    <div><span>Hoa hồng ${Math.round(r.commission_rate * 100)}%</span><b class="minus">−${money(r.commission)}</b></div>
                    <div class="rv-net"><span>Bạn nhận</span><b>${money(r.net)}</b></div>
                </div>

                <p class="rv-note">
                    LOCALMATE đang giữ hộ <b>${money(r.collected_deposit)}</b> tiền cọc của khách.
                    Sau khi trừ hoa hồng, LOCALMATE chuyển cho bạn <b>${money(r.payable)}</b>;
                    phần còn lại bạn thu trực tiếp của khách.
                    ${r.settled
                        ? `<span class="rv-paid">Đã chuyển ngày ${esc(String(r.settled_at).slice(0, 10))}.</span>`
                        : '<span class="rv-wait">Kỳ này chưa chuyển.</span>'}
                </p>

                <div class="rv-table-wrap">
                    <table class="rv-table">
                        <thead><tr>
                            <th>Ngày</th><th>Mã đơn</th><th>Nội dung</th>
                            <th class="num">Doanh thu</th><th class="num">Hoa hồng</th><th class="num">Bạn nhận</th>
                        </tr></thead>
                        <tbody>
                            ${r.rows.map(x => `
                                <tr>
                                    <td>${esc(dmy(x.date))}</td>
                                    <td><code>${esc(x.code)}</code></td>
                                    <td>${esc(x.summary)}</td>
                                    <td class="num">${money(x.gross)}</td>
                                    <td class="num minus">−${money(x.commission)}</td>
                                    <td class="num strong">${money(x.net)}</td>
                                </tr>`).join('')}
                        </tbody>
                    </table>
                </div>`;
        } catch (err) {
            host.innerHTML = `<p class="rv-empty">${esc(err.message)}</p>`;
        }
    }

    function filter(value, btn) {
        state.filter = value;
        document.querySelectorAll('#order-filter .filter-btn').forEach(b => b.classList.remove('active'));
        if (btn) btn.classList.add('active');
        renderOrders();
    }

    function renderOrders() {
        const list = state.filter === 'all'
            ? state.orders
            : state.orders.filter(o => o.status === state.filter);

        if (!list.length) {
            $('partner-orders').innerHTML = '<p class="offer-empty">Chưa có đơn nào ở mục này.</p>';
            return;
        }

        const kindLabel = { hotel: 'Đặt phòng', transport: 'Xe đưa đón', tour: 'Tour' };
        const statusLabel = { pending: 'Chờ xác nhận', confirmed: 'Đã nhận', cancelled: 'Đã huỷ', completed: 'Hoàn thành' };

        $('partner-orders').innerHTML = list.map(o => `
            <div class="order-card">
                <div class="order-main">
                    <div class="order-top">
                        <span class="kind-chip ${esc(o.kind || 'hotel')}">${kindLabel[o.kind] || 'Đơn'}</span>
                        <span class="status-chip ${esc(o.status)}">${statusLabel[o.status] || o.status}</span>
                    </div>
                    <h4>${esc(o.roomName || '')}</h4>
                    <p class="order-meta">
                        ${dmy(o.checkIn)}${o.checkOut && o.checkOut !== o.checkIn ? ' → ' + dmy(o.checkOut) : ''}
                        ${o.pickupTime ? ' · đón ' + esc(o.pickupTime) : ''}
                        ${o.nights ? ' · ' + o.nights + ' đêm' : ''}
                        ${o.guests ? ' · ' + o.guests + ' khách' : ''}
                    </p>
                    <p class="order-guest"><i data-lucide="user"></i>${esc(o.guestName || '')} · <a href="tel:${esc(o.phone || '')}">${esc(o.phone || '')}</a></p>
                    ${o.note ? `<p class="order-note">“${esc(o.note)}”</p>` : ''}
                </div>
                <div class="order-side">
                    <span class="order-price">${money(o.totalPrice)}</span>
                    ${o.status === 'pending' ? `
                        <button class="btn-primary" onclick="Partner.setStatus('${o.id}','confirmed')">Xác nhận</button>
                        <button class="btn-outline" onclick="Partner.setStatus('${o.id}','cancelled')">Từ chối</button>` : ''}
                    ${o.status === 'confirmed' ? `
                        <button class="btn-primary" onclick="Partner.setStatus('${o.id}','completed')">Đã hoàn thành</button>` : ''}
                </div>
            </div>`).join('');
        if (window.lucide) lucide.createIcons();
    }

    async function setStatus(id, status) {
        try {
            await api(`/v1/partner/bookings/${id}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status }),
            });
            toast('Đã cập nhật đơn.');
            await loadOrders();
        } catch (err) { alert(err.message); }
    }

    // ── Khởi động ──
    window.addEventListener('DOMContentLoaded', () => {
        if (window.lucide) lucide.createIcons();
        onTypeChange();
        loadPartner();
    });

    return {
        register, login, logout, onTypeChange, toggleOnline, selectArea,
        accept, decline, filter, setStatus, guiGiayTo,
        // listing.js dùng hai cái này
        loadRevenue,
        currentPartner: () => state.partner,
        toast,
    };
})();

window.Partner = Partner;
