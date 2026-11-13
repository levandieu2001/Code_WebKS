// ============================================================
// LOCALMATE — In mã QR đóng dấu Hộ chiếu
// ============================================================
// Đây là mắt xích VẬT LÝ của Hộ chiếu LOCALMATE. Phần mềm đã xong hết, nhưng
// nếu không có tấm QR dán ngoài thực địa thì con dấu không đóng được — cả
// tính năng nằm im.
//
// Vì sao phải in từ đây thay vì tự chép link ra trang tạo QR bên ngoài:
//   - Mã có chuỗi ngẫu nhiên (9d46f16c66). Chép tay sai một ký tự là khách
//     đứng tại điểm quét ra "Mã QR không hợp lệ" — mất mặt ngay trước khách.
//   - Sáu điểm, mỗi lần đổi PASSPORT_SECRET hay thêm điểm là làm lại từ đầu.
//   - Chủ homestay không phải lập trình viên.
//
// Dưới mỗi mã có in kèm đường link dạng chữ. Nếu dịch vụ tạo ảnh QR trục
// trặc, vẫn còn link để tạo lại bằng công cụ khác — không bị kẹt.
// ============================================================

const AdminPassport = (() => {
    const $ = (id) => document.getElementById(id);
    const esc = (s) => String(s == null ? '' : s)
        .replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

    const state = { stations: [], rewards: [], stationCount: 0 };

    // Ảnh QR lấy từ dịch vụ miễn phí, không cần khoá API — giống cách đang
    // làm với VietQR và bản đồ OpenStreetMap.
    const qrImage = (url) =>
        `https://api.qrserver.com/v1/create-qr-code/?size=700x700&margin=12&ecc=M&data=${encodeURIComponent(url)}`;

    // admin.js bọc toàn bộ trong IIFE nên adminApi() KHÔNG ra tới đây được.
    // Tự lấy token từ phiên Firebase — vẫn đúng một cơ chế xác thực, chỉ là
    // không mượn hàm của file khác.
    async function api(path, options = {}) {
        const user = window.firebase?.auth?.().currentUser;
        if (!user) throw new Error('Chưa đăng nhập quản trị.');
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

    // ── Điểm đóng dấu ───────────────────────────────────────
    async function loadStations() {
        const t = $('pq-stations');
        if (!t) return;
        try {
            const r = await api('/v1/admin/passport/stations');
            state.stations = r.data;
            t.innerHTML = `
                <thead><tr><th>Điểm</th><th>Khu vực</th><th>Toạ độ</th><th>Mã QR</th><th>Trạng thái</th><th></th></tr></thead>
                <tbody>${r.data.map(x => `
                    <tr class="${x.active ? '' : 'pq-off'}">
                        <td><b>${esc(x.symbol)}</b> · ${esc(x.name)}</td>
                        <td>${esc(x.area || '—')}</td>
                        <td>${x.lat}, ${x.lng}</td>
                        <td><code style="font-size:12px">${esc(x.code)}</code></td>
                        <td>${x.active ? 'Đang bật' : 'Đã tắt'}</td>
                        <td style="white-space:nowrap">
                            <button class="btn btn-outline btn-sm" onclick="AdminPassport.editStation('${esc(x.id)}')">Sửa</button>
                            <button class="btn btn-outline btn-sm" onclick="AdminPassport.delStation('${esc(x.id)}','${esc(x.name)}')">Xoá</button>
                        </td>
                    </tr>`).join('')}</tbody>`;
        } catch (err) {
            t.innerHTML = `<tbody><tr><td style="padding:18px">${esc(err.message)}</td></tr></tbody>`;
        }
    }

    function editStation(id = '') {
        const x = state.stations.find(s => s.id === id) || {};
        dialog({
            title: id ? 'Sửa điểm đóng dấu' : 'Thêm điểm đóng dấu',
            hint: id
                ? 'Đổi tên hay toạ độ đều được, mã QR đã in vẫn dùng tiếp — mã gắn với điểm chứ không gắn với tên.'
                : 'Lấy toạ độ bằng cách mở Google Maps, bấm giữ vào đúng chỗ, rồi chép hai số hiện ra.',
            fields: `
                <label>Tên điểm</label>
                <input id="f-name" value="${esc(x.name || '')}" placeholder="VD: Chùa Vạn Linh">
                <label>Khu vực</label>
                <input id="f-area" value="${esc(x.area || '')}" placeholder="VD: Núi Cấm, Tịnh Biên">
                <div class="pq-two">
                    <div><label>Vĩ độ (lat)</label><input id="f-lat" value="${x.lat ?? ''}" placeholder="10.5133"></div>
                    <div><label>Kinh độ (lng)</label><input id="f-lng" value="${x.lng ?? ''}" placeholder="105.0042"></div>
                </div>
                <div class="pq-two">
                    <div><label>Chữ trên dấu</label><input id="f-symbol" maxlength="1" value="${esc(x.symbol || '')}" placeholder="V"></div>
                    <div><label>Trạng thái</label>
                        <select id="f-active" class="pq-select">
                            <option value="1" ${x.active !== false ? 'selected' : ''}>Đang bật</option>
                            <option value="0" ${x.active === false ? 'selected' : ''}>Tắt tạm</option>
                        </select>
                    </div>
                </div>`,
            onSave: () => api('/v1/admin/passport/stations', {
                method: 'POST',
                body: JSON.stringify({
                    id,
                    name: $('f-name').value,
                    area: $('f-area').value,
                    lat: $('f-lat').value,
                    lng: $('f-lng').value,
                    symbol: $('f-symbol').value,
                    active: $('f-active').value === '1',
                }),
            }),
            after: () => { loadStations(); load(); },
        });
    }

    async function delStation(id, name) {
        // Xoá điểm là tấm QR ngoài thực địa thành vô dụng — hỏi cho chắc
        const warn = 'Xoá điểm "' + name + '"?\n\n'
            + 'Con dấu khách đã đóng vẫn được giữ, nhưng tấm QR dán ngoài thực địa sẽ không dùng được nữa.';
        if (!confirm(warn)) return;
        try {
            const r = await api('/v1/admin/passport/stations/' + id, { method: 'DELETE' });
            alert(r.message);
            loadStations();
            load();
        } catch (err) { alert(err.message); }
    }

    // ── Phần thưởng ─────────────────────────────────────────
    async function loadRewards() {
        const t = $('pq-rewards');
        if (!t) return;
        try {
            const r = await api('/v1/admin/passport/rewards');
            state.rewards = r.data;
            state.stationCount = r.station_count;
            t.innerHTML = `
                <thead><tr><th>Phần thưởng</th><th>Cần</th><th>Mã</th><th>Nơi áp dụng</th><th>Trạng thái</th><th></th></tr></thead>
                <tbody>${r.data.map(x => `
                    <tr class="${x.active ? '' : 'pq-off'}">
                        <td><b>${esc(x.title)}</b><br><span style="font-size:12.5px;color:var(--muted)">${esc(x.note || '')}</span></td>
                        <td>${x.need} dấu</td>
                        <td><code style="font-size:12px">${esc(x.code)}</code></td>
                        <td>${esc(x.partner || 'LOCALMATE')}</td>
                        <td>${x.active ? 'Đang bật' : 'Đã tắt'}</td>
                        <td style="white-space:nowrap">
                            <button class="btn btn-outline btn-sm" onclick="AdminPassport.editReward('${esc(x.id)}')">Sửa</button>
                            <button class="btn btn-outline btn-sm" onclick="AdminPassport.delReward('${esc(x.id)}','${esc(x.title)}')">Xoá</button>
                        </td>
                    </tr>`).join('')}</tbody>`;
        } catch (err) {
            t.innerHTML = `<tbody><tr><td style="padding:18px">${esc(err.message)}</td></tr></tbody>`;
        }
    }

    function editReward(id = '') {
        const x = state.rewards.find(r => r.id === id) || {};
        const total = state.stationCount || 0;
        dialog({
            title: id ? 'Sửa phần thưởng' : 'Thêm phần thưởng',
            hint: 'Hiện có ' + total + ' điểm đóng dấu, nên mốc cao nhất đặt được là ' + total + ' dấu. '
                + 'Khách đủ dấu sẽ thấy mã này trong hộ chiếu và đọc cho nhân viên.',
            fields: `
                <label>Tên phần thưởng</label>
                <input id="f-title" value="${esc(x.title || '')}" placeholder="VD: Tặng quà lưu niệm miền Tây">
                <label>Mô tả / điều kiện</label>
                <textarea id="f-note" rows="2" placeholder="VD: Nhận tại quầy lễ tân khi trả phòng.">${esc(x.note || '')}</textarea>
                <div class="pq-two">
                    <div><label>Cần bao nhiêu dấu</label><input id="f-need" type="number" min="1" max="${total || 99}" value="${x.need ?? 3}"></div>
                    <div><label>Mã đổi thưởng</label><input id="f-code" value="${esc(x.code || '')}" placeholder="Trống sẽ tự tạo"></div>
                </div>
                <label>Nơi áp dụng</label>
                <input id="f-partner" value="${esc(x.partner || '')}" placeholder="VD: LOCALMATE">
                <label>Trạng thái</label>
                <select id="f-ractive" class="pq-select">
                    <option value="1" ${x.active !== false ? 'selected' : ''}>Đang bật</option>
                    <option value="0" ${x.active === false ? 'selected' : ''}>Tắt tạm</option>
                </select>`,
            onSave: () => api('/v1/admin/passport/rewards', {
                method: 'POST',
                body: JSON.stringify({
                    id,
                    title: $('f-title').value,
                    note: $('f-note').value,
                    need: $('f-need').value,
                    code: $('f-code').value,
                    partner: $('f-partner').value,
                    active: $('f-ractive').value === '1',
                }),
            }),
            after: loadRewards,
        });
    }

    async function delReward(id, title) {
        if (!confirm('Xoá phần thưởng "' + title + '"?')) return;
        try {
            const r = await api('/v1/admin/passport/rewards/' + id, { method: 'DELETE' });
            alert(r.message);
            loadRewards();
        } catch (err) { alert(err.message); }
    }

    /** Hộp thoại dùng chung cho cả điểm lẫn phần thưởng. */
    function dialog({ title, hint, fields, onSave, after }) {
        const box = document.createElement('div');
        box.className = 'pq-dlg';
        box.innerHTML = `
            <div class="pq-dlg-box">
                <h4>${esc(title)}</h4>
                <p class="hint">${esc(hint)}</p>
                ${fields}
                <p class="pq-dlg-err" id="f-err" hidden></p>
                <div class="pq-dlg-actions">
                    <button class="pq-cancel" type="button">Huỷ</button>
                    <button class="pq-save" type="button">Lưu</button>
                </div>
            </div>`;
        document.body.appendChild(box);

        box.querySelector('.pq-cancel').onclick = () => box.remove();
        box.querySelector('.pq-save').onclick = async () => {
            const err = $('f-err');
            err.hidden = true;
            try {
                const r = await onSave();
                box.remove();
                if (r && r.message) alert(r.message);
                if (after) after();
            } catch (e) {
                err.textContent = e.message;
                err.hidden = false;
            }
        };
    }

    async function load() {
        const sheet = $('pq-sheet');
        if (!sheet) return;
        sheet.innerHTML = '<p class="no-print" style="padding:20px">Đang tạo mã…</p>';

        let r;
        try {
            r = await api('/v1/admin/passport/qr');
        } catch (err) {
            sheet.innerHTML = `<p class="no-print" style="padding:20px">${esc(err.message)}</p>`;
            return;
        }

        if ($('pq-radius')) $('pq-radius').textContent = r.radius_m;

        // Mã QR trỏ về đúng địa chỉ máy chủ đang chạy. Đang chạy ở localhost
        // thì tấm in ra CHỈ quét được trên chính máy này — phải cảnh báo, chứ
        // để in ra rồi mang đi dán mới phát hiện thì tốn tiền ép plastic.
        const local = /localhost|127\.0\.0\.1|10\.0\.2\.2/.test(r.data[0]?.url || '');
        const warn = $('pq-warn');
        if (warn) {
            warn.hidden = !local;
            warn.innerHTML = local
                ? '<b>Khoan in đã.</b> Máy chủ đang chạy ở địa chỉ nội bộ, nên mã in ra chỉ quét được '
                + 'trên chính máy tính này. Hãy đưa máy chủ lên tên miền thật (hoặc IP mạng LAN) rồi '
                + 'mở lại trang này để lấy mã đúng.'
                : '';
        }

        sheet.innerHTML = r.data.map(st => `
            <article class="pq-card">
                <div class="pq-brand">HỘ CHIẾU BẢY NÚI</div>
                <h3>${esc(st.name)}</h3>
                ${st.area ? `<div class="pq-area">${esc(st.area)}</div>` : ''}

                <img class="pq-qr" src="${qrImage(st.url)}" alt="Mã QR đóng dấu ${esc(st.name)}"
                     onerror="this.classList.add('pq-broken')">

                <p class="pq-how">Giơ camera điện thoại lên mã này<br><b>để đóng dấu Hộ chiếu LOCALMATE</b></p>
                <p class="pq-sub">Không cần cài ứng dụng · Nhớ bật định vị</p>

                <div class="pq-url">${esc(st.url)}</div>
            </article>`).join('');
    }

    document.addEventListener('DOMContentLoaded', () => {
        document.querySelector('[data-tab="passport"]')?.addEventListener('click', () => setTimeout(() => {
            loadStations();
            loadRewards();
            load();
        }, 100));
    });

    return { load, loadStations, loadRewards, editStation, delStation, editReward, delReward };
})();

window.AdminPassport = AdminPassport;
