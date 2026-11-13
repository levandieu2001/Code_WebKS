package vn.baynuistay.feature.home.domain

data class Destination(
    val slug: String,
    val name: String,
    val category: String,
    val distance: String,
    val rating: Double,
    val imageUrl: String,
    /**
     * Bản tiếng Anh do máy chủ gửi kèm. Rỗng nghĩa là chưa dịch, giao diện tự
     * lùi về bản tiếng Việt — thà đọc được tiếng Việt còn hơn thấy ô trống.
     */
    val nameEn: String = "",
    val categoryEn: String = "",
)

data class Experience(
    val slug: String,
    val title: String,
    val subtitle: String,
    val symbol: String,
    val titleEn: String = "",
    val subtitleEn: String = "",
)

data class HomeData(
    val temperature: Int,
    val weatherText: String,
    val weatherTextEn: String = "",
    val isLiveWeather: Boolean,
    val destinations: List<Destination>,
    val experiences: List<Experience>,
)
