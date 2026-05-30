import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../screens/splash_screen.dart';
import '../screens/onboarding_screen.dart';
import '../screens/notification_permission_screen.dart';
import '../screens/no_internet_screen.dart';
import '../screens/main_shell.dart';

/// Named route constants
class AppRoutes {
  static const String splash = '/';
  static const String onboarding = '/onboarding';
  static const String notificationPermission = '/notification-permission';
  static const String noInternet = '/no-internet';
  static const String home = '/home';
}

/// GoRouter instance — reads SharedPreferences to decide initial route
GoRouter buildRouter(SharedPreferences prefs) {
  return GoRouter(
    initialLocation: AppRoutes.splash,
    routes: [
      GoRoute(
        path: AppRoutes.splash,
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: AppRoutes.onboarding,
        builder: (context, state) => const OnboardingScreen(),
      ),
      GoRoute(
        path: AppRoutes.notificationPermission,
        builder: (context, state) => const NotificationPermissionScreen(),
      ),
      GoRoute(
        path: AppRoutes.noInternet,
        builder: (context, state) => const NoInternetScreen(),
      ),
      GoRoute(
        path: AppRoutes.home,
        builder: (context, state) => const MainShell(),
      ),
    ],
  );
}
