# Bay Nui Stay — Android App

Ứng dụng Android native của Bay Nui Stay, được tách riêng hoàn toàn khỏi website.
App dùng Kotlin + Jetpack Compose và **không dùng WebView**.

## Phạm vi MVP hiện tại

- Design system màu đất/kem/xanh rừng đồng bộ với website.
- Navigation Compose: splash, login, home, explore, culture, AI, trip, passport, profile.
- Home có hero, thời tiết, trải nghiệm, Culture Graph và điểm đến.
- Màn Văn hóa Khmer thể hiện các nhánh địa điểm, ẩm thực, lễ hội, lưu trú và story.
- AI Trip Planner có luồng nhập yêu cầu → phân tích → lịch trình demo.
- Live Trip timeline, cảnh báo đổi lịch theo mưa, Bay Nui Passport và profile.
- Hilt, Retrofit, OkHttp interceptor JWT/ngôn ngữ, Room cache và DataStore đã được cấu hình.
- Khi backend chưa có `/v1/weather`, app tự dùng dữ liệu demo để không hiện màn hình trắng.

## Chạy bằng Android Studio

1. Cài Android Studio và Android SDK 35.
2. Mở riêng thư mục `android-app`.
3. Chọn JDK 17 trong Gradle Settings.
4. Chạy website/backend ở thư mục cha bằng `npm start`.
5. Chạy app trên Android Emulator. `10.0.2.2:3000` đã được cấu hình để emulator gọi máy host.

Nếu chạy trên điện thoại thật, đổi `API_BASE_URL` trong `app/build.gradle.kts` thành địa chỉ IP LAN của máy, ví dụ `http://192.168.1.10:3000/`.

## Backend cần bổ sung tiếp

MVP đã chuẩn bị contract cho:

- `GET /v1/weather`
- `POST /v1/ai/itinerary`

Theo kế hoạch tổng thể, bước tiếp theo là hoàn thành Task 1–8 ở backend trước khi thay dữ liệu demo bằng dữ liệu thật.
