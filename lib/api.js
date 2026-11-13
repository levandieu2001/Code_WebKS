// ============================================================
// LOCALMATE — REST API v1
// Web và Android App dùng CHUNG các endpoint dưới đây.
// Đơn đặt từ app ghi vào cùng collection Firestore mà trang
// Admin đang đọc, nên đơn hiện ra ngay trên web.
// ============================================================

const express = require('express');
const { getWeather, getOutlook, DEFAULT_LAT, DEFAULT_LNG } = require('./weather');
const { listDocuments, createDocument, updateDocument } = require('./firestore');
const { PLACES, FOODS, findPlace, findTour } = require('./content');
const {
    reverseGeocode, geocodeAddress, roadDistanceToHome, coordsFromName, SERVICE_AREAS, findArea,
} = require('./geo');
const {
    PARTNERS, allPartnerStays, findPartner, findPartnerByEmail, findStay, isPublicPartner,
    partnersByType, staysNearPlace,
} = require('./partners');
const auth = require('./auth');
const dispatch = require('./dispatch');
const store = require('./store');
const { buildItinerary, suggestReplan, applyReplan } = require('./itinerary');
const { enrichWithAI, hasAI } = require('./itinerary-ai');
const events = require('./events');
const journal = require('./journal');
const seasons = require('./seasons');
const peoples = require('./peoples');
const clusters = require('./clusters');
const appversion = require('./appversion');
const pooling = require('./pooling');
const listings = require('./listings');
// Bot đọc danh sách đối tác từ kho này; duyệt xong phải báo cho nó quên
// bộ nhớ đệm, không thì khách hỏi ngay lúc đó vẫn nghe "chưa có".
const chatbot = require('./chatbot');
const uploads = require('./uploads');
const kyc = require('./kyc');
const phantich = require('./partner-analytics');
const lichphong = require('./lichphong');
const huydon = require('./huydon');
const doisoat = require('./doisoat');
const lienhe = require('./lienhe');
const hoso = require('./hoso');
const gemini = require('./gemini');
const reviews = require('./reviews');
const payments = require('./payments');
const notifications = require('./notifications');
const devices = require('./devices');
const fcm = require('./fcm');
const passport = require('./passport');
const tourpool = require('./tourpool');
const revenue = require('./revenue');
const ledger = require('./ledger');
const commerce = require('./commerce');

// Tài khoản được quyền vào trang Admin. Thêm email khác bằng biến môi trường
// ADMIN_EMAILS (ngăn cách bằng dấu phẩy). Mặc định dưới đây là địa chỉ KHÔNG
// TỒN TẠI, cố ý: quên khai biến môi trường thì không ai vào được trang quản
// trị — an toàn hơn là lỡ để một địa chỉ thật ai đó đăng ký được.
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
    .split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

const router = express.Router();
const validateRoom = require('../public/js/room-validation');

async function saveAdminRoom(req, res) {
    const ctx = await requireAdmin(req, res);
    if (!ctx) return;
    const input = req.body || {};
    const error = validateRoom(input);
    if (error) return fail(res, 400, 'INVALID_ROOM', error);
    if (!['available', 'booked', 'maintenance'].includes(input.status)) {
        return fail(res, 400, 'INVALID_ROOM', 'Trạng thái phòng không hợp lệ.');
    }
    const fields = ['name', 'nameEn', 'price', 'capacity', 'order', 'description', 'descriptionEn',
        'amenities', 'amenitiesEn', 'status', 'imageUrl'];
    const data = Object.fromEntries(fields.filter(key => input[key] !== undefined).map(key => [key, input[key]]));
    try {
        const saved = req.params.id
            ? await updateDocument('rooms', req.params.id, data, ctx.token)
            : await createDocument('rooms', { ...data, createdAt: new Date() }, ctx.token);
        res.status(req.params.id ? 200 : 201).json({ data: saved });
    } catch (_) {
        fail(res, 502, 'ROOM_SAVE_FAILED', 'Chưa lưu được phòng. Bạn thử lại nhé.');
    }
}
router.post('/admin/rooms', saveAdminRoom);
router.patch('/admin/rooms/:id', saveAdminRoom);

// ── Tiện ích ──
const fail = (res, status, code, message) =>
    res.status(status).json({ error: { code, message } });

const asString = (value, max = 200) =>
    typeof value === 'string' ? value.trim().slice(0, max) : '';

const asInt = (value, fallback = 0) => {
    const n = Number.parseInt(value, 10);
    return Number.isFinite(n) ? n : fallback;
};

const isIsoDate = commerce.validDate;

// Toàn bộ phép tính ngày dùng UTC.
// Nếu dùng giờ địa phương rồi toISOString(), máy ở múi giờ UTC+7 sẽ bị lùi
// mất một ngày — đặt 7 đêm lại ra ngày trả phòng của đêm thứ 6.
const addDays = (isoDate, days) => {
    const d = new Date(`${isoDate}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) return isoDate;
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().split('T')[0];
};

/** "2026-09-28" → "28/9". Dùng khi báo cho khách biết phòng bận ngày nào. */
const dayMonth = (isoDate) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(isoDate || ''));
    return m ? `${Number(m[3])}/${Number(m[2])}` : String(isoDate || '');
};

/** Số đêm giữa 2 ngày (ngày trả − ngày nhận). Trả 0 nếu ngày không hợp lệ. */
const nightsBetween = (checkIn, checkOut) => {
    const a = new Date(`${checkIn}T00:00:00Z`);
    const b = new Date(`${checkOut}T00:00:00Z`);
    if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
    return Math.round((b - a) / 86400000);
};

// Số điện thoại VN: 10 số bắt đầu bằng 0, hoặc +84...
const isPhone = (value) => /^(0\d{9}|\+84\d{9})$/.test(String(value).replace(/[\s.-]/g, '').replace(/^\+84/, '0'));

// ════════════════════════════════════════════════════════════
// TÀI KHOẢN — /v1/auth/*
// ════════════════════════════════════════════════════════════
const isEmail = (value) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);

const bearerToken = (req) => {
    const header = req.get('Authorization') || '';
    return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
};

// Chỉ giới hạn thao tác TẠO mới. Đăng nhập và làm mới phiên không đặt bộ đếm
// tại LOCALMATE: Firebase Authentication đã tự bảo vệ mật khẩu, còn bộ đếm
// theo IP tại đây từng khoá nhầm cả nhóm giám khảo dùng chung Wi-Fi.
const registrationLimiter = require('express-rate-limit').rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: { code: 'TOO_MANY_REGISTRATIONS', message: 'Có quá nhiều yêu cầu tạo mới. Vui lòng thử lại sau.' } },
});

router.post('/auth/register', registrationLimiter, async (req, res) => {
    const email = asString(req.body?.email, 160).toLowerCase();
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const fullName = asString(req.body?.full_name || req.body?.fullName, 120);

    if (!isEmail(email)) return fail(res, 400, 'INVALID_EMAIL', 'Email không hợp lệ.');
    if (password.length < 6) return fail(res, 400, 'WEAK_PASSWORD', 'Mật khẩu phải có ít nhất 6 ký tự.');
    if (fullName.length < 2) return fail(res, 400, 'INVALID_NAME', 'Vui lòng nhập họ tên.');

    try {
        res.status(201).json(await auth.register({ email, password, fullName }));
    } catch (err) {
        fail(res, err.status || 400, err.code || 'REGISTER_FAILED', err.message);
    }
});

router.post('/auth/login', async (req, res) => {
    const email = asString(req.body?.email, 160).toLowerCase();
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!isEmail(email)) return fail(res, 400, 'INVALID_EMAIL', 'Email không hợp lệ.');
    if (!password) return fail(res, 400, 'MISSING_PASSWORD', 'Vui lòng nhập mật khẩu.');

    try {
        res.json(await auth.login({ email, password }));
    } catch (err) {
        fail(res, err.status || 400, err.code || 'LOGIN_FAILED', err.message);
    }
});

// POST /v1/auth/refresh — đổi refresh token lấy token đăng nhập mới.
// Token đăng nhập chỉ sống 1 tiếng; không có đường này thì web đối tác và app
// im lặng chết sau tiếng đầu tiên.
router.post('/auth/refresh', async (req, res) => {
    const refreshToken = asString(req.body?.refresh_token || req.body?.refreshToken, 2000);
    if (!refreshToken) return fail(res, 400, 'MISSING_TOKEN', 'Thiếu refresh token.');

    try {
        res.json(await auth.refresh(refreshToken));
    } catch (err) {
        fail(res, err.status || 401, 'REFRESH_FAILED', err.message);
    }
});

router.get('/auth/me', async (req, res) => {
    const token = bearerToken(req);
    if (!token) return fail(res, 401, 'UNAUTHORIZED', 'Bạn chưa đăng nhập.');
    try {
        const user = await auth.me(token);
        // Kèm cờ quản trị để app biết CÓ NÊN hiện mục quản trị hay không.
        // Đây chỉ là gợi ý cho giao diện — mọi endpoint quản trị vẫn tự kiểm
        // tra lại bằng requireAdmin, nên sửa cờ này ở máy khách chẳng được gì.
        res.json({
            user: { ...user, is_admin: ADMIN_EMAILS.includes(String(user.email).toLowerCase()) },
        });
    } catch (err) {
        fail(res, err.status || 401, err.code || 'UNAUTHORIZED', err.message);
    }
});

// ════════════════════════════════════════════════════════════
// ĐỐI TÁC — đăng ký, nhận đơn, điều phối tài xế
// ════════════════════════════════════════════════════════════
// food = cơ sở đặc sản, quán ăn bán mang về
const PARTNER_TYPES = ['transport', 'tour', 'hotel', 'food'];

/** Xác thực và trả về { token, user, partner } — partner có thể null. */
/**
 * Tra đối tác theo id ở CẢ HAI nguồn: danh bạ có sẵn trong mã nguồn và
 * hồ sơ do đối tác tự đăng ký (data/partners.json).
 *
 * Trước đây chỉ tra danh bạ có sẵn, nên đơn đặt vào khách sạn tự đăng ký
 * không gắn được partnerId — đối tác đăng nhập vào không thấy đơn của
 * chính mình, mà cũng chẳng có thông báo lỗi nào.
 */
function findAnyPartner(id) {
    return findPartner(id) || store.find('partners', p => p.id === id);
}

/**
 * Chuyển các tin cũ còn mắc ở bước duyệt bài sang hiển thị ngay.
 *
 * Trước đây đối tác đã được duyệt hồ sơ vẫn phải chờ Admin duyệt từng tin.
 * Quy trình mới chỉ duyệt hồ sơ đối tác, nên khi máy chủ khởi động ta giải
 * phóng những tin pending/rejected của đối tác đã hợp lệ. Tin do đối tác chủ
 * động tạm ẩn vẫn được giữ nguyên.
 */
function publishLegacyPartnerListings() {
    let migrated = 0;
    for (const row of listings.listAll()) {
        if (!['pending', 'rejected'].includes(row.status)) continue;
        const seeded = findPartner(row.partnerId);
        const registered = seeded ? null : store.find('partners', p => p.id === row.partnerId);
        if (!seeded && registered?.status !== 'approved') continue;
        listings.update(row.id, {
            status: 'approved',
            rejectNote: '',
            publishedAt: row.publishedAt || new Date().toISOString(),
        });
        migrated += 1;
    }
    if (migrated) console.log(`[listings] Published ${migrated} legacy partner listing(s).`);
}

publishLegacyPartnerListings();

/**
 * Hồ sơ đối tác đã CHE, dùng cho mọi thứ gửi xuống trình duyệt.
 *
 * Số CCCD đầy đủ chỉ được rời máy chủ ở đúng một cửa: màn hình Admin đang
 * xét duyệt, và mỗi lần xem đều ghi nhật ký. Kể cả chính chủ đăng nhập vào
 * kênh đối tác cũng chỉ thấy 4 số cuối — họ vốn đã biết số của mình, hiện
 * đầy đủ ra đó không thêm được gì mà lại nằm sẵn trong mã trang, ai mượn
 * máy hay chụp màn hình là thấy.
 *
 * Tên tệp ảnh CCCD cũng không gửi đi: biết tên tệp cũng không tải được
 * (thư mục kín), nhưng không có lý do gì để nó xuất hiện trong trình duyệt.
 */
function hoSoAnToan(partner) {
    if (!partner) return partner;
    const { idNumber, idFrontFile, idBackFile, ...conLai } = partner;
    return { ...conLai, ...kyc.tomTat(partner) };
}

async function requirePartner(req, res) {
    const token = bearerToken(req);
    if (!token) {
        fail(res, 401, 'UNAUTHORIZED', 'Bạn chưa đăng nhập.');
        return null;
    }
    let user;
    try {
        user = await auth.me(token);
    } catch (err) {
        fail(res, 401, 'UNAUTHORIZED', err.message);
        return null;
    }

    // Đối tác cố định trong danh bạ (nhà xe/tour/khách sạn có sẵn)
    const seeded = findPartnerByEmail(user.email);
    if (seeded) return { token, user, partner: { ...seeded, status: 'approved', source: 'seed' } };

    // Đối tác tự đăng ký — hồ sơ lưu ở máy chủ (data/partners.json)
    const mine = store.find('partners', p => p.uid === user.id);
    if (mine) return { token, user, partner: { ...mine, source: 'store' } };

    return { token, user, partner: null };
}

/** Chỉ cho phép tài khoản quản trị. Trả về { token, user } hoặc null. */
async function requireAdmin(req, res) {
    const token = bearerToken(req);
    if (!token) {
        fail(res, 401, 'UNAUTHORIZED', 'Bạn chưa đăng nhập.');
        return null;
    }
    try {
        const user = await auth.me(token);
        if (!ADMIN_EMAILS.includes(String(user.email).toLowerCase())) {
            fail(res, 403, 'NOT_ADMIN', 'Tài khoản này không có quyền quản trị.');
            return null;
        }
        return { token, user };
    } catch (err) {
        fail(res, 401, 'UNAUTHORIZED', err.message);
        return null;
    }
}

// POST /v1/partners/register — ai cũng đăng ký làm đối tác được
router.post('/partners/register', registrationLimiter, async (req, res) => {
    const body = req.body || {};
    const type = asString(body.type, 20);
    const name = asString(body.name, 160);
    const phone = asString(body.phone, 20);
    const address = asString(body.address, 200);
    const email = asString(body.email, 160).toLowerCase();
    const password = typeof body.password === 'string' ? body.password : '';

    if (!PARTNER_TYPES.includes(type)) {
        return fail(res, 400, 'INVALID_TYPE', 'Chọn loại đối tác: nhà xe, tour hoặc lưu trú.');
    }
    if (name.length < 2) return fail(res, 400, 'INVALID_NAME', 'Vui lòng nhập tên đơn vị hoặc tên của bạn.');
    if (!isPhone(phone)) return fail(res, 400, 'INVALID_PHONE', 'Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0).');
    if (!isEmail(email)) return fail(res, 400, 'INVALID_EMAIL', 'Email không hợp lệ.');
    if (password.length < 6) return fail(res, 400, 'WEAK_PASSWORD', 'Mật khẩu phải có ít nhất 6 ký tự.');
    if (findPartnerByEmail(email)) {
        return fail(res, 400, 'EMAIL_EXISTS', 'Email này đã là đối tác. Bạn đăng nhập thẳng nhé.');
    }
    // Giấy tờ tuỳ thân. Khách đặt phòng là chuyển cọc cho người lạ, nên phải
    // biết người đứng sau tài khoản là ai thật — tên gõ vào ô trống thì gõ gì
    // cũng được. Ảnh hai mặt thẻ gửi ở bước sau (cần có tài khoản mới gửi
    // được, chứ mở cửa nhận ảnh cho người chưa đăng nhập là mời người ta đổ
    // rác vào ổ đĩa).
    const idName = asString(body.id_name || body.idName, 120);
    const idNumber = kyc.chiSo(body.id_number || body.idNumber);
    if (idName.length < 2) {
        return fail(res, 400, 'INVALID_ID_NAME', 'Nhập họ tên đúng như in trên CCCD/CMND.');
    }
    if (!kyc.hopLe(idNumber)) {
        return fail(res, 400, 'INVALID_ID_NUMBER',
            'Số CCCD phải có 12 số (hoặc CMND cũ 9 số).');
    }

    // 1. Tạo tài khoản đăng nhập.
    // Nếu email đã có tài khoản: thử đăng nhập bằng chính mật khẩu vừa nhập.
    // Trường hợp này xảy ra khi lần đăng ký trước tạo được tài khoản nhưng
    // lưu hồ sơ thất bại — không có bước này thì người dùng bị kẹt vĩnh viễn:
    // đăng ký báo "email đã tồn tại", đăng nhập báo "chưa phải đối tác".
    let session;
    try {
        session = await auth.register({ email, password, fullName: name });
    } catch (err) {
        if (err.code !== 'EMAIL_EXISTS') {
            return fail(res, err.status || 400, err.code || 'REGISTER_FAILED', err.message);
        }
        try {
            session = await auth.login({ email, password });
        } catch (loginErr) {
            return fail(res, 400, 'EMAIL_EXISTS',
                'Email này đã có tài khoản. Nếu là tài khoản của bạn, hãy nhập đúng mật khẩu cũ để hoàn tất đăng ký đối tác. Hoặc dùng email khác.');
        }

        // Đăng nhập được rồi — nếu đã có hồ sơ thì trả luôn, khỏi tạo trùng
        const existing = store.find('partners', p => p.uid === session.user.id);
        if (existing) {
            return res.json({
                token: session.token,
                user: session.user,
                partner: hoSoAnToan(existing),
                message: 'Bạn đã là đối tác rồi. Đang mở bảng điều khiển.',
            });
        }
        // Chưa có hồ sơ → đi tiếp xuống bước 2 để tạo
    }

    // 2. Lưu hồ sơ đối tác, chờ Admin duyệt
    const profile = {
        uid: session.user.id,
        type,
        name,
        email,
        phone,
        address,
        status: 'pending',
        rating: 0,
        reviews: 0,
        commission: type === 'tour' ? 0.15 : type === 'transport' ? 0.12 : 0.10,
        // Riêng nhà xe khai thêm thông tin phương tiện
        vehicleType: asString(body.vehicle_type, 20) || '',
        vehicleSeats: asInt(body.vehicle_seats, 0),
        plate: asString(body.plate, 20),
        note: asString(body.note, 300),
        // ── Giấy tờ tuỳ thân ──
        // idVerified chỉ bật khi Admin đã MỞ ảnh ra nhìn và bấm duyệt, không
        // bật tự động theo trạng thái hồ sơ.
        idName,
        idNumber,
        idFrontFile: '',
        idBackFile: '',
        idVerified: false,
        idSubmittedAt: '',
        createdAt: new Date().toISOString(),
    };

    try {
        const saved = store.insert('partners', profile, 'pn');

        // Hồ sơ nằm im chờ Admin tình cờ mở trang quản trị thì đối tác chờ
        // vô hạn. Báo ngay để duyệt trong ngày.
        notifications.push({
            audience: 'admin',
            kind: 'partner_pending',
            title: 'Hồ sơ đối tác mới chờ duyệt',
            body: `${name} · ${PARTNER_TYPE_LABEL[type] || type} · ${phone}`
                + ' — cần đối chiếu CCCD trước khi duyệt.',
            data: { partner_id: saved.id },
        });

        res.status(201).json({
            token: session.token,
            user: session.user,
            partner: hoSoAnToan(saved),
            message: 'Đã tạo hồ sơ. Bạn tải ảnh CCCD hai mặt lên để LOCALMATE đối chiếu nhé.',
        });
    } catch (err) {
        console.error('[partners/register]', err.message);
        fail(res, 500, 'PROFILE_FAILED',
            'Chưa lưu được hồ sơ. Bạn thử đăng ký lại bằng đúng email và mật khẩu này nhé.');
    }
});

// ── Admin duyệt đối tác ──
router.get('/admin/partners', async (req, res) => {
    const ctx = await requireAdmin(req, res);
    if (!ctx) return;
    // Bảng danh sách chỉ cần biết ĐÃ NỘP ĐỦ GIẤY CHƯA, không cần số đầy đủ.
    // Số đầy đủ nằm sau một cú bấm nữa, và cú bấm đó có ghi nhật ký.
    const rows = store.readAll('partners')
        .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
        .map(hoSoAnToan);
    res.json({
        data: rows,
        meta: {
            total: rows.length,
            waiting_docs: rows.filter(r => r.status === 'pending' && !r.id_complete).length,
        },
    });
});

const PARTNER_STATES = ['pending', 'approved', 'rejected'];
const PARTNER_TYPE_LABEL = {
    transport: 'Nhà xe', tour: 'Đơn vị tour', hotel: 'Lưu trú', food: 'Cơ sở đặc sản',
};

router.patch('/admin/partners/:id/status', async (req, res) => {
    const ctx = await requireAdmin(req, res);
    if (!ctx) return;

    const status = asString(req.body?.status, 20);
    if (!PARTNER_STATES.includes(status)) {
        return fail(res, 400, 'INVALID_STATUS', 'Trạng thái phải là pending, approved hoặc rejected.');
    }
    const truoc = store.find('partners', p => p.id === req.params.id);
    if (!truoc) return fail(res, 404, 'PARTNER_NOT_FOUND', 'Không tìm thấy hồ sơ này.');

    // Duyệt là xác nhận luôn "tôi đã mở ảnh CCCD ra nhìn và thấy khớp".
    // Không có giấy thì không có gì để đối chiếu, nên chặn ở đây — duyệt bừa
    // rồi mới đi tìm giấy thì cái nút duyệt chẳng còn nghĩa gì.
    if (status === 'approved' && !kyc.duGiayTo(truoc)) {
        return fail(res, 400, 'MISSING_ID_DOCS',
            'Hồ sơ này chưa nộp đủ CCCD (số + ảnh hai mặt) nên chưa đối chiếu được danh tính.');
    }

    const patch = { status, reviewedAt: new Date().toISOString(), reviewedBy: ctx.user.email };
    if (status === 'approved') patch.idVerified = true;
    if (status === 'rejected') patch.idVerified = false;
    const updated = store.update('partners', req.params.id, patch);

    // Đối tác gửi hồ sơ xong là ngồi chờ, không biết chờ tới bao giờ.
    notifications.push({
        audience: 'partner',
        partnerId: updated.id,
        kind: status === 'approved' ? 'partner_approved' : 'partner_rejected',
        title: status === 'approved' ? 'Hồ sơ đã được duyệt' : 'Hồ sơ chưa được duyệt',
        body: status === 'approved'
            ? 'LOCALMATE đã đối chiếu giấy tờ xong. Bạn đăng dịch vụ và nhận đơn được rồi.'
            : 'Giấy tờ chưa đối chiếu được. Bạn kiểm tra lại ảnh CCCD hoặc gọi cho LOCALMATE nhé.',
        data: { partner_id: updated.id, status },
    });

    // Duyệt xong là có thêm chỗ nghỉ thật; bot đang giữ bộ nhớ đệm cũ sẽ
    // trả lời "chưa có" cho đúng cái vừa được duyệt.
    try { chatbot.quenCache(); } catch (_) { /* không có cũng không sao */ }

    res.json({ data: hoSoAnToan(updated) });
});

router.delete('/admin/partners/:id', async (req, res) => {
    const ctx = await requireAdmin(req, res);
    if (!ctx) return;
    // Đã hứa giữ kín thì hồ sơ đi rồi ảnh CCCD phải đi theo. Bỏ lại một thư
    // mục đầy ảnh CCCD của người không còn liên quan là chuyện không nên có.
    const truoc = store.find('partners', p => p.id === req.params.id);
    const soAnhXoa = truoc ? kyc.xoaHetCua(truoc) : 0;

    const ok = store.remove('partners', req.params.id);
    if (!ok) return fail(res, 404, 'PARTNER_NOT_FOUND', 'Không tìm thấy hồ sơ này.');
    res.json({ data: { id: req.params.id, deleted: true, id_docs_deleted: soAnhXoa } });
});

// ════════════════════════════════════════════════════════════
// KÊNH ĐỐI TÁC — PHÂN TÍCH, ĐÁNH GIÁ, HỒ SƠ
// ════════════════════════════════════════════════════════════

/** Đối tác đã duyệt, dùng chung cho mấy cửa bên dưới. */
async function doiTacDaDuyet(req, res) {
    const ctx = await requirePartner(req, res);
    if (!ctx) return null;
    if (!ctx.partner) {
        fail(res, 403, 'NOT_PARTNER', 'Tài khoản này chưa phải đối tác.');
        return null;
    }
    if (ctx.partner.status !== 'approved') {
        fail(res, 403, 'NOT_APPROVED', 'Hồ sơ đối tác của bạn đang chờ duyệt.');
        return null;
    }
    return ctx;
}

// GET /v1/partner/analytics?month=YYYY-MM
//
// Bảng đối soát (/partner/revenue) trả lời câu hỏi kế toán: tháng này nhận về
// bao nhiêu. Cửa này trả lời câu hỏi kinh doanh: khá hơn hay kém tháng trước,
// ngày nào đông, phòng nào ra tiền, phòng nào đăng lên rồi để đó.
router.get('/partner/analytics', async (req, res) => {
    const ctx = await doiTacDaDuyet(req, res);
    if (!ctx) return;
    try {
        res.json(await phantich.forPartner(ctx.partner, asString(req.query.month, 10)));
    } catch (err) {
        console.error('[partner/analytics]', err.message);
        fail(res, 502, 'ANALYTICS_UNAVAILABLE', 'Chưa tính được số liệu, bạn thử lại nhé.');
    }
});

// GET /v1/partner/reviews — đánh giá khách viết về dịch vụ của mình
//
// Trả cả số điện thoại đã che và mã đơn: đối tác cần đối chiếu xem đánh giá
// này là của đơn nào để còn nhớ ra chuyện gì đã xảy ra, nhưng không cần và
// không nên thấy đủ số điện thoại của khách trong màn hình đánh giá.
router.get('/partner/reviews', async (req, res) => {
    const ctx = await doiTacDaDuyet(req, res);
    if (!ctx) return;

    const rows = reviews.listForPartner(ctx.partner.id);
    const sao = rows.length
        ? Math.round((rows.reduce((s, r) => s + (r.rating || 0), 0) / rows.length) * 10) / 10
        : 0;

    res.json({
        data: rows.map(reviews.toPublic),
        meta: {
            total: rows.length,
            average: sao,
            // Chưa trả lời là việc còn tồn: khách viết mà không ai đáp thì
            // người đọc sau nhìn vào thấy chỗ này không quan tâm khách.
            unanswered: rows.filter(r => !r.reply).length,
            // Phổ điểm, để biết đang bị kéo xuống bởi vài đơn hay là đều đều
            breakdown: [5, 4, 3, 2, 1].map(n => ({
                stars: n,
                count: rows.filter(r => r.rating === n).length,
            })),
        },
    });
});

// PATCH /v1/partner/me — sửa hồ sơ và tài khoản nhận tiền
//
// Vì sao phải có: LOCALMATE giữ hộ tiền cọc rồi cuối kỳ chuyển cho đối tác,
// nhưng trước đây không có chỗ nào để họ khai chuyển VÀO ĐÂU. Đối soát ra số
// tiền phải trả mà không có số tài khoản thì con số đó nằm im.
//
// Những thứ KHÔNG cho tự sửa, và cố ý:
//   - hoa hồng, trạng thái duyệt: đối tác tự sửa thì còn gì là duyệt
//   - loại hình đối tác: đổi từ nhà xe sang lưu trú là hồ sơ khác hẳn
//   - họ tên và số CCCD: đã đối chiếu với ảnh thẻ rồi, sửa được thì việc
//     đối chiếu thành vô nghĩa. Cần sửa thì nộp lại ảnh để xét lại.
router.patch('/partner/me', async (req, res) => {
    const ctx = await requirePartner(req, res);
    if (!ctx) return;
    if (!ctx.partner) return fail(res, 403, 'NOT_PARTNER', 'Tài khoản này chưa phải đối tác.');
    if (ctx.partner.source === 'seed') {
        return fail(res, 400, 'SEED_PARTNER', 'Hồ sơ cài sẵn không sửa từ đây được.');
    }

    const b = req.body || {};
    const patch = {};

    if (b.name !== undefined) {
        const v = asString(b.name, 160);
        if (v.length < 2) return fail(res, 400, 'INVALID_NAME', 'Tên đơn vị quá ngắn.');
        patch.name = v;
    }
    if (b.phone !== undefined) {
        const v = asString(b.phone, 20);
        if (!isPhone(v)) return fail(res, 400, 'INVALID_PHONE', 'Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0).');
        patch.phone = v;
    }
    if (b.address !== undefined) patch.address = asString(b.address, 200);
    if (b.note !== undefined) patch.note = asString(b.note, 300);
    if (b.plate !== undefined) patch.plate = asString(b.plate, 20);

    // ── Tài khoản nhận tiền ──
    // Nhận đủ ba thứ hoặc không nhận gì: thiếu tên chủ tài khoản thì ngân hàng
    // trả lại lệnh chuyển, mà lúc đó mới hỏi thì đã trễ cả kỳ.
    const coBank = ['bank_name', 'bank_account', 'bank_holder']
        .some(k => b[k] !== undefined);
    if (coBank) {
        const bankName = asString(b.bank_name, 80);
        const bankAcc = asString(b.bank_account, 40).replace(/\s/g, '');
        const bankHolder = asString(b.bank_holder, 120);

        const rong = !bankName && !bankAcc && !bankHolder;
        if (!rong) {
            if (!bankName) return fail(res, 400, 'MISSING_BANK', 'Chọn ngân hàng nhận tiền.');
            if (!/^\d{6,20}$/.test(bankAcc)) {
                return fail(res, 400, 'INVALID_ACCOUNT', 'Số tài khoản chỉ gồm chữ số, từ 6 đến 20 số.');
            }
            if (bankHolder.length < 2) {
                return fail(res, 400, 'MISSING_HOLDER', 'Nhập tên chủ tài khoản đúng như ngân hàng ghi.');
            }
        }
        patch.bankName = bankName;
        patch.bankAccount = bankAcc;
        patch.bankHolder = bankHolder;
        patch.bankUpdatedAt = new Date().toISOString();
    }

    if (!Object.keys(patch).length) {
        return fail(res, 400, 'NOTHING_TO_UPDATE', 'Không có thay đổi nào để lưu.');
    }

    const updated = store.update('partners', ctx.partner.id, patch);
    if (!updated) return fail(res, 404, 'PARTNER_NOT_FOUND', 'Không tìm thấy hồ sơ.');

    // Đổi tên hay số điện thoại là đổi thứ khách nhìn thấy — bot đang giữ
    // bộ nhớ đệm cũ sẽ đọc tên cũ cho khách nghe.
    try { chatbot.quenCache(); } catch (_) { /* khong co cung khong sao */ }

    res.json({ data: hoSoAnToan(updated), message: 'Đã lưu thay đổi.' });
});

// ════════════════════════════════════════════════════════════
// GIẤY TỜ TUỲ THÂN
// ════════════════════════════════════════════════════════════

// POST /v1/partner/kyc/:side — đối tác gửi ảnh CCCD (side = front | back)
//
// Nhận thẳng byte ảnh như /v1/uploads/image, nhưng KHÔNG dùng lại cửa đó:
// ảnh ở đó rơi vào public/uploads/, ai có đường dẫn cũng xem được. Ảnh CCCD
// phải rơi vào thư mục kín.
//
// Hồ sơ đang chờ duyệt vẫn nộp được — phải nộp được thì mới có cái để duyệt.
router.post(
    '/partner/kyc/:side',
    express.raw({ type: ['image/*', 'application/octet-stream'], limit: uploads.MAX_BYTES }),
    async (req, res) => {
        const ctx = await requirePartner(req, res);
        if (!ctx) return;
        if (!ctx.partner) return fail(res, 403, 'NOT_A_PARTNER', 'Tài khoản này chưa đăng ký làm đối tác.');
        if (ctx.partner.source === 'seed') {
            return fail(res, 400, 'SEED_PARTNER', 'Hồ sơ cài sẵn không cần nộp giấy tờ.');
        }

        const side = asString(req.params.side, 10);
        try {
            const saved = kyc.luuAnh(req.body, ctx.partner.id, side);

            // Thay ảnh thì xoá ảnh cũ ngay, đừng để tồn kho ảnh CCCD
            const truong = side === 'front' ? 'idFrontFile' : 'idBackFile';
            const anhCu = ctx.partner[truong];
            if (anhCu) kyc.xoaAnh(anhCu);

            const patch = { [truong]: saved.file, idSubmittedAt: new Date().toISOString() };
            // Nộp lại ảnh sau khi đã duyệt thì phải xét lại: người ta có thể
            // thay bằng giấy của người khác.
            if (ctx.partner.idVerified) patch.idVerified = false;
            const updated = store.update('partners', ctx.partner.id, patch);

            if (kyc.duGiayTo(updated) && updated.status === 'pending') {
                notifications.push({
                    audience: 'admin',
                    kind: 'partner_docs_ready',
                    title: 'Hồ sơ đối tác đã đủ giấy tờ',
                    body: `${updated.name} đã nộp CCCD hai mặt — mời đối chiếu và duyệt.`,
                    data: { partner_id: updated.id },
                });
            }

            res.status(201).json({
                data: kyc.tomTat(updated),
                message: `Đã nhận ảnh ${kyc.SIDE_LABEL[side] || side}.`,
            });
        } catch (err) {
            const messages = {
                BAD_SIDE: 'Chỉ nhận mặt trước hoặc mặt sau.',
                EMPTY: 'Chưa chọn được ảnh nào.',
                TOO_BIG: `Ảnh lớn hơn ${Math.round(uploads.MAX_BYTES / 1024 / 1024)} MB.`,
                BAD_TYPE: 'Tệp không phải ảnh JPG, PNG hay WebP.',
            };
            fail(res, 400, err.code || 'UPLOAD_FAILED', messages[err.code] || 'Không nhận được ảnh.');
        }
    },
);

// GET /v1/admin/partners/:id/identity — số CCCD ĐẦY ĐỦ, chỉ Admin
//
// Cửa duy nhất số đầy đủ được rời máy chủ. Mỗi lần mở đều ghi nhật ký: có
// nhật ký thì sau này còn trả lời được câu "ai đã xem giấy tờ của tôi".
router.get('/admin/partners/:id/identity', async (req, res) => {
    const ctx = await requireAdmin(req, res);
    if (!ctx) return;

    const p = store.find('partners', x => x.id === req.params.id);
    if (!p) return fail(res, 404, 'PARTNER_NOT_FOUND', 'Không tìm thấy hồ sơ này.');

    store.insert('kyc_audit', {
        partnerId: p.id,
        partnerName: p.name || '',
        by: ctx.user.email,
        at: new Date().toISOString(),
        ip: String(req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim(),
    }, 'au');

    // Trình duyệt và proxy tuyệt đối không được giữ lại bản sao
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.json({
        data: {
            id: p.id,
            name: p.name || '',
            id_name: p.idName || '',
            id_number: p.idNumber || '',
            id_has_front: Boolean(p.idFrontFile),
            id_has_back: Boolean(p.idBackFile),
            id_verified: Boolean(p.idVerified),
            id_submitted_at: p.idSubmittedAt || '',
        },
    });
});

// GET /v1/admin/partners/:id/identity/:side — ảnh CCCD, chỉ Admin
//
// Thẻ <img> không gửi kèm được header Authorization, nên trang Admin phải
// tải ảnh bằng fetch rồi dựng blob. Đổi lại là ảnh không bao giờ nằm ở một
// đường dẫn mở ai gõ cũng xem được.
router.get('/admin/partners/:id/identity/:side', async (req, res) => {
    const ctx = await requireAdmin(req, res);
    if (!ctx) return;

    const p = store.find('partners', x => x.id === req.params.id);
    if (!p) return fail(res, 404, 'PARTNER_NOT_FOUND', 'Không tìm thấy hồ sơ này.');

    const side = String(req.params.side || '').replace(/\.[a-z]+$/i, '');
    const file = side === 'front' ? p.idFrontFile : side === 'back' ? p.idBackFile : '';
    if (!file) return fail(res, 404, 'NO_DOC', `Hồ sơ chưa nộp ảnh ${kyc.SIDE_LABEL[side] || side}.`);

    const anh = kyc.docAnh(file);
    if (!anh) return fail(res, 404, 'NO_DOC', 'Tệp ảnh không còn trên máy chủ.');

    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Content-Type', anh.mime);
    res.send(anh.buffer);
});

// GET /v1/partner/me
router.get('/partner/me', async (req, res) => {
    const ctx = await requirePartner(req, res);
    if (!ctx) return;
    if (!ctx.partner) return fail(res, 403, 'NOT_A_PARTNER', 'Tài khoản này chưa đăng ký làm đối tác.');
    res.json({
        partner: hoSoAnToan(ctx.partner),
        online: ctx.partner.type === 'transport' ? dispatch.isOnline(ctx.partner.id) : null,
    });
});

/**
 * Chủ thật của một đơn.
 *
 * Các đơn cũ từng được ghi thiếu partnerId dù roomId/tourSlug/listingId vẫn
 * trỏ đúng tin của đối tác. Nếu chỉ lọc partnerId thì các đơn đó biến mất khỏi
 * kênh đối tác. Suy ngược từ mã dịch vụ để vừa hiện lại đơn cũ, vừa không mở
 * dữ liệu của đối tác khác.
 */
function bookingPartnerId(booking) {
    if (booking?.partnerId) return String(booking.partnerId);
    if (booking?.kind === 'hotel') {
        const row = listings.find(booking.roomId);
        // Phòng do LOCALMATE tạo từ trang Admin không nằm trong listings và
        // các bản ghi cũ chưa có partnerId. Đây là phòng vận hành bởi đối tác
        // lưu trú mặc định, không phải một đơn "vô chủ".
        return String(row?.partnerId || findStay(booking.roomId)?.partnerId || 'bn-hotel-01');
    }
    if (booking?.kind === 'tour') {
        const tour = findTour(booking.tourSlug);
        const row = listings.find(booking.tourSlug);
        return String(tour?.partnerId || row?.partnerId || '');
    }
    if (booking?.kind === 'food') return String(listings.find(booking.listingId)?.partnerId || '');
    // Đơn xe cũ trước khi lưu partnerId vẫn phải trở lại bảng của nhà xe mặc
    // định. Đơn mới luôn có chủ cụ thể và đã được trả ở nhánh đầu hàm.
    if (booking?.kind === 'transport') return 'bn-transport-01';
    return '';
}

// GET /v1/partner/bookings — chỉ đơn của chính mình
router.get('/partner/bookings', async (req, res) => {
    const ctx = await requirePartner(req, res);
    if (!ctx) return;
    if (!ctx.partner) return fail(res, 403, 'NOT_A_PARTNER', 'Tài khoản này chưa đăng ký làm đối tác.');
    if (ctx.partner.status !== 'approved') {
        return res.json({ data: [], meta: { total: 0, pending_approval: true } });
    }

    try {
        const all = await listDocuments('bookings', { idToken: ctx.token });
        const mine = all
            .filter(b => bookingPartnerId(b) === String(ctx.partner.id))
            .map(b => (b.partnerId ? b : { ...b, partnerId: ctx.partner.id, ownershipRecovered: true }))
            .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
        res.set('Cache-Control', 'private, no-store');
        res.json({ data: mine, meta: { total: mine.length } });
    } catch (err) {
        console.error('[partner/bookings]', err.message);
        fail(res, 502, 'BOOKINGS_UNAVAILABLE', 'Không tải được danh sách đơn.');
    }
});

// PATCH /v1/partner/bookings/:id/status — xác nhận / từ chối / hoàn thành
const PARTNER_STATUSES = ['confirmed', 'cancelled', 'completed'];

/**
 * Lời báo cho khách khi đơn đổi trạng thái.
 *
 * Gom về một chỗ vì cùng một chuyện đó xảy ra ở ba cửa khác nhau (đối tác
 * bấm, quản trị bấm, thanh toán xong tự đổi). Mỗi cửa tự nghĩ một câu thì
 * khách nhận được ba giọng khác nhau cho cùng một việc.
 *
 * Câu chữ theo đúng thứ khách cần biết TIẾP THEO là gì, không chỉ thông báo
 * suông: xác nhận rồi thì giữ máy chờ gọi, huỷ rồi thì tiền cọc ra sao.
 */
function loiBaoDon(status, booking, code) {
    const ten = booking.roomName || booking.tourName || 'đơn của bạn';
    // roomName thường đã kèm sẵn tên đối tác. Ghép thêm lần nữa thì ra câu
    // "Homestay X · Homestay X — Homestay X đã nhận đơn", đọc như máy hỏng.
    const nguoiNhan = booking.partnerName || '';
    const noiNhan = (nguoiNhan && !ten.includes(nguoiNhan)) ? nguoiNhan : 'Bên cung cấp';
    switch (status) {
        case 'confirmed':
            return {
                title: 'Đơn đã được xác nhận',
                body: `${code} · ${ten} — ${noiNhan} đã nhận đơn. `
                    + 'Bạn giữ máy để bên cung cấp gọi xác nhận giờ giấc nhé.',
            };
        case 'cancelled':
            return {
                title: 'Đơn đã bị huỷ',
                body: `${code} · ${ten} không nhận được. `
                    + (Number(booking.depositAmount) > 0
                        ? 'Tiền cọc sẽ được hoàn lại, LOCALMATE sẽ gọi cho bạn.'
                        : 'Bạn chọn giúp mình lựa chọn khác nhé.'),
            };
        case 'completed':
            return {
                title: 'Chuyến đi đã hoàn thành',
                body: `${code} · ${ten} — cảm ơn bạn đã đi cùng LOCALMATE. `
                    + 'Bạn dành ít phút đánh giá để người sau chọn dễ hơn nhé.',
            };
        default:
            return { title: 'Đơn có cập nhật', body: `${code} · ${ten}` };
    }
}

/** Mã đơn khách đọc được: 8 ký tự cuối, viết hoa. */
const maDon = (id) => String(id || '').slice(-8).toUpperCase();

router.patch('/partner/bookings/:id/status', commerce.serialize(req => 'status:' + req.params.id, async (req, res) => {
    const ctx = await requirePartner(req, res);
    if (!ctx) return;
    if (!ctx.partner || ctx.partner.status !== 'approved') {
        return fail(res, 403, 'NOT_A_PARTNER', 'Tài khoản chưa được duyệt làm đối tác.');
    }

    const status = asString(req.body?.status, 20);
    if (!PARTNER_STATUSES.includes(status)) {
        return fail(res, 400, 'INVALID_STATUS', 'Trạng thái phải là confirmed, cancelled hoặc completed.');
    }

    try {
        const all = await listDocuments('bookings', { idToken: ctx.token });
        const booking = all.find(b => b.id === req.params.id);
        if (!booking) return fail(res, 404, 'BOOKING_NOT_FOUND', 'Không tìm thấy đơn này.');
        const ownerId = bookingPartnerId(booking);
        if (ownerId !== String(ctx.partner.id)) {
            return fail(res, 403, 'NOT_YOUR_BOOKING', 'Đơn này không thuộc về bạn.');
        }
        if (!commerce.transition(booking.status, status)) return fail(res, 409, 'INVALID_TRANSITION', 'Đơn đã đổi trạng thái. Bạn tải lại danh sách nhé.');
        await updateDocument('bookings', booking.id, {
            status,
            updatedAt: new Date(),
            ...(!booking.partnerId ? { partnerId: ownerId, partnerName: ctx.partner.name || '' } : {}),
        }, ctx.token);
        if (status === 'cancelled') restoreFoodStock(booking);

        // Khách phải biết NGAY. Đối tác bấm xong tưởng là khách đã hay, khách
        // thì vẫn đang chờ — tới ngày nhận phòng mới vỡ lẽ.
        const code = maDon(booking.id);
        const loi = loiBaoDon(status, booking, code);
        notifications.push({
            audience: 'guest',
            phone: booking.phone,
            kind: 'booking_' + status,
            title: loi.title,
            body: loi.body,
            bookingId: booking.id,
            data: { kind: 'booking_status', status, code },
        });

        // Quản trị theo dõi cả sàn: đơn nào bị đối tác huỷ thì phải biết mà
        // gọi cho khách, đừng để khách tự xoay.
        notifications.push({
            audience: 'admin',
            kind: 'booking_' + status,
            title: status === 'cancelled' ? 'Đối tác đã huỷ một đơn' : 'Đối tác cập nhật đơn',
            body: `${code} · ${ctx.partner.name} · `
                + { confirmed: 'đã nhận đơn', cancelled: 'không nhận được', completed: 'đã hoàn thành' }[status],
            bookingId: booking.id,
        });

        res.json({ data: { id: booking.id, status }, notified_guest: Boolean(booking.phone) });
    } catch (err) {
        console.error('[partner/bookings/status]', err.message);
        fail(res, 502, 'UPDATE_FAILED', 'Không cập nhật được trạng thái đơn.');
    }
}));

// PATCH /v1/admin/bookings/:id/status — quản trị duyệt / huỷ / hoàn thành đơn
//
// Vì sao phải có cửa này: trang Admin trước đây ghi THẲNG vào Firestore từ
// trình duyệt. Nhanh thì có nhanh, nhưng máy chủ không hề biết đơn vừa đổi
// trạng thái nên không cách nào gửi thông báo cho khách được. Mà đây lại
// đúng là đường duyệt đơn hay dùng nhất — chủ nhà tự duyệt đơn phòng của
// chính mình. Nói cách khác: đường phổ biến nhất là đường im lặng nhất.
const ADMIN_BOOKING_STATUSES = ['pending', 'confirmed', 'cancelled', 'completed'];

router.patch('/admin/bookings/:id/status', commerce.serialize(req => 'status:' + req.params.id, async (req, res) => {
    const ctx = await requireAdmin(req, res);
    if (!ctx) return;

    const status = asString(req.body?.status, 20);
    if (!ADMIN_BOOKING_STATUSES.includes(status)) {
        return fail(res, 400, 'INVALID_STATUS',
            'Trạng thái phải là pending, confirmed, cancelled hoặc completed.');
    }

    try {
        const all = await listDocuments('bookings', { idToken: ctx.token });
        const booking = all.find(b => b.id === req.params.id);
        if (!booking) return fail(res, 404, 'BOOKING_NOT_FOUND', 'Không tìm thấy đơn này.');

        if (!commerce.transition(booking.status, status)) return fail(res, 409, 'INVALID_TRANSITION', 'Không thể đổi trạng thái này; đơn đã kết thúc hoặc cần xác nhận trước.');
        await updateDocument('bookings', booking.id, {
            status, updatedAt: new Date(), statusBy: ctx.user.email,
        }, ctx.token);
        if (status === 'cancelled') restoreFoodStock(booking);

        const code = maDon(booking.id);

        // 'pending' là kéo đơn về lại chờ xử lý — chuyện nội bộ, báo cho khách
        // chỉ làm họ hoang mang chứ không giúp gì.
        if (status !== 'pending' && booking.phone) {
            const loi = loiBaoDon(status, booking, code);
            notifications.push({
                audience: 'guest',
                phone: booking.phone,
                kind: 'booking_' + status,
                title: loi.title,
                body: loi.body,
                bookingId: booking.id,
                data: { kind: 'booking_status', status, code },
            });
        }

        // Đơn của đối tác mà quản trị xử lý hộ thì đối tác cũng phải hay
        if (booking.partnerId && status !== 'pending') {
            notifications.push({
                audience: 'partner',
                partnerId: booking.partnerId,
                kind: 'booking_' + status,
                title: 'LOCALMATE đã cập nhật một đơn của bạn',
                body: `${code} · `
                    + { confirmed: 'đã xác nhận', cancelled: 'đã huỷ', completed: 'đã hoàn thành' }[status],
                bookingId: booking.id,
            });
        }

        res.json({
            data: { id: booking.id, status },
            notified_guest: status !== 'pending' && Boolean(booking.phone),
        });
    } catch (err) {
        console.error('[admin/bookings/status]', err.message);
        fail(res, 502, 'UPDATE_FAILED', 'Không cập nhật được trạng thái đơn.');
    }
}));

// ── Tài xế: bật/tắt nhận đơn, gửi vị trí, nhận lời mời ──
async function requireDriver(req, res) {
    const ctx = await requirePartner(req, res);
    if (!ctx) return null;
    if (!ctx.partner || ctx.partner.type !== 'transport') {
        fail(res, 403, 'NOT_A_DRIVER', 'Tài khoản này không phải nhà xe.');
        return null;
    }
    if (ctx.partner.status !== 'approved') {
        fail(res, 403, 'NOT_APPROVED', 'Hồ sơ của bạn đang chờ LOCALMATE duyệt.');
        return null;
    }
    return ctx;
}

// Danh sách khu vực tài xế có thể đăng ký nhận đơn
router.get('/service-areas', (req, res) => {
    res.json({
        data: SERVICE_AREAS.map(({ slug, name, province }) => ({ slug, name, province })),
        radius_km: dispatch.SEARCH_RADIUS_KM,
    });
});

router.post('/driver/online', async (req, res) => {
    const ctx = await requireDriver(req, res);
    if (!ctx) return;

    // Tài xế có 2 cách bật nhận đơn:
    //  1. Chọn khu vực (Châu Đốc, Tri Tôn…) — không cần GPS
    //  2. Dùng vị trí hiện tại — chính xác hơn, hợp khi đang chạy ngoài đường
    const areaSlug = asString(req.body?.area, 40);
    const area = areaSlug ? findArea(areaSlug) : null;
    if (areaSlug && !area) {
        return fail(res, 400, 'INVALID_AREA', 'Khu vực không hợp lệ.');
    }

    let lat = Number.parseFloat(req.body?.lat);
    let lng = Number.parseFloat(req.body?.lng);
    if (area) {
        lat = area.lat;
        lng = area.lng;
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return fail(res, 400, 'INVALID_COORDS',
            'Hãy chọn khu vực nhận đơn, hoặc bật định vị để dùng vị trí hiện tại.');
    }

    const driver = dispatch.goOnline(ctx.partner.id, {
        lat, lng,
        areaSlug: area ? area.slug : '',
        areaName: area ? area.name : '',
        vehicleType: ctx.partner.vehicleType || '4-seat',
        seats: ctx.partner.vehicleSeats || 4,
        name: ctx.partner.name,
        phone: ctx.partner.phone,
        plate: ctx.partner.plate || '',
    });

    // Có chuyến đang treo chưa ai nhận thì mời ngay, khỏi bắt khách đặt lại
    const revived = dispatch.offerWaitingTo(ctx.partner.id);
    const where = area ? area.name : 'vị trí hiện tại';

    res.json({
        online: true,
        driver,
        waiting_offers: revived,
        area: area ? { slug: area.slug, name: area.name } : null,
        message: revived
            ? `Có ${revived} chuyến đang chờ quanh ${where}!`
            : `Đang nhận đơn quanh ${where}, bán kính ${dispatch.SEARCH_RADIUS_KM} km.`,
    });
});

router.post('/driver/offline', async (req, res) => {
    const ctx = await requireDriver(req, res);
    if (!ctx) return;
    dispatch.goOffline(ctx.partner.id);
    res.json({ online: false });
});

router.post('/driver/heartbeat', async (req, res) => {
    const ctx = await requireDriver(req, res);
    if (!ctx) return;
    const lat = Number.parseFloat(req.body?.lat);
    const lng = Number.parseFloat(req.body?.lng);
    // Tài xế nhận đơn theo khu vực không cần gửi toạ độ, chỉ cần báo còn online.
    const current = dispatch.driverOf(ctx.partner.id);
    if (!current?.areaSlug && (!Number.isFinite(lat) || !Number.isFinite(lng))) {
        return fail(res, 400, 'INVALID_COORDS', 'Toạ độ không hợp lệ.');
    }
    const driver = dispatch.heartbeat(ctx.partner.id, lat, lng);
    if (!driver) return fail(res, 409, 'NOT_ONLINE', 'Bạn đang tắt nhận đơn.');
    res.json({ online: true, driver });
});

// App tài xế gọi liên tục màn hình này để "nổ đơn"
router.get('/driver/offers', async (req, res) => {
    const ctx = await requireDriver(req, res);
    if (!ctx) return;
    const me = dispatch.driverOf(ctx.partner.id);
    const list = dispatch.pendingOffersFor(ctx.partner.id).map(offer => ({
        id: offer.id,
        booking_id: offer.bookingId,
        distance_km: offer.distanceKm,
        seconds_left: Math.max(0, Math.round((offer.expiresAt - Date.now()) / 1000)),
        pickup: offer.booking.pickup,
        dropoff: offer.booking.dropoff,
        date: offer.booking.date,
        time: offer.booking.time,
        seats: offer.booking.seats,
        price: offer.booking.price,
        guest_name: offer.booking.guestName,
    }));
    res.json({
        online: dispatch.isOnline(ctx.partner.id),
        area: me?.areaSlug ? { slug: me.areaSlug, name: me.areaName } : null,
        radius_km: dispatch.SEARCH_RADIUS_KM,
        data: list,
        meta: { total: list.length },
    });
});

router.post('/driver/offers/:id/accept', async (req, res) => {
    const ctx = await requireDriver(req, res);
    if (!ctx) return;
    const result = dispatch.acceptOffer(req.params.id, ctx.partner.id);
    if (result.error) {
        const messages = {
            OFFER_NOT_FOUND: 'Không tìm thấy lời mời này.',
            NOT_YOUR_OFFER: 'Lời mời này không dành cho bạn.',
            OFFER_CLOSED: 'Chuyến này đã có tài xế khác nhận.',
            OFFER_EXPIRED: 'Lời mời đã hết hạn.',
        };
        return fail(res, 409, result.error, messages[result.error] || 'Không nhận được chuyến.');
    }

    // Gắn tài xế vào đơn và chuyển sang đã xác nhận
    try {
        await updateDocument('bookings', result.offer.bookingId, {
            partnerId: ctx.partner.id,
            partnerName: ctx.partner.name,
            driverPhone: ctx.partner.phone || '',
            status: 'confirmed',
            updatedAt: new Date(),
        }, ctx.token);
    } catch (err) {
        console.error('[driver/accept]', err.message);
    }

    // Mở phiên bám vị trí để khách theo dõi xe trên bản đồ
    dispatch.startTrip(result.offer.bookingId, ctx.partner.id, result.offer.booking);

    const ride = result.offer.booking || {};

    // Khách đang hồi hộp chờ nhất đúng lúc này — báo ngay ai sẽ tới đón
    notifications.push({
        audience: 'guest',
        phone: ride.phone || ride.guestPhone,
        kind: 'driver_accepted',
        title: 'Đã có tài xế nhận chuyến',
        body: `${ctx.partner.name} đang tới đón bạn tại ${ride.pickup || 'điểm hẹn'}.`
            + (ctx.partner.phone ? ` Gọi: ${ctx.partner.phone}` : ''),
        bookingId: result.offer.bookingId,
        data: { partner_name: ctx.partner.name, partner_phone: ctx.partner.phone || '' },
    });
    res.json({
        data: {
            booking_id: result.offer.bookingId,
            status: 'confirmed',
            // App tài xế dùng mấy trường này để mở Google Maps chỉ đường
            pickup: ride.pickup || '',
            pickup_lat: ride.pickupLat ?? null,
            pickup_lng: ride.pickupLng ?? null,
            dropoff: ride.dropoff || '',
            guest_name: ride.guestName || '',
            guest_phone: ride.guestPhone || '',
        },
    });
});

router.post('/driver/offers/:id/decline', async (req, res) => {
    const ctx = await requireDriver(req, res);
    if (!ctx) return;
    const result = dispatch.declineOffer(req.params.id, ctx.partner.id);
    if (result.error) return fail(res, 409, result.error, 'Không xử lý được lời mời.');
    res.json({ data: { passed_to_next: Boolean(result.next) } });
});

// ════════════════════════════════════════════════════════════
// KHÁCH TRA CỨU & HUỶ ĐƠN CỦA MÌNH
// ════════════════════════════════════════════════════════════
// Trước đây khách đặt xong chỉ nhận một mã rồi thôi: không xem lại được,
// không huỷ được, đổi điện thoại là mất dấu. Hai cách tra ở đây:
//   • Đã đăng nhập  → GET /v1/my/bookings, lấy theo userId
//   • Chưa đăng nhập → GET /v1/bookings/lookup?phone=&code=

/** Rút gọn đơn để trả cho khách — không lộ thông tin nội bộ. */
/**
 * Đường đi của một đơn, dựng từ những dấu thời gian đã lưu sẵn.
 *
 * Không thêm bảng lịch sử riêng: mọi mốc cần thiết đều đã nằm trên đơn
 * (createdAt, paymentClaimedAt, paidAt, updatedAt, cancelledAt). Dựng lại từ
 * đó thì đơn cũ cũng có đường đi, chứ thêm bảng mới thì chỉ đơn từ hôm nay
 * trở đi mới có.
 *
 * Mỗi bước có `xong` (đã qua) hoặc chưa — để giao diện vẽ đường kẻ mờ dần
 * chứ không phải một danh sách phẳng.
 */
function duongDiCua(b) {
    const luc = (v) => {
        if (!v) return '';
        // Firestore trả về { _seconds } hoặc chuỗi ISO tuỳ đường đọc
        if (typeof v === 'object' && v._seconds) return new Date(v._seconds * 1000).toISOString();
        if (typeof v === 'object' && v.seconds) return new Date(v.seconds * 1000).toISOString();
        const d = new Date(v);
        return Number.isNaN(d.getTime()) ? '' : d.toISOString();
    };

    const huy = b.status === 'cancelled';
    const buoc = [];

    buoc.push({
        ma: 'dat',
        ten: 'Bạn đã đặt',
        mo_ta: 'LOCALMATE đã nhận yêu cầu và chuyển cho bên cung cấp.',
        luc: luc(b.createdAt),
        xong: true,
    });

    // Bước tiền chỉ hiện khi đơn này THỰC SỰ có thu cọc. Đơn đặc sản không
    // thu cọc mà vẫn bày ra bước "chuyển cọc" thì khách tưởng mình còn thiếu.
    const coCoc = (Number(b.depositAmount) || payments.depositFor(b)) > 0;
    if (coCoc) {
        const daCoc = b.paymentStatus === 'paid';
        const dangDoi = b.paymentStatus === 'pending_confirm';
        buoc.push({
            ma: 'coc',
            // Ba trạng thái khác nhau, ba câu khác nhau. Khách đã bấm "tôi
            // chuyển rồi" mà màn hình vẫn ghi "chờ bạn chuyển cọc" thì họ
            // tưởng mình bấm hụt và chuyển thêm lần nữa.
            ten: daCoc ? 'Đã nhận tiền cọc'
                : dangDoi ? 'Đang đối chiếu tiền cọc'
                : 'Chờ bạn chuyển cọc',
            mo_ta: daCoc
                ? 'LOCALMATE đã đối chiếu sao kê và nhận được tiền cọc.'
                : b.paymentStatus === 'pending_confirm'
                    ? 'Bạn đã báo chuyển. LOCALMATE đang đối chiếu với sao kê ngân hàng.'
                    : 'Chuyển cọc để giữ chắc chỗ. Chưa cọc thì đơn vẫn có thể bị nhận trước.',
            luc: luc(b.paidAt) || luc(b.paymentClaimedAt),
            xong: daCoc,
        });
    }

    const daNhan = ['confirmed', 'completed'].includes(b.status);
    buoc.push({
        ma: 'xacnhan',
        ten: daNhan ? 'Bên cung cấp đã nhận đơn' : 'Chờ bên cung cấp xác nhận',
        mo_ta: daNhan
            ? (b.partnerName ? b.partnerName + ' đã nhận đơn của bạn.' : 'Đơn đã được nhận.')
            : 'Thường trong vài giờ. Họ sẽ gọi cho bạn theo số đã đăng ký.',
        luc: daNhan ? luc(b.updatedAt) : '',
        xong: daNhan,
    });

    if (b.kind === 'food') {
        buoc.push({
            ma: 'gui',
            ten: b.status === 'completed' ? 'Đã giao hàng' : 'Chuẩn bị và gửi hàng',
            mo_ta: b.status === 'completed'
                ? 'Đơn đã hoàn tất.'
                : 'Cơ sở gói hàng, báo cước gửi rồi mới gửi đi.',
            luc: b.status === 'completed' ? luc(b.updatedAt) : '',
            xong: b.status === 'completed',
        });
    } else {
        buoc.push({
            ma: 'dung',
            ten: b.status === 'completed' ? 'Đã hoàn thành' : 'Tới ngày sử dụng',
            mo_ta: b.status === 'completed'
                ? 'Cảm ơn bạn. Bạn đánh giá được rồi.'
                : (b.checkIn ? 'Ngày ' + dayMonth(b.checkIn) + '.' : ''),
            luc: b.status === 'completed' ? luc(b.updatedAt) : '',
            xong: b.status === 'completed',
        });
    }

    if (huy) {
        buoc.push({
            ma: 'huy',
            ten: 'Đơn đã huỷ',
            mo_ta: (b.cancelReason || 'Đơn đã được huỷ.')
                + (Number(b.refundAmount) > 0
                    ? ' Hoàn ' + Number(b.refundAmount).toLocaleString('vi-VN') + 'đ tiền cọc.'
                    : ''),
            luc: luc(b.cancelledAt),
            xong: true,
            xau: true,
        });
    }

    return buoc;
}

const bookingOut = (b) => ({
    id: b.id,
    code: String(b.id || '').slice(-8).toUpperCase(),
    kind: b.kind,
    summary: b.roomName || '',
    status: b.status,
    status_label: {
        pending: 'Chờ xác nhận',
        confirmed: 'Đã xác nhận',
        completed: 'Đã hoàn thành',
        cancelled: 'Đã huỷ',
    }[b.status] || b.status,
    total_price: b.totalPrice || 0,
    check_in: b.checkIn || '',
    check_out: b.checkOut || '',
    pickup: b.pickup || '',
    dropoff: b.dropoff || '',
    pickup_time: b.pickupTime || '',
    nights: b.nights || 0,
    guests: b.guests || 0,
    guest_name: b.guestName || '',
    phone: b.phone || '',
    note: b.note || '',
    partner_name: b.partnerName || '',
    partner_phone: (() => {
        const p = b.partnerId ? findAnyPartner(b.partnerId) : null;
        return p ? (p.phone || '') : '';
    })(),
    created_at: b.createdAt || '',
    // Lối quay lại đúng dịch vụ đã đặt. Trước đây trang đơn chỉ hiện một dòng
    // tên, khách không mở lại được ảnh, tiện nghi hay mô tả chỗ ở.
    service_url: b.kind === 'hotel' && b.roomId
        ? `chonghi.html?id=${encodeURIComponent(b.roomId)}`
        : b.kind === 'tour' && b.tourSlug
            ? `khampha.html?q=${encodeURIComponent(b.roomName || b.tourSlug)}`
            : b.kind === 'food' && b.listingId
                ? `dacsan.html#${encodeURIComponent(b.listingId)}`
                : '',
    service_link_label: b.kind === 'hotel' ? 'Xem lại chỗ ở'
        : b.kind === 'tour' ? 'Xem lại tour'
            : b.kind === 'food' ? 'Xem lại sản phẩm' : '',

    // ── Bóc tách giá, để khách cộng tay ra đúng con số cuối ──
    unit_price: Number(b.unitPrice) || 0,
    quantity: Number(b.quantity) || 0,
    unit: b.unit || '',
    // Đặc sản: địa chỉ giao và lời hẹn gửi hàng
    delivery_address: b.deliveryAddress || '',
    shipping_note: b.shippingNote || '',

    // ── Đơn đã tới đâu ──
    timeline: duongDiCua(b),
    // Tiền cọc — để danh sách đơn hiện được nút "Đặt cọc" và trạng thái đã thu
    payment_status: payments.PAYMENT_STATUSES.includes(b.paymentStatus) ? b.paymentStatus : 'unpaid',
    payment_status_label: payments.STATUS_LABELS[b.paymentStatus] || payments.STATUS_LABELS.unpaid,
    deposit_amount: Number(b.depositAmount) || payments.depositFor(b),
    // Huỷ được khi chưa tới ngày và chưa hoàn thành
    can_cancel: ['pending', 'confirmed'].includes(b.status),
    // Huỷ bây giờ thì hoàn bao nhiêu — tính sẵn để khách thấy TRƯỚC khi bấm,
    // chứ không phải bấm xong rồi mới biết mất tiền.
    cancel_policy: huydon.layMuc(b.cancelPolicy).id,
    cancel_refund: ['pending', 'confirmed'].includes(b.status)
        ? huydon.tinh({
            policy: b.cancelPolicy,
            checkIn: b.checkIn,
            depositPaid: b.paymentStatus === 'paid' ? (Number(b.depositAmount) || 0) : 0,
        })
        : null,
    // Đánh giá được sau khi dùng xong, và chỉ khi còn thứ chưa đánh giá
    can_review: b.status === 'completed' && reviews.targetsForBooking(b).length > 0,
    review_targets: b.status === 'completed' ? reviews.targetsForBooking(b) : [],
});

// ════════════════════════════════════════════════════════════
// HỒ SƠ KHÁCH — thông tin cá nhân và sổ địa chỉ
// ════════════════════════════════════════════════════════════
// Firebase Auth chỉ giữ email và tên hiển thị. Số điện thoại và địa chỉ giao
// hàng không có chỗ nào lưu, nên mỗi lần đặt đặc sản khách gõ lại từ đầu cả
// cái địa chỉ dài — gõ trên điện thoại thì đó là chỗ người ta bỏ dở nhiều
// nhất.

/** Ai đang đăng nhập. Trả null và đã gửi lỗi nếu chưa. */
async function khachDangNhap(req, res) {
    const token = bearerToken(req);
    if (!token) {
        fail(res, 401, 'UNAUTHORIZED', 'Bạn chưa đăng nhập.');
        return null;
    }
    try {
        return await auth.me(token);
    } catch (err) {
        fail(res, err.status || 401, 'UNAUTHORIZED', err.message);
        return null;
    }
}

// GET /v1/my/profile
router.get('/my/profile', async (req, res) => {
    const user = await khachDangNhap(req, res);
    if (!user) return;
    const p = hoso.cua(user.id);
    res.json({
        data: {
            ...hoso.toPublic(p),
            email: user.email || '',
            // Chưa lưu tên riêng thì lấy tên trên tài khoản, khỏi để trống
            full_name: p.fullName || user.full_name || user.fullName || '',
        },
    });
});

// PATCH /v1/my/profile — sửa tên và số điện thoại
router.patch('/my/profile', async (req, res) => {
    const user = await khachDangNhap(req, res);
    if (!user) return;

    const b = req.body || {};
    if (b.phone !== undefined && String(b.phone).trim() && !hoso.laSoDT(b.phone)) {
        return fail(res, 400, 'INVALID_PHONE',
            'Số điện thoại phải có 10 số, bắt đầu bằng 0.');
    }
    const saved = hoso.luuHoSo(user.id, {
        fullName: b.full_name !== undefined ? b.full_name : undefined,
        phone: b.phone !== undefined ? b.phone : undefined,
    });
    res.json({ data: hoso.toPublic(saved), message: 'Đã lưu.' });
});

// POST /v1/my/addresses — thêm hoặc sửa một địa chỉ trong sổ
router.post('/my/addresses', async (req, res) => {
    const user = await khachDangNhap(req, res);
    if (!user) return;

    const b = req.body || {};
    try {
        const saved = hoso.luuDiaChi(user.id, {
            id: asString(b.id, 40),
            label: b.label,
            receiver: b.receiver,
            phone: b.phone,
            address: b.address,
            isDefault: Boolean(b.is_default),
        });
        res.json({ data: hoso.toPublic(saved), message: 'Đã lưu địa chỉ.' });
    } catch (err) {
        fail(res, 400, err.code || 'SAVE_FAILED', err.message);
    }
});

// DELETE /v1/my/addresses/:id
router.delete('/my/addresses/:id', async (req, res) => {
    const user = await khachDangNhap(req, res);
    if (!user) return;
    const saved = hoso.xoaDiaChi(user.id, asString(req.params.id, 40));
    if (!saved) return fail(res, 404, 'NOT_FOUND', 'Không tìm thấy sổ địa chỉ.');
    res.json({ data: hoso.toPublic(saved), message: 'Đã xoá địa chỉ.' });
});

// GET /v1/my/bookings — đơn của tài khoản đang đăng nhập
router.get('/my/bookings', async (req, res) => {
    const token = bearerToken(req);
    if (!token) return fail(res, 401, 'UNAUTHORIZED', 'Bạn chưa đăng nhập.');

    let user;
    try {
        user = await auth.me(token);
    } catch (err) {
        return fail(res, 401, 'UNAUTHORIZED', err.message);
    }

    try {
        const all = await listDocuments('bookings', { idToken: token });
        const mine = all
            .filter(b => b.userId === user.id || (user.email && b.email === user.email))
            .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
        res.json({ data: mine.map(bookingOut), meta: { total: mine.length } });
    } catch (err) {
        console.error('[my/bookings]', err.message);
        fail(res, 502, 'BOOKINGS_UNAVAILABLE', 'Không tải được danh sách đơn.');
    }
});

/**
 * Gắn điểm đánh giá vào một mục trong danh sách.
 *
 * Các con số 4.9 / 4.8 nằm sẵn trong content.js là điểm BIÊN TẬP, không phải
 * khách chấm. Trộn lẫn hai thứ đó rồi gọi chung là "đánh giá" là nói dối người
 * đọc — và rất dễ bị hỏi vặn khi đi thi. Nên ở đây trả kèm:
 *   - rating_count  : số đánh giá THẬT (0 = chưa ai đánh giá)
 *   - rating_source : 'guest' nếu là khách chấm, 'editorial' nếu là số biên tập
 * Giao diện dựa vào đó để hiện "Chưa có đánh giá" thay vì bịa ra 5 ngôi sao.
 */
function withRating(type, id, fallbackRating) {
    const s = reviews.summaryFor(type, id);
    return {
        rating: s.average != null ? s.average : (fallbackRating || 0),
        rating_count: s.count,
        rating_source: s.average != null ? 'guest' : 'editorial',
    };
}

// ════════════════════════════════════════════════════════════
// GHÉP TOUR
// ════════════════════════════════════════════════════════════
// Khách lẻ đăng ký vào một chuyến khởi hành. Đủ khách thì chạy, giá rẻ hơn.
// Mọi phản hồi đều nói rõ CÒN THIẾU MẤY NGƯỜI — không để khách tưởng đã chắc
// chân rồi sát ngày mới báo huỷ.

// GET /v1/tours/:slug/departures — các chuyến đang gom khách
router.get('/tours/:slug/departures', (req, res) => {
    const list = tourpool.openDepartures(asString(req.params.slug, 60));
    res.json({
        data: list.map(tourpool.toPublic),
        min_guests: tourpool.MIN_GUESTS,
        discount: tourpool.DISCOUNT,
        cutoff_days: tourpool.CUTOFF_DAYS,
        meta: { total: list.length },
    });
});

// GET /v1/departures — tất cả chuyến đang gom, cho trang khám phá tour
router.get('/departures', (req, res) => {
    const phone = asString(req.query.phone, 20).replace(/[\s.-]/g, '').replace(/^\+84/, '0');
    // Có số điện thoại thì trả chuyến của riêng khách đó
    const list = phone ? tourpool.departuresOf(phone) : tourpool.openDepartures();
    res.json({ data: list.map(tourpool.toPublic), meta: { total: list.length } });
});

// POST /v1/tours/:slug/join — đăng ký đi ghép
router.post('/tours/:slug/join', async (req, res) => {
    const phone = asString(req.body?.phone, 20).replace(/[\s.-]/g, '').replace(/^\+84/, '0');
    const guestName = asString(req.body?.guest_name || req.body?.guestName, 120);

    if (guestName.length < 2) return fail(res, 400, 'INVALID_NAME', 'Vui lòng nhập họ tên.');
    if (!isPhone(phone)) return fail(res, 400, 'INVALID_PHONE', 'Số điện thoại không hợp lệ (10 số).');

    try {
        const { departure, confirmedNow } = tourpool.join({
            tourSlug: asString(req.params.slug, 60),
            date: asString(req.body?.date, 20),
            guests: Math.max(1, asInt(req.body?.guests, 1)),
            guestName,
            phone,
        });
        const view = tourpool.toPublic(departure);

        // Đủ khách thì báo cho CẢ ĐOÀN, không riêng người vừa đăng ký
        if (confirmedNow) {
            for (const m of departure.members || []) {
                notifications.push({
                    audience: 'guest',
                    phone: m.phone,
                    kind: 'tour_confirmed',
                    title: 'Chuyến ghép đã đủ khách!',
                    body: `${view.tour_name} ngày ${view.date} chắc chắn khởi hành. LOCALMATE sẽ gọi xác nhận giờ đón.`,
                });
            }
            notifications.push({
                audience: 'admin',
                kind: 'tour_confirmed',
                title: 'Chuyến ghép đủ khách',
                body: `${view.tour_name} · ${view.date} · ${view.joined} khách`,
            });
        } else {
            notifications.push({
                audience: 'guest',
                phone,
                kind: 'tour_joined',
                title: 'Đã ghi nhận đăng ký ghép tour',
                body: `${view.tour_name} ngày ${view.date} — ${view.note}`,
            });
        }

        res.status(201).json({
            data: view,
            message: confirmedNow
                ? 'Chuyến đã đủ khách và chắc chắn khởi hành!'
                : `Đã ghi nhận. ${view.note} LOCALMATE sẽ báo ngay khi đủ.`,
        });
    } catch (err) {
        if (err.status) return fail(res, err.status, err.code, err.message);
        console.error('[tours/join]', err.message);
        fail(res, 502, 'JOIN_FAILED', 'Chưa đăng ký được, bạn thử lại nhé.');
    }
});

// ════════════════════════════════════════════════════════════
// ĐỐI SOÁT DOANH THU
// ════════════════════════════════════════════════════════════

// GET /v1/partner/revenue?month=2026-08 — bảng đối soát của chính đối tác
router.get('/partner/revenue', async (req, res) => {
    const ctx = await requirePartner(req, res);
    if (!ctx) return;
    if (!ctx.partner) return fail(res, 403, 'NOT_PARTNER', 'Tài khoản này chưa phải đối tác.');

    try {
        res.json(await revenue.forPartner(ctx.partner, asString(req.query.month, 10)));
    } catch (err) {
        console.error('[partner/revenue]', err.message);
        fail(res, 502, 'REVENUE_UNAVAILABLE', 'Chưa lấy được số liệu, bạn thử lại nhé.');
    }
});

// GET /v1/admin/revenue?month= — toàn bộ đối tác
router.get('/admin/revenue', async (req, res) => {
    if (!(await requireAdmin(req, res))) return;
    try {
        const month = asString(req.query.month, 10) || revenue.thisMonth();
        const partners = [...PARTNERS, ...(store.readAll('partners') || [])];
        const rows = await revenue.allPartners(month, partners);
        res.json({
            month,
            data: rows,
            totals: {
                orders: rows.reduce((s, r) => s + r.orders, 0),
                gross: rows.reduce((s, r) => s + r.gross, 0),
                commission: rows.reduce((s, r) => s + r.commission, 0),
                payable: rows.reduce((s, r) => s + r.payable, 0),
            },
        });
    } catch (err) {
        console.error('[admin/revenue]', err.message);
        fail(res, 502, 'REVENUE_UNAVAILABLE', 'Chưa lấy được số liệu.');
    }
});

// POST /v1/admin/revenue/settle — đánh dấu đã chuyển tiền cho đối tác
router.post('/admin/revenue/settle', async (req, res) => {
    const ctx = await requireAdmin(req, res);
    if (!ctx) return;

    const partnerId = asString(req.body?.partner_id, 60);
    const month = asString(req.body?.month, 10) || revenue.thisMonth();
    if (!partnerId) return fail(res, 400, 'MISSING_PARTNER', 'Thiếu mã đối tác.');

    // Không cho chuyển nhiều hơn số tiền THẬT SỰ đã thu hộ đối tác này.
    //
    // Thiếu chốt chặn này thì quỹ âm mà không ai biết: đơn chưa thu được đồng
    // cọc nào, admin vẫn bấm "đã chuyển" theo cột "đối tác nhận" — mà cột đó
    // là phần đối tác được hưởng trên tổng đơn, phần lớn khách trả thẳng cho
    // họ chứ không qua Bảy Núi.
    const amount = asInt(req.body?.amount, 0);
    try {
        const { from, to } = revenue.monthRange(month);
        const rows = await ledger.entries({ from, to, partnerId });
        const mine = ledger.byPartner(rows)[0];
        const canPay = mine ? mine.owed : 0;

        if (amount > canPay && req.body?.force !== true) {
            return fail(res, 400, 'OVER_PAYOUT',
                `Chỉ nên chuyển tối đa ${canPay.toLocaleString('vi-VN')}đ cho kỳ này — `
                + `đó là phần cọc LOCALMATE đã thu hộ, sau khi trừ hoa hồng. `
                + `Phần còn lại của đơn khách trả thẳng cho đối tác, không đi qua quỹ.`);
        }
    } catch (err) {
        console.error('[revenue/settle-check]', err.message);
    }

    const saved = revenue.settle({
        partnerId,
        month,
        amount: asInt(req.body?.amount, 0),
        note: asString(req.body?.note, 200),
        by: ctx.user.email,
    });

    notifications.push({
        audience: 'partner',
        partnerId,
        kind: 'payout',
        title: `Đã chuyển tiền kỳ ${month}`,
        body: `${Number(saved.amount).toLocaleString('vi-VN')}đ đã được chuyển. Bạn kiểm tra tài khoản nhé.`,
    });

    res.json({ data: saved, message: `Đã ghi nhận thanh toán kỳ ${month}.` });
});


// ════════════════════════════════════════════════════════════
// SỔ QUỸ
// ════════════════════════════════════════════════════════════

/** Khoảng ngày mặc định: tháng hiện tại. */
function periodOf(req) {
    const month = asString(req.query.month, 10);
    if (/^\d{4}-\d{2}$/.test(month)) {
        const { from, to } = revenue.monthRange(month);
        return { from, to, month };
    }
    const from = asString(req.query.from, 10);
    const to = asString(req.query.to, 10);
    if (from && to) return { from, to, month: '' };

    const now = revenue.thisMonth();
    return { ...revenue.monthRange(now), month: now };
}

// ════════════════════════════════════════════════════════════
// LỊCH KHỞI HÀNH CỦA ĐƠN VỊ TOUR
// ════════════════════════════════════════════════════════════
// Khách lẻ đăng ký ghép chuyến qua /v1/tours/:slug/join, nhưng trước đây đơn
// vị tour KHÔNG có đường nào nhìn thấy chuyện đó. Họ không biết ngày nào có
// mấy khách, không có tên và số điện thoại để gọi, không tự mở được ngày chạy.
// Muốn biết thì phải hỏi Bảy Núi — nghĩa là chưa vận hành thật được.
//
// Ba đường dưới đây trả đúng phần việc của họ: xem chuyến của mình kèm danh
// sách khách, tự mở ngày, chốt chạy hoặc huỷ.

// GET /v1/partner/departures — chuyến của tôi, kèm danh sách khách
router.get('/partner/departures', async (req, res) => {
    const ctx = await requireApprovedPartner(req, res, ['tour']);
    if (!ctx) return;

    const list = tourpool.departuresOfPartner(ctx.partner.id).map(tourpool.toPartner);
    res.json({
        data: list,
        meta: {
            total: list.length,
            min_guests: tourpool.MIN_GUESTS,
            cutoff_days: tourpool.CUTOFF_DAYS,
            discount: tourpool.DISCOUNT,
        },
        // Danh sách tour của chính họ, để giao diện đổ vào ô chọn khi mở chuyến
        tours: listings.byPartner(ctx.partner.id)
            .filter(r => r.type === 'tour' && r.status === 'approved')
            .map(r => ({ slug: r.id, name: r.name, price: Number(r.price) || 0 })),
    });
});

// POST /v1/partner/departures — tự mở một ngày khởi hành
router.post('/partner/departures', async (req, res) => {
    const ctx = await requireApprovedPartner(req, res, ['tour']);
    if (!ctx) return;

    try {
        const dep = tourpool.moChuyen({
            tourSlug: asString(req.body?.tour_slug, 60),
            date: asString(req.body?.date, 10),
            minGuests: asInt(req.body?.min_guests, 0),
            price: asInt(req.body?.price, 0),
            partnerId: ctx.partner.id,
        });
        res.status(201).json({ data: tourpool.toPartner(dep) });
    } catch (err) {
        fail(res, err.status || 400, err.code || 'OPEN_FAILED', err.message);
    }
});

// PATCH /v1/partner/departures/:id — chốt chạy hoặc huỷ
router.patch('/partner/departures/:id', async (req, res) => {
    const ctx = await requireApprovedPartner(req, res, ['tour']);
    if (!ctx) return;

    const status = asString(req.body?.status, 20);
    try {
        const dep = tourpool.datTrangThai(asString(req.params.id, 40), status, ctx.partner.id);
        const view = tourpool.toPartner(dep);

        // Khách đã đăng ký phải được báo NGAY. Chốt chạy thì họ yên tâm giữ
        // lịch; huỷ thì họ còn kịp tính đường khác — im lặng tới sát ngày là
        // hỏng cả chuyến đi của người ta.
        for (const m of view.members) {
            if (!m.phone) continue;
            notifications.push({
                audience: 'guest',
                phone: m.phone,
                kind: status === 'confirmed' ? 'tour_confirmed' : 'tour_cancelled',
                title: status === 'confirmed' ? 'Chuyến ghép chắc chắn khởi hành' : 'Chuyến ghép đã huỷ',
                body: status === 'confirmed'
                    ? `${view.tour_name} ngày ${view.date} chắc chắn chạy. Đơn vị tour sẽ gọi xác nhận giờ đón.`
                    : `${view.tour_name} ngày ${view.date} không chạy được. Bạn xem ngày khác giúp nhé.`,
                data: { kind: 'tour_status', departure_id: view.id },
            });
        }

        res.json({ data: view, notified: view.members.length });
    } catch (err) {
        fail(res, err.status || 400, err.code || 'UPDATE_FAILED', err.message);
    }
});

// GET /v1/partner/cashflow — dòng tiền CỦA RIÊNG đối tác đang đăng nhập
//
// Ràng buộc quan trọng: mọi truy vấn đều kèm partnerId lấy từ phiên đăng nhập,
// KHÔNG lấy từ tham số người dùng gửi lên. Đối tác chỉ được thấy tiền của
// chính mình — không thấy đối tác khác, không thấy tổng doanh thu nền tảng.
router.get('/partner/cashflow', async (req, res) => {
    const ctx = await requirePartner(req, res);
    if (!ctx) return;
    if (!ctx.partner) return fail(res, 403, 'NOT_PARTNER', 'Tài khoản này chưa phải đối tác.');
    if (ctx.partner.status !== 'approved') {
        return fail(res, 403, 'NOT_APPROVED', 'Hồ sơ đối tác của bạn đang chờ duyệt.');
    }

    const { from, to, month } = periodOf(req);
    try {
        const rows = await ledger.entries({ from, to, partnerId: ctx.partner.id });
        const mine = ledger.byPartner(rows)[0] || {
            deposit_in: 0, commission: 0, payout: 0, refund: 0, owed: 0,
        };

        res.json({
            month,
            from,
            to,
            commission_rate: revenue.commissionOf(ctx.partner),
            // Số của riêng đối tác. Cố ý KHÔNG trả tổng của nền tảng.
            summary: {
                deposit_collected: mine.deposit_in,
                commission_deducted: mine.commission,
                paid_to_you: mine.payout,
                refunded: mine.refund,
                owed_to_you: mine.owed,
            },
            entries: rows.map(r => ({
                date: r.date,
                type: r.type,
                type_label: r.type === 'commission'
                    ? 'Hoa hồng LOCALMATE trừ'
                    : r.type === 'payout'
                        ? 'LOCALMATE chuyển cho bạn'
                        : r.type_label,
                direction: r.direction,
                amount: r.amount,
                booking_code: r.booking_code,
                note: r.note,
            })),
        });
    } catch (err) {
        console.error('[partner/cashflow]', err.message);
        fail(res, 502, 'CASHFLOW_UNAVAILABLE', 'Chưa lấy được số liệu.');
    }
});

// GET /v1/admin/ledger — sổ quỹ đầy đủ
router.get('/admin/ledger', async (req, res) => {
    if (!(await requireAdmin(req, res))) return;

    const { from, to, month } = periodOf(req);
    const type = asString(req.query.type, 20);

    try {
        let rows = await ledger.entries({ from, to });
        if (type && ledger.TYPE_LABELS[type]) rows = rows.filter(r => r.type === type);

        res.json({
            month,
            from,
            to,
            summary: ledger.summarize(rows),
            by_partner: ledger.byPartner(rows),
            by_kind: ledger.byKind(rows),
            types: Object.entries(ledger.TYPE_LABELS).map(([id, label]) => ({ id, label })),
            entries: rows,
        });
    } catch (err) {
        console.error('[admin/ledger]', err.message);
        fail(res, 502, 'LEDGER_UNAVAILABLE', 'Chưa lấy được sổ quỹ.');
    }
});

// ════════════════════════════════════════════════════════════
// HỘ CHIẾU BẢY NÚI
// ════════════════════════════════════════════════════════════
// Con dấu chỉ đóng được khi khách CÓ MẶT tại điểm — máy chủ so toạ độ khách
// gửi lên với toạ độ thật của điểm. Bỏ bước đó thì ai chụp lại mã QR cũng
// đóng được dấu ở nhà.

/** Ai đang cầm cuốn hộ chiếu: tài khoản đăng nhập, hoặc số điện thoại. */
async function passportOwner(req) {
    const token = bearerToken(req);
    if (token) {
        try {
            const user = await auth.me(token);
            return { userId: user.id, name: user.full_name || user.fullName || '' };
        } catch (_) { /* token hỏng thì rơi xuống số điện thoại */ }
    }
    const phone = asString(req.query.phone || req.body?.phone, 20).replace(/[\s.-]/g, '').replace(/^\+84/, '0');
    return { phone, name: asString(req.query.name || req.body?.name, 80) };
}

// GET /v1/passport/stations — bản đồ các điểm đóng dấu (công khai)
router.get('/passport/stations', (req, res) => {
    const baseUrl = publicBaseUrl(req);
    res.json({
        data: passport.stations().map(s => withAssets({ ...s }, baseUrl)),
        radius_m: passport.RADIUS_M,
        meta: { total: passport.stations().length },
    });
});

// GET /v1/passport — cuốn hộ chiếu của một người
router.get('/passport', async (req, res) => {
    const owner = await passportOwner(req);
    if (!owner.userId && !isPhone(owner.phone || '')) {
        // Chưa có danh tính thì vẫn trả bộ dấu trống, để trang hiện được
        // đầy đủ các điểm cần tới — đừng bắt khách đăng nhập mới cho xem.
        return res.json({ ...passport.view({}), anonymous: true });
    }
    res.json({ ...passport.view(owner), anonymous: false });
});

// POST /v1/passport/claim — quét QR tại điểm rồi đóng dấu
router.post('/passport/claim', registrationLimiter, async (req, res) => {
    const owner = await passportOwner(req);
    try {
        const stamp = passport.claim({
            slug: asString(req.body?.slug, 60),
            code: asString(req.body?.code, 40),
            lat: Number.parseFloat(req.body?.lat),
            lng: Number.parseFloat(req.body?.lng),
            userId: owner.userId,
            phone: owner.phone,
            name: owner.name,
        });

        const book = passport.view(owner);
        notifications.push({
            audience: owner.userId ? 'guest' : 'guest',
            phone: owner.phone,
            kind: 'passport_stamp',
            title: `Đã đóng dấu ${stamp.name}`,
            body: `Bạn có ${book.count}/${book.total} dấu — ${book.level_name}.`,
        });

        res.status(201).json({
            data: { slug: stamp.slug, name: stamp.name, symbol: stamp.symbol, distance_m: stamp.distanceM },
            passport: book,
            message: `Đã đóng dấu ${stamp.name}!`,
        });
    } catch (err) {
        if (err.status) {
            return res.status(err.status).json({
                error: { code: err.code, message: err.message },
                distance_m: err.distance_m,
            });
        }
        console.error('[passport/claim]', err.message);
        fail(res, 502, 'PASSPORT_UNAVAILABLE', 'Chưa đóng dấu được, bạn thử lại nhé.');
    }
});

// GET /v1/admin/passport/qr — nội dung mã QR để in ra dán tại điểm
router.get('/admin/passport/qr', async (req, res) => {
    if (!(await requireAdmin(req, res))) return;
    res.json({ data: passport.qrTargets(publicBaseUrl(req)), radius_m: passport.RADIUS_M });
});

// ── Quản trị điểm đóng dấu ──────────────────────────────────
// Mỗi homestay có bộ điểm riêng, và mùa nào cũng có thể đổi. Để cứng trong mã
// nguồn thì chủ nhà không tự thêm được điểm mới.

router.get('/admin/passport/stations', async (req, res) => {
    if (!(await requireAdmin(req, res))) return;
    const list = passport.stations({ includeHidden: true });
    res.json({
        data: list.map(s => ({ ...s, code: passport.codeFor(s.slug) })),
        meta: { total: list.length },
    });
});

router.post('/admin/passport/stations', async (req, res) => {
    if (!(await requireAdmin(req, res))) return;
    try {
        const saved = passport.saveStation({
            id: asString(req.body?.id, 60),
            name: asString(req.body?.name, 120),
            area: asString(req.body?.area, 120),
            lat: req.body?.lat,
            lng: req.body?.lng,
            image: asString(req.body?.image, 300),
            symbol: asString(req.body?.symbol, 4),
            active: req.body?.active !== false,
        });
        res.json({
            data: { ...saved, code: passport.codeFor(saved.slug) },
            message: req.body?.id ? 'Đã lưu thay đổi.' : 'Đã thêm điểm. Nhớ in mã QR mới và dán tại đó.',
        });
    } catch (err) {
        if (err.status) return fail(res, err.status, err.code, err.message);
        console.error('[passport/station]', err.message);
        fail(res, 502, 'STATION_FAILED', 'Chưa lưu được.');
    }
});

router.delete('/admin/passport/stations/:id', async (req, res) => {
    if (!(await requireAdmin(req, res))) return;
    const ok = passport.removeStation(req.params.id);
    if (!ok) return fail(res, 404, 'STATION_NOT_FOUND', 'Không tìm thấy điểm này.');
    // Con dấu khách đã đóng vẫn giữ nguyên — không cướp thành quả của họ
    res.json({ removed: true, message: 'Đã xoá điểm. Nhớ gỡ tấm QR ngoài thực địa xuống.' });
});

// ── Quản trị phần thưởng ────────────────────────────────────
router.get('/admin/passport/rewards', async (req, res) => {
    if (!(await requireAdmin(req, res))) return;
    const list = passport.rewardList({ includeHidden: true });
    res.json({ data: list, station_count: passport.stations().length, meta: { total: list.length } });
});

router.post('/admin/passport/rewards', async (req, res) => {
    if (!(await requireAdmin(req, res))) return;
    try {
        const saved = passport.saveReward({
            id: asString(req.body?.id, 60),
            title: asString(req.body?.title, 160),
            note: asString(req.body?.note, 300),
            need: req.body?.need,
            code: asString(req.body?.code, 20),
            partner: asString(req.body?.partner, 120),
            active: req.body?.active !== false,
        });
        res.json({ data: saved, message: req.body?.id ? 'Đã lưu thay đổi.' : 'Đã thêm phần thưởng.' });
    } catch (err) {
        if (err.status) return fail(res, err.status, err.code, err.message);
        console.error('[passport/reward]', err.message);
        fail(res, 502, 'REWARD_FAILED', 'Chưa lưu được.');
    }
});

router.delete('/admin/passport/rewards/:id', async (req, res) => {
    if (!(await requireAdmin(req, res))) return;
    const ok = passport.removeReward(req.params.id);
    if (!ok) return fail(res, 404, 'REWARD_NOT_FOUND', 'Không tìm thấy phần thưởng này.');
    res.json({ removed: true, message: 'Đã xoá phần thưởng.' });
});

// ════════════════════════════════════════════════════════════
// THÔNG BÁO
// ════════════════════════════════════════════════════════════
// Ba nhóm người nhận, ba đường lấy khác nhau, nhưng cùng một dòng sự kiện.

// POST /v1/devices/register — điện thoại báo token FCM của nó
//
// Gọi mỗi lần mở app và mỗi lần Firebase cấp token mới. Token là khoá chính
// nên gọi lại nhiều lần không sinh rác.
router.post('/devices/register', async (req, res) => {
    const token = asString(req.body?.token, 400);
    const platform = asString(req.body?.platform, 20) || 'android';
    if (!token) return fail(res, 400, 'MISSING_TOKEN', 'Thiếu token thiết bị.');

    // Đăng nhập bằng tài khoản đối tác thì gắn máy này cho đối tác đó, để
    // chuyến chỉ nổ đúng máy của họ.
    if (bearerToken(req)) {
        try {
            const user = await auth.me(bearerToken(req));
            const seeded = findPartnerByEmail(user.email);
            const mine = seeded || store.find('partners', p => p.uid === user.id);
            if (mine) {
                devices.register({ token, audience: 'partner', partnerId: mine.id, platform });
                return res.json({ ok: true, audience: 'partner' });
            }
            if (ADMIN_EMAILS.includes(String(user.email).toLowerCase())) {
                devices.register({ token, audience: 'admin', platform });
                return res.json({ ok: true, audience: 'admin' });
            }
        } catch (_) { /* token hỏng thì rơi xuống nhánh khách bên dưới */ }
    }

    // Khách thường: gắn theo số điện thoại đã dùng khi đặt
    const phone = asString(req.body?.phone, 20).replace(/[\s.-]/g, '').replace(/^\+84/, '0');
    if (!isPhone(phone)) {
        return fail(res, 400, 'INVALID_PHONE', 'Cần số điện thoại đã dùng khi đặt để nhận thông báo.');
    }
    devices.register({ token, audience: 'guest', phone, platform });
    res.json({ ok: true, audience: 'guest' });
});

// POST /v1/devices/unregister — đăng xuất hoặc tắt thông báo
router.post('/devices/unregister', (req, res) => {
    const token = asString(req.body?.token, 400);
    if (!token) return fail(res, 400, 'MISSING_TOKEN', 'Thiếu token thiết bị.');
    res.json({ removed: devices.remove(token) });
});

// GET /v1/admin/push-status — push thật đang bật hay tắt
router.get('/admin/push-status', async (req, res) => {
    if (!(await requireAdmin(req, res))) return;
    res.json({ ...fcm.status(), devices: devices.count() });
});

// GET /v1/notifications?phone=&since= — của khách, tra bằng số điện thoại
router.get('/notifications', (req, res) => {
    const phone = asString(req.query.phone, 20).replace(/[\s.-]/g, '').replace(/^\+84/, '0');
    if (!isPhone(phone)) {
        return fail(res, 400, 'INVALID_PHONE', 'Nhập số điện thoại đã dùng khi đặt.');
    }
    const target = { audience: 'guest', phone };
    const rows = notifications.listFor({ ...target, since: asString(req.query.since, 40) });
    res.json({ data: rows.map(notifications.toPublic), unread: notifications.unreadCount(target) });
});

router.post('/notifications/read', (req, res) => {
    const phone = asString(req.body?.phone, 20).replace(/[\s.-]/g, '').replace(/^\+84/, '0');
    if (!isPhone(phone)) return fail(res, 400, 'INVALID_PHONE', 'Thiếu số điện thoại.');
    res.json({ marked: notifications.markRead({ audience: 'guest', phone }, req.body?.ids || null) });
});

// GET /v1/partner/notifications — của đối tác đang đăng nhập
router.get('/partner/notifications', async (req, res) => {
    const ctx = await requirePartner(req, res);
    if (!ctx) return;
    if (!ctx.partner) return fail(res, 403, 'NOT_PARTNER', 'Tài khoản này chưa phải đối tác.');

    const target = { audience: 'partner', partnerId: ctx.partner.id };
    const rows = notifications.listFor({ ...target, since: asString(req.query.since, 40) });
    res.json({ data: rows.map(notifications.toPublic), unread: notifications.unreadCount(target) });
});

router.post('/partner/notifications/read', async (req, res) => {
    const ctx = await requirePartner(req, res);
    if (!ctx) return;
    // Phải TRẢ LỜI khi tài khoản không phải đối tác. Bản trước chỉ `return`:
    // requirePartner đã gửi lỗi khi thiếu token, nhưng token hợp lệ mà không
    // phải đối tác thì nó trả về partner = null và không gửi gì cả — request
    // treo tới lúc máy khách hết giờ chờ. Một màn hình gọi tuần tự nhiều đường
    // sẽ đứng luôn ở đây, những đường sau không bao giờ chạy.
    if (!ctx.partner) return fail(res, 403, 'NOT_PARTNER', 'Tài khoản này chưa phải đối tác.');
    res.json({ marked: notifications.markRead({ audience: 'partner', partnerId: ctx.partner.id }, req.body?.ids || null) });
});

// GET /v1/admin/notifications
router.get('/admin/notifications', async (req, res) => {
    if (!(await requireAdmin(req, res))) return;
    const target = { audience: 'admin' };
    const rows = notifications.listFor({ ...target, since: asString(req.query.since, 40) });
    res.json({ data: rows.map(notifications.toPublic), unread: notifications.unreadCount(target) });
});

router.post('/admin/notifications/read', async (req, res) => {
    if (!(await requireAdmin(req, res))) return;
    res.json({ marked: notifications.markRead({ audience: 'admin' }, req.body?.ids || null) });
});

// ════════════════════════════════════════════════════════════
// ĐẶT CỌC & THANH TOÁN
// ════════════════════════════════════════════════════════════
// Mọi endpoint dưới đây đều đòi số điện thoại khớp với đơn. Thông tin tiền bạc
// không được để ai gõ đúng mã đơn là xem được.

/** Tìm đơn và kiểm tra số điện thoại. Trả null nếu đã gửi lỗi cho client. */
async function bookingForGuest(req, res, phoneRaw) {
    const phone = asString(phoneRaw, 20).replace(/[\s.-]/g, '').replace(/^\+84/, '0');
    if (!isPhone(phone)) {
        fail(res, 400, 'INVALID_PHONE', 'Nhập số điện thoại đã dùng khi đặt (10 số).');
        return null;
    }
    let booking;
    try {
        booking = (await listDocuments('bookings')).find(b => b.id === req.params.id);
    } catch (err) {
        console.error('[payments/lookup]', err.message);
        fail(res, 502, 'BOOKINGS_UNAVAILABLE', 'Không kết nối được cơ sở dữ liệu.');
        return null;
    }
    if (!booking) {
        fail(res, 404, 'BOOKING_NOT_FOUND', 'Không tìm thấy đơn này.');
        return null;
    }
    if (String(booking.phone || '').replace(/[\s.-]/g, '').replace(/^\+84/, '0') !== phone) {
        fail(res, 403, 'PHONE_MISMATCH', 'Số điện thoại không khớp với đơn này.');
        return null;
    }
    return booking;
}

// GET /v1/bookings/:id/payment?phone= — tiền cọc, mã QR, trạng thái
router.get('/bookings/:id/payment', async (req, res) => {
    const booking = await bookingForGuest(req, res, req.query.phone);
    if (!booking) return;
    res.json(payments.paymentView(booking));
});

// POST /v1/bookings/:id/payment/claim — khách báo "đã chuyển khoản"
//
// Đây CHƯA phải là đã thu được tiền. Chỉ chuyển đơn sang trạng thái chờ đối
// chiếu sao kê; tự động đánh dấu "đã thu" chỉ vì khách bấm nút là mất tiền.
router.post('/bookings/:id/payment/claim', async (req, res) => {
    const booking = await bookingForGuest(req, res, req.body?.phone);
    if (!booking) return;

    if (booking.paymentStatus === 'paid') {
        return fail(res, 409, 'ALREADY_PAID', 'Đơn này đã nhận cọc rồi.');
    }
    if (!['pending', 'confirmed'].includes(booking.status)) {
        return fail(res, 400, 'BOOKING_CLOSED', 'Đơn này đã kết thúc, không cần chuyển cọc.');
    }

    const deposit = payments.depositFor(booking);
    if (deposit <= 0) return fail(res, 400, 'NO_DEPOSIT_REQUIRED', 'Đơn này không yêu cầu đặt cọc.');
    try {
        await updateDocument('bookings', booking.id, {
            paymentStatus: 'pending_confirm',
            paymentMethod: asString(req.body?.method, 20) || 'vietqr',
            paymentRef: asString(req.body?.ref, 60),
            depositAmount: deposit,
            paymentClaimedAt: new Date(),
        });
    } catch (err) {
        console.error('[payments/claim]', err.message);
        return fail(res, 502, 'PAYMENT_UNAVAILABLE', 'Chưa ghi nhận được, bạn thử lại nhé.');
    }

    notifications.push({
        audience: 'admin',
        kind: 'payment_claim',
        title: 'Khách báo đã chuyển cọc',
        body: `Đơn ${payments.codeOf(booking)} · ${deposit.toLocaleString('vi-VN')}đ · ${booking.guestName || ''}`,
        bookingId: booking.id,
    });

    res.json({
        payment_status: 'pending_confirm',
        message: 'Đã ghi nhận. LOCALMATE sẽ đối chiếu sao kê và xác nhận trong ít phút.',
    });
});

// POST /v1/bookings/:id/payment/gateway — tạo link VNPay/MoMo
router.post('/bookings/:id/payment/gateway', async (req, res) => {
    const booking = await bookingForGuest(req, res, req.body?.phone);
    if (!booking) return;
    try {
        res.json(payments.createGatewayPayment(asString(req.body?.provider, 20)));
    } catch (err) {
        fail(res, err.status || 500, err.code || 'GATEWAY_ERROR', err.message);
    }
});

// ════════════════════════════════════════════════════════════
// QUẢN TRỊ TRÊN ĐIỆN THOẠI
// ════════════════════════════════════════════════════════════
// Trang admin trên máy tính đọc thẳng Firestore bằng SDK của trình duyệt. App
// thì không — app chỉ nói chuyện với máy chủ này. Nên ba đường dưới đây mở
// đúng phần việc cần làm khi đang đi đường: đơn mới ai vừa đặt, tin nhắn khách
// vừa gửi, và mấy con số của hôm nay.
//
// Phần còn lại (sổ quỹ, đối soát, in mã QR) vẫn để trên máy tính. Bảng nhiều
// cột mà nhìn trên màn hình 6 inch thì chỉ tổ bấm nhầm.

/** Ngày địa phương dạng YYYY-MM-DD. Máy chủ chạy giờ VN nên lấy thẳng. */
const ngayHomNay = () => new Date().toISOString().slice(0, 10);

const ngayCua = (b) => String(b?.createdAt?.toDate?.().toISOString?.() || b?.createdAt || '').slice(0, 10);

/** Gọn một đơn lại cho màn hình điện thoại. */
function donGon(b) {
    return {
        id: b.id,
        code: payments.codeOf(b),
        kind: b.kind || 'room',
        guest_name: b.guestName || '',
        phone: b.phone || '',
        // Đơn xe hiện tuyến đường, đơn phòng hiện tên phòng
        detail: b.kind === 'transport'
            ? `${b.pickup || ''} → ${b.dropoff || ''}`
            : (b.roomName || b.tourName || ''),
        check_in: String(b.checkIn || '').slice(0, 10),
        total_price: Number(b.totalPrice) || 0,
        deposit_amount: Number(b.depositAmount) || payments.depositFor(b),
        status: b.status || 'pending',
        payment_status: b.paymentStatus || 'unpaid',
        payment_status_label: payments.STATUS_LABELS[b.paymentStatus || 'unpaid'],
        created_at: String(b.createdAt?.toDate?.().toISOString?.() || b.createdAt || ''),
    };
}

// GET /v1/admin/bookings?limit=40 — đơn mới nhất, mới nhất lên đầu
router.get('/admin/bookings', async (req, res) => {
    const ctx = await requireAdmin(req, res);
    if (!ctx) return;

    const limit = Math.min(Math.max(asInt(req.query.limit, 40), 1), 200);
    try {
        const all = await listDocuments('bookings', { idToken: ctx.token });
        const rows = all
            .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
            .slice(0, limit)
            .map(donGon);
        const homNay = ngayHomNay();
        res.json({
            data: rows,
            meta: { total: rows.length, today: rows.filter(r => r.created_at.slice(0, 10) === homNay).length },
        });
    } catch (err) {
        console.error('[admin/bookings]', err.message);
        fail(res, 502, 'BOOKINGS_UNAVAILABLE', 'Không tải được danh sách đơn.');
    }
});

// GET /v1/admin/contacts — tin nhắn khách gửi từ trang Liên hệ
router.get('/admin/contacts', async (req, res) => {
    const ctx = await requireAdmin(req, res);
    if (!ctx) return;

    try {
        const all = await listDocuments('contacts', { idToken: ctx.token });
        const rows = all
            .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
            .slice(0, 60)
            .map(c => ({
                id: c.id,
                name: c.name || '',
                phone: c.phone || '',
                email: c.email || '',
                message: String(c.message || '').slice(0, 1000),
                is_read: Boolean(c.isRead),
                created_at: String(c.createdAt?.toDate?.().toISOString?.() || c.createdAt || ''),
            }));
        res.json({ data: rows, meta: { total: rows.length, unread: rows.filter(r => !r.is_read).length } });
    } catch (err) {
        console.error('[admin/contacts]', err.message);
        fail(res, 502, 'CONTACTS_UNAVAILABLE', 'Không tải được tin nhắn.');
    }
});

// POST /v1/admin/contacts/:id/read — đánh dấu đã đọc
router.post('/admin/contacts/:id/read', async (req, res) => {
    const ctx = await requireAdmin(req, res);
    if (!ctx) return;
    try {
        await updateDocument('contacts', asString(req.params.id, 60), { isRead: true }, ctx.token);
        res.json({ data: { id: req.params.id, is_read: true } });
    } catch (err) {
        console.error('[admin/contacts/read]', err.message);
        fail(res, 502, 'UPDATE_FAILED', 'Không đánh dấu được.');
    }
});

// GET /v1/admin/today — mấy con số của hôm nay
//
// Gộp vào MỘT lời gọi chứ không để app hỏi bốn chỗ: mở màn hình quản trị bằng
// mạng 3G ở Tri Tôn thì bốn lượt đi về là bốn lần chờ.
router.get('/admin/today', async (req, res) => {
    const ctx = await requireAdmin(req, res);
    if (!ctx) return;

    const homNay = ngayHomNay();
    const so = {
        bookings_today: 0,
        revenue_today: 0,
        deposit_waiting: 0,
        partners_pending: 0,
        listings_pending: 0,
        contacts_unread: 0,
    };

    // Phần đối tác và tin đăng nằm ở kho nội bộ, không bao giờ hỏng vì mạng
    so.partners_pending = (store.readAll('partners') || []).filter(p => p.status === 'pending').length;
    so.listings_pending = listings.listAll().filter(l => l.status === 'pending').length;

    // Firestore có thể lỗi — hỏng phần này thì vẫn trả về phần trên, đừng để
    // cả màn hình trắng chỉ vì một con số.
    try {
        const all = await listDocuments('bookings', { idToken: ctx.token });
        const cuaHomNay = all.filter(b => ngayCua(b) === homNay);
        so.bookings_today = cuaHomNay.length;
        so.revenue_today = cuaHomNay.reduce((t, b) => t + (Number(b.totalPrice) || 0), 0);
        so.deposit_waiting = all.filter(b => b.paymentStatus === 'pending_confirm').length;
    } catch (err) {
        console.error('[admin/today] bookings', err.message);
    }

    try {
        const all = await listDocuments('contacts', { idToken: ctx.token });
        so.contacts_unread = all.filter(c => !c.isRead).length;
    } catch (err) {
        console.error('[admin/today] contacts', err.message);
    }

    res.json({ data: { ...so, date: homNay } });
});

// ════════════════════════════════════════════════════════════
// ĐỐI CHIẾU SAO KÊ
// ════════════════════════════════════════════════════════════
// Trước đây tiền vào hệ thống bằng hai cái bấm tin nhau: khách bấm "tôi đã
// chuyển", quản trị bấm "đã nhận", không ai đối chiếu với ngân hàng. Vài đơn
// một ngày còn nhớ được; vài chục đơn là lẫn.

// POST /v1/admin/reconcile — dán sao kê, máy ghép với đơn
//
// Máy CHỈ ghép và báo cáo. Người vẫn là người bấm xác nhận ở bước sau: tự
// động xác nhận theo một tệp dán vào thì chỉ đổi chỗ sai từ trí nhớ sang tệp,
// chứ không chắc chắn hơn.
router.post('/admin/reconcile', async (req, res) => {
    const ctx = await requireAdmin(req, res);
    if (!ctx) return;

    const vanBan = typeof req.body?.statement === 'string' ? req.body.statement : '';
    if (vanBan.trim().length < 10) {
        return fail(res, 400, 'EMPTY_STATEMENT',
            'Bạn dán nội dung sao kê vào ô bên trên nhé (mỗi giao dịch một dòng).');
    }
    if (vanBan.length > 2_000_000) {
        return fail(res, 400, 'TOO_LARGE', 'Sao kê quá lớn. Bạn tách theo từng tháng giúp mình.');
    }

    const doc = doisoat.docSaoKe(vanBan);
    if (!doc.rows.length) {
        return fail(res, 400, 'NO_ROWS',
            'Không đọc được dòng giao dịch nào. Sao kê cần có cột số tiền, '
            + 'và mỗi giao dịch nằm trên một dòng.');
    }

    try {
        const all = await listDocuments('bookings', { idToken: ctx.token });
        // Chỉ đối chiếu đơn CHƯA thu xong: đơn đã xác nhận rồi mà lại khớp lần
        // nữa thì dễ bấm xác nhận hai lần cho cùng một khoản.
        const canDoi = all.filter(b => b.paymentStatus !== 'paid' && b.status !== 'cancelled');
        const kq = doisoat.ghep(doc.rows, canDoi);

        doisoat.ghiNhat({ by: ctx.user.email, tongDong: doc.rows.length, ketQua: kq });

        res.json({
            data: kq,
            meta: {
                lines_read: doc.rows.length,
                lines_skipped: doc.skipped,
                separator: doc.separator,
                candidates: canDoi.length,
            },
        });
    } catch (err) {
        console.error('[admin/reconcile]', err.message);
        fail(res, 502, 'DATABASE_UNAVAILABLE', 'Chưa đọc được danh sách đơn để đối chiếu.');
    }
});

// POST /v1/admin/reconcile/confirm — xác nhận một loạt đơn đã khớp
router.post('/admin/reconcile/confirm', async (req, res) => {
    const ctx = await requireAdmin(req, res);
    if (!ctx) return;

    const ids = Array.isArray(req.body?.booking_ids)
        ? req.body.booking_ids.map(x => asString(x, 80)).filter(Boolean).slice(0, 100)
        : [];
    if (!ids.length) return fail(res, 400, 'NO_IDS', 'Chưa chọn đơn nào để xác nhận.');

    let all;
    try {
        all = await listDocuments('bookings', { idToken: ctx.token });
    } catch (err) {
        console.error('[admin/reconcile/confirm]', err.message);
        return fail(res, 502, 'DATABASE_UNAVAILABLE', 'Chưa đọc được danh sách đơn.');
    }

    const xong = [];
    const hong = [];
    for (const id of ids) {
        const b = all.find(x => x.id === id);
        if (!b) { hong.push({ id, reason: 'không tìm thấy đơn' }); continue; }
        if (b.paymentStatus === 'paid') { hong.push({ id, reason: 'đã xác nhận trước đó' }); continue; }

        try {
            const patch = {
                paymentStatus: 'paid',
                depositAmount: Number(b.depositAmount) || payments.depositFor(b),
                paidAt: new Date(),
                paidBy: ctx.user.email,
                // Ghi lại là khoản này khớp từ sao kê, không phải bấm tay —
                // sau này tra lại còn biết căn cứ ở đâu.
                paidSource: 'reconcile',
            };
            if (b.status === 'pending') patch.status = 'confirmed';
            await updateDocument('bookings', b.id, patch, ctx.token);

            notifications.push({
                audience: 'guest',
                phone: b.phone,
                kind: 'payment_paid',
                title: 'Đã nhận cọc',
                body: `Đơn ${maDon(b.id)} — LOCALMATE đã đối chiếu sao kê và nhận được tiền cọc của bạn.`,
                bookingId: b.id,
            });
            if (b.partnerId) {
                notifications.push({
                    audience: 'partner',
                    partnerId: b.partnerId,
                    kind: 'payment_paid',
                    title: 'Khách đã cọc',
                    body: `${maDon(b.id)} · ${b.guestName || ''} — đã nhận cọc, đơn chắc chắn.`,
                    bookingId: b.id,
                });
            }
            xong.push(b.id);
        } catch (err) {
            console.error('[reconcile/confirm]', b.id, err.message);
            hong.push({ id, reason: 'không ghi được' });
        }
    }

    doisoat.ghiNhat({
        by: ctx.user.email, tongDong: ids.length,
        ketQua: { khop: xong, lech_tien: [], khong_ro: [], thieu_tien: [] },
        daXacNhan: xong,
    });

    res.json({
        data: { confirmed: xong, failed: hong },
        message: `Đã xác nhận ${xong.length} đơn.`
            + (hong.length ? ` ${hong.length} đơn không xử lý được.` : ''),
    });
});

// GET /v1/admin/reconcile/log — mấy lần đối chiếu gần đây
router.get('/admin/reconcile/log', async (req, res) => {
    if (!(await requireAdmin(req, res))) return;
    res.json({ data: doisoat.nhatKy(20) });
});

// POST /v1/admin/bookings/:id/payment — chủ nhà xác nhận đã nhận/hoàn tiền
router.post('/admin/bookings/:id/payment', async (req, res) => {
    if (!(await requireAdmin(req, res))) return;

    const status = asString(req.body?.status, 20);
    if (!payments.PAYMENT_STATUSES.includes(status)) {
        return fail(res, 400, 'INVALID_STATUS',
            `Trạng thái phải là một trong: ${payments.PAYMENT_STATUSES.join(', ')}.`);
    }

    try {
        const booking = (await listDocuments('bookings')).find(b => b.id === req.params.id);
        if (!booking) return fail(res, 404, 'BOOKING_NOT_FOUND', 'Không tìm thấy đơn này.');

        const patch = { paymentStatus: status };
        if (status === 'paid') {
            patch.depositAmount = Number(booking.depositAmount) || payments.depositFor(booking);
            patch.paidAt = new Date();
            // Nhận cọc rồi thì đơn coi như chắc chắn
            if (booking.status === 'pending') patch.status = 'confirmed';
        }
        await updateDocument('bookings', booking.id, patch);

        notifications.push({
            audience: 'guest',
            phone: booking.phone,
            kind: 'payment_' + status,
            title: status === 'paid' ? 'Đã nhận cọc' : payments.STATUS_LABELS[status],
            body: `Đơn ${payments.codeOf(booking)} — ${payments.STATUS_LABELS[status]}.`,
            bookingId: booking.id,
        });

        res.json({ payment_status: status, message: `Đã cập nhật: ${payments.STATUS_LABELS[status]}.` });
    } catch (err) {
        console.error('[admin/payment]', err.message);
        fail(res, 502, 'PAYMENT_UNAVAILABLE', 'Chưa cập nhật được.');
    }
});

// ════════════════════════════════════════════════════════════
// ĐÁNH GIÁ & XẾP HẠNG
// ════════════════════════════════════════════════════════════
// Chỉ khách đã dùng xong dịch vụ mới đánh giá được, và phải khớp số điện thoại
// trên đơn — nhờ vậy số sao ở đây là số thật, không phải ai vào bơm cũng được.

// GET /v1/reviews?type=room&id=xxx — danh sách công khai
router.get('/reviews', (req, res) => {
    const type = asString(req.query.type, 20);
    const id = asString(req.query.id, 80);
    if (!reviews.TARGET_TYPES.includes(type) || !id) {
        return fail(res, 400, 'INVALID_TARGET', 'Thiếu loại hoặc mã đối tượng cần xem đánh giá.');
    }
    const rows = reviews.listFor(type, id);
    res.json({
        data: rows.map(reviews.toPublic),
        summary: reviews.summaryFor(type, id),
        meta: { total: rows.length },
    });
});

// GET /v1/bookings/:id/reviewable — đơn này đánh giá được gì
router.get('/bookings/:id/reviewable', async (req, res) => {
    const phone = asString(req.query.phone, 20).replace(/[\s.-]/g, '').replace(/^\+84/, '0');
    try {
        const all = await listDocuments('bookings');
        const booking = all.find(b => b.id === req.params.id);
        if (!booking) return fail(res, 404, 'BOOKING_NOT_FOUND', 'Không tìm thấy đơn này.');
        if (String(booking.phone || '').replace(/[\s.-]/g, '').replace(/^\+84/, '0') !== phone) {
            return fail(res, 403, 'PHONE_MISMATCH', 'Số điện thoại không khớp với đơn này.');
        }
        res.json({
            can_review: booking.status === 'completed',
            reason: booking.status === 'completed' ? '' : 'Đánh giá được sau khi dùng xong dịch vụ.',
            targets: reviews.targetsForBooking(booking),
        });
    } catch (err) {
        console.error('[reviews/reviewable]', err.message);
        fail(res, 502, 'REVIEWS_UNAVAILABLE', 'Không tra cứu được lúc này.');
    }
});

// POST /v1/reviews — gửi đánh giá
router.post('/reviews', async (req, res) => {
    const body = req.body || {};
    const bookingId = asString(body.booking_id || body.bookingId, 80);
    const phone = asString(body.phone, 20).replace(/[\s.-]/g, '').replace(/^\+84/, '0');
    const targetType = asString(body.target_type || body.targetType, 20);
    const targetId = asString(body.target_id || body.targetId, 80);

    if (!isPhone(phone)) return fail(res, 400, 'INVALID_PHONE', 'Số điện thoại không hợp lệ.');

    try {
        const all = await listDocuments('bookings');
        const booking = all.find(b => b.id === bookingId);
        const remaining = reviews.targetsForBooking(booking);
        const target = remaining.find(t => t.type === targetType && String(t.id) === targetId)
            // Đơn có đúng một thứ để đánh giá thì khỏi bắt khách chọn
            || (remaining.length === 1 ? remaining[0] : null);

        if (!target) {
            // Phân biệt "đã đánh giá rồi" với "đơn này vốn không có gì để đánh
            // giá" — hai chuyện khác nhau, gộp chung khách đọc không hiểu.
            const done = booking && reviews.all().some(r => r.bookingId === booking.id);
            return done
                ? fail(res, 409, 'ALREADY_REVIEWED', 'Bạn đã đánh giá đơn này rồi. Cảm ơn bạn!')
                : fail(res, 400, 'INVALID_TARGET', 'Đơn này không có gì để đánh giá.');
        }

        const saved = reviews.create({
            booking,
            targetType: target.type,
            targetId: target.id,
            targetLabel: target.label,
            rating: body.rating,
            comment: body.comment,
            phone,
        });
        res.status(201).json({
            data: reviews.toPublic(saved),
            summary: reviews.summaryFor(target.type, target.id),
            message: 'Cảm ơn bạn đã đánh giá!',
        });
    } catch (err) {
        if (err.status) return fail(res, err.status, err.code, err.message);
        console.error('[reviews/create]', err.message);
        fail(res, 502, 'REVIEWS_UNAVAILABLE', 'Chưa gửi được đánh giá, bạn thử lại nhé.');
    }
});

// POST /v1/partner/reviews/:id/reply — đối tác trả lời khách
router.post('/partner/reviews/:id/reply', async (req, res) => {
    const ctx = await requirePartner(req, res);
    if (!ctx) return;
    if (!ctx.partner) return fail(res, 403, 'NOT_PARTNER', 'Tài khoản này chưa phải đối tác.');

    const saved = reviews.reply(req.params.id, ctx.partner.id, asString(req.body?.text, 1000));
    if (!saved) return fail(res, 404, 'REVIEW_NOT_FOUND', 'Không tìm thấy đánh giá này của bạn.');
    res.json({ data: reviews.toPublic(saved), message: 'Đã gửi phản hồi.' });
});

// GET /v1/bookings/lookup?phone=&code= — khách không đăng nhập vẫn tra được
router.get('/bookings/lookup', async (req, res) => {
    const phone = asString(req.query.phone, 20).replace(/[\s.-]/g, '').replace(/^\+84/, '0');
    const code = asString(req.query.code, 30).toUpperCase();

    if (!isPhone(phone)) {
        return fail(res, 400, 'INVALID_PHONE', 'Nhập số điện thoại đã dùng khi đặt (10 số).');
    }

    try {
        const all = await listDocuments('bookings');
        let mine = all.filter(b => String(b.phone || '').replace(/[\s.-]/g, '').replace(/^\+84/, '0') === phone);
        // Có mã đơn thì lọc tiếp cho chính xác
        if (code) mine = mine.filter(b => String(b.id || '').slice(-8).toUpperCase() === code);

        mine.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
        res.json({
            data: mine.map(bookingOut),
            meta: { total: mine.length },
            message: mine.length ? '' : 'Không tìm thấy đơn nào với số điện thoại này.',
        });
    } catch (err) {
        console.error('[bookings/lookup]', err.message);
        fail(res, 502, 'BOOKINGS_UNAVAILABLE', 'Không tra cứu được lúc này.');
    }
});



// ════════════════════════════════════════════════════════════
// PHIÊN BẢN APP
// ════════════════════════════════════════════════════════════
// App phát bằng file APK chứ không qua Google Play, nên không có ai tự báo cho
// khách biết có bản mới — họ dùng bản cũ mãi. App mở lên hỏi endpoint này.

// GET /v1/app/version?have=1
router.get('/app/version', (req, res) => {
    const have = asString(req.query.have, 10);
    const lang = String(req.headers['accept-language'] || '').toLowerCase().startsWith('en') ? 'en' : 'vi';
    res.json(appversion.check(have, publicBaseUrl(req), lang));
});

// POST /v1/admin/app/version — admin cập nhật sau khi phát bản mới
router.post('/admin/app/version', async (req, res) => {
    if (!(await requireAdmin(req, res))) return;
    const b = req.body || {};

    const code = Number(b.version_code);
    if (!Number.isFinite(code) || code < 1) {
        return fail(res, 400, 'INVALID_CODE', 'versionCode phải là số nguyên dương.');
    }
    // Không cho lùi số: app so sánh bằng số này, lùi xuống là mọi máy đang chạy
    // bản mới lại bị mời "cập nhật" ngược về bản cũ.
    if (code < appversion.current().version_code) {
        return fail(res, 400, 'CODE_WENT_BACK',
            'versionCode mới phải lớn hơn hoặc bằng bản hiện tại.');
    }

    const saved = appversion.save(b);

    // Cách 2 (app tự hỏi) chỉ báo được khi khách MỞ app. Push thì tới cả khi
    // app đang tắt hẳn — hai thứ bù cho nhau, nên làm luôn trong một thao tác.
    let daGui = 0;
    if (b.notify !== false) {
        daGui = notifications.broadcast({
            title: `LOCALMATE ${saved.version_name} đã có`,
            body: saved.notes || 'Mở app để tải bản mới.',
            data: { kind: 'app_update', version_code: String(saved.version_code) },
        });
    }

    res.json({
        data: saved,
        devices_notified: daGui,
        message: daGui
            ? `Đã cập nhật phiên bản và báo cho ${daGui} máy.`
            : 'Đã cập nhật phiên bản app.',
    });
});

// ════════════════════════════════════════════════════════════
// HIỂU VỀ AN GIANG — dành cho khách ngoài tỉnh
// ════════════════════════════════════════════════════════════
// Ba endpoint trả lời ba câu hỏi mà khách lần đầu tới đây luôn hỏi, và trước
// đây app im lặng hoàn toàn: đi tháng nào, vùng này có những ai, và sắp lịch
// mấy ngày cho khỏi chạy lòng vòng.

/** Ngôn ngữ lấy từ ?lang= hoặc header Accept-Language do app gửi. */
function langOf(req) {
    const q = asString(req.query.lang, 5).toLowerCase();
    if (q === 'en' || q === 'vi') return q;
    return String(req.headers['accept-language'] || '').toLowerCase().startsWith('en') ? 'en' : 'vi';
}

// GET /v1/seasons — cả năm, hoặc ?month=9 cho một tháng
router.get('/seasons', (req, res) => {
    const lang = langOf(req);
    const m = asString(req.query.month, 2);
    if (m) return res.json({ data: seasons.month(m, lang) });
    res.json({
        data: seasons.year(lang),
        best_for: seasons.bestFor(lang),
        // Tháng hiện tại để giao diện mở sẵn đúng chỗ khách đang đứng
        now: new Date().getMonth() + 1,
    });
});

// GET /v1/peoples — bốn dân tộc, hoặc /v1/peoples/:slug
router.get('/peoples', (req, res) => {
    res.json({ data: peoples.all(langOf(req)) });
});

router.get('/peoples/:slug', (req, res) => {
    const found = peoples.find(asString(req.params.slug, 30), langOf(req));
    if (!found) return fail(res, 404, 'PEOPLE_NOT_FOUND', 'Không tìm thấy.');
    res.json({ data: found });
});

// GET /v1/clusters — gom điểm thành từng ngày đi
router.get('/clusters', (req, res) => {
    res.json({ data: clusters.build(langOf(req)) });
});

// ════════════════════════════════════════════════════════════
// GET /v1/journal?phone=   — Nhật ký chuyến đi
// ════════════════════════════════════════════════════════════
// Tổng kết mọi thứ khách đã làm ở Bảy Núi: ngủ ở đâu, đi tuyến nào, tour gì,
// đóng được con dấu nào, tiêu bao nhiêu — gộp thành một dòng thời gian.
//
// Tra bằng số điện thoại như trang "Đơn của tôi", để khách không có tài khoản
// vẫn xem được. Khách đã đăng nhập thì lấy luôn đơn gắn với tài khoản, kể cả
// những đơn đặt bằng số điện thoại khác.
router.get('/journal', async (req, res) => {
    const phone = asString(req.query.phone, 20).replace(/[\s.-]/g, '').replace(/^\+84/, '0');
    const token = bearerToken(req);

    let user = null;
    if (token) {
        try { user = await auth.me(token); } catch (_) { /* token hỏng thì coi như khách vãng lai */ }
    }

    if (!user && !isPhone(phone)) {
        return fail(res, 400, 'NEED_IDENTITY',
            'Nhập số điện thoại đã dùng khi đặt, hoặc đăng nhập để xem nhật ký.');
    }

    try {
        const all = await listDocuments('bookings', token ? { idToken: token } : undefined);
        const mine = all.filter((b) => {
            const bPhone = String(b.phone || '').replace(/[\s.-]/g, '').replace(/^\+84/, '0');
            if (phone && bPhone === phone) return true;
            if (user && ((user.id && b.userId === user.id) || (user.email && b.email === user.email))) return true;
            return false;
        });

        res.json(journal.build(mine, {
            userId: user?.id || '',
            phone,
            name: user?.full_name || '',
        }));
    } catch (err) {
        console.error('[journal]', err.message);
        fail(res, 502, 'JOURNAL_UNAVAILABLE', 'Chưa dựng được nhật ký lúc này.');
    }
});

// POST /v1/bookings/:id/cancel — khách tự huỷ
router.post('/bookings/:id/cancel', commerce.serialize(req => 'status:' + req.params.id, async (req, res) => {
    const phone = asString(req.body?.phone, 20).replace(/[\s.-]/g, '').replace(/^\+84/, '0');
    const reason = asString(req.body?.reason, 300);
    const token = bearerToken(req);

    try {
        const all = await listDocuments('bookings', token ? { idToken: token } : undefined);
        const booking = all.find(b => b.id === req.params.id);
        if (!booking) return fail(res, 404, 'BOOKING_NOT_FOUND', 'Không tìm thấy đơn này.');

        // Chỉ chủ đơn mới huỷ được: hoặc đúng tài khoản, hoặc đúng số điện thoại
        let owner = false;
        if (token) {
            try {
                const user = await auth.me(token);
                owner = Boolean((user.id && booking.userId === user.id) || (user.email && booking.email === user.email));
            } catch (_) { /* bỏ qua, xét tiếp theo số điện thoại */ }
        }
        if (!owner && phone) {
            owner = String(booking.phone || '').replace(/[\s.-]/g, '').replace(/^\+84/, '0') === phone;
        }
        if (!owner) {
            return fail(res, 403, 'NOT_YOUR_BOOKING',
                'Để huỷ, bạn nhập đúng số điện thoại đã dùng khi đặt.');
        }

        if (booking.status === 'cancelled') {
            return fail(res, 409, 'ALREADY_CANCELLED', 'Đơn này đã huỷ trước đó rồi.');
        }
        if (booking.status === 'completed') {
            return fail(res, 409, 'ALREADY_DONE', 'Đơn đã hoàn thành, không huỷ được.');
        }

        // Tính tiền hoàn NGAY LÚC HUỶ và ghi vào đơn.
        //
        // Ghi lại con số chứ không tính lại sau: tính lại vào tuần sau thì
        // "còn mấy ngày nữa tới ngày nhận phòng" đã khác, ra một số khác, và
        // không ai giải thích được vì sao.
        const daCoc = booking.paymentStatus === 'paid' ? (Number(booking.depositAmount) || 0) : 0;
        const hoan = huydon.tinh({
            policy: booking.cancelPolicy,
            checkIn: booking.checkIn,
            depositPaid: daCoc,
        });

        // Đơn đặc sản huỷ thì trả hàng về kho, không thì bán một lần mất
        // luôn số lượng đó dù chẳng ai nhận hàng.
        await updateDocument('bookings', booking.id, {
            status: 'cancelled',
            cancelledAt: new Date(),
            cancelReason: reason || 'Khách tự huỷ',
            refundPolicy: hoan.muc,
            refundPercent: hoan.phan_tram,
            refundAmount: hoan.so_tien,
            refundStatus: hoan.so_tien > 0 ? 'pending' : 'none',
        });
        restoreFoodStock(booking);

        const ma = maDon(booking.id);

        // Chủ nhà phải biết ngay để mở lại đêm đó cho khách khác
        if (booking.partnerId) {
            notifications.push({
                audience: 'partner',
                partnerId: booking.partnerId,
                kind: 'booking_cancelled',
                title: 'Khách đã huỷ một đơn',
                body: `${ma} · ${booking.guestName || ''} · ${booking.checkIn || ''}`
                    + ' — đêm này đã trống lại trên lịch của bạn.',
                bookingId: booking.id,
            });
        }
        // Quỹ phải hoàn tiền thì quản trị phải biết, không thì khách chờ mãi
        if (hoan.so_tien > 0) {
            notifications.push({
                audience: 'admin',
                kind: 'refund_due',
                title: 'Cần hoàn cọc cho khách',
                body: `${ma} · ${booking.guestName || ''} · `
                    + `${hoan.so_tien.toLocaleString('vi-VN')}đ (${hoan.phan_tram}% theo mức ${hoan.ten})`,
                bookingId: booking.id,
            });
        }

        res.json({
            data: {
                id: booking.id,
                status: 'cancelled',
                refund: hoan,
                deposit_paid: daCoc,
            },
            message: daCoc === 0
                ? 'Đã huỷ đơn. Bạn chưa chuyển cọc nên không có khoản nào phải hoàn.'
                : hoan.so_tien > 0
                    ? `Đã huỷ đơn. LOCALMATE sẽ hoàn ${hoan.so_tien.toLocaleString('vi-VN')}đ `
                      + `(${hoan.phan_tram}% tiền cọc) trong 3–5 ngày làm việc.`
                    : 'Đã huỷ đơn. Theo mức huỷ của chỗ nghỉ này, tiền cọc không được hoàn lại.',
        });
    } catch (err) {
        console.error('[bookings/cancel]', err.message);
        fail(res, 502, 'CANCEL_FAILED', `Không huỷ được lúc này, bạn gọi hotline ${lienhe.HOTLINE} giúp mình.`);
    }
}));

// ════════════════════════════════════════════════════════════
// BÁM XE TRÊN ĐƯỜNG — tài xế gửi vị trí, khách theo dõi
// ════════════════════════════════════════════════════════════

// POST /v1/driver/trips/:bookingId/location — app tài xế gửi vị trí khi đang chạy
// GET /v1/driver/trip — chuyến tài xế đang chạy dở
//
// App tài xế giữ chuyến đang chạy trong bộ nhớ của chính nó, nên điện thoại
// hết pin hay app bị tắt là mất bảng điều khiển chuyến: không còn bản đồ,
// không còn nút "Đã đón khách", và app thôi gửi vị trí cho khách theo dõi.
// Mở app lại thì gọi endpoint này để dựng lại đúng chuyến đó.
router.get('/driver/trip', async (req, res) => {
    const ctx = await requireDriver(req, res);
    if (!ctx) return;

    const trip = dispatch.activeTripOf(ctx.partner.id);
    if (!trip) return res.json({ active: false });

    const b = trip.booking || {};
    res.json({
        active: true,
        stage: trip.stage,
        booking_id: trip.bookingId,
        status: 'confirmed',
        pickup: b.pickup || '',
        pickup_lat: b.pickupLat ?? null,
        pickup_lng: b.pickupLng ?? null,
        dropoff: b.dropoff || '',
        guest_name: b.guestName || '',
        guest_phone: b.guestPhone || b.phone || '',
    });
});

router.post('/driver/trips/:bookingId/location', async (req, res) => {
    const ctx = await requireDriver(req, res);
    if (!ctx) return;

    const lat = Number.parseFloat(req.body?.lat);
    const lng = Number.parseFloat(req.body?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return fail(res, 400, 'INVALID_COORDS', 'Toạ độ không hợp lệ.');
    }

    const trip = dispatch.updateTripLocation(req.params.bookingId, ctx.partner.id, lat, lng);
    if (!trip) return fail(res, 404, 'TRIP_NOT_FOUND', 'Chuyến này không phải của bạn hoặc đã kết thúc.');
    res.json({ ok: true, stage: trip.stage });
});

// POST /v1/driver/trips/:bookingId/stage — "đã đón khách" / "đã trả khách"
router.post('/driver/trips/:bookingId/stage', async (req, res) => {
    const ctx = await requireDriver(req, res);
    if (!ctx) return;

    const stage = asString(req.body?.stage, 20);
    const trip = dispatch.setTripStage(req.params.bookingId, ctx.partner.id, stage);
    if (!trip) {
        return fail(res, 400, 'INVALID_STAGE',
            `Chặng phải là một trong: ${dispatch.TRIP_STAGES.join(', ')}.`);
    }

    // Trả khách xong thì đánh dấu đơn hoàn thành luôn, đỡ một thao tác
    if (stage === 'done') {
        try {
            await updateDocument('bookings', req.params.bookingId, {
                status: 'completed',
                completedAt: new Date(),
            });
        } catch (err) {
            console.error('[trips/stage]', err.message);
        }
    }

    res.json({
        stage: trip.stage,
        message: stage === 'onboard' ? 'Đã đón khách. Chúc chuyến đi an toàn!'
            : stage === 'done' ? 'Đã hoàn thành chuyến.'
                : 'Đang trên đường tới đón khách.',
    });
});

// GET /v1/bookings/:id/track — khách xem xe đang ở đâu, còn bao xa
router.get('/bookings/:id/track', async (req, res) => {
    const trip = dispatch.tripOf(req.params.id);
    if (!trip) {
        return res.json({
            tracking: false,
            message: 'Tài xế chưa bắt đầu chuyến. Bạn sẽ thấy vị trí xe khi họ lên đường.',
        });
    }

    // Tính quãng đường còn lại: chặng "pickup" đo tới điểm đón, chặng
    // "onboard" đo tới điểm đến. Chuyến đã xong thì không còn gì để đi —
    // trước đây chặng "done" rơi vào nhánh mặc định và đo ngược về điểm đón,
    // nên khách xuống xe rồi màn hình vẫn báo "còn 13,8 km".
    let etaMinutes = null;
    let remainingKm = null;
    // Toạ độ nơi xe đang hướng tới — bản đồ bám xe cắm ghim ở đây để khách
    // thấy xe còn cách mình bao xa chứ không chỉ đọc con số.
    let targetLat = null;
    let targetLng = null;
    let targetLabel = '';
    try {
        const all = await listDocuments('bookings');
        const booking = all.find(b => b.id === req.params.id);
        let target = null;
        if (trip.stage === 'onboard') {
            target = coordsFromName(booking?.dropoff);
            targetLabel = booking?.dropoff || '';
        } else if (trip.stage !== 'done') {
            target = Number.isFinite(booking?.pickupLat)
                ? { lat: booking.pickupLat, lng: booking.pickupLng }
                : coordsFromName(booking?.pickup);
            targetLabel = booking?.pickup || '';
        }
        if (target) { targetLat = target.lat; targetLng = target.lng; }

        if (target && Number.isFinite(trip.lat) && Number.isFinite(trip.lng)) {
            const { haversineKm } = require('./geo');
            remainingKm = Math.round(haversineKm(trip.lat, trip.lng, target.lat, target.lng) * 1.3 * 10) / 10;
            etaMinutes = Math.max(1, Math.round((remainingKm / 35) * 60));
        }
    } catch (_) { /* không tính được thì vẫn trả vị trí xe */ }

    const stageLabel = {
        pickup: 'Tài xế đang trên đường tới đón bạn',
        onboard: 'Đang trên đường tới điểm đến',
        done: 'Chuyến đã hoàn thành',
    }[trip.stage] || '';

    res.json({
        tracking: true,
        ...trip,
        stage_label: stageLabel,
        remaining_km: remainingKm,
        eta_minutes: etaMinutes,
        target_lat: targetLat,
        target_lng: targetLng,
        target_label: targetLabel,
        message: trip.stale
            ? 'Tài xế đang mất sóng, vị trí có thể chưa cập nhật.'
            : stageLabel,
    });
});

// Khách theo dõi "đang tìm tài xế"
router.get('/bookings/:id/dispatch', (req, res) => {
    res.json({
        ...dispatch.statusOf(req.params.id),
        giveup_minutes: Math.round(dispatch.SEARCH_GIVEUP_MS / 60000),
    });
});

// Tìm 10 phút không ai nhận → khách bấm "Tìm lại tài xế"
router.post('/bookings/:id/redispatch', (req, res) => {
    const result = dispatch.retrySearch(req.params.id);
    if (!result) {
        return fail(res, 409, 'NOT_SEARCHABLE',
            'Chuyến này không còn ở trạng thái chờ tài xế. Bạn đặt lại giúp nhé.');
    }
    res.json({
        ...dispatch.statusOf(req.params.id),
        found: result.found,
        rounds: result.rounds,
        message: result.found
            ? 'Đã tìm thấy tài xế, đang chờ họ xác nhận.'
            : 'Đang tìm lại tài xế quanh điểm đón…',
    });
});

// ════════════════════════════════════════════════════════════
// DỊCH VỤ CỦA ĐỐI TÁC — lưu trú, tour, xe đưa đón và đặc sản
// ════════════════════════════════════════════════════════════
// Admin duyệt hồ sơ đối tác một lần. Sau đó phòng, tour và đặc sản họ đăng
// được hiển thị ngay; nhà xe có thể bật nhận chuyến ngay. Không duyệt lại
// từng bài/dịch vụ vì mọi endpoint bên dưới đã yêu cầu đối tác được duyệt.

/** Chỉ cho phép đối tác ĐÃ ĐƯỢC DUYỆT. Trả về ctx hoặc null. */
async function requireApprovedPartner(req, res, allowedTypes = null) {
    const ctx = await requirePartner(req, res);
    if (!ctx) return null;
    if (!ctx.partner) {
        fail(res, 403, 'NOT_A_PARTNER', 'Tài khoản này chưa đăng ký làm đối tác.');
        return null;
    }
    if (ctx.partner.status !== 'approved') {
        fail(res, 403, 'NOT_APPROVED', 'Hồ sơ của bạn đang chờ LOCALMATE duyệt.');
        return null;
    }
    if (allowedTypes && !allowedTypes.includes(ctx.partner.type)) {
        fail(res, 403, 'WRONG_PARTNER_TYPE', 'Loại đối tác của bạn không đăng được mục này.');
        return null;
    }
    return ctx;
}

const asArray = (value, max = 12) => (Array.isArray(value)
    ? value.map(v => asString(v, 60)).filter(Boolean).slice(0, max)
    : asString(value, 400).split(',').map(v => v.trim()).filter(Boolean).slice(0, max));

/** Đọc và làm sạch dữ liệu tin đăng theo từng loại. */
function listingFields(body, type) {
    const base = {
        type,
        name: asString(body?.name, 160),
        description: asString(body?.description, 1200),
        price: Math.max(asInt(body?.price, 0), 0),
        // Ảnh bìa + cả thư viện. Một tấm ảnh không bán được phòng — khách sạn
        // cần khoe phòng, ban công, nhà tắm. Vẫn giữ field image cho tương thích
        // với những tin đăng từ trước.
        image: asString(body?.image, 300),
        images: (Array.isArray(body?.images) ? body.images : [])
            .map(u => asString(u, 300))
            .filter(Boolean)
            .slice(0, 8),
        phone: asString(body?.phone, 20),
    };

    if (type === 'food') {
        return {
            ...base,
            area: asString(body?.area, 200),
            // Giá gốc để gạch ngang. Chỉ có ý nghĩa khi LỚN HƠN giá đang bán.
            oldPrice: Math.max(asInt(body?.old_price ?? body?.oldPrice, 0), 0),
            // Số lượng còn; để 0 nghĩa là không theo dõi tồn, bán thoải mái
            stock: Math.max(asInt(body?.stock, 0), 0),
            // Đơn vị bán: phần, hũ, kg, con… mỗi món một kiểu nên để chủ hàng gõ
            unit: asString(body?.unit, 30) || 'phần',
            // Gửi đi xa được không, giữ được bao lâu — hai câu khách ngoài tỉnh
            // luôn hỏi trước khi đặt.
            shipping: asString(body?.shipping, 200),
            keeping: asString(body?.keeping, 200),
        };
    }

    if (type === 'stay') {
        return {
            ...base,
            area: asString(body?.area, 200),
            lat: Number.parseFloat(body?.lat),
            lng: Number.parseFloat(body?.lng),
            capacity: Math.min(Math.max(asInt(body?.capacity, 2), 1), 30),
            // So phong giong nhau. Tran 50 la de chan go nham, chu khong phai
            // gioi han that — nha nghi 60 phong thi khai lam hai tin.
            quantity: Math.min(Math.max(asInt(body?.quantity, 1), 1), 50),
            // Muc huy don. Go bay thi ve mac dinh, chu khong bao loi: chu nha
            // dang sua gia phong ma bi chan vi mot truong ho khong dong toi
            // thi kho hieu.
            cancelPolicy: huydon.layMuc(body?.cancel_policy || body?.cancelPolicy).id,
            amenities: asArray(body?.amenities),
        };
    }
    return {
        ...base,
        days: Math.min(Math.max(asInt(body?.days, 1), 1), 7),
        duration: asString(body?.duration, 80),
        pax: asString(body?.pax, 60),
        stops: asString(body?.stops, 300),
        includes: asArray(body?.includes),
    };
}

/** Kiểm tra bắt buộc. Trả về chuỗi lỗi, hoặc null nếu hợp lệ. */
function validateListing(data) {
    if (data.name.length < 3) return 'Tên phải có ít nhất 3 ký tự.';
    if (data.price <= 0) return 'Vui lòng nhập giá.';
    if (data.type === 'stay') {
        if (!data.area) return 'Vui lòng nhập khu vực (ví dụ: Núi Sam, Châu Đốc, An Giang).';
        if (!Number.isFinite(data.lat) || !Number.isFinite(data.lng)) {
            return 'Chưa có toạ độ. Bạn bấm nút "Lấy vị trí" khi đang đứng tại cơ sở của mình nhé.';
        }
        if (data.lat < 8 || data.lat > 24 || data.lng < 102 || data.lng > 110) {
            return 'Toạ độ nằm ngoài Việt Nam, bạn kiểm tra lại giúp mình.';
        }
    }
    return null;
}

const listingOut = (row) => ({
    id: row.id,
    type: row.type,
    name: row.name,
    description: row.description || '',
    price: row.price,
    image: row.image || '',
    images: listings.imagesOf(row),
    status: row.status,
    status_label: listings.STATUS_LABELS[row.status] || row.status,
    sold_out: Boolean(row.soldOut),
    reject_note: row.rejectNote || '',
    created_at: row.createdAt || '',
    // Chỗ nghỉ
    area: row.area || '',
    lat: row.lat ?? null,
    lng: row.lng ?? null,
    capacity: row.capacity ?? null,
    quantity: Math.max(1, Number(row.quantity) || 1),
    cancel_policy: huydon.layMuc(row.cancelPolicy).id,
    amenities: row.amenities || [],
    // Đặc sản
    unit: row.unit || '',
    old_price: Number(row.oldPrice) || 0,
    stock: Number(row.stock) || 0,
    shipping: row.shipping || '',
    keeping: row.keeping || '',
    // Tour
    days: row.days ?? null,
    duration: row.duration || '',
    pax: row.pax || '',
    stops: row.stops || '',
    includes: row.includes || [],
    partner_id: row.partnerId,
    partner_name: row.partnerName || '',
});

// Loại đối tác nào đăng được mục gì
const LISTING_TYPE_OF = { hotel: 'stay', tour: 'tour', food: 'food' };

// POST /v1/uploads/image — đối tác tải ảnh thật từ máy/điện thoại lên.
// Nhận thẳng byte của tệp, không phải JSON, nên có giới hạn riêng 5 MB.
router.post(
    '/uploads/image',
    express.raw({ type: ['image/*', 'application/octet-stream'], limit: uploads.MAX_BYTES }),
    async (req, res) => {
        // Quản trị cũng tải ảnh lên được — ảnh phòng của chính homestay đăng
        // từ trang admin đi qua đúng đường này. Kiểm tra quản trị TRƯỚC, vì
        // tài khoản quản trị thường không phải đối tác nên nếu để
        // requireApprovedPartner chạy trước thì nó đã trả lỗi mất rồi.
        const token = bearerToken(req);
        let chuSoHuu = '';
        if (token) {
            try {
                const user = await auth.me(token);
                if (ADMIN_EMAILS.includes(String(user.email).toLowerCase())) chuSoHuu = 'admin';
            } catch (_) { /* không phải admin thì xét tiếp bên dưới */ }
        }

        if (!chuSoHuu) {
            // 'food' PHAI co trong danh sach nay. Thieu no thi co so dac san
            // khong tai duoc anh mon hang nao ca — ma anh la thu duy nhat ban
            // duoc hang an. Bieu mau van hien nut chon anh, bam vao bao 403,
            // chu hang khong hieu vi sao.
            const ctx = await requireApprovedPartner(req, res, ['hotel', 'tour', 'transport', 'food']);
            if (!ctx) return;
            chuSoHuu = ctx.partner.id;
        }

        try {
            const saved = uploads.saveImage(req.body, chuSoHuu);
            res.status(201).json({
                ...saved,
                message: 'Đã tải ảnh lên.',
            });
        } catch (err) {
            const messages = {
                EMPTY: 'Chưa chọn ảnh nào.',
                TOO_BIG: `Ảnh lớn hơn ${Math.round(uploads.MAX_BYTES / 1024 / 1024)} MB. Bạn chụp lại ở kích thước nhỏ hơn nhé.`,
                BAD_TYPE: 'Chỉ nhận ảnh JPG, PNG hoặc WebP.',
            };
            fail(res, 400, err.code || 'UPLOAD_FAILED', messages[err.code] || 'Không lưu được ảnh.');
        }
    },
);

// GET /v1/partner/listings — danh sách tin của chính đối tác
router.get('/partner/listings', async (req, res) => {
    const ctx = await requireApprovedPartner(req, res, ['hotel', 'tour', 'food']);
    if (!ctx) return;
    const rows = listings.byPartner(ctx.partner.id);
    res.json({
        data: rows.map(listingOut),
        listing_type: LISTING_TYPE_OF[ctx.partner.type],
        meta: {
            total: rows.length,
            approved: rows.filter(r => r.status === 'approved').length,
            pending: rows.filter(r => r.status === 'pending').length,
        },
    });
});

// POST /v1/partner/listings — đăng mới
router.post('/partner/listings', async (req, res) => {
    const ctx = await requireApprovedPartner(req, res, ['hotel', 'tour', 'food']);
    if (!ctx) return;

    const type = LISTING_TYPE_OF[ctx.partner.type];
    const data = listingFields(req.body, type);
    const error = validateListing(data);
    if (error) return fail(res, 400, 'INVALID_LISTING', error);

    const row = listings.create({
        ...data,
        partnerId: ctx.partner.id,
        partnerName: ctx.partner.name,
        phone: data.phone || ctx.partner.phone || '',
    });
    res.status(201).json({
        data: listingOut(row),
        message: 'Đã đăng. Tin đang hiển thị cho khách trên web và ứng dụng.',
    });
});

// PATCH /v1/partner/listings/:id — sửa tin của mình
// PATCH /v1/partner/listings/:id/soldout — bật/tắt "tạm hết"
//
// Tách riêng khỏi endpoint sửa tin. Khách tới
// tận nơi đặt hết phòng thì chủ nhà cần chặn đặt online NGAY, chờ duyệt vài
// giờ là khách khác đã đặt trùng mất rồi.
router.patch('/partner/listings/:id/soldout', async (req, res) => {
    const ctx = await requireApprovedPartner(req, res, ['hotel', 'tour', 'food']);
    if (!ctx) return;

    const row = listings.find(req.params.id);
    if (!row || row.partnerId !== ctx.partner.id) {
        return fail(res, 404, 'LISTING_NOT_FOUND', 'Không tìm thấy tin này của bạn.');
    }

    const soldOut = req.body?.sold_out !== false;
    const saved = listings.update(row.id, { soldOut });
    // Đổi tin đăng là đổi thứ khách hỏi bot; bỏ đệm để bot đọc số mới.
    chatbot.quenCache();

    res.json({
        data: listingOut(saved),
        message: soldOut
            ? 'Đã đánh dấu tạm hết. Khách vẫn thấy tin nhưng không đặt được.'
            : 'Đã mở lại. Khách đặt được bình thường.',
    });
});

router.patch('/partner/listings/:id', async (req, res) => {
    const ctx = await requireApprovedPartner(req, res, ['hotel', 'tour', 'food']);
    if (!ctx) return;

    const row = listings.find(req.params.id);
    if (!row) return fail(res, 404, 'LISTING_NOT_FOUND', 'Không tìm thấy tin này.');
    if (row.partnerId !== ctx.partner.id) {
        return fail(res, 403, 'NOT_YOURS', 'Đây không phải tin của bạn.');
    }

    // Đổi tin đăng là đổi thứ khách hỏi bot; bỏ đệm để bot đọc số mới.
    chatbot.quenCache();

    // Bật lại một tin cũ sẽ đưa thẳng về trạng thái hiển thị. Nhờ vậy những
    // bản ghi pending/rejected còn sót từ quy trình cũ không bị mắc kẹt.
    const onlyToggle = req.body?.status && Object.keys(req.body).length === 1;
    if (onlyToggle) {
        const next = req.body.status === 'paused' ? 'paused' : 'approved';
        return res.json({ data: listingOut(listings.update(row.id, { status: next })) });
    }

    // Chỉ đổi mức huỷ thì cũng không cần gửi lại cả tin.
    //
    // PATCH ở đây vốn là THAY TOÀN BỘ: biểu mẫu sửa tin gửi lên đủ mọi trường
    // nên không sao. Nhưng đổi mỗi mức huỷ mà bắt gửi kèm cả tên, giá, ảnh thì
    // ai gọi thiếu một trường là trường đó bị xoá trắng.
    const chiDoiMucHuy = (req.body?.cancel_policy || req.body?.cancelPolicy)
        && Object.keys(req.body).length === 1;
    if (chiDoiMucHuy) {
        const muc = huydon.layMuc(req.body.cancel_policy || req.body.cancelPolicy).id;
        return res.json({ data: listingOut(listings.update(row.id, { cancelPolicy: muc })) });
    }

    const data = listingFields(req.body, row.type);
    const error = validateListing(data);
    if (error) return fail(res, 400, 'INVALID_LISTING', error);

    // Đối tác đã được duyệt hồ sơ nên nội dung sửa có hiệu lực ngay. Nếu họ
    // đang chủ động tạm ẩn tin thì giữ trạng thái đó cho tới khi tự bật lại.
    const nextStatus = row.status === 'paused' ? 'paused' : 'approved';
    const updated = listings.update(row.id, {
        ...data,
        status: nextStatus,
        rejectNote: '',
        publishedAt: row.publishedAt || new Date().toISOString(),
    });
    res.json({
        data: listingOut(updated),
        message: nextStatus === 'paused'
            ? 'Đã lưu. Tin vẫn đang tạm ẩn; bạn có thể bật lại bất cứ lúc nào.'
            : 'Đã lưu. Thay đổi đang hiển thị ngay cho khách.',
    });
});

// ════════════════════════════════════════════════════════════
// LỊCH PHÒNG
// ════════════════════════════════════════════════════════════
// Trước đây chỗ nghỉ chỉ có một công tắc "còn / hết" dùng cho MỌI ngày. Nghỉ
// Tết ba hôm thì phải tắt cả phòng, mất luôn đơn của những ngày khác. Khách
// quen gọi điện đặt thẳng cuối tuần thì hai đêm đó trên hệ thống vẫn trống,
// ai đặt online cũng nhận — tới nơi mới vỡ ra là trùng.

/** Tin đăng này có phải của người đang đăng nhập không. */
function tinCuaToi(listingId, partnerId) {
    const l = listings.find(listingId);
    if (!l || String(l.partnerId) !== String(partnerId)) return null;
    return l;
}

// GET /v1/partner/listings/:id/calendar?month=YYYY-MM
//
// Trả lịch một tháng: mỗi đêm là trống, đã có khách, hay chủ nhà tự đóng.
// Đêm có khách kèm luôn tên và số điện thoại — chủ nhà nhìn lịch là gọi được
// ngay, khỏi phải sang bảng đơn tra lại.
router.get('/partner/listings/:id/calendar', async (req, res) => {
    const ctx = await doiTacDaDuyet(req, res);
    if (!ctx) return;

    const listing = tinCuaToi(asString(req.params.id, 80), ctx.partner.id);
    if (!listing) return fail(res, 404, 'LISTING_NOT_FOUND', 'Không tìm thấy tin đăng này của bạn.');

    const month = asString(req.query.month, 10) || new Date().toISOString().slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) {
        return fail(res, 400, 'INVALID_MONTH', 'Tháng phải có dạng 2026-09.');
    }
    const [y, m] = month.split('-').map(Number);
    const soNgay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const from = `${month}-01`;
    const to = addDays(`${month}-${String(soNgay).padStart(2, '0')}`, 1);

    let donTrung = [];
    try {
        donTrung = await conflictingStays(listing.id, from, to);
    } catch (err) {
        console.error('[partner/calendar]', err.message);
        return fail(res, 502, 'DATABASE_UNAVAILABLE', 'Chưa đọc được lịch phòng.');
    }

    // Trải từng đơn ra thành từng đêm. Tin có nhiều phòng thì một đêm có thể
    // có nhiều khách cùng lúc — giữ CẢ DANH SÁCH chứ không chỉ người cuối.
    const khachTheoDem = new Map();
    for (const b of donTrung) {
        const ra = String(b.checkOut || '') || addDays(b.checkIn, Math.max(1, Number(b.nights) || 1));
        for (let d = String(b.checkIn); d < ra; d = addDays(d, 1)) {
            if (d < from || d >= to) continue;
            if (!khachTheoDem.has(d)) khachTheoDem.set(d, []);
            khachTheoDem.get(d).push({
                booking_id: b.id,
                code: String(b.id).slice(-8).toUpperCase(),
                guest: b.guestName || '',
                phone: b.phone || '',
                status: b.status,
            });
        }
    }

    const soPhong = Math.max(1, Number(listing.quantity) || 1);
    const daDong = new Set(lichphong.dongTrongKhoang(listing.id, from, to));
    const homNay = new Date().toISOString().slice(0, 10);

    const ngay = [];
    for (let i = 1; i <= soNgay; i += 1) {
        const d = `${month}-${String(i).padStart(2, '0')}`;
        const khach = khachTheoDem.get(d) || [];
        // "full" = kín sạch, "partial" = còn phòng nhưng đã có khách.
        // Tách hai cái này ra vì chủ nhà xử lý khác nhau: kín thì hết chuyện,
        // còn phòng thì vẫn đón thêm được.
        const trangThai = khach.length >= soPhong ? 'booked'
            : khach.length ? 'partial'
            : daDong.has(d) ? 'closed' : 'open';
        ngay.push({
            date: d,
            past: d < homNay,
            state: trangThai,
            booked_count: khach.length,
            free_count: Math.max(0, soPhong - khach.length),
            closed: daDong.has(d),
            bookings: khach,
            // Giữ trường cũ cho phần giao diện đang đọc một khách
            booking: khach[0] || null,
        });
    }

    res.json({
        month,
        listing: { id: listing.id, name: listing.name, price: listing.price,
                   quantity: soPhong, sold_out: Boolean(listing.soldOut) },
        days: ngay,
        meta: {
            quantity: soPhong,
            booked: ngay.filter(x => x.state === 'booked').length,
            partial: ngay.filter(x => x.state === 'partial').length,
            closed: ngay.filter(x => x.state === 'closed').length,
            open: ngay.filter(x => x.state === 'open' && !x.past).length,
        },
    });
});

// POST /v1/partner/listings/:id/calendar — đóng hoặc mở một loạt đêm
router.post('/partner/listings/:id/calendar', async (req, res) => {
    const ctx = await doiTacDaDuyet(req, res);
    if (!ctx) return;

    const listing = tinCuaToi(asString(req.params.id, 80), ctx.partner.id);
    if (!listing) return fail(res, 404, 'LISTING_NOT_FOUND', 'Không tìm thấy tin đăng này của bạn.');

    const action = asString(req.body?.action, 10);
    const dates = Array.isArray(req.body?.dates)
        ? req.body.dates.filter(lichphong.laNgay).slice(0, 62)
        : [];
    if (!['close', 'open'].includes(action)) {
        return fail(res, 400, 'INVALID_ACTION', 'Chỉ nhận close hoặc open.');
    }
    if (!dates.length) return fail(res, 400, 'NO_DATES', 'Chưa chọn ngày nào.');

    if (action === 'open') {
        return res.json({ data: lichphong.mo(listing.id, dates), message: 'Đã mở lại.' });
    }

    // Đêm đã có khách thì KHÔNG cho đóng lặng lẽ: phải huỷ đơn đàng hoàng và
    // báo cho khách, chứ không phải đóng lịch rồi coi như xong việc.
    let coKhach = [];
    try {
        const from = dates.reduce((a, b) => (a < b ? a : b));
        const to = addDays(dates.reduce((a, b) => (a > b ? a : b)), 1);
        const rows = await conflictingStays(listing.id, from, to);
        // Đóng lịch là đóng CẢ tin cho đêm đó. Nên chỉ cần còn một khách trong
        // đêm ấy là không đóng được — đóng mà vẫn có người đặt rồi thì thành
        // ra đuổi khách đã đặt.
        const set = new Set();
        for (const b of rows) {
            const ra = String(b.checkOut || '') || addDays(b.checkIn, Math.max(1, Number(b.nights) || 1));
            for (let d = String(b.checkIn); d < ra; d = addDays(d, 1)) set.add(d);
        }
        coKhach = dates.filter(d => set.has(d));
    } catch (err) {
        console.error('[partner/calendar/close]', err.message);
        return fail(res, 502, 'DATABASE_UNAVAILABLE', 'Chưa kiểm tra được lịch phòng.');
    }

    const kq = lichphong.dong(listing.id, dates, {
        lyDo: asString(req.body?.reason, 120),
        boQua: coKhach,
    });

    res.json({
        data: kq,
        message: kq.blocked_by_booking.length
            ? `Đã đóng ${kq.added} đêm. ${kq.blocked_by_booking.length} đêm đang có khách đặt nên `
              + 'không đóng được — muốn nghỉ những đêm đó thì huỷ đơn ở mục Đơn khách đặt.'
            : `Đã đóng ${kq.added} đêm.`,
    });
});

router.delete('/partner/listings/:id', async (req, res) => {
    const ctx = await requireApprovedPartner(req, res, ['hotel', 'tour', 'food']);
    if (!ctx) return;
    const row = listings.find(req.params.id);
    if (!row) return fail(res, 404, 'LISTING_NOT_FOUND', 'Không tìm thấy tin này.');
    if (row.partnerId !== ctx.partner.id) return fail(res, 403, 'NOT_YOURS', 'Đây không phải tin của bạn.');
    listings.remove(row.id);
    // Đổi tin đăng là đổi thứ khách hỏi bot; bỏ đệm để bot đọc số mới.
    chatbot.quenCache();
    // Tin di roi thi lich cua no khong con nghia gi — de lai chi ton cho va
    // co ngay dinh nham vao mot tin moi trung ma.
    const demXoa = lichphong.xoaHetCua(row.id);
    res.json({ data: { id: row.id, deleted: true, calendar_cleared: demXoa } });
});

// ── Admin duyệt tin đăng ──
router.get('/admin/listings', async (req, res) => {
    const ctx = await requireAdmin(req, res);
    if (!ctx) return;
    const rows = listings.listAll();
    res.json({
        data: rows.map(listingOut),
        meta: {
            total: rows.length,
            pending: rows.filter(r => r.status === 'pending').length,
        },
    });
});

router.patch('/admin/listings/:id/status', async (req, res) => {
    chatbot.quenCache();
    const ctx = await requireAdmin(req, res);
    if (!ctx) return;
    const status = asString(req.body?.status, 20);
    if (!listings.STATUSES.includes(status)) {
        return fail(res, 400, 'INVALID_STATUS', `Trạng thái phải là: ${listings.STATUSES.join(', ')}.`);
    }
    const updated = listings.update(req.params.id, {
        status,
        rejectNote: status === 'rejected' ? asString(req.body?.note, 300) : '',
        reviewedAt: new Date().toISOString(),
    });
    if (!updated) return fail(res, 404, 'LISTING_NOT_FOUND', 'Không tìm thấy tin này.');
    res.json({ data: listingOut(updated) });
});

// ════════════════════════════════════════════════════════════
// LỄ HỘI & SỰ KIỆN — admin nhập, khách xem, lịch trình tự chèn
// ════════════════════════════════════════════════════════════
const eventFields = (body) => ({
    name: asString(body?.name, 160),
    category: events.CATEGORIES.includes(asString(body?.category, 30))
        ? asString(body.category, 30) : 'le-hoi',
    area: asString(body?.area, 160),
    summary: asString(body?.summary, 400),
    detail: asString(body?.detail, 2000),
    ticket: asString(body?.ticket, 80) || 'Miễn phí',
    startDate: isIsoDate(body?.start_date) ? body.start_date : '',
    endDate: isIsoDate(body?.end_date) ? body.end_date : '',
    startTime: /^\d{2}:\d{2}$/.test(body?.start_time) ? body.start_time : '08:00',
    placeSlug: asString(body?.place_slug, 60),
    image: asString(body?.image, 200),
    featured: Boolean(body?.featured),
    status: body?.status === 'hidden' ? 'hidden' : 'visible',
});

const eventOut = (e) => ({
    id: e.id,
    name: e.name,
    category: e.category,
    category_label: events.CATEGORY_LABELS[e.category] || e.category,
    area: e.area,
    summary: e.summary,
    detail: e.detail,
    ticket: e.ticket,
    start_date: e.startDate,
    end_date: e.endDate || e.startDate,
    start_time: e.startTime,
    place_slug: e.placeSlug,
    image: e.image,
    featured: Boolean(e.featured),
    status: e.status || 'visible',
});

// GET /v1/events?from=&to=   — không truyền thì trả sự kiện sắp tới
router.get('/events', (req, res) => {
    const from = asString(req.query.from, 10);
    const to = asString(req.query.to, 10);
    const rows = isIsoDate(from) ? events.eventsBetween(from, to || from) : events.upcomingEvents(8);
    res.json({ data: rows.map(eventOut), meta: { total: rows.length } });
});

// Tình trạng các key Gemini — còn bao nhiêu key dùng được, key nào đang nghỉ
// GET /v1/admin/reviews — xem toàn bộ đánh giá, kể cả đã ẩn
router.get('/admin/reviews', async (req, res) => {
    if (!(await requireAdmin(req, res))) return;
    const rows = reviews.all()
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    res.json({
        data: rows.map(r => ({ ...reviews.toPublic(r), status: r.status, phone: r.phone })),
        meta: { total: rows.length },
    });
});

// PATCH /v1/admin/reviews/:id — ẩn/hiện một đánh giá
//
// Dùng cho nội dung bậy bạ hoặc spam. KHÔNG phải để giấu đánh giá xấu: giấu
// sao thấp thì số sao còn lại thành vô nghĩa, và khách sẽ nhận ra.
router.patch('/admin/reviews/:id', async (req, res) => {
    if (!(await requireAdmin(req, res))) return;
    const saved = reviews.setStatus(req.params.id, asString(req.body?.status, 20));
    if (!saved) return fail(res, 400, 'INVALID_STATUS', 'Trạng thái phải là published hoặc hidden.');
    res.json({ data: reviews.toPublic(saved), message: saved.status === 'hidden' ? 'Đã ẩn đánh giá.' : 'Đã hiện lại đánh giá.' });
});

router.get('/admin/ai-status', async (req, res) => {
    const ctx = await requireAdmin(req, res);
    if (!ctx) return;
    res.json(gemini.status());
});

router.get('/admin/events', async (req, res) => {
    const ctx = await requireAdmin(req, res);
    if (!ctx) return;
    const rows = events.listAll();
    res.json({
        data: rows.map(eventOut),
        categories: events.CATEGORIES.map(c => ({ value: c, label: events.CATEGORY_LABELS[c] })),
        meta: { total: rows.length },
    });
});

router.post('/admin/events', async (req, res) => {
    const ctx = await requireAdmin(req, res);
    if (!ctx) return;
    const data = eventFields(req.body);
    if (data.name.length < 2) return fail(res, 400, 'INVALID_NAME', 'Vui lòng nhập tên sự kiện.');
    if (!data.startDate) return fail(res, 400, 'INVALID_DATE', 'Ngày bắt đầu phải theo dạng YYYY-MM-DD.');
    if (data.endDate && data.endDate < data.startDate) {
        return fail(res, 400, 'INVALID_RANGE', 'Ngày kết thúc phải sau ngày bắt đầu.');
    }
    res.status(201).json({ data: eventOut(events.create({ ...data, createdAt: new Date().toISOString() })) });
});

router.patch('/admin/events/:id', async (req, res) => {
    const ctx = await requireAdmin(req, res);
    if (!ctx) return;
    if (!events.find(req.params.id)) return fail(res, 404, 'EVENT_NOT_FOUND', 'Không tìm thấy sự kiện này.');
    const data = eventFields(req.body);
    if (!data.startDate) return fail(res, 400, 'INVALID_DATE', 'Ngày bắt đầu phải theo dạng YYYY-MM-DD.');
    res.json({ data: eventOut(events.update(req.params.id, data)) });
});

router.delete('/admin/events/:id', async (req, res) => {
    const ctx = await requireAdmin(req, res);
    if (!ctx) return;
    if (!events.remove(req.params.id)) return fail(res, 404, 'EVENT_NOT_FOUND', 'Không tìm thấy sự kiện này.');
    res.json({ data: { id: req.params.id, deleted: true } });
});

// Nạp vài sự kiện mẫu để admin có cái sửa, chỉ chạy khi kho còn trống
router.post('/admin/events/seed', async (req, res) => {
    const ctx = await requireAdmin(req, res);
    if (!ctx) return;
    if (events.listAll().length) {
        return fail(res, 409, 'ALREADY_SEEDED', 'Đã có sự kiện trong hệ thống rồi.');
    }
    const today = new Date();
    const created = events.SEED_EVENTS.map((e, i) => {
        const start = new Date(today);
        start.setDate(start.getDate() + 20 + i * 5);
        const end = new Date(start);
        end.setDate(end.getDate() + (i === 1 ? 2 : 0));
        return events.create({
            ...e,
            startDate: start.toISOString().split('T')[0],
            endDate: end.toISOString().split('T')[0],
            status: 'visible',
            createdAt: new Date().toISOString(),
        });
    });
    res.status(201).json({ data: created.map(eventOut), message: 'Đã tạo sự kiện mẫu, bạn sửa lại ngày cho đúng nhé.' });
});

// ════════════════════════════════════════════════════════════
// LỊCH TRÌNH
// ════════════════════════════════════════════════════════════
const PREF_VALUES = ['van-hoa', 'thien-nhien', 'am-thuc', 'nghi-duong'];

// POST /v1/ai/itinerary — sinh lịch trình từ dữ liệu thật, lưu lại, trả trip_id
router.post('/ai/itinerary', async (req, res) => {
    const days = asInt(req.body?.days, 2);
    const people = asInt(req.body?.people, 2);
    const budget = asInt(req.body?.budget, 1000000);
    const startPoint = asString(req.body?.start_point, 120) || 'Châu Đốc';
    const startDate = isIsoDate(req.body?.start_date) ? req.body.start_date : '';
    const preferences = Array.isArray(req.body?.preferences)
        ? req.body.preferences.map(p => asString(p, 30)).filter(p => PREF_VALUES.includes(p))
        : [];

    if (days < 1 || days > 5) {
        return fail(res, 400, 'INVALID_DAYS', 'Số ngày phải từ 1 đến 5.');
    }
    if (people < 1 || people > 20) {
        return fail(res, 400, 'INVALID_PEOPLE', 'Số khách phải từ 1 đến 20.');
    }

    try {
        const trip = await buildItinerary({
            days, people, budget, preferences,
            start_point: startPoint,
            start_date: startDate,
        });
        await enrichWithAI(trip);

        const saved = store.insert('itineraries', { ...trip, createdAt: new Date().toISOString() }, 'trip');
        res.status(201).json({ trip_id: saved.id, ...trip });
    } catch (err) {
        console.error('[ai/itinerary]', err);
        fail(res, 500, 'ITINERARY_FAILED', 'Chưa dựng được lịch trình. Bạn thử lại giúp mình nhé.');
    }
});

// ════════════════════════════════════════════════════════════
// GHÉP CHUYẾN — hai khách lạ cùng tuyến, cùng khung giờ, chia tiền xe
// ════════════════════════════════════════════════════════════
const SEATS_OF = { motorbike: 1, '4-seat': 4, '7-seat': 7, '16-seat': 16 };

// POST /v1/transport/pool-check — trước khi chốt đơn, xem có ai đi cùng không
router.post('/transport/pool-check', (req, res) => {
    const ride = {
        bookingId: '',
        date: isIsoDate(req.body?.date) ? req.body.date : '',
        time: /^\d{2}:\d{2}$/.test(req.body?.time) ? req.body.time : '',
        pickup: asString(req.body?.pickup, 200),
        pickupLat: Number.parseFloat(req.body?.pickup_lat),
        pickupLng: Number.parseFloat(req.body?.pickup_lng),
        dropoff: asString(req.body?.dropoff, 200),
        seats: Math.max(asInt(req.body?.seats, 1), 1),
    };
    if (!ride.date || !ride.time) {
        return fail(res, 400, 'INVALID_TRIP', 'Thiếu ngày hoặc giờ đón.');
    }

    const vehicleType = asString(req.body?.vehicle_type, 20) || '4-seat';
    const seatsLimit = SEATS_OF[vehicleType] || 4;
    const soloPrice = asInt(req.body?.price, 0);

    // Chỉ xét đơn cùng loại xe và chưa quá hạn
    const today = new Date().toISOString().split('T')[0];
    const waiting = store.readAll('pool')
        .filter(p => p.date >= today)
        .filter(p => (p.vehicleType || '4-seat') === vehicleType);

    const matches = pooling.findMatches(ride, waiting, seatsLimit);
    const riders = matches.length ? ride.seats + matches[0].seats : ride.seats;
    const pricing = pooling.poolPricing(soloPrice, matches.length ? 2 : 1);

    res.json({
        available: matches.length > 0,
        matches: matches.slice(0, 3),
        seats_limit: seatsLimit,
        riders,
        solo_price: soloPrice,
        ...pricing,
        window_minutes: pooling.TIME_WINDOW_MIN,
        message: matches.length
            ? `Có ${matches.length} khách khác đi cùng tuyến quanh giờ này. `
                + `Ghép chuyến thì mỗi người chỉ còn ${pricing.per_person.toLocaleString('vi-VN')}đ, `
                + `tiết kiệm ${pricing.saved.toLocaleString('vi-VN')}đ.`
            : 'Chưa có ai đi cùng tuyến giờ này. Bạn vẫn đặt xe riêng bình thường, '
                + 'và nếu sau đó có khách ghép thì hệ thống sẽ báo lại.',
    });
});

// GET /v1/weather/outlook?from=&days=
// Khách xem trước ngày mình định đi nắng hay mưa, TRƯỚC khi dựng lịch trình.
router.get('/weather/outlook', async (req, res) => {
    const from = isIsoDate(req.query.from) ? req.query.from : new Date().toISOString().split('T')[0];
    const days = Math.min(Math.max(asInt(req.query.days, 3), 1), 7);

    try {
        const outlook = await getOutlook(DEFAULT_LAT, DEFAULT_LNG);
        const picked = [];
        for (let i = 0; i < days; i += 1) {
            const date = addDays(from, i);
            if (outlook.by_date[date]) picked.push(outlook.by_date[date]);
        }

        // Ba mức, vì 65% mưa mà báo "thời tiết thuận lợi" là đánh lừa khách
        const dmy = (d) => `${d.date.slice(8, 10)}/${d.date.slice(5, 7)}`;
        const heavy = picked.filter(d => d.rain_probability >= 70);
        const showers = picked.filter(d => d.rain_probability >= 40 && d.rain_probability < 70);

        let summary;
        if (!picked.length) {
            summary = `Ngày bạn chọn nằm ngoài tầm dự báo ${outlook.horizon_days} ngày, mình chưa xem trước được.`;
        } else if (heavy.length === picked.length) {
            summary = 'Cả mấy ngày này đều nhiều mưa. Vẫn đi được, nhưng nên ưu tiên chùa, làng nghề và các điểm trong nhà.';
        } else if (heavy.length) {
            summary = `Ngày ${heavy.map(dmy).join(', ')} nhiều mưa. Lịch trình sẽ tự xếp điểm trong nhà vào giờ mưa.`;
        } else if (showers.length) {
            summary = `Ngày ${showers.map(dmy).join(', ')} có thể mưa vài lúc — nhớ mang áo mưa mỏng. `
                + 'Nhìn chung vẫn đi lại thoải mái.';
        } else {
            summary = 'Mấy ngày này thời tiết thuận lợi, rất hợp leo núi và chụp ảnh.';
        }

        res.json({
            from,
            days: picked,
            summary,
            horizon_days: outlook.horizon_days,
            out_of_range: picked.length < days,
        });
    } catch (err) {
        console.error('[weather/outlook]', err.message);
        fail(res, 502, 'WEATHER_UNAVAILABLE', 'Chưa lấy được dự báo lúc này.');
    }
});

/**
 * Mốc "bây giờ" dùng cho việc đổi lịch né mưa.
 * Thứ tự ưu tiên: tham số của lời gọi → biến môi trường DEBUG_NOW → giờ thật.
 * DEBUG_NOW có ích khi demo trước ban giám khảo vào buổi chiều mà muốn cho
 * xem tính năng của buổi sáng, ví dụ DEBUG_NOW=07:00.
 */
function replanNow(fromRequest) {
    if (fromRequest) return fromRequest;
    const debug = String(process.env.DEBUG_NOW || '').trim();
    if (/^\d{2}:\d{2}$/.test(debug)) {
        return `${new Date().toISOString().split('T')[0]}T${debug}:00`;
    }
    return new Date().toISOString();
}

// GET /v1/itineraries/:id/replan — hôm nay có cần đổi lịch vì mưa không
router.get('/itineraries/:id/replan', async (req, res) => {
    const trip = store.find('itineraries', row => row.id === req.params.id);
    if (!trip) return fail(res, 404, 'TRIP_NOT_FOUND', 'Không tìm thấy lịch trình này.');
    res.json(await suggestReplan(trip, replanNow(asString(req.query.now, 30))));
});

// POST /v1/itineraries/:id/replan — khách đồng ý đổi
router.post('/itineraries/:id/replan', async (req, res) => {
    const trip = store.find('itineraries', row => row.id === req.params.id);
    if (!trip) return fail(res, 404, 'TRIP_NOT_FOUND', 'Không tìm thấy lịch trình này.');

    const now = replanNow(asString(req.body?.now, 30));
    const suggestion = await suggestReplan(trip, now);
    if (suggestion.state !== 'suggest') {
        return fail(res, 409, 'NOTHING_TO_CHANGE', 'Hiện chưa cần đổi gì trong lịch trình.');
    }

    const changed = applyReplan(trip, suggestion.swaps, now);
    if (!changed) return fail(res, 409, 'REPLAN_FAILED', 'Không đổi được lịch trình, bạn thử lại nhé.');

    store.update('itineraries', trip.id, { plan: trip.plan });
    res.json({
        changed,
        message: `Đã đổi ${changed} hoạt động để tránh mưa.`,
        trip_id: trip.id,
        plan: trip.plan,
    });
});

// GET /v1/itineraries/:id — mở lại lịch trình đã lưu (dùng cho link chia sẻ)
router.get('/itineraries/:id', (req, res) => {
    const trip = store.find('itineraries', (row) => row.id === req.params.id);
    if (!trip) return fail(res, 404, 'TRIP_NOT_FOUND', 'Không tìm thấy lịch trình này.');
    res.json({ trip_id: trip.id, ...trip });
});

// Danh sách nhóm sở thích, để web và app không phải viết cứng
router.get('/itinerary/options', (req, res) => {
    res.json({
        // labelEn đi kèm để app và web không phải tự dịch. `value` giữ nguyên
        // tiếng Việt không dấu vì đó là KHOÁ máy chủ dùng để lọc — dịch khoá
        // là hỏng bộ lọc.
        preferences: [
            { value: 'van-hoa', label: 'Văn hoá', labelEn: 'Culture', icon: 'landmark' },
            { value: 'thien-nhien', label: 'Thiên nhiên', labelEn: 'Nature', icon: 'trees' },
            { value: 'am-thuc', label: 'Ẩm thực', labelEn: 'Food', icon: 'utensils' },
            { value: 'nghi-duong', label: 'Nghỉ dưỡng', labelEn: 'Relaxing', icon: 'tent' },
        ],
        budgets: [
            { value: 500000, label: 'Dưới 500k', labelEn: 'Under 500k' },
            { value: 1000000, label: '500k – 1 triệu', labelEn: '500k – 1 million' },
            { value: 2000000, label: '1 – 2 triệu', labelEn: '1 – 2 million' },
            { value: 5000000, label: 'Thoải mái', labelEn: 'No limit' },
        ],
        ai_enabled: hasAI,
    });
});

// ════════════════════════════════════════════════════════════
// GET /v1/weather
// ════════════════════════════════════════════════════════════
router.get('/weather', async (req, res) => {
    const lat = Number.parseFloat(req.query.lat);
    const lng = Number.parseFloat(req.query.lng);
    const latitude = Number.isFinite(lat) && Math.abs(lat) <= 90 ? lat : DEFAULT_LAT;
    const longitude = Number.isFinite(lng) && Math.abs(lng) <= 180 ? lng : DEFAULT_LNG;

    try {
        res.json(await getWeather(latitude, longitude));
    } catch (err) {
        console.error('[weather]', err.message);
        fail(res, 502, 'WEATHER_UNAVAILABLE', 'Không lấy được dữ liệu thời tiết lúc này.');
    }
});

// ════════════════════════════════════════════════════════════
// GET /v1/rooms — danh sách phòng thật do đối tác đã duyệt tự đăng
// ════════════════════════════════════════════════════════════
function resolveRoomImage(room, baseUrl) {
    const image = String(room.imageUrl || '').trim();
    if (!image) return `${baseUrl}/assets/homestay.jpg`;
    // Ảnh admin upload được lưu thành data URI base64 ngay trong Firestore.
    // Không nhét chuỗi khổng lồ đó vào JSON: trả về một URL ảnh bình thường,
    // vừa nhẹ vừa để Android/trình duyệt tải như ảnh thường.
    if (image.startsWith('data:')) return `${baseUrl}/v1/rooms/${room.id}/image`;
    if (/^https?:\/\//i.test(image)) return image;
    return `${baseUrl}/${image.replace(/^\/+/, '')}`;
}

function normalizeRoom(room, baseUrl) {
    return {
        id: room.id,
        name: room.name || '',
        name_en: room.nameEn || room.name || '',
        description: room.description || '',
        description_en: room.descriptionEn || room.description || '',
        amenities: (room.amenities || '').split(',').map(s => s.trim()).filter(Boolean),
        amenities_en: (room.amenitiesEn || room.amenities || '').split(',').map(s => s.trim()).filter(Boolean),
        price: asInt(room.price, 0),
        capacity: asInt(room.capacity, 2),
        status: room.status === 'available' ? 'available' : 'booked',
        order: asInt(room.order, 99),
        // Luôn là URL tuyệt đối để Android tải được ảnh trên máy thật
        image_url: resolveRoomImage(room, baseUrl),
    };
}

function publicBaseUrl(req) {
    if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/+$/, '');
    return `${req.protocol}://${req.get('host')}`;
}

// GET /v1/contact — số điện thoại, email, địa chỉ
//
// Trước đây mấy thứ này gõ cứng ở 15 tệp khác nhau. Đổi số thật thì phải sửa
// 25 chỗ, sót một chỗ là có khách gọi vào số cũ mà mình không biết.
router.get('/contact', (req, res) => {
    res.json({
        data: {
            hotline: lienhe.HOTLINE,
            hotline_tel: lienhe.soGoi(),
            email: lienhe.EMAIL,
            address: lienhe.DIA_CHI,
        },
    });
});

// GET /v1/cancel-policies — ba mức luật huỷ, cho biểu mẫu và trang khách
//
// Để ở một chỗ rồi cả web đọc chung: biểu mẫu đăng tin, trang phòng, ô đặt
// phòng, trang đơn của tôi. Chép câu chữ ra bốn nơi thì sửa một nơi là ba nơi
// kia nói khác — mà đây là chuyện tiền.
router.get('/cancel-policies', (req, res) => {
    res.json({ data: huydon.danhSach(), default: huydon.MAC_DINH });
});

// GET /v1/rooms/:id/busy?from=&to=
// ════════════════════════════════════════════════════════════
// Những ngày phòng đã có khách, để giao diện làm mờ chúng trên lịch chọn ngày.
// Chặn ở lúc gửi đơn là bắt buộc, nhưng để khách chọn xong hết mới báo "phòng
// bận" thì họ đã điền cả biểu mẫu — biết trước vẫn hơn.
router.get('/rooms/:id/busy', async (req, res) => {
    const roomId = asString(req.params.id, 80);
    const today = new Date().toISOString().split('T')[0];
    const from = isIsoDate(asString(req.query.from, 10)) ? asString(req.query.from, 10) : today;
    const to = isIsoDate(asString(req.query.to, 10)) ? asString(req.query.to, 10) : addDays(from, 120);

    try {
        const rows = await conflictingStays(roomId, from, to);
        const soPhong = soPhongCua(roomId);
        // Trả về từng ĐÊM bận, không phải từng khoảng — giao diện lịch cần vậy.
        // Tin có nhiều phòng thì đêm đó chỉ "bận" khi đã kín HẾT số phòng.
        const nights = new Set(demHetPhong(rows, soPhong, from, to));
        // Cộng thêm đêm chủ nhà tự đóng: với khách thì hai loại này như nhau,
        // đều là không đặt được. Tách ra chỉ tổ khách hỏi "vì sao lại xám".
        for (const d of lichphong.dongTrongKhoang(roomId, from, to)) nights.add(d);

        res.json({ data: [...nights].sort(), meta: { room_id: roomId, from, to } });
    } catch (err) {
        console.error('[rooms/busy]', err.message);
        fail(res, 502, 'DATABASE_UNAVAILABLE', 'Chưa xem được lịch phòng.');
    }
});

router.get('/rooms', async (req, res) => {
    const baseUrl = publicBaseUrl(req);
    const data = listings.liveStays().map(listings.toStayShape).map(stay => ({
        id: stay.id,
        name: stay.name,
        name_en: stay.name,
        description: stay.description || '',
        description_en: stay.description || '',
        amenities: stay.amenities || [],
        amenities_en: stay.amenities || [],
        price: stay.price,
        capacity: stay.capacity,
        status: stay.soldOut ? 'booked' : 'available',
        image_url: String(stay.image || '').startsWith('http')
            ? stay.image
            : `${baseUrl}/${String(stay.image || '').replace(/^\/+/, '')}`,
    }));
    res.json({ data, meta: { total: data.length } });
});

// GET /v1/stays/search?q=&guests=&max_price=&sort=
// Khách gõ "Châu Đốc" là ra đúng những chỗ nghỉ đối tác đã đưa lên ở đó.
// Chỉ hiển thị chỗ nghỉ do tài khoản đối tác đã duyệt tự đăng.
const plainText = (value) => String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd');

const matchesText = (haystack, needle) => {
    if (!needle) return true;
    const hay = String(haystack).toLowerCase();
    return hay.includes(needle.toLowerCase()) || plainText(hay).includes(plainText(needle));
};

router.get('/stays/search', async (req, res) => {
    const q = asString(req.query.q, 120);
    const guests = Math.max(asInt(req.query.guests, 0), 0);
    const maxPrice = asInt(req.query.max_price, 0);
    const sort = ['price', 'rating', 'name'].includes(req.query.sort) ? req.query.sort : 'rating';
    const baseUrl = publicBaseUrl(req);

    // Khoảng ngày khách cần. Có đủ hai đầu thì lọc luôn theo phòng còn trống,
    // chỉ có một đầu thì bỏ qua — nhận nửa vời rồi lọc bừa còn tệ hơn.
    const nhan = asString(req.query.check_in || req.query.checkIn, 10);
    const tra = asString(req.query.check_out || req.query.checkOut, 10);
    const locTheoNgay = isIsoDate(nhan) && isIsoDate(tra) && nhan < tra;

    // Chỗ nghỉ của đối tác đã duyệt, tự đăng từ kênh đối tác.
    const partnerStays = allPartnerStays().map(s => ({
        id: s.id,
        name: s.name,
        area: s.area || '',
        price: s.price,
        capacity: s.capacity,
        // So phong giong nhau va muc huy don — o dat phong doc thang tu day,
        // khoi phai goi them mot lan nua chi de lay hai truong.
        quantity: Math.max(1, Number(s.quantity) || 1),
        cancel_policy: s.cancelPolicy || 'vua',
        // Chu nha bam "tam het" — trang khach phai loc duoc theo cai nay,
        // chu khong the coi cho nghi doi tac luc nao cung con phong.
        sold_out: Boolean(s.soldOut),
        rating: s.rating,
        amenities: s.amenities,
        image: `${baseUrl}/${s.image}`,
        // Cả thư viện ảnh, để trang phòng cho khách xem hết chứ không chỉ ảnh bìa
        images: (s.images || []).map(u => `${baseUrl}/${String(u).replace(/^\//, '')}`),
        description: s.description,
        source: 'partner',
        partner_id: s.partnerId,
        partner_name: s.partnerName || '',
        self_listed: Boolean(s.selfListed),
        available: !s.soldOut,
        bookable: !s.soldOut,
    }));

    let data = partnerStays
        .filter(s => matchesText(`${s.name} ${s.area} ${s.description} ${(s.amenities || []).join(' ')}`, q))
        .filter(s => !guests || s.capacity >= guests)
        .filter(s => !maxPrice || s.price <= maxPrice);

    // ── Lọc theo ngày còn trống ──
    //
    // Đọc đơn MỘT LẦN cho cả danh sách, không hỏi từng chỗ một: mười tám chỗ
    // nghỉ là mười tám lượt gọi Firestore, khách ngồi chờ mấy giây cho một cái
    // ô tìm kiếm.
    let hetPhong = 0;
    if (locTheoNgay) {
        try {
            const tatCaDon = await listDocuments('bookings');
            const dongLich = store.readAll(lichphong.COLLECTION);

            data = data.filter((s) => {
                const soPhong = soPhongCua(s.id);

                // Chủ nhà đóng lịch đêm nào trong khoảng thì loại luôn
                const coDong = dongLich.some(b =>
                    String(b.listingId) === String(s.id) && b.date >= nhan && b.date < tra);
                if (coDong) return false;

                const donCua = tatCaDon.filter((b) => {
                    if (b.kind !== 'hotel') return false;
                    if (String(b.roomId) !== String(s.id)) return false;
                    if (b.status === 'cancelled' || b.status === 'rejected') return false;
                    const bIn = String(b.checkIn || '');
                    const bOut = String(b.checkOut || '')
                        || addDays(bIn, Math.max(1, Number(b.nights) || 1));
                    return bIn && bOut && nhan < bOut && bIn < tra;
                });

                return demHetPhong(donCua, soPhong, nhan, tra).length === 0;
            });
            hetPhong = 0;
        } catch (err) {
            // Không đọc được lịch thì trả nguyên danh sách và NÓI RÕ là chưa
            // lọc được — im lặng trả về mọi thứ như đã lọc là nói dối khách.
            console.error('[stays/search/dates]', err.message);
            hetPhong = -1;
        }
    }

    if (sort === 'price') data.sort((a, b) => a.price - b.price);
    else if (sort === 'name') data.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    else data.sort((a, b) => b.rating - a.rating);

    res.json({
        query: q,
        data,
        meta: {
            total: data.length,
            homestay: 0,
            partner: data.filter(s => s.source === 'partner').length,
            // Trang khách cần biết danh sách này đã lọc theo ngày hay chưa,
            // để nói đúng thay vì để khách tự đoán.
            filtered_by_dates: locTheoNgay && hetPhong !== -1,
            dates_unavailable: hetPhong === -1,
            check_in: locTheoNgay ? nhan : '',
            check_out: locTheoNgay ? tra : '',
        },
        // Gợi ý khu vực để khách bấm nhanh thay vì tự gõ.
        // "Núi Sam, Châu Đốc, An Giang" → lấy "Châu Đốc" (phần ngay trước tỉnh).
        // Gộp trùng theo dạng KHÔNG DẤU: đối tác gõ "Tri Ton" còn hệ thống có
        // "Tri Tôn" thì Set coi là hai khu vực khác nhau, khách thấy hai chip
        // giống hệt nhau. Giữ lại bản CÓ DẤU vì đó là cách viết đúng.
        areas: (() => {
            const theoKhoa = new Map();
            const khoa = (t) => t.toLowerCase().normalize('NFD')
                .replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
            for (const s of allPartnerStays()) {
                const phan = String(s.area || '').split(',').map(x => x.trim()).filter(Boolean);
                const ten = phan[phan.length - 2];
                if (!ten) continue;
                const k = khoa(ten);
                const dangCo = theoKhoa.get(k);
                // Bản có dấu dài hơn bản không dấu sau khi bỏ dấu — chọn bản
                // nào KHÁC chuỗi không dấu của chính nó, tức là bản có dấu.
                if (!dangCo || (dangCo === khoa(dangCo) && ten !== khoa(ten))) {
                    theoKhoa.set(k, ten);
                }
            }
            return [...theoKhoa.values()];
        })(),
    });
});

// GHI CHU THU TU: cua nay PHAI dat sau /v1/stays/search.
// Express khop duong dan theo thu tu khai bao, nen dat truoc thi "search"
// bi coi la mot ma cho nghi, tra 404, va ca danh sach cho nghi trong tron
// ma khong co loi nao trong nhat ky.
// GET /v1/stays/:id — chi tiết một chỗ nghỉ, cho trang xem trước khi đặt
//
// Gom sẵn mọi thứ khách cần để quyết định, trong MỘT lời gọi: ảnh, tiện nghi,
// vị trí, mức huỷ, đánh giá, và những đêm đã kín. Bắt trang gọi bốn năm lần
// thì trên sóng 3G ở quê nó hiện ra từng mảnh một, nhìn như đang hỏng.
router.get('/stays/:id', async (req, res) => {
    const id = asString(req.params.id, 80);
    const baseUrl = publicBaseUrl(req);

    // Chỉ nhận tin do đối tác đã duyệt tự đăng.
    let stay = null;
    const tin = listings.find(id);
    if (tin && tin.type === 'stay' && tin.status === 'approved') {
        stay = listings.toStayShape(tin);
    }
    if (!stay) return fail(res, 404, 'STAY_NOT_FOUND', 'Không tìm thấy chỗ nghỉ này.');

    const doiTac = stay.partnerId ? findAnyPartner(stay.partnerId) : null;

    // Đơn đặt phòng lưu đánh giá dạng room; hỗ trợ cả dạng stay cũ.
    // Danh sách và thống kê phải dùng cùng tập đánh giá của chỗ nghỉ này.
    const dg = [
        ...reviews.listFor('stay', stay.id),
        ...reviews.listFor('room', stay.id),
    ].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    const tomTat = reviews.summarize(dg);

    // Những đêm không đặt được, để lịch trên trang tô xám sẵn
    const homNay = new Date().toISOString().slice(0, 10);
    const den = addDays(homNay, 120);
    let demKin = [];
    try {
        const donTrung = await conflictingStays(stay.id, homNay, den);
        demKin = demHetPhong(donTrung, soPhongCua(stay.id), homNay, den);
    } catch (err) {
        console.error('[stays/:id] lich', err.message);
    }
    for (const d of lichphong.dongTrongKhoang(stay.id, homNay, den)) {
        if (!demKin.includes(d)) demKin.push(d);
    }
    demKin.sort();

    const anh = (stay.images && stay.images.length ? stay.images : [stay.image])
        .filter(Boolean)
        .map(u => (String(u).startsWith('http') ? u : `${baseUrl}/${String(u).replace(/^\//, '')}`));

    res.json({
        data: {
            id: stay.id,
            name: stay.name,
            area: stay.area || '',
            description: stay.description || '',
            price: stay.price,
            capacity: stay.capacity,
            quantity: Math.max(1, Number(stay.quantity) || 1),
            amenities: Array.isArray(stay.amenities) ? stay.amenities : [],
            image: anh[0] || '',
            images: anh,
            lat: Number.isFinite(Number(stay.lat)) ? Number(stay.lat) : null,
            lng: Number.isFinite(Number(stay.lng)) ? Number(stay.lng) : null,
            sold_out: Boolean(stay.soldOut),
            source: 'partner',
            self_listed: Boolean(stay.selfListed),
            cancel_policy: huydon.layMuc(stay.cancelPolicy).id,
            cancel_policy_text: huydon.layMuc(stay.cancelPolicy).moTa,
            cancel_policy_name: huydon.layMuc(stay.cancelPolicy).ten,
            // Tên và số điện thoại đơn vị chủ quản: khách hay muốn gọi hỏi
            // trước khi đặt, nhất là khi đi đông hoặc có trẻ nhỏ.
            partner_name: doiTac ? doiTac.name : '',
            partner_phone: doiTac ? doiTac.phone : '',
            partner_verified: doiTac ? Boolean(doiTac.idVerified) : false,
            busy_nights: demKin,
        },
        reviews: {
            data: dg.map(reviews.toPublic),
            summary: tomTat,
        },
    });
});

// GET /v1/hotels?near=<place-slug>&sort=near|price|rating
// Khách đang xem Núi Cấm → trả về khách sạn đối tác gần đó, xếp theo tiêu chí.
router.get('/hotels', async (req, res) => {
    const slug = asString(req.query.near, 80);
    const place = findPlace(slug);
    if (!place) return fail(res, 400, 'PLACE_REQUIRED', 'Thiếu hoặc sai tham số near=<mã điểm đến>.');

    const sort = ['near', 'price', 'rating'].includes(req.query.sort) ? req.query.sort : 'near';
    const data = await staysForPlace(place, publicBaseUrl(req), sort);
    res.json({ place: { slug: place.slug, name: place.name }, sort, data, meta: { total: data.length } });
});

// GET /v1/partners — danh bạ đối tác công khai
router.get('/partners', (req, res) => {
    const type = asString(req.query.type, 20);
    const approved = store.readAll('partners').filter(isPublicPartner);
    const list = (type ? approved.filter(p => p.type === type) : approved)
        .map(({ id, type: t, name, address, rating, reviews, note }) =>
            ({ id, type: t, name, address, rating, reviews: reviews || 0, note: note || '' }));
    res.json({ data: list, meta: { total: list.length } });
});

// GET /v1/rooms/:id/image — giải mã ảnh base64 lưu trong Firestore
const DATA_URI = /^data:([\w/+.-]+);base64,(.+)$/s;

router.get('/rooms/:id/image', async (req, res) => {
    try {
        const rooms = await listDocuments('rooms');
        const room = rooms.find(r => r.id === req.params.id);
        if (!room) return fail(res, 404, 'ROOM_NOT_FOUND', 'Không tìm thấy phòng.');

        const match = DATA_URI.exec(String(room.imageUrl || ''));
        if (!match) return fail(res, 404, 'NO_IMAGE', 'Phòng này không có ảnh dạng base64.');

        const [, mime, base64] = match;
        res.set('Content-Type', mime);
        res.set('Cache-Control', 'public, max-age=86400');
        res.send(Buffer.from(base64, 'base64'));
    } catch (err) {
        console.error('[rooms/image]', err.message);
        fail(res, 502, 'IMAGE_UNAVAILABLE', 'Không tải được ảnh phòng.');
    }
});

// ════════════════════════════════════════════════════════════
// GET /v1/places · GET /v1/places/:slug
// ════════════════════════════════════════════════════════════
// Trả về TOÀN BỘ hệ sinh thái quanh một địa điểm trong MỘT lần gọi:
// tour đi tới đó, món ăn nên thử, phòng còn trống, và gợi ý đặt xe.
// Nhờ vậy trang chi tiết trên web và app đều không bị "cụt đường".

const withAssets = (item, baseUrl, fields = ['image']) => {
    const out = { ...item };
    for (const field of fields) {
        if (out[field]) out[field] = `${baseUrl}/${String(out[field]).replace(/^\/+/, '')}`;
    }
    if (Array.isArray(out.gallery)) {
        out.gallery = out.gallery.map(src => `${baseUrl}/${String(src).replace(/^\/+/, '')}`);
    }
    return out;
};

// Kèm luôn bản tiếng Anh và phần giờ mở cửa / lúc nên đi / lưu ý.
//
// Trước đây danh sách này chỉ trả bản tiếng Việt, nên trang Khám phá bấm sang
// EN thì tiêu đề đổi còn mô tả đứng yên tiếng Việt. App Android cũng đọc đúng
// endpoint này, nên thêm ở đây là cả web lẫn app cùng có.
const placeSummary = (place, baseUrl) => withAssets({
    slug: place.slug,
    name: place.name,
    nameEn: place.nameEn,
    category: place.category,
    categoryEn: place.categoryEn,
    area: place.area,
    summary: place.summary,
    summaryEn: place.summaryEn,
    distance_km: place.distanceKm,
    duration: place.duration,
    durationEn: place.durationEn,
    ticket: place.ticket,
    ticketEn: place.ticketEn,
    openTime: place.openTime,
    openTimeEn: place.openTimeEn,
    bestTime: place.bestTime,
    bestTimeEn: place.bestTimeEn,
    tips: place.tips,
    tipsEn: place.tipsEn,
    ...withRating('place', place.slug, place.rating),
    tags: place.tags,
    image: place.image,
}, baseUrl);

const tourSummary = (tour, baseUrl) => withAssets({
    slug: tour.slug,
    name: tour.name,
    partner_name: tour.partnerName || '',
    // Bản tiếng Anh của tour gốc, để trang khách đổi sang EN là đổi được cả
    // tên tour chứ không chỉ đổi mấy cái nhãn quanh nó. Tour do đối tác tự
    // đăng thì không có — họ gõ tiếng Việt, mà bịa bản dịch hộ họ thì sai.
    name_en: tour.nameEn || '',
    image: tour.image,
    price: tour.price,
    days: tour.days || 1,
    soldOut: Boolean(tour.soldOut),
    duration: tour.duration,
    duration_en: tour.durationEn || '',
    pax: tour.pax,
    ...withRating('tour', tour.slug, tour.rating),
    stops: tour.stops,
    includes: tour.includes,
    schedule: tour.schedule,
}, baseUrl);

router.get('/places', (req, res) => {
    const baseUrl = publicBaseUrl(req);
    const tag = asString(req.query.tag);
    const list = tag ? PLACES.filter(p => p.tags.includes(tag)) : PLACES;
    res.json({ data: list.map(p => placeSummary(p, baseUrl)), meta: { total: list.length } });
});

// GET /v1/specialties — đặc sản địa phương đã duyệt
//
// Món ăn viết cứng trong content.js (FOODS) là phần giới thiệu ẩm thực vùng,
// KHÔNG đặt được. Đường này trả về thứ đặt được thật: hàng của cơ sở đã kết
// nối, có giá, có đơn vị, có nói rõ gửi đi xa được hay không.
router.get('/specialties', (req, res) => {
    const baseUrl = publicBaseUrl(req);
    const tuyet = (u) => `${baseUrl}/${String(u || '').replace(/^\/+/, '')}`;
    const rows = listings.liveFoods().map(listings.toFoodShape).map(f => ({
        ...f,
        image: tuyet(f.image),
        images: (f.images || []).map(tuyet),
    }));
    res.json({ data: rows, meta: { total: rows.length } });
});

router.get('/tours', (req, res) => {
    const baseUrl = publicBaseUrl(req);
    // Chỉ tour do đơn vị lữ hành đã được duyệt tự đăng. Các tour viết cứng
    // trước đây chỉ là dữ liệu minh hoạ và không được bán trên hệ thống.
    const all = listings.liveTours().map(listings.toTourShape);
    res.json({ data: all.map(t => tourSummary(t, baseUrl)), meta: { total: all.length } });
});

// GET /v1/tours/:slug — chi tiết đúng một tour cho trang xem trước khi đặt.
router.get('/tours/:slug', (req, res) => {
    const slug = asString(req.params.slug, 80);
    const row = listings.find(slug);
    const tour = row?.type === 'tour' && row.status === 'approved'
        ? listings.toTourShape(row) : null;
    if (!tour) return fail(res, 404, 'TOUR_NOT_FOUND', 'Không tìm thấy tour này.');
    res.json({ data: tourSummary(tour, publicBaseUrl(req)) });
});

const kmText = (km) => `${String(Math.round(km * 10) / 10).replace('.', ',')} km`;

/** Chỗ ở quanh một điểm đến: phòng của homestay + khách sạn đối tác. */
async function staysForPlace(place, baseUrl, sort = 'near') {
    const list = [];

    // Chỉ khách sạn / nhà nghỉ đối tác tự đăng gần điểm đến.
    for (const stay of staysNearPlace(place.slug, { sort })) {
        list.push({
            id: stay.id,
            source: 'partner',
            partner_id: stay.partnerId,
            partner_name: stay.partnerName,
            partner_phone: stay.partnerPhone,
            name: stay.name,
            description: stay.description,
            amenities: stay.amenities,
            price: stay.price,
            capacity: stay.capacity,
            rating: stay.rating,
            status: 'available',
            image_url: `${baseUrl}/${stay.image}`,
            distance_km: stay.distanceKm,
            distance_text: `Cách ${kmText(stay.distanceKm)}`,
        });
    }

    const comparators = {
        price: (a, b) => a.price - b.price,
        rating: (a, b) => b.rating - a.rating,
        near: (a, b) => a.distance_km - b.distance_km,
    };
    return list.sort(comparators[sort] || comparators.near);
}

router.get('/places/:slug', async (req, res) => {
    const place = findPlace(asString(req.params.slug, 80));
    if (!place) return fail(res, 404, 'PLACE_NOT_FOUND', 'Không tìm thấy địa điểm này.');

    const baseUrl = publicBaseUrl(req);
    const sort = ['near', 'price', 'rating'].includes(req.query.sort) ? req.query.sort : 'near';
    const stays = await staysForPlace(place, baseUrl, sort);

    res.json({
        place: withAssets({
            slug: place.slug,
            name: place.name,
            name_en: place.nameEn,
            // Cùng quy ước hậu tố "En" với /v1/places để web và app chỉ phải
            // nhớ MỘT cách gọi. Trường name_en ở trên giữ lại vì đã trót phát
            // hành, xoá đi thì bản app cũ mất tên tiếng Anh.
            nameEn: place.nameEn,
            category: place.category,
            categoryEn: place.categoryEn,
            area: place.area,
            summary: place.summary,
            summaryEn: place.summaryEn,
            content: place.content,
            distance_km: place.distanceKm,
            duration: place.duration,
            durationEn: place.durationEn,
            ticket: place.ticket,
            ticketEn: place.ticketEn,
            open_time: place.openTime,
            openTimeEn: place.openTimeEn,
            best_time: place.bestTime,
            bestTimeEn: place.bestTimeEn,
            tips: place.tips,
            tipsEn: place.tipsEn,
            // Phép lịch sự tại nơi thờ tự. Trả kèm ngay trong chi tiết điểm đến
            // để khách đọc đúng lúc cần — chứ không phải tự nhớ đã xem gì ở
            // trang giới thiệu dân tộc.
            etiquette: peoples.etiquetteForPlace(place.slug,
                String(req.headers['accept-language'] || '').toLowerCase().startsWith('en') ? 'en' : 'vi'),
            rating: place.rating,
            tags: place.tags,
            image: place.image,
            gallery: place.gallery,
        }, baseUrl),
        tours: listings.liveTours()
            .map(listings.toTourShape)
            .filter(t => matchesText(`${t.name} ${t.stops || ''}`, place.name.split('—')[0].trim()))
            .map(t => tourSummary(t, baseUrl)),
        foods: FOODS.filter(f => place.foods.includes(f.slug)).map(f => withAssets({ ...f }, baseUrl)),
        stays,
        transport: {
            hint: `Đặt xe đưa đón tới ${place.name}`,
            pickup_suggestions: ['Châu Đốc', 'Long Xuyên', 'Tịnh Biên', 'Tri Tôn', 'Cần Thơ'],
            dropoff: place.name,
        },
        nearby: PLACES
            .filter(p => p.slug !== place.slug)
            .sort((a, b) => Math.abs(a.distanceKm - place.distanceKm) - Math.abs(b.distanceKm - place.distanceKm))
            .slice(0, 3)
            .map(p => placeSummary(p, baseUrl)),
    });
});

// ════════════════════════════════════════════════════════════
// GET /v1/transport/quotes — báo giá xe đưa đón
// ════════════════════════════════════════════════════════════
// Khoảng cách tham chiếu tới homestay (Núi Cấm, Tịnh Biên)
const ROUTE_DISTANCES = {
    'châu đốc': 24,
    'chau doc': 24,
    'long xuyên': 65,
    'long xuyen': 65,
    'tịnh biên': 10,
    'tinh bien': 10,
    'tri tôn': 18,
    'tri ton': 18,
    'rạch giá': 90,
    'rach gia': 90,
    'cần thơ': 120,
    'can tho': 120,
    'tp.hcm': 250,
    'hồ chí minh': 250,
    'ho chi minh': 250,
};

const VEHICLES = [
    // Xe ôm: giá mềm, chở được 1 khách, phù hợp quãng ngắn quanh Bảy Núi
    { type: 'motorbike', label: 'Xe máy (xe ôm)', seats: 1, base: 30000, perKm: 3500 },
    { type: '4-seat', label: 'Xe 4 chỗ', seats: 4, base: 250000, perKm: 5000 },
    { type: '7-seat', label: 'Xe 7 chỗ', seats: 7, base: 350000, perKm: 6500 },
    { type: '16-seat', label: 'Xe 16 chỗ', seats: 16, base: 600000, perKm: 9000 },
];

// Nhà xe lấy từ hồ sơ thật đã được Admin duyệt, không dùng danh bạ mẫu cũ.
const transportPartners = () => partnersByType('transport');

/**
 * Ước tính quãng đường từ điểm đón tới homestay.
 *
 * Thứ tự ưu tiên: tên địa danh quen thuộc → toạ độ GPS → mức mặc định.
 * Đặt tên địa danh LÊN TRƯỚC là có chủ ý: bảng ROUTE_DISTANCES là quãng đường
 * đi thật đã đo, còn tính từ toạ độ chỉ là đường chim bay nhân hệ số. Quan
 * trọng hơn cả: màn báo giá và lúc tạo đơn phải ra CÙNG một con số, nếu không
 * khách xem thấy 115.000đ mà đặt xong lại bị tính 140.000đ.
 */
function estimateDistance(from, lat, lng, to = 'LOCALMATE, Núi Cấm') {
    const destination = asString(to).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if (!/localmate|nui cam/.test(destination)) {
        const target = coordsFromName(to);
        const origin = Number.isFinite(lat) && Math.abs(lat) <= 90 && Number.isFinite(lng) && Math.abs(lng) <= 180
            ? { lat, lng } : coordsFromName(from);
        if (!origin || !target) return null;
        const { haversineKm } = require('./geo');
        return Math.max(1, Math.round(haversineKm(origin.lat, origin.lng, target.lat, target.lng) * 1.3));
    }
    const key = asString(from).toLowerCase();
    for (const [name, km] of Object.entries(ROUTE_DISTANCES)) {
        if (key.includes(name)) return km;
    }
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return roadDistanceToHome(lat, lng);
    }
    const origin = coordsFromName(from);
    return origin ? roadDistanceToHome(origin.lat, origin.lng) : null;
}

function roundPrice(value) {
    return Math.round(value / 5000) * 5000;
}

// GET /v1/geocode/search?q= — đổi ĐỊA CHỈ thành toạ độ
//
// Để đối tác gõ "Miếu Bà Chúa Xứ, Châu Đốc" thay vì phải tự đi tìm vĩ độ,
// kinh độ. Trước đây cách duy nhất là bấm "Lấy vị trí", tức phải đang đứng
// tại chính cơ sở của mình — ngồi nhà buổi tối là không đăng phòng được.
router.get('/geocode/search', async (req, res) => {
    const q = asString(req.query.q, 200);
    if (q.length < 3) {
        return fail(res, 400, 'QUERY_TOO_SHORT', 'Nhập ít nhất 3 ký tự để tìm.');
    }
    try {
        const data = await geocodeAddress(q);
        res.json({
            data,
            meta: { total: data.length },
            message: data.length ? '' : 'Không tìm thấy địa chỉ này. Bạn thử ghi rõ hơn, kèm huyện và tỉnh.',
        });
    } catch (err) {
        console.error('[geocode/search]', err.message);
        fail(res, 502, 'GEOCODE_UNAVAILABLE', 'Chưa tra được địa chỉ lúc này.');
    }
});

// GET /v1/geocode/reverse?lat=&lng= — đổi vị trí GPS thành địa chỉ tiếng Việt
router.get('/geocode/reverse', async (req, res) => {
    const lat = Number.parseFloat(req.query.lat);
    const lng = Number.parseFloat(req.query.lng);
    if (!Number.isFinite(lat) || Math.abs(lat) > 90 || !Number.isFinite(lng) || Math.abs(lng) > 180) {
        return fail(res, 400, 'INVALID_COORDS', 'Toạ độ không hợp lệ.');
    }
    try {
        res.json(await reverseGeocode(lat, lng));
    } catch (err) {
        console.error('[geocode]', err.message);
        // Không chặn luồng đặt xe: vẫn trả toạ độ để khách tự sửa tên
        res.json({
            lat, lng,
            address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
            short_name: `Vị trí của tôi (${lat.toFixed(3)}, ${lng.toFixed(3)})`,
            distance_to_home_km: roadDistanceToHome(lat, lng),
            degraded: true,
        });
    }
});

router.get('/transport/quotes', (req, res) => {
    const from = asString(req.query.from) || 'Châu Đốc';
    const to = asString(req.query.to) || 'LOCALMATE, Núi Cấm';
    // Khong truyen `seats` thi hien HET cac loai xe kem suc chua, de khach tu
    // chon. Bat khai so khach truoc khi duoc xem gia la mot buoc thua — ho da
    // biet minh di may nguoi roi. Van nhan tham so nay cho ban app cu.
    const raw = asString(req.query.seats, 3);
    const seats = raw ? Math.max(1, Math.min(asInt(raw, 1), 16)) : 0;
    const distanceKm = estimateDistance(
        from,
        Number.parseFloat(req.query.lat),
        Number.parseFloat(req.query.lng),
        to,
    );
    if (distanceKm === null) return fail(res, 400, 'UNKNOWN_ROUTE', 'Chưa xác định được tuyến. Chọn địa danh gợi ý hoặc liên hệ để báo giá.');

    const suitable = seats > 0 ? VEHICLES.filter(v => v.seats >= seats) : VEHICLES;
    const vehicles = suitable.length ? suitable : [VEHICLES[VEHICLES.length - 1]];

    const quotes = [];
    for (const partner of transportPartners()) {
        const owned = partner.vehicleType
            ? vehicles.filter(vehicle => vehicle.type === partner.vehicleType)
            : vehicles;
        for (const vehicle of owned) {
            quotes.push({
                id: `${partner.id}:${vehicle.type}`,
                partner_id: partner.id,
                partner_name: partner.name,
                // Điểm thật do khách đi xe chấm; chưa ai chấm thì dùng số biên tập
                ...withRating('driver', partner.id, partner.rating),
                reviews: reviews.summaryFor('driver', partner.id).count || partner.reviews,
                note: partner.note,
                vehicle_type: vehicle.type,
                vehicle_label: vehicle.label,
                seats: vehicle.seats,
                distance_km: distanceKm,
                duration_min: Math.round((distanceKm / 45) * 60),
                price: roundPrice((vehicle.base + vehicle.perKm * distanceKm) * (partner.factor || 1)),
            });
        }
    }
    quotes.sort((a, b) => a.price - b.price);

    res.json({
        route: { from, to, distance_km: distanceKm },
        data: quotes,
        meta: { total: quotes.length },
    });
});

// ════════════════════════════════════════════════════════════
// POST /v1/bookings — đặt phòng & đặt xe
// ════════════════════════════════════════════════════════════
// Giá LUÔN được tính ở backend, không tin giá do client gửi lên.
/**
 * Những đơn đang giữ chỗ phòng này trong khoảng ngày đã cho.
 *
 * Hai khoảng [nhận, trả) chồng nhau khi: nhậnA < trảB VÀ nhậnB < trảA.
 * Dùng nửa khoảng — ngày trả phòng của khách này CHÍNH LÀ ngày nhận phòng
 * hợp lệ của khách sau, vì khách cũ trả lúc 12:00 còn khách mới nhận lúc 14:00.
 * Nếu tính cả hai đầu thì mỗi phòng tự mất một đêm trống mỗi lượt khách.
 *
 * Đơn đã huỷ thì không giữ chỗ nữa. Đơn "pending" thì VẪN giữ — khách vừa đặt
 * xong đang chờ homestay gọi xác nhận, để người khác chen vào là hỏng.
 *
 * @param exceptId bỏ qua chính đơn đang sửa, để đổi ngày không tự chặn mình.
 */
/**
 * So phong cua mot tin dang. Phong cua homestay (Firestore) luon la 1.
 */
function soPhongCua(roomId) {
    const l = listings.find(roomId);
    if (l) return Math.max(1, Number(l.quantity) || 1);
    const stay = findStay(roomId);
    if (stay) return Math.max(1, Number(stay.quantity) || 1);
    return 1;
}

/**
 * Dem xem tung dem trong khoang da co bao nhieu don.
 * Tra ve Map: "2026-10-20" -> 3
 */
function demTheoDem(donTrung) {
    const dem = new Map();
    for (const b of donTrung) {
        const ra = String(b.checkOut || '')
            || addDays(b.checkIn, Math.max(1, Number(b.nights) || 1));
        for (let d = String(b.checkIn); d < ra; d = addDays(d, 1)) {
            dem.set(d, (dem.get(d) || 0) + 1);
        }
    }
    return dem;
}

/**
 * Nhung dem KHONG con phong nao trong khoang khach chon.
 *
 * Truoc day chi can co MOT don trung la tu choi — dung khi mot tin la mot
 * phong, sai han khi tin do co nam phong giong nhau: mot khach dat la bon
 * phong con lai cung khoa theo.
 */
function demHetPhong(donTrung, soPhong, from, to) {
    const dem = demTheoDem(donTrung);
    const het = [];
    for (let d = from; d < to; d = addDays(d, 1)) {
        if ((dem.get(d) || 0) >= soPhong) het.push(d);
    }
    return het;
}

async function conflictingStays(roomId, checkIn, checkOut, exceptId = '') {
    const all = await listDocuments('bookings');
    return all.filter((b) => {
        if (b.kind !== 'hotel') return false;
        if (String(b.roomId) !== String(roomId)) return false;
        if (b.id === exceptId) return false;
        if (b.status === 'cancelled' || b.status === 'rejected') return false;

        const bIn = String(b.checkIn || '');
        const bOut = String(b.checkOut || '') || addDays(bIn, Math.max(1, Number(b.nights) || 1));
        if (!bIn || !bOut) return false;

        return checkIn < bOut && bIn < checkOut;
    });
}

async function buildHotelBooking(body) {
    const roomId = asString(body.room_id || body.roomId, 80);
    if (!roomId) return { error: ['MISSING_ROOM', 'Thiếu mã phòng.'] };

    // Phòng có thể là của homestay (Firestore) hoặc của khách sạn đối tác.
    const partnerStay = findStay(roomId);
    let room;
    if (partnerStay) {
        // Chủ nhà vừa bấm "tạm hết" vì khách tới tận nơi đặt sạch phòng —
        // chặn ngay tại đây, không để khách online đặt trùng rồi phải gọi xin lỗi.
        if (partnerStay.soldOut) {
            return { error: ['SOLD_OUT',
                'Chỗ này vừa báo hết phòng. Bạn chọn ngày khác hoặc xem chỗ nghỉ khác gần đó nhé.'] };
        }
        room = {
            id: partnerStay.id,
            name: partnerStay.name,
            price: partnerStay.price,
            status: 'available',
            partnerId: partnerStay.partnerId,
        };
    } else {
        const rooms = await listDocuments('rooms');
        room = rooms.find(r => r.id === roomId);
        if (!room) return { error: ['ROOM_NOT_FOUND', 'Không tìm thấy phòng này.'] };
        if (room.status !== 'available') return { error: ['ROOM_NOT_AVAILABLE', 'Phòng này hiện đã hết.'] };
        // Phòng được tạo trong trang Admin là kho phòng của LOCALMATE. Trước
        // đây chúng không có chủ nên đặt thành công nhưng không đối tác nào
        // nhìn thấy. Gắn vào đơn vị lưu trú vận hành mặc định ngay khi đặt.
        if (!room.partnerId) room = { ...room, partnerId: 'bn-hotel-01' };
    }

    const checkIn = asString(body.check_in || body.checkIn, 10);
    if (!isIsoDate(checkIn)) return { error: ['INVALID_DATE', 'Ngày nhận phòng không hợp lệ (YYYY-MM-DD).'] };

    // Ưu tiên ngày trả phòng do khách chọn; chỉ khi KHÔNG gửi mới suy từ số đêm.
    // Nếu có gửi mà sai định dạng thì phải báo lỗi, không được âm thầm đặt 1 đêm.
    const checkOutInput = asString(body.check_out || body.checkOut, 10);
    let nights;
    if (checkOutInput) {
        if (!isIsoDate(checkOutInput)) {
            return { error: ['INVALID_DATE', 'Ngày trả phòng không hợp lệ (YYYY-MM-DD).'] };
        }
        nights = nightsBetween(checkIn, checkOutInput);
        if (nights < 1) return { error: ['INVALID_RANGE', 'Ngày trả phòng phải sau ngày nhận phòng.'] };
        if (nights > 30) return { error: ['RANGE_TOO_LONG', 'Mỗi lần đặt tối đa 30 đêm.'] };
    } else {
        nights = Math.max(1, Math.min(asInt(body.nights, 1), 30));
    }

    // ── Chặn đặt trùng ──
    // Trước đây phòng chỉ có cờ "còn/hết" dùng chung cho MỌI ngày, nên hai
    // khách đặt cùng một phòng cùng một đêm là chuyện bình thường: hệ thống
    // nhận cả hai đơn, tới lúc khách đến nơi mới vỡ ra.
    const checkOut = addDays(checkIn, nights);

    // Đêm chủ nhà tự đóng cũng phải chặn thật, không chỉ tô xám trên lịch.
    // Đóng lịch mà hệ thống vẫn nhận đơn thì cái lịch đó chỉ để trang trí, và
    // chủ nhà là người phải gọi điện xin lỗi khách.
    const dong = lichphong.dongTrongKhoang(roomId, checkIn, checkOut);
    if (dong.length) {
        return { error: ['ROOM_CLOSED',
            `Chỗ này không nhận khách các đêm ${dong.slice(0, 3).map(dayMonth).join(', ')}`
            + `${dong.length > 3 ? '…' : ''}. Bạn chọn ngày khác giúp mình nhé.`] };
    }

    try {
        const soPhong = soPhongCua(roomId);
        const donTrung = await conflictingStays(roomId, checkIn, checkOut);
        const het = demHetPhong(donTrung, soPhong, checkIn, checkOut);
        if (het.length) {
            const den = het.slice(0, 3).map(dayMonth).join(', ');
            return { error: ['ROOM_BUSY',
                soPhong > 1
                    ? `Các đêm ${den}${het.length > 3 ? '…' : ''} đã kín cả ${soPhong} phòng. `
                      + 'Bạn chọn ngày khác giúp mình nhé.'
                    : `Phòng này đã có khách đặt các đêm ${den}${het.length > 3 ? '…' : ''}. `
                      + 'Bạn chọn ngày khác giúp mình nhé.'] };
        }
    } catch (err) {
        // Không đọc được danh sách đơn thì THÀ TỪ CHỐI còn hơn nhận bừa rồi
        // xếp hai khách vào một phòng.
        console.error('[bookings/conflict]', err.message);
        return { error: ['DATABASE_UNAVAILABLE',
            'Chưa kiểm tra được lịch phòng. Bạn thử lại sau ít phút nhé.'] };
    }

    const price = asInt(room.price, 0);
    if (!commerce.integer(room.price, 1, Number.MAX_SAFE_INTEGER)) return { error: ['INVALID_PRICE', 'Giá phòng chưa hợp lệ. Vui lòng liên hệ chủ phòng.'] };
    let total = price * nights;
    if (nights >= 7) total = Math.round(total * 0.9);   // ưu đãi 7 đêm giảm 10%

    const partner = room.partnerId ? findAnyPartner(room.partnerId) : null;

    // Chép mức huỷ vào ĐƠN, không tra lại tin đăng lúc khách bấm huỷ. Chủ nhà
    // đổi từ "Linh hoạt" sang "Chặt" sau khi khách đã đặt thì khách phải được
    // giữ nguyên mức lúc họ đồng ý, chứ không bị đổi luật giữa chừng.
    const tinDang = listings.find(roomId);
    const mucHuy = huydon.layMuc(tinDang && tinDang.cancelPolicy).id;

    return {
        payload: {
            kind: 'hotel',
            roomId,
            cancelPolicy: mucHuy,
            // Khách sạn đối tác thường trùng tên với đơn vị chủ quản — đừng in hai lần
            roomName: partner && partner.name !== room.name
                ? `${room.name} · ${partner.name}`
                : (room.name || ''),
            // Đơn của khách sạn đối tác được gắn partnerId để họ thấy trên dashboard
            // Mã chủ lấy từ chính phòng/tin đăng là nguồn đáng tin. Không được
            // xoá trắng chỉ vì hồ sơ đối tác tạm thời chưa đọc được.
            partnerId: room.partnerId || '',
            partnerName: partner?.name || '',
            checkIn,
            checkOut,
            nights,
            unitPrice: price,
            totalPrice: total,
        },
    };
}

function buildTransportBooking(body) {
    const from = asString(body.pickup || body.from, 200);
    const to = asString(body.dropoff || body.to, 200) || 'LOCALMATE, Núi Cấm';
    if (from.length < 3) return { error: ['MISSING_PICKUP', 'Vui lòng nhập hoặc chọn điểm đón.'] };

    // Toạ độ điểm đón. Ưu tiên GPS khách gửi lên; nếu khách chỉ gõ/chọn tên
    // địa danh thì tra bảng toạ độ. Không có toạ độ là không điều phối được
    // tài xế, nên phải cố suy ra bằng mọi cách.
    let pickupLat = Number.parseFloat(body.pickup_lat ?? body.pickupLat);
    let pickupLng = Number.parseFloat(body.pickup_lng ?? body.pickupLng);
    if (!Number.isFinite(pickupLat) || !Number.isFinite(pickupLng)) {
        const guessed = coordsFromName(from);
        if (guessed) {
            pickupLat = guessed.lat;
            pickupLng = guessed.lng;
        }
    }

    const date = asString(body.date || body.check_in, 10);
    if (!isIsoDate(date)) return { error: ['INVALID_DATE', 'Ngày đi không hợp lệ (YYYY-MM-DD).'] };

    const time = asString(body.time, 5) || '08:00';
    const seats = Math.max(1, Math.min(asInt(body.seats, 2), 16));
    const vehicleType = asString(body.vehicle_type, 20) || '4-seat';
    const vehicle = VEHICLES.find(v => v.type === vehicleType);
    if (!vehicle) return { error: ['INVALID_VEHICLE', 'Loại xe không hợp lệ.'] };
    if (seats > vehicle.seats) return { error: ['TOO_MANY_SEATS', `${vehicle.label} chỉ chở tối đa ${vehicle.seats} khách.`] };

    const availablePartners = transportPartners();
    if (!availablePartners.length) {
        return { error: ['NO_TRANSPORT_PARTNER', 'Hiện chưa có nhà xe nào đang hoạt động.'] };
    }
    const partnerId = asString(body.partner_id, 60) || availablePartners[0].id;
    const partner = availablePartners.find(p => p.id === partnerId);
    if (!partner) return { error: ['PARTNER_NOT_FOUND', 'Nhà xe không còn khả dụng, vui lòng tìm xe lại.'] };
    const distanceKm = estimateDistance(from, pickupLat, pickupLng, to);
    if (distanceKm === null) return { error: ['UNKNOWN_ROUTE', 'Chưa xác định được tuyến, vui lòng tìm xe lại.'] };
    const oneWay = roundPrice((vehicle.base + vehicle.perKm * distanceKm) * (partner.factor || 1));

    // Khứ hồi: khách chọn thêm ngày về. Giá 2 lượt, giảm 5% vì tài xế không chạy rỗng.
    const returnDate = asString(body.return_date || body.returnDate, 10);
    const isRoundTrip = Boolean(body.round_trip || body.roundTrip) && isIsoDate(returnDate);
    if (body.round_trip && !isIsoDate(returnDate)) {
        return { error: ['INVALID_RETURN_DATE', 'Ngày về không hợp lệ (YYYY-MM-DD).'] };
    }
    if (isRoundTrip && nightsBetween(date, returnDate) < 0) {
        return { error: ['INVALID_RANGE', 'Ngày về phải sau hoặc trùng ngày đi.'] };
    }

    const returnTime = asString(body.return_time || body.returnTime, 5) || '16:00';
    let total = isRoundTrip ? roundPrice(oneWay * 1.9) : oneWay;

    // Ghép chuyến: chỉ giảm giá khi máy chủ TỰ kiểm chứng là thật sự có khách
    // đi cùng tuyến. Không tin mỗi cờ `pool` từ phía khách, kẻo ai cũng gửi
    // pool = true để được giảm 35%.
    let pooled = false;
    if (body.pool) {
        const today = new Date().toISOString().split('T')[0];
        const waiting = store.readAll('pool')
            .filter(p => p.date >= today)
            .filter(p => (p.vehicleType || '4-seat') === vehicle.type);
        const matches = pooling.findMatches(
            {
                bookingId: '',
                date, time, pickup: from, pickupLat, pickupLng, dropoff: to, seats,
            },
            waiting,
            vehicle.seats,
        );
        if (matches.length) {
            total = pooling.poolPricing(total, 2).per_person;
            pooled = true;
        }
    }

    const label = isRoundTrip ? `${from} ⇄ ${to}` : `${from} → ${to}`;

    return {
        payload: {
            kind: 'transport',
            // Trang Admin hiện có đọc trường roomName, nên đặt nhãn dễ đọc vào đây
            roomName: `${vehicle.label} · ${label}${pooled ? ' · ghép chuyến' : ''}`,
            partnerId: partner.id,
            partnerName: partner.name,
            pickup: from,
            pickupLat: Number.isFinite(pickupLat) ? pickupLat : null,
            pickupLng: Number.isFinite(pickupLng) ? pickupLng : null,
            dropoff: to,
            vehicleType: vehicle.type,
            vehicleLabel: vehicle.label,
            seats,
            distanceKm,
            roundTrip: isRoundTrip,
            checkIn: date,
            checkOut: isRoundTrip ? returnDate : date,
            pickupTime: time,
            returnTime: isRoundTrip ? returnTime : '',
            unitPrice: oneWay,
            totalPrice: total,
            pooled,
        },
    };
}

function buildTourBooking(body) {
    const tourSlug = asString(body.tour_slug || body.tourSlug, 80);
    const row = listings.find(tourSlug);
    const tour = row?.type === 'tour' && row.status === 'approved' ? listings.toTourShape(row) : null;
    if (!tour) return { error: ['TOUR_NOT_FOUND', 'Không tìm thấy tour này.'] };
    if (tour.soldOut) return { error: ['TOUR_SOLD_OUT', 'Tour này tạm hết chỗ.'] };
    if (!commerce.integer(tour.price, 1, Number.MAX_SAFE_INTEGER)) return { error: ['INVALID_PRICE', 'Giá tour chưa hợp lệ, vui lòng liên hệ đơn vị tour.'] };

    const date = asString(body.date || body.check_in, 10);
    if (!isIsoDate(date)) return { error: ['INVALID_DATE', 'Ngày đi tour không hợp lệ (YYYY-MM-DD).'] };

    const guests = Math.max(1, Math.min(asInt(body.guests || body.seats, 2), 20));
    // Ngày về suy ra từ độ dài tour: tour 2 ngày 1 đêm thì về vào hôm sau.
    const endDate = addDays(date, Math.max(0, (tour.days || 1) - 1));

    return {
        payload: {
            kind: 'tour',
            tourSlug: tour.slug,
            partnerId: tour.partnerId || '',
            partnerName: findAnyPartner(tour.partnerId)?.name || '',
            // Trang Admin đọc trường roomName, nên đặt nhãn dễ đọc vào đây
            roomName: `Tour: ${tour.name} · ${guests} khách`,
            tourName: tour.name,
            duration: tour.duration,
            days: tour.days || 1,
            guests,
            unitPrice: tour.price,
            checkIn: date,
            checkOut: endDate,
            totalPrice: tour.price * guests,
        },
    };
}

/**
 * Đơn đặc sản.
 *
 * Khác ba loại kia ở chỗ: không có ngày nhận, không có số khách, nhưng CÓ
 * số lượng và địa chỉ giao. Món hàng đi tới nhà người ta chứ không phải
 * người ta đi tới chỗ mình.
 *
 * KHÔNG tính phí giao ở đây. Cước gửi phụ thuộc tỉnh nào, mấy ký, gửi thường
 * hay gửi lạnh — bịa ra một con số rồi tính sai thì hoặc khách bị thu thêm
 * lúc nhận, hoặc chủ hàng chịu lỗ. Nói thẳng là chủ cơ sở sẽ báo cước, và
 * ghi rõ trên đơn.
 */
function buildFoodBooking(body) {
    const id = asString(body.listing_id || body.listingId || body.room_id, 80);
    if (!id) return { error: ['MISSING_ITEM', 'Thiếu mã món hàng.'] };

    const row = listings.find(id);
    if (!row || row.type !== 'food' || row.status !== 'approved') {
        return { error: ['ITEM_NOT_FOUND', 'Không tìm thấy món này.'] };
    }
    if (row.soldOut) {
        return { error: ['SOLD_OUT',
            'Món này vừa báo hết hàng. Bạn xem món khác giúp mình nhé.'] };
    }

    const soLuong = Math.min(Math.max(asInt(body.quantity, 1), 1), 99);

    // Còn hàng không. stock = 0 nghĩa là chủ hàng KHÔNG theo dõi tồn, bán
    // thoải mái — khác hẳn với "hết hàng", cái đó đã có cờ soldOut riêng.
    const con = Math.max(0, Number(row.stock) || 0);
    if ((row.stockTracked || con > 0) && soLuong > con) {
        return { error: ['NOT_ENOUGH',
            `Chỉ còn ${con} ${row.unit || 'phần'}. Bạn giảm số lượng giúp mình nhé.`] };
    }

    const diaChi = asString(body.address || body.delivery_address, 300);
    if (diaChi.length < 8) {
        return { error: ['MISSING_ADDRESS',
            'Nhập địa chỉ nhận hàng đầy đủ giúp mình: số nhà, đường, xã/phường, huyện, tỉnh.'] };
    }

    const partner = row.partnerId ? findAnyPartner(row.partnerId) : null;
    const donGia = Number(row.price) || 0;
    if (!commerce.integer(donGia, 1, Number.MAX_SAFE_INTEGER)) return { error: ['INVALID_PRICE', 'Giá sản phẩm chưa hợp lệ, vui lòng liên hệ cơ sở.'] };
    const donVi = row.unit || 'phần';

    return {
        payload: {
            kind: 'food',
            listingId: row.id,
            // Trang Admin và bảng đơn đọc trường roomName, nên đặt nhãn dễ đọc
            roomName: `${row.name} · ${soLuong} ${donVi}`,
            itemName: row.name,
            quantity: soLuong,
            stockTracked: Boolean(row.stockTracked || con > 0),
            unit: donVi,
            unitPrice: donGia,
            totalPrice: donGia * soLuong,
            deliveryAddress: diaChi,
            // Chép lại lúc đặt: chủ hàng đổi lời sau đó thì đơn cũ vẫn giữ
            // đúng điều khách đã đọc khi bấm đặt.
            shippingNote: row.shipping || '',
            keepingNote: row.keeping || '',
            partnerId: row.partnerId || '',
            partnerName: partner?.name || row.partnerName || '',
        },
        // Trừ tồn ngay lúc đặt, không đợi xác nhận: đợi thì hai người cùng
        // đặt hũ mật ong cuối cùng, cả hai đều nhận được đơn.
        giuHang: { id: row.id, soLuong },
    };
}

function when(kind, body) {
    switch (kind) {
        case 'transport': return buildTransportBooking(body);
        case 'tour': return buildTourBooking(body);
        case 'hotel': return buildHotelBooking(body);
        case 'food': return buildFoodBooking(body);
        default: return { error: ['INVALID_KIND', 'Loại dịch vụ không hợp lệ.'] };
    }
}

function restoreFoodStock(booking) {
    if (booking.kind !== 'food' || !booking.listingId || !booking.stockTracked) return;
    const row = listings.find(booking.listingId);
    if (row) listings.update(row.id, { stock: Math.max(0, Number(row.stock) || 0) + (Number(booking.quantity) || 0), stockTracked: true });
}

router.post('/bookings', commerce.serialize(req => 'create:' + (req.body?.kind || 'hotel') + ':'
    + (req.body?.room_id || req.body?.roomId || req.body?.listing_id || req.body?.listingId || req.body?.tour_slug || ''), async (req, res) => {
    const body = req.body || {};
    const kind = asString(body.kind, 20) || 'hotel';

    const guestName = asString(body.guest_name || body.guestName, 120);
    const phoneRaw = commerce.phone(asString(body.phone, 20));
    const email = asString(body.email, 160);
    const note = asString(body.note, 500);

    if (guestName.length < 2) return fail(res, 400, 'INVALID_NAME', 'Vui lòng nhập họ tên.');
    if (!isPhone(phoneRaw)) return fail(res, 400, 'INVALID_PHONE', 'Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0).');
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        return fail(res, 400, 'INVALID_EMAIL', 'Email không hợp lệ.');
    }

    if (kind !== 'food') {
        const start = body.date || body.check_in || body.checkIn;
        if (!isIsoDate(start) || start < commerce.today()) return fail(res, 400, 'INVALID_DATE', 'Ngày đặt phải hợp lệ và không ở quá khứ.');
    }
    const countKey = kind === 'food' ? 'quantity' : kind === 'tour' ? (body.guests !== undefined ? 'guests' : 'seats') : kind === 'transport' ? 'seats' : 'nights';
    const maxCount = { food: 99, tour: 20, transport: 16, hotel: 30 }[kind] || 30;
    if (body[countKey] !== undefined && !commerce.integer(body[countKey], 1, maxCount)) {
        return fail(res, 400, 'INVALID_QUANTITY', `Số lượng phải là số nguyên từ 1 đến ${maxCount}.`);
    }
    if (kind === 'transport') {
        const validTime = t => /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
        if (body.time !== undefined && !validTime(body.time)) return fail(res, 400, 'INVALID_TIME', 'Giờ đón không hợp lệ.');
        if (body.round_trip || body.roundTrip) {
            const end = body.return_date || body.returnDate;
            const start = body.date || body.check_in;
            const time = body.time || '08:00', endTime = body.return_time || body.returnTime || '16:00';
            if (!isIsoDate(end) || end < start || !validTime(endTime) || (end === start && endTime <= time)) {
                return fail(res, 400, 'INVALID_RETURN_DATE', 'Ngày giờ về phải sau ngày giờ đi.');
            }
        }
    }

    let userId = '';
    const token = bearerToken(req);
    if (token) {
        try { userId = (await auth.me(token)).id || ''; }
        catch (_) { return fail(res, 401, 'UNAUTHORIZED', 'Phiên đăng nhập hết hạn. Đăng nhập lại trước khi đặt.'); }
    }

    let built;
    try {
        built = when(kind, body);
        if (built instanceof Promise) built = await built;
    } catch (err) {
        console.error('[bookings/build]', err.message);
        return fail(res, 502, 'DATABASE_UNAVAILABLE', 'Không kết nối được cơ sở dữ liệu.');
    }
    if (built.error) return fail(res, 400, built.error[0], built.error[1]);

    // Khách đăng nhập thì gắn đơn vào tài khoản, để họ tra cứu lại được trên
    // MỌI thiết bị. Khách không đăng nhập vẫn đặt được, và tra bằng số điện
    // thoại + mã đơn.

    const doc = {
        ...built.payload,
        guestName,
        phone: phoneRaw,
        email,
        note,
        userId,
        status: 'pending',
        source: asString(body.source, 20) || 'api',
        createdAt: new Date(),
    };

    // Trừ tồn TRƯỚC khi ghi đơn: ghi đơn xong mới trừ mà lúc trừ lại hết
    // hàng thì đã có một đơn không có hàng để giao.
    let reservation = null;
    if (built.giuHang) {
        const row = listings.find(built.giuHang.id);
        const con = Math.max(0, Number(row && row.stock) || 0);
        if (row?.stockTracked || con > 0) {
            if (built.giuHang.soLuong > con) {
                return fail(res, 400, 'NOT_ENOUGH',
                    `Vừa có người đặt trước. Chỉ còn ${con} ${row.unit || 'phần'}.`);
            }
            reservation = { id: row.id, count: built.giuHang.soLuong };
            listings.update(row.id, { stock: con - built.giuHang.soLuong, stockTracked: true });
        }
    }

    let saved;
    try {
        saved = await createDocument('bookings', doc);

        // Đơn xe là đơn marketplace: khách đã chọn nhà xe trong bảng báo giá
        // nên nhà xe đó là chủ đơn cố định. Không "nổ đơn" cho tài xế thuộc
        // đối tác khác, nếu không đơn sẽ biến mất khỏi dashboard bên khách đã
        // chọn và giá/uy tín hiển thị lúc mua cũng không còn đúng.
        let dispatchInfo = null;
        if (doc.kind === 'transport') {
            // Ghi lại để những khách đặt sau có thể ghép chuyến cùng
            store.insert('pool', {
                bookingId: saved.id,
                date: doc.checkIn,
                time: doc.pickupTime,
                pickup: doc.pickup,
                pickupLat: doc.pickupLat,
                pickupLng: doc.pickupLng,
                dropoff: doc.dropoff,
                seats: doc.seats,
                vehicleType: doc.vehicleType,
                guestName: doc.guestName,
                price: doc.totalPrice,
                pooled: Boolean(req.body?.pool),
                createdAt: new Date().toISOString(),
            }, 'pool');

            dispatchInfo = {
                state: 'partner_pending',
                partner_id: doc.partnerId,
                partner_name: doc.partnerName,
            };
        }

        const code = maDon(saved.id);

        // Biên nhận cho chính người vừa đặt.
        //
        // Trước đây chủ nhà được báo, đối tác được báo, riêng NGƯỜI TRẢ TIỀN
        // thì không. Họ đóng trang xong là không còn gì trong tay: không mã
        // đơn để tra, không biết đơn đã vào hay chưa. Thông báo này chính là
        // chỗ dựa đó — mở chuông ra là thấy mã đơn.
        notifications.push({
            audience: 'guest',
            phone: doc.phone,
            kind: 'booking_received',
            title: 'Đã nhận đơn của bạn',
            body: `${code} · ${doc.roomName || ''}`
                + (doc.checkIn ? ` · ${doc.checkIn}` : '')
                + '. ' + ({
                    transport: `${doc.partnerName || 'Nhà xe'} sẽ gọi xác nhận trong ít phút.`,
                    tour: 'Đơn vị tour sẽ liên hệ với bạn.',
                    hotel: 'Chỗ nghỉ sẽ xác nhận và gọi lại cho bạn.',
                    food: 'Cơ sở sẽ gọi xác nhận và báo cước gửi hàng.',
                }[doc.kind] || 'LOCALMATE sẽ liên hệ với bạn.'),
            bookingId: saved.id,
            data: { kind: 'booking_status', status: 'pending', code },
        });

        // Chủ nhà cần biết ngay có đơn mới; đơn vào đúng đối tác nào thì báo
        // riêng cho họ nữa, khỏi phải ngồi bấm F5 trang quản lý.
        notifications.push({
            audience: 'admin',
            kind: 'new_booking',
            title: `Đơn mới · ${{ transport: 'Xe đưa đón', tour: 'Tour', hotel: 'Phòng nghỉ',
                food: 'Đặc sản' }[doc.kind] || doc.kind}`,
            body: `${code} · ${doc.guestName} · ${doc.phone}`
                + (doc.totalPrice ? ` · ${Number(doc.totalPrice).toLocaleString('vi-VN')}đ` : ''),
            bookingId: saved.id,
        });
        if (doc.partnerId) {
            notifications.push({
                audience: 'partner',
                partnerId: doc.partnerId,
                kind: 'new_booking',
                title: 'Bạn có đơn mới',
                body: `${code} · ${doc.roomName || ''} · ${doc.guestName}`,
                bookingId: saved.id,
            });
        }

        res.status(201).json({
            data: {
                id: saved.id,
                code,
                kind: doc.kind,
                status: doc.status,
                total_price: doc.totalPrice,
                summary: doc.roomName,
                check_in: doc.checkIn,
                check_out: doc.checkOut,
                partner_name: doc.partnerName || '',
                dispatch: dispatchInfo,
                // Tiền cọc và mã QR chuyển khoản, để đặt xong trả tiền được luôn
                payment: payments.paymentView({ ...doc, id: saved.id }),
            },
            message: {
                transport: `Đã gửi yêu cầu đến ${doc.partnerName || 'nhà xe'}. Nhà xe sẽ gọi xác nhận trong ít phút.`,
                tour: 'Đã ghi nhận đăng ký tour. Hướng dẫn viên sẽ liên hệ với bạn.',
                hotel: 'Đặt phòng thành công! Homestay sẽ liên hệ xác nhận.',
                food: 'Đã gửi đơn. Cơ sở sẽ gọi xác nhận và báo cước gửi hàng cho bạn.',
            }[doc.kind] || 'Đã gửi đơn thành công!',
        });
    } catch (err) {
        console.error('[bookings/create]', err.message);
        if (saved) {
            // Booking is already committed: a notification failure must not tell
            // the buyer to submit a second paid order.
            return res.status(201).json({ data: { id: saved.id, code: maDon(saved.id), kind: doc.kind,
                status: doc.status, summary: doc.roomName, total_price: doc.totalPrice },
                message: 'Đã ghi nhận đơn. Bạn xem trạng thái trong Đơn của tôi.' });
        }
        if (reservation) {
            const row = listings.find(reservation.id);
            if (row) listings.update(row.id, { stock: Math.max(0, Number(row.stock) || 0) + reservation.count, stockTracked: true });
        }
        fail(res, 502, 'BOOKING_FAILED', 'Không gửi được đơn lúc này, vui lòng thử lại.');
    }
}));

module.exports = router;
