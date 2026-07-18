/**
 * Where a client notification should open in the app.
 */

import { Platform } from 'react-native';
import { navigateToRepairDetail, navigateToVehicleHistoryAccess } from '../navigation/webNavigation';
import { isVehicleHistoryAccessClientEvent } from './partnerNavChrome';

export function notificationEventType(item) {
  return (
    item?.event_type ||
    item?.notification_type ||
    item?.data?.event_type ||
    item?.data?.notification_type ||
    ''
  );
}

function vehicleIdFromNotification(item) {
  const raw =
    item?.data?.vehicle_id ??
    item?.vehicle_id ??
    item?.data?.vehicleId ??
    null;
  if (raw == null || raw === '') return null;
  return String(raw);
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

export function isVehicleHistoryAccessNotification(item) {
  return isVehicleHistoryAccessClientEvent(notificationEventType(item));
}

export function navigateForClientNotification(navigation, item, options = {}) {
  if (!item) return false;

  const returnTo = options.returnTo;

  if (isVehicleHistoryAccessNotification(item)) {
    const vehicleId = vehicleIdFromNotification(item);
    if (vehicleId) {
      const accessParams = {
        returnTo: returnTo || 'ClientVehicles',
        requestId: item?.data?.request_id || item?.request_id || undefined,
      };
      if (Platform.OS === 'web') {
        navigateToVehicleHistoryAccess(navigation, vehicleId, accessParams);
      } else {
        navigation.navigate('VehicleHistoryAccess', {
          vehicleId,
          ...accessParams,
        });
      }
      return true;
    }
  }

  if (item.promotion) {
    navigation.navigate('PromotionDetail', { promotionId: item.promotion });
    return true;
  }

  if (item.repair) {
    const params = { repairId: item.repair, returnTo: returnTo || 'ClientRepairs' };
    if (Platform.OS === 'web') {
      navigateToRepairDetail(navigation, item.repair, params);
    } else {
      navigation.navigate('RepairDetail', params);
    }
    return true;
  }

  if (item.offer) {
    const params = { repairId: item.offer, returnTo: returnTo || 'ClientRepairs' };
    if (Platform.OS === 'web') {
      navigateToRepairDetail(navigation, item.offer, params);
    } else {
      navigation.navigate('RepairDetail', params);
    }
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
  if (isVehicleHistoryAccessNotification(item)) {
    return 'Tap to review the history access request';
  }
  if (String(notificationEventType(item)).toLowerCase() === 'invoice_issued') {
    return 'Tap to view the related service';
  }
  if (item?.repair) {
    return 'Tap to open repair';
  }
  return null;
}
