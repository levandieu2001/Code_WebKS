package vn.baynuistay.di

import android.content.Context
import androidx.room.Room
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import java.util.concurrent.TimeUnit
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import vn.baynuistay.BuildConfig
import vn.baynuistay.core.local.BayNuiDatabase
import vn.baynuistay.core.local.OrderDao
import vn.baynuistay.core.network.AuthInterceptor
import vn.baynuistay.core.network.BayNuiApi
import vn.baynuistay.core.network.TokenAuthenticator

@Module
@InstallIn(SingletonComponent::class)
object AppModule {
    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): BayNuiDatabase =
        Room.databaseBuilder(context, BayNuiDatabase::class.java, "bay-nui-cache.db")
            // Đây chỉ là cache cục bộ, nguồn sự thật nằm ở backend.
            // Đổi schema thì xoá và tạo lại, không cần viết migration.
            .fallbackToDestructiveMigration(dropAllTables = true)
            .build()

    @Provides
    fun provideOrderDao(database: BayNuiDatabase): OrderDao = database.orderDao()

    @Provides
    @Singleton
    fun provideApi(authInterceptor: AuthInterceptor,
        tokenAuthenticator: TokenAuthenticator): BayNuiApi {
        val json = Json { ignoreUnknownKeys = true; explicitNulls = false }
        val logging = HttpLoggingInterceptor().apply {
            level = if (BuildConfig.DEBUG) HttpLoggingInterceptor.Level.BASIC
            else HttpLoggingInterceptor.Level.NONE
        }
        val client = OkHttpClient.Builder()
            .addInterceptor(authInterceptor)
            .addInterceptor(logging)
            // OkHttp chỉ gọi authenticator KHI máy chủ trả 401: nó xin token
            // mới rồi tự phát lại đúng lời gọi vừa hỏng. Nhờ vậy mọi màn hình
            // được vá cùng lúc mà không phải sửa dòng nào trong chúng.
            .authenticator(tokenAuthenticator)
            // Dựng lịch trình phải gọi thêm thời tiết và Gemini nên lâu hơn
            // các endpoint khác; mặc định 10 giây của OkHttp là không đủ.
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(45, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build()

        return Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL)
            .client(client)
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()
            .create(BayNuiApi::class.java)
    }
}
