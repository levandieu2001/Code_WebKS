// Offline browser regression tests. All APIs and third-party requests are mocked.
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { once } = require('node:events');
const express = require('express');
const { chromium } = require('playwright');
const { PLACES, TOURS } = require('../lib/content');
const dates = require('../public/js/stay-dates');
const validateRoom = require('../public/js/room-validation');

const room = { id: 'fixture-room', name: 'Phòng kiểm thử', price: 750000, capacity: 2,
    area: 'Núi Cấm', amenities: [], rating: 4.5, image: 'assets/homestay.jpg', images: [],
    source: 'partner', partner_name: 'Homestay kiểm thử', status: 'available', cancel_policy: {} };
const booking = { id: 'fixture-booking', kind: 'hotel', status: 'pending', guestName: 'Khách thử',
    phone: '0000000000', roomName: room.name, totalPrice: room.price, checkIn: '2027-10-10', checkOut: '2027-10-13' };
const partnerNotification = { id: 'fixture-notification', kind: 'new_booking', title: 'Bạn có đơn mới',
    body: 'EBOOKING · Phòng kiểm thử · Khách thử', booking_id: booking.id, read: false,
    created_at: '2026-09-17T10:00:00.000Z' };
const profile = { full_name: 'Khách thử', phone: '0000000000', email: 'test@example.invalid',
    addresses: [{ id: 'address-1', label: 'Nhà bố mẹ', receiver: 'Khách thử', phone: '0000000000', address: 'Địa chỉ thử nghiệm', is_default: true }] };
const food = { id: 'fixture-food', name: 'Món kiểm thử', price: 100000, unit: 'phần', stock: 13,
    area: 'An Giang', image: 'assets/food-gadot.jpg', shop: 'Cơ sở kiểm thử',
    shipping: 'Gửi trong ngày', keeping: 'Dùng trong ngày' };
const foodListing = { id: 'fixture-food-listing', type: 'food', name: 'Mật ong kiểm thử', description: 'Mật ong rừng',
    price: 120000, unit: 'hũ', stock: 5, area: 'An Giang', shipping: 'Gửi toàn quốc', status: 'approved',
    status_label: 'Đang hiển thị', partner_name: 'Cơ sở thử', created_at: '2026-09-15T00:00:00Z' };
const pass = label => console.log('PASS ' + label);

(async () => {
    for (const key of ['checkIn', 'check_in', 'checkin']) {
        assert.equal(dates.read('?' + key + '=2027-10-10').checkIn, '2027-10-10');
    }
    assert.equal(dates.read('?checkIn=2027-02-31').checkIn, '');
    for (const value of [-1, 0, 1.5, NaN, Infinity]) {
        assert.ok(validateRoom({ name: 'Test', price: value, capacity: 2, order: 1 }));
        assert.ok(validateRoom({ name: 'Test', price: 1000, capacity: value, order: 1 }));
    }
    assert.equal(validateRoom({ name: 'Test', price: 1000, capacity: 2, order: 1 }), '');
    pass('date aliases, invalid calendar dates, positive integer room validation');
    const app = express();
    app.use(express.static(path.join(__dirname, '../public')));
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const base = 'http://127.0.0.1:' + server.address().port;
    let browser;
    try {
        browser = await chromium.launch({ headless: true, ...(process.env.TEST_BROWSER_CHANNEL ? { channel: process.env.TEST_BROWSER_CHANNEL } : {}) });
        const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
        let role = 'admin';
        let partnerType = 'hotel';
        let bookingFailure = false;
        const errors = [];
        const writes = [];
        await context.addInitScript(({ booking, room }) => {
            window.lucide = { createIcons() {} };
            window.__subscriptions = 0;
            window.__user = { email: 'test@example.invalid', refreshToken: 'fixture-refresh', getIdToken: async () => 'fixture-token' };
            window.firebase = { auth: () => ({ currentUser: window.__user }) };
            window.__authChange = null;
            window.FirebaseDB = {
                onAuthChange(fn) { window.__authChange = fn; queueMicrotask(() => fn(null)); },
                async login() { await window.__authChange(window.__user); },
                async logout() { await window.__authChange(null); },
                onRoomsChange(fn) { window.__subscriptions++; fn([room]); return () => {}; },
                onBookingsChange(fn) { window.__subscriptions++; fn([booking]); return () => {}; },
                getRooms: async () => [room], getBookings: async () => [], getContacts: async () => [], getSettings: async () => ({}),
            };
        }, { booking, room });
        await context.route('**/*', async route => {
            const req = route.request(); const url = new URL(req.url());
            if (url.origin !== base) return route.fulfill({ status: 200, body: '', contentType: 'text/javascript' });
            if (url.pathname === '/js/firebase-config.js') return route.fulfill({ status: 200, body: '', contentType: 'text/javascript' });
            if (!url.pathname.startsWith('/v1/') && !url.pathname.startsWith('/api/')) return route.continue();
            if (req.method() !== 'GET') writes.push({ path: url.pathname, method: req.method(), data: req.postDataJSON() });
            let data = { data: [], meta: {}, areas: [] };
            if (url.pathname === '/v1/bookings' && req.method() === 'POST') {
                await new Promise(resolve => setTimeout(resolve, 80));
                if (bookingFailure) return route.fulfill({ status: 502, json: { error: { message: 'Lỗi mạng giả lập' } } });
                const body = req.postDataJSON();
                data = { data: { id: 'fixture-new-order', code: 'NEWORDER', kind: body.kind, status: 'pending', summary: 'Đơn giả lập', total_price: 200000 }, message: 'Đã nhận đơn giả lập' };
            }
            if (url.pathname === '/v1/auth/me') data = { user: { id: 'fixture-user', email: 'test@example.invalid', is_admin: role === 'admin' } };
            if (url.pathname === '/v1/partner/me') data = { partner: { id: 'fixture-partner', type: partnerType, name: 'Đối tác thử', status: 'approved' } };
            if (url.pathname === '/v1/partner/bookings') data = { data: [booking] };
            if (url.pathname === '/v1/partner/notifications') data = { data: [partnerNotification], unread: 1 };
            if (url.pathname === '/v1/partner/listings') {
                data = req.method() === 'POST'
                    ? { data: foodListing, message: 'Đã đăng. Tin đang hiển thị cho khách trên web và ứng dụng.' }
                    : { data: [], listing_type: partnerType === 'food' ? 'food' : partnerType === 'tour' ? 'tour' : 'stay', meta: { total: 0, approved: 0, pending: 0 } };
            }
            if (url.pathname === '/v1/rooms') data = { data: [room] };
            if (url.pathname === '/v1/stays/search') {
                if (url.searchParams.get('check_in')) data = { data: [room], meta: { homestay: 1, partner: 0 } };
                else { await new Promise(resolve => setTimeout(resolve, 200)); data = { data: [room], areas: [] }; }
            }
            if (url.pathname === '/v1/stays/fixture-room') data = { data: room };
            if (url.pathname === '/v1/my/profile') data = { data: profile };
            if (url.pathname === '/v1/my/addresses') {
                profile.addresses[0].label = req.postDataJSON().label;
                data = { data: profile };
            }
            if (url.pathname === '/v1/specialties') data = { data: [food] };
            if (url.pathname === '/v1/tours') data = { data: TOURS.map(t => ({ ...t, partner_name: 'Đơn vị tour kiểm thử' })) };
            if (url.pathname.startsWith('/v1/tours/') && !url.pathname.endsWith('/departures')) {
                data = { data: { ...TOURS.find(t => t.slug === url.pathname.split('/').pop()), partner_name: 'Đơn vị tour kiểm thử' } };
            }
            if (url.pathname.startsWith('/v1/places/')) {
                const p = PLACES.find(p => p.slug === url.pathname.split('/').pop());
                data = { place: { ...p, best_time: p.bestTime, open_time: p.openTime, distance_km: p.distanceKm }, foods: [], stays: [],
                    tours: p.tours.map(slug => TOURS.find(t => t.slug === slug)).filter(Boolean), nearby: [],
                    transport: { hint: 'Đến ' + p.name, dropoff: p.name, pickup_suggestions: [] } };
            }
            await route.fulfill({ json: data });
        });
        const page = await context.newPage();
        const screenshot = async name => {
            if (!process.env.TEST_SCREENSHOT_DIR) return;
            fs.mkdirSync(process.env.TEST_SCREENSHOT_DIR, { recursive: true });
            await page.waitForTimeout(450); // Let CSS entrance transitions finish for visual review.
            await page.screenshot({ path: path.join(process.env.TEST_SCREENSHOT_DIR, name + '.png') });
        };
        page.on('pageerror', e => errors.push(e.message));
        await page.goto(base + '/index.html');
        await page.evaluate(() => BayNuiAccount.moHop(false));
        await page.locator('#acc-password').fill('fixture-secret');
        await page.getByRole('button', { name: 'Hiện mật khẩu', exact: true }).click();
        assert.equal(await page.locator('#acc-password').getAttribute('type'), 'text');
        assert.equal(await page.locator('#acc-password').inputValue(), 'fixture-secret');
        await page.getByRole('button', { name: 'Ẩn mật khẩu', exact: true }).click();
        assert.equal(await page.locator('#acc-password').getAttribute('type'), 'password');
        await screenshot('password-mobile');
        assert.equal(writes.length, 0);
        await page.locator('#acc-close').click();
        await page.evaluate(() => BayNuiAccount.moHop(true));
        await page.getByRole('button', { name: 'Hiện mật khẩu', exact: true }).waitFor();
        await page.locator('#acc-close').click();
        pass('password toggle login/register, retained value, no form submission');

        const firstTour = TOURS[0];
        const firstTourCard = page.locator('#lm-tours .lm-card').first();
        await firstTourCard.waitFor();
        await firstTourCard.getByText('Đơn vị tour kiểm thử', { exact: true }).waitFor();
        assert.equal(await firstTourCard.getAttribute('href'), 'tour.html?slug=' + firstTour.slug);
        await firstTourCard.click();
        await page.getByRole('heading', { name: firstTour.name, exact: true }).waitFor();
        await page.getByText('Đơn vị tổ chức: Đơn vị tour kiểm thử', { exact: true }).waitFor();
        await page.getByRole('button', { name: 'Đặt đúng tour này', exact: true }).click();
        assert.ok((await page.locator('#service-modal-body').textContent()).includes(firstTour.name));
        await page.evaluate(() => BayNuiBooking.close());
        pass('home tour card opens the exact tour detail and books that same tour');

        await page.goto(base + '/index.html');
        await page.locator('#lm-stays').getByText('Homestay kiểm thử', { exact: true }).waitFor();
        await page.locator('#lm-foods').getByText('Cơ sở kiểm thử', { exact: true }).waitFor();

        await page.locator('[data-tab="food"]').click();
        await page.waitForFunction(() => document.querySelectorAll('#lm-list-q option').length > 0);
        assert.equal(await page.locator('#lm-list-q option').first().getAttribute('value'), food.name);
        assert.equal(await page.locator('#lm-list-area option').first().getAttribute('value'), 'An Giang');
        await page.locator('[data-tab="stay"]').click();
        pass('home food search suggestions come from approved specialty API data');

        await page.locator('#lmf-q').fill('Núi Cấm');
        await page.locator('#lmf-in').fill('2027-10-10');
        await page.locator('#lmf-out').fill('2027-10-13');
        await page.locator('#lm-go').click();
        await page.waitForURL('**/phongnghi.html?**');
        assert.equal(await page.locator('#stay-checkin').inputValue(), '2027-10-10');
        assert.equal(await page.locator('#stay-checkout').inputValue(), '2027-10-13');
        const link = page.locator('#rooms-list a.btn-book-room').first();
        await link.waitFor();
        assert.match(await link.getAttribute('href'), /checkIn=2027-10-10&checkOut=2027-10-13/);
        await link.click();
        await page.locator('#cn-dat-nut').click();
        assert.equal(await page.locator('#bk-date').inputValue(), '2027-10-10');
        assert.equal(await page.locator('#bk-date-end').inputValue(), '2027-10-13');
        await screenshot('stay-dates-mobile');
        pass('home → search → detail → booking retains check-in and check-out');

        await page.locator('#bk-name').fill('Khách thử');
        await page.locator('#bk-phone').fill('0000000000');
        bookingFailure = true;
        page.once('dialog', d => d.dismiss());
        await page.locator('#bk-submit').click();
        await page.waitForFunction(() => !document.getElementById('bk-submit').disabled);
        assert.equal(await page.locator('#bk-name').inputValue(), 'Khách thử');
        bookingFailure = false;
        const before = writes.filter(w => w.path === '/v1/bookings').length;
        await page.evaluate(() => Promise.all([
            BayNuiBooking.submit({ preventDefault() {} }),
            BayNuiBooking.submit({ preventDefault() {} }),
            BayNuiBooking.close(),
        ]));
        assert.equal(writes.filter(w => w.path === '/v1/bookings').length - before, 1);
        await page.getByRole('heading', { name: 'Đã nhận đơn của bạn' }).waitFor();
        pass('room checkout: network error preserves form, retry works, double submit creates one request');

        await page.goto(base + '/admin.html');
        await page.evaluate(() => FirebaseDB.login());
        await page.locator('#dashboard').waitFor({ state: 'visible' });
        await page.evaluate(() => showTab('orders'));
        const approve = page.getByRole('button', { name: 'Duyệt', exact: true });
        await approve.waitFor();
        const box = await approve.boundingBox();
        assert.ok(box.x >= 0 && box.x + box.width <= 390);
        await approve.scrollIntoViewIfNeeded();
        await screenshot('admin-orders-mobile');
        await page.getByRole('button', { name: 'Xem chi tiết', exact: true }).click();
        await page.locator('#order-detail').waitFor({ state: 'visible' });
        await page.locator('#order-detail button').click();
        await approve.click();
        assert.ok(writes.some(w => w.path.includes('/admin/bookings/') && w.data.status === 'confirmed'));
        await page.evaluate(() => { showTab('rooms'); openRoomModal(); });
        await page.locator('#room-name').fill('Phòng thử');
        await page.locator('#room-price').fill('-1');
        page.once('dialog', dialog => dialog.dismiss());
        await page.locator('#room-save-btn').click();
        assert.equal(writes.filter(w => w.path === '/v1/admin/rooms').length, 0);
        await page.locator('#room-price').fill('100000');
        await page.locator('#room-capacity').fill('2');
        await page.locator('#room-save-btn').click();
        await page.waitForFunction(() => !document.getElementById('room-modal').classList.contains('show'));
        assert.equal(writes.filter(w => w.path === '/v1/admin/rooms').length, 1);
        pass('mobile admin actions in viewport, details, approval and room validation');

        assert.equal(await page.locator('[data-tab="listings"]').count(), 0);
        assert.equal(await page.locator('#tab-listings').count(), 0);
        pass('admin approves partner profiles only; listing approval workflow is absent');

        role = 'partner';
        await page.goto(base + '/admin.html');
        await page.evaluate(() => FirebaseDB.login());
        await page.waitForURL('**/doitac-quanly.html');
        await page.locator('#pw-body').waitFor({ state: 'visible' });
        await page.locator('#pw-bell-dot').waitFor({ state: 'visible' });
        assert.equal(await page.locator('#pw-bell-dot').textContent(), '1');
        await page.locator('#pw-bell').click();
        await page.getByRole('button', { name: /Bạn có đơn mới/ }).click();
        await page.locator('#page-orders.active').waitFor();
        const focusedOrder = page.locator('#or-table tr[data-order-id="fixture-booking"]');
        await focusedOrder.waitFor();
        assert.ok(await focusedOrder.evaluate(el => el.classList.contains('pw-order-focus')));
        assert.ok(writes.some(w => w.path === '/v1/partner/notifications/read'
            && w.data.ids?.includes('fixture-notification')));
        pass('partner bell shows unread count and opens the exact new order');
        await page.evaluate(() => PartnerWorkspace.go('orders'));
        const accept = page.getByRole('button', { name: 'Nhận đơn', exact: true });
        await accept.waitFor();
        const pbox = await accept.boundingBox();
        assert.ok(pbox.x >= 0 && pbox.x + pbox.width <= 390);
        page.once('dialog', dialog => dialog.accept());
        await accept.click();
        assert.ok(writes.some(w => w.path.includes('/partner/bookings/') && w.data.status === 'confirmed'));
        pass('partner redirected out of admin, mobile accept action works');

        partnerType = 'food';
        await page.goto(base + '/doitac-quanly.html');
        await page.locator('#pw-body').waitFor({ state: 'visible' });
        await page.getByRole('button', { name: 'Đặc sản của tôi', exact: true }).click();
        await page.getByRole('button', { name: /Đăng đặc sản/ }).click();
        assert.equal(await page.locator('#lst-coords').count(), 0);
        assert.equal(await page.locator('#lst-area').count(), 1);
        await page.getByText('Đặc sản không cần nhập toạ độ.', { exact: false }).waitFor();
        await page.locator('#lst-name').fill('Mật ong kiểm thử');
        await page.locator('#lst-price').fill('120000');
        await page.locator('#lst-area').fill('An Giang');
        await page.getByRole('button', { name: 'Gửi đăng', exact: true }).click();
        assert.ok(writes.some(w => w.path === '/v1/partner/listings' && w.method === 'POST'));
        assert.equal(writes.some(w => w.path.includes('/admin/listings/')), false);
        pass('specialty partner publishes immediately without coordinates or admin approval');

        await page.evaluate(() => { localStorage.setItem('baynui_user_token', 'fixture-token'); localStorage.setItem('baynui_user_user', JSON.stringify({ email: 'test@example.invalid' })); });
        await page.goto(base + '/taikhoan.html');
        await page.locator('.tk-address-label').waitFor();
        assert.equal(await page.locator('.tk-address-label').textContent(), 'Nhà bố mẹ');
        await page.getByRole('button', { name: 'Sửa', exact: true }).click();
        await page.locator('#dc-nhan').fill('Cơ quan');
        await page.getByRole('button', { name: 'Lưu địa chỉ', exact: true }).click();
        await page.waitForFunction(() => document.querySelector('.tk-address-label')?.textContent === 'Cơ quan');
        await page.reload();
        await page.getByRole('heading', { name: 'Cơ quan', exact: true }).waitFor();
        pass('address label displayed, edited, retained after reload');
        await page.goto(base + '/dacsan.html');
        await page.waitForFunction(() => document.querySelectorAll('#ds-q-suggestions option').length > 0);
        assert.equal(await page.locator('#ds-q-suggestions option').first().getAttribute('value'), food.name);
        await page.setViewportSize({ width: 390, height: 844 });
        await page.evaluate(id => DacSan.xem(id), food.id);
        await page.waitForFunction(() => !document.getElementById('ds-xem').hidden);
        await page.locator('.ds-xem-ic').first().waitFor();
        assert.equal(await page.locator('.ds-xem-ic').count(), 3);
        // CDN icon không tải trong test cô lập, dựng SVG cùng kích thước để
        // kiểm tra chính xác CSS căn tâm được dùng trên website thật.
        await page.evaluate(() => document.querySelectorAll('.ds-xem-ic i').forEach((icon) => {
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            icon.replaceWith(svg);
        }));
        await page.locator('.ds-xem-ic svg').first().waitFor();
        const detailLayout = await page.evaluate(() => {
            const modal = document.querySelector('.ds-box-xem').getBoundingClientRect();
            const photo = document.querySelector('.ds-xem-anh').getBoundingClientRect();
            const body = document.querySelector('.ds-xem-than').getBoundingClientRect();
            const centered = [...document.querySelectorAll('.ds-xem-ic')].every(circle => {
                const c = circle.getBoundingClientRect();
                const s = circle.querySelector('svg').getBoundingClientRect();
                return Math.abs((c.left + c.width / 2) - (s.left + s.width / 2)) <= 1
                    && Math.abs((c.top + c.height / 2) - (s.top + s.height / 2)) <= 1;
            });
            return { modalHeight: modal.height, photoHeight: photo.height, bodyHeight: body.height, centered };
        });
        assert.equal(detailLayout.centered, true);
        assert.ok(detailLayout.photoHeight < detailLayout.modalHeight * 0.5, JSON.stringify(detailLayout));
        assert.ok(detailLayout.bodyHeight >= 250, JSON.stringify(detailLayout));
        await page.locator('#ds-xem-noi').getByRole('button', { name: 'Đóng', exact: true }).click();
        pass('specialty detail keeps content readable and centers icons on mobile');
        await page.locator('#ds-q').fill('không có món này');
        await page.waitForFunction(() => document.getElementById('ds-dem')?.textContent.includes('0 / 1'));
        await page.locator('#ds-q').fill('Món kiểm thử');
        await page.getByRole('button', { name: 'Đặt món', exact: true }).click();
        await page.locator('.ds-sl input').waitFor();
        const cancelOrder = page.locator('#ds-dat-noi').getByRole('button', { name: 'Không mua nữa', exact: true });
        const cancelBox = await cancelOrder.boundingBox();
        const orderBox = await page.locator('#ds-dat-noi').boundingBox();
        assert.ok(cancelBox.x >= orderBox.x + orderBox.width - 60, JSON.stringify({ cancelBox, orderBox }));
        assert.ok(cancelBox.y <= orderBox.y + 26, JSON.stringify({ cancelBox, orderBox }));
        await cancelOrder.click();
        assert.equal(await page.locator('#ds-dat').isHidden(), true);
        await page.getByRole('button', { name: 'Đặt món', exact: true }).click();
        await page.locator('.ds-sl input').waitFor();
        pass('food checkout has a top-right cancel button on mobile');
        const order = await page.locator('.ds-sl').evaluate(el => [...el.children].map(x => x.tagName));
        assert.deepEqual(order, ['BUTTON', 'INPUT', 'BUTTON', 'SPAN']);
        await page.getByRole('button', { name: 'Tăng số lượng' }).click();
        assert.equal(await page.locator('#ds-sl').inputValue(), '2');
        pass('specialty suggestions and live filtering work; quantity controls retained');
        await page.locator('#ds-ten').fill('Khách thử');
        await page.locator('#ds-sdt').fill('0000000000');
        await page.locator('#ds-dc').fill('Địa chỉ thử nghiệm');
        const mealsBefore = writes.filter(w => w.path === '/v1/bookings').length;
        await page.evaluate(() => Promise.all([DacSan.gui(), DacSan.gui(), DacSan.dong()]));
        assert.equal(writes.filter(w => w.path === '/v1/bookings').length - mealsBefore, 1);
        await page.getByRole('heading', { name: 'Đã gửi đơn', exact: true }).waitFor();
        pass('food checkout: one request for double click, receipt visible');

        for (const p of PLACES) {
            await page.goto(base + '/diadiem.html?slug=' + p.slug);
            await page.locator('.split-body h2').waitFor();
            if (p.tours.length) {
                const target = p.tours[0];
                await page.locator('[data-place-tour="' + target + '"]').click();
                assert.ok((await page.locator('#service-modal-body').textContent()).includes(TOURS.find(t => t.slug === target).name));
            } else {
                await page.getByRole('button', { name: 'Hỏi tour riêng tới đây', exact: true }).click();
                await page.waitForFunction(name => document.getElementById('chatbot-input')?.value.includes(name), p.name);
            }
        }
        pass('all ' + PLACES.length + ' destination tour buttons route to matching tour or inquiry');
        await page.setViewportSize({ width: 1280, height: 900 });
        await page.goto(base + '/index.html');
        await page.evaluate(() => BayNuiAccount.moHop(false));
        await page.getByRole('button', { name: 'Hiện mật khẩu', exact: true }).click();
        assert.equal(await page.locator('#acc-password').getAttribute('type'), 'text');
        pass('desktop password toggle');
        await page.locator('#acc-close').click();
        for (const width of [320, 390, 768, 1280]) {
            await page.setViewportSize({ width, height: 844 });
            for (const url of ['index.html', 'phongnghi.html', 'dacsan.html', 'taikhoan.html', 'doitac.html',
                'tour.html?slug=' + TOURS[0].slug]) {
                await page.goto(base + '/' + url);
                const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
                assert.ok(overflow <= 2, url + ' overflows horizontally at ' + width + ': ' + overflow);
            }
        }
        pass('24 responsive checks: six commerce pages at 320/390/768/1280px');
        assert.deepEqual(errors, []);
        pass('no uncaught browser errors');
        await context.close();
    } finally { if (browser) await browser.close(); server.close(); }
})().catch(err => { console.error(err); process.exitCode = 1; });
