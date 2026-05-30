import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../config/app_config.dart';
import '../config/routes.dart';
import '../config/theme.dart';

/// Shown after onboarding — requests push notification permission.
/// iOS: triggers the system permission dialog.
/// Android 13+: triggers the POST_NOTIFICATIONS permission dialog.
/// Android 12 and below: permission is granted by default.
class NotificationPermissionScreen extends StatelessWidget {
  const NotificationPermissionScreen({super.key});

  Future<void> _requestPermission(BuildContext context) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(AppConfig.keyNotificationAsked, true);

    if (!kIsWeb) {
      // dart:io is not available on web — use kIsWeb guard instead of Platform checks
      final plugin = FlutterLocalNotificationsPlugin();
      // Request iOS permissions
      await plugin
          .resolvePlatformSpecificImplementation<
              IOSFlutterLocalNotificationsPlugin>()
          ?.requestPermissions(alert: true, badge: true, sound: true);
      // Request Android 13+ permissions
      await plugin
          .resolvePlatformSpecificImplementation<
              AndroidFlutterLocalNotificationsPlugin>()
          ?.requestNotificationsPermission();
    }

    if (context.mounted) {
      context.go(AppRoutes.home);
    }
  }

  void _skip(BuildContext context) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(AppConfig.keyNotificationAsked, true);
    if (context.mounted) {
      context.go(AppRoutes.home);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Spacer(),

              // ── Bell icon ──────────────────────────────────────────────
              Container(
                width: 120,
                height: 120,
                decoration: BoxDecoration(
                  color: AppTheme.brandOrange.withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: const Center(
                  child: Text('🔔', style: TextStyle(fontSize: 56)),
                ),
              ),
              const SizedBox(height: 32),

              // ── Headline ───────────────────────────────────────────────
              const Text(
                'Stay Ahead of\nPrice Drops',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: AppTheme.textPrimary,
                  fontSize: 28,
                  fontWeight: FontWeight.w800,
                  height: 1.2,
                ),
              ),
              const SizedBox(height: 16),

              // ── Body ───────────────────────────────────────────────────
              const Text(
                'Allow notifications to get instant alerts\nwhen prices fall below your target',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: AppTheme.textSecondary,
                  fontSize: 15,
                  height: 1.5,
                ),
              ),

              const Spacer(),

              // ── Allow button ───────────────────────────────────────────
              ElevatedButton(
                onPressed: () => _requestPermission(context),
                child: const Text('Allow Notifications'),
              ),
              const SizedBox(height: 16),

              // ── Maybe later ────────────────────────────────────────────
              TextButton(
                onPressed: () => _skip(context),
                child: const Text('Maybe Later'),
              ),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }
}
