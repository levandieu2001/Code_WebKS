// ============================================================
// LOCALMATE — Đặc sản địa phương
// ============================================================
// Khác với mục "Ẩm thực" trong trang Khám phá: chỗ đó GIỚI THIỆU món ăn của
// vùng, còn đây là hàng ĐẶT ĐƯỢC — của cơ sở đã kết nối, có giá, có đơn vị
// bán, có nói rõ gửi đi tỉnh khác được hay chỉ bán tại chỗ.
//
// Hai câu khách ngoài tỉnh luôn hỏi trước khi đặt là "gửi đi xa được không"
// và "để được bao lâu", nên hai câu đó hiện thẳng trên thẻ chứ không giấu
// trong phần mô tả.
// ============================================================

(() => {
    'use strict';

    const $ = (id) => document.getElementById(id);
    const esc = (s) => String(s == null ? '' : s)
        .replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const tien = (n) => Number(n || 0).toLocaleString('vi-VN') + 'đ';
    const T = (vi, en) => (window.LMLang ? LMLang.T(vi, en) : vi);

    // Bỏ dấu để gõ "mat ong" cũng ra "mật ong"
    const khongDau = (s) => String(s || '').toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');

    /** Ma mon cho khach doc lai: bo tien to ky thuat, viet hoa. Khach doc ma
     *  nay cho chu hang qua dien thoai la ho biet ngay mon nao. */
    const maMon = (id) => String(id || '').replace(/^lst_/, '').toUpperCase();

    let TAT_CA = [];

    /**
     * Gợi ý chỉ lấy từ các món đã duyệt đang trả về từ API. Như vậy khách
     * không bị gợi ý một món mẫu hoặc một món đã bị quản trị ẩn đi.
     */
    function capNhatGoiY() {
        const duyNhat = (values) => {
            const seen = new Set();
            return values.filter((value) => {
                const text = String(value || '').trim();
                const key = khongDau(text);
                if (!text || seen.has(key)) return false;
                seen.add(key);
                return true;
            });
        };
        const names = duyNhat(TAT_CA.map(f => f.name));
        const areas = duyNhat(TAT_CA.flatMap(f => String(f.area || '')
            .split(',').map(x => x.trim()).filter(Boolean)));
        if ($('ds-q-suggestions')) {
            $('ds-q-suggestions').innerHTML = names.map(x => `<option value="${esc(x)}"></option>`).join('');
        }
        if ($('ds-area-suggestions')) {
            $('ds-area-suggestions').innerHTML = areas.map(x => `<option value="${esc(x)}"></option>`).join('');
        }
    }

    function danhSachGoiY(kind) {
        if (kind === 'q') return TAT_CA.map(f => f.name);
        return TAT_CA.flatMap(f => String(f.area || '').split(',').map(x => x.trim()));
    }

    /** Menu tự vẽ để cả trình duyệt trong Zalo/Facebook cũng hiện gợi ý rõ. */
    function hienGoiY(kind) {
        const input = $('ds-' + kind);
        const menu = $('ds-' + kind + '-menu');
        if (!input || !menu) return;
        const typed = khongDau(input.value.trim());
        const seen = new Set();
        const values = danhSachGoiY(kind).filter((value) => {
            const key = khongDau(value);
            if (!value || seen.has(key) || (typed && !key.includes(typed))) return false;
            seen.add(key);
            return true;
        }).slice(0, 6);
        menu.innerHTML = values.map(value => '<button type="button" class="lm-auto-option" data-value="'
            + esc(value) + '"><i data-lucide="' + (kind === 'q' ? 'utensils' : 'map-pin') + '"></i>'
            + esc(value) + '</button>').join('');
        menu.hidden = !values.length;
        input.setAttribute('aria-expanded', values.length ? 'true' : 'false');
        menu.querySelectorAll('.lm-auto-option').forEach((button) => {
            button.addEventListener('mousedown', e => e.preventDefault());
            button.addEventListener('click', () => {
                input.value = button.dataset.value || '';
                menu.hidden = true;
                input.setAttribute('aria-expanded', 'false');
                ve();
            });
        });
        if (window.lucide) lucide.createIcons();
    }

    function anGoiY(kind) {
        const menu = $('ds-' + kind + '-menu');
        const input = $('ds-' + kind);
        if (menu) menu.hidden = true;
        if (input) input.setAttribute('aria-expanded', 'false');
    }

    async function nap() {
        const host = $('ds-list');
        try {
            const r = await (await fetch('/v1/specialties')).json();
            TAT_CA = r.data || [];
            capNhatGoiY();
        } catch (_) {
            host.innerHTML = '<div class="lm-empty">' + T('Chưa tải được danh sách, bạn thử lại sau nhé.', 'Could not load the list. Please try again shortly.') + '</div>';
            return;
        }

        // Lấy sẵn từ khoá trên đường dẫn: trang chủ tìm rồi nhảy sang đây
        const url = new URLSearchParams(location.search);
        if (url.get('q')) $('ds-q').value = url.get('q');
        if (url.get('area')) $('ds-area').value = url.get('area');

        ve();
    }

    /** Đọc khoảng giá dạng "50000-150000"; số 0 ở vế sau nghĩa là không chặn trên. */
    function khoangGia() {
        const v = ($('ds-gia') || {}).value || '';
        if (!v) return null;
        const [a, b] = v.split('-').map(Number);
        return { tu: a || 0, den: b || Infinity };
    }

    function coLocNao() {
        return Boolean(($('ds-q') || {}).value || ($('ds-area') || {}).value
            || ($('ds-sort') || {}).value || ($('ds-gia') || {}).value
            || (($('ds-con') || {}).checked));
    }

    /** Đổi một nấc lọc bất kỳ — vẽ lại danh sách. */
    function loc() { ve(); }

    function xoaLoc() {
        ['ds-q', 'ds-area'].forEach(id => { if ($(id)) $(id).value = ''; });
        ['ds-sort', 'ds-gia'].forEach(id => { if ($(id)) $(id).value = ''; });
        if ($('ds-con')) $('ds-con').checked = false;
        ve();
    }

    /** Giữ nguyên bộ lọc của khách nhưng nới dần để luôn có thứ hữu ích:
     *  ưu tiên món cùng tỉnh; nếu tỉnh cũng chưa có thì đưa các món đang bán.
     *  Đây chỉ là gợi ý từ hàng thật trong API, không dựng món/giá giả. */
    function goiYThayThe(q, area, gia, chiCon) {
        const hopGia = (f) => {
            if (chiCon && f.soldOut) return false;
            if (!gia) return true;
            const p = Number(f.price) || 0;
            return p >= gia.tu && p <= gia.den;
        };
        const cungTinh = TAT_CA.filter(f => (!area || khongDau(f.area || '').includes(area)) && hopGia(f));
        if (cungTinh.length) return cungTinh.slice(0, 4);

        // Nếu từ khoá gồm nhiều món ("mật ong, khô cá"), thử từng cụm thay vì
        // coi cả chuỗi đó là một tên sản phẩm duy nhất.
        const tuKhoa = q.split(/[,;|]+/).map(x => x.trim()).filter(Boolean);
        const ganTuKhoa = TAT_CA.filter(f => {
            const ten = khongDau(f.name + ' ' + (f.description || ''));
            return hopGia(f) && tuKhoa.some(x => ten.includes(x));
        });
        if (ganTuKhoa.length) return ganTuKhoa.slice(0, 4);
        return TAT_CA.filter(hopGia).slice(0, 4);
    }

    function theMon(f) {
        return `
            <div class="lm-card ds-card" id="${esc(f.id)}">
                <div class="lm-card-img" onclick="DacSan.xem('${esc(f.id)}')">
                    <img src="${esc(f.image)}" alt="${esc(f.name)}" loading="lazy">
                    ${f.soldOut ? '<span class="lm-tag grey">' + T('Tạm hết hàng', 'Out of stock') + '</span>'
                        : f.discount ? `<span class="lm-tag">-${f.discount}%</span>`
                        : '<span class="lm-tag green">' + T('Đang bán', 'Available') + '</span>'}
                </div>
                <div class="lm-card-body">
                    <h3 class="ds-ten" onclick="DacSan.xem('${esc(f.id)}')">${esc(f.name)}</h3>
                    ${f.shop ? `<p class="ds-shop"><i data-lucide="store"></i>${esc(f.shop)}</p>` : ''}
                    <p class="ds-noi">${f.area
                        ? `<i data-lucide="map-pin"></i>${esc(f.area)}`
                        : '&nbsp;'}</p>
                    <div class="lm-card-foot">
                        <span class="lm-price">${tien(f.price)}<small>/${esc(f.unit || T('phần', 'serving'))}</small>${f.oldPrice ? `<del>${tien(f.oldPrice)}</del>` : ''}</span>
                    </div>
                    <div class="ds-nut">
                        <button class="lm-btn lm-btn-ghost" onclick="DacSan.xem('${esc(f.id)}')">
                            ${T('Xem chi tiết', 'Details')}
                        </button>
                        <button class="lm-btn lm-btn-cta" ${f.soldOut ? 'disabled style="opacity:.55;cursor:default"' : ''}
                                onclick="DacSan.dat('${esc(f.id)}')">
                            ${f.soldOut ? T('Hết hàng', 'Sold out') : T('Đặt món', 'Order')}
                        </button>
                    </div>
                </div>
            </div>`;
    }

    function ve() {
        const host = $('ds-list');
        const q = khongDau($('ds-q').value.trim());
        const area = khongDau($('ds-area').value.trim());
        const gia = khoangGia();
        const chiCon = ($('ds-con') || {}).checked;

        let list = TAT_CA.filter(f => {
            const ten = khongDau(f.name + ' ' + (f.description || ''));
            const noi = khongDau(f.area || '');
            if (q && !ten.includes(q)) return false;
            if (area && !noi.includes(area)) return false;
            if (chiCon && f.soldOut) return false;
            if (gia) {
                const p = Number(f.price) || 0;
                if (p < gia.tu || p > gia.den) return false;
            }
            return true;
        });

        const sort = ($('ds-sort') || {}).value || '';
        if (sort === 're') list = list.slice().sort((a, b) => (a.price || 0) - (b.price || 0));
        else if (sort === 'dat') list = list.slice().sort((a, b) => (b.price || 0) - (a.price || 0));
        else if (sort === 'giam') list = list.slice().sort((a, b) => (b.discount || 0) - (a.discount || 0));

        const dem = $('ds-dem');
        if (dem) {
            dem.textContent = TAT_CA.length
                ? (list.length === TAT_CA.length
                    ? TAT_CA.length + ' ' + T('món', 'items')
                    : list.length + ' / ' + TAT_CA.length + ' ' + T('món', 'items'))
                : '';
        }
        const nutXoa = $('ds-xoa-loc');
        if (nutXoa) nutXoa.hidden = !coLocNao();

        if (!TAT_CA.length) {
            // Mục mới mở: nói thật là chưa có hàng, và mời cơ sở đăng — hơn hẳn
            // một ô trống không ai biết là hỏng hay là chưa có gì.
            host.innerHTML = `
                <div class="lm-empty">
                    <b style="display:block;font-size:16px;color:var(--lm-ink);margin-bottom:6px">
                        ${T('Mục đặc sản vừa mở', 'The local-food section just opened')}
                    </b>
                    Cơ sở sản xuất, nhà vườn, quán ăn bán mang về — đăng ký ở mục
                    <a href="doitac.html" style="color:var(--lm-blue);font-weight:600">Đối tác</a>
                    là bán được ngay tại đây, không mất phí đăng tin.
                </div>`;
            return;
        }

        if (!list.length) {
            const goiY = goiYThayThe(q, area, gia, chiCon);
            host.innerHTML = `
                <div class="ds-no-result">
                    <b>${T('Chưa có món khớp hoàn toàn', 'No exact match yet')}</b>
                    <span>${T('Bạn có thể xem các đặc sản đang bán dưới đây hoặc bỏ bộ lọc.', 'Try these available specialties or clear the filters.')}</span>
                    <button type="button" onclick="DacSan.xoaLoc()">${T('Xem tất cả đặc sản', 'View all specialties')}</button>
                </div>
                ${goiY.length ? `<div class="ds-suggest-title">${T('Gợi ý cho bạn', 'Suggested for you')}</div>${goiY.map(theMon).join('')}` : ''}`;
            if (window.lucide) lucide.createIcons();
            return;
        }

        // Thẻ chỉ giữ đúng thứ cần để CHỌN: món gì, ở đâu, bao nhiêu.
        //
        // Trước đây thẻ đổ hết cả đoạn mô tả, câu gửi hàng, câu bảo quản và
        // số lượng còn — một thẻ cao gần hết màn hình, xem hai món đã phải
        // cuộn. Mấy thứ đó chuyển vào ô "Xem chi tiết", nơi khách đã quyết
        // định dừng lại đọc kỹ.
        host.innerHTML = list.map(theMon).join('');
        if (window.lucide) lucide.createIcons();
    }

    // ── Xem chi tiết một món ─────────────────────────────────
    function xem(id) {
        const f = TAT_CA.find(x => x.id === id);
        if (!f) return;
        const donVi = esc(f.unit || T('phần', 'serving'));

        const dong = (icon, nhan, chu) => chu
            ? `<div class="ds-xem-dong">
                   <span class="ds-xem-ic"><i data-lucide="${icon}"></i></span>
                   <div><b>${nhan}</b><span>${esc(chu)}</span></div>
               </div>`
            : '';

        $('ds-xem-noi').innerHTML = `
            <button class="ds-dong" onclick="DacSan.dongXem()" aria-label="${T('Đóng', 'Close')}">✕</button>
            <div class="ds-xem-anh">
                <img src="${esc(f.image)}" alt="${esc(f.name)}">
                <div class="ds-xem-che">
                    ${f.shop ? `<span class="ds-xem-shop"><i data-lucide="store"></i>${esc(f.shop)}</span>` : ''}
                    <h3>${esc(f.name)}</h3>
                    ${f.area ? `<p><i data-lucide="map-pin"></i>${esc(f.area)}</p>` : ''}
                </div>
            </div>
            <div class="ds-xem-than">
                <div class="ds-xem-gia">
                    <b>${tien(f.price)}</b><small>/${donVi}</small>
                    ${f.oldPrice ? `<del>${tien(f.oldPrice)}</del>` : ''}
                    ${f.discount ? `<span class="ds-xem-giam">-${f.discount}%</span>` : ''}
                </div>
                <p class="ds-xem-ma">${T('Mã món', 'Item code')}: <b>${esc(maMon(f.id))}</b></p>
                ${f.description ? `<p class="ds-xem-mota">${esc(f.description)}</p>` : ''}
                <div class="ds-xem-bang">
                    ${dong('truck', T('Gửi hàng', 'Shipping'), f.shipping)}
                    ${dong('clock', T('Bảo quản', 'Keeping'), f.keeping)}
                    ${dong('package', T('Còn lại', 'In stock'),
                        f.soldOut ? T('Tạm hết hàng', 'Out of stock')
                                  : (f.stock ? f.stock + ' ' + (f.unit || T('phần', 'serving')) : ''))}
                </div>
            </div>
            <div class="ds-xem-day">
                <button class="lm-btn lm-btn-cta" ${f.soldOut ? 'disabled style="opacity:.55;cursor:default"' : ''}
                        onclick="DacSan.dongXem(); DacSan.dat('${esc(f.id)}')">
                    <i data-lucide="shopping-bag"></i>
                    ${f.soldOut ? T('Hết hàng', 'Sold out') : T('Đặt món này', 'Order this')}
                </button>
            </div>`;

        $('ds-xem').hidden = false;
        document.body.style.overflow = 'hidden';
        if (window.lucide) lucide.createIcons();
    }

    function dongXem(e) {
        if (e && e.target !== e.currentTarget) return;
        $('ds-xem').hidden = true;
        document.body.style.overflow = '';
    }

    // ── Đặt món ──────────────────────────────────────────────
    // Hỏi đúng ba thứ chủ hàng cần để gói và gửi: mua mấy, gửi tới đâu, gọi
    // cho ai. Không hỏi thêm gì nữa — mỗi ô thừa là một cơ hội để khách bỏ dở.

    let dangDat = null;
    let dangGui = false;

    async function dat(id) {
        if (dangGui) return;
        const f = TAT_CA.find(x => x.id === id);
        if (!f || f.soldOut) return;
        dangDat = f;

        // Vẽ ngay rồi mới đọc hồ sơ: chờ một vòng mạng mới mở ô đặt thì khách
        // bấm xong thấy đứng im, tưởng hỏng. Đọc xong thì điền vào.
        veODat();
        $('ds-dat').hidden = false;
        document.body.style.overflow = 'hidden';

        if (window.LMHoSo) {
            await LMHoSo.doc();
            dienSan();
        }
    }

    /**
     * Điền sẵn từ hồ sơ đã lưu.
     *
     * Khách đã lưu ở trang Cài đặt tài khoản mà vẫn phải gõ lại thì cái sổ địa
     * chỉ đó chỉ để trang trí. Có nhiều địa chỉ thì hiện ô chọn — người ta hay
     * gửi về nhà mình, mà cũng hay gửi biếu về quê.
     */
    function dienSan() {
        if (!window.LMHoSo || !LMHoSo.coPhien()) return;
        const hs = LMHoSo.hoSo();
        if (!hs) return;

        const ds = LMHoSo.soDiaChi();
        const md = LMHoSo.diaChiMacDinh();

        // Chỉ điền vào ô đang TRỐNG: khách vừa gõ dở rồi hồ sơ nạp xong mà
        // ghi đè lên thì mất công họ gõ.
        const dat1 = (id, gt) => {
            const o = $(id);
            if (o && !o.value && gt) o.value = gt;
        };
        dat1('ds-ten', (md && md.receiver) || hs.full_name);
        dat1('ds-sdt', (md && md.phone) || hs.phone);
        dat1('ds-dc', md && md.address);

        // Nhiều địa chỉ thì cho chọn
        const oChon = $('ds-chon-dc');
        if (oChon && ds.length > 1) {
            oChon.hidden = false;
            oChon.innerHTML = '<label>' + T('Chọn từ sổ địa chỉ', 'Pick a saved address') + '</label>'
                + '<select id="ds-so-dc" onchange="DacSan.chonDiaChi()">'
                + ds.map(a => '<option value="' + esc(a.id) + '"'
                    + (md && a.id === md.id ? ' selected' : '') + '>'
                    + esc((a.label ? a.label + ' — ' : '') + a.address).slice(0, 70)
                    + '</option>').join('')
                + '<option value="">' + T('— Nhập địa chỉ khác —', '— Another address —')
                + '</option></select>';
        }

        const nhac = $('ds-nhac-luu');
        if (nhac && !ds.length) nhac.hidden = false;
    }

    /** Khách đổi địa chỉ trong ô chọn thì điền lại ba ô bên dưới. */
    function chonDiaChi() {
        const id = $('ds-so-dc').value;
        if (!id) {
            $('ds-ten').value = '';
            $('ds-sdt').value = '';
            $('ds-dc').value = '';
            return;
        }
        const a = LMHoSo.soDiaChi().find(x => x.id === id);
        if (!a) return;
        $('ds-ten').value = a.receiver || '';
        $('ds-sdt').value = a.phone || '';
        $('ds-dc').value = a.address || '';
    }

    function dong(e) {
        if (e && e.target !== e.currentTarget) return;
        if (dangGui) return;
        $('ds-dat').hidden = true;
        document.body.style.overflow = '';
        dangDat = null;
    }

    function veODat() {
        const f = dangDat;
        const donVi = esc(f.unit || 'phần');
        const soDaLuu = localStorage.getItem('baynui_lookup_phone') || '';

        $('ds-dat-noi').innerHTML =
            '<button class="ds-dong" type="button" onclick="DacSan.dong()" '
            + 'aria-label="' + T('Không mua nữa', 'Cancel order') + '" '
            + 'title="' + T('Không mua nữa', 'Cancel order') + '">✕</button>'
            + '<h2>' + T('Đặt đặc sản', 'Order local food') + '</h2>'
            + '<div class="ds-mon">'
            + '<img src="' + esc(f.image) + '" alt="' + esc(f.name) + '">'
            + '<div><b>' + esc(f.name) + '</b>'
            + (f.shop ? '<span>Cơ sở: <b>' + esc(f.shop) + '</b></span>' : '')
            + '<span>' + tien(f.price) + '/' + donVi
            + (f.area ? ' · ' + esc(f.area) : '') + '</span></div></div>'

            + '<div class="ds-f"><label>' + T('Số lượng', 'Quantity') + '</label>'
            + '<div class="ds-sl">'
            + '<button type="button" onclick="DacSan.bot()">−</button>'
            + '<input type="number" id="ds-sl" value="1" min="1" max="99" '
            + 'oninput="DacSan.tinh()">'
            + '<button type="button" aria-label="Tăng số lượng" onclick="DacSan.them()">+</button>'
            + '<span class="con">' + donVi
            + (f.stock ? ' · ' + T('còn', 'left') + ' ' + f.stock : '') + '</span>'
            + '</div></div>'

            + '<div class="ds-tong"><span>' + T('Tiền hàng', 'Item total') + '</span>'
            + '<b id="ds-tong">' + tien(f.price) + '</b></div>'

            + '<div class="ds-f" id="ds-chon-dc" hidden></div>'

            + '<div class="ds-f"><label>' + T('Họ tên người nhận *', 'Recipient name *') + '</label>'
            + '<input id="ds-ten" maxlength="120" placeholder="Nguyễn Văn A"></div>'

            + '<div class="ds-f"><label>' + T('Số điện thoại *', 'Phone *') + '</label>'
            + '<input id="ds-sdt" inputmode="tel" maxlength="20" value="' + esc(soDaLuu) + '" '
            + 'placeholder="0909 xxx xxx">'
            + '<small>' + T('Cơ sở gọi số này để xác nhận và báo cước gửi hàng.',
                'The seller calls this number to confirm and quote shipping.') + '</small></div>'

            + '<div class="ds-f"><label>' + T('Địa chỉ nhận hàng *', 'Delivery address *') + '</label>'
            + '<textarea id="ds-dc" rows="2" maxlength="300" '
            + 'placeholder="' + T('Số nhà, đường, xã/phường, huyện, tỉnh',
                'Street, ward, district, province') + '"></textarea></div>'

            + '<div class="ds-f"><label>' + T('Ghi chú', 'Note') + '</label>'
            + '<textarea id="ds-gc" rows="2" maxlength="300" placeholder="'
            + T('Ví dụ: gói kỹ giúp mình, giao buổi chiều',
                'e.g. pack carefully, deliver in the afternoon') + '"></textarea></div>'

            + '<div class="ds-luu-y">'
            + (f.shipping ? '<b>' + esc(f.shipping) + '</b>. ' : '')
            + T('Cước gửi hàng chưa tính trong số tiền trên — tuỳ tỉnh và trọng lượng, '
                + 'cơ sở sẽ gọi báo cho bạn. Bạn <b>chưa phải trả gì bây giờ</b>.',
                'Shipping is not included above — it depends on weight and destination, '
                + 'and the seller will call you with the figure. <b>You pay nothing now</b>.')
            + '</div>'

            + '<p class="ds-luu-y" id="ds-nhac-luu" hidden style="margin-top:-4px">'
            + T('Mẹo: lưu địa chỉ ở <a href="taikhoan.html" style="color:var(--lm-blue);'
                + 'font-weight:600">Cài đặt tài khoản</a> thì lần sau khỏi gõ lại.',
                'Tip: save this address in <a href="taikhoan.html" style="color:var(--lm-blue);'
                + 'font-weight:600">Account settings</a> to skip typing next time.')
            + '</p>'

            + '<div class="ds-loi" id="ds-loi" hidden></div>'
            + '<div class="ds-nut">'
            + '<button class="lm-btn" type="button" onclick="DacSan.dong()">'
            + T('Để sau', 'Later') + '</button>'
            + '<button class="lm-btn lm-btn-cta" type="button" id="ds-gui" '
            + 'onclick="DacSan.gui()">' + T('Gửi đơn', 'Place order') + '</button>'
            + '</div>';

        if (window.lucide) lucide.createIcons();
    }

    const soLuong = () => Math.min(Math.max(parseInt($('ds-sl').value, 10) || 1, 1), 99);

    function tinh() {
        if (!dangDat) return;
        const n = soLuong();
        $('ds-sl').value = n;
        $('ds-tong').textContent = tien(dangDat.price * n);
    }
    const them = () => { $('ds-sl').value = soLuong() + 1; tinh(); };
    const bot = () => { $('ds-sl').value = Math.max(1, soLuong() - 1); tinh(); };

    function loi(chu) {
        const o = $('ds-loi');
        o.textContent = chu;
        o.hidden = !chu;
    }

    async function gui() {
        if (!dangDat || dangGui) return;
        const ten = ($('ds-ten').value || '').trim();
        const sdt = ($('ds-sdt').value || '').replace(/[\s.-]/g, '');
        const dc = ($('ds-dc').value || '').trim();

        // Kiểm ngay tại chỗ để khách không phải chờ một vòng mạng mới biết
        // mình quên một ô.
        if (ten.length < 2) return loi(T('Bạn nhập họ tên người nhận nhé.', 'Please enter a name.'));
        if (!/^0\d{9}$/.test(sdt)) {
            return loi(T('Số điện thoại phải có 10 số, bắt đầu bằng 0.',
                'Phone must be 10 digits starting with 0.'));
        }
        if (dc.length < 8) {
            return loi(T('Địa chỉ cần đầy đủ: số nhà, đường, xã/phường, huyện, tỉnh.',
                'Address must be complete.'));
        }
        loi('');

        const nut = $('ds-gui');
        nut.disabled = true;
        nut.textContent = T('Đang gửi…', 'Sending…');

        let r;
        dangGui = true;
        try {
            // Kèm thẻ đăng nhập nếu có: máy chủ gắn đơn vào tài khoản, và
            // trang "Đơn của tôi" tự hiện ra thay vì bắt gõ lại số điện thoại.
            const the = (window.BayNuiUser && BayNuiUser.coPhien())
                ? await BayNuiUser.token().catch(() => null)
                : null;

            const res = await fetch('/v1/bookings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(the ? { Authorization: 'Bearer ' + the } : {}),
                },
                body: JSON.stringify({
                    kind: 'food',
                    listing_id: dangDat.id,
                    quantity: soLuong(),
                    guest_name: ten,
                    phone: sdt,
                    address: dc,
                    note: ($('ds-gc').value || '').trim(),
                    source: 'web',
                }),
            });
            r = await res.json();
            if (!res.ok) throw new Error((r.error && r.error.message) || 'Không gửi được đơn.');
        } catch (err) {
            nut.disabled = false;
            nut.textContent = T('Gửi đơn', 'Place order');
            return loi(err.message);
        } finally {
            dangGui = false;
        }

        // Nhớ số để chuông thông báo có chỗ mà tra
        try {
            localStorage.setItem('baynui_lookup_phone', sdt);
            if (window.BayNuiNotify && BayNuiNotify.refresh) BayNuiNotify.refresh();
        } catch (_) { /* trinh duyet chan luu tru thi thoi */ }

        $('ds-dat-noi').innerHTML =
            '<div class="ds-xong">'
            + '<i data-lucide="check-circle" style="width:46px;height:46px;color:#16a34a"></i>'
            + '<h2 style="margin-top:12px">' + T('Đã gửi đơn', 'Order sent') + '</h2>'
            + '<p style="color:var(--lm-muted);line-height:1.75;margin:8px 0 0">'
            + esc(r.message || '') + '</p>'
            + '<div class="ma">' + esc(r.data.code) + '</div>'
            + '<p style="font-size:13px;color:var(--lm-muted);line-height:1.7">'
            + T('Giữ mã đơn này để tra cứu. Bạn xem đơn đã tới đâu ở trang ',
                'Keep this code to look it up. Track your order at ')
            + '<a href="donhang.html" style="color:var(--lm-blue);font-weight:700">'
            + T('Đơn của tôi', 'My orders') + '</a>.</p>'
            + '<button class="lm-btn lm-btn-cta" style="width:100%;margin-top:16px;'
            + 'justify-content:center;padding:13px" onclick="DacSan.dong()">'
            + T('Xong', 'Done') + '</button></div>';
        if (window.lucide) lucide.createIcons();

        // Nạp lại danh sách: số lượng còn đã thay đổi
        nap();
    }

    // Đổi ngôn ngữ thì vẽ lại danh sách: chữ trong thẻ do JS dựng nên không
    // có data-i18n để tự đổi theo.
    document.addEventListener('lmlang', () => { if (TAT_CA.length) ve(); });

    document.addEventListener('DOMContentLoaded', () => {
        nap();
        $('ds-tim').onclick = ve;
        // Vừa hiện gợi ý của trình duyệt, vừa lọc danh sách ngay khi gõ. Trì
        // hoãn rất ngắn để bàn phím điện thoại không làm vẽ lại quá dày.
        let doiLoc;
        const locKhiGo = () => {
            clearTimeout(doiLoc);
            doiLoc = setTimeout(ve, 120);
        };
        ['q', 'area'].forEach((kind) => {
            const input = $('ds-' + kind);
            input.addEventListener('focus', () => hienGoiY(kind));
            input.addEventListener('input', () => { hienGoiY(kind); locKhiGo(); });
            input.addEventListener('blur', () => setTimeout(() => anGoiY(kind), 120));
        });
        $('ds-q').addEventListener('keydown', (e) => { if (e.key === 'Enter') ve(); });
        $('ds-area').addEventListener('keydown', (e) => { if (e.key === 'Enter') ve(); });
    });

    window.DacSan = { dat, dong, tinh, them, bot, gui, chonDiaChi, xem, dongXem, loc, xoaLoc };
})();
