// ============================================================
// LOCALMATE — Đặt cọc & thanh toán
// ============================================================
// Hai đường, dùng chung một luồng trạng thái:
//
//   1. VietQR (chạy được ngay hôm nay)
//      Sinh mã QR chuyển khoản kèm nội dung có MÃ ĐƠN. Không cần tài khoản
//      doanh nghiệp, không mất phí, và đúng cách các homestay/nhà xe ở Việt
//      Nam đang làm. Khách chuyển xong bấm "đã chuyển", chủ nhà đối chiếu sao
//      kê rồi xác nhận.
//
//   2. Cổng thanh toán (VNPay/MoMo) — chừa sẵn chỗ cắm
//      Khi có tài khoản merchant, chỉ cần điền khoá vào .env là dùng được,
//      không phải viết lại luồng đơn hay màn hình nào.
//
// Trạng thái tiền của một đơn:
//   unpaid          — chưa cọc
//   pending_confirm — khách báo đã chuyển, đang chờ đối chiếu
//   paid            — đã nhận đủ cọc
//   refunded        — đã hoàn tiền (khách huỷ đúng chính sách)
// ============================================================

const PAYMENT_STATUSES = ['unpaid', 'pending_confirm', 'paid', 'refunded'];
const rateFromEnv = (name, fallback) => {
    const raw = process.env[name];
    if (raw === undefined || raw.trim() === '') return fallback;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 && n <= 1 ? n : fallback;
};

// Tỉ lệ cọc. Đặt xe cọc thấp hơn vì giá trị nhỏ và huỷ nhiều.
const DEPOSIT_RATES = {
    hotel: rateFromEnv('DEPOSIT_RATE_HOTEL', 0.3),
    tour: rateFromEnv('DEPOSIT_RATE_TOUR', 0.3),
    transport: rateFromEnv('DEPOSIT_RATE_TRANSPORT', 0.2),
    // Dac san KHONG thu coc, va co y nhu vay: luc dat thi CHUA BIET cuoc gui
    // la bao nhieu — con tuy tinh nao, may ky, gui thuong hay gui lanh. Bat
    // tra tien truoc khi chua biet tong la bao nhieu thi khach khong dam bam.
    // Co so xac nhan, bao cuoc, roi moi thu tien.
    food: rateFromEnv('DEPOSIT_RATE_FOOD', 0),
};
const MIN_DEPOSIT = Number(process.env.DEPOSIT_MIN) || 50000;

const BANK = {
    // Mã ngân hàng theo chuẩn VietQR (vd: 970436 = Vietcombank, MB = 970422)
    code: process.env.BANK_CODE || '',
    account: process.env.BANK_ACCOUNT || '',
    name: process.env.BANK_ACCOUNT_NAME || '',
};

const hasBank = () => Boolean(BANK.code && BANK.account);

/** Mã đơn ngắn dùng làm nội dung chuyển khoản. */
const codeOf = (booking) => String(booking?.id || '').slice(-8).toUpperCase();

/**
 * Số tiền cọc, làm tròn lên nghìn cho dễ chuyển khoản.
 * Đơn quá nhỏ thì thu trọn luôn, chứ cọc 15.000đ vừa phiền vừa vô nghĩa.
 */
function depositFor(booking) {
    const total = Number(booking?.totalPrice || 0);
    if (total <= 0) return 0;

    const rate = DEPOSIT_RATES[booking?.kind] ?? 0.3;
    // Ty le 0 nghia la KHONG thu coc. Khong duoc de roi xuong muc toi thieu
    // ben duoi, khong thi don dac san lai bi doi 50 nghin coc.
    if (rate <= 0) return 0;

    let amount = Math.ceil((total * rate) / 1000) * 1000;
    if (amount < MIN_DEPOSIT) amount = Math.min(total, MIN_DEPOSIT);
    return Math.min(amount, total);
}

/**
 * Nội dung chuyển khoản. Bắt buộc có mã đơn, vì đó là thứ duy nhất để đối
 * chiếu sao kê với đơn — thiếu nó thì tiền về mà không biết của ai.
 */
const transferContent = (booking) => `BAYNUI ${codeOf(booking)}`;

/**
 * Thông tin để khách chuyển khoản.
 * Trả về ok=false kèm lý do khi chưa cấu hình ngân hàng, để giao diện nói thật
 * là "chưa bật thanh toán" chứ không hiện một mã QR rỗng.
 */
function vietQR(booking) {
    if (!hasBank()) {
        return {
            ok: false,
            reason: 'Chưa cấu hình tài khoản ngân hàng nhận cọc (BANK_CODE, BANK_ACCOUNT trong .env).',
        };
    }

    const amount = depositFor(booking);
    const content = transferContent(booking);
    const params = new URLSearchParams({
        amount: String(amount),
        addInfo: content,
        accountName: BANK.name,
    });

    return {
        ok: true,
        method: 'vietqr',
        amount,
        content,
        bank_code: BANK.code,
        account: BANK.account,
        account_name: BANK.name,
        // Ảnh QR do dịch vụ miễn phí của VietQR sinh, không cần khoá API
        qr_image: `https://img.vietqr.io/image/${BANK.code}-${BANK.account}-compact2.png?${params}`,
    };
}

// ── Cổng thanh toán: chỗ cắm sẵn ────────────────────────────
// Mỗi cổng chỉ cần trả về { pay_url } là xong. Chưa có khoá thì báo rõ ràng
// chứ không tạo link giả — link giả đưa cho khách là mất tiền thật.
const GATEWAYS = {
    vnpay: {
        label: 'VNPay',
        configured: () => Boolean(process.env.VNPAY_TMN_CODE && process.env.VNPAY_HASH_SECRET),
        env: ['VNPAY_TMN_CODE', 'VNPAY_HASH_SECRET', 'VNPAY_RETURN_URL'],
    },
    momo: {
        label: 'MoMo',
        configured: () => Boolean(process.env.MOMO_PARTNER_CODE && process.env.MOMO_SECRET_KEY),
        env: ['MOMO_PARTNER_CODE', 'MOMO_ACCESS_KEY', 'MOMO_SECRET_KEY', 'MOMO_RETURN_URL'],
    },
};

/** Danh sách cách trả tiền đang thật sự dùng được. */
function availableMethods() {
    const list = [];
    if (hasBank()) {
        list.push({ id: 'vietqr', label: 'Chuyển khoản QR', ready: true, note: 'Quét mã, chuyển xong bấm xác nhận.' });
    }
    for (const [id, g] of Object.entries(GATEWAYS)) {
        list.push({
            id,
            label: g.label,
            ready: g.configured(),
            note: g.configured()
                ? 'Thanh toán tự động, xác nhận ngay.'
                : `Chưa bật — cần điền ${g.env.join(', ')} vào .env.`,
        });
    }
    list.push({ id: 'cash', label: 'Trả khi nhận dịch vụ', ready: true, note: 'Không cần cọc trước.' });
    return list;
}

/**
 * Tạo link thanh toán qua cổng.
 * @throws Error có .status/.code khi cổng chưa được cấu hình.
 */
function createGatewayPayment(provider) {
    const gateway = GATEWAYS[provider];
    if (!gateway) {
        const err = new Error('Không hỗ trợ cổng thanh toán này.');
        err.status = 400; err.code = 'UNKNOWN_GATEWAY';
        throw err;
    }
    if (!gateway.configured()) {
        const err = new Error(
            `${gateway.label} chưa được bật. Cần điền ${gateway.env.join(', ')} vào .env sau khi đăng ký tài khoản merchant.`,
        );
        err.status = 501; err.code = 'GATEWAY_NOT_CONFIGURED';
        throw err;
    }
    // Có khoá thật thì ký request và trả pay_url ở đây.
    const err = new Error(`${gateway.label} đã có khoá nhưng phần ký giao dịch chưa được nối.`);
    err.status = 501; err.code = 'GATEWAY_NOT_IMPLEMENTED';
    throw err;
}

/** Nhãn tiếng Việt cho trạng thái tiền. */
const STATUS_LABELS = {
    unpaid: 'Chưa đặt cọc',
    pending_confirm: 'Đã báo chuyển, chờ đối chiếu',
    paid: 'Đã nhận cọc',
    refunded: 'Đã hoàn tiền',
};

/** Gói thông tin thanh toán của một đơn để trả cho giao diện. */
function paymentView(booking) {
    const status = PAYMENT_STATUSES.includes(booking?.paymentStatus) ? booking.paymentStatus : 'unpaid';
    const deposit = Number(booking?.depositAmount) || depositFor(booking);

    return {
        payment_status: status,
        payment_status_label: STATUS_LABELS[status],
        payment_method: booking?.paymentMethod || '',
        payment_ref: booking?.paymentRef || '',
        deposit_amount: deposit,
        total_price: Number(booking?.totalPrice || 0),
        remaining: Math.max(0, Number(booking?.totalPrice || 0) - (status === 'paid' ? deposit : 0)),
        // Trả tiền được khi đơn còn sống và chưa nhận cọc
        can_pay: ['pending', 'confirmed'].includes(booking?.status) && status === 'unpaid',
        methods: availableMethods(),
        transfer: vietQR(booking),
    };
}

module.exports = {
    PAYMENT_STATUSES, STATUS_LABELS,
    depositFor, transferContent, codeOf, vietQR,
    availableMethods, createGatewayPayment, paymentView, hasBank,
    BANK, GATEWAYS,
};
