package vn.baynuistay.feature.place.ui

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
import vn.baynuistay.core.network.BayNuiApi
import vn.baynuistay.core.network.PlaceDetailResponse

data class PlaceDetailUiState(
    val loading: Boolean = true,
    val data: PlaceDetailResponse? = null,
    val error: String? = null,
)

@HiltViewModel
class PlaceDetailViewModel @Inject constructor(
    private val api: BayNuiApi,
    savedStateHandle: SavedStateHandle,
) : ViewModel() {
    private val slug: String = savedStateHandle["slug"] ?: "nui-cam"

    private val _state = MutableStateFlow(PlaceDetailUiState())
    val state: StateFlow<PlaceDetailUiState> = _state.asStateFlow()

    init { load() }

    fun load() {
        viewModelScope.launch {
            _state.update { it.copy(loading = true, error = null) }
            runCatching { api.place(slug) }
                .onSuccess { data -> _state.value = PlaceDetailUiState(loading = false, data = data) }
                .onFailure { error ->
                    _state.value = PlaceDetailUiState(loading = false, error = ApiError.message(error))
                }
        }
    }
}
