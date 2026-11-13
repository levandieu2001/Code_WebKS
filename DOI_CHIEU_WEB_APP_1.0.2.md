# Đối chiếu web và Android — 1.0.2

## Bổ sung trong đợt này

| Web | Android trước | Android mới |
| --- | --- | --- |
| Đặc sản đang bán | Chưa có màn mua hàng; chỉ giới thiệu ẩm thực tại điểm đến | Màn native danh sách, tìm không dấu, khu vực, còn hàng, giá tăng/giảm, chi tiết, tồn kho, giao hàng/bảo quản |
| Đặt đặc sản | Chưa có | Form người nhận, điện thoại, địa chỉ, số lượng, ghi chú, chọn địa chỉ đã lưu; gửi `kind=food` tới cùng API web |
| Biên nhận đặc sản | Không có luồng đặt | Hiện mã/tổng đơn và nút xem đơn; địa chỉ giao hiện trong Đơn của tôi |
| Tour | Nút tại điểm đến dẫn nhầm phòng nghỉ | Danh sách tour native, lịch trình, ngày đi, số khách, đặt đúng slug và mã đơn |
| Chỗ nghỉ đối tác | Danh sách chỉ đọc rooms homestay | Đọc `/v1/stays/search`, gồm đối tác; tìm theo tên/khu vực |
| Sổ địa chỉ | Chưa có quản lý | Thêm/sửa/xóa có xác nhận, tên gợi nhớ, mặc định, thông tin cá nhân qua cùng API web |
| Điều hướng dịch vụ | Tab Đặt dịch vụ mở phòng, thiếu Đặc sản | Lối vào Phòng/Xe/Tour/Đặc sản/Đơn ở Trang chủ và Đặt dịch vụ; thêm Đặc sản/Tài khoản ở Cá nhân |
| Số liệu cá nhân | Số mẫu 2/3/5 và mục đã lưu không chạy | Gỡ số liệu giả/mục không có chức năng, giữ dữ liệu thật |

Giao diện mới dùng Jetpack Compose native, không nhúng trang web. Không tạo thêm sản phẩm, giá hay đối tác giả. Cache đơn cục bộ bị lỗi không đổi một đơn đã lưu trên server thành báo đặt thất bại.

## Kiểm thử

- 12 unit test CommerceLogic/DTO và 5 test giá xe: đạt.
- Ba test giao diện native trên Pixel_8 Android 15 (lượt test mở rộng sau cùng): đạt, 0 bỏ qua, 0 lỗi.
  - Đặc sản: danh sách → chi tiết → chặn form thiếu → đặt món qua API giả lập → biên nhận; một request đúng listing_id/quantity/address.
  - Tour: mở đúng slug, báo lỗi mạng và giữ form, thử lại thành công; lỗi ghi cache máy không biến thành đặt thất bại.
  - Sổ địa chỉ: hiển thị tên gợi nhớ, sửa tên, lưu lại, hỏi xác nhận xóa, giữ lại khi hủy xác nhận và xóa đúng địa chỉ.
- Một lượt test đặc sản trước đó chờ quá hạn; đã bổ sung thông tin lỗi và làm bước form trống độc lập với dữ liệu đã lưu. Lượt 3 test sau cùng đạt đầy đủ.
- Build release/lint vital và 17 unit test lượt cuối: đạt. APK 1.0.2 (versionCode 13) đã được đóng gói lại sau 3 test native, chữ ký được kiểm tra trước khi bàn giao; chưa thay link công khai 1.0.1.
- Không tạo đơn mua, chuyển tiền, sửa hồ sơ thật để kiểm thử.

## Chưa đồng nhất hoàn toàn

- Chưa kiểm thử toàn bộ giao diện bằng điện thoại vật lý, bàn phím OEM và TalkBack.
- Một số công cụ vận hành chuyên sâu của web (đối soát/sao kê, lịch phòng nhiều đơn vị, in QR, báo cáo quản trị) chưa được sao chép đầy đủ sang app native trong đợt này.
- Đăng nhập Google, tìm kiếm chỗ nghỉ theo ngày và bộ ảnh/đánh giá đầy đủ như trang chi tiết web vẫn cần đối chiếu/bổ sung tiếp; không coi lần này là parity 100%.
- Các hạn chế phân quyền Firestore, xác minh số điện thoại và transaction bền vững trong báo cáo trước vẫn còn; không triển khai thay đổi Firebase Rules.
