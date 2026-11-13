# Bản sửa giao diện và kiểm thử — 11/09/2026

## Đã sửa trong mã nguồn

- Nút mắt hiện/ẩn mật khẩu cho hộp đăng nhập/đăng ký khách, trang đối tác và quản trị; nút không gửi form, có nhãn hỗ trợ bàn phím/trình đọc màn hình.
- Giữ ngày nhận/trả từ trang chủ → kết quả tìm phòng → chi tiết → form đặt. Ngăn phản hồi tìm kiếm cũ ghi đè phản hồi mới.
- Chỉ khởi tạo dashboard và đăng ký nhận dữ liệu quản trị sau khi API xác nhận `is_admin`. Tài khoản đối tác được chuyển sang kênh riêng, không tự cấp thêm quyền.
- Đơn trên điện thoại chuyển sang bố cục dọc để thấy nút xử lý. Quản trị có xem chi tiết đơn và bộ lọc loại đơn/đối tác Đặc sản.
- Hiện nhãn địa chỉ đã lưu, giữ nhãn khi sửa và đặt mặc định.
- Hồ Tà Pạ vẫn thuộc tour văn hóa Khmer, Camping thuộc tour Thiên Cấm Sơn: giao diện nói rõ tour nhiều điểm dừng. Bỏ liên kết Núi Sam → Trà Sư không khớp lịch trình. Điểm chưa có tour có nút hỏi tour riêng, không tạo tour/giá giả.
- Giá phòng, sức chứa, thứ tự phải là số nguyên dương. Giao diện quản trị dùng API mới kiểm tra quyền và dữ liệu trước khi ghi. Rules phòng cũng thêm kiểm tra số nguyên dương.
- Thứ tự chọn lượng món: giảm / số lượng / tăng / đơn vị và tồn kho.

## Kiểm thử

- `npm test`: kiểm tra cú pháp toàn bộ JS, test các route thật với auth/storage giả lập.
- `npm run test:ui`: trình duyệt Playwright, API/SDK bên ngoài bị thay bằng dữ liệu giả. Kiểm tra các luồng trên màn 390×844, nút mật khẩu desktop, và nút tour ở cả 17 điểm đến.
- Script UI cần Playwright trong đường tìm module và trình duyệt đã cài. Có thể chọn Edge với `TEST_BROWSER_CHANNEL=msedge`; `NODE_PATH` có thể trỏ tới bộ thư viện môi trường. Không cần thêm thư viện này vào dependencies production.
- Test không đăng nhập tài khoản thật, tạo đơn thật, gửi thông báo thật hay sửa hồ sơ/phòng production.

## Chưa triển khai / cần lưu ý

1. Chưa push GitHub, cập nhật máy chủ hoặc Firebase Rules. Việc push tới remote đang chờ người dùng cho phép đích nhận mã nguồn.
2. Chặn dashboard **không đồng nghĩa đã khóa toàn bộ Firestore**: rules hiện có trong dự án vẫn cho mọi tài khoản đăng nhập đọc/sửa đơn và các dữ liệu khác. Cần xác định danh sách admin thật và chuyển truy cập backend sang cơ chế phù hợp trước khi siết rules. Không áp một danh sách email đoán mò làm khóa người vận hành. Quyền cấp admin do `ADMIN_EMAILS` trên máy chủ quyết định, không dựa vào tên email chứa “homestay”.
3. Rules phòng phải được triển khai riêng; test hiện tại chưa chạy Firestore Emulator. API mới đã kiểm tra dữ liệu nhưng các client cũ dùng SDK trực tiếp vẫn phụ thuộc rules đang triển khai.
4. Không tự sửa giá/sức chứa âm đã có trong dữ liệu production: cần giá và sức chứa đúng của chủ phòng.
5. “Đặc sản” được bổ sung đúng loại/bộ lọc; không tạo đối tác, tài khoản hoặc hàng đang bán giả.

Tham khảo phân quyền theo vai trò trong [tài liệu Firebase](https://firebase.google.com/docs/rules/rules-and-auth).
