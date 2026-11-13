# Phát hành APK LOCALMATE 1.0.2

- Thời điểm: 2026-09-12 06:58 UTC (13:58 Việt Nam).
- Link: https://localmate.click/tai-app/LOCALMATE-1.0.2.apk
- Package `vn.baynuistay`, versionCode 13, versionName 1.0.2.
- SHA-256 APK: `699e6cf48824929cc313919d9126a48699aa67055047df9b154e2ea8c81f82bd`.
- Chữ ký SHA-256: `d40c8ab595aeec7817964c010f972f4b03fc94c91ac75ae16bb3a66951325cb7`, khớp bản cũ.
- Tải lại APK từ URL công khai: checksum khớp. Website HTTP 200.
- API `have=12`: update_available=true; `have=13`: false. Không ép buộc cập nhật.
- Alias tải `LOCALMATE.apk` được đổi sang file mới; bản có tên 1.0.1 vẫn được giữ.
- Metadata phiên bản đã được script hiện có trên máy chủ sao lưu trước khi ghi bản 13.

## Thông báo

Đã thử gửi một đợt push: registered_android=1, accepted=0, failed=0, expired=1. FCM báo token thiết bị hết hiệu lực, không thể coi là thông báo đã tới người dùng. Đóng hẳn/mở app sẽ kiểm tra phiên bản và đăng ký lại token theo luồng hiện có; người dùng cũng có thể tải APK trực tiếp.

## Phạm vi triển khai

Chỉ tải APK đã ký và manifest JSON vào máy chủ localmate.click, rồi sử dụng script phát hành có sẵn. Không triển khai mã nguồn mới, không thay Firebase Rules. Bước git commit/push bị lớp quyền từ chối; các thay đổi source cho 1.0.2 vẫn ở workspace và chưa đồng bộ GitHub. Máy chủ còn chạy commit 7cb8266; hai trường bổ sung cho API tour days/soldOut ở workspace chưa được triển khai, backend hiện có vẫn tự kiểm tra khi đặt.

Script phát hành đang có trên server dùng nội dung push chung; ghi chú cập nhật hiển thị trong app đã là nội dung 1.0.2 có Đặc sản, Tour, sổ địa chỉ và chỗ nghỉ đối tác.
