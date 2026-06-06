import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

import '../config/app_config.dart';

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

  // ── Notification-tap navigation ─────────────────────────────────────────
  // MainShell registers a callback so a notification tap can open the right
  // page in the WebView. If a tap arrives before MainShell is ready (cold
  // start from a terminated state), the payload is held and flushed on register.
  static void Function(String url)? _navigator;
  static String? _pendingUrl;

  /// Registers the navigation callback and flushes any pending payload.
  static void registerNavigator(void Function(String url) callback) {
    _navigator = callback;
    final String? pending = _pendingUrl;
    if (pending != null) {
      _pendingUrl = null;
      callback(pending);
    }
  }

  /// Clears the navigation callback (call from State.dispose).
  static void unregisterNavigator() => _navigator = null;

  /// Routes a notification payload to the registered navigator, or buffers it
  /// until one registers.
  static void _emitNavigation(String? url) {
    if (url == null || url.isEmpty) return;
    final callback = _navigator;
    if (callback != null) {
      callback(url);
    } else {
      _pendingUrl = url;
    }
  }

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
      _emitNavigation(message.data['url']);
    });

    // Check if app was launched from a notification
    final RemoteMessage? initialMessage = await messaging.getInitialMessage();
    if (initialMessage != null) {
      debugPrint('[FCM] App launched from notification: ${initialMessage.data}');
      _emitNavigation(initialMessage.data['url']);
    }
  }

  static const FlutterSecureStorage _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
  );

  /// POST the FCM token to the backend (POST /api/v1/users/fcm-token) so the
  /// server can target this device with push notifications.
  ///
  /// The token is always persisted locally; it is only sent to the backend
  /// when a JWT is available (user logged in). If the user isn't logged in yet,
  /// [syncTokenAfterLogin] re-registers it once auth completes.
  static Future<void> _registerTokenWithBackend(String token) async {
    await _storage.write(key: AppConfig.keyFcmToken, value: token);

    final String? jwt = await _storage.read(key: AppConfig.keyJwtToken);
    if (jwt == null || jwt.isEmpty) {
      debugPrint('[FCM] No JWT yet — token saved, will register after login');
      return;
    }

    try {
      final response = await http.post(
        Uri.parse('${AppConfig.apiBaseUrl}/users/fcm-token'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $jwt',
        },
        body: jsonEncode({'token': token}),
      );
      if (response.statusCode == 204 || response.statusCode == 200) {
        debugPrint('[FCM] Token registered with backend');
      } else {
        debugPrint('[FCM] Token registration failed: ${response.statusCode}');
      }
    } catch (e) {
      debugPrint('[FCM] Token registration error: $e');
    }
  }

  /// Re-register the stored FCM token after the user logs in.
  /// Called by AuthBridgeService once a JWT becomes available.
  static Future<void> syncTokenAfterLogin() async {
    if (kIsWeb) return;
    final String? token = await _storage.read(key: AppConfig.keyFcmToken);
    if (token != null && token.isNotEmpty) {
      await _registerTokenWithBackend(token);
    }
  }

  static void _onNotificationTap(NotificationResponse response) {
    final String? payload = response.payload;
    if (payload != null && payload.isNotEmpty) {
      debugPrint('[FCM] Notification tapped — payload: $payload');
      _emitNavigation(payload);
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
