package vn.baynuistay.feature.trip.ui

import androidx.lifecycle.SavedStateHandle
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
import java.time.LocalDate
import vn.baynuistay.core.network.ItineraryResponse
import vn.baynuistay.core.network.ReplanResponse
import vn.baynuistay.feature.ai.data.ItineraryRepository

data class TripUiState(
    val loading: Boolean = true,
    val trip: ItineraryResponse? = null,
    val error: String? = null,
    // Khách tự tick khi đi xong từng điểm — khoá theo "ngày:giờ"
    val done: Set<String> = emptySet(),
    // Đề nghị đổi lịch vì sắp mưa ở điểm ngoài trời tiếp theo
    val replan: ReplanResponse? = null,
    val replanning: Boolean = false,
)

/**
 * Đọc trip_id từ đường dẫn "trip/{id}" rồi tải lịch trình thật.
 * Trước đây màn này hiển thị 6 dòng viết cứng, đi kiểu gì cũng ra như nhau.
 */
@HiltViewModel
class TripViewModel @Inject constructor(
    private val repository: ItineraryRepository,
    savedStateHandle: SavedStateHandle,
) : ViewModel() {
    private val tripId: String = savedStateHandle["id"] ?: ""

    private val _state = MutableStateFlow(TripUiState())
    val state: StateFlow<TripUiState> = _state.asStateFlow()

    init { load() }

    fun load() {
        viewModelScope.launch {
            _state.update { it.copy(loading = true, error = null) }

            // Vào từ thanh tab (trip/demo) thì mở chuyến vừa tạo gần nhất
            val id = if (tripId.isBlank() || tripId == "demo") repository.lastTripId() else tripId
            if (id.isBlank()) {
                _state.update {
                    it.copy(
                        loading = false,
                        error = "Bạn chưa có lịch trình nào. Sang tab Bay Nui để tạo một chuyến nhé.",
                    )
                }
                return@launch
            }

            runCatching { repository.load(id) }
                .onSuccess { trip ->
                    _state.update { it.copy(loading = false, trip = trip) }
                    checkReplan(id)
                }
                .onFailure { e -> _state.update { it.copy(loading = false, error = ApiError.message(e)) } }
        }
    }

    fun toggleDone(key: String) = _state.update {
        it.copy(done = if (key in it.done) it.done - key else it.done + key)
    }

    // ── Né mưa khi khách đang trên đường ──
    /** Chỉ hỏi khi hôm nay nằm trong lịch trình — không thì chẳng có gì để đổi. */
    private fun checkReplan(tripId: String) {
        val today = LocalDate.now().toString()
        if (_state.value.trip?.plan?.none { it.date == today } != false) return
        viewModelScope.launch {
            val res = runCatching { repository.replanCheck(tripId) }.getOrNull() ?: return@launch
            if (res.state == "suggest" || res.state == "warn") {
                _state.update { it.copy(replan = res) }
            }
        }
    }

    /** Khách bấm "Đổi giúp tôi". */
    fun applyReplan() {
        val trip = _state.value.trip ?: return
        if (_state.value.replanning) return
        viewModelScope.launch {
            _state.update { it.copy(replanning = true) }
            runCatching { repository.replanApply(trip.tripId) }
                .onSuccess { res ->
                    _state.update {
                        it.copy(
                            replanning = false,
                            replan = null,
                            trip = it.trip?.copy(plan = res.plan),
                        )
                    }
                }
                .onFailure { e ->
                    _state.update { it.copy(replanning = false, error = ApiError.message(e)) }
                }
        }
    }

    fun dismissReplan() = _state.update { it.copy(replan = null) }
}
