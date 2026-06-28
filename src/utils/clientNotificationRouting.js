/**
 * Where a client notification should open in the app.
 */

export function notificationEventType(item) {
  return (
    item?.event_type ||
    item?.notification_type ||
    item?.data?.event_type ||
    item?.data?.notification_type ||
    ''
  );
}

export function isRescheduleNotification(item) {
  const t = String(notificationEventType(item)).toLowerCase();
  if (t === 'reschedule_proposed') return true;
  const title = String(item?.title || '').toLowerCase();
  return title.includes('reschedule');
}

export function isRepairScheduledNotification(item) {
  const t = String(notificationEventType(item)).toLowerCase();
  return t === 'repair_scheduled' || String(item?.title || '').toLowerCase().includes('appointment scheduled');
}

export function isRepairReadyNotification(item) {
  const t = String(notificationEventType(item)).toLowerCase();
  return t === 'repair_ready_for_pickup' || String(item?.title || '').toLowerCase().includes('ready for pickup');
}

export function navigateForClientNotification(navigation, item, options = {}) {
  if (!item) return false;

  const returnTo = options.returnTo;

  if (item.promotion) {
    navigation.navigate('PromotionDetail', { promotionId: item.promotion });
    return true;
  }

  if (item.repair) {
    navigation.navigate('RepairDetail', {
      repairId: item.repair,
      ...(returnTo ? { returnTo } : {}),
    });
    return true;
  }

  if (item.offer) {
    navigation.navigate('RepairDetail', {
      repairId: item.offer,
      ...(returnTo ? { returnTo } : {}),
    });
    return true;
  }

  return false;
}

export function notificationActionHint(item) {
  if (isRescheduleNotification(item)) {
    return 'Tap to accept or decline the new time';
  }
  if (isRepairScheduledNotification(item)) {
    return 'Tap to view appointment details';
  }
  if (isRepairReadyNotification(item)) {
    return 'Tap to view completed service details';
  }
  if (item?.repair) {
    return 'Tap to open repair';
  }
  return null;
}
