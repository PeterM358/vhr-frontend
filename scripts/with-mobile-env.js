#!/usr/bin/env node
/**
 * Mobile env loader:
 * - local  → .env.local only (LAN Django on same Wi‑Fi)
 * - staging → .env.local secrets + beta API/WS from .env.staging
 *
 * Usage:
 *   node scripts/with-mobile-env.js staging npx expo start --dev-client
 *   node scripts/with-mobile-env.js local ./scripts/build-android-release.sh
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const mode = (process.argv[2] || '').toLowerCase();
const command = process.argv.slice(3);

const STAGING_API_KEYS = new Set([
  'EXPO_PUBLIC_API_BASE_URL',
  'EXPO_PUBLIC_WS_BASE_URL',
  'EXPO_PUBLIC_WS_ENABLED',
]);

const VITE_TO_EXPO = {
  VITE_ENABLE_ANALYTICS: 'EXPO_PUBLIC_ENABLE_ANALYTICS',
  VITE_GA_MEASUREMENT_ID: 'EXPO_PUBLIC_GA_MEASUREMENT_ID',
  VITE_ENABLE_INTERNAL_ANALYTICS: 'EXPO_PUBLIC_ENABLE_INTERNAL_ANALYTICS',
};

function applyEnvFile(relativePath, { onlyKeys, skipEmpty = false } = {}) {
  const envPath = path.resolve(process.cwd(), relativePath);
  if (!fs.existsSync(envPath)) {
    console.warn(`[with-mobile-env] ${relativePath} not found — skipped`);
    return;
  }

  for (const rawLine of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    if (onlyKeys && !onlyKeys.has(key)) continue;

    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (skipEmpty && !value) continue;

    process.env[key] = value;
    if (VITE_TO_EXPO[key]) {
      process.env[VITE_TO_EXPO[key]] = value;
    }
  }
}

if (!mode || command.length === 0) {
  console.error(
    'Usage: node scripts/with-mobile-env.js <local|staging> <command> [args...]'
  );
  process.exit(1);
}

if (mode === 'local') {
  applyEnvFile('.env.local');
} else if (mode === 'staging') {
  // Secrets / maps / OAuth from .env.local; empty slots in .env.staging are OK.
  applyEnvFile('.env.local', { skipEmpty: true });
  applyEnvFile('.env.staging', { onlyKeys: STAGING_API_KEYS });
} else {
  console.error(`[with-mobile-env] Unknown mode "${mode}". Use local or staging.`);
  process.exit(1);
}

const api = process.env.EXPO_PUBLIC_API_BASE_URL || '(unset)';
console.log(`[with-mobile-env] mode=${mode} API=${api}`);

const result = spawnSync(command[0], command.slice(1), {
  stdio: 'inherit',
  env: process.env,
  shell: process.platform === 'win32',
});

process.exit(result.status ?? 1);
