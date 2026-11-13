// ============================================================
// LOCALMATE — Sổ quỹ
// ============================================================
// TIỀN Ở NỀN TẢNG NÀY CHẢY NHƯ SAU:
//
//   1. Khách chuyển CỌC vào tài khoản Bảy Núi.
//      → Tiền vào quỹ, nhưng phần lớn là GIỮ HỘ đối tác, không phải của mình.
//
//   2. LOCALMATE giữ lại HOA HỒNG trên tổng giá trị đơn.
//      → Đây mới là doanh thu thật của nền tảng.
//
//   3. Bảy Núi CHUYỂN phần còn lại cho đối tác (cọc trừ hoa hồng).
//      → Tiền ra khỏi quỹ.
//
//   4. Phần tiền còn lại của đơn, khách trả THẲNG cho đối tác lúc nhận dịch vụ.
//      → Không đi qua Bảy Núi, nên KHÔNG ghi vào quỹ. Ghi vào là thổi phồng
//        con số, tới lúc đối chiếu ngân hàng là lệch.
//
// VÌ SAO SUY RA TỪ DỮ LIỆU GỐC THAY VÌ GHI SỔ RIÊNG:
// Sổ ghi riêng sẽ lệch dần với đơn hàng thật — quên ghi một bút toán, hoặc ghi
// hai lần, là số liệu sai mà không ai biết. Ở đây mọi dòng đều được dựng lại
// từ đơn hàng và các lần chuyển tiền, nên sổ luôn khớp với thực tế.
// ============================================================

const store = require('./store');
const { listDocuments } = require('./firestore');
const { findPartner } = require('./partners');
const payments = require('./payments');
const revenue = require('./revenue');

const SETTLEMENTS = 'settlements';

const money = (n) => Math.round(Number(n) || 0);
const dayOf = (iso) => String(iso || '').slice(0, 10);
const codeOf = (id) => String(id || '').slice(-8).toUpperCase();

/** Đối tác của một đơn, tra ở cả danh bạ có sẵn lẫn hồ sơ tự đăng ký. */
function partnerOf(partnerId) {
    if (!partnerId) return null;
    return findPartner(partnerId) || store.find('partners', p => p.id === partnerId) || null;
}

const KIND_LABELS = { hotel: 'Phòng nghỉ', transport: 'Xe đưa đón', tour: 'Tour' };

const TYPE_LABELS = {
    deposit_in: 'Khách chuyển cọc',
    commission: 'Hoa hồng Bảy Núi',
    payout: 'Chuyển cho đối tác',
    refund: 'Hoàn tiền khách',
};

/**
 * Dựng toàn bộ dòng tiền trong một khoảng thời gian.
 *
 * @param from,to dạng YYYY-MM-DD (bao gồm cả hai đầu).
 * @param partnerId lọc theo một đối tác, để trang đối tác chỉ thấy tiền của mình.
 */
async function entries({ from, to, partnerId = '' } = {}) {
    const bookings = await listDocuments('bookings');
    const settlements = store.readAll(SETTLEMENTS) || [];
    const rows = [];

    const inRange = (day) => (!from || day >= from) && (!to || day <= to);

    for (const b of bookings) {
        if (partnerId && b.partnerId !== partnerId) continue;

        const partner = partnerOf(b.partnerId);
        const code = codeOf(b.id);
        const kindLabel = KIND_LABELS[b.kind] || b.kind;

        // ── Cọc đã thu ──
        // Chỉ tính khi đã XÁC NHẬN nhận được tiền. Trạng thái "khách báo đã
        // chuyển" chưa phải tiền trong tài khoản — ghi vào là tự lừa mình.
        if (b.paymentStatus === 'paid' || b.paymentStatus === 'refunded') {
            const day = dayOf(b.paidAt || b.updatedAt || b.createdAt);
            const amount = money(b.depositAmount || payments.depositFor(b));
            if (amount > 0 && inRange(day)) {
                rows.push({
                    date: day,
                    type: 'deposit_in',
                    direction: 'in',
                    amount,
                    booking_id: b.id,
                    booking_code: code,
                    kind: b.kind,
                    // "Tiền này từ đâu tới" — câu đầu tiên kế toán hỏi
                    source: `Khách ${b.guestName || ''}`.trim(),
                    source_detail: b.phone || '',
                    partner_id: b.partnerId || '',
                    partner_name: b.partnerName || partner?.name || '',
                    note: `${kindLabel} · đơn ${code}`,
                });
            }
        }

        // ── Hoàn tiền khách ──
        if (b.paymentStatus === 'refunded') {
            const day = dayOf(b.refundedAt || b.updatedAt || b.createdAt);
            const amount = money(b.depositAmount || 0);
            if (amount > 0 && inRange(day)) {
                rows.push({
                    date: day,
                    type: 'refund',
                    direction: 'out',
                    amount,
                    booking_id: b.id,
                    booking_code: code,
                    kind: b.kind,
                    source: `Khách ${b.guestName || ''}`.trim(),
                    source_detail: b.phone || '',
                    partner_id: b.partnerId || '',
                    partner_name: b.partnerName || partner?.name || '',
                    note: `Hoàn cọc đơn ${code}`,
                });
            }
        }

        // ── Hoa hồng ──
        // Chỉ ghi nhận khi đơn ĐÃ HOÀN THÀNH. Đơn còn dang dở mà đã tính hoa
        // hồng thì khách huỷ một cái là doanh thu tụt, sổ phải sửa lùi.
        if (b.status === 'completed' && b.partnerId) {
            const day = dayOf(b.completedAt || b.checkIn || b.createdAt);
            const rate = revenue.commissionOf(partner || { type: b.kind === 'transport' ? 'transport' : 'hotel' });
            const amount = money(Number(b.totalPrice || 0) * rate);
            if (amount > 0 && inRange(day)) {
                rows.push({
                    date: day,
                    type: 'commission',
                    direction: 'in',
                    amount,
                    booking_id: b.id,
                    booking_code: code,
                    kind: b.kind,
                    source: b.partnerName || partner?.name || 'Đối tác',
                    source_detail: `${Math.round(rate * 100)}% của ${money(b.totalPrice).toLocaleString('vi-VN')}đ`,
                    partner_id: b.partnerId,
                    partner_name: b.partnerName || partner?.name || '',
                    note: `Hoa hồng ${kindLabel} · đơn ${code}`,
                });
            }
        }
    }

    // ── Đã chuyển cho đối tác ──
    for (const s of settlements) {
        if (partnerId && s.partnerId !== partnerId) continue;
        const day = dayOf(s.paidAt);
        if (!inRange(day)) continue;

        const partner = partnerOf(s.partnerId);
        rows.push({
            date: day,
            type: 'payout',
            direction: 'out',
            amount: money(s.amount),
            booking_id: '',
            booking_code: '',
            kind: '',
            source: partner?.name || s.partnerId,
            source_detail: `Kỳ ${s.month}`,
            partner_id: s.partnerId,
            partner_name: partner?.name || '',
            note: s.note || `Thanh toán kỳ ${s.month}`,
        });
    }

    rows.sort((a, b) => String(b.date).localeCompare(String(a.date)));
    return rows.map(r => ({ ...r, type_label: TYPE_LABELS[r.type] || r.type }));
}

/**
 * Tổng hợp một kỳ.
 *
 * Chia rõ hai thứ hay bị lẫn: TIỀN TRONG QUỸ (gồm cả tiền giữ hộ đối tác) và
 * DOANH THU THẬT của LOCALMATE (chỉ hoa hồng). Nhìn nhầm quỹ thành doanh thu là
 * tưởng lãi to rồi tiêu vào tiền của người khác.
 */
function summarize(rows) {
    const sum = (type) => rows.filter(r => r.type === type).reduce((s, r) => s + r.amount, 0);

    const depositIn = sum('deposit_in');
    const commission = sum('commission');
    const payout = sum('payout');
    const refund = sum('refund');

    return {
        deposit_in: depositIn,
        commission,
        payout,
        refund,
        // Tiền mặt còn trong tài khoản Bảy Núi từ hoạt động của kỳ này
        cash_balance: depositIn - payout - refund,
        // Phần đang giữ hộ đối tác, chưa chuyển
        holding_for_partners: Math.max(0, depositIn - refund - commission - payout),
        entries: rows.length,
    };
}

/** Gom theo đối tác — để biết còn nợ ai bao nhiêu. */
function byPartner(rows) {
    const map = new Map();

    for (const r of rows) {
        if (!r.partner_id) continue;
        const cur = map.get(r.partner_id) || {
            partner_id: r.partner_id,
            partner_name: r.partner_name,
            deposit_in: 0,
            commission: 0,
            payout: 0,
            refund: 0,
        };
        cur[r.type] = (cur[r.type] || 0) + r.amount;
        map.set(r.partner_id, cur);
    }

    return [...map.values()]
        .map(p => ({
            ...p,
            // LOCALMATE thu hộ bao nhiêu, trừ hoa hồng, trừ đã chuyển → còn nợ
            owed: Math.max(0, p.deposit_in - p.refund - p.commission - p.payout),
        }))
        .sort((a, b) => b.owed - a.owed);
}

/** Gom theo loại dịch vụ — tiền chủ yếu đến từ mảng nào. */
function byKind(rows) {
    const map = {};
    for (const r of rows) {
        if (r.direction !== 'in' || !r.kind) continue;
        const k = KIND_LABELS[r.kind] || r.kind;
        map[k] = map[k] || { kind: k, deposit_in: 0, commission: 0 };
        map[k][r.type] = (map[k][r.type] || 0) + r.amount;
    }
    return Object.values(map).sort((a, b) => (b.commission) - (a.commission));
}

module.exports = { entries, summarize, byPartner, byKind, TYPE_LABELS, KIND_LABELS };
