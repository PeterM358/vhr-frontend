/** In-memory dedup for notification_id across WebSocket + FCM foreground. */

const seenNotificationIds = new Set();

export function markNotificationSeen(notificationId) {
  if (notificationId == null || notificationId === '') return;
  seenNotificationIds.add(String(notificationId));
}

export function hasSeenNotification(notificationId) {
  if (notificationId == null || notificationId === '') return false;
  return seenNotificationIds.has(String(notificationId));
}

export function resetNotificationDedup() {
  seenNotificationIds.clear();
}
