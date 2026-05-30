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

  @override
  void initState() {
    super.initState();
    _initWebView();
  }

  void _initWebView() {
    final authBridge = ref.read(authBridgeServiceProvider);

    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setUserAgent(AppConfig.userAgent)
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
          onPageFinished: (String url) async {
            setState(() {
              _isLoading = false;
              _loadingProgress = 1.0;
            });
            // Inject stored auth token into localStorage on page load
            await _injectAuthToken();
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

  /// Injects stored JWT token into the web app's localStorage.
  Future<void> _injectAuthToken() async {
    final authBridge = ref.read(authBridgeServiceProvider);
    final String? token = await authBridge.getStoredToken();
    if (token != null && token.isNotEmpty) {
      await _controller.runJavaScript('''
        (function() {
          try {
            var stored = localStorage.getItem('auth-storage');
            var parsed = stored ? JSON.parse(stored) : { state: {} };
            if (!parsed.state.accessToken) {
              parsed.state.accessToken = '$token';
              localStorage.setItem('auth-storage', JSON.stringify(parsed));
            }
          } catch(e) {}
        })();
      ''');
    }
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

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        // ── WebView ──────────────────────────────────────────────────────
        RefreshIndicator(
          color: AppTheme.brandOrange,
          onRefresh: () async => _controller.reload(),
          child: WebViewWidget(controller: _controller),
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
