import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:smooth_page_indicator/smooth_page_indicator.dart';
import '../config/app_config.dart';
import '../config/routes.dart';
import '../config/theme.dart';

class _OnboardingSlide {
  final String emoji;
  final String headline;
  final String subtitle;
  final Color bgColor;

  const _OnboardingSlide({
    required this.emoji,
    required this.headline,
    required this.subtitle,
    required this.bgColor,
  });
}

/// 3-slide onboarding shown only on first launch.
/// Stores completion flag in SharedPreferences.
class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final PageController _pageController = PageController();
  int _currentPage = 0;

  static const List<_OnboardingSlide> _slides = [
    _OnboardingSlide(
      emoji: '🏷️',
      headline: 'Compare 10 Platforms\nInstantly',
      subtitle:
          'Blinkit · Zepto · Instamart · BigBasket\nAmazon · Flipkart & more — all in one place',
      bgColor: Color(0xFFFFF3EC),
    ),
    _OnboardingSlide(
      emoji: '💰',
      headline: 'Save Up to 40%\nEvery Order',
      subtitle:
          'We find the cheapest platform\nfor your exact cart automatically',
      bgColor: Color(0xFFECFFF0),
    ),
    _OnboardingSlide(
      emoji: '🔔',
      headline: 'Never Miss\na Deal',
      subtitle:
          'Set price alerts and get notified\nthe moment prices drop below your target',
      bgColor: Color(0xFFECF0FF),
    ),
  ];

  Future<void> _completeOnboarding() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(AppConfig.keyOnboardingComplete, true);
    if (!mounted) return;
    context.go(AppRoutes.notificationPermission);
  }

  void _skip() => _completeOnboarding();

  void _next() {
    if (_currentPage < _slides.length - 1) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 350),
        curve: Curves.easeInOut,
      );
    } else {
      _completeOnboarding();
    }
  }

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Column(
          children: [
            // ── Skip button ────────────────────────────────────────────────
            Align(
              alignment: Alignment.topRight,
              child: Padding(
                padding: const EdgeInsets.only(top: 12, right: 20),
                child: TextButton(
                  onPressed: _skip,
                  child: const Text(
                    'Skip',
                    style: TextStyle(
                      color: AppTheme.textSecondary,
                      fontSize: 15,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ),
            ),

            // ── Page view ──────────────────────────────────────────────────
            Expanded(
              child: PageView.builder(
                controller: _pageController,
                itemCount: _slides.length,
                onPageChanged: (i) => setState(() => _currentPage = i),
                itemBuilder: (context, index) {
                  final slide = _slides[index];
                  return _SlideWidget(slide: slide);
                },
              ),
            ),

            // ── Dot indicators ─────────────────────────────────────────────
            SmoothPageIndicator(
              controller: _pageController,
              count: _slides.length,
              effect: ExpandingDotsEffect(
                activeDotColor: AppTheme.brandOrange,
                dotColor: AppTheme.border,
                dotHeight: 8,
                dotWidth: 8,
                expansionFactor: 3,
              ),
            ),

            const SizedBox(height: 32),

            // ── Next / Get Started button ──────────────────────────────────
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: ElevatedButton(
                onPressed: _next,
                child: Text(
                  _currentPage < _slides.length - 1 ? 'Next →' : 'Get Started 🎉',
                ),
              ),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}

class _SlideWidget extends StatelessWidget {
  final _OnboardingSlide slide;
  const _SlideWidget({required this.slide});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 32),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // ── Illustration card ────────────────────────────────────────────
          Container(
            width: double.infinity,
            height: 220,
            decoration: BoxDecoration(
              color: slide.bgColor,
              borderRadius: BorderRadius.circular(24),
            ),
            child: Center(
              child: Text(
                slide.emoji,
                style: const TextStyle(fontSize: 80),
              ),
            ),
          ),
          const SizedBox(height: 40),

          // ── Headline ─────────────────────────────────────────────────────
          Text(
            slide.headline,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: AppTheme.textPrimary,
              fontSize: 26,
              fontWeight: FontWeight.w800,
              height: 1.2,
            ),
          ),
          const SizedBox(height: 16),

          // ── Subtitle ─────────────────────────────────────────────────────
          Text(
            slide.subtitle,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: AppTheme.textSecondary,
              fontSize: 15,
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }
}
