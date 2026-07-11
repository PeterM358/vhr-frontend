// PATH: src/env.js
//
// API URLs are set via EXPO_PUBLIC_* at build/dev time (see .env.*.example).
// When unset in development, falls back to platform-appropriate localhost/LAN hosts.

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { devLog } from './utils/logger';

const DEV_LAN_HOST = process.env.EXPO_PUBLIC_DEV_LAN_HOST || '192.168.0.105';
const DEV_API_PORT = process.env.EXPO_PUBLIC_DEV_API_PORT || '8000';

function trimUrl(url) {
  return typeof url === 'string' ? url.trim().replace(/\/$/, '') : '';
}

function resolveDevHost() {
  if (Platform.OS === 'web') {
    return '127.0.0.1';
  }
  if (Platform.OS === 'android' && !Constants.isDevice) {
    return '10.0.2.2';
  }
  if (Platform.OS === 'ios' && !Constants.isDevice) {
    return '127.0.0.1';
  }
  return DEV_LAN_HOST;
}

function httpToWs(url) {
  if (url.startsWith('https://')) {
    return `wss://${url.slice('https://'.length)}`;
  }
  if (url.startsWith('http://')) {
    return `ws://${url.slice('http://'.length)}`;
  }
  return url;
}

function resolveApiBaseUrl() {
  const fromEnv = trimUrl(process.env.EXPO_PUBLIC_API_BASE_URL);
  if (fromEnv) {
    return fromEnv;
  }

  const host = resolveDevHost();
  return `http://${host}:${DEV_API_PORT}`;
}

function resolveWsBaseUrl(apiBaseUrl) {
  const fromEnv = trimUrl(process.env.EXPO_PUBLIC_WS_BASE_URL);
  if (fromEnv) {
    return fromEnv;
  }
  return httpToWs(apiBaseUrl);
}

function parseEnvFlag(value) {
  if (value === true || value === 'true' || value === '1') return true;
  if (value === false || value === 'false' || value === '0') return false;
  return null;
}

function readWsEnabledEnv() {
  const fromProcess = parseEnvFlag(process.env.EXPO_PUBLIC_WS_ENABLED);
  if (fromProcess != null) return fromProcess;
  return parseEnvFlag(Constants.expoConfig?.extra?.wsEnabled);
}

/**
 * WebSockets require an ASGI server (Daphne). Django runserver serves HTTP only,
 * so local dev skips WS by default to avoid 404 console noise. Set
 * EXPO_PUBLIC_WS_ENABLED=true when running Daphne locally, or point API/WS at wss://.
 */
function resolveWsEnabled(apiBaseUrl, wsBaseUrl) {
  const explicit = readWsEnabledEnv();
  if (explicit != null) return explicit;

  if (!__DEV__) return true;

  if (wsBaseUrl.startsWith('wss://') || apiBaseUrl.startsWith('https://')) {
    return true;
  }

  return false;
}

export const API_BASE_URL = resolveApiBaseUrl();
export const WS_BASE_URL = resolveWsBaseUrl(API_BASE_URL);
export const WS_ENABLED = resolveWsEnabled(API_BASE_URL, WS_BASE_URL);

/** Dev-only log when WebSocketManager skips the connection. */
export function wsSkipReason() {
  const explicit = readWsEnabledEnv();
  if (explicit === false) {
    return 'WebSocket skipped (EXPO_PUBLIC_WS_ENABLED=false — REST notifications only)';
  }
  if (__DEV__) {
    return 'WebSocket skipped (local dev default — set EXPO_PUBLIC_WS_ENABLED=true in .env.local when Daphne is running)';
  }
  return 'WebSocket skipped — REST notifications only';
}

if (__DEV__) {
  devLog(
    `[Veversal] API → ${API_BASE_URL} (platform=${Platform.OS}, device=${Constants.isDevice})`
  );
  devLog(`[Veversal] WS  → ${WS_BASE_URL} (enabled=${WS_ENABLED}, route=/ws/notifications/)`);
}
