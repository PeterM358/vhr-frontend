#!/bin/bash
set -euo pipefail

if [[ "${EAS_BUILD_PLATFORM:-}" != "android" ]]; then
  echo "Skipping google-services.json injection (platform=${EAS_BUILD_PLATFORM:-unset})"
  exit 0
fi

mkdir -p android/app
TARGET="android/app/google-services.json"

write_from_base64() {
  echo "Decoding google-services.json from GOOGLE_SERVICES_JSON_BASE64..."
  if ! echo "$GOOGLE_SERVICES_JSON_BASE64" | base64 -d > "$TARGET"; then
    echo "Failed to decode GOOGLE_SERVICES_JSON_BASE64"
    exit 1
  fi
}

write_from_raw_json() {
  echo "Writing google-services.json from GOOGLE_SERVICES_JSON..."
  printf '%s' "$GOOGLE_SERVICES_JSON" > "$TARGET"
}

if [[ -n "${GOOGLE_SERVICES_JSON_BASE64:-}" ]]; then
  write_from_base64
elif [[ -n "${GOOGLE_SERVICES_JSON:-}" ]]; then
  write_from_raw_json
else
  echo "Neither GOOGLE_SERVICES_JSON_BASE64 nor GOOGLE_SERVICES_JSON is set"
  exit 1
fi

if ! node -e "JSON.parse(require('fs').readFileSync('android/app/google-services.json','utf8'))"; then
  echo "Decoded google-services.json is not valid JSON"
  exit 1
fi

project_id="$(node -e "console.log(JSON.parse(require('fs').readFileSync('android/app/google-services.json','utf8')).project_info.project_id)")"
echo "google-services.json written to android/app/ (project_id=${project_id})"
