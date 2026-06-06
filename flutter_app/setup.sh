#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# PriceBasket Flutter App — Setup & Release Script
# Usage:
#   ./setup.sh          → Install deps + check environment
#   ./setup.sh icon     → Generate app icons from assets/images/app_icon.png
#   ./setup.sh firebase → Guide through Firebase setup
#   ./setup.sh keystore → Generate Android release keystore
#   ./setup.sh build    → Build release APK + AAB + iOS archive
#   ./setup.sh run      → Run on connected device/emulator
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

info()    { echo -e "${BLUE}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[OK]${NC} $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }
header()  { echo -e "\n${BOLD}${BLUE}══ $* ══${NC}\n"; }

# ─────────────────────────────────────────────────────────────────────────────
cmd_default() {
  header "PriceBasket Flutter Setup"

  # Check Flutter
  if ! command -v flutter &>/dev/null; then
    error "Flutter not found. Install from https://flutter.dev/docs/get-started/install"
  fi
  FLUTTER_VERSION=$(flutter --version 2>/dev/null | head -1)
  success "Flutter: $FLUTTER_VERSION"

  # Check Dart
  DART_VERSION=$(dart --version 2>/dev/null)
  success "Dart: $DART_VERSION"

  # Check Flutter doctor
  info "Running flutter doctor..."
  flutter doctor --no-version-check

  # Install dependencies
  header "Installing Dependencies"
  flutter pub get
  success "Dependencies installed"

  # Check for sensitive files
  header "Checking Required Files"

  check_file() {
    local file="$1"
    local desc="$2"
    local required="${3:-false}"
    if [[ -f "$file" ]]; then
      success "$desc: found"
    elif [[ "$required" == "true" ]]; then
      error "$desc: MISSING — required for build ($file)"
    else
      warn "$desc: not found (optional for dev) — $file"
    fi
  }

  check_file "android/app/google-services.json"        "Android Firebase config"
  check_file "ios/Runner/GoogleService-Info.plist"     "iOS Firebase config"
  check_file "lib/firebase_options.dart"               "Firebase options (flutterfire)"
  check_file "android/key.properties"                  "Android signing config"
  check_file "assets/images/app_icon.png"              "App icon (1024x1024 PNG)"

  echo ""
  info "Next steps:"
  echo "  1. Add app icon:    ./setup.sh icon"
  echo "  2. Setup Firebase:  ./setup.sh firebase"
  echo "  3. Create keystore: ./setup.sh keystore"
  echo "  4. Build release:   ./setup.sh build"
}

# ─────────────────────────────────────────────────────────────────────────────
cmd_icon() {
  header "Generating App Icons"

  if [[ ! -f "assets/images/app_icon.png" ]]; then
    error "Missing assets/images/app_icon.png — add a 1024x1024 PNG first"
  fi

  if [[ ! -f "assets/images/app_icon_foreground.png" ]]; then
    warn "assets/images/app_icon_foreground.png not found"
    warn "For Android adaptive icons, add a foreground PNG (safe zone: 66% of 1024px)"
    warn "Falling back to using app_icon.png as foreground"
    cp assets/images/app_icon.png assets/images/app_icon_foreground.png
  fi

  flutter pub get
  flutter pub run flutter_launcher_icons
  success "App icons generated for Android and iOS"
  info "For iOS: open Xcode → Runner → Assets.xcassets → AppIcon to verify"
}

# ─────────────────────────────────────────────────────────────────────────────
cmd_firebase() {
  header "Firebase Setup Guide"

  echo -e "${BOLD}Step 1: Create Firebase Project${NC}"
  echo "  → Go to: https://console.firebase.google.com"
  echo "  → Create project: 'pricebasket'"
  echo "  → Enable Google Analytics (optional)"
  echo ""

  echo -e "${BOLD}Step 2: Add Android App${NC}"
  echo "  → Package name: in.pricebasket.app"
  echo "  → Download google-services.json"
  echo "  → Place at: flutter_app/android/app/google-services.json"
  echo ""

  echo -e "${BOLD}Step 3: Add iOS App${NC}"
  echo "  → Bundle ID: in.pricebasket.app"
  echo "  → Download GoogleService-Info.plist"
  echo "  → Place at: flutter_app/ios/Runner/GoogleService-Info.plist"
  echo ""

  echo -e "${BOLD}Step 4: Enable Cloud Messaging${NC}"
  echo "  → Firebase Console → Project Settings → Cloud Messaging"
  echo "  → Note your Server Key for backend use"
  echo ""

  echo -e "${BOLD}Step 5: Install FlutterFire CLI${NC}"
  echo "  dart pub global activate flutterfire_cli"
  echo ""

  echo -e "${BOLD}Step 6: Configure FlutterFire${NC}"
  echo "  flutterfire configure --project=YOUR_FIREBASE_PROJECT_ID"
  echo "  This generates: lib/firebase_options.dart"
  echo ""

  echo -e "${BOLD}Step 7: Uncomment Firebase init in fcm_service.dart${NC}"
  echo "  Uncomment the Firebase.initializeApp() call"
  echo ""

  echo -e "${BOLD}Step 8: iOS Push Notifications (Xcode)${NC}"
  echo "  → Open ios/Runner.xcworkspace in Xcode"
  echo "  → Runner → Signing & Capabilities → + Capability"
  echo "  → Add: Push Notifications"
  echo "  → Add: Background Modes → check 'Remote notifications'"
  echo ""

  if command -v flutterfire &>/dev/null; then
    info "FlutterFire CLI is installed. Run: flutterfire configure"
  else
    warn "FlutterFire CLI not installed. Run: dart pub global activate flutterfire_cli"
  fi
}

# ─────────────────────────────────────────────────────────────────────────────
cmd_keystore() {
  header "Android Release Keystore"

  KEYSTORE_PATH="android/pricebasket-release.jks"
  KEY_PROPS="android/key.properties"

  if [[ -f "$KEYSTORE_PATH" ]]; then
    warn "Keystore already exists at $KEYSTORE_PATH"
    read -rp "Overwrite? (y/N): " confirm
    [[ "$confirm" != "y" ]] && { info "Skipped"; exit 0; }
  fi

  echo ""
  info "Generating release keystore..."
  echo "You will be prompted for passwords and identity info."
  echo ""

  read -rsp "Store password (min 6 chars): " STORE_PASS; echo
  read -rsp "Key password (min 6 chars):   " KEY_PASS; echo
  echo ""

  keytool -genkey -v \
    -keystore "$KEYSTORE_PATH" \
    -alias pricebasket \
    -keyalg RSA \
    -keysize 2048 \
    -validity 10000 \
    -storepass "$STORE_PASS" \
    -keypass "$KEY_PASS" \
    -dname "CN=PriceBasket, OU=Mobile, O=PriceBasket, L=India, ST=India, C=IN"

  # Write key.properties
  cat > "$KEY_PROPS" <<EOF
storePassword=$STORE_PASS
keyPassword=$KEY_PASS
keyAlias=pricebasket
storeFile=../pricebasket-release.jks
EOF

  success "Keystore created: $KEYSTORE_PATH"
  success "key.properties created: $KEY_PROPS"
  warn "IMPORTANT: Back up $KEYSTORE_PATH securely — you cannot re-upload to Play Store without it!"
  warn "IMPORTANT: $KEY_PROPS is in .gitignore — never commit it"
}

# ─────────────────────────────────────────────────────────────────────────────
cmd_build() {
  header "Building Release"

  flutter pub get

  # ── Android APK (for direct install / testing) ───────────────────────────
  info "Building Android APK..."
  flutter build apk --release --split-per-abi
  success "APK built: build/app/outputs/flutter-apk/"

  # ── Android AAB (for Play Store) ─────────────────────────────────────────
  info "Building Android App Bundle (AAB)..."
  flutter build appbundle --release
  success "AAB built: build/app/outputs/bundle/release/app-release.aab"

  # ── iOS (macOS only) ─────────────────────────────────────────────────────
  if [[ "$(uname)" == "Darwin" ]]; then
    info "Building iOS archive..."
    flutter build ios --release --no-codesign
    success "iOS build complete. Open Xcode to archive and upload to App Store."
    info "Run: open ios/Runner.xcworkspace"
  else
    warn "iOS build skipped (requires macOS)"
  fi

  header "Build Summary"
  echo "  Android APK:  build/app/outputs/flutter-apk/app-arm64-v8a-release.apk"
  echo "  Android AAB:  build/app/outputs/bundle/release/app-release.aab"
  echo ""
  echo "  Play Store:   Upload the AAB file"
  echo "  Direct test:  adb install build/app/outputs/flutter-apk/app-arm64-v8a-release.apk"
}

# ─────────────────────────────────────────────────────────────────────────────
cmd_run() {
  header "Running App"
  flutter pub get
  flutter run
}

# ─────────────────────────────────────────────────────────────────────────────
case "${1:-default}" in
  default|setup) cmd_default ;;
  icon)          cmd_icon ;;
  firebase)      cmd_firebase ;;
  keystore)      cmd_keystore ;;
  build)         cmd_build ;;
  run)           cmd_run ;;
  *)
    echo "Usage: $0 [default|icon|firebase|keystore|build|run]"
    exit 1
    ;;
esac
