import { Platform } from 'react-native';

/** Native FCM via @react-native-firebase/messaging (not available on web / many simulators). */
let messagingModule = null;

function loadMessaging() {
  if (Platform.OS === 'web') {
    return null;
  }
  if (messagingModule !== null) {
    return messagingModule;
  }
  try {
    messagingModule = require('@react-native-firebase/messaging').default;
    return messagingModule;
  } catch (err) {
    console.warn('Firebase messaging module unavailable:', err?.message || err);
    messagingModule = false;
    return null;
  }
}

export function isMessagingAvailable() {
  return loadMessaging() != null;
}

/** Register background handler — call once from app entry (index.js). */
export function registerBackgroundMessageHandler() {
  const messaging = loadMessaging();
  if (!messaging) {
    return;
  }
  try {
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('📩 Background push:', remoteMessage?.messageId || remoteMessage);
    });
  } catch (err) {
    console.warn('Background message handler not registered:', err?.message || err);
  }
}

export async function requestFirebasePermission() {
  const messaging = loadMessaging();
  if (!messaging) {
    return false;
  }
  try {
    const authStatus = await messaging().requestPermission();
    return (
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL
    );
  } catch (err) {
    console.warn('Firebase permission request failed:', err?.message || err);
    return false;
  }
}

let foregroundListenerAttached = false;

export function registerFirebaseListeners() {
  const messaging = loadMessaging();
  if (!messaging || foregroundListenerAttached) {
    return;
  }
  foregroundListenerAttached = true;

  try {
    messaging().onMessage(async (remoteMessage) => {
      console.log('📩 Foreground push:', remoteMessage);
      const { Alert } = require('react-native');
      if (remoteMessage?.notification) {
        Alert.alert(remoteMessage.notification.title, remoteMessage.notification.body);
      }
    });
  } catch (err) {
    console.warn('Foreground message listener failed:', err?.message || err);
  }
}

export async function getFirebaseToken() {
  const messaging = loadMessaging();
  if (!messaging) {
    return null;
  }
  try {
    const token = await messaging().getToken();
    if (token) {
      console.log('📱 FCM token obtained');
    }
    return token || null;
  } catch (err) {
    console.warn('Failed to get FCM token:', err?.message || err);
    return null;
  }
}

/**
 * Subscribe to FCM token rotation. Returns unsubscribe function or null.
 * @param {(token: string) => void} onRefresh
 */
export function subscribeToTokenRefresh(onRefresh) {
  const messaging = loadMessaging();
  if (!messaging || typeof onRefresh !== 'function') {
    return null;
  }
  try {
    return messaging().onTokenRefresh(onRefresh);
  } catch (err) {
    console.warn('Token refresh listener failed:', err?.message || err);
    return null;
  }
}
