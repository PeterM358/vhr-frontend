// PATH: src/env.js

import { Platform } from 'react-native';
import Constants from 'expo-constants';

const ENV = __DEV__ ? 'dev' : 'prod';

/**
 * LAN IP of this Mac (Wi‑Fi). Update when you change networks:
 *   ipconfig getifaddr en1
 */
const DEV_LAN_HOST = '192.168.0.105';

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

const DEV_HOST = resolveDevHost();

const CONFIG = {
  dev: {
    API_BASE_URL: `http://${DEV_HOST}:8000`,
    WS_BASE_URL: `ws://${DEV_HOST}:8001`,
  },
  prod: {
    API_BASE_URL: 'https://your-production-api.com',
    WS_BASE_URL: 'wss://your-production-api.com',
  },
};

export const API_BASE_URL = CONFIG[ENV].API_BASE_URL;
export const WS_BASE_URL = CONFIG[ENV].WS_BASE_URL;

if (__DEV__) {
  console.log(
    `[VHR] API → ${API_BASE_URL} (platform=${Platform.OS}, device=${Constants.isDevice})`
  );
}
