package vn.baynuistay.core.network

import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.Headers
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface BayNuiApi {
    @GET("v1/specialties") suspend fun specialties(): SpecialtiesResponse
    @GET("v1/stays/search") suspend fun searchStays(): StaySearchResponse
    @GET("v1/my/profile") suspend fun customerProfile(): CustomerProfileResponse
    @PATCH("v1/my/profile") suspend fun saveCustomerProfile(@Body body: CustomerProfileRequest): CustomerProfileResponse
    @POST("v1/my/addresses") suspend fun saveDeliveryAddress(@Body body: DeliveryAddressDto): CustomerProfileResponse
    @DELETE("v1/my/addresses/{id}") suspend fun deleteDeliveryAddress(@Path("id") id: String): CustomerProfileResponse
    // ── Thời tiết ──
    @GET("v1/weather")
    suspend fun weather(
        @Query("lat") latitude: Double = 10.5117,
        @Query("lng") longitude: Double = 105.0,
    ): WeatherResponse

    // ── Địa điểm ──
    @GET("v1/places")
    suspend fun places(): PlacesResponse

    @GET("v1/places/{slug}")
    suspend fun place(@Path("slug") slug: String): PlaceDetailResponse

    @GET("v1/tours")
    suspend fun tours(): ToursResponse

    // ── Phòng ──
    @GET("v1/rooms")
    suspend fun rooms(): RoomsResponse

    // ── Xe đưa đón ──
    @GET("v1/transport/quotes")
    suspend fun transportQuotes(
        @Query("from") from: String,
        @Query("to") to: String = "LOCALMATE, Núi Cấm",
        @Query("seats") seats: Int = 2,
        @Query("lat") latitude: Double? = null,
        @Query("lng") longitude: Double? = null,
    ): TransportQuotesResponse

    @GET("v1/geocode/reverse")
    suspend fun reverseGeocode(
        @Query("lat") latitude: Double,
        @Query("lng") longitude: Double,
    ): ReverseGeocodeResponse

    // ── Đặt dịch vụ ──
    @POST("v1/bookings")
    suspend fun createBooking(@Body request: BookingRequest): BookingResponse

    @GET("v1/bookings/{id}/dispatch")
    suspend fun dispatchStatus(@Path("id") id: String): DispatchStatusDto

    @POST("v1/bookings/{id}/redispatch")
    suspend fun redispatch(@Path("id") id: String): DispatchStatusDto

    // ── Tài khoản ──
    @POST("v1/auth/register")
    suspend fun register(@Body request: AuthRequest): AuthResponse

    @POST("v1/auth/login")
    suspend fun login(@Body request: AuthRequest): AuthResponse

    @GET("v1/auth/me")
    suspend fun me(): MeResponse

    // ── Đối tác ──
    @POST("v1/partners/register")
    suspend fun registerPartner(@Body request: PartnerRegisterRequest): PartnerRegisterResponse

    @GET("v1/partner/me")
    suspend fun partnerMe(): PartnerMeResponse

    @GET("v1/partner/bookings")
    suspend fun partnerBookings(): PartnerBookingsResponse

    @PATCH("v1/partner/bookings/{id}/status")
    suspend fun setBookingStatus(@Path("id") id: String, @Body request: StatusRequest): Unit

    // ── Đối tác tự đăng dịch vụ ──
    @GET("v1/partner/listings")
    suspend fun listings(): ListingsResponse

    @POST("v1/partner/listings")
    suspend fun createListing(@Body request: ListingRequest): ListingSaveResponse

    @PATCH("v1/partner/listings/{id}")
    suspend fun updateListing(@Path("id") id: String, @Body request: ListingRequest): ListingSaveResponse

    @PATCH("v1/partner/listings/{id}")
    suspend fun setListingStatus(@Path("id") id: String, @Body request: ListingStatusRequest): ListingSaveResponse

    @DELETE("v1/partner/listings/{id}")
    suspend fun deleteListing(@Path("id") id: String): Unit

    // ── Tài xế ──
    @GET("v1/service-areas")
    suspend fun serviceAreas(): ServiceAreasResponse

    @POST("v1/driver/online")
    suspend fun driverOnline(@Body request: DriverLocationRequest): DriverStateResponse

    @POST("v1/driver/offline")
    suspend fun driverOffline(): DriverStateResponse

    @POST("v1/driver/heartbeat")
    suspend fun driverHeartbeat(@Body request: DriverLocationRequest): DriverStateResponse

    @GET("v1/driver/offers")
    suspend fun driverOffers(): DriverOffersResponse

    @POST("v1/driver/offers/{id}/accept")
    suspend fun acceptOffer(@Path("id") id: String): AcceptOfferResponse

    // ── Chuyến đang chạy ──
    // Khôi phục chuyến đang chạy sau khi app bị tắt giữa chừng
    @GET("v1/driver/trip")
    suspend fun activeTrip(): ActiveTripDto

    @POST("v1/driver/trips/{bookingId}/location")
    suspend fun sendTripLocation(
        @Path("bookingId") bookingId: String,
        @Body request: DriverLocationRequest,
    ): Unit

    @POST("v1/driver/trips/{bookingId}/stage")
    suspend fun setTripStage(
        @Path("bookingId") bookingId: String,
        @Body request: TripStageRequest,
    ): TripStageResponse

    @POST("v1/driver/offers/{id}/decline")
    suspend fun declineOffer(@Path("id") id: String): Unit

    // ── Lịch trình ──
    @GET("v1/itinerary/options")
    suspend fun itineraryOptions(): ItineraryOptionsResponse

    @POST("v1/ai/itinerary")
    suspend fun createItinerary(@Body request: ItineraryRequest): ItineraryResponse

    @GET("v1/itineraries/{id}")
    suspend fun itinerary(@Path("id") id: String): ItineraryResponse

    @GET("v1/itineraries/{id}/replan")
    suspend fun replanCheck(@Path("id") id: String): ReplanResponse

    @POST("v1/itineraries/{id}/replan")
    suspend fun replanApply(@Path("id") id: String): ReplanApplyResponse

    @GET("v1/weather/outlook")
    suspend fun weatherOutlook(
        @Query("from") from: String,
        @Query("days") days: Int,
    ): OutlookResponse

    @GET("v1/events")
    suspend fun events(): EventsResponse

    @POST("v1/transport/pool-check")
    suspend fun poolCheck(@Body request: PoolCheckRequest): PoolCheckResponse

    // ── Đơn của khách ──
    // Tra bằng số điện thoại nên khách không đăng nhập vẫn xem được đơn mình
    // vừa đặt; đăng nhập rồi thì /v1/my/bookings gom đủ đơn của mọi thiết bị.
    @GET("v1/bookings/lookup")
    suspend fun lookupBookings(
        @Query("phone") phone: String,
        @Query("code") code: String = "",
    ): MyBookingsResponse

    @GET("v1/my/bookings")
    suspend fun myBookings(): MyBookingsResponse

    @GET("v1/bookings/{id}/track")
    suspend fun trackBooking(@Path("id") id: String): TrackResponse

    @POST("v1/bookings/{id}/cancel")
    suspend fun cancelBooking(
        @Path("id") id: String,
        @Body request: CancelBookingRequest,
    ): CancelBookingResponse

    // ── Đặt cọc ──
    @GET("v1/bookings/{id}/payment")
    suspend fun payment(@Path("id") id: String, @Query("phone") phone: String): PaymentDto

    @POST("v1/bookings/{id}/payment/claim")
    suspend fun claimPayment(
        @Path("id") id: String,
        @Body request: PaymentClaimRequest,
    ): PaymentClaimResponse

    // ── Đánh giá ──
    @POST("v1/reviews")
    suspend fun createReview(@Body request: ReviewRequest): ReviewResponse

    // ── Hộ chiếu LOCALMATE ──
    // Đóng dấu diễn ra ở trang web /dau.html khi khách quét QR tại điểm, vì
    // con dấu bắt buộc kèm toạ độ thật. App chỉ xem.
    @GET("v1/passport")
    suspend fun passport(@Query("phone") phone: String = ""): PassportResponse

    @POST("v1/passport/claim")
    suspend fun claimStamp(@Body request: StampClaimRequest): StampClaimResponse

    // ── Thông báo ──
    @GET("v1/notifications")
    suspend fun guestNotifications(
        @Query("phone") phone: String,
        @Query("since") since: String = "",
    ): NotificationsResponse

    // Đăng ký máy nhận push. Gọi lại nhiều lần không sao — token là khoá chính.
    @POST("v1/devices/register")
    suspend fun registerDevice(@Body request: DeviceRegisterRequest): DeviceRegisterResponse

    @GET("v1/partner/notifications")
    suspend fun partnerNotifications(@Query("since") since: String = ""): NotificationsResponse

    // Đánh dấu đã đọc. Ba đường vì máy chủ chia thông báo theo ba nhóm người
    // nhận; một người có thể thuộc nhiều nhóm nên gọi cả ba, đường nào không
    // có quyền thì máy chủ tự chặn.
    @POST("v1/notifications/read")
    suspend fun markGuestNotificationsRead(
        @Body body: vn.baynuistay.feature.notify.ui.MarkReadBody,
    ): retrofit2.Response<Unit>

    @POST("v1/partner/notifications/read")
    suspend fun markPartnerNotificationsRead(): retrofit2.Response<Unit>

    @GET("v1/admin/notifications")
    suspend fun adminNotifications(@Query("since") since: String = ""): NotificationsResponse

    @POST("v1/admin/notifications/read")
    suspend fun markAdminNotificationsRead(): retrofit2.Response<Unit>

    // ── Trợ lý chat ──
    // Đường dẫn không có tiền tố v1 vì đây là endpoint có sẵn từ trước, dùng
    // chung với web. Đổi tên bây giờ sẽ làm hỏng ô chat trên web.
    @POST("api/chat")
    suspend fun chat(@Body request: ChatRequest): ChatResponse

    // ── Nhật ký chuyến đi ──
    // Khách đã đăng nhập thì token đủ để tra. Vẫn gửi kèm số điện thoại đã lưu
    // vì họ có thể từng đặt phòng lúc CHƯA đăng nhập — những đơn đó chỉ gắn với
    // số điện thoại, không gắn tài khoản, bỏ qua là nhật ký thiếu mất một mảng.
    @GET("v1/journal")
    suspend fun journal(@Query("phone") phone: String = ""): JournalResponse

    // ── Quản trị ──
    // Chỉ hai việc không thể chờ: duyệt đối tác và duyệt tin họ đăng.
    // ── Ảnh của tin đăng ──
    // Gửi thẳng byte của ảnh chứ không phải JSON, nên khai Content-Type ở đây.
    // Máy chủ tự nhận dạng JPG/PNG/WebP và chặn tệp không phải ảnh.
    @POST("v1/uploads/image")
    @Headers("Content-Type: image/jpeg")
    suspend fun uploadImage(@Body body: okhttp3.RequestBody): UploadImageResponse

    // ── Lịch khởi hành (chỉ đơn vị tour) ──
    @GET("v1/partner/departures")
    suspend fun partnerDepartures(): PartnerDeparturesResponse

    @POST("v1/partner/departures")
    suspend fun partnerOpenDeparture(@Body body: OpenDepartureRequest): retrofit2.Response<Unit>

    @PATCH("v1/partner/departures/{id}")
    suspend fun partnerSetDeparture(
        @Path("id") id: String,
        @Body body: DepartureStatusRequest,
    ): retrofit2.Response<Unit>

    // ── Dòng tiền ──
    // Bỏ trống month thì máy chủ lấy tháng này.
    @GET("v1/partner/cashflow")
    suspend fun partnerCashflow(@Query("month") month: String = ""): CashflowResponse

    // ── Quản trị trên điện thoại ──
    // Số của hôm nay gộp vào MỘT lời gọi: mở màn hình bằng 3G ở Tri Tôn mà hỏi
    // bốn chỗ là bốn lần chờ.
    @GET("v1/admin/today")
    suspend fun adminToday(): AdminTodayResponse

    @GET("v1/admin/bookings")
    suspend fun adminBookings(@Query("limit") limit: Int = 40): AdminBookingsResponse

    @POST("v1/admin/bookings/{id}/payment")
    suspend fun adminSetPayment(
        @Path("id") id: String,
        @Body body: PaymentStatusRequest,
    ): retrofit2.Response<Unit>

    @GET("v1/admin/contacts")
    suspend fun adminContacts(): AdminContactsResponse

    @POST("v1/admin/contacts/{id}/read")
    suspend fun adminMarkContactRead(@Path("id") id: String): retrofit2.Response<Unit>

    @GET("v1/admin/partners")
    suspend fun adminPartners(): AdminPartnersResponse

    @PATCH("v1/admin/partners/{id}/status")
    suspend fun adminSetPartnerStatus(
        @Path("id") id: String,
        @Body body: StatusRequest,
    ): retrofit2.Response<Unit>

    @GET("v1/admin/listings")
    suspend fun adminListings(): AdminListingsResponse

    @PATCH("v1/admin/listings/{id}/status")
    suspend fun adminSetListingStatus(
        @Path("id") id: String,
        @Body body: StatusRequest,
    ): retrofit2.Response<Unit>

    // ── Phiên bản app ──
    @GET("v1/app/version")
    suspend fun appVersion(@Query("have") have: Int): AppVersionResponse

    // ── Hiểu về An Giang ──
    // Ngôn ngữ do header Accept-Language quyết (AuthInterceptor đã gắn sẵn).
    @GET("v1/seasons")
    suspend fun seasons(): SeasonsResponse

    @GET("v1/peoples")
    suspend fun peoples(): PeoplesResponse

    @GET("v1/clusters")
    suspend fun clusters(): ClustersResponse
}
