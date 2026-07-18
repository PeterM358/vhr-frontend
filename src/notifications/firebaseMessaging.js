import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { devLog, safeWarn } from '../utils/logger';
import { hasSeenNotification, markNotificationSeen } from './notificationDedup';
import { handleNotificationOpen } from './notificationOpenRouting';
import { isWsConnected } from './wsConnectionState';

/** Native FCM via @react-native-firebase/messaging (not available on web / many simulators). */
let messagingInstance = null;
let messagingUnavailable = false;
let foregroundUnsub = null;
let tokenRefreshUnsub = null;
let notificationOpenedUnsub = null;
let listenersInitialized = false;

function isFirebaseMessagingConfigured() {
  const flags = Constants.expoConfig?.extra?.firebaseMessagingEnabled;
  if (!flags || typeof flags !== 'object') {
    return false;
  }
  if (Platform.OS === 'ios') {
    return flags.ios === true;
  }
  if (Platform.OS === 'android') {
    return flags.android === true;
  }
  return false;
}

function loadMessagingModular() {
  // Main package entry registers the messaging namespace; /lib/modular alone does not.
  return require('@react-native-firebase/messaging');
}

function getNativeMessaging() {
  if (Platform.OS === 'web') {
    return null;
  }
  if (!isFirebaseMessagingConfigured()) {
    return null;
  }
  if (messagingUnavailable) {
    return null;
  }
  if (messagingInstance) {
    return messagingInstance;
  }
  try {
    const { getApp } = require('@react-native-firebase/app');
    const { getMessaging } = loadMessagingModular();
    messagingInstance = getMessaging(getApp());
    return messagingInstance;
  } catch (err) {
    safeWarn('Firebase messaging module unavailable', err);
    messagingUnavailable = true;
    return null;
  }
}

export function isMessagingAvailable() {
  return getNativeMessaging() != null;
}

function notificationIdFromMessage(remoteMessage) {
  const data = remoteMessage?.data || {};
  return data.notification_id ?? remoteMessage?.messageId ?? null;
}

function eventKeyFromMessage(remoteMessage) {
  const data = remoteMessage?.data || {};
  return data.event_key || null;
}

function shouldSuppressForegroundAlert(remoteMessage) {
  const notificationId = notificationIdFromMessage(remoteMessage);
  const eventKey = eventKeyFromMessage(remoteMessage);
  if (hasSeenNotification(notificationId, eventKey)) {
    devLog('[notification] suppress duplicate foreground alert', eventKey || notificationId);
    return true;
  }
  if (isWsConnected()) {
    devLog('[notification] suppress foreground FCM alert — WebSocket connected');
    return true;
  }
  return false;
}

async function ensureAndroidChannels() {
  if (Platform.OS !== 'android') return;
  try {
    const Notifications = require('expo-notifications');
    await Notifications.setNotificationChannelAsync('default', {
      name: 'General',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
    await Notifications.setNotificationChannelAsync('urgent', {
      name: 'Urgent alerts',
      importance: Notifications.AndroidImportance.HIGH,
    });
    devLog('[notification] Android channels ensured (runtime — no rebuild required)');
  } catch (err) {
    safeWarn('Android notification channels setup skipped', err);
  }
}

/** Register background handler — call once from app entry (index.js). */
export function registerBackgroundMessageHandler() {
  const messaging = getNativeMessaging();
  if (!messaging) {
    return;
  }
  try {
    const { setBackgroundMessageHandler } = loadMessagingModular();
    setBackgroundMessageHandler(messaging, async (remoteMessage) => {
      const notificationId = notificationIdFromMessage(remoteMessage);
      const eventKey = eventKeyFromMessage(remoteMessage);
      devLog('[notification] background push received', eventKey || notificationId || 'unknown');
      if (notificationId != null || eventKey) {
        markNotificationSeen(notificationId, eventKey);
      }
    });
  } catch (err) {
    safeWarn('Background message handler not registered', err);
  }
}

export async function requestFirebasePermission() {
  const messaging = getNativeMessaging();
  if (!messaging) {
    return false;
  }
  try {
    const { AuthorizationStatus, hasPermission, requestPermission } = loadMessagingModular();
    if (Platform.OS === 'ios') {
      const current = await hasPermission(messaging);
      const authorized =
        current === AuthorizationStatus.AUTHORIZED ||
        current === AuthorizationStatus.PROVISIONAL;
      if (authorized) {
        devLog('[push-token] iOS permission already granted');
        return true;
      }
      devLog('[push-token] requesting iOS notification permission');
    }
    const authStatus = await requestPermission(messaging);
    const granted =
      authStatus === AuthorizationStatus.AUTHORIZED ||
      authStatus === AuthorizationStatus.PROVISIONAL;
    devLog('[push-token] permission result', granted ? 'granted' : 'denied');
    return granted;
  } catch (err) {
    safeWarn('Firebase permission request failed', err);
    return false;
  }
}

function attachForegroundListener(messaging) {
  if (foregroundUnsub) return;
  const { onMessage } = loadMessagingModular();
  foregroundUnsub = onMessage(messaging, async (remoteMessage) => {
    const notificationId = notificationIdFromMessage(remoteMessage);
    const eventKey = eventKeyFromMessage(remoteMessage);
    devLog('[notification] foreground push received', eventKey || notificationId || 'unknown');
    if (notificationId != null || eventKey) {
      markNotificationSeen(notificationId, eventKey);
    }
    if (shouldSuppressForegroundAlert(remoteMessage)) {
      return;
    }
    // Partner foreground: PartnerInAppBannerHost owns visible alerts when WS delivers.
    // Keep a lightweight Alert only when WS is down and this is a true FCM-only path.
    const { Alert } = require('react-native');
    const title = remoteMessage?.notification?.title || remoteMessage?.data?.title || 'Notification';
    const body = remoteMessage?.notification?.body || remoteMessage?.data?.body || '';
    if (title || body) {
      Alert.alert(title, body);
    }
  });
}

function attachNotificationOpenListeners(messaging) {
  if (notificationOpenedUnsub) return;

  const { getInitialNotification, onNotificationOpenedApp } = loadMessagingModular();

  notificationOpenedUnsub = onNotificationOpenedApp(messaging, async (remoteMessage) => {
    await handleNotificationOpen(remoteMessage);
  });

  getInitialNotification(messaging)
    .then(async (remoteMessage) => {
      if (remoteMessage) {
        devLog('[notification-open] cold start from terminated state');
        await handleNotificationOpen(remoteMessage);
      }
    })
    .catch((err) => safeWarn('getInitialNotification failed', err));
}

/**
 * Initialize native FCM listeners (foreground, open, token refresh hooks).
 * Safe to call once after auth bootstrap.
 */
export function initializeNativePushNotifications({ onTokenRefresh } = {}) {
  const messaging = getNativeMessaging();
  if (!messaging || listenersInitialized) {
    return () => {};
  }
  listenersInitialized = true;

  ensureAndroidChannels();
  attachForegroundListener(messaging);
  attachNotificationOpenListeners(messaging);

  if (typeof onTokenRefresh === 'function') {
    const { onTokenRefresh: onTokenRefreshModular } = loadMessagingModular();
    tokenRefreshUnsub = onTokenRefreshModular(messaging, (token) => {
      devLog('[push-token] refreshed');
      onTokenRefresh(token);
    });
  }

  return cleanupNativePushNotifications;
}

export function cleanupNativePushNotifications() {
  if (typeof foregroundUnsub === 'function') {
    foregroundUnsub();
    foregroundUnsub = null;
  }
  if (typeof tokenRefreshUnsub === 'function') {
    tokenRefreshUnsub();
    tokenRefreshUnsub = null;
  }
  if (typeof notificationOpenedUnsub === 'function') {
    notificationOpenedUnsub();
    notificationOpenedUnsub = null;
  }
  listenersInitialized = false;
}

export async function getFirebaseToken() {
  const messaging = getNativeMessaging();
  if (!messaging) {
    return null;
  }
  try {
    const { getToken } = loadMessagingModular();
    const token = await getToken(messaging);
    if (token) {
      devLog('[push-token] obtained');
    }
    return token || null;
  } catch (err) {
    safeWarn('Failed to get FCM token', err);
    return null;
  }
}

/**
 * Subscribe to FCM token rotation. Returns unsubscribe function or null.
 * @param {(token: string) => void} onRefresh
 */
export function subscribeToTokenRefresh(onRefresh) {
  const messaging = getNativeMessaging();
  if (!messaging || typeof onRefresh !== 'function') {
    return null;
  }
  try {
    const { onTokenRefresh } = loadMessagingModular();
    return onTokenRefresh(messaging, onRefresh);
  } catch (err) {
    safeWarn('Token refresh listener failed', err);
    return null;
  }
}

/** @deprecated use initializeNativePushNotifications */
export function registerFirebaseListeners() {
  initializeNativePushNotifications();
}
