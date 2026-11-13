// ============================================================
// LOCALMATE — Firebase Cloud Messaging (push thật)
// ============================================================
// Đây là thứ khiến tài xế nhận được chuyến kể cả khi đã tắt hẳn app và tắt
// màn hình — giống Grab. Trước đó app phải tự hỏi máy chủ, nên vuốt tắt app
// là mất đơn.
//
// Vì sao KHÔNG dùng firebase-admin:
//   - Thêm ~50 MB phụ thuộc cho đúng một việc: ký JWT rồi gọi một endpoint.
//   - Node đã có sẵn crypto ký được RS256.
//   - Ít phụ thuộc thì máy giám khảo `npm install` cũng nhanh và ít hỏng.
//
// Luồng: ký JWT bằng private key của service account → đổi lấy access token
// của Google → POST lên FCM v1. Access token sống 1 giờ nên có nhớ lại.
// ============================================================

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
const TIMEOUT_MS = 10000;

/**
 * Đọc khoá quản trị. Trả null nếu chưa cấu hình — khi đó push tắt, app vẫn chạy.
 *
 * Hai đường nạp, theo thứ tự ưu tiên:
 *
 *  1. FCM_SERVICE_ACCOUNT_JSON — nội dung file khoá đặt thẳng vào biến môi
 *     trường. Đây là đường dùng trên máy chủ: chỗ đó chỉ cấp biến môi trường
 *     chứ không cho tải file khoá lên, mà file khoá thì tuyệt đối không được
 *     đẩy lên Git.
 *
 *     Nhận CẢ HAI dạng: JSON thô, hoặc chuỗi base64 của JSON đó.
 *
 *     Nên dùng base64. Lý do đã gặp thật khi triển khai: systemd đọc
 *     EnvironmentFile có bóc dấu nháy, nên `{"type":"service_account"}` biến
 *     thành `{type:service_account}` — không còn là JSON, mà lỗi chỉ hiện ra
 *     dưới dạng "push không chạy" chứ chẳng có gì báo. Chuỗi base64 chỉ gồm
 *     chữ, số và +/= nên không có gì cho systemd hay shell nuốt mất.
 *
 *  2. FCM_SERVICE_ACCOUNT hoặc file firebase-adminsdk*.json trong thư mục dự
 *     án — đường dùng khi chạy ở máy nhà.
 */
function loadServiceAccount() {
    const raw = (process.env.FCM_SERVICE_ACCOUNT_JSON || '').trim();
    if (raw) {
        // Bắt đầu bằng "{" thì là JSON thô, còn lại coi như base64.
        const inline = raw.startsWith('{')
            ? raw
            : Buffer.from(raw, 'base64').toString('utf8');
        try {
            const json = JSON.parse(inline);
            // Một số nơi lưu biến môi trường làm xuống dòng thật trong private_key
            // thành hai ký tự "\n" — không sửa lại thì chữ ký RS256 sai hết.
            if (typeof json.private_key === 'string') {
                json.private_key = json.private_key.replace(/\\n/g, '\n');
            }
            if (json.type === 'service_account' && json.private_key && json.client_email) {
                return { ...json, _file: '(FCM_SERVICE_ACCOUNT_JSON)' };
            }
            console.warn('[fcm] FCM_SERVICE_ACCOUNT_JSON thiếu trường bắt buộc — bỏ qua.');
        } catch (err) {
            console.warn('[fcm] FCM_SERVICE_ACCOUNT_JSON không phải JSON hợp lệ:', err.message);
        }
    }

    const configured = process.env.FCM_SERVICE_ACCOUNT;
    const candidates = [];

    if (configured) {
        candidates.push(path.isAbsolute(configured) ? configured : path.join(__dirname, '..', configured));
    }
    // Không cấu hình thì tự dò file khoá đặt sẵn trong thư mục dự án
    try {
        const root = path.join(__dirname, '..');
        for (const name of fs.readdirSync(root)) {
            if (/firebase-adminsdk.*\.json$/i.test(name)) candidates.push(path.join(root, name));
        }
    } catch (_) { /* không đọc được thư mục thì thôi */ }

    for (const file of candidates) {
        try {
            const json = JSON.parse(fs.readFileSync(file, 'utf8'));
            if (json.type === 'service_account' && json.private_key && json.client_email) {
                return { ...json, _file: file };
            }
        } catch (_) { /* thử file tiếp theo */ }
    }
    return null;
}

const account = loadServiceAccount();
const enabled = Boolean(account);
const PROJECT_ID = account?.project_id || process.env.FIREBASE_PROJECT_ID || 'homestay-bay-nui';

const base64url = (input) => Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

let cachedToken = null;   // { value, expiresAt }

/**
 * Access token của Google, ký bằng khoá service account.
 * Nhớ lại tới sát hạn (trừ hao 60 giây) để không phải ký lại mỗi lần gửi.
 */
async function accessToken() {
    if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.value;

    const now = Math.floor(Date.now() / 1000);
    const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const claims = base64url(JSON.stringify({
        iss: account.client_email,
        scope: SCOPE,
        aud: TOKEN_URL,
        iat: now,
        exp: now + 3600,
    }));

    const signature = crypto
        .createSign('RSA-SHA256')
        .update(`${header}.${claims}`)
        .sign(account.private_key)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        const res = await fetch(TOKEN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                assertion: `${header}.${claims}.${signature}`,
            }),
            signal: controller.signal,
        });
        const body = await res.json();
        if (!res.ok || !body.access_token) {
            throw new Error(body.error_description || body.error || `HTTP ${res.status}`);
        }
        cachedToken = {
            value: body.access_token,
            expiresAt: Date.now() + (body.expires_in - 60) * 1000,
        };
        return cachedToken.value;
    } finally {
        clearTimeout(timer);
    }
}

/**
 * Gửi một thông báo tới một thiết bị.
 *
 * @returns { ok } khi gửi được, hoặc { ok:false, gone:true } khi token đã chết
 * (gỡ app, cài lại máy…) — nơi gọi dựa vào cờ này để xoá token khỏi danh bạ,
 * không thì danh bạ phình mãi toàn token rác.
 */
async function send(deviceToken, { title, body, data = {}, urgent = false }) {
    if (!enabled) return { ok: false, reason: 'FCM chưa được cấu hình.' };
    if (!deviceToken) return { ok: false, reason: 'Thiếu token thiết bị.' };

    // FCM chỉ nhận data toàn chuỗi
    const payload = {};
    for (const [k, v] of Object.entries(data)) payload[k] = String(v);

    const message = {
        message: {
            token: deviceToken,
            notification: { title, body },
            data: payload,
            android: {
                priority: urgent ? 'HIGH' : 'NORMAL',
                notification: {
                    // Trùng id kênh đã tạo bên app, để chuyến mới kêu to và rung
                    channel_id: urgent ? 'baynui_ride_offers' : 'baynui_general',
                    sound: 'default',
                },
            },
        },
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        const token = await accessToken();
        const res = await fetch(
            `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`,
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(message),
                signal: controller.signal,
            },
        );
        const out = await res.json().catch(() => ({}));

        if (res.ok) return { ok: true, name: out.name };

        // 404 UNREGISTERED / 400 INVALID_ARGUMENT về token = thiết bị không còn
        const status = out?.error?.status || '';
        const gone = res.status === 404
            || status === 'NOT_FOUND'
            || status === 'UNREGISTERED'
            || /registration token/i.test(out?.error?.message || '');

        return { ok: false, gone, status: res.status, reason: out?.error?.message || `HTTP ${res.status}` };
    } catch (err) {
        return { ok: false, reason: err.message };
    } finally {
        clearTimeout(timer);
    }
}

/** Trạng thái để trang quản trị hiện được "push thật đang bật hay tắt". */
function status() {
    return {
        enabled,
        project_id: enabled ? PROJECT_ID : '',
        client_email: enabled ? account.client_email : '',
        key_file: enabled ? path.basename(account._file) : '',
    };
}

module.exports = { send, accessToken, status, enabled, PROJECT_ID };
