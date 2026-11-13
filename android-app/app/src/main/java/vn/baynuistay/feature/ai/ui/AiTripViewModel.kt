package vn.baynuistay.feature.ai.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import vn.baynuistay.core.location.LocationProvider
import vn.baynuistay.core.network.ApiError
import vn.baynuistay.core.network.BudgetOptionDto
import vn.baynuistay.core.network.DayWeatherDto
import vn.baynuistay.core.network.ItineraryOptionDto
import vn.baynuistay.core.ui.components.tomorrow
import vn.baynuistay.feature.ai.data.ItineraryRepository
import vn.baynuistay.core.ui.lang.AppLangHolder.pick

/**
 * Ba bước, mỗi bước một câu hỏi: sở thích → ngày/người → ngân sách.
 * Bấm tạo là gọi thẳng POST /v1/ai/itinerary, không còn màn giả lập.
 */
data class AiTripUiState(
    val step: Int = 1,
    val preferences: List<String> = emptyList(),
    val days: Int = 2,
    val people: Int = 2,
    val budget: Int = 1_000_000,
    val startPoint: String = "Châu Đốc",
    val startDate: String = tomorrow(),
    val locating: Boolean = false,
    val prefOptions: List<ItineraryOptionDto> = emptyList(),
    val budgetOptions: List<BudgetOptionDto> = emptyList(),
    // Dự báo cho đúng mấy ngày khách chọn, xem trước khi dựng lịch trình
    val outlook: List<DayWeatherDto> = emptyList(),
    val outlookSummary: String = "",
    val loadingOutlook: Boolean = false,
    val generating: Boolean = false,
    val error: String? = null,
    // Có trip_id nghĩa là lịch trình đã dựng xong, mở màn Chuyến đi được rồi
    val tripId: String? = null,
    val tripTitle: String = "",
    val tripSummary: String = "",
    val estimatedTotal: Int = 0,
)

private val FALLBACK_PREFS = listOf(
    ItineraryOptionDto("van-hoa", "Văn hoá", "Culture"),
    ItineraryOptionDto("thien-nhien", "Thiên nhiên", "Nature"),
    ItineraryOptionDto("am-thuc", "Ẩm thực", "Food"),
    ItineraryOptionDto("nghi-duong", "Nghỉ dưỡng", "Relaxing"),
)

private val FALLBACK_BUDGETS = listOf(
    BudgetOptionDto(500_000, "Dưới 500k", "Under 500k"),
    BudgetOptionDto(1_000_000, "500k – 1 triệu", "500k – 1 million"),
    BudgetOptionDto(2_000_000, "1 – 2 triệu", "1 – 2 million"),
    BudgetOptionDto(5_000_000, "Thoải mái", "No limit"),
)

@HiltViewModel
class AiTripViewModel @Inject constructor(
    private val repository: ItineraryRepository,
    private val locationProvider: LocationProvider,
) : ViewModel() {
    private val _state = MutableStateFlow(AiTripUiState())
    val state: StateFlow<AiTripUiState> = _state.asStateFlow()

    init { loadOptions() }

    private fun loadOptions() {
        viewModelScope.launch {
            val result = runCatching { repository.options() }.getOrNull()
            _state.update {
                it.copy(
                    prefOptions = result?.preferences?.takeIf { list -> list.isNotEmpty() } ?: FALLBACK_PREFS,
                    budgetOptions = result?.budgets?.takeIf { list -> list.isNotEmpty() } ?: FALLBACK_BUDGETS,
                )
            }
        }
    }

    // ── Điều khiển từng bước ──
    fun next() {
        _state.update { it.copy(step = minOf(it.step + 1, 3)) }
        // Sang bước cuối là đã chốt ngày → xem trước thời tiết mấy hôm đó
        if (_state.value.step == 3) loadOutlook()
    }

    /** Dự báo cho khoảng ngày khách chọn. Lỗi thì im lặng, không chặn luồng tạo lịch trình. */
    fun loadOutlook() {
        val s = _state.value
        viewModelScope.launch {
            _state.update { it.copy(loadingOutlook = true) }
            val res = runCatching { repository.outlook(s.startDate, s.days) }.getOrNull()
            _state.update {
                it.copy(
                    loadingOutlook = false,
                    outlook = res?.days ?: emptyList(),
                    outlookSummary = res?.summary ?: "",
                )
            }
        }
    }
    fun back() = _state.update { it.copy(step = maxOf(it.step - 1, 1)) }

    fun togglePreference(value: String) = _state.update {
        it.copy(
            preferences = if (value in it.preferences) it.preferences - value else it.preferences + value,
            error = null,
        )
    }

    fun setDays(value: Int) = _state.update { it.copy(days = value, outlook = emptyList()) }
    fun addPeople(delta: Int) = _state.update { it.copy(people = (it.people + delta).coerceIn(1, 20)) }
    fun setBudget(value: Int) = _state.update { it.copy(budget = value) }
    fun setStartPoint(value: String) = _state.update { it.copy(startPoint = value) }
    fun setStartDate(value: String) {
        _state.update { it.copy(startDate = value, outlook = emptyList(), outlookSummary = "") }
        if (_state.value.step == 3) loadOutlook()
    }
    fun dismissError() = _state.update { it.copy(error = null) }

    /** Điền nơi xuất phát bằng vị trí hiện tại của khách. */
    fun useMyLocation() {
        if (_state.value.locating) return
        if (!locationProvider.hasPermission()) {
            _state.update { it.copy(error = pick(
                "Cần quyền vị trí, hoặc bạn nhập nơi xuất phát bằng tay.",
                "Location permission is needed, or type your starting point.",
            )) }
            return
        }
        viewModelScope.launch {
            _state.update { it.copy(locating = true) }
            val location = locationProvider.current()
            if (location == null) {
                _state.update { it.copy(locating = false, error = pick(
                    "Không lấy được vị trí. Bạn nhập giúp mình nhé.",
                    "Could not get your location. Please type it in.",
                )) }
                return@launch
            }
            // Đổi toạ độ thành địa chỉ để lịch trình ghi đúng tên nơi xuất phát
            val geo = runCatching {
                repository.reverseGeocode(location.latitude, location.longitude)
            }.getOrNull()
            val name = geo?.shortName?.takeIf { it.isNotBlank() }
                ?: geo?.address?.takeIf { it.isNotBlank() }
            _state.update {
                it.copy(
                    locating = false,
                    startPoint = name ?: it.startPoint,
                    error = if (name == null) pick(
                        "Chưa đọc được địa chỉ. Bạn nhập giúp mình nhé.",
                        "Could not read that address. Please type it in.",
                    ) else null,
                )
            }
        }
    }

    // ── Dựng lịch trình ──
    fun generate() {
        if (_state.value.generating) return
        val s = _state.value
        viewModelScope.launch {
            _state.update { it.copy(generating = true, error = null, tripId = null) }
            runCatching {
                repository.create(
                    days = s.days,
                    people = s.people,
                    budget = s.budget,
                    startPoint = s.startPoint.trim().ifBlank { "Châu Đốc" },
                    startDate = s.startDate,
                    preferences = s.preferences,
                )
            }.onSuccess { trip ->
                _state.update {
                    it.copy(
                        generating = false,
                        tripId = trip.tripId,
                        tripTitle = trip.title,
                        tripSummary = trip.summary,
                        estimatedTotal = trip.estimatedTotal,
                    )
                }
            }.onFailure { error ->
                _state.update { it.copy(generating = false, error = ApiError.message(error)) }
            }
        }
    }

    fun reset() = _state.update {
        it.copy(step = 1, tripId = null, tripTitle = "", tripSummary = "", estimatedTotal = 0)
    }
}
