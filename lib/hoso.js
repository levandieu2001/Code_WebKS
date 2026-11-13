// ============================================================
// LOCALMATE — Hồ sơ khách: tên, số điện thoại, sổ địa chỉ
// ============================================================
// Firebase Auth chỉ giữ email và tên hiển thị. Số điện thoại và địa chỉ giao
// hàng thì không có chỗ nào lưu, nên mỗi lần đặt đặc sản khách phải gõ lại từ
// đầu: họ tên, số điện thoại, rồi cả cái địa chỉ dài "số nhà, đường, xã,
// huyện, tỉnh". Gõ trên điện thoại thì đó là chỗ người ta bỏ dở nhiều nhất.
//
// Ở đây giữ hồ sơ theo tài khoản, kèm SỔ ĐỊA CHỈ chứ không phải một dòng địa
// chỉ duy nhất: người ta hay gửi về nhà mình, mà cũng hay gửi biếu về quê hay
// gửi tới cơ quan. Ba chỗ khác nhau, ép chọn một là lần sau lại gõ tay.
//
// Khách KHÔNG đăng nhập vẫn đặt được như thường — sổ địa chỉ chỉ là thứ đỡ
// mất công cho người có tài khoản, không phải hàng rào bắt người ta đăng ký.
// ============================================================

const store = require('./store');

const COLLECTION = 'user_profiles';
const MAX_DIA_CHI = 8;

const chu = (v, max) => String(v == null ? '' : v).trim().slice(0, max);
const soDT = (v) => String(v || '').replace(/[\s.-]/g, '');
const laSoDT = (v) => /^0\d{9}$/.test(soDT(v));

/** Hồ sơ của một tài khoản. Chưa có thì trả về khung rỗng, không tạo vội. */
function cua(uid) {
    const row = store.find(COLLECTION, r => r.uid === String(uid));
    if (row) return row;
    return { uid: String(uid), fullName: '', phone: '', addresses: [], createdAt: '' };
}

/** Dạng trả cho trình duyệt. */
function toPublic(p) {
    return {
        full_name: p.fullName || '',
        phone: p.phone || '',
        addresses: (p.addresses || []).map(a => ({
            id: a.id,
            label: a.label || '',
            receiver: a.receiver || '',
            phone: a.phone || '',
            address: a.address || '',
            is_default: Boolean(a.isDefault),
        })),
        updated_at: p.updatedAt || '',
    };
}

/** Địa chỉ mặc định, hoặc địa chỉ đầu tiên nếu chưa đặt cái nào làm mặc định. */
function diaChiMacDinh(p) {
    const ds = p.addresses || [];
    return ds.find(a => a.isDefault) || ds[0] || null;
}

function luuHoSo(uid, { fullName, phone }) {
    const cu = store.find(COLLECTION, r => r.uid === String(uid));
    const patch = { updatedAt: new Date().toISOString() };
    if (fullName !== undefined) patch.fullName = chu(fullName, 120);
    if (phone !== undefined) patch.phone = soDT(phone).slice(0, 20);

    if (cu) return store.update(COLLECTION, cu.id, patch);
    return store.insert(COLLECTION, {
        id: `up_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
        uid: String(uid),
        fullName: patch.fullName || '',
        phone: patch.phone || '',
        addresses: [],
        createdAt: new Date().toISOString(),
        updatedAt: patch.updatedAt,
    });
}

/**
 * Thêm hoặc sửa một địa chỉ.
 *
 * Ném lỗi có .code để route dịch thành câu tiếng Việt. Kiểm ở đây chứ không
 * kiểm ở route: sổ địa chỉ còn được app gọi tới, mà app thì không đi qua cùng
 * một đoạn kiểm.
 */
function luuDiaChi(uid, { id, label, receiver, phone, address, isDefault }) {
    const bad = (code, message) => {
        const e = new Error(message);
        e.code = code;
        throw e;
    };

    const nguoiNhan = chu(receiver, 120);
    const dc = chu(address, 300);
    const sdt = soDT(phone);

    if (nguoiNhan.length < 2) bad('INVALID_RECEIVER', 'Nhập tên người nhận giúp mình nhé.');
    if (!laSoDT(sdt)) bad('INVALID_PHONE', 'Số điện thoại phải có 10 số, bắt đầu bằng 0.');
    if (dc.length < 8) {
        bad('INVALID_ADDRESS',
            'Địa chỉ cần đầy đủ: số nhà, đường, xã/phường, huyện, tỉnh.');
    }

    let p = store.find(COLLECTION, r => r.uid === String(uid));
    if (!p) {
        luuHoSo(uid, {});
        p = store.find(COLLECTION, r => r.uid === String(uid));
    }

    const ds = [...(p.addresses || [])];
    const moi = {
        id: id || `dc_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
        label: chu(label, 40) || 'Địa chỉ',
        receiver: nguoiNhan,
        phone: sdt,
        address: dc,
        isDefault: Boolean(isDefault),
    };

    const i = id ? ds.findIndex(a => a.id === id) : -1;
    if (i >= 0) {
        ds[i] = { ...ds[i], ...moi };
    } else {
        if (ds.length >= MAX_DIA_CHI) {
            bad('TOO_MANY', `Sổ địa chỉ tối đa ${MAX_DIA_CHI} chỗ. Bạn xoá bớt một cái nhé.`);
        }
        ds.push(moi);
    }

    // Đúng MỘT địa chỉ mặc định. Hai cái cùng đánh dấu thì lúc điền tự động
    // không biết lấy cái nào, mà chọn bừa thì có ngày gửi nhầm nhà.
    if (moi.isDefault) {
        for (const a of ds) a.isDefault = a.id === moi.id;
    } else if (!ds.some(a => a.isDefault)) {
        ds[0].isDefault = true;   // luôn phải có một cái mặc định
    }

    return store.update(COLLECTION, p.id, {
        addresses: ds,
        updatedAt: new Date().toISOString(),
    });
}

function xoaDiaChi(uid, id) {
    const p = store.find(COLLECTION, r => r.uid === String(uid));
    if (!p) return null;
    const ds = (p.addresses || []).filter(a => a.id !== id);
    // Xoá đúng cái đang là mặc định thì đẩy mặc định sang cái còn lại đầu tiên
    if (ds.length && !ds.some(a => a.isDefault)) ds[0].isDefault = true;
    return store.update(COLLECTION, p.id, {
        addresses: ds,
        updatedAt: new Date().toISOString(),
    });
}

module.exports = {
    COLLECTION, MAX_DIA_CHI,
    cua, toPublic, diaChiMacDinh, luuHoSo, luuDiaChi, xoaDiaChi, laSoDT,
};
