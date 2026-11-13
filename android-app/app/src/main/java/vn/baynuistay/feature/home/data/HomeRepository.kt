package vn.baynuistay.feature.home.data

import javax.inject.Inject
import javax.inject.Singleton
import kotlin.math.roundToInt
import vn.baynuistay.core.network.AssetUrl
import vn.baynuistay.core.network.BayNuiApi
import vn.baynuistay.feature.home.domain.Destination
import vn.baynuistay.feature.home.domain.Experience
import vn.baynuistay.feature.home.domain.HomeData

interface HomeRepository {
    suspend fun loadHome(): HomeData
}

@Singleton
class DefaultHomeRepository @Inject constructor(
    private val api: BayNuiApi,
) : HomeRepository {
    override suspend fun loadHome(): HomeData {
        val weather = runCatching { api.weather() }.getOrNull()
        return HomeData(
            temperature = weather?.current?.temp?.roundToInt() ?: 30,
            // Mất mạng thì không có câu nào từ máy chủ — vẫn phải có cả hai
            // thứ tiếng, không thì khách nước ngoài thấy đúng dòng này tiếng Việt.
            weatherText = weather?.current?.textVi ?: "Có mây nhẹ",
            weatherTextEn = weather?.current?.textEn.orEmpty().ifBlank {
                if (weather == null) "Partly cloudy" else ""
            },
            isLiveWeather = weather != null,
            destinations = DemoContent.destinations,
            experiences = DemoContent.experiences,
        )
    }
}

object DemoContent {
    val destinations = listOf(
        Destination(
            slug = "nui-cam",
            name = "Núi Cấm — Thiên Cấm Sơn",
            nameEn = "Cam Mountain",
            category = "Tâm linh · Thiên nhiên",
            categoryEn = "Spiritual · Nature",
            distance = "3 km",
            rating = 4.9,
            imageUrl = AssetUrl("assets/nui-cam-1.jpg"),
        ),
        Destination(
            slug = "ho-ta-pa",
            name = "Hồ Tà Pạ",
            nameEn = "Tà Pạ Lake",
            category = "Check-in · Tri Tôn",
            categoryEn = "Photo spot · Tri Tôn",
            distance = "8,4 km",
            rating = 4.8,
            imageUrl = AssetUrl("assets/ho-ta-pa.jpg"),
        ),
        Destination(
            slug = "tra-su",
            name = "Rừng tràm Trà Sư",
            nameEn = "Trà Sư Cajuput LmNavy",
            category = "Sinh thái",
            categoryEn = "Eco-tourism",
            distance = "15 km",
            rating = 4.7,
            imageUrl = AssetUrl("assets/tra-su.jpg"),
        ),
    )

    val experiences = listOf(
        Experience("chua-khmer", "Văn hóa Khmer", "Chùa vàng, lễ hội và làng nghề", "✦",
            titleEn = "Khmer culture", subtitleEn = "Golden pagodas, festivals and craft villages"),
        Experience("nui-cam", "Ẩm thực Bảy Núi", "Gà đốt lá chúc, bánh xèo rau rừng", "◉",
            titleEn = "Bảy Núi food", subtitleEn = "Grilled chicken with chúc leaves, wild-herb pancakes"),
        Experience("tra-su", "Thiên nhiên", "Núi, hồ và rừng tràm", "⌁",
            titleEn = "Nature", subtitleEn = "Mountains, lakes and cajuput forest"),
        Experience("camping-nui-cam", "Camping", "Ngắm sao giữa Thất Sơn", "△",
            titleEn = "Camping", subtitleEn = "Stargazing in the Seven Mountains"),
    )
}
