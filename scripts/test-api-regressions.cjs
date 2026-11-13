// Exercise actual Express routes; replace storage/auth/network with in-memory fixtures.
const assert = require('node:assert/strict');
const { once } = require('node:events');
const express = require('express');
process.env.ADMIN_EMAILS = 'admin@example.invalid';
const nativeFetch = global.fetch;
global.fetch = async () => { throw new Error('External network is disabled in regression tests'); };
const auth = require('../lib/auth');
auth.me = async token => {
    if (!['admin', 'hotel', 'tour', 'food'].includes(token)) throw new Error('Invalid test token');
    return { id: token, email: token + '@example.invalid' };
};
auth.login = async ({ email }) => ({
    token: 'login-token', refresh_token: 'refresh-token', expires_in: 3600,
    user: { id: 'login-user', email, full_name: 'Login test' },
});
const store = require('../lib/store');
const partners = ['hotel', 'tour', 'food'].map(type => ({ id: 'partner-' + type, uid: type, type, status: 'approved', name: type }));
const profiles = [];
const reviewRows = [];
const listingRows = [{
    id: 'tour-real', type: 'tour', name: 'Tour đối tác thật', status: 'approved',
    price: 390000, days: 1, duration: '1 ngày', pax: '2–8 khách',
    partnerId: 'partner-tour', partnerName: 'tour', createdAt: '2026-09-17T00:00:00Z',
}];
store.readAll = collection => collection === 'partners' ? partners
    : collection === 'user_profiles' ? profiles
        : collection === 'listings' ? listingRows : collection === 'reviews' ? reviewRows : [];
store.find = (collection, fn) => store.readAll(collection).find(fn);
store.insert = (collection, row, prefix = 'row') => {
    const target = collection === 'user_profiles' ? profiles : collection === 'listings' ? listingRows : null;
    assert.ok(target, 'Unexpected insert collection: ' + collection);
    const saved = { id: row.id || prefix + '-' + (target.length + 1), ...row };
    target.push(saved);
    return saved;
};
store.update = (collection, id, patch) => { const row = store.find(collection, r => r.id === id); Object.assign(row, patch); return row; };
const orders = partners.map(p => ({ id: 'order-' + p.type, partnerId: p.id, kind: p.type === 'hotel' ? 'hotel' : p.type, status: 'pending' }));
const writes = [];
const firestore = require('../lib/firestore');
firestore.listDocuments = async collection => collection === 'bookings' ? orders : [];
firestore.createDocument = async (collection, data) => { writes.push({ collection, data }); return { id: 'room-test', ...data }; };
firestore.updateDocument = async (collection, id, data) => { writes.push({ collection, id, data }); return { id, ...data }; };
require('../lib/notifications').push = () => {};
const router = require('../lib/api');

(async () => {
    const app = express(); app.use(express.json()); app.use('/v1', router);
    const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
    const base = 'http://127.0.0.1:' + server.address().port;
    const request = (path, token, method = 'GET', data) => nativeFetch(base + '/v1' + path, {
        method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
        ...(data ? { body: JSON.stringify(data) } : {}),
    });
    try {
        for (let i = 0; i < 15; i++) {
            const login = await request('/auth/login', '', 'POST', {
                email: 'admin@example.invalid', password: '123456',
            });
            assert.equal(login.status, 200);
        }
        console.log('PASS API: repeated successful logins are not blocked by a LOCALMATE 429 limiter');
        const tourDetail = await request('/tours/tour-real', '');
        assert.equal(tourDetail.status, 200);
        assert.equal((await tourDetail.json()).data.slug, 'tour-real');
        assert.equal((await request('/tours/not-a-tour', '')).status, 404);
        console.log('PASS API: exact tour detail endpoint returns the requested tour');
        listingRows.push({ id: 'stay-review-test', type: 'stay', status: 'approved',
            name: 'Review test stay', price: 200000, capacity: 2, partnerId: 'partner-hotel' });
        const detailReviews = async () => {
            const response = await request('/stays/stay-review-test', '');
            assert.equal(response.status, 200);
            return (await response.json()).reviews;
        };
        assert.deepEqual((await detailReviews()).summary,
            { count: 0, average: null, breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } });
        reviewRows.push({ id: 'rv-room', targetType: 'room', targetId: 'stay-review-test',
            rating: 5, comment: 'Room review is visible', status: 'published', createdAt: '2026-09-20' });
        const roomReviews = await detailReviews();
        assert.equal(roomReviews.summary.count, 1);
        assert.equal(roomReviews.summary.average, 5);
        assert.equal(roomReviews.data[0].comment, 'Room review is visible');
        reviewRows.push(
            { id: 'rv-stay', targetType: 'stay', targetId: 'stay-review-test', rating: 3,
                status: 'published', createdAt: '2026-09-21' },
            { id: 'rv-hidden', targetType: 'room', targetId: 'stay-review-test', rating: 1, status: 'hidden' },
            { id: 'rv-other', targetType: 'room', targetId: 'other-stay', rating: 1, status: 'published' },
        );
        const mixedReviews = await detailReviews();
        assert.deepEqual(mixedReviews.data.map(r => r.id), ['rv-stay', 'rv-room']);
        assert.deepEqual(mixedReviews.summary,
            { count: 2, average: 4, breakdown: { 1: 0, 2: 0, 3: 1, 4: 0, 5: 1 } });
        // Run the real detail-page renderer against the API response, without a live database.
        const vm = require('node:vm');
        const fs = require('node:fs');
        const body = { innerHTML: '' };
        let ready;
        vm.runInNewContext(fs.readFileSync(require.resolve('../public/js/chonghi.js'), 'utf8'), {
            window: {}, location: { search: '?id=stay-review-test' }, URLSearchParams,
            document: { getElementById: id => id === 'cn-body' ? body : null,
                addEventListener: (event, handler) => { if (event === 'DOMContentLoaded') ready = handler; } },
            fetch: async () => request('/stays/stay-review-test', ''),
        });
        await ready();
        assert.ok(body.innerHTML.includes('Room review is visible'));
        assert.ok(body.innerHTML.includes('2 đánh giá'));
        assert.ok(!body.innerHTML.includes('Chỗ này chưa có đánh giá nào'));
        console.log('PASS API/UI: stay detail renders room reviews with matching counts, average and breakdown; hidden/unrelated reviews excluded');
        assert.equal((await request('/admin/bookings', '')).status, 401);
        for (const role of ['hotel', 'tour', 'food']) {
            assert.equal((await request('/admin/bookings', role)).status, 403);
            const own = await (await request('/partner/bookings', role)).json();
            assert.deepEqual(own.data.map(r => r.id), ['order-' + role]);
            assert.equal((await request('/partner/bookings/order-' + role + '/status', role, 'PATCH', { status: 'confirmed' })).status, 200);
            const other = role === 'hotel' ? 'tour' : 'hotel';
            const count = writes.length;
            assert.equal((await request('/partner/bookings/order-' + other + '/status', role, 'PATCH', { status: 'confirmed' })).status, 403);
            assert.equal(writes.length, count);
        }
        console.log('PASS API: guests denied, hotel/tour/food own orders only, own approval succeeds, cross-partner update denied');
        const foodListing = await request('/partner/listings', 'food', 'POST', {
            name: 'Mật ong kiểm thử', price: 120000, area: 'An Giang', unit: 'hũ',
        });
        assert.equal(foodListing.status, 201);
        const savedFood = listingRows.find(row => row.type === 'food');
        assert.equal(savedFood.type, 'food');
        assert.equal(savedFood.status, 'approved');
        assert.equal(Object.hasOwn(savedFood, 'lat'), false);
        const publicFoods = await (await request('/specialties', '')).json();
        assert.ok(publicFoods.data.some(row => row.id === savedFood.id));
        const changedFood = await request('/partner/listings/' + savedFood.id, 'food', 'PATCH', {
            name: 'Mật ong đã sửa', price: 125000, area: 'An Giang', unit: 'hũ',
        });
        assert.equal(changedFood.status, 200);
        assert.equal(savedFood.status, 'approved');
        assert.equal((await request('/partner/listings', 'hotel', 'POST', {
            name: 'Phòng thiếu vị trí', price: 200000, area: 'An Giang',
        })).status, 400);
        console.log('PASS API: approved partner food is public immediately, edits stay public, stay still needs coordinates');
        const valid = { name: 'Test room', price: 100000, capacity: 2, order: 1, status: 'available' };
        for (const field of ['price', 'capacity', 'order']) {
            for (const value of [-1, 0, 1.5, 'invalid', null]) {
                for (const [url, method] of [['/admin/rooms', 'POST'], ['/admin/rooms/room-test', 'PATCH']]) {
                    const count = writes.length;
                    assert.equal((await request(url, 'admin', method, { ...valid, [field]: value })).status, 400);
                    assert.equal(writes.length, count);
                }
            }
        }
        assert.equal((await request('/admin/rooms', 'hotel', 'POST', valid)).status, 403);
        assert.equal((await request('/admin/rooms', 'admin', 'POST', valid)).status, 201);
        assert.equal((await request('/admin/rooms/room-test', 'admin', 'PATCH', valid)).status, 200);
        console.log('PASS API: room create/update validation cannot be bypassed, admin role required');
        const hoso = require('../lib/hoso');
        let p = hoso.luuDiaChi('fixture-user', { label: 'Nhà bố mẹ', receiver: 'Khách thử', phone: '0000000000', address: 'Địa chỉ thử nghiệm', isDefault: true });
        assert.equal(hoso.toPublic(p).addresses[0].label, 'Nhà bố mẹ');
        p = hoso.luuDiaChi('fixture-user', { id: p.addresses[0].id, label: 'Cơ quan', receiver: 'Khách thử', phone: '0000000000', address: 'Địa chỉ thử nghiệm', isDefault: true });
        assert.equal(hoso.toPublic(p).addresses[0].label, 'Cơ quan');
        console.log('PASS API: address labels stored and returned on create/edit');
    } finally { server.close(); global.fetch = nativeFetch; }
})().catch(error => { console.error(error); process.exitCode = 1; });
