// PATH: scripts/decode_google_services.js

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const outputPath = path.join(__dirname, '../android/app/google-services.json');
const base64 = process.env.GOOGLE_SERVICES_JSON_BASE64;

if (!base64) {
  console.error('❌ No GOOGLE_SERVICES_JSON_BASE64 env var found.');
  process.exit(1);
}

const decoded = Buffer.from(base64, 'base64').toString('utf-8');

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, decoded);
console.log('✅ google-services.json written to android/app/');