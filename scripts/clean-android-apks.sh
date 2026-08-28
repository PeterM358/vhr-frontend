#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "[clean-apks] Removing local build outputs…"
rm -rf "$ROOT/dist/apk"
rm -rf "$ROOT/android/app/build/outputs/apk"
rm -f "$ROOT/android/app/build/outputs/apk/release/app-release.apk" 2>/dev/null || true

SERIAL="${ANDROID_SERIAL:-}"
ADB=(adb)
if [[ -n "$SERIAL" ]]; then
  ADB=(adb -s "$SERIAL")
fi

if "${ADB[@]}" get-state >/dev/null 2>&1; then
  echo "[clean-apks] Removing APKs on phone /sdcard/veversal/ …"
  "${ADB[@]}" shell rm -f /sdcard/veversal/*.apk 2>/dev/null || true
  "${ADB[@]}" shell rm -f /sdcard/Download/veversal*.apk 2>/dev/null || true
  "${ADB[@]}" shell rm -f /sdcard/Download/app-release.apk 2>/dev/null || true
fi

echo "[clean-apks] Done. Run npm run apk:beta for a fresh build."
