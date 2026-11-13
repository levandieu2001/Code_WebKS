// ============================================================
// LOCALMATE — Phân tích kinh doanh của một đối tác
// ============================================================
// Khác với lib/revenue.js: chỗ đó là BẢNG ĐỐI SOÁT — tháng này chạy bao nhiêu
// đơn, trừ hoa hồng bao nhiêu, nhận về bao nhiêu. Đó là câu hỏi kế toán.
//
// Chỗ này trả lời câu hỏi kinh doanh, thứ mà chủ nhà thật sự cần để quyết định
// làm gì tiếp:
//   - Tháng này khá hơn hay kém hơn tháng trước?
//   - Ngày nào đông, ngày nào vắng?
//   - Phòng nào / tour nào ra tiền, cái nào đăng lên rồi để đó?
//   - Có bao nhiêu đơn tuột mất vì mình từ chối hoặc khách huỷ?
//
// Mọi con số ở đây tính từ ĐƠN THẬT trong cơ sở dữ liệu, không có số nào ước
// lượng hay dựng sẵn. Chưa có đơn thì trả về 0 và trang sẽ nói thẳng là chưa
// có dữ liệu — bịa một biểu đồ đẹp cho trang trông "chuyên nghiệp" là đang
// nói dối người đang định dựa vào nó để quyết định.
// ============================================================

const { listDocuments } = require('./firestore');
const listings = require('./listings');
const revenue = require('./revenue');

const ngay = (iso) => String(iso || '').slice(0, 10);
const tien = (n) => Math.round(Number(n) || 0);

/** Tháng liền trước "2026-09" → "2026-08". */
function thangTruoc(month) {
    const [y, m] = String(month).split('-').map(Number);
    const d = new Date(Date.UTC(y, m - 2, 1));
    return d.toISOString().slice(0, 7);
}

/** Số ngày của một tháng, để dựng đủ cột cho biểu đồ kể cả ngày không có đơn. */
function soNgayTrongThang(month) {
    const [y, m] = String(month).split('-').map(Number);
    return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/**
 * Phần trăm thay đổi so với kỳ trước.
 *
 * Kỳ trước bằng 0 thì KHÔNG trả về "tăng vô hạn" hay 100%: từ 0 lên 3 đơn
 * không có phần trăm nào có nghĩa cả. Trả null để trang hiện "kỳ đầu tiên"
 * thay vì một mũi tên xanh vô nghĩa.
 */
function doiSo(nay, truoc) {
    if (!truoc) return null;
    return Math.round(((nay - truoc) / truoc) * 100);
}

/** Gom đơn của một đối tác trong khoảng ngày. */
function donTrongKy(bookings, partnerId, from, to) {
    return bookings.filter((b) => {
        if (b.partnerId !== partnerId) return false;
        const d = ngay(b.checkIn || b.createdAt);
        return d >= from && d <= to;
    });
}

/**
 * Doanh thu chỉ tính đơn ĐÃ HOÀN THÀNH — giống hệt quy tắc của bảng đối soát.
 * Hai trang cùng một quy tắc thì đối tác cộng tay ra cùng một số; lệch nhau là
 * họ mất tin ngay, mà mất tin về tiền thì không lấy lại được.
 */
const daXong = (list) => list.filter(b => b.status === 'completed');

function tongTien(list) {
    return list.reduce((s, b) => s + tien(b.totalPrice), 0);
}

/**
 * Toàn bộ số liệu cho một kỳ.
 *
 * @param {object} partner  hồ sơ đối tác
 * @param {string} month    "2026-09"; bỏ trống thì lấy tháng hiện tại
 */
async function forPartner(partner, month) {
    const ky = month || revenue.thisMonth();
    const truoc = thangTruoc(ky);
    const bookings = await listDocuments('bookings');

    const r1 = revenue.monthRange(ky);
    const r0 = revenue.monthRange(truoc);

    const donNay = donTrongKy(bookings, partner.id, r1.from, r1.to);
    const donTruoc = donTrongKy(bookings, partner.id, r0.from, r0.to);

    const xongNay = daXong(donNay);
    const xongTruoc = daXong(donTruoc);

    const thuNay = tongTien(xongNay);
    const thuTruoc = tongTien(xongTruoc);

    const rate = revenue.commissionOf(partner);

    // ── Theo ngày, đủ cột cho cả tháng ──
    // Ngày không có đơn vẫn phải có cột giá trị 0, nếu không biểu đồ sẽ nén
    // các ngày có đơn lại sát nhau và nhìn như ngày nào cũng đông.
    const soNgay = soNgayTrongThang(ky);
    const theoNgay = [];
    for (let i = 1; i <= soNgay; i += 1) {
        const d = `${ky}-${String(i).padStart(2, '0')}`;
        const cua = xongNay.filter(b => ngay(b.checkIn || b.createdAt) === d);
        theoNgay.push({ date: d, orders: cua.length, revenue: tongTien(cua) });
    }

    // ── Theo từng dịch vụ ──
    //
    // Gom theo MÃ tin đăng, không gom theo tên. Tên hiển thị trên đơn có ghép
    // thêm tên đơn vị vào ("Phòng Hương Sông · Homestay X") nên không bao giờ
    // khớp với tên tin đăng — gom theo tên thì mục "chưa có đơn nào" liệt kê
    // cả những phòng vừa bán được, tức là nói ngược hẳn sự thật.
    //
    // Đơn xe không gắn với tin đăng nào (nhà xe chạy theo từng chuyến lẻ) nên
    // vẫn gom theo chặng đường.
    const cuaToi = listings.byPartner(partner.id);
    const theoDichVu = new Map();
    for (const b of xongNay) {
        const ma = b.roomId || b.tourSlug || '';
        const ten = b.kind === 'transport'
            ? `${b.pickup || ''} → ${b.dropoff || ''}`
            : (b.roomName || b.tourName || 'Không rõ');
        const khoa = ma || ten;
        const cu = theoDichVu.get(khoa) || { id: ma, name: ten, orders: 0, revenue: 0 };
        cu.orders += 1;
        cu.revenue += tien(b.totalPrice);
        theoDichVu.set(khoa, cu);
    }
    const dichVu = [...theoDichVu.values()].sort((a, b) => b.revenue - a.revenue);

    // Tin đăng chưa từng có đơn nào trong kỳ — đây là thứ đối tác cần biết
    // nhất mà không bảng nào nói: đăng lên rồi để đó, không ai đặt.
    const daBan = new Set(dichVu.map(d => d.id).filter(Boolean));
    const chuaCoDon = cuaToi
        .filter(l => l.status === 'approved' && !daBan.has(l.id))
        .map(l => ({ id: l.id, name: l.name, type: l.type, price: l.price }));

    const huy = donNay.filter(b => b.status === 'cancelled').length;
    const cho = donNay.filter(b => b.status === 'pending').length;
    const dangLam = donNay.filter(b => b.status === 'confirmed').length;

    return {
        month: ky,
        previous_month: truoc,
        from: r1.from,
        to: r1.to,
        commission_rate: rate,

        summary: {
            revenue: thuNay,
            revenue_change: doiSo(thuNay, thuTruoc),
            orders: xongNay.length,
            orders_change: doiSo(xongNay.length, xongTruoc.length),
            // Giá trị trung bình mỗi đơn: biết được thì mới tính chuyện nâng
            // giá hay bán kèm, chứ nhìn mỗi tổng doanh thu thì không biết đang
            // bán được nhiều đơn nhỏ hay ít đơn to.
            avg_order: xongNay.length ? Math.round(thuNay / xongNay.length) : 0,
            commission: Math.round(thuNay * rate),
            net: thuNay - Math.round(thuNay * rate),

            all_orders: donNay.length,
            pending: cho,
            working: dangLam,
            cancelled: huy,
            // Tỉ lệ đơn không thành. Cao thì hoặc mình từ chối nhiều, hoặc
            // thông tin đăng chưa đúng nên khách đặt xong lại đổi ý.
            cancel_rate: donNay.length ? Math.round((huy / donNay.length) * 100) : 0,
        },

        previous: { revenue: thuTruoc, orders: xongTruoc.length },
        daily: theoNgay,
        by_service: dichVu,
        idle_listings: chuaCoDon,
    };
}

module.exports = { forPartner, thangTruoc, doiSo };
