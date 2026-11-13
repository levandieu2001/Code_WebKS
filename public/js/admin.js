// ============================================================
// Trang quản trị — LOCALMATE
// ============================================================
// Đơn từ website và app Android đều ghi vào collection `bookings`,
// phân biệt bằng trường `kind`: hotel | transport | tour.
// Đơn có `partnerId` là đơn thuộc về đối tác (nhà xe, tour, khách sạn).
// ============================================================
(function () {
'use strict';

let currentRooms = [];
let currentBookings = [];
let currentContacts = [];
let currentPartners = [];
let orderFilter = 'all';
let orderSearch = '';
let partnerFilter = 'all';
let partnerTypeFilter = 'all';
let partnerTimer = null;
let authVersion = 0;
let dashboardStops = [];

/** Gọi API backend kèm token Firebase của admin đang đăng nhập. */
async function adminApi(path, options = {}) {
    const user = firebase.auth().currentUser;
    if (!user) throw new Error('Chưa đăng nhập.');
    const token = await user.getIdToken();
    const res = await fetch(path, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            ...(options.headers || {}),
        },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body?.error?.message || `Lỗi HTTP ${res.status}`);
    return body;
}

/**
 * Như adminApi nhưng trả Response thô, không tự đọc JSON.
 * Dùng để lấy ảnh CCCD: cần bytes, không phải JSON.
 */
async function adminFetch(path) {
    const user = firebase.auth().currentUser;
    if (!user) throw new Error('Chưa đăng nhập.');
    const token = await user.getIdToken();
    return fetch(path, { headers: { Authorization: 'Bearer ' + token } });
}

// ── Tiện ích ──
const money = (n) => Number(n || 0).toLocaleString('vi-VN') + 'đ';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** Mã đơn Firestore dài 20 ký tự — hiện 8 ký tự cuối cho gọn, vẫn đủ phân biệt. */
const shortId = (id) => String(id || '').slice(-8).toUpperCase();

window.copyOrderId = async function (id) {
    try {
        await navigator.clipboard.writeText(id);
        alert('Đã chép mã đơn: ' + id);
    } catch (_) {
        prompt('Mã đơn:', id);
    }
};

const dmy = (iso) => {
    const [y, m, d] = String(iso || '').split('-');
    return d ? `${d}/${m}/${y}` : (iso || '—');
};

/** createdAt có thể là Timestamp của Firestore hoặc chuỗi ISO. */
function toDate(value) {
    if (!value) return null;
    if (typeof value === 'object' && value.seconds) return new Date(value.seconds * 1000);
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
}

const dateTimeText = (value) => {
    const d = toDate(value);
    return d ? d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
};

const sortByCreated = (a, b) => (toDate(b.createdAt)?.getTime() || 0) - (toDate(a.createdAt)?.getTime() || 0);

const KIND = {
    hotel: { label: 'Phòng nghỉ', badge: 'badge-green', icon: 'bed-double' },
    transport: { label: 'Xe đưa đón', badge: 'badge-blue', icon: 'car' },
    tour: { label: 'Tour', badge: 'badge-brand', icon: 'route' },
    food: { label: 'Đặc sản', badge: 'badge-yellow', icon: 'utensils' },
};
const kindOf = (booking) => KIND[booking.kind] || KIND.hotel;

const STATUS = {
    pending: { label: 'Chờ duyệt', badge: 'badge-yellow' },
    confirmed: { label: 'Đã duyệt', badge: 'badge-green' },
    completed: { label: 'Hoàn thành', badge: 'badge-blue' },
    cancelled: { label: 'Đã huỷ', badge: 'badge-red' },
};
const statusOf = (booking) => STATUS[booking.status] || { label: booking.status || '—', badge: 'badge-grey' };

const PARTNER_TYPE = { transport: 'Nhà xe', tour: 'Đơn vị tour', hotel: 'Lưu trú', food: 'Đặc sản' };

function emptyRow(colspan, icon, message) {
    return `<tr><td colspan="${colspan}"><div class="empty-state">
        <i data-lucide="${icon}"></i><p>${esc(message)}</p></div></td></tr>`;
}

function refreshIcons() {
    if (window.lucide) lucide.createIcons();
}

// ── ĐĂNG NHẬP ──
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;
    const errEl = document.getElementById('login-error');
    const btn = document.getElementById('login-btn');

    btn.textContent = 'Đang đăng nhập…';
    btn.disabled = true;
    try {
        await FirebaseDB.login(email, pass);
    } catch (err) {
        errEl.style.display = 'block';
        errEl.textContent = err.code === 'auth/wrong-password' ? 'Sai mật khẩu.'
            : err.code === 'auth/user-not-found' ? 'Email không tồn tại.'
            : err.code === 'auth/invalid-credential' ? 'Email hoặc mật khẩu không đúng.'
            : 'Lỗi: ' + err.message;
        btn.textContent = 'Đăng nhập';
        btn.disabled = false;
    }
});

FirebaseDB.onAuthChange(async user => {
    const version = ++authVersion;
    dashboardStops.forEach(stop => stop());
    dashboardStops = [];
    clearInterval(partnerTimer);
    currentBookings = []; currentContacts = []; currentPartners = [];
    ['orders-tbody', 'recent-tbody', 'partners-tbody', 'contacts-tbody'].forEach(id => {
        document.getElementById(id).innerHTML = '';
    });
    document.getElementById('dashboard').style.display = 'none';
    document.getElementById('login-page').style.display = 'flex';
    const btn = document.getElementById('login-btn');
    btn.disabled = Boolean(user);
    btn.textContent = user ? 'Đang kiểm tra quyền…' : 'Đăng nhập';
    if (!user) return;
    try {
        const session = await adminApi('/v1/auth/me');
        if (version !== authVersion) return;
        if (!session.user?.is_admin) {
            const partner = await adminApi('/v1/partner/me').catch(() => null);
            if (version !== authVersion) return;
            if (partner?.partner) {
                // Chỉ chuyển phiên của chính người vừa xác thực sang kênh đối tác.
                const token = await user.getIdToken();
                if (version !== authVersion) return;
                BayNuiAuth.clear();
                BayNuiAuth.save({ token, refresh_token: user.refreshToken,
                    user: session.user, expires_in: 3600 });
                await FirebaseDB.logout();
                location.replace('doitac-quanly.html');
                return;
            }
            throw new Error('Tài khoản này không có quyền quản trị. Đối tác vui lòng vào Kênh đối tác.');
        }
        document.getElementById('login-page').style.display = 'none';
        document.getElementById('dashboard').style.display = 'flex';
        document.getElementById('admin-email').textContent = user.email;
        refreshIcons();
        initDashboard();
    } catch (err) {
        if (version !== authVersion) return;
        const error = document.getElementById('login-error');
        error.style.display = 'block';
        error.textContent = err.message;
    } finally {
        if (version === authVersion) { btn.disabled = false; btn.textContent = 'Đăng nhập'; }
    }
});

window.handleLogout = async function () {
    if (confirm('Bạn chắc chắn muốn đăng xuất?')) await FirebaseDB.logout();
};

// ── TAB ──
window.showTab = function (tab, element) {
    document.querySelectorAll('.tab-section').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
    document.getElementById('tab-' + tab).classList.add('active');
    const link = element || document.querySelector(`[data-tab="${tab}"]`);
    if (link) link.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    refreshIcons();
};

// ── KHỞI ĐỘNG ──
function initDashboard() {
    dashboardStops.push(FirebaseDB.onRoomsChange(rooms => {
        currentRooms = rooms;
        renderRooms(rooms);
    }));

    dashboardStops.push(FirebaseDB.onBookingsChange(bookings => {
        currentBookings = [...bookings].sort(sortByCreated);
        renderOrders();
        renderRecent();
        renderStats();
    }));

    // Hồ sơ đối tác lưu ở máy chủ — nạp lại mỗi 15 giây để thấy hồ sơ mới
    loadPartners();
    clearInterval(partnerTimer);
    partnerTimer = setInterval(loadPartners, 15000);

    loadSeedPartners();
    Events.load();
    loadContacts();
    loadSettings();
}

// ── THỐNG KÊ ──
function renderStats() {
    const pending = currentBookings.filter(b => b.status === 'pending');
    const byKind = currentBookings.reduce((acc, b) => {
        const k = b.kind || 'hotel';
        acc[k] = (acc[k] || 0) + 1;
        return acc;
    }, {});
    const revenue = currentBookings
        .filter(b => b.status === 'confirmed' || b.status === 'completed')
        .reduce((sum, b) => sum + (b.totalPrice || 0), 0);
    const waitingPartners = currentPartners.filter(p => p.status === 'pending');

    document.getElementById('stat-pending').textContent = pending.length;
    document.getElementById('stat-orders').textContent = currentBookings.length;
    document.getElementById('stat-orders-sub').textContent =
        `${byKind.hotel || 0} phòng · ${byKind.transport || 0} xe · ${byKind.tour || 0} tour`;
    document.getElementById('stat-partners').textContent = waitingPartners.length;
    document.getElementById('stat-partners-sub').textContent = `${currentPartners.length} hồ sơ đã gửi`;
    document.getElementById('stat-revenue').textContent = money(revenue);

    document.getElementById('count-orders').textContent = pending.length;
    document.getElementById('count-partners').textContent = waitingPartners.length;
}

// ── ĐƠN HÀNG ──
function orderServiceCell(b) {
    const kind = kindOf(b);
    return `<td>
        <span class="badge ${kind.badge}"><i data-lucide="${kind.icon}" style="width:13px;height:13px"></i>${kind.label}</span>
        <div class="cell-main" style="margin-top:6px">${esc(b.roomName || b.tourName || '—')}</div>
        <button class="order-id" onclick="copyOrderId('${esc(b.id)}')" title="Bấm để chép mã đơn">
            <i data-lucide="hash" style="width:11px;height:11px"></i>${esc(shortId(b.id))}
        </button>
        ${b.source ? `<div class="cell-sub">Từ ${b.source === 'android' ? 'app Android' : 'website'}</div>` : ''}
    </td>`;
}

function orderTimeCell(b) {
    if (b.kind === 'food') return `<td>${esc(dateTimeText(b.createdAt))}<div class="cell-sub">Giao: ${esc(b.deliveryAddress || b.address || 'Chờ xác nhận')}</div></td>`;
    if (b.kind === 'transport') {
        return `<td><div class="cell-main">${dmy(b.checkIn)}${b.pickupTime ? ' · ' + esc(b.pickupTime) : ''}</div>
            <div class="cell-sub">${b.roundTrip ? 'Khứ hồi · về ' + dmy(b.checkOut) : 'Một chiều'}</div></td>`;
    }
    if (b.kind === 'tour') {
        return `<td><div class="cell-main">${dmy(b.checkIn)}</div>
            <div class="cell-sub">${esc(b.duration || '')}${b.guests ? ' · ' + b.guests + ' khách' : ''}</div></td>`;
    }
    return `<td><div class="cell-main">${dmy(b.checkIn)} → ${dmy(b.checkOut)}</div>
        <div class="cell-sub">${b.nights ? b.nights + ' đêm' : ''}</div></td>`;
}

function renderOrderRows(list, withActions) {
    return list.map(b => `<tr>
        ${orderServiceCell(b)}
        <td>
            <div class="cell-main">${esc(b.guestName || '—')}</div>
            <div class="cell-sub">${esc(b.phone || '')}${b.email ? ' · ' + esc(b.email) : ''}</div>
        </td>
        ${orderTimeCell(b)}
        <td>${b.partnerName
            ? `<div class="cell-main">${esc(b.partnerName)}</div><div class="cell-sub">Đối tác</div>`
            : '<span class="cell-sub">Homestay tự phục vụ</span>'}</td>
        <td><strong>${money(b.totalPrice)}</strong></td>
        <td><span class="badge ${statusOf(b).badge}">${statusOf(b).label}</span></td>
        ${withActions ? `<td>
            <div class="row-acts">
                <button class="btn btn-sm btn-outline" onclick="viewOrder('${esc(b.id)}')">Xem chi tiết</button>
                ${b.status === 'pending' ? `
                    <button class="btn btn-sm btn-green" onclick="updateBookingStatus('${b.id}','confirmed')">Duyệt</button>
                    <button class="btn btn-sm btn-red" onclick="updateBookingStatus('${b.id}','cancelled')">Huỷ</button>` : ''}
                ${b.status === 'confirmed' ? `
                    <button class="btn btn-sm btn-blue" onclick="updateBookingStatus('${b.id}','completed')">Hoàn thành</button>` : ''}
                <button class="btn btn-sm btn-red" onclick="removeBooking('${b.id}')" title="Xoá đơn">🗑️</button>
            </div>
        </td>` : ''}
    </tr>`).join('');
}

/**
 * Tìm đơn theo mã, tên khách, số điện thoại, email, tên phòng/tour hoặc
 * tên đối tác. Gõ gì cũng ra — không bắt tổng đài nhớ đúng trường nào.
 */
function matchesSearch(b, needle) {
    if (!needle) return true;
    const haystack = [
        b.id, shortId(b.id), b.guestName, b.phone, b.email,
        b.roomName, b.tourName, b.partnerName, b.pickup, b.dropoff, b.note,
    ].filter(Boolean).join(' ').toLowerCase();
    // Bỏ dấu để gõ "chau doc" vẫn tìm ra "Châu Đốc"
    const plain = haystack.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
    const key = needle.toLowerCase();
    const keyPlain = key.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
    return haystack.includes(key) || plain.includes(keyPlain);
}

function renderOrders() {
    const tbody = document.getElementById('orders-tbody');
    tbody.closest('table').classList.add('mobile-orders');
    let list = currentBookings;
    if (orderFilter === 'pending') list = list.filter(b => b.status === 'pending');
    else if (orderFilter !== 'all') list = list.filter(b => (b.kind || 'hotel') === orderFilter);
    list = list.filter(b => matchesSearch(b, orderSearch));

    const count = document.getElementById('order-result-count');
    if (count) {
        count.textContent = orderSearch
            ? `${list.length} đơn khớp "${orderSearch}"`
            : `${list.length} đơn`;
    }

    tbody.innerHTML = list.length
        ? renderOrderRows(list, true)
        : emptyRow(7, 'search-x', orderSearch
            ? `Không có đơn nào khớp "${orderSearch}".`
            : 'Chưa có đơn nào ở mục này.');
    refreshIcons();
}

window.searchOrders = function (value) {
    orderSearch = String(value || '').trim();
    const clear = document.getElementById('order-search-clear');
    if (clear) clear.style.display = orderSearch ? '' : 'none';
    renderOrders();
};

window.clearOrderSearch = function () {
    const input = document.getElementById('order-search');
    if (input) input.value = '';
    window.searchOrders('');
    if (input) input.focus();
};

function renderRecent() {
    const tbody = document.getElementById('recent-tbody');
    tbody.closest('table').classList.add('mobile-orders');
    const list = currentBookings.slice(0, 5);
    tbody.innerHTML = list.length
        ? renderOrderRows(list, false)
        : emptyRow(6, 'inbox', 'Chưa có đơn nào.');
    refreshIcons();
}

window.filterOrders = function (value, btn) {
    orderFilter = value;
    document.querySelectorAll('#order-filters .filter-chip').forEach(c => c.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderOrders();
};

window.viewOrder = function (id) {
    const b = currentBookings.find(order => order.id === id);
    if (!b) return;
    let dialog = document.getElementById('order-detail');
    if (!dialog) {
        dialog = document.createElement('dialog');
        dialog.id = 'order-detail';
        dialog.setAttribute('aria-labelledby', 'order-detail-title');
        document.body.append(dialog);
    }
    const fields = [['Dịch vụ', kindOf(b).label], ['Nội dung', b.roomName || b.tourName],
        ['Khách', b.guestName], ['Số điện thoại', b.phone], ['Điểm đón', b.pickup],
        ['Điểm đến', b.dropoff], ['Địa chỉ giao hàng', b.deliveryAddress || b.address], ['Ghi chú', b.note],
        ['Tổng tiền', money(b.totalPrice)], ['Trạng thái', statusOf(b).label]];
    dialog.innerHTML = `<h2 id="order-detail-title">Đơn ${esc(shortId(b.id))}</h2><dl>${fields
        .filter(([, value]) => value).map(([label, value]) => `<dt>${label}</dt><dd>${esc(value)}</dd>`).join('')}</dl>
        <form method="dialog"><button class="btn btn-outline">Đóng</button></form>`;
    dialog.showModal();
};

/**
 * Đổi trạng thái đơn.
 *
 * Đi qua máy chủ chứ không ghi thẳng Firestore như trước. Ghi thẳng thì nhanh
 * hơn một nhịp, nhưng máy chủ không biết đơn vừa đổi nên KHÔNG gửi được thông
 * báo cho khách — mà chủ nhà tự duyệt đơn phòng của mình lại là đường duyệt
 * hay dùng nhất. Đường phổ biến nhất mà lại im lặng nhất thì không ổn.
 *
 * Bảng vẫn tự cập nhật ngay: onBookingsChange đang nghe Firestore, máy chủ ghi
 * xong là trình duyệt thấy liền.
 */
window.updateBookingStatus = async function (id, status) {
    try {
        await adminApi(`/v1/admin/bookings/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        });
    } catch (err) { alert('Lỗi cập nhật đơn: ' + err.message); }
};

window.removeBooking = async function (id) {
    if (!confirm('Xoá đơn này? Không thể hoàn tác.')) return;
    try {
        await FirebaseDB.deleteBooking(id);
    } catch (err) { alert('Lỗi xoá đơn: ' + err.message); }
};

// ── ĐỐI TÁC ──
function renderPartners() {
    const tbody = document.getElementById('partners-tbody');
    let list = currentPartners;
    if (partnerFilter !== 'all') list = list.filter(p => p.status === partnerFilter);
    if (partnerTypeFilter !== 'all') list = list.filter(p => p.type === partnerTypeFilter);

    if (!list.length) {
        tbody.innerHTML = emptyRow(8, 'handshake',
            currentPartners.length
                ? 'Không có hồ sơ nào ở mục này.'
                : 'Chưa có ai đăng ký. Chia sẻ trang doitac.html để mời đối tác.');
        refreshIcons();
        return;
    }

    tbody.innerHTML = list.map(p => {
        const approved = p.status === 'approved';
        const rejected = p.status === 'rejected';
        return `<tr>
            <td>
                <div class="cell-main">${esc(p.name || '—')}</div>
                <div class="cell-sub">${esc(p.email || '')}</div>
                ${p.plate ? `<div class="cell-sub">Biển số ${esc(p.plate)}</div>` : ''}
            </td>
            <td><span class="badge badge-grey">${esc(PARTNER_TYPE[p.type] || p.type || '—')}</span>
                ${p.vehicleType ? `<div class="cell-sub" style="margin-top:5px">${esc(p.vehicleType)}</div>` : ''}</td>
            <td><a href="tel:${esc(p.phone || '')}">${esc(p.phone || '—')}</a></td>
            <td>${esc(p.address || '—')}</td>
            <td>${Math.round((p.commission || 0) * 100)}%</td>
            <td>${identityCell(p)}</td>
            <td><span class="badge ${approved ? 'badge-green' : rejected ? 'badge-red' : 'badge-yellow'}">
                ${approved ? 'Đã duyệt' : rejected ? 'Từ chối' : 'Chờ duyệt'}</span></td>
            <td>
                <div class="row-acts">
                    ${!approved && p.id_complete ? `<button class="btn btn-sm btn-green" onclick="setPartnerStatus('${p.id}','approved')">Duyệt</button>` : ''}
                    ${p.status !== 'rejected' ? `<button class="btn btn-sm btn-red" onclick="setPartnerStatus('${p.id}','rejected')">Từ chối</button>` : ''}
                    <button class="btn btn-sm btn-red" onclick="removePartner('${p.id}','${esc(p.name || '')}')" title="Xoá hồ sơ">🗑️</button>
                </div>
            </td>
        </tr>`;
    }).join('');
    refreshIcons();
}

/**
 * Ô "Giấy tờ" trong bảng.
 *
 * Cố tình KHÔNG hiện số CCCD đầy đủ ở đây: bảng này mở suốt ngày trên màn
 * hình, ai đi ngang cũng đọc được, mà đọc thì chẳng để làm gì. Số đầy đủ nằm
 * sau nút "Đối chiếu", và mỗi lần bấm là máy chủ ghi lại một dòng nhật ký.
 */
function identityCell(p) {
    if (p.source === 'seed') return '<span class="cell-sub">Hồ sơ cài sẵn</span>';
    if (!p.id_complete) {
        const thieu = [];
        if (!p.id_masked) thieu.push('số');
        if (!p.id_has_front) thieu.push('mặt trước');
        if (!p.id_has_back) thieu.push('mặt sau');
        return `<span class="badge badge-yellow">Thiếu ${esc(thieu.join(', '))}</span>`;
    }
    return `<span class="badge ${p.id_verified ? 'badge-green' : 'badge-grey'}">
                ${p.id_verified ? 'Đã đối chiếu' : 'Đủ giấy'}</span>
            <div class="cell-sub" style="margin-top:5px">${esc(p.id_masked || '')}</div>
            <button class="btn btn-sm" style="margin-top:6px"
                    onclick="viewIdentity('${p.id}')">Đối chiếu</button>`;
}

/**
 * Mở cửa sổ đối chiếu CCCD.
 *
 * Ảnh phải tải bằng fetch rồi dựng blob, không gán thẳng vào src được: thẻ
 * <img> không gửi kèm header Authorization, mà cửa lấy ảnh thì bắt buộc phải
 * có. Đổi lại là ảnh CCCD không bao giờ nằm ở một đường dẫn mở ai gõ cũng xem.
 *
 * Blob được thu hồi khi đóng cửa sổ, để ảnh không nằm lại trong bộ nhớ trang.
 */
let identityBlobs = [];

window.viewIdentity = async function (id) {
    const box = document.getElementById('identity-modal');
    const body = document.getElementById('identity-body');
    box.classList.add('show');
    body.innerHTML = '<p class="cell-sub">Đang mở giấy tờ…</p>';

    try {
        const res = await adminApi(`/v1/admin/partners/${id}/identity`);
        const d = res.data;
        body.innerHTML = `
            <div class="identity-grid">
                <div><span>Họ tên trên thẻ</span><b>${esc(d.id_name || '—')}</b></div>
                <div><span>Số CCCD</span><b>${esc(d.id_number || '—')}</b></div>
                <div><span>Tên đơn vị đăng ký</span><b>${esc(d.name || '—')}</b></div>
                <div><span>Ngày nộp</span><b>${d.id_submitted_at ? esc(d.id_submitted_at.slice(0, 10)) : '—'}</b></div>
            </div>
            <div class="identity-photos" id="identity-photos">
                <div class="identity-photo"><span>Mặt trước</span><div id="id-front">Đang tải…</div></div>
                <div class="identity-photo"><span>Mặt sau</span><div id="id-back">Đang tải…</div></div>
            </div>
            <p class="identity-note">
                Đối chiếu tên và số trên ảnh với ô bên trên. Khớp thì đóng cửa sổ và bấm
                <b>Duyệt</b> ở bảng. Lần mở này đã được ghi nhật ký.
            </p>`;

        for (const side of ['front', 'back']) {
            const slot = document.getElementById('id-' + side);
            try {
                const r = await adminFetch(`/v1/admin/partners/${id}/identity/${side}`);
                if (!r.ok) throw new Error('chưa nộp');
                const blob = await r.blob();
                const url = URL.createObjectURL(blob);
                identityBlobs.push(url);
                slot.innerHTML = `<img src="${url}" alt="CCCD ${side}">`;
            } catch (_) {
                slot.innerHTML = '<span class="cell-sub">Chưa có ảnh mặt này.</span>';
            }
        }
    } catch (err) {
        body.innerHTML = `<p class="cell-sub">Không mở được giấy tờ: ${esc(err.message)}</p>`;
    }
};

window.closeIdentity = function () {
    document.getElementById('identity-modal').classList.remove('show');
    document.getElementById('identity-body').innerHTML = '';
    // Thu hồi blob: không để ảnh CCCD nằm lại trong bộ nhớ trang sau khi xem
    identityBlobs.forEach(URL.revokeObjectURL);
    identityBlobs = [];
};

window.filterPartners = function (value, btn) {
    partnerFilter = value;
    document.querySelectorAll('#partner-filters .filter-chip').forEach(c => c.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderPartners();
};

window.filterPartnerType = function (value) {
    partnerTypeFilter = value;
    renderPartners();
};

async function loadPartners() {
    try {
        const result = await adminApi('/v1/admin/partners');
        currentPartners = result.data || [];
        renderPartners();
        renderStats();
    } catch (err) {
        console.warn('Không tải được đối tác:', err.message);
        document.getElementById('partners-tbody').innerHTML =
            emptyRow(8, 'wifi-off', 'Không tải được danh sách đối tác: ' + err.message);
        refreshIcons();
    }
}

window.setPartnerStatus = async function (id, status) {
    try {
        await adminApi(`/v1/admin/partners/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        });
        await loadPartners();
    } catch (err) {
        alert('Không cập nhật được: ' + err.message);
    }
};

window.removePartner = async function (id, name) {
    if (!confirm(`Xoá hồ sơ đối tác "${name}"?`)) return;
    try {
        await adminApi(`/v1/admin/partners/${id}`, { method: 'DELETE' });
        await loadPartners();
    } catch (err) { alert('Không xoá được: ' + err.message); }
};

/** Đối tác cài sẵn trong lib/partners.js — chỉ để xem, không sửa từ đây. */
async function loadSeedPartners() {
    const tbody = document.getElementById('seed-partners-tbody');
    try {
        const res = await fetch('/v1/partners');
        const json = await res.json();
        const list = json.data || [];
        tbody.innerHTML = list.length ? list.map(p => `<tr>
            <td><div class="cell-main">${esc(p.name)}</div><div class="cell-sub">${esc(p.note || '')}</div></td>
            <td><span class="badge badge-grey">${esc(PARTNER_TYPE[p.type] || p.type)}</span></td>
            <td>${esc(p.address || '—')}</td>
            <td>★ ${p.rating || '—'} <span class="cell-sub">(${p.reviews || 0})</span></td>
            <td class="cell-sub">${esc(p.id)}</td>
        </tr>`).join('') : emptyRow(5, 'handshake', 'Chưa có đối tác cài sẵn.');
    } catch (err) {
        tbody.innerHTML = emptyRow(5, 'wifi-off', 'Không tải được (server chưa chạy?).');
    }
    refreshIcons();
}

// ── PHÒNG NGHỈ ──
function renderRooms(rooms) {
    const tbody = document.getElementById('rooms-tbody');
    if (!rooms.length) {
        tbody.innerHTML = emptyRow(6, 'bed-double', 'Chưa có phòng nào. Bấm "Thêm phòng" để tạo.');
        refreshIcons();
        return;
    }
    tbody.innerHTML = rooms.map(r => {
        const badge = r.status === 'available' ? '<span class="badge badge-green">Còn phòng</span>'
            : r.status === 'booked' ? '<span class="badge badge-yellow">Đã đặt</span>'
            : '<span class="badge badge-red">Bảo trì</span>';
        return `<tr>
            <td><img src="${esc(r.imageUrl || 'assets/homestay.jpg')}" alt="${esc(r.name)}"></td>
            <td><div class="cell-main">${esc(r.name)}</div><div class="cell-sub">${esc(r.nameEn || '')}</div></td>
            <td><strong>${money(r.price)}</strong></td>
            <td>${r.capacity || 2} người</td>
            <td>${badge}</td>
            <td>
                <button class="btn btn-sm btn-blue" onclick="editRoom('${r.id}')">Sửa</button>
                <button class="btn btn-sm btn-red" onclick="deleteRoom('${r.id}','${esc(r.name)}')">🗑️</button>
            </td>
        </tr>`;
    }).join('');
    refreshIcons();
}

window.openRoomModal = function (room = null) {
    _pendingImageFile = null;
    document.getElementById('room-modal-title').textContent = room ? 'Chỉnh sửa phòng' : 'Thêm phòng mới';
    document.getElementById('room-edit-id').value = room ? room.id : '';
    document.getElementById('room-name').value = room ? room.name : '';
    document.getElementById('room-nameEn').value = room ? (room.nameEn || '') : '';
    document.getElementById('room-price').value = room ? room.price : '';
    document.getElementById('room-capacity').value = room ? (room.capacity || 2) : 2;
    document.getElementById('room-desc').value = room ? (room.description || '') : '';
    document.getElementById('room-descEn').value = room ? (room.descriptionEn || '') : '';
    document.getElementById('room-amenities').value = room ? (room.amenities || '') : '';
    document.getElementById('room-amenitiesEn').value = room ? (room.amenitiesEn || '') : '';
    document.getElementById('room-status').value = room ? (room.status || 'available') : 'available';
    document.getElementById('room-order').value = room ? (room.order || 1) : currentRooms.length + 1;
    document.getElementById('room-imageUrl').value = room ? (room.imageUrl || '') : '';

    const preview = document.getElementById('room-img-preview');
    if (room && room.imageUrl) { preview.src = room.imageUrl; preview.style.display = 'block'; }
    else { preview.style.display = 'none'; }

    const area = document.getElementById('upload-area');
    area.classList.remove('has-file');
    area.querySelector('span').textContent = '📷 Bấm để chọn ảnh';
    document.getElementById('room-image-file').value = '';
    document.getElementById('room-modal').classList.add('show');
    refreshIcons();
};

window.closeRoomModal = function () {
    document.getElementById('room-modal').classList.remove('show');
};

window.editRoom = function (id) {
    const room = currentRooms.find(r => r.id === id);
    if (room) openRoomModal(room);
};

window.deleteRoom = async function (id, name) {
    if (!confirm(`Xoá phòng "${name}"? Không thể hoàn tác.`)) return;
    const room = currentRooms.find(r => r.id === id);
    if (room && room.imageUrl && room.imageUrl.includes('firebase')) {
        await FirebaseDB.deleteImage(room.imageUrl);
    }
    await FirebaseDB.deleteRoom(id);
};

let _pendingImageFile = null;

window.handleImagePreview = function (input) {
    const file = input.files[0];
    if (!file) return;
    _pendingImageFile = file;
    const preview = document.getElementById('room-img-preview');
    const area = document.getElementById('upload-area');
    preview.src = URL.createObjectURL(file);
    preview.style.display = 'block';
    area.classList.add('has-file');
    area.querySelector('span').textContent = '📷 ' + file.name;
};

/**
 * Nén ảnh phòng rồi trả về dạng data URI.
 *
 * Trước đây thu về 400px, chất lượng 0.5. Quá tay: thẻ phòng trên web hiển thị
 * rộng khoảng 800px, ảnh chi tiết còn lớn hơn — nên ảnh 400px bị kéo giãn gấp
 * đôi, nhìn mờ nhoè. Chủ khách sạn chụp ảnh đẹp bằng điện thoại, tải lên xong
 * thấy mờ thì họ mất tin vào trang.
 *
 * Trần thật sự nằm ở chỗ khác: ảnh lưu thẳng trong tài liệu Firestore, mà một
 * tài liệu tối đa 1MB. Data URI base64 phình thêm khoảng 33% so với tệp gốc,
 * nên ảnh phải dưới ~700KB. Vì vậy nén dần: bắt đầu ở 1400px chất lượng 0.82,
 * còn nặng thì hạ từng nấc cho tới khi vừa.
 */
const IMAGE_BUDGET_BYTES = 700 * 1024;

/**
 * Tải ảnh phòng lên ổ đĩa máy chủ, trả về đường dẫn để lưu vào Firestore.
 *
 * Trước đây ảnh bị nhồi thẳng vào tài liệu Firestore dưới dạng base64. Một
 * tài liệu tối đa 1 MB và base64 phình thêm một phần ba, nên ảnh buộc phải
 * nén xuống dưới 700 KB — đó chính là lý do hai tấm ảnh phòng đầu tiên chỉ
 * còn 400px và nhìn mờ khi thẻ phòng hiển thị rộng gấp đôi.
 *
 * Đường này ghi ra tệp thật nên không còn trần đó. Vẫn thu nhỏ về 2000px cho
 * khỏi tải lâu, nhưng giữ chất lượng 0.88 — thừa nét cho mọi khổ đang dùng.
 */
async function uploadRoomImage(file) {
    const blob = await shrinkToBlob(file, 2000, 0.88);
    const user = firebase.auth().currentUser;
    if (!user) throw new Error('Phiên đăng nhập đã hết, bạn đăng nhập lại nhé.');
    const token = await user.getIdToken();

    const res = await fetch('/v1/uploads/image', {
        method: 'POST',
        headers: { 'Content-Type': 'image/jpeg', Authorization: 'Bearer ' + token },
        body: blob,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((body.error && body.error.message) || 'Không tải được ảnh.');
    return body.url;
}

/** Thu nhỏ ảnh về cạnh dài tối đa rồi trả ra Blob JPEG. */
function shrinkToBlob(file, canhDai, chatLuong) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                let w = img.width, h = img.height;
                if (w > canhDai || h > canhDai) {
                    if (w > h) { h = Math.round(h * canhDai / w); w = canhDai; }
                    else { w = Math.round(w * canhDai / h); h = canhDai; }
                }
                const canvas = document.createElement('canvas');
                canvas.width = w; canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                canvas.toBlob(
                    (b) => (b ? resolve(b) : reject(new Error('Không nén được ảnh'))),
                    'image/jpeg',
                    chatLuong,
                );
            };
            img.onerror = () => reject(new Error('Không đọc được ảnh'));
            img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error('Không đọc được file'));
        reader.readAsDataURL(file);
    });
}

function compressImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // Từng nấc lùi: rộng tối đa, chất lượng
                const steps = [
                    [1400, 0.82], [1400, 0.72], [1100, 0.72],
                    [900, 0.68], [700, 0.62], [500, 0.55],
                ];
                let out = '';
                for (const [max, quality] of steps) {
                    let w = img.width, h = img.height;
                    if (w > max || h > max) {
                        if (w > h) { h = Math.round(h * max / w); w = max; }
                        else { w = Math.round(w * max / h); h = max; }
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = w; canvas.height = h;
                    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                    out = canvas.toDataURL('image/jpeg', quality);
                    // Ước lượng số byte thật từ độ dài chuỗi base64
                    if (out.length * 0.75 <= IMAGE_BUDGET_BYTES) break;
                }
                resolve(out);
            };
            img.onerror = () => reject(new Error('Không đọc được ảnh'));
            img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error('Không đọc được file'));
        reader.readAsDataURL(file);
    });
}

window.saveRoom = async function () {
    const price = Number(document.getElementById('room-price').value);
    const capacity = Number(document.getElementById('room-capacity').value);
    const order = Number(document.getElementById('room-order').value);
    const invalid = validateRoom({ name: document.getElementById('room-name').value, price, capacity, order });
    if (invalid) { alert(invalid); return; }
    const btn = document.getElementById('room-save-btn');
    btn.disabled = true;
    btn.textContent = 'Đang lưu…';
    try {
        const editId = document.getElementById('room-edit-id').value;
        let imageUrl = document.getElementById('room-imageUrl').value;

        if (_pendingImageFile) {
            try {
                imageUrl = await uploadRoomImage(_pendingImageFile);
            } catch (imgErr) {
                alert('Lỗi xử lý ảnh: ' + imgErr.message);
                return;
            }
        }
        if (!imageUrl) imageUrl = 'assets/homestay.jpg';

        const data = {
            name: document.getElementById('room-name').value,
            nameEn: document.getElementById('room-nameEn').value,
            price,
            capacity,
            description: document.getElementById('room-desc').value,
            descriptionEn: document.getElementById('room-descEn').value,
            amenities: document.getElementById('room-amenities').value,
            amenitiesEn: document.getElementById('room-amenitiesEn').value,
            status: document.getElementById('room-status').value,
            order,
            imageUrl,
        };

        await adminApi('/v1/admin/rooms' + (editId ? '/' + encodeURIComponent(editId) : ''), {
            method: editId ? 'PATCH' : 'POST', body: JSON.stringify(data),
        });

        _pendingImageFile = null;
        closeRoomModal();
    } catch (err) {
        alert('Lỗi lưu phòng: ' + err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="save"></i>Lưu phòng';
        refreshIcons();
    }
};

// ── LIÊN HỆ ──
async function loadContacts() {
    try {
        const contacts = await FirebaseDB.getContacts();
        currentContacts = contacts;
        renderContacts(contacts);
        document.getElementById('count-contacts').textContent = contacts.filter(c => !c.isRead).length;
    } catch (e) { console.error('Load contacts error:', e); }
}

function renderContacts(contacts) {
    const tbody = document.getElementById('contacts-tbody');
    if (!contacts.length) {
        tbody.innerHTML = emptyRow(6, 'mail', 'Chưa có tin nhắn nào.');
        refreshIcons();
        return;
    }
    tbody.innerHTML = contacts.map(c => `<tr${c.isRead ? '' : ' style="background:#fffdf2"'}>
        <td><div class="cell-main">${esc(c.name || '—')}</div><div class="cell-sub">${esc(c.phone || '')}</div></td>
        <td>${esc(c.email || '—')}</td>
        <td style="max-width:280px">${esc(c.message || '')}</td>
        <td class="cell-sub">${dateTimeText(c.createdAt)}</td>
        <td><span class="badge ${c.isRead ? 'badge-blue' : 'badge-yellow'}">${c.isRead ? 'Đã đọc' : 'Chưa đọc'}</span></td>
        <td>
            ${!c.isRead ? `<button class="btn btn-sm btn-blue" onclick="markRead('${c.id}')">Đã đọc</button>` : ''}
            <button class="btn btn-sm btn-red" onclick="removeContact('${c.id}')">🗑️</button>
        </td>
    </tr>`).join('');
    refreshIcons();
}

window.markRead = async function (id) {
    await FirebaseDB.markContactRead(id);
    loadContacts();
};

window.removeContact = async function (id) {
    if (confirm('Xoá tin nhắn này?')) { await FirebaseDB.deleteContact(id); loadContacts(); }
};

// ── CÀI ĐẶT ──
async function loadSettings() {
    try {
        const s = await FirebaseDB.getSettings();
        const map = {
            'set-name': s.siteName, 'set-phone': s.phone, 'set-email': s.email,
            'set-address': s.address, 'set-checkin': s.checkin, 'set-checkout': s.checkout,
        };
        for (const [id, value] of Object.entries(map)) {
            if (value) document.getElementById(id).value = value;
        }
    } catch (e) { console.error('Load settings error:', e); }
}

document.getElementById('settings-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        await FirebaseDB.updateSettings({
            siteName: document.getElementById('set-name').value,
            phone: document.getElementById('set-phone').value,
            email: document.getElementById('set-email').value,
            address: document.getElementById('set-address').value,
            checkin: document.getElementById('set-checkin').value,
            checkout: document.getElementById('set-checkout').value,
        });
        alert('Đã lưu cài đặt.');
    } catch (err) { alert('Lỗi: ' + err.message); }
});

// ════════════════════════════════════════════════════════════
// LỄ HỘI & SỰ KIỆN
// ════════════════════════════════════════════════════════════
// Lễ Khmer (Chôl Chnăm Thmây, Sen Đôlta, Ok Om Bok) và hội đua bò Bảy Núi
// chạy theo âm lịch Khmer nên năm nào cũng lệch ngày dương lịch. Không có
// công thức nào tính chuẩn được, mà đoán sai còn tệ hơn không có — nên
// admin nhập tay theo thông báo của địa phương. Bộ sinh lịch trình đọc
// bảng này: chuyến của khách trùng ngày nào thì tự chèn sự kiện vào.
const Events = (() => {
    let rows = [];
    let places = [];
    // Danh sách loại lấy từ server khi nạp; để sẵn bản dự phòng để form vẫn
    // dùng được ngay cả khi lần gọi đầu chưa xong.
    let categories = [
        { value: 'le-hoi', label: 'Lễ hội' },
        { value: 'the-thao', label: 'Thể thao dân gian' },
        { value: 'am-thuc', label: 'Ẩm thực' },
        { value: 'cho-phien', label: 'Chợ phiên' },
        { value: 'khac', label: 'Khác' },
    ];

    async function load() {
        try {
            const res = await adminApi('/v1/admin/events');
            rows = res.data || [];
            if (res.categories?.length) categories = res.categories;
            render();
            const badge = document.getElementById('count-events');
            if (badge) badge.textContent = rows.length;
        } catch (err) {
            const body = document.getElementById('events-tbody');
            if (body) body.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--muted)">${esc(err.message)}</td></tr>`;
        }
    }

    async function loadPlaces() {
        if (places.length) return;
        try {
            places = (await (await fetch('/v1/places')).json()).data || [];
        } catch (_) { places = []; }
    }

    function render() {
        const body = document.getElementById('events-tbody');
        if (!body) return;
        if (!rows.length) {
            body.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--muted)">'
                + 'Chưa có sự kiện nào. Bấm "Tạo mẫu" để có sẵn vài sự kiện rồi sửa lại ngày cho đúng.</td></tr>';
            return;
        }
        const today = new Date().toISOString().slice(0, 10);
        body.innerHTML = rows.map(e => {
            const past = (e.end_date || e.start_date) < today;
            const range = e.end_date && e.end_date !== e.start_date
                ? `${dmy(e.start_date)} – ${dmy(e.end_date)}` : dmy(e.start_date);
            return `
            <tr style="${past ? 'opacity:.5' : ''}">
                <td>
                    <strong>${esc(e.name)}</strong>
                    ${e.summary ? `<div style="font-size:12.5px;color:var(--muted);margin-top:3px">${esc(e.summary)}</div>` : ''}
                </td>
                <td>${esc(e.category_label)}</td>
                <td>${range}<div style="font-size:12.5px;color:var(--muted)">${esc(e.start_time)}${past ? ' · đã qua' : ''}</div></td>
                <td>${esc(e.area || '—')}</td>
                <td>${esc(e.ticket || 'Miễn phí')}</td>
                <td style="white-space:nowrap">
                    <button class="btn btn-outline btn-sm" onclick="Events.edit('${esc(e.id)}')">Sửa</button>
                    <button class="btn btn-outline btn-sm" onclick="Events.remove('${esc(e.id)}')">Xoá</button>
                </td>
            </tr>`;
        }).join('');
    }

    async function openForm(event) {
        await loadPlaces();
        document.getElementById('event-form-card').style.display = '';
        document.getElementById('ev-error').textContent = '';
        document.getElementById('event-form-title').textContent = event ? 'Sửa sự kiện' : 'Thêm sự kiện';

        document.getElementById('ev-category').innerHTML = categories
            .map(c => `<option value="${esc(c.value)}">${esc(c.label)}</option>`).join('');
        document.getElementById('ev-place').innerHTML = '<option value="">— Không gắn —</option>'
            + places.map(p => `<option value="${esc(p.slug)}">${esc(p.name)}</option>`).join('');

        const set = (id, value) => { document.getElementById(id).value = value || ''; };
        set('ev-id', event?.id);
        set('ev-name', event?.name);
        set('ev-category', event?.category || 'le-hoi');
        set('ev-start', event?.start_date);
        set('ev-end', event?.end_date);
        set('ev-time', event?.start_time || '08:00');
        set('ev-area', event?.area);
        set('ev-ticket', event?.ticket || 'Miễn phí');
        set('ev-place', event?.place_slug);
        set('ev-summary', event?.summary);
        set('ev-detail', event?.detail);

        document.getElementById('event-form-card').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    const closeForm = () => { document.getElementById('event-form-card').style.display = 'none'; };

    const edit = (id) => openForm(rows.find(e => e.id === id));

    async function save() {
        const val = (id) => document.getElementById(id).value.trim();
        const id = val('ev-id');
        const body = {
            name: val('ev-name'),
            category: val('ev-category'),
            start_date: val('ev-start'),
            end_date: val('ev-end'),
            start_time: val('ev-time'),
            area: val('ev-area'),
            ticket: val('ev-ticket'),
            place_slug: val('ev-place'),
            summary: val('ev-summary'),
            detail: val('ev-detail'),
        };
        const error = document.getElementById('ev-error');
        error.textContent = '';
        try {
            await adminApi(id ? `/v1/admin/events/${id}` : '/v1/admin/events', {
                method: id ? 'PATCH' : 'POST',
                body: JSON.stringify(body),
            });
            closeForm();
            await load();
        } catch (err) {
            error.textContent = err.message;
        }
    }

    async function remove(id) {
        const found = rows.find(e => e.id === id);
        if (!confirm(`Xoá sự kiện "${found?.name || id}"?`)) return;
        try {
            await adminApi(`/v1/admin/events/${id}`, { method: 'DELETE' });
            await load();
        } catch (err) {
            alert(err.message);
        }
    }

    async function seed() {
        try {
            const res = await adminApi('/v1/admin/events/seed', { method: 'POST' });
            alert(res.message);
            await load();
        } catch (err) {
            alert(err.message);
        }
    }

    return { load, openForm, closeForm, edit, save, remove, seed };
})();

window.Events = Events;

refreshIcons();

})();
