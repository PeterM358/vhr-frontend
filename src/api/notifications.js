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

// api/notifications.js

// import { BASE_URL } from '../constants/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function sendFirebaseTokenToBackend(fcmToken, userId = null, shopProfileId = null, authToken = null) {
  if (!authToken) {
    authToken = await AsyncStorage.getItem('@access_token');
  }

  console.log('🔐 Received auth token:', authToken);

  if (!authToken || !fcmToken) {
    console.warn('⚠️ Missing auth token or FCM token');
    return;
  }

  const body = {
    fcm_token: fcmToken,
  };

  if (shopProfileId) {
    body.shop_profile_id = shopProfileId;
  }

  if (userId) {
    body.user_id = userId;
  }

  console.log('📡 Payload being sent to backend:', body);

  try {
    const response = await fetch(`${API_BASE_URL}/api/profiles/update-firebase-token/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn('❌ Failed to register FCM token to backend', response.status, errorText);
    } else {
      console.log('✅ FCM token registered to backend');
    }
  } catch (err) {
    console.error('❌ Error sending token to backend:', err);
  }
}