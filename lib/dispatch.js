// ============================================================
// LOCALMATE — Điều phối đơn xe cho tài xế ("nổ đơn")
// ============================================================
// Cách hoạt động, giống Grab/Xanh SM ở mức rút gọn:
//   1. Tài xế bật "Đang nhận đơn"  → POST /v1/driver/online (kèm toạ độ)
//   2. App tài xế gửi vị trí định kỳ → POST /v1/driver/heartbeat
//   3. Khách đặt xe                 → hệ thống tìm tài xế ĐANG ONLINE, đúng
//                                      loại xe, GẦN ĐIỂM ĐÓN NHẤT
//   4. Tài xế gần nhất nhận lời mời, có 30 giây để bấm Nhận
//   5. Từ chối hoặc quá hạn → tự chuyển cho tài xế gần tiếp theo
//   6. Hết tài xế → đơn về trạng thái chờ tổng đài xử lý tay
//
// LƯU Ý VỀ LƯU TRỮ: trạng thái online, vị trí và hàng đợi lời mời được giữ
// TRONG BỘ NHỚ của tiến trình server. Dữ liệu này thay đổi từng giây, ghi vào
// Firestore sẽ vừa tốn quota vừa chậm. Hồ sơ tài xế (tên, SĐT, biển số) vẫn
// lưu bền trong Firestore. Đổi lại: khởi động lại server thì mọi tài xế bị
// coi là offline và phải bật lại — chấp nhận được cho bản demo.
// ============================================================

const { haversineKm } = require('./geo');
const store = require('./store');

const ONLINE_TTL_MS = 2 * 60 * 1000;   // không gửi vị trí 2 phút → coi như offline
const OFFER_TIMEOUT_MS = 30 * 1000;    // tài xế có 30 giây để quyết định
const SEARCH_RADIUS_KM = 30;           // đơn xa hơn mức này thì không gửi cho tài xế

// Tài xế chọn khu vực cố định thì không cần gửi vị trí liên tục — mốc "còn
// online" nới rộng hơn để họ không bị rớt khi app chạy nền.
const AREA_ONLINE_TTL_MS = 30 * 60 * 1000;

/** partnerId -> { lat, lng, vehicleType, seats, name, phone, plate, updatedAt } */
const drivers = new Map();

/** offerId -> { id, bookingId, partnerId, booking, expiresAt, status, tried[] } */
const offers = new Map();

/**
 * Chuyến chưa có tài xế nào nhận, đang nằm chờ.
 * bookingId -> { bookingId, booking, tried[], createdAt }
 *
 * Trước đây đơn chỉ "nổ" đúng một lần lúc khách bấm đặt — tài xế bật nhận đơn
 * sau đó thì không thấy gì, và hết 30 giây cũng không chuyển sang người khác.
 * Hàng chờ này để: (1) tài xế vừa bật là được mời ngay các chuyến còn treo,
 * (2) lời mời quá hạn thì tự đẩy sang tài xế gần tiếp theo.
 */
const waiting = new Map();

/**
 * Chuyến đã tìm đủ 10 phút mà không ai nhận.
 * bookingId -> { bookingId, booking, tried[], gaveUpAt, rounds }
 * Giữ lại để khách bấm "Tìm lại" là chạy tiếp, không phải đặt đơn mới.
 */
const abandoned = new Map();

// Tìm 10 phút không ai nhận thì báo khách. Đặt DISPATCH_GIVEUP_MS để rút ngắn khi thử nghiệm.
const SEARCH_GIVEUP_MS = Number(process.env.DISPATCH_GIVEUP_MS) || 10 * 60 * 1000;
const WAITING_TTL_MS = 2 * 60 * 60 * 1000;   // treo quá 2 tiếng thì thôi, để tổng đài gọi tay

const now = () => Date.now();

// Bám theo GPS thì phải gửi tín hiệu thường xuyên; chọn khu vực cố định thì không.
const isFresh = (driver) =>
    now() - driver.updatedAt < (driver.areaSlug ? AREA_ONLINE_TTL_MS : ONLINE_TTL_MS);

// ── Trạng thái tài xế ──
function goOnline(partnerId, info) {
    drivers.set(partnerId, {
        partnerId,
        lat: info.lat,
        lng: info.lng,
        // Khu vực đăng ký nhận đơn (nếu tài xế chọn thay vì dùng GPS)
        areaSlug: info.areaSlug || '',
        areaName: info.areaName || '',
        vehicleType: info.vehicleType || '4-seat',
        seats: info.seats || 4,
        name: info.name || '',
        phone: info.phone || '',
        plate: info.plate || '',
        updatedAt: now(),
    });
    return drivers.get(partnerId);
}

function goOffline(partnerId) {
    drivers.delete(partnerId);
    // Huỷ mọi lời mời đang treo của tài xế này
    for (const offer of offers.values()) {
        if (offer.partnerId === partnerId && offer.status === 'pending') {
            offer.status = 'expired';
        }
    }
}

function heartbeat(partnerId, lat, lng) {
    const driver = drivers.get(partnerId);
    if (!driver) return null;
    // Tài xế đã chọn khu vực cố định thì giữ nguyên toạ độ khu vực đó, tín hiệu
    // này chỉ để báo "tôi vẫn còn online".
    if (!driver.areaSlug && Number.isFinite(lat) && Number.isFinite(lng)) {
        driver.lat = lat;
        driver.lng = lng;
    }
    driver.updatedAt = now();
    return driver;
}

function isOnline(partnerId) {
    const driver = drivers.get(partnerId);
    return Boolean(driver && isFresh(driver));
}

/** Thông tin tài xế đang online (khu vực, loại xe…). Null nếu đã tắt nhận đơn. */
function driverOf(partnerId) {
    const driver = drivers.get(partnerId);
    return driver && isFresh(driver) ? driver : null;
}

function onlineDrivers() {
    const list = [];
    for (const [id, driver] of drivers) {
        if (isFresh(driver)) list.push(driver);
        else drivers.delete(id);       // dọn luôn tài xế đã mất tín hiệu
    }
    return list;
}

// ── Tìm tài xế phù hợp, gần nhất trước ──
function candidatesFor(booking, exclude = []) {
    const { pickupLat, pickupLng, vehicleType, seats } = booking;
    if (!Number.isFinite(pickupLat) || !Number.isFinite(pickupLng)) return [];

    return onlineDrivers()
        .filter(driver => !exclude.includes(driver.partnerId))
        .filter(driver => driver.seats >= (seats || 1))
        .filter(driver => !vehicleType || driver.vehicleType === vehicleType)
        .map(driver => ({
            ...driver,
            distanceKm: Math.round(haversineKm(driver.lat, driver.lng, pickupLat, pickupLng) * 1.3 * 10) / 10,
        }))
        .filter(driver => driver.distanceKm <= SEARCH_RADIUS_KM)
        .sort((a, b) => a.distanceKm - b.distanceKm);
}

/**
 * Bắt đầu "nổ đơn": gửi lời mời cho tài xế gần nhất chưa được hỏi.
 * Trả về lời mời vừa tạo, hoặc null nếu không còn tài xế nào.
 */
function dispatchNext(bookingId, booking, tried = []) {
    const candidates = candidatesFor(booking, tried);
    if (!candidates.length) {
        // Chưa ai hợp → giữ lại để mời khi có tài xế bật nhận đơn.
        const held = waiting.get(bookingId);
        if (held) held.tried = tried;
        else waiting.set(bookingId, {
            bookingId, booking, tried,
            createdAt: now(),
            startedAt: now(),   // mốc đếm 10 phút; bấm "Tìm lại" thì đặt lại mốc này
            rounds: 0,
        });
        return null;
    }
    waiting.delete(bookingId);

    const driver = candidates[0];
    const offer = {
        id: `of_${bookingId}_${driver.partnerId}_${now()}`,
        bookingId,
        partnerId: driver.partnerId,
        booking,
        distanceKm: driver.distanceKm,
        status: 'pending',
        createdAt: now(),
        expiresAt: now() + OFFER_TIMEOUT_MS,
        tried: [...tried, driver.partnerId],
    };
    offers.set(offer.id, offer);

    // Báo cho đúng tài xế được mời. App của họ hỏi dòng thông báo vài giây một
    // lần rồi tự rung chuông, nên không phải dán mắt vào màn hình mới biết.
    try {
        // eslint-disable-next-line global-require
        require('./notifications').push({
            audience: 'partner',
            partnerId: driver.partnerId,
            kind: 'ride_offer',
            title: 'Có chuyến mới gần bạn',
            body: `${booking.pickup || 'Điểm đón'} → ${booking.dropoff || 'điểm đến'}`
                + ` · cách ${driver.distanceKm} km`,
            bookingId,
            data: { offer_id: offer.id, distance_km: String(driver.distanceKm) },
        });
    } catch (_) { /* thông báo hỏng thì chuyến vẫn phải nổ bình thường */ }

    return offer;
}

/**
 * Mời tài xế vừa bật nhận đơn các chuyến đang treo.
 * Trả về số chuyến đã đẩy được cho họ.
 */
function offerWaitingTo(partnerId) {
    let sent = 0;
    for (const [bookingId, held] of [...waiting]) {
        if (now() - held.createdAt > WAITING_TTL_MS) { waiting.delete(bookingId); continue; }
        // Tự tay bấm "Bật nhận đơn" là muốn chạy — cho họ cơ hội lại, kể cả
        // chuyến trước đó họ đã lỡ mất vì hết 30 giây.
        const tried = held.tried.filter(id => id !== partnerId);
        // Chỉ mời nếu tài xế này thật sự hợp (đúng loại xe, đủ chỗ, trong bán kính)
        if (!candidatesFor(held.booking, tried).some(d => d.partnerId === partnerId)) continue;
        held.tried = tried;
        if (dispatchNext(bookingId, held.booking, tried)) sent += 1;
    }
    return sent;
}

/**
 * Quét định kỳ: lời mời quá hạn mà tài xế không bấm gì thì đẩy sang người
 * gần tiếp theo, thay vì để chuyến chết lặng.
 */
function sweepExpired() {
    for (const offer of offers.values()) {
        if (offer.status !== 'pending' || offer.expiresAt > now()) continue;
        offer.status = 'expired';
        dispatchNext(offer.bookingId, offer.booking, offer.tried);
    }
    // Tìm quá 10 phút không ai nhận → ngừng tìm, báo khách để họ tự quyết
    for (const [bookingId, held] of [...waiting]) {
        if (now() - held.startedAt < SEARCH_GIVEUP_MS) continue;
        waiting.delete(bookingId);
        abandoned.set(bookingId, {
            bookingId,
            booking: held.booking,
            tried: held.tried,
            rounds: (held.rounds || 0) + 1,
            gaveUpAt: now(),
        });

        // Khách có thể đã tắt trang đi làm việc khác — phải chủ động báo, chứ
        // để họ tự mở lại mới biết là đã trễ mất mười phút.
        try {
            // eslint-disable-next-line global-require
            const notifications = require('./notifications');
            notifications.push({
                audience: 'guest',
                phone: held.booking?.phone || held.booking?.guestPhone,
                kind: 'no_driver',
                title: 'Chưa tìm được tài xế',
                body: 'Sau 10 phút vẫn chưa có tài xế nhận chuyến. Bạn mở đơn để bấm "Tìm lại" nhé.',
                bookingId,
            });
            notifications.push({
                audience: 'admin',
                kind: 'no_driver',
                title: 'Có chuyến không ai nhận',
                body: `${held.booking?.pickup || ''} → ${held.booking?.dropoff || ''}`
                    + ` · ${held.booking?.guestName || ''} · ${held.booking?.phone || ''}`,
                bookingId,
            });
        } catch (_) { /* im lặng, việc chính vẫn phải chạy */ }
    }
    for (const [bookingId, held] of abandoned) {
        if (now() - held.gaveUpAt > WAITING_TTL_MS) abandoned.delete(bookingId);
    }
}

/**
 * Khách bấm "Tìm lại" — tìm lại từ đầu, hỏi lại cả tài xế đã bỏ qua lần trước.
 * Trả về false nếu chuyến này không ở trạng thái chờ tìm.
 */
function retrySearch(bookingId) {
    const held = abandoned.get(bookingId) || waiting.get(bookingId);
    if (!held) return null;
    abandoned.delete(bookingId);
    waiting.set(bookingId, {
        bookingId,
        booking: held.booking,
        tried: [],
        rounds: held.rounds || 0,
        createdAt: held.createdAt || now(),
        startedAt: now(),
    });
    const offer = dispatchNext(bookingId, held.booking, []);
    return { found: Boolean(offer), rounds: (held.rounds || 0) + 1 };
}

/** Chuyến đang treo chờ tài xế — dùng cho trang admin. */
function waitingRides() {
    return [...waiting.values()].map(held => ({
        booking_id: held.bookingId,
        pickup: held.booking.pickup,
        dropoff: held.booking.dropoff,
        vehicle_type: held.booking.vehicleType,
        tried: held.tried.length,
        waiting_seconds: Math.round((now() - held.createdAt) / 1000),
    }));
}

/** Lời mời đang chờ của một tài xế (tự loại bỏ cái đã quá hạn). */
function pendingOffersFor(partnerId) {
    // App tài xế gọi hàm này 3 giây một lần — nhanh hơn bộ quét 5 giây. Nếu ở
    // đây chỉ đánh dấu "hết hạn" rồi thôi, bộ quét sẽ bỏ qua nó (vì không còn
    // ở trạng thái pending) và chuyến rơi vào khoảng trống: không ai nhận, mà
    // cũng không quay lại hàng chờ để mời người khác. Vì vậy phải đẩy tiếp
    // ngay tại đây, đúng như bộ quét vẫn làm.
    const list = [];
    const expired = [];
    for (const offer of offers.values()) {
        if (offer.partnerId !== partnerId) continue;
        if (offer.status !== 'pending') continue;
        if (offer.expiresAt <= now()) {
            offer.status = 'expired';
            expired.push(offer);
            continue;
        }
        list.push(offer);
    }
    for (const offer of expired) {
        dispatchNext(offer.bookingId, offer.booking, offer.tried);
    }
    return list;
}

function getOffer(offerId) {
    return offers.get(offerId) || null;
}

function acceptOffer(offerId, partnerId) {
    const offer = offers.get(offerId);
    if (!offer) return { error: 'OFFER_NOT_FOUND' };
    if (offer.partnerId !== partnerId) return { error: 'NOT_YOUR_OFFER' };
    if (offer.status !== 'pending') return { error: 'OFFER_CLOSED' };
    if (offer.expiresAt <= now()) {
        offer.status = 'expired';
        return { error: 'OFFER_EXPIRED' };
    }
    offer.status = 'accepted';
    waiting.delete(offer.bookingId);     // đã có người chạy, thôi treo
    abandoned.delete(offer.bookingId);
    // Đóng mọi lời mời khác của cùng chuyến này
    for (const other of offers.values()) {
        if (other.bookingId === offer.bookingId && other.id !== offer.id && other.status === 'pending') {
            other.status = 'expired';
        }
    }
    return { offer };
}

/** Từ chối → chuyển ngay cho tài xế gần tiếp theo. */
function declineOffer(offerId, partnerId) {
    const offer = offers.get(offerId);
    if (!offer) return { error: 'OFFER_NOT_FOUND' };
    if (offer.partnerId !== partnerId) return { error: 'NOT_YOUR_OFFER' };
    offer.status = 'declined';
    const next = dispatchNext(offer.bookingId, offer.booking, offer.tried);
    return { next };
}

/** Trạng thái điều phối của một chuyến, dùng cho màn "đang tìm tài xế". */
function statusOf(bookingId) {
    const related = [...offers.values()].filter(o => o.bookingId === bookingId);
    const accepted0 = related.find(o => o.status === 'accepted');

    // Đã tìm đủ 10 phút mà không ai nhận → nói thẳng để khách tự quyết
    if (!accepted0 && abandoned.has(bookingId)) {
        const held = abandoned.get(bookingId);
        return {
            state: 'timeout',
            tried: held.tried.length,
            rounds: held.rounds,
            can_retry: true,
            message: held.tried.length
                ? `Đã hỏi ${held.tried.length} tài xế nhưng chưa ai nhận chuyến này.`
                : 'Chưa có tài xế nào bật nhận đơn quanh điểm đón của bạn.',
        };
    }

    // Đang nằm chờ tài xế bật nhận đơn
    if (!accepted0 && waiting.has(bookingId)) {
        const held = waiting.get(bookingId);
        return {
            state: 'searching',
            tried: held.tried.length,
            seconds_left: Math.max(0, Math.round((held.startedAt + SEARCH_GIVEUP_MS - now()) / 1000)),
            can_retry: false,
        };
    }

    if (!related.length) return { state: 'no_driver', tried: 0, can_retry: true };

    const accepted = accepted0;
    if (accepted) {
        const driver = drivers.get(accepted.partnerId);
        return {
            state: 'accepted',
            partner_id: accepted.partnerId,
            driver_name: driver?.name || '',
            driver_phone: driver?.phone || '',
            plate: driver?.plate || '',
            distance_km: accepted.distanceKm,
            tried: related.length,
        };
    }
    const pending = related.find(o => o.status === 'pending' && o.expiresAt > now());
    if (pending) {
        return {
            state: 'searching',
            seconds_left: Math.max(0, Math.round((pending.expiresAt - now()) / 1000)),
            tried: related.length,
        };
    }
    return { state: 'no_driver', tried: related.length };
}

// Đẩy tiếp lời mời quá hạn — nhịp 5 giây, khớp với vòng poll 4 giây của app
setInterval(sweepExpired, 5 * 1000).unref();

// Dọn lời mời cũ mỗi 5 phút để bộ nhớ không phình
setInterval(() => {
    const cutoff = now() - 60 * 60 * 1000;
    for (const [id, offer] of offers) {
        if (offer.createdAt < cutoff) offers.delete(id);
    }
}, 5 * 60 * 1000).unref();

module.exports = {
    goOnline, goOffline, heartbeat, isOnline, driverOf, onlineDrivers,
    candidatesFor, dispatchNext, offerWaitingTo, waitingRides, retrySearch, pendingOffersFor, getOffer,
    acceptOffer, declineOffer, statusOf,
    OFFER_TIMEOUT_MS, SEARCH_RADIUS_KM, SEARCH_GIVEUP_MS,
};

// ════════════════════════════════════════════════════════════
// BÁM VỊ TRÍ TÀI XẾ TRÊN ĐƯỜNG TỚI ĐÓN
// ════════════════════════════════════════════════════════════
// Tài xế nhận chuyến rồi thì khách cần biết xe đang ở đâu, còn bao xa.
// Vị trí thay đổi từng chục giây nên giữ trong bộ nhớ như trạng thái
// online — ghi xuống cơ sở dữ liệu vừa tốn vừa chẳng ai đọc lại.

/** bookingId -> { partnerId, lat, lng, updatedAt, stage } */
const trips = new Map();

// ── Giữ chuyến qua lần khởi động lại ──────────────────────────
//
// Trước đây chuyến chỉ nằm trong bộ nhớ. Mỗi lần cập nhật web là tài xế đang
// chở khách mất sạch bảng điều khiển: không còn bản đồ, không còn nút "Đã đón
// khách", và app thôi gửi vị trí nên khách cũng mất dấu xe. Giữa đường.
//
// Nên chuyến được ghi xuống đĩa và nạp lại khi máy chủ bật.
//
// Vị trí xe thì KHÔNG ghi mỗi lần: tài xế gửi toạ độ mỗi mươi giây, ghi từng
// lần là đĩa quay suốt mà chẳng để làm gì. Ghi ngay khi trạng thái đổi (bắt
// đầu, đón khách, trả khách) và giãn cách với riêng toạ độ.
const TRIPS_COLL = 'trips';
const GHI_TOA_DO_MOI_MS = 30 * 1000;
let ghiToaDoLanCuoi = 0;

function luuChuyen({ ngay = false } = {}) {
    if (!ngay && Date.now() - ghiToaDoLanCuoi < GHI_TOA_DO_MOI_MS) return;
    ghiToaDoLanCuoi = Date.now();
    try {
        store.writeAll(TRIPS_COLL, [...trips.values()]);
    } catch (err) {
        // Không ghi được thì thôi, chuyến vẫn chạy bình thường trong bộ nhớ.
        console.error('[dispatch] khong luu duoc chuyen:', err.message);
    }
}

/** Nạp lại chuyến còn dang dở khi máy chủ vừa bật. */
function napChuyenDaLuu() {
    try {
        const rows = store.readAll(TRIPS_COLL) || [];
        const nguong = Date.now() - 12 * 60 * 60 * 1000;
        let bo = 0;
        for (const t of rows) {
            // Chuyến quá cũ thì bỏ: tài xế đã về nhà từ lâu, giữ lại chỉ làm
            // khách mở app ra thấy một chuyến ma.
            if (t.stage === 'done' || Number(t.updatedAt || 0) < nguong) { bo++; continue; }
            trips.set(t.bookingId, t);
        }
        if (trips.size || bo) {
            console.log(`[dispatch] nap lai ${trips.size} chuyen dang chay, bo ${bo} chuyen cu`);
        }
    } catch (err) {
        console.error('[dispatch] khong nap duoc chuyen da luu:', err.message);
    }
}

napChuyenDaLuu();

// pickup = đang tới đón · onboard = đã đón khách, đang đi
const TRIP_STAGES = ['pickup', 'onboard', 'done'];

/** Tài xế bắt đầu chạy tới điểm đón. */
function startTrip(bookingId, partnerId, booking) {
    trips.set(bookingId, {
        bookingId,
        partnerId,
        booking,
        stage: 'pickup',
        lat: null,
        lng: null,
        startedAt: now(),
        updatedAt: now(),
    });
    luuChuyen({ ngay: true });
    return trips.get(bookingId);
}

/** Tài xế gửi vị trí hiện tại trong lúc chạy. */
function updateTripLocation(bookingId, partnerId, lat, lng) {
    const trip = trips.get(bookingId);
    if (!trip || trip.partnerId !== partnerId) return null;
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
        trip.lat = lat;
        trip.lng = lng;
    }
    trip.updatedAt = now();
    luuChuyen();
    return trip;
}

/** Đổi chặng: đã đón khách, hoặc đã trả khách. */
function setTripStage(bookingId, partnerId, stage) {
    const trip = trips.get(bookingId);
    if (!trip || trip.partnerId !== partnerId) return null;
    if (!TRIP_STAGES.includes(stage)) return null;
    trip.stage = stage;
    trip.updatedAt = now();
    luuChuyen({ ngay: true });
    if (stage === 'done') {
        setTimeout(() => {
            trips.delete(bookingId);
            luuChuyen({ ngay: true });
        }, 10 * 60 * 1000).unref();
    }
    return trip;
}

/**
 * Vị trí xe cho khách theo dõi. Trả về null nếu chuyến chưa bắt đầu
 * hoặc tài xế mất tín hiệu quá 3 phút (đừng vẽ xe đứng yên giả tạo).
 */
function tripOf(bookingId) {
    const trip = trips.get(bookingId);
    if (!trip) return null;
    const stale = now() - trip.updatedAt > 3 * 60 * 1000;
    const driver = drivers.get(trip.partnerId);
    return {
        stage: trip.stage,
        lat: trip.lat,
        lng: trip.lng,
        stale,
        seconds_since_update: Math.round((now() - trip.updatedAt) / 1000),
        driver_name: driver?.name || '',
        driver_phone: driver?.phone || '',
        plate: driver?.plate || '',
    };
}

/**
 * Chuyến mà tài xế này đang chạy dở, nếu có.
 *
 * Cần thiết vì app tài xế giữ chuyến đang chạy trong bộ nhớ của app: điện
 * thoại hết pin, app bị hệ thống tắt hay tài xế lỡ vuốt tắt là mất sạch bảng
 * điều khiển chuyến — không còn bản đồ, không còn nút "Đã đón khách", và app
 * cũng thôi gửi vị trí cho khách. Máy chủ vẫn giữ chuyến, nên mở app lại là
 * lấy về được.
 */
function activeTripOf(partnerId) {
    for (const trip of trips.values()) {
        if (trip.partnerId === partnerId && trip.stage !== 'done') return trip;
    }
    return null;
}

module.exports.activeTripOf = activeTripOf;
module.exports.startTrip = startTrip;
module.exports.updateTripLocation = updateTripLocation;
module.exports.setTripStage = setTripStage;
module.exports.tripOf = tripOf;
module.exports.TRIP_STAGES = TRIP_STAGES;
