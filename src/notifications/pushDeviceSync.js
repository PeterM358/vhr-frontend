import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { deactivateDeviceToken, registerDeviceToken } from '../api/notifications';
import {
  getFirebaseToken,
  initializeNativePushNotifications,
  isMessagingAvailable,
  requestFirebasePermission,
} from './firebaseMessaging';
import { devLog, safeWarn } from '../utils/logger';

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

let pushInitDone = false;

async function postTokenToBackend(authToken, token) {
  const { app_version, app_build } = getAppVersionMetadata();
  await registerDeviceToken(authToken, {
    token,
    platform: getPushPlatform(),
    app_version,
    app_build,
  });
  await AsyncStorage.setItem(FCM_TOKEN_STORAGE_KEY, token);
  devLog('[push-token] registered with backend');
}

/**
 * Request permission (native), obtain FCM token, POST to /api/notifications/device-tokens/.
 * Safe no-op on web / simulator / missing Firebase.
 */
export async function syncPushDeviceToken(authToken, { isAuthenticated = true } = {}) {
  if (!authToken) {
    return;
  }
  if (!isMessagingAvailable()) {
    return;
  }
  try {
    if (!pushInitDone) {
      initializeNativePushNotifications({
        onTokenRefresh: async (newToken) => {
          if (!newToken) return;
          try {
            const sessionToken = await AsyncStorage.getItem('@access_token');
            if (!sessionToken) return;
            await postTokenToBackend(sessionToken, newToken);
          } catch (err) {
            safeWarn('FCM token refresh sync failed', err);
          }
        },
      });
      pushInitDone = true;
    }

    await requestFirebasePermission();
    const token = await getFirebaseToken();
    if (!token) {
      return;
    }
    await postTokenToBackend(authToken, token);
  } catch (err) {
    safeWarn('Push device token sync skipped', err);
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
    safeWarn('Push device token deactivate skipped', err);
  }
}

/** @deprecated refresh listener is wired inside initializeNativePushNotifications */
export function attachPushTokenRefreshListener(_getAuthToken) {
  // No-op — token refresh handled during syncPushDeviceToken init.
}
