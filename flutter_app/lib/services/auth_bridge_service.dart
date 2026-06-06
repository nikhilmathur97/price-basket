import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../config/app_config.dart';
import '../providers/cart_count_provider.dart';
import 'fcm_service.dart';

/// Bridges authentication and cart state between the WebView (Next.js)
/// and the native Flutter shell via a JavaScript channel named "FlutterBridge".
///
/// The web app fires:
///   FlutterBridge.postMessage(JSON.stringify({ type: 'auth', token: '...', user_id: '...' }))
///   FlutterBridge.postMessage(JSON.stringify({ type: 'cart_count', count: 3 }))
class AuthBridgeService {
  final FlutterSecureStorage _storage;
  final Ref _ref;

  AuthBridgeService(this._ref)
      : _storage = const FlutterSecureStorage(
          aOptions: AndroidOptions(encryptedSharedPreferences: true),
        );

  /// Called when the WebView's FlutterBridge channel receives a message.
  Future<void> handleMessage(String rawMessage) async {
    try {
      final Map<String, dynamic> data = jsonDecode(rawMessage);
      final String type = data['type'] ?? '';

      switch (type) {
        case 'auth':
          await _handleAuth(data);
          break;
        case 'cart_count':
          _handleCartCount(data);
          break;
        case 'logout':
          await _handleLogout();
          break;
        case 'open_external':
          // Handled directly in WebViewScreen navigation delegate
          break;
        default:
          break;
      }
    } catch (e) {
      // Malformed message — ignore silently
    }
  }

  Future<void> _handleAuth(Map<String, dynamic> data) async {
    final String? token = data['token'];
    final String? userId = data['user_id']?.toString();
    if (token != null && token.isNotEmpty) {
      await _storage.write(key: AppConfig.keyJwtToken, value: token);
      // Now that we have a JWT, register any FCM token captured before login.
      await FcmService.syncTokenAfterLogin();
    }
    if (userId != null && userId.isNotEmpty) {
      await _storage.write(key: AppConfig.keyUserId, value: userId);
    }
  }

  void _handleCartCount(Map<String, dynamic> data) {
    final int count = (data['count'] as num?)?.toInt() ?? 0;
    _ref.read(cartCountProvider.notifier).state = count;
  }

  Future<void> _handleLogout() async {
    await _storage.delete(key: AppConfig.keyJwtToken);
    await _storage.delete(key: AppConfig.keyUserId);
    _ref.read(cartCountProvider.notifier).state = 0;
  }

  /// Returns stored JWT token (for injecting into WebView on restart).
  Future<String?> getStoredToken() async {
    return _storage.read(key: AppConfig.keyJwtToken);
  }

  /// Clears all stored credentials.
  Future<void> clearCredentials() async {
    await _storage.deleteAll();
    _ref.read(cartCountProvider.notifier).state = 0;
  }
}

final authBridgeServiceProvider = Provider<AuthBridgeService>((ref) {
  return AuthBridgeService(ref);
});
