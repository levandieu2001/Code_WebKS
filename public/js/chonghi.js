// ============================================================
// LOCALMATE — Trang một chỗ nghỉ
// ============================================================
// Trước đây bấm vào thẻ chỗ nghỉ là mở thẳng ô đặt phòng. Khách không xem
// được thư viện ảnh, tiện nghi đầy đủ, vị trí trên bản đồ hay đánh giá —
// trong khi đó đúng là những thứ người ta cân nhắc trước khi trả tiền.
//
// Hệ thống đánh giá thì chạy đủ: khách viết được, đối tác trả lời được, đối
// tác xem được phổ điểm. Chỉ thiếu đúng một chỗ — phía khách không có màn
// hình nào hiện ra. Công sức bỏ ra mà không ai đọc được.
//
// Thứ tự trên trang theo đúng thứ tự khách quyết định: nhìn ảnh → xem giá và
// còn phòng không → đọc tiện nghi → xem người khác nói gì → mới bấm đặt.
// ============================================================

(() => {
    'use strict';

    const $ = (id) => document.getElementById(id);
    const esc = (s) => String(s == null ? '' : s)
        .replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const tien = (n) => Number(n || 0).toLocaleString('vi-VN') + 'đ';
    const T = (vi, en) => (window.LMLang ? LMLang.T(vi, en) : vi);

    const dmy = (iso) => {
        const [y, m, d] = String(iso || '').slice(0, 10).split('-');
        return d ? `${d}/${m}/${y}` : '';
    };
    const sao = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);

    let CHO = null;
    let anhDangXem = 0;

    /** Mã chỗ nghỉ lấy từ đường dẫn: chonghi.html?id=... */
    const layMa = () => new URLSearchParams(location.search).get('id') || '';

    async function nap() {
        const ma = layMa();
        const host = $('cn-body');

        if (!ma) {
            host.innerHTML = '<div class="cn-trong">'
                + T('Thiếu mã chỗ nghỉ. Bạn quay lại danh sách rồi chọn một chỗ nhé.',
                    'Missing stay id. Please go back to the list and pick a place.')
                + '</div>';
            return;
        }

        let r;
        try {
            const res = await fetch('/v1/stays/' + encodeURIComponent(ma));
            r = await res.json();
            if (!res.ok) throw new Error((r.error && r.error.message) || 'Không tải được.');
        } catch (err) {
            host.innerHTML = '<div class="cn-trong">' + esc(err.message)
                + '<br><a href="phongnghi.html" style="color:var(--lm-blue);font-weight:600">'
                + T('Xem các chỗ nghỉ khác', 'Browse other stays') + '</a></div>';
            return;
        }

        CHO = r.data;
        document.title = CHO.name + ' | LOCALMATE';
        ve(r);
        if (window.lucide) lucide.createIcons();
    }

    function ve(r) {
        const c = CHO;
        const dg = r.reviews || { data: [], summary: {} };
        const tt = dg.summary || {};

        $('cn-body').innerHTML =
            veDau(c, tt)
            + veAnh(c)
            + '<div class="cn-cot"><div>'
            + veThongTin(c)
            + veDanhGia(dg)
            + '</div>'
            + veODat(c)
            + '</div>';

        ganDaiAnh();
    }

    function veDau(c, tt) {
        const nhan = [];
        if (c.sold_out) {
            nhan.push('<span class="cn-tag het">' + T('Tạm hết phòng', 'Fully booked') + '</span>');
        }
        if (c.self_listed) {
            nhan.push('<span class="cn-tag">' + T('Đối tác tự đăng', 'Listed by partner') + '</span>');
        }
        if (c.partner_verified) {
            nhan.push('<span class="cn-tag xac-minh"><i data-lucide="shield-check" '
                + 'style="width:12px;height:12px;vertical-align:-2px"></i> '
                + T('Đã xác minh danh tính', 'Identity verified') + '</span>');
        }

        // Chỉ hiện điểm sao khi CÓ đánh giá thật. Hiện "0 sao" hay "chưa có
        // đánh giá" kèm mấy ngôi sao rỗng thì nhìn như chỗ này bị chê.
        const diem = tt.count
            ? '<span class="cn-sao">★ ' + tt.average + '</span>'
              + '<span>' + tt.count + ' ' + T('đánh giá', 'reviews') + '</span>'
            : '';

        return '<div class="cn-head"><h1>' + esc(c.name) + '</h1>'
            + '<div class="cn-meta">'
            + (c.area ? '<span><i data-lucide="map-pin"></i>' + esc(c.area) + '</span>' : '')
            + '<span><i data-lucide="users"></i>' + c.capacity + ' ' + T('khách', 'guests') + '</span>'
            + (c.quantity > 1
                ? '<span><i data-lucide="door-open"></i>' + c.quantity + ' '
                  + T('phòng giống nhau', 'identical rooms') + '</span>'
                : '')
            + diem
            + nhan.join('')
            + '</div></div>';
    }

    function veAnh(c) {
        const anh = c.images && c.images.length ? c.images : [c.image].filter(Boolean);
        if (!anh.length) {
            return '<div class="cn-anh-lon" style="display:grid;place-items:center;color:#7a879c">'
                + T('Chỗ này chưa có ảnh', 'No photos yet') + '</div>';
        }
        return '<div class="cn-anh-lon"><img id="cn-anh" src="' + esc(anh[0]) + '" alt="'
            + esc(c.name) + '"></div>'
            + (anh.length > 1
                ? '<div class="cn-dai" id="cn-dai">'
                  + anh.map((u, i) => '<button data-i="' + i + '"'
                      + (i === 0 ? ' class="dang-xem"' : '') + '>'
                      + '<img src="' + esc(u) + '" alt="" loading="lazy"></button>').join('')
                  + '</div>'
                : '');
    }

    function ganDaiAnh() {
        const dai = $('cn-dai');
        if (!dai) return;
        dai.addEventListener('click', (e) => {
            const nut = e.target.closest('button[data-i]');
            if (!nut) return;
            anhDangXem = Number(nut.dataset.i);
            const anh = CHO.images && CHO.images.length ? CHO.images : [CHO.image];
            $('cn-anh').src = anh[anhDangXem];
            dai.querySelectorAll('button').forEach(b => b.classList.remove('dang-xem'));
            nut.classList.add('dang-xem');
        });
    }

    function veThongTin(c) {
        const banDo = (c.lat && c.lng)
            ? '<div class="cn-khoi"><h2>' + T('Vị trí', 'Location') + '</h2>'
              + '<p>' + esc(c.area || '') + '</p>'
              + '<a class="lm-btn lm-btn-primary" target="_blank" rel="noopener" '
              + 'href="https://www.google.com/maps/search/?api=1&query=' + c.lat + ',' + c.lng + '">'
              + '<i data-lucide="map"></i> ' + T('Mở trên Google Maps', 'Open in Google Maps')
              + '</a></div>'
            : '';

        return (c.description
                ? '<div class="cn-khoi"><h2>' + T('Về chỗ này', 'About this place') + '</h2>'
                  + '<p>' + esc(c.description) + '</p></div>'
                : '')
            + (c.amenities && c.amenities.length
                ? '<div class="cn-khoi"><h2>' + T('Tiện nghi', 'Amenities') + '</h2>'
                  + '<div class="cn-tien-nghi">'
                  + c.amenities.map(a => '<span><i data-lucide="check"></i>' + esc(a) + '</span>').join('')
                  + '</div></div>'
                : '')
            + banDo;
    }

    function veDanhGia(dg) {
        const tt = dg.summary || {};
        const list = dg.data || [];

        if (!tt.count) {
            return '<div class="cn-khoi"><h2>' + T('Đánh giá của khách', 'Guest reviews') + '</h2>'
                + '<div class="cn-trong">'
                + T('Chỗ này chưa có đánh giá nào. Khách chỉ đánh giá được sau khi đã ở xong, '
                    + 'nên chưa có nghĩa là chưa ai đi — không phải bị chê.',
                    'No reviews yet. Guests can only review after their stay is completed, '
                    + 'so "none yet" does not mean it was rated poorly.')
                + '</div></div>';
        }

        const b = tt.breakdown || {};
        const pho = [5, 4, 3, 2, 1].map((n) => {
            const so = Number(b[n] || 0);
            const pct = tt.count ? Math.round((so / tt.count) * 100) : 0;
            return '<div class="cn-hang"><span class="lb">' + n + '★</span>'
                + '<span class="bar"><i style="width:' + pct + '%"></i></span>'
                + '<span class="n">' + so + '</span></div>';
        }).join('');

        return '<div class="cn-khoi"><h2>' + T('Đánh giá của khách', 'Guest reviews') + '</h2>'
            + '<div class="cn-tong-sao">'
            + '<div><div class="cn-diem">' + tt.average + '</div>'
            + '<small>' + tt.count + ' ' + T('đánh giá', 'reviews') + '</small></div>'
            + '<div class="cn-pho">' + pho + '</div></div>'
            + list.map(r =>
                '<div class="cn-dg"><div class="cn-dg-top">'
                + '<span><b style="color:#e8a33d">' + sao(r.rating) + '</b> &nbsp; '
                + esc(r.guest_name || T('Khách', 'Guest')) + '</span>'
                + '<span>' + esc(dmy(r.created_at)) + '</span></div>'
                + (r.comment ? '<p class="cn-dg-cmt">' + esc(r.comment) + '</p>' : '')
                + (r.reply
                    ? '<div class="cn-dg-rep"><b>' + T('Chủ nhà trả lời', 'Host replied') + ':</b> '
                      + esc(r.reply.text) + '</div>'
                    : '')
                + '</div>').join('')
            + '</div>';
    }

    function veODat(c) {
        const goi = c.partner_phone
            ? '<div class="cn-goi"><i data-lucide="phone" style="width:15px;height:15px"></i>'
              + T('Muốn hỏi trước:', 'Questions first:') + ' <a href="tel:'
              + esc(c.partner_phone.replace(/\s/g, '')) + '">' + esc(c.partner_phone) + '</a></div>'
            : '';

        return '<aside><div class="cn-dat">'
            + '<div class="cn-gia">' + tien(c.price)
            + '<small>/' + T('đêm', 'night') + '</small></div>'
            + (c.partner_name
                ? '<p style="margin:8px 0 0;font-size:13.5px;color:var(--lm-muted)">'
                  + T('Chủ nhà:', 'Host:') + ' <b>' + esc(c.partner_name) + '</b></p>'
                : '')
            + '<button class="lm-btn lm-btn-cta cn-dat-nut" id="cn-dat-nut"'
            + (c.sold_out ? ' disabled' : '') + '>'
            + (c.sold_out ? T('Tạm hết phòng', 'Fully booked') : T('Chọn ngày & đặt', 'Pick dates & book'))
            + '</button>'
            + (c.busy_nights && c.busy_nights.length
                ? '<p style="margin:12px 0 0;font-size:12.5px;color:var(--lm-muted);line-height:1.7">'
                  + T('Đã kín các đêm:', 'Already booked:') + ' <b>'
                  + c.busy_nights.slice(0, 5).map(dmy).join(', ')
                  + (c.busy_nights.length > 5
                      ? ' ' + T('và', 'and') + ' ' + (c.busy_nights.length - 5) + ' ' + T('đêm nữa', 'more')
                      : '')
                  + '</b></p>'
                : '')
            + '<div class="cn-huy"><b>' + T('Mức huỷ đơn', 'Cancellation') + ' — '
            + esc(c.cancel_policy_name) + ':</b><br>' + esc(c.cancel_policy_text)
            + ' <a href="dieukhoan.html#huy" style="color:var(--lm-blue)">'
            + T('Xem đầy đủ', 'Full policy') + '</a></div>'
            + goi
            + '</div></aside>';
    }

    /**
     * Mở ô đặt phòng.
     *
     * Gắn bằng addEventListener chứ không dùng onclick trong chuỗi HTML: tên
     * chỗ nghỉ do đối tác tự gõ, có dấu nháy là chuỗi vỡ. Đằng nào cũng phải
     * dựng lại đối tượng, gắn sự kiện gọn hơn mà không sợ vỡ.
     */
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#cn-dat-nut') || !CHO || CHO.sold_out) return;
        if (typeof BayNuiBooking === 'undefined') {
            alert(T('Chưa mở được ô đặt phòng, bạn tải lại trang giúp mình nhé.',
                'Could not open the booking box. Please reload the page.'));
            return;
        }
        BayNuiBooking.open('hotel', {
            id: CHO.id,
            name: CHO.name,
            price: CHO.price,
            image_url: CHO.image,
            capacity: CHO.capacity,
            partner_name: CHO.partner_name,
            cancel_policy: CHO.cancel_policy,
            ...StayDates.read(location.search),
        });
    });

    // Đổi ngôn ngữ thì vẽ lại: chữ trong trang này do JS dựng nên không có
    // data-i18n để tự đổi theo.
    document.addEventListener('lmlang', () => { if (CHO) nap(); });

    document.addEventListener('DOMContentLoaded', nap);
})();
