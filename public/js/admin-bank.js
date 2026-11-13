// ============================================================
// LOCALMATE — Đối chiếu sao kê ngân hàng
// ============================================================
// Dán sao kê vào, máy tìm mã đơn trong nội dung chuyển khoản rồi ghép với đơn
// đang chờ thu cọc.
//
// Bốn nhóm hiện riêng, KHÔNG gộp thành "khớp / không khớp": mỗi nhóm là một
// việc khác nhau phải làm. Nhóm nguy hiểm nhất là nhóm cuối — đơn khách đã
// bấm "tôi chuyển rồi" mà sao kê không có dòng nào. Đó là những đơn đang giữ
// phòng bằng một lời hứa, và trước đây không có cách nào phát hiện.
// ============================================================

(() => {
    'use strict';

    const $ = (id) => document.getElementById(id);
    const tien = (n) => Number(n || 0).toLocaleString('vi-VN') + 'đ';
    const bo = (s) => String(s == null ? '' : s)
        .replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

    let ketQua = null;

    async function chay() {
        const vanBan = ($('bank-input').value || '').trim();
        const bao = $('bank-msg');
        if (vanBan.length < 10) {
            bao.textContent = 'Bạn dán sao kê vào ô trên nhé.';
            bao.style.color = '#c0392b';
            return;
        }

        bao.textContent = 'Đang đối chiếu…';
        bao.style.color = 'var(--muted)';
        try {
            const r = await adminApi('/v1/admin/reconcile', {
                method: 'POST',
                body: JSON.stringify({ statement: vanBan }),
            });
            ketQua = r;
            bao.textContent = `Đọc được ${r.meta.lines_read} giao dịch tiền vào`
                + (r.meta.lines_skipped ? ` · bỏ qua ${r.meta.lines_skipped} dòng (tiêu đề hoặc tiền ra)` : '');
            bao.style.color = 'var(--muted)';
            ve();
        } catch (err) {
            bao.textContent = err.message;
            bao.style.color = '#c0392b';
            $('bank-result').innerHTML = '';
        }
    }

    function bang(cot, hang) {
        return '<div class="content-card"><div class="table-wrap"><table class="data-table">'
            + '<thead><tr>' + cot.map(c => `<th>${c}</th>`).join('') + '</tr></thead>'
            + '<tbody>' + hang + '</tbody></table></div></div>';
    }

    function ve() {
        const k = ketQua.data;
        const o = [];

        // ── 1. Khớp ──
        o.push('<div class="bank-group"><h3>Khớp sạch '
            + `<span class="bank-pill ok">${k.khop.length}</span></h3>`
            + '<p class="why">Mã đơn đúng, số tiền đủ. Chọn rồi bấm xác nhận — '
            + 'khách sẽ nhận thông báo đã nhận cọc.</p></div>');

        if (k.khop.length) {
            o.push(bang(
                ['<input type="checkbox" id="bank-all" onchange="AdminBank.chonHet(this)">',
                 'Ngày', 'Mã đơn', 'Khách', 'Nội dung', 'Sao kê', 'Cần thu'],
                k.khop.map(x => `<tr>
                    <td><input type="checkbox" class="bank-tick" value="${bo(x.booking_id)}" checked></td>
                    <td>${bo(x.date || '—')}</td>
                    <td><b>${bo(x.code)}</b></td>
                    <td>${bo(x.guest)}<div class="cell-sub">${bo(x.phone)}</div></td>
                    <td class="cell-sub">${bo(x.content)}</td>
                    <td><b>${tien(x.amount)}</b></td>
                    <td>${tien(x.deposit_expected)}</td>
                </tr>`).join(''),
            ));
            o.push('<div style="margin-top:12px">'
                + '<button class="btn btn-green" onclick="AdminBank.xacNhan()">'
                + '<i data-lucide="check"></i> Xác nhận đã nhận cọc cho các đơn đã chọn</button>'
                + '<span id="bank-confirm-msg" style="margin-left:14px;font-size:13.5px"></span></div>');
        } else {
            o.push('<div class="bank-note">Không có giao dịch nào khớp sạch.</div>');
        }

        // ── 2. Lệch tiền ──
        o.push('<div class="bank-group"><h3>Lệch số tiền '
            + `<span class="bank-pill warn">${k.lech_tien.length}</span></h3>`
            + '<p class="why">Đúng mã đơn nhưng tiền về không đủ. Có thể khách chuyển thiếu, '
            + 'hoặc ngân hàng trừ phí. Gọi hỏi khách trước khi xác nhận — '
            + 'ở đây cố ý <b>không có nút xác nhận nhanh</b>.</p></div>');
        o.push(k.lech_tien.length
            ? bang(['Mã đơn', 'Khách', 'Sao kê', 'Cần thu', 'Thiếu'],
                k.lech_tien.map(x => `<tr>
                    <td><b>${bo(x.code)}</b></td>
                    <td>${bo(x.guest)}<div class="cell-sub">${bo(x.phone)}</div></td>
                    <td>${tien(x.amount)}</td>
                    <td>${tien(x.deposit_expected)}</td>
                    <td>${x.thieu == null
                        ? `<span class="cell-sub">${bo(x.ghi_chu || '')}</span>`
                        : `<b style="color:#c0392b">−${tien(x.thieu)}</b>`}</td>
                </tr>`).join(''))
            : '<div class="bank-note">Không có giao dịch nào lệch tiền.</div>');

        // ── 3. Không rõ ──
        o.push('<div class="bank-group"><h3>Không tìm ra đơn '
            + `<span class="bank-pill grey">${k.khong_ro.length}</span></h3>`
            + '<p class="why">Tiền có vào nhưng nội dung chuyển khoản không có mã đơn nào '
            + 'đọc được. Thường là khách tự gõ nội dung, hoặc là khoản không liên quan '
            + 'tới đặt phòng.</p></div>');
        o.push(k.khong_ro.length
            ? bang(['Ngày', 'Số tiền', 'Nội dung'],
                k.khong_ro.map(x => `<tr>
                    <td>${bo(x.date || '—')}</td>
                    <td>${tien(x.amount)}</td>
                    <td class="cell-sub">${bo(x.content)}</td>
                </tr>`).join(''))
            : '<div class="bank-note">Mọi giao dịch đều tìm ra đơn.</div>');

        // ── 4. Nhóm nguy hiểm ──
        o.push('<div class="bank-group"><h3>Khách báo đã chuyển mà sao kê không có '
            + `<span class="bank-pill bad">${k.thieu_tien.length}</span></h3>`
            + '<p class="why">Đây là nhóm đáng lo nhất: những đơn đang giữ phòng bằng một '
            + 'lời hứa. Có thể khách chuyển nhầm tài khoản, chuyển hụt, hoặc chưa chuyển. '
            + 'Nên gọi hỏi trước khi tới ngày nhận phòng.</p></div>');
        o.push(k.thieu_tien.length
            ? bang(['Mã đơn', 'Khách', 'Nội dung đơn', 'Cần thu', 'Báo lúc'],
                k.thieu_tien.map(x => `<tr>
                    <td><b>${bo(x.code)}</b></td>
                    <td>${bo(x.guest)}<div class="cell-sub"><a href="tel:${bo(x.phone)}">${bo(x.phone)}</a></div></td>
                    <td class="cell-sub">${bo(x.summary)}</td>
                    <td>${tien(x.deposit_expected)}</td>
                    <td class="cell-sub">${bo(String(x.claimed_at || '').slice(0, 10) || '—')}</td>
                </tr>`).join(''))
            : '<div class="bank-note">Không có đơn nào báo đã chuyển mà thiếu tiền.</div>');

        $('bank-result').innerHTML = o.join('');
        if (window.lucide) lucide.createIcons();
    }

    function chonHet(el) {
        document.querySelectorAll('.bank-tick').forEach(t => { t.checked = el.checked; });
    }

    async function xacNhan() {
        const ids = [...document.querySelectorAll('.bank-tick')]
            .filter(t => t.checked).map(t => t.value);
        const bao = $('bank-confirm-msg');
        if (!ids.length) {
            bao.textContent = 'Chưa chọn đơn nào.';
            bao.style.color = '#c0392b';
            return;
        }
        if (!confirm(`Xác nhận đã nhận cọc cho ${ids.length} đơn?\n\n`
            + 'Mỗi đơn sẽ được đánh dấu đã thu tiền và khách nhận được thông báo.')) return;

        bao.textContent = 'Đang ghi…';
        bao.style.color = 'var(--muted)';
        try {
            const r = await adminApi('/v1/admin/reconcile/confirm', {
                method: 'POST',
                body: JSON.stringify({ booking_ids: ids }),
            });
            bao.textContent = r.message;
            bao.style.color = '#128a3e';
            // Đối chiếu lại để bảng phản ánh đúng tình trạng vừa ghi
            setTimeout(chay, 1200);
        } catch (err) {
            bao.textContent = err.message;
            bao.style.color = '#c0392b';
        }
    }

    window.AdminBank = { chay, chonHet, xacNhan };
    window.runReconcile = chay;
})();
