// ============================================
// LOCALMATE — Premium Enhancements
// Loading, Progress, Sticky Bar, Carousel,
// Calendar, Compare, Weather, Map, Animations
// ============================================
(function () {
'use strict';

// Loading screen removed per user request

// ── INIT: run immediately if DOM ready, else wait ──
function enhInit() {

// ── 2. SCROLL PROGRESS BAR ──
(function() {
    const bar = document.createElement('div');
    bar.className = 'scroll-progress';
    bar.id = 'scroll-progress';
    document.body.appendChild(bar);
    window.addEventListener('scroll', () => {
        const h = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.width = h > 0 ? (window.scrollY / h * 100) + '%' : '0';
    }, { passive: true });
})();

// ── 3. BACK TO TOP ──
(function() {
    const btn = document.createElement('button');
    btn.className = 'back-to-top';
    btn.id = 'back-to-top';
    btn.setAttribute('aria-label', 'Back to top');
    btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>';
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    document.body.appendChild(btn);
    window.addEventListener('scroll', () => { btn.classList.toggle('show', window.scrollY > 500); }, { passive: true });
})();

// ── 4. STICKY BOOKING BAR ──
// Tắt: giao diện mới đã có thanh tìm phòng ngay dưới hero + nav luôn hiển thị.
(function() {
    const hero = null;
    if (!hero) return;
    const bar = document.createElement('div');
    bar.className = 'sticky-booking-bar';
    bar.id = 'sticky-booking-bar';
    const lang = localStorage.getItem('baynui_lang') || 'vi';
    const isEn = lang === 'en';
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    bar.innerHTML = `
        <span class="sticky-label">${isEn ? '📅 Quick Booking' : '📅 Đặt phòng nhanh'}</span>
        <input type="date" id="sticky-date" value="${tomorrow.toISOString().split('T')[0]}" style="width:140px">
        <select id="sticky-room" style="width:180px">
            <option value="1">${isEn ? 'Mountain View — 850k' : 'Sun-view Núi Cấm — 850k'}</option>
            <option value="2">${isEn ? 'Riverside Bungalow — 1.2M' : 'Bungalow Ven Suối — 1.2M'}</option>
            <option value="3">${isEn ? 'Family Suite — 1.8M' : 'Family Tà Pạ — 1.8M'}</option>
        </select>
        <select id="sticky-nights" style="width:100px">
            <option value="1">1 ${isEn ? 'night' : 'đêm'}</option>
            <option value="2">2 ${isEn ? 'nights' : 'đêm'}</option>
            <option value="3">3 ${isEn ? 'nights' : 'đêm'}</option>
            <option value="5">5 ${isEn ? 'nights' : 'đêm'}</option>
            <option value="7">7 ${isEn ? 'nights' : 'đêm'} (-10%)</option>
        </select>
        <button class="sticky-book-btn" onclick="window.location.href='phongnghi.html'">${isEn ? '🔥 Book Now' : '🔥 Đặt ngay'}</button>`;
    document.body.appendChild(bar);
    const heroEnd = hero.offsetTop + hero.offsetHeight;
    const mainNav = document.getElementById('main-nav');
    window.addEventListener('scroll', () => {
        const past = window.scrollY > heroEnd;
        bar.classList.toggle('show', past);
        if (mainNav) mainNav.style.transform = past ? 'translateY(-100%)' : '';
    }, { passive: true });
})();

// ── 5. TESTIMONIAL CAROUSEL ──
// Tắt: giao diện mới hiển thị đánh giá dạng lưới 3 cột theo đúng mẫu thiết kế.
(function() {
    const grid = null;
    if (!grid) return;
    const cards = Array.from(grid.children);
    if (cards.length < 2) return;
    const wrap = document.createElement('div');
    wrap.className = 'testimonial-carousel';
    grid.parentNode.insertBefore(wrap, grid);
    const track = document.createElement('div');
    track.className = 'testimonial-track';
    cards.forEach(c => {
        const slide = document.createElement('div');
        slide.className = 'testimonial-slide';
        slide.appendChild(c);
        track.appendChild(slide);
    });
    wrap.appendChild(track);
    grid.remove();
    // Nav buttons
    const prevBtn = document.createElement('button');
    prevBtn.className = 'carousel-nav-btn prev';
    prevBtn.innerHTML = '‹';
    const nextBtn = document.createElement('button');
    nextBtn.className = 'carousel-nav-btn next';
    nextBtn.innerHTML = '›';
    wrap.appendChild(prevBtn);
    wrap.appendChild(nextBtn);
    // Dots
    const dots = document.createElement('div');
    dots.className = 'carousel-controls';
    cards.forEach((_, i) => {
        const d = document.createElement('button');
        d.className = 'carousel-dot' + (i === 0 ? ' active' : '');
        d.addEventListener('click', () => goTo(i));
        dots.appendChild(d);
    });
    wrap.parentNode.insertBefore(dots, wrap.nextSibling);

    let cur = 0, total = cards.length, autoTimer;
    function goTo(idx) {
        cur = ((idx % total) + total) % total;
        track.style.transform = `translateX(-${cur * 100}%)`;
        dots.querySelectorAll('.carousel-dot').forEach((d, i) => d.classList.toggle('active', i === cur));
    }
    prevBtn.addEventListener('click', () => { goTo(cur - 1); resetAuto(); });
    nextBtn.addEventListener('click', () => { goTo(cur + 1); resetAuto(); });
    function resetAuto() { clearInterval(autoTimer); autoTimer = setInterval(() => goTo(cur + 1), 5000); }
    autoTimer = setInterval(() => goTo(cur + 1), 5000);
})();

// ── 6. ROOM COMPARISON ──
(function() {
    const lang = localStorage.getItem('baynui_lang') || 'vi';
    const en = lang === 'en';
    // Add button after room grid
    const roomGrid = document.getElementById('home-rooms-preview') || document.getElementById('rooms-list');
    const roomSection = roomGrid?.closest('.section-container');
    const sectionCta = roomSection?.querySelector('.section-cta')
        || roomSection?.querySelector('.section-head-row')
        || roomSection?.querySelector('.filter-bar');
    if (sectionCta) {
        const btn = document.createElement('button');
        btn.className = 'compare-btn-trigger';
        btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 3h5v5M8 3H3v5M3 16v5h5M21 16v5h-5"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg> ${en ? 'Compare Rooms' : 'So sánh phòng'}`;
        btn.addEventListener('click', () => window.openCompare && window.openCompare());
        sectionCta.appendChild(btn);
    }
    // Modal
    const overlay = document.createElement('div');
    overlay.className = 'compare-modal-overlay';
    overlay.id = 'compare-modal';
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('show'); });
    const rows = en ? [
        ['Price/night','850,000đ','1,200,000đ','1,800,000đ'],
        ['Capacity','2 guests','2 guests','4 guests'],
        ['Beds','1 King','1 Queen','1 King + 1 Single'],
        ['View','🏔 Mountain','🌊 Stream','🌳 Garden'],
        ['WiFi','✅','✅','✅'],
        ['A/C','✅','❌ (Ceiling fan)','✅'],
        ['Bathtub','❌','✅','❌'],
        ['Kitchenette','❌','❌','✅'],
        ['Balcony','✅ Private','✅ By stream','✅ Shared'],
        ['Hot Water','✅','✅','✅'],
        ['Best For','Solo / Couple','Couple / Romance','Family / Group']
    ] : [
        ['Giá/đêm','850.000đ','1.200.000đ','1.800.000đ'],
        ['Sức chứa','2 khách','2 khách','4 khách'],
        ['Giường','1 King','1 Queen','1 King + 1 đơn'],
        ['View','🏔 Núi','🌊 Suối','🌳 Vườn'],
        ['WiFi','✅','✅','✅'],
        ['Điều hòa','✅','❌ (Quạt trần)','✅'],
        ['Bồn tắm','❌','✅','❌'],
        ['Bếp nhỏ','❌','❌','✅'],
        ['Ban công','✅ Riêng','✅ Ven suối','✅ Chung'],
        ['Nước nóng','✅','✅','✅'],
        ['Phù hợp','Solo / Đôi','Cặp đôi / Lãng mạn','Gia đình / Nhóm']
    ];
    const imgs = [
        'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=300&q=80',
        'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=300&q=80',
        'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=300&q=80'
    ];
    const names = en ? ['Mountain View','Riverside Bungalow','Family Suite'] : ['Sun-view Núi Cấm','Bungalow Ven Suối','Family Tà Pạ'];
    overlay.innerHTML = `<div class="compare-modal"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem"><h2 style="font-size:1.25rem;font-weight:800">${en ? '📊 Room Comparison' : '📊 So sánh phòng'}</h2><button onclick="document.getElementById('compare-modal').classList.remove('show')" style="background:none;border:none;font-size:1.5rem;cursor:pointer;padding:0.25rem">✕</button></div><table class="compare-table"><thead><tr><th></th>${names.map((n,i) => `<th class="room-col-header"><img src="${imgs[i]}" alt="${n}"><h4>${n}</h4></th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr><td style="font-weight:600;color:#475569">${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td></tr>`).join('')}</tbody></table></div>`;
    document.body.appendChild(overlay);
    window.openCompare = function() { overlay.classList.add('show'); };
})();

// ── 7. BOOKING CALENDAR ──
setTimeout(async function() {
    const calHost = document.getElementById('booking-calendar');
    if (!calHost) return;
    const lang = localStorage.getItem('baynui_lang') || 'vi';
    const en = lang === 'en';
    let viewDate = new Date();
    let bookedDays = [];
    
    async function fetchBookedDays(year, month) {
        if(!window.FirebaseDB) return;
        try {
            const bookings = await FirebaseDB.getBookings();
            bookedDays = [];
            bookings.forEach(b => {
                if (b.status === 'Cancelled' || b.status === 'cancelled') return;
                const checkInDate = new Date(b.checkIn);
                const nights = parseInt(b.nights) || 1;
                for (let i = 0; i < nights; i++) {
                    const bd = new Date(checkInDate);
                    bd.setDate(bd.getDate() + i);
                    if(bd.getFullYear() === year && bd.getMonth() === month) {
                        bookedDays.push(bd.getDate());
                    }
                }
            });
        } catch(e) { console.warn("Failed to fetch bookings for calendar"); }
    }

    async function render() {
        calHost.innerHTML = '<div style="padding:2rem;text-align:center"><i data-lucide="loader-2" class="spin"></i></div>';
        if(window.lucide) window.lucide.createIcons();
        
        const y = viewDate.getFullYear(), m = viewDate.getMonth();
        await fetchBookedDays(y, m);
        
        const first = new Date(y, m, 1).getDay();
        const days = new Date(y, m + 1, 0).getDate();
        const today = new Date();
        const monthName = viewDate.toLocaleString(en ? 'en' : 'vi', { month: 'long', year: 'numeric' });
        const dayHeaders = en ? ['Su','Mo','Tu','We','Th','Fr','Sa'] : ['CN','T2','T3','T4','T5','T6','T7'];
        let cells = dayHeaders.map(d => `<div class="cal-day-header">${d}</div>`).join('');
        const startDay = first === 0 ? 6 : first - 1; // Mon start
        const adjustedFirst = (first + 6) % 7;
        for (let i = 0; i < adjustedFirst; i++) cells += '<div class="cal-day empty"></div>';
        for (let d = 1; d <= days; d++) {
            const isToday = d === today.getDate() && m === today.getMonth() && y === today.getFullYear();
            const isBooked = bookedDays.includes(d);
            const isPast = new Date(y, m, d) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
            let cls = 'cal-day';
            if (isPast) cls += ' empty';
            else if (isBooked) cls += ' booked';
            else cls += ' available';
            if (isToday) cls += ' today';
            cells += `<div class="${cls}">${d}</div>`;
        }
        calHost.innerHTML = `<div class="booking-calendar"><div class="cal-header"><button class="cal-nav-btn" id="cal-prev">‹</button><h4>${monthName}</h4><button class="cal-nav-btn" id="cal-next">›</button></div><div class="cal-grid">${cells}</div><div class="cal-legend"><span><span class="dot avail"></span>${en ? 'Available' : 'Còn phòng'}</span><span><span class="dot full"></span>${en ? 'Booked' : 'Hết phòng'}</span></div></div>`;
        document.getElementById('cal-prev').addEventListener('click', () => { viewDate.setMonth(viewDate.getMonth() - 1); render(); });
        document.getElementById('cal-next').addEventListener('click', () => { viewDate.setMonth(viewDate.getMonth() + 1); render(); });
    }
    render();
}, 100);

// ── 8. WEATHER WIDGET ──
setTimeout(function() {
    const host = document.getElementById('weather-widget');
    if (!host) return;
    const lang = localStorage.getItem('baynui_lang') || 'vi';
    const en = lang === 'en';
    // Simulated real-time weather for Núi Cấm (no API key needed)
    const hour = new Date().getHours();
    const isNight = hour < 6 || hour > 18;
    const temps = [26,25,24,24,25,26,27,28,29,30,31,32,33,33,33,32,31,30,29,28,27,27,26,26];
    const temp = temps[hour] || 28;
    const conditions = isNight
        ? (en ? 'Clear Sky' : 'Trời quang')
        : (hour > 13 ? (en ? 'Partly Cloudy' : 'Có mây') : (en ? 'Sunny' : 'Nắng đẹp'));
    const icon = isNight ? '🌙' : (hour > 13 ? '⛅' : '☀️');
    host.innerHTML = `<div class="weather-widget"><h4>📍 ${en ? 'Cam Mountain, An Giang' : 'Núi Cấm, An Giang'}</h4><div class="weather-main"><span class="weather-icon">${icon}</span><span class="weather-temp">${temp}°C</span></div><div class="weather-desc">${conditions}</div><div class="weather-details"><div class="weather-detail">${en ? 'Humidity' : 'Độ ẩm'}<strong>72%</strong></div><div class="weather-detail">${en ? 'Wind' : 'Gió'}<strong>12 km/h</strong></div><div class="weather-detail">${en ? 'Feels Like' : 'Cảm giác'}<strong>${temp - 2}°C</strong></div><div class="weather-detail">${en ? 'UV Index' : 'UV'}<strong>${isNight ? '0' : '6'}</strong></div></div></div>`;
}, 100);

// ── 9. SCROLL ANIMATIONS ──
// Có thể gọi lại window.observeReveals() sau khi render nội dung động.
(function() {
    const SELECTOR = '.feature-card, .explore-card, .room-card, .glass-card, .explore-detail-item, .faq-item, .testimonial-card, .dest-card, .exp-card, .food-card, .tour-card, .service-tile, .fest-row, .suggest-card';
    const observer = new IntersectionObserver(entries => {
        entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); } });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

    function observeReveals() {
        document.querySelectorAll(SELECTOR).forEach((el, i) => {
            if (el.dataset.revealBound) return;
            el.dataset.revealBound = '1';
            el.classList.add('scroll-animate', 'delay-' + (i % 4));
            observer.observe(el);
        });
    }
    window.observeReveals = observeReveals;
    observeReveals();

    // Nội dung render bằng JS (phòng, điểm đến, món ăn…) xuất hiện sau — quan sát tiếp.
    let queued = false;
    new MutationObserver(() => {
        if (queued) return;
        queued = true;
        requestAnimationFrame(() => { queued = false; observeReveals(); });
    }).observe(document.body, { childList: true, subtree: true });
})();

// ── 10. ANIMATED COUNTERS ──
(function() {
    const stats = document.querySelectorAll('.hero-stat-number');
    if (!stats.length) return;
    let animated = false;
    const observer = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (e.isIntersecting && !animated) {
                animated = true;
                stats.forEach(stat => {
                    const text = stat.textContent.trim();
                    const num = parseFloat(text);
                    const suffix = text.replace(/[\d.]/g, '');
                    const isDecimal = text.includes('.');
                    const duration = 1500;
                    const start = performance.now();
                    function tick(now) {
                        const p = Math.min((now - start) / duration, 1);
                        const ease = 1 - Math.pow(1 - p, 3);
                        const val = isDecimal ? (num * ease).toFixed(1) : Math.floor(num * ease);
                        stat.textContent = val + suffix;
                        if (p < 1) requestAnimationFrame(tick);
                    }
                    requestAnimationFrame(tick);
                });
            }
        });
    }, { threshold: 0.5 });
    stats.forEach(s => observer.observe(s));
})();

} // end enhInit

// Run immediately if DOM ready, else wait
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enhInit);
} else {
    enhInit();
}

})();
