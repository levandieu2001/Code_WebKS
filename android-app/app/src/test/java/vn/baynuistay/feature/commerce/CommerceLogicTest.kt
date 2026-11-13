package vn.baynuistay.feature.commerce

import kotlinx.serialization.json.Json
import org.junit.Assert.*
import org.junit.Test
import vn.baynuistay.core.network.*

class CommerceLogicTest {
    private val honey = SpecialtyDto("honey", "Mật ong Núi Cấm", 120000, area = "An Giang", stock = 2)
    private val cake = SpecialtyDto("cake", "Bánh bò", 30000, area = "An Giang")
    @Test fun unaccentedSearchFindsVietnamese() { assertEquals(listOf(honey), filterSpecialties(listOf(honey, cake), "mat ong", "an giang", false, 0)) }
    @Test fun filterAreaAndClear() { assertTrue(filterSpecialties(listOf(honey), "", "Ca Mau", false, 0).isEmpty()); assertEquals(1, filterSpecialties(listOf(honey), "", "", false, 0).size) }
    @Test fun sortAscending() { assertEquals(listOf(cake, honey), filterSpecialties(listOf(honey, cake), "", "", false, 1)) }
    @Test fun sortDescending() { assertEquals(listOf(honey, cake), filterSpecialties(listOf(cake, honey), "", "", false, 2)) }
    @Test fun stockZeroTrackedIsSoldOut() { assertFalse(honey.copy(stock = 0, stockTracked = true).canOrder()) }
    @Test fun unlimitedStockIsNotSoldOut() { assertTrue(cake.canOrder()); assertEquals(99, cake.limit()) }
    @Test fun respectsSellerSoldOut() { assertFalse(cake.copy(soldOut = true).canOrder()) }
    @Test fun rejectsInvalidPrice() { assertFalse(cake.copy(price = -1).canOrder()); assertFalse(cake.copy(price = 0).canOrder()) }
    @Test fun trackedQuantityBounded() { assertEquals(2, honey.limit()); assertEquals(99, honey.copy(stock = 999).limit()) }
    @Test fun foodApiContract() {
        val response = Json.decodeFromString<SpecialtiesResponse>("""{"data":[{"id":"one","name":"Món","price":320000,"stockTracked":true,"stock":0,"soldOut":true}]}""")
        assertFalse(response.data.single().canOrder())
    }
    @Test fun savedAddressContract() {
        val profile = Json.decodeFromString<CustomerProfileResponse>("""{"data":{"full_name":"Test","addresses":[{"id":"a","label":"Nhà bố mẹ","is_default":true}]}}""")
        assertEquals("Nhà bố mẹ", profile.data.addresses.single().label)
        assertTrue(profile.data.addresses.single().isDefault)
    }
    @Test fun foodBookingContract() {
        val body = Json.encodeToString(BookingRequest.serializer(), BookingRequest(kind = "food", guestName = "Test", phone = "0000000000", listingId = "honey", quantity = 2, address = "Test address"))
        assertTrue(body.contains("\"listing_id\":\"honey\"")); assertTrue(body.contains("\"quantity\":2")); assertTrue(body.contains("\"address\":\"Test address\""))
    }
}
