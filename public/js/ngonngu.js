// ============================================================
// LOCALMATE — Nút đổi ngôn ngữ dùng chung
// ============================================================
// Trước đây nút VI/EN được chép tay vào từng trang. Chép tay thì có trang
// chép, có trang quên: khách bấm EN ở trang Khám phá rồi sang Trang chủ là
// mất luôn nút, mà chữ thì vẫn tiếng Việt. Nửa vời còn khó chịu hơn là
// không có.
//
// Nay nút TỰ CHÈN vào thanh điều hướng của mọi trang có nạp tệp này, đọc
// chung một chỗ nhớ (baynui_lang), nên chọn EN ở đâu thì cả web là EN.
//
// Bản dịch nằm ở hai nơi và cố tình như vậy:
//   - app.js  giữ TRANSLATIONS của những trang cũ (phòng nghỉ, khám phá…)
//   - tệp này giữ phần cho những trang mới (trang chủ, đặc sản, đối tác)
// Lúc chạy thì gộp lại làm một. Bê hết vào app.js thì bốn trang mới phải nạp
// nguyên một tệp lớn chỉ để lấy vài chục dòng chữ.
// ============================================================

const LMLang = (() => {
    const KHOA = 'baynui_lang';

    // ── Bản dịch cho các trang mới ──
    // Quy ước đặt tên: <trang>_<chỗ>. Trùng khoá với app.js thì app.js thắng,
    // vì mấy trang cũ đã dịch xong và đã kiểm rồi.
    const TU_DIEN = {
        // Thanh điều hướng — mọi trang đều dùng
        nav_home: { vi: 'Trang chủ', en: 'Home' },
        nav_stay: { vi: 'Chỗ nghỉ', en: 'Stays' },
        nav_rooms: { vi: 'Chỗ nghỉ', en: 'Stays' },
        nav_partner: { vi: 'Đối tác', en: 'Partners' },
        nav_food: { vi: 'Đặc sản', en: 'Local food' },
        nav_specialty: { vi: 'Đặc sản', en: 'Local specialties' },
        nav_tour: { vi: 'Tour', en: 'Tours' },
        // Cho khop voi thanh dieu huong cua cac trang khac: o day tung ghi
        // 'Kham pha', app.js ghi 'Diem den' — trang nao chi nap ngonngu.js
        // thi hien mot dang khac han cac trang con lai.
        nav_explore: { vi: 'Điểm đến', en: 'Destinations' },
        nav_contact: { vi: 'Liên hệ', en: 'Contact' },
        nav_partner_cta: { vi: 'Đăng chỗ của bạn', en: 'List your place' },
        nav_orders: { vi: 'Đơn của tôi', en: 'My bookings' },

        nav_dest: { vi: 'Điểm đến', en: 'Destinations' },
        nav_partner: { vi: 'Đối tác', en: 'Partners' },

        // ── Trang chủ ──
        // Câu tiếng Anh KHÔNG dịch sát từng chữ. "Miền Tây / người bản địa dẫn
        // đường" dịch thẳng ra "Western region / locals lead the way" thì
        // khách nước ngoài không biết đó là vùng nào — họ biết cái tên
        // "Mekong Delta". Dịch để người ta hiểu, không phải để khớp chữ.
        home_hero_h1: {
            vi: 'Miền Tây<em>người bản địa dẫn đường</em>',
            en: 'The Mekong Delta<em>shown to you by the people who live there</em>',
        },
        home_hero_p: {
            vi: 'Chỗ nghỉ, xe đưa đón, tour và đặc sản — tất cả do chính người dân miền Tây làm chủ, đặt gọn trong một nơi.',
            en: 'Stays, transfers, tours and local specialties — all run by Delta families, all bookable in one place.',
        },
        home_tab_stay: { vi: 'Chỗ nghỉ', en: 'Stays' },
        home_tab_ride: { vi: 'Xe đưa đón', en: 'Transfers' },
        home_tab_tour: { vi: 'Tour', en: 'Tours' },
        home_tab_food: { vi: 'Đặc sản', en: 'Local food' },
        home_search_btn: { vi: 'Tìm kiếm', en: 'Search' },

        home_trust1_b: { vi: 'Chủ nhà là người bản địa', en: 'Hosts are local people' },
        home_trust1_s: { vi: 'Không qua trung gian tầng hai', en: 'No second-hand middlemen' },
        home_trust2_b: { vi: 'Giá hiện đúng như chủ đăng', en: 'The price you see is the host\'s price' },
        home_trust2_s: { vi: 'Không phụ phí ẩn', en: 'No hidden fees' },
        home_trust3_b: { vi: 'Đặt cọc giữ chỗ an toàn', en: 'Deposits held safely' },
        home_trust3_s: { vi: 'LOCALMATE giữ hộ tới lúc nhận phòng', en: 'LOCALMATE holds it until check-in' },
        home_trust4_b: { vi: 'Trợ lý trả lời 24/7', en: 'Assistant answers 24/7' },
        home_trust4_s: { vi: 'Chỉ nói theo dữ liệu thật', en: 'Answers only from real listings' },

        home_stays_h2: { vi: 'Chỗ nghỉ của đối tác', en: 'Stays from our partners' },
        home_foods_h2: { vi: 'Đặc sản địa phương', en: 'Local specialties' },
        home_tours_h2: { vi: 'Tour do người địa phương dẫn', en: 'Tours led by locals' },
        home_dests_h2: { vi: 'Điểm đến miền Tây', en: 'Where to go in the Delta' },
        home_view_all: { vi: 'Xem tất cả', en: 'See all' },

        home_cta_eyebrow: { vi: 'Cùng LOCALMATE', en: 'With LOCALMATE' },
        home_cta_h2: { vi: 'Cùng nhau đón khách', en: 'Host together with us' },
        home_cta_note: { vi: 'Khách đang tìm bạn!', en: 'Travellers are looking for you!' },
        home_cta_p: {
            vi: 'Bạn có homestay, xe, tour hay đặc sản? <b>Không mất phí đăng tin</b> '
                + '— chỉ tính hoa hồng khi bạn có đơn.',
            en: 'Run a homestay, a car, a tour or a food business? <b>No listing fee</b> '
                + '— commission only when you earn.',
        },
        home_cta_btn: { vi: 'Đăng ký làm đối tác', en: 'Become a partner' },

        // ── Chân trang ──
        foot_about: {
            vi: 'Nền tảng kết nối khách du lịch với homestay, tài xế, đơn vị tour và cơ sở đặc sản địa phương khắp Đồng bằng sông Cửu Long.',
            en: 'A platform connecting travellers with homestays, drivers, tour operators and local food producers across the Mekong Delta.',
        },
        foot_travellers: { vi: 'Khách du lịch', en: 'Travellers' },
        foot_partners: { vi: 'Đối tác', en: 'Partners' },
        foot_contact: { vi: 'Liên hệ', en: 'Contact' },
        foot_find_stay: { vi: 'Tìm chỗ nghỉ', en: 'Find a stay' },
        foot_order_food: { vi: 'Đặt đặc sản', en: 'Order local food' },
        foot_workspace: { vi: 'Kênh đối tác', en: 'Partner workspace' },
        foot_post: { vi: 'Đăng phòng, tour, đặc sản', en: 'List rooms, tours, specialties' },
        contact_email_note: {
            vi: 'Thư đặt phòng và hợp tác đều gửi về địa chỉ này',
            en: 'Bookings and partnership enquiries both go to this address',
        },
        foot_terms: { vi: 'Điều khoản &amp; Riêng tư', en: 'Terms &amp; Privacy' },
        foot_slogan: {
            vi: 'Khám phá thế giới, sống trọn từng khoảnh khắc',
            en: 'See the world, live every moment of it',
        },

        // ── Trang đặc sản ──
        food_page_h1: { vi: 'Đặc sản địa phương', en: 'Local specialties' },
        food_page_p: {
            vi: 'Hàng của cơ sở đã kết nối với LOCALMATE — có giá rõ, nói rõ gửi đi xa được không và để được bao lâu.',
            en: 'From producers on LOCALMATE — clear prices, and we say plainly whether it ships and how long it keeps.',
        },
        food_q_ph: { vi: 'Tìm món: mật ong, khô cá, mắm…', en: 'Search: honey, dried fish, fish sauce…' },
        food_area_ph: { vi: 'Tỉnh / huyện', en: 'Province / district' },
        food_search_btn: { vi: 'Tìm', en: 'Search' },

        // ── Trang đối tác ──
        partner_hero_h1: { vi: 'Cùng LOCALMATE đón khách', en: 'Welcome guests with LOCALMATE' },
        partner_reg_title: { vi: 'Trở thành đối tác', en: 'Become a partner' },
        partner_login_title: { vi: 'Đăng nhập', en: 'Sign in' },
    };

    /** Gộp vào từ điển của app.js nếu trang đó có nạp app.js. */
    function gopTuDien() {
        if (typeof window.TRANSLATIONS !== 'object' || !window.TRANSLATIONS) return;
        for (const [k, v] of Object.entries(TU_DIEN)) {
            if (!window.TRANSLATIONS[k]) window.TRANSLATIONS[k] = v;
        }
    }

    const hienTai = () => localStorage.getItem(KHOA) || 'vi';

    function tra(khoa, lang) {
        const nguon = (window.TRANSLATIONS && window.TRANSLATIONS[khoa]) || TU_DIEN[khoa];
        if (!nguon) return null;
        return nguon[lang] || nguon.vi || null;
    }

    /**
     * Dịch mọi thẻ có data-i18n trên trang.
     *
     * Chỉ đụng vào thẻ có khoá TÌM ĐƯỢC bản dịch. Thiếu bản dịch thì để
     * nguyên tiếng Việt — thà đọc được tiếng Việt còn hơn nhìn cái tên khoá
     * kiểu "home_hero_title" chình ình giữa trang.
     */
    function dich(lang) {
        document.querySelectorAll('[data-i18n]').forEach((el) => {
            const val = tra(el.getAttribute('data-i18n'), lang);
            if (val == null) return;
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.placeholder = val;
            else el.innerHTML = val;
        });
        // Ô nhập có chữ gợi ý riêng
        document.querySelectorAll('[data-i18n-ph]').forEach((el) => {
            const val = tra(el.getAttribute('data-i18n-ph'), lang);
            if (val != null) el.placeholder = val;
        });
    }

    function sangNut(lang) {
        document.querySelectorAll('.lang-toggle-btn').forEach((b) => {
            b.classList.toggle('active', b.dataset.lang === lang);
        });
    }

    /**
     * Đổi ngôn ngữ.
     *
     * app.js có sẵn changeLanguage lo phần vẽ lại nội dung động của mấy trang
     * cũ (danh sách phòng, thẻ trải nghiệm). Trang nào có thì nhường cho nó,
     * rồi mình chạy thêm một lượt cho những khoá nó không biết.
     */
    // Lần áp dụng đầu tiên khi mở trang khác với lần khách BẤM đổi ngôn ngữ:
    // lần đầu thì trang chưa vẽ gì, không có gì để vẽ lại.
    let lanDau = true;

    function doi(lang) {
        if (lang !== 'vi' && lang !== 'en') return;
        localStorage.setItem(KHOA, lang);
        document.documentElement.lang = lang;

        if (typeof window.changeLanguage === 'function') {
            try { window.changeLanguage(lang); } catch (_) { /* trang cu hong thi van di tiep */ }
        }
        dich(lang);
        sangNut(lang);

        // Trang tự vẽ nội dung (trang chủ, đặc sản) nghe tin này để vẽ lại.
        //
        // KHÔNG báo ở lần áp dụng đầu tiên lúc mở trang: lúc đó trang chưa vẽ
        // xong lần nào cả, báo là bắt nó gọi máy chủ thêm một lượt nữa cho
        // đúng thứ vừa gọi. Đo được: trang chủ gọi mỗi cửa hai lần.
        if (!lanDau) {
            document.dispatchEvent(new CustomEvent('lmlang', { detail: { lang } }));
        }
        lanDau = false;
        if (window.lucide) setTimeout(() => lucide.createIcons(), 30);
    }

    /**
     * Chèn nút VI/EN vào thanh điều hướng nếu trang chưa có sẵn.
     * Trang cũ đã có nút viết tay thì để yên, khỏi ra hai cái nút.
     */
    function chenNut() {
        if (document.querySelector('.lang-toggle-btn')) return;
        const o = document.querySelector('.nav-actions, .lm-nav-right');
        if (!o) return;

        const hop = document.createElement('div');
        hop.className = 'lang-toggle';
        hop.innerHTML =
            '<button class="lang-toggle-btn" data-lang="vi" type="button">VI</button>'
            + '<button class="lang-toggle-btn" data-lang="en" type="button">EN</button>';
        hop.querySelectorAll('button').forEach((b) => {
            b.addEventListener('click', () => doi(b.dataset.lang));
        });
        // Đặt trước nút menu / nút tài khoản cho khớp với các trang cũ
        o.insertBefore(hop, o.firstChild);
    }

    /** Câu ngắn nằm trong mã JS: T('tiếng Việt', 'English'). */
    const T = (vi, en) => (hienTai() === 'en' ? en : vi);

    function batDau() {
        gopTuDien();
        chenNut();
        doi(hienTai());
    }

    document.addEventListener('DOMContentLoaded', batDau);

    return { doi, hienTai, T, dich, TU_DIEN };
})();

window.LMLang = LMLang;
// Cho gọn khi dùng trong các tệp khác: LMT('Đặt phòng', 'Book now')
window.LMT = LMLang.T;
