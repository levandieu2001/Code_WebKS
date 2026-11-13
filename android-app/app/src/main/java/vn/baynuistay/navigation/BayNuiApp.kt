package vn.baynuistay.navigation

import android.net.Uri

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Hotel
import androidx.compose.material.icons.rounded.Home
import androidx.compose.material.icons.rounded.Person
import androidx.compose.material.icons.rounded.Route
import androidx.compose.material.icons.rounded.TravelExplore
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.draw.clip
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.graphics.vector.ImageVector
import vn.baynuistay.R
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import vn.baynuistay.core.ui.lang.tr
import vn.baynuistay.core.ui.theme.LmNavy
import vn.baynuistay.core.ui.theme.LmBlue
import vn.baynuistay.feature.ai.ui.AiTripScreen
import vn.baynuistay.feature.auth.ui.AuthScreen
import vn.baynuistay.feature.auth.ui.SplashScreen
import vn.baynuistay.feature.partner.ui.PartnerScreen
import vn.baynuistay.feature.place.ui.PlaceDetailScreen
import vn.baynuistay.feature.admin.ui.AdminScreen
import vn.baynuistay.feature.booking.ui.MyBookingsScreen
import vn.baynuistay.feature.chat.ui.ChatScreen
import vn.baynuistay.feature.booking.ui.RoomsScreen
import vn.baynuistay.feature.booking.ui.TransportScreen
import vn.baynuistay.feature.culture.ui.CultureDetailScreen
import vn.baynuistay.feature.explore.ui.ExploreScreen
import vn.baynuistay.feature.home.ui.HomeScreen
import vn.baynuistay.feature.journal.ui.JournalScreen
import vn.baynuistay.feature.passport.ui.PassportScreen
import vn.baynuistay.feature.notify.ui.NotificationsScreen
import vn.baynuistay.feature.profile.ui.ProfileScreen
import vn.baynuistay.feature.trip.ui.TripScreen
import vn.baynuistay.feature.understand.ui.UnderstandScreen
import vn.baynuistay.feature.commerce.CatalogScreen
import vn.baynuistay.feature.commerce.AccountDetailsScreen

private object Route {
    const val Splash = "splash"
    const val Login = "login"
    const val Home = "home"
    const val Explore = "explore"
    const val Ai = "ai"
    const val Trip = "trip/{id}"
    const val DemoTrip = "trip/demo"
    const val Passport = "passport"
    const val Chat = "chat"
    const val Journal = "journal"
    const val Admin = "admin"
    const val Notifications = "notifications"
    const val Understand = "understand"
    const val Profile = "profile"
    const val Culture = "culture/{slug}"
    const val KhmerCulture = "culture/van-hoa-khmer"
    const val Rooms = "rooms?stay={stay}&checkIn={checkIn}&checkOut={checkOut}"
    const val RoomsPlain = "rooms?stay=&checkIn=&checkOut="
    const val Transport = "transport?pickup={pickup}&dropoff={dropoff}"
    const val TransportPlain = "transport?pickup=&dropoff="
    const val Orders = "orders"
    const val Catalog = "catalog/{kind}?item={item}"
    const val Food = "catalog/food?item="
    const val Tours = "catalog/tour?item="
    const val Account = "account-details"
    const val Auth = "auth"
    const val PartnerPortal = "partner"
    const val Place = "place/{slug}"
    fun place(slug: String) = "place/$slug"
}

private data class BottomDestination(
    /** Mẫu đường dẫn, dùng để biết tab nào đang được chọn. */
    val route: String,
    val labelVi: String,
    val labelEn: String,
    val icon: ImageVector,
    /** Đường dẫn thật để điều hướng — khác mẫu ở trên khi đường dẫn có tham số. */
    val target: String = route,
)

private val bottomDestinations = listOf(
    BottomDestination(Route.Home, "Trang chủ", "Home", Icons.Rounded.Home),
    BottomDestination(Route.Explore, "Khám phá", "Explore", Icons.Rounded.TravelExplore),
    BottomDestination(Route.Rooms, "Đặt dịch vụ", "Book", Icons.Rounded.Hotel, Route.RoomsPlain),
    BottomDestination(Route.DemoTrip, "Chuyến đi", "My trip", Icons.Rounded.Route),
    BottomDestination(Route.Profile, "Cá nhân", "Profile", Icons.Rounded.Person),
)

@Composable
fun BayNuiApp() {
    val navController = rememberNavController()
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route
    val showBottomBar = currentRoute in setOf(
        Route.Home, Route.Explore, Route.Ai, Route.Trip, Route.Profile,
        Route.Rooms, Route.Transport, Route.Orders, Route.Catalog, Route.Account,
    )

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        // Nút trợ lý nổi trên các tab chính, giống ô chat góc phải trên web.
        // Đặt ở Scaffold chứ không nhét vào từng màn hình: làm vậy thì mỗi màn
        // mới thêm sau này lại phải nhớ gắn nút, sớm muộn cũng sót.
        floatingActionButton = {
            if (showBottomBar && currentRoute != Route.Chat && currentRoute != Route.Catalog && currentRoute != Route.Account) {
                FloatingActionButton(
                    onClick = { navController.navigate(Route.Chat) },
                    shape = CircleShape,
                    // Ảnh bot đã có sẵn nền trắng nên nền nút phải trắng theo,
                    // để không lòi ra một vành màu quanh mép ảnh.
                    containerColor = Color.White,
                    modifier = Modifier.size(56.dp),
                ) {
                    Image(
                        painter = painterResource(R.drawable.ic_chatbot),
                        contentDescription = tr("Trợ lý Bảy Núi", "Bảy Núi Assistant"),
                        // Ảnh gốc nằm ngang (676×369), bot ở chính giữa. Crop
                        // lấy đúng phần giữa — giống object-fit: cover trên web.
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize().clip(CircleShape),
                    )
                }
            }
        },
        bottomBar = {
            if (showBottomBar) {
                NavigationBar(containerColor = MaterialTheme.colorScheme.surface) {
                    bottomDestinations.forEach { destination ->
                        val selected = when (destination.route) {
                            Route.DemoTrip -> currentRoute == Route.Trip
                            Route.Rooms -> currentRoute in setOf(Route.Rooms, Route.Transport, Route.Catalog)
                            else -> currentRoute == destination.route
                        }
                        val label = tr(destination.labelVi, destination.labelEn)
                        NavigationBarItem(
                            selected = selected,
                            onClick = {
                                // Tab Trang chủ phải đi thẳng: restoreState sẽ dựng lại
                                // nguyên ngăn xếp đã lưu (kể cả màn Chuyến đi đang mở),
                                // khiến bấm Trang chủ mà vẫn đứng nguyên chỗ cũ.
                                val toHome = destination.route == Route.Home
                                navController.navigate(destination.target) {
                                    launchSingleTop = true
                                    restoreState = !toHome
                                    popUpTo(Route.Home) { saveState = !toHome }
                                }
                            },
                            icon = { Icon(destination.icon, label) },
                            label = { Text(label) },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = LmBlue,
                                selectedTextColor = LmNavy,
                                indicatorColor = MaterialTheme.colorScheme.primaryContainer,
                            ),
                        )
                    }
                }
            }
        },
    ) { padding ->
        Box(Modifier.padding(padding)) {
            NavHost(navController = navController, startDestination = Route.Splash) {
                composable(Route.Splash) {
                    SplashScreen {
                        navController.navigate(Route.Home) {
                            popUpTo(Route.Splash) { inclusive = true }
                        }
                    }
                }
                composable(Route.Auth) {
                    AuthScreen(
                        onDone = { navController.popBackStack() },
                        onSkip = { navController.popBackStack() },
                    )
                }
                composable(Route.Notifications) {
                    NotificationsScreen(onBack = { navController.popBackStack() })
                }
                composable(Route.Home) {
                    HomeScreen(
                        onOpenRooms = { navController.navigate(Route.RoomsPlain) },
                        onOpenRide = { navController.navigate(Route.TransportPlain) },
                        onOpenTours = { navController.navigate(Route.Tours) },
                        onOpenFood = { navController.navigate(Route.Food) },
                        onOpenOrders = { navController.navigate(Route.Orders) },
                        onOpenNotifications = { navController.navigate(Route.Notifications) },
                        onOpenAi = { navController.navigate(Route.Ai) },
                        onOpenExplore = { navController.navigate(Route.Explore) },
                        onOpenCulture = { navController.navigate(Route.KhmerCulture) },
                        onOpenPlace = { slug -> navController.navigate(Route.place(slug)) },
                    )
                }
                composable(Route.Explore) {
                    ExploreScreen(
                        onOpenCulture = { navController.navigate(Route.KhmerCulture) },
                        onOpenUnderstand = { navController.navigate(Route.Understand) },
                        onOpenPlace = { slug -> navController.navigate(Route.place(slug)) },
                    )
                }
                composable(
                    route = Route.Place,
                    arguments = listOf(navArgument("slug") { type = NavType.StringType }),
                ) {
                    PlaceDetailScreen(
                        onBack = { navController.popBackStack() },
                        onOpenPlace = { slug -> navController.navigate(Route.place(slug)) },
                        onBookRoom = { navController.navigate(Route.RoomsPlain) },
                        onBookTour = { tour -> navController.navigate("catalog/tour?item=" + Uri.encode(tour.slug)) },
                        onBookTransport = { navController.navigate(Route.TransportPlain) },
                    )
                }
                composable(
                    route = Route.Culture,
                    arguments = listOf(navArgument("slug") { type = NavType.StringType }),
                ) {
                    CultureDetailScreen(
                        onBack = { navController.popBackStack() },
                        onCreateTrip = { navController.navigate(Route.Ai) },
                    )
                }
                composable(Route.Ai) {
                    AiTripScreen(onOpenTrip = { tripId -> navController.navigate("trip/" + tripId) })
                }
                composable(
                    route = Route.Trip,
                    arguments = listOf(navArgument("id") { type = NavType.StringType }),
                ) {
                    TripScreen(
                        // Mỗi dòng lịch trình nối thẳng vào phần đặt chỗ đang chạy
                        onBookTransport = { pickup, dropoff ->
                            navController.navigate(
                                "transport?pickup=" + Uri.encode(pickup) + "&dropoff=" + Uri.encode(dropoff),
                            )
                        },
                        onBookStay = { stayId, checkIn, checkOut ->
                            navController.navigate(
                                "rooms?stay=" + Uri.encode(stayId) +
                                    "&checkIn=" + checkIn + "&checkOut=" + checkOut,
                            )
                        },
                        onOpenPlace = { slug -> navController.navigate("place/" + slug) },
                        onCreateTrip = { navController.navigate(Route.Ai) },
                    )
                }
                composable(
                    route = Route.Rooms,
                    arguments = listOf(
                        navArgument("stay") { type = NavType.StringType; defaultValue = "" },
                        navArgument("checkIn") { type = NavType.StringType; defaultValue = "" },
                        navArgument("checkOut") { type = NavType.StringType; defaultValue = "" },
                    ),
                ) {
                    RoomsScreen(onOpenTransport = { navController.navigate(Route.TransportPlain) },
                        onOpenFood = { navController.navigate(Route.Food) }, onOpenTours = { navController.navigate(Route.Tours) },
                        onOpenOrders = { navController.navigate(Route.Orders) })
                }
                composable(
                    route = Route.Transport,
                    arguments = listOf(
                        navArgument("pickup") { type = NavType.StringType; defaultValue = "" },
                        navArgument("dropoff") { type = NavType.StringType; defaultValue = "" },
                    ),
                ) {
                    TransportScreen(onOpenOrders = { navController.navigate(Route.Orders) })
                }
                composable(Route.Orders) { MyBookingsScreen() }
                composable(Route.Catalog, arguments = listOf(navArgument("kind") { type = NavType.StringType }, navArgument("item") { type = NavType.StringType; defaultValue = "" })) {
                    CatalogScreen(onOrders = { navController.navigate(Route.Orders) }, onAccount = { navController.navigate(Route.Account) })
                }
                composable(Route.Account) { AccountDetailsScreen(onLogin = { navController.navigate(Route.Auth) }) }
                composable(Route.PartnerPortal) {
                    PartnerScreen(onBack = { navController.popBackStack() })
                }
                composable(Route.Chat) {
                    ChatScreen(
                        onBack = { navController.popBackStack() },
                        onAction = { action ->
                            // Bot gợi ý mở màn nào thì đi thẳng màn đó. Đóng
                            // luôn màn chat lại: khách bấm "xem phòng" là muốn
                            // xem phòng, không phải muốn quay lại chỗ chat.
                            val target = when (action) {
                                "open_rooms" -> Route.RoomsPlain
                                "open_transport" -> Route.TransportPlain
                                "open_trip" -> Route.Ai
                                "open_tours" -> Route.Tours
                                "open_food", "open_specialties" -> Route.Food
                                "open_orders" -> Route.Orders
                                else -> null
                            }
                            if (target != null) {
                                navController.navigate(target) {
                                    popUpTo(Route.Chat) { inclusive = true }
                                }
                            }
                        },
                    )
                }
                composable(Route.Understand) {
                    UnderstandScreen(
                        onBack = { navController.popBackStack() },
                        onOpenPlace = { slug -> navController.navigate(Route.place(slug)) },
                    )
                }
                composable(Route.Admin) {
                    AdminScreen(onBack = { navController.popBackStack() })
                }
                composable(Route.Journal) {
                    JournalScreen(onBack = { navController.popBackStack() })
                }
                composable(Route.Passport) { PassportScreen() }
                composable(Route.Profile) {
                    ProfileScreen(
                        onOpenFood = { navController.navigate(Route.Food) },
                        onOpenAccount = { navController.navigate(Route.Account) },
                        onOpenPassport = { navController.navigate(Route.Passport) },
                        onOpenJournal = { navController.navigate(Route.Journal) },
                        onOpenAdmin = { navController.navigate(Route.Admin) },
                        onOpenNotifications = { navController.navigate(Route.Notifications) },
                        onOpenOrders = { navController.navigate(Route.Orders) },
                        onOpenAuth = { navController.navigate(Route.Auth) },
                        onOpenPartner = { navController.navigate(Route.PartnerPortal) },
                    )
                }
            }
        }
    }
}
