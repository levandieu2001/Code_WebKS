package vn.baynuistay.feature.home.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import vn.baynuistay.feature.home.data.HomeRepository
import vn.baynuistay.feature.home.domain.HomeData

data class HomeUiState(
    val loading: Boolean = true,
    val data: HomeData? = null,
    val error: String? = null,
)

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val repository: HomeRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(HomeUiState())
    val state: StateFlow<HomeUiState> = _state.asStateFlow()

    init { refresh() }

    fun refresh() {
        viewModelScope.launch {
            _state.update { it.copy(loading = true, error = null) }
            runCatching { repository.loadHome() }
                .onSuccess { data -> _state.value = HomeUiState(loading = false, data = data) }
                .onFailure { error ->
                    _state.value = HomeUiState(loading = false, error = error.message ?: "Không thể tải dữ liệu")
                }
        }
    }
}
