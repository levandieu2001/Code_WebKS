// ============================================================
// LOCALMATE — Đánh giá của khách
// ============================================================
// Máy chủ đã giữ đánh giá từ lâu (khách đánh giá sau khi đi xong, qua trang
// Đơn của tôi) nhưng chưa nơi nào ĐỌC ra. Khách mới vào chỉ thấy lời tự giới
// thiệu của chính chủ — mà người ngoài tỉnh quyết định dựa vào người đã đi
// trước nhiều hơn.
//
// Khối này gắn được vào bất cứ trang nào: trang điểm đến, thẻ phòng nghỉ.
// Chỉ ĐỌC, không cho viết ở đây — viết đánh giá phải đi từ đơn đã hoàn thành,
// nếu không thì ai cũng vào chấm sao được và con số mất hết ý nghĩa.
// ============================================================

const BayNuiReviews = (() => {
    const esc = (s) => String(s == null ? '' : s)
        .replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

    const EN = () => localStorage.getItem('baynui_lang') === 'en';
    const T = (vi, en) => (EN() ? en : vi);

    const dmy = (iso) => {
        const [y, m, d] = String(iso || '').slice(0, 10).split('-');
        return d ? `${d}/${m}/${y}` : '';
    };

    /**
     * Vẽ n sao đầy trên tổng 5.
     *
     * Sao rỗng dùng ký tự ☆ chứ không phải ★ tô nhạt: phân biệt bằng MỖI màu
     * thì người mù màu, hoặc ai đọc trên màn hình ngoài nắng, đếm ra 5 sao
     * cho một đánh giá 4 sao.
     */
    const sao = (n) => {
        const day = Math.round(Number(n) || 0);
        return `<span class="rv-stars" aria-label="${day}/5">${
            '★'.repeat(day)}<span class="rv-dim">${'☆'.repeat(5 - day)}</span></span>`;
    };

    async function tai(type, id) {
        const res = await fetch(`/v1/reviews?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}`);
        if (!res.ok) throw new Error('Không tải được đánh giá.');
        return res.json();
    }

    /**
     * Gắn khối đánh giá vào một phần tử.
     *
     * Chưa có đánh giá nào thì KHÔNG vẽ gì cả. Hiện "0 đánh giá" trên một
     * điểm đến mới mở chỉ làm khách nghi ngờ, trong khi thật ra chỉ là chưa
     * ai kịp đi.
     */
    async function gan(el, type, id, tuaDe) {
        if (!el) return;
        let data;
        try {
            data = await tai(type, id);
        } catch (_) {
            return;                       // lỗi mạng thì im lặng, đừng phá trang
        }

        const s = data.summary || {};
        if (!s.count) { el.innerHTML = ''; return; }

        const rows = (data.data || []).slice(0, 6);
        el.innerHTML = `
        <div class="rv-box">
            <div class="rv-head">
                <div class="rv-avg">
                    <b>${String(s.average).replace('.', ',')}</b>
                    ${sao(s.average)}
                    <small>${s.count} ${T('đánh giá', s.count > 1 ? 'reviews' : 'review')}</small>
                </div>
                ${tuaDe ? `<h3 class="rv-title">${esc(tuaDe)}</h3>` : ''}
            </div>
            <div class="rv-list">
                ${rows.map(r => `
                    <div class="rv-item">
                        <div class="rv-top">
                            <b>${esc(r.guest_name || T('Khách', 'Guest'))}</b>
                            ${sao(r.rating)}
                            <span class="rv-date">${dmy(r.created_at)}</span>
                        </div>
                        ${r.comment ? `<p class="rv-text">${esc(r.comment)}</p>` : ''}
                        ${r.reply ? `
                            <div class="rv-reply">
                                <b>${T('LOCALMATE phản hồi', 'LOCALMATE replied')}:</b> ${esc(r.reply)}
                            </div>` : ''}
                    </div>`).join('')}
            </div>
            <p class="rv-note">${T(
                'Chỉ khách đã đi mới đánh giá được, và đánh giá gắn với đơn thật.',
                'Only guests who actually travelled can review, and each review is tied to a real booking.',
            )}</p>
        </div>`;
    }

    /** Lấy gọn điểm trung bình để gắn vào thẻ danh sách. */
    async function tomTat(type, id) {
        try {
            const d = await tai(type, id);
            return d.summary && d.summary.count ? d.summary : null;
        } catch (_) { return null; }
    }

    return { gan, tomTat, sao };
})();

window.BayNuiReviews = BayNuiReviews;
