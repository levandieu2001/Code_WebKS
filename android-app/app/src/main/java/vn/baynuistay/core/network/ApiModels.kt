package vn.baynuistay.core.network

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

// ── Thời tiết ──
@Serializable
data class WeatherResponse(
    val current: CurrentWeatherDto,
    val hourly: List<HourlyWeatherDto> = emptyList(),
    val daily: List<DailyWeatherDto> = emptyList(),
)

@Serializable
data class CurrentWeatherDto(
    val temp: Double,
    @SerialName("feels_like") val feelsLike: Double? = null,
    val humidity: Int? = null,
    @SerialName("rain_probability") val rainProbability: Int = 0,
    @SerialName("text_vi") val textVi: String = "Trời quang",
    @SerialName("text_en") val textEn: String = "",
    val icon: String = "cloud",
)

@Serializable
data class HourlyWeatherDto(
    val time: String,
    val temp: Double,
    @SerialName("rain_probability") val rainProbability: Int = 0,
    @SerialName("text_vi") val textVi: String = "",
    @SerialName("text_en") val textEn: String = "",
)

@Serializable
data class DailyWeatherDto(
    val date: String,
    @SerialName("temp_max") val tempMax: Double,
    @SerialName("temp_min") val tempMin: Double,
    @SerialName("rain_probability") val rainProbability: Int = 0,
    @SerialName("text_vi") val textVi: String = "",
    @SerialName("text_en") val textEn: String = "",
)

// ── Phòng ──
@Serializable
data class RoomsResponse(val data: List<RoomDto> = emptyList())

@Serializable
data class RoomDto(
    val id: String,
    val name: String,
    val description: String = "",
    val amenities: List<String> = emptyList(),
    val price: Int = 0,
    val capacity: Int = 2,
    val status: String = "available",
    @SerialName("image_url") val imageUrl: String = "",
) {
    val isAvailable: Boolean get() = status == "available"
}

// ── Xe đưa đón ──
@Serializable
data class TransportQuotesResponse(
    val route: TransportRouteDto,
    val data: List<TransportQuoteDto> = emptyList(),
)

@Serializable
data class TransportRouteDto(
    val from: String,
    val to: String,
    @SerialName("distance_km") val distanceKm: Int = 0,
)

@Serializable
data class TransportQuoteDto(
    val id: String,
    @SerialName("partner_id") val partnerId: String,
    @SerialName("partner_name") val partnerName: String,
    val rating: Double = 0.0,
    val reviews: Int = 0,
    val note: String = "",
    @SerialName("vehicle_type") val vehicleType: String,
    @SerialName("vehicle_label") val vehicleLabel: String,
    val seats: Int = 4,
    @SerialName("distance_km") val distanceKm: Int = 0,
    @SerialName("duration_min") val durationMin: Int = 0,
    val price: Int = 0,
)

// ── Đặt dịch vụ (dùng chung cho phòng và xe) ──
@Serializable
data class BookingRequest(
    val kind: String,
    @SerialName("guest_name") val guestName: String,
    val phone: String,
    val email: String = "",
    val note: String = "",
    val source: String = "android",
    val pool: Boolean = false,
    @SerialName("listing_id") val listingId: String? = null,
    val quantity: Int? = null,
    val address: String? = null,
    // kind = hotel
    @SerialName("room_id") val roomId: String? = null,
    @SerialName("check_in") val checkIn: String? = null,
    @SerialName("check_out") val checkOut: String? = null,
    val nights: Int? = null,
    // kind = tour
    @SerialName("tour_slug") val tourSlug: String? = null,
    val guests: Int? = null,
    // kind = transport
    val pickup: String? = null,
    @SerialName("pickup_lat") val pickupLat: Double? = null,
    @SerialName("pickup_lng") val pickupLng: Double? = null,
    val dropoff: String? = null,
    val date: String? = null,
    val time: String? = null,
    val seats: Int? = null,
    @SerialName("vehicle_type") val vehicleType: String? = null,
    @SerialName("partner_id") val partnerId: String? = null,
    @SerialName("round_trip") val roundTrip: Boolean? = null,
    @SerialName("return_date") val returnDate: String? = null,
    @SerialName("return_time") val returnTime: String? = null,
)

@Serializable
data class BookingResponse(
    val data: BookingDataDto,
    val message: String = "",
)

@Serializable
data class BookingDataDto(
    val id: String,
    val code: String = "",
    val kind: String,
    val status: String,
    @SerialName("total_price") val totalPrice: Int,
    val summary: String = "",
    @SerialName("check_in") val checkIn: String = "",
    @SerialName("check_out") val checkOut: String = "",
)

// ── Địa điểm & hệ sinh thái quanh nó ──
@Serializable
data class PlacesResponse(val data: List<PlaceSummaryDto> = emptyList())

@Serializable
data class PlaceSummaryDto(
    val slug: String,
    val name: String,
    val category: String = "",
    val area: String = "",
    val summary: String = "",
    @SerialName("distance_km") val distanceKm: Double = 0.0,
    val duration: String = "",
    val ticket: String = "",
    val rating: Double = 0.0,
    val image: String = "",
    // Bản tiếng Anh do máy chủ trả kèm. Để mặc định rỗng vì nội dung mới thêm
    // có thể chưa kịp dịch — lúc đó giao diện tự lùi về bản tiếng Việt.
    val nameEn: String = "",
    val categoryEn: String = "",
    val summaryEn: String = "",
    val durationEn: String = "",
    val ticketEn: String = "",
)

@Serializable
data class PlaceDetailResponse(
    val place: PlaceDto,
    val tours: List<TourDto> = emptyList(),
    val foods: List<FoodDto> = emptyList(),
    val stays: List<RoomDto> = emptyList(),
    val transport: TransportInfoDto,
    val nearby: List<PlaceSummaryDto> = emptyList(),
)

@Serializable
data class PlaceDto(
    val slug: String,
    val name: String,
    val category: String = "",
    val area: String = "",
    val summary: String = "",
    val content: String = "",
    @SerialName("distance_km") val distanceKm: Double = 0.0,
    val duration: String = "",
    val ticket: String = "",
    @SerialName("open_time") val openTime: String = "",
    @SerialName("best_time") val bestTime: String = "",
    val tips: String = "",
    val rating: Double = 0.0,
    val image: String = "",
    val gallery: List<String> = emptyList(),
    val nameEn: String = "",
    val categoryEn: String = "",
    val summaryEn: String = "",
    val durationEn: String = "",
    val ticketEn: String = "",
    val openTimeEn: String = "",
    val bestTimeEn: String = "",
    val tipsEn: String = "",
)

@Serializable
data class TourDto(
    val slug: String,
    val name: String,
    val image: String = "",
    val price: Int = 0,
    val days: Int = 1,
    val duration: String = "",
    val pax: String = "",
    val rating: Double = 0.0,
    val stops: String = "",
    val includes: List<String> = emptyList(),
    val schedule: List<TourStopDto> = emptyList(),
    val soldOut: Boolean = false,
)

@Serializable
data class TourStopDto(val time: String = "", val label: String = "")

@Serializable
data class FoodDto(
    val slug: String,
    val name: String,
    val cul: String = "",
    val price: Int = 0,
    val where: String = "",
    val image: String = "",
)

@Serializable
data class TransportInfoDto(
    val hint: String = "",
    @SerialName("pickup_suggestions") val pickupSuggestions: List<String> = emptyList(),
    val dropoff: String = "",
)

@Serializable
data class ToursResponse(val data: List<TourDto> = emptyList())

// ── Vị trí ──
@Serializable
data class ReverseGeocodeResponse(
    val lat: Double,
    val lng: Double,
    val address: String = "",
    @SerialName("short_name") val shortName: String = "",
    @SerialName("distance_to_home_km") val distanceToHomeKm: Int = 0,
)

// ── Tài khoản ──
@Serializable
data class AuthRequest(
    val email: String,
    val password: String,
    @SerialName("full_name") val fullName: String? = null,
)

@Serializable
data class AuthResponse(
    val token: String,
    @SerialName("refresh_token") val refreshToken: String = "",
    val user: UserDto,
)

@Serializable
data class MeResponse(val user: UserDto)

@Serializable
data class UserDto(
    val id: String = "",
    val email: String = "",
    @SerialName("full_name") val fullName: String = "",
    /**
     * Máy chủ nói cho biết tài khoản này có quyền quản trị hay không.
     *
     * Chỉ dùng để quyết định CÓ HIỆN mục quản trị hay không. Mọi endpoint quản
     * trị đều tự kiểm tra lại bằng email phía máy chủ, nên sửa cờ này trong app
     * cũng chẳng mở được cửa nào.
     */
    @SerialName("is_admin") val isAdmin: Boolean = false,
)

// ── Đối tác ──
@Serializable
data class PartnerRegisterRequest(
    val type: String,
    val name: String,
    val phone: String,
    val address: String = "",
    val email: String,
    val password: String,
    val note: String = "",
    @SerialName("vehicle_type") val vehicleType: String = "",
    @SerialName("vehicle_seats") val vehicleSeats: Int = 0,
    val plate: String = "",
)

@Serializable
data class PartnerRegisterResponse(
    val token: String,
    val partner: PartnerDto,
    val message: String = "",
)

@Serializable
data class PartnerMeResponse(
    val partner: PartnerDto,
    val online: Boolean? = null,
)

@Serializable
data class PartnerDto(
    val id: String = "",
    val type: String = "",
    val name: String = "",
    val phone: String = "",
    val address: String = "",
    val status: String = "pending",
    val commission: Double = 0.0,
    @SerialName("vehicleType") val vehicleType: String = "",
    val plate: String = "",
) {
    val isApproved: Boolean get() = status == "approved"
    val isDriver: Boolean get() = type == "transport"
}

@Serializable
data class PartnerBookingsResponse(val data: List<PartnerBookingDto> = emptyList())

@Serializable
data class PartnerBookingDto(
    val id: String = "",
    val kind: String = "hotel",
    val roomName: String = "",
    val guestName: String = "",
    val phone: String = "",
    val note: String = "",
    val status: String = "pending",
    val checkIn: String = "",
    val checkOut: String = "",
    val pickupTime: String = "",
    val nights: Int = 0,
    val guests: Int = 0,
    val totalPrice: Int = 0,
)

@Serializable
data class StatusRequest(val status: String)

// ── Tài xế: bật/tắt nhận đơn và lời mời chuyến ──
@Serializable
data class DriverLocationRequest(
    val lat: Double? = null,
    val lng: Double? = null,
    // Tài xế chọn khu vực thì không cần GPS
    val area: String? = null,
)

@Serializable
data class ServiceAreasResponse(
    val data: List<ServiceAreaDto> = emptyList(),
    @SerialName("radius_km") val radiusKm: Int = 30,
)

@Serializable
data class ServiceAreaDto(
    val slug: String,
    val name: String,
    val province: String = "",
)

@Serializable
data class DriverAreaDto(val slug: String = "", val name: String = "")

@Serializable
data class DriverStateResponse(
    val online: Boolean = false,
    val area: DriverAreaDto? = null,
    val message: String = "",
)

@Serializable
data class DriverOffersResponse(
    val online: Boolean = false,
    val area: DriverAreaDto? = null,
    @SerialName("radius_km") val radiusKm: Int = 30,
    val data: List<DriverOfferDto> = emptyList(),
)

@Serializable
data class DriverOfferDto(
    val id: String,
    @SerialName("booking_id") val bookingId: String = "",
    @SerialName("distance_km") val distanceKm: Double = 0.0,
    @SerialName("seconds_left") val secondsLeft: Int = 0,
    val pickup: String = "",
    val dropoff: String = "",
    val date: String = "",
    val time: String = "",
    val seats: Int = 0,
    val price: Int = 0,
    @SerialName("guest_name") val guestName: String = "",
)

// ── Khách theo dõi "đang tìm tài xế" ──
@Serializable
data class DispatchStatusDto(
    // searching | accepted | timeout | no_driver
    val state: String = "searching",
    val tried: Int = 0,
    @SerialName("seconds_left") val secondsLeft: Int = 0,
    @SerialName("can_retry") val canRetry: Boolean = false,
    @SerialName("giveup_minutes") val giveupMinutes: Int = 10,
    val message: String = "",
    @SerialName("driver_name") val driverName: String = "",
    @SerialName("driver_phone") val driverPhone: String = "",
    val plate: String = "",
    @SerialName("distance_km") val distanceKm: Double = 0.0,
)

// ── Dự báo nhiều ngày (xem trước ngày đi) ──
@Serializable
data class OutlookResponse(
    val from: String = "",
    val days: List<DayWeatherDto> = emptyList(),
    val summary: String = "",
    @SerialName("out_of_range") val outOfRange: Boolean = false,
)

// ── Đổi lịch né mưa khi đang đi ──
@Serializable
data class ReplanResponse(
    // ok | suggest | warn | not_today | no_weather
    val state: String = "ok",
    val message: String = "",
    val swaps: List<ReplanSwapDto> = emptyList(),
)

@Serializable
data class ReplanSwapDto(
    val outdoor: ReplanSideDto? = null,
    val indoor: ReplanSideDto? = null,
    val reason: String = "",
)

@Serializable
data class ReplanSideDto(val time: String = "", val title: String = "", val rain: Int = 0)

@Serializable
data class ReplanApplyResponse(
    val changed: Int = 0,
    val message: String = "",
    val plan: List<ItineraryDayDto> = emptyList(),
)

// ── Ghép chuyến ──
@Serializable
data class PoolCheckRequest(
    val date: String,
    val time: String,
    val pickup: String,
    @SerialName("pickup_lat") val pickupLat: Double? = null,
    @SerialName("pickup_lng") val pickupLng: Double? = null,
    val dropoff: String,
    val seats: Int,
    @SerialName("vehicle_type") val vehicleType: String,
    val price: Int,
)

@Serializable
data class PoolCheckResponse(
    val available: Boolean = false,
    val matches: List<PoolMatchDto> = emptyList(),
    @SerialName("per_person") val perPerson: Int = 0,
    @SerialName("solo_price") val soloPrice: Int = 0,
    val saved: Int = 0,
    @SerialName("discount_percent") val discountPercent: Int = 0,
    @SerialName("window_minutes") val windowMinutes: Int = 45,
    val message: String = "",
)

@Serializable
data class PoolMatchDto(
    val time: String = "",
    val pickup: String = "",
    val seats: Int = 1,
    @SerialName("guest_name") val guestName: String = "",
    @SerialName("minutes_apart") val minutesApart: Int = 0,
)

// ── Lễ hội & sự kiện ──
@Serializable
data class EventsResponse(val data: List<EventDto> = emptyList())

@Serializable
data class EventDto(
    val id: String = "",
    val name: String = "",
    @SerialName("category_label") val categoryLabel: String = "",
    val area: String = "",
    val summary: String = "",
    val ticket: String = "",
    @SerialName("start_date") val startDate: String = "",
    @SerialName("end_date") val endDate: String = "",
)

// ── Tin đăng của đối tác: khách sạn đăng phòng, đơn vị tour đăng tour ──
@Serializable
data class ListingsResponse(
    val data: List<ListingDto> = emptyList(),
    // "stay" hoặc "tour", tuỳ loại đối tác
    @SerialName("listing_type") val listingType: String = "",
    val meta: ListingMetaDto = ListingMetaDto(),
)

@Serializable
data class ListingMetaDto(
    val total: Int = 0,
    val approved: Int = 0,
    val pending: Int = 0,
)

@Serializable
data class ListingDto(
    val id: String = "",
    val type: String = "stay",
    val name: String = "",
    val description: String = "",
    val price: Int = 0,
    val image: String = "",
    /** Cả thư viện ảnh; phần tử đầu chính là ảnh bìa. */
    val images: List<String> = emptyList(),
    // pending | approved | rejected | paused
    val status: String = "pending",
    @SerialName("status_label") val statusLabel: String = "",
    @SerialName("reject_note") val rejectNote: String = "",
    // Chỗ nghỉ
    val area: String = "",
    val lat: Double? = null,
    val lng: Double? = null,
    val capacity: Int? = null,
    val amenities: List<String> = emptyList(),
    // Tour
    val days: Int? = null,
    val duration: String = "",
    val pax: String = "",
    val stops: String = "",
    val includes: List<String> = emptyList(),
)

@Serializable
data class ListingRequest(
    val name: String,
    val price: Int,
    val description: String = "",
    val image: String = "",
    /**
     * Cả thư viện ảnh. Một tấm ảnh không bán được phòng: khách muốn xem phòng,
     * ban công, nhà tắm; tour thì muốn xem cảnh, xe, bữa ăn. Ảnh đầu tiên là
     * ảnh bìa, giữ nguyên field `image` cho tin đăng từ trước.
     */
    val images: List<String>? = null,
    // Chỗ nghỉ
    val area: String? = null,
    val lat: Double? = null,
    val lng: Double? = null,
    val capacity: Int? = null,
    val amenities: String? = null,
    // Tour
    val days: Int? = null,
    val duration: String? = null,
    val pax: String? = null,
    val stops: String? = null,
    val includes: String? = null,
)

@Serializable
data class UploadImageResponse(
    val url: String = "",
    val bytes: Long = 0,
    val mime: String = "",
    val message: String = "",
)

@Serializable
data class ListingSaveResponse(
    val data: ListingDto,
    val message: String = "",
)

@Serializable
data class ListingStatusRequest(val status: String)

// ── Chuyến đang chạy: tài xế chỉ đường và gửi vị trí ──
@Serializable
data class AcceptOfferResponse(val data: AcceptedRideDto = AcceptedRideDto())

@Serializable
data class AcceptedRideDto(
    @SerialName("booking_id") val bookingId: String = "",
    val status: String = "",
    val pickup: String = "",
    @SerialName("pickup_lat") val pickupLat: Double? = null,
    @SerialName("pickup_lng") val pickupLng: Double? = null,
    val dropoff: String = "",
    @SerialName("guest_name") val guestName: String = "",
    @SerialName("guest_phone") val guestPhone: String = "",
)

@Serializable
data class TripStageRequest(val stage: String)

@Serializable
data class TripStageResponse(val stage: String = "", val message: String = "")

// ── Lỗi từ backend ──
@Serializable
data class ApiErrorEnvelope(val error: ApiErrorBody)

@Serializable
data class ApiErrorBody(val code: String = "", val message: String = "")

// ── Lịch trình AI ──
@Serializable
data class ItineraryRequest(
    val days: Int,
    val people: Int,
    // Ngân sách mỗi khách, đơn vị đồng
    val budget: Int,
    @SerialName("start_point") val startPoint: String,
    @SerialName("start_date") val startDate: String? = null,
    val preferences: List<String> = emptyList(),
)

@Serializable
data class ItineraryResponse(
    @SerialName("trip_id") val tripId: String = "",
    val title: String = "",
    val summary: String = "",
    val tips: List<String> = emptyList(),
    @SerialName("ai_written") val aiWritten: Boolean = false,
    @SerialName("start_date") val startDate: String = "",
    @SerialName("end_date") val endDate: String = "",
    val days: Int = 1,
    val people: Int = 2,
    @SerialName("start_point") val startPoint: String = "",
    @SerialName("budget_total") val budgetTotal: Int = 0,
    @SerialName("estimated_total") val estimatedTotal: Int = 0,
    @SerialName("over_budget") val overBudget: Boolean = false,
    @SerialName("budget_note") val budgetNote: String = "",
    val plan: List<ItineraryDayDto> = emptyList(),
    val tours: List<ItineraryTourDto> = emptyList(),
    @SerialName("weather_warning") val weatherWarning: String = "",
    @SerialName("event_highlight") val eventHighlight: String = "",
)

@Serializable
data class ItineraryDayDto(
    val day: Int = 1,
    val date: String = "",
    val title: String = "",
    val cost: Int = 0,
    val items: List<ItineraryItemDto> = emptyList(),
    // Dự báo riêng cho ngày này
    val weather: DayWeatherDto? = null,
)

@Serializable
data class DayWeatherDto(
    val date: String = "",
    @SerialName("temp_max") val tempMax: Double = 0.0,
    @SerialName("temp_min") val tempMin: Double = 0.0,
    @SerialName("rain_probability") val rainProbability: Int = 0,
    @SerialName("text_vi") val textVi: String = "",
    @SerialName("text_en") val textEn: String = "",
)

@Serializable
data class ItineraryItemDto(
    val time: String = "",
    // transport | place | food | stay
    val kind: String = "place",
    val slug: String = "",
    val title: String = "",
    val subtitle: String = "",
    val price: Int = 0,
    val image: String = "",
    val tip: String = "",
    @SerialName("weather_note") val weatherNote: String = "",
    val outdoor: Boolean = false,
    // book_transport | book_stay | view_place
    val action: String = "",
    @SerialName("action_label") val actionLabel: String = "",
    val payload: ItineraryPayloadDto? = null,
)

@Serializable
data class ItineraryPayloadDto(
    val pickup: String = "",
    val dropoff: String = "",
    val time: String = "",
    @SerialName("stay_id") val stayId: String = "",
    @SerialName("check_in") val checkIn: String = "",
    @SerialName("check_out") val checkOut: String = "",
)

@Serializable
data class ItineraryTourDto(
    val slug: String = "",
    val name: String = "",
    val image: String = "",
    val price: Int = 0,
    val days: Int = 1,
    val duration: String = "",
    val rating: Double = 0.0,
    val stops: String = "",
    val total: Int = 0,
)

@Serializable
data class ItineraryOptionsResponse(
    val preferences: List<ItineraryOptionDto> = emptyList(),
    val budgets: List<BudgetOptionDto> = emptyList(),
    @SerialName("ai_enabled") val aiEnabled: Boolean = false,
)

@Serializable
data class ItineraryOptionDto(val value: String, val label: String, val labelEn: String = "")

@Serializable
data class BudgetOptionDto(val value: Int, val label: String, val labelEn: String = "")

// ════════════════════════════════════════════════════════════
// ĐƠN CỦA KHÁCH — tra cứu, huỷ, bám đường
// ════════════════════════════════════════════════════════════
// Cùng dữ liệu với trang "Đơn của tôi" trên web (/donhang.html), để khách
// đặt trên web rồi mở app vẫn thấy y hệt đơn đó.

@Serializable
data class MyBookingDto(
    val id: String = "",
    val code: String = "",
    val kind: String = "",
    val summary: String = "",
    val status: String = "",
    @SerialName("status_label") val statusLabel: String = "",
    @SerialName("total_price") val totalPrice: Long = 0,
    @SerialName("check_in") val checkIn: String = "",
    @SerialName("check_out") val checkOut: String = "",
    val pickup: String = "",
    val dropoff: String = "",
    @SerialName("pickup_time") val pickupTime: String = "",
    val nights: Int = 0,
    val guests: Int = 0,
    @SerialName("guest_name") val guestName: String = "",
    val phone: String = "",
    @SerialName("delivery_address") val deliveryAddress: String = "",
    val quantity: Int = 0,
    val unit: String = "",
    @SerialName("partner_name") val partnerName: String = "",
    @SerialName("created_at") val createdAt: String = "",
    @SerialName("can_cancel") val canCancel: Boolean = false,
    // ── Tiền cọc ──
    @SerialName("payment_status") val paymentStatus: String = "unpaid",
    @SerialName("payment_status_label") val paymentStatusLabel: String = "",
    @SerialName("deposit_amount") val depositAmount: Long = 0,
    // ── Đánh giá ──
    @SerialName("can_review") val canReview: Boolean = false,
    @SerialName("review_targets") val reviewTargets: List<ReviewTargetDto> = emptyList(),
)

@Serializable
data class ReviewTargetDto(
    val type: String = "",
    val id: String = "",
    val label: String = "",
)

@Serializable
data class MyBookingsResponse(
    val data: List<MyBookingDto> = emptyList(),
    val message: String = "",
)

@Serializable
data class TrackResponse(
    val tracking: Boolean = false,
    val stage: String = "",
    @SerialName("stage_label") val stageLabel: String = "",
    @SerialName("remaining_km") val remainingKm: Double? = null,
    @SerialName("eta_minutes") val etaMinutes: Int? = null,
    val lat: Double? = null,
    val lng: Double? = null,
    val stale: Boolean = false,
    @SerialName("driver_name") val driverName: String = "",
    @SerialName("driver_phone") val driverPhone: String = "",
    val plate: String = "",
    val message: String = "",
)

@Serializable
data class CancelBookingRequest(
    val phone: String = "",
    val reason: String = "",
)

@Serializable
data class CancelBookingResponse(
    val ok: Boolean = false,
    val message: String = "",
)

/**
 * Chuyến tài xế đang chạy dở, lấy lại từ máy chủ khi mở lại app.
 * Cùng các trường với AcceptedRideDto, thêm cờ active và chặng hiện tại.
 */
@Serializable
data class ActiveTripDto(
    val active: Boolean = false,
    val stage: String = "pickup",
    @SerialName("booking_id") val bookingId: String = "",
    val status: String = "",
    val pickup: String = "",
    @SerialName("pickup_lat") val pickupLat: Double? = null,
    @SerialName("pickup_lng") val pickupLng: Double? = null,
    val dropoff: String = "",
    @SerialName("guest_name") val guestName: String = "",
    @SerialName("guest_phone") val guestPhone: String = "",
) {
    fun toRide() = AcceptedRideDto(
        bookingId = bookingId,
        status = status,
        pickup = pickup,
        pickupLat = pickupLat,
        pickupLng = pickupLng,
        dropoff = dropoff,
        guestName = guestName,
        guestPhone = guestPhone,
    )
}


// ════════════════════════════════════════════════════════════
// ĐẶT CỌC · ĐÁNH GIÁ · THÔNG BÁO
// ════════════════════════════════════════════════════════════
// Cùng endpoint với web, nên số tiền cọc và số sao trên app luôn khớp trang web.

@Serializable
data class PaymentTransferDto(
    val ok: Boolean = false,
    val reason: String = "",
    val amount: Long = 0,
    val content: String = "",
    val account: String = "",
    @SerialName("account_name") val accountName: String = "",
    @SerialName("qr_image") val qrImage: String = "",
)

@Serializable
data class PaymentMethodDto(
    val id: String = "",
    val label: String = "",
    val ready: Boolean = false,
    val note: String = "",
)

@Serializable
data class PaymentDto(
    @SerialName("payment_status") val status: String = "unpaid",
    @SerialName("payment_status_label") val statusLabel: String = "",
    @SerialName("deposit_amount") val depositAmount: Long = 0,
    @SerialName("total_price") val totalPrice: Long = 0,
    val remaining: Long = 0,
    @SerialName("can_pay") val canPay: Boolean = false,
    val methods: List<PaymentMethodDto> = emptyList(),
    val transfer: PaymentTransferDto = PaymentTransferDto(),
)

@Serializable
data class PaymentClaimRequest(
    val phone: String = "",
    val method: String = "vietqr",
    val ref: String = "",
)

@Serializable
data class PaymentClaimResponse(
    @SerialName("payment_status") val status: String = "",
    val message: String = "",
)

@Serializable
data class ReviewRequest(
    @SerialName("booking_id") val bookingId: String,
    val phone: String,
    @SerialName("target_type") val targetType: String = "",
    @SerialName("target_id") val targetId: String = "",
    val rating: Int,
    val comment: String = "",
)

@Serializable
data class ReviewResponse(
    val message: String = "",
)

@Serializable
data class AppNotificationDto(
    val id: String = "",
    val kind: String = "",
    val title: String = "",
    val body: String = "",
    @SerialName("booking_id") val bookingId: String = "",
    val read: Boolean = false,
    @SerialName("created_at") val createdAt: String = "",
)

@Serializable
data class NotificationsResponse(
    val data: List<AppNotificationDto> = emptyList(),
    val unread: Int = 0,
)


/** Báo token FCM của máy này cho máy chủ, để push tới đúng người. */
@Serializable
data class DeviceRegisterRequest(
    val token: String,
    val phone: String = "",
    val platform: String = "android",
)

@Serializable
data class DeviceRegisterResponse(
    val ok: Boolean = false,
    val audience: String = "",
)


// ════════════════════════════════════════════════════════════
// HỘ CHIẾU BẢY NÚI
// ════════════════════════════════════════════════════════════
// Trước đây màn Passport hiện 6 con dấu viết cứng và tên "NGUYỄN MINH AN" —
// ai bấm vào cũng thấy ngay là giả. Giờ lấy dữ liệu thật từ máy chủ.

@Serializable
data class PassportStampDto(
    val slug: String = "",
    val name: String = "",
    val symbol: String = "",
    val area: String = "",
    val image: String = "",
    val lat: Double = 0.0,
    val lng: Double = 0.0,
    val earned: Boolean = false,
    @SerialName("earned_at") val earnedAt: String = "",
)

@Serializable
data class PassportRewardDto(
    val need: Int = 0,
    val title: String = "",
    val note: String = "",
    val code: String = "",
    val unlocked: Boolean = false,
    val missing: Int = 0,
)

@Serializable
data class PassportResponse(
    @SerialName("holder_name") val holderName: String = "",
    val count: Int = 0,
    val total: Int = 0,
    val level: Int = 1,
    @SerialName("level_name") val levelName: String = "",
    @SerialName("next_level_in") val nextLevelIn: Int = 0,
    val stamps: List<PassportStampDto> = emptyList(),
    val rewards: List<PassportRewardDto> = emptyList(),
    val anonymous: Boolean = false,
)


/** Đóng dấu sau khi quét QR tại điểm. Toạ độ là bắt buộc — máy chủ kiểm tra. */
@Serializable
data class StampClaimRequest(
    val slug: String,
    val code: String,
    val lat: Double,
    val lng: Double,
    val phone: String = "",
)

@Serializable
data class StampClaimStampDto(
    val slug: String = "",
    val name: String = "",
    val symbol: String = "",
    @SerialName("distance_m") val distanceM: Int = 0,
)

@Serializable
data class StampClaimResponse(
    val data: StampClaimStampDto = StampClaimStampDto(),
    val passport: PassportResponse = PassportResponse(),
    val message: String = "",
)

// ════════════════════════════════════════════════════════════
// TRỢ LÝ CHAT
// ════════════════════════════════════════════════════════════
// Dùng CHUNG endpoint /api/chat với ô chat trên web, nên bot trong app biết
// đúng những gì bot trên web biết: giá phòng thật, thời tiết hôm nay, tour
// đang mở. Không dựng đường riêng cho app để khỏi phải sửa hai nơi.

@Serializable
data class ChatTurnDto(
    /** "user" hoặc "bot" — máy chủ tự đổi sang định dạng của Gemini. */
    val role: String,
    val text: String,
)

@Serializable
data class ChatRequest(
    val message: String,
    /** Chỉ gửi vài lượt gần nhất; máy chủ cũng chỉ lấy 10 lượt cuối. */
    val history: List<ChatTurnDto> = emptyList(),
    val lang: String = "vi",
)

@Serializable
data class ChatResponse(
    val message: String = "",
    val quickReplies: List<String> = emptyList(),
    /**
     * Gợi ý mở thẳng một màn hình: open_rooms, open_transport, open_trip,
     * open_tours. Null nghĩa là câu trả lời không dẫn tới đâu cả.
     */
    val action: String? = null,
    /** "gemini-2.5-flash", tên model OpenAI, hoặc "offline". */
    val model: String = "",
)

// ════════════════════════════════════════════════════════════
// NHẬT KÝ CHUYẾN ĐI
// ════════════════════════════════════════════════════════════
// Máy chủ gộp đơn đặt và con dấu hộ chiếu thành một dòng thời gian. App chỉ
// vẽ ra — không tự tính toán gì, để web và app không bao giờ ra hai con số
// khác nhau cho cùng một khách.

@Serializable
data class JournalHolderDto(
    val name: String = "",
    val phone: String = "",
)

@Serializable
data class JournalSummaryDto(
    val trips: Int = 0,
    val nights: Int = 0,
    val bookings: Int = 0,
    val stamps: Int = 0,
    @SerialName("stations_total") val stationsTotal: Int = 0,
    val spent: Long = 0,
    @SerialName("first_visit") val firstVisit: String = "",
    @SerialName("last_visit") val lastVisit: String = "",
)

@Serializable
data class JournalEntryDto(
    val date: String = "",
    /** stay · transport · tour · stamp */
    val type: String = "",
    val title: String = "",
    val detail: String = "",
    val partner: String = "",
    val symbol: String = "",
    val amount: Long = 0,
    val cancelled: Boolean = false,
)

@Serializable
data class JournalStampDto(
    val slug: String = "",
    val name: String = "",
    val symbol: String = "",
    val date: String = "",
)

@Serializable
data class JournalResponse(
    val holder: JournalHolderDto = JournalHolderDto(),
    val summary: JournalSummaryDto = JournalSummaryDto(),
    val timeline: List<JournalEntryDto> = emptyList(),
    val stamps: List<JournalStampDto> = emptyList(),
)

// ════════════════════════════════════════════════════════════
// QUẢN TRỊ — bản rút gọn cho điện thoại
// ════════════════════════════════════════════════════════════
// App chỉ làm những việc KHÔNG THỂ CHỜ: duyệt đối tác mới và duyệt tin phòng
// họ vừa đăng. Đối tác đăng ký xong mà chờ hai ngày mới được duyệt thì họ bỏ
// đi mất. Còn báo cáo, sổ quỹ, in mã QR thì ngồi máy tính làm thoải mái hơn.

// ── Lịch khởi hành của đơn vị tour ──
// Khách lẻ đăng ký ghép chuyến theo ngày; đơn vị tour cần thấy ngày nào có mấy
// khách và có tên, số điện thoại để gọi xác nhận giờ đón.
@Serializable
data class PartnerDeparturesResponse(
    val data: List<DepartureDto> = emptyList(),
    val meta: DepartureMeta = DepartureMeta(),
    val tours: List<DepartureTourDto> = emptyList(),
)

@Serializable
data class DepartureMeta(
    @SerialName("min_guests") val minGuests: Int = 6,
    @SerialName("cutoff_days") val cutoffDays: Int = 2,
    val discount: Double = 0.25,
)

@Serializable
data class DepartureTourDto(
    val slug: String = "",
    val name: String = "",
    val price: Long = 0,
)

@Serializable
data class DepartureDto(
    val id: String = "",
    @SerialName("tour_slug") val tourSlug: String = "",
    @SerialName("tour_name") val tourName: String = "",
    val date: String = "",
    val status: String = "forming",
    @SerialName("status_label") val statusLabel: String = "",
    val joined: Int = 0,
    @SerialName("min_guests") val minGuests: Int = 0,
    val missing: Int = 0,
    val price: Long = 0,
    val cutoff: String = "",
    val progress: Int = 0,
    val members: List<DepartureMemberDto> = emptyList(),
) {
    val dangGom: Boolean get() = status == "forming"
    val duKhach: Boolean get() = joined >= minGuests
}

@Serializable
data class DepartureMemberDto(
    val name: String = "",
    val phone: String = "",
    val guests: Int = 1,
)

@Serializable
data class OpenDepartureRequest(
    @SerialName("tour_slug") val tourSlug: String,
    val date: String,
    @SerialName("min_guests") val minGuests: Int = 0,
)

@Serializable
data class DepartureStatusRequest(val status: String)

// ── Dòng tiền của đối tác ──
// LOCALMATE chỉ giữ hộ PHẦN TIỀN CỌC khách chuyển qua hệ thống; phần còn lại
// khách trả thẳng cho đối tác lúc nhận dịch vụ nên không nằm trong bảng này.
@Serializable
data class CashflowResponse(
    val month: String = "",
    @SerialName("commission_rate") val commissionRate: Double = 0.0,
    val summary: CashflowSummary = CashflowSummary(),
    val entries: List<CashflowEntry> = emptyList(),
)

@Serializable
data class CashflowSummary(
    @SerialName("deposit_collected") val depositCollected: Long = 0,
    @SerialName("commission_deducted") val commissionDeducted: Long = 0,
    @SerialName("paid_to_you") val paidToYou: Long = 0,
    val refunded: Long = 0,
    @SerialName("owed_to_you") val owedToYou: Long = 0,
)

@Serializable
data class CashflowEntry(
    val date: String = "",
    val type: String = "",
    @SerialName("type_label") val typeLabel: String = "",
    val direction: String = "",
    val amount: Long = 0,
    @SerialName("booking_code") val bookingCode: String = "",
    val note: String = "",
)

// ── Quản trị trên điện thoại: đơn mới, tin nhắn khách, số của hôm nay ──
@Serializable
data class AdminTodayResponse(val data: AdminTodayDto = AdminTodayDto())

@Serializable
data class AdminTodayDto(
    val date: String = "",
    @SerialName("bookings_today") val bookingsToday: Int = 0,
    @SerialName("revenue_today") val revenueToday: Long = 0,
    /** Khách báo đã chuyển tiền, chờ mình đối chiếu rồi xác nhận. */
    @SerialName("deposit_waiting") val depositWaiting: Int = 0,
    @SerialName("partners_pending") val partnersPending: Int = 0,
    @SerialName("listings_pending") val listingsPending: Int = 0,
    @SerialName("contacts_unread") val contactsUnread: Int = 0,
)

@Serializable
data class AdminBookingsResponse(
    val data: List<AdminBookingDto> = emptyList(),
    val meta: AdminBookingsMeta = AdminBookingsMeta(),
)

@Serializable
data class AdminBookingsMeta(val total: Int = 0, val today: Int = 0)

@Serializable
data class AdminBookingDto(
    val id: String = "",
    val code: String = "",
    val kind: String = "room",
    @SerialName("guest_name") val guestName: String = "",
    val phone: String = "",
    val detail: String = "",
    @SerialName("check_in") val checkIn: String = "",
    @SerialName("total_price") val totalPrice: Long = 0,
    @SerialName("deposit_amount") val depositAmount: Long = 0,
    val status: String = "",
    @SerialName("payment_status") val paymentStatus: String = "unpaid",
    @SerialName("payment_status_label") val paymentStatusLabel: String = "",
    @SerialName("created_at") val createdAt: String = "",
) {
    val daNhanCoc: Boolean get() = paymentStatus == "paid"
    /** Khách báo đã chuyển — đây là đơn cần mình đối chiếu trước tiên. */
    val choDoiChieu: Boolean get() = paymentStatus == "pending_confirm"
}

@Serializable
data class AdminContactsResponse(
    val data: List<AdminContactDto> = emptyList(),
    val meta: AdminContactsMeta = AdminContactsMeta(),
)

@Serializable
data class AdminContactsMeta(val total: Int = 0, val unread: Int = 0)

@Serializable
data class AdminContactDto(
    val id: String = "",
    val name: String = "",
    val phone: String = "",
    val email: String = "",
    val message: String = "",
    @SerialName("is_read") val isRead: Boolean = false,
    @SerialName("created_at") val createdAt: String = "",
)

@Serializable
data class PaymentStatusRequest(val status: String)

@Serializable
data class AdminPartnersResponse(
    val data: List<PartnerDto> = emptyList(),
)

@Serializable
data class AdminListingDto(
    val id: String = "",
    val type: String = "",
    val name: String = "",
    val description: String = "",
    val price: Long = 0,
    val image: String = "",
    val status: String = "pending",
    @SerialName("status_label") val statusLabel: String = "",
    val area: String = "",
    @SerialName("partner_name") val partnerName: String = "",
    @SerialName("created_at") val createdAt: String = "",
)

@Serializable
data class AdminListingsResponse(
    val data: List<AdminListingDto> = emptyList(),
)

// ── Phiên bản app ──
// App phát bằng file APK chứ không qua Google Play, nên không có ai tự báo cho
// khách biết có bản mới. Máy chủ giữ số hiệu, app hỏi mỗi lần mở.

@Serializable
data class AppVersionResponse(
    @SerialName("version_code") val versionCode: Int = 0,
    @SerialName("version_name") val versionName: String = "",
    @SerialName("apk_url") val apkUrl: String = "",
    val notes: String = "",
    /** Bản cũ không dùng được nữa — không cho bỏ qua. */
    val mandatory: Boolean = false,
    @SerialName("update_available") val updateAvailable: Boolean = false,
)

// ════════════════════════════════════════════════════════════
// HIỂU VỀ AN GIANG
// ════════════════════════════════════════════════════════════
// Ba câu hỏi khách ngoài tỉnh luôn hỏi: đi tháng nào, gặp ai, sắp lịch mấy
// ngày. Máy chủ dựng sẵn nội dung nên web và app luôn nói cùng một điều.

@Serializable
data class FestivalDto(
    val name: String = "",
    val `when`: String = "",
    val crowd: String = "",
)

@Serializable
data class MonthDto(
    val month: Int = 0,
    /** low · rising · flood · falling — quyết định màu ô tháng */
    val water: String = "low",
    @SerialName("water_label") val waterLabel: String = "",
    @SerialName("water_note") val waterNote: String = "",
    val weather: String = "",
    val good: List<String> = emptyList(),
    val avoid: List<String> = emptyList(),
    val food: List<String> = emptyList(),
    val festivals: List<FestivalDto> = emptyList(),
)

@Serializable
data class BestForDto(
    val key: String = "",
    val months: List<Int> = emptyList(),
    val note: String = "",
)

@Serializable
data class SeasonsResponse(
    val data: List<MonthDto> = emptyList(),
    @SerialName("best_for") val bestFor: List<BestForDto> = emptyList(),
    /** Tháng hiện tại, để mở sẵn đúng chỗ khách đang đứng */
    val now: Int = 1,
)

@Serializable
data class EtiquetteDto(
    // `do` là từ khoá của Kotlin nên phải đổi tên thuộc tính
    @SerialName("do") val should: List<String> = emptyList(),
    @SerialName("dont") val shouldNot: List<String> = emptyList(),
)

@Serializable
data class PeopleDto(
    val slug: String = "",
    val name: String = "",
    val where: String = "",
    val image: String = "",
    val summary: String = "",
    val see: List<String> = emptyList(),
    val food: List<String> = emptyList(),
    val festivals: List<String> = emptyList(),
    val etiquette: EtiquetteDto = EtiquetteDto(),
)

@Serializable
data class PeoplesResponse(val data: List<PeopleDto> = emptyList())

@Serializable
data class ClusterPlaceDto(
    val slug: String = "",
    val name: String = "",
    val image: String = "",
    val duration: String = "",
)

@Serializable
data class ClusterLegDto(
    val from: String = "",
    val to: String = "",
    val km: Double = 0.0,
    val minutes: Int = 0,
    @SerialName("same_spot") val sameSpot: Boolean = false,
    val label: String = "",
)

@Serializable
data class ClusterDto(
    val day: Int = 0,
    val area: String = "",
    val title: String = "",
    val note: String = "",
    @SerialName("drive_minutes") val driveMinutes: Int = 0,
    val places: List<ClusterPlaceDto> = emptyList(),
    val legs: List<ClusterLegDto> = emptyList(),
)

@Serializable
data class ClustersResponse(val data: List<ClusterDto> = emptyList())
