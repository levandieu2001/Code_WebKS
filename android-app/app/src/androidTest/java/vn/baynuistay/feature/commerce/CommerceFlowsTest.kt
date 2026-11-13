package vn.baynuistay.feature.commerce

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.lifecycle.SavedStateHandle
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Rule
import org.junit.Test
import org.junit.Assert.*
import java.lang.reflect.Proxy
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.runBlocking
import vn.baynuistay.core.local.*
import vn.baynuistay.core.network.*
import vn.baynuistay.core.ui.theme.BayNuiTheme
import vn.baynuistay.feature.booking.data.BookingRepository

class CommerceFlowsTest {
    @get:Rule val rule = createComposeRule()
    private fun api(handler: (String, Array<out Any>?) -> Any): BayNuiApi = Proxy.newProxyInstance(
        BayNuiApi::class.java.classLoader, arrayOf(BayNuiApi::class.java),
    ) { _, method, args -> handler(method.name, args) } as BayNuiApi
    private val tokens get() = TokenStore(InstrumentationRegistry.getInstrumentation().targetContext)
    private val dao = object : OrderDao {
        override fun observeAll() = flowOf(emptyList<OrderEntity>())
        override suspend fun upsert(item: OrderEntity) { throw IllegalStateException("Fixture cache is full") }
        override suspend fun clear() {}
    }
    @Test fun tourRetriesNetworkErrorAndDoesNotFailWhenCacheFails() {
        val requests = mutableListOf<BookingRequest>(); var fail = true
        val tour = TourDto("fixture-tour", "Tour kiểm thử", price = 300000, days = 2, duration = "2 ngày 1 đêm", schedule = listOf(TourStopDto("08:00", "Điểm A")))
        val api = api { method, args -> when (method) {
            "tours" -> ToursResponse(listOf(tour))
            "customerProfile" -> CustomerProfileResponse()
            "createBooking" -> {
                if (fail) throw IllegalStateException("Lỗi mạng giả lập")
                requests.add(args!![0] as BookingRequest)
                BookingResponse(BookingDataDto("fixture-tour-order", "TOURCODE", "tour", "pending", 600000, "Tour kiểm thử"))
            }
            else -> error(method)
        } }
        lateinit var vm: CatalogViewModel
        rule.runOnUiThread { vm = CatalogViewModel(api, BookingRepository(api, dao, tokens), tokens, SavedStateHandle(mapOf("kind" to "tour", "item" to tour.slug))) }
        rule.setContent { BayNuiTheme { CatalogScreen({}, {}, vm) } }
        rule.waitUntil(10000) { vm.state.value.tour != null }
        rule.onNodeWithText("Đặt dịch vụ này").performScrollTo().performClick()
        rule.runOnUiThread { vm.name("Khách thử"); vm.phone("0000000000"); vm.quantity(2); vm.date("2099-01-10") }
        rule.onNodeWithText("Xác nhận đặt").performScrollTo().performClick()
        rule.waitUntil(10000) { vm.state.value.formError != null }
        assertEquals("Khách thử", vm.state.value.name); assertEquals(0, requests.size)
        fail = false
        rule.onNodeWithText("Xác nhận đặt").performScrollTo().performClick()
        rule.waitUntil(10000) { vm.state.value.receipt != null }
        rule.onNodeWithText("Mã đơn: TOURCODE").assertIsDisplayed()
        assertEquals(1, requests.size); assertEquals("tour", requests.single().kind)
        assertEquals("fixture-tour", requests.single().tourSlug); assertEquals(2, requests.single().guests)
    }

    @Test fun accountShowsLabelsSavesAndConfirmsDeletion() {
        runBlocking { tokens.saveSession("fixture-token", "Khách thử", "test@example.invalid") }
        var profile = CustomerProfileDto("Khách thử", "0000000000", listOf(DeliveryAddressDto("fixture-address", "Nhà bố mẹ", "Khách thử", "0000000000", "Địa chỉ thử nghiệm", true)))
        val api = api { method, args -> when (method) {
            "customerProfile" -> CustomerProfileResponse(profile)
            "saveDeliveryAddress" -> { profile = profile.copy(addresses = listOf(args!![0] as DeliveryAddressDto)); CustomerProfileResponse(profile) }
            "deleteDeliveryAddress" -> { profile = profile.copy(addresses = emptyList()); CustomerProfileResponse(profile) }
            else -> error(method)
        } }
        lateinit var vm: AccountViewModel
        rule.runOnUiThread { vm = AccountViewModel(api, tokens) }
        rule.setContent { BayNuiTheme { AccountDetailsScreen({}, vm) } }
        rule.waitUntil(10000) { !vm.state.value.loading }
        rule.onNodeWithText("Nhà bố mẹ").performScrollTo().assertIsDisplayed()
        rule.onNodeWithText("Sửa").performScrollTo().performClick()
        rule.onNodeWithText("Tên gợi nhớ").performTextReplacement("Cơ quan")
        rule.onNodeWithText("Lưu", useUnmergedTree = true).performClick()
        rule.waitUntil(10000) { vm.state.value.editing == null }
        rule.onNodeWithText("Cơ quan").performScrollTo().assertIsDisplayed()
        rule.onNodeWithText("Xóa", useUnmergedTree = true).performScrollTo().performClick()
        rule.onNodeWithText("Xóa địa chỉ này?").assertIsDisplayed()
        rule.onNodeWithText("Giữ lại").performClick()
        assertEquals(1, profile.addresses.size)
        rule.runOnUiThread { vm.remove(profile.addresses.single()) }
        rule.waitUntil(10000) { vm.state.value.profile.addresses.isEmpty() }
        runBlocking { tokens.clear() }
    }
}
