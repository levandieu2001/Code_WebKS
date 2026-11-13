import java.util.Properties
import org.jetbrains.kotlin.gradle.dsl.JvmTarget

// ── Địa chỉ backend ──
// Mặc định 10.0.2.2 = localhost của máy tính, nhìn từ máy ảo Android.
// Khi demo bằng ĐIỆN THOẠI THẬT, thêm dòng sau vào local.properties:
//     baynui.apiBaseUrl=http://192.168.1.15:3000/      (IP LAN của máy chạy server)
// Khi deploy backend lên Render/Railway, thêm:
//     baynui.apiBaseUrl.release=https://ten-cua-ban.onrender.com/
val localProps = Properties().apply {
    val file = rootProject.file("local.properties")
    if (file.exists()) file.inputStream().use { load(it) }
}
val apiBaseUrlDebug: String = localProps.getProperty("baynui.apiBaseUrl") ?: "http://10.0.2.2:3000/"
val apiBaseUrlRelease: String = localProps.getProperty("baynui.apiBaseUrl.release") ?: apiBaseUrlDebug

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("org.jetbrains.kotlin.plugin.serialization")
    id("com.google.devtools.ksp")
    id("com.google.dagger.hilt.android")
    id("com.google.gms.google-services")
}

android {
    namespace = "vn.baynuistay"
    compileSdk = 35

    defaultConfig {
        applicationId = "vn.baynuistay"
        minSdk = 24
        targetSdk = 35
        versionCode = 13
        versionName = "1.0.2"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables.useSupportLibrary = true
    }

    // Khoa ky ban phat hanh. Doc tu local.properties — tep do da nam ngoai kho
    // ma, nen mat khau khong bao gio lot len GitHub.
    //
    // Khong khai day du thi bo qua, ban release ra file CHUA KY (cai khong
    // duoc). Bo qua chu khong bao loi de nguoi khac tai kho ma ve van build
    // duoc ban debug.
    // rootProject.file: duong dan tinh tu thu muc android-app/, khong phai tu
    // app/. Viet file(...) thi Gradle tim trong app/ — khong thay khoa, lang le
    // xuat ra ban CHUA KY ma khong bao gi.
    val duongKhoa: String? = localProps.getProperty("localmate.keystore")
    val tepKhoa = duongKhoa?.let { rootProject.file(it) }
    val coKhoa = tepKhoa != null && tepKhoa.exists()

    signingConfigs {
        if (coKhoa) {
            create("phatHanh") {
                storeFile = tepKhoa
                storePassword = localProps.getProperty("localmate.keystorePassword")
                keyAlias = localProps.getProperty("localmate.keyAlias")
                keyPassword = localProps.getProperty("localmate.keyPassword")
            }
        }
    }

    buildTypes {
        debug {
            buildConfigField("String", "API_BASE_URL", "\"$apiBaseUrlDebug\"")
        }
        release {
            if (coKhoa) signingConfig = signingConfigs.getByName("phatHanh")
            isMinifyEnabled = false
            buildConfigField("String", "API_BASE_URL", "\"$apiBaseUrlRelease\"")
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
        // Cho phép dùng java.time (LocalDate…) trên Android 7 (API 24)
        isCoreLibraryDesugaringEnabled = true
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }
    packaging.resources.excludes += "/META-INF/{AL2.0,LGPL2.1}"
}

kotlin {
    compilerOptions {
        jvmTarget.set(JvmTarget.JVM_17)
    }
}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2025.05.01")
    implementation(composeBom)
    androidTestImplementation(composeBom)

    implementation("androidx.core:core-ktx:1.16.0")
    implementation("androidx.activity:activity-compose:1.10.1")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.9.0")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.9.0")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.9.0")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.foundation:foundation")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.navigation:navigation-compose:2.9.0")
    implementation("androidx.hilt:hilt-navigation-compose:1.2.0")

    implementation("com.google.dagger:hilt-android:2.57.1")
    ksp("com.google.dagger:hilt-android-compiler:2.57.1")

    implementation("com.squareup.retrofit2:retrofit:3.0.0")
    implementation("com.squareup.retrofit2:converter-kotlinx-serialization:3.0.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.9.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.10.2")

    implementation("androidx.room:room-runtime:2.7.1")
    implementation("androidx.room:room-ktx:2.7.1")
    ksp("androidx.room:room-compiler:2.7.1")
    implementation("androidx.datastore:datastore-preferences:1.1.7")

    // Firebase Cloud Messaging — push thật, tới được cả khi đã tắt app.
    // Dùng BOM để các thư viện Firebase luôn cùng một bộ phiên bản khớp nhau.
    implementation(platform("com.google.firebase:firebase-bom:33.7.0"))
    implementation("com.google.firebase:firebase-messaging")

    // Quét mã QR đóng dấu Hộ chiếu. Dùng bộ quét sẵn có của Google Play
    // services: KHÔNG cần xin quyền camera, giao diện quét do hệ thống lo,
    // và mã chỉ tải về khi khách bấm quét lần đầu nên app không phình to.
    implementation("com.google.android.gms:play-services-code-scanner:16.1.0")
    // Cho phép .await() trên Task của Firebase, khỏi phải viết callback
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-play-services:1.9.0")

    implementation("io.coil-kt.coil3:coil-compose:3.2.0")
    implementation("io.coil-kt.coil3:coil-network-okhttp:3.2.0")

    coreLibraryDesugaring("com.android.tools:desugar_jdk_libs:2.1.5")

    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.2.1")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.6.1")
    androidTestImplementation("androidx.compose.ui:ui-test-junit4")
    debugImplementation("androidx.compose.ui:ui-tooling")
    debugImplementation("androidx.compose.ui:ui-test-manifest")
}

ksp { arg("room.schemaLocation", "$projectDir/schemas") }
