package vn.baynuistay.feature.ai.data

import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.first
import vn.baynuistay.core.local.TokenStore
import vn.baynuistay.core.network.BayNuiApi
import vn.baynuistay.core.network.ItineraryOptionsResponse
import vn.baynuistay.core.network.ItineraryRequest
import vn.baynuistay.core.network.ItineraryResponse

/**
 * Lịch trình do backend dựng từ dữ liệu thật (địa điểm, món ăn, khách sạn đối
 * tác, thời tiết) — cùng endpoint mà web đang dùng, nên app và web luôn ra
 * cùng một lịch trình cho cùng một yêu cầu.
 */
@Singleton
class ItineraryRepository @Inject constructor(
    private val api: BayNuiApi,
    private val tokenStore: TokenStore,
) {
    suspend fun options(): ItineraryOptionsResponse = api.itineraryOptions()

    suspend fun create(
        days: Int,
        people: Int,
        budget: Int,
        startPoint: String,
        startDate: String?,
        preferences: List<String>,
    ): ItineraryResponse = api.createItinerary(
        ItineraryRequest(
            days = days,
            people = people,
            budget = budget,
            startPoint = startPoint,
            startDate = startDate,
            preferences = preferences,
        ),
    ).also { tokenStore.saveLastTripId(it.tripId) }

    /** trip_id của chuyến vừa tạo — tab "Chuyến đi" mở thẳng chuyến này. */
    suspend fun lastTripId(): String = tokenStore.lastTripId.first()

    /** Mở lại lịch trình đã lưu bằng trip_id. */
    suspend fun load(tripId: String): ItineraryResponse = api.itinerary(tripId)

    /** Toạ độ → địa chỉ, để điền nơi xuất phát từ vị trí hiện tại. */
    suspend fun reverseGeocode(lat: Double, lng: Double) = api.reverseGeocode(lat, lng)

    /** Dự báo cho đúng mấy ngày khách định đi, xem TRƯỚC khi dựng lịch trình. */
    suspend fun outlook(from: String, days: Int) = api.weatherOutlook(from, days)

    /** Hôm nay có cần đổi lịch vì mưa không. */
    suspend fun replanCheck(tripId: String) = api.replanCheck(tripId)

    /** Khách đồng ý đổi. */
    suspend fun replanApply(tripId: String) = api.replanApply(tripId)
}
