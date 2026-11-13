package vn.baynuistay.feature.commerce

import java.text.Normalizer
import java.util.Locale
import vn.baynuistay.core.network.SpecialtyDto

internal fun plain(value: String): String = Normalizer.normalize(value, Normalizer.Form.NFD)
    .replace(Regex("\\p{M}+"), "").replace('đ', 'd').replace('Đ', 'D').lowercase(Locale.ROOT).trim()
internal fun SpecialtyDto.limit(): Int = if (stockTracked || stock > 0) stock.coerceIn(0, 99) else 99
internal fun SpecialtyDto.canOrder(): Boolean = !soldOut && limit() > 0 && price > 0
internal fun filterSpecialties(items: List<SpecialtyDto>, query: String, area: String, available: Boolean, sort: Int): List<SpecialtyDto> {
    val filtered = items.filter { f -> plain(f.name + " " + f.description + " " + f.shop).contains(plain(query)) &&
        plain(f.area).contains(plain(area)) && (!available || f.canOrder()) }
    return when (sort) { 1 -> filtered.sortedBy { it.price }; 2 -> filtered.sortedByDescending { it.price }; else -> filtered }
}
