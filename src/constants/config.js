// PATH: src/constants/config.js

export const GOOGLE_AUTH_CONFIG = {
  expoClientId: process.env.GOOGLE_EXPO_CLIENT_ID,
  androidClientId: process.env.GOOGLE_ANDROID_CLIENT_ID,
  iosClientId: process.env.GOOGLE_IOS_CLIENT_ID,
  scopes: ['profile', 'email'],
};