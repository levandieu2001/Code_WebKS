# 🏡 HƯỚNG DẪN SỬ DỤNG: DỰ ÁN BẢY NÚI ECO-HOMESTAY 

Dự án này là trang web đặt phòng và giới thiệu khu nghỉ dưỡng sinh thái Bảy Núi Eco-Homestay. Phiên bản này đã được tích hợp **Trợ lý ảo AI thông minh** sử dụng mô hình `gemini-2.5-flash` mới nhất của Google.

---

## 1. Yêu cầu hệ thống
Để chạy dự án, máy tính cần cài đặt sẵn:
- **Node.js** (Phiên bản >= 18.x)

---

## 2. Cách khởi động dự án (dành cho người test)

Dự án này sử dụng một máy chủ Backend (Node.js/Express) để vừa phục vụ file giao diện Frontend, vừa kết nối với Google Gemini API một cách bảo mật.

**Bước 1:** Mở Terminal (Command Prompt hoặc PowerShell) và di chuyển vào thư mục dự án `d:\code webKS`.
**Bước 2:** Chạy lệnh cài đặt các thư viện cần thiết (NPM):
```bash
npm install
```
**Bước 3:** Bật Server lên bằng lệnh:
```bash
node server.js
```
**Bước 4:** Mở trình duyệt web và truy cập vào link: **[http://localhost:3000](http://localhost:3000)**

---

## 3. Cách test Trợ lý ảo AI Chatbot (Phần nổi bật)

Sau khi truy cập trang web, hãy để ý ở góc phải bên dưới màn hình, sẽ có một nút bấm nhỏ hình Robot. Nhấn vào đó để mở khung Chat.

### 🌟 Tính năng của Chatbot
Mọi tin nhắn của bạn sẽ được AI phản hồi ngay lập tức, với nhiều đặc điểm nổi trội:

1. **Giao tiếp trôi chảy (Context-Awareness):** Nó biết ghi nhớ 10 câu nói chuyện gần nhất, nên bạn có thể nói chuyện như với người thật.
2. **Siêu trí tuệ du lịch An Giang:** Nhờ được nạp sẵn lượng lớn các kiến thức đặc biệt, chatbot này có thể trả lời trơn tru các câu hỏi như:
   - *"Thuê xe máy bao nhiêu?"* (200k/ngày)
   - *"Gần đó có chỗ nào chơi không?"* (Sẽ được tư vấn Chùa Vạn Linh, Rừng Tràm Trà Sư, Hồ Tà Pạ...)
   - *"Có được mang chó cưng theo không?"* (Dưới 10kg thì được, phụ thu 100k)
3. **Phòng vệ ngoài luồng (Off-topic Rejection):** AI được cài mã gắt để CHỈ NÓI về Homestay và du lịch. Nếu bạn cố hỏi *"Bitcoin giá bao nhiêu?"* hay *"Giải toán giùm tôi"*, nó sẽ từ chối siêu lịch sự.
4. **Huy hiệu Trạng thái (Indicator Badge):** Báo cho bạn biết Bot đang hoạt động với tình trạng mạng ra sao. Xem kỹ ở kế bên chữ giờ giấc của mỗi tin nhắn do Bot gửi:
   - **`✨ AI`**: Kết nối thẳng với Gemini 2.5 cực nhanh, cung cấp câu trả lời sáng tạo, mượt mà.
   - **`🤖 Bot`**: Đây là tính năng dự phòng. Khi máy tính rớt mạng hoặc khi thẻ API của Google bị quá tải/ hết tiền, Chatbot sẽ LẬP TỨC chuyển sang chế độ tự vận hành Offline Mode (Dành cho việc trực khẩn cấp), vẫn hiểu ý bạn bằng công cụ tìm kiếm từ khoá trong tiếng Việt và English.

### Thử nghiệm thực tế:
Bạn cứ test các trường hợp sau để thử trọn vẹn:
- Thử hỏi bằng tiếng Anh *"Do you have any available rooms?"* -> AI sẽ tự động phản hồi lại bằng tiếng Anh mượt mà.
- Hỏi giá phòng, giờ checkin/checkout...
- Xin review ẩm thực An Giang.

---

## 4. Chức năng Trang Quản Trị (Dành cho Chủ Homestay)

Website có kèm trang Quản trị viên (Admin Dashboard) chuyên nghiệp tại địa chỉ: **[http://localhost:3000/admin.html](http://localhost:3000/admin.html)**

Để sử dụng tính năng Quản lý phòng, cập nhật trạng thái và xem danh sách đặt phòng,
hãy đăng nhập bằng tài khoản Firebase đã được khai báo trong biến môi trường
`ADMIN_EMAILS` trên máy chủ. Không lưu mật khẩu quản trị mẫu trong mã nguồn hoặc tài liệu.

*(Lưu ý: Hệ thống đã được liên kết với cơ sở dữ liệu thời gian thực Firebase bảo mật. Mọi thay đổi trong phần Admin sẽ lập tức được cập nhật ra ngoài trang chủ của khách hàng!)*

---

## 5. Giao diện mới "Bay Nui Stay"

Toàn bộ trang khách (trang chủ, phòng nghỉ, khám phá, liên hệ) đã được dựng lại theo bộ thiết kế trong file `Bay Nui Stay.dc.html`:

- **Bảng màu:** nền kem đất `#f5ead8`, điểm nhấn đất nung `#c67139`/`#8c491a`, khối tối màu xanh rừng `#2e3520`/`#1d2214`.
- **Chữ:** tiêu đề dùng **Lora** (serif), nội dung dùng **Be Vietnam Pro**.
- **Trang chủ** gồm: hero toàn màn hình → thanh tìm phòng → khối trợ lý ảo → trải nghiệm → văn hoá Khmer → điểm đến → gợi ý theo thời tiết → lễ hội → **Hương vị Bảy Núi** → phòng nghỉ → lịch trống & thời tiết → tour → dịch vụ → combo → đánh giá → cam kết cộng đồng → CTA.
- **Trang Khám phá** có 3 tab: Điểm đến / Trải nghiệm / Lễ hội, kèm 6 bài chi tiết và mục Ẩm thực.
- Logo chatbot (`public/assets/chatbot.png`) được dùng ở: nút nổi góc phải, header khung chat, nút trợ lý trên thanh menu, avatar trong khối demo AI và favicon của web.

### Ảnh
Ảnh gốc nằm ở thư mục `images/`, đã được copy sang `public/assets/` với tên chuẩn mà giao diện gọi tới:

| Tên trong `public/assets/` | Dùng ở |
|---|---|
| `nui-cam-1.jpg` | Ảnh hero trang chủ, điểm đến Núi Cấm, tour 2N1Đ |
| `nui-cam-2.jpg`, `nui-cam-3.jpg` | Bài chi tiết Núi Cấm, thẻ Tâm linh |
| `ho-ta-pa.jpg` | Hero trang Khám phá, điểm đến Hồ Tà Pạ |
| `chua-ta-pa.jpg`, `chua-khmer.jpg` | Văn hoá Khmer, tour Khmer |
| `tra-su.jpg` | Rừng tràm Trà Sư |
| `cap-treo-nui-sam.png` | Cáp treo Núi Sam |
| `camping-nui-cam.jpg` | Camping, CTA cuối trang chủ |
| `homestay.jpg`, `stay-villa.jpg`, `stay-bungalow.jpg` | Hero trang Phòng nghỉ / Liên hệ, ảnh phòng mặc định |
| `food-banhxeo.jpg`, `food-gadot.jpg`, `food-banhbo.jpg`, `food-comdep.jpg` | Mục **Hương vị Bảy Núi** |

Muốn đổi ảnh: chỉ cần ghi đè file cùng tên trong `public/assets/`, không phải sửa code.

### Lưu ý bảo mật
`server.js` đang để sẵn một Gemini API key ngay trong mã nguồn (dòng 16) làm giá trị dự phòng. Trước khi chia sẻ hoặc đưa dự án lên mạng, nên thu hồi key đó và chỉ đọc từ biến môi trường `GEMINI_API_KEY`.
