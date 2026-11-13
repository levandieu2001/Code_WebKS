package vn.baynuistay.core.network

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class SpecialtyDto(
    val id: String,
    val name: String,
    val price: Long = 0,
    val unit: String = "",
    val area: String = "",
    val shop: String = "",
    val image: String = "",
    val description: String = "",
    val shipping: String = "",
    val keeping: String = "",
    val stock: Int = 0,
    val stockTracked: Boolean = false,
    val soldOut: Boolean = false,
    val oldPrice: Long = 0,
    val discount: Int = 0,
)
@Serializable data class SpecialtiesResponse(val data: List<SpecialtyDto> = emptyList())
@Serializable data class DeliveryAddressDto(
    val id: String = "", val label: String = "", val receiver: String = "", val phone: String = "",
    val address: String = "", @SerialName("is_default") val isDefault: Boolean = false,
)
@Serializable data class CustomerProfileDto(
    @SerialName("full_name") val fullName: String = "", val phone: String = "",
    val addresses: List<DeliveryAddressDto> = emptyList(),
)
@Serializable data class CustomerProfileResponse(val data: CustomerProfileDto = CustomerProfileDto())
@Serializable data class CustomerProfileRequest(@SerialName("full_name") val fullName: String, val phone: String)

@Serializable data class StaySearchDto(
    val id: String, val name: String, val area: String = "", val description: String = "",
    val price: Int = 0, val capacity: Int = 2, val amenities: List<String> = emptyList(), val image: String = "",
    @SerialName("sold_out") val soldOut: Boolean = false,
) {
    fun toRoom() = RoomDto(id, name, listOf(area, description).filter { it.isNotBlank() }.joinToString(" · "),
        amenities, price, capacity, if (soldOut) "booked" else "available", image)
}
@Serializable data class StaySearchResponse(val data: List<StaySearchDto> = emptyList())
