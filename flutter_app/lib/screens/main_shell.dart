import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../config/app_config.dart';
import '../config/theme.dart';
import '../providers/cart_count_provider.dart';
import '../providers/connectivity_provider.dart';
import '../screens/webview_screen.dart';
import '../services/deep_link_service.dart';

/// Tab definition
class _Tab {
  final String label;
  final IconData icon;
  final IconData activeIcon;
  final String url;

  const _Tab({
    required this.label,
    required this.icon,
    required this.activeIcon,
    required this.url,
  });
}

List<_Tab> _buildTabs() => [
  const _Tab(
    label: 'Home',
    icon: Icons.home_outlined,
    activeIcon: Icons.home_rounded,
    url: '${AppConfig.baseUrl}/?source=app',
  ),
  const _Tab(
    label: 'Search',
    icon: Icons.search_rounded,
    activeIcon: Icons.search_rounded,
    url: '${AppConfig.baseUrl}/search?source=app',
  ),
  const _Tab(
    label: 'Cart',
    icon: Icons.shopping_cart_outlined,
    activeIcon: Icons.shopping_cart_rounded,
    url: '${AppConfig.baseUrl}/cart?source=app',
  ),
  const _Tab(
    label: 'Me',
    icon: Icons.person_outline_rounded,
    activeIcon: Icons.person_rounded,
    url: '${AppConfig.baseUrl}/profile?source=app',
  ),
];

/// Main shell: IndexedStack of WebViews + native BottomNavigationBar.
///
/// Each tab maintains its own WebView instance (pages stay alive when
/// switching tabs — no reload). Android back button navigates WebView
/// history before exiting the app.
class MainShell extends ConsumerStatefulWidget {
  const MainShell({super.key});

  @override
  ConsumerState<MainShell> createState() => _MainShellState();
}

class _MainShellState extends ConsumerState<MainShell> {
  int _currentIndex = 0;
  late final List<_Tab> _tabs;

  // One GlobalKey per tab so we can call methods on each WebViewScreen
  late final List<GlobalKey<WebViewScreenState>> _webViewKeys;

  @override
  void initState() {
    super.initState();
    _tabs = _buildTabs();
    _webViewKeys = List.generate(
      _tabs.length,
      (_) => GlobalKey<WebViewScreenState>(),
    );
    _listenDeepLinks();
    _listenConnectivity();
  }

  void _listenDeepLinks() {
    DeepLinkService.startListening((String webUrl) {
      // Find which tab this URL belongs to, or default to Home
      int targetTab = 0;
      if (webUrl.contains('/cart')) {
        targetTab = 2;
      } else if (webUrl.contains('/profile') || webUrl.contains('/alerts')) {
        targetTab = 3;
      } else if (webUrl.contains('/search')) {
        targetTab = 1;
      }

      setState(() => _currentIndex = targetTab);
      _webViewKeys[targetTab].currentState?.loadUrl(webUrl);
    });
  }

  void _listenConnectivity() {
    ref.listenManual(connectivityProvider, (prev, next) {
      next.whenData((isOnline) {
        ref.read(isOnlineProvider.notifier).state = isOnline;
      });
    });
  }

  Future<bool> _onWillPop() async {
    // Try to go back in current WebView history first
    final bool wentBack =
        await _webViewKeys[_currentIndex].currentState?.goBack() ?? false;
    if (wentBack) return false; // Don't exit app

    // If on a non-home tab, go back to Home tab
    if (_currentIndex != 0) {
      setState(() => _currentIndex = 0);
      return false;
    }

    // Exit app
    return true;
  }

  /// Navigate to a specific URL — used for deep links from notifications.
  void navigateTo(String url) {
    _webViewKeys[_currentIndex].currentState?.loadUrl(url);
  }

  @override
  Widget build(BuildContext context) {
    final int cartCount = ref.watch(cartCountProvider);

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop) return;
        final bool shouldPop = await _onWillPop();
        if (shouldPop && context.mounted) {
          SystemNavigator.pop();
        }
      },
      child: Scaffold(
        body: IndexedStack(
          index: _currentIndex,
          children: List.generate(_tabs.length, (i) {
            return WebViewScreen(
              key: _webViewKeys[i],
              initialUrl: _tabs[i].url,
            );
          }),
        ),
        bottomNavigationBar: _NativeBottomNav(
          currentIndex: _currentIndex,
          cartCount: cartCount,
          onTap: (index) => setState(() => _currentIndex = index),
          tabs: _tabs,
        ),
      ),
    );
  }
}

/// Native bottom navigation bar with cart badge.
class _NativeBottomNav extends StatelessWidget {
  final int currentIndex;
  final int cartCount;
  final ValueChanged<int> onTap;
  final List<_Tab> tabs;

  const _NativeBottomNav({
    required this.currentIndex,
    required this.cartCount,
    required this.onTap,
    required this.tabs,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Color(0x14000000),
            blurRadius: 12,
            offset: Offset(0, -2),
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: 60,
          child: Row(
            children: List.generate(tabs.length, (i) {
              final tab = tabs[i];
              final bool isActive = i == currentIndex;
              final bool isCart = i == 2;

              return Expanded(
                child: InkWell(
                  onTap: () => onTap(i),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      // ── Icon with optional badge ─────────────────────
                      Stack(
                        clipBehavior: Clip.none,
                        children: [
                          Icon(
                            isActive ? tab.activeIcon : tab.icon,
                            size: 24,
                            color: isActive
                                ? AppTheme.brandOrange
                                : AppTheme.textSecondary,
                          ),
                          if (isCart && cartCount > 0)
                            Positioned(
                              top: -6,
                              right: -8,
                              child: Container(
                                padding: const EdgeInsets.all(3),
                                decoration: const BoxDecoration(
                                  color: AppTheme.brandOrange,
                                  shape: BoxShape.circle,
                                ),
                                constraints: const BoxConstraints(
                                  minWidth: 16,
                                  minHeight: 16,
                                ),
                                child: Text(
                                  cartCount > 99 ? '99+' : '$cartCount',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 9,
                                    fontWeight: FontWeight.w700,
                                  ),
                                  textAlign: TextAlign.center,
                                ),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 3),

                      // ── Label ────────────────────────────────────────
                      Text(
                        tab.label,
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: isActive
                              ? FontWeight.w600
                              : FontWeight.w400,
                          color: isActive
                              ? AppTheme.brandOrange
                              : AppTheme.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }),
          ),
        ),
      ),
    );
  }
}
