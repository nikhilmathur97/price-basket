import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Cart item count — updated via JavaScript bridge from the WebView.
/// Displayed as a badge on the Cart tab in the native BottomNav.
final cartCountProvider = StateProvider<int>((ref) => 0);
