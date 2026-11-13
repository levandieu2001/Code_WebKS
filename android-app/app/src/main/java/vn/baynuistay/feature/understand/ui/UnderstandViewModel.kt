package vn.baynuistay.feature.understand.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import vn.baynuistay.core.network.ApiError
import vn.baynuistay.core.network.BayNuiApi
import vn.baynuistay.core.network.ClusterDto
import vn.baynuistay.core.network.MonthDto
import vn.baynuistay.core.network.PeopleDto
import vn.baynuistay.core.network.SeasonsResponse

enum class UnderstandTab { MUA, DAN_TOC, CUM }

data class UnderstandUiState(
    val tab: UnderstandTab = UnderstandTab.MUA,
    val loading: Boolean = true,
    val error: String? = null,
    val seasons: SeasonsResponse? = null,
    val chonThang: Int = 0,
    val peoples: List<PeopleDto> = emptyList(),
    val clusters: List<ClusterDto> = emptyList(),
) {
    val thangDangXem: MonthDto?
        get() = seasons?.data?.firstOrNull { it.month == chonThang }
}

/**
 * Hiểu về An Giang — bản cho app.
 *
 * Ba tab trả lời ba câu hỏi của khách ngoài tỉnh: đi tháng nào, gặp ai, sắp
 * lịch mấy ngày. Nội dung do máy chủ dựng, app chỉ vẽ — nhờ vậy web và app
 * không bao giờ nói hai điều khác nhau về cùng một mùa.
 *
 * Tải theo tab chứ không tải hết một lượt: khách mở lên hầu như chỉ xem tab
 * đầu, tải cả ba là bắt họ chờ lâu gấp ba vì thứ họ không xem.
 */
@HiltViewModel
class UnderstandViewModel @Inject constructor(
    private val api: BayNuiApi,
) : ViewModel() {

    private val _state = MutableStateFlow(UnderstandUiState())
    val state: StateFlow<UnderstandUiState> = _state.asStateFlow()

    init { moTab(UnderstandTab.MUA) }

    fun moTab(tab: UnderstandTab) {
        _state.update { it.copy(tab = tab, error = null) }

        // Đã tải rồi thì đổi tab là hiện ngay, khỏi gọi lại
        val s = _state.value
        val daCo = when (tab) {
            UnderstandTab.MUA -> s.seasons != null
            UnderstandTab.DAN_TOC -> s.peoples.isNotEmpty()
            UnderstandTab.CUM -> s.clusters.isNotEmpty()
        }
        if (daCo) { _state.update { it.copy(loading = false) }; return }

        _state.update { it.copy(loading = true) }
        viewModelScope.launch {
            try {
                when (tab) {
                    UnderstandTab.MUA -> {
                        val res = api.seasons()
                        _state.update {
                            it.copy(loading = false, seasons = res, chonThang = res.now)
                        }
                    }
                    UnderstandTab.DAN_TOC ->
                        _state.update { it.copy(loading = false, peoples = api.peoples().data) }
                    UnderstandTab.CUM ->
                        _state.update { it.copy(loading = false, clusters = api.clusters().data) }
                }
            } catch (e: Exception) {
                _state.update { it.copy(loading = false, error = ApiError.message(e)) }
            }
        }
    }

    fun chonThang(m: Int) = _state.update { it.copy(chonThang = m) }

    fun taiLai() {
        _state.update { UnderstandUiState(tab = it.tab) }
        moTab(_state.value.tab)
    }
}
