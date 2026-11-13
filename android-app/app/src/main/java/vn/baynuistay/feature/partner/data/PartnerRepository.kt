package vn.baynuistay.feature.partner.data

import javax.inject.Inject
import javax.inject.Singleton
import vn.baynuistay.core.local.TokenStore
import vn.baynuistay.core.network.DepartureStatusRequest
import vn.baynuistay.core.network.OpenDepartureRequest
import vn.baynuistay.core.network.BayNuiApi
import vn.baynuistay.core.network.DriverLocationRequest
import vn.baynuistay.core.network.DriverStateResponse
import vn.baynuistay.core.network.ServiceAreasResponse
import vn.baynuistay.core.network.DriverOffersResponse
import vn.baynuistay.core.network.PartnerBookingDto
import vn.baynuistay.core.network.AcceptedRideDto
import vn.baynuistay.core.network.ActiveTripDto
import vn.baynuistay.core.network.ListingRequest
import vn.baynuistay.core.network.ListingSaveResponse
import vn.baynuistay.core.network.ListingStatusRequest
import vn.baynuistay.core.network.ListingsResponse
import vn.baynuistay.core.network.PartnerDto
import vn.baynuistay.core.network.PartnerRegisterRequest
import vn.baynuistay.core.network.StatusRequest
import vn.baynuistay.core.network.TripStageRequest
import vn.baynuistay.core.network.TripStageResponse

data class PartnerSession(val partner: PartnerDto, val online: Boolean)

@Singleton
class PartnerRepository @Inject constructor(
    private val api: BayNuiApi,
    private val tokenStore: TokenStore,
) {
    suspend fun register(request: PartnerRegisterRequest): Pair<PartnerDto, String> {
        val res = api.registerPartner(request)
        tokenStore.saveSession(res.token, request.name, request.email)
        return res.partner to res.message
    }

    suspend fun me(): PartnerSession {
        val res = api.partnerMe()
        return PartnerSession(res.partner, res.online == true)
    }

    suspend fun bookings(): List<PartnerBookingDto> = api.partnerBookings().data

    suspend fun setBookingStatus(id: String, status: String) =
        api.setBookingStatus(id, StatusRequest(status))

    // ── Dịch vụ đối tác tự đăng ──
    suspend fun listings(): ListingsResponse = api.listings()

    suspend fun createListing(request: ListingRequest): ListingSaveResponse = api.createListing(request)

    suspend fun updateListing(id: String, request: ListingRequest): ListingSaveResponse =
        api.updateListing(id, request)

    /** Bật / tạm ẩn một tin đã được duyệt. */
    suspend fun setListingStatus(id: String, status: String): ListingSaveResponse =
        api.setListingStatus(id, ListingStatusRequest(status))

    suspend fun deleteListing(id: String) = api.deleteListing(id)

    // ── Tài xế ──
    /** Danh sách khu vực + bán kính nổ đơn do server quy định. */
    suspend fun serviceAreas(): ServiceAreasResponse = api.serviceAreas()

    /** Bật nhận đơn: truyền area (khu vực đã chọn) HOẶC toạ độ GPS. */
    suspend fun goOnline(area: String?, lat: Double?, lng: Double?): DriverStateResponse =
        api.driverOnline(DriverLocationRequest(lat = lat, lng = lng, area = area))

    suspend fun goOffline(): Boolean = api.driverOffline().online

    suspend fun heartbeat(lat: Double?, lng: Double?): Boolean =
        api.driverHeartbeat(DriverLocationRequest(lat = lat, lng = lng)).online

    suspend fun offers(): DriverOffersResponse = api.driverOffers()

    suspend fun accept(offerId: String): AcceptedRideDto = api.acceptOffer(offerId).data

    /** Chuyến đang chạy dở, dùng khi app mở lại giữa chuyến. */
    suspend fun activeTrip(): ActiveTripDto = api.activeTrip()

    /** Gửi vị trí xe trong lúc chạy để khách theo dõi trên bản đồ. */
    suspend fun sendTripLocation(bookingId: String, lat: Double, lng: Double) =
        api.sendTripLocation(bookingId, DriverLocationRequest(lat = lat, lng = lng))

    /** "onboard" khi đã đón khách, "done" khi đã trả khách. */
    suspend fun setTripStage(bookingId: String, stage: String): TripStageResponse =
        api.setTripStage(bookingId, TripStageRequest(stage))
    suspend fun decline(offerId: String) = api.declineOffer(offerId)

    // ── Lịch khởi hành của đơn vị tour ──
    suspend fun departures() = api.partnerDepartures()

    suspend fun openDeparture(tourSlug: String, date: String, minGuests: Int) =
        api.partnerOpenDeparture(OpenDepartureRequest(tourSlug, date, minGuests))

    suspend fun setDeparture(id: String, status: String) =
        api.partnerSetDeparture(id, DepartureStatusRequest(status))

    /** Dòng tiền của RIÊNG đối tác đang đăng nhập; máy chủ lấy id từ phiên. */
    suspend fun cashflow(month: String = "") = api.partnerCashflow(month)

    /** Tải một ảnh lên; trả về đường dẫn máy chủ để gắn vào tin đăng. */
    suspend fun uploadImage(body: okhttp3.RequestBody) = api.uploadImage(body)
}
