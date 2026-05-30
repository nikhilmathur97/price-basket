import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'config/routes.dart';
import 'config/theme.dart';

/// Root widget — wraps the GoRouter with Riverpod and the app theme.
class PriceBasketApp extends ConsumerWidget {
  final SharedPreferences prefs;

  const PriceBasketApp({super.key, required this.prefs});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = buildRouter(prefs);

    return MaterialApp.router(
      title: 'PriceBasket',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      routerConfig: router,
    );
  }
}
