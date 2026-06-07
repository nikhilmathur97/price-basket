import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../config/app_config.dart';
import '../config/theme.dart';
import '../providers/cart_count_provider.dart';
import '../providers/connectivity_provider.dart';
import '../screens/webview_screen.dart';
import '../services/deep_link_service.dart';
import '../services/fcm_service.dart';

// Search tab index — used to trigger focusSearch() on tap.
const int _kSearchTabIndex = 1;
const int _kCartTabIndex = 2;

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
  _Tab(
    label: 'Home',
    icon: Icons.home_outlined,
    activeIcon: Icons.home_rounded,
    url: AppConfig.homeUrl,
  ),
  _Tab(
    label: 'Search',
    icon: Icons.search_rounded,
    activeIcon: Icons.search_rounded,
    url: AppConfig.searchUrl,
  ),
  _Tab(
    label: 'Cart',
    icon: Icons.shopping_cart_outlined,
    activeIcon: Icons.shopping_cart_rounded,
    url: AppConfig.cartUrl,
  ),
  _Tab(
    label: 'Me',
    icon: Icons.person_outline_rounded,
    activeIcon: Icons.person_rounded,
    url: AppConfig.profileUrl,
  ),
];

/// Main shell: SINGLE WebView + native BottomNavigationBar.
///
/// All tabs share ONE WebView instance so they share the same JavaScript
/// context, localStorage, cookies, and auth state. Tab switches navigate
/// the single WebView to the appropriate URL — no separate WebView per tab,
/// no cross-tab auth isolation issues.
class MainShell extends ConsumerStatefulWidget {
  const MainShell({super.key});

  @override
  ConsumerState<MainShell> createState() => _MainShellState();
}

class _MainShellState extends ConsumerState<MainShell> {
  int _currentIndex = 0;
  late final List<_Tab> _tabs;

  // Single WebView key — all tabs share one WebView instance
  final GlobalKey<WebViewScreenState> _webViewKey = GlobalKey<WebViewScreenState>();

  @override
  void initState() {
    super.initState();
    _tabs = _buildTabs();
    _listenDeepLinks();
    _listenConnectivity();
    _handleInitialDeepLink();
    // Let notification taps navigate the WebView (active once FCM is configured).
    FcmService.registerNavigator(_handleNotificationUrl);

    // Bug 1 fix: make the status-bar area white + use light icons so the web
    // app's white sticky header blends seamlessly into the status bar (Blinkit-
    // style). This is set once at shell init and persists for the app lifetime.
    SystemChrome.setSystemUIOverlayStyle(
      const SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,          // transparent → Scaffold bg shows through
        statusBarIconBrightness: Brightness.dark,    // dark icons on white bg (Android)
        statusBarBrightness: Brightness.light,       // light bg → dark icons (iOS)
      ),
    );
  }

  @override
  void dispose() {
    FcmService.unregisterNavigator();
    super.dispose();
  }

  void _listenDeepLinks() {
    // Links received while the app is already running (warm start).
    DeepLinkService.startListening(_routeDeepLink);
  }

  /// Handles a deep link that cold-started the app (app was not running).
  Future<void> _handleInitialDeepLink() async {
    final String? webUrl = await DeepLinkService.getInitialDeepLink();
    if (webUrl == null || !mounted) return;
    _routeDeepLink(webUrl);
  }

  /// Routes a converted web URL to the matching tab, then loads it there.
  void _routeDeepLink(String webUrl) {
    // Find which tab this URL belongs to, or default to Home.
    int targetTab = 0;
    if (webUrl.contains('/cart')) {
      targetTab = 2;
    } else if (webUrl.contains('/profile') || webUrl.contains('/alerts')) {
      targetTab = 3;
    } else if (webUrl.contains('/search')) {
      targetTab = 1;
    }

    if (!mounted) return;
    setState(() => _currentIndex = targetTab);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _webViewKey.currentState?.loadUrl(webUrl);
    });
  }

  /// Converts a notification payload (full URL, pricebasket:// deep link, or a
  /// bare path) into a web URL and routes to it. Wired to FcmService taps.
  void _handleNotificationUrl(String raw) {
    if (raw.isEmpty) return;
    String webUrl;
    if (raw.startsWith('http')) {
      webUrl = raw;
    } else if (raw.startsWith('pricebasket://')) {
      final String? converted = DeepLinkService.deepLinkToWebUrl(Uri.parse(raw));
      if (converted == null) return;
      webUrl = converted;
    } else {
      final String path = raw.startsWith('/') ? raw : '/$raw';
      webUrl = '${AppConfig.baseUrl}$path';
    }
    _routeDeepLink(webUrl);
  }

  void _listenConnectivity() {
    ref.listenManual(connectivityProvider, (prev, next) {
      next.whenData((isOnline) {
        ref.read(isOnlineProvider.notifier).state = isOnline;
      });
    });
  }

  Future<bool> _onWillPop() async {
    // Try to go back in WebView history first
    final bool wentBack =
        await _webViewKey.currentState?.goBack() ?? false;
    if (wentBack) return false; // Don't exit app

    // If on a non-home tab, go back to Home tab
    if (_currentIndex != 0) {
      setState(() => _currentIndex = 0);
      _webViewKey.currentState?.loadUrl(_tabs[0].url);
      return false;
    }

    // Exit app
    return true;
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
        // SafeArea keeps the WebView content below the status bar / notch.
        // bottom: false — the bottom inset is handled by _NativeBottomNav.
        body: SafeArea(
          bottom: false,
          child: WebViewScreen(
            key: _webViewKey,
            initialUrl: _tabs[0].url,
          ),
        ),
        bottomNavigationBar: _NativeBottomNav(
          currentIndex: _currentIndex,
          cartCount: cartCount,
          onTap: (index) {
            final int prevIndex = _currentIndex;
            setState(() => _currentIndex = index);

            // Navigate the single WebView to the tapped tab's URL
            if (index != prevIndex) {
              WidgetsBinding.instance.addPostFrameCallback((_) {
                _webViewKey.currentState?.loadUrl(_tabs[index].url);
              });
            }

            // Re-tapping the Search tab focuses the search input immediately.
            if (index == _kSearchTabIndex) {
              WidgetsBinding.instance.addPostFrameCallback((_) {
                _webViewKey.currentState?.focusSearch();
              });
            }

            // Re-tapping the Cart tab (already on Cart) soft-refreshes cart data.
            if (index == _kCartTabIndex && index == prevIndex) {
              WidgetsBinding.instance.addPostFrameCallback((_) {
                _webViewKey.currentState?.refreshCart();
              });
            }
          },
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
