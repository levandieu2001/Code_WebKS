// ============================================================
// LOCALMATE — Weather service
// Nguồn: Open-Meteo (miễn phí, không cần API key)
// Cache 30 phút để không gọi lại mỗi lần người dùng mở app.
// ============================================================

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';
const CACHE_TTL_MS = 30 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 8000;

// Toạ độ mặc định: Núi Cấm, Tịnh Biên, An Giang
const DEFAULT_LAT = 10.5117;
const DEFAULT_LNG = 105.0;

const cache = new Map();

// ── Ánh xạ mã thời tiết WMO sang tiếng Việt / tiếng Anh / tên icon ──
const WMO = {
    0: ['Trời quang', 'Clear sky', 'sun'],
    1: ['Ít mây', 'Mainly clear', 'sun'],
    2: ['Có mây', 'Partly cloudy', 'cloud-sun'],
    3: ['Nhiều mây', 'Overcast', 'cloud'],
    45: ['Sương mù', 'Fog', 'cloud-fog'],
    48: ['Sương mù đóng băng', 'Depositing rime fog', 'cloud-fog'],
    51: ['Mưa phùn nhẹ', 'Light drizzle', 'cloud-drizzle'],
    53: ['Mưa phùn', 'Moderate drizzle', 'cloud-drizzle'],
    55: ['Mưa phùn dày', 'Dense drizzle', 'cloud-drizzle'],
    56: ['Mưa phùn lạnh', 'Light freezing drizzle', 'cloud-drizzle'],
    57: ['Mưa phùn lạnh dày', 'Dense freezing drizzle', 'cloud-drizzle'],
    61: ['Mưa nhẹ', 'Slight rain', 'cloud-rain'],
    63: ['Mưa vừa', 'Moderate rain', 'cloud-rain'],
    65: ['Mưa to', 'Heavy rain', 'cloud-rain-wind'],
    66: ['Mưa lạnh nhẹ', 'Light freezing rain', 'cloud-rain'],
    67: ['Mưa lạnh nặng hạt', 'Heavy freezing rain', 'cloud-rain-wind'],
    71: ['Tuyết nhẹ', 'Slight snow', 'snowflake'],
    73: ['Tuyết vừa', 'Moderate snow', 'snowflake'],
    75: ['Tuyết dày', 'Heavy snow', 'snowflake'],
    77: ['Hạt tuyết', 'Snow grains', 'snowflake'],
    80: ['Mưa rào nhẹ', 'Slight rain showers', 'cloud-rain'],
    81: ['Mưa rào', 'Moderate rain showers', 'cloud-rain'],
    82: ['Mưa rào mạnh', 'Violent rain showers', 'cloud-rain-wind'],
    85: ['Mưa tuyết nhẹ', 'Slight snow showers', 'snowflake'],
    86: ['Mưa tuyết dày', 'Heavy snow showers', 'snowflake'],
    95: ['Dông', 'Thunderstorm', 'cloud-lightning'],
    96: ['Dông kèm mưa đá nhẹ', 'Thunderstorm with slight hail', 'cloud-lightning'],
    99: ['Dông kèm mưa đá', 'Thunderstorm with heavy hail', 'cloud-lightning'],
};

function describe(code) {
    const [vi, en, icon] = WMO[code] || ['Không rõ', 'Unknown', 'cloud'];
    return { text_vi: vi, text_en: en, icon };
}

const round1 = (n) => (typeof n === 'number' ? Math.round(n * 10) / 10 : null);

// ── Gọi Open-Meteo ──
async function callOpenMeteo(lat, lng) {
    const params = new URLSearchParams({
        latitude: String(lat),
        longitude: String(lng),
        current: 'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day,precipitation',
        hourly: 'temperature_2m,precipitation_probability,weather_code',
        daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
        timezone: 'Asia/Bangkok',
        forecast_days: '5',
    });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
        const res = await fetch(`${OPEN_METEO_URL}?${params}`, { signal: controller.signal });
        if (!res.ok) throw new Error(`Open-Meteo trả về HTTP ${res.status}`);
        return await res.json();
    } finally {
        clearTimeout(timer);
    }
}

// ── Chuẩn hoá dữ liệu về đúng cấu trúc mà Web và Android cùng dùng ──
function normalize(raw, lat, lng) {
    const cur = raw.current || {};
    const nowIso = cur.time;

    // Tìm chỉ số giờ hiện tại trong mảng hourly để lấy xác suất mưa
    const hourlyTimes = raw.hourly?.time || [];
    const nowIndex = Math.max(0, hourlyTimes.indexOf(nowIso));

    const hourly = hourlyTimes.slice(nowIndex, nowIndex + 24).map((time, offset) => {
        const i = nowIndex + offset;
        const code = raw.hourly.weather_code[i];
        return {
            time,
            temp: round1(raw.hourly.temperature_2m[i]),
            rain_probability: raw.hourly.precipitation_probability[i] ?? 0,
            code,
            ...describe(code),
        };
    });

    const daily = (raw.daily?.time || []).map((date, i) => {
        const code = raw.daily.weather_code[i];
        return {
            date,
            temp_max: round1(raw.daily.temperature_2m_max[i]),
            temp_min: round1(raw.daily.temperature_2m_min[i]),
            rain_probability: raw.daily.precipitation_probability_max[i] ?? 0,
            code,
            ...describe(code),
        };
    });

    return {
        location: { lat, lng, name: 'Núi Cấm, An Giang' },
        current: {
            temp: round1(cur.temperature_2m),
            feels_like: round1(cur.apparent_temperature),
            humidity: cur.relative_humidity_2m ?? null,
            wind_kph: round1(cur.wind_speed_10m),
            precipitation: round1(cur.precipitation),
            rain_probability: hourly[0]?.rain_probability ?? 0,
            is_day: cur.is_day === 1,
            code: cur.weather_code,
            ...describe(cur.weather_code),
        },
        hourly,
        daily,
        source: 'open-meteo',
        updated_at: new Date().toISOString(),
    };
}

/**
 * Lấy dự báo thời tiết, có cache 30 phút theo toạ độ (làm tròn 2 chữ số).
 * Ném lỗi nếu không gọi được Open-Meteo — phía route sẽ quyết định cách xử lý.
 */
async function getWeather(lat = DEFAULT_LAT, lng = DEFAULT_LNG) {
    const key = `${lat.toFixed(2)},${lng.toFixed(2)}`;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
        return { ...hit.data, cached: true };
    }

    const raw = await callOpenMeteo(lat, lng);
    const data = normalize(raw, lat, lng);
    cache.set(key, { at: Date.now(), data });
    return { ...data, cached: false };
}

module.exports = { getWeather, describe, DEFAULT_LAT, DEFAULT_LNG };

// ════════════════════════════════════════════════════════════
// DỰ BÁO DÀI NGÀY — để khách xem trước ngày đi nắng hay mưa
// ════════════════════════════════════════════════════════════
// Bản getWeather() ở trên chỉ lấy 5 ngày, đủ cho thẻ thời tiết ngoài
// trang chủ. Khách chọn ngày khởi hành có thể cách hôm nay hai tuần,
// nên phần này gọi riêng với forecast_days = 16 (mức tối đa Open-Meteo
// cho phép) và có bộ nhớ đệm riêng.

const OUTLOOK_DAYS = 16;
const outlookCache = new Map();

async function callOutlook(lat, lng) {
    const params = new URLSearchParams({
        latitude: String(lat),
        longitude: String(lng),
        daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum',
        timezone: 'Asia/Bangkok',
        forecast_days: String(OUTLOOK_DAYS),
    });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
        const res = await fetch(`${OPEN_METEO_URL}?${params}`, { signal: controller.signal });
        if (!res.ok) throw new Error(`Open-Meteo trả về HTTP ${res.status}`);
        return await res.json();
    } finally {
        clearTimeout(timer);
    }
}

/** Lời khuyên ngắn cho khách, dựa trên xác suất mưa cả ngày. */
function adviceFor(rain, code) {
    if (rain >= 70) return { level: 'bad', vi: 'Nhiều khả năng mưa cả ngày — nên ưu tiên điểm trong nhà.' };
    if (rain >= 40) return { level: 'warn', vi: 'Có thể mưa vài lúc — mang theo áo mưa mỏng.' };
    if (code === 0 || code === 1) return { level: 'good', vi: 'Trời đẹp, rất hợp leo núi và chụp ảnh.' };
    return { level: 'ok', vi: 'Thời tiết dễ chịu, đi lại thuận lợi.' };
}

/**
 * Dự báo theo ngày cho tối đa 16 ngày tới.
 * Trả về map { 'YYYY-MM-DD': {...} } để tra cứu nhanh theo ngày.
 */
async function getOutlook(lat = DEFAULT_LAT, lng = DEFAULT_LNG) {
    const key = `${lat.toFixed(2)},${lng.toFixed(2)}`;
    const hit = outlookCache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.data;

    const raw = await callOutlook(lat, lng);
    const byDate = {};
    (raw.daily?.time || []).forEach((date, i) => {
        const code = raw.daily.weather_code[i];
        const rain = raw.daily.precipitation_probability_max[i] ?? 0;
        byDate[date] = {
            date,
            temp_max: round1(raw.daily.temperature_2m_max[i]),
            temp_min: round1(raw.daily.temperature_2m_min[i]),
            rain_probability: rain,
            rain_mm: round1(raw.daily.precipitation_sum?.[i] ?? 0),
            code,
            ...describe(code),
            advice: adviceFor(rain, code),
        };
    });

    const data = { days: Object.values(byDate), by_date: byDate, horizon_days: OUTLOOK_DAYS };
    outlookCache.set(key, { at: Date.now(), data });
    return data;
}

module.exports.getOutlook = getOutlook;
module.exports.OUTLOOK_DAYS = OUTLOOK_DAYS;
