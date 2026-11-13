// ============================================================
// LOCALMATE — Lịch mùa An Giang
// ============================================================
// Trả lời câu hỏi ĐẦU TIÊN của mọi khách ngoài tỉnh: "tôi nên đi tháng mấy?"
//
// Trước đây app im lặng hoàn toàn về chuyện này. Từng điểm đến có ô "nên đi
// khi nào", nhưng không chỗ nào nói cho khách biết cả vùng có nhịp mùa rất
// rõ — và đi lệch mùa thì thấy một An Giang khác hẳn ảnh trên mạng.
//
// Chỗ đau thật: rừng tràm Trà Sư mùa nước nổi bèo xanh kín mặt nước, chim về
// từng đàn. Cũng chỗ đó tháng 3–4 thì nước cạn, nhìn trơ trọi. Khách xem ảnh
// mùa nước nổi rồi đặt vé tháng 4 sẽ thất vọng, và họ trách mình chứ không
// trách thời tiết.
//
// LƯU Ý VỀ NGÀY THÁNG: lễ hội ở đây theo ÂM LỊCH, nên ngày dương đổi mỗi năm.
// Vì vậy mỗi mục ghi ngày âm lịch làm gốc, còn tháng dương chỉ là "thường rơi
// vào khoảng" — không hứa chắc một ngày cụ thể.
// ============================================================

/**
 * Mười hai tháng dương lịch.
 *
 * `water` là mực nước ở vùng Bảy Núi — thứ chi phối mạnh nhất việc nên đi đâu:
 *   low    · nước cạn
 *   rising · nước bắt đầu lên
 *   flood  · mùa nước nổi, đỉnh điểm
 *   falling· nước rút dần
 */
const MONTHS = [
    {
        month: 1,
        water: 'low',
        weather: 'Khô ráo, mát nhất năm. Sáng sớm trên Núi Cấm có thể xuống 18–20°C.',
        weatherEn: 'Dry and the coolest time of year. Early mornings on Núi Cấm can drop to 18–20°C.',
        good: ['Leo núi, cắm trại', 'Chùa Khmer vắng khách', 'Chụp ảnh trời trong'],
        goodEn: ['Hiking and camping', 'Khmer pagodas without crowds', 'Clear skies for photos'],
        avoid: ['Rừng tràm Trà Sư đang cạn nước, không còn cảnh bèo xanh'],
        avoidEn: ['Trà Sư forest is low on water — no green duckweed carpet'],
        food: ['Đường thốt nốt mới nấu', 'Nước thốt nốt tươi'],
        foodEn: ['Freshly boiled palm sugar', 'Fresh palm juice'],
        festivals: [],
    },
    {
        month: 2,
        water: 'low',
        weather: 'Vẫn khô và mát. Trời trong, ít mưa.',
        weatherEn: 'Still dry and mild, with clear skies and little rain.',
        good: ['Leo núi', 'Đi chùa đầu năm', 'Làng nghề thốt nốt đang mùa'],
        goodEn: ['Hiking', 'Temple visits for the new year', 'Palm sugar villages in season'],
        avoid: ['Dịp Tết Nguyên đán các điểm rất đông, nên đặt phòng sớm'],
        avoidEn: ['Around Lunar New Year everything is packed — book far ahead'],
        food: ['Đường thốt nốt', 'Bánh bò thốt nốt'],
        foodEn: ['Palm sugar', 'Palm sugar sponge cake'],
        festivals: [{ name: 'Tết Nguyên đán', nameEn: 'Lunar New Year', when: 'Mùng 1 tháng Giêng âm lịch' }],
    },
    {
        month: 3,
        water: 'low',
        weather: 'Bắt đầu nóng lên, nắng gắt buổi trưa.',
        weatherEn: 'Getting hot, with strong midday sun.',
        good: ['Leo núi buổi sáng sớm', 'Chợ Tịnh Biên'],
        goodEn: ['Early-morning hikes', 'Tịnh Biên market'],
        avoid: ['Trà Sư cạn nhất trong năm', 'Trưa nắng gắt, tránh leo núi giữa ngày'],
        avoidEn: ['Trà Sư is at its lowest water level', 'Avoid climbing in the midday heat'],
        food: ['Nước thốt nốt tươi'],
        foodEn: ['Fresh palm juice'],
        festivals: [],
    },
    {
        month: 4,
        water: 'low',
        weather: 'Nóng nhất năm. Cuối tháng bắt đầu có mưa rào.',
        weatherEn: 'The hottest month, with the first showers arriving late in the month.',
        good: ['Tết Chol Chnam Thmay của người Khmer — không khí lễ hội ở các phum sóc'],
        goodEn: ['Chol Chnam Thmay, the Khmer new year — festive mood across Khmer villages'],
        avoid: ['Trưa rất nóng', 'Trà Sư vẫn cạn'],
        avoidEn: ['Very hot at midday', 'Trà Sư still low'],
        food: ['Cốm dẹp', 'Bánh Khmer dịp lễ'],
        foodEn: ['Flattened young rice', 'Khmer festival cakes'],
        festivals: [{
            name: 'Chol Chnam Thmay (Tết Khmer)',
            nameEn: 'Chol Chnam Thmay (Khmer New Year)',
            when: 'Thường 13–16/4 dương lịch',
        }],
    },
    {
        month: 5,
        water: 'low',
        weather: 'Vào mùa mưa. Mưa rào buổi chiều, sáng vẫn nắng.',
        weatherEn: 'Rainy season begins — afternoon showers, sunny mornings.',
        good: ['Cảnh vật xanh trở lại sau mùa khô'],
        goodEn: ['Everything turns green again after the dry months'],
        avoid: ['Đường lên núi trơn sau mưa'],
        avoidEn: ['Mountain paths get slippery after rain'],
        food: ['Xoài, mãng cầu vào mùa'],
        foodEn: ['Mango and custard apple in season'],
        festivals: [{
            name: 'Lễ hội Vía Bà Chúa Xứ núi Sam',
            nameEn: 'Vía Bà Chúa Xứ Festival, Núi Sam',
            when: '22–27 tháng 4 âm lịch — thường rơi vào cuối tháng 5 hoặc đầu tháng 6 dương lịch',
            crowd: 'Đông nhất năm, vài triệu lượt khách. Đặt phòng trước ít nhất một tháng.',
            crowdEn: 'The busiest event of the year, drawing millions. Book at least a month ahead.',
        }],
    },
    {
        month: 6,
        water: 'low',
        weather: 'Mưa nhiều hơn, trời dịu.',
        weatherEn: 'More rain, cooler air.',
        good: ['Ít khách, giá phòng dễ chịu'],
        goodEn: ['Fewer visitors, easier room rates'],
        avoid: ['Mưa chiều có thể làm hỏng lịch leo núi'],
        avoidEn: ['Afternoon rain can disrupt hiking plans'],
        food: ['Trái cây mùa hè'],
        foodEn: ['Summer fruit'],
        festivals: [],
    },
    {
        month: 7,
        water: 'rising',
        weather: 'Mưa nhiều. Nước ở các kênh bắt đầu lên.',
        weatherEn: 'Heavy rain. Water in the canals starts rising.',
        good: ['Đồng ruộng xanh mướt', 'Ít khách'],
        goodEn: ['Rice fields at their greenest', 'Quiet season'],
        avoid: ['Nước chưa đủ cao để Trà Sư đẹp nhất'],
        avoidEn: ['Water not yet high enough for Trà Sư at its best'],
        food: ['Bắt đầu có cá linh non'],
        foodEn: ['First young linh fish of the season'],
        festivals: [],
    },
    {
        month: 8,
        water: 'rising',
        weather: 'Nước lên rõ. Mưa vẫn nhiều nhưng thường tạnh nhanh.',
        weatherEn: 'Water rising noticeably. Rain is frequent but usually brief.',
        good: ['Rừng tràm Trà Sư bắt đầu đẹp', 'Bông điên điển nở vàng ven kênh'],
        goodEn: ['Trà Sư forest starts looking its best', 'Sesbania flowers turn the canal banks yellow'],
        avoid: [],
        avoidEn: [],
        food: ['Cá linh non', 'Bông điên điển', 'Lẩu mắm'],
        foodEn: ['Young linh fish', 'Sesbania flowers', 'Fermented fish hotpot'],
        festivals: [],
    },
    {
        month: 9,
        water: 'flood',
        weather: 'Đỉnh mùa nước nổi. Đồng ngập trắng, kênh rạch đầy.',
        weatherEn: 'Peak floating season. Fields under water, canals brimming.',
        good: [
            'RỪNG TRÀM TRÀ SƯ ĐẸP NHẤT NĂM — bèo xanh kín mặt nước, chim về từng đàn',
            'Đi xuồng giữa rừng tràm',
            'Ngắm đồng nước mênh mông',
        ],
        goodEn: [
            'TRÀ SƯ FOREST AT ITS ABSOLUTE BEST — green duckweed carpet, flocks of birds returning',
            'Boat rides deep into the cajuput forest',
            'Vast flooded plains',
        ],
        avoid: ['Một số đường quê ngập, hỏi trước khi tự lái xe máy'],
        avoidEn: ['Some rural roads flood — ask before riding a motorbike yourself'],
        food: ['Cá linh bông điên điển', 'Lẩu cá linh', 'Bông súng mắm kho'],
        foodEn: ['Linh fish with sesbania flowers', 'Linh fish hotpot', 'Water lily with braised fermented fish'],
        festivals: [{
            name: 'Lễ Sen Đôlta & Hội đua bò Bảy Núi',
            nameEn: 'Sen Đôlta & the Bảy Núi Ox Race',
            when: 'Cuối tháng 8 âm lịch — thường rơi vào tháng 9 hoặc tháng 10 dương lịch',
            crowd: 'Đua bò là di sản văn hoá phi vật thể quốc gia, rất đông. Nên tới sớm 1 tiếng.',
            crowdEn: 'The ox race is national intangible heritage and draws big crowds. Arrive an hour early.',
        }],
    },
    {
        month: 10,
        water: 'flood',
        weather: 'Nước vẫn cao, mưa bớt dần. Trời đẹp.',
        weatherEn: 'Water still high, rain easing off. Lovely weather.',
        good: ['Trà Sư vẫn rất đẹp', 'Đồng nước mênh mông', 'Chụp ảnh đẹp nhất'],
        goodEn: ['Trà Sư still stunning', 'Flooded plains stretching to the horizon', 'Best light for photos'],
        avoid: [],
        avoidEn: [],
        food: ['Cá linh', 'Bông điên điển', 'Cua đồng'],
        foodEn: ['Linh fish', 'Sesbania flowers', 'Rice paddy crab'],
        festivals: [],
    },
    {
        month: 11,
        water: 'falling',
        weather: 'Nước rút dần. Hết mưa, trời mát và trong.',
        weatherEn: 'Water receding. Rain stops, air turns cool and clear.',
        good: ['Trà Sư vẫn còn nước', 'Bắt đầu leo núi được thoải mái', 'Trời trong, ảnh đẹp'],
        goodEn: ['Trà Sư still has water', 'Hiking becomes comfortable again', 'Clear skies for photos'],
        avoid: [],
        avoidEn: [],
        food: ['Cốm dẹp mới — đúng mùa lúa nếp', 'Cá đồng cuối mùa nước'],
        foodEn: ['Fresh flattened young rice — right in the sticky rice season', 'End-of-flood freshwater fish'],
        festivals: [{
            name: 'Lễ Ok Om Bok (cúng trăng) của người Khmer',
            nameEn: 'Ok Om Bok, the Khmer moon worship festival',
            when: 'Rằm tháng 10 âm lịch — thường rơi vào tháng 11 dương lịch',
        }],
    },
    {
        month: 12,
        water: 'low',
        weather: 'Khô ráo, mát. Một trong hai tháng dễ chịu nhất năm.',
        weatherEn: 'Dry and cool — one of the two most pleasant months.',
        good: ['Leo núi, cắm trại lý tưởng', 'Săn mây trên Vồ Bồ Hong', 'Trời trong'],
        goodEn: ['Ideal for hiking and camping', 'Cloud hunting on Vồ Bồ Hong peak', 'Clear skies'],
        avoid: ['Trà Sư đã cạn nước'],
        avoidEn: ['Trà Sư has dried down again'],
        food: ['Đường thốt nốt mới', 'Bánh bò thốt nốt'],
        foodEn: ['New season palm sugar', 'Palm sugar sponge cake'],
        festivals: [],
    },
];

const WATER_LABEL = {
    low: { vi: 'Nước cạn', en: 'Low water' },
    rising: { vi: 'Nước đang lên', en: 'Water rising' },
    flood: { vi: 'Mùa nước nổi', en: 'Floating season' },
    falling: { vi: 'Nước đang rút', en: 'Water receding' },
};

/** Câu tóm tắt cho mỗi mực nước — thứ khách cần biết trong một dòng. */
const WATER_NOTE = {
    low: {
        vi: 'Rừng tràm Trà Sư không còn cảnh bèo xanh. Bù lại, leo núi rất thoải mái.',
        en: 'Trà Sư has no green duckweed now. In exchange, hiking is very comfortable.',
    },
    rising: {
        vi: 'Nước đang lên, Trà Sư mỗi tuần một đẹp hơn.',
        en: 'Water is rising — Trà Sư gets better every week.',
    },
    flood: {
        vi: 'Đây là lúc đẹp nhất để đi Trà Sư. Cả vùng ngập nước, cảnh chỉ có trong ba tháng này.',
        en: 'This is the best time for Trà Sư. The whole region floods — a scene you only get for three months.',
    },
    falling: {
        vi: 'Nước rút dần nhưng Trà Sư vẫn còn đẹp, và đã bắt đầu leo núi được.',
        en: 'Water is receding but Trà Sư is still lovely, and hiking season has started.',
    },
};

const pick = (o, lang) => (lang === 'en' ? o.en : o.vi);

/** Một tháng, đã chọn sẵn ngôn ngữ. */
function shape(m, lang = 'vi') {
    const en = lang === 'en';
    return {
        month: m.month,
        water: m.water,
        water_label: pick(WATER_LABEL[m.water], lang),
        water_note: pick(WATER_NOTE[m.water], lang),
        weather: en ? m.weatherEn : m.weather,
        good: en ? m.goodEn : m.good,
        avoid: en ? m.avoidEn : m.avoid,
        food: en ? m.foodEn : m.food,
        festivals: (m.festivals || []).map(f => ({
            name: en ? (f.nameEn || f.name) : f.name,
            when: f.when || '',
            crowd: (en ? f.crowdEn : f.crowd) || '',
        })),
    };
}

/** Cả năm. */
function year(lang = 'vi') {
    return MONTHS.map(m => shape(m, lang));
}

/** Một tháng cụ thể. Ngoài 1–12 thì lấy tháng hiện tại. */
function month(n, lang = 'vi') {
    const i = Number(n);
    const found = MONTHS.find(m => m.month === i) || MONTHS[new Date().getMonth()];
    return shape(found, lang);
}

/**
 * Gợi ý tháng nên đi cho một mục đích.
 *
 * Không có "tháng đẹp nhất" chung chung: người muốn xem Trà Sư mùa nước nổi và
 * người muốn leo núi phải đi hai mùa NGƯỢC nhau. Nói một câu chung là chắc chắn
 * làm hỏng chuyến của một trong hai.
 */
const BEST_FOR = {
    'tra-su': {
        months: [9, 10, 11],
        vi: 'Tháng 9–11 là lúc rừng tràm đẹp nhất, nước cao và bèo xanh kín mặt.',
        en: 'September to November is when the cajuput forest peaks — high water and a full green carpet.',
    },
    'leo-nui': {
        months: [11, 12, 1, 2],
        vi: 'Tháng 11 đến tháng 2 khô ráo và mát, leo núi hay cắm trại đều dễ chịu.',
        en: 'November through February is dry and cool — comfortable for hiking and camping.',
    },
    'le-hoi': {
        months: [4, 5, 9, 11],
        vi: 'Chol Chnam Thmay tháng 4, Vía Bà khoảng tháng 5, đua bò khoảng tháng 9, Ok Om Bok tháng 11.',
        en: 'Chol Chnam Thmay in April, Vía Bà around May, the ox race around September, Ok Om Bok in November.',
    },
    'vang-khach': {
        months: [6, 7],
        vi: 'Tháng 6–7 ít khách nhất, giá phòng dễ chịu, đổi lại hay mưa chiều.',
        en: 'June and July are the quietest with easier rates — the trade-off is afternoon rain.',
    },
};

function bestFor(lang = 'vi') {
    return Object.entries(BEST_FOR).map(([key, v]) => ({
        key,
        months: v.months,
        note: pick(v, lang),
    }));
}

module.exports = { year, month, bestFor, MONTHS };
