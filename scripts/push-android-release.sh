#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LATEST="$ROOT/dist/apk/LATEST.apk"
GRADLE_APK="$ROOT/android/app/build/outputs/apk/release/app-release.apk"

if [[ -f "$LATEST" ]]; then
  APK="$(readlink -f "$LATEST" 2>/dev/null || realpath "$LATEST" 2>/dev/null || echo "$ROOT/dist/apk/$(readlink "$LATEST")")"
elif [[ -f "$GRADLE_APK" ]]; then
  APK="$GRADLE_APK"
else
  echo "No APK — run: npm run apk:beta"
  exit 1
fi

REMOTE_DIR="${1:-/sdcard/veversal}"
REMOTE_NAME="$(basename "$APK")"

SERIAL="${ANDROID_SERIAL:-}"
ADB=(adb)
if [[ -n "$SERIAL" ]]; then
  ADB=(adb -s "$SERIAL")
fi

"${ADB[@]}" devices
"${ADB[@]}" shell mkdir -p "$REMOTE_DIR"
# Remove old generic name so user does not install the wrong file by mistake.
"${ADB[@]}" shell rm -f "$REMOTE_DIR/veversal-preview.apk" "$REMOTE_DIR/app-release.apk" 2>/dev/null || true
"${ADB[@]}" push "$APK" "$REMOTE_DIR/$REMOTE_NAME"
"${ADB[@]}" shell ls -lh "$REMOTE_DIR/$REMOTE_NAME"
echo "Copied → $REMOTE_DIR/$REMOTE_NAME"
echo "Uninstall old Veversal from phone first if the launcher icon still looks wrong."
