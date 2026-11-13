package vn.baynuistay.core.ui.components

import java.text.NumberFormat
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.Locale

private val vnLocale = Locale.Builder().setLanguage("vi").setRegion("VN").build()
private val currency = NumberFormat.getNumberInstance(vnLocale)
private val dayMonth = DateTimeFormatter.ofPattern("dd/MM/yyyy")

/** 1200000 -> "1.200.000đ" */
fun formatPrice(value: Int): String = currency.format(value) + "đ"

/** "2026-09-05" -> "05/09/2026" */
fun formatDate(isoDate: String): String = runCatching {
    LocalDate.parse(isoDate).format(dayMonth)
}.getOrDefault(isoDate)

fun today(): String = LocalDate.now().toString()

fun tomorrow(): String = LocalDate.now().plusDays(1).toString()

fun plusDays(isoDate: String, days: Int): String = runCatching {
    LocalDate.parse(isoDate).plusDays(days.toLong()).toString()
}.getOrDefault(isoDate)

/** Số đêm giữa 2 ngày ISO. Trả 0 nếu ngày không đọc được. */
fun nightsBetween(checkIn: String, checkOut: String): Int = runCatching {
    java.time.temporal.ChronoUnit.DAYS.between(
        LocalDate.parse(checkIn),
        LocalDate.parse(checkOut),
    ).toInt()
}.getOrDefault(0)
