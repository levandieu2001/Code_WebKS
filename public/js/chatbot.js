// ============================================
// LOCALMATE - Smart Chatbot Widget
// Multilingual, 30+ intents, rich responses
// ============================================
(function () {
'use strict';

const BOT_NAME = 'Trợ lý LOCALMATE';
const BOT_AVATAR = 'assets/chatbot.png';
// 18 giay, khong phai 3.
//
// Bat sau 3 giay la chao khi khach chua kip doc xong tieu de, va tren dien
// thoai thi no de len dung o tim kiem. 18 giay la luc nguoi ta co the dang
// thuc su phan van — chao dung luc thi giup duoc, chao som qua thi chi lam
// vuong tay.
const WELCOME_DELAY = 18000;
// Tat roi thi thoi, dung bat lai moi lan vao trang. Phien qua thi khach tat
// luon ca tro ly, mat ca cai co ich.
const WELCOME_KEY = 'baynui_chat_bubble_off';
const WELCOME_HIDE_AFTER = 14000;
const TYPING_MIN = 600, TYPING_MAX = 1500;

// ── KNOWLEDGE ──
const K = {
    rooms: [
        { name: 'Phòng Sun-view Núi Cấm', nameEn: 'Mountain View Room', price: 850000, amenities: 'WiFi, ban công, điều hòa, nước nóng', desc: 'View núi tuyệt đẹp, ban công riêng', descEn: 'Stunning mountain views, private balcony' },
        { name: 'Bungalow Ven Suối', nameEn: 'Riverside Bungalow', price: 1200000, amenities: 'WiFi, bồn tắm, view suối, quạt trần', desc: 'Bungalow gỗ bên suối, cực thư giãn', descEn: 'Wooden bungalow by stream, very relaxing' },
        { name: 'Phòng Family Tà Pạ', nameEn: 'Family Suite', price: 1800000, amenities: 'WiFi, bếp nhỏ, 2 giường, điều hòa', desc: 'Rộng rãi cho gia đình, đầy đủ tiện nghi', descEn: 'Spacious for families, full amenities' }
    ],
    // Ban du phong khi khong goi duoc may chu. Nguon that nam o lib/lienhe.js,
    // doi so thi nho doi ca o day.
    phone: '0833 385 601', email: 'mrdieu37@gmail.com',
    address: 'Phường Bình Đức, Long Xuyên, An Giang',
    checkin: '14:00', checkout: '12:00'
};

function fmtVND(n) { return n.toLocaleString('vi-VN') + 'đ'; }

// ── LANGUAGE DETECTION ──
function detectLang(t) {
    const hasVi = /[àáạảãâầấẫẩậăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(t);
    const enWords = /\b(hi|hello|hey|how|what|where|when|can|could|do|does|is|are|the|rooms?|books?|prices?|checks?|need|want|please|thanks?|available|much|would|get|help|about|have|any|your|my|this|that|more|show|see|tell|give|cost|near|visit|explore|contact|pay|cancel|family|couple|cheap|budget|weather|pet|group|safe|swim|cook|night|food|breakfast|airport|taxi|laundry|massage|spa|yoga|discount|promo)s?\b/i;
    const hasEn = enWords.test(t);
    // Return detected language with confidence
    if (hasVi && !hasEn) return { lang: 'vi', strong: true };
    if (hasEn && !hasVi) return { lang: 'en', strong: true };
    if (hasVi && hasEn) return { lang: 'vi', strong: true }; // Mixed = Vietnamese
    return { lang: null, strong: false }; // Can't determine
}

// ── INTENT MATCHING ──
function matchIntent(text) {
    const o = text.toLowerCase();
    const patterns = [
        ['greeting',     /^(hi|hello|hey|chao|xin chao|chào|xin chào|alo)\b/i],
        ['rooms',        /phong|room|book|dat phong|đặt phòng|đặt|accommodation|stay|loai phong|loại phòng|type/i],
        ['price',        /gia|price|cost|bao nhieu|bảo nhiêu|bao nhiêu|how much|rate|chi phi|chi phí/i],
        ['promo',        /uu dai|khuyen mai|giam gia|ưu đãi|khuyến mãi|giảm giá|discount|promo|offer|deal|combo|voucher|coupon/i],
        ['amenities',    /tien nghi|wifi|ho boi|hồ bơi|pool|dieu hoa|điều hòa|air con|nong lanh|nóng lạnh/i],
        ['breakfast',    /an sang|ăn sáng|breakfast|bua sang|bữa sáng|meal|food|do an|đồ ăn|nha hang|nhà hàng|restaurant/i],
        ['explore',      /kham pha|khám phá|tour|tham quan|dia diem|địa điểm|explore|visit|tra su|trà sư|nui cam|núi cấm|camping|chua lau|chùa lầu|cong troi|cổng trời/i],
        ['checkinout',   /check.?in|check.?out|nhan phong|nhận phòng|tra phong|trả phòng|gio|giờ/i],
        ['cancel',       /huy|hủy|cancel|refund|hoan tien|hoàn tiền|doi lich|đổi lịch|change|reschedule/i],
        ['contact',      /lien he|liên hệ|contact|so dien thoai|số điện thoại|phone|email|dia chi|địa chỉ|address/i],
        ['family',       /gia dinh|gia đình|family|tre em|trẻ em|kid|child|children|em be|em bé/i],
        ['couple',       /cap doi|cặp đôi|couple|honeymoon|tuan trang mat|tuần trăng mật|romantic|lang mang|lãng mạn|valentine/i],
        ['availability', /con phong|còn phòng|available|trong|trống|vacancy|slot/i],
        ['thanks',       /cam on|cảm ơn|thank|thanks|thankful/i],
        ['transport',    /di den|đi đến|duong di|đường đi|xe|transport|taxi|grab|how to get|san bay|sân bay|airport|bus|shuttle/i],
        ['weather',      /thoi tiet|thời tiết|weather|mua nao|mùa nào|best time|khi hau|khí hậu|mua mua|mùa mưa|season/i],
        ['pet',          /thu cung|thú cưng|pet|cho|chó|meo|mèo|dog|cat|animal/i],
        ['group',        /nhom|nhóm|group|team|cong ty|công ty|corporate|team.?building|event|su kien|sự kiện|party|tiec|tiệc/i],
        ['photo',        /chup anh|chụp ảnh|photo|instagram|selfie|check.?in spot|song ao|sống ảo|beautiful spot/i],
        ['safety',       /an toan|an toàn|safe|security|benh vien|bệnh viện|hospital|pharmacy|atm|emergency|khan cap|khẩn cấp/i],
        ['laundry',      /giat|giặt|laundry|wash|iron|la|ủi|ironing/i],
        ['swim',         /boi|bơi|swim|pool|ho boi|hồ bơi|suoi|suối|stream|tam|tắm/i],
        ['cook',         /nau an|nấu ăn|cook|kitchen|bep|bếp|bbq|nuong|nướng|lau|lẩu/i],
        ['spa',          /spa|massage|the|thể|relax|thu gian|thư giãn|sauna|yoga/i],
        ['festival',     /le hoi|lễ hội|festival|tet|tết|holiday|mua nuoc noi|mùa nước nổi|event/i],
        ['budget',       /ngan sach|ngân sách|budget|re|rẻ|cheap|affordable|tiet kiem|tiết kiệm|economical/i],
        ['payment',      /thanh toan|thanh toán|payment|pay|tra tien|trả tiền|chuyen khoan|chuyển khoản|visa|mastercard|cash|tien mat|tiền mặt/i],
        ['luggage',      /hanh ly|hành lý|luggage|baggage|gui do|gửi đồ|storage|locker/i],
        ['night',        /dem|đêm|night|toi|tối|evening|lua trai|lửa trại|campfire|star|sao|ngam sao|ngắm sao/i],
        ['bye',          /bye|tam biet|tạm biệt|goodbye|see you|hen gap|hẹn gặp/i],
    ];
    for (const [intent, rx] of patterns) { if (rx.test(o)) return intent; }
    return 'unknown';
}

// ── RESPONSES ──
function respond(text) {
    const det = detectLang(text);
    const lang = det.lang || 'vi';
    const intent = matchIntent(text);
    const en = lang === 'en';
    const R = RESPONSES[intent] || RESPONSES.unknown;
    const msg = en ? R.en : R.vi;
    let qr = en ? (QR_EN[intent] || QR_EN.unknown) : (QR_VI[intent] || QR_VI.unknown);
    return { message: msg, quickReplies: qr };
}

const QR_VI = {
    greeting: ['Xem phòng', 'Giá phòng', 'Ưu đãi', 'Khám phá'],
    rooms: ['Xem giá', 'Còn phòng?', 'Ưu đãi'], price: ['Đặt phòng', 'Ưu đãi', 'Xem phòng'],
    promo: ['Đặt phòng', 'Xem phòng', 'Liên hệ'], unknown: ['Xem phòng', 'Ưu đãi', 'Khám phá', 'Liên hệ'],
    explore: ['Đặt phòng', 'Liên hệ'], contact: ['Xem phòng', 'Ưu đãi'],
    checkinout: ['Đặt phòng', 'Xem phòng'], cancel: ['Liên hệ', 'Xem phòng'],
    family: ['Đặt phòng', 'Ưu đãi'], couple: ['Đặt phòng', 'Ưu đãi'],
    availability: ['Đặt phòng', 'Xem giá'], thanks: [], bye: [],
    amenities: ['Xem phòng', 'Đặt phòng'], breakfast: ['Xem phòng', 'Ưu đãi'],
    transport: ['Đặt phòng', 'Liên hệ'], weather: ['Đặt phòng', 'Khám phá'],
    pet: ['Xem phòng', 'Liên hệ'], group: ['Liên hệ', 'Xem phòng'],
    photo: ['Khám phá', 'Đặt phòng'], safety: ['Liên hệ', 'Đặt phòng'],
    laundry: ['Xem phòng'], swim: ['Khám phá', 'Đặt phòng'], cook: ['Đặt phòng', 'Khám phá'],
    spa: ['Đặt phòng', 'Liên hệ'], festival: ['Đặt phòng', 'Khám phá'],
    budget: ['Xem giá', 'Ưu đãi'], payment: ['Đặt phòng', 'Liên hệ'],
    luggage: ['Đặt phòng'], night: ['Khám phá', 'Đặt phòng'],
};
const QR_EN = {
    greeting: ['View rooms', 'Prices', 'Promotions', 'Explore'],
    rooms: ['Check price', 'Availability', 'Promotions'], price: ['Book now', 'Promotions', 'Rooms'],
    promo: ['Book now', 'Rooms', 'Contact'], unknown: ['View rooms', 'Promotions', 'Explore', 'Contact'],
    explore: ['Book now', 'Contact'], contact: ['View rooms', 'Promotions'],
    checkinout: ['Book now', 'Rooms'], cancel: ['Contact', 'Rooms'],
    family: ['Book now', 'Promotions'], couple: ['Book now', 'Promotions'],
    availability: ['Book now', 'Prices'], thanks: [], bye: [],
    amenities: ['View rooms', 'Book now'], breakfast: ['View rooms', 'Promotions'],
    transport: ['Book now', 'Contact'], weather: ['Book now', 'Explore'],
    pet: ['View rooms', 'Contact'], group: ['Contact', 'Rooms'],
    photo: ['Explore', 'Book now'], safety: ['Contact', 'Book now'],
    laundry: ['View rooms'], swim: ['Explore', 'Book now'], cook: ['Book now', 'Explore'],
    spa: ['Book now', 'Contact'], festival: ['Book now', 'Explore'],
    budget: ['Prices', 'Promotions'], payment: ['Book now', 'Contact'],
    luggage: ['Book now'], night: ['Explore', 'Book now'],
};

const RESPONSES = {
    greeting: {
        vi: `Chào bạn! 😊 Mình là trợ lý ảo của **LOCALMATE**.\n\nMình có thể giúp bạn:\n• Tư vấn & đặt phòng\n• Giới thiệu điểm khám phá\n• Thông tin ưu đãi, combo\n• Hỗ trợ mọi thắc mắc\n\nBạn cần mình hỗ trợ gì ạ?`,
        en: `Hello! 😊 I'm the virtual assistant of **LOCALMATE**.\n\nI can help you with:\n• Room consultation & booking\n• Nearby destinations\n• Promotions & combos\n• Any questions\n\nHow can I help you today?`
    },
    rooms: {
        vi: `Homestay có **3 loại phòng**:\n\n🏔 **${K.rooms[0].name}** — **${fmtVND(K.rooms[0].price)}/đêm**\n${K.rooms[0].desc}\n\n🌊 **${K.rooms[1].name}** — **${fmtVND(K.rooms[1].price)}/đêm**\n${K.rooms[1].desc}\n\n👨‍👩‍👧‍👦 **${K.rooms[2].name}** — **${fmtVND(K.rooms[2].price)}/đêm**\n${K.rooms[2].desc}\n\nBạn quan tâm phòng nào? 🌿`,
        en: `We have **3 room types**:\n\n🏔 **${K.rooms[0].nameEn}** — **${fmtVND(K.rooms[0].price)}/night**\n${K.rooms[0].descEn}\n\n🌊 **${K.rooms[1].nameEn}** — **${fmtVND(K.rooms[1].price)}/night**\n${K.rooms[1].descEn}\n\n👨‍👩‍👧‍👦 **${K.rooms[2].nameEn}** — **${fmtVND(K.rooms[2].price)}/night**\n${K.rooms[2].descEn}\n\nWhich one interests you? 🌿`
    },
    price: {
        vi: `💰 **Bảng giá phòng:**\n\n• Sun-view Núi Cấm: **850.000đ/đêm**\n• Bungalow Ven Suối: **1.200.000đ/đêm**\n• Family Tà Pạ: **1.800.000đ/đêm**\n\n🎁 **Ưu đãi:** Đặt 7 đêm giảm 10% • Đặt sớm 15 ngày giảm 5%\n\nBạn muốn đặt ngày nào? 😊`,
        en: `💰 **Room Rates:**\n\n• Mountain View: **850,000 VND/night** (~$35)\n• Riverside Bungalow: **1,200,000 VND/night** (~$50)\n• Family Suite: **1,800,000 VND/night** (~$75)\n\n🎁 **Offers:** 10% off 7-night stays • 5% early bird\n\nWhen would you like to visit? 😊`
    },
    promo: {
        vi: `🎉 **Ưu đãi hiện có:**\n\n🔥 Đặt 7 đêm giảm 10%\n🎁 Combo phòng + tour Trà Sư: **1.500.000đ**\n⏰ Đặt sớm 15 ngày: giảm 5%\n🍳 Tặng bữa sáng cho khách đặt Bungalow\n🌹 Combo lãng mạn (Bungalow + trang trí + dinner): **1.600.000đ**\n\nBạn muốn tư vấn gói nào? 😍`,
        en: `🎉 **Current Promotions:**\n\n🔥 10% off for 7-night stays\n🎁 Room + Tra Su tour combo: **1,500,000 VND**\n⏰ 5% early bird discount (15 days)\n🍳 Free breakfast with Bungalow\n🌹 Romantic combo: **1,600,000 VND**\n\nWhich package interests you? 😍`
    },
    amenities: {
        vi: `✅ **Tiện nghi homestay:**\n\n• WiFi miễn phí tất cả phòng\n• Nước nóng 24/7\n• Ban công/view suối riêng\n• Bữa sáng đặc sản (tùy gói)\n• Bãi đỗ xe miễn phí\n• Camera an ninh 24/7\n• Lửa trại, BBQ theo yêu cầu\n• Võng, ghế ngoài trời\n\n📝 Bungalow dùng quạt trần (rất mát tự nhiên gần suối)`,
        en: `✅ **Amenities:**\n\n• Free WiFi in all rooms\n• 24/7 hot water\n• Private balcony/stream view\n• Local breakfast (select packages)\n• Free parking\n• 24/7 security\n• Campfire & BBQ on request\n• Hammocks & outdoor seating\n\n📝 Bungalows use ceiling fans (naturally cool by stream)`
    },
    breakfast: {
        vi: `🍳 **Ẩm thực tại homestay:**\n\n• Bữa sáng đặc sản: **80.000đ/người** (bánh xèo lá gac, cơm lá sen, bún cá)\n• Bữa trưa/tối: **từ 120.000đ/người**\n• BBQ ngoài trời: **200.000đ/người** (heo rừng, gà đồi)\n• Lẩu mắm: **250.000đ/nồi** (4 người)\n\n🎁 Khách đặt Bungalow được **tặng bữa sáng**!\n\nCác món đều dùng nguyên liệu tươi từ vườn nhà 🌿`,
        en: `🍳 **Dining at our homestay:**\n\n• Local breakfast: **80,000 VND/person**\n• Lunch/Dinner: **from 120,000 VND/person**\n• Outdoor BBQ: **200,000 VND/person**\n• Hotpot: **250,000 VND/pot** (4 people)\n\n🎁 Bungalow guests get **free breakfast**!\n\nAll dishes use fresh local ingredients 🌿`
    },
    explore: {
        vi: `🗺 **Điểm khám phá:**\n\n🌳 **Rừng tràm Trà Sư** (15km) — 100.000đ\nĐi xuồng ba lá, ngắm chim\n\n⛰ **Cổng Trời Tri Tôn** (8km) — 30.000đ\nNgắm bình minh/hoàng hôn\n\n🏕 **Camping Núi Cấm** (3km) — 200.000đ\nNgắm sao, BBQ, lửa trại\n\n🛕 **Chùa Lầu** (20km) — Miễn phí\nKiến trúc Nhật Bản\n\nMình sắp xếp tour cho bạn nhé! 😊`,
        en: `🗺 **Nearby Destinations:**\n\n🌳 **Tra Su Forest** (15km) — 100,000 VND\nBoat ride, bird watching\n\n⛰ **Heaven's Gate** (8km) — 30,000 VND\nSunrise/sunset views\n\n🏕 **Cam Mountain Camping** (3km) — 200,000 VND\nStargazing, BBQ, campfire\n\n🛕 **Chua Lau Temple** (20km) — Free\nJapanese-style architecture\n\nI can arrange tours for you! 😊`
    },
    checkinout: {
        vi: `⏰ **Check-in/out:**\n\n🔑 Check-in: **14:00**\n🏁 Check-out: **12:00**\n\n📌 Early check-in/late check-out: liên hệ trước\n📌 Gửi hành lý miễn phí nếu đến sớm\n📌 Lễ tân hỗ trợ 24/7`,
        en: `⏰ **Check-in/out:**\n\n🔑 Check-in: **2:00 PM**\n🏁 Check-out: **12:00 PM**\n\n📌 Early/late available on request\n📌 Free luggage storage\n📌 24/7 reception`
    },
    cancel: {
        vi: `📋 **Chính sách hủy/đổi:**\n\n• Trước **48h**: hoàn 100%\n• Trong **24h**: hoàn 50%\n• Ngày check-in: không hoàn\n• Đổi lịch: miễn phí (báo trước 24h)\n\n⚠️ Dịp lễ/Tết có thể khác`,
        en: `📋 **Cancellation Policy:**\n\n• **48h+ before**: full refund\n• **Within 24h**: 50% refund\n• Same-day: no refund\n• Date changes: free (24h notice)\n\n⚠️ Holiday periods may differ`
    },
    contact: {
        vi: `📞 **Liên hệ:**\n\n📱 Hotline: **${K.phone}** (24/7)\n📧 Email: **${K.email}**\n📍 ${K.address}\n💬 Facebook: LOCALMATE\n\nHoặc nhắn trực tiếp tại đây! 😊`,
        en: `📞 **Contact:**\n\n📱 Hotline: **${K.phone}** (24/7)\n📧 Email: **${K.email}**\n📍 ${K.address}\n💬 Facebook: LOCALMATE\n\nOr chat with me right here! 😊`
    },
    family: {
        vi: `👨‍👩‍👧‍👦 **Cho gia đình:**\n\nĐề xuất **Phòng Family Tà Pạ** — **1.800.000đ/đêm**\n• 2 giường (1 lớn + 1 nhỏ)\n• Bếp nhỏ tiện nấu cho bé\n• Điều hòa, WiFi, rộng rãi\n\n🎯 **Combo gia đình:** Phòng + Tour Trà Sư (4 người) = **2.200.000đ** (tiết kiệm ~200k)\n\nSân chơi ngoài trời an toàn cho trẻ! 🌿`,
        en: `👨‍👩‍👧‍👦 **For Families:**\n\nRecommend **Family Suite** — **1,800,000 VND/night**\n• 2 beds (1 king + 1 single)\n• Kitchenette\n• A/C, WiFi, spacious\n\n🎯 **Family Combo:** Room + Tra Su Tour (4 pax) = **2,200,000 VND** (save ~200k)\n\nSafe playground for children! 🌿`
    },
    couple: {
        vi: `💑 **Cho cặp đôi:**\n\nĐề xuất **Bungalow Ven Suối** — **1.200.000đ/đêm**\n• Riêng tư bên suối\n• Bồn tắm, tiếng nước thư giãn\n\n🌹 **Combo lãng mạn:** Bungalow + Trang trí + Dinner nến = **1.600.000đ**\n\n💡 Gợi ý: Hoàng hôn ở Cổng Trời + BBQ lửa trại = cực đẳng cấp! 💕`,
        en: `💑 **For Couples:**\n\nRecommend **Riverside Bungalow** — **1,200,000 VND/night**\n• Private by the stream\n• Bathtub, soothing water sounds\n\n🌹 **Romantic Combo:** Bungalow + Decoration + Candlelight dinner = **1,600,000 VND**\n\n💡 Tip: Sunset at Heaven's Gate + campfire BBQ = unforgettable! 💕`
    },
    availability: {
        vi: `✅ Hiện tại cả 3 phòng **còn trống**:\n\n• Sun-view Núi Cấm — 850.000đ\n• Bungalow Ven Suối — 1.200.000đ\n• Family Tà Pạ — 1.800.000đ\n\n📅 Cho mình biết ngày check-in nhé!\n💡 Đặt sớm 15 ngày được giảm 5%! 😉`,
        en: `✅ All 3 rooms are **available**:\n\n• Mountain View — 850,000 VND\n• Riverside Bungalow — 1,200,000 VND\n• Family Suite — 1,800,000 VND\n\n📅 Tell me your check-in date!\n💡 Book 15 days early for 5% off! 😉`
    },
    transport: {
        vi: `🚗 **Cách đến homestay:**\n\n**Từ TP.HCM** (~220km):\n• Xe khách: Bến xe Miền Tây → Tịnh Biên (~5h)\n• Xe riêng: QL1 → Châu Đốc → Tịnh Biên\n\n**Từ Cần Thơ** (~130km): ~3h xe\n\n🚐 **Đưa đón:**\n• Trung tâm Tịnh Biên: **miễn phí**\n• Từ Châu Đốc: **200.000đ/lượt**\n• Sân bay Cần Thơ: liên hệ báo giá`,
        en: `🚗 **Getting Here:**\n\n**From HCMC** (~220km): ~5h by bus/car\n**From Can Tho** (~130km): ~3h\n\n🚐 **Pickup:**\n• Tinh Bien center: **Free**\n• From Chau Doc: **200,000 VND**\n• Can Tho airport: contact for price`
    },
    weather: {
        vi: `🌤 **Thời tiết & mùa đẹp:**\n\n☀️ **Mùa khô (11-4):** Thời tiết đẹp nhất! Nắng ấm, ít mưa\n🌧 **Mùa mưa (5-10):** Cảnh xanh mướt, giá rẻ hơn\n🌊 **Mùa nước nổi (8-11):** Tuyệt đẹp! Trà Sư đẹp nhất năm\n\n🌡 Nhiệt độ: 25-33°C (đỉnh núi mát hơn 3-5°C)\n\n💡 Đề xuất: **Tháng 10-12** — vừa đẹp vừa nhiều lễ hội!`,
        en: `🌤 **Weather & Best Time:**\n\n☀️ **Dry season (Nov-Apr):** Best weather!\n🌧 **Rainy (May-Oct):** Lush green, lower prices\n🌊 **Flood season (Aug-Nov):** Tra Su at its best!\n\n🌡 Temp: 25-33°C (cooler on mountain)\n\n💡 Best: **Oct-Dec** — beautiful & festivals!`
    },
    pet: {
        vi: `🐾 **Chính sách thú cưng:**\n\nChúng tôi **chấp nhận thú cưng nhỏ** (dưới 10kg) với phụ phí **100.000đ/đêm**.\n\n📌 Điều kiện:\n• Có dây xích/rọ mõm khi ra ngoài\n• Không để thú cưng lên giường\n• Chủ tự dọn vệ sinh\n\n🏡 Bungalow là lựa chọn tốt nhất cho khách có thú cưng (không gian mở)`,
        en: `🐾 **Pet Policy:**\n\nWe **accept small pets** (under 10kg) with **100,000 VND/night** surcharge.\n\n📌 Rules: leash required outdoors, no pets on beds, owners clean up.\n\n🏡 Bungalow is best for pet owners (open space)`
    },
    group: {
        vi: `👥 **Cho nhóm & sự kiện:**\n\n• **Nhóm 6-10 người:** Đặt cả 3 phòng = giảm 15%\n• **Team building:** Gói camping + BBQ + trò chơi = **từ 500.000đ/người**\n• **Sinh nhật/tiệc nhỏ:** Trang trí + BBQ + lửa trại = **từ 2.000.000đ**\n\n📞 Nhóm lớn 10+ người: liên hệ **${K.phone}** để báo giá riêng\n\nMình hỗ trợ lên chương trình chi tiết nhé! 🎉`,
        en: `👥 **Groups & Events:**\n\n• **6-10 people:** Book all 3 rooms = 15% off\n• **Team building:** Camping + BBQ + games = **from 500,000 VND/person**\n• **Birthdays:** Decoration + BBQ + campfire = **from 2,000,000 VND**\n\n📞 10+ people: call **${K.phone}** for custom pricing 🎉`
    },
    photo: {
        vi: `📸 **Điểm check-in sống ảo:**\n\n🌅 Ban công phòng Sun-view — bình minh tuyệt đẹp\n🌊 Cầu gỗ bên suối Bungalow\n⛰ Cổng Trời Tri Tôn — view 360°\n🌳 Rừng tràm Trà Sư — xuồng ba lá\n🏕 Camping site — bầu trời sao\n🛕 Chùa Lầu — kiến trúc Nhật\n\n💡 Giờ vàng chụp ảnh: 5h30-7h sáng và 16h-17h30! 📷`,
        en: `📸 **Instagram-worthy Spots:**\n\n🌅 Sun-view balcony — sunrise\n🌊 Wooden bridge by Bungalow stream\n⛰ Heaven's Gate — 360° views\n🌳 Tra Su Forest — paddle boat\n🏕 Camping — starry sky\n🛕 Chua Lau — Japanese temple\n\n💡 Golden hours: 5:30-7 AM & 4-5:30 PM! 📷`
    },
    safety: {
        vi: `🛡 **An toàn & tiện ích gần:**\n\n🏥 Bệnh viện gần nhất: BV Tịnh Biên (10km, ~15 phút)\n💊 Nhà thuốc: Trung tâm Tịnh Biên (10km)\n🏧 ATM: Vietcombank Tịnh Biên (10km)\n\n🔒 **Tại homestay:**\n• Camera an ninh 24/7\n• Nhân viên trực đêm\n• Bộ sơ cứu tại lễ tân\n• Đèn chiếu sáng toàn bộ lối đi`,
        en: `🛡 **Safety & Nearby Facilities:**\n\n🏥 Nearest hospital: 10km (~15 min)\n💊 Pharmacy: 10km\n🏧 ATM: 10km\n\n🔒 **At homestay:**\n• 24/7 CCTV\n• Night staff\n• First aid kit\n• Well-lit pathways`
    },
    laundry: {
        vi: `👕 **Dịch vụ giặt ủi:**\n\n• Giặt: **30.000đ/kg**\n• Giặt + ủi: **50.000đ/kg**\n• Thời gian: giao trước 10h, nhận chiều cùng ngày\n\n📌 Yêu cầu tại lễ tân hoặc nhắn tin trước nhé!`,
        en: `👕 **Laundry Service:**\n\n• Wash: **30,000 VND/kg**\n• Wash + Iron: **50,000 VND/kg**\n• Drop off by 10 AM, receive same afternoon\n\n📌 Request at reception!`
    },
    swim: {
        vi: `🌊 **Hoạt động nước:**\n\nHomestay không có hồ bơi, nhưng:\n• 🏊 Suối tự nhiên ngay cạnh Bungalow (trong, mát, có thể tắm)\n• 🚣 Đi xuồng Trà Sư (tour riêng)\n• 🌊 Suối Vĩnh Trung cách 5km (tắm suối thiên nhiên)\n\n💡 Tắm suối buổi sáng rất mát và trong! 🌿`,
        en: `🌊 **Water Activities:**\n\nNo swimming pool, but:\n• 🏊 Natural stream by Bungalow (clear, refreshing)\n• 🚣 Tra Su boat ride\n• 🌊 Vinh Trung stream (5km)\n\n💡 Morning stream bathing is amazing! 🌿`
    },
    cook: {
        vi: `🍖 **Nấu ăn & BBQ:**\n\n🔥 **BBQ ngoài trời:** 200.000đ/người (gà đồi, heo rừng, hải sản)\n🍲 **Lẩu mắm:** 250.000đ/nồi (4 người)\n👨‍🍳 **Lớp nấu ăn:** Học làm bánh xèo lá gac — 150.000đ/người\n🏡 Phòng Family có bếp nhỏ để tự nấu\n\nĐặt trước ít nhất nửa ngày nhé! 😊`,
        en: `🍖 **Cooking & BBQ:**\n\n🔥 **Outdoor BBQ:** 200,000 VND/person\n🍲 **Hotpot:** 250,000 VND/pot (4 pax)\n👨‍🍳 **Cooking class:** Make local pancakes — 150,000 VND/person\n🏡 Family Suite has kitchenette\n\nBook at least half a day in advance! 😊`
    },
    spa: {
        vi: `💆 **Thư giãn & Wellness:**\n\nHomestay hợp tác với spa địa phương:\n• Massage thảo dược: **từ 250.000đ/60 phút**\n• Ngâm chân thảo mộc: **80.000đ/lần**\n• Yoga sáng (theo yêu cầu): **100.000đ/buổi**\n\n🌿 Hoặc đơn giản: nằm võng bên suối nghe nhạc thiên nhiên — miễn phí! 😌`,
        en: `💆 **Relaxation & Wellness:**\n\nWe partner with local spas:\n• Herbal massage: **from 250,000 VND/60min**\n• Herbal foot soak: **80,000 VND**\n• Morning yoga: **100,000 VND/session**\n\n🌿 Or just relax in a hammock by the stream — free! 😌`
    },
    festival: {
        vi: `🎊 **Lễ hội & sự kiện:**\n\n🎋 **Tết Nguyên Đán (1-2):** Đặt sớm! Có chương trình đặc biệt\n🌊 **Mùa nước nổi (8-11):** Trà Sư đẹp nhất, lễ hội Ok Om Bok\n🌾 **Lễ hội Đua bò (10):** Đặc sắc văn hóa Khmer\n⛰ **Lễ vía Bà Chúa Xứ (4):** Cực đông, đặt sớm 1 tháng\n\n📅 Dịp lễ giá có thể tăng 10-20%, nên đặt sớm nhé!`,
        en: `🎊 **Festivals & Events:**\n\n🎋 **Tet (Jan-Feb):** Book early! Special programs\n🌊 **Flood season (Aug-Nov):** Tra Su at peak beauty\n🌾 **Ox racing festival (Oct):** Khmer culture\n⛰ **Ba Chua Xu festival (Apr):** Very popular\n\n📅 Holiday prices may increase 10-20%, book early!`
    },
    budget: {
        vi: `💡 **Gợi ý tiết kiệm:**\n\n🏷 **Phòng rẻ nhất:** Sun-view Núi Cấm — **850.000đ/đêm**\n📅 **Đặt 7 đêm:** Giảm 10% (tiết kiệm ~600.000đ)\n⏰ **Đặt sớm 15 ngày:** Giảm 5%\n🎁 **Combo phòng + tour:** Tiết kiệm 200-300k\n📆 **Giữa tuần:** Thường ít khách, có thể thương lượng\n\nBạn có ngân sách bao nhiêu? Mình tư vấn phù hợp nhất! 😊`,
        en: `💡 **Budget Tips:**\n\n🏷 **Cheapest:** Mountain View — **850,000 VND/night** (~$35)\n📅 **7 nights:** 10% off\n⏰ **15-day early bird:** 5% off\n🎁 **Room + tour combo:** Save 200-300k VND\n📆 **Midweek:** Usually quieter, negotiable\n\nWhat's your budget? I'll find the best fit! 😊`
    },
    payment: {
        vi: `💳 **Thanh toán:**\n\n• 💵 **Tiền mặt** (VND)\n• 🏦 **Chuyển khoản** ngân hàng (Vietcombank, MB)\n• 📱 **Ví điện tử:** Momo, ZaloPay\n• 💳 **Thẻ quốc tế:** Visa/Mastercard (phụ phí 2%)\n\n📌 Đặt cọc 50% khi xác nhận, thanh toán nốt khi check-in\n📌 Hóa đơn VAT theo yêu cầu`,
        en: `💳 **Payment:**\n\n• 💵 **Cash** (VND)\n• 🏦 **Bank transfer**\n• 📱 **E-wallets:** Momo, ZaloPay\n• 💳 **Cards:** Visa/Mastercard (2% fee)\n\n📌 50% deposit on confirmation, balance at check-in\n📌 VAT invoice available on request`
    },
    luggage: {
        vi: `🧳 **Gửi hành lý:**\n\n✅ **Miễn phí** gửi hành lý trước check-in và sau check-out\n📍 Gửi tại lễ tân, có khóa an toàn\n⏰ Giữ tối đa đến 18h ngày check-out\n\nBạn cứ gửi hành lý rồi đi khám phá thoải mái nhé! 😊`,
        en: `🧳 **Luggage Storage:**\n\n✅ **Free** storage before check-in and after check-out\n📍 Stored at reception with lock\n⏰ Kept until 6 PM on checkout day\n\nDrop your bags and explore freely! 😊`
    },
    night: {
        vi: `🌙 **Hoạt động ban đêm:**\n\n⭐ Ngắm sao trên đỉnh Núi Cấm (trời trong cực đẹp!)\n🔥 Lửa trại + BBQ (đặt trước)\n🎸 Đàn guitar, hát karaoke ngoài trời\n🏕 Camping qua đêm — 200.000đ/người\n🌌 Nhiếp ảnh thiên văn (tối thứ 6-7 tốt nhất)\n\n💡 Nhớ mang áo ấm — đêm trên núi chỉ 18-20°C! 🌿`,
        en: `🌙 **Night Activities:**\n\n⭐ Stargazing on Cam Mountain (incredible!)\n🔥 Campfire + BBQ\n🎸 Guitar, outdoor karaoke\n🏕 Overnight camping — 200,000 VND/person\n🌌 Astrophotography (best Fri-Sat)\n\n💡 Bring warm clothes — 18-20°C at night! 🌿`
    },
    thanks: {
        vi: `Không có gì ạ! 😊 Rất vui được hỗ trợ bạn.\nCần thêm gì cứ nhắn mình nhé. Chúc bạn có chuyến đi thật vui ở miền Tây! 🌿🌄`,
        en: `You're welcome! 😊 Happy to help.\nFeel free to ask anytime. Enjoy your Mekong Delta trip! 🌿🌄`
    },
    bye: {
        vi: `Tạm biệt bạn! 👋 Hẹn gặp bạn tại LOCALMATE nhé!\nNếu cần gì cứ quay lại chat hoặc gọi **${K.phone}** 😊🌿`,
        en: `Goodbye! 👋 See you at LOCALMATE!\nFeel free to chat again or call **${K.phone}** 😊🌿`
    },
    unknown: {
        vi: `Cảm ơn bạn đã nhắn! 😊 Mình có thể giúp:\n• 🏡 Tư vấn & đặt phòng\n• 🗺 Điểm khám phá\n• 🎁 Ưu đãi\n• 📞 Liên hệ\n\nBạn hãy chọn chủ đề bên dưới hoặc hỏi cụ thể hơn nhé!`,
        en: `Thanks for your message! 😊 I can help with:\n• 🏡 Rooms & booking\n• 🗺 Explore destinations\n• 🎁 Promotions\n• 📞 Contact\n\nPick a topic below or ask me anything!`
    }
};

// ── MARKDOWN ──
function fmtMd(t) {
    // Đổi gạch đầu dòng kiểu markdown thành dấu chấm tròn TRƯỚC khi xử lý chữ
    // nghiêng. Mô hình được dặn dùng "•" nhưng thỉnh thoảng vẫn viết "* ", mà
    // dấu sao đầu dòng thì lọt vào luật in nghiêng bên dưới: cả dòng bị nuốt
    // mất dấu sao và in nghiêng lung tung. Dặn dò không chắc bằng tự lo liệu.
    t = t.replace(/^[ \t]*[*-][ \t]+/gm, '• ');
    t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    t = t.replace(/\*(.+?)\*/g, '<em>$1</em>');
    t = t.replace(/\n/g, '<br>');
    return t;
}

// ── DOM ──
function createWidget() {
    const wb = document.createElement('div');
    wb.className = 'chatbot-welcome-bubble';
    wb.innerHTML = `Xin chào! 👋 Mình tìm giúp bạn chỗ nghỉ, xe và tour của người bản địa. Nhắn mình nhé!<button class="chatbot-welcome-close" aria-label="Đóng">✕</button>`;
    // Bấm tắt là nhớ luôn, khỏi bật lại ở những lần vào sau
    wb.querySelector('.chatbot-welcome-close').addEventListener('click', (e) => {
        e.stopPropagation();
        wb.classList.remove('show');
        try { localStorage.setItem(WELCOME_KEY, '1'); } catch (_) { /* trinh duyet chan thi thoi */ }
    });
    document.body.appendChild(wb);

    const tb = document.createElement('button');
    tb.className = 'chatbot-toggle';
    tb.setAttribute('aria-label', 'Open chat');
    tb.innerHTML = `<img src="${BOT_AVATAR}" alt="Chat"><svg class="chatbot-close-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg><span class="chatbot-badge">1</span>`;
    document.body.appendChild(tb);

    const cw = document.createElement('div');
    cw.className = 'chatbot-window';
    cw.innerHTML = `
        <div class="chatbot-header">
            <img src="${BOT_AVATAR}" alt="${BOT_NAME}" class="chatbot-header-avatar">
            <div class="chatbot-header-info"><div class="chatbot-header-name">${BOT_NAME}</div><div class="chatbot-header-status">Đang hoạt động</div></div>
            <div class="chatbot-header-actions"><button class="chatbot-header-btn" id="chatbot-lang-indicator" onclick="chatbotWidget.switchLang()" title="Switch language" style="font-size:12px;font-weight:700;width:auto;padding:0 8px;border-radius:6px">🇻🇳 VI</button><button class="chatbot-header-btn" onclick="chatbotWidget.clearChat()" title="Xóa"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg></button><button class="chatbot-header-btn" onclick="chatbotWidget.close()" title="Đóng" aria-label="Đóng"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>
        </div>
        <div class="chatbot-messages" id="chatbot-messages"></div>
        <div class="chatbot-input-area">
            <textarea class="chatbot-input" id="chatbot-input" placeholder="Nhập tin nhắn..." rows="1"></textarea>
            <button class="chatbot-send-btn" id="chatbot-send" aria-label="Send" disabled><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button>
        </div>`;
    document.body.appendChild(cw);
    return { toggleBtn: tb, chatWindow: cw, welcomeBubble: wb };
}

// ── RESPOND WITH LANG (message language takes priority) ──
function respondWithLang(text, preferredLang) {
    const det = detectLang(text);
    // If message language is strongly detected, use it. Otherwise fall back to preferred.
    const lang = (det.strong && det.lang) ? det.lang : (preferredLang || det.lang || 'vi');
    const intent = matchIntent(text);
    const en = lang === 'en';
    const R = RESPONSES[intent] || RESPONSES.unknown;
    const msg = en ? R.en : R.vi;
    let qr = en ? (QR_EN[intent] || QR_EN.unknown) : (QR_VI[intent] || QR_VI.unknown);
    return { message: msg, quickReplies: qr, detectedLang: lang };
}

// ── LỜI CHÀO ──
//
// Nói luôn mình biết những gì, vì khách không đoán được. Ba nút gợi ý là ba
// việc hay được hỏi nhất, bấm một cái là có câu trả lời thật ngay.
const LOI_CHAO = {
    vi: {
        text: 'Chào bạn 👋 Mình là **Trợ lý LOCALMATE**.\n\n'
            + 'Mình tra được chỗ nghỉ còn trống, tour, xe đưa đón, đặc sản đang bán '
            + 'và thời tiết từng ngày — số liệu lấy thẳng từ hệ thống nên đúng bằng '
            + 'giá trên web. Bạn cần gì cứ nhắn nhé.',
        qr: ['Có đặc sản gì?', 'Còn phòng không?', 'Tạo lịch trình cho tôi'],
    },
    en: {
        text: 'Hello 👋 I am the **LOCALMATE assistant**.\n\n'
            + 'I can check available stays, tours, rides, the specialties on sale and '
            + 'the daily forecast — straight from our system, so the numbers match the '
            + 'site exactly. What can I help you with?',
        qr: ['What is on sale?', 'Any rooms left?', 'Create my itinerary'],
    },
};

// ── CONTROLLER ──
const chatbotWidget = {
    isOpen: false, elements: null, history: [], preferredLang: null,
    init() {
        this.elements = createWidget();
        this.bindEvents();
        this.loadHistory();
        this.preferredLang = sessionStorage.getItem('chatbot_lang') || null;
        this.renderHistory();
        this.updateLangIndicator();
        this.chaoNeuTrong();
        let daTat = false;
        try { daTat = localStorage.getItem(WELCOME_KEY) === '1'; } catch (_) { /* bo qua */ }
        if (!daTat) {
            setTimeout(() => {
                if (this.isOpen) return;
                this.elements.welcomeBubble.classList.add('show');
                // Tu an sau một lúc: lời chào đứng mãi trên màn hình thì thành
                // vật cản, không còn là lời chào nữa.
                setTimeout(() => this.elements.welcomeBubble.classList.remove('show'),
                    WELCOME_HIDE_AFTER);
            }, WELCOME_DELAY);
        }
    },
    /**
     * Khung tin nhắn đang trống thì chào khách.
     *
     * Trước đây chỗ này chỉ chạy đúng một lần lúc dựng trang, và cái thẻ
     * "đã hiện bảng chọn ngôn ngữ" lưu trong lịch sử lại bị renderHistory
     * lọc bỏ — nên sang trang thứ hai trong cùng phiên, mở trợ lý ra chỉ
     * thấy một ô trắng, không một chữ nào.
     *
     * Chưa chọn ngôn ngữ thì mời chọn trước; chọn rồi thì chào thẳng.
     */
    chaoNeuTrong() {
        const c = document.getElementById('chatbot-messages');
        if (!c || c.children.length) return;
        if (!this.preferredLang) { this.showLanguageSelector(); return; }
        const chao = LOI_CHAO[this.preferredLang] || LOI_CHAO.vi;
        this.addBotMessage(chao.text, chao.qr);
    },
    showLanguageSelector() {
        const c = document.getElementById('chatbot-messages');
        const time = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        const el = document.createElement('div'); el.className = 'chatbot-msg bot';
        el.innerHTML = `
            <div class="chatbot-msg-bubble">
                <div style="text-align:center;margin-bottom:8px">
                    <strong>🌐 Chọn ngôn ngữ / Choose language</strong>
                </div>
                <div style="display:flex;gap:8px;justify-content:center;margin:12px 0">
                    <button onclick="chatbotWidget.selectLang('vi')" class="chatbot-lang-btn" style="flex:1;padding:12px 8px;border:2px solid #4A7856;border-radius:12px;background:white;cursor:pointer;transition:all 0.2s;font-size:15px;font-family:inherit">
                        🇻🇳<br><strong>Tiếng Việt</strong>
                    </button>
                    <button onclick="chatbotWidget.selectLang('en')" class="chatbot-lang-btn" style="flex:1;padding:12px 8px;border:2px solid #4A7856;border-radius:12px;background:white;cursor:pointer;transition:all 0.2s;font-size:15px;font-family:inherit">
                        🇬🇧<br><strong>English</strong>
                    </button>
                </div>
                <div style="text-align:center;font-size:12px;color:#94a3b8">Hoặc nhắn bằng ngôn ngữ bạn muốn<br>Or just type in your language</div>
            </div>
            <div class="chatbot-msg-time">${time}</div>`;
        c.appendChild(el);
        // Chi giu MOT the danh dau: sang trang khac trong cung phien lai hien
        // bang chon ngon ngu, cu don thi lich su phinh ra toan the rong.
        this.history = this.history.filter(h => !h.isLangSelector);
        this.history.push({ role: 'bot', text: '🌐 Language selector shown', time, isLangSelector: true });
        this.saveHistory();
        this.scrollBottom();
    },
    selectLang(lang) {
        this.preferredLang = lang;
        sessionStorage.setItem('chatbot_lang', lang);
        this.updateLangIndicator();
        // Remove language selector buttons
        document.querySelectorAll('.chatbot-lang-btn').forEach(b => {
            b.closest('.chatbot-msg').remove();
        });
        // Remove the lang selector from history
        this.history = this.history.filter(h => !h.isLangSelector);
        // Chào bằng đúng ngôn ngữ vừa chọn — dùng chung một lời chào với
        // lúc mở hộp thoại, để hai chỗ không nói hai kiểu khác nhau.
        const chao = LOI_CHAO[lang] || LOI_CHAO.vi;
        this.addBotMessage(chao.text, chao.qr);
    },
    switchLang() {
        const newLang = this.preferredLang === 'en' ? 'vi' : 'en';
        this.preferredLang = newLang;
        sessionStorage.setItem('chatbot_lang', newLang);
        this.updateLangIndicator();
        const msg = newLang === 'en'
            ? `🇬🇧 Switched to **English**! How can I help you?`
            : `🇻🇳 Đã chuyển sang **Tiếng Việt**! Mình có thể giúp gì?`;
        const qr = newLang === 'en' ? ['View rooms', 'Prices', 'Promotions'] : ['Xem phòng', 'Giá phòng', 'Ưu đãi'];
        this.addBotMessage(msg, qr);
    },
    updateLangIndicator() {
        const el = document.getElementById('chatbot-lang-indicator');
        if (el) {
            el.textContent = this.preferredLang === 'en' ? '🇬🇧 EN' : '🇻🇳 VI';
            el.title = this.preferredLang === 'en' ? 'Switch to Vietnamese' : 'Switch to English';
        }
    },
    bindEvents() {
        this.elements.toggleBtn.addEventListener('click', () => this.toggle());
        document.getElementById('chatbot-send').addEventListener('click', () => this.send());
        const input = document.getElementById('chatbot-input');
        input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.send(); } });
        input.addEventListener('input', () => { document.getElementById('chatbot-send').disabled = !input.value.trim(); input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 100) + 'px'; });
    },
    toggle() {
        this.isOpen = !this.isOpen;
        const { toggleBtn: tb, chatWindow: cw, welcomeBubble: wb } = this.elements;
        if (this.isOpen) { cw.classList.add('open'); tb.classList.add('active'); wb.classList.remove('show'); const b = tb.querySelector('.chatbot-badge'); if (b) b.style.display = 'none'; this.chaoNeuTrong(); setTimeout(() => document.getElementById('chatbot-input').focus(), 300); this.scrollBottom(); }
        else { cw.classList.remove('open'); tb.classList.remove('active'); }
    },

    /**
     * Đóng cửa sổ chat.
     *
     * Hai chỗ trong mã này đã gọi `this.close && this.close()` từ trước, nhưng
     * hàm chưa hề tồn tại nên lời gọi rơi vào hư không — cửa sổ không đóng mà
     * cũng chẳng báo lỗi gì. Nút X trên đầu cửa sổ giờ cũng dùng hàm này.
     */
    close() {
        if (!this.isOpen) return;
        this.isOpen = false;
        const { toggleBtn: tb, chatWindow: cw } = this.elements;
        cw.classList.remove('open');
        tb.classList.remove('active');
    },
    async send() {
        const input = document.getElementById('chatbot-input'); const text = input.value.trim(); if (!text) return;
        this.addUserMessage(text); input.value = ''; input.style.height = 'auto'; document.getElementById('chatbot-send').disabled = true;
        this.showTyping();

        // Auto-detect language if not set
        if (!this.preferredLang) {
            const det = detectLang(text);
            if (det.strong && det.lang) {
                this.preferredLang = det.lang;
                sessionStorage.setItem('chatbot_lang', det.lang);
                this.updateLangIndicator();
            }
        }

        try {
            // Call Gemini API
            const apiHistory = this.history
                .filter(h => !h.isLangSelector && h.text)
                .slice(-10)
                .map(h => ({ role: h.role, text: h.text }));

            let bookingContext = null;
            try {
                const last = JSON.parse(localStorage.getItem('localmate_last_booking') || 'null');
                if (last && last.id && last.phone) bookingContext = { id: last.id, phone: last.phone };
            } catch (_) { /* localStorage có thể bị chặn hoặc chứa dữ liệu cũ hỏng. */ }

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    history: apiHistory,
                    lang: this.preferredLang || 'vi',
                    booking_context: bookingContext,
                })
            });

            const data = await response.json();
            this.hideTyping();

            if (data.error) {
                // If the API returns an error or rate limit, fallback to local pattern matching
                console.warn('API returned error, falling back locally:', data.message);
                this.hideTyping();
                const localResponse = respondWithLang(text, this.preferredLang);
                this.addBotMessage(localResponse.message, localResponse.quickReplies, false);
            } else {
                this.addBotMessage(data.message, data.quickReplies || [], true, data.action || null);
            }
        } catch (err) {
            // Offline / network error → fallback to pattern matching
            console.warn('API unavailable, using offline mode:', err.message);
            this.hideTyping();
            const { message, quickReplies } = respondWithLang(text, this.preferredLang);
            this.addBotMessage(message, quickReplies, false);
        }
    },
    addUserMessage(text) {
        const c = document.getElementById('chatbot-messages'); const time = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        const el = document.createElement('div'); el.className = 'chatbot-msg user'; el.innerHTML = `<div class="chatbot-msg-bubble">${this.esc(text)}</div><div class="chatbot-msg-time">${time}</div>`;
        c.appendChild(el); this.history.push({ role: 'user', text, time }); this.saveHistory(); this.scrollBottom();
    },
    // Câu hỏi của khách thuộc nhóm nào thì gắn nút mở thẳng chức năng đó,
    // đỡ phải bắt khách tự đi tìm trong trang.
    ACTIONS: {
        open_trip: { vi: '✨ Tạo lịch trình cho tôi', en: '✨ Create my itinerary', run: 'chatbotWidget.goTrip()' },
        open_transport: { vi: '🚗 Đặt xe ngay', en: '🚗 Book a ride', run: 'chatbotWidget.goTransport()' },
        open_rooms: { vi: '🛏 Xem & đặt phòng', en: '🛏 View & book rooms', run: "location.href='phongnghi.html'" },
        open_tours: { vi: '🎒 Xem tour', en: '🎒 See tours', run: "location.href='khampha.html'" },
        open_food: { vi: '🛒 Xem trang Đặc sản', en: '🛒 Browse specialties', run: "location.href='dacsan.html'" },
        open_orders: { vi: '🧳 Xem đơn của tôi', en: '🧳 View my bookings', run: "location.href='donhang.html'" },
    },
    goTrip() {
        this.close && this.close();
        if (location.pathname.endsWith('index.html') || location.pathname === '/') {
            const el = document.getElementById('trip-wizard');
            if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
        }
        location.href = 'index.html#ai-panel';
    },
    goTransport() {
        if (typeof BayNuiBooking !== 'undefined') {
            this.close && this.close();
            BayNuiBooking.openTransport('LOCALMATE, Núi Cấm');
        } else {
            location.href = 'index.html';
        }
    },
    addBotMessage(text, qr = [], isAI = false, action = null) {
        const c = document.getElementById('chatbot-messages'); const time = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        const el = document.createElement('div'); el.className = 'chatbot-msg bot';
        let qrHtml = qr.length ? `<div class="chatbot-quick-replies">${qr.map(q => `<button class="chatbot-quick-btn" onclick="chatbotWidget.handleQR('${this.esc(q)}')">${q}</button>`).join('')}</div>` : '';
        const badgeHtml = isAI ? `<span style="color:#8b5cf6;font-weight:bold;margin-right:4px">✨ AI</span>` : `<span style="color:#64748b;font-weight:bold;margin-right:4px">🤖 Bot</span>`;
        const act = action && this.ACTIONS[action];
        const actHtml = act
            ? `<div class="chatbot-action"><button class="chatbot-action-btn" onclick="${act.run}">${this.preferredLang === 'en' ? act.en : act.vi}</button></div>`
            : '';
        el.innerHTML = `<div class="chatbot-msg-bubble">${fmtMd(text)}</div>${actHtml}${qrHtml}<div class="chatbot-msg-time">${badgeHtml} ${time}</div>`;
        c.appendChild(el); this.history.push({ role: 'bot', text, qr, time, isAI }); this.saveHistory(); this.scrollBottom();
    },
    handleQR(text) { document.querySelectorAll('.chatbot-quick-replies').forEach(e => e.remove()); document.getElementById('chatbot-input').value = text; this.send(); },
    showTyping() { const c = document.getElementById('chatbot-messages'); const el = document.createElement('div'); el.className = 'chatbot-typing'; el.id = 'chatbot-typing-indicator'; el.innerHTML = '<div class="chatbot-typing-dot"></div><div class="chatbot-typing-dot"></div><div class="chatbot-typing-dot"></div>'; c.appendChild(el); this.scrollBottom(); },
    hideTyping() { const el = document.getElementById('chatbot-typing-indicator'); if (el) el.remove(); },
    clearChat() {
        if (!confirm(this.preferredLang === 'en' ? 'Clear all messages?' : 'Xóa toàn bộ cuộc trò chuyện?')) return;
        this.history = []; this.preferredLang = null;
        sessionStorage.removeItem('chatbot_lang');
        this.saveHistory(); document.getElementById('chatbot-messages').innerHTML = '';
        this.chaoNeuTrong();
    },
    scrollBottom() { const c = document.getElementById('chatbot-messages'); setTimeout(() => c.scrollTop = c.scrollHeight, 50); },
    saveHistory() { try { sessionStorage.setItem('chatbot_history', JSON.stringify(this.history.slice(-50))); } catch(e){} },
    loadHistory() { try { const d = sessionStorage.getItem('chatbot_history'); if (d) this.history = JSON.parse(d); } catch(e) { this.history = []; } },
    renderHistory() { const c = document.getElementById('chatbot-messages'); c.innerHTML = ''; this.history.forEach(m => { if (m.isLangSelector) return; const el = document.createElement('div'); el.className = `chatbot-msg ${m.role === 'user' ? 'user' : 'bot'}`; let badgeHtml = ''; if (m.role === 'bot') { badgeHtml = m.isAI ? `<span style="color:#8b5cf6;font-weight:bold;margin-right:4px">✨ AI</span>` : `<span style="color:#64748b;font-weight:bold;margin-right:4px">🤖 Bot</span>`; } el.innerHTML = `<div class="chatbot-msg-bubble">${m.role === 'user' ? this.esc(m.text) : fmtMd(m.text)}</div><div class="chatbot-msg-time">${badgeHtml} ${m.time || ''}</div>`; c.appendChild(el); }); this.scrollBottom(); },
    esc(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
};

window.chatbotWidget = chatbotWidget;
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => chatbotWidget.init());
else chatbotWidget.init();

})();
