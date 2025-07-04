// PATH: src/env.js
// ✅ Switch environment automatically
// Or hardcode ENV = 'prod' for production build

const ENV = __DEV__ ? 'dev' : 'prod';  // Automatic switch based on React Native dev mode

/**
 * IMPORTANT:
 * Replace 192.168.x.x with your actual computer's LAN IP.
 * You can get it by running `ipconfig` or `ifconfig`.
 */

const CONFIG = {
  dev: {
    // API_BASE_URL: 'http://185.189.199.172:8000',  // Replace with your local machine's IP and Django port
    // WS_BASE_URL: 'ws://185.189.199.172:8001',     // Replace with your local machine's IP and Daphne port
    API_BASE_URL: 'http://localhost:8000',
    WS_BASE_URL: 'ws://localhost:8001',
  },
  prod: {
    API_BASE_URL: 'https://your-production-api.com',
    WS_BASE_URL: 'wss://your-production-api.com',
  },
};

export const API_BASE_URL = CONFIG[ENV].API_BASE_URL;
export const WS_BASE_URL = CONFIG[ENV].WS_BASE_URL;