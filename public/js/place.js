// ============================================================
// LOCALMATE — Trang chi tiết điểm đến
// ============================================================
// Gọi MỘT lần GET /v1/places/:slug rồi dựng đủ chuỗi:
//   thông tin → ăn gì → ở đâu (đặt phòng) → tour (đặt tour) → đặt xe tới đây
// ============================================================

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const money = (n) => Number(n || 0).toLocaleString('vi-VN') + 'đ';

let PLACE_DATA = null;

function slugFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('slug') || 'nui-cam';
}

async function loadPlace() {
    const root = document.getElementById('place-root');
    const slug = slugFromUrl();

    try {
        const res = await fetch(`/v1/places/${encodeURIComponent(slug)}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error?.message || 'Không tải được điểm đến.');
        PLACE_DATA = json;
        root.innerHTML = render(json);
        document.title = `${json.place.name} | LOCALMATE`;
        // Đánh giá tải sau, không chặn phần chính của trang: điểm đến mới mở
        // thường chưa có đánh giá nào, không đáng để khách chờ.
        if (window.BayNuiReviews) {
            BayNuiReviews.gan(
                document.getElementById('danh-gia'),
                'place', json.place.slug,
                'Khách đã tới nói gì',
            );
        }
        if (window.lucide) lucide.createIcons();
        if (typeof window.observeReveals === 'function') window.observeReveals();
    } catch (err) {
        root.innerHTML = `
            <section class="section-container" style="padding-top:140px;text-align:center">
                <h1 class="section-title">Không mở được điểm đến</h1>
                <p class="section-desc" style="margin-left:auto;margin-right:auto">${esc(err.message)}</p>
                <div class="section-cta"><a href="khampha.html" class="btn-primary">Về trang Khám phá</a></div>
            </section>`;
    }
}

function render(data) {
    const p = data.place;
    return `
        ${heroSection(p)}
        ${infoSection(p, data.tours)}
        ${data.foods.length ? foodSection(data.foods, p) : ''}
        ${data.stays.length ? staySection(data.stays, p) : ''}
        ${data.tours.length ? tourSection(data.tours) : ''}
        ${transportSection(data.transport)}
        <section class="section-container" id="danh-gia"></section>
        ${data.nearby.length ? nearbySection(data.nearby) : ''}
    `;
}

// ── Hero ──
function heroSection(p) {
    return `
    <section class="page-hero">
        <div class="page-hero-bg"><img src="${esc(p.image)}" alt="${esc(p.name)}"></div>
        <div class="page-hero-overlay"></div>
        <div class="page-hero-content">
            <a href="khampha.html" style="display:inline-flex;align-items:center;gap:7px;color:rgba(249,244,237,.85);font-size:14px;font-weight:600;margin-bottom:14px">
                <i data-lucide="arrow-left" style="width:16px;height:16px"></i> Khám phá miền Tây
            </a>
            <span class="hero-badge">${esc(p.category)}</span>
            <h1>${esc(p.name)}</h1>
            <p>${esc(p.summary)}</p>
            <div style="display:flex;flex-wrap:wrap;gap:9px;margin-top:22px">
                <span class="chip-light"><i data-lucide="star"></i>${p.rating}</span>
                <span class="chip-light"><i data-lucide="navigation"></i>Cách homestay ${String(p.distance_km).replace('.', ',')} km</span>
                <span class="chip-light"><i data-lucide="clock"></i>${esc(p.duration)}</span>
                <span class="chip-light"><i data-lucide="wallet"></i>${esc(p.ticket)}</span>
            </div>
        </div>
    </section>`;
}

// ── Thông tin ──
function infoSection(p, tours = []) {
    return `
    <section class="section-container" style="padding-top:clamp(36px,5vw,60px)">
        <div class="split-panel">
            <div class="split-panel-grid">
                <div class="split-body">
                    <span class="section-tag">Về điểm đến này</span>
                    <h2 style="font-size:clamp(24px,3vw,36px)">${esc(p.name)}</h2>
                    <p>${esc(p.content)}</p>
                    <div class="explore-detail-grid" style="margin-top:24px">
                        <div class="detail-info-card schedule">
                            <h4><i data-lucide="calendar"></i> <span>Nên đi khi nào</span></h4>
                            <p>${esc(p.best_time)}</p>
                            <p style="margin-top:6px"><strong>Giờ mở cửa:</strong> ${esc(p.open_time)}</p>
                        </div>
                        <div class="detail-info-card notes">
                            <h4><i data-lucide="info"></i> <span>Lưu ý</span></h4>
                            <p>${esc(p.tips)}</p>
                        </div>
                    </div>
                    <div style="display:flex;flex-wrap:wrap;gap:11px;margin-top:26px">
                        ${tours.length
                            ? '<button class="btn-primary" onclick="scrollToSection(\'sec-tour\')">Xem tour có điểm đến này</button>'
                            : '<button class="btn-primary" onclick="askPlaceTour()">Hỏi tour riêng tới đây</button>'}
                        <button class="btn-outline" onclick="scrollToSection('sec-xe')"><i data-lucide="car" style="width:16px;height:16px"></i> Đặt xe đưa đón</button>
                    </div>
                </div>
                <div class="split-media" style="min-height:380px">
                    <img src="${esc(p.gallery[p.gallery.length - 1] || p.image)}" alt="${esc(p.name)}" loading="lazy">
                    <span class="split-media-badge"><i data-lucide="map-pin"></i>${esc(p.area)}</span>
                </div>
            </div>
        </div>
    </section>`;
}

// ── Ăn gì ──
function foodSection(foods, p) {
    return `
    <section class="section-container">
        <div class="section-header">
            <span class="section-tag">Ăn gì gần đây</span>
            <h2 class="section-title">Món nên thử khi tới ${esc(p.name.split('—')[0].trim())}</h2>
        </div>
        <div class="food-grid">
            ${foods.map(f => `
                <div class="food-card">
                    <div class="food-card-media"><img src="${esc(f.image)}" alt="${esc(f.name)}" loading="lazy"></div>
                    <div class="food-card-body">
                        <span class="food-cul">${esc(f.cul)}</span>
                        <h3>${esc(f.name)}</h3>
                        <p class="food-where">${esc(f.where)}</p>
                        <div class="food-foot">
                            <span class="food-price">${money(f.price)}</span>
                            <button class="food-btn" onclick="askBot('Tư vấn quán ${esc(f.name).replace(/'/g, '')} gần ${esc(p.name).replace(/'/g, '')}')">Tìm nơi ăn</button>
                        </div>
                    </div>
                </div>`).join('')}
        </div>
    </section>`;
}

// ── Ở đâu gần đây ──
function staySection(stays, p) {
    return `
    <section class="section-container" id="sec-o">
        <div class="section-header">
            <span class="section-tag">Ở đâu gần đây</span>
            <h2 class="section-title">Phòng nghỉ gần ${esc(p.name.split('—')[0].trim())}</h2>
            <p class="section-desc">Đặt phòng trực tiếp, homestay gọi xác nhận trong ngày.</p>
        </div>
        <div class="rooms-grid">
            ${stays.map(room => `
                <div class="room-card">
                    <div class="room-card-img">
                        <img src="${esc(room.image_url)}" alt="${esc(room.name)}" loading="lazy">
                        <span class="room-card-near"><i data-lucide="navigation" style="width:13px;height:13px"></i>${esc(room.distance_text)}</span>
                    </div>
                    <div class="room-card-body">
                        <div class="room-card-header">
                            <h3>${esc(room.name)}</h3>
                            <span class="room-status available"><i data-lucide="circle-check" style="width:13px;height:13px"></i>Còn phòng</span>
                        </div>
                        ${room.description ? `<p class="room-desc">${esc(room.description)}</p>` : ''}
                        <div class="room-amenities">${room.amenities.slice(0, 3).map(a => `<span class="explore-info-chip">${esc(a)}</span>`).join('')}</div>
                        <div class="room-card-footer">
                            <span class="room-price-wrap">
                                <span class="room-price-label">Giá từ</span>
                                <span class="room-price">${money(room.price)}<span class="per-night">/đêm</span></span>
                            </span>
                            <button class="btn-primary btn-book-room" onclick='BayNuiBooking.open("hotel", ${JSON.stringify(room).replace(/'/g, '&#39;')})'>Đặt phòng</button>
                        </div>
                    </div>
                </div>`).join('')}
        </div>
    </section>`;
}

// ── Tour ──
function tourSection(tours) {
    return `
    <section class="section-container" id="sec-tour" style="scroll-margin-top:90px">
        <div class="section-header">
            <span class="section-tag">Tour đúng điểm đến</span>
            <h2 class="section-title">Đặt tour riêng cho địa điểm này</h2>
            <p class="section-desc">Gói bên dưới được thiết kế cho đúng địa điểm bạn đang xem. Tên tour, lịch trình và đơn vị nhận đơn sẽ được giữ nguyên khi bạn bấm đặt.</p>
        </div>
        <div class="tour-grid">
            ${tours.map(t => `
                <div class="tour-card">
                    <img src="${esc(t.image)}" alt="${esc(t.name)}" loading="lazy">
                    <span class="tour-scrim"></span>
                    <div class="tour-body">
                        <div class="tour-chips">
                            <span class="tour-chip"><i data-lucide="clock"></i>${esc(t.duration)}</span>
                            <span class="tour-chip"><i data-lucide="users"></i>${esc(t.pax)}</span>
                            <span class="tour-chip rate"><i data-lucide="star"></i>${t.rating}</span>
                        </div>
                        <h3>${esc(t.name)}</h3>
                        ${t.partner_name ? `<p class="tour-provider"><i data-lucide="building-2"></i>Đơn vị: <b>${esc(t.partner_name)}</b></p>` : ''}
                        <p class="tour-stops">${esc(t.stops)}</p>
                        <p class="tour-stops" style="margin-top:8px;color:rgba(249,244,237,.62)">Gồm: ${t.includes.map(esc).join(' · ')}</p>
                        <div class="tour-foot">
                            <span class="tour-price">${money(t.price)}<span style="font-size:13px;font-family:var(--font-body);color:rgba(249,244,237,.7)">/khách</span></span>
                            <button class="tour-btn" data-place-tour="${esc(t.slug)}">Đặt tour này</button>
                        </div>
                    </div>
                </div>`).join('')}
        </div>
    </section>`;
}

// ── Đặt xe ──
function transportSection(transport) {
    return `
    <section class="section-container" id="sec-xe" style="scroll-margin-top:90px">
        <div class="strip-cta" style="margin-top:0">
            <div>
                <span class="pill-dark"><i data-lucide="car"></i> Xe đưa đón</span>
                <h3 style="margin-top:14px">${esc(transport.hint)}</h3>
                <p>Chọn điểm đón, hệ thống hiện ngay giá của các nhà xe địa phương. Thanh toán trực tiếp với tài xế.</p>
            </div>
            <button class="btn-warm" onclick='BayNuiBooking.open("transport", ${JSON.stringify(transport).replace(/'/g, '&#39;')})'>
                <i data-lucide="car" style="width:18px;height:18px"></i> Tìm xe & đặt
            </button>
        </div>
    </section>`;
}

// ── Địa điểm gần đó ──
function nearbySection(nearby) {
    return `
    <section class="section-container">
        <div class="section-header">
            <span class="section-tag">Kết hợp trong ngày</span>
            <h2 class="section-title">Địa điểm gần đó</h2>
        </div>
        <div class="dest-grid">
            ${nearby.map(d => `
                <a href="diadiem.html?slug=${esc(d.slug)}" class="dest-card">
                    <span class="dest-card-media">
                        <img src="${esc(d.image)}" alt="${esc(d.name)}" loading="lazy">
                        <span class="dest-badge">${esc(d.category)}</span>
                    </span>
                    <span class="dest-card-body">
                        <h3>${esc(d.name)}</h3>
                        <span class="dest-area"><i data-lucide="map-pin"></i>${esc(d.area)}</span>
                        <span class="dest-meta">
                            <span><i data-lucide="star" class="star"></i>${d.rating}</span>
                            <span class="km"><i data-lucide="navigation"></i>${String(d.distance_km).replace('.', ',')} km</span>
                            <span class="chev"><i data-lucide="chevron-right"></i></span>
                        </span>
                    </span>
                </a>`).join('')}
        </div>
    </section>`;
}

function scrollToSection(id) {
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 90, behavior: 'smooth' });
}
window.scrollToSection = scrollToSection;
window.askPlaceTour = function () {
    if (!PLACE_DATA) return;
    const question = 'Tôi muốn hỏi tour riêng tới ' + PLACE_DATA.place.name;
    if (window.chatbotWidget) window.askBot(question);
    else location.href = 'lienhe.html';
};
document.addEventListener('click', event => {
    const button = event.target.closest('[data-place-tour]');
    if (!button || !PLACE_DATA) return;
    const tour = PLACE_DATA.tours.find(t => t.slug === button.dataset.placeTour);
    if (tour) BayNuiBooking.open('tour', tour);
});

// Trang này không dùng site.js nên cần askBot tối giản
if (typeof window.askBot !== 'function') {
    window.askBot = function (question) {
        if (!window.chatbotWidget) return;
        if (!chatbotWidget.isOpen) chatbotWidget.toggle();
        setTimeout(() => {
            const input = document.getElementById('chatbot-input');
            if (input) { input.value = question; input.dispatchEvent(new Event('input')); input.focus(); }
        }, 320);
    };
}

window.addEventListener('DOMContentLoaded', loadPlace);
