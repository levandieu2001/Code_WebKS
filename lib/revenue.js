// ============================================================
// LOCALMATE — Đối soát doanh thu đối tác
// ============================================================
// Đây là thứ quyết định đối tác có ở lại với nền tảng hay không. Nhà xe hay
// khách sạn nhỏ sẽ hỏi đúng ba câu, tháng nào cũng hỏi:
//   1. Tháng này tôi chạy được bao nhiêu đơn?
//   2. LOCALMATE trừ hoa hồng bao nhiêu?
//   3. Cuối cùng tôi nhận về bao nhiêu, và đã trả chưa?
//
// Không trả lời được ba câu đó bằng con số rõ ràng thì đối tác nghi ngờ, và
// nghi ngờ thì họ bỏ đi — nên bảng này liệt kê TỪNG ĐƠN, không chỉ tổng.
//
// Chỉ tính đơn ĐÃ HOÀN THÀNH. Đơn mới đặt hay đang chờ chưa phải tiền thật;
// gộp vào rồi khách huỷ thì con số vừa đưa cho đối tác thành sai.
// ============================================================

const store = require('./store');
const { listDocuments } = require('./firestore');
const { findPartner } = require('./partners');

const SETTLEMENTS = 'settlements';

const dayOf = (iso) => String(iso || '').slice(0, 10);
const money = (n) => Math.round(Number(n) || 0);

/** Hoa hồng của một đối tác, không tra được thì theo loại hình. */
function commissionOf(partner) {
    if (partner && Number.isFinite(partner.commission)) return partner.commission;
    const byType = { tour: 0.15, transport: 0.12, hotel: 0.10 };
    return byType[partner?.type] ?? 0.10;
}

/** Tháng hiện tại dạng "2026-08". */
const thisMonth = () => new Date().toISOString().slice(0, 7);

/** Khoảng ngày của một tháng. */
function monthRange(month) {
    const [y, m] = String(month || thisMonth()).split('-').map(Number);
    const from = new Date(Date.UTC(y, m - 1, 1));
    const to = new Date(Date.UTC(y, m, 0));
    return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

/**
 * Bảng đối soát của một đối tác trong một khoảng thời gian.
 *
 * @param bookings truyền sẵn danh sách đơn để không phải gọi Firestore nhiều
 * lần khi dựng báo cáo cho tất cả đối tác.
 */
function statementFor(partner, { from, to, bookings }) {
    const rate = commissionOf(partner);

    const rows = bookings
        .filter(b => b.partnerId === partner.id)
        .filter(b => b.status === 'completed')
        .filter((b) => {
            // Tính theo ngày dùng dịch vụ, không phải ngày đặt — đối tác đối
            // chiếu với sổ tay của họ theo ngày chạy xe / ngày khách ở.
            const day = dayOf(b.checkIn || b.createdAt);
            return day >= from && day <= to;
        })
        .map((b) => {
            const gross = money(b.totalPrice);
            const commission = money(gross * rate);
            return {
                id: b.id,
                code: String(b.id).slice(-8).toUpperCase(),
                kind: b.kind,
                date: dayOf(b.checkIn || b.createdAt),
                summary: b.kind === 'transport'
                    ? `${b.pickup || ''} → ${b.dropoff || ''}`
                    : (b.roomName || ''),
                guest: b.guestName || '',
                gross,
                commission,
                net: gross - commission,
                // Khách đã cọc bao nhiêu — phần này LOCALMATE đang giữ hộ
                deposit: b.paymentStatus === 'paid' ? money(b.depositAmount) : 0,
            };
        })
        .sort((a, b) => a.date.localeCompare(b.date));

    const gross = rows.reduce((s, r) => s + r.gross, 0);
    const commission = rows.reduce((s, r) => s + r.commission, 0);
    const deposit = rows.reduce((s, r) => s + r.deposit, 0);

    return {
        partner_id: partner.id,
        partner_name: partner.name,
        partner_type: partner.type,
        from,
        to,
        commission_rate: rate,
        orders: rows.length,
        gross,
        commission,
        net: gross - commission,
        // LOCALMATE đã thu hộ tiền cọc, nên khoản phải chuyển cho đối tác là
        // phần cọc trừ đi hoa hồng. Phần còn lại đối tác thu trực tiếp của khách.
        collected_deposit: deposit,
        payable: Math.max(0, deposit - commission),
        rows,
    };
}

const settlementKey = (partnerId, month) => `${partnerId}:${month}`;

/** Kỳ nào đã chốt trả rồi. */
function settlementOf(partnerId, month) {
    return store.find(SETTLEMENTS, s => s.key === settlementKey(partnerId, month)) || null;
}

/** Quản trị đánh dấu đã chuyển tiền cho đối tác kỳ này. */
function settle({ partnerId, month, amount, note = '', by = '' }) {
    const key = settlementKey(partnerId, month);
    const existing = store.find(SETTLEMENTS, s => s.key === key);
    const data = {
        key,
        partnerId,
        month,
        amount: money(amount),
        note,
        by,
        paidAt: new Date().toISOString(),
    };
    if (existing) return store.update(SETTLEMENTS, existing.id, data);
    return store.insert(SETTLEMENTS, {
        id: `sm_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
        ...data,
    });
}

/** Báo cáo cho một đối tác, kèm trạng thái đã trả hay chưa. */
async function forPartner(partner, month) {
    const { from, to } = monthRange(month);
    const bookings = await listDocuments('bookings');
    const statement = statementFor(partner, { from, to, bookings });
    const paid = settlementOf(partner.id, month || thisMonth());

    return {
        ...statement,
        month: month || thisMonth(),
        settled: Boolean(paid),
        settled_at: paid?.paidAt || '',
        settled_amount: paid?.amount || 0,
    };
}

/** Báo cáo tất cả đối tác trong một tháng — dùng cho trang quản trị. */
async function allPartners(month, storePartners) {
    const { from, to } = monthRange(month);
    const bookings = await listDocuments('bookings');
    const target = month || thisMonth();

    // Gộp đối tác có sẵn trong mã nguồn và đối tác tự đăng ký
    const list = [...storePartners];

    return list
        .map((p) => {
            const s = statementFor(p, { from, to, bookings });
            const paid = settlementOf(p.id, target);
            return {
                partner_id: p.id,
                partner_name: p.name,
                partner_type: p.type,
                // Tài khoản nhận tiền, để quản trị chuyển khoản ngay tại bảng
                // đối soát. Thiếu nó thì đối soát ra số tiền phải trả xong lại
                // phải đi lục hồ sơ tìm số tài khoản — mỗi kỳ một lần, mỗi
                // đối tác một lần.
                bank_name: p.bankName || '',
                bank_account: p.bankAccount || '',
                bank_holder: p.bankHolder || '',
                commission_rate: s.commission_rate,
                orders: s.orders,
                gross: s.gross,
                commission: s.commission,
                net: s.net,
                collected_deposit: s.collected_deposit,
                payable: s.payable,
                settled: Boolean(paid),
                settled_at: paid?.paidAt || '',
            };
        })
        // Đối tác không có đơn nào trong kỳ thì bỏ, cho bảng đỡ rối
        .filter(r => r.orders > 0)
        .sort((a, b) => b.gross - a.gross);
}

module.exports = {
    statementFor, forPartner, allPartners, settle, settlementOf,
    commissionOf, monthRange, thisMonth,
};
