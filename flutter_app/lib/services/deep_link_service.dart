import 'package:app_links/app_links.dart';
import 'package:flutter/foundation.dart';
import '../config/app_config.dart';

/// Handles deep links in the format: pricebasket://product/abc-123
/// Converts them to web URLs for loading in the WebView.
///
/// Deep link scheme is configured in:
///   Android: android/app/src/main/AndroidManifest.xml
///   iOS:     ios/Runner/Info.plist
class DeepLinkService {
  static final AppLinks _appLinks = AppLinks();

  /// Converts a deep link URI to a full web URL.
  /// e.g. pricebasket://product/abc → https://pricebasket.in/product/abc?source=app
  static String? deepLinkToWebUrl(Uri uri) {
    if (uri.scheme != 'pricebasket') return null;

    final String path = uri.host + (uri.path.isNotEmpty ? uri.path : '');
    final String query = uri.query.isNotEmpty ? '?${uri.query}&source=app' : '?source=app';

    return '${AppConfig.baseUrl}/$path$query';
  }

  /// Listen for incoming deep links while app is running.
  /// [onLink] receives the converted web URL.
  static void startListening(void Function(String webUrl) onLink) {
    _appLinks.uriLinkStream.listen((uri) {
      final String? webUrl = deepLinkToWebUrl(uri);
      if (webUrl != null) {
        debugPrint('[DeepLink] Incoming: $uri → $webUrl');
        onLink(webUrl);
      }
    }, onError: (err) {
      debugPrint('[DeepLink] Error: $err');
    });
  }

  /// Get the initial deep link that launched the app (cold start).
  static Future<String?> getInitialDeepLink() async {
    try {
      final Uri? uri = await _appLinks.getInitialLink();
      if (uri != null) {
        return deepLinkToWebUrl(uri);
      }
    } catch (e) {
      debugPrint('[DeepLink] getInitialLink error: $e');
    }
    return null;
  }
}
