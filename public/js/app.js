// ============================================
// LOCALMATE - Main Application
// Full i18n + Multi-page
// ============================================

// ── TRANSLATIONS ──
const TRANSLATIONS = {
    // Navigation
    nav_home: { vi: 'Trang chủ', en: 'Home' },
    nav_rooms: { vi: 'Chỗ nghỉ', en: 'Stays' },
    nav_specialty: { vi: 'Đặc sản', en: 'Local specialties' },
    nav_partner: { vi: 'Đối tác', en: 'Partners' },
    nav_explore: { vi: 'Điểm đến', en: 'Destinations' },
    nav_understand: { vi: 'Hiểu An Giang', en: 'About An Giang' },
    nav_passport: { vi: 'Hộ chiếu', en: 'Passport' },
    nav_journal: { vi: 'Nhật ký', en: 'Journal' },
    nav_contact: { vi: 'Liên hệ', en: 'Contact' },
    nav_book: { vi: 'Đặt ngay', en: 'Book Now' },

    // Hero
    hero_badge: { vi: '✨ Kết nối homestay · tài xế · tour', en: '✨ Homestays · drivers · tours, connected' },
    hero_title: { vi: 'Người địa phương<br>lo phần còn lại', en: 'Local people<br>handle the rest' },
    hero_subtitle: { vi: 'Chỗ nghỉ, xe đưa đón và tour do chính người bản địa vận hành — chọn và đặt trong một nơi.', en: 'Stays, rides and tours run by local people — choose and book them all in one place.' },
    hero_cta: { vi: 'Kiểm tra phòng', en: 'Check Rooms' },
    hero_cta2: { vi: 'Khám phá ↗', en: 'Explore ↗' },
    hero_stat1: { vi: 'Khách hài lòng', en: 'Happy Guests' },
    hero_stat2: { vi: 'Đánh giá TB', en: 'Avg Rating' },
    hero_stat3: { vi: 'Loại phòng', en: 'Room Types' },

    // Why Choose Us
    why_tag: { vi: 'Tại sao chọn chúng tôi', en: 'Why Choose Us' },
    why_title: { vi: 'Trải nghiệm đẳng cấp giữa thiên nhiên', en: 'Premium Experience in Nature' },
    why_desc: { vi: 'Nơi hội tụ giữa sự hoang sơ của núi rừng Thất Sơn và sự tiện nghi hiện đại', en: 'Where the wilderness of Seven Mountains meets modern comfort' },
    feat1_title: { vi: 'View Núi Tuyệt Đẹp', en: 'Stunning Mountain Views' },
    feat1_desc: { vi: 'Tận hưởng khung cảnh hùng vĩ của dãy Thất Sơn từ phòng nghỉ mỗi sáng thức dậy.', en: 'Enjoy the majestic views of Seven Mountains range every morning from your room.' },
    feat2_title: { vi: '100% Thân Thiện Môi Trường', en: '100% Eco-Friendly' },
    feat2_desc: { vi: 'Vật liệu tự nhiên, năng lượng xanh, giảm thiểu rác thải — bảo vệ thiên nhiên.', en: 'Natural materials, green energy, minimal waste — protecting nature for future generations.' },
    feat3_title: { vi: 'Ẩm Thực Địa Phương', en: 'Local Cuisine' },
    feat3_desc: { vi: 'Thưởng thức đặc sản vùng Bảy Núi: bánh xèo lá cây, cơm lá sen, mắm kho.', en: 'Savor Bảy Núi specialties: leaf pancakes, lotus leaf rice, fermented fish hotpot.' },
    feat4_title: { vi: 'An Toàn & Riêng Tư', en: 'Safe & Private' },
    feat4_desc: { vi: 'Không gian riêng tư tuyệt đối, camera an ninh 24/7, nhân viên hỗ trợ tận tình.', en: 'Complete privacy, 24/7 security cameras, dedicated staff support.' },

    // Explore Preview
    explore_tag: { vi: 'Khám phá An Giang', en: 'Discover An Giang' },
    explore_title: { vi: 'Trải nghiệm không thể bỏ lỡ', en: 'Must-Try Experiences' },
    explore_desc: { vi: 'Những điểm đến tuyệt vời xung quanh homestay chỉ cách vài cây số', en: 'Amazing destinations just a few kilometers from our homestay' },
    explore_btn: { vi: 'Khám phá →', en: 'Explore →' },
    explore_all: { vi: 'Xem tất cả điểm đến →', en: 'View All Destinations →' },
    explore_tra_su: { vi: 'Rừng tràm Trà Sư', en: 'Tra Su Mangrove Forest' },
    explore_cong_troi: { vi: 'Cổng Trời Tri Tôn', en: "Heaven's Gate Tri Ton" },
    explore_camping: { vi: 'Camping Núi Cấm', en: 'Camping at Cam Mountain' },
    explore_chua_lau: { vi: 'Chùa Lầu', en: 'Chua Lau Temple' },

    // Room Preview
    room_tag: { vi: 'Phòng nghỉ nổi bật', en: 'Featured Rooms' },
    room_title: { vi: 'Lựa chọn không gian của bạn', en: 'Choose Your Space' },
    room_desc: { vi: 'Mỗi phòng được thiết kế riêng biệt, hòa mình với thiên nhiên xung quanh', en: 'Each room is uniquely designed, blending with the surrounding nature' },
    room_all: { vi: 'Xem tất cả phòng →', en: 'View All Rooms →' },
    room_book: { vi: 'Đặt ngay', en: 'Book Now' },
    room_available: { vi: '● Còn', en: '● Open' },
    room_booked: { vi: '● Hết', en: '● Full' },
    room_per_night: { vi: '/ đêm', en: '/ night' },
    room1_name: { vi: 'Phòng Sun-view Núi Cấm', en: 'Mountain View Room' },
    room1_desc: { vi: 'Ngắm bình minh trên đỉnh Núi Cấm, không gian thoáng mát với ban công riêng hướng núi.', en: 'Watch sunrise over Cam Mountain, spacious room with private mountain-view balcony.' },
    room2_name: { vi: 'Bungalow Ven Suối', en: 'Riverside Bungalow' },
    room2_desc: { vi: 'Bungalow gỗ bên dòng suối, nghe tiếng nước chảy róc rách thư giãn mỗi đêm.', en: 'Wooden bungalow by the stream, soothing water sounds every night.' },
    room3_name: { vi: 'Phòng Family Tà Pạ', en: 'Family Suite' },
    room3_desc: { vi: 'Phòng rộng rãi cho gia đình, không gian ấm cúng và đầy đủ tiện nghi hiện đại.', en: 'Spacious family room with cozy atmosphere and full modern amenities.' },

    // Testimonials
    test_tag: { vi: 'Đánh giá từ khách hàng', en: 'Customer Reviews' },
    test_title: { vi: 'Khách hàng nói gì về chúng tôi?', en: 'What Our Guests Say?' },
    test1_text: { vi: '"Một trải nghiệm tuyệt vời! View núi cực đẹp, phòng sạch sẽ và thoáng mát. Sẽ quay lại lần nữa!"', en: '"An amazing experience! Stunning mountain views, clean and airy rooms. Will come back again!"' },
    test2_text: { vi: '"Bungalow ven suối lãng mạn quá, nghe tiếng nước suối rất thư giãn. Đồ ăn ngon, chủ nhà thân thiện."', en: '"The riverside bungalow is so romantic, the sound of the stream is very relaxing. Great food, friendly host."' },
    test3_text: { vi: '"Gia đình tôi đã có kỳ nghỉ rất đáng nhớ. Trẻ con rất thích khám phá thiên nhiên ở đây."', en: '"My family had an unforgettable vacation. The kids loved exploring nature here."' },

    // CTA
    cta_title: { vi: 'Sẵn sàng cho chuyến đi đáng nhớ?', en: 'Ready for an Unforgettable Trip?' },
    cta_desc: { vi: 'Đặt phòng ngay hôm nay để nhận ưu đãi đặc biệt cho mùa hè này', en: 'Book today for special summer offers' },
    cta_book: { vi: 'Đặt phòng ngay', en: 'Book Now' },

    // Footer
    footer_desc: { vi: 'Nền tảng kết nối khách du lịch với homestay, tài xế và đơn vị tour địa phương khắp Đồng bằng sông Cửu Long.', en: 'Connecting travellers with local homestays, drivers and tour operators across the Mekong Delta.' },
    footer_links: { vi: 'Liên kết nhanh', en: 'Quick Links' },
    footer_services: { vi: 'Dịch vụ', en: 'Services' },
    footer_contact_title: { vi: 'Thông tin liên hệ', en: 'Contact Info' },
    footer_service1: { vi: 'Chỗ nghỉ', en: 'Stays' },
    footer_service2: { vi: 'Tour tham quan', en: 'Guided Tours' },
    footer_service3: { vi: 'Ẩm thực địa phương', en: 'Local Cuisine' },
    footer_service4: { vi: 'Camping trên núi', en: 'Mountain Camping' },
    footer_privacy: { vi: 'Chính sách bảo mật', en: 'Privacy Policy' },
    footer_terms: { vi: 'Điều khoản sử dụng', en: 'Terms of Use' },

    // Rooms Page
    rooms_page_badge: { vi: 'Chỗ nghỉ của đối tác', en: 'Partner stays' },
    rooms_page_title: { vi: 'Chỗ nghỉ miền Tây', en: 'Mekong Delta stays' },
    rooms_page_desc: { vi: 'Homestay, nhà nghỉ và khách sạn do người bản địa vận hành — giá và tình trạng phòng do chính chủ cập nhật.', en: 'Homestays, guesthouses and hotels run by local owners — prices and availability updated by the owners themselves.' },
    filter_all: { vi: 'Tất cả', en: 'All' },
    filter_available: { vi: 'Còn phòng', en: 'Available' },
    filter_booked: { vi: 'Hết phòng', en: 'Fully Booked' },
    booking_title: { vi: 'Thông tin đặt phòng', en: 'Booking Information' },
    form_name: { vi: 'Họ và tên *', en: 'Full Name *' },
    form_phone: { vi: 'Số điện thoại *', en: 'Phone Number *' },
    form_checkin: { vi: 'Ngày Check-in *', en: 'Check-in Date *' },
    form_nights: { vi: 'Số đêm *', en: 'Number of Nights *' },
    summary_label: { vi: 'Tóm tắt', en: 'Summary' },
    summary_total: { vi: 'Tổng cộng', en: 'Total' },
    confirm_booking: { vi: 'Xác nhận đặt phòng', en: 'Confirm Booking' },

    // Explore Page
    explore_page_badge: { vi: '🌿 Khám phá An Giang', en: '🌿 Discover An Giang' },
    explore_page_title: { vi: 'Điểm đến tuyệt vời', en: 'Amazing Destinations' },
    explore_page_desc: { vi: 'Những trải nghiệm văn hóa, thiên nhiên và ẩm thực không thể bỏ lỡ khi đến vùng Bảy Núi', en: 'Cultural, nature and culinary experiences you cannot miss in Bảy Núi' },
    explore_cta_title: { vi: 'Muốn trải nghiệm tất cả?', en: 'Want to Experience It All?' },
    explore_cta_desc: { vi: 'Đặt phòng và để chúng tôi sắp xếp tour cho bạn', en: 'Book a room and let us arrange your tours' },
    explore_cta_contact: { vi: 'Liên hệ tư vấn', en: 'Contact Us' },
    label_schedule: { vi: 'Lịch trình', en: 'Schedule' },
    label_notes: { vi: 'Lưu ý', en: 'Notes' },

    // Contact Page
    contact_badge: { vi: '📞 Liên hệ', en: '📞 Contact' },
    contact_title: { vi: 'Kết nối với chúng tôi', en: 'Get in Touch' },
    contact_desc: { vi: 'Chúng tôi luôn sẵn lòng hỗ trợ bạn lên kế hoạch cho chuyến đi hoàn hảo', en: 'We are always ready to help you plan your perfect trip' },
    contact_form_title: { vi: 'Gửi tin nhắn cho chúng tôi', en: 'Send Us a Message' },
    contact_form_desc: { vi: 'Điền form bên dưới, chúng tôi sẽ phản hồi trong vòng 24 giờ', en: 'Fill out the form below, we will respond within 24 hours' },
    contact_email_label: { vi: 'Email', en: 'Email' },
    contact_subject: { vi: 'Chủ đề', en: 'Subject' },
    contact_subject_placeholder: { vi: 'Chọn chủ đề...', en: 'Select a subject...' },
    contact_subject_1: { vi: 'Đặt phòng', en: 'Booking' },
    contact_subject_2: { vi: 'Hỏi về tour', en: 'Tour Inquiry' },
    contact_subject_3: { vi: 'Thắc mắc chung', en: 'General Question' },
    contact_subject_4: { vi: 'Góp ý / Phản hồi', en: 'Feedback' },
    contact_message: { vi: 'Tin nhắn *', en: 'Message *' },
    contact_message_placeholder: { vi: 'Nội dung tin nhắn...', en: 'Your message...' },
    contact_send: { vi: 'Gửi tin nhắn', en: 'Send Message' },
    contact_address_title: { vi: 'Địa chỉ', en: 'Address' },
    contact_phone_title: { vi: 'Điện thoại', en: 'Phone' },
    contact_hours_title: { vi: 'Giờ làm việc', en: 'Working Hours' },
    contact_hours_desc: { vi: 'Check-in: 14:00 — Check-out: 12:00', en: 'Check-in: 2:00 PM — Check-out: 12:00 PM' },
    contact_hours_sub: { vi: 'Lễ tân hỗ trợ 24/7', en: '24/7 reception support' },
    contact_hotline: { vi: 'Hotline hỗ trợ 24/7', en: '24/7 support hotline' },
    contact_call: { vi: 'Gọi ngay', en: 'Call Now' },
    faq_tag: { vi: 'FAQ', en: 'FAQ' },
    faq_title: { vi: 'Câu hỏi thường gặp', en: 'Frequently Asked Questions' },
    faq1_q: { vi: 'Homestay có gần trung tâm thành phố không?', en: 'Is the homestay close to the city center?' },
    faq1_a: { vi: 'Homestay nằm trên sườn Núi Cấm, cách trung tâm TX. Tịnh Biên khoảng 10km. Chúng tôi có dịch vụ đưa đón từ trung tâm.', en: 'The homestay is on the slopes of Cam Mountain, about 10km from Tinh Bien town center. We offer pickup service from the center.' },
    faq2_q: { vi: 'Chính sách hủy phòng như thế nào?', en: 'What is the cancellation policy?' },
    faq2_a: { vi: 'Hủy phòng trước 48 giờ được hoàn tiền 100%. Hủy trong vòng 24 giờ hoàn 50%. Không hoàn tiền nếu hủy trong ngày check-in.', en: 'Cancel 48h+ before for 100% refund. Cancel within 24h for 50% refund. No refund for same-day cancellation.' },
    faq3_q: { vi: 'Homestay có phù hợp cho gia đình có trẻ nhỏ không?', en: 'Is it suitable for families with small children?' },
    faq3_a: { vi: 'Hoàn toàn phù hợp! Phòng Family Tà Pạ được thiết kế đặc biệt cho gia đình. Chúng tôi có sân chơi và hoạt động ngoài trời an toàn cho trẻ em.', en: 'Absolutely! The Family Suite is specially designed for families. We have a playground and safe outdoor activities for children.' },
    faq4_q: { vi: 'Có bãi đỗ xe không?', en: 'Is there parking?' },
    faq4_a: { vi: 'Có, chúng tôi có bãi đỗ xe miễn phí cho cả ô tô và xe máy.', en: 'Yes, we have free parking for both cars and motorcycles.' },
    faq5_q: { vi: 'Có WiFi và điều hòa không?', en: 'Is there WiFi and air conditioning?' },
    faq5_a: { vi: 'Tất cả các phòng đều có WiFi miễn phí. Phòng Sun-view và Family có điều hòa. Bungalow sử dụng quạt trần vì thiết kế mở gần suối, rất mát tự nhiên.', en: 'All rooms have free WiFi. Sun-view and Family rooms have A/C. Bungalows use ceiling fans — naturally cool by the stream.' },

    // Toast
    toast_booking: { vi: 'Đặt phòng thành công! Chúng tôi sẽ liên hệ xác nhận.', en: 'Booking successful! We will contact you to confirm.' },
    toast_contact: { vi: 'Tin nhắn đã được gửi! Chúng tôi sẽ phản hồi sớm nhất.', en: 'Message sent! We will respond as soon as possible.' },

    // ════════════════════════════════════════════════
    // GIAO DIỆN "BAY NUI STAY" — các khoá bên dưới ghi đè khoá trùng tên ở trên
    // ════════════════════════════════════════════════
    nav_book: { vi: 'Đặt phòng', en: 'Book now' },
    nav_food: { vi: 'Ẩm thực', en: 'Food' },
    view_all: { vi: 'Xem tất cả', en: 'View all' },

    hero_badge: { vi: 'Nền tảng kết nối · Đồng bằng sông Cửu Long', en: 'Local travel network · Mekong Delta' },
    hero_title: { vi: 'Đi đâu cũng có<br><em>người bản địa dẫn đường.</em>', en: 'Wherever you go,<br><em>a local goes with you.</em>' },
    hero_subtitle: { vi: 'LOCALMATE nối bạn với homestay, tài xế và đơn vị tour ngay tại nơi bạn đến — khắp 13 tỉnh thành miền Tây, từ Cà Mau lên tới Long An.', en: 'LOCALMATE connects you with homestays, drivers and tour operators right where you land — across the 13 provinces of the Mekong Delta.' },
    hero_cta: { vi: 'Đặt phòng ngay', en: 'Book a room' },
    hero_cta2: { vi: 'Xem điểm đến', en: 'See destinations' },
    hero_stat1: { vi: 'Khách hài lòng', en: 'Happy guests' },
    hero_stat2: { vi: 'Đánh giá trung bình', en: 'Average rating' },
    hero_stat3: { vi: 'Loại phòng', en: 'Room types' },

    search_tag: { vi: 'Kiểm tra phòng trống', en: 'Check availability' },
    search_date: { vi: 'Ngày check-in', en: 'Check-in date' },
    search_nights: { vi: 'Số đêm', en: 'Nights' },
    search_guests: { vi: 'Số người', en: 'Guests' },
    search_taste: { vi: 'Sở thích', en: 'Interest' },
    search_btn: { vi: 'Tìm phòng', en: 'Find rooms' },
    taste_1: { vi: 'Nghỉ dưỡng', en: 'Relaxation' },
    taste_2: { vi: 'Văn hóa Khmer', en: 'Khmer culture' },
    taste_3: { vi: 'Thiên nhiên', en: 'Nature' },
    taste_4: { vi: 'Ẩm thực', en: 'Food' },
    taste_5: { vi: 'Camping', en: 'Camping' },

    ai_title: { vi: 'Chuyến đi hoàn hảo bắt đầu từ một câu hỏi.', en: 'The perfect trip starts with one question.' },
    ai_desc: { vi: 'Trợ lý ảo của homestay hiểu thời gian, ngân sách và sở thích của bạn — rồi ghép phòng nghỉ, điểm đến, món ăn và xe đưa đón thành một hành trình đi được ngay. Hỏi bằng tiếng Việt hay tiếng Anh đều được.', en: 'Our assistant reads your time, budget and taste, then stitches rooms, places, food and transfer into a trip you can actually take. Ask in Vietnamese or English.' },
    ai_try: { vi: 'Trò chuyện ngay', en: 'Chat now' },
    ai_replay: { vi: 'Xem lại demo', en: 'Replay demo' },
    ai_q: { vi: 'Mình có 2 ngày 1 đêm, ngân sách 2 triệu và muốn khám phá văn hóa Khmer.', en: 'I have 2 days and 1 night, a 2 million VND budget, and I want to explore Khmer culture.' },
    ai_a: { vi: 'Để mình sắp xếp một hành trình vừa với bạn nhé!', en: 'Let me put together a trip that fits you!' },
    ai_done: { vi: 'Hành trình đã sẵn sàng', en: 'Your itinerary is ready' },
    ai_done_desc: { vi: '2 ngày 1 đêm · Bungalow Ven Suối · Chùa Tà Pạ, hồ Tà Pạ, gà đốt Ô Thum, BBQ lửa trại tại homestay', en: '2 days 1 night · Riverside Bungalow · Ta Pa pagoda, Ta Pa lake, O Thum grilled chicken, bonfire BBQ at the homestay' },
    ai_open: { vi: 'Hỏi chi tiết', en: 'Ask for details' },

    exp_title: { vi: 'Bạn muốn trải nghiệm Bảy Núi theo cách nào?', en: 'How do you want to experience Seven Mountains?' },

    culture_verified: { vi: 'Nội dung xác thực cùng người bản địa', en: 'Verified with local residents' },
    culture_title: { vi: 'Không chỉ tham quan.<br><em>Hãy thực sự sống trong văn hóa địa phương.</em>', en: 'More than sightseeing.<br><em>Live inside the local culture.</em>' },
    culture_desc: { vi: 'Bảy Núi là nơi văn hóa Khmer, Việt và Chăm sống cạnh nhau. Từ homestay, bạn có thể đi chùa Khmer, ăn gà đốt lá chúc, xem làng nghề thốt nốt và về ngủ giữa rừng — tất cả trong một ngày.', en: 'In Seven Mountains, Khmer, Vietnamese and Cham cultures live side by side. From the homestay you can visit a Khmer pagoda, eat grilled chicken with makrut leaves, watch palm-sugar makers and sleep in the forest — all in one day.' },
    culture_cta: { vi: 'Khám phá văn hóa Khmer', en: 'Explore Khmer culture' },
    culture_cta2: { vi: 'Nhờ trợ lý lên lịch', en: 'Let the assistant plan' },
    facet_1: { vi: 'Điểm tham quan', en: 'Sights' },
    facet_2: { vi: 'Ẩm thực Khmer', en: 'Khmer food' },
    facet_3: { vi: 'Lễ hội', en: 'Festivals' },
    facet_4: { vi: 'Làng nghề', en: 'Craft villages' },
    facet_5: { vi: 'Phòng nghỉ gần đó', en: 'Nearby rooms' },
    facet_6: { vi: 'Xe đưa đón', en: 'Transfer' },

    dest_title: { vi: 'Điểm đến nổi bật quanh homestay', en: 'Highlights around the homestay' },

    near_chip: { vi: 'Gần bạn lúc này', en: 'Near you now' },
    near_gps: { vi: 'Núi Cấm, Tịnh Biên · An Giang', en: 'Cam Mountain, Tinh Bien · An Giang' },
    near_title: { vi: 'Homestay gợi ý cho bạn lúc này', en: 'What we suggest right now' },
    near_desc: { vi: 'Gợi ý thay đổi theo thời tiết, khoảng cách và giờ trong ngày — không phải một danh sách cố định.', en: 'Suggestions shift with weather, distance and time of day — not a fixed list.' },

    fest_title: { vi: 'Lễ hội sắp diễn ra', en: 'Upcoming festivals' },
    fest_desc: { vi: 'Bảy Núi có lễ hội gần như quanh năm. Nếu ngày bạn đến trùng dịp lễ, hãy báo trước để homestay giữ phòng sớm.', en: 'Seven Mountains has festivals nearly year-round. If your dates match one, tell us early so we can hold a room.' },

    food_title: { vi: 'Hương vị miền Tây', en: 'Flavours of the Mekong Delta' },
    food_desc: { vi: 'Mỗi món ăn ở đây gắn với một nền văn hóa và một mùa trong năm.', en: 'Every dish here belongs to a culture and a season.' },
    food_cta_title: { vi: 'Muốn ăn đúng món, đúng giờ, đúng chỗ?', en: 'Want the right dish, time and place?' },
    food_cta_desc: { vi: 'Bếp của homestay phục vụ đặc sản tại chỗ, hoặc chỉ bạn quán ngon quanh vùng.', en: 'Our kitchen serves local specialties, or points you to the best spots nearby.' },
    food_cta_btn: { vi: 'Hỏi trợ lý', en: 'Ask the assistant' },

    room_title: { vi: 'Ngủ lại giữa núi rừng Thất Sơn', en: 'Stay in the Seven Mountains forest' },
    room_desc: { vi: 'Mỗi phòng được thiết kế riêng biệt, hòa mình với thiên nhiên xung quanh.', en: 'Each room is uniquely designed, blending into the nature around it.' },
    room_book: { vi: 'Đặt phòng', en: 'Book' },
    room_available: { vi: 'Còn phòng', en: 'Available' },
    room_booked: { vi: 'Hết phòng', en: 'Fully booked' },
    room_per_night: { vi: '/đêm', en: '/night' },
    room_price_from: { vi: 'Giá từ', en: 'From' },

    tour_title: { vi: 'Tour do người bản địa dẫn', en: 'Tours led by locals' },
    service_title: { vi: 'Mọi thứ bạn cần cho chuyến đi', en: 'Everything you need for the trip' },

    combo_title: { vi: 'Combo ưu đãi trong mùa', en: 'Seasonal offers' },
    combo_desc: { vi: 'Ở 7 đêm giảm 10% · Đặt sớm 15 ngày giảm 5% · Combo bên dưới đã gồm phòng và trải nghiệm.', en: '10% off for 7 nights · 5% off when booking 15 days ahead · Combos below include room and experience.' },

    test_title: { vi: 'Khách nói gì về LOCALMATE?', en: 'What guests say about LOCALMATE' },
    test_verified: { vi: 'Đã xác thực lưu trú', en: 'Verified stay' },

    partner_title: { vi: 'Du lịch phát triển khi cộng đồng cùng phát triển.', en: 'Tourism grows when the community grows.' },
    partner_desc: { vi: 'LOCALMATE hợp tác với người dân quanh Núi Cấm — từ quán ăn, tài xế đến hướng dẫn viên bản địa, để dòng tiền du lịch ở lại với vùng đất này.', en: 'LOCALMATE works with people around Cam Mountain — eateries, drivers, local guides — so tourism money stays in this region.' },
    partner_sub: { vi: 'một điểm kết nối cho dịch vụ quanh Núi Cấm', en: 'one hub for services around Cam Mountain' },
    stat_1: { vi: 'giá trị mỗi đơn về trực tiếp đối tác địa phương', en: 'of each order goes straight to local partners' },
    stat_2: { vi: 'nhân sự là người An Giang', en: 'of our team is from An Giang' },
    stat_3: { vi: 'lớp văn hóa: Khmer · Việt · Chăm', en: 'cultural layers: Khmer · Viet · Cham' },
    p_1: { vi: 'Quán ăn địa phương', en: 'Local eateries' },
    p_2: { vi: 'Tài xế đưa đón', en: 'Drivers' },
    p_3: { vi: 'Hướng dẫn viên', en: 'Local guides' },
    p_4: { vi: 'Làng nghề thốt nốt', en: 'Palm-sugar villages' },
    p_5: { vi: 'Cửa hàng đặc sản', en: 'Specialty shops' },
    p_6: { vi: 'Cho thuê xe máy', en: 'Bike rentals' },

    cta_title: { vi: 'LOCALMATE đang chờ bạn.', en: 'Seven Mountains is waiting.' },
    cta_desc: { vi: 'Đặt phòng hôm nay để nhận ưu đãi đặc biệt và giữ chỗ trong mùa cao điểm.', en: 'Book today for special offers and a guaranteed room in peak season.' },
    cta_book: { vi: 'Đặt phòng ngay', en: 'Book now' },

    // ── Trang Phòng nghỉ ──
    rooms_page_badge: { vi: 'Chỗ nghỉ của đối tác', en: 'Partner stays' },
    rooms_page_title: { vi: 'Chỗ nghỉ miền Tây', en: 'Mekong Delta stays' },
    rooms_page_desc: { vi: 'Homestay, nhà nghỉ và khách sạn do người bản địa vận hành — giá và tình trạng phòng do chính chủ cập nhật.', en: 'Homestays, guesthouses and hotels run by local owners — prices and availability updated by the owners themselves.' },
    rooms_policy_title: { vi: 'Chính sách & tiện ích', en: 'Policies & amenities' },
    policy_1: { vi: 'Check-in 14:00 · Check-out 12:00', en: 'Check-in 2 PM · Check-out 12 PM' },
    policy_2: { vi: 'Hủy trước 48h hoàn 100%', en: 'Free cancellation 48h ahead' },
    policy_3: { vi: 'Bãi đậu ô tô miễn phí', en: 'Free car parking' },
    policy_4: { vi: 'Thú cưng <10kg · phụ phí 100.000đ/đêm', en: 'Pets under 10kg · 100,000đ/night' },
    policy_5: { vi: 'WiFi miễn phí toàn khu', en: 'Free WiFi everywhere' },
    policy_6: { vi: 'Cọc 50% · Tiền mặt, chuyển khoản, Momo', en: '50% deposit · Cash, transfer, Momo' },

    // ── Trang Khám phá ──
    explore_page_badge: { vi: 'Điểm đến địa phương', en: 'Local destinations' },
    explore_page_title: { vi: 'Khám phá điểm đến', en: 'Explore the Mekong Delta' },
    explore_page_desc: { vi: 'Điểm đến, trải nghiệm, lễ hội và ẩm thực miền Tây do chính người bản địa giới thiệu.', en: 'Destinations, experiences, festivals and food of the Mekong Delta, introduced by the people who live there.' },
    tab_dest: { vi: 'Điểm đến', en: 'Destinations' },
    tab_exp: { vi: 'Trải nghiệm', en: 'Experiences' },
    tab_fest: { vi: 'Lễ hội', en: 'Festivals' },
    explore_detail_title: { vi: 'Đi sâu vào từng điểm đến', en: 'A closer look at each place' },
    explore_detail_desc: { vi: 'Chọn một điểm trong danh sách để xem giờ nên đi, giá vé và những lưu ý trước khi lên đường.', en: 'Pick a place from the list to see when to go, ticket prices and what to know before you set out.' },
    explore_ph_where: { vi: 'Bạn muốn đi đâu? (mũi cà mau, tà pạ, chợ nổi…)', en: 'Where do you want to go? (ca mau cape, ta pa, floating market…)' },
    explore_go: { vi: 'Tìm ngay', en: 'Search' },
    explore_cta_title: { vi: 'Muốn trải nghiệm tất cả?', en: 'Want to experience it all?' },
    explore_cta_desc: { vi: 'Đặt phòng và để chúng tôi sắp xếp tour cho bạn.', en: 'Book a room and let us arrange your tours.' },

    // ── Trang Liên hệ ──
    contact_badge: { vi: 'Liên hệ', en: 'Contact' },
    contact_desc: { vi: 'Chúng tôi luôn sẵn lòng hỗ trợ bạn lên kế hoạch cho chuyến đi hoàn hảo.', en: 'We are always ready to help you plan the perfect trip.' },
    contact_form_desc: { vi: 'Điền form bên dưới, chúng tôi sẽ phản hồi trong vòng 24 giờ.', en: 'Fill in the form below — we reply within 24 hours.' },
    faq_cta_title: { vi: 'Chưa tìm thấy câu trả lời?', en: 'Still have a question?' },
    faq_cta_desc: { vi: 'Trợ lý ảo của homestay trả lời 24/7, bằng tiếng Việt hoặc tiếng Anh.', en: 'Our assistant answers 24/7, in Vietnamese or English.' },
};

// ── DỮ LIỆU CHỖ NGHỈ ──
//
// ROOM_DATA  — phòng của chính homestay (Firestore). Dùng cho ô xem nhanh ở
//              trang chủ cũ và cho hộp đặt phòng.
// STAY_DATA  — TOÀN BỘ chỗ nghỉ: phòng homestay + chỗ nghỉ của đối tác.
//
// Trước đây trang Chỗ nghỉ chỉ vẽ ROOM_DATA, nên bảy chỗ nghỉ của đối tác
// chỉ hiện khi khách gõ chữ vào ô tìm kiếm. Khách vào xem rồi đi thì không
// bao giờ biết chúng tồn tại — trang chính của một nền tảng kết nối mà lại
// giấu đúng thứ mình đi kết nối được.
let ROOM_DATA = [];
let STAY_DATA = [];

async function initFirebaseData() {
    try {
        if (window.FirebaseDB) {
            ROOM_DATA = await FirebaseDB.getRooms();
        } else {
            // Trang không nạp Firebase SDK vẫn lấy được phòng qua REST API —
            // cùng nguồn dữ liệu mà app Android đang dùng.
            const res = await fetch('/v1/rooms');
            ROOM_DATA = (await res.json()).data || [];
        }
        renderHomeRoomPreview();
    } catch (e) {
        console.error('Không tải được phòng homestay:', e);
    }

    // Danh sách đầy đủ nạp riêng: hỏng phần trên thì phần này vẫn chạy, và
    // ngược lại. Hai nguồn khác nhau, đừng để một cái ngã kéo cái kia ngã theo.
    try {
        const res = await fetch('/v1/stays/search?q=');
        STAY_DATA = (await res.json()).data || [];
    } catch (e) {
        console.error('Không tải được danh sách chỗ nghỉ:', e);
        // Không lấy được danh sách đầy đủ thì ít nhất còn phòng của homestay,
        // hơn là để trang trống trơn.
        STAY_DATA = ROOM_DATA.map(r => ({
            id: r.id, name: r.name, area: 'LOCALMATE, Núi Cấm', price: r.price,
            capacity: r.capacity, rating: 4.8, amenities: r.amenities,
            image: r.imageUrl, description: r.description, source: 'homestay',
            sold_out: r.status !== 'available',
        }));
    }
    renderRoomsList(currentFilter);
}


// ── LANGUAGE SYSTEM ──
let currentLang = localStorage.getItem('baynui_lang') || 'vi';

function t(key) {
    const entry = TRANSLATIONS[key];
    if (!entry) return key;
    return entry[currentLang] || entry.vi || key;
}

function changeLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('baynui_lang', lang);

    // Update toggle buttons
    document.querySelectorAll('.lang-toggle-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === lang);
    });

    // Translate all [data-i18n] elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const val = t(key);
        if (val !== key) {
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = val;
            } else if (el.tagName === 'OPTION') {
                el.textContent = val;
            } else {
                el.innerHTML = val;
            }
        }
    });

    // Re-render dynamic content
    renderHomeRoomPreview();
    renderRoomsList(currentFilter);
    if (typeof window.renderSiteSections === 'function') window.renderSiteSections();
    document.documentElement.lang = lang;
    refreshIcons();
}

function applyLanguageOnLoad() {
    // Apply stored language on page load
    changeLanguage(currentLang);
}

// ── UTILITIES ──
function refreshIcons() { setTimeout(() => { if (window.lucide) lucide.createIcons(); }, 50); }
function toggleMobileMenu() { const m = document.getElementById('mobile-nav'); if (m) m.classList.toggle('hidden'); }
function formatPrice(p) { return p.toLocaleString('vi-VN') + 'đ'; }

function initScrollEffect() {
    const nav = document.getElementById('main-nav');
    if (!nav) return;
    window.addEventListener('scroll', () => { nav.classList.toggle('scrolled', window.scrollY > 50); });
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    document.getElementById('toast-msg').innerText = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// ── ROOM CARD ──
const ROOM_FALLBACK_IMG = 'assets/homestay.jpg';

function roomCardHTML(r, opts = {}) {
    const rName = currentLang === 'en' ? (r.nameEn || r.name) : r.name;
    const rDesc = currentLang === 'en' ? (r.descriptionEn || r.description) : r.description;
    const rAmenities = currentLang === 'en' ? (r.amenitiesEn || r.amenities) : r.amenities;
    const amns = rAmenities ? rAmenities.split(',').map(s => s.trim()).filter(Boolean) : [];
    const open = r.status === 'available';
    const cap = r.capacity ? `${r.capacity} ${currentLang === 'en' ? 'guests' : 'khách'}` : '';
    // Cả hai kiểu thẻ đều dẫn sang trang chi tiết. Trước đây ô xem nhanh ở
    // trang chủ dẫn tới phongnghi.html#<id> — một cái neo cuộn xuống giữa danh
    // sách, khách không hiểu vì sao mình vừa nhảy tới đó.
    const action = `<a href="chonghi.html?id=${encodeURIComponent(r.id)}" class="btn-primary btn-book-room">${
        opts.link ? t('room_book') : (open ? t('room_book') : t('room_booked'))}</a>`;

    return `
    <div class="room-card scroll-animate" id="${r.id}">
        <div class="room-card-img">
            <img src="${r.imageUrl || ROOM_FALLBACK_IMG}" alt="${rName}" loading="lazy" onerror="this.onerror=null;this.src='${ROOM_FALLBACK_IMG}'">
            ${cap ? `<span class="room-card-near"><i data-lucide="users" style="width:13px;height:13px"></i>${cap}</span>` : ''}
        </div>
        <div class="room-card-body">
            <div class="room-card-header">
                <h3>${rName}</h3>
                <span class="room-status ${open ? 'available' : 'booked'}">
                    <i data-lucide="${open ? 'circle-check' : 'circle-slash'}" style="width:13px;height:13px"></i>${open ? t('room_available') : t('room_booked')}
                </span>
            </div>
            <div class="rv-inline" data-rv-room="${r.id}" hidden></div>
            ${rDesc ? `<p class="room-desc">${rDesc}</p>` : ''}
            ${amns.length ? `<div class="room-amenities">${amns.map(a => `<span class="explore-info-chip">${a}</span>`).join('')}</div>` : ''}
            <div class="room-card-footer">
                <span class="room-price-wrap">
                    <span class="room-price-label">${t('room_price_from')}</span>
                    <span class="room-price">${formatPrice(r.price)}<span class="per-night">${t('room_per_night')}</span></span>
                </span>
                ${action}
            </div>
        </div>
    </div>`;
}

function roomsLoading() {
    return `<div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--muted)">
        <i data-lucide="loader-2" class="spin"></i>
        <p style="margin-top:10px">${currentLang === 'en' ? 'Loading rooms…' : 'Đang tải phòng…'}</p>
    </div>`;
}

// ── HOME PAGE ──
function renderHomeRoomPreview() {
    const c = document.getElementById('home-rooms-preview');
    if (!c) return;
    if (ROOM_DATA.length === 0) { c.innerHTML = roomsLoading(); refreshIcons(); return; }
    c.innerHTML = ROOM_DATA.slice(0, 3).map(r => roomCardHTML(r, { link: true })).join('');
    refreshIcons();
}

// ── ROOMS PAGE ──
let currentFilter = 'all';

function renderRoomsList(filter = 'all') {
    const c = document.getElementById('rooms-list');
    if (!c) return;
    if (stayQuery || khoangNgayDangChon()) { searchStays(); return; }
    if (STAY_DATA.length === 0) { c.innerHTML = roomsLoading(); refreshIcons(); return; }

    let list = STAY_DATA;
    if (filter === 'available') list = list.filter(s => !s.sold_out);
    if (filter === 'booked') list = list.filter(s => s.sold_out);

    if (list.length === 0) {
        c.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:4rem;color:var(--muted)">
            <i data-lucide="bed-double" style="width:34px;height:34px"></i>
            <p style="margin-top:12px">${currentLang === 'en' ? 'No stays in this filter' : 'Không có chỗ nghỉ nào ở bộ lọc này'}</p>
        </div>`;
        refreshIcons();
        return;
    }
    c.innerHTML = list.map(stayCardHTML).join('');
    refreshIcons();
    ganDiemDanhGia();

    // Nói luôn đang hiện bao nhiêu, để khách biết danh sách này là ĐẦY ĐỦ
    // chứ không phải mới tải một phần.
    const info = document.getElementById('stay-search-info');
    if (info && !stayQuery && !document.getElementById('stay-checkin')?.value) {
        const cuaDoiTac = STAY_DATA.filter(s => s.source === 'partner').length;
        info.textContent = currentLang === 'en'
            ? `${STAY_DATA.length} places to stay · ${cuaDoiTac} from partners`
            : `${STAY_DATA.length} chỗ nghỉ · ${cuaDoiTac} của đối tác`;
    }
}

/**
 * Điền điểm đánh giá lên từng thẻ phòng.
 *
 * Hỏi sau khi thẻ đã hiện chứ không chờ rồi mới vẽ: danh sách phòng phải ra
 * ngay, còn điểm sao thì tới sau vài trăm mili giây cũng không ai để ý.
 *
 * Phòng chưa có đánh giá thì ô đó vẫn ẩn — hiện "0 đánh giá" trên phòng mới
 * mở chỉ làm khách nghi ngờ, trong khi thật ra chỉ là chưa ai kịp ở.
 */
async function ganDiemDanhGia() {
    if (!window.BayNuiReviews) return;
    for (const el of document.querySelectorAll('[data-rv-room]')) {
        const s = await BayNuiReviews.tomTat('room', el.getAttribute('data-rv-room'));
        if (!s) continue;
        el.innerHTML = `${BayNuiReviews.sao(s.average)} <b>${String(s.average).replace('.', ',')}</b>`
            + ` · ${s.count} ${currentLang === 'en' ? 'review' + (s.count > 1 ? 's' : '') : 'đánh giá'}`;
        el.hidden = false;
    }
}

function filterRooms(filter, btn) {
    currentFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    renderRoomsList(filter);
}

// ── BOOKING MODAL ──
let selectedRoom = null;

function openBooking(roomId) {
    selectedRoom = ROOM_DATA.find(r => r.id === roomId);
    if (!selectedRoom) return;
    const modal = document.getElementById('booking-modal');
    if (!modal) return;
    const info = document.getElementById('booking-room-info');
    const rName = currentLang === 'en' ? (selectedRoom.nameEn || selectedRoom.name) : selectedRoom.name;
    info.innerHTML = `<img src="${selectedRoom.imageUrl || 'https://via.placeholder.com/600x400'}" alt="${rName}"><div class="room-info-text"><h4>${rName}</h4><span>${formatPrice(selectedRoom.price)} ${t('room_per_night')}</span></div>`;
    document.getElementById('booking-room-id').value = roomId;
    document.getElementById('summary-room-name').innerText = rName;
    document.getElementById('summary-room-price').innerText = formatPrice(selectedRoom.price);
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    const q = new URLSearchParams(window.location.search);
    document.getElementById('cust-checkin').value = q.get('checkin') || tomorrow.toISOString().split('T')[0];
    const nightSel = document.getElementById('cust-nights');
    const qNights = q.get('nights');
    nightSel.value = (qNights && [...nightSel.options].some(o => o.value === qNights)) ? qNights : '1';
    updateBookingTotal();
    modal.classList.remove('hidden');
    refreshIcons();
}

function closeBookingModal(e) { if (e && e.target !== e.currentTarget) return; const m = document.getElementById('booking-modal'); if (m) m.classList.add('hidden'); }

function updateBookingTotal() {
    if (!selectedRoom) return;
    const nights = parseInt(document.getElementById('cust-nights').value) || 1;
    let total = selectedRoom.price * nights;
    if (nights >= 7) total = Math.round(total * 0.9);
    const el = document.getElementById('summary-total');
    if (el) el.innerText = formatPrice(total);
}

async function handleBooking(e) {
    e.preventDefault();
    if (!selectedRoom) return;
    const btn = document.getElementById('booking-submit-btn');
    if(btn) { btn.disabled = true; btn.textContent = 'Đang xử lý...'; }
    
    try {
        const nights = parseInt(document.getElementById('cust-nights').value) || 1;
        let total = selectedRoom.price * nights;
        if (nights >= 7) total = Math.round(total * 0.9);
        
        await FirebaseDB.addBooking({
            roomId: selectedRoom.id,
            roomName: selectedRoom.name,
            guestName: document.getElementById('cust-name').value,
            phone: document.getElementById('cust-phone').value,
            email: document.getElementById('cust-email') ? document.getElementById('cust-email').value : '',
            checkIn: document.getElementById('cust-checkin').value,
            nights: nights,
            totalPrice: total
        });
        
        closeBookingModal();
        showToast(t('toast_booking'));
        e.target.reset();
    } catch(err) {
        alert("Lỗi khi đặt phòng: " + err.message);
    } finally {
        if(btn) { btn.disabled = false; btn.textContent = t('confirm_booking'); }
    }
}

// ── CONTACT ──
async function handleContact(e) { 
    e.preventDefault(); 
    const btn = e.target.querySelector('button[type="submit"]');
    if(btn) { btn.disabled = true; btn.textContent = 'Đang gửi...'; }
    try {
        const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Hết thời gian chờ. Bạn đã tạo Firestore Database trên Firebase Console chưa? Vào Build > Firestore Database > Create database > Start in test mode.')), 8000));
        const send = FirebaseDB.addContact({
            name: document.getElementById('contact-name').value,
            phone: document.getElementById('contact-phone') ? document.getElementById('contact-phone').value : '',
            email: document.getElementById('contact-email').value,
            subject: document.getElementById('contact-subject').value,
            message: document.getElementById('contact-msg').value
        });
        await Promise.race([send, timeout]);
        showToast(t('toast_contact')); 
        e.target.reset(); 
    } catch(err) {
        alert("Lỗi: " + err.message);
    } finally {
        if(btn) { btn.disabled = false; btn.textContent = t('contact_send'); }
    }
}



// ── INIT ──
window.addEventListener('DOMContentLoaded', () => {
    refreshIcons();
    initScrollEffect();
    applyLanguageOnLoad();
    initFirebaseData();
    // Hash navigation
    if (window.location.hash) {
        const target = document.getElementById(window.location.hash.slice(1));
        if (target) setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
    }
});

// ════════════════════════════════════════════════════════════
// TÌM CHỖ NGHỈ THEO KHU VỰC
// ════════════════════════════════════════════════════════════
// Trang Phòng nghỉ trước đây chỉ hiện phòng của homestay. Khách hỏi
// "có khách sạn nào ở Châu Đốc không" thì chịu. Ô tìm kiếm này gọi
// /v1/stays/search — gộp cả phòng homestay lẫn chỗ nghỉ của ĐỐI TÁC
// đã đưa lên, tìm được theo khu vực, tên, hay cả tiện nghi ("hồ bơi").

let stayQuery = '';
let stayAreas = [];
let staySearchVersion = 0;

async function loadStayAreas() {
    if (stayAreas.length) return;
    try {
        const res = await fetch('/v1/stays/search');
        stayAreas = (await res.json()).areas || [];
    } catch (_) { stayAreas = []; }

    const host = document.getElementById('stay-area-chips');
    if (!host || !stayAreas.length) return;
    host.innerHTML = stayAreas
        .map(a => `<button type="button" class="stay-area-chip" onclick="pickStayArea('${a.replace(/'/g, "\'")}')">${a}</button>`)
        .join('');
}

function pickStayArea(area) {
    const input = document.getElementById('stay-search');
    if (input) input.value = area;
    searchStays(area);
}

/**
 * Mở trang kèm ?q=… thì tìm luôn.
 *
 * Cần cho nút "Xem trang khách" bên kênh đối tác: đối tác bấm vào phải thấy
 * ngay tin của mình nằm giữa các chỗ nghỉ khác, chứ mở ra danh sách chung rồi
 * bắt họ tự gõ lại thì chẳng chứng minh được gì.
 */
function applyStayQueryFromUrl() {
    const q = new URLSearchParams(location.search).get('q');
    const dates = StayDates.read(location.search);
    const a = document.getElementById('stay-checkin');
    const b = document.getElementById('stay-checkout');
    if (a) a.value = dates.checkIn;
    if (b) b.value = dates.checkOut;
    const input = document.getElementById('stay-search');
    if (input) input.value = q || '';
    if (q || dates.checkIn || dates.checkOut) searchStays(q || '');
}

/** Hai ô ngày ở trang Chỗ nghỉ. Chỉ lọc khi có ĐỦ cả hai và đúng thứ tự. */
function khoangNgayDangChon() {
    const a = document.getElementById('stay-checkin');
    const b = document.getElementById('stay-checkout');
    if (!a || !b || !a.value || !b.value) return null;
    if (a.value >= b.value) return null;
    return { nhan: a.value, tra: b.value };
}

function clearStayDates() {
    const a = document.getElementById('stay-checkin');
    const b = document.getElementById('stay-checkout');
    if (a) a.value = '';
    if (b) b.value = '';
    searchStays();
}

/** "2026-10-20" → "20/10" */
function ngayGon(iso) {
    const [, m, d] = String(iso || '').split('-');
    return d ? `${d}/${m}` : iso;
}

async function searchStays(value) {
    const version = ++staySearchVersion;
    // Gọi từ ô ngày thì không truyền gì — giữ nguyên từ khoá đang có, chứ
    // truyền undefined vào rồi ép chuỗi là xoá sạch ô tìm kiếm của khách.
    if (value !== undefined) stayQuery = String(value || '').trim();

    const clear = document.getElementById('stay-search-clear');
    if (clear) clear.style.display = stayQuery ? '' : 'none';

    const ngay = khoangNgayDangChon();
    const nutXoaNgay = document.getElementById('stay-dates-clear');
    if (nutXoaNgay) nutXoaNgay.style.display = ngay ? '' : 'none';

    const info = document.getElementById('stay-search-info');
    const host = document.getElementById('rooms-list');
    if (!host) return;

    // Không gõ gì mà cũng không chọn ngày → quay lại danh sách như cũ
    if (!stayQuery && !ngay) {
        if (info) info.textContent = '';
        renderRoomsList(currentFilter);
        return;
    }

    if (info) info.textContent = 'Đang tìm…';
    try {
        const tham = new URLSearchParams({ q: stayQuery });
        if (ngay) {
            tham.set('check_in', ngay.nhan);
            tham.set('check_out', ngay.tra);
        }
        const res = await fetch('/v1/stays/search?' + tham.toString());
        const json = await res.json();
        if (version !== staySearchVersion) return;
        if (!res.ok) throw new Error(json?.error?.message || 'Không tải được chỗ nghỉ.');
        const list = json.data || [];
        const m = json.meta || {};

        if (info) {
            const doanNgay = ngay ? ` còn trống ${ngayGon(ngay.nhan)}–${ngayGon(ngay.tra)}` : '';
            if (list.length) {
                info.textContent = `${list.length} chỗ nghỉ${doanNgay}`
                    + ` · ${m.homestay} tại homestay · ${m.partner} của đối tác`;
            } else if (ngay) {
                info.textContent = `Không còn chỗ nào trống ${ngayGon(ngay.nhan)}–${ngayGon(ngay.tra)}`
                    + (stayQuery ? ` cho “${stayQuery}”` : '') + '. Bạn thử ngày khác xem sao.';
            } else {
                info.textContent = `Không tìm thấy chỗ nghỉ nào cho “${stayQuery}”`;
            }
            // Nói thẳng khi chưa lọc được, thay vì trả cả danh sách như thể đã lọc
            if (m.dates_unavailable) {
                info.textContent += ' (chưa kiểm được lịch phòng lúc này — bạn xem kỹ ngày khi đặt nhé)';
            }
        }

        host.innerHTML = list.length
            ? list.map(stayCardHTML).join('')
            : `<div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--muted)">
                 <i data-lucide="bed-double" style="width:34px;height:34px"></i>
                 <p style="margin-top:12px">${ngay
                     ? 'Khoảng ngày này đã kín. Bạn thử dời một hai hôm, hoặc bỏ lọc ngày để xem hết chỗ nghỉ.'
                     : 'Thử gõ tên khu vực như “Châu Đốc”, “Tri Tôn”, “Tịnh Biên”.'}</p>
               </div>`;
        refreshIcons();
    } catch (_) {
        if (version !== staySearchVersion) return;
        if (info) info.textContent = 'Chưa tìm được lúc này, bạn thử lại nhé.';
    }
}

/** Thẻ dùng chung cho cả phòng homestay lẫn chỗ nghỉ đối tác. */
/**
 * Thẻ chỗ nghỉ, dùng chung cho phòng homestay và chỗ nghỉ đối tác.
 *
 * Cả ảnh lẫn tên đều dẫn sang TRANG CHI TIẾT chứ không mở thẳng ô đặt phòng.
 * Nhảy thẳng ra ô đặt là hỏi họ tên, số điện thoại khi khách còn chưa kịp
 * xem ảnh và đánh giá — giống vào cửa hàng chưa nhìn hàng đã bị đòi trả tiền.
 * Nút "Xem chỗ này" cũng sang trang đó; đặt phòng nằm ở bên trong.
 */
function stayCardHTML(s) {
    const amns = Array.isArray(s.amenities) ? s.amenities
        : String(s.amenities || '').split(',').map(x => x.trim()).filter(Boolean);
    const isPartner = s.source === 'partner';
    const het = Boolean(s.sold_out);
    const ngay = khoangNgayDangChon();
    const link = StayDates.append(`chonghi.html?id=${encodeURIComponent(s.id)}`,
        ngay ? { checkIn: ngay.nhan, checkOut: ngay.tra } : {});
    const esc2 = (v) => String(v == null ? '' : v)
        .replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

    return `
    <div class="room-card scroll-animate" id="${esc2(s.id)}">
        <a class="room-card-img" href="${link}" aria-label="${esc2(s.name)}">
            <img src="${esc2(s.image) || ROOM_FALLBACK_IMG}" alt="${esc2(s.name)}" loading="lazy"
                 onerror="this.onerror=null;this.src='${ROOM_FALLBACK_IMG}'">
            <span class="room-card-near"><i data-lucide="users" style="width:13px;height:13px"></i>${s.capacity} khách</span>
            ${isPartner ? '<span class="stay-partner-tag"><i data-lucide="handshake" style="width:12px;height:12px"></i>Đối tác</span>' : ''}
        </a>
        <div class="room-card-body">
            <div class="room-card-header">
                <h3><a href="${link}" style="color:inherit;text-decoration:none">${esc2(s.name)}</a></h3>
                <span class="room-status ${het ? 'booked' : 'available'}">
                    <i data-lucide="${het ? 'circle-slash' : 'star'}" style="width:13px;height:13px"></i>${het ? 'Tạm hết' : s.rating}
                </span>
            </div>
            ${s.partner_name ? `<p class="stay-provider"><i data-lucide="house"></i>Chủ nhà: <b>${esc2(s.partner_name)}</b></p>` : ''}
            <p class="stay-area"><i data-lucide="map-pin" style="width:13px;height:13px"></i>${esc2(s.area || '')}</p>
            <div class="rv-inline" data-rv-room="${esc2(s.id)}" hidden></div>
            ${s.description ? `<p class="room-desc">${esc2(s.description)}</p>` : ''}
            ${amns.length ? `<div class="room-amenities">${amns.slice(0, 4).map(a => `<span class="explore-info-chip">${esc2(a)}</span>`).join('')}</div>` : ''}
            <div class="room-card-footer">
                <div class="room-price"><strong>${Number(s.price).toLocaleString('vi-VN')}đ</strong><span>/đêm</span></div>
                <a class="btn-primary btn-book-room" href="${link}">Xem chỗ này</a>
            </div>
        </div>
    </div>`;
}

/** Đặt được cả phòng homestay lẫn chỗ nghỉ đối tác — backend nhận chung một mã. */
async function bookStayById(id) {
    try {
        // Danh sách đã có sẵn trong bộ nhớ — gọi lại cả danh sách chỉ để lấy
        // một dòng là bắt khách chờ thêm một vòng mạng không cần thiết.
        let stay = STAY_DATA.find(s => String(s.id) === String(id));
        if (!stay) {
            const res = await fetch('/v1/stays/search?q=');
            stay = ((await res.json()).data || []).find(s => String(s.id) === String(id));
        }
        if (!stay) throw new Error('Không tìm thấy chỗ nghỉ này.');
        BayNuiBooking.open('hotel', {
            id: stay.id,
            name: stay.name,
            price: stay.price,
            image_url: stay.image,
            capacity: stay.capacity,
            partner_name: stay.partner_name,
            checkIn: document.getElementById('stay-checkin')?.value,
            checkOut: document.getElementById('stay-checkout')?.value,
        });
    } catch (err) {
        alert(err.message);
    }
}

function clearStaySearch() {
    const input = document.getElementById('stay-search');
    if (input) { input.value = ''; input.focus(); }
    searchStays('');
}

document.addEventListener('DOMContentLoaded', () => {
    loadStayAreas();
    applyStayQueryFromUrl();
});
