// ============================================================
// LOCALMATE — Bản đồ bám xe trực tiếp
// ============================================================
// Vì sao tự vẽ bản đồ thay vì nhúng Google Maps:
//   - Google Maps JS API bắt buộc có API key gắn thẻ thanh toán. Dự án này
//     phải chạy được ngay trên máy giám khảo, không thể phụ thuộc vào thẻ.
//   - Tile của OpenStreetMap miễn phí, không cần key, và đủ chi tiết cho
//     vùng Bảy Núi.
//   - Dùng chung một file cho cả web lẫn app (app mở bằng WebView), nên
//     khách nhìn trên điện thoại hay máy tính đều thấy y hệt nhau.
//
// Xe được VẼ CHẠY MƯỢT: máy chủ chỉ báo vị trí mỗi ~15 giây, nếu nhảy cóc
// thì khách khó hình dung. Ở đây nội suy vị trí theo thời gian nên icon xe
// trườn dần từ điểm cũ sang điểm mới, và mũi xe quay theo hướng đang đi.
// ============================================================

const TILE_SIZE = 256;
const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const POLL_MS = 12000;
const GLIDE_MS = 2500;

/** Đổi kinh/vĩ độ sang toạ độ pixel của thế giới ở mức phóng z. */
function project(lat, lng, z) {
    const scale = TILE_SIZE * Math.pow(2, z);
    const sinLat = Math.sin((lat * Math.PI) / 180);
    return {
        x: ((lng + 180) / 360) * scale,
        y: (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale,
    };
}

/** Góc từ điểm A tới điểm B, để quay mũi xe. 0° là hướng bắc. */
function bearing(a, b) {
    const toRad = (d) => (d * Math.PI) / 180;
    const y = Math.sin(toRad(b.lng - a.lng)) * Math.cos(toRad(b.lat));
    const x = Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat))
        - Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(toRad(b.lng - a.lng));
    return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function haversineKm(a, b) {
    const R = 6371;
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2
        + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
}

class LiveMap {
    constructor(el, options = {}) {
        this.el = el;
        this.zoom = options.zoom || 14;
        this.center = options.center || { lat: 10.5117, lng: 105.0 };
        this.car = null;          // vị trí xe đang vẽ
        this.carTarget = null;    // vị trí máy chủ vừa báo
        this.carFrom = null;
        this.glideStart = 0;
        this.heading = 0;
        this.target = null;       // điểm đón hoặc điểm đến
        this.targetLabel = '';
        this.follow = true;       // tự bám theo xe, tắt khi khách tự kéo bản đồ

        el.classList.add('livemap');
        el.innerHTML = `
            <div class="livemap-tiles"></div>
            <div class="livemap-pins"></div>
            <div class="livemap-zoom">
                <button type="button" data-z="1" aria-label="Phóng to">+</button>
                <button type="button" data-z="-1" aria-label="Thu nhỏ">−</button>
            </div>
            <button type="button" class="livemap-recenter" hidden>Bám theo xe</button>
            <div class="livemap-credit">© OpenStreetMap</div>`;

        this.tileLayer = el.querySelector('.livemap-tiles');
        this.pinLayer = el.querySelector('.livemap-pins');
        this.recenterBtn = el.querySelector('.livemap-recenter');

        this._bindGestures();
        el.querySelectorAll('.livemap-zoom button').forEach((b) => {
            b.addEventListener('click', () => this.setZoom(this.zoom + Number(b.dataset.z)));
        });
        this.recenterBtn.addEventListener('click', () => {
            this.follow = true;
            this.recenterBtn.hidden = true;
            if (this.car) this.center = { ...this.car };
            this.render();
        });

        // Dùng setInterval chứ KHÔNG dùng requestAnimationFrame: rAF ngừng chạy
        // hẳn khi tab bị ẩn hoặc cửa sổ không được vẽ lên màn hình, và khi đó
        // xe đứng im tại chỗ dù máy chủ vẫn báo vị trí mới — khách tưởng tài xế
        // không đi. setInterval bị hãm lại nhưng vẫn nổ, nên bản đồ luôn đúng.
        this._tick = this._tick.bind(this);
        this._timer = setInterval(this._tick, 40);
        window.addEventListener('resize', () => this.render());
    }

    setZoom(z) {
        this.zoom = Math.max(11, Math.min(17, z));
        this.render();
    }

    /** Kéo bản đồ bằng chuột hoặc ngón tay. */
    _bindGestures() {
        let dragging = false;
        let last = null;

        const start = (x, y) => { dragging = true; last = { x, y }; };
        const move = (x, y) => {
            if (!dragging) return;
            const scale = TILE_SIZE * Math.pow(2, this.zoom);
            const dx = x - last.x;
            const dy = y - last.y;
            last = { x, y };
            const p = project(this.center.lat, this.center.lng, this.zoom);
            this.center = this._unproject(p.x - dx, p.y - dy, scale);
            // Khách tự kéo thì thôi bám xe, nhường quyền cho họ
            if (this.follow) { this.follow = false; this.recenterBtn.hidden = false; }
            this.render();
        };
        const end = () => { dragging = false; };

        this.el.addEventListener('mousedown', (e) => { e.preventDefault(); start(e.clientX, e.clientY); });
        window.addEventListener('mousemove', (e) => move(e.clientX, e.clientY));
        window.addEventListener('mouseup', end);
        this.el.addEventListener('touchstart', (e) => start(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
        this.el.addEventListener('touchmove', (e) => move(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
        this.el.addEventListener('touchend', end);
    }

    _unproject(x, y, scale) {
        const lng = (x / scale) * 360 - 180;
        const n = Math.PI - (2 * Math.PI * y) / scale;
        const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
        return { lat, lng };
    }

    /** Máy chủ vừa báo vị trí mới → cho xe trườn tới đó. */
    setCar(lat, lng) {
        const next = { lat, lng };
        if (this.car) {
            // Nhích vài mét thì giữ nguyên hướng cũ cho khỏi rung
            if (haversineKm(this.car, next) > 0.01) this.heading = bearing(this.car, next);
            this.carFrom = { ...this.car };
        } else {
            this.car = next;
            this.carFrom = next;
            this.center = { ...next };
        }
        this.carTarget = next;
        this.glideStart = performance.now();
        this._settled = false;
        this._tick(); // vẽ ngay một nhịp, đừng chờ bộ đếm
    }

    setTarget(lat, lng, label) {
        this.target = { lat, lng };
        this.targetLabel = label || '';
        this.render();
    }

    _tick() {
        if (!this.carTarget || !this.carFrom) return;

        const t = Math.min(1, (performance.now() - this.glideStart) / GLIDE_MS);
        if (t >= 1 && this._settled) return; // đã tới nơi, khỏi vẽ lại cho tốn pin

        this.car = {
            lat: this.carFrom.lat + (this.carTarget.lat - this.carFrom.lat) * t,
            lng: this.carFrom.lng + (this.carTarget.lng - this.carFrom.lng) * t,
        };
        if (this.follow) this.center = { ...this.car };
        this._settled = t >= 1;
        this.render();
    }

    destroy() {
        clearInterval(this._timer);
    }

    render() {
        const w = this.el.clientWidth;
        const h = this.el.clientHeight;
        if (!w || !h) return;

        const z = Math.round(this.zoom);
        const c = project(this.center.lat, this.center.lng, z);
        const originX = c.x - w / 2;
        const originY = c.y - h / 2;

        // ── Lớp tile ──
        const maxTile = Math.pow(2, z);
        const x0 = Math.floor(originX / TILE_SIZE);
        const y0 = Math.floor(originY / TILE_SIZE);
        const x1 = Math.floor((originX + w) / TILE_SIZE);
        const y1 = Math.floor((originY + h) / TILE_SIZE);

        const wanted = new Map();
        for (let ty = y0; ty <= y1; ty += 1) {
            for (let tx = x0; tx <= x1; tx += 1) {
                if (ty < 0 || ty >= maxTile) continue;
                const wrapX = ((tx % maxTile) + maxTile) % maxTile;
                wanted.set(`${z}/${wrapX}/${ty}`, {
                    left: tx * TILE_SIZE - originX,
                    top: ty * TILE_SIZE - originY,
                    url: TILE_URL.replace('{z}', z).replace('{x}', wrapX).replace('{y}', ty),
                });
            }
        }

        // Giữ lại tile đã tải để không nháy trắng mỗi lần vẽ lại
        this._tiles = this._tiles || new Map();
        for (const [key, img] of this._tiles) {
            if (!wanted.has(key)) { img.remove(); this._tiles.delete(key); }
        }
        for (const [key, spec] of wanted) {
            let img = this._tiles.get(key);
            if (!img) {
                img = document.createElement('img');
                img.src = spec.url;
                img.alt = '';
                img.loading = 'eager';
                img.decoding = 'async';
                this.tileLayer.appendChild(img);
                this._tiles.set(key, img);
            }
            img.style.transform = `translate3d(${Math.round(spec.left)}px, ${Math.round(spec.top)}px, 0)`;
        }

        // ── Lớp ghim ──
        const place = (lat, lng) => {
            const p = project(lat, lng, z);
            return { left: p.x - originX, top: p.y - originY };
        };

        let html = '';
        if (this.target) {
            const p = place(this.target.lat, this.target.lng);
            html += `<div class="livemap-pin livemap-pin--dest" style="transform:translate3d(${p.left}px,${p.top}px,0)">
                <span class="livemap-dot"></span>
                ${this.targetLabel ? `<span class="livemap-label">${this.targetLabel}</span>` : ''}
            </div>`;
        }
        if (this.car) {
            const p = place(this.car.lat, this.car.lng);
            html += `<div class="livemap-pin livemap-pin--car" style="transform:translate3d(${p.left}px,${p.top}px,0)">
                <span class="livemap-pulse"></span>
                <svg viewBox="0 0 24 24" style="transform:rotate(${this.heading}deg)" aria-label="Xe của bạn">
                    <path d="M12 2 4.6 20.2a.7.7 0 0 0 1 .85L12 17.6l6.4 3.45a.7.7 0 0 0 1-.85Z"/>
                </svg>
            </div>`;
        }
        this.pinLayer.innerHTML = html;
    }
}

/**
 * Gắn bản đồ vào một phần tử và tự hỏi máy chủ vị trí xe.
 * Trả về hàm dừng, để trang gọi khi đóng bản đồ (đỡ tốn 4G của khách).
 */
export function trackBooking(el, bookingId, onUpdate) {
    const map = new LiveMap(el);
    let timer = null;
    let stopped = false;

    async function poll() {
        try {
            const res = await fetch(`/v1/bookings/${encodeURIComponent(bookingId)}/track`);
            const data = await res.json();
            if (stopped) return;

            if (data.tracking && Number.isFinite(data.lat) && Number.isFinite(data.lng)) {
                map.setCar(data.lat, data.lng);
            }
            if (Number.isFinite(data.target_lat) && Number.isFinite(data.target_lng)) {
                map.setTarget(data.target_lat, data.target_lng, data.target_label || '');
            }
            if (typeof onUpdate === 'function') onUpdate(data);
        } catch (_) {
            // Rớt mạng thì giữ nguyên vị trí cuối, lần sau hỏi lại
        } finally {
            if (!stopped) timer = setTimeout(poll, POLL_MS);
        }
    }

    poll();
    return () => { stopped = true; if (timer) clearTimeout(timer); map.destroy(); };
}

export { LiveMap };
