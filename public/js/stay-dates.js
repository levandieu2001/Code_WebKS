(function (root) {
    'use strict';
    const valid = value => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
        const d = new Date(value + 'T12:00:00Z');
        return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
    };
    function read(search) {
        const p = new URLSearchParams(search);
        const start = p.get('checkIn') || p.get('check_in') || p.get('checkin') || '';
        const end = p.get('checkOut') || p.get('check_out') || p.get('checkout') || '';
        return { checkIn: valid(start) ? start : '', checkOut: valid(end) ? end : '' };
    }
    function append(link, dates) {
        const p = new URLSearchParams();
        if (valid(dates.checkIn)) p.set('checkIn', dates.checkIn);
        if (valid(dates.checkOut)) p.set('checkOut', dates.checkOut);
        return link + (p.size ? (link.includes('?') ? '&' : '?') + p : '');
    }
    const api = { valid, read, append };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.StayDates = api;
})(typeof window !== 'undefined' ? window : globalThis);
