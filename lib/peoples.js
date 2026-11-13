// ============================================================
// LOCALMATE — Bốn dân tộc An Giang
// ============================================================
// Kinh · Khmer · Chăm · Hoa cùng sống trên một vùng đất. Đây là thứ làm An
// Giang khác mọi tỉnh miền Tây khác, và là thứ khách từ Hà Nội hay Sài Gòn
// xuống hầu như không biết trước.
//
// Trước đây dữ liệu chỉ có Khmer và Việt. Người Chăm — cộng đồng Hồi giáo với
// thánh đường, làng dệt và ẩm thực riêng — hoàn toàn vắng mặt.
//
// ⚠ PHẦN NỘI DUNG NÀY NÓI VỀ TÍN NGƯỠNG VÀ PHONG TỤC CỦA NGƯỜI ĐANG SỐNG.
// Viết sai thì phản tác dụng nặng hơn là không viết. Trước khi công bố rộng,
// nên nhờ người địa phương của từng cộng đồng đọc lại — nhất là phần "nên và
// không nên". Ở đây chỉ ghi những điều phổ biến và ít gây tranh cãi.
// ============================================================

const PEOPLES = [
    {
        slug: 'khmer',
        name: 'Người Khmer',
        nameEn: 'The Khmer',
        where: 'Tri Tôn, Tịnh Biên — quanh vùng Bảy Núi',
        whereEn: 'Tri Tôn and Tịnh Biên, around the Seven Mountains',
        image: 'assets/chua-khmer.jpg',
        summary:
            'Cộng đồng đông nhất vùng Bảy Núi. Đời sống xoay quanh ngôi chùa: chùa vừa là nơi '
            + 'thờ tự, vừa là trường học, vừa là nơi hội họp của cả phum sóc.',
        summaryEn:
            'The largest community around the Seven Mountains. Life revolves around the pagoda, '
            + 'which serves at once as temple, school and village meeting place.',
        see: [
            'Chùa Khmer mái cong dát vàng, tường vẽ tích Phật',
            'Dàn nhạc ngũ âm — năm nhóm nhạc cụ chơi trong lễ',
            'Làng nghề nấu đường thốt nốt',
        ],
        seeEn: [
            'Golden-roofed Khmer pagodas with Buddhist murals',
            'The Pinpeat five-instrument orchestra played at ceremonies',
            'Palm sugar boiling villages',
        ],
        food: ['Gà đốt lá chúc Ô Thum', 'Bánh bò thốt nốt', 'Cốm dẹp (Ambok)'],
        foodEn: ['Ô Thum grilled chicken with chúc leaves', 'Palm sugar sponge cake', 'Flattened young rice'],
        festivals: [
            'Chol Chnam Thmay — tết cổ truyền, khoảng giữa tháng 4',
            'Sen Đôlta — lễ cúng ông bà, kèm hội đua bò Bảy Núi',
            'Ok Om Bok — lễ cúng trăng, rằm tháng 10 âm lịch',
        ],
        festivalsEn: [
            'Chol Chnam Thmay — the traditional new year, around mid-April',
            'Sen Đôlta — ancestor worship, paired with the Bảy Núi ox race',
            'Ok Om Bok — moon worship, on the full moon of the 10th lunar month',
        ],
        etiquette: {
            do: [
                'Cởi giày dép trước khi vào chánh điện',
                'Mặc áo có tay, quần hoặc váy qua gối',
                'Hạ giọng, tắt chuông điện thoại',
                'Xin phép trước khi chụp ảnh các sư',
            ],
            dont: [
                'Không chỉ chân về phía tượng Phật hay phía các sư',
                'Không chạm vào người sư — đặc biệt phụ nữ không chạm vào sư nam',
                'Không leo trèo lên tượng để chụp ảnh',
            ],
        },
        etiquetteEn: {
            do: [
                'Take your shoes off before entering the main hall',
                'Wear sleeves, and trousers or a skirt below the knee',
                'Keep your voice down and silence your phone',
                'Ask before photographing monks',
            ],
            dont: [
                'Do not point your feet toward Buddha images or monks',
                'Do not touch a monk — women in particular should not touch male monks',
                'Do not climb on statues for photos',
            ],
        },
    },
    {
        slug: 'cham',
        name: 'Người Chăm',
        nameEn: 'The Cham',
        where: 'Châu Giang, Châu Phong — dọc sông Hậu, phía Tân Châu và An Phú',
        whereEn: 'Châu Giang and Châu Phong, along the Hậu river near Tân Châu and An Phú',
        image: 'assets/van-hoa-cham.jpg',
        summary:
            'Cộng đồng Hồi giáo lâu đời bên sông Hậu. Làng Chăm nhận ra ngay nhờ thánh đường mái '
            + 'vòm và những căn nhà sàn gỗ cao. Nghề dệt thổ cẩm truyền từ đời này sang đời khác.',
        summaryEn:
            'A long-established Muslim community on the Hậu river. Cham villages are recognisable '
            + 'at once by their domed mosques and tall wooden stilt houses. Brocade weaving has '
            + 'been passed down for generations.',
        see: [
            'Thánh đường Hồi giáo mái vòm',
            'Nhà sàn gỗ truyền thống',
            'Khung dệt thổ cẩm — dệt tay từng tấm',
        ],
        seeEn: [
            'Domed mosques',
            'Traditional wooden stilt houses',
            'Brocade looms, each piece woven by hand',
        ],
        food: ['Cà ri Chăm', 'Cơm nị — cà púa', 'Tung lò mò (lạp xưởng bò)'],
        foodEn: ['Cham curry', 'Cơm nị and cà púa', 'Tung lò mò, beef sausage'],
        festivals: [
            'Tháng Ramadan — nhịn ăn ban ngày suốt một tháng',
            'Roya Haji — lễ lớn sau mùa hành hương',
        ],
        festivalsEn: [
            'Ramadan — daytime fasting for a month',
            'Roya Haji — the major feast after the pilgrimage season',
        ],
        etiquette: {
            do: [
                'Ăn mặc kín đáo khi vào làng, nhất là gần thánh đường',
                'Hỏi trước khi vào thánh đường — có nơi chỉ đón nam giới, hoặc có giờ riêng',
                'Xin phép trước khi chụp ảnh người dân',
            ],
            dont: [
                'Không mang hay mời đồ ăn có thịt heo và rượu bia',
                'Không vào thánh đường trong giờ cầu nguyện nếu chưa được mời',
                'Tránh tới thăm vào giữa ban ngày tháng Ramadan — bà con đang nhịn ăn',
            ],
        },
        etiquetteEn: {
            do: [
                'Dress modestly in the village, especially near the mosque',
                'Ask before entering a mosque — some admit men only, or have set hours',
                'Ask before photographing people',
            ],
            dont: [
                'Do not bring or offer pork or alcohol',
                'Do not enter a mosque during prayer unless invited',
                'Avoid daytime visits during Ramadan — people are fasting',
            ],
        },
    },
    {
        slug: 'kinh',
        name: 'Người Kinh',
        nameEn: 'The Kinh (Vietnamese)',
        where: 'Khắp tỉnh, đông nhất ở Châu Đốc và Long Xuyên',
        whereEn: 'Across the province, most numerous in Châu Đốc and Long Xuyên',
        image: 'assets/nui-cam-1.jpg',
        summary:
            'Chiếm phần lớn dân số. Ở An Giang, tín ngưỡng dân gian rất mạnh — Miếu Bà Chúa Xứ '
            + 'núi Sam mỗi năm đón vài triệu lượt người tới cúng viếng.',
        summaryEn:
            'The majority of the population. Folk belief runs deep here — the Bà Chúa Xứ temple '
            + 'at Núi Sam draws millions of pilgrims every year.',
        see: [
            'Miếu Bà Chúa Xứ núi Sam',
            'Chợ nổi và làng bè trên sông Hậu',
            'Làng nghề mắm Châu Đốc',
        ],
        seeEn: [
            'The Bà Chúa Xứ temple at Núi Sam',
            'Floating markets and raft-house villages on the Hậu river',
            'The fermented fish workshops of Châu Đốc',
        ],
        food: ['Bún cá Châu Đốc', 'Mắm Châu Đốc', 'Bánh xèo rau rừng Núi Cấm'],
        foodEn: ['Châu Đốc fish noodle soup', 'Châu Đốc fermented fish', 'Núi Cấm pancake with wild herbs'],
        festivals: [
            'Vía Bà Chúa Xứ — 22–27 tháng 4 âm lịch, lễ hội lớn nhất tỉnh',
            'Tết Nguyên đán',
        ],
        festivalsEn: [
            'Vía Bà Chúa Xứ — 22nd to 27th of the 4th lunar month, the province\'s biggest festival',
            'Lunar New Year',
        ],
        etiquette: {
            do: [
                'Ăn mặc lịch sự khi vào miếu, chùa',
                'Xếp hàng và giữ trật tự ở Miếu Bà, nhất là mùa lễ',
            ],
            dont: [
                'Cẩn thận với người chèo kéo bán nhang, lộc quanh khu Miếu Bà',
                'Không đặt tiền lên tượng hay bàn thờ — bỏ vào hòm công đức',
            ],
        },
        etiquetteEn: {
            do: [
                'Dress respectfully in temples and pagodas',
                'Queue and keep order at Bà Chúa Xứ, especially during the festival',
            ],
            dont: [
                'Be wary of pushy incense and charm sellers around the temple',
                'Do not place money on statues or altars — use the donation box',
            ],
        },
    },
    {
        slug: 'hoa',
        name: 'Người Hoa',
        nameEn: 'The Hoa (Chinese)',
        where: 'Châu Đốc, Long Xuyên — chủ yếu ở khu chợ',
        whereEn: 'Châu Đốc and Long Xuyên, mostly around the markets',
        image: 'assets/chua-ta-pa.jpg',
        summary:
            'Cộng đồng buôn bán lâu đời ở các thị tứ ven sông. Dấu ấn rõ nhất là những hội quán '
            + 'và chùa Ông nằm ngay giữa khu chợ.',
        summaryEn:
            'A long-standing trading community in the riverside towns. Their clearest mark is the '
            + 'assembly halls and Chinese temples sitting right in the middle of the markets.',
        see: ['Hội quán và chùa Ông trong khu chợ', 'Kiến trúc nhà phố buôn bán cổ'],
        seeEn: ['Assembly halls and Chinese temples inside the markets', 'Old shophouse architecture'],
        food: ['Hủ tiếu', 'Bánh bao', 'Chè người Hoa'],
        foodEn: ['Hủ tiếu noodle soup', 'Steamed buns', 'Chinese-style sweet soups'],
        festivals: ['Tết Nguyên tiêu — rằm tháng Giêng', 'Vía Quan Công'],
        festivalsEn: ['Lantern Festival on the 15th of the first lunar month', 'Quan Công worship day'],
        etiquette: {
            do: ['Ăn mặc lịch sự khi vào hội quán, chùa Ông'],
            dont: ['Không chụp ảnh flash vào bàn thờ đang có người cúng'],
        },
        etiquetteEn: {
            do: ['Dress respectfully in assembly halls and temples'],
            dont: ['Do not use flash on altars while people are worshipping'],
        },
    },
];

const shape = (p, lang = 'vi') => {
    const en = lang === 'en';
    return {
        slug: p.slug,
        name: en ? p.nameEn : p.name,
        where: en ? p.whereEn : p.where,
        image: p.image,
        summary: en ? p.summaryEn : p.summary,
        see: en ? p.seeEn : p.see,
        food: en ? p.foodEn : p.food,
        festivals: en ? p.festivalsEn : p.festivals,
        etiquette: en ? p.etiquetteEn : p.etiquette,
    };
};

const all = (lang = 'vi') => PEOPLES.map(p => shape(p, lang));
const find = (slug, lang = 'vi') => {
    const p = PEOPLES.find(x => x.slug === slug);
    return p ? shape(p, lang) : null;
};

/**
 * Phép lịch sự gắn theo ĐIỂM ĐẾN, không phải theo dân tộc.
 *
 * Khách đứng trước cổng chùa Khmer cần lời nhắc ngay lúc đó, chứ không phải
 * phải tự nhớ đã đọc gì ở trang giới thiệu dân tộc.
 */
const PLACE_ETIQUETTE = {
    'chua-khmer': 'khmer',
    'nui-sam': 'kinh',
};

const etiquetteForPlace = (placeSlug, lang = 'vi') => {
    const key = PLACE_ETIQUETTE[placeSlug];
    if (!key) return null;
    const p = find(key, lang);
    return p ? { people: p.name, ...p.etiquette } : null;
};

module.exports = { all, find, etiquetteForPlace, PEOPLES };
