package vn.baynuistay.core.local

import androidx.room.Dao
import androidx.room.Database
import androidx.room.Entity
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.RoomDatabase
import kotlinx.coroutines.flow.Flow

@Entity(tableName = "trip_cache")
data class TripCacheEntity(
    @PrimaryKey val id: String,
    val payloadJson: String,
    val updatedAt: Long,
)

@Dao
interface TripCacheDao {
    @Query("SELECT * FROM trip_cache ORDER BY updatedAt DESC")
    fun observeAll(): Flow<List<TripCacheEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(item: TripCacheEntity)
}

/**
 * Đơn đã đặt từ thiết bị này.
 *
 * Firestore chỉ cho ĐỌC đơn khi đã đăng nhập (xem firestore.rules), nên app lưu
 * lại bản sao cục bộ để màn "Đơn của tôi" vẫn xem được — kể cả khi mất mạng.
 * Nguồn sự thật vẫn là Firestore; đây chỉ là bản ghi cho tiện tra cứu.
 */
@Entity(tableName = "orders")
data class OrderEntity(
    @PrimaryKey val id: String,
    val kind: String,
    val summary: String,
    val totalPrice: Int,
    val status: String,
    val checkIn: String,
    val checkOut: String,
    val guestName: String,
    val phone: String,
    val createdAt: Long,
)

@Dao
interface OrderDao {
    @Query("SELECT * FROM orders ORDER BY createdAt DESC")
    fun observeAll(): Flow<List<OrderEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(item: OrderEntity)

    @Query("DELETE FROM orders")
    suspend fun clear()
}

@Database(
    entities = [TripCacheEntity::class, OrderEntity::class],
    version = 2,
    exportSchema = true,
)
abstract class BayNuiDatabase : RoomDatabase() {
    abstract fun tripCacheDao(): TripCacheDao
    abstract fun orderDao(): OrderDao
}
