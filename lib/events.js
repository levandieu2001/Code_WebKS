// ============================================================
// LOCALMATE — Lễ hội & sự kiện vùng Bảy Núi
// ============================================================
// Lễ hội Khmer (Chôl Chnăm Thmây, Sen Đôlta, Ok Om Bok) chạy theo
// ÂM LỊCH KHMER nên năm nào cũng lệch ngày dương lịch. Không có công
// thức nào tính chuẩn được cho mọi năm, mà đoán sai thì tệ hơn không
// có — vì thế ngày cụ thể do ADMIN NHẬP TAY mỗi năm, lấy theo thông
// báo của địa phương.
//
// Sự kiện được lưu ở data/events.json qua lib/store.js.
// Bộ sinh lịch trình đọc bảng này: chuyến của khách trùng ngày lễ nào
// thì tự chèn vào đúng ngày đó.
// ============================================================

const store = require('./store');

const COLLECTION = 'events';

const CATEGORIES = ['le-hoi', 'the-thao', 'am-thuc', 'cho-phien', 'khac'];

const CATEGORY_LABELS = {
    'le-hoi': 'Lễ hội',
    'the-thao': 'Thể thao dân gian',
    'am-thuc': 'Ẩm thực',
    'cho-phien': 'Chợ phiên',
    khac: 'Khác',
};

/** Vài sự kiện mẫu để admin có cái sửa thay vì bắt đầu từ màn hình trắng. */
const SEED_EVENTS = [
    {
        name: 'Hội đua bò Bảy Núi',
        category: 'the-thao',
        area: 'Tri Tôn – Tịnh Biên, An Giang',
        summary: 'Di sản văn hoá phi vật thể quốc gia, tổ chức dịp lễ Sen Đôlta của đồng bào Khmer.',
        detail: 'Từng đôi bò kéo bừa lao trên ruộng nước trước hàng nghìn người xem. Nên tới sớm 1 tiếng để có chỗ đứng đẹp và tránh nắng.',
        ticket: 'Miễn phí',
        startTime: '08:00',
        placeSlug: 'chua-khmer',
        image: 'assets/le-hoi-dua-bo.webp',
        featured: true,
    },
    {
        name: 'Lễ Sen Đôlta',
        category: 'le-hoi',
        area: 'Các chùa Khmer vùng Bảy Núi',
        summary: 'Lễ cúng ông bà của người Khmer Nam Bộ, kéo dài ba ngày.',
        detail: 'Bà con mang cơm lên chùa cúng tổ tiên, có tụng kinh và nhạc ngũ âm. Khách tham quan nên mặc kín đáo và xin phép trước khi chụp ảnh.',
        ticket: 'Miễn phí',
        startTime: '16:00',
        placeSlug: 'chua-khmer',
        image: 'assets/chua-khmer.jpg',
        featured: true,
    },
    {
        name: 'Lễ hội Vía Bà Chúa Xứ núi Sam',
        category: 'le-hoi',
        area: 'Miếu Bà Chúa Xứ, núi Sam, Châu Đốc',
        summary: 'Lễ hội lớn nhất An Giang, được UNESCO ghi danh Di sản văn hoá phi vật thể đại diện của nhân loại.',
        detail: 'Diễn ra từ 22 đến 27 tháng 4 âm lịch với lễ tắm Bà, lễ thỉnh sắc, lễ túc yết và xây chầu. '
            + 'Mỗi mùa lễ đón vài triệu lượt khách nên đông kín — nên đặt phòng trước cả tháng, '
            + 'đi sớm buổi sáng và giữ kỹ tư trang.',
        ticket: 'Miễn phí',
        startTime: '05:00',
        placeSlug: 'nui-sam',
        image: 'assets/le-via-ba-chua-xu.jpg',
        featured: true,
    },
];

const asDate = (value) => (/^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? String(value) : '');

/** Sự kiện diễn ra trong khoảng [from, to] (bao gồm hai đầu). */
function eventsBetween(from, to) {
    const start = asDate(from);
    const end = asDate(to) || start;
    if (!start) return [];

    return store.readAll(COLLECTION)
        .filter(e => e.status !== 'hidden')
        .filter(e => {
            const eStart = asDate(e.startDate);
            const eEnd = asDate(e.endDate) || eStart;
            if (!eStart) return false;
            // Hai khoảng thời gian có giao nhau không
            return eStart <= end && eEnd >= start;
        })
        .sort((a, b) => String(a.startDate).localeCompare(String(b.startDate)));
}

/** Sự kiện rơi đúng vào một ngày cụ thể. */
function eventsOn(date) {
    return eventsBetween(date, date);
}

/** Sự kiện sắp tới, dùng cho trang chủ và cho chatbot. */
function upcomingEvents(limit = 5) {
    const today = new Date().toISOString().split('T')[0];
    return store.readAll(COLLECTION)
        .filter(e => e.status !== 'hidden')
        .filter(e => (asDate(e.endDate) || asDate(e.startDate)) >= today)
        .sort((a, b) => String(a.startDate).localeCompare(String(b.startDate)))
        .slice(0, limit);
}

const listAll = () => store.readAll(COLLECTION)
    .sort((a, b) => String(a.startDate).localeCompare(String(b.startDate)));

const create = (data) => store.insert(COLLECTION, data, 'ev');
const update = (id, patch) => store.update(COLLECTION, id, patch);
const remove = (id) => store.remove(COLLECTION, id);
const find = (id) => store.find(COLLECTION, e => e.id === id);

module.exports = {
    COLLECTION, CATEGORIES, CATEGORY_LABELS, SEED_EVENTS,
    eventsBetween, eventsOn, upcomingEvents, listAll, create, update, remove, find,
};
