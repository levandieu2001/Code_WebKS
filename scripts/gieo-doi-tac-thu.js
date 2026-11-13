// ============================================================
// Gieo đối tác mẫu để thử — chạy trên MÁY CHỦ NÀO thì gieo vào máy đó
// ============================================================
// Dữ liệu thử, đặt tên có tiền tố "thu_" để xoá lại sạch bằng một lệnh.
// Toạ độ đặt quanh các điểm đến thật của Bảy Núi, khoảng cách chênh nhau rõ
// ràng để kiểm tra xem bot có sắp đúng gần–xa không.
const store = require('../lib/store');
const listings = require('../lib/listings');

const now = new Date().toISOString();

// ── 6 chỗ nghỉ, rải quanh Núi Cấm · Trà Sư · Núi Sam · Tà Pạ ──
const CHO_NGHI = [
    {
        id: 'thu_lu_nuicam', name: 'Homestay Lữ Núi Cấm', area: 'An Hảo, Tịnh Biên, An Giang',
        lat: 10.5140, lng: 105.0035, price: 420000, capacity: 4,
        amenities: ['Wifi', 'Ăn sáng', 'Ban công hướng núi', 'Đưa đón chân núi'],
        description: 'Nhà sàn gỗ ngay chân đường lên Núi Cấm, chủ nhà nấu bánh xèo rau rừng buổi tối.',
    },
    {
        id: 'thu_may_vobohong', name: 'Mây Vồ Bồ Hong', area: 'Đỉnh Núi Cấm, Tịnh Biên, An Giang',
        lat: 10.5105, lng: 104.9985, price: 750000, capacity: 2,
        amenities: ['Săn mây', 'Nước nóng', 'Bữa tối tại chỗ'],
        description: 'Phòng nhỏ sát Vồ Bồ Hong, dậy sớm là bước ra săn mây, không cần đi xa.',
    },
    {
        id: 'thu_trasu_bungalow', name: 'Trà Sư Bungalow', area: 'Văn Giáo, Tịnh Biên, An Giang',
        lat: 10.5865, lng: 105.0530, price: 690000, capacity: 4,
        amenities: ['Bungalow riêng', 'Hồ bơi', 'Xe đạp miễn phí', 'Ăn sáng'],
        description: 'Bungalow tách biệt cạnh rừng tràm, đi bộ 10 phút tới bến xuồng Trà Sư.',
    },
    {
        id: 'thu_chaudoc_river', name: 'Châu Đốc Riverside Rooms', area: 'Châu Phú A, Châu Đốc, An Giang',
        lat: 10.7010, lng: 105.1120, price: 550000, capacity: 3,
        amenities: ['Nhìn ra sông Hậu', 'Điều hòa', 'Lễ tân 24/7', 'Gần chợ Châu Đốc'],
        description: 'Phòng nhìn ra sông Hậu, đi bộ ra chợ Châu Đốc và miếu Bà Chúa Xứ.',
    },
    {
        id: 'thu_nuisam_nhanghi', name: 'Nhà nghỉ Núi Sam', area: 'Núi Sam, Châu Đốc, An Giang',
        lat: 10.6835, lng: 105.0925, price: 320000, capacity: 2,
        amenities: ['Wifi', 'Quạt', 'Bãi đậu xe máy'],
        description: 'Bình dân, ngay chân Núi Sam, hợp khách đi lễ Bà rồi nghỉ lại một đêm.',
    },
    {
        id: 'thu_tapa_stone', name: 'Tà Pạ Stone House', area: 'Núi Tô, Tri Tôn, An Giang',
        lat: 10.4165, lng: 104.9490, price: 480000, capacity: 6,
        amenities: ['Nhà nguyên căn', 'Bếp riêng', 'Sân BBQ', 'Wifi'],
        description: 'Nhà đá nguyên căn cho nhóm 6 người, cách hồ Tà Pạ vài phút chạy xe.',
    },
];

// ── 4 tour ──
const TOUR = [
    {
        id: 'thu_tour_saigon_batnui', name: 'Săn mây Núi Cấm — đi từ 4 giờ sáng',
        price: 450000, days: 1, duration: 'Nửa ngày', pax: '2–8 khách',
        stops: 'Vồ Bồ Hong · Chùa Vạn Linh · Hồ Thủy Liêm',
        includes: ['Xe đưa đón chân núi', 'Vé cáp treo', 'Bữa sáng bánh xèo rau rừng'],
        description: 'Khởi hành 4 giờ sáng để kịp mây trên Vồ Bồ Hong, về trước trưa.',
    },
    {
        id: 'thu_tour_khmer_tritón', name: 'Một ngày làng Khmer Tri Tôn',
        price: 620000, days: 1, duration: 'Cả ngày', pax: '4–12 khách',
        stops: 'Chùa Xvayton · Làng dệt thổ cẩm · Hồ Tà Pạ · Gà đốt Ô Thum',
        includes: ['Hướng dẫn viên người Khmer', 'Bữa trưa gà đốt', 'Xe 7 chỗ'],
        description: 'Hướng dẫn viên là người Khmer bản địa, nghe nhạc ngũ âm tại chùa.',
    },
    {
        id: 'thu_tour_trasu_mua_nuoc', name: 'Trà Sư mùa nước nổi',
        price: 390000, days: 1, duration: 'Nửa ngày', pax: '2–10 khách',
        stops: 'Rừng tràm Trà Sư · Cầu tre vạn bước · Chợ biên giới Tịnh Biên',
        includes: ['Vé vào rừng', 'Xuồng máy + tắc ráng', 'Nước thốt nốt'],
        description: 'Đi tháng 8 tới tháng 11, bèo phủ xanh kín mặt nước.',
    },
    {
        id: 'thu_tour_2n1d', name: 'Thất Sơn 2 ngày 1 đêm — Núi Cấm & Châu Đốc',
        price: 1650000, days: 2, duration: '2 ngày 1 đêm', pax: '2–10 khách',
        stops: 'Núi Cấm · Miếu Bà Chúa Xứ · Núi Sam · Chợ Châu Đốc',
        includes: ['1 đêm homestay', 'Xe suốt tuyến', '3 bữa ăn', 'Vé tham quan'],
        description: 'Ngủ lại một đêm ở Núi Cấm, sáng hôm sau xuống Châu Đốc lễ Bà.',
    },
];

function gieo() {
    let dem = { doiTac: 0, choNghi: 0, tour: 0 };

    const tao = (ten, loai, sdt, hoaHong) => {
        const id = `pn_thu_${ten.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 12)}`;
        if (!store.find('partners', p => p.id === id)) {
            store.insert('partners', {
                id, uid: `uid_${id}`, type: loai, status: 'approved', name: ten,
                phone: sdt, email: `${id}@localmate.test`, commission: hoaHong, createdAt: now,
            });
            dem.doiTac += 1;
        }
        return id;
    };

    for (const c of CHO_NGHI) {
        const pid = tao(c.name, 'hotel', '0901' + String(Math.floor(Math.random() * 900000) + 100000), 0.10);
        if (!listings.find(c.id)) {
            listings.create({ ...c, type: 'stay', partnerId: pid, rating: 4.5 });
            store.update('listings', c.id, { status: 'approved' });
            dem.choNghi += 1;
        }
    }

    for (const t of TOUR) {
        const pid = tao(t.name.slice(0, 20), 'tour', '0902' + String(Math.floor(Math.random() * 900000) + 100000), 0.15);
        if (!listings.find(t.id)) {
            listings.create({ ...t, type: 'tour', partnerId: pid, rating: 4.6 });
            store.update('listings', t.id, { status: 'approved' });
            dem.tour += 1;
        }
    }

    console.log(`đã tạo ${dem.doiTac} đối tác · ${dem.choNghi} chỗ nghỉ · ${dem.tour} tour`);
}

function xoa() {
    const ls = store.readAll('listings').filter(r => String(r.id).startsWith('thu_'));
    ls.forEach(r => store.remove('listings', r.id));
    const ps = store.readAll('partners').filter(r => String(r.id).startsWith('pn_thu_'));
    ps.forEach(r => store.remove('partners', r.id));
    console.log(`đã xoá ${ls.length} tin đăng thử và ${ps.length} đối tác thử`);
}

if (process.argv.includes('--xoa')) xoa();
else gieo();
