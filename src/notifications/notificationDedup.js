/** In-memory dedup for notification_id + event_key across WebSocket + FCM + banners. */

const seenNotificationIds = new Set();
const seenEventKeys = new Set();
const bannerSeenKeys = new Set();

export function markNotificationSeen(notificationId, eventKey) {
  if (notificationId != null && notificationId !== '') {
    seenNotificationIds.add(String(notificationId));
  }
  if (eventKey != null && eventKey !== '') {
    seenEventKeys.add(String(eventKey));
  }
}

export function hasSeenNotification(notificationId, eventKey) {
  if (eventKey != null && eventKey !== '' && seenEventKeys.has(String(eventKey))) {
    return true;
  }
  if (notificationId == null || notificationId === '') return false;
  return seenNotificationIds.has(String(notificationId));
}

export function markBannerSeen(key) {
  if (key == null || key === '') return;
  bannerSeenKeys.add(String(key));
}

export function hasBannerSeen(key) {
  if (key == null || key === '') return false;
  return bannerSeenKeys.has(String(key));
}

export function resetNotificationDedup() {
  seenNotificationIds.clear();
  seenEventKeys.clear();
  bannerSeenKeys.clear();
}
