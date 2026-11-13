package vn.baynuistay.feature.commerce

import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.graphics.asAndroidBitmap
import java.io.File
import androidx.lifecycle.SavedStateHandle
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Rule
import org.junit.Test
import org.junit.Assert.*
import java.lang.reflect.Proxy
import kotlinx.coroutines.flow.flowOf
import vn.baynuistay.core.local.*
import vn.baynuistay.core.network.*
import vn.baynuistay.core.ui.theme.BayNuiTheme
import vn.baynuistay.feature.booking.data.BookingRepository

class CatalogScreenTest {
    @get:Rule val rule = createComposeRule()
    @Test fun nativeFoodCheckoutUsesFoodEndpointAndShowsReceipt() {
        val calls = mutableListOf<BookingRequest>()
        val item = SpecialtyDto("fixture-food", "Mật ong kiểm thử", 120000, unit = "hũ", stock = 2,
            stockTracked = true, area = "An Giang", shipping = "Cơ sở báo cước", keeping = "Nơi khô ráo")
        val api = Proxy.newProxyInstance(BayNuiApi::class.java.classLoader, arrayOf(BayNuiApi::class.java)) { _, method, args ->
            when (method.name) {
                "specialties" -> SpecialtiesResponse(listOf(item))
                "customerProfile" -> CustomerProfileResponse()
                "createBooking" -> {
                    val request = args!![0] as BookingRequest
                    calls.add(request)
                    BookingResponse(BookingDataDto("fixture-order", "TESTCODE", "food", "pending", 240000, "Mật ong kiểm thử · 2 hũ"), "Đã nhận đơn kiểm thử")
                }
                else -> error("Unexpected API call: ${method.name}")
            }
        } as BayNuiApi
        val dao = object : OrderDao {
            override fun observeAll() = flowOf(emptyList<OrderEntity>())
            override suspend fun upsert(item: OrderEntity) {}
            override suspend fun clear() {}
        }
        val tokens = TokenStore(InstrumentationRegistry.getInstrumentation().targetContext)
        lateinit var vm: CatalogViewModel
        rule.runOnUiThread { vm = CatalogViewModel(api, BookingRepository(api, dao, tokens), tokens, SavedStateHandle(mapOf("kind" to "food"))) }
        rule.setContent { BayNuiTheme { CatalogScreen({}, {}, vm) } }
        rule.waitUntil(10000) { !vm.state.value.loading }
        rule.onRoot().captureToImage().asAndroidBitmap().let { bitmap ->
            File(InstrumentationRegistry.getInstrumentation().targetContext.getExternalFilesDir(null), "catalog-food-test.png").outputStream().use {
                bitmap.compress(android.graphics.Bitmap.CompressFormat.PNG, 100, it)
            }
        }
        rule.onNodeWithText("Mật ong kiểm thử").performScrollTo().performClick()
        rule.onNodeWithText("Đặt dịch vụ này").performScrollTo().performClick()
        rule.runOnUiThread { vm.name(""); vm.phone(""); vm.address("") }
        rule.onNodeWithText("Xác nhận đặt").performScrollTo().performClick()
        rule.waitUntil { vm.state.value.formError != null }
        assertEquals(0, calls.size)
        rule.runOnUiThread { vm.name("Khách thử"); vm.phone("0000000000"); vm.address("Địa chỉ giả lập kiểm thử"); vm.quantity(2) }
        rule.onNodeWithText("Xác nhận đặt").performScrollTo().performClick()
        rule.waitUntil(10000) { vm.state.value.receipt != null || vm.state.value.formError != null }
        assertNull("Checkout error: ${vm.state.value.formError}; calls=${calls.size}", vm.state.value.formError)
        assertNotNull(vm.state.value.receipt)
        rule.onNodeWithText("Mã đơn: TESTCODE").assertIsDisplayed()
        assertEquals(1, calls.size)
        assertEquals("food", calls.single().kind)
        assertEquals("fixture-food", calls.single().listingId)
        assertEquals(2, calls.single().quantity)
        assertEquals("Địa chỉ giả lập kiểm thử", calls.single().address)
    }
}
