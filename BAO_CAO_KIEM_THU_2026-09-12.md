# Kiểm thử LocalMate — 12/09/2026

## Kết quả đã chạy

| Phạm vi | Kết quả | Giới hạn |
| --- | --- | --- |
| Cú pháp | 80 file JavaScript đạt | Không thay thế test chức năng |
| Liên kết nội bộ | 567 tham chiếu HTML/JS/CSS không thiếu file | Chưa kiểm toàn bộ ảnh/URL ngoài |
| API thật + auth/storage giả lập | Quyền admin/đối tác, lưu phòng, sổ địa chỉ đạt | Không truy cập production |
| Nghiệp vụ thương mại | 47 assertions đạt | Một tiến trình Node, storage giả lập |
| Checkout mobile | Đặt phòng/đặc sản, lỗi mạng, thử lại, gửi lặp đạt | Không gửi đơn thật |
| UI | Ngày tìm phòng, mật khẩu, địa chỉ, xử lý đơn, 17 điểm đến đạt | Edge headless |
| Responsive | 20 phép kiểm tra: 5 trang × 320/390/768/1280px đạt | Không phải Safari/iOS hay bàn phím thật |
| Android native | Build debug + 5 unit test giá xe đạt; 0 lỗi/0 bỏ qua | Chưa test trên thiết bị thật, chưa phát APK mới |

## Các lỗi sửa thêm

- Tồn kho về 0 không biến thành không giới hạn; trả tồn khi hủy và phục hồi khi lưu đơn thất bại.
- Khóa tạo đơn cùng phòng/món và đổi trạng thái cùng đơn trong một tiến trình: chặn đặt suất cuối đồng thời, hủy lặp.
- Chặn ngày sai/quá khứ, giờ sai, giờ về trước giờ đi, số lượng âm/thập phân/quá giới hạn.
- Chặn giá không hợp lệ, nhà xe không tồn tại; không tự chuyển đơn sang nhà xe khác.
- Đặt được tour đối tác đã duyệt, gắn đúng đối tác; chặn tour hết chỗ.
- Không mở lại đơn đã hủy/hoàn thành; phải nhận đơn trước khi hoàn thành.
- Đã lưu đơn thành công thì lỗi thông báo không báo đặt thất bại làm khách đặt trùng.
- Token hết hạn không bị biến thành đơn vãng lai; chuẩn hóa +84/0; không nhận chủ đơn chỉ vì hai email rỗng.
- Tỷ lệ cọc 0 được tôn trọng; đơn không cần cọc không nhận báo đã chuyển.
- Giá xe tính cả điểm đến, tuyến không xác định phải tìm lại/liên hệ; báo giá và đặt xe khớp nhau trong test.
- Web chặn gửi lặp/đóng form khi đang gửi; lỗi mạng giữ dữ liệu; bỏ báo giá cũ sau khi đổi tuyến/đóng form.
- Android gửi điểm đến và lựa chọn ghép, giá tạm tính gồm khứ hồi/ghép.
- Quản trị hiện địa chỉ giao đặc sản đúng trường `deliveryAddress`.

## Rà thao tác theo web-design-guidelines

- `public/js/account.js` — bỏ focus trễ giành con trỏ sau khi nhập, không tự mở bàn phím mobile.
- `public/js/password-toggle.js` — nút có nhãn/trạng thái, không gửi form, giữ nguyên mật khẩu.
- `public/admin.html`, `public/doitac-quanly.html` — bố cục đơn dọc, nút xử lý dùng được trên màn nhỏ.
- `public/js/place.js` — không còn nút tour chết; nói rõ tour nhiều điểm dừng, không giả làm vé riêng.

## Chưa thể khẳng định sẵn sàng thương mại

1. **Firestore**: rules trong dự án còn quyền đọc/sửa đơn cho mọi tài khoản đăng nhập. Chặn dashboard không khóa truy cập Firestore trực tiếp. Cần chốt admin thật, xác minh backend dùng quyền dịch vụ phù hợp và triển khai rules. Chưa đổi quyền production.
2. **Tra cứu/theo dõi xe**: cần xác minh chủ đơn (OTP hoặc capability token) và chống dò trước khi phục vụ rộng rãi; test không chứng nhận toàn bộ bảo mật.
3. **Giao dịch**: khóa bộ nhớ chỉ bảo vệ một process. Cần transaction/unique constraint và idempotency key bền vững trước khi chạy nhiều instance. Timeout sau DB commit, crash giữa JSON/Firestore vẫn cần đối soát; chưa có transaction chung.
4. **Thanh toán**: chưa chuyển tiền, xác minh webhook/cổng VNPay/MoMo, hoàn tiền và đối soát thật. Nút đã chuyển không phải bằng chứng thanh toán.
5. **Chưa test live**: Google/Firebase Auth, OTP, FCM, GPS, chatbot AI, upload giấy tờ, tài khoản/quyền thật, sao lưu/khôi phục, tải cao và Android/iPhone thật.
6. **Dữ liệu cũ**: không tự sửa giá/sức chứa âm hoặc tin hàng production khi chưa biết giá trị đúng.
7. **Triển khai**: chưa push GitHub, deploy localmate.click/Firebase Rules hay cập nhật app đang cài; mã mới vẫn nằm trong workspace.

## Chạy lại

- `npm test`
- `npm run test:ui` (cần Playwright; có thể dùng `TEST_BROWSER_CHANNEL=msedge` và NODE_PATH của runtime)
- Tại `android-app`: `gradlew.bat :app:testDebugUnitTest`

Các dòng “Simulated ... failure” là lỗi giả lập để kiểm tra phục hồi, không phải test thất bại. Test không tạo đơn, chuyển tiền/thông báo hoặc sửa tài khoản khách thật.
