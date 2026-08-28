#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/android"

VERSION_NAME=$(grep 'versionName' app/build.gradle | head -1 | sed 's/.*"\(.*\)".*/\1/')
VERSION_CODE=$(grep 'versionCode' app/build.gradle | head -1 | sed 's/[^0-9]*\([0-9]*\).*/\1/')
STAMP=$(date +%Y%m%d-%H%M)
OUT_DIR="$ROOT/dist/apk"
OUT_APK="$OUT_DIR/veversal-${VERSION_NAME}-${VERSION_CODE}-beta-${STAMP}.apk"
LATEST_LINK="$OUT_DIR/LATEST.apk"

echo "[build-android-release] v${VERSION_NAME} (${VERSION_CODE}) — bundle + release…"
./gradlew :app:createBundleReleaseJsAndAssets --rerun-tasks
./gradlew assembleRelease

GRADLE_APK="$ROOT/android/app/build/outputs/apk/release/app-release.apk"
if [[ ! -f "$GRADLE_APK" ]]; then
  echo "[build-android-release] APK not found at $GRADLE_APK"
  exit 1
fi

mkdir -p "$OUT_DIR"
cp "$GRADLE_APK" "$OUT_APK"
ln -sf "$(basename "$OUT_APK")" "$LATEST_LINK"

ls -lh "$OUT_APK"
echo "[build-android-release] Done → $OUT_APK"
echo "[build-android-release] Latest symlink → $LATEST_LINK"
