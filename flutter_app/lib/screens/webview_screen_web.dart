import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../config/theme.dart';

/// Web stub for WebViewScreen.
/// webview_flutter does not support the web platform.
/// This stub shows a branded placeholder so the app compiles and runs on web.
class WebViewScreen extends ConsumerStatefulWidget {
  final String initialUrl;

  const WebViewScreen({super.key, required this.initialUrl});

  @override
  ConsumerState<WebViewScreen> createState() => WebViewScreenState();
}

class WebViewScreenState extends ConsumerState<WebViewScreen> {
  /// No-op on web — can't imperatively navigate an iframe.
  void loadUrl(String url) {}

  /// Always returns false on web.
  Future<bool> goBack() async => false;

  /// No-op on web.
  Future<void> reload() async {}

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.white,
      child: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // ── Brand icon ───────────────────────────────────────────
                Container(
                  width: 88,
                  height: 88,
                  decoration: BoxDecoration(
                    color: AppTheme.brandOrange,
                    borderRadius: BorderRadius.circular(22),
                    boxShadow: [
                      BoxShadow(
                        color: AppTheme.brandOrange.withValues(alpha: 0.3),
                        blurRadius: 20,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: const Icon(
                    Icons.shopping_basket_rounded,
                    color: Colors.white,
                    size: 48,
                  ),
                ),
                const SizedBox(height: 28),

                // ── App name ─────────────────────────────────────────────
                const Text(
                  'PriceBasket',
                  style: TextStyle(
                    fontSize: 30,
                    fontWeight: FontWeight.w800,
                    color: AppTheme.textPrimary,
                    letterSpacing: -0.5,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Compare prices across all platforms',
                  style: TextStyle(
                    fontSize: 15,
                    color: AppTheme.textSecondary,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 40),

                // ── Info box ─────────────────────────────────────────────
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFF3EE),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: AppTheme.brandOrange.withValues(alpha: 0.2),
                    ),
                  ),
                  child: const Column(
                    children: [
                      Icon(
                        Icons.phone_android_rounded,
                        color: AppTheme.brandOrange,
                        size: 32,
                      ),
                      SizedBox(height: 12),
                      Text(
                        'Run on Android or iOS',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.textPrimary,
                        ),
                      ),
                      SizedBox(height: 8),
                      Text(
                        'The WebView is only available on mobile.\n'
                        'Use an Android emulator or iOS simulator\n'
                        'to see the full app experience.',
                        style: TextStyle(
                          fontSize: 13,
                          color: AppTheme.textSecondary,
                          height: 1.6,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 32),

                // ── URL label ────────────────────────────────────────────
                Text(
                  widget.initialUrl,
                  style: const TextStyle(
                    fontSize: 12,
                    color: Color(0xFFAAAAAA),
                    fontFamily: 'monospace',
                  ),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
