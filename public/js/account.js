// ============================================================
// LOCALMATE — Tài khoản khách trên web
// ============================================================
// Trước đây web KHÔNG hề có chỗ đăng nhập cho khách. Chỉ admin và đối tác có.
//
// Hậu quả: khách tạo tài khoản trong app, mở web ra thì web không biết họ là
// ai. Đơn đặt, hộ chiếu, nhật ký đều gắn với tài khoản mà web không đọc được —
// nên trang Nhật ký phải bắt gõ lại số điện thoại, còn Đơn của tôi cũng vậy.
//
// API tài khoản đã có sẵn từ lâu (/v1/auth/login, /v1/auth/register) và app
// đang dùng. Chỉ thiếu mỗi giao diện phía web.
//
// File này tự chèn nút tài khoản vào thanh điều hướng và dựng hộp đăng nhập,
// nên mọi trang chỉ cần nạp nó là có — khỏi sửa tay từng file HTML.
// ============================================================

(() => {
    'use strict';

    const esc = (s) => String(s == null ? '' : s)
        .replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

    const EN = () => localStorage.getItem('baynui_lang') === 'en';
    const T = (vi, en) => (EN() ? en : vi);

    // Những trang thuộc về tài khoản. Đưa vào menu này thay vì để chật thanh
    // điều hướng chính — thanh đó dành cho thứ khách chưa đăng nhập cũng cần.
    const MUC = [
        { href: 'donhang.html', vi: 'Đơn của tôi', en: 'My bookings', icon: 'luggage' },
        { href: 'taikhoan.html', vi: 'Cài đặt tài khoản', en: 'Account settings', icon: 'user-round-cog' },
        { href: 'hochieu.html', vi: 'Hộ chiếu LOCALMATE', en: 'LOCALMATE Passport', icon: 'ticket' },
        { href: 'nhatky.html', vi: 'Nhật ký chuyến đi', en: 'Trip journal', icon: 'book-open' },
    ];

    /**
     * Lối vào phần đối tác.
     *
     * Đang có phiên đối tác thì vào thẳng kênh làm việc; chưa có thì tới trang
     * đăng ký. Đọc localStorage chứ không gọi máy chủ: menu này vẽ ngay lúc mở
     * trang, chờ một lời gọi mạng chỉ để chọn chữ hiện lên là không đáng.
     *
     * Đây là chỗ hợp lý cho nó: đối tác cũng là chuyện tài khoản, mà thanh
     * điều hướng chính thì để dành cho thứ khách chưa đăng nhập cũng cần.
     */
    /**
     * Sau khi dang nhap, hoi may chu xem tai khoan nay co phai doi tac da
     * duyet khong.
     *
     * Hai phien duoc luu rieng: baynui_user_* cho khach, baynui_partner_* cho
     * doi tac. Truoc day menu chi nhin vao phien doi tac, nen chu nha dang
     * nhap bang chinh email doi tac o o tai khoan thuong van thay dong "Tro
     * thanh doi tac" — trong khi ho DA la doi tac roi.
     *
     * Cung mot tai khoan Firebase, cung mot the dang nhap, nen chep sang phien
     * doi tac la hop le. Danh dau lai de luc thoat con biet ma don.
     */
    async function nhanRaDoiTac(phien) {
        if (!phien || !phien.token) return false;
        try {
            const r = await fetch('/v1/partner/me', {
                headers: { Authorization: 'Bearer ' + phien.token },
            });
            if (!r.ok) return false;
            const d = await r.json();
            if (!d.partner || d.partner.status !== 'approved') return false;
            if (window.BayNuiAuth) {
                BayNuiAuth.save(phien);
                localStorage.setItem('baynui_partner_tu_khach', '1');
            }
            return true;
        } catch (_) {
            return false;   // mang hong thi thoi, menu giu nguyen
        }
    }

    function mucDoiTac() {
        const daLaDoiTac = Boolean(localStorage.getItem('baynui_partner_token'));
        return daLaDoiTac
            ? { href: 'doitac-quanly.html', vi: 'Kênh đối tác', en: 'Partner workspace', icon: 'handshake' }
            : { href: 'doitac.html', vi: 'Trở thành đối tác', en: 'Become a partner', icon: 'handshake' };
    }

    const veDoiTac = () => {
        const m = mucDoiTac();
        return `<div class="acc-sep"></div>
            <a href="${m.href}" class="acc-partner">
                <i data-lucide="${m.icon}"></i>${T(m.vi, m.en)}</a>`;
    };

    // ── Đăng nhập bằng Google ───────────────────────────────
    //
    // Mượn thư viện Firebase Auth mở cửa sổ đăng nhập của Google rồi
    // lấy về thẻ đăng nhập — cùng loại thẻ mà /v1/auth/login trả về, nên từ
    // đó trở đi cả trang chạy y hệt đăng nhập thường.
    //
    // Thư viện chỉ tải khi khách BẤM nút. Nhét sẵn 150 KB vào mọi trang chỉ
    // để chờ một cú bấm có thể không bao giờ tới thì quá phí.
    const SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
    const CAU_HINH = {
        apiKey: 'AIzaSyDMvuzU0KHl9QW0Sn2HVV7VvyL_A8W9v-8',
        authDomain: 'homestay-bay-nui.firebaseapp.com',
        projectId: 'homestay-bay-nui',
        appId: '1:935978819835:web:fc9fb8c21df15b601a505e',
    };

    let dangNap = null;

    function themThe(src) {
        return new Promise((xong, hong) => {
            const el = document.createElement('script');
            el.src = src;
            el.onload = xong;
            el.onerror = () => hong(new Error(T('Không tải được thư viện đăng nhập.',
                                                'Could not load the sign-in library.')));
            document.head.appendChild(el);
        });
    }

    function napFirebase() {
        if (window.firebase && window.firebase.auth) return Promise.resolve();
        if (dangNap) return dangNap;
        dangNap = (async () => {
            if (!window.firebase) await themThe(SDK + 'firebase-app-compat.js');
            if (!window.firebase.auth) await themThe(SDK + 'firebase-auth-compat.js');
            // Trang nào đã nạp firebase-config.js thì app dựng sẵn rồi
            if (!firebase.apps.length) firebase.initializeApp(CAU_HINH);
        })();
        return dangNap;
    }

    // Mã lỗi của Firebase là tiếng Anh và nói với lập trình viên, không nói
    // với khách. Đổi sang câu đọc được, và với hai lỗi cấu hình thì ghi luôn
    // chỗ cần sửa để chủ trang khỏi phải đi tra.
    const LOI_MXH = {
        'auth/operation-not-allowed':
            'Cách đăng nhập này chưa được bật cho trang. (Chủ trang: Firebase Console → Authentication → Sign-in method.)',
        'auth/unauthorized-domain':
            'Tên miền này chưa được cho phép đăng nhập. (Chủ trang: Firebase Console → Authentication → Settings → Authorized domains.)',
        'auth/popup-closed-by-user': 'Bạn đã đóng cửa sổ đăng nhập.',
        'auth/cancelled-popup-request': '',
        'auth/popup-blocked': 'Trình duyệt chặn cửa sổ đăng nhập. Bạn cho phép pop-up rồi thử lại nhé.',
        'auth/account-exists-with-different-credential':
            'Email này đã đăng ký bằng cách khác. Bạn đăng nhập bằng email và mật khẩu nhé.',
        'auth/network-request-failed': 'Mạng chập chờn, bạn thử lại nhé.',
    };

    /** Có tài khoản Firebase rồi thì cất thẻ vào đúng chỗ và vẽ lại menu. */
    async function nhanThe(u) {
        const phien = {
            token: await u.getIdToken(),
            refresh_token: u.refreshToken || '',
            expires_in: 3600,
            user: {
                id: u.uid,
                email: u.email || '',
                full_name: u.displayName || (u.email || '').split('@')[0],
            },
        };
        BayNuiUser.save(phien);

        // Thoát phiên của thư viện Firebase: mình chỉ mượn nó lấy thẻ một lần.
        // Giữ luôn phiên đó thì hai nơi cùng nắm trạng thái đăng nhập, khách
        // bấm Đăng xuất bên mình mà bên kia vẫn còn.
        try { await firebase.auth().signOut(); } catch (_) { /* khong sao */ }

        dongHop();
        ve();
        nhanRaDoiTac(phien).then((la) => { if (la) ve(); });
        document.dispatchEvent(new CustomEvent('baynui:signin', { detail: phien.user }));
    }

    /** Vừa quay về sau khi đi qua trang đăng nhập của Google. */
    async function quayVe() {
        if (!sessionStorage.getItem('baynui_mxh_cho')) return;
        sessionStorage.removeItem('baynui_mxh_cho');
        try {
            await napFirebase();
            const kq = await firebase.auth().getRedirectResult();
            if (kq && kq.user) await nhanThe(kq.user);
        } catch (_) { /* huy giua chung thi thoi */ }
    }

    async function dangNhapMxh() {
        const loi = document.getElementById('acc-error');
        const nut = document.getElementById('acc-google');
        const chuCu = nut ? nut.innerHTML : '';
        if (loi) loi.textContent = '';
        if (nut) { nut.disabled = true; nut.textContent = T('Đang mở…', 'Opening…'); }

        try {
            await napFirebase();
            const kq = await firebase.auth().signInWithPopup(new firebase.auth.GoogleAuthProvider());
            await nhanThe(kq.user);
        } catch (err) {
            const ma = err && err.code;

            // Cửa sổ bật lên bị chặn — hay gặp trên Safari điện thoại. Chuyển
            // sang cách chuyển trang: đi tới trang đăng nhập của nhà cung cấp
            // rồi quay về đây, phần nhận thẻ làm ở nhánh quayVe() bên dưới.
            if (ma === 'auth/popup-blocked'
                || ma === 'auth/operation-not-supported-in-this-environment') {
                try {
                    sessionStorage.setItem('baynui_mxh_cho', 'google');
                    await firebase.auth().signInWithRedirect(new firebase.auth.GoogleAuthProvider());
                    return;
                } catch (_) {
                    sessionStorage.removeItem('baynui_mxh_cho');
                }
            }
            const cau = Object.prototype.hasOwnProperty.call(LOI_MXH, ma)
                ? LOI_MXH[ma]
                : (err.message || T('Không đăng nhập được.', 'Could not sign in.'));
            if (loi) loi.textContent = cau;
        } finally {
            if (nut) { nut.disabled = false; nut.innerHTML = chuCu; }
        }
    }

    let goc = null;   // phần tử chứa nút + menu

    // ── Dựng nút tài khoản trong thanh điều hướng ───────────
    function dungNut() {
        const actions = document.querySelector('.nav-actions');
        if (!actions || document.getElementById('acc-root')) return;

        goc = document.createElement('div');
        goc.className = 'acc';
        goc.id = 'acc-root';
        // Chèn TRƯỚC nút "Đặt phòng" để nút đặt phòng luôn ở ngoài cùng bên phải
        const datPhong = actions.querySelector('.btn-book-nav');
        actions.insertBefore(goc, datPhong || null);
        ve();
        doLanDau();
        quayVe();
    }

    function ve() {
        const u = BayNuiUser.user();
        const ten = u ? (u.full_name || u.email || '').split('@')[0] : '';

        goc.innerHTML = `
        <button class="acc-btn" id="acc-btn" aria-haspopup="true" aria-expanded="false"
                title="${T('Tài khoản', 'Account')}">
            <i data-lucide="${u ? 'user-round-check' : 'user-round'}"></i>
            ${u ? `<span class="acc-name">${esc(ten)}</span>` : ''}
        </button>
        <div class="acc-menu hidden" id="acc-menu">
            ${u ? `
                <div class="acc-head">
                    <b>${esc(u.full_name || ten)}</b>
                    <span>${esc(u.email || '')}</span>
                </div>
                ${MUC.map(m => `
                    <a href="${m.href}"><i data-lucide="${m.icon}"></i>${T(m.vi, m.en)}</a>`).join('')}
                ${veDoiTac()}
                <button class="acc-out" id="acc-logout">
                    <i data-lucide="log-out"></i>${T('Đăng xuất', 'Sign out')}
                </button>
            ` : `
                <div class="acc-head">
                    <b>${T('Chưa đăng nhập', 'Not signed in')}</b>
                    <span>${T('Đăng nhập để xem đơn đặt, hộ chiếu và nhật ký của bạn.',
                              'Sign in to see your bookings, passport and journal.')}</span>
                </div>
                <button class="acc-in" id="acc-login">
                    <i data-lucide="log-in"></i>${T('Đăng nhập / Đăng ký', 'Sign in / Sign up')}
                </button>
                <a href="donhang.html"><i data-lucide="luggage"></i>${T('Tra cứu đơn đã đặt', 'Look up a booking')}</a>
                ${veDoiTac()}
            `}
        </div>`;

        if (window.lucide) lucide.createIcons();
    }

    // ── Hộp đăng nhập ───────────────────────────────────────
    function moHop(dangKy = false) {
        let hop = document.getElementById('acc-modal');
        if (!hop) {
            hop = document.createElement('div');
            hop.id = 'acc-modal';
            hop.className = 'acc-modal';
            document.body.appendChild(hop);
        }

        hop.innerHTML = `
        <div class="acc-modal-box" role="dialog" aria-modal="true">
            <button class="acc-close" id="acc-close" aria-label="${T('Đóng', 'Close')}">✕</button>
            <h2 id="acc-title">${dangKy ? T('Tạo tài khoản', 'Create an account')
                                        : T('Đăng nhập', 'Sign in')}</h2>
            <p class="acc-sub">${T('Để lưu đơn đặt, con dấu hộ chiếu và nhật ký chuyến đi trên mọi thiết bị.',
                                   'So your bookings, passport stamps and journal follow you across devices.')}</p>

            <div class="acc-mxh">
                <button type="button" class="acc-soc" id="acc-google">
                    <svg viewBox="0 0 48 48" aria-hidden="true">
                        <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.5 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.2 17.7 9.5 24 9.5z"/>
                        <path fill="#4285F4" d="M46.9 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.9c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4 6.9-10 6.9-17.5z"/>
                        <path fill="#FBBC05" d="M10.4 28.7a14.4 14.4 0 0 1 0-9.4l-7.8-6.1a24 24 0 0 0 0 21.6l7.8-6.1z"/>
                        <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.8 2.3-8.4 2.3-6.3 0-11.7-3.7-13.6-9.8l-7.8 6.1C6.5 42.6 14.6 48 24 48z"/>
                    </svg>
                    <span>${T('Tiếp tục với Google', 'Continue with Google')}</span>
                </button>
            </div>
            <div class="acc-hoac"><span>${T('hoặc dùng email', 'or use email')}</span></div>

            <form id="acc-form">
                <label class="acc-field ${dangKy ? '' : 'hidden'}" id="acc-name-field">
                    <span>${T('Họ và tên', 'Full name')}</span>
                    <input type="text" id="acc-fullname" autocomplete="name">
                </label>
                <label class="acc-field">
                    <span>Email</span>
                    <input type="email" id="acc-email" required autocomplete="email">
                </label>
                <label class="acc-field">
                    <span>${T('Mật khẩu', 'Password')}</span>
                    <input type="password" id="acc-password" required minlength="6"
                           autocomplete="${dangKy ? 'new-password' : 'current-password'}"
                           placeholder="${T('Ít nhất 6 ký tự', 'At least 6 characters')}">
                </label>
                <p class="acc-error" id="acc-error"></p>
                <button class="btn-primary acc-submit" type="submit" id="acc-submit">
                    ${dangKy ? T('Tạo tài khoản', 'Create account') : T('Đăng nhập', 'Sign in')}
                </button>
            </form>

            <p class="acc-switch">
                ${dangKy
                    ? `${T('Đã có tài khoản?', 'Already have an account?')} <a href="#" id="acc-switch">${T('Đăng nhập', 'Sign in')}</a>`
                    : `${T('Chưa có tài khoản?', 'No account yet?')} <a href="#" id="acc-switch">${T('Đăng ký', 'Sign up')}</a>`}
            </p>
        </div>`;

        hop.classList.add('open');
        hop.dataset.mode = dangKy ? 'register' : 'login';
        // Do not steal focus after the user starts typing, or pop the mobile
        // keyboard open before they choose a field.
        if (window.matchMedia('(min-width: 768px)').matches) {
            document.getElementById('acc-email')?.focus({ preventScroll: true });
        }
    }

    function dongHop() {
        document.getElementById('acc-modal')?.classList.remove('open');
    }

    async function guiForm(e) {
        e.preventDefault();
        const hop = document.getElementById('acc-modal');
        const dangKy = hop.dataset.mode === 'register';
        const nut = document.getElementById('acc-submit');
        const loi = document.getElementById('acc-error');

        const email = document.getElementById('acc-email').value.trim();
        const matKhau = document.getElementById('acc-password').value;
        const hoTen = document.getElementById('acc-fullname')?.value.trim() || '';

        loi.textContent = '';
        nut.disabled = true;
        nut.textContent = T('Đang xử lý…', 'Working…');

        try {
            const res = await fetch(dangKy ? '/v1/auth/register' : '/v1/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dangKy
                    ? { email, password: matKhau, full_name: hoTen }
                    : { email, password: matKhau }),
            });
            const body = await res.json();
            if (!res.ok) throw new Error(body?.error?.message || T('Không đăng nhập được.', 'Could not sign in.'));

            BayNuiUser.save(body);
            dongHop();
            ve();
            // Là đối tác đã duyệt thì menu phải đổi thành "Kênh đối tác" ngay,
            // không đợi họ mở lại trang.
            nhanRaDoiTac(body).then((la) => { if (la) ve(); });
            // Trang đang mở có thể cần vẽ lại theo tài khoản vừa đăng nhập
            document.dispatchEvent(new CustomEvent('baynui:signin', { detail: body.user }));
        } catch (err) {
            loi.textContent = err.message;
        } finally {
            nut.disabled = false;
            nut.textContent = dangKy ? T('Tạo tài khoản', 'Create account') : T('Đăng nhập', 'Sign in');
        }
    }

    // Đã đăng nhập từ trước mà chưa có phiên đối tác thì hỏi một câu, để cái
    // menu không bảo một chủ nhà đang là đối tác đi "trở thành đối tác".
    // Hỏi đúng một lần mỗi phiên trình duyệt cho khỏi tốn lời gọi.
    function doLanDau() {
        if (!window.BayNuiUser || !BayNuiUser.user()) return;
        if (localStorage.getItem('baynui_partner_token')) return;
        if (sessionStorage.getItem('baynui_da_hoi_doitac')) return;
        sessionStorage.setItem('baynui_da_hoi_doitac', '1');
        // Han the con lai tinh tu moc da luu, dung mac dinh 1 tieng: the co
        // the sap het han toi noi, dat lai 1 tieng thi phien doi tac tuong con
        // song trong khi may chu da tu choi.
        const moc = Number(localStorage.getItem('baynui_user_expiry') || 0);
        const conLai = Math.max(60, Math.round((moc - Date.now()) / 1000));
        nhanRaDoiTac({
            token: localStorage.getItem('baynui_user_token') || '',
            refresh_token: localStorage.getItem('baynui_user_refresh') || '',
            expires_in: conLai,
            user: BayNuiUser.user(),
        }).then((la) => { if (la) ve(); });
    }

    // ── Bắt sự kiện ─────────────────────────────────────────
    document.addEventListener('click', (e) => {
        if (e.target.closest('#acc-btn')) {
            const menu = document.getElementById('acc-menu');
            menu.classList.toggle('hidden');
            document.getElementById('acc-btn').setAttribute('aria-expanded', !menu.classList.contains('hidden'));
            return;
        }
        if (e.target.closest('#acc-login')) { moHop(false); document.getElementById('acc-menu').classList.add('hidden'); return; }
        if (e.target.closest('#acc-logout')) {
            BayNuiUser.clear();
            // Phiên đối tác nào do chính chỗ này chép ra thì dọn luôn — thoát
            // rồi mà vẫn còn đường vào kênh đối tác thì không gọi là thoát.
            // Phiên họ tự đăng nhập bên trang Đối tác thì để nguyên.
            if (localStorage.getItem('baynui_partner_tu_khach') && window.BayNuiAuth) {
                BayNuiAuth.clear();
                localStorage.removeItem('baynui_partner_tu_khach');
            }
            ve();
            document.dispatchEvent(new CustomEvent('baynui:signout'));
            return;
        }
        if (e.target.closest('#acc-google')) { dangNhapMxh(); return; }
        if (e.target.closest('#acc-close')) { dongHop(); return; }
        if (e.target.closest('#acc-switch')) {
            e.preventDefault();
            moHop(document.getElementById('acc-modal').dataset.mode !== 'register');
            return;
        }
        // Bấm ra ngoài thì đóng
        const hop = document.getElementById('acc-modal');
        if (hop?.classList.contains('open') && e.target === hop) dongHop();
        if (!e.target.closest('#acc-root')) document.getElementById('acc-menu')?.classList.add('hidden');
    });

    document.addEventListener('submit', (e) => {
        if (e.target.id === 'acc-form') guiForm(e);
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') dongHop();
    });

    document.addEventListener('DOMContentLoaded', dungNut);

    // Đổi ngôn ngữ thì vẽ lại menu
    document.addEventListener('click', (e) => {
        if (e.target.closest('.lang-toggle-btn')) setTimeout(() => goc && ve(), 60);
    });

    window.BayNuiAccount = { moHop, ve };
})();
