// ============================================================
// LOCALMATE — Ghép chuyến theo lịch trình
// ============================================================
// Grab có GrabShare, nhưng ghép các cuốc ĐANG GỌI cùng lúc. Ở đây có
// thứ khác hẳn: lịch trình đặt trước, biết chính xác 7:30 sáng mai ai
// đi từ Châu Đốc lên Núi Cấm. Nhờ vậy ghép được hai khách lạ đi cùng
// tuyến, cùng khung giờ, TRƯỚC cả ngày.
//
// Lợi cho cả ba bên:
//   • Khách  — rẻ hơn đáng kể so với đi xe riêng
//   • Tài xế — một chuyến ăn hai đầu khách, đỡ chạy rỗng
//   • Nền tảng — lấp ghế trống, giảm số đơn không tìm được xe
//
// Điều kiện ghép: cùng ngày · giờ lệch nhau trong khoảng cho phép ·
// điểm đón gần nhau · điểm đến gần nhau · tổng số khách còn vừa xe.
// ============================================================

const { haversineKm, coordsFromName } = require('./geo');

const TIME_WINDOW_MIN = 45;      // giờ đón lệch nhau tối đa 45 phút
const PICKUP_RADIUS_KM = 8;      // điểm đón cách nhau tối đa 8 km
const DROPOFF_RADIUS_KM = 8;     // điểm đến cũng vậy
const POOL_DISCOUNT = 0.35;      // mỗi khách tiết kiệm 35% khi ghép

const toMinutes = (hhmm) => {
    const [h, m] = String(hhmm || '').split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
};

/** Toạ độ của một đầu chuyến: ưu tiên toạ độ thật, không có thì tra theo tên. */
function endpointCoords(name, lat, lng) {
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    return coordsFromName(name);
}

const near = (a, b, limitKm) => {
    if (!a || !b) return false;
    return haversineKm(a.lat, a.lng, b.lat, b.lng) <= limitKm;
};

/**
 * Chuyến B có ghép được với chuyến A không.
 * `ride` = { date, time, pickup, pickupLat, pickupLng, dropoff, seats, vehicleType }
 */
function canPool(a, b, seatsLimit) {
    if (!a || !b) return false;
    if (a.date !== b.date) return false;
    if (Math.abs(toMinutes(a.time) - toMinutes(b.time)) > TIME_WINDOW_MIN) return false;
    if ((a.seats || 1) + (b.seats || 1) > seatsLimit) return false;

    const pa = endpointCoords(a.pickup, a.pickupLat, a.pickupLng);
    const pb = endpointCoords(b.pickup, b.pickupLat, b.pickupLng);
    if (!near(pa, pb, PICKUP_RADIUS_KM)) return false;

    const da = coordsFromName(a.dropoff);
    const db = coordsFromName(b.dropoff);
    // Không tra được toạ độ điểm đến thì so tên cho chắc
    if (da && db) return near(da, db, DROPOFF_RADIUS_KM);
    return String(a.dropoff || '').trim().toLowerCase() === String(b.dropoff || '').trim().toLowerCase();
}

/**
 * Tìm những chuyến đã đặt có thể ghép với chuyến đang xét.
 * @param ride chuyến đang xét
 * @param others danh sách chuyến khác đang chờ ghép
 * @param seatsLimit số ghế của loại xe (4, 7, 16…)
 */
function findMatches(ride, others, seatsLimit = 7) {
    return others
        .filter(other => other.bookingId !== ride.bookingId)
        .filter(other => canPool(ride, other, seatsLimit))
        .map(other => ({
            booking_id: other.bookingId,
            time: other.time,
            pickup: other.pickup,
            seats: other.seats || 1,
            guest_name: other.guestName || '',
            minutes_apart: Math.abs(toMinutes(ride.time) - toMinutes(other.time)),
        }))
        .sort((a, b) => a.minutes_apart - b.minutes_apart);
}

/** Giá mỗi khách khi ghép, và số tiền tiết kiệm được. */
function poolPricing(soloPrice, riders) {
    if (riders < 2) return { per_person: soloPrice, saved: 0, discount_percent: 0 };
    const perPerson = Math.round((soloPrice * (1 - POOL_DISCOUNT)) / 1000) * 1000;
    return {
        per_person: perPerson,
        saved: soloPrice - perPerson,
        discount_percent: Math.round(POOL_DISCOUNT * 100),
    };
}

module.exports = {
    canPool, findMatches, poolPricing,
    TIME_WINDOW_MIN, PICKUP_RADIUS_KM, DROPOFF_RADIUS_KM, POOL_DISCOUNT,
};
