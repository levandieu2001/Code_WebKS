// Shared commerce invariants. Locks coordinate one Node process only; a multi-
// instance deployment must replace these with database transactions/constraints.
const queues = new Map();
const validDate = require('../public/js/stay-dates').valid;
const phone = value => String(value || '').replace(/[\s.-]/g, '').replace(/^\+84/, '0');
const today = () => new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date());
const integer = (value, min, max) => value !== '' && value !== null && value !== undefined
    && Number.isSafeInteger(Number(value)) && Number(value) >= min && Number(value) <= max;
function serialize(keyFor, handler) {
    return async (req, res, next) => {
        const key = keyFor(req);
        const previous = queues.get(key) || Promise.resolve();
        let release;
        const current = new Promise(resolve => { release = resolve; });
        queues.set(key, current);
        await previous;
        try { if (!req.aborted) await handler(req, res, next); }
        finally { release(); if (queues.get(key) === current) queues.delete(key); }
    };
}
function transition(from, to) {
    return ({ pending: ['confirmed', 'cancelled'], confirmed: ['completed', 'cancelled'],
        completed: [], cancelled: [] }[from] || []).includes(to);
}
module.exports = { validDate, phone, today, integer, serialize, transition };
