import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

/// Firebase Cloud Messaging service.
/// Full implementation requires adding google-services.json (Android)
/// and GoogleService-Info.plist (iOS) — see plans/flutter-app-plan.md §11.
///
/// This stub initialises local notifications and provides the scaffolding
/// for FCM token registration and message handling.
class FcmService {
  static FlutterLocalNotificationsPlugin? _localNotifications;

  static Future<void> init() async {
    // flutter_local_notifications is a no-op on web — safe to call but skip setup
    if (kIsWeb) {
      debugPrint('[FCM] Skipping local notifications init on web');
      return;
    }

    _localNotifications = FlutterLocalNotificationsPlugin();

    // ── Local notifications setup ──────────────────────────────────────────
    const AndroidInitializationSettings androidSettings =
        AndroidInitializationSettings('@mipmap/ic_launcher');

    const DarwinInitializationSettings iosSettings =
        DarwinInitializationSettings(
      requestAlertPermission: false, // We ask manually in NotificationPermissionScreen
      requestBadgePermission: true,
      requestSoundPermission: true,
    );

    const InitializationSettings initSettings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );

    await _localNotifications!.initialize(
      initSettings,
      onDidReceiveNotificationResponse: _onNotificationTap,
    );

    // ── Android notification channel ───────────────────────────────────────
    const AndroidNotificationChannel channel = AndroidNotificationChannel(
      'pricebasket_alerts',
      'Price Alerts',
      description: 'Notifications for price drops and cart reminders',
      importance: Importance.high,
    );

    await _localNotifications!
        .resolvePlatformSpecificImplementation<
            AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(channel);

    debugPrint('[FCM] Local notifications initialised');

    // NOTE: To enable Firebase push notifications:
    // 1. Run: dart pub global activate flutterfire_cli
    // 2. Run: flutterfire configure --project=YOUR_FIREBASE_PROJECT_ID
    // 3. Uncomment the firebase_messaging imports and init below
    //
    // FirebaseMessaging messaging = FirebaseMessaging.instance;
    // String? token = await messaging.getToken();
    // debugPrint('[FCM] Token: $token');
    // Then POST token to /api/v1/users/fcm-token
  }

  static void _onNotificationTap(NotificationResponse response) {
    final String? payload = response.payload;
    if (payload != null && payload.isNotEmpty) {
      debugPrint('[FCM] Notification tapped — payload: $payload');
      // DeepLinkService.handleDeepLink(payload) — wire up when FCM is live
    }
  }

  /// Show a local notification (used when app is in foreground and FCM arrives).
  static Future<void> showLocalNotification({
    required String title,
    required String body,
    String? payload,
  }) async {
    if (kIsWeb || _localNotifications == null) return;

    const AndroidNotificationDetails androidDetails =
        AndroidNotificationDetails(
      'pricebasket_alerts',
      'Price Alerts',
      channelDescription: 'Notifications for price drops and cart reminders',
      importance: Importance.high,
      priority: Priority.high,
      icon: '@mipmap/ic_launcher',
    );

    const DarwinNotificationDetails iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    const NotificationDetails details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await _localNotifications!.show(
      DateTime.now().millisecondsSinceEpoch ~/ 1000,
      title,
      body,
      details,
      payload: payload,
    );
  }
}
