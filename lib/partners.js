// ============================================================
// LOCALMATE — Hệ thống đối tác
// ============================================================
// Ba nhóm đối tác cùng dùng một cơ chế:
//   transport — nhà xe        → nhận đơn đặt xe
//   tour      — đơn vị tour   → nhận đơn đặt tour
//   hotel     — khách sạn/nhà nghỉ hợp tác → nhận đơn đặt phòng
//
// Mỗi đơn được gắn partnerId ngay lúc tạo. Đối tác đăng nhập bằng email
// dưới đây (tài khoản Firebase Auth) và chỉ thấy đơn của chính mình.
//
// Vì sao khai báo tĩnh ở đây: firestore.rules hiện chỉ mở rooms/bookings/
// contacts/settings. Thêm collection partners sẽ phải deploy lại rules.
// Với quy mô demo thì danh bạ đối tác đổi rất ít — để ở đây là đủ và an toàn.
// ============================================================

const { haversineKm } = require('./geo');

const PARTNERS = [
    // ── Nhà xe ──
    {
        id: 'bn-transport-01', type: 'transport', name: 'Nhà xe Bảy Núi',
        email: 'nhaxebaynui@baynuieco.vn', phone: '0909 111 222',
        address: 'Tịnh Biên, An Giang', rating: 4.9, reviews: 128,
        commission: 0.12, factor: 1.0,
        note: 'Tài xế người địa phương, biết đường tắt lên Núi Cấm',
    },
    {
        id: 'bn-transport-02', type: 'transport', name: 'Thất Sơn Travel',
        email: 'thatsontravel@baynuieco.vn', phone: '0909 111 333',
        address: 'Châu Đốc, An Giang', rating: 4.7, reviews: 86,
        commission: 0.12, factor: 1.08,
        note: 'Xe đời mới, có nước uống miễn phí',
    },
    {
        id: 'bn-transport-03', type: 'transport', name: 'Tà Pạ Car',
        email: 'tapacar@baynuieco.vn', phone: '0909 111 444',
        address: 'Tri Tôn, An Giang', rating: 4.6, reviews: 54,
        commission: 0.12, factor: 0.94,
        note: 'Giá tốt, phù hợp nhóm tiết kiệm',
    },

    // ── Đơn vị tour ──
    {
        id: 'bn-tour-01', type: 'tour', name: 'Khmer Heritage Tours',
        email: 'khmerheritage@baynuieco.vn', phone: '0909 222 111',
        address: 'Tri Tôn, An Giang', rating: 4.9, reviews: 96,
        commission: 0.15,
        note: 'Hướng dẫn viên người Khmer bản địa',
    },
    {
        id: 'bn-tour-02', type: 'tour', name: 'Thất Sơn Adventure',
        email: 'thatsonadventure@baynuieco.vn', phone: '0909 222 333',
        address: 'Tịnh Biên, An Giang', rating: 4.8, reviews: 71,
        commission: 0.15,
        note: 'Chuyên trekking, camping và săn mây',
    },

    // ── Khách sạn / nhà nghỉ hợp tác ──
    {
        id: 'bn-hotel-01', type: 'hotel', name: 'Thất Sơn View Homestay',
        email: 'thatsonview@baynuieco.vn', phone: '0909 333 111',
        address: 'Sườn Núi Cấm, Tịnh Biên', rating: 4.7, reviews: 112, commission: 0.10,
    },
    {
        id: 'bn-hotel-02', type: 'hotel', name: 'Tà Pạ Green Hotel',
        email: 'tapagreen@baynuieco.vn', phone: '0909 333 222',
        address: 'Tri Tôn, An Giang', rating: 4.6, reviews: 88, commission: 0.10,
    },
    {
        id: 'bn-hotel-03', type: 'hotel', name: 'Trà Sư Eco Lodge',
        email: 'trasueco@baynuieco.vn', phone: '0909 333 333',
        address: 'Tịnh Biên, An Giang', rating: 4.8, reviews: 64, commission: 0.10,
    },
    {
        id: 'bn-hotel-04', type: 'hotel', name: 'Châu Đốc Riverside',
        email: 'chaudocriverside@baynuieco.vn', phone: '0909 333 444',
        address: 'Châu Đốc, An Giang', rating: 4.7, reviews: 143, commission: 0.10,
    },
];

// Dữ liệu chỗ nghỉ mẫu cũ đã được xoá. Biến rỗng chỉ giữ để các module cũ
// còn import được trong thời gian chuyển tiếp; trang khách không đọc nó.
const PARTNER_STAYS = [];

// ── Toạ độ các điểm đến, dùng để tính "khách sạn gần đó" ──
const PLACE_COORDS = {
    'nui-cam': { lat: 10.5117, lng: 105.0000 },
    'ho-ta-pa': { lat: 10.4139, lng: 104.9469 },
    'chua-khmer': { lat: 10.4100, lng: 104.9400 },
    'tra-su': { lat: 10.5900, lng: 105.0500 },
    'nui-sam': { lat: 10.6800, lng: 105.0900 },
    'camping-nui-cam': { lat: 10.5117, lng: 105.0000 },
    // Đồng bằng sông Cửu Long — mở rộng ngoài An Giang
    'mui-ca-mau': { lat: 8.6197, lng: 104.7205 },
    'u-minh-ha': { lat: 9.2833, lng: 104.9500 },
    'hon-da-bac': { lat: 9.1667, lng: 104.8167 },
    'cho-noi-cai-rang': { lat: 10.0089, lng: 105.7550 },
    'dien-gio-bac-lieu': { lat: 9.2167, lng: 105.7833 },
    'chua-doi': { lat: 9.5833, lng: 105.9667 },
    'tram-chim': { lat: 10.7167, lng: 105.5333 },
    'lang-hoa-sa-dec': { lat: 10.2925, lng: 105.7561 },
    'ha-tien': { lat: 10.3831, lng: 104.4869 },
    'con-phung': { lat: 10.3300, lng: 106.3400 },
    'ao-ba-om': { lat: 9.9167, lng: 106.3167 },
};

const findPartner = (id) => PARTNERS.find(p => p.id === id) || null;

/**
 * Tra đối tác ở CẢ HAI nguồn: danh bạ có sẵn và hồ sơ tự đăng ký.
 * Nếu chỉ tra danh bạ có sẵn thì khách sạn tự đăng ký sẽ mất tên và
 * số điện thoại khi hiện cho khách.
 */
function findAnyPartner(id) {
    const seeded = findPartner(id);
    if (seeded) return seeded;
    try {
        // eslint-disable-next-line global-require
        return require("./store").find("partners", x => x.id === id);
    } catch (_) {
        return null;
    }
}
const findPartnerByEmail = (email) =>
    PARTNERS.find(p => p.email.toLowerCase() === String(email || '').toLowerCase()) || null;
const findStay = (id) => allPartnerStays().find(s => s.id === id) || null;

/** Hồ sơ dùng để chấm thử vẫn đăng nhập được, nhưng không phải nhà cung cấp thật. */
const isPublicPartner = (partner) => {
    const text = `${partner?.name || ''} ${partner?.note || ''}`.toLowerCase();
    return partner?.status === 'approved'
        && !/thử nghiệm|tài khoản thử|demo|không phải (cơ sở|nhà xe|đơn vị)/i.test(text);
};

const partnersByType = (type) => {
    try {
        // Danh sách công khai/vận hành chỉ lấy hồ sơ thật do đối tác đăng ký
        // và đã được Admin duyệt. PARTNERS là dữ liệu mẫu cũ, giữ lại để đọc
        // các đơn lịch sử nhưng không đưa ra bán nữa.
        return require('./store').readAll('partners')
            .filter(p => p.type === type && isPublicPartner(p));
    } catch (_) {
        return [];
    }
};

/**
 * Chỗ ở của đối tác quanh một điểm đến, kèm khoảng cách thật.
 * sort: 'near' (mặc định) | 'price' | 'rating'
 */
/**
 * Chỉ chỗ nghỉ do đối tác thật tự đăng. Danh sách PARTNER_STAYS viết cứng
 * trước đây là dữ liệu minh hoạ, không còn được đưa ra trang khách.
 */
function allPartnerStays() {
    try {
        // eslint-disable-next-line global-require
        const listings = require('./listings');
        return listings.liveStays().map(listings.toStayShape);
    } catch (_) {
        return [];
    }
}

function staysNearPlace(placeSlug, { sort = 'near', radiusKm = 30 } = {}) {
    const coords = PLACE_COORDS[placeSlug];
    if (!coords) return [];

    const list = allPartnerStays()
        .map((stay) => {
            const km = haversineKm(stay.lat, stay.lng, coords.lat, coords.lng) * 1.3;
            const partner = findAnyPartner(stay.partnerId);
            return {
                ...stay,
                partnerName: partner ? partner.name : '',
                partnerPhone: partner ? partner.phone : '',
                distanceKm: Math.round(km * 10) / 10,
            };
        })
        .filter(stay => stay.distanceKm <= radiusKm);

    const comparators = {
        price: (a, b) => a.price - b.price,
        rating: (a, b) => b.rating - a.rating,
        near: (a, b) => a.distanceKm - b.distanceKm,
    };
    return list.sort(comparators[sort] || comparators.near);
}

module.exports = {
    PARTNERS,
    PARTNER_STAYS,
    allPartnerStays,
    PLACE_COORDS,
    findPartner,
    findAnyPartner,
    findPartnerByEmail,
    findStay,
    isPublicPartner,
    partnersByType,
    staysNearPlace,
};
