package vn.baynuistay.feature.home.di

import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton
import vn.baynuistay.feature.home.data.DefaultHomeRepository
import vn.baynuistay.feature.home.data.HomeRepository

@Module
@InstallIn(SingletonComponent::class)
abstract class HomeModule {
    @Binds
    @Singleton
    abstract fun bindHomeRepository(implementation: DefaultHomeRepository): HomeRepository
}
