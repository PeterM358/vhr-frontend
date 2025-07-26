# PATH: ./eas-build-pre-install.sh
#!/bin/bash

echo "🔐 Decoding google-services.json from env..."

if [ -n "$GOOGLE_SERVICES_JSON_BASE64" ]; then
  echo "$GOOGLE_SERVICES_JSON_BASE64" | base64 -d > android/app/google-services.json
  echo "✅ google-services.json written to android/app/"
else
  echo "❌ GOOGLE_SERVICES_JSON_BASE64 env variable not found!"
  exit 1
fi