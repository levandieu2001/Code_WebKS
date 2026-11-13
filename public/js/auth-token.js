// ============================================================
// LOCALMATE — Giữ phiên đăng nhập
// ============================================================
// Token đăng nhập của Firebase chỉ sống 1 tiếng.
//
// Trước đây trang đối tác lưu token vào localStorage rồi dùng mãi. Sang tiếng
// thứ hai, mọi lời gọi đều trả 401 — nhưng giao diện không báo gì cả: chủ khách
// sạn điền xong tin phòng, bấm Lưu, và không có chuyện gì xảy ra. Họ không biết
// mình đã bị đăng xuất, chỉ thấy trang hỏng.
//
// File này giữ thêm refresh token và thời điểm hết hạn, tự đổi lấy token mới
// trước khi hết hạn.
//
// Có HAI phiên riêng biệt vì một người có thể vừa là khách vừa là đối tác, và
// đăng nhập cả hai trên cùng trình duyệt:
//   BayNuiAuth · đối tác (kênh làm việc, đăng tin phòng)
//   BayNuiUser · khách  (đơn của tôi, hộ chiếu, nhật ký)
// ============================================================

(function (global) {
    'use strict';

    // Đổi token sớm 5 phút trước hạn. Đợi sát nút thì một lời gọi đang bay có
    // thể tới máy chủ đúng lúc token vừa chết.
    const SOM_HON_MS = 5 * 60 * 1000;

    /**
     * Tạo một phiên độc lập.
     * @param prefix tiền tố khoá trong localStorage, để hai phiên không giẫm nhau
     */
    function taoPhien(prefix) {
        const TOKEN_KEY = prefix + '_token';
        const REFRESH_KEY = prefix + '_refresh';
        const EXPIRY_KEY = prefix + '_expiry';
        const USER_KEY = prefix + '_user';

        let dangDoi = null;   // lời hứa đang chạy, để nhiều lời gọi cùng lúc chỉ đổi một lần

        function save(data) {
            if (!data || !data.token) return;
            localStorage.setItem(TOKEN_KEY, data.token);
            if (data.refresh_token) localStorage.setItem(REFRESH_KEY, data.refresh_token);
            const song = Number(data.expires_in || 3600) * 1000;
            localStorage.setItem(EXPIRY_KEY, String(Date.now() + song));
            if (data.user) localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        }

        function clear() {
            [TOKEN_KEY, REFRESH_KEY, EXPIRY_KEY, USER_KEY].forEach(k => localStorage.removeItem(k));
        }

        const raw = () => localStorage.getItem(TOKEN_KEY) || '';

        function user() {
            try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch (_) { return null; }
        }

        function conHan() {
            const het = Number(localStorage.getItem(EXPIRY_KEY) || 0);
            // Không biết hạn (token lưu từ bản cũ) thì coi như còn hạn, để không
            // đá người đang dùng ra ngoài. Gặp 401 thì mới đổi.
            if (!het) return true;
            return Date.now() < het - SOM_HON_MS;
        }

        async function doiToken() {
            const refresh = localStorage.getItem(REFRESH_KEY);
            if (!refresh) return '';

            const res = await fetch('/v1/auth/refresh', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh_token: refresh }),
            });
            if (!res.ok) {
                // Refresh token cũng hỏng — hết đường, phải đăng nhập lại thật.
                clear();
                return '';
            }
            const body = await res.json();
            save(body);
            return body.token || '';
        }

        /** Token còn hạn để gắn vào lời gọi. Tự đổi mới nếu sắp hết hạn. */
        async function token() {
            if (raw() && conHan()) return raw();
            if (!dangDoi) {
                dangDoi = doiToken().finally(() => { dangDoi = null; });
            }
            return (await dangDoi) || raw();
        }

        /**
         * Gọi API kèm token, tự thử lại MỘT lần nếu máy chủ trả 401.
         *
         * Vì sao vẫn cần thử lại dù đã canh hạn: đồng hồ máy khách có thể sai,
         * hoặc quản trị viên vừa thu hồi phiên. Canh hạn lo trường hợp thường,
         * thử lại lo trường hợp còn lại.
         */
        async function api(path, options = {}) {
            const goi = async (t) => fetch(path, {
                ...options,
                // Đơn và trạng thái duyệt đổi liên tục; không dùng bản GET cũ
                // do trình duyệt giữ lại sau khi đối tác vừa có đơn mới.
                cache: options.cache || 'no-store',
                headers: {
                    'Content-Type': 'application/json',
                    ...(t ? { Authorization: 'Bearer ' + t } : {}),
                    ...(options.headers || {}),
                },
            });

            let res = await goi(await token());
            if (res.status === 401) {
                const moi = await doiToken();
                if (moi) res = await goi(moi);
            }

            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
                const err = new Error(body?.error?.message || 'Có lỗi xảy ra.');
                err.status = res.status;
                throw err;
            }
            return body;
        }

        return { TOKEN_KEY, save, clear, token, api, raw, user, coPhien: () => Boolean(raw()) };
    }

    global.BayNuiAuth = taoPhien('baynui_partner');
    global.BayNuiUser = taoPhien('baynui_user');
}(window));
