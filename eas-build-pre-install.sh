#!/bin/bash
# Inject Firebase client configs on EAS (files are gitignored).
# Android: GOOGLE_SERVICES_JSON_BASE64 or GOOGLE_SERVICES_JSON
# iOS:    GOOGLE_SERVICES_PLIST_BASE64
#
# EAS "file" secrets set the env var to a path under
# /home/expo/workingdir/eas-environment-secrets/ — not the file contents.
set -euo pipefail

PLATFORM="${EAS_BUILD_PLATFORM:-}"

# Resolve env value that may be inline content, base64, or an EAS file-secret path.
write_from_env_value() {
  local value="$1"
  local target="$2"
  local mode="$3" # json | base64 | raw

  if [[ -f "$value" ]]; then
    echo "Using EAS file secret at path: $value"
    if [[ "$mode" == "base64" ]]; then
      base64 -d < "$value" > "$target"
    else
      cp "$value" "$target"
    fi
    return 0
  fi

  if [[ "$mode" == "base64" ]]; then
    printf '%s' "$value" | base64 -d > "$target"
  else
    printf '%s' "$value" > "$target"
  fi
}

if [[ "$PLATFORM" == "android" ]]; then
  mkdir -p android/app
  TARGET="android/app/google-services.json"

  if [[ -n "${GOOGLE_SERVICES_JSON_BASE64:-}" ]]; then
    echo "Writing google-services.json from GOOGLE_SERVICES_JSON_BASE64..."
    if ! write_from_env_value "$GOOGLE_SERVICES_JSON_BASE64" "$TARGET" base64; then
      echo "Failed to write GOOGLE_SERVICES_JSON_BASE64"
      exit 1
    fi
  elif [[ -n "${GOOGLE_SERVICES_JSON:-}" ]]; then
    echo "Writing google-services.json from GOOGLE_SERVICES_JSON..."
    if ! write_from_env_value "$GOOGLE_SERVICES_JSON" "$TARGET" json; then
      echo "Failed to write GOOGLE_SERVICES_JSON"
      exit 1
    fi
  else
    echo "Neither GOOGLE_SERVICES_JSON_BASE64 nor GOOGLE_SERVICES_JSON is set"
    exit 1
  fi

  if ! node -e "JSON.parse(require('fs').readFileSync('android/app/google-services.json','utf8'))"; then
    echo "Decoded google-services.json is not valid JSON"
    echo "Hint: if GOOGLE_SERVICES_JSON is an EAS file secret, the script now copies that path;"
    echo "      prefer GOOGLE_SERVICES_JSON_BASE64 (string secret) for production."
    exit 1
  fi

  project_id="$(node -e "console.log(JSON.parse(require('fs').readFileSync('android/app/google-services.json','utf8')).project_info.project_id)")"
  echo "google-services.json written to android/app/ (project_id=${project_id})"
  exit 0
fi

if [[ "$PLATFORM" == "ios" ]]; then
  TARGET="GoogleService-Info.plist"

  if [[ -z "${GOOGLE_SERVICES_PLIST_BASE64:-}" ]]; then
    echo "GOOGLE_SERVICES_PLIST_BASE64 is not set — required for iOS EAS builds"
    echo "Encode locally: base64 -i GoogleService-Info.plist | pbcopy"
    echo "Then: eas env:create --name GOOGLE_SERVICES_PLIST_BASE64 --scope project --type secret --environment production"
    exit 1
  fi

  echo "Writing GoogleService-Info.plist from GOOGLE_SERVICES_PLIST_BASE64..."
  if ! write_from_env_value "$GOOGLE_SERVICES_PLIST_BASE64" "$TARGET" base64; then
    echo "Failed to write GOOGLE_SERVICES_PLIST_BASE64"
    exit 1
  fi

  if [[ ! -s "$TARGET" ]] || ! grep -q "BUNDLE_ID" "$TARGET"; then
    echo "Decoded GoogleService-Info.plist looks invalid (missing BUNDLE_ID)"
    exit 1
  fi

  echo "GoogleService-Info.plist written to repo root ($(wc -c < "$TARGET") bytes)"
  exit 0
fi

echo "Skipping Firebase config injection (platform=${PLATFORM:-unset})"
exit 0
