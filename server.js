// ============================================
// LOCALMATE - Backend Server
// Express + Google Gemini AI Integration
// ============================================
require('dotenv').config({ quiet: true });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const path = require('path');
const {
    knowledgeBlock, quickRepliesFor, offlineAnswer, thoiTietCho,
    bookingForChat, isBookingQuestion, bookingKnowledgeBlock, bookingAnswer,
} = require('./lib/chatbot');
const lienhe = require('./lib/lienhe');
const apiRouter = require('./lib/api');

const app = express();

// Máy chủ hầu như luôn nằm sau một proxy: cloudflared khi demo từ xa, và
// Render/Railway/nginx khi chạy thật. Không bật dòng này thì req.protocol luôn
// là "http", nên mọi đường dẫn ảnh sinh ra đều là http://… trong khi trang
// chạy trên https — điện thoại chặn hoặc bỏ qua, kết quả là MẤT SẠCH ẢNH mà
// chẳng có lỗi nào báo ra.
app.set('trust proxy', 1);
const allowedOrigins = new Set(
    (process.env.CORS_ORIGINS
        // 10.0.2.2 chính là localhost của máy tính khi nhìn từ máy ảo Android
        || 'http://localhost:3000,http://127.0.0.1:3000,http://10.0.2.2:3000')
        .split(',')
        .map(origin => origin.trim())
        .filter(Boolean),
);

/**
 * CORS.
 *
 * Hai điểm phải làm cho đúng, vì trước đây sai cả hai và gây lỗi rất khó tìm:
 *
 * 1. Yêu cầu CÙNG NGUỒN thì luôn cho qua. Trang tự nạp file của chính nó không
 *    phải chuyện CORS. Trình duyệt tải <script type="module"> ở chế độ CORS nên
 *    có gửi kèm Origin — trong khi fetch() thường thì không. Hậu quả: app
 *    Android mở trang qua http://10.0.2.2:3000 thì fetch file .js vẫn ra HTTP
 *    200, nhưng import cùng file đó lại hỏng, và hỏng câm lặng không báo gì.
 *
 * 2. Nguồn lạ thì chỉ KHÔNG gắn header CORS, để trình duyệt tự chặn — chứ
 *    không ném Error, vì ném Error biến thành lỗi 500 cho cả những file tĩnh
 *    lẽ ra phải phục vụ bình thường.
 */
app.use(cors((req, callback) => {
    const origin = req.headers.origin;
    const sameOrigin = origin && origin === `${req.protocol}://${req.get('host')}`;
    const ok = !origin || sameOrigin || allowedOrigins.has(origin);
    callback(null, { origin: ok, credentials: ok });
}));
app.use(helmet({
    // The current static site still uses inline styles/scripts and CDN assets.
    // Keep CSP off until those are moved into local files and nonces are added.
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    // Google/Firebase đăng nhập bằng popup nằm ở firebaseapp.com. Helmet mặc
    // định dùng `same-origin`, làm đứt quan hệ window.opener khi popup chuyển
    // sang tên miền Google: khách chọn tài khoản xong nhưng kết quả không quay
    // về trang chính và Firebase báo nhầm popup-closed-by-user. Chính sách này
    // vẫn cô lập trang, đồng thời cho phép đúng các popup do trang mở hoạt động.
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
}));
app.use(express.json({ limit: '32kb' }));
// Ảnh đối tác tải lên. Khai báo TRƯỚC public/ để bản ngoài thư mục mã nguồn
// được ưu tiên — trên máy chủ thật, thư mục này nằm ở ổ đĩa riêng nên không bị
// xoá mỗi lần cập nhật web. Không đặt biến thì dòng này trỏ đúng vào
// public/uploads/ như cũ, chạy ở máy nhà không đổi gì.
if (process.env.BAYNUI_UPLOAD_DIR) {
    app.use('/uploads', express.static(path.resolve(process.env.BAYNUI_UPLOAD_DIR)));
}
app.use(express.static(path.join(__dirname, 'public')));

// Không giới hạn gộp toàn bộ API theo IP.
//
// Trang Admin, theo dõi xe và chuông thông báo đều đọc dữ liệu định kỳ. Khi
// nhiều máy cùng dùng Wi-Fi trường học, mọi người còn chung một IP công cộng;
// bộ đếm cũ gom tất cả lượt đọc của họ lại và khoá luôn cả /auth/me bằng 429.
// Các cửa tốn tài nguyên hoặc dễ bị spam (chatbot, tạo tài khoản...) có bộ
// giới hạn riêng ở đúng endpoint của nó.

// ── REST API v1 — Web và Android App dùng chung ──
app.use('/v1', apiRouter);

// ── Gemini: nhiều key, tự xoay khi một key hết lượt ──
const gemini = require('./lib/gemini');
const openai = require('./lib/openai');

if (!gemini.hasAI) {
    console.warn('⚠️ Chưa cấu hình GEMINI_API_KEYS. Chatbot sẽ trả lời bằng dữ liệu thật của hệ thống.');
} else {
    console.log(`🤖 Gemini: ${gemini.KEY_COUNT} key · model ${gemini.MODEL_NAME}`);
}

const chatRateLimit = rateLimit({
    windowMs: 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
        error: true,
        message: 'Bạn gửi tin nhắn quá nhanh. Vui lòng thử lại sau một phút.',
        quickReplies: ['Xem phòng', 'Liên hệ', 'Giá phòng'],
    },
});


/**
 * Quyết định trả lời bằng ngôn ngữ nào.
 *
 * Đặt ở MÁY CHỦ chứ không tin hoàn toàn vào cờ trình duyệt gửi lên, vì app
 * Android cũng gọi endpoint này, và khách gõ tiếng Anh trong khi nút vẫn để VI
 * (hoặc ngược lại) là chuyện thường — nội dung câu hỏi mới đáng tin nhất.
 *
 * Chấm điểm hai bên rồi so, KHÔNG kết luận ngay khi thấy dấu tiếng Việt.
 * Hai bẫy đã gặp thật, và chúng ngược chiều nhau:
 *
 *   - "O Thum Grilled Chicken" — không một dấu tiếng Việt nào, nhưng là tên
 *     món Việt.
 *   - "Tell me about Ô Thum grilled chicken" — CÓ dấu, nhưng dấu đó nằm trong
 *     tên riêng, còn cả câu là tiếng Anh. Bản trước thấy chữ "Ô" là trả lời
 *     nguyên đoạn tiếng Việt cho khách nước ngoài.
 *
 * Mấu chốt: tên riêng thì có dấu nhưng KHÔNG BAO GIỜ là từ chức năng. Chỉ đếm
 * từ chức năng — "có", "của", "không", "the", "is", "about" — mới phân biệt
 * được câu tiếng Việt thật với câu tiếng Anh có lẫn tên riêng Việt.
 *
 * BỎ DẤU TRƯỚC rồi mới so khớp. Ranh giới từ của JavaScript chỉ hiểu chữ cái
 * ASCII, nên nó coi "ú" là ranh giới: mẫu tìm chữ "i" đứng riêng khớp luôn vào
 * chữ "i" trong "Núi" và "chơi", biến hai từ tiếng Việt thành hai điểm cho phe
 * tiếng Anh. Chiều ngược lại còn tệ hơn — mẫu tìm "ở" đứng riêng không bao giờ
 * khớp được, vì "ở" chẳng có chữ ASCII nào để ranh giới bám vào.
 */
function decideLang(message, clientLang) {
    const text = String(message || '');
    const plain = text
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/\u0111/g, 'd');

    // Từ chức năng tiếng Việt, viết không dấu — khớp được cả khi khách gõ có
    // dấu lẫn khi gõ vội không dấu. Kèm vài danh từ khách hay hỏi cụt lủn kiểu
    // "Giá phòng", "Đặt xe": câu đó không có lấy một từ chức năng nào.
    const viWords = /\b(co|la|cua|khong|duoc|nhung|minh|ban|cho|voi|o|di|roi|nhe|va|thi|se|dang|nguoi|muon|can|gia|phong|xe|ngay|gio|may|nao|gi|dau|sao|a|khach|toi|ngu|thoi tiet|bao nhieu|the nao)\b/g;

    // Không có "a"/"an" ở đây: bỏ dấu xong thì "ạ" cuối câu tiếng Việt cũng
    // thành "a", đếm vào phe tiếng Anh là hỏng.
    const enWords = /\b(i|me|you|we|my|your|is|are|was|were|do|does|did|can|could|would|should|will|the|and|or|but|of|for|to|from|with|about|what|when|where|which|how|why|who|there|have|has|need|want|like|please|tell|thanks|thank|hello|hi|hey|book|booking|room|rooms|price|cost|much|many|available|weather|rain|tomorrow|today|near|open|close)\b/g;

    const viHits = (plain.match(viWords) || []).length;
    const enHits = (plain.match(enWords) || []).length;

    if (enHits > viHits) return 'en';
    if (viHits > 0) return 'vi';

    // Không bên nào ghi điểm: còn mỗi dấu tiếng Việt để bám vào.
    if (plain !== text.toLowerCase()) return 'vi';

    return clientLang === 'en' ? 'en' : 'vi';
}

// ── System Prompt - Rất chi tiết để tránh lạc đề ──
const SYSTEM_PROMPT = `Bạn là trợ lý ảo CHÍNH THỨC của LOCALMATE — nền tảng kết nối khách du lịch
với homestay, tài xế và đơn vị tour địa phương khắp ĐỒNG BẰNG SÔNG CỬU LONG.

LOCALMATE không tự vận hành chỗ nghỉ. Việc của bạn là giúp khách CHỌN được chỗ hợp với họ
trong số các đối tác đang kết nối, rồi đặt ngay trên web hoặc app.

═══ QUY TẮC BẮT BUỘC (TUYỆT ĐỐI TUÂN THỦ) ═══
1. Bạn CHỈ được trả lời về: LOCALMATE, đặt chỗ nghỉ, đặt xe, đặt tour, du lịch ĐỒNG BẰNG SÔNG CỬU LONG
   (Cà Mau, Bạc Liêu, Sóc Trăng, Cần Thơ, Hậu Giang, Kiên Giang, An Giang, Đồng Tháp, Vĩnh Long,
   Trà Vinh, Bến Tre, Tiền Giang, Long An), ẩm thực và văn hóa miền Tây, thời tiết và đường đi
   trong vùng này. Khách hỏi nơi NGOÀI miền Tây thì nói thật là LOCALMATE hiện chỉ phủ
   Đồng bằng sông Cửu Long.
2. Nếu ai hỏi về chủ đề KHÔNG liên quan (chính trị, công nghệ, toán học, khoa học, người nổi tiếng, game, lập trình, y tế chuyên sâu, tài chính, crypto, v.v.), PHẢI TỪ CHỐI LỊCH SỰ.
3. KHÔNG BAO GIỜ đưa ra thông tin sai hoặc bịa đặt về giá, phòng, dịch vụ. Chỉ dùng thông tin bên dưới.
4. Trả lời bằng ĐÚNG NGÔN NGỮ mà khách hàng sử dụng:
   - Khách nhắn tiếng Việt → trả lời tiếng Việt
   - Khách nhắn tiếng Anh → trả lời tiếng Anh
   - Khách nhắn ngôn ngữ khác → trả lời bằng tiếng Anh
5. Giọng điệu: thân thiện, nhiệt tình, chuyên nghiệp. Dùng emoji vừa phải (2-4 emoji/tin nhắn).
6. Trả lời NGẮN GỌN, dễ đọc. Tối đa 150 từ. Dùng bullet points (•) khi liệt kê.
7. KHÔNG dùng markdown heading (#, ##) và KHÔNG dùng dấu * hay - để gạch đầu dòng.
   Liệt kê thì dùng dấu • ở đầu mỗi dòng. Chỉ dùng **bold** cho nhấn mạnh.
8. Khi khách muốn đặt phòng/tour/xe, hướng dẫn họ đặt NGAY TRÊN WEB hoặc APP (có nút đặt ở mọi trang),
   hotline ${lienhe.HOTLINE} chỉ là phương án dự phòng. Đừng bắt khách gọi điện khi hệ thống đặt được ngay.
9. Ưu tiên số liệu ở mục "DỮ LIỆU THẬT CỦA HỆ THỐNG" bên dưới hơn mọi thứ khác trong hướng dẫn này.
   Nếu hai bên khác nhau, LẤY THEO DỮ LIỆU THẬT.
10. Không biết thì nói thẳng là chưa có thông tin và mời khách gọi hotline. TUYỆT ĐỐI không đoán bừa
   giá, giờ mở cửa hay tình trạng phòng.
11. Khi khách hỏi kiểu "nên đi đâu", "đi mấy ngày", "gợi ý hành trình" — hãy mời họ dùng
   "Tạo lịch trình cho tôi" ở trang chủ: hệ thống dựng lịch trình theo sở thích, số ngày và ngân sách,
   kèm nút đặt xe/phòng cho từng điểm.
12. Trả lời xong nên hỏi lại một câu ngắn để dẫn khách đi tiếp (ví dụ: "Bạn đi mấy người để mình gợi ý phòng phù hợp?").
13. THỜI TIẾT NGÀY CỤ THỂ: khách hỏi "ngày mai/thứ bảy/20/8 có mưa không" thì PHẢI tra bảng
   "DỰ BÁO 7 NGÀY TỚI" trong phần dữ liệu thật và trả lời bằng đúng số ở đó (nhiệt độ, % mưa).
   Hôm nay là ngày nào đã ghi ngay đầu phần dữ liệu thật — tự quy đổi "ngày mai", "cuối tuần" ra ngày.
   Chỉ khi ngày khách hỏi nằm NGOÀI bảng mới nói là chưa dự báo được xa như vậy.
14. LỄ HỘI: có bảng "LỄ HỘI & SỰ KIỆN SẮP TỚI" do Bảy Núi cập nhật tay nên ngày giờ là chính xác.
   Khách hỏi lễ hội, hoặc khách nói ngày đi mà trùng dịp lễ, thì chủ động nói cho khách biết.

═══ KHÁCH HỎI CHỖ NGHỈ — LÀM ĐÚNG NĂM BƯỚC NÀY ═══

Khách hỏi kiểu "tìm homestay gần Núi Cấm", "chỗ nghỉ quanh Trà Sư", "ngủ đâu ở Cà Mau":

B1. Mở mục "CHỖ NGHỈ CỦA ĐỐI TÁC" trong phần dữ liệu thật, tìm ĐÚNG nhóm của điểm khách hỏi.
B2. Nêu 2–3 chỗ GẦN NHẤT trong nhóm đó. Không nêu quá 3 — khách đọc trên điện thoại.
B3. Mỗi chỗ một dòng, PHẢI đủ: tên · khoảng cách · giá mỗi đêm · số khách tối đa.
    Mọi con số copy nguyên từ dữ liệu, không làm tròn lại, không ước lượng.
B4. Mỗi chỗ thêm MỘT vế ngắn nói nó hơn ở điểm nào, rút từ chính số liệu:
    rẻ nhất nhóm · gần nhất · ở được đông người nhất · có bếp riêng · sát bến xuồng…
    So sánh phải dựa trên dữ liệu thật, không khen chung chung.
B5. Hỏi lại một câu để lọc tiếp: "Bạn đi mấy người và ngân sách khoảng bao nhiêu một đêm?"

CẤM TUYỆT ĐỐI khi nói về chỗ nghỉ:
• Nêu tên một chỗ nghỉ KHÔNG có trong dữ liệu. Thà nói ít còn hơn nói sai.
• Bịa giá, bịa khoảng cách, bịa tiện nghi, bịa số sao.
• Nói "còn phòng" hay "hết phòng" khi dữ liệu không ghi. Chỗ nào ghi ĐANG HẾT PHÒNG thì
  nói thật và gợi ý chỗ khác cùng nhóm.

Nhóm khách hỏi mà chưa có đối tác nào, hãy nói thẳng: "Quanh <điểm đó> LOCALMATE chưa có đối tác
nào", rồi đưa nhóm gần nhất kèm khoảng cách thật. Điểm đến ở tỉnh khác thì vẫn giới thiệu được
thông tin tham quan bình thường — chỉ phần CHỖ NGHỈ mới bị giới hạn bởi danh sách đối tác.

Tour cũng theo nguyên tắc đó: chỉ nêu tour có trong dữ liệu, kèm giá và điểm dừng thật.

═══ THÔNG TIN CHÍNH XÁC VỀ HOMESTAY ═══

📍 LOCALMATE phủ ĐỒNG BẰNG SÔNG CỬU LONG. Cụm đối tác đầu tiên đang ở An Giang (Núi Cấm,
Tịnh Biên); điểm đến thì đã trải khắp miền Tây — Cà Mau, Cần Thơ, Bạc Liêu, Sóc Trăng,
Đồng Tháp, Kiên Giang, Bến Tre, Trà Vinh.

🏠 PHÒNG: xem mục "DỮ LIỆU THẬT CỦA HỆ THỐNG" ở cuối hướng dẫn này. Danh sách và giá phòng
ở đó được lấy trực tiếp từ hệ thống đặt chỗ nên luôn đúng — KHÔNG được nói giá nào khác.
Phòng nào ghi "HIỆN ĐANG KÍN" thì phải nói thật là hết phòng và gợi ý phòng còn trống,
hoặc khách sạn đối tác gần đó.

⏰ Check-in: 14:00 | Check-out: 12:00 | Early/late: liên hệ trước

🎁 ƯU ĐÃI: 7 đêm giảm 10% • Đặt sớm 15 ngày giảm 5% • Combo phòng+tour Trà Sư: 1.500.000đ • Combo lãng mạn: 1.600.000đ • Combo gia đình: 2.200.000đ

🍳 ẨM THỰC: Sáng 80.000đ/người • Trưa/tối từ 120.000đ/người • BBQ 200.000đ/người • Lẩu mắm 250.000đ/nồi

🗺 THÔNG TIN DU LỊCH & ĐIỂM THAM QUAN XUNG QUANH (AN GIANG / NÚI CẤM):
• Núi Cấm (Thiên Cấm Sơn - 716m): Ngọn núi cao nhất miền Tây. Cách di chuyển lên đỉnh: cáp treo, xe ôm, hoặc trekking.
• Các điểm check-in trên đỉnh Núi Cấm: Tượng Phật Di Lặc khổng lồ (lớn nhất châu Á trên đỉnh núi), Chùa Vạn Linh (tháp chuông 9 tầng), Hồ Thủy Liêm, Vồ Bồ Hong (đỉnh cao nhất để săn mây, ngắm toàn cảnh Thất Sơn).
• Các điểm tham quan lân cận:
  - Rừng tràm Trà Sư (cách 15km): Đẹp nhất vào mùa nước nổi (T8-T11), đi xuồng ngắm bèo xanh mướt (Vé ~100.000đ).
  - Khác: Hồ Tà Pạ (Đệ nhất tuyệt tình cốc), Chùa Lầu (Tịnh Biên, mang kiến trúc Nhật Bản, miễn phí), Cổng Trời Tri Tôn.
• Đặc sản Ẩm thực An Giang: Bánh xèo rau rừng Núi Cấm, cua núi, gà hấp lá chúc, bò bảy món Núi Sam, bún cá Châu Đốc, lẩu mắm, nước thốt nốt. Homestay có phục vụ một số đặc sản này!
💳 THANH TOÁN: Tiền mặt • Chuyển khoản (Vietcombank, MB) • Momo/ZaloPay • Visa/MC (+2%) • Cọc 50%

📋 HỦY: Trước 48h hoàn 100% • Trong 24h hoàn 50% • Ngày check-in không hoàn

🐾 Thú cưng <10kg OK, phụ phí 100.000đ/đêm

🚗 DI CHUYỂN & XE CỘ:
• Từ TP.HCM ~5h | Từ Cần Thơ ~3h.
• Đưa đón bến xe Tịnh Biên: Miễn phí.
• Đưa đón Châu Đốc: 200.000đ/lượt.
🛵 THUÊ XE MÁY: Có cho thuê xe máy phục vụ vi vu khám phá. Giá: 200.000đ/ngày.

🌤 MÙA ĐẸP: Mùa khô (T11–T4) hợp leo núi. Mùa nước nổi (T8–T11) Trà Sư đẹp nhất. Nhiệt độ quanh năm 25–33°C.
(Dự báo cho từng NGÀY CỤ THỂ nằm ở mục "DỰ BÁO 7 NGÀY TỚI" trong dữ liệu thật bên dưới.)

📞 Hotline: ${lienhe.HOTLINE} (24/7) • Email: ${lienhe.EMAIL} • ${lienhe.DIA_CHI}

═══ ❓ CÁC CÂU HỎI HAY GẶP (FAQ) ĐỂ TRẢ LỜI CHO CHUẨN ═══
Hỏi: Homestay có hỗ trợ chỗ đậu xe ô tô không? -> Đáp: Có bãi đậu xe ô tô rộng rãi, an toàn và hoàn toàn miễn phí nha.
Hỏi: Xung quanh có chỗ nào ăn vặt/chơi buổi tối không? -> Đáp: Buổi tối ở đây yên tĩnh. Nếu thích náo nhiệt, bạn có thể chạy xe máy (~15p) ra chợ Tịnh Biên hoặc trung tâm ăn uống. Homestay có tổ chức nướng BBQ lửa trại cực chill tại chỗ!
Hỏi: Phòng có cách âm tốt không? -> Đáp: Vì là Eco-Homestay thiên nhiên ưu tiên chất liệu gỗ/tre nứa nên cách âm ở mức khá. Trải nghiệm tiếng gió, tiếng suối chảy và dế mâm xôi sẽ là điểm nhấn!
Hỏi: Có cho thuê xe máy không? -> Đáp: Dạ có ạ, giá thuê xe máy là 200.000đ/ngày nghen.
Hỏi: Đi đoàn đông / 10 người / công ty thì sao? -> Đáp: Homestay rất phù hợp cho nhóm đông/Gia đình, nhưng bạn phải liên hệ hotline ${lienhe.HOTLINE} sớm để mình báo giá ưu đãi và giữ phòng nhé!

═══ CÂU TRẢ LỜI MẪU KHI BỊ HỎI LỆCH ĐỀ ═══
VI: "Mình là trợ lý của LOCALMATE nên chỉ hỗ trợ về đặt phòng và du lịch thôi ạ 😊 Bạn cần tư vấn phòng hay điểm tham quan không?"
EN: "I'm the LOCALMATE assistant, I can only help with rooms and An Giang tourism 😊 Would you like to know about our rooms?"`;

// ── Chat API Endpoint ──
app.post('/api/chat', chatRateLimit, async (req, res) => {
    try {
        const { message, history = [], lang = 'vi' } = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({ error: 'Tin nhắn trống' });
        }

        // Ngôn ngữ do MÁY CHỦ quyết, dựa vào chính câu hỏi của khách. Quyết một
        // lần ở đây rồi dùng cho MỌI nhánh bên dưới — câu trả lời, nút gợi ý và
        // lớp offline phải cùng một thứ tiếng, không được chỗ Anh chỗ Việt.
        const replyLang = decideLang(message, lang);

        // Trình duyệt chỉ gửi mã đơn + số điện thoại đã dùng khi đặt. Máy chủ
        // đọc lại Firestore và bắt buộc hai giá trị khớp, nên bot biết đơn thật
        // mà không tin giá/trạng thái có thể bị sửa trong localStorage.
        let latestBooking = null;
        const asksAboutBooking = isBookingQuestion(message);
        const continuesBookingChat = asksAboutBooking || history.slice(-4)
            .some(item => isBookingQuestion(item?.text));
        if (continuesBookingChat) {
            try {
                latestBooking = await bookingForChat(req.body?.booking_context);
            } catch (err) {
                console.warn('[chat/booking-context] chưa đọc được đơn:', err?.message);
            }
        }
        if (latestBooking && asksAboutBooking) {
            return res.json({
                message: bookingAnswer(latestBooking, replyLang),
                quickReplies: replyLang === 'en'
                    ? ['Can I cancel my booking?', 'Contact']
                    : ['Đơn tôi có huỷ được không?', 'Liên hệ'],
                action: 'open_orders',
                model: 'booking-data',
            });
        }

        // Chưa cấu hình Gemini → vẫn trả lời được bằng dữ liệu thật của hệ thống,
        // chỉ là câu chữ mộc hơn. Không để khách gặp màn hình "trợ lý đang tạm dừng".
        if (!gemini.hasAI) {
            const { quickReplies, action } = quickRepliesFor(message, replyLang);
            return res.json({
                message: await offlineAnswer(message, replyLang),
                quickReplies,
                action,
                model: 'offline',
            });
        }

        // Build conversation history for Gemini
        // Gemini requires: starts with 'user', alternates user/model
        const chatHistory = [];
        const recentHistory = history.slice(-10);
        let lastRole = null;
        for (const h of recentHistory) {
            if (!h.text || h.text.startsWith('🌐')) continue; // skip lang selector
            const role = h.role === 'user' ? 'user' : 'model';
            // Skip if first message is not from user
            if (chatHistory.length === 0 && role !== 'user') continue;
            // Skip consecutive same-role messages
            if (role === lastRole) continue;
            chatHistory.push({
                role: role,
                parts: [{ text: h.text }]
            });
            lastRole = role;
        }
        // Ensure history ends with 'model' (not 'user', since we'll add current message)
        if (chatHistory.length > 0 && chatHistory[chatHistory.length - 1].role === 'user') {
            chatHistory.pop();
        }

        const langInstruction = replyLang === 'en'
            ? '\n\n═══ LANGUAGE — THIS OVERRIDES EVERYTHING ABOVE ═══\n'
              + 'The guest wrote in ENGLISH. Your entire reply MUST be in ENGLISH.\n'
              + 'The reference data above is written in Vietnamese — TRANSLATE it into English '
              + 'before answering. Keep Vietnamese proper nouns (Núi Cấm, Trà Sư, Gà đốt Ô Thum) '
              + 'as they are, but every sentence you write must be English.\n'
              + 'Do NOT reply in Vietnamese under any circumstance.'
            // Vế tiếng Việt trước đây chỉ có MỘT câu, trong khi vế tiếng Anh là cả
            // một khối nhấn mạnh. Prompt dài, dữ liệu dài, mà lệnh yếu thì mô hình
            // trôi sang tiếng Anh — khách hỏi tiếng Việt vẫn nhận câu trả lời
            // tiếng Anh. Hai vế phải mạnh ngang nhau.
            : '\n\n═══ NGÔN NGỮ — LỆNH NÀY ĐÈ LÊN MỌI THỨ Ở TRÊN ═══\n'
              + 'Khách viết bằng TIẾNG VIỆT. TOÀN BỘ câu trả lời PHẢI bằng TIẾNG VIỆT.\n'
              + 'Không được mở đầu bằng Hello, Hi, Sure hay bất kỳ từ tiếng Anh nào.\n'
              + 'Giữ nguyên tên riêng (Núi Cấm, Trà Sư, homestay, bungalow, wifi), '
              + 'nhưng mọi câu bạn viết đều phải là tiếng Việt.\n'
              + 'TUYỆT ĐỐI không trả lời bằng tiếng Anh trong bất kỳ trường hợp nào.';

        // Create chat with system instruction
        // Kiến thức nền dựng từ dữ liệu thật (phòng, tour, giá xe, thời tiết hôm nay)
        const liveKnowledge = await knowledgeBlock();

        // Kiến thức nền dựng sẵn 5 phút một lần nên chỉ có thời tiết ở MỘT chỗ
        // (Núi Cấm). Khách hỏi trời ở Long Xuyên mà đọc số của Núi Cấm — cách
        // nhau 60 km — là sai. Khối này lấy dự báo đúng nơi vừa được hỏi.
        const thoiTietRieng = await thoiTietCho(message);

        const fullPrompt = SYSTEM_PROMPT + '\n\n' + liveKnowledge + thoiTietRieng
            + bookingKnowledgeBlock(latestBooking) + langInstruction;

        // Ba lớp, hỏng lớp trên thì xuống lớp dưới:
        //   Gemini (miễn phí, ~20 lượt/ngày/key) → OpenAI (trả tiền) → offline.
        // Gemini hết lượt rất nhanh khi demo, nên lớp thứ hai không phải cho
        // vui — thiếu nó là giữa buổi thuyết trình bot bắt đầu trả lời ngớ ngẩn.
        let reply;
        let usedModel = gemini.MODEL_NAME;

        try {
            reply = await askGemini(fullPrompt, chatHistory, message);
        } catch (geminiErr) {
            console.warn('[chat] Gemini hỏng:', geminiErr?.message);
            if (!openai.available()) throw geminiErr;   // để catch bên dưới lo phần offline

            reply = await openai.chat([
                { role: 'system', content: fullPrompt },
                ...chatHistory.map(h => ({
                    role: h.role === 'model' ? 'assistant' : 'user',
                    content: (h.parts || []).map(x => x.text).join(' '),
                })),
                {
                    role: 'user',
                    content: replyLang === 'en' ? `${message}\n\n(Reply in English.)` : message,
                },
            ]);
            usedModel = openai.MODEL;
            console.log('[chat] đã chuyển sang OpenAI:', openai.MODEL);
        }

        async function askGemini(prompt, history, text) {
        return await gemini.withModel(async (model) => {
            const chat = model.startChat({
                history,
                systemInstruction: { role: 'system', parts: [{ text: prompt }] },
                generationConfig: {
                    // gemini-2.5-flash mặc định có bước "suy nghĩ" trước khi trả lời,
                    // và phần suy nghĩ đó TÍNH VÀO maxOutputTokens. Để 900 thì suy
                    // nghĩ ăn gần hết, còn vài chữ cho câu trả lời — khách nhận về
                    // một câu đứt ngang giữa chừng. Tắt suy nghĩ và nâng hạn mức.
                    thinkingConfig: { thinkingBudget: 0 },
                    maxOutputTokens: 2048,
                    temperature: 0.7,
                    topP: 0.9,
                },
            });
            // Nhắc lại yêu cầu ngôn ngữ NGAY TRONG lượt của khách. Lệnh nằm
            // trong system prompt hay bị chìm khi phần dữ liệu tham chiếu dài
            // và toàn tiếng Việt — câu nhắc cuối cùng có sức nặng nhất.
            const result = await chat.sendMessage(
                replyLang === 'en'
                    ? text + '\n\n(Reply in English.)'
                    // Vế tiếng Việt trước đây KHÔNG có lời nhắc nào — chỉ tiếng Anh mới
                    // có. Phần dữ liệu tham chiếu dài ra là mô hình trôi sang tiếng Anh,
                    // khách hỏi tiếng Việt nhận lại câu trả lời tiếng Anh. Chính câu cuối
                    // này có sức nặng nhất nên hai bên phải cân nhau.
                    : text + '\n\n(Trả lời bằng tiếng Việt.)',
            );
            // Vẫn bị cắt thì KHÔNG đưa câu cụt cho khách. Ném lỗi để rơi xuống
            // lớp dưới (OpenAI, rồi lớp offline) — câu mộc hơn nhưng trọn vẹn và
            // số liệu vẫn đúng. Một câu dừng giữa chừng làm khách tưởng web hỏng.
            const ly = result.response?.candidates?.[0]?.finishReason;
            if (ly && ly !== 'STOP') throw new Error('Câu trả lời bị cắt: ' + ly);

            const chu = result.response.text();
            if (!chu || !chu.trim()) throw new Error('Mô hình trả về câu rỗng');
            return chu;
        });
        }

        // Gợi ý nút bấm dựa trên CÂU HỎI của khách — sát ý hơn là đoán từ câu trả lời
        const { quickReplies, action } = quickRepliesFor(message, replyLang);

        res.json({
            message: reply,
            quickReplies,
            action,
            model: usedModel,
        });

    } catch (err) {
        console.error('=== Gemini API Error ===');
        console.error('Full err object:', err);
        console.error('Message:', err?.message);
        console.error('Status:', err?.status || 'N/A');
        console.error('Details:', err?.errorDetails ? JSON.stringify(err.errorDetails).substring(0, 300) : 'N/A');

        // Gemini quá tải hoặc hết quota → trả lời bằng dữ liệu thật thay vì báo lỗi suông
        try {
            const lang = decideLang(req.body.message, req.body.lang);
            const { quickReplies, action } = quickRepliesFor(req.body.message, lang);
            return res.json({
                message: await offlineAnswer(req.body.message, lang),
                quickReplies,
                action,
                model: 'offline',
            });
        } catch (_) {
            const isEn = req.body.lang === 'en';
            return res.status(500).json({
                error: true,
                message: isEn
                    ? `Sorry, I am having trouble connecting. Please call us at ${lienhe.HOTLINE}!`
                    : `Xin lỗi, mình đang gặp sự cố kết nối. Bạn gọi hotline ${lienhe.HOTLINE} giúp mình nhé!`,
                quickReplies: isEn ? ['View rooms', 'Contact'] : ['Xem phòng', 'Liên hệ'],
            });
        }
    }
});

// ── Generate contextual quick replies ──
function generateQuickReplies(response, lang) {
    const isEn = lang === 'en';
    const text = response.toLowerCase();

    if (/phòng|room|loại|type/.test(text)) {
        return isEn ? ['Check price', 'Book now', 'Promotions'] : ['Xem giá', 'Đặt phòng', 'Ưu đãi'];
    }
    if (/giá|price|cost|đồng|vnd/.test(text)) {
        return isEn ? ['Book now', 'Promotions', 'View rooms'] : ['Đặt phòng', 'Ưu đãi', 'Xem phòng'];
    }
    if (/ưu đãi|khuyến|combo|promo|discount|offer/.test(text)) {
        return isEn ? ['Book now', 'View rooms'] : ['Đặt phòng', 'Xem phòng'];
    }
    if (/trà sư|núi cấm|cổng trời|explore|visit|tour/.test(text)) {
        return isEn ? ['Book now', 'Contact'] : ['Đặt phòng', 'Liên hệ'];
    }
    if (/liên hệ|contact|hotline|phone|email/.test(text)) {
        return isEn ? ['View rooms', 'Promotions'] : ['Xem phòng', 'Ưu đãi'];
    }
    return isEn ? ['View rooms', 'Prices', 'Explore'] : ['Xem phòng', 'Giá phòng', 'Khám phá'];
}

// ── API 404: PHẢI đứng trước catch-all ──
// Nếu không có đoạn này, mọi đường dẫn /v1/... sai sẽ trả về index.html kèm
// HTTP 200. Client (nhất là Android) nhận HTML rồi parse JSON thất bại, lỗi bị
// giấu hoàn toàn và rất khó tìm ra nguyên nhân.
const apiNotFound = (req, res) => {
    res.status(404).json({
        error: {
            code: 'NOT_FOUND',
            message: `Không có endpoint ${req.method} ${req.originalUrl}`,
        },
    });
};
app.use('/v1', apiNotFound);
app.use('/api', apiNotFound);

// ── Catch-all: serve files from public ──
app.use((req, res) => {
    const filePath = path.join(__dirname, 'public', req.path);

    res.sendFile(filePath, (err) => {
        if (!err) return;

        // Đường dẫn trông như TỆP (có phần mở rộng) mà không tìm thấy thì trả
        // 404 cho đúng, đừng trả trang chủ.
        //
        // Trước đây mọi thứ không thấy đều rơi về index.html với mã 200. Hậu
        // quả: một tấm ảnh thiếu vẫn "thành công" dưới mắt trình duyệt — thẻ
        // <img> không kích hoạt onerror, ảnh vỡ mà không ai biết vì sao, và mở
        // thẳng URL ảnh trong trình duyệt thì lại thấy… trang chủ.
        if (/\.[a-z0-9]{2,5}$/i.test(req.path)) {
            return res.status(404).type('text/plain').send('Không tìm thấy tệp: ' + req.path);
        }

        // Còn lại là điều hướng trang → trả trang chủ như cũ
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    });
});

// ── Start Server ──
const PORT = process.env.PORT || 3000;
let bannerTimer = null;
const server = app.listen(PORT, () => {
    // Hoãn 80ms: nếu cổng bị chiếm, lỗi sẽ tới trước và banner bị huỷ,
    // tránh in "server sẵn sàng" rồi mới báo lỗi gây hiểu nhầm.
    bannerTimer = setTimeout(() => {
        console.log(`\n🏡 LOCALMATE Server`);
        console.log(`🌐 http://localhost:${PORT}`);
        console.log(`🤖 Gemini AI: ${gemini.hasAI ? `Ready (${gemini.KEY_COUNT} key · ${gemini.MODEL_NAME})` : 'Disabled'}`);
        console.log(`📁 Static files: ./public\n`);
    }, 80);
});

server.on('error', (err) => {
    clearTimeout(bannerTimer);
    if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ Cổng ${PORT} đang bị chương trình khác chiếm — server không khởi động được.`);
        console.error(`   Cách xử lý:`);
        console.error(`   1) Đóng cửa sổ server cũ đang chạy, hoặc`);
        console.error(`   2) Tìm và tắt tiến trình:  netstat -ano | findstr :${PORT}`);
        console.error(`                              taskkill /PID <so_PID> /F`);
        console.error(`   3) Hoặc chạy cổng khác:    set PORT=3001 && node server.js\n`);
    } else {
        console.error('\n❌ Server lỗi:', err.message, '\n');
    }
    process.exit(1);
});
