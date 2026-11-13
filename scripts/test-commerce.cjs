const assert = require('node:assert/strict');
const express = require('express');
const { once } = require('node:events');
const network = global.fetch;
global.fetch = async () => { throw new Error('External requests are forbidden in commerce tests'); };
process.env.ADMIN_EMAILS = 'admin@example.invalid';
const db = { bookings: [], rooms: [{ id: 'room-test', name: 'Test room', status: 'available', price: 200000 }],
    listings: [{ id: 'food-test', name: 'Test food', type: 'food', status: 'approved', price: 100000, stock: 1, partnerId: 'partner-food' },
        { id: 'tour-test', name: 'Partner tour', type: 'tour', status: 'approved', price: 300000, days: 1, partnerId: 'partner-tour' },
        { id: 'stay-test', name: 'Partner stay', type: 'stay', status: 'approved', price: 250000, quantity: 1, partnerId: 'partner-hotel' }],
    partners: [{ id: 'partner-food', uid: 'food', name: 'Food partner', type: 'food', status: 'approved' },
        { id: 'partner-tour', uid: 'tour', name: 'Tour partner', type: 'tour', status: 'approved' },
        { id: 'partner-hotel', uid: 'hotel', name: 'Hotel partner', type: 'hotel', status: 'approved' },
        { id: 'partner-transport', uid: 'transport', name: 'Transport partner', type: 'transport', status: 'approved', vehicleType: '4-seat', vehicleSeats: 4, factor: 1 }] };
const store = require('../lib/store');
store.readAll = name => db[name] || [];
store.find = (name, fn) => store.readAll(name).find(fn);
store.insert = (name, row) => { (db[name] ||= []).push(row); return row; };
store.update = (name, id, patch) => { const row = store.find(name, r => r.id === id); if (!row) return null; Object.assign(row, patch); return row; };
const auth = require('../lib/auth');
const seededEmails = {
    seed_hotel: 'thatsonview@baynuieco.vn',
    seed_tour_02: 'thatsonadventure@baynuieco.vn',
};
auth.me = async token => {
    if (token === 'expired') throw new Error('Expired');
    return { id: token, email: seededEmails[token] || token + '@example.invalid' };
};
let failCreate = false, failUpdate = false, failNotify = false;
const fsdb = require('../lib/firestore');
fsdb.listDocuments = async name => structuredClone(db[name] || []);
fsdb.createDocument = async (name, data) => {
    await new Promise(resolve => setTimeout(resolve, 5));
    if (failCreate) throw new Error('Simulated storage failure');
    const doc = { ...data, id: 'test-' + db.bookings.length };
    db.bookings.push(doc); return structuredClone(doc);
};
fsdb.updateDocument = async (name, id, patch) => {
    if (failUpdate) throw new Error('Simulated update failure');
    return store.update(name, id, patch);
};
require('../lib/notifications').push = () => { if (failNotify) throw new Error('Simulated notification failure'); };
require('../lib/lichphong').dongTrongKhoang = () => [];
const router = require('../lib/api');
const common = { guest_name: 'Test buyer', phone: '0000000000' };
const meal = { ...common, kind: 'food', listing_id: 'food-test', quantity: 1, address: 'Fixture delivery address' };
const room = { ...common, kind: 'hotel', room_id: 'stay-test', check_in: '2099-10-10', check_out: '2099-10-11' };
const tour = { ...common, kind: 'tour', tour_slug: 'tour-test', date: '2099-10-10', guests: 2 };
let checks = 0;
const eq = (a, b) => { assert.deepEqual(a, b); checks++; };
(async () => {
    const app = express(); app.use(express.json()); app.use('/v1', router);
    const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
    const base = 'http://127.0.0.1:' + server.address().port;
    const request = async (url, body, token = '') => {
        const r = await network(base + '/v1' + url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: JSON.stringify(body) });
        return { status: r.status, body: await r.json() };
    };
    const create = (body, token) => request('/bookings', body, token);
    try {
        for (const date of ['2099-02-31', '2099-13-01', '2000-01-01']) eq((await create({ ...tour, date })).status, 400);
        for (const quantity of [0, -1, 1.5, 'abc', 100]) eq((await create({ ...meal, quantity })).status, 400);
        eq((await create(room, 'expired')).status, 401);
        eq(db.bookings.length, 0);
        eq((await create({ ...common, kind: 'transport', pickup: 'Châu Đốc', date: '2099-10-10', time: '28:00' })).status, 400);
        eq((await create({ ...common, kind: 'transport', pickup: 'Châu Đốc', date: '2099-10-10', time: '10:00', round_trip: true, return_date: '2099-10-10', return_time: '09:00' })).status, 400);
        const concurrent = await Promise.all([create(meal), create(meal)]);
        eq(concurrent.map(x => x.status).sort(), [201, 400]);
        eq(db.listings[0].stock, 0);
        eq(require('../lib/listings').toFoodShape(db.listings[0]).soldOut, true);
        const first = db.bookings[0];
        failUpdate = true;
        eq((await request('/bookings/' + first.id + '/cancel', { phone: common.phone })).status, 502);
        eq(db.listings[0].stock, 0);
        failUpdate = false;
        const cancelled = await Promise.all([request('/bookings/' + first.id + '/cancel', { phone: common.phone }), request('/bookings/' + first.id + '/cancel', { phone: common.phone })]);
        eq(cancelled.map(x => x.status).sort(), [200, 409]);
        eq(db.listings[0].stock, 1);
        failCreate = true;
        eq((await create(meal)).status, 502);
        eq(db.listings[0].stock, 1);
        failCreate = false;
        failNotify = true;
        eq((await create(meal)).status, 201);
        eq(db.listings[0].stock, 0);
        failNotify = false;
        const rooms = await Promise.all([create(room), create(room)]);
        eq(rooms.map(x => x.status).sort(), [201, 400]);
        eq((await create({ ...room, check_in: '2099-10-11', check_out: '2099-10-12' })).status, 201);
        const bookedTour = await create({ ...tour, total_price: 1, phone: '+84000000000' });
        eq(bookedTour.status, 201);
        eq(bookedTour.body.data.total_price, 600000);
        const savedTour = db.bookings.find(b => b.id === bookedTour.body.data.id);
        eq(savedTour.partnerId, 'partner-tour');
        eq(savedTour.phone, '0000000000');
        const partnerStay = await create({ ...room, room_id: 'stay-test', check_in: '2099-11-10', check_out: '2099-11-11' });
        eq(partnerStay.status, 201);
        const ownStayResponse = await network(base + '/v1/partner/bookings', {
            headers: { Authorization: 'Bearer hotel' },
        });
        eq(ownStayResponse.status, 200);
        const ownStays = (await ownStayResponse.json()).data;
        eq(ownStays.some(b => b.id === partnerStay.body.data.id), true);
        const savedStay = db.bookings.find(b => b.id === partnerStay.body.data.id);
        delete savedStay.partnerId;
        const recoveredResponse = await network(base + '/v1/partner/bookings', {
            headers: { Authorization: 'Bearer hotel' },
        });
        const recovered = (await recoveredResponse.json()).data.find(b => b.id === savedStay.id);
        eq(recovered.partnerId, 'partner-hotel');
        eq(recovered.ownershipRecovered, true);
        const confirmRecovered = await network(base + '/v1/partner/bookings/' + savedStay.id + '/status', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer hotel' },
            body: JSON.stringify({ status: 'confirmed' }),
        });
        eq(confirmRecovered.status, 200);
        eq(savedStay.partnerId, 'partner-hotel');
        eq(savedStay.status, 'confirmed');
        const lookup = await network(base + '/v1/bookings/lookup?phone=%2B84000000000');
        eq(lookup.status, 200);
        assert.ok((await lookup.json()).data.some(b => b.id === savedTour.id)); checks++;
        const routeQuery = '/v1/transport/quotes?from=' + encodeURIComponent('Châu Đốc') + '&to=' + encodeURIComponent('Long Xuyên');
        const quoteResponse = await network(base + routeQuery);
        eq(quoteResponse.status, 200);
        const quote = (await quoteResponse.json()).data.find(q =>
            q.vehicle_type === '4-seat' && q.partner_id === 'partner-transport');
        const ride = { ...common, kind: 'transport', pickup: 'Châu Đốc', dropoff: 'Long Xuyên', date: '2099-10-10', time: '10:00',
            seats: 2, vehicle_type: '4-seat', partner_id: quote.partner_id };
        const rideResult = await create(ride);
        eq(rideResult.status, 201);
        eq(rideResult.body.data.total_price, quote.price);
        eq(rideResult.body.data.partner_name, 'Transport partner');
        eq(rideResult.body.data.dispatch, {
            state: 'partner_pending',
            partner_id: 'partner-transport',
            partner_name: 'Transport partner',
        });
        const savedRide = db.bookings.find(b => b.id === rideResult.body.data.id);
        eq(savedRide.partnerId, quote.partner_id);
        const transportPartnerResponse = await network(base + '/v1/partner/bookings', {
            headers: { Authorization: 'Bearer transport' },
        });
        eq(transportPartnerResponse.status, 200);
        eq((await transportPartnerResponse.json()).data.some(b => b.id === savedRide.id), true);
        eq((await create({ ...ride, partner_id: 'nonexistent-partner' })).status, 400);
        eq((await create({ ...ride, dropoff: 'Unknown destination xyz' })).status, 400);
        db.listings[1].soldOut = true;
        eq((await create(tour)).status, 400);
        const change = async (id, status) => {
            const r = await network(base + '/v1/partner/bookings/' + id + '/status', { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tour' }, body: JSON.stringify({ status }) });
            return r.status;
        };
        eq(await change(savedTour.id, 'completed'), 409);
        eq(await change(savedTour.id, 'confirmed'), 200);
        eq(await change(savedTour.id, 'completed'), 200);
        eq(await change(savedTour.id, 'confirmed'), 409);
        const mealOrder = db.bookings.find(b => b.kind === 'food' && b.status === 'pending');
        eq((await request('/bookings/' + mealOrder.id + '/payment/claim', { phone: common.phone })).status, 400);
        const hotel = db.bookings.find(b => b.kind === 'hotel');
        eq((await request('/bookings/' + hotel.id + '/payment/claim', { phone: '0111111111' })).status, 403);
        eq((await request('/bookings/' + hotel.id + '/payment/claim', { phone: common.phone })).status, 200);
        eq(hotel.paymentStatus, 'pending_confirm');
        eq((await request('/bookings/' + hotel.id + '/cancel', { phone: '0111111111' })).status, 403);
        const paymentsPath = require.resolve('../lib/payments');
        process.env.DEPOSIT_RATE_HOTEL = '0'; delete require.cache[paymentsPath];
        eq(require('../lib/payments').depositFor({ kind: 'hotel', totalPrice: 500000 }), 0);
        console.log('PASS commerce: ' + checks + ' assertions (validation, concurrency, inventory, rollback, tour ownership, transitions, deposit, privacy)');
    } finally { server.close(); global.fetch = network; }
})().catch(e => { console.error(e); process.exitCode = 1; });
