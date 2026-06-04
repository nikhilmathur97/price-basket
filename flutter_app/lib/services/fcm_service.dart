import 'package:flutter/foundation.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

/// Firebase Cloud Messaging service.
///
/// Setup checklist:
///   1. Create a Firebase project at console.firebase.google.com
///   2. Add Android app (package: in.pricebasket.app) → download google-services.json
///      → place at flutter_app/android/app/google-services.json
///   3. Add iOS app (bundle: in.pricebasket.app) → download GoogleService-Info.plist
///      → place at flutter_app/ios/Runner/GoogleService-Info.plist
///   4. In Xcode: enable Push Notifications + Background Modes (Remote notifications)
///   5. Run: dart pub global activate flutterfire_cli
///          flutterfire configure --project=YOUR_FIREBASE_PROJECT_ID
///      This generates lib/firebase_options.dart
///   6. Uncomment the Firebase.initializeApp line in this file
///
/// Until step 6 is done, the service runs in stub mode (local notifications only).
class FcmService {
  static FlutterLocalNotificationsPlugin? _localNotifications;
  static bool _firebaseReady = false;

  static Future<void> init() async {
    if (kIsWeb) {
      debugPrint('[FCM] Skipping init on web');
      return;
    }

    // ── Step 1: Try to initialise Firebase ──────────────────────────────────
    try {
      // Uncomment after running: flutterfire configure
      // import 'firebase_options.dart';
      // await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);

      // Check if Firebase was already initialised (e.g. by flutterfire_cli generated code)
      if (Firebase.apps.isNotEmpty) {
        _firebaseReady = true;
        debugPrint('[FCM] Firebase already initialised');
      } else {
        debugPrint('[FCM] Firebase not configured yet — running in stub mode');
        debugPrint('[FCM] Add google-services.json + GoogleService-Info.plist and run flutterfire configure');
      }
    } catch (e) {
      debugPrint('[FCM] Firebase init error (stub mode): $e');
    }

    // ── Step 2: Local notifications (works without Firebase) ────────────────
    _localNotifications = FlutterLocalNotificationsPlugin();

    const AndroidInitializationSettings androidSettings =
        AndroidInitializationSettings('@mipmap/ic_launcher');

    const DarwinInitializationSettings iosSettings =
        DarwinInitializationSettings(
      requestAlertPermission: false, // Asked manually in NotificationPermissionScreen
      requestBadgePermission: true,
      requestSoundPermission: true,
    );

    await _localNotifications!.initialize(
      const InitializationSettings(android: androidSettings, iOS: iosSettings),
      onDidReceiveNotificationResponse: _onNotificationTap,
    );

    // ── Android notification channel ─────────────────────────────────────────
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

    // ── Step 3: FCM token + message handlers (requires Firebase) ────────────
    if (_firebaseReady) {
      await _setupFcm();
    }
  }

  static Future<void> _setupFcm() async {
    final FirebaseMessaging messaging = FirebaseMessaging.instance;

    // Request permission (iOS — Android 13+ is handled in NotificationPermissionScreen)
    await messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    // Get FCM token and send to backend
    final String? token = await messaging.getToken();
    if (token != null) {
      debugPrint('[FCM] Token: $token');
      await _registerTokenWithBackend(token);
    }

    // Refresh token listener
    messaging.onTokenRefresh.listen(_registerTokenWithBackend);

    // Foreground message handler — show local notification
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      debugPrint('[FCM] Foreground message: ${message.messageId}');
      final notification = message.notification;
      if (notification != null) {
        showLocalNotification(
          title: notification.title ?? 'PriceBasket',
          body: notification.body ?? '',
          payload: message.data['url'],
        );
      }
    });

    // Background/terminated tap handler
    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      debugPrint('[FCM] Notification tapped (background): ${message.data}');
      // Deep link handling — wire up when needed
    });

    // Check if app was launched from a notification
    final RemoteMessage? initialMessage = await messaging.getInitialMessage();
    if (initialMessage != null) {
      debugPrint('[FCM] App launched from notification: ${initialMessage.data}');
    }
  }

  /// POST FCM token to backend so server can send targeted push notifications.
  static Future<void> _registerTokenWithBackend(String token) async {
    // TODO: Call POST /api/v1/users/fcm-token with the token
    // This endpoint needs to be created on the backend.
    // Example:
    // await apiClient.post('/users/fcm-token', data: {'token': token});
    debugPrint('[FCM] Token ready for backend registration: $token');
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

    await _localNotifications!.show(
      DateTime.now().millisecondsSinceEpoch ~/ 1000,
      title,
      body,
      const NotificationDetails(android: androidDetails, iOS: iosDetails),
      payload: payload,
    );
  }
}
