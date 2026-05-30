import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import '../config/app_config.dart';
import '../config/routes.dart';
import '../config/theme.dart';

/// Branded splash screen shown on every app launch.
/// Duration: 2.5s (first launch) or 1.5s (returning user).
/// Navigates to: Onboarding (first time) or Home (returning user).
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _fadeAnimation;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();

    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    );

    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeIn),
    );

    _scaleAnimation = Tween<double>(begin: 0.85, end: 1.0).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeOutBack),
    );

    _controller.forward();
    _navigate();
  }

  Future<void> _navigate() async {
    final prefs = await SharedPreferences.getInstance();
    final bool onboardingDone =
        prefs.getBool(AppConfig.keyOnboardingComplete) ?? false;

    // Wait for animation + minimum display time
    final int delayMs = onboardingDone ? 1500 : 2500;
    await Future.delayed(Duration(milliseconds: delayMs));

    if (!mounted) return;

    if (!onboardingDone) {
      context.go(AppRoutes.onboarding);
      return;
    }

    // Check internet connectivity
    final results = await Connectivity().checkConnectivity();
    final bool online = results.any((r) => r != ConnectivityResult.none);

    if (!mounted) return;

    if (online) {
      context.go(AppRoutes.home);
    } else {
      context.go(AppRoutes.noInternet);
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.brandOrange,
      body: SafeArea(
        child: Center(
          child: FadeTransition(
            opacity: _fadeAnimation,
            child: ScaleTransition(
              scale: _scaleAnimation,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // ── Logo ────────────────────────────────────────────────
                  Container(
                    width: 100,
                    height: 100,
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(24),
                    ),
                    child: const Center(
                      child: Text(
                        '🧺',
                        style: TextStyle(fontSize: 52),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // ── App Name ─────────────────────────────────────────────
                  const Text(
                    'PriceBasket',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 32,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 8),

                  // ── Tagline ──────────────────────────────────────────────
                  Text(
                    'Compare · Save · Smart',
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.85),
                      fontSize: 15,
                      fontWeight: FontWeight.w400,
                      letterSpacing: 0.5,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
