// ============================================================
// Bảy Núi Assistant — kiến thức nền cho chatbot
// ============================================================
// Trước đây toàn bộ bảng giá, danh sách phòng, điểm đến… được VIẾT CỨNG
// trong system prompt ở server.js. Sửa giá trong Firestore là chatbot nói
// sai ngay, mà không ai biết.
//
// Ở đây kiến thức nền được DỰNG LẠI MỖI 5 PHÚT từ đúng những nguồn mà
// REST API đang dùng: phòng trong Firestore, địa điểm/tour/món ăn trong
// content.js, khách sạn đối tác, bảng giá xe, và thời tiết hôm nay.
// Chatbot vì thế trả lời cùng một con số với trang đặt phòng.
// ============================================================

const { PLACES, FOODS } = require('./content');
const { staysNearPlace, findAnyPartner } = require('./partners');
const listings = require('./listings');
const lienhe = require('./lienhe');
const { listDocuments, getDocument } = require('./firestore');
const { getWeather, getOutlook, DEFAULT_LAT, DEFAULT_LNG } = require('./weather');
const { SERVICE_AREAS } = require('./geo');
const { detectIntent, extractDate, extractPartOfDay, WEAK_POINT } = require('./chat-intent');
const events = require('./events');
const pooling = require('./pooling');

/** "2026-08-14" → "14/08". Người Việt đọc ngày trước tháng. */
const dmy = (iso) => {
    const [y, m, d] = String(iso || '').split('-');
    return d ? `${d}/${m}` : String(iso || '');
};

const money = (n) => Number(n || 0).toLocaleString('vi-VN') + 'đ';
const digits = (s) => String(s || '').replace(/[^\d]/g, '');

const BOOKING_STATUS = {
    pending: { vi: 'Chờ bên cung cấp xác nhận', en: 'Waiting for provider confirmation' },
    confirmed: { vi: 'Đã được xác nhận', en: 'Confirmed' },
    completed: { vi: 'Đã hoàn thành', en: 'Completed' },
    cancelled: { vi: 'Đã huỷ', en: 'Cancelled' },
};

/**
 * Đọc đơn gần nhất mà trình duyệt gửi kèm cho chatbot.
 *
 * Không tin dữ liệu giá/trạng thái từ localStorage: chỉ nhận mã document + số
 * điện thoại rồi đọc lại Firestore. Cả hai phải khớp mới trả kết quả, tránh
 * người khác đoán một mã đơn rồi hỏi bot để xem thông tin của khách.
 */
async function bookingForChat(input) {
    const id = String(input?.id || '').trim().slice(0, 100);
    const phone = digits(input?.phone);
    if (!id || phone.length < 9) return null;

    const b = await getDocument('bookings', id);
    if (b && digits(b.phone) !== phone) return null;
    if (!b) return null;

    return {
        id: b.id,
        code: String(b.id).slice(-8).toUpperCase(),
        kind: b.kind || '',
        summary: b.roomName || '',
        status: b.status || 'pending',
        totalPrice: Number(b.totalPrice) || 0,
        checkIn: b.checkIn || '',
        checkOut: b.checkOut || '',
        pickupTime: b.pickupTime || '',
        pickup: b.pickup || '',
        dropoff: b.dropoff || '',
        partnerName: b.partnerName || '',
        paymentStatus: b.paymentStatus || 'unpaid',
    };
}

function isBookingQuestion(message) {
    const q = khongDau(message);
    return /don (toi|cua toi|vua dat|dat)|ma don|trang thai don|don toi dau|huy don|co huy|huy duoc|chinh sach huy|booking status|my booking|just booked|cancel (my|the) booking|can i cancel/.test(q);
}

function bookingKnowledgeBlock(b) {
    if (!b) return '';
    const status = BOOKING_STATUS[b.status]?.vi || b.status;
    return `\n\n═══ ĐƠN GẦN NHẤT CỦA KHÁCH (đã xác minh mã đơn + số điện thoại) ═══\n`
        + `Mã ${b.code}; dịch vụ: ${b.summary || b.kind}; trạng thái: ${status}; `
        + `tổng tiền: ${money(b.totalPrice)}; ngày: ${b.checkIn || 'chưa có'}`
        + (b.checkOut ? ` đến ${b.checkOut}` : '')
        + (b.pickup ? `; tuyến: ${b.pickup} → ${b.dropoff}` : '')
        + (b.partnerName ? `; bên cung cấp: ${b.partnerName}` : '')
        + `. Nếu khách hỏi đơn này, dùng đúng dữ liệu trên; không tự bịa trạng thái mới.`;
}

function bookingAnswer(b, lang = 'vi') {
    const isEn = lang === 'en';
    const status = BOOKING_STATUS[b.status] || { vi: b.status, en: b.status };
    const when = [b.checkIn, b.pickupTime].filter(Boolean).join(' · ');
    if (isEn) {
        return `Your latest booking is **${b.code}** — ${b.summary || b.kind}.\n\n`
            + `Status: **${status.en}**${when ? `\nDate: ${when}` : ''}`
            + `\nTotal: **${money(b.totalPrice)}**\n\n`
            + (['pending', 'confirmed'].includes(b.status)
                ? 'Open “My bookings” to see details or cancel it under the applicable policy.'
                : b.status === 'completed'
                    ? 'The service is complete, so you can now leave a verified review in “My bookings”.'
                    : 'Open “My bookings” for the full timeline.');
    }
    return `Đơn gần nhất của bạn là **${b.code}** — ${b.summary || b.kind}.\n\n`
        + `Trạng thái: **${status.vi}**${when ? `\nNgày: ${when}` : ''}`
        + `\nTổng tiền: **${money(b.totalPrice)}**\n\n`
        + (['pending', 'confirmed'].includes(b.status)
            ? 'Bạn mở “Đơn của tôi” để xem chi tiết hoặc huỷ theo chính sách đang áp dụng.'
            : b.status === 'completed'
                ? 'Dịch vụ đã hoàn thành, bạn có thể vào “Đơn của tôi” để đánh giá chỗ ở/dịch vụ.'
                : 'Bạn mở “Đơn của tôi” để xem toàn bộ tiến trình nhé.');
}

// Giữ đồng bộ với bảng VEHICLES trong lib/api.js
const VEHICLE_PRICES = [
    'Xe máy (xe ôm): 30.000đ + 3.500đ/km',
    'Xe 4 chỗ: 250.000đ + 5.000đ/km',
    'Xe 7 chỗ: 350.000đ + 6.500đ/km',
    'Xe 16 chỗ: 600.000đ + 9.000đ/km',
];

/** Bỏ dấu, dùng để dò tên hàng khi khách gõ không dấu. */
const khongDau = (chuoi) => String(chuoi || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');

/** Tên cơ sở bán, để bot nói được "của ai bán". */
function tenNguoiBan(partnerId) {
    const p = findAnyPartner(partnerId);
    const ten = String(p?.name || '');
    return ten && !ten.includes('@') ? ten : '';
}

/**
 * Đặc sản đang bán — do chính các cơ sở tự đăng và đã được duyệt.
 *
 * Đây là phần bot hay bị hỏi nhất mà trước đây không hề có trong kiến thức
 * nền: chủ shop vừa đăng món mới, khách hỏi ngay thì bot nói "không có".
 */
function dacSanDangBan() {
    try {
        return listings.liveFoods().map(listings.toFoodShape);
    } catch (_) {
        return [];
    }
}

/** Tour do đơn vị lữ hành đối tác tự đăng, đã duyệt. */
function tourDoiTac() {
    try {
        return listings.liveTours().map(listings.toTourShape);
    } catch (_) {
        return [];
    }
}

/** Một dòng mô tả món đặc sản, dùng chung cho kiến thức nền và câu trả lời. */
function dongDacSan(f) {
    const phan = [`${money(f.price)}/${f.unit}`];
    if (f.oldPrice > f.price) phan.push(`giá gốc ${money(f.oldPrice)}, giảm ${f.discount}%`);
    if (f.area) phan.push(f.area);
    if (f.soldOut) phan.push('ĐANG HẾT HÀNG');
    else if (f.stock > 0) phan.push(`còn ${f.stock} ${f.unit}`);
    const ban = tenNguoiBan(f.partnerId);
    return `• ${f.name} — ${phan.join(' · ')}`
        + (ban ? ` (do ${ban} bán)` : '')
        + (f.shipping ? `. Gửi hàng: ${f.shipping}` : '')
        + (f.keeping ? `. Bảo quản: ${f.keeping}` : '');
}

const CACHE_MS = 5 * 60 * 1000;
let cache = { text: '', at: 0 };

/**
 * Vứt bộ nhớ đệm để lần hỏi tới dựng lại từ đầu.
 *
 * Gọi khi danh sách đối tác đổi: duyệt tin mới, sửa giá, gỡ tin. Không có nó
 * thì admin vừa bấm Duyệt, hỏi bot ngay vẫn thấy "chưa có chỗ nào" — đúng về
 * kỹ thuật (đệm chưa hết hạn) nhưng người dùng chỉ thấy là bot sai.
 */
function quenCache() {
    cache = { text: '', at: 0 };
}

/** Danh sách phòng thật do đối tác đã duyệt tự đăng. */
async function liveRooms() {
    return listings.liveStays().map(listings.toStayShape).map(r => ({
        name: r.name || '',
        price: Number(r.price) || 0,
        capacity: Number(r.capacity) || 2,
        status: r.soldOut ? 'booked' : 'available',
        amenities: Array.isArray(r.amenities) ? r.amenities : [],
    })).filter(r => r.name);
}

async function todayWeather(lat = DEFAULT_LAT, lng = DEFAULT_LNG) {
    try {
        const w = await getWeather(lat, lng);
        const today = (w.daily || [])[0];
        return `Hiện tại ${Math.round(w.current.temp)}°C, ${w.current.text_vi}, khả năng mưa ${w.current.rain_probability}%.`
            + (today ? ` Hôm nay ${Math.round(today.temp_min)}–${Math.round(today.temp_max)}°C.` : '');
    } catch (_) {
        return '';
    }
}

/** Dự báo vài ngày tới, để khách hỏi "tuần sau đi có mưa không". */
async function weekAhead(days = 7, lat = DEFAULT_LAT, lng = DEFAULT_LNG) {
    try {
        const outlook = await getOutlook(lat, lng);
        return outlook.days.slice(0, days)
            .map(d => `• ${d.date.slice(8, 10)}/${d.date.slice(5, 7)}: ${d.temp_min}–${d.temp_max}°C, `
                + `mưa ${d.rain_probability}%, ${d.text_vi}`)
            .join('\n');
    } catch (_) {
        return '';
    }
}

/**
 * Khối kiến thức nền, ghép từ dữ liệu thật.
 * Có bộ nhớ đệm 5 phút để không gọi Firestore mỗi tin nhắn.
 */
async function knowledgeBlock() {
    if (cache.text && Date.now() - cache.at < CACHE_MS) return cache.text;

    const [rooms, weather, forecast] = await Promise.all([liveRooms(), todayWeather(), weekAhead()]);

    const upcoming = events.upcomingEvents(6);
    const eventLines = upcoming.length
        ? upcoming.map(e => {
            const range = e.endDate && e.endDate !== e.startDate
                ? `${e.startDate} → ${e.endDate}` : e.startDate;
            return `• ${e.name} (${events.CATEGORY_LABELS[e.category] || 'Sự kiện'}) — ${range}, `
                + `${e.area}. ${e.summary || ''} Vé: ${e.ticket || 'Miễn phí'}`;
        }).join('\n')
        : '• (Hiện chưa có sự kiện nào được đăng)';

    const roomLines = rooms.length
        ? rooms.map(r =>
            `• ${r.name} — ${money(r.price)}/đêm, tối đa ${r.capacity} khách`
            + `${r.amenities.length ? ` (${r.amenities.slice(0, 4).join(', ')})` : ''}`
            + `${r.status !== 'available' ? ' — HIỆN ĐANG KÍN' : ''}`).join('\n')
        : `• (Chưa tải được danh sách phòng — mời khách gọi hotline ${lienhe.HOTLINE})`;

    const placeLines = PLACES.map(p =>
        `• ${p.name} — ${p.category}, ${p.area}. Cách homestay ${p.distanceKm} km, chơi ${p.duration}, vé: ${p.ticket}. `
        + `Nên đi: ${p.bestTime}. Lưu ý: ${p.tips}`).join('\n');

    const tourLines = tourDoiTac().map(t => {
            const ban = tenNguoiBan(t.partnerId);
            return `• ${t.name} — ${money(t.price)}/khách, ${t.duration}, ${t.pax}`
                + `${t.stops ? `. Điểm dừng: ${t.stops}` : ''}`
                + `${t.soldOut ? ' — ĐANG HẾT CHỖ' : ''}`
                + `${ban ? ` (do ${ban} tổ chức)` : ''}`;
        }).join('\n');

    const dacSan = dacSanDangBan();
    const dacSanLines = dacSan.length
        ? dacSan.map(dongDacSan).join('\n')
        : '• (Hiện chưa có cơ sở nào đăng bán đặc sản)';

    const foodLines = FOODS.map(f =>
        `• ${f.name} (${f.cul}) — khoảng ${money(f.price)}. Ăn ở: ${f.where}`).join('\n');

    // Chỗ nghỉ nhóm theo ĐIỂM ĐẾN, kèm khoảng cách thật.
    //
    // Khách gần như luôn hỏi theo kiểu "chỗ nghỉ gần Núi Cấm" chứ không hỏi
    // "có những chỗ nghỉ nào". Đưa sẵn danh sách đã sắp theo khoảng cách thì
    // bot chỉ việc đọc ra, không phải tự suy luận xa gần — mà suy luận là chỗ
    // nó hay bịa nhất.
    //
    // Nguồn là allPartnerStays(): gồm CẢ chỗ nghỉ đối tác tự đăng đã duyệt,
    // không chỉ danh sách mẫu viết cứng như trước.
    const stayLines = PLACES.map((place) => {
        const gan = staysNearPlace(place.slug, { sort: 'near', radiusKm: 25 }).slice(0, 5);
        if (!gan.length) return `▸ Gần ${place.name}: (chưa có đối tác nào trong bán kính 25 km)`;

        const dong = gan.map((s) => {
            const tien = [
                `${s.distanceKm} km`,
                `${money(s.price)}/đêm`,
                `tối đa ${s.capacity} khách`,
                `${s.rating}★`,
            ];
            if (s.amenities && s.amenities.length) tien.push(s.amenities.slice(0, 3).join(', '));
            const tenDoiTac = String(s.partnerName || '');
            const neuTen = tenDoiTac && !tenDoiTac.includes('@') && tenDoiTac !== s.name;
            return `   • ${s.name} — ${tien.join(' · ')}`
                + `${s.soldOut ? ' — ĐANG HẾT PHÒNG' : ''}`
                + `${neuTen ? ` (do ${tenDoiTac} vận hành)` : ''}`;
        }).join('\n');

        return `▸ Gần ${place.name}:\n${dong}`;
    }).join('\n');

    cache = {
        at: Date.now(),
        text: `
═══ DỮ LIỆU THẬT CỦA HỆ THỐNG ═══
📆 HÔM NAY LÀ ${new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}.
Khách nói "ngày mai", "cuối tuần này", "tuần sau" thì tự quy ra ngày cụ thể từ mốc trên.

Mọi con số dưới đây lấy trực tiếp từ hệ thống đặt chỗ. TUYỆT ĐỐI không nói giá khác.

🏠 PHÒNG DO CHÍNH LOCALMATE VẬN HÀNH (chưa gắn toạ độ — KHÔNG được nói phòng nào
"gần" điểm đến nào, trừ khi chính tên phòng ghi rõ):
${roomLines}

🏨 CHỖ NGHỈ CỦA ĐỐI TÁC, XẾP THEO ĐIỂM ĐẾN VÀ KHOẢNG CÁCH THẬT:
(Đây là toàn bộ chỗ nghỉ đang kết nối với LOCALMATE. Khách hỏi "chỗ nghỉ gần X"
thì đọc đúng nhóm của X bên dưới, KHÔNG được nêu tên chỗ nào không có ở đây.)
${stayLines}

🗺 ĐIỂM ĐẾN:
${placeLines}

🎒 TOUR:
${tourLines}

🍜 MÓN ĂN ĐỊA PHƯƠNG (ăn tại chỗ, giá tham khảo ngoài quán):
${foodLines}

🛒 ĐẶC SẢN ĐANG BÁN TRÊN LOCALMATE (khách đặt và giao hàng ngay trên web,
trang "Đặc sản"). Đây là hàng THẬT của các cơ sở đối tác, cập nhật liên tục.
Khách hỏi mua món gì, tìm món gì, có bán gì — chỉ được kể những món dưới đây,
đúng tên và đúng giá. Không có trong danh sách này nghĩa là hiện CHƯA BÁN,
hãy nói thẳng là chưa có thay vì gợi ý một món khác tên:
${dacSanLines}

🚗 GIÁ XE ĐƯA ĐÓN (hệ thống tự tính theo quãng đường thật):
${VEHICLE_PRICES.map(v => `• ${v}`).join('\n')}
Khách đặt xe trên web/app sẽ được báo giá chính xác theo điểm đón. Có cả xe máy cho khách đi một mình.

🌤 THỜI TIẾT NÚI CẤM: ${weather || 'chưa lấy được dự báo lúc này'}

📅 DỰ BÁO 7 NGÀY TỚI (khách hỏi "hôm đó mưa không" thì trả lời bằng đúng bảng này):
${forecast || '• (chưa lấy được dự báo dài ngày)'}

🎉 LỄ HỘI & SỰ KIỆN SẮP TỚI (do Bảy Núi cập nhật, ngày giờ đã kiểm chứng):
${eventLines}
Nếu chuyến của khách trùng ngày lễ hội, hãy nói cho khách biết — đây là điểm đặc sắc nhất của vùng.

🚗 GHÉP CHUYẾN: hai khách lạ đi cùng tuyến, giờ đón lệch nhau dưới ${pooling.TIME_WINDOW_MIN} phút,
điểm đón cách nhau dưới ${pooling.PICKUP_RADIUS_KM} km thì ghép chung một xe, mỗi người rẻ khoảng
${Math.round(pooling.POOL_DISCOUNT * 100)}%. Hệ thống tự báo lúc khách đặt xe, không cần khách tự tìm bạn đi chung.

✨ VIỆC HỆ THỐNG LÀM ĐƯỢC NGAY (hãy chủ động mời khách dùng):
• Tạo lịch trình riêng theo sở thích – số ngày – ngân sách (nút "Tạo lịch trình cho tôi" ở trang chủ)
• Xem trước thời tiết đúng ngày khách định đi, trước khi dựng lịch trình
• Lịch trình tự đổi khi trời mưa: khách đang đi, thấy sắp mưa ở điểm ngoài trời thì hệ thống
  đề xuất đổi sang điểm trong nhà, khách bấm một nút là đổi
• Đặt phòng, đặt tour, đặt xe đưa đón ngay trên web và app
• Đặt xe từ vị trí hiện tại, tài xế gần nhất nhận đơn trong ít phút; có cả ghép chuyến cho rẻ
`.trim(),
    };
    return cache.text;
}

// ── Gợi ý trả lời nhanh theo đúng ý khách vừa hỏi ──
//
// Trước đây khối này là một bảng biểu thức chính quy riêng, quét theo kiểu
// "khớp cái đầu tiên thì lấy". Hai chỗ hỏng thật:
//   - /xe/ khớp luôn vào chữ "xem", nên hỏi "cho mình XEM phòng" lại hiện
//     nguyên bộ nút đặt xe.
//   - Mọi mẫu đều đòi đủ dấu tiếng Việt, mà khách gõ "dat phong" không dấu là
//     chuyện thường — gõ vậy thì rơi hết xuống nút mặc định.
//
// Giờ dùng chung bộ chấm điểm ở chat-intent.js với lớp trả lời offline: nó đã
// bỏ dấu, đã ràng biên từ, và cân nhắc CẢ câu thay vì lấy mẫu khớp sớm nhất.
// Một nguồn sự thật cho cả hai nơi, sửa một lần là cả hai cùng đúng.
const QUICK_BY_INTENT = {
    itinerary: {
        vi: ['Tạo lịch trình cho tôi', 'Gợi ý 2 ngày 1 đêm', 'Đi đâu chơi?'],
        en: ['Create my itinerary', 'Suggest a 2-day trip', 'Where to go?'],
        action: 'open_trip',
    },
    transport: {
        vi: ['Đặt xe ngay', 'Giá xe từ Châu Đốc', 'Có xe máy không?'],
        en: ['Book a ride', 'Fare from Chau Doc', 'Motorbike available?'],
        action: 'open_transport',
    },
    room: {
        vi: ['Đặt phòng ngay', 'Xem tất cả phòng', 'Có ưu đãi gì?'],
        en: ['Book a room', 'See all rooms', 'Any promotions?'],
        action: 'open_rooms',
    },
    tour: {
        vi: ['Xem tour', 'Tour văn hoá Khmer', 'Tour mấy người đi được?'],
        en: ['See tours', 'Khmer culture tour', 'Group size?'],
        action: 'open_tours',
    },
    event: {
        vi: ['Sắp có lễ hội gì?', 'Đua bò khi nào?', 'Tạo lịch trình cho tôi'],
        en: ['Upcoming festivals?', 'When is the bull race?', 'Create my itinerary'],
        action: 'open_trip',
    },
    pool: {
        vi: ['Ghép chuyến thế nào?', 'Đặt xe ngay', 'Giá xe từ Châu Đốc'],
        en: ['How does pooling work?', 'Book a ride', 'Fare from Chau Doc'],
        action: 'open_transport',
    },
    food: {
        vi: ['Có đặc sản gì bán?', 'Món nào phải thử?', 'Ăn ở đâu ngon?'],
        en: ['What is on sale?', 'Must-try dishes', 'Where to eat'],
        action: 'open_food',
    },
    weather: {
        vi: ['Mùa nào đẹp nhất?', 'Nên mang gì?', 'Tạo lịch trình cho tôi'],
        en: ['Best season?', 'What to pack?', 'Create my itinerary'],
    },
    place: {
        vi: ['Núi Cấm có gì?', 'Rừng Tràm Trà Sư', 'Tạo lịch trình cho tôi'],
        en: ['What is on Núi Cấm?', 'Trà Sư cajuput forest', 'Create my itinerary'],
        action: 'open_trip',
    },
    passport: {
        vi: ['Hộ chiếu LOCALMATE là gì?', 'Đóng dấu ở đâu?', 'Đổi quà thế nào?'],
        en: ['What is the Bảy Núi passport?', 'Where to get stamps?', 'How to redeem?'],
    },
    payment: {
        vi: ['Đặt cọc bao nhiêu?', 'Chuyển khoản thế nào?', 'Huỷ có hoàn tiền không?'],
        en: ['How much deposit?', 'How to transfer?', 'Refund on cancel?'],
    },
    contact: {
        vi: ['Số điện thoại', 'Địa chỉ homestay', 'Chỉ đường tới đây'],
        en: ['Phone number', 'Homestay address', 'Directions here'],
    },
};

/**
 * Gợi ý nút bấm dựa trên CÂU HỎI của khách, không phải câu trả lời của bot.
 *
 * Điểm dưới ngưỡng thì trả bộ nút chung — thà chung chung còn hơn đoán sai chủ
 * đề rồi đẩy khách sang trang không liên quan.
 */
function quickRepliesFor(userMessage, lang) {
    const isEn = lang === 'en';

    // Khách gọi thẳng tên một món đang bán ("tìm bánh bò", "gà đốt bao nhiêu")
    // thì đưa nút về trang Đặc sản, đừng đưa nút đặt phòng. Dò theo tên hàng
    // thật chính xác hơn nhiều so với đoán qua từ khoá.
    try {
        if (timHang(userMessage, dacSanDangBan()).length) {
            return {
                quickReplies: isEn
                    ? ['Browse specialties', 'Do you ship it?', 'What else is on sale?']
                    : ['Xem trang Đặc sản', 'Món này gửi đi tỉnh được không?', 'Còn món gì khác?'],
                action: 'open_food',
            };
        }
    } catch (_) { /* kho hang doc loi thi cu di tiep */ }

    const { id, score } = detectIntent(userMessage);
    const rule = score >= WEAK_POINT ? QUICK_BY_INTENT[id] : null;

    if (rule) {
        return { quickReplies: isEn ? rule.en : rule.vi, action: rule.action || null };
    }
    return {
        quickReplies: isEn
            ? ['Create my itinerary', 'See rooms', 'Book a ride']
            : ['Tạo lịch trình cho tôi', 'Xem phòng', 'Đặt xe'],
        action: null,
    };
}

// ════════════════════════════════════════════════════════════
// TRẢ LỜI KHI KHÔNG CÓ GEMINI
// ════════════════════════════════════════════════════════════
// Không có API key, hết quota, hay Gemini trả 503 thì chatbot vẫn phải
// dùng được. Ở đây trả lời bằng chính dữ liệu thật — chậm hơn về câu chữ
// nhưng con số thì luôn đúng, còn hơn là câu "trợ lý đang tạm dừng".

/**
 * Trả lời thời tiết cho ĐÚNG ngày khách hỏi.
 *
 * Dùng bảng dự báo 16 ngày có sẵn. Ngày nằm ngoài bảng thì nói thẳng là chưa
 * dự báo được xa như vậy — không đoán bừa, vì khách dựa vào đó để quyết định
 * có leo núi hay không.
 */
async function weatherAnswer(message, isEn) {
    const wanted = extractDate(message);
    const part = extractPartOfDay(message);
    // Đúng nơi khách hỏi, không mặc định Núi Cấm nữa
    const noi = noiHoiThoiTiet(message);

    try {
        const outlook = await getOutlook(noi.lat, noi.lng);
        const days = outlook?.days || [];

        // Không nói ngày cụ thể → tóm tắt hôm nay và vài ngày tới
        if (!wanted) {
            const w = await getWeather(noi.lat, noi.lng);
            const head = isEn
                ? `Right now at ${noi.ten}: ${Math.round(w.current.temp)}°C, ${w.current.text_en || w.current.text_vi}, rain chance ${w.current.rain_probability}%.`
                : `Hiện tại ở ${noi.ten}: ${Math.round(w.current.temp)}°C, ${w.current.text_vi}, khả năng mưa ${w.current.rain_probability}%.`;
            const next = days.slice(0, 4).map(d =>
                `• ${dmy(d.date)}: ${Math.round(d.temp_min)}–${Math.round(d.temp_max)}°C, mưa ${d.rain_probability}%`).join('\n');
            return `${head}\n\n${isEn ? 'Next days:' : 'Vài ngày tới:'}\n${next}`;
        }

        const hit = days.find(d => d.date === wanted);
        if (!hit) {
            const last = days.length ? dmy(days[days.length - 1].date) : '';
            return isEn
                ? `I only have the forecast up to ${last}, so I can't tell you about ${dmy(wanted)} yet. Ask again closer to the date.`
                : `Mình chỉ có dự báo tới ${last} thôi, nên chưa nói chắc được ngày ${dmy(wanted)}. `
                    + 'Gần ngày đi bạn hỏi lại nhé, lúc đó số liệu mới chính xác.';
        }

        const rain = hit.rain_probability;
        const verdict = rain >= 70
            ? (isEn ? 'very likely to rain' : 'khả năng mưa rất cao')
            : rain >= 40
                ? (isEn ? 'might rain' : 'có thể có mưa')
                : (isEn ? 'likely dry' : 'nhiều khả năng không mưa');

        const partNote = part
            ? ` Dự báo theo ngày nên chưa tách riêng được buổi ${part}, nhưng cả ngày ${verdict}.`
            : '';

        const advice = rain >= 70
            ? (isEn
                ? ' Bring a raincoat, and consider indoor spots like the Khmer pagodas.'
                : ' Bạn mang theo áo mưa nhé. Hôm đó nên ưu tiên điểm có mái che như chùa Khmer, và để dành Trà Sư hay Vồ Bồ Hong cho ngày nắng.')
            : '';

        return isEn
            ? `On ${dmy(hit.date)} at ${noi.ten}: ${Math.round(hit.temp_min)}–${Math.round(hit.temp_max)}°C, rain chance ${rain}% — ${verdict}.${partNote}${advice}`
            : `Ngày ${dmy(hit.date)} ở ${noi.ten}: ${Math.round(hit.temp_min)}–${Math.round(hit.temp_max)}°C, `
                + `khả năng mưa ${rain}% — ${verdict}.${partNote}${advice}`;
    } catch (_) {
        return '';
    }
}

/**
 * Dò tên hàng trong câu hỏi.
 *
 * Khách gõ "tìm bánh ú", "có bán bánh bò không", "gà đốt bao nhiêu" — bỏ mấy
 * chữ đệm đi thì còn đúng tên món. So khớp sau khi bỏ dấu để "banh bo" cũng ra.
 *
 * Chỉ nhận từ khoá từ 3 ký tự trở lên: hai ký tự thì "ga" khớp luôn vào
 * "Gạo", "Gà", "Ngan"… nhiều quá thành nhiễu.
 */
const CHU_DEM = new Set(('tim kiem co ban khong con mua muon toi minh anh chi em cho hoi la gi '
    + 'nao the vay a bao nhieu gia tien mot cai o dau nay do duoc khong shop cua ban '
    + 'do an mon san pham hang dat order search find any have want buy the a an is are '
    + 'do you got price how much where sell selling me i').split(' '));

function timHang(message, nguon) {
    const tu = khongDau(message)
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(t => t.length >= 3 && !CHU_DEM.has(t));
    if (!tu.length) return [];

    // Chỉ tính là khớp khi từ khoá nằm trong TÊN món. Trước đây dò cả phần
    // mô tả, nên hỏi "bánh bò" lại ra một homestay chỉ vì bài giới thiệu của
    // nó có nhắc tới bánh — khách đọc xong tưởng bot không hiểu gì.
    return nguon
        .map(item => {
            const ten = khongDau(item.name || '');
            const them = khongDau(`${item.area || ''} ${item.description || ''}`);
            const trungTen = tu.filter(t => ten.includes(t)).length;
            return { item, diem: trungTen * 3 + tu.filter(t => them.includes(t)).length, trungTen };
        })
        .filter(x => x.trungTen > 0)
        .sort((a, b) => b.diem - a.diem)
        .map(x => x.item);
}

/**
 * Khách đang hỏi thời tiết ở ĐÂU.
 *
 * Trước đây mọi câu hỏi thời tiết đều trả về dự báo đo ở Núi Cấm, rồi bot tự
 * viết thêm một mối liên hệ không có thật: "An Giang, cụ thể là Núi Cấm, gần
 * Phường Bình Đức, Long Xuyên". Núi Cấm cách Long Xuyên khoảng 60 km — trời
 * hai nơi khác nhau thật, và "gần" là bịa.
 *
 * Dò theo hai bảng đã có toạ độ thật: các khu vực phục vụ (Long Xuyên, Châu
 * Đốc, Tri Tôn…) và các điểm đến (Núi Cấm, Trà Sư, Mũi Cà Mau…). Tên dài dò
 * trước tên ngắn để "Tịnh Biên" không bị "Biên" nào đó cướp mất.
 */
function noiHoiThoiTiet(message) {
    const q = khongDau(message);

    // Tên trong dữ liệu hay có phần đuôi: "Núi Cấm — Thiên Cấm Sơn",
    // "Núi Cấm – An Hảo". Khách chỉ gõ "núi cấm", nên phải dò cả phần đầu
    // trước dấu gạch hay dấu phẩy, không thì không khớp được câu nào.
    const khoaCua = (ten) => {
        const day = String(ten || '');
        const dau = day.split(/[—–\-,·]/)[0].trim();
        const ra = dau && dau !== day ? [day, dau] : [day];

        // Thêm hai chữ cuối: tên hay có phần loại ở đầu — "Rừng tràm Trà Sư",
        // "Vườn quốc gia Tràm Chim", "Chợ nổi Cái Răng" — mà khách chỉ gõ
        // phần riêng: "trà sư", "tràm chim", "cái răng".
        const tu = dau.split(/\s+/);
        if (tu.length > 2) {
            const duoi = tu.slice(-2).join(' ');
            if (duoi.length >= 5) ra.push(duoi);
        }
        return ra;
    };

    const bang = [];
    const them = (ten, hien, lat, lng) => {
        if (lat == null || lng == null) return;
        khoaCua(ten).forEach(k => bang.push({ ten: hien, tim: k, lat, lng }));
    };
    SERVICE_AREAS.forEach(a =>
        them(a.name, a.name.split(/[—–\-,·]/)[0].trim() + (a.province ? ', ' + a.province : ''),
             a.lat, a.lng));
    PLACES.forEach(p => them(p.name, p.name.split(/[—–\-,·]/)[0].trim(), p.lat, p.lng));

    bang.sort((a, b) => b.tim.length - a.tim.length);

    for (const x of bang) {
        if (q.includes(khongDau(x.tim))) return { ten: x.ten, lat: x.lat, lng: x.lng, nhanRa: true };
    }
    return { ten: 'Núi Cấm', lat: DEFAULT_LAT, lng: DEFAULT_LNG, nhanRa: false };
}

/**
 * Khối thời tiết cho ĐÚNG nơi khách vừa hỏi, ghép thêm vào lời nhắc gửi cho
 * mô hình. Kiến thức nền dựng sẵn 5 phút một lần nên không thể theo từng câu
 * hỏi — khối này bù đúng chỗ đó.
 */
async function thoiTietCho(message) {
    if (detectIntent(message).id !== 'weather') return '';
    const noi = noiHoiThoiTiet(message);
    try {
        const [w, outlook] = await Promise.all([
            getWeather(noi.lat, noi.lng),
            getOutlook(noi.lat, noi.lng),
        ]);
        const ngay = (outlook?.days || []).slice(0, 7)
            .map(d => `• ${dmy(d.date)}: ${Math.round(d.temp_min)}–${Math.round(d.temp_max)}°C, `
                + `mưa ${d.rain_probability}%, ${d.text_vi}`)
            .join('\n');
        return `\n\n═══ THỜI TIẾT ĐO TẠI ${noi.ten.toUpperCase()} ═══\n`
            + `Khách vừa hỏi về thời tiết. Số liệu dưới đây đo ĐÚNG TẠI ${noi.ten}, `
            + `không phải nơi khác. Khi trả lời hãy nói rõ đây là dự báo cho ${noi.ten}.\n`
            + `Hiện tại: ${Math.round(w.current.temp)}°C, ${w.current.text_vi}, `
            + `khả năng mưa ${w.current.rain_probability}%.\n${ngay}\n`
            + `TUYỆT ĐỐI không nói nơi này "gần" hay "thuộc" một nơi khác nếu không chắc — `
            + `chỉ đọc đúng tên ở trên.`;
    } catch (_) {
        return '';
    }
}

async function offlineAnswer(message, lang) {
    const q = String(message || '').toLowerCase();
    const isEn = lang === 'en';

    // Đoán ý TRƯỚC khi dò từ khoá.
    //
    // Trước đây các nhánh dưới chạy theo kiểu "khớp cái nào trước lấy cái đó",
    // nên câu "thời tiết ngày 14/8 ở NÚI Cấm có mưa không" đụng nhánh địa điểm
    // trước (vì có chữ "núi") và bot trả về danh sách điểm tham quan — sai
    // hoàn toàn, dù dữ liệu thời tiết nằm ngay trong tay.
    const intent = detectIntent(message);

    if (intent.id === 'weather') {
        const answer = await weatherAnswer(message, isEn);
        if (answer) return answer;
    }

    // Phòng và giá phòng
    if (/phòng|giá phòng|bao nhiêu.*(đêm|phòng)|room|rate|price/.test(q)) {
        const rooms = await liveRooms();
        if (rooms.length) {
            const lines = rooms.map(r =>
                `• ${r.name} — ${money(r.price)}/đêm, tối đa ${r.capacity} khách`
                + (r.status !== 'available' ? ' (đang kín)' : '')).join('\n');
            return isEn
                ? `Here are our rooms:\n${lines}\n\nYou can book directly on the Rooms page. How many guests are you?`
                : `Homestay hiện có các phòng sau:\n${lines}\n\nBạn đặt thẳng ở trang Phòng nghỉ là được nhé. Đoàn mình mấy người ạ?`;
        }
    }

    // Gợi ý hành trình
    if (/lịch trình|hành trình|nên đi đâu|đi mấy ngày|chơi gì|itinerary|where to go/.test(q)) {
        return isEn
            ? 'Tell me how many days, how many people and your budget — the "Create my itinerary" box on the home page builds a full day-by-day plan with real prices, and every stop has a booking button.'
            : 'Bạn bấm "Tạo lịch trình cho tôi" ở trang chủ nhé — chọn sở thích, số ngày và ngân sách là hệ thống dựng ra lịch trình từng giờ, kèm nút đặt xe và giữ phòng cho từng điểm. Bạn định đi mấy ngày ạ?';
    }

    // Xe đưa đón
    if (/xe|đưa đón|taxi|xe ôm|di chuyển|transport|ride|pick.?up/.test(q)) {
        return isEn
            ? `Transport fares:\n${VEHICLE_PRICES.map(v => `• ${v}`).join('\n')}\n\nEnter your pickup point on the site and we'll quote the exact fare, then the nearest driver takes the trip.`
            : `Giá xe đưa đón:\n${VEHICLE_PRICES.map(v => `• ${v}`).join('\n')}\n\nBạn nhập điểm đón trên web là hệ thống báo giá chính xác theo quãng đường, rồi tài xế gần bạn nhất sẽ nhận chuyến. Bạn đi từ đâu ạ?`;
    }

    // Điểm đến
    if (/điểm|tham quan|chỗ nào|địa điểm|núi|chùa|hồ|rừng|place|visit|attraction/.test(q)) {
        const lines = PLACES.slice(0, 4).map(p =>
            `• ${p.name} — cách homestay ${p.distanceKm} km, chơi ${p.duration}, vé ${p.ticket}`).join('\n');
        return isEn
            ? `Nearby highlights:\n${lines}\n\nWant me to build a day-by-day plan around these?`
            : `Mấy chỗ đáng đi quanh đây:\n${lines}\n\nBạn muốn mình dựng luôn lịch trình đi mấy chỗ này không?`;
    }

    // Đặc sản đang bán — dò theo đúng tên món khách hỏi.
    //
    // Phải đứng trước nhánh "ẩm thực" bên dưới: nhánh đó chỉ đọc danh sách
    // món ăn viết cứng, nên hỏi "có bán bánh bò không" sẽ nhận về một bài
    // giới thiệu ẩm thực vùng, còn món đang bán thật thì không ai nhắc tới.
    const dacSan = dacSanDangBan();
    const trung = timHang(message, dacSan);
    if (trung.length) {
        const lines = trung.slice(0, 6).map(dongDacSan).join('\n');
        return isEn
            ? `Here is what we have on sale right now:\n${lines}\n\nYou can order these on the Specialties page.`
            : `Đang bán mấy món này bạn nhé:\n${lines}\n\nBạn đặt thẳng ở trang Đặc sản là được, mình giao tận nơi.`;
    }
    if (/đặc sản|dac san|mua|đặt hàng|giao hàng|specialt|souvenir/.test(q)) {
        if (!dacSan.length) {
            return isEn
                ? 'No specialty is listed for sale at the moment. New shops are added regularly, do check back.'
                : 'Hiện chưa có cơ sở nào đăng bán đặc sản trên hệ thống. Các shop mới được duyệt liên tục, bạn ghé lại sau nhé.';
        }
        const lines = dacSan.slice(0, 8).map(dongDacSan).join('\n');
        return isEn
            ? `Specialties on sale:\n${lines}`
            : `Đặc sản đang bán trên LOCALMATE:\n${lines}\n\nBạn muốn đặt món nào để mình hướng dẫn?`;
    }

    // Ẩm thực
    if (/ăn|món|quán|food|eat|dish/.test(q)) {
        const lines = FOODS.map(f => `• ${f.name} (${f.cul}) — khoảng ${money(f.price)}, ăn ở ${f.where}`).join('\n');
        return isEn
            ? `Local dishes worth trying:\n${lines}`
            : `Mấy món nhất định phải thử:\n${lines}\n\nBạn thích món mặn hay món ngọt để mình gợi ý thêm?`;
    }

    // Lễ hội
    if (/lễ hội|sự kiện|đua bò|sen đôlta|chôl chnăm|ok om bok|festival|event/.test(q)) {
        const upcoming = events.upcomingEvents(5);
        if (upcoming.length) {
            const lines = upcoming.map(e => {
                const range = e.endDate && e.endDate !== e.startDate
                    ? `${e.startDate} → ${e.endDate}` : e.startDate;
                return `• ${e.name} — ${range}, ${e.area}. ${e.summary || ''}`;
            }).join('\n');
            return isEn
                ? `Upcoming events around Bay Nui:\n${lines}`
                : `Lễ hội và sự kiện sắp tới ở Bảy Núi:\n${lines}\n\nBạn định đi ngày nào để mình xem có trúng dịp nào không?`;
        }
        return isEn
            ? `No events are listed at the moment. Call ${lienhe.HOTLINE} for the latest.`
            : `Hiện chưa có sự kiện nào được đăng. Bạn gọi hotline ${lienhe.HOTLINE} để hỏi lịch mới nhất nhé.`;
    }

    // Ghép chuyến
    if (/ghép chuyến|đi chung|chia tiền xe|share|pool|carpool/.test(q)) {
        return isEn
            ? `If another guest travels the same route within ${pooling.TIME_WINDOW_MIN} minutes of you, `
                + `we pair you up and each pays about ${Math.round(pooling.POOL_DISCOUNT * 100)}% less. `
                + 'The system checks automatically when you book a ride.'
            : `Nếu có khách khác đi cùng tuyến, giờ đón lệch dưới ${pooling.TIME_WINDOW_MIN} phút, `
                + `hệ thống sẽ tự đề nghị ghép chuyến — mỗi người rẻ khoảng ${Math.round(pooling.POOL_DISCOUNT * 100)}%. `
                + 'Bạn cứ đặt xe bình thường, có ai ghép được là mình báo ngay. Bạn đi ngày nào, mấy giờ ạ?';
    }

    // Thời tiết — có cả dự báo dài ngày.
    //
    // Nhánh này trước đây LUÔN đọc số của Núi Cấm, kể cả khi khách hỏi rõ một
    // nơi khác. Giờ dùng chung phép dò nơi với nhánh trên, và nói rõ tên nơi.
    if (/thời tiết|mưa|nắng|nhiệt độ|weather|rain|temperature|tuần sau|ngày mai/.test(q)) {
        const noi = noiHoiThoiTiet(message);
        const [w, ahead] = await Promise.all([
            todayWeather(noi.lat, noi.lng),
            weekAhead(5, noi.lat, noi.lng),
        ]);
        if (isEn) return `Weather at ${noi.ten}: ${w || 'not available right now'}

${ahead}`;
        return `Thời tiết ${noi.ten}: ${w || 'hiện chưa lấy được dự báo'}

`
            + `Mấy ngày tới:
${ahead || '(chưa lấy được dự báo dài ngày)'}

`
            + 'Mùa khô (tháng 11–4) leo núi đẹp nhất, mùa nước nổi (tháng 8–11) thì Trà Sư đẹp nhất bạn nhé.';
    }

    // Tour
    if (/tour|trọn gói|hướng dẫn viên|guide/.test(q)) {
        const lines = tourDoiTac()
            .map(t => `• ${t.name} — ${money(t.price)}/khách, ${t.duration}, ${t.pax}`
                + (t.soldOut ? ' (hết chỗ)' : '')).join('\n');
        return isEn ? `Our tours:\n${lines}` : `Các tour đang có:\n${lines}\n\nBạn muốn đi mấy ngày để mình gợi ý tour hợp nhất?`;
    }

    // Chưa khớp nhánh nào thì thử coi khách có đang hỏi tên một thứ đang bán
    // không — chỗ nghỉ, tour hay đặc sản. Thà đọc đúng thứ khách hỏi còn hơn
    // trả về câu giới thiệu chung chung.
    let khac = [];
    try {
        khac = timHang(message, [
            ...listings.liveStays().map(listings.toStayShape),
            ...tourDoiTac(),
        ]);
    } catch (_) { /* kho hang doc loi thi bo qua */ }
    if (khac.length) {
        const lines = khac.slice(0, 5).map(x =>
            `• ${x.name} — ${money(x.price)}${x.capacity ? `/đêm, tối đa ${x.capacity} khách` : '/khách'}`
            + (x.area ? ` · ${x.area}` : '')
            + (x.soldOut ? ' — đang hết chỗ' : '')).join('\n');
        return isEn
            ? `These match what you asked for:\n${lines}`
            : `Mình tìm được mấy chỗ này khớp với câu bạn hỏi:\n${lines}\n\nBạn muốn xem kỹ cái nào ạ?`;
    }

    return isEn
        ? 'I can help with stays, tours, transport, local specialties on sale and building a day-by-day itinerary across the Mekong Delta. What would you like to know?'
        : 'Mình hỗ trợ về chỗ nghỉ, tour, xe đưa đón, đặc sản đang bán và dựng lịch trình cho chuyến đi miền Tây. Bạn muốn hỏi gì ạ?';
}

module.exports = {
    knowledgeBlock, quenCache, quickRepliesFor, offlineAnswer, dacSanDangBan,
    thoiTietCho, noiHoiThoiTiet, bookingForChat, isBookingQuestion,
    bookingKnowledgeBlock, bookingAnswer,
};
