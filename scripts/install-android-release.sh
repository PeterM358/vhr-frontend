#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APK="$ROOT/android/app/build/outputs/apk/release/app-release.apk"
REMOTE_NAME="${1:-veversal-preview.apk}"

if [[ ! -f "$APK" ]]; then
  echo "Missing $APK — run: npm run apk:beta"
  exit 1
fi

SERIAL="${ANDROID_SERIAL:-}"
ADB=(adb)
if [[ -n "$SERIAL" ]]; then
  ADB=(adb -s "$SERIAL")
fi

"${ADB[@]}" devices
"${ADB[@]}" install -r "$APK"
echo "Installed from $APK"
