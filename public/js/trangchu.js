// ============================================================
// LOCALMATE — trang chủ
// ============================================================
// Mọi thứ trên trang này đọc từ máy chủ, không có danh sách nào viết cứng.
// Đối tác được duyệt là hiện lên ngay, khỏi ai phải sửa mã nguồn — đó chính
// là điểm khác giữa một trang giới thiệu và một nền tảng kết nối.
// ============================================================

(() => {
    'use strict';

    const $ = (id) => document.getElementById(id);
    const esc = (s) => String(s == null ? '' : s)
        .replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const tien = (n) => Number(n || 0).toLocaleString('vi-VN') + 'đ';
    // Câu ngắn nằm trong mã: T('tiếng Việt', 'English')
    const T = (vi, en) => (window.LMLang ? LMLang.T(vi, en) : vi);
    const laEn = () => (window.LMLang ? LMLang.hienTai() === 'en' : false);
    const DIEM_GOI_Y = [
        'Núi Sam, Châu Đốc', 'Châu Đốc, An Giang', 'Long Xuyên, An Giang',
        'Núi Cấm, Tịnh Biên', 'Tịnh Biên, An Giang', 'Tri Tôn, An Giang',
        'Rừng tràm Trà Sư', 'Hồ Tà Pạ', 'Hà Tiên, Kiên Giang',
        'Rạch Giá, Kiên Giang', 'Cần Thơ', 'Sân bay Cần Thơ',
    ];
    let GOI_Y_MON = [];
    let GOI_Y_KHU_VUC = [];
    /** "2" + "day" -> "2 days"; "1" + "night" -> "1 night". */
    const so = (n, tu) => n + ' ' + tu + (Number(n) > 1 ? 's' : '');

    /**
     * Đổi mấy nhãn viết theo công thức sang tiếng Anh: "2–8 khách",
     * "2 ngày 1 đêm", "Nửa ngày".
     *
     * CHỈ đụng vào những mẫu chắc chắn như trên. Tên tour, mô tả, điểm dừng
     * thì để nguyên tiếng Việt — đó là chữ do đối tác tự viết, tự dịch hộ họ
     * là bịa. Khách nước ngoài đọc "Chùa Tà Pạ" vẫn hơn là đọc một cái tên
     * tiếng Anh không tồn tại trên bản đồ nào.
     */
    function nhan(chu) {
        if (!laEn() || !chu) return chu;
        return String(chu)
            .replace(/(\d+)\s*ngày\s*(\d+)\s*đêm/gi,
                (m, d, n) => so(d, 'day') + ' ' + so(n, 'night'))
            .replace(/(\d+)\s*ngày/gi, (m, n) => so(n, 'day'))
            .replace(/(\d+)\s*đêm/gi, (m, n) => so(n, 'night'))
            .replace(/(\d+)\s*tiếng/gi, '$1 hours')
            .replace(/nửa ngày/gi, 'half a day')
            .replace(/khách/gi, 'guests');
    }

    // ── Bốn tab tìm kiếm ────────────────────────────────────
    // Mỗi tab hỏi đúng thứ cần cho dịch vụ đó rồi đưa thẳng sang trang tương
    // ứng. Không gom chung một ô "bạn muốn đi đâu" cho cả bốn: đặt xe cần điểm
    // đón, đặt đặc sản thì chẳng cần ngày nào cả.
    // Dựng lại mỗi lần gọi, KHÔNG để sẵn một đối tượng cố định: chữ trong này
    // phụ thuộc ngôn ngữ đang chọn, mà đối tượng cố định thì chốt luôn tiếng
    // Việt ngay lúc nạp trang — bấm EN xong ô tìm kiếm vẫn tiếng Việt.
    const layTab = () => ({
        stay: {
            fields: [
                { id: 'q', icon: 'map-pin', placeholder: T('Bạn muốn nghỉ ở đâu? (Núi Cấm, Châu Đốc…)', 'Where do you want to stay? (Núi Cấm, Châu Đốc…)') },
                { id: 'in', icon: 'calendar', type: 'date' },
                { id: 'out', icon: 'calendar-check', type: 'date' },
            ],
            nut: T('Tìm chỗ nghỉ', 'Find a stay'),
            di: (v) => `phongnghi.html?q=${encodeURIComponent(v.q || '')}`
                + `&checkIn=${v.in || ''}&checkOut=${v.out || ''}`,
        },
        ride: {
            fields: [
                { id: 'from', icon: 'circle-dot', label: T('Điểm đón', 'Pick-up point'),
                    placeholder: T('Nhập hoặc chọn điểm đón…', 'Enter or choose a pick-up point…'), suggestions: DIEM_GOI_Y },
                { id: 'to', icon: 'flag', label: T('Điểm đến', 'Drop-off point'),
                    placeholder: T('Nhập hoặc chọn điểm đến…', 'Enter or choose a destination…'), suggestions: DIEM_GOI_Y },
                { id: 'day', icon: 'calendar', label: T('Ngày đi', 'Travel date'), type: 'date' },
            ],
            nut: T('Tìm xe', 'Find a ride'),
        },
        tour: {
            fields: [
                { id: 'q', icon: 'map', placeholder: T('Tour ở đâu? (Trà Sư, Cà Mau…)', 'Tour where? (Trà Sư, Cà Mau…)') },
                { id: 'day', icon: 'calendar', type: 'date' },
                { id: 'pax', icon: 'users', placeholder: T('Mấy người?', 'How many people?'), type: 'number' },
            ],
            nut: T('Tìm tour', 'Find a tour'),
            di: (v) => `khampha.html?q=${encodeURIComponent(v.q || '')}`,
        },
        food: {
            fields: [
                { id: 'q', icon: 'utensils', placeholder: T('Món gì? (mật ong U Minh, khô cá…)', 'What are you after? (U Minh honey, dried fish…)'), suggestions: GOI_Y_MON },
                { id: 'area', icon: 'map-pin', placeholder: T('Ở tỉnh nào?', 'Which province?'), suggestions: GOI_Y_KHU_VUC },
            ],
            nut: T('Tìm đặc sản', 'Find local food'),
            di: (v) => `dacsan.html?q=${encodeURIComponent(v.q || '')}`
                + `&area=${encodeURIComponent(v.area || '')}`,
        },
    });

    let tabDang = 'stay';

    const khongDau = (value) => String(value || '').toLowerCase().normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');

    function hienGoiY(id) {
        const input = $('lmf-' + id);
        const menu = $('lm-auto-' + id);
        if (!input || !menu) return;
        const field = layTab()[tabDang].fields.find(f => f.id === id);
        const typed = khongDau(input.value.trim());
        const values = (field?.suggestions || []).filter(x => !typed || khongDau(x).includes(typed)).slice(0, 6);
        menu.innerHTML = values.map(x => '<button type="button" class="lm-auto-option" data-value="'
            + esc(x) + '"><i data-lucide="' + field.icon + '"></i>' + esc(x) + '</button>').join('');
        menu.hidden = !values.length;
        input.setAttribute('aria-expanded', values.length ? 'true' : 'false');
        menu.querySelectorAll('.lm-auto-option').forEach((button) => {
            button.addEventListener('mousedown', e => e.preventDefault());
            button.addEventListener('click', () => {
                input.value = button.dataset.value || '';
                menu.hidden = true;
                input.setAttribute('aria-expanded', 'false');
            });
        });
        if (window.lucide) lucide.createIcons();
    }

    function veFields() {
        const t = layTab()[tabDang];
        $('lm-fields').innerHTML = t.fields.map(f => `
            <label class="lm-field">
                <i data-lucide="${f.icon}" aria-hidden="true"></i>
                <input id="lmf-${f.id}" type="${f.type || 'text'}"
                       name="${esc(f.id)}" aria-label="${esc(f.label || f.placeholder || '')}"
                       autocomplete="off" ${f.suggestions ? `list="lm-list-${f.id}" aria-autocomplete="list" aria-controls="lm-auto-${f.id}"` : ''}
                       placeholder="${esc(f.placeholder || '')}">
                ${f.suggestions ? `<datalist id="lm-list-${f.id}">${f.suggestions.map(x => `<option value="${esc(x)}"></option>`).join('')}</datalist><div class="lm-auto-menu" id="lm-auto-${f.id}" hidden></div>` : ''}
            </label>`).join('')
            + `<button type="button" class="lm-btn lm-btn-cta" id="lm-go">
                   <i data-lucide="search" aria-hidden="true"></i>${esc(t.nut)}</button>`;
        if (window.lucide) lucide.createIcons();

        t.fields.filter(f => f.suggestions).forEach((f) => {
            const input = $(`lmf-${f.id}`);
            input.addEventListener('focus', () => hienGoiY(f.id));
            input.addEventListener('input', () => hienGoiY(f.id));
            input.addEventListener('blur', () => setTimeout(() => {
                const menu = $(`lm-auto-${f.id}`);
                if (menu) menu.hidden = true;
                input.setAttribute('aria-expanded', 'false');
            }, 120));
        });

        $('lm-go').onclick = () => {
            const v = {};
            t.fields.forEach(f => { v[f.id] = ($(`lmf-${f.id}`) || {}).value || ''; });
            if (tabDang === 'stay' && v.in && v.out && v.out <= v.in) {
                const end = $('lmf-out');
                end.setCustomValidity(T('Ngày trả phòng phải sau ngày nhận phòng.', 'Check-out must be after check-in.'));
                end.reportValidity();
                end.addEventListener('input', () => end.setCustomValidity(''), { once: true });
                return;
            }
            if (tabDang === 'ride') {
                if (!v.from.trim() || !v.to.trim()) {
                    const missing = !v.from.trim() ? $('lmf-from') : $('lmf-to');
                    missing.setCustomValidity(T('Bạn chọn hoặc nhập địa điểm này nhé.', 'Enter or choose this location.'));
                    missing.reportValidity();
                    missing.addEventListener('input', () => missing.setCustomValidity(''), { once: true });
                    return;
                }
                if (window.BayNuiBooking) {
                    BayNuiBooking.openTransport({ pickup: v.from, dropoff: v.to, date: v.day });
                    return;
                }
            }
            location.href = t.di(v);
        };
    }

    // Đổi ngôn ngữ thì vẽ lại: chữ trong thẻ do JS dựng nên không có
    // data-i18n để tự đổi theo.
    document.addEventListener('lmlang', () => {
        veFields();
        napChoNghi(); napDacSan(); napTour();
    });

    document.addEventListener('click', (e) => {
        const tab = e.target.closest('.lm-tab');
        if (!tab) return;
        document.querySelectorAll('.lm-tab').forEach(b => b.classList.remove('active'));
        tab.classList.add('active');
        tabDang = tab.getAttribute('data-tab');
        veFields();
    });

    // ── Các mục đọc từ máy chủ ──────────────────────────────
    const trong = (el, chu) => { el.innerHTML = `<div class="lm-empty">${esc(chu)}</div>`; };

    async function napChoNghi() {
        const host = $('lm-stays');
        try {
            const r = await (await fetch('/v1/stays/search?q=')).json();
            const rows = (r.data || []).slice(0, 4);
            if (!rows.length) {
                return trong(host, T('Chưa có chỗ nghỉ nào. Bạn là chủ homestay? Bấm "Đăng chỗ của bạn" ở trên.', 'No stays listed yet. Run a homestay? Use "List your place" above.'));
            }
            host.innerHTML = rows.map(s => `
                <a class="lm-card" href="chonghi.html?id=${encodeURIComponent(s.id)}">
                    <span class="lm-card-img">
                        <img src="${esc(s.image || 'assets/homestay.jpg')}" alt="${esc(s.name)}" loading="lazy">
                        ${s.source === 'partner' ? '<span class="lm-tag blue">Đối tác</span>' : ''}
                    </span>
                    <span class="lm-card-body">
                        <h3>${esc(s.name)}</h3>
                        ${s.partner_name ? `<p class="lm-provider"><i data-lucide="house"></i>${T('Chủ nhà:', 'Host:')} <b>${esc(s.partner_name)}</b></p>` : ''}
                        <p class="lm-card-desc">${esc(s.area || '')}</p>
                        <span class="lm-meta">
                            <span><i data-lucide="users"></i>${s.capacity || 2} ${T('khách', 'guests')}</span>
                            <span><i data-lucide="star"></i>${s.rating || '4.5'}</span>
                        </span>
                        <span class="lm-card-foot">
                            <span class="lm-price">${tien(s.price)}<small>/${T('đêm', 'night')}</small></span>
                            <span class="lm-btn lm-btn-primary">${T('Xem phòng', 'View room')}</span>
                        </span>
                    </span>
                </a>`).join('');
        } catch (_) {
            trong(host, 'Chưa tải được chỗ nghỉ, bạn thử lại sau nhé.');
        }
        if (window.lucide) lucide.createIcons();
    }

    async function napDacSan() {
        const host = $('lm-foods');
        try {
            const r = await (await fetch('/v1/specialties')).json();
            const all = r.data || [];
            const duyNhat = (values) => [...new Map(values.map(x => [String(x || '').trim()
                .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd'), String(x || '').trim()]))
                .values()].filter(Boolean);
            GOI_Y_MON = duyNhat(all.map(f => f.name));
            GOI_Y_KHU_VUC = duyNhat(all.flatMap(f => String(f.area || '').split(',').map(x => x.trim())));
            // Nếu khách đang mở tab Đặc sản thì cập nhật datalist ngay, không
            // dựng lại cả form làm mất chữ họ vừa gõ.
            if (tabDang === 'food') {
                const q = $('lm-list-q');
                const area = $('lm-list-area');
                if (q) q.innerHTML = GOI_Y_MON.map(x => `<option value="${esc(x)}"></option>`).join('');
                if (area) area.innerHTML = GOI_Y_KHU_VUC.map(x => `<option value="${esc(x)}"></option>`).join('');
            }
            const rows = all.slice(0, 4);
            if (!rows.length) {
                // Nói rõ đây là mục mới và mời cơ sở đăng, thay vì để một ô
                // trống không ai hiểu là hỏng hay là chưa có.
                return trong(host, 'Mục đặc sản vừa mở. Cơ sở sản xuất, nhà vườn, quán ăn '
                    + 'đăng ký ở mục Đối tác là bán được ngay tại đây.');
            }
            host.innerHTML = rows.map(f => `
                <a class="lm-card" href="dacsan.html#${esc(f.id)}">
                    <span class="lm-card-img">
                        <img src="${esc(f.image)}" alt="${esc(f.name)}" loading="lazy">
                        ${f.soldOut ? '<span class="lm-tag grey">Tạm hết hàng</span>'
                                    : '<span class="lm-tag green">Đặt được</span>'}
                    </span>
                    <span class="lm-card-body">
                        <h3>${esc(f.name)}</h3>
                        ${f.shop ? `<p class="lm-provider"><i data-lucide="store"></i>${T('Cơ sở:', 'Shop:')} <b>${esc(f.shop)}</b></p>` : ''}
                        <p class="lm-card-desc">${esc(f.area || '')}</p>
                        ${f.shipping ? `<span class="lm-meta"><span><i data-lucide="truck"></i>${esc(f.shipping)}</span></span>` : ''}
                        <span class="lm-card-foot">
                            <span class="lm-price">${tien(f.price)}<small>/${esc(f.unit || 'phần')}</small></span>
                            <span class="lm-btn lm-btn-primary">Xem</span>
                        </span>
                    </span>
                </a>`).join('');
        } catch (_) {
            trong(host, 'Chưa tải được đặc sản, bạn thử lại sau nhé.');
        }
        if (window.lucide) lucide.createIcons();
    }

    async function napTour() {
        const host = $('lm-tours');
        try {
            const r = await (await fetch('/v1/tours')).json();
            const rows = (r.data || []).slice(0, 4);
            if (!rows.length) return trong(host, T('Chưa có tour nào.', 'No tours listed yet.'));
            host.innerHTML = rows.map(t => `
                <a class="lm-card" href="tour.html?slug=${encodeURIComponent(t.slug)}">
                    <span class="lm-card-img">
                        <img src="${esc(t.image)}" alt="${esc(t.name)}" loading="lazy">
                        <span class="lm-tag">${esc(nhan(laEn() && t.duration_en ? t.duration_en : t.duration) || '')}</span>
                    </span>
                    <span class="lm-card-body">
                        <h3>${esc(laEn() && t.name_en ? t.name_en : t.name)}</h3>
                        ${t.partner_name ? `<p class="lm-provider"><i data-lucide="building-2"></i>${T('Đơn vị:', 'Operator:')} <b>${esc(t.partner_name)}</b></p>` : ''}
                        <p class="lm-card-desc">${esc(t.stops || '')}</p>
                        <span class="lm-meta">
                            <span><i data-lucide="users"></i>${esc(nhan(t.pax) || '')}</span>
                            <span><i data-lucide="star"></i>${t.rating || '4.5'}</span>
                        </span>
                        <span class="lm-card-foot">
                            <span class="lm-price">${tien(t.price)}<small>/${T('khách', 'guest')}</small></span>
                            <span class="lm-btn lm-btn-primary">${T('Xem tour', 'View tour')}</span>
                        </span>
                    </span>
                </a>`).join('');
        } catch (_) {
            trong(host, T('Chưa tải được tour.', 'Could not load tours.'));
        }
        if (window.lucide) lucide.createIcons();
    }

    async function napDiemDen() {
        const host = $('lm-dests');
        try {
            const r = await (await fetch('/v1/places')).json();
            const rows = (r.data || []).slice(0, 12);
            if (!rows.length) return trong(host, T('Chưa có điểm đến nào.', 'No destinations yet.'));
            host.innerHTML = rows.map(p => `
                <a class="lm-dest" href="diadiem.html?slug=${encodeURIComponent(p.slug)}">
                    <img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy">
                    <span class="lm-dest-text">
                        <b>${esc(p.name)}</b>
                        <span>${esc(String(p.area || '').split(',').pop().trim())}</span>
                    </span>
                </a>`).join('');
        } catch (_) {
            trong(host, 'Chưa tải được điểm đến.');
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        veFields();
        napChoNghi();
        napDacSan();
        napTour();
        napDiemDen();
    });
})();
