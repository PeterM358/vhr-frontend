const fs = require('fs');
const path = require('path');

function decodeGoogleServicesFile() {
  const base64 = process.env.GOOGLE_SERVICES_JSON_BASE64;
  if (!base64) {
    console.log("No GOOGLE_SERVICES_JSON_BASE64 env var found.");
    return;
  }

  const jsonPath = path.join(__dirname, '../android/app/google-services.json');
  const decoded = Buffer.from(base64, 'base64').toString('utf-8');
  fs.writeFileSync(jsonPath, decoded);
  console.log("✅ google-services.json written to android/app/");
}

decodeGoogleServicesFile();