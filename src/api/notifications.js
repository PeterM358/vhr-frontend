import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { API_BASE_URL } from './config';

export async function getNotifications(token) {
  const response = await fetch(`${API_BASE_URL}/api/notifications/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch notifications');
  return await response.json();
}

export async function markNotificationRead(token, id) {
  const response = await fetch(`${API_BASE_URL}/api/notifications/${id}/`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ is_read: true }),
  });
  if (!response.ok) throw new Error('Failed to mark as read');
  return await response.json();
}

export async function markAllNotificationsRead(token) {
  const response = await fetch(`${API_BASE_URL}/api/notifications/mark-all-read/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error('Failed to mark all as read');
  return await response.json();
}

/**
 * POST /api/notifications/device-tokens/
 * @param {string} authToken
 * @param {{ token: string, platform: string, app_version?: string, app_build?: string, device_id?: string }} payload
 */
export async function registerDeviceToken(authToken, payload) {
  if (!authToken || !payload?.token) {
    return null;
  }
  try {
    const response = await fetch(`${API_BASE_URL}/api/notifications/device-tokens/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        token: payload.token,
        platform: payload.platform,
        app_version: payload.app_version || '',
        app_build: payload.app_build || '',
        device_id: payload.device_id || undefined,
      }),
    });
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.warn('Device token register failed', response.status, errorText);
      return null;
    }
    return response.json();
  } catch (err) {
    console.warn('Device token register error:', err?.message || err);
    return null;
  }
}

/**
 * POST /api/notifications/device-tokens/deactivate/
 */
export async function deactivateDeviceToken(authToken, token) {
  if (!authToken || !token) {
    return false;
  }
  try {
    const response = await fetch(`${API_BASE_URL}/api/notifications/device-tokens/deactivate/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ token }),
    });
    if (!response.ok) {
      console.warn('Device token deactivate failed', response.status);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Device token deactivate error:', err?.message || err);
    return false;
  }
}

/** @deprecated Use syncPushDeviceToken from pushDeviceSync.js */
export async function sendFirebaseTokenToBackend(fcmToken, userId = null, shopProfileId = null, authToken = null) {
  if (!authToken) {
    authToken = await AsyncStorage.getItem('@access_token');
  }
  if (!authToken || !fcmToken) {
    return;
  }
  const app_version =
    Constants.expoConfig?.version || Constants.nativeAppVersion || '';
  const app_build =
    Constants.nativeBuildVersion ||
    Constants.expoConfig?.ios?.buildNumber ||
    (Constants.expoConfig?.android?.versionCode != null
      ? String(Constants.expoConfig.android.versionCode)
      : '') ||
    '';
  const platform =
    Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
  await registerDeviceToken(authToken, {
    token: fcmToken,
    platform,
    app_version: String(app_version),
    app_build: String(app_build),
  });
}

export async function markNotificationAsRead(id, updateNotifications = null) {
  const token = await AsyncStorage.getItem('@access_token');
  if (!token) {
    console.warn('No token found when trying to mark notification as read');
    return;
  }

  const response = await markNotificationRead(token, id);

  if (updateNotifications) {
    updateNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  }

  return response;
}
