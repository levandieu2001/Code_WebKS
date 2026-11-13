// ============================================================
// LOCALMATE — Sinh lịch trình cho khách
// ============================================================
// Lịch trình được DỰNG BẰNG LUẬT từ dữ liệu thật của hệ thống:
// địa điểm (lib/content.js), món ăn, khách sạn đối tác có toạ độ
// (lib/partners.js), khoảng cách (lib/geo.js) và thời tiết
// (lib/weather.js).
//
// VÌ SAO KHÔNG ĐỂ LLM TỰ VIẾT CẢ LỊCH TRÌNH:
// mô hình ngôn ngữ rất giỏi viết văn nhưng hay bịa số — bịa giá vé,
// bịa khoảng cách, bịa tên quán. Ở đây mọi con số đều do code tính
// từ dữ liệu đối tác thật. LLM chỉ được nhờ viết lại phần lời dẫn
// cho mượt (xem enrichWithAI), và nếu Gemini lỗi thì lịch trình vẫn
// đúng, chỉ là văn khô hơn.
//
// Thứ tự dựng:
//   1. Lọc địa điểm theo sở thích khách chọn
//   2. Gom theo cụm địa lý — không bắt khách chạy tới chạy lui
//   3. Rải theo khung giờ: sáng tham quan · trưa ăn · chiều tham quan · tối nghỉ
//   4. Chèn món ăn gần điểm dừng buổi trưa
//   5. Chọn khách sạn đối tác gần điểm cuối trong ngày
//   6. Né giờ mưa theo dự báo
//   7. Cộng chi phí, so với ngân sách
// ============================================================

const { PLACES, FOODS } = require('./content');
const { allPartnerStays } = require('./partners');
const listings = require('./listings');
const { haversineKm, coordsFromName, HOME_LAT, HOME_LNG } = require('./geo');
const { getWeather, getOutlook } = require('./weather');
const events = require('./events');

// ── Nhóm sở thích → thẻ tag trong dữ liệu địa điểm ──
const PREFERENCE_TAGS = {
    'van-hoa': ['van-hoa', 'khmer', 'tam-linh'],
    'thien-nhien': ['thien-nhien', 'sinh-thai', 'check-in'],
    'am-thuc': ['am-thuc'],
    'nghi-duong': ['trai-nghiem', 'camping'],
};

const PREFERENCE_LABELS = {
    'van-hoa': 'Văn hoá',
    'thien-nhien': 'Thiên nhiên',
    'am-thuc': 'Ẩm thực',
    'nghi-duong': 'Nghỉ dưỡng',
};

// Ngân sách mỗi khách (đồng) → mức chi tiêu
const BUDGET_TIERS = [
    { max: 500000, label: 'Tiết kiệm', stayMax: 400000 },
    { max: 1000000, label: 'Vừa phải', stayMax: 600000 },
    { max: 2000000, label: 'Thoải mái', stayMax: 1200000 },
    { max: Infinity, label: 'Cao cấp', stayMax: Infinity },
];

// Địa điểm ngoài trời — mưa thì nên dời
const OUTDOOR_TAGS = ['thien-nhien', 'sinh-thai', 'check-in', 'camping'];

const isOutdoor = (place) => (place.tags || []).some(t => OUTDOOR_TAGS.includes(t));

// Giữ khớp với bảng VEHICLES trong lib/api.js — dùng để ước giá từng chặng
const VEHICLE_TABLE = [
    { type: "motorbike", label: "Xe máy", seats: 1, base: 30000, perKm: 3500 },
    { type: "4-seat", label: "Xe 4 chỗ", seats: 4, base: 250000, perKm: 5000 },
    { type: "7-seat", label: "Xe 7 chỗ", seats: 7, base: 350000, perKm: 6500 },
    { type: "16-seat", label: "Xe 16 chỗ", seats: 16, base: 600000, perKm: 9000 },
];

/** Các loại xe chở đủ số khách, kèm giá ước tính cho quãng đường này. */
function rideOptions(km, people) {
    return VEHICLE_TABLE
        .filter(v => v.seats >= people)
        .map(v => ({
            type: v.type,
            label: v.label,
            seats: v.seats,
            price: Math.round((v.base + v.perKm * km) / 1000) * 1000,
        }));
}

// ── Tiện ích thời gian ──
const toMinutes = (hhmm) => {
    const [h, m] = String(hhmm).split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
};
const toClock = (minutes) => {
    const m = ((minutes % 1440) + 1440) % 1440;
    return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

/** Ước lượng thời gian tham quan (phút) từ chuỗi "3 tiếng", "Nửa ngày"… */
function visitMinutes(place) {
    const d = String(place.duration || '').toLowerCase();
    if (d.includes('qua đêm')) return 240;
    if (d.includes('nửa ngày')) return 210;
    const hours = d.match(/(\d+)\s*[–-]\s*(\d+)\s*tiếng/);
    if (hours) return ((Number(hours[1]) + Number(hours[2])) / 2) * 60;
    const one = d.match(/(\d+)\s*tiếng/);
    if (one) return Number(one[1]) * 60;
    return 120;
}

/** Thời gian di chuyển giữa 2 điểm, ước theo đường bộ (chim bay × 1,3, 35 km/h). */
function travelMinutes(from, to) {
    if (!from || !to) return 20;
    const km = haversineKm(from.lat, from.lng, to.lat, to.lng) * 1.3;
    return Math.max(10, Math.round((km / 35) * 60));
}

/** Vé vào cửa dạng số, đọc từ chuỗi "Khoảng 100.000đ". */
function ticketPrice(place) {
    const digits = String(place.ticket || '').replace(/\./g, '').match(/(\d{4,})/);
    return digits ? Number(digits[1]) : 0;
}

const addDays = (isoDate, days) => {
    const d = new Date(`${isoDate}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) return isoDate;
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().split('T')[0];
};

// ════════════════════════════════════════════════════════════
// 1. CHỌN ĐỊA ĐIỂM THEO SỞ THÍCH
// ════════════════════════════════════════════════════════════
function scorePlaces(preferences) {
    const wanted = new Set();
    for (const p of preferences) (PREFERENCE_TAGS[p] || []).forEach(t => wanted.add(t));

    return PLACES
        .map(place => {
            const tags = place.tags || [];
            const hits = tags.filter(t => wanted.has(t)).length;
            // Khách không chọn gì thì xếp theo đánh giá; có chọn thì ưu tiên khớp sở thích
            const score = wanted.size ? hits * 10 + place.rating : place.rating;
            return { place, score, hits };
        })
        .filter(x => !wanted.size || x.hits > 0)
        .sort((a, b) => b.score - a.score)
        .map(x => x.place);
}

/**
 * Xếp các điểm thành chuỗi ngắn nhất theo kiểu "gần nhất trước".
 * Mục đích: khách không phải chạy Tri Tôn → Châu Đốc → Tri Tôn.
 */
function routeFrom(start, places) {
    const left = [...places];
    const path = [];
    let current = start;
    while (left.length) {
        let best = 0;
        let bestKm = Infinity;
        left.forEach((p, i) => {
            const km = haversineKm(current.lat, current.lng, p.lat, p.lng);
            if (km < bestKm) { bestKm = km; best = i; }
        });
        const next = left.splice(best, 1)[0];
        path.push(next);
        current = next;
    }
    return path;
}

// ════════════════════════════════════════════════════════════
// 2. DỰNG LỊCH TỪNG NGÀY
// ════════════════════════════════════════════════════════════
function buildDay({ dayIndex, isLastDay, places, startPoint, dayStart, dayStartLabel, people, tier, rainHours }) {
    const items = [];
    // Mỗi ngày đều bắt đầu lại từ 07:30 — không cộng dồn giờ của ngày hôm trước
    let clock = toMinutes('07:30');
    let here = dayStart;
    let cost = 0;
    let lunchDone = false;

    // Chặng xe đầu ngày: ngày 1 đi từ nhà khách, các ngày sau đi từ chỗ nghỉ
    const first = places[0];
    if (first) {
        const ride = travelMinutes(dayStart, first);
        const km = Math.round(haversineKm(dayStart.lat, dayStart.lng, first.lat, first.lng) * 1.3);
        const rides = rideOptions(km, people);
        items.push({
            time: toClock(clock),
            kind: 'transport',
            title: dayIndex === 0 ? `Khởi hành từ ${startPoint}` : `Rời ${dayStartLabel}`,
            subtitle: `Xe đưa đón · ${km} km · khoảng ${Math.round(ride)} phút tới ${first.name.split('—')[0].trim()}`,
            distance_km: km,
            ride_options: rides,
            price: rides[0]?.price || 0,
            action: 'book_transport',
            action_label: 'Đặt xe',
            payload: { pickup: dayIndex === 0 ? startPoint : dayStartLabel, dropoff: first.name, time: toClock(clock) },
        });
        clock += ride;
    }

    for (const place of places) {
        // Điểm đầu tiên đã cộng thời gian di chuyển ở trên rồi
        if (place !== first) clock += travelMinutes(here, place);

        // Chèn bữa trưa vào khoảng 11:00–13:00
        if (!lunchDone && clock >= toMinutes('11:00')) {
            const food = pickFood(place);
            if (food) {
                items.push({
                    time: toClock(Math.max(clock, toMinutes('11:30'))),
                    kind: 'food',
                    slug: food.slug,
                    title: food.name,
                    subtitle: `Bữa trưa · ${food.where}`,
                    price: food.price * people,
                    image: food.image,
                    action: 'view_place',
                    action_label: 'Xem quán',
                });
                cost += food.price * people;
                clock = Math.max(clock, toMinutes('11:30')) + 60;
            }
            lunchDone = true;
        }

        const stay = visitMinutes(place);
        const ticket = ticketPrice(place) * people;
        const rainy = isOutdoor(place) && rainHours.includes(Math.floor(clock / 60));

        items.push({
            time: toClock(clock),
            kind: 'place',
            slug: place.slug,
            title: place.name,
            subtitle: `${place.category} · ${Math.round(stay)} phút`,
            price: ticket,
            image: place.image,
            // Cần cho việc đổi lịch né mưa lúc khách đang trên đường
            outdoor: isOutdoor(place),
            tip: place.tips || '',
            weather_note: rainy
                ? 'Dự báo có mưa quanh giờ này — mang áo mưa, hoặc đổi sang buổi chiều.'
                : '',
            action: 'view_place',
            action_label: 'Xem chi tiết',
        });
        cost += ticket;
        clock += stay;
        here = place;
    }

    // Lịch nhẹ, chưa kịp ăn trưa trong vòng lặp → chèn vào giữa buổi
    if (!lunchDone && places.length) {
        const food = pickFood(places[places.length - 1]);
        // Quá 13:30 rồi thì thôi, khách ăn dọc đường
        if (food && clock <= toMinutes('13:30')) {
            items.push({
                time: toClock(Math.max(clock, toMinutes('11:30'))),
                kind: 'food',
                slug: food.slug,
                title: food.name,
                subtitle: `Bữa trưa · ${food.where}`,
                price: food.price * people,
                image: food.image,
                action: 'view_place',
                action_label: 'Xem quán',
            });
            cost += food.price * people;
            clock = Math.max(clock, toMinutes('11:30')) + 60;
        }
    }

    // Ngày cuối thì về, không ăn tối ở đây nữa
    if (isLastDay) {
        const ride = travelMinutes(here, dayStart);
        const backKm = Math.round(haversineKm(here.lat, here.lng, dayStart.lat, dayStart.lng) * 1.3);
        const backRides = rideOptions(backKm, people);
        items.push({
            time: toClock(Math.max(clock, toMinutes('16:00'))),
            kind: 'transport',
            title: `Về ${startPoint}`,
            subtitle: `Xe đưa đón · ${backKm} km · khoảng ${Math.round(ride)} phút`,
            distance_km: backKm,
            ride_options: backRides,
            price: backRides[0]?.price || 0,
            action: 'book_transport',
            action_label: 'Đặt xe về',
            payload: { pickup: here.name || dayStartLabel, dropoff: startPoint, time: toClock(Math.max(clock, toMinutes('16:00'))) },
        });
    } else {
        const dinner = FOODS.find(f => !items.some(i => i.slug === f.slug)) || FOODS[0];
        items.push({
            time: toClock(Math.max(clock, toMinutes('18:30'))),
            kind: 'food',
            slug: dinner.slug,
            title: dinner.name,
            subtitle: `Bữa tối · ${dinner.where}`,
            price: dinner.price * people,
            image: dinner.image,
            action: 'view_place',
            action_label: 'Xem quán',
        });
        cost += dinner.price * people;
    }

    // Chốt lại theo thứ tự giờ — bữa trưa chèn sau vòng lặp có thể lệch chỗ
    items.sort((a, b) => toMinutes(a.time) - toMinutes(b.time));

    return { items, cost, endPoint: here, endClock: clock };
}

/** Món ăn hợp với địa điểm — ưu tiên món được khai báo ngay trong địa điểm đó. */
function pickFood(place) {
    const linked = (place.foods || []).map(slug => FOODS.find(f => f.slug === slug)).filter(Boolean);
    return linked[0] || FOODS[0] || null;
}

/**
 * Khách sạn đối tác gần điểm cuối trong ngày, nằm trong tầm ngân sách.
 * Trả về chỗ hợp nhất kèm 2 lựa chọn thay thế, để khách tự cân nhắc
 * giữa "gần nhất" và "rẻ hơn / điểm cao hơn".
 */
function pickStay(endPoint, tier, people) {
    const ranked = allPartnerStays()
        .filter(s => s.capacity >= Math.min(people, 4))
        .map(s => ({ ...s, km: Math.round(haversineKm(endPoint.lat, endPoint.lng, s.lat, s.lng) * 1.3 * 10) / 10 }))
        // Điểm phù hợp: ưu tiên gần, cộng điểm đánh giá, trừ nếu vượt ngân sách
        .map(s => ({
            ...s,
            score: -s.km * 2 + s.rating * 3 + (s.price <= tier.stayMax ? 4 : -6),
        }))
        .sort((a, b) => b.score - a.score);

    const best = ranked[0];
    if (!best) return null;

    return {
        ...best,
        // Vì sao chọn chỗ này — nói thẳng để khách tin
        reason: [
            `cách điểm cuối ${String(best.km).replace('.', ',')} km`,
            `${best.rating}★`,
            best.price <= tier.stayMax ? 'vừa ngân sách' : 'nhỉnh hơn ngân sách một chút',
        ].join(' · '),
        alternatives: ranked.slice(1, 3).map(s => ({
            id: s.id,
            name: s.name,
            price: s.price,
            rating: s.rating,
            km: s.km,
            area: s.area || '',
            note: s.price < best.price ? 'Rẻ hơn' : s.km < best.km ? 'Gần hơn' : 'Đánh giá cao',
        })),
    };
}

// ════════════════════════════════════════════════════════════
// 3. HÀM CHÍNH
// ════════════════════════════════════════════════════════════
async function buildItinerary(input) {
    const days = Math.min(Math.max(Number(input.days) || 2, 1), 5);
    const people = Math.min(Math.max(Number(input.people) || 2, 1), 20);
    const budgetPerPerson = Number(input.budget) || 1000000;
    const startPoint = String(input.start_point || 'Châu Đốc').trim();
    const startDate = String(input.start_date || '').match(/^\d{4}-\d{2}-\d{2}$/)
        ? input.start_date
        : new Date().toISOString().split('T')[0];
    const preferences = Array.isArray(input.preferences) ? input.preferences : [];

    const tier = BUDGET_TIERS.find(t => budgetPerPerson <= t.max);
    const startCoords = coordsFromName(startPoint) || { lat: HOME_LAT, lng: HOME_LNG };

    // Giờ dự báo có mưa (theo giờ trong ngày) — để né hoạt động ngoài trời
    let rainHours = [];
    try {
        const weather = await getWeather(HOME_LAT, HOME_LNG);
        rainHours = (weather.hourly || [])
            .filter(h => (h.rain_probability || 0) >= 60)
            .map(h => Number(String(h.time).slice(11, 13)))
            .filter(Number.isFinite);
    } catch (_) { /* không có thời tiết thì vẫn dựng được lịch trình */ }

    // Dự báo theo NGÀY cho cả chuyến — khách đi tuần sau vẫn biết hôm đó mưa hay nắng
    let outlook = {};
    try {
        outlook = (await getOutlook(HOME_LAT, HOME_LNG)).by_date || {};
    } catch (_) { /* thiếu dự báo thì lịch trình vẫn dùng được */ }

    // Mỗi ngày 2–3 điểm. Nếu sở thích khách chọn không đủ điểm cho từng ấy
    // ngày thì bù thêm từ những nơi được đánh giá cao nhất, để không có
    // ngày nào chỉ vỏn vẹn một điểm.
    const matched = scorePlaces(preferences);
    const perDay = days === 1 ? 3 : 2;
    const need = days * perDay;
    const pool = [...matched];
    if (pool.length < need) {
        for (const place of [...PLACES].sort((a, b) => b.rating - a.rating)) {
            if (pool.length >= need) break;
            if (!pool.some(p => p.slug === place.slug)) pool.push(place);
        }
    }
    const ordered = routeFrom(startCoords, pool);

    const dayPlans = [];
    let total = 0;
    // Ngày 1 xuất phát từ chỗ khách; các ngày sau xuất phát từ nơi nghỉ đêm trước
    let dayStart = startCoords;
    let dayStartLabel = startPoint;

    for (let d = 0; d < days; d += 1) {
        let chunk = ordered.slice(d * perDay, (d + 1) * perDay);
        // Hết địa điểm mới thì quay lại những nơi đáng đi nhất
        if (!chunk.length) chunk = ordered.slice(0, perDay);

        const day = buildDay({
            dayIndex: d,
            isLastDay: d === days - 1,
            places: chunk,
            startPoint,
            dayStart,
            dayStartLabel,
            people,
            tier,
            rainHours,
        });

        // Đêm cuối thì khách về, không cần giữ phòng
        const needStay = d < days - 1;
        let stay = null;
        if (needStay) {
            stay = pickStay(day.endPoint, tier, people);
            if (stay) {
                day.items.push({
                    time: '20:00',
                    kind: 'stay',
                    slug: stay.id,
                    title: stay.name,
                    subtitle: `Nghỉ đêm · ${stay.reason}`,
                    price: stay.price,
                    image: stay.image,
                    action: 'book_stay',
                    action_label: 'Giữ phòng',
                    payload: { stay_id: stay.id, check_in: addDays(startDate, d), check_out: addDays(startDate, d + 1) },
                    area: stay.area || '',
                    alternatives: stay.alternatives || [],
                });
                day.cost += stay.price;
                dayStart = { lat: stay.lat, lng: stay.lng };
                dayStartLabel = stay.name;
            }
        }

        // Lễ hội admin đã đăng, rơi đúng ngày này → chèn vào lịch trình
        const date = addDays(startDate, d);
        const dayEvents = events.eventsOn(date);
        for (const ev of dayEvents) {
            day.items.push({
                time: ev.startTime || '08:00',
                kind: 'event',
                slug: ev.id,
                title: ev.name,
                subtitle: `${events.CATEGORY_LABELS[ev.category] || 'Sự kiện'} · ${ev.area} · ${ev.ticket || 'Miễn phí'}`,
                image: ev.image || '',
                tip: ev.detail || ev.summary || '',
                action: ev.placeSlug ? 'view_place' : '',
                action_label: ev.placeSlug ? 'Xem địa điểm' : '',
                payload: ev.placeSlug ? { place_slug: ev.placeSlug } : null,
            });
        }
        if (dayEvents.length) {
            day.items.sort((a, b) => {
                const m = (t) => { const [h, mm] = String(t).split(':').map(Number); return (h || 0) * 60 + (mm || 0); };
                return m(a.time) - m(b.time);
            });
        }

        total += day.cost;
        dayPlans.push({
            day: d + 1,
            date,
            title: chunk.length ? `${chunk[0].area.split(',')[0]} — ${chunk.map(p => p.name.split('—')[0].trim()).join(' · ')}` : `Ngày ${d + 1}`,
            items: day.items,
            cost: day.cost,
            stay,
            // Dự báo riêng cho ngày này, để khách biết trước nên mang gì
            weather: outlook[date] || null,
            events: dayEvents.map(e => ({
                id: e.id, name: e.name, area: e.area, ticket: e.ticket,
                summary: e.summary, category: e.category,
            })),
        });
    }

    // Tour trọn gói khớp với sở thích, để khách chọn thay vì tự đi lẻ
    const suggestedTours = listings.liveTours().map(listings.toTourShape)
        .filter(t => t.days <= days)
        .map(t => ({
            slug: t.slug, name: t.name, image: t.image, price: t.price,
            days: t.days, duration: t.duration, rating: t.rating, stops: t.stops,
            total: t.price * people,
        }))
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 2);

    const budgetTotal = budgetPerPerson * people;
    const prefLabels = preferences.map(p => PREFERENCE_LABELS[p] || p).filter(Boolean);

    return {
        title: prefLabels.length
            ? `${prefLabels.join(' · ')} — ${days} ngày ở Bảy Núi`
            : `${days} ngày khám phá Bảy Núi`,
        start_date: startDate,
        end_date: addDays(startDate, days - 1),
        days,
        people,
        start_point: startPoint,
        preferences,
        budget_tier: tier.label,
        budget_total: budgetTotal,
        estimated_total: total,
        over_budget: total > budgetTotal,
        budget_note: total > budgetTotal
            ? `Lịch trình này khoảng ${total.toLocaleString('vi-VN')}đ, vượt ngân sách ${(total - budgetTotal).toLocaleString('vi-VN')}đ. Bạn có thể bỏ bớt một điểm hoặc chọn chỗ nghỉ rẻ hơn.`
            : `Lịch trình này khoảng ${total.toLocaleString('vi-VN')}đ cho ${people} khách, còn dư ${(budgetTotal - total).toLocaleString('vi-VN')}đ so với ngân sách.`,
        summary: '',   // enrichWithAI điền vào
        plan: dayPlans,
        tours: suggestedTours,
        weather_aware: rainHours.length > 0,
        // Tổng hợp để hiện ngay đầu lịch trình
        weather_days: dayPlans.map(d => d.weather).filter(Boolean),
        weather_warning: (() => {
            const wet = dayPlans.filter(d => (d.weather?.rain_probability || 0) >= 70);
            if (!wet.length) return '';
            const which = wet.map(d => `Ngày ${d.day}`).join(', ');
            return `${which} dự báo mưa nhiều. Lịch trình đã ưu tiên điểm trong nhà vào giờ mưa, `
                + 'và trong lúc đi hệ thống sẽ nhắc nếu cần đổi.';
        })(),
        events: dayPlans.flatMap(d => d.events.map(e => ({ ...e, day: d.day, date: d.date }))),
        event_highlight: (() => {
            const all = dayPlans.flatMap(d => d.events.map(e => ({ ...e, day: d.day })));
            if (!all.length) return '';
            const first = all[0];
            return `Chuyến của bạn trúng ${first.name} ở ${first.area} — đã xếp vào Ngày ${first.day}.`;
        })(),
    };
}

module.exports = { buildItinerary, PREFERENCE_LABELS, PREFERENCE_TAGS };

// ════════════════════════════════════════════════════════════
// ĐỔI LỊCH NÉ MƯA KHI KHÁCH ĐANG TRÊN ĐƯỜNG
// ════════════════════════════════════════════════════════════
// Lúc dựng lịch trình mới chỉ CẢNH BÁO có mưa. Phần này đi xa hơn:
// khách đang đi, dự báo theo giờ thay đổi, hệ thống soi những điểm
// NGOÀI TRỜI còn lại trong ngày rơi vào giờ mưa, rồi đề xuất đổi chỗ
// với một điểm TRONG NHÀ ở khung giờ khô ráo. Khách bấm một nút là đổi.

// Từ 60% trở lên mới coi là "sắp mưa". Đặt REPLAN_RAIN_THRESHOLD để hạ ngưỡng
// khi cần thử nghiệm vào ngày trời đẹp.
const RAIN_THRESHOLD = Number(process.env.REPLAN_RAIN_THRESHOLD) || 60;

/**
 * Soi lịch trình của ngày hôm nay và đề xuất hoán đổi giờ.
 * @param trip lịch trình đã lưu
 * @param nowIso thời điểm hiện tại dạng ISO (để test cho dễ)
 */
async function suggestReplan(trip, nowIso = new Date().toISOString(), forecast = null) {
    const today = nowIso.slice(0, 10);
    const nowMin = toMinutes(nowIso.slice(11, 16));

    const day = (trip.plan || []).find(d => d.date === today);
    if (!day) {
        return { state: 'not_today', message: 'Hôm nay không có mục nào trong lịch trình này.', swaps: [] };
    }

    // `forecast` chỉ dùng khi chạy kiểm thử; thực tế luôn lấy từ Open-Meteo
    let hourly = forecast;
    if (!hourly) {
        try {
            const weather = await getWeather(HOME_LAT, HOME_LNG);
            hourly = weather.hourly || [];
        } catch (_) {
            return { state: 'no_weather', message: 'Chưa lấy được dự báo lúc này.', swaps: [] };
        }
    }

    // Xác suất mưa theo từng giờ trong hôm nay
    const rainAt = {};
    for (const h of hourly) {
        if (String(h.time).slice(0, 10) !== today) continue;
        rainAt[Number(String(h.time).slice(11, 13))] = h.rain_probability || 0;
    }
    if (!Object.keys(rainAt).length) {
        return { state: 'no_weather', message: 'Chưa có dự báo theo giờ cho hôm nay.', swaps: [] };
    }

    const rainOf = (time) => rainAt[Math.floor(toMinutes(time) / 60)] ?? 0;

    // Chỉ xét những mục CHƯA tới giờ
    const ahead = day.items
        .map((item, index) => ({ item, index }))
        .filter(x => toMinutes(x.item.time) > nowMin)
        .filter(x => x.item.kind === 'place');

    const wet = ahead.filter(x => x.item.outdoor && rainOf(x.item.time) >= RAIN_THRESHOLD);
    if (!wet.length) {
        return {
            state: 'ok',
            message: 'Thời tiết những giờ tới ổn, lịch trình giữ nguyên nhé.',
            swaps: [],
        };
    }

    const swaps = [];
    const used = new Set();
    for (const bad of wet) {
        // Tìm một điểm trong nhà, còn phía trước, đang ở khung giờ khô
        const dry = ahead.find(x =>
            !used.has(x.index) &&
            x.index !== bad.index &&
            !x.item.outdoor &&
            rainOf(x.item.time) < RAIN_THRESHOLD);
        if (!dry) continue;
        used.add(dry.index);
        used.add(bad.index);
        swaps.push({
            outdoor: { index: bad.index, time: bad.item.time, title: bad.item.title, rain: rainOf(bad.item.time) },
            indoor: { index: dry.index, time: dry.item.time, title: dry.item.title, rain: rainOf(dry.item.time) },
            reason: `${bad.item.time} khả năng mưa ${rainOf(bad.item.time)}% ở ${bad.item.title}. `
                + `Đổi sang ${dry.item.time} (khô ráo), và dời ${dry.item.title} — vốn ở trong nhà — `
                + `sang ${bad.item.time}.`,
        });
    }

    if (!swaps.length) {
        const worst = wet[0];
        return {
            state: 'warn',
            message: `${worst.item.time} dự báo mưa ${rainOf(worst.item.time)}% ở ${worst.item.title}. `
                + 'Hôm nay không còn điểm trong nhà để đổi, bạn nhớ mang áo mưa nhé.',
            swaps: [],
        };
    }

    return {
        state: 'suggest',
        message: swaps[0].reason,
        swaps,
    };
}

/**
 * Áp dụng các hoán đổi do suggestReplan đề xuất: tráo giờ của từng cặp
 * rồi xếp lại ngày theo thứ tự thời gian. Sửa trực tiếp trên `trip`.
 * Trả về số cặp đã đổi, hoặc null nếu hôm nay không nằm trong lịch trình.
 */
function applyReplan(trip, swaps, nowIso = new Date().toISOString()) {
    const today = nowIso.slice(0, 10);
    const day = (trip.plan || []).find(d => d.date === today);
    if (!day || !Array.isArray(swaps) || !swaps.length) return null;

    let changed = 0;
    for (const swap of swaps) {
        const a = day.items[swap.outdoor?.index];
        const b = day.items[swap.indoor?.index];
        // Chỉ đổi khi mục vẫn đúng như lúc đề xuất — tránh đổi nhầm nếu
        // lịch trình đã bị sửa ở nơi khác.
        if (!a || !b || a.title !== swap.outdoor.title || b.title !== swap.indoor.title) continue;
        const t = a.time;
        a.time = b.time;
        b.time = t;
        a.weather_note = `Đã dời sang ${a.time} để tránh mưa.`;
        b.weather_note = '';
        changed += 1;
    }
    if (!changed) return null;

    day.items.sort((x, y) => toMinutes(x.time) - toMinutes(y.time));
    day.replanned_at = nowIso;
    return changed;
}

module.exports.suggestReplan = suggestReplan;
module.exports.applyReplan = applyReplan;
module.exports.RAIN_THRESHOLD = RAIN_THRESHOLD;
