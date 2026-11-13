// ============================================================
// LOCALMATE — Tin đăng của đối tác
// ============================================================
// Trước đây khách sạn (PARTNER_STAYS) và tour (TOURS) đều VIẾT CỨNG trong
// mã nguồn. Đối tác đăng ký xong, được duyệt rồi… vẫn không có chỗ nào để
// đưa phòng hay tour của mình lên. Muốn thêm một khách sạn là phải sửa code
// rồi khởi động lại máy chủ — không thể vận hành thật như vậy.
//
// Module này cho đối tác TỰ ĐĂNG:
//   • Khách sạn / nhà nghỉ  → hiện ở trang Phòng nghỉ, gợi ý quanh điểm đến,
//                             và được lịch trình chọn làm chỗ nghỉ đêm
//   • Tour                  → hiện ở trang Khám phá và trong lịch trình
//
// Admin chỉ duyệt HỒ SƠ đối tác một lần. Endpoint tạo tin đã chặn tài khoản
// chưa được duyệt, vì vậy tin của đối tác hợp lệ được hiện ngay cho khách.
// ============================================================

const store = require('./store');

const COLLECTION = 'listings';

// stay = chỗ nghỉ · tour = tour · food = đặc sản địa phương
const TYPES = ['stay', 'tour', 'food'];
const STATUSES = ['pending', 'approved', 'rejected', 'paused'];

const STATUS_LABELS = {
    pending: 'Chờ duyệt',
    approved: 'Đang hiển thị',
    rejected: 'Bị từ chối',
    paused: 'Tạm ẩn',
};

/** Chỉ những tin đang bật mới đến được tay khách. */
const isLive = (row) => row.status === 'approved';

const listAll = () => store.readAll(COLLECTION)
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

const byPartner = (partnerId) => store.readAll(COLLECTION)
    .filter(r => r.partnerId === partnerId)
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));

const find = (id) => store.find(COLLECTION, r => r.id === id);

/** Khách sạn / nhà nghỉ do đối tác đăng, đã duyệt. */
const liveStays = () => store.readAll(COLLECTION).filter(r => r.type === 'stay' && isLive(r));

/** Tour do đối tác đăng, đã duyệt. */
const liveTours = () => store.readAll(COLLECTION).filter(r => r.type === 'tour' && isLive(r));

/** Đặc sản địa phương do cơ sở sản xuất hoặc quán tự đăng, đã duyệt. */
const liveFoods = () => store.readAll(COLLECTION).filter(r => r.type === 'food' && isLive(r));

const create = (data) => store.insert(COLLECTION, {
    ...data,
    status: 'approved',
    publishedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
}, 'lst');

const update = (id, patch) => store.update(COLLECTION, id, patch);
const remove = (id) => store.remove(COLLECTION, id);

/**
 * Gom ảnh của một tin về một mảng.
 *
 * Trước đây mỗi tin chỉ giữ đúng MỘT ảnh, mà khách sạn thì cần khoe cả phòng,
 * nhà tắm, ban công — một tấm ảnh không bán được phòng. Vẫn đọc field `image`
 * cũ để những tin đăng từ trước không mất ảnh.
 */
function imagesOf(row) {
    const list = Array.isArray(row.images) ? row.images.filter(Boolean) : [];
    if (!list.length && row.image) list.push(row.image);
    return list;
}

/**
 * Đưa tin đăng "chỗ nghỉ" về đúng hình dạng mà PARTNER_STAYS đang dùng,
 * để mọi nơi tiêu thụ (tìm kiếm, gợi ý quanh điểm đến, lịch trình) không
 * phải phân biệt đâu là dữ liệu gốc, đâu là do đối tác đăng.
 */
function toStayShape(row) {
    return {
        id: row.id,
        partnerId: row.partnerId,
        partnerName: row.partnerName || '',
        name: row.name,
        area: row.area || '',
        lat: Number(row.lat),
        lng: Number(row.lng),
        price: Number(row.price) || 0,
        capacity: Number(row.capacity) || 2,
        // So phong GIONG NHAU trong tin nay. Nha nghi co 5 phong doi giong
        // het nhau thi khai 1 tin, so luong 5 — khong phai dang 5 tin roi
        // moi lan doi gia phai sua nam lan.
        quantity: Math.max(1, Number(row.quantity) || 1),
        cancelPolicy: row.cancelPolicy || 'vua',
        rating: Number(row.rating) || 4.5,
        amenities: Array.isArray(row.amenities) ? row.amenities : [],
        image: imagesOf(row)[0] || 'assets/homestay.jpg',
        images: imagesOf(row),
        description: row.description || '',
        // Hết phòng TẠM THỜI, khác hẳn với tạm ẩn:
        //   tạm ẩn  = gỡ khỏi trang khách hẳn (đang sửa chữa, ngừng kinh doanh)
        //   tạm hết = vẫn hiện cho khách thấy, nhưng không đặt được lúc này
        // Khách khoái cái sau hơn: biết chỗ đó có thật, hôm khác quay lại.
        soldOut: Boolean(row.soldOut),
        // Đánh dấu nguồn để giao diện hiện nhãn "Đối tác tự đăng"
        selfListed: true,
    };
}

/** Tương tự cho tour, khớp hình dạng của TOURS trong lib/content.js. */
function toTourShape(row) {
    return {
        slug: row.id,
        partnerId: row.partnerId,
        partnerName: row.partnerName || '',
        name: row.name,
        image: imagesOf(row)[0] || 'assets/tra-su.jpg',
        images: imagesOf(row),
        price: Number(row.price) || 0,
        days: Number(row.days) || 1,
        duration: row.duration || (Number(row.days) > 1 ? `${row.days} ngày` : 'Trong ngày'),
        pax: row.pax || '2–10 khách',
        rating: Number(row.rating) || 4.5,
        stops: row.stops || '',
        includes: Array.isArray(row.includes) ? row.includes : [],
        schedule: Array.isArray(row.schedule) ? row.schedule : [],
        soldOut: Boolean(row.soldOut),
        selfListed: true,
    };
}

/** Hình dạng đặc sản trả cho trang khách. */
function toFoodShape(row) {
    return {
        id: row.id,
        slug: row.id,
        partnerId: row.partnerId,
        name: row.name,
        // Ảnh dự phòng KHÔNG dùng ảnh một món cụ thể: hũ mật ong mà hiện ra
        // cái bánh xèo thì khách tưởng bán bánh xèo. Ảnh trống ghi rõ
        // "đang cập nhật" thật hơn nhiều.
        image: imagesOf(row)[0] || 'assets/dacsan-chua-co-anh.jpg',
        images: imagesOf(row),
        price: Number(row.price) || 0,
        unit: row.unit || 'phần',
        area: row.area || '',
        description: row.description || '',
        // Gửi đi tỉnh khác được hay chỉ bán tại chỗ — khách ngoài tỉnh hỏi
        // ngay câu này, mà mỗi món một khác nên phải để chủ hàng tự khai.
        shipping: row.shipping || '',
        keeping: row.keeping || '',
        // Giá gốc và phần trăm giảm do MÁY CHỦ tính, không để chủ hàng tự gõ:
        // gõ tay thì con số và giá dễ lệch nhau, khách nhìn ra là mất tin.
        // Giá gốc không lớn hơn giá bán thì coi như không giảm.
        oldPrice: giaGoc(row),
        discount: phanTramGiam(row),
        stock: Number(row.stock) || 0,
        stockTracked: Boolean(row.stockTracked || Number(row.stock) > 0),
        soldOut: Boolean(row.soldOut || (row.stockTracked && Number(row.stock) <= 0)),
        // Tên cơ sở bán. Khách mua đồ ăn gửi đi xa thì việc "mua của ai" quan
        // trọng ngang cái giá — mà trước đây trang khách không hề nói ra.
        shop: row.partnerName || '',
        selfListed: true,
    };
}

/** Giá gốc chỉ nhận khi thật sự cao hơn giá đang bán. */
function giaGoc(row) {
    const goc = Number(row.oldPrice) || 0;
    const ban = Number(row.price) || 0;
    return goc > ban ? goc : 0;
}

function phanTramGiam(row) {
    const goc = giaGoc(row);
    if (!goc) return 0;
    return Math.round((1 - (Number(row.price) || 0) / goc) * 100);
}

module.exports = {
    COLLECTION, TYPES, STATUSES, STATUS_LABELS,
    listAll, byPartner, find, create, update, remove,
    liveStays, liveTours, liveFoods, toStayShape, toTourShape, toFoodShape, imagesOf,
};
