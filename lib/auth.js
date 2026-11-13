// ============================================================
// LOCALMATE — Tài khoản khách hàng
// ============================================================
// Dùng Firebase Authentication qua REST — CHÍNH LÀ hệ thống tài khoản mà
// trang Admin đang dùng. Nhờ vậy:
//   - Không phải tự lưu mật khẩu (Firebase lo băm và bảo mật).
//   - Web và App dùng chung một kho tài khoản, một định dạng token.
//   - Không cần sửa firestore.rules hay tạo collection users.
// ============================================================

const IDENTITY = 'https://identitytoolkit.googleapis.com/v1/accounts';
const API_KEY = process.env.FIREBASE_API_KEY || 'AIzaSyDMvuzU0KHl9QW0Sn2HVV7VvyL_A8W9v-8';
const TIMEOUT_MS = 10000;

// Firebase trả mã lỗi tiếng Anh — đổi sang câu người dùng đọc được
const ERRORS = {
    EMAIL_EXISTS: 'Email này đã được đăng ký. Bạn thử đăng nhập nhé.',
    INVALID_EMAIL: 'Email không hợp lệ.',
    WEAK_PASSWORD: 'Mật khẩu phải có ít nhất 6 ký tự.',
    EMAIL_NOT_FOUND: 'Không tìm thấy tài khoản với email này.',
    INVALID_PASSWORD: 'Mật khẩu không đúng.',
    INVALID_LOGIN_CREDENTIALS: 'Email hoặc mật khẩu không đúng.',
    USER_DISABLED: 'Tài khoản này đã bị khoá.',
    TOO_MANY_ATTEMPTS_TRY_LATER: 'Bạn thử quá nhiều lần. Chờ một lát rồi thử lại.',
    INVALID_ID_TOKEN: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.',
    TOKEN_EXPIRED: 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.',
};

function friendly(rawMessage) {
    const code = String(rawMessage || '').split(' : ')[0].trim();
    return ERRORS[code] || 'Không thực hiện được, vui lòng thử lại.';
}

async function callIdentity(action, payload) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        const res = await fetch(`${IDENTITY}:${action}?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            signal: controller.signal,
        });
        const body = await res.json();
        if (!res.ok) {
            const error = new Error(friendly(body?.error?.message));
            error.code = String(body?.error?.message || '').split(' : ')[0].trim();
            error.status = res.status === 400 ? 400 : 502;
            throw error;
        }
        return body;
    } finally {
        clearTimeout(timer);
    }
}

const shapeUser = (data, fallbackName = '') => ({
    id: data.localId,
    email: data.email,
    full_name: data.displayName || fallbackName || (data.email || '').split('@')[0],
});

/** Tạo tài khoản mới, trả về token + thông tin người dùng. */
async function register({ email, password, fullName }) {
    const created = await callIdentity('signUp', { email, password, returnSecureToken: true });

    // Lưu tên hiển thị (không chặn luồng nếu bước này lỗi)
    if (fullName) {
        try {
            await callIdentity('update', { idToken: created.idToken, displayName: fullName, returnSecureToken: false });
        } catch (err) {
            console.warn('[auth] không lưu được displayName:', err.message);
        }
    }

    return {
        token: created.idToken,
        refresh_token: created.refreshToken,
        expires_in: Number(created.expiresIn || 3600),
        user: shapeUser(created, fullName),
    };
}

/** Đăng nhập bằng email + mật khẩu. */
async function login({ email, password }) {
    const signed = await callIdentity('signInWithPassword', { email, password, returnSecureToken: true });
    return {
        token: signed.idToken,
        refresh_token: signed.refreshToken,
        expires_in: Number(signed.expiresIn || 3600),
        user: shapeUser(signed),
    };
}

/**
 * Đổi refresh token lấy token đăng nhập mới.
 *
 * Token đăng nhập của Firebase chỉ sống 1 tiếng. Trước đây web đối tác và app
 * cất token vào máy rồi dùng mãi — sang tiếng thứ hai là mọi lời gọi đều 401,
 * mà giao diện không hề báo gì: đối tác điền xong tin phòng, bấm Lưu, không có
 * chuyện gì xảy ra và họ không hiểu vì sao.
 *
 * Refresh token thì sống rất lâu, đổi được lấy token mới bao nhiêu lần cũng
 * được. Đây là endpoint riêng của Firebase, khác đường identitytoolkit ở trên.
 */
async function refresh(refreshToken) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        const res = await fetch(`https://securetoken.googleapis.com/v1/token?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }),
            signal: controller.signal,
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
            const error = new Error('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.');
            error.status = 401;
            throw error;
        }
        return {
            token: body.id_token,
            refresh_token: body.refresh_token,
            expires_in: Number(body.expires_in || 3600),
        };
    } finally {
        clearTimeout(timer);
    }
}

/**
 * Lấy thông tin người dùng từ token.
 *
 * Token hỏng hoặc quá hạn thì Firebase trả 400, và callIdentity giữ nguyên
 * mã đó. Nhưng ở đây 400 là SAI: mã đúng phải là 401, vì đây là chuyện phiên
 * đăng nhập chứ không phải yêu cầu viết sai.
 *
 * Không phải chuyện câu chữ. App Android gia hạn token bằng Authenticator của
 * OkHttp, mà OkHttp CHỈ gọi nó khi thấy 401. Trả 400 thì đường gia hạn không
 * bao giờ chạy — khách vẫn bị rớt phiên sau đúng một tiếng, y như trước khi
 * làm tính năng đó. Web cũng vậy: chỗ nào bắt 401 để mời đăng nhập lại đều
 * trượt hết.
 *
 * Lỗi mạng (502) thì giữ nguyên: đó không phải lỗi của token.
 */
async function me(idToken) {
    const found = await callIdentity('lookup', { idToken }).catch((err) => {
        if (err.status === 400) err.status = 401;
        throw err;
    });
    const user = (found.users || [])[0];
    if (!user) {
        const error = new Error('Phiên đăng nhập không hợp lệ.');
        error.status = 401;
        throw error;
    }
    return shapeUser(user);
}

module.exports = { register, login, me, refresh };
