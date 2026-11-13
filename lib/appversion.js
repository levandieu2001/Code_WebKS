// ============================================================
// LOCALMATE — Phiên bản app
// ============================================================
// App phát trực tiếp bằng file APK chứ không qua Google Play, nên KHÔNG có ai
// tự báo cho khách biết có bản mới. Họ cứ dùng bản cũ mãi, và mọi thứ mình sửa
// chẳng tới được máy của họ.
//
// Ở đây máy chủ giữ số hiệu bản mới nhất. App mở lên hỏi một câu, thấy mình cũ
// hơn thì hiện hộp thoại mời cập nhật.
//
// Vì sao dùng versionCode chứ không phải versionName: versionCode là SỐ NGUYÊN
// tăng dần, so sánh chắc chắn đúng. So chuỗi "0.10.0" với "0.9.0" theo thứ tự
// chữ cái thì "0.10.0" lại nhỏ hơn — một lỗi kinh điển.
// ============================================================

const store = require('./store');

const COLL = 'app_version';

// Giá trị khởi đầu, khớp với bản đang phát. Admin sửa được sau.
const MAC_DINH = {
    id: 'android',
    version_code: 1,
    version_name: '0.1.0',
    // Đường dẫn tương đối; nơi gọi ghép với địa chỉ thật của máy chủ
    apk_path: 'tai-app/LOCALMATE.apk',
    notes: '',
    notes_en: '',
    // Bắt buộc cập nhật: chỉ bật khi bản cũ thật sự KHÔNG dùng được nữa
    // (đổi định dạng API chẳng hạn). Bật bừa là ép khách tải lại giữa chuyến đi.
    mandatory: false,
    updated_at: '',
};

function current() {
    const rows = store.readAll(COLL) || [];
    if (!rows.length) {
        store.writeAll(COLL, [MAC_DINH]);
        return { ...MAC_DINH };
    }
    return { ...MAC_DINH, ...rows[0] };
}

/** Admin đổi số hiệu sau khi phát bản mới. */
function save(patch = {}) {
    const cu = current();
    const apkPath = String(patch.apk_path || cu.apk_path);
    if (!/^tai-app\/[A-Za-z0-9._-]+\.apk$/.test(apkPath)) throw new Error('Invalid APK download path');
    const moi = {
        ...cu,
        apk_path: apkPath,
        version_code: Number(patch.version_code) > 0 ? Math.floor(Number(patch.version_code)) : cu.version_code,
        version_name: String(patch.version_name || cu.version_name).slice(0, 30),
        notes: String(patch.notes ?? cu.notes).slice(0, 600),
        notes_en: String(patch.notes_en ?? cu.notes_en).slice(0, 600),
        mandatory: Boolean(patch.mandatory),
        updated_at: new Date().toISOString(),
    };
    store.writeAll(COLL, [moi]);
    return moi;
}

/**
 * Trả lời cho app.
 *
 * @param have versionCode app đang chạy
 * @param baseUrl địa chỉ máy chủ, để ghép đường tải đầy đủ
 */
function check(have, baseUrl, lang = 'vi') {
    const v = current();
    const dangCo = Number(have) || 0;
    const cuHon = dangCo > 0 && dangCo < v.version_code;

    return {
        version_code: v.version_code,
        version_name: v.version_name,
        // Đường tải tuyệt đối: app mở thẳng trình duyệt bằng chuỗi này
        apk_url: `${String(baseUrl).replace(/\/+$/, '')}/${String(v.apk_path).replace(/^\/+/, '')}`,
        notes: (lang === 'en' ? v.notes_en : v.notes) || v.notes || '',
        mandatory: Boolean(v.mandatory),
        // App chỉ cần đọc đúng cờ này, khỏi tự so sánh
        update_available: cuHon,
    };
}

module.exports = { current, save, check };
