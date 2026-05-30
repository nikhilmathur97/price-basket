import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:connectivity_plus/connectivity_plus.dart';

/// Watches network connectivity and exposes a bool stream.
final connectivityProvider = StreamProvider<bool>((ref) {
  return Connectivity()
      .onConnectivityChanged
      .map((results) => results.any((r) => r != ConnectivityResult.none));
});

/// Simple notifier for current connectivity state (used synchronously).
final isOnlineProvider = StateProvider<bool>((ref) => true);
