package vn.baynuistay.feature.booking.ui

/** Display estimate; the server checks pooling eligibility and calculates the final fare. */
internal fun transportEstimate(oneWay: Int, roundTrip: Boolean, pooled: Boolean): Int {
    require(oneWay >= 0) { "Fare cannot be negative" }
    val base = if (roundTrip) Math.round(oneWay * 1.9 / 5000).toInt() * 5000 else oneWay
    return if (pooled) Math.round(base * 0.65 / 1000).toInt() * 1000 else base
}
