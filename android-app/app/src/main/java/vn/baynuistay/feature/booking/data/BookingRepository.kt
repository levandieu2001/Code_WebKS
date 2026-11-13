package vn.baynuistay.feature.booking.data

import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.Flow
import vn.baynuistay.core.local.OrderDao
import vn.baynuistay.core.local.OrderEntity
import vn.baynuistay.core.network.BayNuiApi
import vn.baynuistay.core.network.BookingDataDto
import vn.baynuistay.core.network.BookingRequest
import vn.baynuistay.core.network.DispatchStatusDto
import vn.baynuistay.core.network.PoolCheckRequest
import vn.baynuistay.core.network.PoolCheckResponse
import vn.baynuistay.core.network.RoomDto
import vn.baynuistay.core.network.TourDto
import vn.baynuistay.core.network.TransportQuoteDto
import vn.baynuistay.core.network.TransportQuotesResponse

data class BookingResult(val data: BookingDataDto, val message: String)

@Singleton
class BookingRepository @Inject constructor(
    private val api: BayNuiApi,
    private val orderDao: OrderDao,
    private val tokenStore: vn.baynuistay.core.local.TokenStore,
) {
    val orders: Flow<List<OrderEntity>> = orderDao.observeAll()

    suspend fun rooms(): List<RoomDto> = api.rooms().data
    suspend fun allStays(): List<RoomDto> = api.searchStays().data.map { it.toRoom() }

    suspend fun transportQuotes(
        from: String,
        seats: Int,
        lat: Double? = null,
        lng: Double? = null,
        to: String = "LOCALMATE, Núi Cấm",
    ): TransportQuotesResponse =
        api.transportQuotes(from = from, to = to, seats = seats, latitude = lat, longitude = lng)

    suspend fun reverseGeocode(lat: Double, lng: Double) = api.reverseGeocode(lat, lng)

    suspend fun tours(): List<TourDto> = api.tours().data

    suspend fun bookFood(id: String, quantity: Int, address: String, guestName: String, phone: String, note: String): BookingResult = submit(
        BookingRequest(kind = "food", listingId = id, quantity = quantity, address = address,
            guestName = guestName, phone = phone, note = note), guestName, phone,
    )

    suspend fun bookTour(
        tourSlug: String,
        date: String,
        guests: Int,
        guestName: String,
        phone: String,
        note: String,
    ): BookingResult = submit(
        BookingRequest(
            kind = "tour",
            guestName = guestName,
            phone = phone,
            note = note,
            tourSlug = tourSlug,
            date = date,
            guests = guests,
        ),
        guestName,
        phone,
    )

    suspend fun bookRoom(
        roomId: String,
        checkIn: String,
        checkOut: String,
        guestName: String,
        phone: String,
        email: String,
        note: String,
    ): BookingResult = submit(
        BookingRequest(
            kind = "hotel",
            guestName = guestName,
            phone = phone,
            email = email,
            note = note,
            roomId = roomId,
            checkIn = checkIn,
            checkOut = checkOut,
        ),
        guestName,
        phone,
    )

    suspend fun bookTransport(
        quote: TransportQuoteDto,
        pickup: String,
        dropoff: String,
        date: String,
        time: String,
        seats: Int,
        pickupLat: Double?,
        pickupLng: Double?,
        roundTrip: Boolean,
        returnDate: String?,
        returnTime: String?,
        guestName: String,
        phone: String,
        note: String,
        pool: Boolean = false,
    ): BookingResult = submit(
        BookingRequest(
            kind = "transport",
            pool = pool,
            guestName = guestName,
            phone = phone,
            note = note,
            pickup = pickup,
            dropoff = dropoff,
            date = date,
            time = time,
            seats = seats,
            pickupLat = pickupLat,
            pickupLng = pickupLng,
            vehicleType = quote.vehicleType,
            partnerId = quote.partnerId,
            roundTrip = roundTrip,
            returnDate = returnDate,
            returnTime = returnTime,
        ),
        guestName,
        phone,
    )

    // ── Khách theo dõi "đang tìm tài xế" ──
    suspend fun dispatchStatus(bookingId: String): DispatchStatusDto = api.dispatchStatus(bookingId)

    /** Có khách nào đi cùng tuyến, cùng khung giờ để ghép chuyến không. */
    suspend fun poolCheck(request: PoolCheckRequest): PoolCheckResponse = api.poolCheck(request)

    /** Tìm 10 phút không ai nhận → khách bấm "Tìm lại tài xế". */
    suspend fun retryDriver(bookingId: String): DispatchStatusDto = api.redispatch(bookingId)

    private suspend fun submit(
        request: BookingRequest,
        guestName: String,
        phone: String,
    ): BookingResult {
        val response = api.createBooking(request)
        // Lưu bản sao cục bộ để "Đơn của tôi" xem được cả khi offline
        // The server already committed the order. A local-cache failure must not
        // turn success into an error that encourages a duplicate order.
        runCatching { tokenStore.saveBookingPhone(phone.replace(Regex("[\\s.-]"), "").replace(Regex("^\\+84"), "0")) }
        runCatching { orderDao.upsert(
            OrderEntity(
                id = response.data.id,
                kind = response.data.kind,
                summary = response.data.summary,
                totalPrice = response.data.totalPrice,
                status = response.data.status,
                checkIn = response.data.checkIn,
                checkOut = response.data.checkOut,
                guestName = guestName,
                phone = phone,
                createdAt = System.currentTimeMillis(),
            ),
        ) }
        return BookingResult(response.data, response.message)
    }
}
