// PATH: src/env.js

// Automatically choose dev or prod based on React Native __DEV__ global
const ENV = __DEV__ ? 'dev' : 'prod';

/**
 * IMPORTANT:
 * Replace 192.168.x.x with your actual computer's LAN IP for local network testing.
 * Example: '192.168.0.104'
 */
const CONFIG = {
  dev: {
    API_BASE_URL: 'http://192.168.0.103:8000',  // YOUR LOCAL LAN IP
    WS_BASE_URL: 'ws://192.168.0.103:8001',
  },
  prod: {
    API_BASE_URL: 'https://your-production-api.com',
    WS_BASE_URL: 'wss://your-production-api.com',
  },
};

export const API_BASE_URL = CONFIG[ENV].API_BASE_URL;
export const WS_BASE_URL = CONFIG[ENV].WS_BASE_URL;