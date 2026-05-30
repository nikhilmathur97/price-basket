#!/bin/bash
# =============================================================================
# PriceBasket Flutter Dev Environment Setup
# Run this ONCE in Terminal.app (not VS Code terminal) — needs your Mac password
# Usage: bash scripts/setup_flutter_dev.sh
# =============================================================================

set -e  # exit on any error

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   PriceBasket Flutter Dev Environment Setup          ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# ── Step 1: Java 17 ──────────────────────────────────────────────────────────
echo -e "${YELLOW}[1/6] Installing Java 17 (Temurin)...${NC}"
if java -version 2>&1 | grep -q "17\|21"; then
  echo -e "${GREEN}  ✅ Java already installed — skipping${NC}"
else
  HOMEBREW_NO_AUTO_UPDATE=1 brew install --cask temurin@17
  echo -e "${GREEN}  ✅ Java 17 installed${NC}"
fi

# ── Step 2: CocoaPods ────────────────────────────────────────────────────────
echo ""
echo -e "${YELLOW}[2/6] Installing CocoaPods (required for iOS builds)...${NC}"
if pod --version &>/dev/null; then
  echo -e "${GREEN}  ✅ CocoaPods already installed ($(pod --version)) — skipping${NC}"
else
  sudo gem install cocoapods
  echo -e "${GREEN}  ✅ CocoaPods installed${NC}"
fi

# ── Step 3: Install Android Studio from downloaded DMG ───────────────────────
echo ""
echo -e "${YELLOW}[3/6] Installing Android Studio...${NC}"
if [ -d "/Applications/Android Studio.app" ]; then
  echo -e "${GREEN}  ✅ Android Studio already installed — skipping${NC}"
else
  DMG_PATH="$HOME/Downloads/android-studio.dmg"
  if [ -f "$DMG_PATH" ]; then
    echo "  Mounting DMG..."
    hdiutil attach "$DMG_PATH" -quiet -nobrowse -mountpoint /Volumes/AndroidStudio
    echo "  Copying to /Applications (may take a minute)..."
    cp -R "/Volumes/AndroidStudio/Android Studio.app" /Applications/
    hdiutil detach /Volumes/AndroidStudio -quiet
    echo -e "${GREEN}  ✅ Android Studio installed${NC}"
  else
    echo -e "${RED}  ⚠️  DMG not found at $DMG_PATH${NC}"
    echo "  Downloading Android Studio now..."
    curl -L "https://redirector.gvt1.com/edgedl/android/studio/install/2024.3.2.14/android-studio-2024.3.2.14-mac_arm.dmg" \
      -o "$DMG_PATH" --progress-bar
    hdiutil attach "$DMG_PATH" -quiet -nobrowse -mountpoint /Volumes/AndroidStudio
    cp -R "/Volumes/AndroidStudio/Android Studio.app" /Applications/
    hdiutil detach /Volumes/AndroidStudio -quiet
    echo -e "${GREEN}  ✅ Android Studio installed${NC}"
  fi
fi

# ── Step 4: Android SDK via sdkmanager (command line) ────────────────────────
echo ""
echo -e "${YELLOW}[4/6] Setting up Android SDK...${NC}"

ANDROID_SDK="$HOME/Library/Android/sdk"
CMDLINE_TOOLS="$ANDROID_SDK/cmdline-tools/latest"

if [ ! -d "$CMDLINE_TOOLS" ]; then
  echo "  Downloading Android command-line tools..."
  mkdir -p "$ANDROID_SDK/cmdline-tools"
  CMDTOOLS_ZIP="$HOME/Downloads/commandlinetools-mac.zip"
  curl -L "https://dl.google.com/android/repository/commandlinetools-mac-11076708_latest.zip" \
    -o "$CMDTOOLS_ZIP" --progress-bar
  unzip -q "$CMDTOOLS_ZIP" -d "$ANDROID_SDK/cmdline-tools/"
  mv "$ANDROID_SDK/cmdline-tools/cmdline-tools" "$ANDROID_SDK/cmdline-tools/latest"
  rm "$CMDTOOLS_ZIP"
  echo -e "${GREEN}  ✅ Android command-line tools installed${NC}"
else
  echo -e "${GREEN}  ✅ Android command-line tools already present — skipping${NC}"
fi

# Add to PATH for this session
export PATH="$CMDLINE_TOOLS/bin:$ANDROID_SDK/platform-tools:$PATH"
export ANDROID_HOME="$ANDROID_SDK"
export ANDROID_SDK_ROOT="$ANDROID_SDK"

# Accept licenses and install SDK components
echo "  Accepting Android SDK licenses..."
yes | "$CMDLINE_TOOLS/bin/sdkmanager" --licenses > /dev/null 2>&1 || true

echo "  Installing Android SDK Platform 34 + Build Tools + Emulator..."
"$CMDLINE_TOOLS/bin/sdkmanager" \
  "platform-tools" \
  "platforms;android-34" \
  "build-tools;34.0.0" \
  "emulator" \
  "system-images;android-34;google_apis_playstore;arm64-v8a" \
  --sdk_root="$ANDROID_SDK"

echo -e "${GREEN}  ✅ Android SDK components installed${NC}"

# ── Step 5: Create Android Virtual Device ────────────────────────────────────
echo ""
echo -e "${YELLOW}[5/6] Creating Android Virtual Device (Pixel 8, API 34)...${NC}"

AVD_NAME="Pixel_8_API_34"
if "$CMDLINE_TOOLS/bin/avdmanager" list avd 2>/dev/null | grep -q "$AVD_NAME"; then
  echo -e "${GREEN}  ✅ AVD '$AVD_NAME' already exists — skipping${NC}"
else
  echo "no" | "$CMDLINE_TOOLS/bin/avdmanager" create avd \
    --name "$AVD_NAME" \
    --package "system-images;android-34;google_apis_playstore;arm64-v8a" \
    --device "pixel_8" \
    --force
  echo -e "${GREEN}  ✅ Android Virtual Device created: $AVD_NAME${NC}"
fi

# ── Step 6: Add env vars to shell profile ────────────────────────────────────
echo ""
echo -e "${YELLOW}[6/6] Adding Android SDK to shell PATH...${NC}"

SHELL_PROFILE="$HOME/.zshrc"
if ! grep -q "ANDROID_HOME" "$SHELL_PROFILE" 2>/dev/null; then
  cat >> "$SHELL_PROFILE" << 'EOF'

# Android SDK — added by PriceBasket Flutter setup
export ANDROID_HOME="$HOME/Library/Android/sdk"
export ANDROID_SDK_ROOT="$HOME/Library/Android/sdk"
export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
EOF
  echo -e "${GREEN}  ✅ Added to ~/.zshrc${NC}"
else
  echo -e "${GREEN}  ✅ Already in ~/.zshrc — skipping${NC}"
fi

# ── Accept Flutter Android licenses ──────────────────────────────────────────
echo ""
echo -e "${YELLOW}Accepting Flutter Android licenses...${NC}"
flutter config --android-sdk "$ANDROID_SDK" 2>/dev/null || true
yes | flutter doctor --android-licenses 2>/dev/null || true
echo -e "${GREEN}  ✅ Flutter Android licenses accepted${NC}"

# ── Xcode check ──────────────────────────────────────────────────────────────
echo ""
echo -e "${YELLOW}Checking Xcode...${NC}"
if xcodebuild -version &>/dev/null; then
  echo -e "${GREEN}  ✅ Xcode is installed: $(xcodebuild -version | head -1)${NC}"
  sudo xcodebuild -license accept 2>/dev/null || true
  sudo xcodebuild -runFirstLaunch 2>/dev/null || true
  echo -e "${GREEN}  ✅ Xcode license accepted${NC}"
else
  echo -e "${RED}  ⚠️  Xcode NOT installed yet${NC}"
  echo "  → Open Mac App Store → search 'Xcode' → Install"
  echo "  → After it installs, run: sudo xcodebuild -license accept"
fi

# ── Final: flutter doctor ─────────────────────────────────────────────────────
echo ""
echo -e "${BLUE}══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Running flutter doctor...${NC}"
echo -e "${BLUE}══════════════════════════════════════════════════════${NC}"
echo ""
source "$HOME/.zshrc" 2>/dev/null || true
flutter doctor -v

echo ""
echo -e "${BLUE}══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Setup complete!${NC}"
echo ""
echo "  To start the Android emulator:"
echo -e "  ${YELLOW}  \$ANDROID_HOME/emulator/emulator -avd Pixel_8_API_34 &${NC}"
echo ""
echo "  To open iOS Simulator:"
echo -e "  ${YELLOW}  open -a Simulator${NC}"
echo ""
echo "  To see all devices:"
echo -e "  ${YELLOW}  flutter devices${NC}"
echo -e "${BLUE}══════════════════════════════════════════════════════${NC}"
