// ============================================================
// LOCALMATE — Dịch vụ của đối tác
// ============================================================
// Khách sạn tự đăng phòng, đơn vị tour tự đăng tour, cơ sở tự đăng đặc sản.
// Trước đây hai thứ này viết cứng trong mã nguồn: đối tác đăng ký xong,
// được duyệt rồi vẫn không có chỗ nào để đưa dịch vụ của mình lên, muốn
// thêm một khách sạn là phải sửa code rồi khởi động lại máy chủ.
//
// Admin chỉ duyệt hồ sơ đối tác một lần. Sau đó tin đăng và thay đổi được
// hiển thị ngay trên web, app và trong lịch trình hệ thống gợi ý.
// ============================================================

const Listing = (() => {
    const $ = (id) => document.getElementById(id);
    const money = (n) => Number(n || 0).toLocaleString('vi-VN') + 'đ';
    const esc = (s) => String(s == null ? '' : s)
        .replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

    let rows = [];
    let listingType = '';      // 'stay' hoặc 'tour'
    let editingId = '';
    let coords = { lat: null, lng: null };

    const BADGE = { approved: 'ok', pending: 'wait', rejected: 'wait', paused: 'wait' };

    async function api(path, options = {}) {
        const token = await BayNuiAuth.token();
        const res = await fetch(path, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: 'Bearer ' + token } : {}),
                ...(options.headers || {}),
            },
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((body.error && body.error.message) || 'Có lỗi xảy ra.');
        return body;
    }

    /** Chỉ đối tác đã được duyệt hồ sơ mới có mục này. */
    async function load(partner) {
        const host = $('listing-panel');
        if (!host) return;
        if (!partner || ['hotel', 'tour', 'food'].indexOf(partner.type) === -1 || partner.status !== 'approved') {
            host.innerHTML = '';
            return;
        }
        try {
            const result = await api('/v1/partner/listings');
            rows = result.data || [];
            listingType = result.listing_type;
            render();
        } catch (err) {
            host.innerHTML = '<div class="notice">' + esc(err.message) + '</div>';
        }
    }

    /** Chữ dùng cho từng loại tin đăng. */
    const CHU = {
        stay: { danhTu: 'phòng / chỗ nghỉ', tieuDe: 'Phòng &amp; chỗ nghỉ' },
        tour: { danhTu: 'tour', tieuDe: 'Tour bạn tổ chức' },
        food: { danhTu: 'đặc sản', tieuDe: 'Đặc sản bạn bán' },
    };
    const chuCua = () => CHU[listingType] || CHU.tour;

    // Bộ lọc của danh sách tin. Giữ ngoài render() để vẽ lại không mất chữ
    // đang gõ dở.
    const boLoc = { tu: '', trangThai: '' };

    /** Bỏ dấu để gõ "banh bo" vẫn tìm ra "Bánh bò thốt nốt". */
    const khongDau = (v) => String(v == null ? '' : v)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd');

    function locTin() {
        const tu = khongDau(boLoc.tu).trim();
        return rows.filter((r) => {
            if (boLoc.trangThai) {
                if (boLoc.trangThai === 'soldout') { if (!r.sold_out) return false; }
                else if (r.status !== boLoc.trangThai) return false;
            }
            if (!tu) return true;
            const kho = khongDau([r.name, r.area, r.description, r.unit].filter(Boolean).join(' '));
            return kho.includes(tu);
        });
    }

    /** Gõ vào ô tìm. Chỉ vẽ lại phần lưới thẻ, không đụng tới ô nhập. */
    function tim(v) {
        boLoc.tu = v || '';
        veLuoi();
    }

    function locTheoTrangThai(v) {
        boLoc.trangThai = v || '';
        veLuoi();
    }

    function veLuoi() {
        const hop = $('listing-list');
        if (!hop) return;
        const ds = locTin();
        const noun = chuCua().danhTu;

        hop.innerHTML = ds.length
            ? '<div class="listing-grid">' + ds.map(card).join('') + '</div>'
            : (rows.length
                ? '<div class="notice" style="margin-top:18px">Không có ' + noun +
                  ' nào khớp với ô tìm ở trên.</div>'
                : '<div class="notice" style="margin-top:18px">Bạn chưa đăng ' + noun +
                  ' nào. Bấm <strong>Đăng ' + noun + '</strong> để khách nhìn thấy và đặt được ngay ' +
                  'trên web, trên app, và trong lịch trình hệ thống gợi ý cho khách.</div>');

        const dem = $('listing-count');
        if (dem) {
            dem.textContent = rows.length
                ? (ds.length === rows.length
                    ? rows.length + ' tin · ' + rows.filter(r => r.status === 'approved').length + ' đang hiện cho khách'
                    : ds.length + ' / ' + rows.length + ' tin khớp')
                : 'Chưa có tin nào';
        }

        markBrokenCovers();
        if (window.lucide) lucide.createIcons();
    }

    function render() {
        const isStay = listingType === 'stay';
        const noun = chuCua().danhTu;

        // Tiêu đề, số tin và nút đăng nằm CÙNG một hàng, canh giữa theo chiều
        // dọc. Trước đây nút bị đẩy lên lơ lửng bên phải, cách tiêu đề một
        // khoảng trống to, nhìn như rơi ra khỏi khối.
        const soDaDuyet = rows.filter(r => r.status === 'approved').length;

        // Ô tìm và ô lọc chỉ hiện khi đã có tin — chưa đăng gì mà bày ra ô
        // tìm thì chỉ tổ rối mắt.
        const congCu = rows.length
            ? '<div class="lst-tools">' +
                  '<label class="lst-search">' +
                      '<i data-lucide="search"></i>' +
                      '<input type="search" id="listing-search" autocomplete="off" ' +
                          'value="' + esc(boLoc.tu) + '" ' +
                          'placeholder="Tìm ' + noun + ' theo tên, khu vực…" ' +
                          'oninput="Listing.tim(this.value)">' +
                  '</label>' +
                  '<select class="lst-filter" onchange="Listing.locTheoTrangThai(this.value)">' +
                      [['', 'Tất cả trạng thái'],
                       ['approved', 'Đang hiển thị'],
                       ['paused', 'Tạm ẩn'],
                       ['soldout', 'Đang tạm hết']]
                          .map(o => '<option value="' + o[0] + '"' +
                              (boLoc.trangThai === o[0] ? ' selected' : '') + '>' + o[1] + '</option>')
                          .join('') +
                  '</select>' +
              '</div>'
            : '';

        $('listing-panel').innerHTML =
            '<div class="lst-head">' +
                '<div>' +
                    '<h2>' + chuCua().tieuDe + '</h2>' +
                    '<p id="listing-count">' + (rows.length
                        ? rows.length + ' tin · ' + soDaDuyet + ' đang hiện cho khách'
                        : 'Chưa có tin nào') + '</p>' +
                '</div>' +
                congCu +
                '<button class="btn-primary" onclick="Listing.openForm()">' +
                    '<i data-lucide="plus"></i> Đăng ' + noun +
                '</button>' +
            '</div>' +
            '<div id="listing-list"></div>' +
            '<div id="listing-form-wrap"></div>';

        veLuoi();
    }

    /**
     * Ảnh hỏng thì đánh dấu ô bìa thay vì để icon ảnh vỡ của trình duyệt.
     *
     * Gắn bằng JS chứ không viết onerror thẳng trong HTML: chuỗi HTML ở đây
     * dựng bằng dấu nháy đơn, nhét thêm một lớp nháy nữa vào thuộc tính là
     * hỏng cả file.
     */
    function markBrokenCovers() {
        document.querySelectorAll('.listing-cover img').forEach((img) => {
            const fail = () => {
                img.parentNode.classList.add('listing-cover--empty');
                img.parentNode.insertAdjacentHTML('beforeend', '<span>Ảnh lỗi</span>');
                img.remove();
            };
            if (img.complete && img.naturalWidth === 0) fail();
            else img.addEventListener('error', fail, { once: true });
        });
    }

    /** Đường dẫn tới đúng chỗ khách nhìn thấy tin này. */
    function customerLink(row) {
        if (row.type === 'stay') {
            return 'phongnghi.html' + (row.area ? '?q=' + encodeURIComponent(row.area) : '');
        }
        if (row.type === 'food') return 'dacsan.html#' + encodeURIComponent(row.id);
        return 'tour.html?slug=' + encodeURIComponent(row.id);
    }

    // Mỗi kiểu đối tác một bộ chữ. Trước đây thẻ tin viết cứng theo khách sạn,
    // nên cơ sở đặc sản đăng một hộp bánh vẫn thấy "45.000đ / khách" và nút
    // "Hết phòng" — đọc xong không biết mình đang xem tin của ai.
    // Nhan nut "mo ban lai" phai NGAN: bon nut chia deu mot hang, chu dai qua
    // la tran de len nut ben canh.
    const CHU_THE = {
        stay: { donVi: '/ đêm', het: 'Hết phòng', mo: 'Mở lại', trang: 'trang Chỗ nghỉ' },
        tour: { donVi: '/ khách', het: 'Hết chỗ', mo: 'Mở lại', trang: 'trang Điểm đến' },
        food: { donVi: '', het: 'Hết hàng', mo: 'Mở bán', trang: 'trang Đặc sản' },
    };

    /** Ma tin dang cho nguoi doc: bo tien to ky thuat, viet hoa cho de doc lai. */
    const maTin = (id) => String(id || '').replace(/^lst_/, '').toUpperCase();

    function card(row) {
        const chu = CHU_THE[row.type] || CHU_THE.tour;

        // Dòng phụ dưới tên: thứ chủ tin cần liếc một cái là biết tin nào.
        const phu = (row.type === 'stay'
            ? [row.area, row.capacity ? row.capacity + ' khách' : '']
            : row.type === 'food'
                ? [row.area, row.stock ? 'còn ' + row.stock + ' ' + (row.unit || 'phần') : '']
                : [row.duration || (row.days ? row.days + ' ngày' : ''), row.pax]
        ).filter(Boolean).map(esc).join(' · ');

        const donVi = row.type === 'food'
            ? ' / ' + esc(row.unit || 'phần')
            : ' ' + chu.donVi;

        const pics = Array.isArray(row.images) && row.images.length
            ? row.images
            : (row.image ? [row.image] : []);

        // Nhãn trạng thái đặt ĐÈ lên ảnh: phần chữ bên dưới nhờ vậy bắt đầu
        // thẳng bằng cái tên, không phải chen nhãn vào cùng hàng với tên rồi
        // bóp tên xuống hai dòng.
        const nhan = '<span class="status-pill ' + (BADGE[row.status] || 'wait') + '">' +
                esc(row.status_label) + '</span>' +
            (row.sold_out ? '<span class="status-pill soldout">' + chu.het + '</span>' : '');

        const cover = pics.length
            ? '<div class="listing-cover">' +
                  '<img src="' + esc(pics[0]) + '" alt="' + esc(row.name) + '" loading="lazy">' +
                  (pics.length > 1 ? '<span class="listing-count">+' + (pics.length - 1) + ' ảnh</span>' : '') +
                  '<div class="listing-tags">' + nhan + '</div>' +
              '</div>'
            : '<div class="listing-cover listing-cover--empty">' +
                  '<span>Chưa có ảnh</span>' +
                  '<div class="listing-tags">' + nhan + '</div>' +
              '</div>';

        const nut = (
            (row.status === 'approved'
                ? '<button class="btn-sm-outline' + (row.sold_out ? ' warn' : '') + '" ' +
                  'onclick="Listing.toggleSoldOut(\'' + row.id + '\',' + (row.sold_out ? 'true' : 'false') + ')">' +
                  (row.sold_out ? chu.mo : 'Tạm hết') + '</button>'
                : '') +
            ((row.status === 'approved' || row.status === 'paused')
                ? '<button class="btn-sm-outline" onclick="Listing.toggle(\'' + row.id + '\',\'' + row.status + '\')">' +
                  (row.status === 'paused' ? 'Bật lại' : 'Tạm ẩn') + '</button>'
                : '') +
            '<button class="btn-sm-outline" onclick="Listing.openForm(\'' + row.id + '\')">Sửa</button>' +
            '<button class="btn-sm-outline danger" onclick="Listing.remove(\'' + row.id + '\')">Xoá</button>'
        );

        return '<div class="listing-card has-cover">' +
            cover +
            '<div class="listing-card-body">' +
                '<b class="listing-name">' + esc(row.name) + '</b>' +
                (phu ? '<span class="listing-sub">' + phu + '</span>' : '') +
                // Ma tin: chu hang doc cho LOCALMATE khi can hoi ve dung mon nay,
                // va khach thay cung ma do trong don da dat.
                '<span class="listing-ma" title="Mã sản phẩm">Mã ' + esc(maTin(row.id)) + '</span>' +
                '<div class="listing-price"><strong>' + money(row.price) + '</strong>' +
                    '<small>' + donVi + '</small></div>' +
                (row.description ? '<p class="listing-desc">' + esc(row.description) + '</p>' : '') +
                (row.reject_note ? '<p class="listing-reject">' + esc(row.reject_note) + '</p>' : '') +
                // Câu hỏi đối tác nào cũng hỏi: "đăng rồi thì khách thấy ở đâu?"
                // Trả lời ngay trên thẻ, kèm đường mở đúng trang đó — nói suông
                // thì họ vẫn không tin là tin của mình đã lên.
                (row.status === 'approved'
                    ? '<a class="listing-where" href="' + esc(customerLink(row)) + '" ' +
                      'target="_blank" rel="noopener">Xem trên ' + chu.trang + ' →</a>'
                    : '') +
                '<div class="listing-actions">' + nut + '</div>' +
            '</div>' +
        '</div>';
    }

    // ── Biểu mẫu đăng / sửa ──
    function openForm(id) {
        editingId = id || '';
        const row = rows.filter(r => r.id === editingId)[0] || {};
        coords = { lat: row.lat != null ? row.lat : null, lng: row.lng != null ? row.lng : null };
        const isStay = listingType === 'stay';

        const stayFields =
            '<div class="form-group"><label>Khu vực *</label>' +
                '<input type="text" id="lst-area" class="form-input" value="' + esc(row.area || '') + '" ' +
                'placeholder="Ví dụ: Núi Sam, Châu Đốc, An Giang">' +
                '<small class="form-hint">Ghi từ nhỏ tới lớn — khách tìm theo huyện hay thành phố sẽ ra đúng chỗ bạn.</small>' +
            '</div>' +
            '<div class="form-group"><label>Vị trí trên bản đồ *</label>' +
                '<div class="pickup-row">' +
                    '<input type="text" id="lst-address" class="form-input" ' +
                        'placeholder="Gõ địa chỉ, ví dụ: Miếu Bà Chúa Xứ, Châu Đốc, An Giang">' +
                    '<button type="button" class="btn-outline" onclick="Listing.findAddress()">Tìm</button>' +
                '</div>' +
                '<div id="lst-addr-results" class="addr-results"></div>' +

                '<div class="pickup-row" style="margin-top:8px">' +
                    '<input type="text" id="lst-coords" class="form-input" value="' +
                        (row.lat ? row.lat + ', ' + row.lng : '') + '" ' +
                        'placeholder="Hoặc dán toạ độ: 10.6800, 105.0900" ' +
                        'oninput="Listing.readCoords(this.value)">' +
                    '<button type="button" class="btn-outline" onclick="Listing.useMyLocation()">Lấy vị trí</button>' +
                '</div>' +
                '<small class="form-hint" id="lst-coords-hint">' +
                    'Ba cách, chọn cách nào cũng được: <b>gõ địa chỉ</b> rồi bấm Tìm · ' +
                    '<b>dán toạ độ</b> chép từ Google Maps · hoặc bấm <b>Lấy vị trí</b> khi ' +
                    'bạn đang đứng tại cơ sở.' +
                '</small>' +
            '</div>' +
            '<div class="form-group"><label>Tiện nghi</label>' +
                '<input type="text" id="lst-amenities" class="form-input" value="' +
                    esc((row.amenities || []).join(', ')) + '" placeholder="Điều hòa, Wifi, Ăn sáng, Bãi đậu xe">' +
                '<small class="form-hint">Ngăn cách bằng dấu phẩy</small>' +
            '</div>';

        const tourFields =
            '<div class="form-grid">' +
                '<div class="form-group"><label>Thời lượng</label>' +
                    '<input type="text" id="lst-duration" class="form-input" value="' + esc(row.duration || '') +
                    '" placeholder="Ví dụ: 1 ngày, 2 ngày 1 đêm"></div>' +
                '<div class="form-group"><label>Số khách nhận</label>' +
                    '<input type="text" id="lst-pax" class="form-input" value="' + esc(row.pax || '') +
                    '" placeholder="Ví dụ: 2–10 khách"></div>' +
            '</div>' +
            '<div class="form-group"><label>Điểm dừng</label>' +
                '<input type="text" id="lst-stops" class="form-input" value="' + esc(row.stops || '') +
                '" placeholder="Chùa Tà Pạ · Hồ Tà Pạ · Làng thốt nốt"></div>' +
            '<div class="form-group"><label>Giá đã gồm</label>' +
                '<input type="text" id="lst-includes" class="form-input" value="' +
                esc((row.includes || []).join(', ')) +
                '" placeholder="Hướng dẫn viên, Xe đưa đón, Bữa trưa, Vé tham quan">' +
                '<small class="form-hint">Ngăn cách bằng dấu phẩy</small></div>';

        // Số phòng giống nhau. Nhà nghỉ có 5 phòng đôi y hệt nhau thì khai một
        // tin số lượng 5, chứ đăng 5 tin thì mỗi lần đổi giá phải sửa năm lần
        // và khách nhìn trang tìm kiếm thấy năm dòng giống hệt nhau.
        const quantityField = isStay
            ? '<div class="form-group"><label>Số phòng giống nhau *</label>' +
                '<input type="number" id="lst-quantity" class="form-input" min="1" max="50" value="' +
                (row.quantity || 1) + '">' +
                '<small class="form-hint">Có bao nhiêu phòng y hệt nhau như thế này. ' +
                'Chỉ có một phòng thì để 1.</small></div>'
            : '';

        // Mức huỷ đơn. Chỉ ba mức, và câu chữ lấy từ máy chủ để trang đăng tin
        // với trang khách không bao giờ nói khác nhau về cùng một luật.
        const MUC_HUY = [
            ['linh_hoat', 'Linh hoạt', 'Huỷ trước 24 giờ hoàn đủ tiền cọc'],
            ['vua', 'Vừa phải', 'Trước 5 ngày hoàn đủ, trong 5 ngày hoàn một nửa'],
            ['chat', 'Chặt', 'Trước 14 ngày hoàn đủ, trong 7 ngày không hoàn'],
        ];
        const cancelField = isStay
            ? '<div class="form-group"><label>Mức huỷ đơn *</label>' +
                '<select id="lst-cancel" class="form-input">' +
                MUC_HUY.map(function (m) {
                    return '<option value="' + m[0] + '"' +
                        ((row.cancel_policy || 'vua') === m[0] ? ' selected' : '') + '>' +
                        m[1] + ' — ' + m[2] + '</option>';
                }).join('') +
                '</select>' +
                '<small class="form-hint">Khách nhìn thấy mức này trước khi đặt. ' +
                'Chọn chặt thì khách ngại đặt hơn, chọn linh hoạt thì dễ bị huỷ sát ngày — ' +
                'tuỳ mùa mà cân.</small></div>'
            : '';

        const foodFields =
            '<div class="form-grid">' +
                '<div class="form-group"><label>Giá gốc (đồng)</label>' +
                    '<input type="number" id="lst-oldprice" class="form-input" min="0" step="1000" value="' +
                    (row.old_price || '') + '" placeholder="Bỏ trống nếu không giảm giá">' +
                    '<small class="form-hint">Điền cao hơn giá bán thì trang sẽ gạch ngang giá này ' +
                    'và tự tính phần trăm giảm.</small></div>' +
                '<div class="form-group"><label>Số lượng còn</label>' +
                    '<input type="number" id="lst-stock" class="form-input" min="0" value="' +
                    (row.stock || '') + '" placeholder="Bỏ trống nếu không cần đếm">' +
                    '<small class="form-hint">Để trống là bán thoải mái, không theo dõi tồn.</small></div>' +
            '</div>' +
            '<div class="form-group"><label>Khu vực *</label>' +
                '<input type="text" id="lst-area" class="form-input" value="' + esc(row.area || '') + '" ' +
                'placeholder="Ví dụ: Trần Văn Thời, Cà Mau">' +
                '<small class="form-hint">Khách hay lọc theo tỉnh, ghi rõ tỉnh giúp mình nhé.</small>' +
            '</div>' +
            '<div class="form-group"><label>Gửi đi xa được không?</label>' +
                '<input type="text" id="lst-shipping" class="form-input" value="' + esc(row.shipping || '') +
                '" placeholder="Ví dụ: Gửi đi toàn quốc · Gửi lạnh trong 3 ngày · Chỉ bán tại chỗ">' +
                '<small class="form-hint">Đây là câu khách ngoài tỉnh hỏi đầu tiên.</small></div>' +
            '<div class="form-group"><label>Giữ được bao lâu?</label>' +
                '<input type="text" id="lst-keeping" class="form-input" value="' + esc(row.keeping || '') +
                '" placeholder="Ví dụ: 6 tháng nơi khô ráo · Ngăn đá 3 tháng"></div>';

        const secondField = isStay
            ? '<div class="form-group"><label>Sức chứa *</label>' +
                '<input type="number" id="lst-capacity" class="form-input" min="1" max="30" value="' +
                (row.capacity || 2) + '"><small class="form-hint">Số khách tối đa trong MỘT phòng</small></div>'
            : listingType === 'food'
            ? '<div class="form-group"><label>Bán theo đơn vị *</label>' +
                '<input type="text" id="lst-unit" class="form-input" value="' + esc(row.unit || '') +
                '" placeholder="phần · hũ 500g · kg · con"><small class="form-hint">' +
                'Giá ở trên là giá của MỘT đơn vị này</small></div>'
            : '<div class="form-group"><label>Số ngày *</label>' +
                '<input type="number" id="lst-days" class="form-input" min="1" max="7" value="' +
                (row.days || 1) + '"><small class="form-hint">Tour trong ngày thì để 1</small></div>';

        $('listing-form-wrap').innerHTML =
            '<div class="listing-form card-surface">' +
                '<h3>' + (editingId ? 'Sửa' : 'Đăng') + ' ' + chuCua().danhTu + '</h3>' +
                '<p class="listing-form-hint">' + (isStay
                    ? 'Điền đúng khu vực và toạ độ để hệ thống gợi ý phòng của bạn cho khách đang ở gần đó.'
                    : listingType === 'food'
                        ? 'Đặc sản không cần nhập toạ độ. Ghi rõ khu vực để khách tìm thấy món và biết nơi gửi hàng.'
                        : 'Tour của bạn sẽ hiện ở trang Khám phá và được đề xuất trong lịch trình phù hợp.') + '</p>' +
                '<div id="listing-error" class="auth-error hidden"></div>' +

                '<div class="form-group"><label>Tên ' + chuCua().danhTu + ' *</label>' +
                    '<input type="text" id="lst-name" class="form-input" value="' + esc(row.name || '') + '" ' +
                    'placeholder="' + (isStay ? 'Ví dụ: Phòng Deluxe view sông'
                        : listingType === 'food' ? 'Ví dụ: Mật ong rừng U Minh'
                            : 'Ví dụ: Một ngày khám phá Tri Tôn') + '">' +
                '</div>' +

                '<div class="form-grid">' +
                    '<div class="form-group"><label>Giá (đồng) *</label>' +
                        '<input type="number" id="lst-price" class="form-input" min="0" step="10000" value="' +
                        (row.price || '') + '" placeholder="' + (isStay ? '450000' : '590000') + '">' +
                        '<small class="form-hint">' + (isStay ? 'Mỗi đêm' : listingType === 'food' ? 'Cho một đơn vị bán' : 'Mỗi khách') + '</small></div>' +
                    secondField +
                    quantityField +
                '</div>' +

                (isStay ? stayFields : listingType === 'food' ? foodFields : tourFields) +
                cancelField +

                '<div class="form-group"><label>Mô tả</label>' +
                    '<textarea id="lst-description" class="form-input" rows="3" ' +
                    'placeholder="Vài dòng để khách hình dung">' + esc(row.description || '') + '</textarea></div>' +

                '<div class="form-group"><label>Ảnh</label>' +
                    '<input type="hidden" id="lst-image" value="' + esc(row.image || '') + '">' +
                    '<div class="listing-photo" id="lst-photo-box">' +
                        '<div class="listing-gallery" id="lst-gallery"></div>' +
                        '<div class="listing-photo-actions">' +
                            '<button type="button" class="btn-outline" onclick="document.getElementById(\'lst-file\').click()">' +
                                'Thêm ảnh</button>' +
                            '<input type="file" id="lst-file" accept="image/*" multiple ' +
                                'style="display:none" onchange="Listing.uploadPhoto(this)">' +
                            '<span id="lst-photo-hint" class="form-hint">' +
                                'Chọn nhiều ảnh cùng lúc cũng được. Ảnh sẽ tự nén nhỏ lại trước khi gửi.' +
                            '</span>' +
                        '</div>' +
                    '</div>' +
                '</div>' +

                '<div class="wiz-nav" style="margin-top:20px">' +
                    '<button class="btn-primary" id="lst-submit" onclick="Listing.submit()">' +
                        (editingId ? 'Lưu thay đổi' : 'Gửi đăng') + '</button>' +
                    '<button class="btn-outline" onclick="Listing.closeForm()">Huỷ</button>' +
                '</div>' +
                (editingId
                    ? '<p class="listing-form-hint" style="margin-top:12px">Lưu xong, thay đổi hiển thị ngay cho khách.</p>'
                    : '') +
            '</div>';

        // Nạp ảnh sẵn có của tin đang sửa. Phải đặt ở đây — trong openForm(),
        // nơi biến row thật sự tồn tại.
        photos = Array.isArray(row.images) && row.images.length
            ? [...row.images]
            : (row.image ? [row.image] : []);
        renderGallery();

        if (window.lucide) lucide.createIcons();
        $('listing-form-wrap').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function closeForm() {
        const wrap = $('listing-form-wrap');
        if (wrap) wrap.innerHTML = '';
        editingId = '';
    }

    /**
     * Đọc toạ độ do đối tác gõ hoặc dán vào.
     *
     * Trước đây ô này readonly, chỉ điền được bằng nút "Lấy vị trí" — nghĩa là
     * chủ khách sạn PHẢI đang đứng tại chính cơ sở của mình mới đăng được
     * phòng. Ngồi nhà buổi tối đăng thì tắc hoàn toàn, mà đó mới là lúc người
     * ta rảnh để đăng.
     *
     * Nhận đủ các kiểu Google Maps hay cho ra: "10.68, 105.09",
     * "10.68,105.09", và cả khi dán nguyên đoạn có chữ lẫn vào.
     */
    /**
     * Gõ địa chỉ → hệ thống tra ra toạ độ.
     *
     * Đây là cách tự nhiên nhất với chủ khách sạn: họ biết địa chỉ cơ sở của
     * mình, không ai biết vĩ độ kinh độ. Hai cách kia (dán toạ độ, lấy GPS)
     * vẫn giữ vì mỗi người tiện một kiểu.
     */
    async function findAddress() {
        const box = $('lst-addr-results');
        const q = ($('lst-address') && $('lst-address').value || '').trim();

        if (q.length < 3) {
            box.innerHTML = '<p class="addr-note">Gõ ít nhất 3 ký tự, càng rõ càng dễ tìm.</p>';
            return;
        }

        box.innerHTML = '<p class="addr-note">Đang tìm…</p>';
        try {
            const res = await fetch('/v1/geocode/search?q=' + encodeURIComponent(q));
            const body = await res.json();
            if (!res.ok) throw new Error(body.error && body.error.message);

            const list = body.data || [];
            if (!list.length) {
                box.innerHTML = '<p class="addr-note">' + esc(body.message || 'Không tìm thấy.') + '</p>';
                return;
            }

            // Cho khách chọn — tên gần giống nhau rất nhiều ở miền Tây, chọn
            // giùm họ là dễ gắn nhầm vị trí cơ sở sang xã khác.
            box.innerHTML = list.map(function (x, i) {
                return '<button type="button" class="addr-item" onclick="Listing.pickAddress(' + i + ')">' +
                    '<b>' + esc(x.name.split(',')[0]) + '</b>' +
                    '<span>' + esc(x.name) + '</span>' +
                '</button>';
            }).join('');
            addrResults = list;
        } catch (e) {
            box.innerHTML = '<p class="addr-note">' + esc(e.message || 'Chưa tra được.') + '</p>';
        }
    }

    /** Chọn một kết quả → điền toạ độ vào form. */
    function pickAddress(i) {
        const x = addrResults[i];
        if (!x) return;
        coords = { lat: x.lat, lng: x.lng };
        if ($('lst-coords')) $('lst-coords').value = x.lat + ', ' + x.lng;
        if ($('lst-coords-hint')) {
            $('lst-coords-hint').innerHTML = 'Đã chọn: <b>' + esc(x.name) + '</b>';
        }
        $('lst-addr-results').innerHTML = '';
        // Ô khu vực để trống thì điền giúp luôn, đỡ gõ hai lần
        const area = $('lst-area');
        if (area && !area.value.trim()) {
            area.value = x.name.split(',').slice(1, 4).join(',').trim();
        }
    }

    function readCoords(text) {
        const hint = $('lst-coords-hint');
        const nums = String(text || '').match(/-?\d+(?:\.\d+)?/g) || [];

        if (nums.length < 2) {
            coords = { lat: null, lng: null };
            if (hint && text.trim()) hint.textContent = 'Cần hai số: vĩ độ rồi tới kinh độ.';
            return;
        }

        const lat = Number.parseFloat(nums[0]);
        const lng = Number.parseFloat(nums[1]);

        // Việt Nam nằm trong khoảng này. Kiểm tra để bắt lỗi đảo hai số —
        // rất hay gặp vì Google Maps hiện chúng liền nhau.
        if (lat < 8 || lat > 24 || lng < 102 || lng > 110) {
            coords = { lat: null, lng: null };
            if (hint) {
                hint.textContent = 'Toạ độ nằm ngoài Việt Nam. Bạn kiểm tra xem có nhầm '
                    + 'thứ tự vĩ độ / kinh độ không (vĩ độ khoảng 8–24, kinh độ khoảng 102–110).';
            }
            return;
        }

        coords = { lat, lng };
        if (hint) hint.textContent = 'Đã nhận toạ độ: ' + lat + ', ' + lng;
    }

    function useMyLocation() {
        const hint = $('lst-coords-hint');
        if (!navigator.geolocation) { hint.textContent = 'Trình duyệt không hỗ trợ định vị.'; return; }
        hint.textContent = 'Đang lấy vị trí…';
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                coords = {
                    lat: Math.round(pos.coords.latitude * 1e6) / 1e6,
                    lng: Math.round(pos.coords.longitude * 1e6) / 1e6,
                };
                $('lst-coords').value = coords.lat + ', ' + coords.lng;
                hint.textContent = 'Đã lấy được vị trí. Nếu bạn không đứng ở cơ sở, hãy tới đó rồi bấm lại.';
            },
            () => { hint.textContent = 'Cần cho phép truy cập vị trí, hoặc gọi 0833 385 601 để LOCALMATE nhập giúp.'; },
            { enableHighAccuracy: true, timeout: 10000 },
        );
    }

    // Ảnh đang có của tin. Giữ trong biến chứ không đọc ngược từ DOM, để
    // xoá/sắp xếp không phụ thuộc thứ tự thẻ trên màn hình.
    let photos = [];
    let addrResults = [];

    function renderGallery() {
        const box = $('lst-gallery');
        if (!box) return;
        box.innerHTML = photos.length
            ? photos.map((url, i) =>
                '<figure class="lst-thumb' + (i === 0 ? ' cover' : '') + '">' +
                    '<img src="' + esc(url) + '" alt="Ảnh ' + (i + 1) + '">' +
                    (i === 0 ? '<figcaption>Ảnh bìa</figcaption>' : '') +
                    '<button type="button" class="lst-thumb-x" title="Xoá ảnh này" ' +
                        'onclick="Listing.removePhoto(' + i + ')">×</button>' +
                    (i > 0
                        ? '<button type="button" class="lst-thumb-first" title="Đặt làm ảnh bìa" ' +
                            'onclick="Listing.makeCover(' + i + ')">Đặt làm bìa</button>'
                        : '') +
                '</figure>').join('')
            : '<p class="lst-empty">Chưa có ảnh nào. Ảnh thật, rõ sản phẩm giúp khách tin và bấm xem nhiều hơn.</p>';
        $('lst-image').value = photos[0] || '';
    }

    function removePhoto(i) {
        photos.splice(i, 1);
        renderGallery();
    }

    /** Ảnh đầu tiên là ảnh bìa — thứ khách nhìn thấy trong danh sách. */
    function makeCover(i) {
        const [pick] = photos.splice(i, 1);
        photos.unshift(pick);
        renderGallery();
    }

    /**
     * Nén ảnh NGAY TRÊN MÁY trước khi gửi.
     *
     * Vì sao bắt buộc phải có bước này: ảnh chụp bằng điện thoại đời mới nặng
     * 4–8 MB. Gửi thẳng thì vừa bị chặn vì quá nặng, vừa mất hàng phút trên
     * sóng 3G ở vùng núi — chủ khách sạn thử một lần rồi bỏ luôn.
     *
     * Vẽ lại qua canvas còn giải quyết thêm hai chuyện: cạnh dài quá 1600 px
     * là thừa với màn hình điện thoại, và ảnh gốc mang theo toạ độ GPS chụp
     * ảnh trong EXIF — không nên đưa lên mạng.
     */
    function shrink(file) {
        return new Promise((resolve, reject) => {
            const url = URL.createObjectURL(file);
            const img = new Image();

            img.onload = () => {
                URL.revokeObjectURL(url);
                const MAX = 2000;   // đủ nét cả khi khách xem toàn màn hình
                const scale = Math.min(1, MAX / Math.max(img.width, img.height));
                const w = Math.round(img.width * scale);
                const h = Math.round(img.height * scale);

                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);

                canvas.toBlob(
                    (blob) => (blob ? resolve(blob) : reject(new Error('Không xử lý được ảnh này.'))),
                    'image/jpeg',
                    // 0.9 thay vì 0.82: ảnh phòng là thứ bán hàng, nén tay quá
                    // thì mảng tường trơn và rèm cửa nổi vệt, nhìn rẻ tiền.
                    // Chênh nhau vài chục KB, không đáng tiết kiệm.
                    0.9,
                );
            };

            img.onerror = () => {
                URL.revokeObjectURL(url);
                // iPhone mặc định chụp ra HEIC mà Chrome/Firefox không đọc được.
                // Nói thẳng cách sửa, chứ báo "lỗi" chung chung thì họ chịu.
                reject(new Error(
                    'Trình duyệt không đọc được ảnh này. Nếu bạn dùng iPhone, vào '
                    + 'Cài đặt → Camera → Định dạng → chọn "Tương thích nhất", rồi chụp lại.',
                ));
            };

            img.src = url;
        });
    }

    /** Tải nhiều ảnh lên, làm lần lượt để báo tiến độ cho rõ. */
    async function uploadPhoto(input) {
        const files = [...(input.files || [])];
        if (!files.length) return;

        const hint = $('lst-photo-hint');
        const token = await BayNuiAuth.token();
        let done = 0;

        for (const file of files) {
            hint.textContent = 'Đang xử lý ảnh ' + (done + 1) + '/' + files.length + '…';
            try {
                const blob = await shrink(file);
                const res = await fetch('/v1/uploads/image', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'image/jpeg',
                        ...(token ? { Authorization: 'Bearer ' + token } : {}),
                    },
                    body: blob,
                });
                const body = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error((body.error && body.error.message) || 'Không tải được ảnh.');

                photos.push(body.url);
                done += 1;
                renderGallery();
            } catch (e) {
                hint.textContent = e.message;
                input.value = '';
                return;
            }
        }

        hint.textContent = 'Đã thêm ' + done + ' ảnh. Ảnh đầu tiên là ảnh bìa.';
        input.value = '';
    }

    const val = (id) => ($(id) ? $(id).value.trim() : '');

    async function submit() {
        const btn = $('lst-submit');
        const err = $('listing-error');
        err.classList.add('hidden');
        btn.disabled = true;

        const isStay = listingType === 'stay';
        const body = {
            name: val('lst-name'),
            price: parseInt(val('lst-price'), 10) || 0,
            description: val('lst-description'),
            image: photos[0] || '',
            images: photos,
        };
        if (isStay) {
            body.area = val('lst-area');
            body.capacity = parseInt(val('lst-capacity'), 10) || 2;
            body.quantity = parseInt(val('lst-quantity'), 10) || 1;
            body.cancel_policy = val('lst-cancel') || 'vua';
            body.lat = coords.lat;
            body.lng = coords.lng;
            body.amenities = val('lst-amenities');
        } else if (listingType === 'food') {
            body.area = val('lst-area');
            body.unit = val('lst-unit') || 'phần';
            body.shipping = val('lst-shipping');
            body.keeping = val('lst-keeping');
            body.old_price = parseInt(val('lst-oldprice'), 10) || 0;
            body.stock = parseInt(val('lst-stock'), 10) || 0;
        } else {
            body.days = parseInt(val('lst-days'), 10) || 1;
            body.duration = val('lst-duration');
            body.pax = val('lst-pax');
            body.stops = val('lst-stops');
            body.includes = val('lst-includes');
        }

        try {
            const result = editingId
                ? await api('/v1/partner/listings/' + editingId, { method: 'PATCH', body: JSON.stringify(body) })
                : await api('/v1/partner/listings', { method: 'POST', body: JSON.stringify(body) });
            closeForm();
            await load(Partner.currentPartner());
            Partner.toast(result.message || 'Đã lưu.');
        } catch (e) {
            err.textContent = e.message;
            err.classList.remove('hidden');
        } finally {
            btn.disabled = false;
        }
    }

    /**
     * Bật/tắt "tạm hết phòng".
     *
     * Khác hẳn "Tạm ẩn": tạm ẩn gỡ tin khỏi trang khách hẳn, còn tạm hết thì
     * tin vẫn hiện, khách biết chỗ này có thật, chỉ là lúc này không đặt được.
     * Đổi cờ này KHÔNG phải chờ duyệt lại — chặn đặt trùng là việc gấp.
     */
    async function toggleSoldOut(id, soldOut) {
        try {
            const r = await api('/v1/partner/listings/' + id + '/soldout', {
                method: 'PATCH',
                body: JSON.stringify({ sold_out: !soldOut }),
            });
            await load(Partner.currentPartner());
            if (Partner.toast) Partner.toast(r.message);
        } catch (e) { alert(e.message); }
    }

    async function toggle(id, status) {
        try {
            await api('/v1/partner/listings/' + id, {
                method: 'PATCH',
                body: JSON.stringify({ status: status === 'paused' ? 'approved' : 'paused' }),
            });
            await load(Partner.currentPartner());
        } catch (e) { alert(e.message); }
    }

    async function remove(id) {
        const row = rows.filter(r => r.id === id)[0];
        if (!confirm('Xoá "' + (row ? row.name : 'tin này') + '"? Khách sẽ không còn thấy nữa.')) return;
        try {
            await api('/v1/partner/listings/' + id, { method: 'DELETE' });
            await load(Partner.currentPartner());
        } catch (e) { alert(e.message); }
    }

    return { load, tim, locTheoTrangThai, openForm, closeForm, submit, toggle, toggleSoldOut, remove, useMyLocation, readCoords, findAddress, pickAddress, uploadPhoto, removePhoto, makeCover };
})();
