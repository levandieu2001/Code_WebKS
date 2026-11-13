// ============================================================
// LOCALMATE — Vị trí & khoảng cách
// ============================================================
// Reverse geocoding dùng Nominatim (OpenStreetMap) — miễn phí, không cần key.
// Gọi ở BACKEND chứ không gọi thẳng từ trình duyệt/app, vì:
//   - Nominatim yêu cầu User-Agent rõ ràng, trình duyệt không đặt được.
//   - Có cache tại đây nên không spam dịch vụ miễn phí của họ.
// ============================================================

const NOMINATIM = 'https://nominatim.openstreetmap.org/reverse';
// Nominatim BAT BUOC khai bao lien he that trong User-Agent; de dia chi ma
// khong ai doc duoc thi ho co quyen chan dia chi IP cua minh.
const USER_AGENT = `LOCALMATE/1.0 (Mekong travel platform; contact: ${require('./lienhe').EMAIL})`;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const TIMEOUT_MS = 8000;

// Homestay: Núi Cấm, Xã An Hảo, Tịnh Biên, An Giang
const HOME_LAT = 10.5117;
const HOME_LNG = 105.0;

// Toạ độ các điểm đón quen thuộc.
// Khách gõ hoặc chọn "Châu Đốc" mà không bật GPS thì vẫn có toạ độ để điều
// phối tài xế — trước đây thiếu bảng này nên đơn không "nổ" cho ai cả.
const PICKUP_COORDS = {
    'châu đốc': { lat: 10.7011, lng: 105.1189 },
    'chau doc': { lat: 10.7011, lng: 105.1189 },
    'long xuyên': { lat: 10.3861, lng: 105.4348 },
    'long xuyen': { lat: 10.3861, lng: 105.4348 },
    'tịnh biên': { lat: 10.6014, lng: 104.9508 },
    'tinh bien': { lat: 10.6014, lng: 104.9508 },
    'tri tôn': { lat: 10.4139, lng: 104.9469 },
    'tri ton': { lat: 10.4139, lng: 104.9469 },
    'rạch giá': { lat: 10.0125, lng: 105.0808 },
    'rach gia': { lat: 10.0125, lng: 105.0808 },
    'cần thơ': { lat: 10.0452, lng: 105.7469 },
    'can tho': { lat: 10.0452, lng: 105.7469 },
    'hồ chí minh': { lat: 10.7769, lng: 106.7009 },
    'ho chi minh': { lat: 10.7769, lng: 106.7009 },
    'tp.hcm': { lat: 10.7769, lng: 106.7009 },
    'núi cấm': { lat: HOME_LAT, lng: HOME_LNG },
    'nui cam': { lat: HOME_LAT, lng: HOME_LNG },
    'hồ tà pạ': { lat: 10.4139, lng: 104.9469 },
    'trà sư': { lat: 10.5900, lng: 105.0500 },
    'tra su': { lat: 10.5900, lng: 105.0500 },
    'núi sam': { lat: 10.6800, lng: 105.0900 },
    'nui sam': { lat: 10.6800, lng: 105.0900 },
};

// Khu vực hoạt động tài xế có thể đăng ký nhận đơn.
// Nhờ danh sách này, tài xế chọn "Châu Đốc" là nhận được đơn quanh Châu Đốc
// mà không cần bật GPS — tiện khi chạy trên máy ảo hoặc điện thoại tắt định vị.
const SERVICE_AREAS = [
    { slug: 'nui-cam', name: 'Núi Cấm – An Hảo', province: 'An Giang', lat: 10.5117, lng: 105.0000 },
    { slug: 'tinh-bien', name: 'Tịnh Biên', province: 'An Giang', lat: 10.6014, lng: 104.9508 },
    { slug: 'tri-ton', name: 'Tri Tôn', province: 'An Giang', lat: 10.4139, lng: 104.9469 },
    { slug: 'chau-doc', name: 'Châu Đốc', province: 'An Giang', lat: 10.7011, lng: 105.1189 },
    { slug: 'chau-phu', name: 'Châu Phú', province: 'An Giang', lat: 10.5667, lng: 105.2000 },
    { slug: 'an-phu', name: 'An Phú', province: 'An Giang', lat: 10.8167, lng: 105.0833 },
    { slug: 'tan-chau', name: 'Tân Châu', province: 'An Giang', lat: 10.8000, lng: 105.2333 },
    { slug: 'long-xuyen', name: 'Long Xuyên', province: 'An Giang', lat: 10.3861, lng: 105.4348 },
    { slug: 'thoai-son', name: 'Thoại Sơn', province: 'An Giang', lat: 10.2667, lng: 105.2667 },
    { slug: 'cho-moi', name: 'Chợ Mới', province: 'An Giang', lat: 10.5333, lng: 105.4167 },
];

const findArea = (slug) => SERVICE_AREAS.find(a => a.slug === slug) || null;

/** Đoán toạ độ từ tên địa điểm. Trả null nếu không nhận ra. */
function coordsFromName(name) {
    const key = String(name || '').toLowerCase();
    if (!key) return null;

    for (const [place, coords] of Object.entries(PICKUP_COORDS)) {
        if (key.includes(place)) return coords;
    }

    // Bảng trên chỉ có các điểm đón hay gặp. Điểm đến thường là một địa điểm
    // du lịch ("Chùa Khmer & nhạc ngũ âm", "Rừng tràm Trà Sư"…) — những chỗ đó
    // đã có toạ độ thật trong content.js, tra nốt ở đây để còn tính được quãng
    // đường và thời gian tới nơi cho khách theo dõi.
    try {
        // eslint-disable-next-line global-require
        const { PLACES } = require('./content');
        const plain = (s) => String(s || '').toLowerCase()
            .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
        const target = plain(key);

        for (const place of PLACES) {
            if (!Number.isFinite(place.lat) || !Number.isFinite(place.lng)) continue;
            // So cả tên đầy đủ lẫn phần trước dấu gạch ngang ("Núi Cấm — Thiên Cấm Sơn")
            const names = [place.name, place.name.split('—')[0], place.slug.replace(/-/g, ' ')];
            if (names.some(n => {
                const p = plain(n).trim();
                return p.length > 2 && (target.includes(p) || p.includes(target));
            })) {
                return { lat: place.lat, lng: place.lng };
            }
        }
    } catch (_) { /* thiếu content.js thì trả null như cũ */ }

    return null;
}

const cache = new Map();
const searchCache = new Map();

/** Khoảng cách đường chim bay (km) giữa 2 toạ độ. */
function haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const toRad = (deg) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2
        + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Khoảng cách đi đường ước tính từ một toạ độ tới homestay.
 * Nhân 1.3 vì đường bộ luôn dài hơn đường chim bay.
 */
function roadDistanceToHome(lat, lng) {
    return Math.max(1, Math.round(haversineKm(lat, lng, HOME_LAT, HOME_LNG) * 1.3));
}

/** Đổi toạ độ thành địa chỉ tiếng Việt. */
async function reverseGeocode(lat, lng) {
    const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data;

    const params = new URLSearchParams({
        lat: String(lat),
        lon: String(lng),
        format: 'jsonv2',
        'accept-language': 'vi',
        zoom: '16',
    });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        const res = await fetch(`${NOMINATIM}?${params}`, {
            headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
            signal: controller.signal,
        });
        if (!res.ok) throw new Error(`Nominatim trả về HTTP ${res.status}`);
        const body = await res.json();

        const a = body.address || {};
        // Ghép tên ngắn gọn kiểu Việt Nam: phường/xã · quận/huyện · tỉnh
        const parts = [
            a.village || a.suburb || a.quarter || a.hamlet || a.road,
            a.town || a.city_district || a.county || a.district,
            a.city || a.state,
        ].filter(Boolean);
        const shortName = [...new Set(parts)].slice(0, 3).join(', ');

        const data = {
            lat, lng,
            address: body.display_name || shortName,
            short_name: shortName || body.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
            distance_to_home_km: roadDistanceToHome(lat, lng),
        };
        cache.set(key, { at: Date.now(), data });
        return data;
    } finally {
        clearTimeout(timer);
    }
}

/**
 * Đổi ĐỊA CHỈ thành toạ độ.
 *
 * Vì sao cần: bắt chủ khách sạn tự tìm vĩ độ / kinh độ là bắt họ làm việc của
 * máy. Phần lớn người ta không biết toạ độ là gì, và cách duy nhất trước đây
 * là bấm "Lấy vị trí" — tức phải đang đứng tại chính cơ sở của mình.
 *
 * Giới hạn tìm trong Việt Nam để "Châu Đốc" không ra Châu Đốc bên nước khác.
 */
async function geocodeAddress(query) {
    const q = String(query || '').trim();
    if (q.length < 3) return [];

    const key = q.toLowerCase();
    const hit = searchCache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data;

    const params = new URLSearchParams({
        q,
        format: 'jsonv2',
        countrycodes: 'vn',
        limit: '5',
        'accept-language': 'vi',
        addressdetails: '1',
    });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        const res = await fetch('https://nominatim.openstreetmap.org/search?' + params, {
            headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
            signal: controller.signal,
        });
        if (!res.ok) throw new Error('Nominatim trả về HTTP ' + res.status);

        const data = (await res.json()).map(row => ({
            name: row.display_name,
            lat: Number.parseFloat(row.lat),
            lng: Number.parseFloat(row.lon),
            type: row.type || '',
            distance_to_home_km: roadDistanceToHome(Number.parseFloat(row.lat), Number.parseFloat(row.lon)),
        }));

        searchCache.set(key, { at: Date.now(), data });
        return data;
    } finally {
        clearTimeout(timer);
    }
}

module.exports = {
    geocodeAddress,
    reverseGeocode, roadDistanceToHome, haversineKm, coordsFromName,
    SERVICE_AREAS, findArea,
    PICKUP_COORDS, HOME_LAT, HOME_LNG,
};
