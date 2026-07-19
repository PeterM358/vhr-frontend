/**
 * Lightweight partner in-app alert copy for one high-signal event family.
 * Uses existing notification templates — no new toast system.
 */

import {
  partnerInAppAlertEventType,
  shouldShowPartnerInAppAlert,
} from './partnerNavChrome';

export { shouldShowPartnerInAppAlert, partnerInAppAlertEventType };

/**
 * @returns {{ title: string, body: string } | null}
 */
export function partnerInAppAlertCopy(item, t) {
  if (!shouldShowPartnerInAppAlert(item)) return null;
  const eventType = partnerInAppAlertEventType(item);
  const titleKey = `partnerDashboard.notifications.templates.${eventType}.title`;
  const bodyKey = `partnerDashboard.notifications.templates.${eventType}.body`;
  const title = t(titleKey, null, null);
  const body = t(bodyKey, null, null);
  return {
    title:
      title && title !== titleKey
        ? title
        : item?.title || 'Vehicle arrival',
    body:
      body && body !== bodyKey
        ? body
        : item?.body || item?.message || '',
  };
}
