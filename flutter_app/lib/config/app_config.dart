/// Central configuration for PriceBasket Flutter app.
/// Switch BASE_URL to test against local dev server.
class AppConfig {
  // ── URLs ──────────────────────────────────────────────────────────────────
  static const String baseUrl = 'https://pricebasket.in';

  // Backend API base. The Next.js frontend proxies /api/* → FastAPI backend,
  // so native API calls (e.g. FCM token registration) go through the same host.
  static String get apiBaseUrl => '$baseUrl/api/v1';

  // For local Android emulator testing: 'http://10.0.2.2:3000'
  // For local iOS simulator testing:    'http://localhost:3000'
  // static const String baseUrl = 'http://10.0.2.2:3000';

  // ── App identity ──────────────────────────────────────────────────────────
  static const String appName = 'PriceBasket';
  static const String appVersion = '1.0.0';
  static const String bundleId = 'in.pricebasket.app';

  // ── Custom User-Agent token (detected by web app to hide web BottomNav) ───
  // The web app checks navigator.userAgent.includes('PriceBasketApp'); the full
  // per-platform UA string is assembled in webview_screen_mobile.dart.
  static const String userAgentToken = 'PriceBasketApp/1.0';

  // ── Query param appended to all WebView URLs ──────────────────────────────
  static const String sourceParam = '?source=app';

  // ── Tab URLs ──────────────────────────────────────────────────────────────
  static String get homeUrl => '$baseUrl/$sourceParam';
  static String get searchUrl => '$baseUrl/search$sourceParam';
  static String get cartUrl => '$baseUrl/cart$sourceParam';
  static String get profileUrl => '$baseUrl/profile$sourceParam';

  // ── External platform domains (open in system browser) ───────────────────
  static const List<String> externalDomains = [
    'blinkit.com',
    'zeptonow.com',
    'swiggy.com',
    'bigbasket.com',
    'flipkart.com',
    'amazon.in',
    'jiomart.com',
    'myntra.com',
    'nykaa.com',
    'dunzo.com',
    'grofers.com',
  ];

  // ── SharedPreferences keys ────────────────────────────────────────────────
  static const String keyOnboardingComplete = 'onboarding_complete';
  static const String keyNotificationAsked = 'notification_permission_asked';

  // ── Secure storage keys ───────────────────────────────────────────────────
  static const String keyJwtToken = 'jwt_token';
  static const String keyUserId = 'user_id';
  static const String keyFcmToken = 'fcm_token';
}
