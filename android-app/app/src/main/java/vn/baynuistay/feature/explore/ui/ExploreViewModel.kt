package vn.baynuistay.feature.explore.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import java.text.Normalizer
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import vn.baynuistay.core.network.BayNuiApi
import vn.baynuistay.feature.home.data.DemoContent
import vn.baynuistay.feature.home.domain.Destination

data class ExploreUiState(
    val loading: Boolean = true,
    val all: List<Destination> = emptyList(),
    val query: String = "",
    /**
     * Khoá nhóm đang chọn — LUÔN là chuỗi tiếng Việt, kể cả khi app đang hiển
     * thị tiếng Anh. Nhãn trên nút thì dịch, nhưng khoá phải cố định vì dữ liệu
     * `category` từ máy chủ là tiếng Việt; dịch cả khoá thì bấm "Culture" sẽ
     * không lọc ra gì.
     */
    val category: String = ALL_CATEGORY,
) {
    /** Danh sách sau khi lọc theo ô tìm kiếm và nhóm đang chọn. */
    val visible: List<Destination>
        get() = all
            .filter { category == ALL_CATEGORY || it.category.containsPlain(category) }
            .filter {
                query.isBlank() ||
                    "${it.name} ${it.category} ${it.nameEn} ${it.categoryEn}".containsPlain(query)
            }
}

const val ALL_CATEGORY = "Tất cả"

/** So khớp bỏ dấu: gõ "nui cam" vẫn tìm ra "Núi Cấm". */
private fun String.toPlain(): String =
    Normalizer.normalize(this, Normalizer.Form.NFD)
        .replace(Regex("\\p{Mn}+"), "")
        .replace('đ', 'd')
        .replace('Đ', 'D')
        .lowercase()

private fun String.containsPlain(needle: String): Boolean =
    lowercase().contains(needle.lowercase()) || toPlain().contains(needle.toPlain())

/**
 * Trước đây màn Khám phá chỉ hiện danh sách viết cứng trong DemoContent.
 * Giờ nạp địa điểm thật từ /v1/places, và có ô tìm kiếm để khách gõ nhanh
 * thay vì phải cuộn.
 */
@HiltViewModel
class ExploreViewModel @Inject constructor(
    private val api: BayNuiApi,
) : ViewModel() {
    private val _state = MutableStateFlow(ExploreUiState())
    val state: StateFlow<ExploreUiState> = _state.asStateFlow()

    init { load() }

    fun load() {
        viewModelScope.launch {
            val places = runCatching { api.places().data }.getOrNull()
            val list = places
                ?.map {
                    Destination(
                        slug = it.slug,
                        name = it.name,
                        category = it.category,
                        nameEn = it.nameEn,
                        categoryEn = it.categoryEn,
                        distance = "${it.distanceKm} km",
                        rating = it.rating,
                        imageUrl = it.image,
                    )
                }
                ?.takeIf { it.isNotEmpty() }
            // Mất mạng thì vẫn có danh sách sẵn để xem
                ?: DemoContent.destinations
            _state.update { it.copy(loading = false, all = list) }
        }
    }

    fun setQuery(value: String) = _state.update { it.copy(query = value) }
    fun clearQuery() = _state.update { it.copy(query = "") }
    fun setCategory(value: String) = _state.update { it.copy(category = value) }
}
