package vn.baynuistay.feature.auth.ui

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import kotlinx.coroutines.delay
import vn.baynuistay.core.ui.components.BrandMark

@Composable
fun SplashScreen(onFinished: () -> Unit) {
    LaunchedEffect(Unit) { delay(650); onFinished() }
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { BrandMark() }
}
