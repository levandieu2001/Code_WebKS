@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)

package vn.baynuistay.core.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.ArrowForward
import androidx.compose.material.icons.rounded.LocationOn
import androidx.compose.material.icons.rounded.Star
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import vn.baynuistay.core.ui.theme.LmNavy
import vn.baynuistay.core.ui.theme.LmAmber
import vn.baynuistay.core.ui.theme.LmBlue
import vn.baynuistay.feature.home.domain.Destination
import vn.baynuistay.feature.home.domain.Experience
import vn.baynuistay.core.ui.lang.trData
import androidx.compose.foundation.clickable

@Composable
fun BrandMark(modifier: Modifier = Modifier) {
    Row(modifier = modifier, verticalAlignment = Alignment.CenterVertically) {
        // Logo thật thay cho hình tam giác chữ "△" tạm dùng trước đây.
        androidx.compose.foundation.Image(
            painter = androidx.compose.ui.res.painterResource(vn.baynuistay.R.drawable.logo_baynui),
            contentDescription = "LOCALMATE",
            modifier = Modifier.size(38.dp).clip(CircleShape),
        )
        Spacer(Modifier.width(10.dp))
        Column {
            Text("LOCALMATE", style = MaterialTheme.typography.titleLarge, color = LmNavy)
            Text(
                "SEVEN MOUNTAINS · AN GIANG",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
fun SectionHeader(
    eyebrow: String,
    title: String,
    modifier: Modifier = Modifier,
    action: String? = null,
    /**
     * Việc cần làm khi bấm vào chữ hành động bên phải.
     *
     * Bỏ trống thì KHÔNG vẽ chữ đó ra nữa. Trước đây nó luôn hiện — nhìn y hệt
     * một cái nút, có cả mũi tên — nhưng bấm chẳng ra gì vì chưa từng được nối
     * vào đâu. Thà không có còn hơn có mà bấm không được.
     */
    onAction: (() -> Unit)? = null,
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.Bottom,
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                eyebrow.uppercase(),
                style = MaterialTheme.typography.labelMedium,
                color = LmBlue,
                fontWeight = FontWeight.Bold,
            )
            Spacer(Modifier.height(5.dp))
            Text(title, style = MaterialTheme.typography.headlineMedium)
        }
        if (action != null && onAction != null) {
            Row(
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .clickable(onClick = onAction)
                    .padding(horizontal = 6.dp, vertical = 4.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(action, style = MaterialTheme.typography.labelLarge, color = LmBlue)
                Icon(Icons.Rounded.ArrowForward, null, Modifier.size(17.dp), tint = LmBlue)
            }
        }
    }
}

@Composable
fun ExperienceCard(item: Experience, modifier: Modifier = Modifier, onClick: (() -> Unit)? = null) {
    Card(
        onClick = { onClick?.invoke() },
        enabled = onClick != null,
        modifier = modifier,
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Column(Modifier.padding(17.dp)) {
            Surface(shape = CircleShape, color = LmBlue.copy(alpha = .12f)) {
                Text(
                    item.symbol,
                    modifier = Modifier.padding(horizontal = 11.dp, vertical = 7.dp),
                    color = LmBlue,
                    style = MaterialTheme.typography.titleMedium,
                )
            }
            Spacer(Modifier.height(18.dp))
            Text(trData(item.title, item.titleEn), style = MaterialTheme.typography.titleLarge, maxLines = 1)
            Spacer(Modifier.height(5.dp))
            Text(
                trData(item.subtitle, item.subtitleEn),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}

@Composable
fun DestinationCard(item: Destination, modifier: Modifier = Modifier, onClick: (() -> Unit)? = null) {
    Card(
        onClick = { onClick?.invoke() },
        enabled = onClick != null,
        modifier = modifier,
        shape = RoundedCornerShape(24.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
    ) {
        Box {
            AsyncImage(
                model = item.imageUrl,
                contentDescription = item.name,
                modifier = Modifier.fillMaxWidth().height(190.dp),
                contentScale = ContentScale.Crop,
            )
            Box(
                Modifier
                    .fillMaxWidth()
                    .height(190.dp)
                    .background(Brush.verticalGradient(listOf(Color.Transparent, Color.Black.copy(alpha = .68f))))
            )
            Surface(
                modifier = Modifier.align(Alignment.TopEnd).padding(12.dp),
                shape = RoundedCornerShape(12.dp),
                color = Color.White.copy(alpha = .92f),
            ) {
                Row(Modifier.padding(horizontal = 10.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Rounded.Star, null, Modifier.size(15.dp), tint = LmAmber)
                    Spacer(Modifier.width(4.dp))
                    Text(item.rating.toString(), style = MaterialTheme.typography.labelMedium, color = LmNavy)
                }
            }
            Column(Modifier.align(Alignment.BottomStart).padding(16.dp)) {
                Text(trData(item.category, item.categoryEn), style = MaterialTheme.typography.labelMedium, color = LmAmber)
                Text(trData(item.name, item.nameEn), style = MaterialTheme.typography.titleLarge, color = Color.White, maxLines = 1)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Rounded.LocationOn, null, Modifier.size(15.dp), tint = Color.White.copy(alpha = .82f))
                    Text(item.distance, style = MaterialTheme.typography.bodyMedium, color = Color.White.copy(alpha = .85f))
                }
            }
        }
    }
}
