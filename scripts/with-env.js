#!/usr/bin/env node
/**
 * Load key=value pairs from an env file into process.env, then run a command.
 * Usage: node scripts/with-env.js .env.staging npx expo export --platform web
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const envFile = process.argv[2];
const command = process.argv.slice(3);

if (!envFile || command.length === 0) {
  console.error('Usage: node scripts/with-env.js <env-file> <command> [args...]');
  process.exit(1);
}

const envPath = path.resolve(process.cwd(), envFile);
if (fs.existsSync(envPath)) {
  for (const rawLine of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;

    // Map VITE_* analytics vars to EXPO_PUBLIC_* so Expo embeds them in the web bundle.
    const viteToExpo = {
      VITE_ENABLE_ANALYTICS: 'EXPO_PUBLIC_ENABLE_ANALYTICS',
      VITE_GA_MEASUREMENT_ID: 'EXPO_PUBLIC_GA_MEASUREMENT_ID',
      VITE_ENABLE_INTERNAL_ANALYTICS: 'EXPO_PUBLIC_ENABLE_INTERNAL_ANALYTICS',
    };
    if (viteToExpo[key]) {
      process.env[viteToExpo[key]] = value;
    }
  }
} else {
  console.warn(`[with-env] ${envFile} not found — using existing environment only`);
}

const result = spawnSync(command[0], command.slice(1), {
  stdio: 'inherit',
  env: process.env,
  shell: process.platform === 'win32',
});

process.exit(result.status ?? 1);
