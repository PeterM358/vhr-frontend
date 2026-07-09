/**
 * Labels for owner-logged service record provider and trust hints.
 */

export function formatServiceRecordProvider(repair, translateFn) {
  const tr = (key, fallback) =>
    translateFn ? translateFn(key, null, fallback) : fallback;

  if (!repair) return tr('vehicles.detail.notSpecified', 'Not specified');
  if (repair.self_repair) return tr('vehicles.detail.providerSelfRepair', 'Self repair');

  const shopId = repair.shop_profile ?? repair.shop_profile_id;
  const shopName = String(repair.shop_profile_name || '').trim();
  if (shopId && shopName) return shopName;
  if (shopId) return tr('vehicles.detail.providerAuthorizedCenter', 'Authorized service center');

  const manualName = String(repair.manual_service_center_name || '').trim();
  if (manualName) return manualName;

  const hasManual =
    String(repair.manual_service_center_address || '').trim() ||
    String(repair.manual_service_center_city || '').trim() ||
    String(repair.manual_service_center_country || '').trim() ||
    String(repair.manual_service_center_phone || '').trim() ||
    String(repair.manual_service_center_email || '').trim() ||
    repair.manual_service_center_latitude != null ||
    repair.manual_service_center_longitude != null;
  if (hasManual) return tr('vehicles.detail.providerWorkshop', 'Workshop');

  if (shopName) return shopName;
  return tr('vehicles.detail.notSpecified', 'Not specified');
}

export function ownerLoggedConfirmationStatus(repair) {
  const raw = String(repair?.service_center_confirmation_status || '').toLowerCase();
  if (['none', 'pending', 'confirmed', 'rejected'].includes(raw)) return raw;
  if (repair?.source === 'service_center_direct') return 'confirmed';
  return 'none';
}

/** Simple trust / evidence hint for owner-logged rows. */
export function formatOwnerLoggedTrustLabel(repair) {
  if (!repair || repair.source !== 'owner_logged') return null;

  if (repair.self_repair) {
    return 'Owner logged · Self repair (low trust until evidence)';
  }

  const shopId = repair.shop_profile ?? repair.shop_profile_id;
  if (shopId) {
    const status = ownerLoggedConfirmationStatus(repair);
    if (status === 'confirmed' || repair.evidence_level === 'service_center_confirmed') {
      return 'Service center confirmed (high trust)';
    }
    if (status === 'pending') {
      return 'Confirmation requested from selected service center';
    }
    if (status === 'rejected') {
      return 'Service center did not confirm this owner-logged record';
    }
    return 'Workshop attributed (owner logged with selected service center)';
  }

  const hasManual =
    String(repair.manual_service_center_name || '').trim() ||
    String(repair.manual_service_center_address || '').trim() ||
    String(repair.manual_service_center_city || '').trim() ||
    String(repair.manual_service_center_country || '').trim() ||
    String(repair.manual_service_center_phone || '').trim() ||
    String(repair.manual_service_center_email || '').trim();
  if (hasManual) {
    const withPhotos =
      repair.evidence_level === 'owner_with_photos' ||
      repair.evidence_level === 'receipt_attached';
    return withPhotos
      ? 'Owner logged · Workshop (medium with photos/receipt)'
      : 'Owner logged · Workshop (low–medium until evidence)';
  }

  return 'Owner logged (low trust until evidence)';
}

/** Shop/history cards: who did the work vs how the row was created. */
export function formatServiceRecordLabels(repair) {
  if (!repair) {
    return { performedBy: 'Not specified', recordOrigin: '', recordTrust: '' };
  }

  let performedBy = 'Not specified';
  if (repair.self_repair) {
    performedBy = 'Owner (self-repair)';
  } else if (repair.performed_by) {
    performedBy = repair.performed_by;
  } else if (repair.shop_profile_name || repair.shop_name) {
    performedBy = repair.shop_profile_name || repair.shop_name;
  } else if (String(repair.manual_service_center_name || '').trim()) {
    performedBy = repair.manual_service_center_name.trim();
  }

  const recordOrigin =
    repair.record_origin ||
    (repair.source === 'marketplace_request'
      ? 'Client request on platform'
      : repair.source === 'owner_logged'
        ? 'Owner added to vehicle history'
        : repair.source === 'service_center_direct'
          ? 'Service center job on platform'
          : '');

  const recordTrust =
    repair.record_trust ||
    formatOwnerLoggedTrustLabel(repair) ||
    (repair.evidence_level === 'service_center_confirmed'
      ? 'High — shop confirmed on platform'
      : repair.evidence_level
        ? String(repair.evidence_level).replace(/_/g, ' ')
        : '');

  return { performedBy, recordOrigin, recordTrust };
}
