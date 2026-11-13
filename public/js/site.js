// ============================================================
// LOCALMATE — Site content renderer
// Dữ liệu tĩnh (điểm đến, ẩm thực, lễ hội, tour, dịch vụ)
// Render song ngữ VI/EN, dùng chung biến currentLang của app.js
// ============================================================

const LANG = () => (typeof currentLang !== 'undefined' ? currentLang : 'vi');
const EN = () => LANG() === 'en';
const L = (o, k) => (EN() ? (o[k + 'En'] || o[k]) : o[k]);

// ── TRẢI NGHIỆM ──
const EXPERIENCES = [
    { icon: 'landmark', img: 'assets/chua-khmer.jpg', href: 'diadiem.html?slug=chua-khmer', title: 'Văn hóa Khmer', titleEn: 'Khmer Culture', desc: 'Chùa vàng, nhạc ngũ âm, chữ Khmer cổ', descEn: 'Golden pagodas, Pinpeat music, ancient script' },
    { icon: 'trees', img: 'assets/tra-su.jpg', href: 'diadiem.html?slug=tra-su', title: 'Thiên nhiên', titleEn: 'Nature', desc: 'Rừng tràm, thốt nốt, đồng lúa Tri Tôn', descEn: 'Cajuput forest, palm fields, Tri Ton paddies' },
    { icon: 'camera', img: 'assets/ho-ta-pa.jpg', href: 'diadiem.html?slug=ho-ta-pa', title: 'Check-in', titleEn: 'Check-in', desc: 'Hồ Tà Pạ, Cổng Trời, cánh đồng thốt nốt', descEn: 'Ta Pa lake, Heaven Gate, palm fields' },
    { icon: 'church', img: 'assets/nui-cam-3.jpg', href: 'diadiem.html?slug=nui-cam', title: 'Tâm linh', titleEn: 'Spiritual', desc: 'Thiên Cấm Sơn, tượng Phật Di Lặc, chùa Vạn Linh', descEn: 'Cam Mountain, Maitreya statue, Van Linh pagoda' },
    { icon: 'tent', img: 'assets/camping-nui-cam.jpg', href: 'diadiem.html?slug=camping-nui-cam', title: 'Camping & BBQ', titleEn: 'Camping & BBQ', desc: 'Cắm trại trên núi, lửa trại, ngắm sao', descEn: 'Mountain camping, bonfire, stargazing' },
    { icon: 'utensils', img: 'assets/food-banhxeo.jpg', href: 'khampha.html#am-thuc', title: 'Ẩm thực Bảy Núi', titleEn: 'Local Food', desc: 'Bánh xèo rau rừng, gà đốt lá chúc, thốt nốt', descEn: 'Forest-herb pancake, grilled chicken, palm sugar' },
];

// ── ĐIỂM ĐẾN ──
const DESTS = [
    { name: 'Núi Cấm — Thiên Cấm Sơn', nameEn: 'Cam Mountain', area: 'Tịnh Biên, An Giang', r: '4.9', km: '3 km', badge: 'Nổi bật', badgeEn: 'Featured', tone: '#c67139', w: 'cloud-sun', deg: '27°', img: 'assets/nui-cam-1.jpg', href: 'diadiem.html?slug=nui-cam' },
    { name: 'Hồ Tà Pạ', nameEn: 'Ta Pa Lake', area: 'Tri Tôn, An Giang', r: '4.8', km: '8.4 km', badge: 'Gần bạn', badgeEn: 'Near you', tone: '#728157', w: 'sun', deg: '31°', img: 'assets/ho-ta-pa.jpg', href: 'diadiem.html?slug=ho-ta-pa' },
    { name: 'Rừng tràm Trà Sư', nameEn: 'Tra Su Forest', area: 'Tịnh Biên, An Giang', r: '4.7', km: '15 km', badge: 'Thiên nhiên', badgeEn: 'Nature', tone: '#728157', w: 'cloud-sun', deg: '29°', img: 'assets/tra-su.jpg', href: 'diadiem.html?slug=tra-su' },
    { name: 'Chùa Tà Pạ', nameEn: 'Ta Pa Pagoda', area: 'Tri Tôn, An Giang', r: '4.8', km: '9.1 km', badge: 'Văn hóa Khmer', badgeEn: 'Khmer culture', tone: '#b2622d', w: 'sun', deg: '30°', img: 'assets/chua-ta-pa.jpg', href: 'diadiem.html?slug=chua-khmer' },
    { name: 'Cáp treo Núi Sam', nameEn: 'Sam Mountain Cable Car', area: 'Châu Đốc, An Giang', r: '4.6', km: '24 km', badge: 'Tâm linh', badgeEn: 'Spiritual', tone: '#8c491a', w: 'cloud-sun', deg: '28°', img: 'assets/cap-treo-nui-sam.png', href: 'diadiem.html?slug=nui-sam' },
    { name: 'Camping Núi Cấm', nameEn: 'Cam Mountain Camping', area: 'Tịnh Biên, An Giang', r: '4.7', km: '3 km', badge: 'Trải nghiệm', badgeEn: 'Experience', tone: '#728157', w: 'cloud-rain', deg: '25°', img: 'assets/camping-nui-cam.jpg', href: 'diadiem.html?slug=camping-nui-cam' },
];

// ── GỢI Ý THEO THỜI ĐIỂM ──
const NEARBY = [
    { icon: 'sun', tone: '#f6a06b', cond: 'Trời quang, 31°', condEn: 'Clear, 31°', place: 'Hồ Tà Pạ', placeEn: 'Ta Pa Lake', km: '8.4 km', why: 'Ánh sáng đẹp nhất trong 2 giờ tới — nên check-in trước khi nắng gắt.', whyEn: 'Best light for the next 2 hours — go before the midday sun.', action: 'Xem chi tiết', actionEn: 'Details', href: 'diadiem.html?slug=ho-ta-pa' },
    { icon: 'cloud-rain', tone: '#8fa073', cond: 'Mưa rào sau 14:00', condEn: 'Showers after 2 PM', place: 'Gà đốt lá chúc Ô Thum', placeEn: 'O Thum Grilled Chicken', km: '12 km', why: 'Ghé ăn trưa trong lúc mưa, khoảng 45 phút sau trời tạnh là đi tiếp được.', whyEn: 'Have lunch through the rain; it clears in about 45 minutes.', action: 'Xem món', actionEn: 'View dish', href: 'khampha.html#am-thuc' },
    { icon: 'church', tone: '#b2622d', cond: 'Trong chùa mát', condEn: 'Cool inside', place: 'Chùa Vạn Linh', placeEn: 'Van Linh Pagoda', km: '2.4 km', why: 'Lễ tụng kinh chiều bắt đầu 16:30 — nên đến trước 20 phút.', whyEn: 'Afternoon chanting starts 4:30 PM — arrive 20 minutes early.', action: 'Xem chi tiết', actionEn: 'Details', href: 'diadiem.html?slug=nui-cam' },
];

// ── LỄ HỘI ──
const FESTIVALS = [
    { d: '28', m: 'Th9', mEn: 'Sep', y: '2026', name: 'Hội đua bò Bảy Núi', nameEn: 'Seven Mountains Ox Race', cul: 'Khmer', at: 'Tri Tôn', km: '9 km', match: true },
    { d: '30', m: 'Th9', mEn: 'Sep', y: '2026', name: 'Lễ Sene Đôn Ta', nameEn: 'Sene Don Ta', cul: 'Khmer', at: 'Tịnh Biên', km: '6 km', match: false },
    { d: '14', m: 'Th11', mEn: 'Nov', y: '2026', name: 'Lễ Ok Om Bok — cúng trăng', nameEn: 'Ok Om Bok Moon Festival', cul: 'Khmer', at: 'Tri Tôn', km: '11 km', match: false },
    { d: '14', m: 'Th4', mEn: 'Apr', y: '2027', name: 'Chôl Chnăm Thmây', nameEn: 'Chol Chnam Thmay', cul: 'Khmer', at: 'Toàn vùng Bảy Núi', km: '—', match: false },
];

// ── ẨM THỰC ──
const FOODS = [
    { img: 'assets/food-banhxeo.jpg', cul: 'Việt · Núi Cấm', culEn: 'Viet · Cam Mountain', name: 'Bánh xèo rau rừng', nameEn: 'Forest-herb Bánh Xèo', price: '35.000đ', where: '6 quán trên đường lên Núi Cấm', whereEn: '6 spots on the Cam Mountain road' },
    { img: 'assets/food-gadot.jpg', cul: 'Khmer · Tri Tôn', culEn: 'Khmer · Tri Ton', name: 'Gà đốt lá chúc Ô Thum', nameEn: 'O Thum Grilled Chicken', price: '260.000đ', where: '4 quán ven hồ Ô Thum', whereEn: '4 spots by O Thum lake' },
    { img: 'assets/food-banhbo.jpg', cul: 'Khmer · Tịnh Biên', culEn: 'Khmer · Tinh Bien', name: 'Bánh bò thốt nốt', nameEn: 'Palm Sugar Cake', price: '10.000đ', where: 'Chợ Tịnh Biên & làng nghề thốt nốt', whereEn: 'Tinh Bien market & palm villages' },
    { img: 'assets/food-comdep.jpg', cul: 'Khmer · Lễ Ok Om Bok', culEn: 'Khmer · Ok Om Bok', name: 'Cốm dẹp (Ambok)', nameEn: 'Ambok Flattened Rice', price: '25.000đ', where: 'Làng Khmer quanh chùa Tà Pạ', whereEn: 'Khmer villages around Ta Pa pagoda' },
];

// Tour được nạp từ các tin do đối tác thật đăng, không có dữ liệu mẫu dự phòng.
let TOURS = [];

// ── DỊCH VỤ ──
const SERVICES = [
    { icon: 'car', name: 'Xe đưa đón', nameEn: 'Transfer', price: 'Bến xe Tịnh Biên: miễn phí', priceEn: 'Tinh Bien station: free' },
    { icon: 'bike', name: 'Thuê xe máy', nameEn: 'Bike rental', price: '200.000đ/ngày', priceEn: '200,000đ/day' },
    { icon: 'utensils', name: 'Ăn uống tại chỗ', nameEn: 'Dining', price: 'Sáng 80.000đ · BBQ 200.000đ', priceEn: 'Breakfast 80k · BBQ 200k' },
    { icon: 'flame', name: 'BBQ & lửa trại', nameEn: 'BBQ & bonfire', price: '200.000đ/người', priceEn: '200,000đ/person' },
    { icon: 'ticket', name: 'Tour tham quan', nameEn: 'Guided tours', price: '3 tour theo chủ đề', priceEn: '3 themed tours' },
    { icon: 'dog', name: 'Đón thú cưng', nameEn: 'Pet friendly', price: 'Dưới 10kg · +100.000đ/đêm', priceEn: 'Under 10kg · +100,000đ/night' },
];

// ── COMBO / ƯU ĐÃI ──
const COMBOS = [
    { icon: 'trees', name: 'Combo phòng + tour Trà Sư', nameEn: 'Room + Tra Su tour', price: '1.500.000đ', desc: '1 đêm Sun-view + xuồng Trà Sư cho 2 người', descEn: '1 night Sun-view + Tra Su boat for 2' },
    { icon: 'heart', name: 'Combo lãng mạn', nameEn: 'Romantic combo', price: '1.600.000đ', desc: 'Bungalow ven suối + bữa tối riêng bên suối', descEn: 'Riverside bungalow + private streamside dinner' },
    { icon: 'users', name: 'Combo gia đình', nameEn: 'Family combo', price: '2.200.000đ', desc: 'Phòng Family + BBQ lửa trại cho 4 người', descEn: 'Family room + BBQ bonfire for 4' },
];

// ============================================================
// RENDER HELPERS
// ============================================================
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function fill(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
}

function renderExperiences(list = EXPERIENCES) {
    fill('exp-grid', list.map(x => `
        <a href="${x.href}" class="exp-card scroll-animate">
            <img src="${x.img}" alt="${esc(L(x, 'title'))}" loading="lazy">
            <span class="exp-card-scrim"></span>
            <span class="exp-card-icon"><i data-lucide="${x.icon}"></i></span>
            <span class="exp-card-body">
                <h3>${esc(L(x, 'title'))}</h3>
                <p>${esc(L(x, 'desc'))}</p>
                <span class="exp-card-cta">${EN() ? 'Explore' : 'Khám phá'} <i data-lucide="arrow-right" style="width:14px;height:14px"></i></span>
            </span>
        </a>`).join(''));
}

/**
 * Điểm đến lấy từ máy chủ.
 *
 * DESTS bên trên chỉ còn là bản dự phòng cho lúc mạng hỏng — danh sách thật
 * nằm ở /v1/places, chung một nguồn với app và với trợ lý ảo.
 */
async function napDiemDen() {
    try {
        const res = await fetch('/v1/places');
        const json = await res.json();
        const rows = json.data || [];
        if (!rows.length) return;

        DIEM_DEN_MAY_CHU = rows.map(p => ({
            name: p.name,
            nameEn: p.name_en || p.name,
            area: p.area,
            r: String(p.rating || ''),
            km: p.distance_km != null ? `${String(p.distance_km).replace('.', ',')} km` : '',
            badge: (p.category || '').split('·')[0].trim(),
            badgeEn: (p.category_en || p.category || '').split('·')[0].trim(),
            tone: '#728157',
            w: 'sun',
            deg: '',
            img: p.image,
            href: `diadiem.html?slug=${encodeURIComponent(p.slug)}`,
        }));
        renderDests(DIEM_DEN_MAY_CHU);
        if (window.lucide) lucide.createIcons();
        if (typeof window.observeReveals === 'function') window.observeReveals();
    } catch (_) {
        /* mạng hỏng thì giữ danh sách dự phòng đang hiện */
    }
}

let DIEM_DEN_MAY_CHU = null;

function renderDests(list = DIEM_DEN_MAY_CHU || DESTS) {
    fill('dest-grid', list.map(d => `
        <a href="${d.href}" class="dest-card scroll-animate">
            <span class="dest-card-media">
                <img src="${d.img}" alt="${esc(L(d, 'name'))}" loading="lazy">
                <span class="dest-badge" style="background:${d.tone}">${esc(L(d, 'badge'))}</span>
                <span class="dest-weather"><i data-lucide="${d.w}"></i>${d.deg}</span>
            </span>
            <span class="dest-card-body">
                <h3>${esc(L(d, 'name'))}</h3>
                <span class="dest-area"><i data-lucide="map-pin"></i>${esc(d.area)}</span>
                <span class="dest-meta">
                    <span><i data-lucide="star" class="star"></i>${d.r}</span>
                    <span class="km"><i data-lucide="navigation"></i>${d.km}</span>
                    <span class="chev"><i data-lucide="chevron-right"></i></span>
                </span>
            </span>
        </a>`).join(''));
}

function renderNearby() {
    fill('nearby-grid', NEARBY.map(n => `
        <div class="suggest-card">
            <div class="suggest-cond">
                <span class="suggest-cond-icon" style="background:${n.tone}"><i data-lucide="${n.icon}"></i></span>
                <span>${esc(L(n, 'cond'))}</span>
            </div>
            <div>
                <h4>${esc(L(n, 'place'))}</h4>
                <p class="suggest-km">${n.km}</p>
            </div>
            <p class="suggest-why">${esc(L(n, 'why'))}</p>
            <a href="${n.href}" class="btn-outline">${esc(L(n, 'action'))} <i data-lucide="arrow-right" style="width:15px;height:15px"></i></a>
        </div>`).join(''));
}

function renderFestivals(list = FESTIVALS) {
    fill('fest-list', list.map(f => `
        <div class="fest-row scroll-animate">
            <div class="fest-date"><b>${f.d}</b><span>${esc(L(f, 'm'))} ${f.y}</span></div>
            <div class="fest-body">
                <div class="fest-title-row">
                    <h3>${esc(L(f, 'name'))}</h3>
                    ${f.match ? `<span class="fest-match"><i data-lucide="sparkles" style="width:13px;height:13px"></i>${EN() ? 'Fits your trip' : 'Phù hợp chuyến đi của bạn'}</span>` : ''}
                </div>
                <div class="fest-meta">
                    <span class="fest-cul">${f.cul}</span>
                    <span><i data-lucide="map-pin"></i>${esc(f.at)}</span>
                    <span><i data-lucide="navigation"></i>${f.km}</span>
                </div>
            </div>
            <a href="lienhe.html" class="btn-outline">${EN() ? 'Ask us' : 'Hỏi tư vấn'} <i data-lucide="chevron-right" style="width:15px;height:15px"></i></a>
        </div>`).join(''));
}

function renderFoods() {
    fill('food-grid', FOODS.map(f => `
        <div class="food-card scroll-animate">
            <div class="food-card-media"><img src="${f.img}" alt="${esc(L(f, 'name'))}" loading="lazy"></div>
            <div class="food-card-body">
                <span class="food-cul">${esc(L(f, 'cul'))}</span>
                <h3>${esc(L(f, 'name'))}</h3>
                <p class="food-where">${esc(L(f, 'where'))}</p>
                <div class="food-foot">
                    <span class="food-price">${f.price}</span>
                    <button class="food-btn" onclick="askBot('${esc(L(f, 'name')).replace(/'/g, "\\'")}')">${EN() ? 'Find a place' : 'Tìm nơi ăn'}</button>
                </div>
            </div>
        </div>`).join(''));
}

function renderTours() {
    if (!TOURS.length) {
        fill('tour-grid', '<p class="notice">Chưa có tour nào do đối tác đăng.</p>');
        return;
    }
    fill('tour-grid', TOURS.map(t => `
        <div class="tour-card scroll-animate">
            <img src="${t.img}" alt="${esc(L(t, 'name'))}" loading="lazy">
            <span class="tour-scrim"></span>
            <div class="tour-body">
                <div class="tour-chips">
                    <span class="tour-chip"><i data-lucide="clock"></i>${esc(L(t, 'dur'))}</span>
                    <span class="tour-chip"><i data-lucide="users"></i>${esc(L(t, 'pax'))}</span>
                    <span class="tour-chip rate"><i data-lucide="star"></i>${t.r}</span>
                </div>
                <h3>${esc(L(t, 'name'))}</h3>
                ${t.partner ? `<p class="tour-provider"><i data-lucide="building-2"></i>${EN() ? 'Operator:' : 'Đơn vị:'} <b>${esc(t.partner)}</b></p>` : ''}
                <p class="tour-stops">${esc(L(t, 'stops'))}</p>
                <div class="tour-foot">
                    <span class="tour-price">${t.price}</span>
                    <button class="tour-btn" onclick="BayNuiBooking.openTour('${t.slug}')">${EN() ? 'Book tour' : 'Đặt tour'}</button>
                </div>
            </div>
        </div>`).join(''));
}

async function napTours() {
    try {
        const response = await fetch('/v1/tours');
        const body = await response.json();
        TOURS = (body.data || []).map(t => ({
            slug: t.slug,
            img: t.image,
            name: t.name,
            nameEn: t.name_en || t.name,
            dur: t.duration || '',
            durEn: t.duration_en || t.duration || '',
            pax: t.pax || '',
            paxEn: t.pax || '',
            r: String(t.rating || ''),
            price: Number(t.price || 0).toLocaleString('vi-VN') + 'đ',
            stops: t.stops || '',
            stopsEn: t.stops || '',
            partner: t.partner_name || '',
        }));
        renderTours();
        if (typeof refreshIcons === 'function') refreshIcons();
    } catch (_) {
        TOURS = [];
        renderTours();
    }
}

function renderServices() {
    // Dịch vụ nào đặt được ngay thì mở thẳng form, còn lại dẫn sang trang liên hệ.
    const action = (s) => {
        if (s.icon === 'car') return `onclick="BayNuiBooking.openTransport()"`;
        if (s.icon === 'ticket') return `onclick="document.getElementById('tour-grid').scrollIntoView({behavior:'smooth'})"`;
        return `onclick="window.location.href='lienhe.html'"`;
    };
    fill('service-grid', SERVICES.map(s => `
        <button type="button" class="service-tile scroll-animate" ${action(s)}>
            <span class="service-tile-icon"><i data-lucide="${s.icon}"></i></span>
            <h4>${esc(L(s, 'name'))}</h4>
            <span>${esc(L(s, 'price'))}</span>
        </button>`).join(''));
}

function renderCombos() {
    fill('combo-grid', COMBOS.map(c => `
        <div class="feature-card scroll-animate">
            <div class="feature-icon eco-gradient"><i data-lucide="${c.icon}"></i></div>
            <h3>${esc(L(c, 'name'))}</h3>
            <p>${esc(L(c, 'desc'))}</p>
            <p style="margin-top:14px;font-family:var(--font-display);font-size:24px;font-weight:600;color:var(--brand-dark)">${c.price}</p>
        </div>`).join(''));
}

// ── Mở chatbot với một câu hỏi sẵn ──
function askBot(question) {
    if (!window.chatbotWidget) return;
    if (!chatbotWidget.isOpen) chatbotWidget.toggle();
    setTimeout(() => {
        const input = document.getElementById('chatbot-input');
        if (input) {
            input.value = question;
            input.dispatchEvent(new Event('input'));
            input.focus();
        }
    }, 320);
}
window.askBot = askBot;

// ── Demo các bước AI trên trang chủ ──
const AI_STEPS = [
    { vi: 'Phân tích thời tiết', en: 'Analysing weather' },
    { vi: 'Tìm địa điểm phù hợp', en: 'Matching places' },
    { vi: 'Kiểm tra khoảng cách', en: 'Checking distances' },
    { vi: 'Chọn phòng còn trống', en: 'Finding available rooms' },
    { vi: 'Gợi ý món ăn địa phương', en: 'Finding local food' },
];
let aiTimers = [];

function renderAiSteps() {
    const host = document.getElementById('ai-steps');
    if (!host) return;
    host.innerHTML = AI_STEPS.map((s, i) => `
        <div class="ai-step" data-step="${i}">
            <span class="ai-step-dot"><i data-lucide="circle" style="width:12px;height:12px"></i></span>
            <span>${EN() ? s.en : s.vi}</span>
        </div>`).join('');
}

function playAiDemo() {
    aiTimers.forEach(clearTimeout);
    aiTimers = [];
    const steps = document.querySelectorAll('#ai-steps .ai-step');
    const result = document.getElementById('ai-result');
    steps.forEach(s => s.classList.remove('on'));
    if (result) result.classList.remove('on');
    steps.forEach((s, i) => {
        aiTimers.push(setTimeout(() => s.classList.add('on'), 700 + i * 900));
    });
    aiTimers.push(setTimeout(() => { if (result) result.classList.add('on'); }, 700 + steps.length * 900));
}
window.playAiDemo = playAiDemo;

// ── Thanh tìm kiếm trang chủ → chuyển sang trang phòng ──
function runSearch(e) {
    if (e) e.preventDefault();
    const get = id => (document.getElementById(id) || {}).value || '';
    const params = new URLSearchParams({
        checkin: get('s-date'),
        nights: get('s-nights'),
        guests: get('s-guests'),
    });
    window.location.href = 'phongnghi.html?' + params.toString();
}
window.runSearch = runSearch;

// ============================================================
// BOOT
// ============================================================
function renderSiteSections() {
    renderExperiences();
    renderDests();
    napDiemDen();
    renderNearby();
    renderFestivals();
    renderFoods();
    renderTours();
    napTours();
    loadExploreDetails();
    renderServices();
    renderCombos();
    renderAiSteps();
    if (typeof refreshIcons === 'function') refreshIcons();
}
window.renderSiteSections = renderSiteSections;

window.addEventListener('DOMContentLoaded', () => {
    renderSiteSections();

    // Ngày check-in mặc định = ngày mai
    const sd = document.getElementById('s-date');
    if (sd && !sd.value) {
        const d = new Date(); d.setDate(d.getDate() + 1);
        sd.value = d.toISOString().split('T')[0];
        sd.min = new Date().toISOString().split('T')[0];
    }

    // Chạy demo AI khi cuộn tới
    const panel = document.getElementById('ai-panel');
    if (panel && 'IntersectionObserver' in window) {
        const io = new IntersectionObserver((entries) => {
            entries.forEach(en => { if (en.isIntersecting) { playAiDemo(); io.disconnect(); } });
        }, { threshold: .25 });
        io.observe(panel);
    }

    // Tabs (trang Khám phá)
    document.querySelectorAll('[data-tab-target]').forEach(btn => {
        btn.addEventListener('click', () => {
            const group = btn.closest('[data-tab-group]');
            if (!group) return;
            group.querySelectorAll('[data-tab-target]').forEach(b => b.classList.toggle('active', b === btn));
            // Trước đây luôn lấy cha trực tiếp. Giờ hàng tab nằm lồng
            // trong thẻ tìm kiếm nên phải nói rõ phạm vi chứa panel.
            const scope = group.closest('[data-tab-scope]') || group.parentElement;
            scope.querySelectorAll('[data-tab-panel]').forEach(p => {
                p.classList.toggle('hidden', p.getAttribute('data-tab-panel') !== btn.getAttribute('data-tab-target'));
            });
            if (typeof refreshIcons === 'function') refreshIcons();
        });
    });
});

// ════════════════════════════════════════════════════════════
// TÌM ĐỊA ĐIỂM Ở TRANG KHÁM PHÁ
// ════════════════════════════════════════════════════════════
// Trang Khám phá có 3 tab: Điểm đến · Trải nghiệm · Lễ hội. Khách muốn tìm
// nhanh một nơi thì không nên bắt họ đoán nó nằm ở tab nào — ô tìm kiếm này
// lọc CẢ BA TAB cùng lúc và tự nhảy sang tab đang có kết quả.
//
// Gõ không dấu vẫn ra: "chua khmer" tìm được "Chùa Khmer & nhạc ngũ âm".

/** Bỏ dấu tiếng Việt để so khớp dễ dãi hơn. */
function plainText(value) {
    return String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/đ/g, 'd');
}

const searchable = (item, fields) =>
    fields.map(f => item[f]).filter(Boolean).join(' ');

function hitsQuery(text, query) {
    if (!query) return true;
    return plainText(text).includes(plainText(query));
}

let exploreQuery = '';
let exploreArea = '';   // tỉnh đang lọc; rỗng = mọi khu vực

/** Tên tỉnh của một điểm đến: "Tịnh Biên, An Giang" -> "An Giang". */
function tinhCua(item) {
    const phan = String(item.area || item.at || '').split(',');
    return phan[phan.length - 1].trim();
}

function renderExploreSearch() {
    // Ô tỉnh lọc thêm một lớp nữa. Trải nghiệm là nhóm chủ đề chứ không gắn
    // địa chỉ, nên chọn tỉnh thì tab đó rỗng — đúng như vậy, và câu "không có
    // trải nghiệm nào khớp" bên dưới sẽ nói rõ.
    const hopTinh = (item) => !exploreArea
        || hitsQuery(searchable(item, ['area', 'at', 'name', 'nameEn']), exploreArea);

    const dests = (DIEM_DEN_MAY_CHU || DESTS).filter(d =>
        hitsQuery(searchable(d, ['name', 'nameEn', 'area', 'badge']), exploreQuery) && hopTinh(d));
    const exps = EXPERIENCES.filter(x =>
        hitsQuery(searchable(x, ['title', 'titleEn', 'desc', 'descEn']), exploreQuery) && hopTinh(x));
    const fests = FESTIVALS.filter(f =>
        hitsQuery(searchable(f, ['name', 'nameEn', 'cul', 'at']), exploreQuery) && hopTinh(f));

    renderDests(dests);
    renderExperiences(exps);
    renderFestivals(fests);

    // Tab nào rỗng thì nói rõ, đừng để khách nhìn khoảng trắng
    const emptyNote = (id, label) => {
        const host = document.getElementById(id);
        if (host && !host.children.length && (exploreQuery || exploreArea)) {
            const dieu = [exploreQuery, exploreArea].filter(Boolean).join(' · ');
            host.innerHTML = `<p class="explore-empty">${EN() ? 'No' : 'Không có'} ${label} ${EN() ? 'matches' : 'nào khớp'} “${esc(dieu)}”.</p>`;
        }
    };
    emptyNote('dest-grid', EN() ? 'destination' : 'điểm đến');
    emptyNote('exp-grid', EN() ? 'experience' : 'trải nghiệm');
    emptyNote('fest-list', EN() ? 'festival' : 'lễ hội');

    const total = dests.length + exps.length + fests.length;
    const info = document.getElementById('explore-search-info');
    if (info) {
        const dieu = [exploreQuery, exploreArea].filter(Boolean).join(' · ');
        info.textContent = !dieu ? ''
            : total
                ? (EN() ? `${total} results · ${dests.length} destinations · ${exps.length} experiences · ${fests.length} festivals`
                        : `${total} kết quả · ${dests.length} điểm đến · ${exps.length} trải nghiệm · ${fests.length} lễ hội`)
                : (EN() ? `Nothing found for “${dieu}”` : `Không tìm thấy gì cho “${dieu}”`);
    }

    const clear = document.getElementById('explore-search-clear');
    if (clear) clear.style.display = exploreQuery ? '' : 'none';

    // Tự nhảy sang tab đang có kết quả để khách khỏi phải mò từng tab
    if ((exploreQuery || exploreArea) && total) {
        const target = dests.length ? 'dest' : exps.length ? 'exp' : 'fest';
        const btn = document.querySelector(`[data-tab-target="${target}"]`);
        if (btn && !btn.classList.contains('active')) btn.click();
    }
    if (window.lucide) lucide.createIcons();
}

function searchExplore(value) {
    exploreQuery = String(value || '').trim();
    renderExploreSearch();
    renderExploreDetails();
}

function clearExploreSearch() {
    const input = document.getElementById('explore-search');
    if (input) { input.value = ''; input.focus(); }
    searchExplore('');
}

/** Ô "khu vực" trên thanh tìm. */
function setExploreArea(value) {
    exploreArea = String(value || '');
    renderExploreSearch();
    renderExploreDetails();
}

/**
 * Nút cam "Tìm ngay".
 *
 * Danh sách đã lọc sẵn theo từng chữ gõ vào, nên nút này không phải để chạy
 * lại phép lọc — nó đưa mắt khách xuống chỗ kết quả. Trên điện thoại thanh
 * tìm chiếm gần hết màn hình, bấm xong mà màn hình đứng yên thì tưởng hỏng.
 */
function runExploreSearch() {
    renderExploreSearch();
    renderExploreDetails();
    const dest = document.querySelector('[data-tab-panel]:not(.hidden)');
    if (dest) dest.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** Đổ danh sách tỉnh vào ô lọc — lấy thẳng từ dữ liệu, không viết cứng. */
function napLocTinh() {
    const sel = document.getElementById('explore-area');
    if (!sel) return;
    const tinh = [];
    (exploreDetails || []).forEach(p => {
        const t = tinhCua(p);
        if (t && !tinh.includes(t)) tinh.push(t);
    });
    tinh.sort((a, b) => a.localeCompare(b, 'vi'));
    sel.innerHTML = `<option value="">${EN() ? 'Any area' : 'Mọi khu vực'}</option>`
        + tinh.map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join('');
    sel.value = exploreArea;
}

// ════════════════════════════════════════════════════════════
// CHI TIẾT TỪNG ĐIỂM ĐẾN
// ════════════════════════════════════════════════════════════
// Trước đây khối này là HTML viết cứng trong khampha.html: sáu bài mô tả dài,
// không có data-i18n nào. Bấm sang tiếng Anh thì tiêu đề đổi còn toàn bộ nội
// dung đứng yên tiếng Việt — khách nước ngoài đọc được đúng cái tiêu đề.
//
// Giờ dựng từ /v1/places, tức CÙNG nguồn dữ liệu mà app Android đang dùng.
// Sửa mô tả một chỗ là cả web lẫn app cùng đổi, khỏi lệch nhau.

let exploreDetails = [];
let diemDangXem = '';       // slug điểm đang mở ở khung bên phải

async function loadExploreDetails() {
    const host = document.getElementById('explore-details');
    if (!host) return;

    // Đổi ngôn ngữ thì gọi lại hàm này; đã có dữ liệu rồi thì vẽ lại thôi,
    // khỏi tải lại từ máy chủ.
    if (!exploreDetails.length) {
        try {
            const res = await fetch('/v1/places');
            exploreDetails = (await res.json()).data || [];
        } catch (_) {
            host.innerHTML = '';
            return;
        }
    }
    napLocTinh();
    renderExploreDetails();

    // Vào bằng đường dẫn có #slug thì mở sẵn điểm đó
    const neo = decodeURIComponent(String(location.hash || '').replace('#', ''));
    if (neo && exploreDetails.some(p => p.slug === neo)) chonDiemDen(neo);
}

/** Danh sách điểm còn lại sau khi lọc ở thanh tìm. */
function diemDenDaLoc() {
    return exploreDetails.filter(p =>
        hitsQuery(searchable(p, ['name', 'nameEn', 'area', 'category', 'categoryEn', 'summary', 'summaryEn']), exploreQuery)
        && (!exploreArea || tinhCua(p) === exploreArea));
}

/**
 * Vẽ khối "Đi sâu vào từng điểm đến".
 *
 * Trước đây mỗi điểm là một khối cao gần bằng màn hình, mười bảy điểm là
 * mười bảy lần cuộn — mà tab "Điểm đến" ngay phía trên đã liệt kê đúng
 * mười bảy nơi đó rồi. Giờ đổi thành danh sách gọn nhóm theo tỉnh ở bên
 * trái, khung chi tiết dính theo ở bên phải: bấm tên nào đọc ngay nơi đó,
 * cả khối chỉ cao một màn hình.
 */
function renderExploreDetails() {
    const host = document.getElementById('explore-details');
    if (!host) return;

    const ds = diemDenDaLoc();
    if (!ds.length) {
        host.innerHTML = `<p class="explore-empty">${EN()
            ? 'No destination matches the current filter.'
            : 'Không có điểm đến nào khớp với ô tìm phía trên.'}</p>`;
        return;
    }

    // Điểm đang xem bị lọc mất thì chuyển sang điểm đầu danh sách
    if (!ds.some(p => p.slug === diemDangXem)) diemDangXem = ds[0].slug;

    // Gom theo tỉnh, giữ nguyên thứ tự dữ liệu trả về
    const nhom = [];
    ds.forEach(p => {
        const t = tinhCua(p) || (EN() ? 'Other' : 'Nơi khác');
        let g = nhom.find(x => x.ten === t);
        if (!g) { g = { ten: t, items: [] }; nhom.push(g); }
        g.items.push(p);
    });

    const dong = (p) => {
        const phu = [L(p, 'duration'), p.distance_km != null ? `${String(p.distance_km).replace('.', ',')} km` : '']
            .filter(Boolean).join(' · ');
        return `
        <button type="button" id="${esc(p.slug)}" class="pex-item${p.slug === diemDangXem ? ' on' : ''}"
                data-slug="${esc(p.slug)}" onclick="chonDiemDen('${esc(p.slug)}', true)">
            <img src="${esc(p.image)}" alt="" loading="lazy">
            <span class="pex-item-txt">
                <b>${esc(L(p, 'name'))}</b>
                <small>${esc(phu)}</small>
            </span>
            <i data-lucide="chevron-right" class="chev"></i>
        </button>`;
    };

    host.innerHTML = `
        <div class="pex">
            <div class="pex-list">
                ${nhom.map(g => `
                    <div class="pex-group">${esc(g.ten)}<span>${g.items.length}</span></div>
                    ${g.items.map(dong).join('')}`).join('')}
            </div>
            <div class="pex-panel" id="pex-panel"></div>
        </div>`;

    veKhungDiemDen();
    if (window.lucide) lucide.createIcons();
}

/** Bấm một dòng trong danh sách. */
function chonDiemDen(slug, tuNguoiDung) {
    diemDangXem = slug;
    document.querySelectorAll('.pex-item').forEach(el =>
        el.classList.toggle('on', el.getAttribute('data-slug') === slug));
    veKhungDiemDen();
    if (window.lucide) lucide.createIcons();

    // Màn hình hẹp: khung chi tiết nằm dưới danh sách, phải đưa nó lên
    // cho khách thấy — không thì bấm xong tưởng không có gì xảy ra.
    if (tuNguoiDung && window.matchMedia('(max-width: 900px)').matches) {
        const khung = document.getElementById('pex-panel');
        if (khung) khung.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function veKhungDiemDen() {
    const khung = document.getElementById('pex-panel');
    const p = exploreDetails.find(x => x.slug === diemDangXem);
    if (!khung || !p) return;

    const t = {
        schedule: EN() ? 'When to go' : 'Nên đi lúc nào',
        notes: EN() ? 'Good to know' : 'Lưu ý trước khi đi',
        open: EN() ? 'Open' : 'Giờ mở cửa',
        from: EN() ? 'from the homestay' : 'từ homestay',
        detail: EN() ? 'Full guide' : 'Xem trang chi tiết',
        stay: EN() ? 'Stays nearby' : 'Chỗ nghỉ quanh đây',
    };
    const chip = (icon, chu) => chu
        ? `<span class="pex-chip"><i data-lucide="${icon}"></i>${esc(chu)}</span>` : '';

    khung.innerHTML = `
        <article class="pex-card">
            <div class="pex-photo">
                <img src="${esc(p.image)}" alt="${esc(L(p, 'name'))}">
                <span class="pex-cat">${esc(L(p, 'category'))}</span>
                ${p.rating ? `<span class="pex-rate"><i data-lucide="star"></i>${p.rating}</span>` : ''}
            </div>
            <div class="pex-body">
                <h3>${esc(L(p, 'name'))}</h3>
                <p class="pex-area"><i data-lucide="map-pin"></i>${esc(p.area || '')}</p>
                <p class="pex-sum">${esc(L(p, 'summary'))}</p>

                <div class="pex-chips">
                    ${chip('clock', L(p, 'duration'))}
                    ${p.distance_km != null ? chip('navigation', `${String(p.distance_km).replace('.', ',')} km ${t.from}`) : ''}
                    ${chip('ticket', L(p, 'ticket'))}
                    ${chip('sun', L(p, 'openTime') ? `${t.open}: ${L(p, 'openTime')}` : '')}
                </div>

                <div class="pex-notes">
                    ${L(p, 'bestTime') ? `
                        <div class="pex-note">
                            <b><i data-lucide="calendar-clock"></i>${t.schedule}</b>
                            <p>${esc(L(p, 'bestTime'))}</p>
                        </div>` : ''}
                    ${L(p, 'tips') ? `
                        <div class="pex-note warn">
                            <b><i data-lucide="info"></i>${t.notes}</b>
                            <p>${esc(L(p, 'tips'))}</p>
                        </div>` : ''}
                </div>

                <div class="pex-acts">
                    <a class="lm-btn lm-btn-primary" href="diadiem.html?slug=${encodeURIComponent(p.slug)}">
                        <i data-lucide="book-open"></i>${t.detail}</a>
                    <a class="lm-btn lm-btn-ghost" href="phongnghi.html?q=${encodeURIComponent(tinhCua(p))}">
                        <i data-lucide="bed-double"></i>${t.stay}</a>
                </div>
            </div>
        </article>`;
}
