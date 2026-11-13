// ============================================
// Firebase Configuration — LOCALMATE
// ============================================
// HƯỚNG DẪN: Thay thế config bên dưới bằng config từ Firebase Console
// 1. Vào https://console.firebase.google.com
// 2. Tạo project → Project Settings → Your apps → Web app
// 3. Copy firebaseConfig và dán vào đây

const firebaseConfig = {
    apiKey: "AIzaSyDMvuzU0KHl9QW0Sn2HVV7VvyL_A8W9v-8",
    authDomain: "homestay-bay-nui.firebaseapp.com",
    projectId: "homestay-bay-nui",
    storageBucket: "homestay-bay-nui.firebasestorage.app",
    messagingSenderId: "935978819835",
    appId: "1:935978819835:web:fc9fb8c21df15b601a505e",
    measurementId: "G-RNK13VJ5T8"
};

// ── Initialize Firebase ──
let db = null;
let auth = null;
let storage = null;
try {
    if (firebaseConfig.apiKey === "YOUR_API_KEY") {
        throw new Error("Cần cập nhật firebaseConfig với thông tin từ Firebase Console của bạn.");
    }
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    try { auth = firebase.auth(); } catch(ae) { console.warn("Auth SDK chưa load:", ae.message); }
    try { storage = firebase.storage(); } catch(se) { console.warn("Storage SDK chưa load:", se.message); }
    console.log("✅ Firebase đã kết nối thành công! Project:", firebaseConfig.projectId);
} catch (e) {
    console.warn("⚠️ Firebase chua duoc cau hinh dung:", e.message);
}

// Kiểm tra trước khi thực thi
const checkDb = () => { if (!db) throw new Error("Chưa kết nối Firebase! Mở firebase-config.js thay YOUR_API_KEY."); };
const checkAuth = () => { if (!auth) throw new Error("Chưa kết nối Firebase! Mở firebase-config.js thay YOUR_API_KEY."); };
const checkStorage = () => { if (!storage) throw new Error("Chưa kết nối Firebase! Mở firebase-config.js thay YOUR_API_KEY."); };

// ── Helper Functions ──
window.FirebaseDB = {
    // ── ROOMS ──
    async getRooms() {
        checkDb();
        const snap = await db.collection('rooms').orderBy('order', 'asc').get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },
    async getRoom(id) {
        checkDb();
        const doc = await db.collection('rooms').doc(id).get();
        return doc.exists ? { id: doc.id, ...doc.data() } : null;
    },
    async addRoom(data) {
        checkDb();
        return await db.collection('rooms').add({ ...data, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    },
    async updateRoom(id, data) {
        checkDb();
        return await db.collection('rooms').doc(id).update(data);
    },
    async deleteRoom(id) {
        checkDb();
        return await db.collection('rooms').doc(id).delete();
    },
    onRoomsChange(callback) {
        checkDb();
        return db.collection('rooms').orderBy('order', 'asc').onSnapshot(snap => {
            callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
    },

    // ── BOOKINGS ──
    async addBooking(data) {
        checkDb();
        return await db.collection('bookings').add({ ...data, status: 'pending', createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    },
    async getBookings() {
        checkDb();
        const snap = await db.collection('bookings').orderBy('createdAt', 'desc').get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },
    async updateBooking(id, data) {
        checkDb();
        return await db.collection('bookings').doc(id).update(data);
    },
    async deleteBooking(id) {
        checkDb();
        return await db.collection('bookings').doc(id).delete();
    },
    onBookingsChange(callback) {
        checkDb();
        return db.collection('bookings').orderBy('createdAt', 'desc').onSnapshot(snap => {
            callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
    },

    // ── CONTACTS ──
    async addContact(data) {
        checkDb();
        return await db.collection('contacts').add({ ...data, isRead: false, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
    },
    async getContacts() {
        checkDb();
        const snap = await db.collection('contacts').orderBy('createdAt', 'desc').get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },
    async markContactRead(id) {
        checkDb();
        return await db.collection('contacts').doc(id).update({ isRead: true });
    },
    async deleteContact(id) {
        checkDb();
        return await db.collection('contacts').doc(id).delete();
    },

    // ── PARTNERS (đối tác tự đăng ký) ──
    async getPartners() {
        checkDb();
        const snap = await db.collection('partners').get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },
    async updatePartner(id, data) {
        checkDb();
        return await db.collection('partners').doc(id).update(data);
    },
    async deletePartner(id) {
        checkDb();
        return await db.collection('partners').doc(id).delete();
    },
    onPartnersChange(callback) {
        checkDb();
        return db.collection('partners').onSnapshot(snap => {
            callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
    },

    // ── SETTINGS ──
    async getSettings() {
        checkDb();
        const doc = await db.collection('settings').doc('general').get();
        return doc.exists ? doc.data() : {};
    },
    async updateSettings(data) {
        checkDb();
        return await db.collection('settings').doc('general').set(data, { merge: true });
    },

    // ── STORAGE (Image Upload) ──
    async uploadImage(file, path) {
        checkStorage();
        const ref = storage.ref().child(path || `rooms/${Date.now()}_${file.name}`);
        const snap = await ref.put(file);
        return await snap.ref.getDownloadURL();
    },
    async deleteImage(url) {
        checkStorage();
        try { const ref = storage.refFromURL(url); await ref.delete(); } catch (e) { console.warn('Image delete failed:', e); }
    },

    // ── AUTH ──
    async login(email, password) {
        checkAuth();
        return await auth.signInWithEmailAndPassword(email, password);
    },
    async logout() {
        checkAuth();
        return await auth.signOut();
    },
    onAuthChange(callback) {
        checkAuth();
        return auth.onAuthStateChanged(callback);
    }
};

// ── Seed Data (run once if Firestore is empty) ──
window.seedFirestore = async function () {
    const rooms = await FirebaseDB.getRooms();
    if (rooms.length > 0) { console.log('Firestore already has rooms, skipping seed.'); return; }
    const seedRooms = [
        { name: 'Phòng Sun-view Núi Cấm', nameEn: 'Mountain View Room', price: 850000, amenities: 'WiFi, ban công, điều hòa, nước nóng', amenitiesEn: 'WiFi, balcony, A/C, hot water', description: 'View núi tuyệt đẹp, ban công riêng ngắm bình minh', descriptionEn: 'Stunning mountain views with private balcony for sunrise watching', imageUrl: 'assets/homestay.jpg', status: 'available', capacity: 2, order: 1 },
        { name: 'Bungalow Ven Suối', nameEn: 'Riverside Bungalow', price: 1200000, amenities: 'WiFi, bồn tắm, view suối, quạt trần', amenitiesEn: 'WiFi, bathtub, stream view, ceiling fan', description: 'Bungalow gỗ bên suối, cực thư giãn với tiếng nước róc rách', descriptionEn: 'Wooden bungalow by stream, extremely relaxing with soothing water sounds', imageUrl: 'assets/stay-bungalow.jpg', status: 'available', capacity: 2, order: 2 },
        { name: 'Phòng Family Tà Pạ', nameEn: 'Family Suite', price: 1800000, amenities: 'WiFi, bếp nhỏ, 2 giường, điều hòa', amenitiesEn: 'WiFi, kitchenette, 2 beds, A/C', description: 'Rộng rãi cho gia đình, đầy đủ tiện nghi hiện đại', descriptionEn: 'Spacious for families with full modern amenities', imageUrl: 'assets/stay-villa.jpg', status: 'available', capacity: 4, order: 3 }
    ];
    for (const r of seedRooms) { await FirebaseDB.addRoom(r); }
    await FirebaseDB.updateSettings({ siteName: 'LOCALMATE', phone: '0833 385 601', email: 'mrdieu37@gmail.com', address: 'Phường Bình Đức, Long Xuyên, An Giang', checkin: '14:00', checkout: '12:00' });
    console.log('✅ Firestore seeded successfully!');
};
