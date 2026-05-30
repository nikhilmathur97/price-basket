import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/connectivity_provider.dart';

/// Checks current network connectivity and updates the [isOnlineProvider].
class ConnectivityService {
  final Ref _ref;
  ConnectivityService(this._ref);

  Future<bool> checkConnectivity() async {
    final results = await Connectivity().checkConnectivity();
    final online = results.any((r) => r != ConnectivityResult.none);
    _ref.read(isOnlineProvider.notifier).state = online;
    return online;
  }

  void startMonitoring() {
    Connectivity().onConnectivityChanged.listen((results) {
      final online = results.any((r) => r != ConnectivityResult.none);
      _ref.read(isOnlineProvider.notifier).state = online;
    });
  }
}

final connectivityServiceProvider = Provider<ConnectivityService>((ref) {
  return ConnectivityService(ref);
});
