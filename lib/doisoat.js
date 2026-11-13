// ============================================================
// LOCALMATE — Đối chiếu tiền cọc với sao kê ngân hàng
// ============================================================
// Trước đây tiền vào hệ thống bằng hai cái bấm tin nhau: khách bấm "tôi đã
// chuyển cọc", quản trị bấm "đã nhận". Không ai đối chiếu với ngân hàng cả.
//
// Vài đơn một ngày thì còn nhớ được. Vài chục đơn là bắt đầu lẫn, và lẫn theo
// đúng hai hướng tệ nhất:
//   - Khách bấm "đã chuyển" nhưng tiền không về (bấm nhầm, chuyển hụt, hoặc
//     cố tình) → mình giữ phòng cho một đơn không có tiền.
//   - Tiền về thật nhưng không ai bấm xác nhận → khách đã trả tiền mà đơn vẫn
//     treo, họ gọi điện phàn nàn và mình không có gì để tra.
//
// Ở đây nhận SAO KÊ THẬT của ngân hàng, tìm mã đơn trong nội dung chuyển
// khoản, rồi đối chiếu số tiền. Máy chỉ ghép và báo cáo — người vẫn là người
// bấm xác nhận. Tự động xác nhận theo một cái tệp dán vào thì chỉ đổi chỗ sai
// từ trí nhớ sang tệp, chứ không chắc chắn hơn.
//
// KHÔNG kết nối thẳng API ngân hàng: mấy ngân hàng Việt Nam đều đòi hợp đồng
// doanh nghiệp và bộ khoá riêng. Dán sao kê là đường mọi chủ nhà đều làm được
// ngay hôm nay, không phải chờ ai duyệt.
// ============================================================

const store = require('./store');
const payments = require('./payments');

const COLLECTION = 'reconcile_log';

/** Nội dung chuyển khoản mẫu: "BAYNUI ABCD1234". */
const MAU_MA = /\b(?:BAYNUI|LOCALMATE)[\s\-_]*([A-Z0-9]{6,10})\b/i;
/** Dự phòng: một cụm 8 ký tự chữ-số đứng riêng, đúng dạng mã đơn. */
const MAU_MA_TRAN = /\b([A-Z0-9]{8})\b/;

const chiSo = (s) => String(s == null ? '' : s).replace(/[^\d-]/g, '');

/**
 * Đọc một số tiền từ sao kê.
 *
 * Ngân hàng Việt Nam ghi "1.500.000" (chấm ngăn nghìn), ngân hàng khác ghi
 * "1,500,000", có nơi lại "1500000.00". Bỏ hết dấu ngăn rồi mới đọc, nhưng
 * phải giữ phần thập phân nếu có — "1500000.50" mà bỏ chấm thì thành 150 triệu.
 */
function docTien(o) {
    let t = String(o == null ? '' : o).trim().replace(/\s/g, '');
    if (!t) return null;
    const am = /^\(.*\)$/.test(t) || t.startsWith('-');
    t = t.replace(/[()+-]/g, '');

    // Còn đúng hai chữ số sau dấu cuối cùng → đó là dấu thập phân
    const cuoi = Math.max(t.lastIndexOf('.'), t.lastIndexOf(','));
    let so;
    if (cuoi !== -1 && t.length - cuoi - 1 === 2) {
        so = Number(t.slice(0, cuoi).replace(/[.,]/g, '') + '.' + t.slice(cuoi + 1));
    } else {
        so = Number(t.replace(/[.,]/g, ''));
    }
    if (!Number.isFinite(so)) return null;
    return am ? -so : so;
}

/** Đọc ngày ở mấy dạng hay gặp: 20/10/2026, 2026-10-20, 20-10-2026. */
function docNgay(o) {
    const t = String(o == null ? '' : o).trim();
    let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    m = t.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
    if (m) return `${m[3]}-${String(m[2]).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`;
    return '';
}

/** Tách một dòng CSV, tôn trọng dấu nháy kép. */
function tachDong(dong, nganCach) {
    const o = [];
    let cur = '';
    let trongNhay = false;
    for (let i = 0; i < dong.length; i += 1) {
        const c = dong[i];
        if (c === '"') {
            if (trongNhay && dong[i + 1] === '"') { cur += '"'; i += 1; }
            else trongNhay = !trongNhay;
        } else if (c === nganCach && !trongNhay) {
            o.push(cur); cur = '';
        } else {
            cur += c;
        }
    }
    o.push(cur);
    return o.map(x => x.trim());
}

/** Đoán dấu ngăn cột: cái nào xuất hiện đều nhất trên các dòng. */
function doanNganCach(dong) {
    const ungVien = [';', ',', '\t', '|'];
    let tot = ',';
    let diem = -1;
    for (const c of ungVien) {
        const soCot = dong.slice(0, 20).map(d => tachDong(d, c).length);
        const trungBinh = soCot.reduce((a, b) => a + b, 0) / (soCot.length || 1);
        if (trungBinh > diem && trungBinh >= 2) { diem = trungBinh; tot = c; }
    }
    return tot;
}

/**
 * Đọc sao kê thành danh sách giao dịch TIỀN VÀO.
 *
 * Không đòi đúng một mẫu cột: mỗi ngân hàng xuất một kiểu, mà chủ nhà thì
 * không sửa được tệp ngân hàng xuất ra. Tự dò: cột nào ra ngày thì là ngày,
 * cột số nào lớn nhất thì là số tiền, cột chữ dài nhất thì là nội dung.
 *
 * Tiền RA (số âm) bỏ qua: đối chiếu tiền cọc thì chỉ quan tâm tiền vào.
 */
function docSaoKe(vanBan) {
    const dong = String(vanBan || '')
        .split(/\r?\n/)
        .map(d => d.trim())
        .filter(Boolean);
    if (!dong.length) return { rows: [], skipped: 0, separator: '' };

    const nganCach = doanNganCach(dong);
    const rows = [];
    let boQua = 0;

    for (const d of dong) {
        const o = tachDong(d, nganCach);
        if (o.length < 2) { boQua += 1; continue; }

        let ngay = '';
        let tien = null;
        let noiDung = '';

        for (const cell of o) {
            const n = docNgay(cell);
            if (n && !ngay) { ngay = n; continue; }

            const so = docTien(cell);
            // Chuỗi có chữ cái thì không phải số tiền, dù đọc ra số được
            const chiLaSo = /^[\d.,()\s+-]+$/.test(cell) && cell.replace(/\D/g, '').length >= 4;
            if (so !== null && chiLaSo) {
                if (tien === null || Math.abs(so) > Math.abs(tien)) tien = so;
                continue;
            }
            if (cell.length > noiDung.length) noiDung = cell;
        }

        // Dòng tiêu đề: không có tiền, hoặc nội dung toàn chữ mô tả cột
        if (tien === null || tien <= 0) { boQua += 1; continue; }

        rows.push({ date: ngay, amount: Math.round(tien), content: noiDung, raw: d });
    }

    return { rows, skipped: boQua, separator: nganCach === '\t' ? 'tab' : nganCach };
}

/** Rút mã đơn từ nội dung chuyển khoản. */
function layMaDon(noiDung) {
    const t = String(noiDung || '').toUpperCase();
    const m = t.match(MAU_MA);
    if (m) return m[1].toUpperCase();
    const m2 = t.match(MAU_MA_TRAN);
    return m2 ? m2[1].toUpperCase() : '';
}

const maCua = (b) => String(b.id || '').slice(-8).toUpperCase();

/**
 * Ghép sao kê với đơn.
 *
 * Bốn nhóm, và cố ý tách riêng chứ không gộp thành "khớp / không khớp":
 *   khop        — có mã, đúng đơn, đủ tiền → bấm xác nhận được
 *   lech_tien   — đúng đơn nhưng tiền không đủ (chuyển thiếu, hoặc trừ phí)
 *   khong_ro    — có tiền vào nhưng không tìm ra đơn nào
 *   thieu_tien  — đơn khách báo đã chuyển mà sao kê không có dòng nào
 *
 * Nhóm cuối mới là nhóm nguy hiểm: đó là những đơn đang giữ phòng bằng một
 * lời hứa.
 */
function ghep(giaoDich, bookings) {
    const theoMa = new Map();
    for (const b of bookings) theoMa.set(maCua(b), b);

    const khop = [];
    const lechTien = [];
    const khongRo = [];
    const daGhep = new Set();

    for (const gd of giaoDich) {
        const ma = layMaDon(gd.content);
        const b = ma ? theoMa.get(ma) : null;
        if (!b) {
            khongRo.push({ ...gd, code: ma });
            continue;
        }
        // Số cọc phải thu.
        //
        // depositAmount chỉ được ghi vào đơn khi khách bấm "đã chuyển cọc"
        // hoặc khi quản trị xác nhận. Đơn chưa qua bước đó thì trường này
        // trống — lúc ấy TÍNH LẠI theo công thức, chứ không được coi trống
        // là "khớp với mọi số tiền". Coi như vậy thì một giao dịch mười nghìn
        // cũng khớp với đơn cọc hai triệu.
        const canCoc = Number(b.depositAmount) || payments.depositFor(b) || 0;
        daGhep.add(maCua(b));
        const chung = {
            ...gd,
            code: ma,
            booking_id: b.id,
            guest: b.guestName || '',
            phone: b.phone || '',
            summary: b.roomName || b.tourName || '',
            deposit_expected: canCoc,
            payment_status: b.paymentStatus || 'unpaid',
        };

        if (!canCoc) {
            // Vẫn không ra được số phải thu thì đẩy sang nhóm cần xem tay,
            // không tự cho là khớp.
            lechTien.push({ ...chung, thieu: null,
                ghi_chu: 'Chưa xác định được số cọc phải thu — bạn kiểm tay giúp.' });
        } else if (gd.amount + 1000 >= canCoc) {
            // Cho lệch 1000đ: một số ngân hàng trừ phí lẻ ở đầu nhận.
            khop.push(chung);
        } else {
            lechTien.push({ ...chung, thieu: canCoc - gd.amount });
        }
    }

    const thieuTien = bookings
        .filter(b => b.paymentStatus === 'pending_confirm')
        .filter(b => !daGhep.has(maCua(b)))
        .map(b => ({
            code: maCua(b),
            booking_id: b.id,
            guest: b.guestName || '',
            phone: b.phone || '',
            summary: b.roomName || b.tourName || '',
            deposit_expected: Number(b.depositAmount) || payments.depositFor(b) || 0,
            claimed_at: b.paymentClaimedAt || '',
        }));

    return { khop, lech_tien: lechTien, khong_ro: khongRo, thieu_tien: thieuTien };
}

/** Ghi lại một lần đối chiếu, để sau còn tra "đơn này khớp giao dịch nào". */
function ghiNhat({ by, tongDong, ketQua, daXacNhan = [] }) {
    return store.insert(COLLECTION, {
        id: `dc_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
        by,
        at: new Date().toISOString(),
        lines: tongDong,
        matched: ketQua.khop.length,
        mismatched: ketQua.lech_tien.length,
        unknown: ketQua.khong_ro.length,
        missing: ketQua.thieu_tien.length,
        confirmed: daXacNhan,
    });
}

const nhatKy = (n = 20) => store.readAll(COLLECTION)
    .sort((a, b) => String(b.at).localeCompare(String(a.at)))
    .slice(0, n);

module.exports = {
    COLLECTION, docSaoKe, layMaDon, ghep, ghiNhat, nhatKy, docTien, docNgay,
};
