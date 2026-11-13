// ============================================================
// LOCALMATE — Đối soát doanh thu (trang quản trị)
// ============================================================
// Chủ nhà cần biết: tháng này thu hộ bao nhiêu, LOCALMATE hưởng bao nhiêu,
// và còn nợ đối tác nào chưa chuyển.
//
// Bảng này dùng CHUNG endpoint với bảng bên cổng đối tác, nên hai bên nhìn
// cùng một con số. Lệch số là mất niềm tin, mà mất niềm tin thì đối tác bỏ đi.
// ============================================================

const AdminRevenue = (() => {
    const $ = (id) => document.getElementById(id);
    const money = (n) => Number(n || 0).toLocaleString('vi-VN') + 'đ';
    const esc = (s) => String(s == null ? '' : s)
        .replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

    // admin.js bọc toàn bộ trong IIFE nên adminApi() KHÔNG ra tới đây được.
    // Tự lấy token từ phiên Firebase — vẫn đúng một cơ chế xác thực, chỉ là
    // không mượn hàm của file khác.
    async function api(path, options = {}) {
        const user = window.firebase?.auth?.().currentUser;
        if (!user) throw new Error('Chưa đăng nhập quản trị.');
        const token = await user.getIdToken();
        const res = await fetch(path, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
                ...(options.headers || {}),
            },
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body?.error?.message || `Lỗi HTTP ${res.status}`);
        return body;
    }

    async function load() {
        const table = $('rev-table');
        const totals = $('rev-totals');
        if (!table) return;

        const month = ($('rev-month') && $('rev-month').value) || '';
        table.innerHTML = '<tbody><tr><td>Đang tính…</td></tr></tbody>';

        let r;
        try {
            r = await api(`/v1/admin/revenue${month ? `?month=${month}` : ''}`);
        } catch (err) {
            totals.innerHTML = '';
            table.innerHTML = `<tbody><tr><td>${esc(err.message)}</td></tr></tbody>`;
            return;
        }

        if ($('rev-month') && !$('rev-month').value) $('rev-month').value = r.month;

        const cards = [
            ['receipt-text', 'Đơn hoàn thành', r.totals.orders, ''],
            ['banknote', 'Tổng doanh thu', money(r.totals.gross), 'qua nền tảng'],
            ['percent', 'LOCALMATE hưởng', money(r.totals.commission), 'hoa hồng'],
            ['wallet', 'Cần chuyển đối tác', money(r.totals.payable), 'từ tiền cọc đã thu'],
        ];
        totals.innerHTML = cards.map(([icon, label, value, sub]) => `
            <div class="stat-card">
                <div class="stat-icon" style="background:var(--surface-2)"><i data-lucide="${icon}"></i></div>
                <div class="stat-label">${label}</div>
                <div class="stat-value">${value}</div>
                ${sub ? `<div class="stat-sub">${sub}</div>` : ''}
            </div>`).join('');

        if (!r.data.length) {
            table.innerHTML = `<tbody><tr><td style="padding:26px">Kỳ ${esc(r.month)} chưa có đơn nào hoàn thành.</td></tr></tbody>`;
            if (window.lucide) lucide.createIcons();
            return;
        }

        table.innerHTML = `
            <thead><tr>
                <th>Đối tác</th><th>Loại</th><th>Đơn</th>
                <th>Doanh thu</th><th>Hoa hồng</th><th>Đối tác nhận</th>
                <th>Cần chuyển</th><th>Trạng thái</th>
            </tr></thead>
            <tbody>
                ${r.data.map(x => `
                    <tr>
                        <td><b>${esc(x.partner_name)}</b></td>
                        <td>${esc({ transport: 'Nhà xe', hotel: 'Lưu trú', tour: 'Tour' }[x.partner_type] || x.partner_type)}
                            · ${Math.round(x.commission_rate * 100)}%</td>
                        <td>${x.orders}</td>
                        <td>${money(x.gross)}</td>
                        <td style="color:var(--terracotta)">−${money(x.commission)}</td>
                        <td><b>${money(x.net)}</b></td>
                        <td>${money(x.payable)}</td>
                        <td>${x.settled
                            ? `<span style="color:var(--moss);font-weight:600">Đã chuyển</span>`
                            : `<button class="btn btn-outline btn-sm"
                                 onclick="AdminRevenue.settle('${esc(x.partner_id)}','${esc(r.month)}',${x.net},'${esc(x.partner_name)}')">
                                 Đánh dấu đã chuyển</button>`}</td>
                    </tr>`).join('')}
            </tbody>`;
        if (window.lucide) lucide.createIcons();
    }

    async function settle(partnerId, month, amount, name) {
        // Đây là ghi nhận đã trả tiền thật — hỏi lại cho chắc
        if (!confirm(`Xác nhận đã chuyển ${money(amount)} cho ${name}, kỳ ${month}?`)) return;
        try {
            const r = await api('/v1/admin/revenue/settle', {
                method: 'POST',
                body: JSON.stringify({ partner_id: partnerId, month, amount }),
            });
            alert(r.message);
            load();
        } catch (err) {
            alert(err.message);
        }
    }

    // Chỉ tải khi người dùng mở đúng tab, khỏi gọi thừa lúc mở trang
    document.addEventListener('DOMContentLoaded', () => {
        document.querySelector('[data-tab="revenue"]')?.addEventListener('click', () => setTimeout(load, 100));
    });

    return { load, settle };
})();

window.AdminRevenue = AdminRevenue;
