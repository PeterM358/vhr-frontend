const fs = require('fs');
const path = require('path');

function loadDotEnvE2e() {
  const envPath = path.join(__dirname, '..', '..', '.env.e2e');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadDotEnvE2e();

function pickCreds(rolePrefix) {
  // Prefer role keys; fall back to legacy E2E_EMAIL / E2E_PASSWORD for shop only.
  const emailKey = `E2E_${rolePrefix}_EMAIL`;
  const passKey = `E2E_${rolePrefix}_PASSWORD`;
  let email = process.env[emailKey];
  let password = process.env[passKey];
  if (rolePrefix === 'SHOP' && (!email || !password)) {
    email = email || process.env.E2E_EMAIL;
    password = password || process.env.E2E_PASSWORD;
  }
  return {
    email: email || '',
    password: password || '',
    hasCreds: Boolean(email && password),
  };
}

const AUTH_DIR = path.join(__dirname, '..', '.auth');

const roles = {
  shop: {
    ...pickCreds('SHOP'),
    authFile: path.join(AUTH_DIR, 'shop.json'),
  },
  client: {
    ...pickCreds('CLIENT'),
    authFile: path.join(AUTH_DIR, 'client.json'),
  },
  org: {
    ...pickCreds('ORG'),
    authFile: path.join(AUTH_DIR, 'org.json'),
  },
};

/** @deprecated use roles.shop.hasCreds */
const hasCreds = roles.shop.hasCreds;
/** @deprecated use roles.shop.authFile */
const AUTH_FILE = roles.shop.authFile;

module.exports = {
  AUTH_DIR,
  AUTH_FILE,
  hasCreds,
  roles,
  baseURL: process.env.E2E_BASE_URL || 'https://www.veversal.com',
};
