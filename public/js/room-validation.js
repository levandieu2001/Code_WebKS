(function (root) {
    'use strict';
    function validate(data) {
        if (!String(data.name || '').trim()) return 'Bạn nhập tên phòng nhé.';
        if (!Number.isSafeInteger(data.price) || data.price <= 0) return 'Giá phòng phải là số nguyên lớn hơn 0.';
        if (!Number.isSafeInteger(data.capacity) || data.capacity < 1) return 'Sức chứa phải là số nguyên từ 1 người trở lên.';
        if (!Number.isSafeInteger(data.order) || data.order < 1) return 'Thứ tự hiển thị phải là số nguyên từ 1 trở lên.';
        return '';
    }
    if (typeof module !== 'undefined' && module.exports) module.exports = validate;
    else root.validateRoom = validate;
})(typeof window !== 'undefined' ? window : globalThis);
