package vn.baynuistay.core.network

import java.util.Locale
import javax.inject.Inject
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.Response
import vn.baynuistay.core.local.TokenStore

class AuthInterceptor @Inject constructor(
    private val tokenStore: TokenStore,
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val (token, language) = runBlocking {
            tokenStore.token.first() to tokenStore.language.first()
        }
        val request = chain.request().newBuilder()
            .header("Accept-Language", language.ifBlank { Locale.getDefault().language })
            .apply { if (!token.isNullOrBlank()) header("Authorization", "Bearer $token") }
            .build()
        return chain.proceed(request)
    }
}
