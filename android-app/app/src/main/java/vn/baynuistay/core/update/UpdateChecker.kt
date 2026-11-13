package vn.baynuistay.core.update

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.core.content.FileProvider
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import javax.inject.Inject
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import vn.baynuistay.BuildConfig
import vn.baynuistay.core.local.TokenStore
import vn.baynuistay.core.network.AppVersionResponse
import vn.baynuistay.core.network.BayNuiApi
import vn.baynuistay.core.ui.lang.tr

/**
 * Hỏi máy chủ xem có bản app mới không, rồi tải và mở trình cài đặt.
 *
 * App phát bằng file APK chứ không qua Google Play, nên KHÔNG có ai tự báo cho
 * khách biết có bản mới. Họ cứ dùng bản cũ mãi, và mọi thứ mình sửa chẳng bao
 * giờ tới được máy của họ.
 *
 * Bản trước chỉ mở trình duyệt tới đường tải. Khách phải rời app, chờ tải,
 * kéo thanh thông báo, tìm file trong Tệp đã tải rồi mới bấm cài — bốn bước
 * cho một việc đáng lẽ là một. Nay app tự tải, có thanh chạy ngay trong hộp
 * thoại, xong thì đưa thẳng cho trình cài đặt.
 *
 * Một bước KHÔNG bỏ được: hộp xác nhận của hệ thống. Android chỉ cho phép cài
 * ngầm với app quản lý thiết bị của doanh nghiệp; ứng dụng thường mà tự thay
 * chính mình không hỏi ai thì đó là lỗ hổng, không phải tiện lợi.
 */
private const val TEN_FILE = "LOCALMATE.apk"

/** Trạng thái tải. null nghĩa là chưa bấm tải. */
sealed interface TrangThaiTai {
    /** phanTram = -1 khi máy chủ không báo dung lượng, lúc đó chạy vô định. */
    data class DangTai(val phanTram: Int) : TrangThaiTai
    data object CanCapQuyen : TrangThaiTai
    data class Hong(val loi: String) : TrangThaiTai
}

@HiltViewModel
class UpdateViewModel @Inject constructor(
    @ApplicationContext private val app: Context,
    private val api: BayNuiApi,
    private val tokenStore: TokenStore,
) : ViewModel() {

    private val _ban = MutableStateFlow<AppVersionResponse?>(null)
    val ban: StateFlow<AppVersionResponse?> = _ban.asStateFlow()

    private val _tai = MutableStateFlow<TrangThaiTai?>(null)
    val tai: StateFlow<TrangThaiTai?> = _tai.asStateFlow()

    init {
        viewModelScope.launch {
            // Lỗi mạng thì im lặng bỏ qua. Mở app ra mà bị báo "không kiểm tra
            // được cập nhật" là phiền vô ích — khách có làm gì được đâu.
            val res = runCatching { api.appVersion(BuildConfig.VERSION_CODE) }.getOrNull() ?: return@launch
            if (!res.updateAvailable) return@launch

            // Đã bấm "Để sau" cho đúng bản này rồi thì thôi, đừng hỏi lại mỗi
            // lần mở app — trừ khi bản cũ thật sự không dùng được nữa.
            val boQua = runCatching { tokenStore.skippedVersionOnce() }.getOrDefault(0)
            if (!res.mandatory && boQua >= res.versionCode) return@launch

            _ban.value = res
        }
    }

    fun deSau() {
        val v = _ban.value ?: return
        viewModelScope.launch { tokenStore.skipVersion(v.versionCode) }
        _ban.value = null
    }

    fun dong() { _ban.value = null }

    /**
     * Tải file cài đặt rồi giao cho trình cài đặt của Android.
     *
     * Android 8 trở lên bắt từng ứng dụng phải được cho phép riêng mới được
     * cài app khác. Kiểm tra trước khi tải, chứ tải xong 23 MB rồi mới báo
     * "không có quyền" thì phí công khách chờ.
     */
    fun taiVaCai() {
        val v = _ban.value ?: return
        if (_tai.value is TrangThaiTai.DangTai) return

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !app.packageManager.canRequestPackageInstalls()) {
            _tai.value = TrangThaiTai.CanCapQuyen
            return
        }

        _tai.value = TrangThaiTai.DangTai(0)
        viewModelScope.launch {
            val ketQua = withContext(Dispatchers.IO) { runCatching { taiFile(v.apkUrl) } }
            ketQua.onSuccess { file ->
                _tai.value = null
                _ban.value = null
                moTrinhCaiDat(file)
            }.onFailure {
                _tai.value = TrangThaiTai.Hong(it.message ?: "")
            }
        }
    }

    /** Mở phần cài đặt hệ thống để khách bật quyền cài app cho LOCALMATE. */
    fun moCaiDatQuyen() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        runCatching {
            app.startActivity(
                Intent(
                    Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                    Uri.parse("package:${app.packageName}"),
                ).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
            )
        }
        _tai.value = null
    }

    /** Đường tải trong trình duyệt — lối thoát khi app tải không được. */
    fun moTrinhDuyet() {
        val v = _ban.value ?: return
        runCatching {
            app.startActivity(
                Intent(Intent.ACTION_VIEW, Uri.parse(v.apkUrl))
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
            )
        }
        _tai.value = null
    }

    private fun taiFile(url: String): File {
        val thuMuc = File(app.cacheDir, "update").apply { mkdirs() }
        // Ghi ra file tạm rồi mới đổi tên: máy hết pin giữa chừng thì lần sau
        // không có file cụt nằm đó để trình cài đặt nuốt phải.
        val dangTai = File(thuMuc, "$TEN_FILE.dang-tai")
        val xong = File(thuMuc, TEN_FILE)
        dangTai.delete()
        xong.delete()

        val conn = (URL(url).openConnection() as HttpURLConnection).apply {
            connectTimeout = 20_000
            readTimeout = 30_000
            instanceFollowRedirects = true
        }
        try {
            if (conn.responseCode !in 200..299) error("HTTP ${conn.responseCode}")
            val tong = conn.contentLength.toLong()
            var daTai = 0L
            var mocCuoi = -1

            conn.inputStream.use { vao ->
                dangTai.outputStream().use { ra ->
                    val dem = ByteArray(64 * 1024)
                    while (true) {
                        val n = vao.read(dem)
                        if (n <= 0) break
                        ra.write(dem, 0, n)
                        daTai += n
                        // Chỉ báo khi số phần trăm ĐỔI, không phải mỗi lần đọc
                        // 64 KB — nếu không thì phát ra hơn ba trăm lần cập
                        // nhật giao diện cho một lần tải.
                        val pt = if (tong > 0) ((daTai * 100) / tong).toInt() else -1
                        if (pt != mocCuoi) {
                            mocCuoi = pt
                            _tai.value = TrangThaiTai.DangTai(pt)
                        }
                    }
                }
            }
            if (tong > 0 && dangTai.length() != tong) error("tải thiếu")
        } finally {
            conn.disconnect()
        }

        if (!dangTai.renameTo(xong)) error("không lưu được file")
        return xong
    }

    private fun moTrinhCaiDat(file: File) {
        val uri = FileProvider.getUriForFile(app, "${app.packageName}.fileprovider", file)
        val intent = Intent(Intent.ACTION_VIEW)
            .setDataAndType(uri, "application/vnd.android.package-archive")
            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
        runCatching { app.startActivity(intent) }
    }
}

/**
 * Hộp thoại mời cập nhật. Đặt một lần ở gốc cây giao diện là đủ cho cả app.
 */
@Composable
fun UpdateDialog(viewModel: UpdateViewModel = hiltViewModel()) {
    val ban by viewModel.ban.collectAsStateWithLifecycle()
    val tai by viewModel.tai.collectAsStateWithLifecycle()
    val v = ban ?: return
    val dangTai = tai as? TrangThaiTai.DangTai

    AlertDialog(
        // Đang tải thì không cho bấm ra ngoài để đóng — bấm nhầm là mất công
        // tải lại từ đầu. Bản bắt buộc cũng vậy.
        onDismissRequest = { if (!v.mandatory && dangTai == null) viewModel.deSau() },
        title = {
            Text(
                when {
                    dangTai != null -> tr("Đang tải bản mới…", "Downloading…")
                    v.mandatory -> tr("Cần cập nhật để tiếp tục", "Update required to continue")
                    else -> tr("Đã có bản mới", "A new version is out")
                },
            )
        },
        text = {
            Column {
                when (val t = tai) {
                    is TrangThaiTai.DangTai -> {
                        Text(
                            if (t.phanTram >= 0) "${t.phanTram}%"
                            else tr("Đang tải…", "Downloading…"),
                            style = MaterialTheme.typography.bodyMedium,
                        )
                        if (t.phanTram >= 0) {
                            LinearProgressIndicator(
                                progress = { t.phanTram / 100f },
                                modifier = Modifier.fillMaxWidth().padding(top = 10.dp).height(6.dp),
                            )
                        } else {
                            LinearProgressIndicator(
                                modifier = Modifier.fillMaxWidth().padding(top = 10.dp).height(6.dp),
                            )
                        }
                        Text(
                            tr(
                                "Tải xong sẽ hiện hộp xác nhận cài đặt của máy.",
                                "When it finishes, your phone will ask you to confirm the install.",
                            ),
                            style = MaterialTheme.typography.bodySmall,
                            modifier = Modifier.padding(top = 10.dp),
                        )
                    }

                    TrangThaiTai.CanCapQuyen -> Text(
                        tr(
                            "Máy cần bật cho phép LOCALMATE cài ứng dụng. Bấm “Mở cài đặt”, gạt nút cho phép rồi quay lại đây bấm tải.",
                            "Your phone needs to allow LOCALMATE to install apps. Tap “Open settings”, turn it on, then come back and tap download.",
                        ),
                    )

                    is TrangThaiTai.Hong -> Text(
                        tr(
                            "Tải không xong. Bạn thử lại, hoặc tải bằng trình duyệt.",
                            "The download did not finish. Try again, or download in your browser.",
                        ),
                    )

                    null -> Text(
                        buildString {
                            append(tr("Phiên bản ", "Version "))
                            append(v.versionName)
                            if (v.notes.isNotBlank()) {
                                append("\n\n")
                                append(v.notes)
                            }
                            if (v.mandatory) {
                                append("\n\n")
                                append(tr(
                                    "Bản bạn đang dùng không còn hoạt động đúng với máy chủ.",
                                    "The version you are using no longer works with the server.",
                                ))
                            }
                        },
                    )
                }
            }
        },
        confirmButton = {
            when (tai) {
                is TrangThaiTai.DangTai -> {}
                TrangThaiTai.CanCapQuyen -> TextButton(onClick = viewModel::moCaiDatQuyen) {
                    Text(tr("Mở cài đặt", "Open settings"))
                }
                is TrangThaiTai.Hong -> TextButton(onClick = viewModel::taiVaCai) {
                    Text(tr("Thử lại", "Try again"))
                }
                null -> TextButton(onClick = viewModel::taiVaCai) {
                    Text(tr("Cập nhật ngay", "Update now"))
                }
            }
        },
        dismissButton = when {
            dangTai != null -> null
            tai is TrangThaiTai.Hong -> {
                { TextButton(onClick = viewModel::moTrinhDuyet) { Text(tr("Dùng trình duyệt", "Use browser")) } }
            }
            v.mandatory -> null
            else -> {
                { TextButton(onClick = viewModel::deSau) { Text(tr("Để sau", "Later")) } }
            }
        },
    )
}
