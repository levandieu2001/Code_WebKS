// ============================================================
// LOCALMATE — Sổ quỹ (trang quản trị)
// ============================================================
// Trả lời đúng ba câu kế toán cần:
//   1. Tiền vào từ đâu, của ai, thuộc đơn nào?
//   2. Trong số tiền đang giữ, bao nhiêu là của mình, bao nhiêu giữ hộ đối tác?
//   3. Còn nợ đối tác nào bao nhiêu?
//
// Điểm dễ nhầm nhất và cũng nguy hiểm nhất: coi TIỀN TRONG QUỸ là doanh thu.
// Phần lớn tiền trong tài khoản là cọc giữ hộ đối tác — tiêu vào là tiêu tiền
// của người khác. Vì vậy hai con số đó luôn để tách nhau, không gộp.
// ============================================================

const AdminLedger = (() => {
    const $ = (id) => document.getElementById(id);
    const money = (n) => Number(n || 0).toLocaleString('vi-VN') + 'đ';
    const esc = (s) => String(s == null ? '' : s)
        .replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const dmy = (iso) => {
        const [y, m, d] = String(iso || '').slice(0, 10).split('-');
        return d ? `${d}/${m}` : (iso || '');
    };

    async function api(path) {
        const user = window.firebase?.auth?.().currentUser;
        if (!user) throw new Error('Chưa đăng nhập quản trị.');
        const token = await user.getIdToken();
        const res = await fetch(path, { headers: { Authorization: `Bearer ${token}` } });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body?.error?.message || `Lỗi HTTP ${res.status}`);
        return body;
    }

    let typesFilled = false;

    async function load() {
        const table = $('lg-table');
        if (!table) return;
        table.innerHTML = '<tbody><tr><td style="padding:20px">Đang dựng sổ…</td></tr></tbody>';

        const month = ($('lg-month') && $('lg-month').value) || '';
        const type = ($('lg-type') && $('lg-type').value) || '';

        let r;
        try {
            r = await api(`/v1/admin/ledger?${new URLSearchParams({ month, type })}`);
        } catch (err) {
            $('lg-totals').innerHTML = '';
            table.innerHTML = `<tbody><tr><td style="padding:20px">${esc(err.message)}</td></tr></tbody>`;
            return;
        }

        if ($('lg-month') && !$('lg-month').value) $('lg-month').value = r.month;
        if (!typesFilled && $('lg-type')) {
            $('lg-type').innerHTML = '<option value="">Tất cả khoản</option>'
                + r.types.map(t => `<option value="${esc(t.id)}">${esc(t.label)}</option>`).join('');
            $('lg-type').value = type;
            typesFilled = true;
        }

        const s = r.summary;

        $('lg-totals').innerHTML = [
            ['arrow-down-to-line', 'Cọc khách chuyển vào', money(s.deposit_in), 'tiền thật vào tài khoản'],
            ['percent', 'Doanh thu LOCALMATE', money(s.commission), 'hoa hồng — tiền của mình'],
            ['arrow-up-from-line', 'Đã chuyển đối tác', money(s.payout), 'tiền ra khỏi quỹ'],
            ['piggy-bank', 'Còn trong quỹ', money(s.cash_balance), 'gồm cả tiền giữ hộ'],
        ].map(([icon, label, value, sub]) => `
            <div class="stat-card">
                <div class="stat-icon" style="background:var(--surface-2)"><i data-lucide="${icon}"></i></div>
                <div class="stat-label">${label}</div>
                <div class="stat-value">${value}</div>
                <div class="stat-sub">${sub}</div>
            </div>`).join('');

        // Quỹ âm nghĩa là đã chi ra nhiều hơn số thật sự thu được — phải báo
        // ngay, đừng để lẫn trong bảng số liệu rồi vài tháng sau mới phát hiện.
        $('lg-warn').innerHTML = s.cash_balance < 0
            ? `<div style="margin:14px 0;padding:14px 18px;border-radius:14px;
                   background:#fdecea;border:1px solid #f5c6c2;color:#8c1d18;font-size:14px;line-height:1.6">
                 <b>Quỹ đang âm ${money(Math.abs(s.cash_balance))}.</b>
                 Tức là đã chuyển cho đối tác nhiều hơn số cọc thật sự thu được.
                 Kiểm tra lại các khoản “Chuyển cho đối tác” trong kỳ.
               </div>`
            : '';

        // Giữ hộ vs của mình — chỗ dễ tiêu nhầm nhất
        $('lg-split').innerHTML = `
            <div style="margin:16px 0;padding:16px 18px;border-radius:14px;
                        background:var(--leaf);border:1px solid rgba(143,160,115,.4);font-size:14px;line-height:1.75">
                Trong <b>${money(s.cash_balance)}</b> đang có:
                <b>${money(s.holding_for_partners)}</b> là <b>giữ hộ đối tác</b> (phải chuyển trả),
                phần còn lại mới là tiền của LOCALMATE.
                Khách trả nốt phần còn lại của đơn <b>thẳng cho đối tác</b>, không đi qua quỹ này.
            </div>

            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(320px,100%),1fr));gap:16px;margin-top:18px">
                <div>
                    <h3 style="font-family:var(--font-display);font-size:17px;margin:0 0 10px">Còn nợ đối tác</h3>
                    <div class="table-wrap"><table class="data-table">
                        <thead><tr><th>Đối tác</th><th>Thu hộ</th><th>Hoa hồng</th><th>Đã trả</th><th>Còn nợ</th></tr></thead>
                        <tbody>${(r.by_partner || []).length
                            ? r.by_partner.map(p => `
                                <tr>
                                    <td><b>${esc(p.partner_name || p.partner_id)}</b></td>
                                    <td>${money(p.deposit_in)}</td>
                                    <td style="color:var(--moss)">${money(p.commission)}</td>
                                    <td>${money(p.payout)}</td>
                                    <td><b${p.owed > 0 ? ' style="color:var(--terracotta)"' : ''}>${money(p.owed)}</b></td>
                                </tr>`).join('')
                            : '<tr><td style="padding:20px">Kỳ này chưa phát sinh.</td></tr>'}
                        </tbody></table></div>
                </div>
                <div>
                    <h3 style="font-family:var(--font-display);font-size:17px;margin:0 0 10px">Tiền đến từ mảng nào</h3>
                    <div class="table-wrap"><table class="data-table">
                        <thead><tr><th>Mảng dịch vụ</th><th>Cọc thu vào</th><th>Hoa hồng</th></tr></thead>
                        <tbody>${(r.by_kind || []).length
                            ? r.by_kind.map(k => `
                                <tr>
                                    <td><b>${esc(k.kind)}</b></td>
                                    <td>${money(k.deposit_in)}</td>
                                    <td style="color:var(--moss)"><b>${money(k.commission)}</b></td>
                                </tr>`).join('')
                            : '<tr><td style="padding:20px">Kỳ này chưa phát sinh.</td></tr>'}
                        </tbody></table></div>
                </div>
            </div>`;

        const rows = r.entries || [];
        table.innerHTML = !rows.length
            ? '<tbody><tr><td style="padding:26px">Kỳ này chưa có khoản nào.</td></tr></tbody>'
            : `
            <thead><tr>
                <th>Ngày</th><th>Khoản</th><th>Nguồn tiền</th><th>Đơn</th><th>Đối tác</th><th>Số tiền</th>
            </tr></thead>
            <tbody>${rows.map(e => `
                <tr>
                    <td>${esc(dmy(e.date))}</td>
                    <td>${esc(e.type_label)}</td>
                    <td><b>${esc(e.source)}</b>${e.source_detail
                        ? `<br><span style="font-size:12px;color:var(--muted)">${esc(e.source_detail)}</span>` : ''}</td>
                    <td>${e.booking_code
                        ? `<code style="font-size:12px">${esc(e.booking_code)}</code>` : '—'}</td>
                    <td>${esc(e.partner_name || '—')}</td>
                    <td style="white-space:nowrap;font-weight:700;color:${e.direction === 'in' ? 'var(--moss)' : 'var(--terracotta)'}">
                        ${e.direction === 'in' ? '+' : '−'}${money(e.amount)}
                    </td>
                </tr>`).join('')}</tbody>`;

        if (window.lucide) lucide.createIcons();
    }

    document.addEventListener('DOMContentLoaded', () => {
        document.querySelector('[data-tab="ledger"]')?.addEventListener('click', () => setTimeout(load, 100));
    });

    return { load };
})();

window.AdminLedger = AdminLedger;
