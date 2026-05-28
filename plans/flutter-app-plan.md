# PriceBasket Flutter App — Comprehensive Plan

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
  go