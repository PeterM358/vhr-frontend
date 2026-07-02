// PATH: src/env.js
//
// API URLs are set via EXPO_PUBLIC_* at build/dev time (see .env.*.example).
// When unset in development, falls back to platform-appropriate localhost/LAN hosts.

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { devLog } from './utils/logger';

const DEV_LAN_HOST = process.env.EXPO_PUBLIC_DEV_LAN_HOST || '192.168.0.105';

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
  return `http://${host}:8000`;
}

function resolveWsBaseUrl(apiBaseUrl) {
  const fromEnv = trimUrl(process.env.EXPO_PUBLIC_WS_BASE_URL);
  if (fromEnv) {
    return fromEnv;
  }
  return httpToWs(apiBaseUrl);
}

export const API_BASE_URL = resolveApiBaseUrl();
export const WS_BASE_URL = resolveWsBaseUrl(API_BASE_URL);

if (__DEV__) {
  devLog(
    `[Veversal] API → ${API_BASE_URL} (platform=${Platform.OS}, device=${Constants.isDevice})`
  );
  devLog(`[Veversal] WS  → ${WS_BASE_URL}`);
}
