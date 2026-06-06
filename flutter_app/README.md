# PriceBasket Flutter App

Native Android + iOS wrapper around the [pricebasket.in](https://pricebasket.in) web app.
Architecture: **Flutter WebView shell** — native bottom nav + native push notifications + native deep links, with the full product UI served from the Next.js web app.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Flutter Native Shell                │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │           WebView (pricebasket.in)           │   │
│  │                                             │   │
│  │  Next.js App ←──── FlutterBridge ────────►  │   │
│  │  (auth, cart)      JS↔Dart bridge           │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  Native Bottom Nav  │  FCM Push  │  Deep Links      │
└─────────────────────────────────────────────────────┘
```

**Why WebView?**
- Single codebase for web + mobile
- Instant feature parity — web changes deploy to app immediately
- No App Store review needed for content/UI changes
- Native shell adds: push notifications, deep links, offline detection, cart badge

---

## Project Structure

```
flutter_app/
├── lib/
│   ├── main.dart                    # Entry point — Firebase + system UI init
│   ├── app.dart                     # Root widget — GoRouter + theme
│   ├── config/
│   │   ├── app_config.dart          # URLs, bundle ID, user-agent, tab URLs
│   │   ├── routes.dart              # GoRouter route definitions
│   │   └── theme.dart               # Brand colors + Material theme
│   ├── screens/
│   │   ├── splash_screen.dart       # Branded splash (2.5s first / 1.5s return)
│   │   ├── onboarding_screen.dart   # 3-slide onboarding (first launch only)
│   │   ├── notification_permission_screen.dart
│   │   ├── no_internet_screen.dart  # Offline screen with retry
│   │   ├── main_shell.dart          # 4-tab shell + native bottom nav
│   │   ├── webview_screen.dart      # Conditional import dispatcher
│   │   ├── webview_screen_mobile.dart  # Real WebView (Android/iOS)
│   │   └── webview_screen_web.dart  # Stub for web platform
│   ├── services/
│   │   ├── fcm_service.dart         # Firebase Cloud Messaging + local notifications
│   │   ├── auth_bridge_service.dart # JWT sync: WebView ↔ Flutter secure storage
│   │   ├── deep_link_service.dart   # pricebasket:// deep link handler
│   │   └── connectivity_service.dart
│   └── providers/
│       ├── cart_count_provider.dart # Cart badge count (Riverpod)
│       └── connectivity_provider.dart
├── android/
│   ├── app/
│   │   ├── src/main/AndroidManifest.xml  # Permissions + deep link intent-filters
│   │   ├── build.gradle.kts             # App ID, signing, ProGuard
│   │   └── proguard-rules.pro
│   ├── key.properties.example           # Signing config template
│   └── settings.gradle.kts              # Google-services plugin
├── ios/
│   └── Runner/
│       ├── Info.plist               # Bundle ID, deep links, portrait lock
│       └── PrivacyInfo.xcprivacy    # iOS 17+ App Store requirement
├── assets/
│   ├── images/
│   │   ├── logo.png                 # Used in web stub
│   │   └── app_icon.png             # 1024x1024 — ADD THIS for app icons
│   └── icons/
├── pubspec.yaml                     # Dependencies + flutter_launcher_icons config
└── setup.sh                         # Setup, build, and release helper script
```

---

## Quick Start

### Prerequisites
- Flutter SDK ≥ 3.3.0 ([install](https://flutter.dev/docs/get-started/install))
- Android Studio + Android SDK (for Android)
- Xcode 15+ (for iOS, macOS only)
- A connected device or emulator

### Run in Development

```bash
cd flutter_app

# Install dependencies
flutter pub get

# Run on connected device/emulator
flutter run

# Or use the setup script
./setup.sh run
```

---

## Go-Live Checklist

### ✅ Already Done
- [x] Branded splash screen with animation
- [x] 3-slide onboarding (first launch only)
- [x] Notification permission screen
- [x] No internet screen with retry
- [x] 4-tab native bottom navigation (Home, Search, Cart, Me)
- [x] WebView with progress bar, pull-to-refresh, error overlay
- [x] External platform links open in system browser (Blinkit, Zepto, etc.)
- [x] Android back button navigates WebView history
- [x] FlutterBridge JS↔Dart auth token sync
- [x] Cart badge count from WebView
- [x] JWT stored in encrypted secure storage
- [x] JWT injected into WebView localStorage on page load
- [x] Deep link service (`pricebasket://` scheme)
- [x] FCM local notifications scaffold
- [x] INTERNET permission in AndroidManifest
- [x] Deep link intent-filters (Android + iOS)
- [x] Portrait-only orientation lock
- [x] iOS Privacy Manifest (PrivacyInfo.xcprivacy)
- [x] ProGuard rules for release build
- [x] Network security config (HTTPS only)
- [x] App name: "PriceBasket" (consistent)
- [x] App ID: `in.pricebasket.app` (consistent)

### ❌ Required Before Store Submission

#### 1. App Icon (30 minutes)
```bash
# Create a 1024x1024 PNG with your logo
# Place at: flutter_app/assets/images/app_icon.png
# Also create adaptive icon foreground (optional):
# flutter_app/assets/images/app_icon_foreground.png

# Then generate all sizes:
./setup.sh icon
```

#### 2. Android Signing Keystore (10 minutes)
```bash
./setup.sh keystore
# Follow the prompts — saves android/pricebasket-release.jks
# BACK UP the .jks file — you cannot re-upload to Play Store without it!
```

#### 3. Firebase Setup (1-2 hours)
```bash
./setup.sh firebase
# Follow the printed guide, then:
# 1. Add android/app/google-services.json
# 2. Add ios/Runner/GoogleService-Info.plist
# 3. Run: flutterfire configure --project=YOUR_PROJECT_ID
# 4. Uncomment Firebase.initializeApp() in lib/services/fcm_service.dart
```

#### 4. iOS Xcode Setup (30 minutes)
```bash
open ios/Runner.xcworkspace
```
In Xcode:
- Set **Team** (your Apple Developer account)
- Set **Bundle Identifier**: `in.pricebasket.app`
- Add capability: **Push Notifications**
- Add capability: **Background Modes** → check "Remote notifications"
- Add capability: **Associated Domains** → `applinks:pricebasket.in`

#### 5. Universal Links / App Links (1 hour)
For `https://pricebasket.in` links to open the app:

**iOS** — Add to `https://pricebasket.in/.well-known/apple-app-site-association`:
```json
{
  "applinks": {
    "apps": [],
    "details": [{
      "appID": "TEAM_ID.in.pricebasket.app",
      "paths": ["*"]
    }]
  }
}
```

**Android** — Add to `https://pricebasket.in/.well-known/assetlinks.json`:
```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "in.pricebasket.app",
    "sha256_cert_fingerprints": ["YOUR_SHA256_FINGERPRINT"]
  }
}]
```
Get fingerprint: `keytool -list -v -keystore android/pricebasket-release.jks -alias pricebasket`

#### 6. Backend FCM Token Endpoint
Create `POST /api/v1/users/fcm-token` on the backend to store FCM tokens for targeted push notifications. Then uncomment the `_registerTokenWithBackend` call in [`lib/services/fcm_service.dart`](lib/services/fcm_service.dart).

---

## Building for Release

```bash
# Full release build (APK + AAB + iOS)
./setup.sh build

# Or manually:
flutter build apk --release --split-per-abi        # Android APK
flutter build appbundle --release                   # Android AAB (Play Store)
flutter build ios --release --no-codesign           # iOS (then archive in Xcode)
```

---

## Play Store Submission

1. Build AAB: `flutter build appbundle --release`
2. Go to [play.google.com/console](https://play.google.com/console)
3. Create app → Package name: `in.pricebasket.app`
4. Upload `build/app/outputs/bundle/release/app-release.aab`
5. Fill in store listing (description, screenshots, icon)
6. Set content rating
7. Submit for review (~3-7 days)

**Required screenshots** (minimum):
- Phone: 2 screenshots (1080×1920 or similar)
- 7-inch tablet: 1 screenshot (optional but recommended)

---

## App Store (iOS) Submission

1. Archive in Xcode: Product → Archive
2. Upload to App Store Connect via Xcode Organizer
3. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
4. Create new app → Bundle ID: `in.pricebasket.app`
5. Fill in metadata, screenshots, privacy policy URL
6. Submit for review (~1-3 days)

**Required screenshots**:
- iPhone 6.7" (1290×2796): 3 screenshots minimum
- iPhone 6.5" (1242×2688): 3 screenshots minimum

---

## FlutterBridge Protocol

The web app (Next.js) communicates with the Flutter shell via `window.FlutterBridge.postMessage()`.

### Messages sent from Web → Flutter

```javascript
// Auth token received (login/refresh)
window.FlutterBridge?.postMessage(JSON.stringify({
  type: 'auth',
  token: 'eyJ...',
  user_id: 'uuid'
}));

// Cart count changed
window.FlutterBridge?.postMessage(JSON.stringify({
  type: 'cart_count',
  count: 3
}));

// User logged out
window.FlutterBridge?.postMessage(JSON.stringify({
  type: 'logout'
}));
```

### Detection (is app running inside Flutter WebView?)

```javascript
// Method 1: Check user-agent
const isFlutterApp = navigator.userAgent.includes('PriceBasketApp');

// Method 2: Check URL param
const isFlutterApp = new URLSearchParams(window.location.search).get('source') === 'app';

// Method 3: Check bridge availability
const isFlutterApp = typeof window.FlutterBridge !== 'undefined';
```

---

## Deep Links

| URL | Opens |
|-----|-------|
| `pricebasket://product/PRODUCT_ID` | Product page |
| `pricebasket://cart` | Cart tab |
| `pricebasket://search?q=milk` | Search tab with query |
| `pricebasket://profile` | Profile tab |
| `https://pricebasket.in/product/X` | Product page (universal link) |

---

## Environment Configuration

All URLs are in [`lib/config/app_config.dart`](lib/config/app_config.dart):

```dart
// Production (default)
static const String baseUrl = 'https://pricebasket.in';

// Local dev — Android emulator
// static const String baseUrl = 'http://10.0.2.2:3000';

// Local dev — iOS simulator
// static const String baseUrl = 'http://localhost:3000';
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| WebView blank on Android | Check INTERNET permission in AndroidManifest.xml |
| External links not opening | Check `externalDomains` list in `app_config.dart` |
| Cart badge not updating | Check `FlutterBridge.postMessage` calls in `cartStore.ts` |
| Auth not persisting | Check `flutter_secure_storage` — may need device unlock |
| Deep links not working | Check intent-filters in AndroidManifest + CFBundleURLTypes in Info.plist |
| Firebase not working | Ensure `google-services.json` / `GoogleService-Info.plist` are present |
| iOS build fails | Run `pod install` in `ios/` directory |
| Gradle build fails | Run `flutter clean && flutter pub get` |
