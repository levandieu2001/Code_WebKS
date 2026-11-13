Tôi muốn bạn **REDESIGN TOÀN BỘ GIAO DIỆN WEBSITE BAY NUI STAY** hiện tại thành một sản phẩm du lịch thông minh có chất lượng đủ tốt để:

1. Đưa vào sử dụng thương mại thực tế.
2. Trình diễn trong cuộc thi dự án/khởi nghiệp/công nghệ.
3. Tạo cảm giác WOW ngay từ lần đầu Ban giám khảo nhìn thấy.
4. Không giống một website bài tập sinh viên hoặc template Bootstrap thông thường.

# QUAN TRỌNG

Trước khi code:

- Hãy đọc và phân tích toàn bộ project hiện tại.
- Xác định framework, cấu trúc component, CSS, backend và API đang sử dụng.
- Xác định các chức năng hiện có.
- Không được xóa hoặc phá chức năng đang hoạt động.
- Không thay đổi API/backend nếu không thực sự cần thiết.
- Không làm lại project từ đầu nếu project hiện tại có thể nâng cấp.
- Tái sử dụng dữ liệu, API và logic hiện tại.
- Chỉ refactor khi cần để giao diện dễ bảo trì hơn.
- Nếu một chức năng chưa có dữ liệu thật thì sử dụng mock data đẹp, hợp lý để demo.
- Sau khi redesign phải đảm bảo Responsive tốt trên Desktop, Tablet và Mobile.

Mục tiêu cuối cùng:

# BAY NUI STAY
## AI-Powered Smart Cultural Tourism Platform

Website phải thể hiện được rằng Bay Nui Stay không chỉ là trang giới thiệu du lịch mà là:

**Một trợ lý du lịch AI kết nối địa điểm – văn hóa – khách sạn – ẩm thực – lễ hội – tour – xe đưa đón – trải nghiệm – đặc sản địa phương thành một hệ sinh thái thống nhất.**

---

# 1. PHONG CÁCH THIẾT KẾ

Thiết kế theo phong cách:

**Premium Travel + Nature + Culture + Modern AI**

Cảm giác khi nhìn website:

- Sang trọng.
- Hiện đại.
- Có chiều sâu.
- Mang bản sắc Bảy Núi.
- Gần gũi thiên nhiên.
- Không quá công nghệ lạnh lẽo.
- Không giống website hành chính.
- Không giống website WordPress du lịch cũ.
- Không giống dashboard SaaS.
- Không dùng quá nhiều màu.

Thiết kế cần có cảm giác tương tự chất lượng của các nền tảng du lịch thương mại hàng đầu, nhưng phải tạo được nhận diện riêng cho Bay Nui Stay.

---

# 2. DESIGN SYSTEM

Hãy xây dựng Design System thống nhất cho toàn website.

## Màu chủ đạo

Ưu tiên:

### Deep Forest Green
Đại diện cho núi rừng Bảy Núi.

Ví dụ:

#12372A
#1B4332
#24543F

### Warm Sand / Cream

#F7F3EA
#FFFDF8

### Accent Gold

Sử dụng rất hạn chế để tạo cảm giác premium.

#CDA45E
#D7B46A

### Secondary Green

#52B788

Không sử dụng quá nhiều màu gradient neon.

Gradient chỉ dùng nhẹ ở những khu vực AI hoặc Hero.

---

# 3. TYPOGRAPHY

Typography phải sang và dễ đọc.

Heading:

- Bold.
- Rõ.
- Có khoảng thở.
- Không quá nhiều font.

Body:

- Sạch.
- Dễ đọc.
- Line-height thoải mái.

Tạo hierarchy rõ ràng:

H1 > H2 > H3 > Body > Caption.

Không để toàn website chữ cùng kích thước như project sinh viên.

---

# 4. BORDER RADIUS

Các card sử dụng bo góc hiện đại:

16px – 24px.

Hero hoặc hình lớn:

24px – 32px.

Button:

10px – 14px.

Không bo tròn mọi thành phần quá mức.

---

# 5. SHADOW

Shadow rất nhẹ.

Không sử dụng box-shadow đậm kiểu cũ.

Card nên tạo chiều sâu bằng:

- Border nhẹ.
- Background.
- Shadow rất mềm.
- Hover elevation.

---

# 6. ANIMATION

Website phải có micro-animation đẹp.

Ví dụ:

- Card hover nhẹ.
- Image zoom rất nhẹ.
- Button hover.
- Scroll reveal.
- Fade.
- Slide.
- Loading Skeleton.
- AI typing animation.
- Smooth navigation.

Animation phải:

- Mượt.
- Sang.
- Không quá nhiều.
- Không làm website giống landing page quảng cáo rẻ tiền.

---

# 7. NAVBAR

Navbar Desktop:

Logo BAY NUI STAY.

Menu:

Khám phá
Trải nghiệm
Văn hóa
Ẩm thực
Tour
Lưu trú
Dịch vụ

Bên phải:

❤️ Yêu thích

✨ Bay Nui AI

Đăng nhập / Avatar

Navbar:

- Transparent khi ở đầu Hero.
- Chuyển thành background blur/solid khi scroll.
- Sticky.
- Có animation nhẹ.

Mobile dùng bottom navigation hoặc menu phù hợp.

---

# 8. HERO SECTION – PHẦN QUAN TRỌNG NHẤT

Hero phải tạo hiệu ứng WOW.

Không làm banner đơn giản có ảnh + chữ.

Sử dụng ảnh/video phong cảnh Bảy Núi chất lượng cao.

Có overlay gradient nhẹ để chữ rõ.

Headline lớn:

# Khám phá Bảy Núi
## Theo cách của riêng bạn.

Sub headline:

**AI đồng hành cùng bạn từ lúc lên kế hoạch, tìm nơi ở, khám phá văn hóa cho đến từng trải nghiệm trên hành trình.**

CTA:

### ✨ Lập hành trình bằng AI

Secondary:

### Khám phá Bảy Núi

Bên dưới Hero có một:

# SMART TRIP SEARCH

Ví dụ:

Bạn muốn đi đâu?

[ Núi Cấm ]

Ngày đi

[ 15/08/2026 ]

Số người

[ 2 người ]

Sở thích

[ Văn hóa ]

Button:

# ✨ Tạo chuyến đi

Search bar phải floating lên Hero, thiết kế premium.

---

# 9. AI TRAVEL ASSISTANT

Ngay sau Hero tạo section rất nổi bật:

# Chuyến đi hoàn hảo bắt đầu từ một câu hỏi.

Một AI panel có giao diện đẹp.

Ví dụ conversation:

USER:

"Tôi có 2 ngày 1 đêm, ngân sách 2 triệu và muốn khám phá văn hóa Khmer."

AI:

"Để tôi thiết kế chuyến đi phù hợp cho bạn."

Sau đó animation hiển thị:

✓ Phân tích thời tiết

✓ Tìm địa điểm

✓ Kiểm tra khoảng cách

✓ Tìm nơi lưu trú

✓ Tìm món ăn địa phương

↓

# Hành trình đã sẵn sàng

CTA:

### Thử Bay Nui AI

Section này cần làm cho Ban giám khảo nhìn vào là hiểu:

**AI là trái tim của Bay Nui Stay.**

---

# 10. EXPLORE BY EXPERIENCE

Không chỉ hiển thị "địa điểm nổi bật".

Tạo section:

# Bạn muốn trải nghiệm Bảy Núi theo cách nào?

Card lớn đẹp cho:

🛕 Văn hóa

🍲 Ẩm thực

🌄 Check-in

🎉 Lễ hội

🌿 Thiên nhiên

🙏 Tâm linh

🧺 Làng nghề

🚐 Tour

Card sử dụng hình ảnh full background.

Overlay gradient.

Icon nhỏ.

Tên.

Mô tả rất ngắn.

Hover:

ảnh zoom nhẹ + nút Khám phá xuất hiện.

---

# 11. FEATURED CULTURAL EXPERIENCE

Đây là section cực kỳ quan trọng để thể hiện điểm khác biệt dự án.

Title:

# Không chỉ tham quan.
## Hãy thực sự sống trong văn hóa địa phương.

Feature lớn:

# Khám phá văn hóa Khmer

Ảnh đẹp.

Một bên hiển thị:

🛕 Điểm tham quan

🍲 Ẩm thực Khmer

🎉 Lễ hội

🧺 Làng nghề

🏨 Nơi ở gần đó

🚗 Xe đưa đón

CTA:

### Khám phá văn hóa Khmer

### ✨ Tạo hành trình Khmer bằng AI

Phần này phải thiết kế premium và nổi bật hơn card thông thường.

---

# 12. SMART CULTURE GRAPH UI

Tạo một visualization nhỏ để thể hiện công nghệ đặc biệt của Bay Nui Stay.

Ví dụ trung tâm:

# VĂN HÓA KHMER

Xung quanh:

Địa điểm

Ẩm thực

Lễ hội

Khách sạn

Tour

Làng nghề

Đặc sản

Người địa phương

Các node liên kết bằng line animation rất nhẹ.

Có text:

**Bay Nui AI kết nối từng trải nghiệm thành một hành trình hoàn chỉnh.**

Đây không cần quá phức tạp nhưng phải nhìn giống một sản phẩm công nghệ thật.

---

# 13. DESTINATIONS

Section:

# Điểm đến nổi bật

Card địa điểm cần có:

Ảnh lớn.

Badge:

Nổi bật
Gần bạn
Văn hóa
Thiên nhiên

Tên địa điểm.

Địa phương.

⭐ Rating.

Khoảng cách.

Weather mini icon.

CTA:

Xem chi tiết.

Card không được chứa quá nhiều chữ.

---

# 14. SMART NEARBY

Nếu có GPS:

Section:

# 📍 Gần bạn lúc này

Không chỉ:

"Gần bạn"

Mà hiển thị:

### Bay Nui AI đề xuất cho bạn lúc này

Ví dụ:

☀️ Thời tiết đẹp

🌄 Tà Pạ

1.2 km

**Thích hợp check-in trong 2 giờ tới.**

Hoặc:

🌧 Sắp mưa

🍲 Quán ăn địa phương

500m

**Phù hợp để ghé trước khi trời tạnh.**

Đây phải là một section khác biệt với website du lịch bình thường.

---

# 15. DESTINATION DETAIL PAGE

Redesign trang chi tiết địa điểm.

Hero:

Ảnh lớn cinematic.

Tên địa điểm.

Location.

Rating.

Weather.

Save.

Share.

Button:

Chỉ đường.

Sau Hero chia nội dung:

## Tổng quan

## Điểm nổi bật

## Văn hóa & câu chuyện

## Thời tiết

## Bản đồ

Sau đó:

# Hoàn thiện chuyến đi của bạn

Các card:

🏨 Ở đâu gần đây?

🍲 Ăn gì gần đây?

🚗 Đặt xe đến đây

🎫 Tour liên quan

🎁 Đặc sản

📷 Điểm Check-in

Cuối trang:

# ✨ Để Bay Nui AI lên kế hoạch cho bạn

---

# 16. CULTURE DETAIL PAGE

Ví dụ:

# Văn hóa Khmer

Hero lớn có ảnh/video.

Subtitle:

**Khám phá một trong những lớp văn hóa đặc sắc nhất của vùng Bảy Núi.**

Có Tabs:

Tổng quan

Điểm đến

Ẩm thực

Lễ hội

Trải nghiệm

Làng nghề

Câu chuyện

Bên phải/đầu trang:

# ✨ Tạo Cultural Journey

Sau đó:

## Địa điểm nên khám phá

## Món ăn nên thử

## Lễ hội

## Trải nghiệm địa phương

## Nơi ở gần các địa điểm

## Tour liên quan

## Verified Local Stories

---

# 17. VERIFIED LOCAL STORIES

Thiết kế section như storytelling platform.

Title:

# Câu chuyện từ chính người Bảy Núi

Card gồm:

Avatar.

Tên người kể.

Nhãn:

✓ Verified Local Story

Ảnh/video.

Một đoạn trích ngắn.

Button:

Nghe câu chuyện.

Có Audio Player đẹp.

---

# 18. FESTIVAL SECTION

Tạo section:

# Lễ hội sắp diễn ra

Không chỉ card đơn giản.

Thiết kế dạng Timeline/Calendar.

Hiển thị:

Ngày.

Tên lễ hội.

Văn hóa.

Địa điểm.

Khoảng cách.

CTA:

Xem chi tiết.

Nếu ngày đi của khách trùng:

Badge:

# ✨ Phù hợp chuyến đi của bạn

---

# 19. FOOD EXPERIENCE

Section:

# Hương vị Bảy Núi

Card món ăn sử dụng ảnh đẹp.

Có:

Tên món.

Loại văn hóa.

Giá tham khảo.

Những nơi có món này.

CTA:

Tìm nơi ăn.

Không trình bày giống website bán đồ ăn.

Phải mang cảm giác storytelling + travel.

---

# 20. HOTEL / ACCOMMODATION

Card khách sạn thương mại hiện đại.

Ảnh.

Tên.

Location.

Rating.

Giá từ.

Khoảng cách tới địa điểm khách đang xem.

Ví dụ:

**Cách Núi Cấm 1.2 km**

Amenities nhỏ.

CTA:

Xem phòng.

Đặt ngay.

---

# 21. TOUR

Card Tour:

Ảnh.

Title.

Duration.

Số người.

Rating.

Giá.

Các địa điểm chính.

CTA:

Xem Tour.

---

# 22. LOCAL SERVICES

Section:

# Mọi thứ bạn cần cho chuyến đi

Service cards:

🚗 Xe đưa đón

🛵 Thuê xe

🏨 Lưu trú

🍲 Ăn uống

🎫 Tour

🎁 Đặc sản

Thiết kế icon + card đẹp, không dùng icon mặc định xấu.

---

# 23. LIVE TRIP MODE UI

Tạo giao diện:

# Chuyến đi hôm nay

Timeline:

08:00 ✓ Đã tham quan

10:00 ✓ Hoàn thành

12:00 → Ăn trưa

14:00 Điểm tiếp theo

17:00 Khách sạn

Có progress:

3 / 7 hoạt động hoàn thành.

AI card:

# ✨ Bay Nui AI

"Thời tiết lúc 14:00 có khả năng mưa. Tôi đề xuất đổi điểm check-in sang 16:30."

Buttons:

### Áp dụng

### Giữ lịch cũ

Đây là một feature quan trọng khi demo cuộc thi.

---

# 24. BAY NUI PASSPORT

Thiết kế một Digital Passport rất đẹp.

Không làm như bảng điểm.

Phải giống Passport/Travel Journal.

Hiển thị:

Avatar.

Tên khách.

Số địa điểm đã khám phá.

Cultural Level.

Collection.

Digital Stamps.

Ví dụ:

🛕 Khmer Culture

🌄 Seven Mountains Explorer

🍲 Local Food

🎉 Festival

Stamp phải có graphic đẹp.

---

# 25. AI CHATBOT FLOATING BUTTON

Floating AI button luôn có ở website.

Không dùng icon chatbot cũ.

Thiết kế:

✨ Bay Nui AI

Click mở panel.

Panel:

Glass effect nhẹ.

Welcome:

"Xin chào 👋
Hôm nay bạn muốn khám phá Bảy Núi như thế nào?"

Quick Questions:

🌄 Đi đâu hôm nay?

🍲 Ăn gì gần tôi?

🛕 Khám phá văn hóa Khmer

✨ Tạo chuyến đi

Chatbot phải nhìn premium.

---

# 26. BOOKING FLOW

Luồng đặt dịch vụ phải đơn giản.

Không dùng form quá dài.

Ví dụ Booking:

### Step 1
Chọn dịch vụ

↓

### Step 2
Thông tin

↓

### Step 3
Xác nhận

↓

# ✓ Đặt thành công

Có progress indicator.

Booking confirmation card đẹp.

---

# 27. PROFILE

Trang cá nhân thiết kế giống travel account.

Có:

Chuyến đi sắp tới.

Booking.

Saved Places.

AI Trips.

Passport.

Reviews.

Voucher.

Không làm giống Admin dashboard.

---

# 28. FOOTER

Footer premium.

Có:

Bay Nui Stay logo.

Tagline:

**Khám phá Bảy Núi theo cách của riêng bạn.**

Columns:

Khám phá

Dịch vụ

Về Bay Nui Stay

Hỗ trợ

Social.

Có:

Made for the Seven Mountains.

---

# 29. EMPTY STATE

Không được để trang trống xấu.

Ví dụ chưa có booking:

Illustration/Icon đẹp.

**Bạn chưa có chuyến đi nào.**

"Để Bay Nui AI tạo chuyến đi đầu tiên cho bạn."

CTA:

✨ Tạo chuyến đi.

---

# 30. LOADING STATE

Sử dụng Skeleton Loading.

Không hiển thị text:

Loading...

trên trang trắng.

---

# 31. ERROR STATE

Thiết kế Error State đẹp và thân thiện.

Ví dụ:

**Không thể tải dữ liệu lúc này.**

Button:

Thử lại.

---

# 32. RESPONSIVE

Website phải responsive thật sự.

Desktop:

Tận dụng không gian rộng.

Tablet:

Grid điều chỉnh.

Mobile:

Không thu nhỏ Desktop.

Phải thiết kế lại flow phù hợp mobile.

Mobile có thể dùng Bottom Navigation:

Home

Explore

AI

Trip

Profile

---

# 33. ACCESSIBILITY

Đảm bảo:

- Contrast tốt.
- Font không quá nhỏ.
- Button đủ lớn.
- Keyboard accessibility.
- Alt image.
- Focus states.
- Không dùng màu là cách duy nhất để truyền đạt thông tin.

---

# 34. PERFORMANCE

Tối ưu:

- Lazy load ảnh.
- WebP/AVIF nếu phù hợp.
- Skeleton.
- Không load animation quá nặng.
- Không làm video Hero khiến website quá chậm.
- Code splitting nếu framework hỗ trợ.
- Responsive image.
- Cache hợp lý.

---

# 35. SEO

Đảm bảo:

Title.

Meta description.

Open Graph.

Semantic HTML.

Heading structure.

Schema nếu phù hợp cho:

- Hotel.
- TouristDestination.
- Event.
- Restaurant.
- Tour.

---

# 36. KHÔNG ĐƯỢC LÀM

Tuyệt đối tránh:

- Bootstrap UI mặc định.
- Card trắng giống nhau toàn bộ website.
- Gradient tím/xanh kiểu AI SaaS.
- Neon quá nhiều.
- Glassmorphism khắp mọi nơi.
- Hero generic.
- Icon emoji trong UI production nếu có icon library tốt hơn.
- Font quá nhỏ.
- Button quá nhiều màu.
- 5–6 màu chính.
- Animation bay nhảy.
- Background pattern rối.
- Text quá dài trên trang chủ.
- Dashboard hóa website du lịch.
- Nhồi quá nhiều tính năng vào một màn hình.
- Copy giao diện Booking, Airbnb hoặc Traveloka 1:1.
- Làm giao diện giống project sinh viên.

---

# 37. ƯU TIÊN VISUAL STORYTELLING

Tỷ lệ:

Hình ảnh và trải nghiệm trực quan cao.

Text ngắn.

Nội dung dài chỉ xuất hiện khi khách muốn đọc.

Ưu tiên:

Ảnh.

Video.

Map.

Timeline.

Story.

Interactive UI.

---

# 38. CẢM XÚC THƯƠNG HIỆU

Mỗi màn hình phải truyền được một trong các cảm giác:

# KHÁM PHÁ

# TÒ MÒ

# TỰ DO

# VĂN HÓA

# THIÊN NHIÊN

# KẾT NỐI

# THÔNG MINH

AI không được khiến website mất đi cảm giác văn hóa địa phương.

---

# 39. ĐIỂM NHẤN KHI ĐI THI

Ngay trong 30–60 giây đầu khi trình diễn website, Ban giám khảo phải nhìn thấy được:

1. Bay Nui Stay phục vụ du lịch Bảy Núi.

2. Có AI thực sự hữu ích.

3. Văn hóa địa phương là điểm cốt lõi.

4. Có khả năng thương mại hóa.

5. Có hệ sinh thái dịch vụ.

6. Có công nghệ khác biệt.

Do đó Landing Page phải ưu tiên kể câu chuyện:

BẢY NÚI

↓

CHỌN TRẢI NGHIỆM

↓

AI HIỂU BẠN

↓

AI TẠO HÀNH TRÌNH

↓

ĐẶT DỊCH VỤ

↓

TRẢI NGHIỆM THỰC TẾ

↓

LƯU HÀNH TRÌNH

---

# 40. THỨ TỰ SECTION TRANG CHỦ ĐỀ XUẤT

Navbar

↓

Hero

↓

Smart Trip Search

↓

AI Travel Assistant

↓

Explore By Experience

↓

Featured Khmer Cultural Experience

↓

Popular Destinations

↓

Smart Nearby

↓

Festival

↓

Food Experience

↓

Stay Near Your Destination

↓

Tour

↓

Bay Nui Culture Graph

↓

Verified Local Stories

↓

Bay Nui Passport

↓

Partner Ecosystem

↓

AI CTA

↓

Footer

---

# 41. PHẦN PARTNER ECOSYSTEM

Tạo section giúp Ban giám khảo hiểu mô hình thương mại.

Title:

# Du lịch phát triển khi cộng đồng cùng phát triển.

Visual:

Bay Nui Stay ở giữa.

Xung quanh:

Khách sạn

Nhà hàng

Tài xế

Tour

Làng nghề

Cửa hàng đặc sản

Người dân địa phương

Text:

**Bay Nui Stay kết nối du khách với các dịch vụ địa phương, giúp dòng tiền du lịch quay trở lại cộng đồng.**

---

# 42. FINAL CTA

Trước Footer:

Background cực đẹp.

Title:

# Bảy Núi đang chờ bạn.

Subtitle:

**Hãy để Bay Nui AI biến sở thích của bạn thành một chuyến đi đáng nhớ.**

Button lớn:

# ✨ Tạo chuyến đi của tôi

Secondary:

Khám phá Bảy Núi

---

# 43. YÊU CẦU VỀ CODE

Sau khi phân tích project hiện tại:

1. Liệt kê ngắn gọn các file/component cần sửa.

2. Tạo Design System dùng chung.

3. Tạo component reusable.

Ví dụ:

Button
Card
Badge
SectionHeader
DestinationCard
HotelCard
TourCard
FoodCard
ExperienceCard
AIWidget
SearchBox
WeatherWidget
StoryCard
FestivalCard
ServiceCard
BookingModal

4. Không copy-paste CSS cho từng trang.

5. Sử dụng variables/tokens.

6. Giữ code sạch và dễ mở rộng.

7. Không phá dữ liệu hiện tại.

8. Không để dummy button không hoạt động nếu đã có logic tương ứng.

---

# 44. CÁCH TRIỂN KHAI

Không redesign tất cả một cách ngẫu nhiên.

Làm theo thứ tự:

PHASE 1

Design System + Navbar + Footer.

PHASE 2

Home Page.

PHASE 3

Destination Detail.

PHASE 4

Culture Detail.

PHASE 5

AI Trip Planner.

PHASE 6

Hotel + Tour + Services.

PHASE 7

Trip Mode + Passport.

PHASE 8

Profile + remaining pages.

Sau mỗi Phase:

- Kiểm tra responsive.
- Kiểm tra chức năng.
- Kiểm tra UI consistency.
- Sửa lỗi trước khi qua Phase tiếp theo.

---

# 45. YÊU CẦU CUỐI

Hãy redesign Bay Nui Stay như một **startup du lịch thực sự chuẩn bị gọi vốn và phát hành sản phẩm**, không phải một bài tập giao diện.

Mỗi quyết định UI/UX phải trả lời được:

**Điều này có giúp khách dễ lập kế hoạch chuyến đi hơn không?**

**Điều này có giúp khách hiểu văn hóa Bảy Núi hơn không?**

**Điều này có giúp khách dễ đặt dịch vụ hơn không?**

**Điều này có thể sử dụng ngoài đời thực không?**

**Điều này có đủ ấn tượng để trình diễn trước Ban giám khảo không?**

Ưu tiên:

# CLEAN
# PREMIUM
# CULTURAL
# INTELLIGENT
# COMMERCIAL
# MEMORABLE

Kết quả cuối cùng phải khiến người xem cảm giác:

**“Đây là một sản phẩm du lịch thật có thể đưa ra thị trường”,**

chứ không phải:

**“Đây là website của một bài đồ án.”**