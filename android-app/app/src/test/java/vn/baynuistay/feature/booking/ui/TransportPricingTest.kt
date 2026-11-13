package vn.baynuistay.feature.booking.ui

import org.junit.Assert.assertEquals
import org.junit.Test

class TransportPricingTest {
    @Test fun oneWayKeepsFare() { assertEquals(350000, transportEstimate(350000, false, false)) }
    @Test fun returnTripIncludesBothLegsAndDiscount() { assertEquals(665000, transportEstimate(350000, true, false)) }
    @Test fun poolingRoundsToThousand() { assertEquals(228000, transportEstimate(350000, false, true)) }
    @Test fun returnPoolingUsesReturnFare() { assertEquals(432000, transportEstimate(350000, true, true)) }
    @Test(expected = IllegalArgumentException::class) fun negativeFareRejected() { transportEstimate(-1, false, false) }
}
