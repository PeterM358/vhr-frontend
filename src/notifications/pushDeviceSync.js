import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { deactivateDeviceToken, registerDeviceToken } from '../api/notifications';
import {
  getFirebaseToken,
  isMessagingAvailable,
  registerFirebaseListeners,
  requestFirebasePermission,
  subscribeToTokenRefresh,
} from './firebaseMessaging';

export const FCM_TOKEN_STORAGE_KEY = '@fcm_device_token';

export function getPushPlatform() {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return 'web';
}

export function getAppVersionMetadata() {
  const version =
    Constants.expoConfig?.version ||
    Constants.nativeAppVersion ||
    '';
  const build =
    Constants.nativeBuildVersion ||
    Constants.expoConfig?.ios?.buildNumber ||
    (Constants.expoConfig?.android?.versionCode != null
      ? String(Constants.expoConfig.android.versionCode)
      : '') ||
    '';
  return {
    app_version: String(version || ''),
    app_build: String(build || ''),
  };
}

/**
 * Request permission (native), obtain FCM token, POST to /api/notifications/device-tokens/.
 * Safe no-op on web / simulator / missing Firebase.
 */
export async function syncPushDeviceToken(authToken) {
  if (!authToken) {
    return;
  }
  if (!isMessagingAvailable()) {
    return;
  }
  try {
    registerFirebaseListeners();
    await requestFirebasePermission();
    const token = await getFirebaseToken();
    if (!token) {
      return;
    }
    const { app_version, app_build } = getAppVersionMetadata();
    await registerDeviceToken(authToken, {
      token,
      platform: getPushPlatform(),
      app_version,
      app_build,
    });
    await AsyncStorage.setItem(FCM_TOKEN_STORAGE_KEY, token);
    attachPushTokenRefreshListener(async () => AsyncStorage.getItem('@access_token'));
  } catch (err) {
    console.warn('Push device token sync skipped:', err?.message || err);
  }
}

/** Deactivate last known token on logout. */
export async function deactivatePushDeviceToken(authToken) {
  if (!authToken) {
    return;
  }
  try {
    const token = await AsyncStorage.getItem(FCM_TOKEN_STORAGE_KEY);
    if (!token) {
      return;
    }
    await deactivateDeviceToken(authToken, token);
  } catch (err) {
    console.warn('Push device token deactivate skipped:', err?.message || err);
  }
}

let refreshListenerUnsub = null;

/**
 * Re-register when FCM rotates the token (call once after app auth bootstrap).
 * @param {() => Promise<string|null>|string|null} getAuthToken
 */
export function attachPushTokenRefreshListener(getAuthToken) {
  if (refreshListenerUnsub || !isMessagingAvailable()) {
    return;
  }
  const unsub = subscribeToTokenRefresh(async (newToken) => {
    if (!newToken) {
      return;
    }
    try {
      const authToken = typeof getAuthToken === 'function' ? await getAuthToken() : getAuthToken;
      if (!authToken) {
        return;
      }
      const { app_version, app_build } = getAppVersionMetadata();
      await registerDeviceToken(authToken, {
        token: newToken,
        platform: getPushPlatform(),
        app_version,
        app_build,
      });
      await AsyncStorage.setItem(FCM_TOKEN_STORAGE_KEY, newToken);
      console.log('📱 FCM token refresh registered with backend');
    } catch (err) {
      console.warn('FCM token refresh sync failed:', err?.message || err);
    }
  });
  if (typeof unsub === 'function') {
    refreshListenerUnsub = unsub;
  }
}
