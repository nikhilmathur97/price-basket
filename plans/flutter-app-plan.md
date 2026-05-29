# PriceBasket Flutter App — Comprehensive Plan

> 📱 **Visual Wireframes** — See [Section 18](#18-screen-wireframes--visual-reference) for screen-by-screen wireframes


> **Status:** Planning / Documentation Only — No code created yet
> **Target:** Android & iOS
> **Strategy:** Hybrid — Native Shell + WebView for existing web pages
> **Production URL:** https://pricebasket.in

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Existing Web App Inventory](#2-existing-web-app-inventory)
3. [Page Strategy — Native vs WebView](#3-page-strategy--native-vs-webview)
4. [App Architecture](#4-app-architecture)
5. [Screen-by-Screen Design Plan](#5-screen-by-screen-design-plan)
6. [Navigation & User Flow](#6-navigation--user-flow)
7. [Flutter Project Structure](#7-flutter-project-structure)
8. [Key Flutter Packages Required](#8-key-flutter-packages-required)
9. [WebView Integration Strategy](#9-webview-integration-strategy)
10. [Authentication Bridge (Web ↔ Native)](#10-authentication-bridge-web--native)
11. [Push Notifications](#11-push-notifications)
12. [Local Development Setup](#12-local-development-setup)
13. [Production / Live Setup](#13-production--live-setup)
14. [CI/CD Pipeline](#14-cicd-pipeline)
15. [App Store Submission Checklist](#15-app-store-submission-checklist)
16. [What's Missing / Gaps to Fill](#16-whats-missing--gaps-to-fill)
17. [Implementation Phases](#17-implementation-phases)

---

## 1. Executive Summary

PriceBasket is a **price comparison platform** for Indian quick-commerce (Blinkit, Zepto, Instamart, BigBasket, Flipkart, Amazon, JioMart, Myntra, Nykaa, Dunzo). The web app is already live at `pricebasket.in` built with **Next.js 14 + FastAPI backend**.

The Flutter app will be a **hybrid shell** — a native Flutter wrapper that:
- Loads `https://pricebasket.in` inside a WebView for most pages
- Adds **native-only screens** where WebView cannot provide a good UX (Splash, Onboarding, Push Notifications opt-in)
- Bridges **auth tokens** between the native layer and the WebView session
- Provides **native bottom navigation** that controls which URL the WebView loads
- Adds **push notifications** via FCM (Firebase Cloud Messaging)
- Handles **deep links** from notification taps

### Why Hybrid (WebView) Approach?

| Concern | Answer |
|---|---|
| Web app is already feature-complete | No need to rebuild 15+ pages in Flutter |
| Faster time to market | Only build what native can't do |
| Single source of truth for business logic | Backend API + Next.js stays authoritative |
| Future-proof | Web improvements automatically appear in app |
| Maintenance | One codebase to maintain for web features |

---

## 2. Existing Web App Inventory

All pages currently live at `https://pricebasket.in`:

### Public Pages (No Auth Required)
| Route | Description | Mobile-Responsive |
|---|---|---|
| `/` | Home — Hero, categories, platform strip, product sections | ✅ Yes |
| `/search?q=...` | Search results with filters | ✅ Yes |
| `/search?category=...` | Category browse | ✅ Yes |
| `/product/[id]` | Product detail with price comparison across platforms | ✅ Yes |
| `/auth/login` | Login form | ✅ Yes |
| `/auth/signup` | Signup form | ✅ Yes |

### Authenticated Pages
| Route | Description | Mobile-Responsive |
|---|---|---|
| `/cart` | Cart with per-platform price comparison + "Shop on X" CTAs | ✅ Yes |
| `/profile` | User profile — name, phone, city, pincode | ✅ Yes |
| `/alerts` | Price alerts — watching + triggered | ✅ Yes |
| `/orders` | Saved orders (referenced in Header nav) | ⚠️ Needs check |

### Admin Pages (Admin users only — NOT in app)
| Route | Description |
|---|---|
| `/admin` | Admin dashboard |
| `/admin/catalog` | Product catalog management |
| `/admin/users` | User management |
| `/admin/analytics` | Analytics |
| `/admin/platforms` | Platform config |
| `/admin/payments` | Payments |
| `/admin/queries` | Query explorer |
| `/admin/amazon` | Amazon scraper |
| `/admin/user-activity` | User activity |
| `/admin/database` | Database tools |

> **Admin pages will NOT be accessible from the mobile app.** Admin users should use the web browser.

### Components Already Mobile-Optimized
- `BottomNav` — Home, Search, Cart, Me (already exists in web for mobile)
- `Header` — sticky, responsive
- `LocationBar` — location picker
- `SearchBar` — full-width on mobile
- `ProductCard` — responsive grid
- `CartDrawer` — slide-up panel
- `ChatBot` — floating button

---

## 3. Page Strategy — Native vs WebView

### Native Flutter Screens (Build from scratch in Flutter)

| Screen | Why Native | Notes |
|---|---|---|
| **Splash Screen** | App launch branding, no web equivalent | PriceBasket logo animation, 2-3 sec |
| **Onboarding** (3 slides) | First-time user experience, native feel | Shown only once, stored in SharedPreferences |
| **Notification Permission** | iOS requires native permission dialog | After onboarding |
| **App Update Prompt** | Force/soft update gate | Check version from API or Firebase Remote Config |
| **No Internet Screen** | Offline fallback | Show when WebView fails to load |
| **Native Bottom Navigation Bar** | Controls WebView URL, persists across pages | Replaces web BottomNav |

### WebView Screens (Load pricebasket.in in WebView)

| Screen | URL Loaded | Notes |
|---|---|---|
| **Home** | `https://pricebasket.in/` | Default tab |
| **Search** | `https://pricebasket.in/search` | Search tab |
| **Product Detail** | `https://pricebasket.in/product/[id]` | Navigated from search |
| **Cart** | `https://pricebasket.in/cart` | Cart tab |
| **Profile** | `https://pricebasket.in/profile` | Me tab |
| **Price Alerts** | `https://pricebasket.in/alerts` | Accessible from Profile |
| **Login** | `https://pricebasket.in/auth/login` | Triggered when unauthenticated |
| **Signup** | `https://pricebasket.in/auth/signup` | From Login page |

### Pages That Need to Be Created on Web (Gaps)

| Missing Page | Priority | Description |
|---|---|---|
| `/orders` | High | Saved orders page — referenced in Header but may not be built |
| `/notifications` | Medium | In-app notification history for push alerts |
| `/about` | Low | About PriceBasket page |
| `/terms` | Low | Terms of Service |
| `/privacy` | Low | Privacy Policy |
| `/faq` | Low | FAQ / Help Center |

---

## 4. App Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Flutter App Shell                     │
│                                                         │
│  ┌─────────────┐  ┌──────────────────────────────────┐  │
│  │  Native     │  │         WebView Layer             │  │
│  │  Screens    │  │                                   │  │
│  │             │  │  ┌────────────────────────────┐   │  │
│  │  - Splash   │  │  │   pricebasket.in (Next.js) │   │  │
│  │  - Onboard  │  │  │                            │   │  │
│  │  - No Net   │  │  │  Home / Search / Cart /    │   │  │
│  │  - Update   │  │  │  Profile / Alerts / Auth   │   │  │
│  │             │  │  └────────────────────────────┘   │  │
│  └─────────────┘  └──────────────────────────────────┘  │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │           Native Bottom Navigation Bar           │    │
│  │   [Home]  [Search]  [Cart]  [Me]                │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │         Native Services Layer                    │    │
│  │  FCM Push  │  Deep Links  │  SharedPrefs         │    │
│  │  Biometrics│  App Version │  Secure Storage      │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
         ┌────────────────────────────┐
         │   FastAPI Backend          │
         │   (Render.com)             │
         │   /api/v1/...              │
         └────────────────────────────┘
```

### State Management

- **Flutter state:** `flutter_riverpod` or `provider` — for native screens only
- **Web app state:** Managed by Next.js (Zustand stores in web) — no duplication needed
- **Auth token bridge:** Flutter reads JWT from WebView cookies / `JavascriptChannel` and stores in `flutter_secure_storage`

### Folder Structure

```
flutter_app/
├── android/
├── ios/
├── lib/
│   ├── main.dart                    # Entry point
│   ├── app.dart                     # MaterialApp setup
│   ├── config/
│   │   ├── app_config.dart          # URLs, env vars
│   │   ├── routes.dart              # Named routes
│   │   └── theme.dart               # Colors, fonts matching web
│   ├── screens/
│   │   ├── splash/
│   │   │   └── splash_screen.dart
│   │   ├── onboarding/
│   │   │   └── onboarding_screen.dart
│   │   ├── main_shell/
│   │   │   └── main_shell.dart      # BottomNav + WebView container
│   │   ├── webview/
│   │   │   └── webview_screen.dart  # Core WebView widget
│   │   └── no_internet/
│   │       └── no_internet_screen.dart
│   ├── services/
│   │   ├── notification_service.dart  # FCM setup
│   │   ├── deep_link_service.dart     # Handle deep links
│   │   ├── connectivity_service.dart  # Network monitoring
│   │   └── auth_bridge_service.dart   # Token sync web ↔ native
│   ├── widgets/
│   │   ├── bottom_nav_bar.dart
│   │   └── loading_overlay.dart
│   └── utils/
│       ├── constants.dart
│       └── helpers.dart
├── assets/
│   ├── images/
│   │   ├── logo.png
│   │   ├── onboarding_1.png
│   │   ├── onboarding_2.png
│   │   └── onboarding_3.png
│   └── icons/
├── pubspec.yaml
└── README.md
```

---

## 5. Screen-by-Screen Design Plan

### Screen 1: Splash Screen (Native)

**Purpose:** Brand impression on app launch

**Design:**
- Full-screen background: `#FC5A01` (brand orange — matches web)
- Center: PriceBasket logo (white version) with fade-in animation
- Tagline: "Compare · Save · Smart" in white
- Duration: 2.5 seconds, then navigate to Onboarding (first time) or Home (returning user)

**Logic:**
```
App Launch
  → Check SharedPreferences: "onboarding_complete"
    → false → Onboarding Screen
    → true  → Check internet connectivity
                → No internet → No Internet Screen
                → Has internet → Main Shell (Home WebView)
```

---

### Screen 2: Onboarding (Native — 3 slides)

**Purpose:** Explain value proposition to new users

**Slide 1 — Compare Prices**
- Illustration: Price tags from multiple platforms
- Headline: "Compare 10 Platforms Instantly"
- Sub: "Blinkit, Zepto, Instamart, BigBasket & more — all in one place"

**Slide 2 — Save Money**
- Illustration: Savings/piggy bank
- Headline: "Save Up to 40% Every Order"
- Sub: "We find the cheapest platform for your exact cart"

**Slide 3 — Price Alerts**
- Illustration: Bell notification
- Headline: "Never Miss a Deal"
- Sub: "Set price alerts and get notified when prices drop"

**Controls:**
- Dot indicators at bottom
- "Skip" button top-right (goes to Home)
- "Next" / "Get Started" button
- On completion: set `onboarding_complete = true` in SharedPreferences → navigate to Notification Permission screen

---

### Screen 3: Notification Permission (Native — iOS only)

**Purpose:** Request push notification permission

**Design:**
- Icon: Bell illustration
- Headline: "Stay Ahead of Price Drops"
- Body: "Allow notifications to get instant alerts when prices fall below your target"
- Button: "Allow Notifications" (triggers iOS permission dialog)
- Link: "Maybe Later" (skips, navigates to Home)

**Android:** Permission is granted by default on Android 12 and below; Android 13+ shows system dialog automatically when FCM token is requested.

---

### Screen 4: Main Shell (Native Container)

**Purpose:** Persistent shell that holds the WebView and native BottomNav

**Layout:**
```
┌─────────────────────────────┐
│   Status Bar (system)       │
├─────────────────────────────┤
│                             │
│                             │
│      WebView                │
│   (pricebasket.in)          │
│                             │
│                             │
├─────────────────────────────┤
│  [🏠 Home] [🔍] [🛒] [👤]  │  ← Native BottomNav
└─────────────────────────────┘
```

**BottomNav Tabs:**

| Tab | Icon | URL Loaded | Badge |
|---|---|---|---|
| Home | House | `https://pricebasket.in/` | None |
| Search | Magnifier | `https://pricebasket.in/search` | None |
| Cart | Shopping cart | `https://pricebasket.in/cart` | Cart count (from JS bridge) |
| Me | Person | `https://pricebasket.in/profile` | None |

**Key Behaviors:**
- Each tab maintains its own WebView history stack (use `IndexedStack` to preserve state)
- Back button on Android navigates WebView history first, then exits app
- Pull-to-refresh gesture reloads current WebView
- Tab switching does NOT reload the page (pages are kept alive)

---

### Screen 5: WebView Screen (Core)

**Purpose:** Renders all web pages

**Configuration:**
- `javascriptEnabled: true`
- `domStorageEnabled: true` (for localStorage — auth tokens)
- `userAgent`: Custom UA string to identify app: `PriceBasketApp/1.0 (Android|iOS)`
- `allowsInlineMediaPlayback: true`
- `mediaAutoPlay: false`
- Cookie sharing: enabled (for session persistence)

**JavaScript Channels (Native ↔ Web communication):**

| Channel Name | Direction | Purpose |
|---|---|---|
| `FlutterBridge` | Web → Native | Web sends events to Flutter |
| `cartCount` | Web → Native | Update cart badge on BottomNav |
| `authToken` | Web → Native | Pass JWT token after login |
| `openExternal` | Web → Native | Open platform URLs (Blinkit, Zepto etc.) in system browser |
| `shareProduct` | Web → Native | Trigger native share sheet |

**URL Interception Rules:**
- `pricebasket.in/*` → Load in WebView (stay in app)
- `blinkit.com`, `zeptonow.com`, `swiggy.com`, `bigbasket.com`, `flipkart.com`, `amazon.in`, `jiomart.com`, `myntra.com`, `nykaa.com`, `dunzo.com` → Open in **system browser** (external)
- `mailto:`, `tel:` → Handle natively
- All other external URLs → Open in system browser

---

### Screen 6: No Internet Screen (Native)

**Purpose:** Graceful offline fallback

**Design:**
- Illustration: Wifi off icon
- Headline: "No Internet Connection"
- Body: "Please check your connection and try again"
- Button: "Retry" — checks connectivity and reloads WebView

---

### Screen 7: App Update Screen (Native — Optional)

**Purpose:** Force users to update when breaking changes are deployed

**Trigger:** API endpoint `/api/v1/app/version` returns `{ min_version: "1.2.0", latest: "1.3.0" }`

**Design:**
- Headline: "Update Available"
- Body: "A new version of PriceBasket is available with improvements and bug fixes"
- Button: "Update Now" → opens Play Store / App Store
- Optional: "Later" button (only for soft updates, not forced)

---

## 6. Navigation & User Flow

### App Launch Flow

```
App Open
  │
  ├─ First Launch?
  │     YES → Splash (2.5s) → Onboarding (3 slides) → Notification Permission → Home
  │     NO  → Splash (1.5s) → Check Internet
  │                               │
  │                               ├─ Online  → Check App Version → Main Shell (Home)
  │                               └─ Offline → No Internet Screen
  │
  └─ Deep Link from Notification?
        → Skip splash/onboarding → Navigate to specific URL in WebView
```

### Authentication Flow

```
User taps "Cart" or "Profile" tab
  │
  ├─ WebView loads /cart or /profile
  │
  ├─ Web app detects unauthenticated → redirects to /auth/login
  │
  ├─ User logs in on web login page (inside WebView)
  │
  ├─ Web app fires JavaScript: FlutterBridge.postMessage(JSON.stringify({type: "auth", token: "..."}))
  │
  └─ Flutter receives token → stores in flutter_secure_storage → updates cart badge
```

### Deep Link Flow (from Push Notification)

```
Push Notification received (FCM)
  │
  ├─ App in foreground → Show in-app banner → tap → navigate WebView to URL
  │
  ├─ App in background → Tap notification → open app → navigate WebView to URL
  │
  └─ App killed → Tap notification → launch app → skip onboarding → navigate WebView to URL

Example deep links:
  pricebasket://product/abc-123  → loads /product/abc-123
  pricebasket://alerts           → loads /alerts
  pricebasket://search?q=milk    → loads /search?q=milk
```

---

## 7. Flutter Project Structure

```
flutter_app/
├── android/
│   ├── app/
│   │   ├── src/main/AndroidManifest.xml   # Internet, camera, notification permissions
│   │   ├── google-services.json           # Firebase config (Android)
│   │   └── build.gradle
│   └── build.gradle
│
├── ios/
│   ├── Runner/
│   │   ├── Info.plist                     # NSCameraUsageDescription, deep link schemes
│   │   └── GoogleService-Info.plist       # Firebase config (iOS)
│   └── Podfile
│
├── lib/
│   ├── main.dart
│   ├── app.dart
│   │
│   ├── config/
│   │   ├── app_config.dart        # BASE_URL = "https://pricebasket.in"
│   │   ├── routes.dart
│   │   └── theme.dart             # ThemeData matching web colors
│   │
│   ├── screens/
│   │   ├── splash_screen.dart
│   │   ├── onboarding_screen.dart
│   │   ├── notification_permission_screen.dart
│   │   ├── main_shell.dart        # IndexedStack + BottomNav
│   │   ├── webview_screen.dart    # WebViewController wrapper
│   │   └── no_internet_screen.dart
│   │
│   ├── services/
│   │   ├── fcm_service.dart       # Firebase Cloud Messaging
│   │   ├── deep_link_service.dart # app_links package
│   │   ├── connectivity_service.dart
│   │   └── auth_bridge_service.dart
│   │
│   ├── providers/
│   │   ├── cart_count_provider.dart
│   │   └── connectivity_provider.dart
│   │
│   └── widgets/
│       ├── native_bottom_nav.dart
│       └── update_dialog.dart
│
├── assets/
│   ├── images/
│   └── icons/
│
└── pubspec.yaml
```

---

## 8. Key Flutter Packages Required

### Core WebView
| Package | Version | Purpose |
|---|---|---|
| `webview_flutter` | ^4.x | Official Flutter WebView (Android + iOS) |
| `webview_flutter_android` | ^3.x | Android WebView implementation |
| `webview_flutter_wkwebview` | ^3.x | iOS WKWebView implementation |

### Navigation & State
| Package | Version | Purpose |
|---|---|---|
| `go_router` | ^13.x | Declarative routing for native screens |
| `flutter_riverpod` | ^2.x | State management (cart count, connectivity) |

### Firebase / Notifications
| Package | Version | Purpose |
|---|---|---|
| `firebase_core` | ^2.x | Firebase initialization |
| `firebase_messaging` | ^14.x | FCM push notifications |
| `flutter_local_notifications` | ^16.x | Show notifications when app is in foreground |

### Storage & Security
| Package | Version | Purpose |
|---|---|---|
| `flutter_secure_storage` | ^9.x | Store JWT token securely (Keychain/Keystore) |
| `shared_preferences` | ^2.x | Store onboarding flag, settings |

### Deep Links & URL
| Package | Version | Purpose |
|---|---|---|
| `app_links` | ^6.x | Handle deep links (pricebasket://) |
| `url_launcher` | ^6.x | Open external URLs in system browser |

### UI & UX
| Package | Version | Purpose |
|---|---|---|
| `lottie` | ^3.x | Lottie animations for splash/onboarding |
| `smooth_page_indicator` | ^1.x | Onboarding dot indicators |
| `connectivity_plus` | ^6.x | Network connectivity monitoring |
| `package_info_plus` | ^8.x | Get app version for update checks |

### Analytics (Optional)
| Package | Version | Purpose |
|---|---|---|
| `firebase_analytics` | ^10.x | User analytics |
| `firebase_crashlytics` | ^3.x | Crash reporting |

---

## 9. WebView Integration Strategy

### Cookie & Session Sharing

The web app uses JWT tokens stored in `localStorage` (Zustand `authStore`). The WebView must share the same domain cookies and localStorage as the web session.

**Strategy:**
1. WebView loads `https://pricebasket.in` — the web app handles its own auth via localStorage
2. After login, the web app fires a `JavascriptChannel` message to Flutter with the token
3. Flutter stores the token in `flutter_secure_storage` for future use (e.g., direct API calls if needed)
4. On app restart, if token exists in secure storage, inject it into WebView via `runJavaScript()`:
   ```javascript
   window.localStorage.setItem('auth-storage', JSON.stringify({state: {accessToken: 'TOKEN_HERE'}}));
   ```

### Hiding Web Navigation Elements in App

The web app has its own Header and BottomNav. In the mobile app, we want to:
- **Hide the web BottomNav** (Flutter provides its own native one)
- **Keep the web Header** (or optionally hide it and use Flutter AppBar)

**Implementation:** Inject CSS via `runJavaScript()` after page load:
```javascript
// Hide web bottom nav in app context
document.querySelector('nav.fixed.bottom-0')?.style.setProperty('display', 'none', 'important');
```

OR: Add a URL parameter `?app=1` to all WebView URLs, and in the Next.js app detect this parameter to hide the BottomNav component.

**Recommended approach:** Add `?source=app` query param — cleaner and more maintainable.

### Handling "Shop on Platform" Links

When user taps "Shop on Blinkit" / "Shop on Zepto" etc. in the cart page, these links should open in the **system browser** (not inside the WebView), so the user can complete their purchase on the platform's app/website.

**Implementation in WebView navigation delegate:**
```dart
// Intercept navigation requests
NavigationDecision navigationDecision(NavigationRequest request) {
  final externalDomains = ['blinkit.com', 'zeptonow.com', 'swiggy.com', ...];
  if (externalDomains.any((d) => request.url.contains(d))) {
    launchUrl(Uri.parse(request.url), mode: LaunchMode.externalApplication);
    return NavigationDecision.prevent;
  }
  return NavigationDecision.navigate;
}
```

### Pull-to-Refresh

Wrap WebView in `RefreshIndicator` widget. On refresh:
1. Show loading indicator
2. Call `webViewController.reload()`
3. Hide indicator when page load completes

### Back Button Handling (Android)

```dart
WillPopScope(
  onWillPop: () async {
    if (await webViewController.canGoBack()) {
      webViewController.goBack();
      return false; // Don't pop the Flutter route
    }
    return true; // Exit app
  },
  child: WebViewWidget(controller: webViewController),
)
```

---

## 10. Authentication Bridge (Web ↔ Native)

### Problem
The web app stores auth state in `localStorage` via Zustand. Flutter needs to know if the user is logged in to:
1. Show/hide cart badge count
2. Handle push notification targeting
3. Pre-fill auth on app restart

### Solution: JavaScript Channel Bridge

**Step 1: Register JavaScript Channel in Flutter**
```dart
webViewController.addJavaScriptChannel(
  'FlutterBridge',
  onMessageReceived: (JavaScriptMessage message) {
    final data = jsonDecode(message.message);
    if (data['type'] == 'auth') {
      secureStorage.write(key: 'jwt_token', value: data['token']);
    }
    if (data['type'] == 'cart_count') {
      cartCountNotifier.state = data['count'];
    }
  },
);
```

**Step 2: Add to Next.js Web App**

In `frontend/src/store/authStore.ts` — after successful login:
```typescript
// Notify Flutter app if running inside WebView
if (window.FlutterBridge) {
  window.FlutterBridge.postMessage(JSON.stringify({
    type: 'auth',
    token: accessToken
  }));
}
```

In `frontend/src/store/cartStore.ts` — after cart updates:
```typescript
if (window.FlutterBridge) {
  window.FlutterBridge.postMessage(JSON.stringify({
    type: 'cart_count',
    count: totalItems
  }));
}
```

**Step 3: TypeScript type declaration**
```typescript
// Add to frontend/src/types/index.ts
declare global {
  interface Window {
    FlutterBridge?: {
      postMessage: (message: string) => void;
    };
  }
}
```

---

## 11. Push Notifications

### Setup Requirements
1. **Firebase project** — create at `console.firebase.google.com`
2. **Android:** Download `google-services.json` → place in `android/app/`
3. **iOS:** Download `GoogleService-Info.plist` → place in `ios/Runner/`
4. **iOS APNs:** Upload APNs certificate or key to Firebase console
5. **Backend:** Add FCM server key to backend `.env`

### Notification Types

| Type | Trigger | Deep Link |
|---|---|---|
| Price Alert Triggered | Price drops below user's target | `pricebasket://product/{id}` |
| Price Drop (general) | Significant price drop on watched product | `pricebasket://product/{id}` |
| Cart Reminder | User has items in cart for 24h | `pricebasket://cart` |
| New Deal | Admin pushes promotional notification | `pricebasket://search?q={query}` |

### Backend Changes Required

The backend needs a new endpoint and FCM integration:

**New API endpoint needed:**
```
POST /api/v1/users/fcm-token
Body: { "fcm_token": "..." }
```

**New backend service needed:**
- `backend/app/services/push_notification_service.py`
- Called from `notification_service.py` when price alert triggers

### Notification Payload Format
```json
{
  "notification": {
    "title": "Price Drop Alert! 🎉",
    "body": "Amul Butter 500g is now ₹245 on Blinkit (your target: ₹250)"
  },
  "data": {
    "type": "price_alert",
    "product_id": "uuid-here",
    "deep_link": "pricebasket://product/uuid-here"
  }
}
```

---

## 12. Local Development Setup

### Prerequisites

| Tool | Version | Install |
|---|---|---|
| Flutter SDK | 3.19+ (stable) | `brew install flutter` or flutter.dev |
| Dart SDK | 3.3+ (bundled with Flutter) | Included with Flutter |
| Android Studio | Latest | For Android emulator + SDK |
| Xcode | 15+ | Mac App Store (iOS only) |
| CocoaPods | Latest | `sudo gem install cocoapods` |
| Node.js | 18+ | Already installed (web app) |
| Python | 3.11+ | Already installed (backend) |

### Step-by-Step Local Setup

**1. Install Flutter**
```bash
# macOS (using homebrew)
brew install --cask flutter

# Verify installation
flutter doctor
# All checks should pass (or show only minor warnings)
```

**2. Create Flutter project**
```bash
cd /Users/nikhilmathur1997/Downloads/Pricebaskettest
flutter create flutter_app --org in.pricebasket --project-name pricebasket
cd flutter_app
```

**3. Add dependencies to pubspec.yaml**
```yaml
dependencies:
  flutter:
    sdk: flutter
  webview_flutter: ^4.7.0
  webview_flutter_android: ^3.16.0
  webview_flutter_wkwebview: ^3.13.0
  go_router: ^13.2.0
  flutter_riverpod: ^2.5.1
  firebase_core: ^2.32.0
  firebase_messaging: ^14.9.4
  flutter_local_notifications: ^16.3.3
  flutter_secure_storage: ^9.2.2
  shared_preferences: ^2.2.3
  app_links: ^6.1.1
  url_launcher: ^6.3.0
  connectivity_plus: ^6.0.3
  package_info_plus: ^8.0.0
  lottie: ^3.1.2
  smooth_page_indicator: ^1.1.0

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.0
```

**4. Run on Android emulator**
```bash
# Start Android emulator from Android Studio first, then:
flutter run

# Or specify device
flutter devices
flutter run -d emulator-5554
```

**5. Run on iOS simulator**
```bash
# Open iOS Simulator first, then:
flutter run

# Or specify device
flutter run -d "iPhone 15 Pro"
```

**6. Run against local backend (for testing)**

In `lib/config/app_config.dart`:
```dart
// For local testing, point to local Next.js dev server
// Make sure your phone/emulator can reach your Mac's IP
const String BASE_URL = 'http://192.168.1.x:3000'; // your Mac's local IP

// For production
// const String BASE_URL = 'https://pricebasket.in';
```

> **Note:** iOS simulator can use `localhost` but Android emulator uses `10.0.2.2` for host machine. Physical devices need the Mac's LAN IP.

**7. Firebase local setup**
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Install FlutterFire CLI
dart pub global activate flutterfire_cli

# Configure Firebase for Flutter project
cd flutter_app
flutterfire configure --project=your-firebase-project-id
# This auto-generates google-services.json and GoogleService-Info.plist
```

---

## 13. Production / Live Setup

### Environment Configuration

| Config | Value |
|---|---|
| Production URL | `https://pricebasket.in` |
| Backend API | `https://api.pricebasket.in` or via Next.js proxy |
| Bundle ID (iOS) | `in.pricebasket.app` |
| Application ID (Android) | `in.pricebasket.app` |
| App Name | `PriceBasket` |
| Min Android SDK | API 21 (Android 5.0) |
| Min iOS Version | iOS 13.0 |

### Android Production Setup

**1. Generate signing keystore**
```bash
keytool -genkey -v -keystore pricebasket-release.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias pricebasket
# Store this file SECURELY — never commit to git
```

**2. Configure `android/key.properties`**
```properties
storePassword=YOUR_STORE_PASSWORD
keyPassword=YOUR_KEY_PASSWORD
keyAlias=pricebasket
storeFile=../pricebasket-release.jks
```

**3. Build release APK / AAB**
```bash
# App Bundle (required for Play Store)
flutter build appbundle --release

# APK (for direct distribution)
flutter build apk --release --split-per-abi
```

**Output:** `build/app/outputs/bundle/release/app-release.aab`

### iOS Production Setup

**1. Apple Developer Account** — Required ($99/year)
- Enroll at `developer.apple.com`
- Create App ID: `in.pricebasket.app`
- Create provisioning profiles (Distribution)

**2. Xcode setup**
```bash
cd ios
pod install
open Runner.xcworkspace
# In Xcode: Set Team, Bundle ID, signing certificates
```

**3. Build release IPA**
```bash
flutter build ipa --release
# Or archive from Xcode → Product → Archive
```

**4. Upload to App Store Connect**
```bash
# Using Transporter app or xcrun altool
xcrun altool --upload-app -f build/ios/ipa/pricebasket.ipa \
  -u your@apple.id -p @keychain:AC_PASSWORD
```

### Backend Changes Required for Production

**New API endpoint — FCM token registration:**
```python
# backend/app/api/v1/users.py — add this endpoint
@router.post("/fcm-token")
async def register_fcm_token(
    token_data: FCMTokenSchema,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Store FCM token for push notifications"""
    current_user.fcm_token = token_data.token
    await db.commit()
    return {"status": "ok"}
```

**New API endpoint — App version check:**
```python
# backend/app/api/v1/setup.py — add this endpoint
@router.get("/app/version")
async def get_app_version():
    return {
        "min_version": "1.0.0",
        "latest_version": "1.0.0",
        "force_update": False,
        "update_message": "A new version is available"
    }
```

**New service — Push notification sender:**
```python
# backend/app/services/push_notification_service.py
# Uses firebase-admin SDK to send FCM messages
# Called from notification_service.py when price alert triggers
```

**New backend dependency:**
```
firebase-admin==6.5.0  # Add to requirements.txt
```

### Web App Changes Required for Production

**1. Add `?source=app` detection to hide web BottomNav**

In [`frontend/src/components/BottomNav/index.tsx`](frontend/src/components/BottomNav/index.tsx):
```typescript
// Detect if running inside Flutter WebView
const isFlutterApp = typeof window !== 'undefined' &&
  (window.navigator.userAgent.includes('PriceBasketApp') ||
   new URLSearchParams(window.location.search).get('source') === 'app');

if (isFlutterApp) return null; // Hide web BottomNav
```

**2. Add FlutterBridge type declarations**

In [`frontend/src/types/index.ts`](frontend/src/types/index.ts):
```typescript
declare global {
  interface Window {
    FlutterBridge?: {
      postMessage: (message: string) => void;
    };
  }
}
```

**3. Fire bridge events after auth**

In [`frontend/src/store/authStore.ts`](frontend/src/store/authStore.ts) — after `setAccessToken`:
```typescript
// Notify Flutter shell about auth token
if (typeof window !== 'undefined' && window.FlutterBridge) {
  window.FlutterBridge.postMessage(JSON.stringify({
    type: 'auth',
    token: token,
    user_id: user?.id
  }));
}
```

**4. Fire bridge events on cart update**

In [`frontend/src/store/cartStore.ts`](frontend/src/store/cartStore.ts) — after cart mutations:
```typescript
if (typeof window !== 'undefined' && window.FlutterBridge) {
  window.FlutterBridge.postMessage(JSON.stringify({
    type: 'cart_count',
    count: get().totalItems
  }));
}
```

---

## 14. CI/CD Pipeline

### GitHub Actions — Flutter Build

**File:** `.github/workflows/flutter-build.yml`

```yaml
name: Flutter Build

on:
  push:
    branches: [main]
    paths: ['flutter_app/**']

jobs:
  build-android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with: { java-version: '17', distribution: 'temurin' }
      - uses: subosito/flutter-action@v2
        with: { flutter-version: '3.19.0', channel: 'stable' }
      - run: cd flutter_app && flutter pub get
      - run: cd flutter_app && flutter build appbundle --release
      - uses: actions/upload-artifact@v4
        with:
          name: android-release
          path: flutter_app/build/app/outputs/bundle/release/

  build-ios:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: subosito/flutter-action@v2
        with: { flutter-version: '3.19.0', channel: 'stable' }
      - run: cd flutter_app && flutter pub get
      - run: cd flutter_app/ios && pod install
      - run: cd flutter_app && flutter build ios --release --no-codesign
```

### Play Store Deployment (via Fastlane)

```bash
# Install Fastlane
gem install fastlane

# Initialize in android folder
cd flutter_app/android
fastlane init

# Deploy to Play Store internal track
fastlane supply --aab ../build/app/outputs/bundle/release/app-release.aab \
  --track internal \
  --json_key path/to/service-account.json \
  --package_name in.pricebasket.app
```

### App Store Deployment (via Fastlane)

```bash
cd flutter_app/ios
fastlane pilot upload --ipa ../build/ios/ipa/pricebasket.ipa
```

---

## 15. App Store Submission Checklist

### Google Play Store

- [ ] Google Play Developer account ($25 one-time fee)
- [ ] App Bundle (`.aab`) built with release signing
- [ ] App icon: 512×512 PNG (no alpha)
- [ ] Feature graphic: 1024×500 PNG
- [ ] Screenshots: Phone (min 2), Tablet (optional)
- [ ] Short description (80 chars max)
- [ ] Full description (4000 chars max)
- [ ] Privacy Policy URL (required — host at `pricebasket.in/privacy`)
- [ ] Content rating questionnaire completed
- [ ] Target audience: 18+ (financial/shopping)
- [ ] Data safety form filled (what data is collected)
- [ ] App category: Shopping
- [ ] Release to Internal Testing → Closed Testing → Production

### Apple App Store

- [ ] Apple Developer Program ($99/year)
- [ ] App Store Connect app record created
- [ ] Bundle ID registered: `in.pricebasket.app`
- [ ] App icon: 1024×1024 PNG (no alpha, no rounded corners — Apple adds them)
- [ ] Screenshots: iPhone 6.7" (required), iPhone 5.5", iPad (if supporting)
- [ ] App Preview video (optional but recommended)
- [ ] Privacy Policy URL (required)
- [ ] App description + keywords
- [ ] Age rating: 4+ or 12+ (Shopping)
- [ ] App Review Information: test account credentials for reviewer
- [ ] Export compliance (uses HTTPS — standard encryption, answer "No" to export compliance)
- [ ] Submit for review (typically 1-3 days)

### Required Assets to Create

| Asset | Size | Format | Notes |
|---|---|---|---|
| App Icon (Android) | 512×512 | PNG | No transparency |
| App Icon (iOS) | 1024×1024 | PNG | No transparency, no rounded corners |
| Splash logo | 288×288 | PNG | White version on orange bg |
| Onboarding illustrations | 800×600 | PNG/SVG | 3 images |
| Play Store feature graphic | 1024×500 | PNG/JPG | Banner image |
| Screenshots (Android) | 1080×1920 | PNG | Min 2, max 8 |
| Screenshots (iOS 6.7") | 1290×2796 | PNG | Min 3 |
| Notification icon | 96×96 | PNG | White on transparent |

---

## 16. What's Missing / Gaps to Fill

### Web App Gaps (Must fix before app launch)

| Gap | Priority | Description | File to Create/Edit |
|---|---|---|---|
| `/orders` page | HIGH | Saved orders page — linked from Header but missing | `frontend/src/app/orders/page.tsx` |
| FlutterBridge events | HIGH | Fire JS events to Flutter on auth + cart changes | `authStore.ts`, `cartStore.ts` |
| `?source=app` detection | HIGH | Hide web BottomNav when loaded in Flutter WebView | `BottomNav/index.tsx` |
| Custom User-Agent detection | HIGH | Detect `PriceBasketApp` UA in web app | `middleware.ts` or layout |
| `/privacy` page | MEDIUM | Privacy policy (required for app stores) | `frontend/src/app/privacy/page.tsx` |
| `/terms` page | MEDIUM | Terms of service | `frontend/src/app/terms/page.tsx` |
| `/notifications` page | MEDIUM | In-app notification history | `frontend/src/app/notifications/page.tsx` |
| `/about` page | LOW | About PriceBasket | `frontend/src/app/about/page.tsx` |
| `/faq` page | LOW | Help / FAQ | `frontend/src/app/faq/page.tsx` |

### Backend Gaps (Must add for app features)

| Gap | Priority | Description | File |
|---|---|---|---|
| FCM token endpoint | HIGH | `POST /api/v1/users/fcm-token` | `backend/app/api/v1/users.py` |
| Push notification service | HIGH | Send FCM messages when price alert triggers | `backend/app/services/push_notification_service.py` |
| App version endpoint | MEDIUM | `GET /api/v1/app/version` | `backend/app/api/v1/setup.py` |
| firebase-admin dependency | HIGH | Required for FCM server-side | `backend/requirements.txt` |
| FCM token field on User model | HIGH | Store FCM token per user | `backend/app/models/user.py` |

### Flutter App Gaps (New files to create)

| Gap | Priority | Description |
|---|---|---|
| App icons | HIGH | Design and export all icon sizes |
| Onboarding illustrations | HIGH | 3 custom illustrations or use Lottie animations |
| Splash animation | MEDIUM | Lottie or simple fade animation |
| Firebase project setup | HIGH | Create Firebase project, download config files |
| Deep link scheme config | HIGH | Configure `pricebasket://` URL scheme in AndroidManifest + Info.plist |
| APNs certificate | HIGH | Required for iOS push notifications |
| Play Store listing assets | HIGH | Screenshots, feature graphic, description |
| App Store listing assets | HIGH | Screenshots, description, keywords |

---

## 17. Implementation Phases

### Phase 1 — Foundation (Week 1-2)
**Goal:** Flutter app shell running with WebView loading pricebasket.in

- [ ] Set up Flutter project (`flutter create`)
- [ ] Add all dependencies to `pubspec.yaml`
- [ ] Create `AppConfig` with BASE_URL
- [ ] Build `SplashScreen` (native, branded)
- [ ] Build `MainShell` with `IndexedStack` + native `BottomNav`
- [ ] Build `WebViewScreen` with basic WebView loading pricebasket.in
- [ ] Configure URL interception (external platform links → system browser)
- [ ] Android back button handling (WebView history)
- [ ] Pull-to-refresh on WebView
- [ ] Test on Android emulator + iOS simulator

**Deliverable:** App opens, loads pricebasket.in, bottom nav switches tabs, external links open in browser

---

### Phase 2 — Native UX (Week 2-3)
**Goal:** Complete native screens and onboarding

- [ ] Build `OnboardingScreen` (3 slides with smooth_page_indicator)
- [ ] Build `NotificationPermissionScreen`
- [ ] Build `NoInternetScreen` with retry logic
- [ ] Implement `SharedPreferences` for onboarding completion flag
- [ ] Implement `connectivity_plus` for network monitoring
- [ ] App launch flow logic (first time vs returning user)
- [ ] App update check screen (optional)

**Deliverable:** Full onboarding flow, offline handling, proper first-launch experience

---

### Phase 3 — Auth Bridge (Week 3)
**Goal:** Flutter knows when user is logged in; cart badge works

- [ ] Add `JavascriptChannel` `FlutterBridge` to WebView
- [ ] Implement `AuthBridgeService` in Flutter
- [ ] Store JWT in `flutter_secure_storage`
- [ ] Update web `authStore.ts` to fire `FlutterBridge` events on login/logout
- [ ] Update web `cartStore.ts` to fire `FlutterBridge` events on cart changes
- [ ] Show cart count badge on native BottomNav
- [ ] Add `?source=app` detection to web BottomNav (hide web nav in app)
- [ ] Add `PriceBasketApp` custom User-Agent to WebView

**Deliverable:** Cart badge updates in real-time, web BottomNav hidden in app context

---

### Phase 4 — Push Notifications (Week 4)
**Goal:** Users receive price drop alerts as push notifications

- [ ] Create Firebase project
- [ ] Add `google-services.json` (Android) + `GoogleService-Info.plist` (iOS)
- [ ] Implement `FCMService` in Flutter
- [ ] Register FCM token with backend on app launch
- [ ] Add `POST /api/v1/users/fcm-token` endpoint to backend
- [ ] Add `firebase-admin` to backend requirements
- [ ] Build `PushNotificationService` in backend
- [ ] Wire price alert trigger → FCM push notification
- [ ] Handle notification tap → deep link → WebView navigation
- [ ] Configure deep link scheme `pricebasket://` in AndroidManifest + Info.plist
- [ ] Test end-to-end: set alert → price drops → receive notification → tap → open product

**Deliverable:** Full push notification flow working on both platforms

---

### Phase 5 — Web App Gaps (Week 4-5)
**Goal:** Fill missing web pages needed for app completeness

- [ ] Create `/orders` page (saved orders)
- [ ] Create `/privacy` page (required for app stores)
- [ ] Create `/terms` page (required for app stores)
- [ ] Create `/notifications` page (notification history)
- [ ] Add `FlutterBridge` type declarations to TypeScript
- [ ] Test all web pages in WebView context

**Deliverable:** All app-required web pages exist and work in WebView

---

### Phase 6 — Polish & Assets (Week 5-6)
**Goal:** App store ready

- [ ] Design and export app icons (all sizes)
- [ ] Create onboarding illustrations (or source Lottie animations)
- [ ] Create splash screen animation
- [ ] Create notification icon (white on transparent)
- [ ] Take screenshots on real devices (Android + iOS)
- [ ] Create Play Store feature graphic
- [ ] Write app store descriptions + keywords
- [ ] Performance testing (WebView load time, memory usage)
- [ ] Accessibility testing (font scaling, screen readers)
- [ ] Test on multiple device sizes (small phone, large phone, tablet)

**Deliverable:** All assets ready, app polished and performant

---

### Phase 7 — Release (Week 6-7)
**Goal:** Live on both app stores

**Android:**
- [ ] Generate release keystore
- [ ] Build signed `.aab`
- [ ] Create Play Store listing
- [ ] Upload to Internal Testing track
- [ ] Test on real Android devices
- [ ] Promote to Production

**iOS:**
- [ ] Configure signing in Xcode
- [ ] Build release `.ipa`
- [ ] Create App Store Connect listing
- [ ] Submit for TestFlight
- [ ] Test on real iOS devices
- [ ] Submit for App Store review
- [ ] Respond to review feedback if any

**Deliverable:** App live on Google Play Store + Apple App Store

---

## Summary Table

### Pages Overview

| # | Screen | Type | URL / Notes |
|---|---|---|---|
| 1 | Splash | Native Flutter | Brand animation, 2.5s |
| 2 | Onboarding | Native Flutter | 3 slides, shown once |
| 3 | Notification Permission | Native Flutter | iOS only |
| 4 | No Internet | Native Flutter | Offline fallback |
| 5 | App Update | Native Flutter | Optional force-update gate |
| 6 | Home | WebView | `pricebasket.in/` |
| 7 | Search | WebView | `pricebasket.in/search` |
| 8 | Product Detail | WebView | `pricebasket.in/product/[id]` |
| 9 | Cart | WebView | `pricebasket.in/cart` |
| 10 | Profile | WebView | `pricebasket.in/profile` |
| 11 | Price Alerts | WebView | `pricebasket.in/alerts` |
| 12 | Login | WebView | `pricebasket.in/auth/login` |
| 13 | Signup | WebView | `pricebasket.in/auth/signup` |
| 14 | Orders | WebView | `pricebasket.in/orders` ⚠️ needs building |
| 15 | Notifications | WebView | `pricebasket.in/notifications` ⚠️ needs building |
| 16 | Privacy Policy | WebView | `pricebasket.in/privacy` ⚠️ needs building |
| 17 | Terms | WebView | `pricebasket.in/terms` ⚠️ needs building |

### Tech Stack Summary

| Layer | Technology |
|---|---|
| Mobile Framework | Flutter 3.19+ (Dart) |
| WebView Engine | `webview_flutter` (WKWebView on iOS, WebView on Android) |
| State Management | Riverpod 2.x |
| Navigation | go_router 13.x |
| Push Notifications | Firebase Cloud Messaging (FCM) |
| Secure Storage | flutter_secure_storage (Keychain/Keystore) |
| Deep Links | app_links |
| Web App | Next.js 14 (already live) |
| Backend | FastAPI + PostgreSQL (already live) |
| Hosting | Vercel (frontend) + Render (backend) |

---

*Document created: May 2026 | Last updated: May 2026*
*Author: PriceBasket Engineering*

---

## 19. Local Emulator Testing Guide (No App Store / Play Store Needed)

> **Cost: ₹0** — Everything below is completely free. App Store ($99/yr) and Play Store ($25 one-time) are only needed when publishing publicly, NOT for development or testing.

### How It Works — Big Picture

```
Your Mac
  ├── Android Studio  →  Android Emulator (virtual Pixel phone on your screen)
  ├── Xcode           →  iOS Simulator (virtual iPhone on your screen)
  └── Terminal        →  flutter run  →  installs & hot-reloads on BOTH simultaneously
```

You can run the app on **both emulators at the same time** and see every code change reflected live in under 1 second.

---

### What Your Screen Looks Like During Development

```
┌──────────────────────────────────────────────────────────────────────┐
│  Your Mac Desktop                                                    │
│                                                                      │
│  ┌──────────────┐   ┌──────────────┐   ┌────────────────────────┐  │
│  │              │   │              │   │  Terminal / VS Code    │  │
│  │  Android     │   │  iOS         │   │                        │  │
│  │  Emulator    │   │  Simulator   │   │  $ flutter run         │  │
│  │  (Pixel 8)   │   │  (iPhone 15) │   │  Launching on 2 devs  │  │
│  │              │   │              │   │  Hot reload active...  │  │
│  │  [app live]  │   │  [app live]  │   │  Press r to reload     │  │
│  │              │   │              │   │  Press R to restart    │  │
│  └──────────────┘   └──────────────┘   └────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

---

### Step 1 — Install Android Studio + Create Android Emulator

**1. Download Android Studio (free)**
→ https://developer.android.com/studio

**2. After install: More Actions → Virtual Device Manager → + Create Device**
- Device: **Pixel 8**
- System Image: **API 34 (Android 14)** — click Download if not present
- Click Finish

**3. Click ▶️ Play** next to the device → Android phone window opens on your Mac

---

### Step 2 — Install Xcode + iOS Simulator

**1. Mac App Store → search "Xcode" → Install** (free, ~15 GB, takes ~30 min)

**2. After install, run in Terminal:**
```bash
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -runFirstLaunch
```

**3. Open iOS Simulator:**
```bash
open -a Simulator
# Then in Simulator menu: File → Open Simulator → iPhone 15 Pro
```

---

### Step 3 — Install Flutter

```bash
# Install Flutter via Homebrew (already installed on your Mac)
brew install --cask flutter

# Verify everything is correctly set up
flutter doctor
```

`flutter doctor` shows a checklist — everything should be ✅ green. Any ❌ red item shows the exact command to fix it.

---

### Step 4 — Run on Both Emulators Simultaneously

```bash
# See all available devices
flutter devices

# Example output:
# iPhone 15 Pro (simulator) • ios-simulator • iOS 17.0
# Pixel 8 API 34 (emulator) • android-x86  • Android 14

# Run on Android only
flutter run -d emulator-5554

# Run on iOS only
flutter run -d "iPhone 15 Pro"

# Run on BOTH at the same time (open 2 terminal tabs)
# Tab 1:
flutter run -d emulator-5554
# Tab 2:
flutter run -d "iPhone 15 Pro"
```

---

### Step 5 — Hot Reload (See Changes Instantly)

While `flutter run` is active in the terminal:

| Key | Action | Speed |
|---|---|---|
| `r` | **Hot Reload** — updates UI, keeps app state | < 1 second |
| `R` | **Hot Restart** — full restart, resets state | ~3 seconds |
| `q` | Quit | — |

Change a color → press `r` → both emulators update instantly. No rebuild needed.

---

### Step 6 — WebView Points to pricebasket.in

Since the app is a WebView shell loading `https://pricebasket.in`, the emulators use your Mac's WiFi to load the live production site. **No local server is needed for the web content.**

| Scenario | URL in WebView |
|---|---|
| Testing against production | `https://pricebasket.in` |
| Testing against local Next.js (port 3000) on Android emulator | `http://10.0.2.2:3000` |
| Testing against local Next.js (port 3000) on iOS simulator | `http://localhost:3000` |

---

### Pre-Flight Checklist Before We Start Coding

| # | Task | Tool | Status |
|---|---|---|---|
| 1 | Install Android Studio | https://developer.android.com/studio | ⬜ |
| 2 | Create Pixel 8 virtual device (API 34) | Android Studio → Virtual Device Manager | ⬜ |
| 3 | Install Xcode from Mac App Store | Mac App Store (free, ~15GB) | ⬜ |
| 4 | Run `sudo xcodebuild -runFirstLaunch` | Terminal | ⬜ |
| 5 | Install Flutter: `brew install --cask flutter` | Terminal | ⬜ |
| 6 | Run `flutter doctor` — all green | Terminal | ⬜ |
| 7 | Start Android emulator (Pixel 8) | Android Studio | ⬜ |
| 8 | Start iOS Simulator (iPhone 15 Pro) | Terminal: `open -a Simulator` | ⬜ |
| 9 | Run `flutter devices` — see both listed | Terminal | ⬜ |

Once all 9 steps are done and `flutter doctor` shows all ✅, we are ready to start building the app and you will see it live on both emulators as each screen is created.

---

## 18. Screen Wireframes & Visual Reference

> All screens shown at 390×844px (iPhone 14 Pro equivalent). Android renders identically with system status bar.

---

### Screen 1 — Splash Screen

```
┌─────────────────────────────────┐
│  9:41 AM          ●●●  WiFi 🔋  │  ← system status bar
│                                 │
│                                 │
│                                 │
│                                 │
│                                 │
│                                 │
│         ┌───────────┐           │
│         │  🧺  ███  │           │  ← PriceBasket logo (white)
│         │  ███████  │           │
│         └───────────┘           │
│                                 │
│        PriceBasket              │  ← white bold text
│                                 │
│    Compare · Save · Smart       │  ← white small tagline
│                                 │
│                                 │
│                                 │
│                                 │
│                                 │
│                                 │
│                                 │
│                                 │
│                                 │
└─────────────────────────────────┘
  Background: #FC5A01 (brand orange)
  Duration: 2.5 seconds → auto-navigate
```

---

### Screen 2 — Onboarding (Slide 1 of 3)

```
┌─────────────────────────────────┐
│  9:41 AM          ●●●  WiFi 🔋  │
│                              Skip│  ← top-right skip button
│                                 │
│   ┌─────────────────────────┐   │
│   │                         │   │
│   │   🏷️  ₹245   ₹249  ₹252 │   │
│   │   [Blinkit][Zepto][Inst]│   │  ← colorful platform price
│   │        illustration     │   │     tag illustration
│   │                         │   │
│   └─────────────────────────┘   │
│                                 │
│  Compare 10 Platforms           │  ← bold headline
│  Instantly                      │
│                                 │
│  Blinkit · Zepto · Instamart    │  ← subtitle text (gray)
│  BigBasket · Amazon & more      │
│                                 │
│                                 │
│          ●  ○  ○                │  ← dot indicators (orange active)
│                                 │
│   ┌─────────────────────────┐   │
│   │         Next →          │   │  ← orange button
│   └─────────────────────────┘   │
│                                 │
└─────────────────────────────────┘
```

---

### Screen 3 — Onboarding (Slide 2 of 3)

```
┌─────────────────────────────────┐
│  9:41 AM          ●●●  WiFi 🔋  │
│                              Skip│
│                                 │
│   ┌─────────────────────────┐   │
│   │                         │   │
│   │      💰 Save ₹340       │   │
│   │    ████████████████     │   │  ← savings illustration
│   │    Cheapest: Blinkit    │   │
│   │    ████████████         │   │
│   │                         │   │
│   └─────────────────────────┘   │
│                                 │
│  Save Up to 40%                 │  ← bold headline
│  Every Order                    │
│                                 │
│  We find the cheapest platform  │  ← subtitle (gray)
│  for your exact cart            │
│                                 │
│                                 │
│          ○  ●  ○                │  ← dot 2 active
│                                 │
│   ┌─────────────────────────┐   │
│   │         Next →          │   │
│   └─────────────────────────┘   │
│                                 │
└─────────────────────────────────┘
```

---

### Screen 4 — Onboarding (Slide 3 of 3)

```
┌─────────────────────────────────┐
│  9:41 AM          ●●●  WiFi 🔋  │
│                              Skip│
│                                 │
│   ┌─────────────────────────┐   │
│   │                         │   │
│   │         🔔              │   │
│   │    ┌──────────────┐     │   │  ← bell + notification card
│   │    │ Price Drop!  │     │   │
│   │    │ Amul Butter  │     │   │
│   │    │ ₹245 → ₹220  │     │   │
│   │    └──────────────┘     │   │
│   │                         │   │
│   └─────────────────────────┘   │
│                                 │
│  Never Miss a Deal              │  ← bold headline
│                                 │
│  Set price alerts and get       │  ← subtitle (gray)
│  notified when prices drop      │
│                                 │
│                                 │
│          ○  ○  ●                │  ← dot 3 active
│                                 │
│   ┌─────────────────────────┐   │
│   │      Get Started 🎉     │   │  ← orange button
│   └─────────────────────────┘   │
│                                 │
└─────────────────────────────────┘
```

---

### Screen 5 — Notification Permission (iOS)

```
┌─────────────────────────────────┐
│  9:41 AM          ●●●  WiFi 🔋  │
│                                 │
│                                 │
│                                 │
│              🔔                 │  ← large bell icon (orange)
│                                 │
│   Stay Ahead of Price Drops     │  ← bold headline
│                                 │
│   Allow notifications to get    │  ← body text (gray)
│   instant alerts when prices    │
│   fall below your target        │
│                                 │
│                                 │
│   ┌─────────────────────────┐   │
│   │   Allow Notifications   │   │  ← orange primary button
│   └─────────────────────────┘   │
│                                 │
│         Maybe Later             │  ← text link (gray)
│                                 │
│                                 │
│  ┌──────────────────────────────┐│
│  │ "PriceBasket" Would Like to  ││  ← iOS system dialog
│  │ Send You Notifications       ││   (appears on top)
│  │ [Don't Allow]  [Allow]       ││
│  └──────────────────────────────┘│
└─────────────────────────────────┘
```

---

### Screen 6 — Home Tab (WebView)

```
┌─────────────────────────────────┐
│  9:41 AM          ●●●  WiFi 🔋  │
├─────────────────────────────────┤
│ 🧺 PriceBasket  📍 Mumbai  🔍  │  ← web Header (sticky)
│ ┌─────────────────────────────┐ │
│ │ [Search products...]        │ │  ← search bar (mobile)
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│                                 │
│ ┌─────────────────────────────┐ │
│ │  ██████████████████████████ │ │
│ │  Compare 10 platforms       │ │  ← orange hero banner
│ │  Blinkit · Zepto · more     │ │
│ │  📍 Mumbai  [Change]        │ │
│ │  ⚡10-min  🏪10 platforms   │ │
│ └─────────────────────────────┘ │
│                                 │
│ [Blinkit][Zepto][Inst][BB][Flip]│  ← platform logo strip
│                                 │
│ 🥦  🥛  🍿  🍞  🏠  💄  🐔    │  ← category grid (4 cols)
│ Veg Dairy Snack Bake Home Care  │
│                                 │
│ ── Trending Now ──              │
│ ┌──────┐ ┌──────┐ ┌──────┐     │
│ │ img  │ │ img  │ │ img  │     │  ← product cards
│ │Amul  │ │Bread │ │Eggs  │     │
│ │₹245  │ │₹35   │ │₹89   │     │
│ └──────┘ └──────┘ └──────┘     │
│                                 │
├─────────────────────────────────┤
│  🏠      🔍      🛒³     👤    │  ← NATIVE Flutter BottomNav
│ Home   Search   Cart    Me      │   (web BottomNav hidden)
└─────────────────────────────────┘
```

---

### Screen 7 — Search Tab (WebView)

```
┌─────────────────────────────────┐
│  9:41 AM          ●●●  WiFi 🔋  │
├─────────────────────────────────┤
│ 🧺 PriceBasket  📍 Mumbai       │
│ ┌─────────────────────────────┐ │
│ │ 🔍 Search "milk"          ✕ │ │  ← active search
│ └─────────────────────────────┘ │
│ [All] [Dairy] [Snacks] [Fruits] │  ← filter chips
├─────────────────────────────────┤
│ 24 results for "milk"           │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ [img] Amul Full Cream Milk  │ │
│ │       500ml                 │ │  ← product row
│ │       From ₹28 · 4 stores  │ │
│ │                    [+ Add]  │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ [img] Mother Dairy Milk     │ │
│ │       1L                    │ │
│ │       From ₹62 · 6 stores  │ │
│ │                    [+ Add]  │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ [img] Nandini Milk 500ml    │ │
│ │       From ₹24 · 3 stores  │ │
│ │                    [+ Add]  │ │
│ └─────────────────────────────┘ │
│                                 │
├─────────────────────────────────┤
│  🏠      🔍●     🛒³     👤    │  ← Search tab active
│ Home   Search   Cart    Me      │
└─────────────────────────────────┘
```

---

### Screen 8 — Product Detail (WebView)

```
┌─────────────────────────────────┐
│  9:41 AM          ●●●  WiFi 🔋  │
├─────────────────────────────────┤
│ ← Back    Amul Butter           │
├─────────────────────────────────┤
│                                 │
│   ┌─────────────────────────┐   │
│   │                         │   │
│   │      [product image]    │   │  ← large product image
│   │                         │   │
│   └─────────────────────────┘   │
│                                 │
│  Amul Butter 500g               │  ← product name
│  Amul · 500g                    │  ← brand · unit
│                                 │
│  ── Price Comparison ──         │
│  ┌──────────┐  ┌──────────┐     │
│  │ 🟢Blinkit│  │ 🟣Zepto  │     │
│  │  ₹245    │  │  ₹249    │     │  ← platform price grid
│  │ CHEAPEST │  │  10 min  │     │
│  │  12 min  │  │          │     │
│  └──────────┘  └──────────┘     │
│  ┌──────────┐  ┌──────────┐     │
│  │🟠Instamart│  │🟩BigBskt │     │
│  │  ₹252    │  │  ₹248    │     │
│  │  15 min  │  │  30 min  │     │
│  └──────────┘  └──────────┘     │
│                                 │
│  🔔 Set Price Alert             │  ← alert button
│                                 │
│  ┌─────────────────────────┐    │
│  │      + Add to Cart      │    │  ← orange CTA
│  └─────────────────────────┘    │
├─────────────────────────────────┤
│  🏠      🔍      🛒³     👤    │
│ Home   Search   Cart    Me      │
└─────────────────────────────────┘
```

---

### Screen 9 — Cart Tab (WebView)

```
┌─────────────────────────────────┐
│  9:41 AM          ●●●  WiFi 🔋  │
├─────────────────────────────────┤
│ 🧺 PriceBasket           Cart   │
├─────────────────────────────────┤
│ My Cart  [3 items]              │
│ 💰 Save ₹34 by choosing Blinkit │  ← savings banner (green)
│                                 │
│ ── Items & Platform Prices ──   │
│ ┌─────────────────────────────┐ │
│ │[img] Amul Butter 500g       │ │
│ │      Amul · 500g            │ │
│ │      ₹245 each    [-] 2 [+] │ │  ← qty control
│ │ ─────────────────────────── │ │
│ │ Price on all platforms:     │ │
│ │ [Blinkit ₹245✓][Zepto ₹249] │ │  ← per-item platform grid
│ │ [Instamart ₹252][BB ₹248]   │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │[img] Bread 400g             │ │
│ │      ₹35 each     [-] 1 [+] │ │
│ └─────────────────────────────┘ │
│                                 │
│ ── Where to Buy — Full Cart ──  │
│ ┌─────────────────────────────┐ │
│ │ 🟢 Blinkit    CHEAPEST      │ │
│ │ Subtotal ₹525 + Free del.   │ │
│ │ Total: ₹525                 │ │
│ │ [  Shop on Blinkit →  ]     │ │  ← opens system browser
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│  🏠      🔍      🛒●3    👤    │  ← Cart tab active + badge
│ Home   Search   Cart    Me      │
└─────────────────────────────────┘
```

---

### Screen 10 — Me / Profile Tab (WebView)

```
┌─────────────────────────────────┐
│  9:41 AM          ●●●  WiFi 🔋  │
├─────────────────────────────────┤
│ 🧺 PriceBasket                  │
├─────────────────────────────────┤
│                                 │
│  ┌──────────────────────────┐   │
│  │ [Avatar]  Nikhil Mathur  │   │
│  │           nikhil@...     │   │  ← profile card
│  │  📧 Account  🛡️ Admin    │   │
│  │  📅 Joined May 2024      │   │
│  └──────────────────────────┘   │
│                                 │
│  ── Personal Details ──         │
│  Full Name  [Nikhil Mathur    ] │
│  Mobile     [+91 98xxxxxxxx   ] │
│  City        [Mumbai          ] │
│  Pincode     [400001          ] │
│                                 │
│  ┌──────────────────────────┐   │
│  │  💾 Save Profile         │   │  ← orange save button
│  └──────────────────────────┘   │
│                                 │
│  ── Quick Links ──              │
│  🔔 Price Alerts          →     │
│  📦 Saved Orders          →     │
│  🔒 Sign Out                    │
│                                 │
├─────────────────────────────────┤
│  🏠      🔍      🛒³     👤●   │  ← Me tab active
│ Home   Search   Cart    Me      │
└─────────────────────────────────┘
```

---

### Screen 11 — Price Alerts (WebView)

```
┌─────────────────────────────────┐
│  9:41 AM          ●●●  WiFi 🔋  │
├─────────────────────────────────┤
│ 🧺 PriceBasket                  │
├─────────────────────────────────┤
│                                 │
│  🔔 Price Alerts                │
│  2 active · 1 triggered         │
│                                 │
│  ── Watching (2) ──             │
│  ┌──────────────────────────┐   │
│  │[img] Amul Butter 500g    │   │
│  │      Amul · 500g         │   │
│  │      Target: ₹230  🔔    │   │  ← watching badge (amber)
│  │      Set on 12 May 2024  │   │
│  │      View product →   🗑️ │   │
│  └──────────────────────────┘   │
│  ┌──────────────────────────┐   │
│  │[img] Eggs 6-pack         │   │
│  │      Target: ₹55   🔔    │   │
│  │      Set on 15 May 2024  │   │
│  │      View product →   🗑️ │   │
│  └──────────────────────────┘   │
│                                 │
│  ── Triggered (1) ──            │
│  ┌──────────────────────────┐   │
│  │[img] Bread 400g          │   │
│  │      Target: ₹32  ✅     │   │  ← triggered badge (green)
│  │      Triggered 20 May    │   │
│  │      View product →   🗑️ │   │
│  └──────────────────────────┘   │
│                                 │
├─────────────────────────────────┤
│  🏠      🔍      🛒³     👤●   │
│ Home   Search   Cart    Me      │
└─────────────────────────────────┘
```

---

### Screen 12 — Login (WebView)

```
┌─────────────────────────────────┐
│  9:41 AM          ●●●  WiFi 🔋  │
├─────────────────────────────────┤
│                                 │
│                                 │
│       🧺 PriceBasket            │  ← logo centered
│                                 │
│  ┌──────────────────────────┐   │
│  │  Sign in                 │   │
│  │  Compare prices across   │   │
│  │  all platforms           │   │
│  │                          │   │
│  │  Email                   │   │
│  │  ┌────────────────────┐  │   │
│  │  │ you@example.com    │  │   │  ← email input
│  │  └────────────────────┘  │   │
│  │                          │   │
│  │  Password                │   │
│  │  ┌────────────────────┐  │   │
│  │  │ ••••••••       👁️  │  │   │  ← password input
│  │  └────────────────────┘  │   │
│  │                          │   │
│  │  ┌────────────────────┐  │   │
│  │  │      Sign In       │  │   │  ← orange button
│  │  └────────────────────┘  │   │
│  │                          │   │
│  │  Don't have an account?  │   │
│  │  Sign up                 │   │  ← orange link
│  └──────────────────────────┘   │
│                                 │
│  (No BottomNav on auth pages)   │
└─────────────────────────────────┘
```

---

### Screen 13 — No Internet (Native)

```
┌─────────────────────────────────┐
│  9:41 AM          ●●●  ✕WiFi 🔋 │
│                                 │
│                                 │
│                                 │
│                                 │
│              📶✕                │  ← wifi-off icon (large, gray)
│                                 │
│   No Internet Connection        │  ← bold headline
│                                 │
│   Please check your connection  │  ← gray body text
│   and try again                 │
│                                 │
│                                 │
│   ┌─────────────────────────┐   │
│   │       🔄 Retry          │   │  ← orange retry button
│   └─────────────────────────┘   │
│                                 │
│                                 │
│                                 │
│                                 │
│                                 │
└─────────────────────────────────┘
  Background: white
  No BottomNav shown
```

---

### Screen 14 — Push Notification (System)

```
┌─────────────────────────────────┐
│  9:41 AM          ●●●  WiFi 🔋  │
│                                 │
│  ┌──────────────────────────┐   │
│  │ 🧺 PriceBasket      now  │   │
│  │ Price Drop Alert! 🎉     │   │  ← push notification banner
│  │ Amul Butter 500g is now  │   │
│  │ ₹220 on Blinkit          │   │
│  │ (your target was ₹230)   │   │
│  └──────────────────────────┘   │
│                                 │
│  [whatever screen was open]     │
│                                 │
│  Tap notification               │
│       ↓                         │
│  App opens product page         │
│  pricebasket.in/product/xxx     │
│                                 │
└─────────────────────────────────┘
```

---

### Navigation Flow Diagram

```
                    ┌─────────────┐
                    │   App Open  │
                    └──────┬──────┘
                           │
              ┌────────────▼────────────┐
              │      First Launch?      │
              └────────┬────────┬───────┘
                    YES│        │NO
                       │        │
              ┌────────▼──┐  ┌──▼──────────────┐
              │  Splash   │  │  Splash (1.5s)  │
              │  (2.5s)   │  └──────┬──────────┘
              └────┬──────┘         │
                   │         ┌──────▼──────┐
              ┌────▼──────┐  │  Internet?  │
              │ Onboarding│  └──┬───────┬──┘
              │ (3 slides)│  YES│       │NO
              └────┬──────┘     │  ┌────▼────────┐
                   │            │  │ No Internet │
              ┌────▼──────┐     │  │   Screen    │
              │  Notif.   │     │  └─────────────┘
              │Permission │     │
              └────┬──────┘     │
                   │            │
              ┌────▼────────────▼────┐
              │     Main Shell       │
              │  ┌──────────────┐    │
              │  │  WebView     │    │
              │  │  (IndexedStack)   │
              │  └──────────────┘    │
              │  [Home][Search][Cart][Me]│
              └──────────────────────┘
```

---

### Color Reference

| Element | Color | Hex |
|---|---|---|
| Brand Orange (primary) | Orange | `#FC5A01` |
| Brand Orange (dark) | Dark Orange | `#ea580c` |
| Blinkit | Green | `#0C831F` |
| Zepto | Purple | `#8025FB` |
| Instamart | Orange | `#FC8019` |
| BigBasket | Green | `#84C225` |
| Flipkart | Blue | `#2874F0` |
| Amazon | Orange | `#FF9900` |
| JioMart | Blue | `#0046D5` |
| Myntra | Pink | `#FF3F6C` |
| Nykaa | Pink | `#FC2779` |
| Background | Light Gray | `#f5f5f5` |
| Card Background | White | `#ffffff` |
| Text Primary | Near Black | `#171717` |
| Text Secondary | Gray | `#737373` |
| Border | Light Gray | `#f0f0f0` |