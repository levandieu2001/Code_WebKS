// ============================================================
// LOCALMATE — Firestore REST client (dùng ở backend)
// ============================================================
// Vì sao dùng REST thay vì firebase-admin:
//   - Không cần tải serviceAccountKey.json về máy.
//   - Web (trình duyệt) và Android (qua backend) ghi vào CÙNG một
//     collection, nên đơn đặt từ app hiện ngay trên trang Admin.
//   - Quyền được kiểm soát bởi firestore.rules đang có sẵn:
//       rooms    : allow read  : if true
//       bookings : allow create: if true
//     Nên request không cần đăng nhập vẫn đọc phòng và tạo đơn được,
//     đúng như trình duyệt đang làm.
// ============================================================

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'homestay-bay-nui';
const API_KEY = process.env.FIREBASE_API_KEY || 'AIzaSyDMvuzU0KHl9QW0Sn2HVV7VvyL_A8W9v-8';
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const TIMEOUT_MS = 10000;

// ── Chuyển giá trị JS sang định dạng Firestore ──
function toFirestoreValue(value) {
    if (value === null || value === undefined) return { nullValue: null };
    if (value instanceof Date) return { timestampValue: value.toISOString() };
    switch (typeof value) {
        case 'boolean': return { booleanValue: value };
        case 'number':
            return Number.isInteger(value)
                ? { integerValue: String(value) }
                : { doubleValue: value };
        case 'string': return { stringValue: value };
        default: break;
    }
    if (Array.isArray(value)) {
        return { arrayValue: { values: value.map(toFirestoreValue) } };
    }
    return { mapValue: { fields: toFirestoreFields(value) } };
}

function toFirestoreFields(obj) {
    const fields = {};
    for (const [key, value] of Object.entries(obj)) {
        if (value === undefined) continue;
        fields[key] = toFirestoreValue(value);
    }
    return fields;
}

// ── Chuyển ngược từ Firestore sang JS ──
function fromFirestoreValue(value) {
    if (!value || typeof value !== 'object') return null;
    if ('nullValue' in value) return null;
    if ('booleanValue' in value) return value.booleanValue;
    if ('integerValue' in value) return Number(value.integerValue);
    if ('doubleValue' in value) return Number(value.doubleValue);
    if ('stringValue' in value) return value.stringValue;
    if ('timestampValue' in value) return value.timestampValue;
    if ('arrayValue' in value) return (value.arrayValue.values || []).map(fromFirestoreValue);
    if ('mapValue' in value) return fromFirestoreFields(value.mapValue.fields || {});
    return null;
}

function fromFirestoreFields(fields) {
    const out = {};
    for (const [key, value] of Object.entries(fields || {})) {
        out[key] = fromFirestoreValue(value);
    }
    return out;
}

function documentId(name) {
    return String(name || '').split('/').pop();
}

// ── Gọi HTTP có timeout ──
// idToken: token Firebase của người đăng nhập. Truyền vào để đọc được những
// collection mà firestore.rules yêu cầu request.auth != null (ví dụ bookings).
async function request(url, options = {}, idToken) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const headers = { ...(options.headers || {}) };
    if (idToken) headers.Authorization = `Bearer ${idToken}`;
    try {
        const res = await fetch(url, { ...options, headers, signal: controller.signal });
        const text = await res.text();
        const body = text ? JSON.parse(text) : {};
        if (!res.ok) {
            const message = body?.error?.message || `Firestore trả về HTTP ${res.status}`;
            const error = new Error(message);
            error.status = res.status;
            throw error;
        }
        return body;
    } finally {
        clearTimeout(timer);
    }
}

/** Đọc toàn bộ document của một collection (có phân trang tự động). */
async function listDocuments(collection, { pageSize = 100, idToken } = {}) {
    const docs = [];
    let pageToken;
    do {
        const params = new URLSearchParams({ key: API_KEY, pageSize: String(pageSize) });
        if (pageToken) params.set('pageToken', pageToken);
        const body = await request(`${BASE}/${collection}?${params}`, {}, idToken);
        for (const doc of body.documents || []) {
            docs.push({ id: documentId(doc.name), ...fromFirestoreFields(doc.fields) });
        }
        pageToken = body.nextPageToken;
    } while (pageToken);
    return docs;
}

/** Đọc một document theo ID, tránh tải cả collection chỉ để tra một đơn. */
async function getDocument(collection, id, idToken) {
    const safeCollection = encodeURIComponent(String(collection || ''));
    const safeId = encodeURIComponent(String(id || ''));
    if (!safeCollection || !safeId) return null;
    try {
        const body = await request(`${BASE}/${safeCollection}/${safeId}?key=${API_KEY}`, {}, idToken);
        return { id: documentId(body.name), ...fromFirestoreFields(body.fields) };
    } catch (err) {
        if (err.status === 404) return null;
        throw err;
    }
}

/** Tạo document mới, trả về { id, ...data }. */
async function createDocument(collection, data, idToken) {
    const body = await request(`${BASE}/${collection}?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: toFirestoreFields(data) }),
    }, idToken);
    return { id: documentId(body.name), ...fromFirestoreFields(body.fields) };
}

/** Cập nhật một vài trường của document (PATCH có updateMask). */
async function updateDocument(collection, id, data, idToken) {
    const params = new URLSearchParams({ key: API_KEY });
    for (const field of Object.keys(data)) params.append('updateMask.fieldPaths', field);

    const body = await request(`${BASE}/${collection}/${id}?${params}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: toFirestoreFields(data) }),
    }, idToken);
    return { id: documentId(body.name), ...fromFirestoreFields(body.fields) };
}

module.exports = { listDocuments, getDocument, createDocument, updateDocument, PROJECT_ID };
