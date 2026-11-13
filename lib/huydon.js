// ============================================================
// LOCALMATE — Luật huỷ đơn
// ============================================================
// Trước đây huỷ trước một tháng và huỷ trước một tiếng là như nhau: đơn đổi
// sang "đã huỷ", còn tiền cọc thì "LOCALMATE sẽ liên hệ hoàn tiền theo chính
// sách" — mà không có chính sách nào cả. Câu đó chỉ đẩy việc sang một cuộc
// gọi điện, và cuộc gọi đó chắc chắn sẽ cãi nhau, vì hai bên đang nhớ hai
// điều khác nhau.
//
// Ở đây viết luật ra thành số. Ba mức để chủ nhà chọn, chỉ ba thôi:
// nhiều lựa chọn hơn thì chính chủ nhà cũng không nhớ mình đang dùng mức nào,
// mà khách lại càng không đọc.
//
// Nguyên tắc khi tính: LẤY MỐC LÀ NGÀY NHẬN PHÒNG, không phải ngày đặt. Khách
// đặt trước ba tháng rồi huỷ trước ngày đi một hôm thì vẫn là huỷ sát ngày —
// chủ nhà mất đúng cái đêm đó, không kịp bán lại cho ai.
//
// Và luôn tính theo hướng CÓ LỢI CHO KHÁCH khi ở ranh giới: đúng 24 giờ thì
// tính là "trước 24 giờ". Tranh chấp ở đúng cái mốc là chuyện hay xảy ra
// nhất, mà mình thì có toàn bộ dữ liệu còn khách thì không — nghiêng về phía
// mình ở chỗ đó là ép người.
// ============================================================

/**
 * Ba mức luật.
 *
 * `bac` đọc từ trên xuống, dừng ở dòng đầu tiên khớp: huỷ sớm hơn `truoc_gio`
 * thì hoàn `hoan` phần trăm tiền cọc.
 */
const MUC = {
    linh_hoat: {
        id: 'linh_hoat',
        ten: 'Linh hoạt',
        tomTat: 'Huỷ trước 24 giờ được hoàn đủ tiền cọc',
        moTa: 'Khách huỷ trước ngày nhận phòng từ 24 giờ trở lên thì hoàn 100% tiền cọc. '
            + 'Sát hơn thì không hoàn.',
        bac: [
            { truoc_gio: 24, hoan: 100 },
            { truoc_gio: 0, hoan: 0 },
        ],
    },
    vua: {
        id: 'vua',
        ten: 'Vừa phải',
        tomTat: 'Trước 5 ngày hoàn đủ, trong 5 ngày hoàn một nửa',
        moTa: 'Huỷ trước 5 ngày thì hoàn 100% tiền cọc. Trong vòng 5 ngày nhưng còn '
            + 'trước 24 giờ thì hoàn 50%. Trong 24 giờ cuối thì không hoàn.',
        bac: [
            { truoc_gio: 120, hoan: 100 },
            { truoc_gio: 24, hoan: 50 },
            { truoc_gio: 0, hoan: 0 },
        ],
    },
    chat: {
        id: 'chat',
        ten: 'Chặt',
        tomTat: 'Trước 14 ngày hoàn đủ, trong 7 ngày không hoàn',
        moTa: 'Huỷ trước 14 ngày thì hoàn 100% tiền cọc. Từ 14 ngày đến 7 ngày thì '
            + 'hoàn 50%. Trong 7 ngày cuối thì không hoàn. Hợp với dịp lễ Tết, khi '
            + 'huỷ sát ngày là gần như không bán lại được.',
        bac: [
            { truoc_gio: 336, hoan: 100 },   // 14 ngày
            { truoc_gio: 168, hoan: 50 },    // 7 ngày
            { truoc_gio: 0, hoan: 0 },
        ],
    },
};

const MAC_DINH = 'vua';

const layMuc = (id) => MUC[String(id || '').trim()] || MUC[MAC_DINH];

/** Danh sách cho biểu mẫu chọn. */
const danhSach = () => Object.values(MUC).map(m => ({
    id: m.id, ten: m.ten, tom_tat: m.tomTat, mo_ta: m.moTa,
    bac: m.bac.map(b => ({ truoc_gio: b.truoc_gio, hoan: b.hoan })),
}));

/**
 * Còn bao nhiêu giờ nữa tới lúc nhận phòng.
 *
 * Ngày nhận phòng lưu dạng "2026-10-20", không có giờ. Lấy mốc 14:00 giờ Việt
 * Nam — đúng giờ nhận phòng ghi trên biểu mẫu đặt. Lấy 00:00 thì khách huỷ
 * lúc 10 giờ sáng hôm trước bị tính thành "còn 14 tiếng", trong khi thực tế
 * họ còn hơn một ngày nữa mới tới.
 */
function gioConLai(checkIn, bayGio = new Date()) {
    const ngay = String(checkIn || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ngay)) return null;
    // 14:00 giờ Việt Nam = 07:00 UTC
    const moc = new Date(`${ngay}T07:00:00Z`);
    return (moc.getTime() - bayGio.getTime()) / 3600000;
}

/**
 * Huỷ bây giờ thì hoàn bao nhiêu.
 *
 * @returns {{ muc, ten, gio_con_lai, phan_tram, so_tien, ly_do }}
 */
function tinh({ policy, checkIn, depositPaid = 0, bayGio = new Date() }) {
    const m = layMuc(policy);
    const gio = gioConLai(checkIn, bayGio);
    const coc = Math.max(0, Math.round(Number(depositPaid) || 0));

    // Không đọc được ngày nhận phòng thì hoàn đủ. Lỗi dữ liệu của mình,
    // không có lý do gì bắt khách chịu.
    if (gio === null) {
        return {
            muc: m.id, ten: m.ten, gio_con_lai: null,
            phan_tram: 100, so_tien: coc,
            ly_do: 'Không xác định được ngày nhận phòng nên hoàn đủ tiền cọc.',
        };
    }

    // >= chứ không > : đúng mốc thì tính cho khách. Tranh chấp hay xảy ra
    // đúng ở ranh giới, mà mình nắm dữ liệu còn khách thì không.
    const bac = m.bac.find(b => gio >= b.truoc_gio) || m.bac[m.bac.length - 1];
    const soTien = Math.round(coc * bac.hoan / 100);

    return {
        muc: m.id,
        ten: m.ten,
        gio_con_lai: Math.round(gio),
        phan_tram: bac.hoan,
        so_tien: soTien,
        ly_do: moTaLucNay(m, gio, bac),
    };
}

/** Câu giải thích cho đúng thời điểm này, không phải cả bảng luật. */
function moTaLucNay(m, gio, bac) {
    const con = gio <= 0
        ? 'Đã tới hoặc quá ngày nhận phòng'
        : gio < 24
            ? `Còn khoảng ${Math.max(1, Math.round(gio))} giờ nữa tới ngày nhận phòng`
            : `Còn khoảng ${Math.round(gio / 24)} ngày nữa tới ngày nhận phòng`;

    if (bac.hoan === 100) return `${con} — theo mức "${m.ten}", bạn được hoàn đủ tiền cọc.`;
    if (bac.hoan === 0) return `${con} — theo mức "${m.ten}", tiền cọc không được hoàn lại.`;
    return `${con} — theo mức "${m.ten}", bạn được hoàn ${bac.hoan}% tiền cọc.`;
}

module.exports = { MUC, MAC_DINH, layMuc, danhSach, tinh, gioConLai };
