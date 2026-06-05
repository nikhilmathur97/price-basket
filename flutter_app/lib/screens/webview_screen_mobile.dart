import 'dart:io' show Platform;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../config/app_config.dart';
import '../config/theme.dart';
import '../services/auth_bridge_service.dart';

/// Mobile WebView implementation using webview_flutter.
/// Only compiled on Android/iOS — never on web.
class WebViewScreen extends ConsumerStatefulWidget {
  final String initialUrl;

  const WebViewScreen({super.key, required this.initialUrl});

  @override
  ConsumerState<WebViewScreen> createState() => WebViewScreenState();
}

/// Public state so MainShell can call loadUrl() and goBack() via GlobalKey.
class WebViewScreenState extends ConsumerState<WebViewScreen> {
  late final WebViewController _controller;
  bool _isLoading = true;
  double _loadingProgress = 0.0;
  bool _hasError = false;

  // ── Pull-to-refresh state ──────────────────────────────────────────────
  // _scrollY mirrors the WebView's native vertical scroll position so we know
  // when the page is at the top; _pullStartY anchors an in-progress drag.
  double _scrollY = 0;
  double? _pullStartY;
  bool _refreshing = false;
  static const double _pullTriggerDistance = 110.0;

  @override
  void initState() {
    super.initState();
    _initWebView();
  }

  void _initWebView() {
    final authBridge = ref.read(authBridgeServiceProvider);

    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setUserAgent(_userAgent())
      ..setBackgroundColor(AppTheme.background)
      ..addJavaScriptChannel(
        'FlutterBridge',
        onMessageReceived: (JavaScriptMessage message) {
          authBridge.handleMessage(message.message);
        },
      )
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (_) {
            setState(() {
              _isLoading = true;
              _hasError = false;
              _loadingProgress = 0.0;
            });
          },
          onProgress: (int progress) {
            setState(() => _loadingProgress = progress / 100.0);
          },
          onPageFinished: (String url) {
            setState(() {
              _isLoading = false;
              _loadingProgress = 1.0;
              _refreshing = false;
            });
            // Native shell adjustments: hide the web app's own bottom nav, and
            // focus the search field when the search page opens.
            _injectAppChrome();
            if (url.contains('/search')) focusSearch();
          },
          onWebResourceError: (WebResourceError error) {
            // Only show error for main frame failures
            if (error.isForMainFrame ?? true) {
              setState(() {
                _isLoading = false;
                _hasError = true;
              });
            }
          },
          onNavigationRequest: (NavigationRequest request) {
            return _handleNavigation(request);
          },
        ),
      )
      ..setOnScrollPositionChange((ScrollPositionChange position) {
        _scrollY = position.y;
      })
      ..loadRequest(Uri.parse(widget.initialUrl));
  }

  /// Intercepts navigation — external platform links open in system browser.
  NavigationDecision _handleNavigation(NavigationRequest request) {
    final String url = request.url;

    // Allow pricebasket.in URLs to load in WebView
    if (url.contains('pricebasket.in') ||
        url.startsWith('about:') ||
        url.startsWith('data:')) {
      return NavigationDecision.navigate;
    }

    // Handle mailto: and tel: natively
    if (url.startsWith('mailto:') || url.startsWith('tel:')) {
      launchUrl(Uri.parse(url));
      return NavigationDecision.prevent;
    }

    // Check if it's an external platform domain
    final bool isExternal =
        AppConfig.externalDomains.any((domain) => url.contains(domain));

    if (isExternal ||
        (!url.contains('pricebasket.in') && url.startsWith('http'))) {
      launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
      return NavigationDecision.prevent;
    }

    return NavigationDecision.navigate;
  }

  /// Platform-accurate User-Agent that still carries the PriceBasketApp token
  /// the web app detects (navigator.userAgent.includes('PriceBasketApp')) to
  /// hide its web bottom nav. Previously this claimed Android even on iOS.
  ///
  /// Note: we no longer inject the auth token into localStorage here. The web
  /// app keeps its access token in memory only and restores the session on boot
  /// via its httpOnly refresh-token cookie (which the WebView persists across
  /// restarts), so injection was both writing to the wrong key and redundant.
  String _userAgent() {
    if (Platform.isIOS) {
      return '${AppConfig.userAgentToken} '
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) '
          'AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';
    }
    return '${AppConfig.userAgentToken} '
        'Mozilla/5.0 (Linux; Android 14) '
        'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
  }

  /// Hides the web app's own bottom nav inside the native shell (the native
  /// BottomNav already provides navigation). Injected as a persistent <style>
  /// so it also covers in-app client-side (SPA) navigations without a reload.
  ///
  /// The web BottomNav has Tailwind classes: fixed bottom-0 left-0 right-0 z-40
  /// Tailwind classes cannot be used as CSS class selectors (they contain special
  /// chars). Instead we target by position: any fixed element pinned to the
  /// bottom of the viewport that is the <nav> tag. Belt-and-suspenders: we also
  /// set a data attribute so the web app's own UA detection still works.
  void _injectAppChrome() {
    _controller.runJavaScript(r'''
      (function() {
        if (document.getElementById('pb-app-chrome')) return;
        var s = document.createElement('style');
        s.id = 'pb-app-chrome';
        // Target the web BottomNav: a <nav> that is position:fixed and
        // bottom:0. This matches regardless of Tailwind class names.
        s.textContent = [
          'nav[class*="bottom-0"]{display:none !important;}',
          'nav[class*="fixed"][class*="bottom"]{display:none !important;}'
        ].join('');
        document.head.appendChild(s);
      })();
    ''');
  }

  /// Focuses the web search field so the keyboard comes up (Blinkit-style) when
  /// the Search tab is opened.
  ///
  /// Strategy: try immediately, then retry after 400 ms (SPA navigation may not
  /// have rendered the input yet). Uses a short setTimeout inside JS so the
  /// browser event loop has settled before focus() is called — required on iOS
  /// WKWebView which ignores programmatic focus() called synchronously.
  void focusSearch() {
    _controller.runJavaScript(r'''
      (function tryFocus() {
        var el = document.querySelector('input[placeholder*="earch"]')
               || document.querySelector('input[type="search"]')
               || document.querySelector('input[type="text"]');
        if (el) {
          el.scrollIntoView({ block: 'center', behavior: 'smooth' });
          // setTimeout(0) defers to next event-loop tick — required for iOS
          // WKWebView to actually raise the keyboard.
          setTimeout(function() { el.focus(); }, 0);
          return true;
        }
        return false;
      })();
    ''');
    // Retry after 400 ms in case the SPA hasn't rendered the input yet
    Future.delayed(const Duration(milliseconds: 400), () {
      if (!mounted) return;
      _controller.runJavaScript(r'''
        (function() {
          var el = document.querySelector('input[placeholder*="earch"]')
                 || document.querySelector('input[type="search"]')
                 || document.querySelector('input[type="text"]');
          if (el) { setTimeout(function() { el.focus(); }, 0); }
        })();
      ''');
    });
  }

  /// Navigate to a new URL (called from MainShell on tab switch or deep link).
  void loadUrl(String url) {
    _controller.loadRequest(Uri.parse(url));
  }

  /// Go back in WebView history. Returns true if navigated back.
  Future<bool> goBack() async {
    if (await _controller.canGoBack()) {
      await _controller.goBack();
      return true;
    }
    return false;
  }

  /// Reload current page.
  Future<void> reload() => _controller.reload();

  /// Triggered by a pull-down gesture while the page is scrolled to the top.
  /// _refreshing is cleared in onPageFinished once the reload completes.
  Future<void> _triggerRefresh() async {
    if (_refreshing) return;
    setState(() => _refreshing = true);
    await _controller.reload();
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        // ── WebView (with pull-to-refresh at the top) ─────────────────────
        // RefreshIndicator can't wrap WebViewWidget: the native webview swallows
        // the scroll gestures and never emits ScrollNotifications. Instead we
        // track the native scroll position (_scrollY) and watch pointer drags
        // with a passive Listener — it observes touches without stealing them
        // from the webview, so normal scrolling still works.
        Listener(
          onPointerDown: (event) {
            _pullStartY = _scrollY <= 0 ? event.position.dy : null;
          },
          onPointerMove: (event) {
            if (_pullStartY == null || _refreshing) return;
            if (_scrollY > 0) {
              _pullStartY = null; // scrolled away from the top — cancel
              return;
            }
            if (event.position.dy - _pullStartY! > _pullTriggerDistance) {
              _pullStartY = null;
              _triggerRefresh();
            }
          },
          onPointerUp: (_) => _pullStartY = null,
          onPointerCancel: (_) => _pullStartY = null,
          child: WebViewWidget(controller: _controller),
        ),

        // ── Pull-to-refresh spinner ──────────────────────────────────────
        if (_refreshing)
          const Positioned(
            top: 16,
            left: 0,
            right: 0,
            child: Center(
              child: SizedBox(
                width: 28,
                height: 28,
                child: RefreshProgressIndicator(color: AppTheme.brandOrange),
              ),
            ),
          ),

        // ── Top loading progress bar ─────────────────────────────────────
        if (_isLoading && _loadingProgress < 1.0)
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: LinearProgressIndicator(
              value: _loadingProgress > 0 ? _loadingProgress : null,
              backgroundColor: Colors.transparent,
              color: AppTheme.brandOrange,
              minHeight: 3,
            ),
          ),

        // ── Error overlay ────────────────────────────────────────────────
        if (_hasError)
          Container(
            color: Colors.white,
            child: Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(
                    Icons.error_outline_rounded,
                    size: 64,
                    color: AppTheme.textSecondary,
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Failed to load page',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Check your internet connection',
                    style: TextStyle(
                      color: AppTheme.textSecondary,
                      fontSize: 14,
                    ),
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton.icon(
                    onPressed: () => _controller.reload(),
                    icon: const Icon(Icons.refresh_rounded),
                    label: const Text('Retry'),
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }
}
