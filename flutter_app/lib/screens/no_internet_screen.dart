import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import '../config/routes.dart';
import '../config/theme.dart';

/// Shown when the device has no internet connection.
/// Retry button re-checks connectivity and navigates to Home if online.
class NoInternetScreen extends StatefulWidget {
  const NoInternetScreen({super.key});

  @override
  State<NoInternetScreen> createState() => _NoInternetScreenState();
}

class _NoInternetScreenState extends State<NoInternetScreen> {
  bool _checking = false;

  Future<void> _retry() async {
    setState(() => _checking = true);
    await Future.delayed(const Duration(milliseconds: 500));

    final results = await Connectivity().checkConnectivity();
    final bool online = results.any((r) => r != ConnectivityResult.none);

    if (!mounted) return;
    setState(() => _checking = false);

    if (online) {
      context.go(AppRoutes.home);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Still no internet. Please check your connection.'),
          behavior: SnackBarBehavior.floating,
        ),
      );
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
              // ── WiFi off icon ──────────────────────────────────────────
              Container(
                width: 120,
                height: 120,
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  shape: BoxShape.circle,
                ),
                child: const Center(
                  child: Icon(
                    Icons.wifi_off_rounded,
                    size: 60,
                    color: AppTheme.textSecondary,
                  ),
                ),
              ),
              const SizedBox(height: 32),

              // ── Headline ───────────────────────────────────────────────
              const Text(
                'No Internet Connection',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: AppTheme.textPrimary,
                  fontSize: 24,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 12),

              // ── Body ───────────────────────────────────────────────────
              const Text(
                'Please check your connection\nand try again',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: AppTheme.textSecondary,
                  fontSize: 15,
                  height: 1.5,
                ),
              ),
              const SizedBox(height: 40),

              // ── Retry button ───────────────────────────────────────────
              ElevatedButton.icon(
                onPressed: _checking ? null : _retry,
                icon: _checking
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Icon(Icons.refresh_rounded),
                label: Text(_checking ? 'Checking...' : 'Retry'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
