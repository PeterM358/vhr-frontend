#!/bin/bash
set -euo pipefail

if [[ "${EAS_BUILD_PLATFORM:-}" != "android" ]]; then
  echo "Skipping google-services.json injection (platform=${EAS_BUILD_PLATFORM:-unset})"
  exit 0
fi

echo "Decoding google-services.json from GOOGLE_SERVICES_JSON_BASE64..."

if [[ -z "${GOOGLE_SERVICES_JSON_BASE64:-}" ]]; then
  echo "GOOGLE_SERVICES_JSON_BASE64 env variable not found"
  exit 1
fi

mkdir -p android/app

if ! echo "$GOOGLE_SERVICES_JSON_BASE64" | base64 -d > android/app/google-services.json; then
  echo "Failed to decode GOOGLE_SERVICES_JSON_BASE64"
  exit 1
fi

if ! node -e "JSON.parse(require('fs').readFileSync('android/app/google-services.json','utf8'))"; then
  echo "Decoded google-services.json is not valid JSON"
  exit 1
fi

project_id="$(node -e "console.log(JSON.parse(require('fs').readFileSync('android/app/google-services.json','utf8')).project_info.project_id)")"
echo "google-services.json written to android/app/ (project_id=${project_id})"
