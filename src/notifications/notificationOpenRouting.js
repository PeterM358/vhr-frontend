import AsyncStorage from '@react-native-async-storage/async-storage';

import { navigateForClientNotification } from '../utils/clientNotificationRouting';
import { navigateShopNotification } from '../utils/shopNotificationRouting';
import { normalizeNotification } from '../utils/normalizeNotification';
import { devLog } from '../utils/logger';

let navigationRef = null;
let pendingOpenPayload = null;

export function isAuthBootstrapPending(nav) {
  const state = nav.getRootState?.();
  if (!state?.routes?.length) return true;
  return state.routes[state.index]?.name === 'AuthLoading';
}

async function isSessionAuthenticated() {
  try {
    const token = await AsyncStorage.getItem('@access_token');
    return !!(token && token !== 'null' && token !== 'undefined');
  } catch {
    return false;
  }
}

function shouldDeferNotificationOpen(nav, isAuthenticated) {
  return (
    !isAuthenticated ||
    !nav?.isReady?.() ||
    isAuthBootstrapPending(nav)
  );
}

export function setNotificationNavigationRef(ref) {
  navigationRef = ref;
}

export function buildNotificationItemFromPushPayload(remoteMessage) {
  const data = { ...(remoteMessage?.data || {}) };
  if (remoteMessage?.notification?.title && !data.title) {
    data.title = remoteMessage.notification.title;
  }
  if (remoteMessage?.notification?.body && !data.body) {
    data.body = remoteMessage.notification.body;
  }
  if (!Object.keys(data).length) return null;

  const notificationId = data.notification_id != null ? Number(data.notification_id) : null;
  return normalizeNotification({
    id: Number.isFinite(notificationId) ? notificationId : undefined,
    title: data.title,
    body: data.body,
    repair: data.repair_id != null ? Number(data.repair_id) : null,
    offer: data.offer_id != null ? Number(data.offer_id) : null,
    promotion: data.promotion_id != null ? Number(data.promotion_id) : null,
    event_type: data.event_type || data.notification_type,
    data,
  });
}

async function routeOpenNotification(item) {
  const nav = navigationRef?.current;
  if (!nav?.isReady?.() || !item) return false;

  const isShop = (await AsyncStorage.getItem('@is_shop')) === 'true';
  if (isShop) {
    return navigateShopNotification(nav, item);
  }
  return navigateForClientNotification(nav, item);
}

export async function handleNotificationOpen(remoteMessage, { isAuthenticated } = {}) {
  const item = buildNotificationItemFromPushPayload(remoteMessage);
  if (!item) return;

  devLog('[notification-open]', {
    event_type: item?.data?.event_type,
    notification_id: item?.data?.notification_id ?? item?.id,
  });

  const authenticated =
    typeof isAuthenticated === 'boolean' ? isAuthenticated : await isSessionAuthenticated();
  const nav = navigationRef?.current;

  if (shouldDeferNotificationOpen(nav, authenticated)) {
    pendingOpenPayload = item;
    devLog('[notification-open] deferred until auth/navigation ready');
    return;
  }

  await routeOpenNotification(item);
}

export async function flushPendingNotificationNavigation(isAuthenticated) {
  if (!pendingOpenPayload || !isAuthenticated || !navigationRef?.current?.isReady?.()) {
    return;
  }
  const nav = navigationRef.current;
  if (isAuthBootstrapPending(nav)) {
    devLog('[notification-open] waiting for auth bootstrap');
    return;
  }
  const item = pendingOpenPayload;
  pendingOpenPayload = null;
  devLog('[notification-open] flushing pending navigation');
  await routeOpenNotification(item);
}

export function clearPendingNotificationNavigation() {
  pendingOpenPayload = null;
}
