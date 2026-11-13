// ============================================================
// LOCALMATE — Cài đặt tài khoản
// ============================================================
// Trước đây mỗi lần đặt đặc sản khách phải gõ lại từ đầu: họ tên, số điện
// thoại, rồi cả cái địa chỉ dài "số nhà, đường, xã, huyện, tỉnh". Gõ trên
// điện thoại thì đó đúng là chỗ người ta bỏ dở nhiều nhất.
//
// SỔ ĐỊA CHỈ chứ không phải một dòng địa chỉ duy nhất: người ta hay gửi về
// nhà mình, mà cũng hay gửi biếu về quê hay gửi tới cơ quan. Ba chỗ khác
// nhau, ép chọn một là lần sau lại gõ tay.
//
// Khách KHÔNG đăng nhập vẫn đặt hàng được như thường — đây là thứ đỡ mất
// công cho người có tài khoản, không phải hàng rào bắt người ta đăng ký.
// ============================================================

(() => {
    'use strict';

    const $ = (id) => document.getElementById(id);
    const esc = (s) => String(s == null ? '' : s)
        .replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const T = (vi, en) => (window.LMLang ? LMLang.T(vi, en) : vi);

    let HS = null;          // hồ sơ đang hiển thị
    let dangSua = null;     // id địa chỉ đang sửa, '' = thêm mới, null = không mở

    // BayNuiUser la phien cua KHACH. BayNuiAuth la phien DOI TAC — dung nham
    // thi trang nay doc ho so cua tai khoan doi tac dang dang nhap tren cung
    // may, hoac bao chua dang nhap trong khi khach da dang nhap roi.
    const api = (duong, opt) => BayNuiUser.api(duong, opt);

    async function nap() {
        const host = $('tk-body');
        if (!window.BayNuiUser || !BayNuiUser.coPhien()) {
            return veChuaDangNhap();
        }

        try {
            HS = (await api('/v1/my/profile')).data;
        } catch (err) {
            // 401 nghĩa là phiên hết hạn — nói đúng chuyện đó, đừng bắt họ
            // đoán vì sao trang trống.
            if (/401|đăng nhập/i.test(err.message)) return veChuaDangNhap();
            host.innerHTML = '<div class="tk-trong">' + esc(err.message) + '</div>';
            return;
        }
        ve();
    }

    function veChuaDangNhap() {
        $('tk-body').innerHTML =
            '<div class="tk-cong">'
            + '<i data-lucide="user-round-cog" style="width:44px;height:44px;color:#7a879c"></i>'
            + '<h2 style="margin-top:14px">' + T('Bạn chưa đăng nhập', 'You are not signed in') + '</h2>'
            + '<p>' + T('Đăng nhập để lưu sẵn họ tên, số điện thoại và sổ địa chỉ giao hàng — '
                + 'lần sau đặt hàng khỏi gõ lại từ đầu.',
                'Sign in to save your name, phone and delivery addresses so you do not have to '
                + 'type them again next time.') + '</p>'
            + '<button class="lm-btn lm-btn-cta" style="padding:13px 26px" '
            + 'onclick="BayNuiAccount.moHop(false)">'
            + T('Đăng nhập / Đăng ký', 'Sign in / Sign up') + '</button>'
            + '</div>';
        if (window.lucide) lucide.createIcons();
    }

    function ve() {
        $('tk-body').innerHTML =
            '<div class="tk-head"><h1>' + T('Cài đặt tài khoản', 'Account settings') + '</h1>'
            + '<p>' + T('Lưu sẵn ở đây thì lúc đặt hàng chỉ việc chọn, khỏi gõ lại.',
                'Saved here once, then just pick it when you order.') + '</p></div>'
            + veThongTin()
            + veSoDiaChi();
        if (window.lucide) lucide.createIcons();
    }

    function veThongTin() {
        return '<div class="tk-khoi">'
            + '<h2>' + T('Thông tin của bạn', 'Your details') + '</h2>'
            + '<p>' + T('Dùng để điền sẵn khi bạn đặt phòng, đặt tour hay đặt đặc sản.',
                'Used to pre-fill your bookings and orders.') + '</p>'
            + '<div class="tk-luoi">'
            + '<div class="tk-f"><label>' + T('Họ và tên', 'Full name') + '</label>'
            + '<input id="tk-ten" maxlength="120" value="' + esc(HS.full_name) + '" '
            + 'placeholder="Nguyễn Văn A"></div>'
            + '<div class="tk-f"><label>' + T('Số điện thoại', 'Phone') + '</label>'
            + '<input id="tk-sdt" inputmode="tel" maxlength="20" value="' + esc(HS.phone) + '" '
            + 'placeholder="0909 xxx xxx">'
            + '<small>' + T('Bên cung cấp gọi số này để xác nhận đơn.',
                'Providers call this number to confirm your order.') + '</small></div>'
            + '</div>'
            + '<div class="tk-f" style="margin-top:14px"><label>'
            + T('Email đăng nhập', 'Sign-in email') + '</label>'
            + '<input value="' + esc(HS.email || '') + '" disabled>'
            + '<small>' + T('Đổi email thì cần tạo tài khoản mới — email là thứ dùng để đăng nhập.',
                'Changing email requires a new account — it is your sign-in name.') + '</small></div>'
            + '<div class="tk-luu">'
            + '<button class="lm-btn lm-btn-cta" style="padding:12px 22px" '
            + 'onclick="TaiKhoan.luuThongTin()">' + T('Lưu thông tin', 'Save') + '</button>'
            + '<span class="tk-bao" id="tk-bao"></span>'
            + '</div></div>';
    }

    function veSoDiaChi() {
        const ds = HS.addresses || [];

        const the = ds.map(a =>
            '<div class="tk-dc' + (a.is_default ? ' mac-dinh' : '') + '">'
            + (a.label ? '<h3 class="tk-address-label">' + esc(a.label) + '</h3>' : '')
            + '<div class="tk-dc-top"><div>'
            + '<b>' + esc(a.receiver) + '</b> '
            + '<span class="sdt">' + esc(a.phone) + '</span>'
            + '</div>'
            + (a.is_default
                ? '<span class="tk-dc-nhan">' + T('Mặc định', 'Default') + '</span>'
                : '')
            + '</div>'
            + '<p>' + esc(a.address) + '</p>'
            + '<div class="tk-dc-nut">'
            + '<button onclick="TaiKhoan.suaDiaChi(\'' + esc(a.id) + '\')">'
            + T('Sửa', 'Edit') + '</button>'
            + (a.is_default ? ''
                : '<button onclick="TaiKhoan.datMacDinh(\'' + esc(a.id) + '\')">'
                  + T('Đặt làm mặc định', 'Set as default') + '</button>')
            + '<button class="xoa" onclick="TaiKhoan.xoaDiaChi(\'' + esc(a.id) + '\')">'
            + T('Xoá', 'Delete') + '</button>'
            + '</div></div>').join('');

        return '<div class="tk-khoi">'
            + '<h2>' + T('Sổ địa chỉ giao hàng', 'Delivery addresses') + '</h2>'
            + '<p>' + T('Lưu vài chỗ hay gửi tới — nhà mình, nhà bố mẹ, cơ quan — rồi lúc đặt '
                + 'đặc sản chỉ việc chọn.',
                'Save the places you often ship to, then just pick one when ordering.') + '</p>'
            + (ds.length ? the : '<div class="tk-trong">'
                + T('Chưa có địa chỉ nào. Thêm một cái để lần sau đặt đặc sản khỏi gõ lại.',
                    'No addresses yet. Add one so you do not have to type it again.')
                + '</div>')
            + '<div id="tk-dc-form"></div>'
            + '<button class="lm-btn" style="margin-top:14px;padding:11px 20px" '
            + 'onclick="TaiKhoan.themDiaChi()"><i data-lucide="plus"></i> '
            + T('Thêm địa chỉ', 'Add address') + '</button>'
            + '</div>';
    }

    // ── Thông tin cá nhân ───────────────────────────────────
    function bao(chu, ok) {
        const el = $('tk-bao');
        if (!el) return;
        el.textContent = chu;
        el.className = 'tk-bao ' + (ok ? 'ok' : 'loi');
        if (ok) setTimeout(() => { el.textContent = ''; }, 4000);
    }

    async function luuThongTin() {
        try {
            const r = await api('/v1/my/profile', {
                method: 'PATCH',
                body: JSON.stringify({
                    full_name: ($('tk-ten').value || '').trim(),
                    phone: ($('tk-sdt').value || '').trim(),
                }),
            });
            HS = { ...HS, ...r.data };
            // Nhớ số để chuông thông báo và trang tra đơn dùng chung
            if (HS.phone) {
                try { localStorage.setItem('baynui_lookup_phone', HS.phone); } catch (_) { /* thoi */ }
            }
            bao(T('Đã lưu.', 'Saved.'), true);
        } catch (err) {
            bao(err.message, false);
        }
    }

    // ── Sổ địa chỉ ──────────────────────────────────────────
    function themDiaChi() { moForm(''); }
    function suaDiaChi(id) { moForm(id); }

    function moForm(id) {
        dangSua = id;
        const a = id ? (HS.addresses || []).find(x => x.id === id) : null;
        const daCo = (HS.addresses || []).length;

        $('tk-dc-form').innerHTML =
            '<div class="tk-dc" style="margin-top:14px;border-style:dashed">'
            + '<div class="tk-luoi">'
            + '<div class="tk-f"><label>' + T('Tên người nhận *', 'Recipient *') + '</label>'
            + '<input id="dc-ten" maxlength="120" value="' + esc(a ? a.receiver : (HS.full_name || '')) + '"></div>'
            + '<div class="tk-f"><label>' + T('Số điện thoại *', 'Phone *') + '</label>'
            + '<input id="dc-sdt" inputmode="tel" maxlength="20" value="'
            + esc(a ? a.phone : (HS.phone || '')) + '"></div>'
            + '</div>'
            + '<div class="tk-f" style="margin-top:14px"><label>'
            + T('Địa chỉ đầy đủ *', 'Full address *') + '</label>'
            + '<textarea id="dc-dc" rows="2" maxlength="300" placeholder="'
            + T('Số nhà, đường, xã/phường, huyện, tỉnh', 'Street, ward, district, province')
            + '">' + esc(a ? a.address : '') + '</textarea></div>'
            + '<div class="tk-f" style="margin-top:14px"><label>'
            + T('Đặt tên cho chỗ này', 'Label') + '</label>'
            + '<input id="dc-nhan" maxlength="40" value="' + esc(a ? a.label : '') + '" '
            + 'placeholder="' + T('Nhà riêng, Cơ quan, Nhà bố mẹ…', 'Home, Office, Parents…') + '">'
            + '<small>' + T('Để phân biệt khi bạn có nhiều địa chỉ.',
                'Helps you tell them apart.') + '</small></div>'
            + '<label style="display:flex;align-items:center;gap:9px;margin-top:14px;'
            + 'font-size:14px;cursor:pointer">'
            + '<input type="checkbox" id="dc-md" style="width:17px;height:17px"'
            + ((a && a.is_default) || !daCo ? ' checked' : '')
            + ((a && a.is_default) || !daCo ? ' disabled' : '') + '>'
            + T('Dùng làm địa chỉ mặc định', 'Use as default address') + '</label>'
            + (!daCo
                ? '<small style="display:block;margin-top:5px;color:var(--lm-muted)">'
                  + T('Địa chỉ đầu tiên luôn là mặc định.', 'The first address is always the default.')
                  + '</small>'
                : '')
            + '<div class="tk-bao loi" id="dc-loi" style="margin-top:12px"></div>'
            + '<div class="tk-dc-nut" style="margin-top:14px">'
            + '<button onclick="TaiKhoan.dongForm()">' + T('Bỏ qua', 'Cancel') + '</button>'
            + '</div>'
            + '<button class="lm-btn lm-btn-cta" style="margin-top:10px;padding:11px 22px" '
            + 'onclick="TaiKhoan.luuDiaChi()">' + T('Lưu địa chỉ', 'Save address') + '</button>'
            + '</div>';

        $('tk-dc-form').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        if (window.lucide) lucide.createIcons();
    }

    function dongForm() {
        dangSua = null;
        $('tk-dc-form').innerHTML = '';
    }

    async function luuDiaChi() {
        const el = $('dc-loi');
        el.textContent = '';
        try {
            const r = await api('/v1/my/addresses', {
                method: 'POST',
                body: JSON.stringify({
                    id: dangSua || '',
                    receiver: ($('dc-ten').value || '').trim(),
                    phone: ($('dc-sdt').value || '').trim(),
                    address: ($('dc-dc').value || '').trim(),
                    label: ($('dc-nhan').value || '').trim(),
                    is_default: $('dc-md').checked,
                }),
            });
            HS = { ...HS, ...r.data };
            dangSua = null;
            ve();
        } catch (err) {
            el.textContent = err.message;
        }
    }

    async function datMacDinh(id) {
        const a = (HS.addresses || []).find(x => x.id === id);
        if (!a) return;
        try {
            const r = await api('/v1/my/addresses', {
                method: 'POST',
                body: JSON.stringify({
                    id: a.id, receiver: a.receiver, phone: a.phone,
                    address: a.address, label: a.label, is_default: true,
                }),
            });
            HS = { ...HS, ...r.data };
            ve();
        } catch (err) {
            alert(err.message);
        }
    }

    async function xoaDiaChi(id) {
        const a = (HS.addresses || []).find(x => x.id === id);
        if (!a) return;
        if (!confirm(T('Xoá địa chỉ này?\n\n', 'Delete this address?\n\n') + a.address)) return;
        try {
            const r = await api('/v1/my/addresses/' + encodeURIComponent(id), { method: 'DELETE' });
            HS = { ...HS, ...r.data };
            ve();
        } catch (err) {
            alert(err.message);
        }
    }

    // Đăng nhập hoặc đăng xuất ngay trên trang này thì vẽ lại
    document.addEventListener('baynui:signin', nap);
    document.addEventListener('baynui:signout', veChuaDangNhap);
    document.addEventListener('lmlang', () => { if (HS) ve(); });
    document.addEventListener('DOMContentLoaded', nap);

    window.TaiKhoan = {
        luuThongTin, themDiaChi, suaDiaChi, luuDiaChi, dongForm, datMacDinh, xoaDiaChi,
    };
})();
