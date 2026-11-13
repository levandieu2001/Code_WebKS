// ============================================================
// LOCALMATE — Hiểu về An Giang
// ============================================================
// Ba tab, ba câu hỏi của khách ngoài tỉnh. Dữ liệu lấy từ máy chủ nên web và
// app luôn nói cùng một điều.
// ============================================================

(() => {
    'use strict';

    const $ = (id) => document.getElementById(id);
    const esc = (s) => String(s == null ? '' : s)
        .replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

    // Màu theo mực nước — nhìn dải tháng là thấy ngay nhịp mùa của cả vùng
    const WATER_CLASS = {
        low: 'w-low', rising: 'w-rising', flood: 'w-flood', falling: 'w-falling',
    };

    const state = { seasons: null, peoples: null, clusters: null, tab: 'mua' };

    /**
     * Ngôn ngữ đang hiển thị trên trang.
     *
     * PHẢI gửi kèm ?lang=. Máy chủ mặc định đoán theo Accept-Language của trình
     * duyệt, mà cái đó là ngôn ngữ hệ điều hành chứ không phải nút VI/EN khách
     * vừa bấm — máy cài tiếng Anh mở trang tiếng Việt sẽ thấy nhãn tiếng Anh
     * lẫn vào giữa nội dung tiếng Việt.
     */
    const lang = () => (localStorage.getItem('baynui_lang') === 'en' ? 'en' : 'vi');

    async function lay(path) {
        const noi = path.includes('?') ? '&' : '?';
        const res = await fetch(path + noi + 'lang=' + lang());
        if (!res.ok) throw new Error('Không tải được dữ liệu.');
        return res.json();
    }

    // ── Tab 1: đi tháng nào ─────────────────────────────────
    function veMua(d) {
        const nay = d.now;
        const dai = d.data.map(m => `
            <button class="ag-month ${WATER_CLASS[m.water]}${m.month === nay ? ' now' : ''}"
                    data-month="${m.month}" aria-label="Tháng ${m.month}">
                <b>${m.month}</b>
                ${m.month === nay ? '<span class="ag-now-dot"></span>' : ''}
            </button>`).join('');

        const chuThich = [
            ['w-flood', 'Mùa nước nổi'],
            ['w-rising', 'Nước đang lên'],
            ['w-falling', 'Nước đang rút'],
            ['w-low', 'Nước cạn'],
        ].map(([c, t]) => `<span class="ag-key"><i class="${c}"></i>${t}</span>`).join('');

        return `
        <div class="ag-strip">
            <div class="ag-months">${dai}</div>
            <div class="ag-keys">${chuThich}</div>
        </div>
        <div id="ag-month-detail"></div>
        <div class="ag-best">
            <h3>Đi vì mục đích gì?</h3>
            ${d.best_for.map(b => `
                <div class="ag-best-row">
                    <b>Tháng ${b.months.join(', ')}</b>
                    <span>${esc(b.note)}</span>
                </div>`).join('')}
        </div>`;
    }

    function veChiTietThang(m) {
        const ds = (arr, cls) => arr.length
            ? `<ul class="${cls}">${arr.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '';

        $('ag-month-detail').innerHTML = `
        <article class="ag-card">
            <header>
                <span class="ag-badge ${WATER_CLASS[m.water]}">${esc(m.water_label)}</span>
                <h2>Tháng ${m.month}</h2>
            </header>
            <p class="ag-note">${esc(m.water_note)}</p>
            <p class="ag-weather"><i data-lucide="cloud-sun"></i> ${esc(m.weather)}</p>

            ${m.good.length ? `<h4>Nên làm gì</h4>${ds(m.good, 'ag-good')}` : ''}
            ${m.avoid.length ? `<h4>Lưu ý</h4>${ds(m.avoid, 'ag-avoid')}` : ''}
            ${m.food.length ? `<h4>Đang mùa</h4>${ds(m.food, 'ag-food')}` : ''}
            ${m.festivals.length ? `<h4>Lễ hội</h4>${m.festivals.map(f => `
                <div class="ag-fest">
                    <b>${esc(f.name)}</b>
                    <span>${esc(f.when)}</span>
                    ${f.crowd ? `<em>${esc(f.crowd)}</em>` : ''}
                </div>`).join('')}` : ''}
        </article>`;
        if (window.lucide) lucide.createIcons();
    }

    async function chonThang(n) {
        document.querySelectorAll('.ag-month').forEach(b =>
            b.classList.toggle('active', Number(b.dataset.month) === Number(n)));
        const { data } = await lay('/v1/seasons?month=' + n);
        veChiTietThang(data);
    }

    // ── Tab 2: bốn dân tộc ──────────────────────────────────
    function veDanToc(d) {
        return d.data.map(p => `
        <article class="ag-card ag-people">
            <img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy">
            <div class="ag-people-body">
                <h2>${esc(p.name)}</h2>
                <p class="ag-where"><i data-lucide="map-pin"></i> ${esc(p.where)}</p>
                <p>${esc(p.summary)}</p>

                <h4>Xem gì</h4>
                <ul>${p.see.map(x => `<li>${esc(x)}</li>`).join('')}</ul>

                <h4>Ăn gì</h4>
                <p class="ag-tags">${p.food.map(x => `<span>${esc(x)}</span>`).join('')}</p>

                <h4>Lễ hội</h4>
                <ul>${p.festivals.map(x => `<li>${esc(x)}</li>`).join('')}</ul>

                <div class="ag-etiquette">
                    <div class="ag-do">
                        <h5>Nên</h5>
                        <ul>${p.etiquette.do.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
                    </div>
                    <div class="ag-dont">
                        <h5>Không nên</h5>
                        <ul>${p.etiquette.dont.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
                    </div>
                </div>
            </div>
        </article>`).join('');
    }

    // ── Tab 3: cụm điểm ─────────────────────────────────────
    function veCum(d) {
        return d.data.map(c => `
        <article class="ag-card">
            <header>
                <span class="ag-badge">Ngày ${c.day}</span>
                <h2>${esc(c.title)}</h2>
            </header>
            <p class="ag-note">${esc(c.note)}</p>

            <ol class="ag-route">
                ${c.places.map((p, i) => `
                    <li>
                        <a href="diadiem.html?slug=${encodeURIComponent(p.slug)}">${esc(p.name)}</a>
                        ${p.duration ? `<span class="ag-dur">${esc(p.duration)}</span>` : ''}
                        ${c.legs[i] ? `<div class="ag-leg">↓ ${esc(c.legs[i].label)}</div>` : ''}
                    </li>`).join('')}
            </ol>
        </article>`).join('');
    }

    // ── Chuyển tab ──────────────────────────────────────────
    async function moTab(tab) {
        state.tab = tab;
        document.querySelectorAll('.ag-tab').forEach(b =>
            b.classList.toggle('active', b.dataset.tab === tab));
        const host = $('ag-body');
        host.innerHTML = '<p class="ag-loading">Đang tải…</p>';

        try {
            if (tab === 'mua') {
                state.seasons = state.seasons || await lay('/v1/seasons');
                host.innerHTML = veMua(state.seasons);
                await chonThang(state.seasons.now);
            } else if (tab === 'dantoc') {
                state.peoples = state.peoples || await lay('/v1/peoples');
                host.innerHTML = veDanToc(state.peoples);
            } else {
                state.clusters = state.clusters || await lay('/v1/clusters');
                host.innerHTML = veCum(state.clusters);
            }
            if (window.lucide) lucide.createIcons();
        } catch (err) {
            host.innerHTML = `<p class="ag-loading">${esc(err.message)}</p>`;
        }
    }

    document.addEventListener('click', (e) => {
        const tab = e.target.closest('.ag-tab');
        if (tab) { moTab(tab.dataset.tab); return; }
        const thang = e.target.closest('.ag-month');
        if (thang) chonThang(thang.dataset.month);
    });

    document.addEventListener('DOMContentLoaded', () => moTab('mua'));

    // Bấm đổi ngôn ngữ thì bỏ dữ liệu đã tải và lấy lại bản đúng thứ tiếng.
    window.addEventListener('storage', (e) => {
        if (e.key === 'baynui_lang') {
            state.seasons = state.peoples = state.clusters = null;
            moTab(state.tab);
        }
    });
    document.addEventListener('click', (e) => {
        if (e.target.closest('.lang-toggle-btn')) {
            setTimeout(() => {
                state.seasons = state.peoples = state.clusters = null;
                moTab(state.tab);
            }, 60);
        }
    });
})();
