// Conditional import: on web use the stub, on mobile use the real WebView.
// dart.library.html is only available on web; dart.library.io on mobile.
import 'webview_screen_stub.dart'
    if (dart.library.io) 'webview_screen_mobile.dart'
    if (dart.library.html) 'webview_screen_web.dart';

export 'webview_screen_stub.dart'
    if (dart.library.io) 'webview_screen_mobile.dart'
    if (dart.library.html) 'webview_screen_web.dart'
    show WebViewScreen, WebViewScreenState;
