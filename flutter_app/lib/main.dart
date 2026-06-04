import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'app.dart';
import 'services/fcm_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // ── System UI ────────────────────────────────────────────────────────────
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
      systemNavigationBarColor: Colors.white,
      systemNavigationBarIconBrightness: Brightness.dark,
    ),
  );

  // Lock to portrait orientation
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  // ── SharedPreferences ────────────────────────────────────────────────────
  final SharedPreferences prefs = await SharedPreferences.getInstance();

  // ── Firebase + Local notifications ──────────────────────────────────────
  // FcmService.init() initialises Firebase and local notifications.
  // It is safe to call even before google-services.json / GoogleService-Info.plist
  // are added — it will log a warning and continue without crashing.
  await FcmService.init();

  runApp(
    ProviderScope(
      child: PriceBasketApp(prefs: prefs),
    ),
  );
}
