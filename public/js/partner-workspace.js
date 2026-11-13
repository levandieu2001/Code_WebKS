// ============================================================
// LOCALMATE — Kênh đối tác
// ============================================================
// Nơi làm việc hằng ngày của khách sạn / nhà xe / đơn vị tour ĐÃ ĐƯỢC DUYỆT.
//
// Quyền của đối tác chỉ gồm ba việc: đăng dịch vụ của mình, xem đơn khách đặt
// cho mình, và xem tiền của mình. KHÔNG thấy đối tác khác, KHÔNG thấy tổng
// doanh thu của nền tảng. Máy chủ cũng chặn ở tầng API — mọi truy vấn đều lấy
// partnerId từ phiên đăng nhập chứ không lấy từ tham số gửi lên, nên sửa lệnh
// trên trình duyệt cũng không xem trộm được.
// ============================================================

const PartnerWorkspace = (() => {
    const $ = (id) => document.getElementById(id);
    const money = (n) => Number(n || 0).toLocaleString('vi-VN') + 'đ';
    const esc = (s) => String(s == null ? '' : s)
        .replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const dmy = (iso) => {
        const [y, m, d] = String(iso || '').slice(0, 10).split('-');
        return d ? `${d}/${m}/${y}` : (iso || '');
    };

    const TOKEN_KEY = 'baynui_partner_token';
    const state = {
        partner: null, orders: [], departures: [], tours: [], depMeta: {},
        orderFilter: 'all', reviews: [], reviewFilter: 'all', tin: [],
        calMonth: new Date().toISOString().slice(0, 7), cal: null, calChon: [],
        ordersError: '',
    };
    let chuongDangNap = false;
    let chuongTimer = null;

    // Dùng bộ giữ phiên chung: nó tự đổi token mới trước khi hết hạn và thử
    // lại một lần nếu máy chủ vẫn trả 401. Trước đây chỗ này đọc thẳng
    // localStorage nên sang tiếng thứ hai là mọi thao tác im lặng hỏng.
    const api = (path, options) => BayNuiAuth.api(path, options);

    // ── Vào trang ───────────────────────────────────────────
    async function init() {
        if (!localStorage.getItem(TOKEN_KEY)) return gate(
            'Bạn chưa đăng nhập',
            'Đăng nhập bằng tài khoản đối tác để vào kênh làm việc.',
            'Đăng nhập', 'doitac.html',
        );

        let session;
        try {
            session = await api('/v1/partner/me');
        } catch (err) {
            return gate('Chưa vào được', err.message, 'Về trang đối tác', 'doitac.html');
        }

        const p = session.partner;
        state.partner = p;

        // Chưa duyệt thì KHÔNG cho vào. Cho đăng phòng lúc chưa duyệt là để lọt
        // dịch vụ chưa kiểm chứng lên trang khách.
        if (p.status !== 'approved') {
            return gate(
                'Hồ sơ đang chờ duyệt',
                'LOCALMATE đang xem hồ sơ của bạn, thường trong vài giờ. Duyệt xong bạn sẽ '
                + 'đăng được phòng và nhận đơn ngay tại đây.',
                'Về trang đối tác', 'doitac.html',
            );
        }

        $('pw-gate').hidden = true;
        $('pw-body').hidden = false;


        capNhatDauTrang();

        // Nhà xe không đăng phòng — đổi nhãn cho khỏi khó hiểu
        const navListings = $('pw-nav-listings');
        if (p.type === 'tour') navListings.textContent = 'Tour của tôi';
        else if (p.type === 'transport') navListings.textContent = 'Dịch vụ xe';
        else if (p.type === 'food') navListings.textContent = 'Đặc sản của tôi';
        else navListings.textContent = 'Phòng của tôi';

        await loadOrders();
        renderOverview();
        renderOrders();

        // Chuông và số đánh giá chưa trả lời nạp ngay từ đầu: hai chấm đỏ này
        // là thứ đối tác nhìn trước tiên khi mở trang, đợi họ bấm vào mới nạp
        // thì họ không biết là có gì để bấm.
        napChuong();
        batTheoDoiChuong();
        loadReviews();

        // Lịch khởi hành chỉ có nghĩa với đơn vị tour: khách sạn không có
        // chuyến, nhà xe chạy theo từng đơn lẻ chứ không gom đoàn theo ngày.
        if (p.type === 'tour') {
            $('pw-nav-departures').hidden = false;
            await loadDepartures();
        }

        // Lịch phòng chỉ có nghĩa với chỗ nghỉ: tour đã có lịch khởi hành
        // riêng, còn hũ mật ong thì không có đêm nào để đóng.
        if (p.type === 'hotel') $('pw-nav-calendar').hidden = false;

        // Nhà xe không có mục đăng tin; ẩn hẳn thay vì để bấm vào thấy trống
        if (p.type === 'transport') {
            document.querySelector('[data-page="listings"]').style.display = 'none';
        } else if (typeof Listing !== 'undefined') {
            // KHÔNG kiểm tra bằng window.Listing: listing.js khai bằng
            // "const Listing", mà const ở tầng script KHÔNG tạo thuộc tính trên
            // window. Viết window.Listing thì luôn undefined, phần đăng phòng
            // im lặng không nạp — panel trống trơn mà không có lỗi nào.
            Listing.load(p);
        }

        if (window.lucide) lucide.createIcons();
    }

    /** Tên và dòng tóm tắt ở đầu trang. Gọi lại sau khi đối tác sửa hồ sơ. */
    function capNhatDauTrang() {
        const p = state.partner || {};
        $('pw-name').textContent = p.name || '—';
        $('pw-sub').textContent = (LOAI[p.type] || p.type || '')
            + ' · hoa hồng ' + Math.round((p.commission || 0) * 100) + '%'
            + (p.phone ? ' · ' + p.phone : '');
    }

    function gate(title, text, btnText, href) {
        $('pw-gate').innerHTML = `
            <h2>${esc(title)}</h2>
            <p>${esc(text)}</p>
            <p style="margin-top:18px"><a class="btn-primary" href="${esc(href)}">${esc(btnText)}</a></p>`;
    }

    function go(page, el) {
        document.querySelectorAll('.pw-page').forEach(s => s.classList.remove('active'));
        document.querySelectorAll('.pw-nav').forEach(b => b.classList.remove('active'));
        $(`page-${page}`).classList.add('active');
        (el || document.querySelector(`[data-page="${page}"]`)).classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });

        if (page === 'money') loadMoney();
        if (page === 'orders') renderOrders();
        if (page === 'departures') loadDepartures();
        if (page === 'revenue') loadRevenue();
        if (page === 'calendar') loadCalendar();
        if (page === 'reviews') loadReviews();
        if (page === 'profile') renderProfile();
        if (window.lucide) lucide.createIcons();
    }

    // ── Đơn hàng ────────────────────────────────────────────
    async function loadOrders() {
        try {
            state.orders = (await api('/v1/partner/bookings')).data || [];
            state.ordersError = '';
        } catch (err) {
            state.orders = [];
            state.ordersError = err.message || 'Không tải được đơn. Bạn thử lại nhé.';
        }
    }

    const STATUS = {
        pending: 'Chờ xác nhận', confirmed: 'Đã nhận',
        completed: 'Hoàn thành', cancelled: 'Đã huỷ',
    };

    /** Bỏ dấu để gõ "nguyen van a" cũng tìm ra "Nguyễn Văn A". */
    const khongDau = (v) => String(v || '').toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');

    const maDon = (id) => String(id || '').slice(-8).toUpperCase();

    const noiDung = (o) => (o.kind === 'transport'
        ? `${o.pickup || ''} → ${o.dropoff || ''}`
        : (o.roomName || o.tourName || ''));

    /**
     * Nút thao tác cho một đơn.
     *
     * Đây là thứ trước đây thiếu: bảng chỉ để nhìn, muốn nhận đơn phải quay
     * về trang giới thiệu. Nút hiện theo đúng bước tiếp theo của đơn — đơn đã
     * huỷ thì không còn nút nào, chứ không phải bày ra rồi bấm vào báo lỗi.
     */
    function nutDon(o) {
        if (o.status === 'pending') {
            return '<div class="pw-acts">'
                + '<button class="pw-btn go" onclick="PartnerWorkspace.doiDon(\'' + esc(o.id) + '\',\'confirmed\')">Nhận đơn</button>'
                + '<button class="pw-btn stop" onclick="PartnerWorkspace.doiDon(\'' + esc(o.id) + '\',\'cancelled\')">Từ chối</button>'
                + '</div>';
        }
        if (o.status === 'confirmed') {
            return '<div class="pw-acts">'
                + '<button class="pw-btn done" onclick="PartnerWorkspace.doiDon(\'' + esc(o.id) + '\',\'completed\')">Đã phục vụ xong</button>'
                + '<button class="pw-btn stop" onclick="PartnerWorkspace.doiDon(\'' + esc(o.id) + '\',\'cancelled\')">Huỷ</button>'
                + '</div>';
        }
        return '<span style="color:var(--muted);font-size:12.5px">—</span>';
    }

    function orderRows(list, coNut) {
        if (!list.length) {
            const nhac = {
                hotel: 'Chưa có đơn đặt đúng phòng của bạn. Đơn của chỗ nghỉ khác chỉ hiện ở kênh của đối tác đó.',
                tour: 'Chưa có đơn đặt đúng tour của bạn. Đơn tour của đơn vị khác không hiện trong kênh này.',
                food: 'Chưa có đơn đặt đúng đặc sản của bạn. Đơn của cơ sở khác không hiện trong kênh này.',
                transport: 'Chưa có khách nào chọn nhà xe của bạn. Khi khách chọn báo giá của bạn, đơn sẽ vào thẳng kênh này.',
            }[(state.partner || {}).type] || 'Chưa có đơn nào thuộc dịch vụ của bạn.';
            return '<tbody><tr><td class="pw-empty">' + esc(nhac) + '</td></tr></tbody>';
        }
        return `
            <thead><tr>
                <th>Ngày</th><th>Mã đơn</th><th>Khách</th><th>Nội dung</th>
                <th class="num">Giá trị</th><th>Trạng thái</th>${coNut ? '<th>Thao tác</th>' : ''}
            </tr></thead>
            <tbody>${list.map(o => `
                <tr data-order-id="${esc(o.id)}">
                    <td>${esc(dmy(o.checkIn || o.createdAt))}</td>
                    <td><span class="pw-code">${esc(maDon(o.id))}</span></td>
                    <td>${esc(o.guestName || '')}<br>
                        <a href="tel:${esc(o.phone || '')}" style="font-size:.82rem;color:var(--muted)">${esc(o.phone || '')}</a></td>
                    <td>${esc(noiDung(o))}
                        ${o.note ? `<br><span style="font-size:.8rem;color:var(--muted)">Ghi chú: ${esc(o.note)}</span>` : ''}</td>
                    <td class="num">${money(o.totalPrice)}</td>
                    <td><span class="pw-tt ${esc(o.status)}">${esc(STATUS[o.status] || o.status)}</span>
                        ${o.paymentStatus === 'paid'
                            ? '<br><span style="font-size:.78rem;color:#2f7a4f">đã cọc</span>' : ''}</td>
                    ${coNut ? `<td>${nutDon(o)}</td>` : ''}
                </tr>`).join('')}</tbody>`;
    }

    /** Bộ lọc trạng thái, kèm số đơn từng nhóm — biết ngay chỗ nào cần xử lý. */
    function renderOrderChips() {
        const host = $('or-chips');
        if (!host) return;
        const dem = (s) => state.orders.filter(o => o.status === s).length;
        const nhom = [
            ['all', 'Tất cả', state.orders.length],
            ['pending', 'Chờ xác nhận', dem('pending')],
            ['confirmed', 'Đã nhận', dem('confirmed')],
            ['completed', 'Hoàn thành', dem('completed')],
            ['cancelled', 'Đã huỷ', dem('cancelled')],
        ];
        host.innerHTML = nhom.map(([k, nhan, n]) =>
            '<button class="pw-chip' + (state.orderFilter === k ? ' active' : '') + '" '
            + 'onclick="PartnerWorkspace.locDon(\'' + k + '\')">' + nhan
            + ' <span class="n">' + n + '</span></button>').join('');
    }

    function locDon(k) {
        state.orderFilter = k;
        renderOrders();
    }

    function renderOrders() {
        renderOrderChips();
        const tim = khongDau(($('or-search') && $('or-search').value) || '').trim();
        let list = state.orders;
        if (state.orderFilter !== 'all') list = list.filter(o => o.status === state.orderFilter);
        if (tim) {
            list = list.filter(o => khongDau(
                [o.guestName, o.phone, maDon(o.id), noiDung(o)].join(' '),
            ).includes(tim));
        }

        const bang = $('or-table');
        if (state.ordersError) {
            bang.innerHTML = '<tbody><tr><td class="pw-empty">' + esc(state.ordersError)
                + '<br><button class="pw-btn go" style="margin-top:12px" '
                + 'onclick="PartnerWorkspace.taiLaiDon()">Tải lại đơn</button></td></tr></tbody>';
            return;
        }
        if (!list.length && (tim || state.orderFilter !== 'all')) {
            bang.innerHTML = '<tbody><tr><td class="pw-empty">'
                + 'Không có đơn nào khớp. Bỏ bớt bộ lọc hoặc xoá từ khoá xem sao.</td></tr></tbody>';
            return;
        }
        bang.innerHTML = orderRows(list, true);
    }

    /**
     * Đổi trạng thái một đơn.
     *
     * Hỏi lại trước khi làm, và nói RÕ hậu quả: mỗi lần bấm là khách nhận được
     * một thông báo thật. Bấm nhầm "Từ chối" thì khách đã đọc tin huỷ rồi,
     * không rút lại được bằng cách bấm lại.
     */
    async function doiDon(id, status) {
        const o = state.orders.find(x => x.id === id);
        if (!o) return;

        const hoi = {
            confirmed: 'Nhận đơn ' + maDon(id) + ' của ' + (o.guestName || 'khách')
                + '?\n\nKhách sẽ nhận được thông báo là bạn đã nhận đơn.',
            cancelled: 'Từ chối đơn ' + maDon(id) + ' của ' + (o.guestName || 'khách')
                + '?\n\nKhách sẽ nhận được thông báo huỷ ngay lập tức. Không rút lại được.',
            completed: 'Đánh dấu đơn ' + maDon(id) + ' đã phục vụ xong?'
                + '\n\nĐơn hoàn thành mới được tính vào doanh thu và đối soát, '
                + 'và khách sẽ được mời đánh giá.',
        }[status];
        if (!confirm(hoi)) return;

        // Khoá nút lại trong lúc gọi máy chủ.
        //
        // Ghi đơn qua Firestore mất một hai giây. Không khoá thì màn hình đứng
        // im như chưa bấm, đối tác bấm lần nữa — mà lần thứ hai là gửi thêm
        // một thông báo nữa cho khách.
        const nut = document.querySelectorAll('#or-table .pw-btn');
        nut.forEach((b) => { b.disabled = true; });
        const dangBam = [...nut].find(b => b.getAttribute('onclick') || ''
            ? (b.getAttribute('onclick') || '').includes(id) && (b.getAttribute('onclick') || '').includes(status)
            : false);
        const chuCu = dangBam ? dangBam.textContent : '';
        if (dangBam) dangBam.textContent = 'Đang lưu…';

        try {
            await api('/v1/partner/bookings/' + encodeURIComponent(id) + '/status', {
                method: 'PATCH',
                body: JSON.stringify({ status: status }),
            });
        } catch (err) {
            nut.forEach((b) => { b.disabled = false; });
            if (dangBam) dangBam.textContent = chuCu;
            return alert('Không cập nhật được: ' + err.message);
        }

        // Đọc lại từ máy chủ thay vì tự sửa trên màn hình: nếu máy chủ từ chối
        // một phần nào đó thì màn hình phải giống máy chủ, không được giống
        // điều mình vừa mong.
        await loadOrders();
        renderOrders();
        renderOverview();
        napChuong();
    }

    // ── Tổng quan ───────────────────────────────────────────
    function renderOverview() {
        const o = state.orders;
        const count = (s) => o.filter(x => x.status === s).length;
        const done = o.filter(x => x.status === 'completed');
        const gross = done.reduce((s, x) => s + (x.totalPrice || 0), 0);

        $('ov-cards').innerHTML = [
            ['Đơn mới', count('pending'), 'chờ bạn xác nhận'],
            ['Đang phục vụ', count('confirmed'), 'đã nhận, chưa xong'],
            ['Hoàn thành', done.length, 'trong toàn bộ thời gian'],
            ['Doanh thu đã hoàn thành', money(gross), 'trước hoa hồng'],
        ].map(([k, v, s]) => `
            <div class="pw-card"><div class="k">${k}</div><div class="v">${v}</div><div class="s">${s}</div></div>
        `).join('');

        // Câu gợi ý phải khớp với thứ họ LÀM ĐƯỢC. Nhà xe không có mục đăng
        // tin — mục đó bị ẩn ngay bên trái — mà câu cũ lại bảo họ "đăng thêm
        // dịch vụ": đọc xong đi tìm khắp kênh cũng không thấy nút nào.
        const loi = {
            hotel: 'Chưa có đơn nào đang chờ. Đăng thêm phòng ở mục <b>Phòng của tôi</b> để khách dễ tìm thấy bạn hơn.',
            tour: 'Chưa có đơn nào đang chờ. Đăng thêm tour ở mục <b>Tour của tôi</b> để khách dễ tìm thấy bạn hơn.',
            food: 'Chưa có đơn nào đang chờ. Đăng thêm món ở mục <b>Đặc sản của tôi</b> để khách dễ tìm thấy bạn hơn.',
            transport: 'Chưa có đơn nào đang chờ. Khách đặt xe trên web là đơn về thẳng đây; '
                + 'bạn nhớ mở thông báo để không bỏ lỡ chuyến.',
        };
        $('ov-note').innerHTML = count('pending')
            ? `Bạn có <b>${count('pending')} đơn mới</b> đang chờ. Vào mục <b>Đơn khách đặt</b> để xem chi tiết.`
            : state.ordersError
                ? '<b>Chưa tải được đơn:</b> ' + esc(state.ordersError)
                : (loi[(state.partner || {}).type] || 'Chưa có đơn nào đang chờ.');

        $('ov-orders').innerHTML = orderRows(o.slice(0, 5), false);
    }

    // ── Lịch khởi hành ──────────────────────────────────────
    // Thứ đơn vị tour cần nhất mà trước đây không có đường nào xem: ngày nào
    // có mấy khách, còn thiếu mấy người, và tên với số điện thoại để gọi.
    // Không có nó thì họ phải nhắn hỏi LOCALMATE từng ngày một.
    async function loadDepartures() {
        const host = $('dep-list');
        if (!host) return;
        host.innerHTML = '<div class="pw-empty">Đang tải…</div>';

        let r;
        try {
            r = await api('/v1/partner/departures');
        } catch (err) {
            $('dep-tools').innerHTML = '';
            host.innerHTML = '<div class="pw-empty">' + esc(err.message) + '</div>';
            return;
        }

        state.departures = r.data || [];
        state.tours = r.tours || [];
        state.depMeta = r.meta || {};
        renderDepTools();
        renderDepartures();
        if (window.lucide) lucide.createIcons();
    }

    function renderDepTools() {
        const m = state.depMeta;
        if (!state.tours.length) {
            $('dep-tools').innerHTML = '<div style="font-size:.9rem;color:var(--muted)">'
                + 'Bạn chưa đăng tour nào. Đăng tour ở mục <b>Tour của tôi</b> '
                + 'để mở lịch khởi hành.</div>';
            $('dep-note').innerHTML = '';
            return;
        }

        // Mặc định một tuần nữa: mở chuyến cho ngày mai thì khách không kịp
        // biết mà đăng ký, trong khi danh sách chốt trước ngày đi vài ngày.
        const macDinh = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
        const homNay = new Date().toISOString().slice(0, 10);

        $('dep-tools').innerHTML =
            '<div><label for="dep-tour">Tour</label>'
            + '<select id="dep-tour">'
            + state.tours.map(t => '<option value="' + esc(t.slug) + '">' + esc(t.name) + '</option>').join('')
            + '</select></div>'
            + '<div><label for="dep-date">Ngày khởi hành</label>'
            + '<input type="date" id="dep-date" value="' + macDinh + '" min="' + homNay + '"></div>'
            + '<div><label for="dep-min">Tối thiểu</label>'
            + '<input type="number" id="dep-min" min="1" max="40" value="' + (m.min_guests || 6) + '" style="width:90px"></div>'
            + '<button class="btn-primary" onclick="PartnerWorkspace.moChuyen()">'
            + '<i data-lucide="plus"></i> Mở chuyến</button>';

        $('dep-note').innerHTML = 'Khách lẻ đăng ký vào chuyến của bạn và được giảm <b>'
            + Math.round((m.discount || 0.25) * 100) + '%</b>. Danh sách chốt trước ngày đi <b>'
            + (m.cutoff_days || 2) + ' ngày</b>; tới hạn mà chưa đủ khách thì hệ thống tự huỷ và '
            + 'báo cho từng người. Bạn có đoàn riêng thì bấm <b>Chốt chạy</b> sớm cũng được, '
            + 'không cần chờ đủ số.';
    }

    async function moChuyen() {
        const tour = $('dep-tour') && $('dep-tour').value;
        const date = $('dep-date') && $('dep-date').value;
        if (!tour || !date) return alert('Bạn chọn tour và ngày khởi hành nhé.');

        try {
            await api('/v1/partner/departures', {
                method: 'POST',
                body: JSON.stringify({
                    tour_slug: tour,
                    date: date,
                    min_guests: Number($('dep-min') && $('dep-min').value) || 0,
                }),
            });
        } catch (err) {
            return alert(err.message);
        }
        await loadDepartures();
    }

    async function doiTrangThai(id, status) {
        const dep = state.departures.find(d => d.id === id);
        const soKhach = dep ? dep.members.length : 0;
        const ngay = dep ? dmy(dep.date) : '';
        const hoi = status === 'cancelled'
            ? 'Huỷ chuyến ngày ' + ngay + '?' + (soKhach ? ' ' + soKhach + ' khách đã đăng ký sẽ được báo ngay.' : '')
            : 'Chốt chạy chuyến ngày ' + ngay + '?' + (soKhach ? ' ' + soKhach + ' khách sẽ nhận thông báo chắc chắn khởi hành.' : '');
        if (!confirm(hoi)) return;

        try {
            await api('/v1/partner/departures/' + encodeURIComponent(id), {
                method: 'PATCH',
                body: JSON.stringify({ status: status }),
            });
        } catch (err) {
            return alert(err.message);
        }
        await loadDepartures();
    }

    function renderDepartures() {
        const list = state.departures;
        const host = $('dep-list');
        if (!list.length) {
            host.innerHTML = '<div class="pw-empty">Chưa có chuyến nào. '
                + 'Mở một ngày ở trên để khách thấy mà đăng ký.</div>';
            return;
        }

        const homNay = new Date().toISOString().slice(0, 10);
        host.innerHTML = list.map(function (d) {
            const daXong = d.date < homNay || d.status === 'cancelled';
            const du = d.joined >= d.min_guests;

            const khach = d.members.length
                ? '<div class="dep-guests">' + d.members.map(m =>
                    '<div class="dep-guest"><span>' + esc(m.name || 'Khách') + ' · ' + m.guests + ' người</span>'
                    + '<a href="tel:' + esc(m.phone) + '">' + esc(m.phone) + '</a></div>').join('')
                  + '</div>'
                : '';

            const nut = d.status === 'forming'
                ? '<div class="dep-acts">'
                  + '<button class="dep-btn go" onclick="PartnerWorkspace.doiTrangThai(\'' + esc(d.id) + '\',\'confirmed\')">Chốt chạy</button>'
                  + '<button class="dep-btn stop" onclick="PartnerWorkspace.doiTrangThai(\'' + esc(d.id) + '\',\'cancelled\')">Huỷ chuyến</button>'
                  + '</div>'
                : '';

            return '<div class="dep-card' + (daXong ? ' done' : '') + '">'
                + '<div class="dep-top"><div>'
                + '<div class="dep-date">' + esc(dmy(d.date)) + '</div>'
                + '<div class="dep-tour">' + esc(d.tour_name) + '</div></div>'
                + '<span class="pw-badge ' + (d.status === 'confirmed' ? 'ok' : 'wait') + '">'
                + esc(d.status_label) + '</span></div>'
                + '<div class="dep-bar"><i class="' + (du ? 'full' : '') + '" style="width:'
                + Math.min(100, d.progress) + '%"></i></div>'
                + '<div class="dep-meta"><b>' + d.joined + '/' + d.min_guests + ' khách</b>'
                + (d.missing ? ' · còn thiếu ' + d.missing : ' · đã đủ')
                + ' · ' + money(d.price) + '/khách<br>Chốt danh sách trước ' + esc(dmy(d.cutoff))
                + '</div>' + khach + nut + '</div>';
        }).join('');
    }

    // ── Lịch phòng ──────────────────────────────────────────
    // Công tắc "còn / hết" dùng chung cho mọi ngày là quá thô: nghỉ Tết ba
    // hôm mà phải tắt cả phòng thì mất luôn đơn của những ngày khác trong
    // tháng. Ở đây đóng mở TỪNG ĐÊM.

    const THU = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

    /** Thứ trong tuần theo kiểu Việt Nam: thứ Hai là cột đầu. */
    function cotCua(iso) {
        const d = new Date(iso + 'T00:00:00Z').getUTCDay();   // 0 = CN
        return (d + 6) % 7;
    }

    async function loadCalendar() {
        const host = $('cal-body');
        const chon = $('cal-listing');

        // Lần đầu vào: nạp danh sách chỗ nghỉ để chọn
        if (!chon.options.length) {
            let r;
            try {
                r = await api('/v1/partner/listings');
            } catch (err) {
                host.innerHTML = '<div class="pw-empty">' + esc(err.message) + '</div>';
                return;
            }
            const cn = (r.data || []).filter(l => l.type === 'stay' && l.status === 'approved');
            if (!cn.length) {
                $('cal-title').textContent = '';
                host.innerHTML = '<div class="pw-empty">'
                    + 'Bạn chưa đăng chỗ nghỉ nào đang hiển thị. Đăng phòng ở mục '
                    + '<b>Phòng của tôi</b> để quản lý lịch.</div>';
                return;
            }
            chon.innerHTML = cn.map(l =>
                '<option value="' + esc(l.id) + '">' + esc(l.name) + '</option>').join('');
        }

        host.innerHTML = '<div class="pw-empty">Đang tải lịch…</div>';
        let r;
        try {
            r = await api('/v1/partner/listings/' + encodeURIComponent(chon.value)
                + '/calendar?month=' + state.calMonth);
        } catch (err) {
            host.innerHTML = '<div class="pw-empty">' + esc(err.message) + '</div>';
            return;
        }

        state.cal = r;
        state.calChon = [];
        veLich();
    }

    function doiThang(buoc) {
        const [y, m] = state.calMonth.split('-').map(Number);
        const d = new Date(Date.UTC(y, m - 1 + buoc, 1));
        state.calMonth = d.toISOString().slice(0, 7);
        loadCalendar();
    }

    /** Câu mô tả hiện khi rê chuột lên một ô ngày. */
    function moTaNgay(d, soPhong) {
        if (d.state === 'closed') return 'Bạn đã đóng đêm này';
        if (!d.booked_count) return 'Còn trống';
        if (soPhong > 1) {
            return d.bookings.map(b => (b.guest || 'Khách') + ' · ' + (b.phone || '')).join('\n')
                + '\n— còn ' + d.free_count + '/' + soPhong + ' phòng';
        }
        return (d.booking.guest || 'Khách') + ' · ' + (d.booking.phone || '');
    }

    function veLich() {
        const r = state.cal;
        const [y, m] = r.month.split('-').map(Number);
        $('cal-title').textContent = 'Tháng ' + m + '/' + y;

        const dem = cotCua(r.days[0].date);
        const o = [];
        for (let i = 0; i < dem; i += 1) o.push('<div class="cal-o trong-thang"></div>');

        const nhieuPhong = (r.meta.quantity || 1) > 1;

        for (const d of r.days) {
            const dangChon = state.calChon.indexOf(d.date) !== -1;
            const lop = ['cal-o', d.state, d.past ? 'qua' : '', dangChon ? 'chon' : '']
                .filter(Boolean).join(' ');

            // Tin một phòng: hiện thẳng tên khách, chủ nhà nhìn lịch là gọi
            // được ngay. Tin nhiều phòng: tên ai cũng không đủ chỗ, hiện số
            // phòng đã đặt trên tổng — đó mới là thứ cần biết để nhận thêm.
            let chu = '';
            if (d.state === 'closed') {
                chu = '<span class="t">Đóng</span>';
            } else if (d.booked_count) {
                chu = nhieuPhong
                    ? '<span class="t">' + d.booked_count + '/' + r.meta.quantity + ' phòng'
                      + (d.free_count ? '<br>còn ' + d.free_count : '') + '</span>'
                    : '<span class="t">' + esc((d.booking.guest || 'Khách').split(' ').slice(-2).join(' '))
                      + '<br>' + esc(d.booking.phone || '') + '</span>';
            }

            // Đêm còn phòng trống vẫn cho chọn để đóng nốt; đêm kín sạch thì
            // không, vì đóng cũng chẳng thay đổi được gì.
            const khoa = d.past || d.state === 'booked';

            o.push('<button class="' + lop + '" ' + (khoa ? 'disabled' : '')
                + ' title="' + esc(moTaNgay(d, r.meta.quantity)) + '"'
                + ' onclick="PartnerWorkspace.chonNgay(\'' + d.date + '\')">'
                + '<span class="n">' + Number(d.date.slice(-2)) + '</span>' + chu + '</button>');
        }

        $('cal-body').innerHTML =
            '<div class="cal-legend">'
            + '<span><i class="open"></i> Còn trống</span>'
            + (nhieuPhong
                ? '<span><i class="partial"></i> Còn phòng (' + (r.meta.partial || 0) + ' đêm)</span>'
                : '')
            + '<span><i class="booked"></i> ' + (nhieuPhong ? 'Kín sạch' : 'Đã có khách')
            + ' (' + r.meta.booked + ' đêm)</span>'
            + '<span><i class="closed"></i> Bạn đã đóng (' + r.meta.closed + ' đêm)</span>'
            + (nhieuPhong ? '<span style="margin-left:auto">Tin này có <b>'
                + r.meta.quantity + ' phòng</b></span>' : '')
            + '</div>'
            + '<div class="cal-grid">'
            + THU.map(t => '<div class="cal-head">' + t + '</div>').join('')
            + o.join('')
            + '</div>'
            + '<div class="cal-acts" id="cal-acts"></div>';

        veNutLich();
    }

    function veNutLich() {
        const n = state.calChon.length;
        const host = $('cal-acts');
        if (!n) {
            host.innerHTML = '<span class="dem" style="color:var(--muted);font-weight:500">'
                + 'Bấm vào ngày để chọn. Ngày đang có khách không đóng được — muốn nghỉ đêm đó '
                + 'thì huỷ đơn ở mục <b>Đơn khách đặt</b>.</span>';
            return;
        }
        const coDong = state.calChon.some(d =>
            (state.cal.days.find(x => x.date === d) || {}).state === 'closed');
        host.innerHTML =
            '<span class="dem">Đã chọn ' + n + ' đêm</span>'
            + '<button class="pw-btn stop" onclick="PartnerWorkspace.dongNgay()">Đóng, không nhận khách</button>'
            + (coDong ? '<button class="pw-btn go" onclick="PartnerWorkspace.moNgay()">Mở lại</button>' : '')
            + '<button class="pw-btn" onclick="PartnerWorkspace.boChon()">Bỏ chọn</button>';
    }

    function chonNgay(date) {
        const i = state.calChon.indexOf(date);
        if (i === -1) state.calChon.push(date);
        else state.calChon.splice(i, 1);
        veLich();
    }

    function boChon() {
        state.calChon = [];
        veLich();
    }

    async function datLich(action) {
        if (!state.calChon.length) return;
        let r;
        try {
            r = await api('/v1/partner/listings/' + encodeURIComponent($('cal-listing').value) + '/calendar', {
                method: 'POST',
                body: JSON.stringify({ action: action, dates: state.calChon }),
            });
        } catch (err) {
            return alert('Không lưu được: ' + err.message);
        }
        if (r.message) toastNhe(r.message);
        await loadCalendar();
    }

    const dongNgay = () => datLich('close');
    const moNgay = () => datLich('open');

    /** Báo ngắn ở góc, không chặn thao tác như alert. */
    function toastNhe(chu) {
        const el = document.createElement('div');
        el.textContent = chu;
        el.style.cssText = 'position:fixed;left:50%;bottom:28px;transform:translateX(-50%);'
            + 'background:#1D2214;color:#fff;padding:13px 20px;border-radius:12px;z-index:200;'
            + 'font-size:14px;max-width:min(520px,90vw);box-shadow:0 12px 30px rgba(0,0,0,.25);'
            + 'line-height:1.55';
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 5200);
    }

    // ── Doanh thu ───────────────────────────────────────────
    // Khác mục Dòng tiền: chỗ kia là tiền vào tiền ra, chỗ này là tình hình
    // buôn bán. Chủ nhà hỏi "tháng này khá hơn tháng trước không, phòng nào
    // ra tiền" — không bảng nào trước đây trả lời được.

    /** Mũi tên tăng/giảm. null = kỳ trước chưa có gì để so. */
    function mui(pt) {
        if (pt === null || pt === undefined) {
            return '<span class="pw-delta flat">kỳ đầu tiên</span>';
        }
        if (pt === 0) return '<span class="pw-delta flat">bằng kỳ trước</span>';
        const len = pt > 0;
        return '<span class="pw-delta ' + (len ? 'up' : 'down') + '">'
            + (len ? '▲ ' : '▼ ') + Math.abs(pt) + '% so với kỳ trước</span>';
    }

    async function loadRevenue() {
        const month = ($('rv-month') && $('rv-month').value) || '';
        $('rv-cards').innerHTML = '<div class="pw-card"><div class="k">Đang tính…</div></div>';

        let r;
        try {
            r = await api('/v1/partner/analytics' + (month ? '?month=' + month : ''));
        } catch (err) {
            $('rv-cards').innerHTML = '';
            $('rv-chart').innerHTML = '<div class="pw-empty">' + esc(err.message) + '</div>';
            return;
        }
        if ($('rv-month') && !$('rv-month').value) $('rv-month').value = r.month;

        const s = r.summary;
        $('rv-cards').innerHTML = [
            ['Doanh thu kỳ này', money(s.revenue), mui(s.revenue_change)],
            ['Đơn hoàn thành', s.orders, mui(s.orders_change)],
            ['Trung bình mỗi đơn', money(s.avg_order),
                '<span class="pw-delta flat">trên ' + s.orders + ' đơn</span>'],
            ['Bạn nhận về', money(s.net),
                '<span class="pw-delta flat">sau hoa hồng '
                + Math.round(r.commission_rate * 100) + '%</span>'],
        ].map(([k, v, d]) =>
            '<div class="pw-card"><div class="k">' + k + '</div>'
            + '<div class="v">' + v + '</div><div class="s">' + d + '</div></div>').join('');

        veBieuDo(r);
        veDichVu(r);
        veDonXong(r);
    }

    /**
     * Biểu đồ cột theo ngày, vẽ bằng div.
     *
     * Không nạp thư viện biểu đồ: cả trang này còn nhẹ hơn một thư viện như
     * thế, mà việc cần làm chỉ là ba mươi cái cột cao thấp khác nhau.
     * Ngày không có đơn vẫn giữ cột xám — bỏ đi thì các ngày có đơn dồn lại
     * sát nhau, nhìn như ngày nào cũng đông.
     */
    function veBieuDo(r) {
        const ngayCo = r.daily.filter(d => d.revenue > 0);
        if (!ngayCo.length) {
            $('rv-chart').innerHTML = '<div class="pw-empty">'
                + 'Kỳ này chưa có đơn nào hoàn thành nên chưa có gì để vẽ. '
                + 'Đơn phải được đánh dấu <b>đã phục vụ xong</b> mới tính vào doanh thu.</div>';
            return;
        }

        const cao = Math.max.apply(null, r.daily.map(d => d.revenue));
        const cot = r.daily.map(function (d) {
            const pct = cao ? Math.round((d.revenue / cao) * 100) : 0;
            const nhan = dmy(d.date) + ': ' + money(d.revenue)
                + (d.orders ? ' · ' + d.orders + ' đơn' : ' · không có đơn');
            return '<span class="pw-bar' + (d.revenue ? '' : ' trong') + '" title="' + esc(nhan) + '">'
                + '<i style="height:' + Math.max(pct, d.revenue ? 3 : 1) + '%"></i></span>';
        }).join('');

        // Trục ngày: chỉ ghi mốc 1, 5, 10… cho khỏi chen chữ
        const truc = r.daily.map(function (d, i) {
            const ng = Number(d.date.slice(-2));
            return '<span>' + (ng === 1 || ng % 5 === 0 ? ng : '') + '</span>';
        }).join('');

        const ngayCaoNhat = r.daily.reduce((a, b) => (b.revenue > a.revenue ? b : a), r.daily[0]);
        $('rv-chart').innerHTML =
            '<div class="pw-chart">' + cot + '</div>'
            + '<div class="pw-chart-x">' + truc + '</div>'
            + '<div class="pw-chart-foot">'
            + '<span>Cao nhất: <b>' + dmy(ngayCaoNhat.date) + '</b> — ' + money(ngayCaoNhat.revenue) + '</span>'
            + '<span>Có đơn: <b>' + ngayCo.length + '/' + r.daily.length + ' ngày</b></span>'
            + '</div>';
    }

    function veDichVu(r) {
        const rows = r.by_service || [];
        $('rv-services').innerHTML = !rows.length
            ? '<tbody><tr><td class="pw-empty">Kỳ này chưa có đơn hoàn thành.</td></tr></tbody>'
            : '<thead><tr><th>Dịch vụ</th><th class="num">Đơn</th><th class="num">Doanh thu</th></tr></thead>'
              + '<tbody>' + rows.map(d =>
                  '<tr><td>' + esc(d.name) + '</td>'
                  + '<td class="num">' + d.orders + '</td>'
                  + '<td class="num">' + money(d.revenue) + '</td></tr>').join('')
              + '</tbody>';

        // Tin đăng chưa có đơn nào: thứ không bảng nào nói mà lại đáng biết
        // nhất — đăng lên rồi để đó, không ai đặt.
        const idle = r.idle_listings || [];
        $('rv-idle').innerHTML = !idle.length
            ? '<div class="pw-empty" style="padding:20px">Mọi dịch vụ đang đăng đều có đơn trong kỳ này.</div>'
            : '<div class="pw-table-wrap"><table class="pw-table">'
              + '<thead><tr><th>Dịch vụ</th><th class="num">Giá đăng</th></tr></thead><tbody>'
              + idle.map(l => '<tr><td>' + esc(l.name) + '</td>'
                  + '<td class="num">' + money(l.price) + '</td></tr>').join('')
              + '</tbody></table></div>'
              + '<p style="font-size:12.5px;color:var(--muted);margin:10px 2px 0;line-height:1.6">'
              + 'Đang đăng nhưng kỳ này chưa ai đặt. Thử xem lại ảnh, giá, '
              + 'hoặc phần mô tả — khách thường bỏ qua tin thiếu ảnh thật.</p>';
    }

    async function veDonXong(r) {
        // Danh sách từng đơn lấy từ bảng đối soát, để hai màn hình ra cùng
        // một con số — lệch nhau là đối tác mất tin ngay.
        let d;
        try {
            d = await api('/v1/partner/revenue?month=' + r.month);
        } catch (_) {
            $('rv-orders').innerHTML = '<tbody><tr><td class="pw-empty">'
                + 'Chưa lấy được chi tiết từng đơn.</td></tr></tbody>';
            return;
        }
        const rows = d.rows || [];
        $('rv-orders').innerHTML = !rows.length
            ? '<tbody><tr><td class="pw-empty">Kỳ này chưa có đơn nào hoàn thành.</td></tr></tbody>'
            : '<thead><tr><th>Ngày</th><th>Mã đơn</th><th>Khách</th><th>Nội dung</th>'
              + '<th class="num">Khách trả</th><th class="num">Hoa hồng</th><th class="num">Bạn nhận</th></tr></thead>'
              + '<tbody>' + rows.map(x =>
                  '<tr><td>' + esc(dmy(x.date)) + '</td>'
                  + '<td><span class="pw-code">' + esc(x.code) + '</span></td>'
                  + '<td>' + esc(x.guest) + '</td>'
                  + '<td>' + esc(x.summary) + '</td>'
                  + '<td class="num">' + money(x.gross) + '</td>'
                  + '<td class="num pw-out">−' + money(x.commission) + '</td>'
                  + '<td class="num"><b>' + money(x.net) + '</b></td></tr>').join('')
              + '</tbody>';
    }

    // ── Đánh giá ────────────────────────────────────────────
    // Đánh giá là thứ khách sau đọc để quyết định đặt hay không. Đối tác phải
    // thấy được và trả lời được — một lời phàn nàn có trả lời tử tế đọc khác
    // hẳn một lời phàn nàn nằm trơ ở đó.

    const sao = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);

    async function loadReviews() {
        $('rvw-list').innerHTML = '<div class="pw-empty">Đang tải…</div>';
        let r;
        try {
            r = await api('/v1/partner/reviews');
        } catch (err) {
            $('rvw-cards').innerHTML = '';
            $('rvw-list').innerHTML = '<div class="pw-empty">' + esc(err.message) + '</div>';
            return;
        }
        state.reviews = r.data || [];
        const m = r.meta || {};

        const pho = (m.breakdown || []).map(function (b) {
            const pct = m.total ? Math.round((b.count / m.total) * 100) : 0;
            return '<div class="pw-stars-row"><span class="lb">' + b.stars + '★</span>'
                + '<span class="bar"><i style="width:' + pct + '%"></i></span>'
                + '<span class="n">' + b.count + '</span></div>';
        }).join('');

        $('rvw-cards').innerHTML =
            '<div class="pw-card"><div class="k">Điểm trung bình</div>'
            + '<div class="v">' + (m.average || 0) + ' <span style="font-size:16px;color:#e8a33d">★</span></div>'
            + '<div class="s">' + (m.total || 0) + ' đánh giá</div></div>'
            + '<div class="pw-card"><div class="k">Chưa trả lời</div>'
            + '<div class="v">' + (m.unanswered || 0) + '</div>'
            + '<div class="s">' + (m.unanswered ? 'khách đang chờ bạn đáp' : 'bạn đã trả lời hết') + '</div></div>'
            + '<div class="pw-card" style="grid-column:span 2"><div class="k">Phổ điểm</div>'
            + '<div style="margin-top:10px">' + (pho || '<span class="s">Chưa có đánh giá nào.</span>') + '</div></div>';

        // Chấm đỏ ở menu khi còn đánh giá chưa trả lời
        const cham = $('pw-dot-reviews');
        if (cham) cham.hidden = !m.unanswered;

        renderReviewFilters();
        renderReviews();
    }

    function renderReviewFilters() {
        const dem = (f) => state.reviews.filter(r => (f === 'unanswered' ? !r.reply
            : f === 'low' ? r.rating <= 3 : true)).length;
        $('rvw-filters').innerHTML = [
            ['all', 'Tất cả', dem('all')],
            ['unanswered', 'Chưa trả lời', dem('unanswered')],
            ['low', 'Từ 3 sao trở xuống', dem('low')],
        ].map(([k, nhan, n]) =>
            '<button class="pw-chip' + (state.reviewFilter === k ? ' active' : '') + '" '
            + 'onclick="PartnerWorkspace.locDanhGia(\'' + k + '\')">' + nhan
            + ' <span class="n">' + n + '</span></button>').join('');
    }

    function locDanhGia(k) {
        state.reviewFilter = k;
        renderReviewFilters();
        renderReviews();
    }

    function renderReviews() {
        const f = state.reviewFilter;
        const list = state.reviews.filter(r =>
            (f === 'unanswered' ? !r.reply : f === 'low' ? r.rating <= 3 : true));

        if (!state.reviews.length) {
            $('rvw-list').innerHTML = '<div class="pw-empty">'
                + 'Chưa có đánh giá nào. Khách chỉ đánh giá được sau khi đơn đã '
                + '<b>hoàn thành</b> — nhớ đánh dấu đơn đã phục vụ xong ở mục Đơn khách đặt.</div>';
            return;
        }
        if (!list.length) {
            $('rvw-list').innerHTML = '<div class="pw-empty">Không có đánh giá nào ở mục này.</div>';
            return;
        }

        $('rvw-list').innerHTML = list.map(function (r) {
            const traLoi = r.reply
                ? '<div class="pw-rvw-rep"><b>Bạn đã trả lời</b> · ' + esc(dmy(r.reply.at))
                  + '<br>' + esc(r.reply.text) + '</div>'
                : '<div class="pw-rvw-form">'
                  + '<textarea id="rep-' + esc(r.id) + '" placeholder="Trả lời khách…"></textarea>'
                  + '<button class="pw-btn go" onclick="PartnerWorkspace.traLoi(\'' + esc(r.id) + '\')">Gửi</button>'
                  + '</div>';

            return '<div class="pw-rvw">'
                + '<div class="pw-rvw-top">'
                + '<div><span class="pw-sao">' + sao(r.rating) + '</span>'
                + '<div class="pw-rvw-who">' + esc(r.guest_name || 'Khách')
                + ' · ' + esc(r.phone_masked || '') + ' · đơn '
                + '<span class="pw-code">' + esc(r.booking_code || '—') + '</span></div></div>'
                + '<div class="pw-rvw-who">' + esc(r.target_label || '') + ' · ' + esc(dmy(r.created_at)) + '</div>'
                + '</div>'
                + (r.comment ? '<p class="pw-rvw-cmt">' + esc(r.comment) + '</p>' : '')
                + traLoi + '</div>';
        }).join('');
    }

    async function traLoi(id) {
        const o = $('rep-' + id);
        const text = (o && o.value || '').trim();
        if (!text) return alert('Bạn viết vài dòng trả lời khách nhé.');
        try {
            await api('/v1/partner/reviews/' + encodeURIComponent(id) + '/reply', {
                method: 'POST',
                body: JSON.stringify({ text: text }),
            });
        } catch (err) {
            return alert('Không gửi được: ' + err.message);
        }
        await loadReviews();
    }

    // ── Hồ sơ & tài khoản nhận tiền ─────────────────────────
    // Đối soát ra số tiền phải trả mà không có số tài khoản thì con số đó nằm
    // im. Đây là chỗ để khai chuyển vào đâu.

    const NGAN_HANG = [
        'Vietcombank', 'VietinBank', 'BIDV', 'Agribank', 'Techcombank', 'MB Bank',
        'ACB', 'VPBank', 'Sacombank', 'TPBank', 'HDBank', 'VIB', 'SHB', 'SeABank',
        'OCB', 'MSB', 'Eximbank', 'LPBank', 'Nam A Bank', 'BVBank', 'Kienlongbank',
    ];

    function renderProfile() {
        const p = state.partner || {};
        const chon = (ten) => NGAN_HANG.map(b =>
            '<option value="' + esc(b) + '"' + (ten === b ? ' selected' : '') + '>' + esc(b) + '</option>'
        ).join('');

        $('pf-body').innerHTML =
            '<div class="pw-form">'
            + '<h2>Thông tin liên hệ</h2>'
            + '<p>Đây là những gì khách nhìn thấy và LOCALMATE dùng để gọi cho bạn khi có việc gấp.</p>'
            + '<div class="pw-grid">'
            + '<div class="pw-f"><label>Tên đơn vị</label>'
            + '<input id="pf-name" value="' + esc(p.name || '') + '" maxlength="160"></div>'
            + '<div class="pw-f"><label>Số điện thoại</label>'
            + '<input id="pf-phone" value="' + esc(p.phone || '') + '" maxlength="20" inputmode="tel">'
            + '<small>Khách gọi thẳng số này. Sai số là mất đơn.</small></div>'
            + '</div>'
            + '<div class="pw-f" style="margin-top:14px"><label>Địa chỉ hoạt động</label>'
            + '<input id="pf-address" value="' + esc(p.address || '') + '" maxlength="200"></div>'
            + (p.type === 'transport'
                ? '<div class="pw-f" style="margin-top:14px"><label>Biển số xe</label>'
                  + '<input id="pf-plate" value="' + esc(p.plate || '') + '" maxlength="20"></div>'
                : '')
            + '<div class="pw-f" style="margin-top:14px"><label>Giới thiệu ngắn</label>'
            + '<textarea id="pf-note" rows="3" maxlength="300">' + esc(p.note || '') + '</textarea>'
            + '<small>Một hai câu về chỗ của bạn. Khách đọc dòng này để quyết định có bấm vào không.</small></div>'
            + '<div class="pw-save"><button class="btn-primary" onclick="PartnerWorkspace.luuHoSo()">Lưu thông tin</button>'
            + '<span class="pw-msg" id="pf-msg"></span></div>'
            + '</div>'

            + '<div class="pw-form">'
            + '<h2>Tài khoản nhận tiền</h2>'
            + '<p>LOCALMATE giữ hộ tiền cọc khách chuyển qua hệ thống, cuối kỳ chuyển lại cho bạn '
            + '<b>vào đúng tài khoản này</b>. Chưa khai thì khoản phải trả vẫn được tính đủ nhưng '
            + 'chưa chuyển đi đâu được.</p>'
            + '<div class="pw-grid">'
            + '<div class="pw-f"><label>Ngân hàng</label>'
            + '<select id="pf-bank"><option value="">— Chọn ngân hàng —</option>' + chon(p.bankName) + '</select></div>'
            + '<div class="pw-f"><label>Số tài khoản</label>'
            + '<input id="pf-acc" value="' + esc(p.bankAccount || '') + '" maxlength="20" inputmode="numeric">'
            + '<small>Chỉ gồm chữ số.</small></div>'
            + '</div>'
            + '<div class="pw-f" style="margin-top:14px"><label>Tên chủ tài khoản</label>'
            + '<input id="pf-holder" value="' + esc(p.bankHolder || '') + '" maxlength="120">'
            + '<small>Ghi <b>đúng như ngân hàng in</b>, thường là chữ in hoa không dấu. '
            + 'Sai một chữ là ngân hàng trả lại lệnh chuyển.</small></div>'
            + '<div class="pw-save"><button class="btn-primary" onclick="PartnerWorkspace.luuNganHang()">Lưu tài khoản</button>'
            + '<span class="pw-msg" id="pf-bank-msg"></span></div>'
            + '</div>'

            + '<div class="pw-form">'
            + '<h2>Hồ sơ và giấy tờ</h2>'
            + '<p>Những mục dưới đây đã được LOCALMATE đối chiếu nên không sửa tại đây. '
            + 'Cần thay đổi thì gọi cho LOCALMATE để xét lại.</p>'
            + '<div class="pw-grid">'
            + '<div class="pw-f khoa"><label>Loại hình</label>'
            + '<input value="' + esc(LOAI[p.type] || p.type || '') + '" disabled></div>'
            + '<div class="pw-f khoa"><label>Hoa hồng</label>'
            + '<input value="' + Math.round((p.commission || 0) * 100) + '%" disabled></div>'
            + '<div class="pw-f khoa"><label>Email đăng nhập</label>'
            + '<input value="' + esc(p.email || '') + '" disabled></div>'
            + '<div class="pw-f khoa"><label>CCCD đã đối chiếu</label>'
            + '<input value="' + esc(p.id_masked || 'chưa nộp')
            + (p.id_verified ? ' — đã xác minh' : p.id_complete ? ' — đang đối chiếu' : '')
            + '" disabled></div>'
            + '</div></div>';
    }

    const LOAI = { hotel: 'Lưu trú', transport: 'Nhà xe', tour: 'Đơn vị tour', food: 'Cơ sở đặc sản' };

    function bao(id, text, ok) {
        const el = $(id);
        if (!el) return;
        el.textContent = text;
        el.className = 'pw-msg ' + (ok ? 'ok' : 'loi');
        if (ok) setTimeout(() => { el.textContent = ''; }, 4000);
    }

    async function luuHoSo() {
        const body = {
            name: ($('pf-name').value || '').trim(),
            phone: ($('pf-phone').value || '').trim(),
            address: ($('pf-address').value || '').trim(),
            note: ($('pf-note').value || '').trim(),
        };
        if ($('pf-plate')) body.plate = ($('pf-plate').value || '').trim();
        try {
            const r = await api('/v1/partner/me', { method: 'PATCH', body: JSON.stringify(body) });
            state.partner = r.data;
            capNhatDauTrang();
            bao('pf-msg', 'Đã lưu.', true);
        } catch (err) {
            bao('pf-msg', err.message, false);
        }
    }

    async function luuNganHang() {
        try {
            const r = await api('/v1/partner/me', {
                method: 'PATCH',
                body: JSON.stringify({
                    bank_name: $('pf-bank').value,
                    bank_account: ($('pf-acc').value || '').trim(),
                    bank_holder: ($('pf-holder').value || '').trim(),
                }),
            });
            state.partner = r.data;
            bao('pf-bank-msg', 'Đã lưu tài khoản nhận tiền.', true);
        } catch (err) {
            bao('pf-bank-msg', err.message, false);
        }
    }

    // ── Chuông thông báo ────────────────────────────────────
    // Đối tác không ngồi canh màn hình. Có đơn mới, có đánh giá, LOCALMATE vừa
    // chuyển tiền — không có chỗ nào báo thì họ chỉ biết khi tình cờ mở trang.

    function truoc(iso) {
        const phut = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
        if (phut < 1) return 'vừa xong';
        if (phut < 60) return phut + ' phút trước';
        const gio = Math.round(phut / 60);
        if (gio < 24) return gio + ' giờ trước';
        return Math.round(gio / 24) + ' ngày trước';
    }

    async function napChuong() {
        if (chuongDangNap) return;
        chuongDangNap = true;
        let r;
        try {
            r = await api('/v1/partner/notifications');
        } catch (_) {
            chuongDangNap = false;
            return;
        }
        state.tin = r.data || [];

        const chuaDoc = state.tin.filter(t => !t.read).length;
        const dot = $('pw-bell-dot');
        if (dot) {
            dot.hidden = !chuaDoc;
            dot.textContent = chuaDoc > 9 ? '9+' : String(chuaDoc || '');
        }
        const bell = $('pw-bell');
        if (bell) bell.setAttribute('aria-label', chuaDoc
            ? `Thông báo, ${chuaDoc} chưa đọc` : 'Thông báo');

        $('pw-bell-list').innerHTML = !state.tin.length
            ? '<div class="pw-empty" style="padding:26px 16px">Chưa có thông báo nào.</div>'
            : state.tin.slice(0, 30).map(t => {
                const coDon = !!t.booking_id;
                const tag = coDon ? 'button type="button"' : 'div';
                const click = coDon
                    ? ' onclick="PartnerWorkspace.moDonTuThongBao(\'' + esc(t.booking_id)
                        + '\',\'' + esc(t.id) + '\')"' : '';
                return '<' + tag + ' class="pw-tin' + (t.read ? '' : ' moi')
                + (coDon ? ' clickable' : '') + '"' + click + '>'
                + '<b>' + esc(t.title || '') + '</b>'
                + '<p>' + esc(t.body || '') + '</p>'
                + '<time>' + esc(truoc(t.created_at)) + '</time>'
                + (coDon ? '<span class="pw-tin-open">Xem đúng đơn này →</span>' : '')
                + '</' + (coDon ? 'button' : 'div') + '>';
            }).join('');
        chuongDangNap = false;
    }

    /**
     * Khi đối tác đang mở kênh làm việc, tự hỏi máy chủ để chuông báo đơn mới
     * mà không cần F5. Tạm dừng lúc tab bị ẩn để khỏi tốn mạng/CPU vô ích.
     */
    function batTheoDoiChuong() {
        if (chuongTimer) clearInterval(chuongTimer);
        chuongTimer = setInterval(() => {
            if (!document.hidden) napChuong();
        }, 15000);
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) napChuong();
        });
    }

    /** Mở mục đơn hàng, bỏ bộ lọc cũ và làm nổi đúng đơn từ thông báo. */
    async function moDonTuThongBao(bookingId, notificationId) {
        if (!bookingId) return;
        const panel = $('pw-bell-panel');
        if (panel) panel.hidden = true;

        // Chỉ đánh dấu thông báo vừa bấm, những thông báo khác vẫn còn trên chuông.
        if (notificationId) {
            try {
                await api('/v1/partner/notifications/read', {
                    method: 'POST', body: JSON.stringify({ ids: [notificationId] }),
                });
            } catch (_) { /* vẫn mở đơn kể cả lúc đánh dấu đọc bị lỗi mạng */ }
        }

        await loadOrders();
        state.orderFilter = 'all';
        if ($('or-search')) $('or-search').value = '';
        go('orders');
        renderOrders();
        napChuong();

        history.replaceState(null, '', '#order=' + encodeURIComponent(bookingId));
        requestAnimationFrame(() => requestAnimationFrame(() => {
            const row = [...document.querySelectorAll('#or-table tr[data-order-id]')]
                .find(el => el.dataset.orderId === String(bookingId));
            if (!row) return alert('Đơn này chưa tải được. Bạn bấm “Tải lại đơn” rồi thử lại nhé.');
            row.classList.remove('pw-order-focus');
            void row.offsetWidth;
            row.classList.add('pw-order-focus');
            row.setAttribute('tabindex', '-1');
            row.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
            row.focus({ preventScroll: true });
        }));
    }

    function moChuong() {
        const panel = $('pw-bell-panel');
        panel.hidden = !panel.hidden;
        if (!panel.hidden) napChuong();
    }

    async function docHet() {
        try {
            await api('/v1/partner/notifications/read', { method: 'POST', body: '{}' });
        } catch (_) { /* doc that bai thi thoi, khong chan gi */ }
        await napChuong();
    }

    // Bấm ra ngoài thì đóng bảng thông báo lại
    document.addEventListener('click', (e) => {
        const w = e.target.closest && e.target.closest('.pw-bell-wrap');
        if (!w && $('pw-bell-panel')) $('pw-bell-panel').hidden = true;
    });

    // ── Dòng tiền ───────────────────────────────────────────
    async function loadMoney() {
        const month = ($('mn-month') && $('mn-month').value) || '';
        $('mn-table').innerHTML = '<tbody><tr><td class="pw-empty">Đang tính…</td></tr></tbody>';

        let r;
        try {
            r = await api(`/v1/partner/cashflow${month ? `?month=${month}` : ''}`);
        } catch (err) {
            $('mn-cards').innerHTML = '';
            $('mn-note').textContent = err.message;
            $('mn-table').innerHTML = '';
            return;
        }

        if ($('mn-month') && !$('mn-month').value) $('mn-month').value = r.month;
        const s = r.summary;

        $('mn-cards').innerHTML = `
            <div class="pw-card">
                <div class="k">LOCALMATE thu hộ bạn</div>
                <div class="v">${money(s.deposit_collected)}</div>
                <div class="s">tiền cọc khách đã chuyển</div>
            </div>
            <div class="pw-card">
                <div class="k">Hoa hồng đã trừ</div>
                <div class="v" style="color:var(--terracotta)">−${money(s.commission_deducted)}</div>
                <div class="s">${Math.round(r.commission_rate * 100)}% trên đơn hoàn thành</div>
            </div>
            <div class="pw-card">
                <div class="k">Đã chuyển cho bạn</div>
                <div class="v">${money(s.paid_to_you)}</div>
                <div class="s">trong kỳ này</div>
            </div>
            <div class="pw-card dark">
                <div class="k">LOCALMATE còn phải trả</div>
                <div class="v">${money(s.owed_to_you)}</div>
                <div class="s">sẽ chuyển vào cuối kỳ</div>
            </div>`;

        // Chỗ đối tác hay hiểu nhầm nhất — nói rõ ngay dưới mấy con số
        $('mn-note').innerHTML =
            'LOCALMATE chỉ giữ hộ <b>phần tiền cọc</b> khách chuyển qua hệ thống. '
            + 'Phần còn lại của đơn khách trả thẳng cho bạn lúc nhận dịch vụ, nên không '
            + 'xuất hiện trong bảng này. Hoa hồng được trừ vào phần cọc LOCALMATE đang giữ.';

        const rows = r.entries || [];
        $('mn-table').innerHTML = !rows.length
            ? '<tbody><tr><td class="pw-empty">Kỳ này chưa phát sinh khoản nào.</td></tr></tbody>'
            : `
            <thead><tr><th>Ngày</th><th>Khoản</th><th>Đơn</th><th>Diễn giải</th><th class="num">Số tiền</th></tr></thead>
            <tbody>${rows.map(e => `
                <tr>
                    <td>${esc(dmy(e.date))}</td>
                    <td>${esc(e.type_label)}</td>
                    <td>${e.booking_code ? `<span class="pw-code">${esc(e.booking_code)}</span>` : '—'}</td>
                    <td>${esc(e.note)}</td>
                    <td class="num ${e.type === 'payout' ? 'pw-in' : e.type === 'commission' ? 'pw-out' : ''}">
                        ${e.type === 'commission' ? '−' : ''}${money(e.amount)}
                    </td>
                </tr>`).join('')}</tbody>`;
    }

    async function taiLaiDon() {
        await loadOrders();
        renderOrders();
        renderOverview();
    }

    document.addEventListener('DOMContentLoaded', init);
    return {
        go, loadMoney, loadOrders, loadDepartures, moChuyen, doiTrangThai,
        // Đơn hàng
        renderOrders, locDon, doiDon, taiLaiDon,
        // Lịch phòng
        loadCalendar, doiThang, chonNgay, boChon, dongNgay, moNgay,
        // Doanh thu
        loadRevenue,
        // Đánh giá
        loadReviews, locDanhGia, traLoi,
        // Hồ sơ
        renderProfile, luuHoSo, luuNganHang,
        // Thông báo
        moChuong, docHet, moDonTuThongBao,
        currentPartner: () => state.partner, toast: (m) => alert(m),
    };
})();

window.PartnerWorkspace = PartnerWorkspace;
// listing.js gọi Partner.currentPartner() và Partner.toast() — trỏ về đây để
// dùng lại nguyên vẹn phần đăng tin đã có, khỏi viết lại lần hai.
window.Partner = window.Partner || PartnerWorkspace;
