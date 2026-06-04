// Conditional import: on web use the stub, on mobile use the real WebView.
// dart.library.html is only available on web; dart.library.io on mobile.
export 'webview_screen_mobile.dart'
    if (dart.library.html) 'webview_screen_web.dart'
    show WebViewScreen, WebViewScreenState;
