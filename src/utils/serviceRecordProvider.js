/**
 * Labels for owner-logged service record provider and trust hints.
 */

export function formatServiceRecordProvider(repair) {
  if (!repair) return 'Not specified';
  if (repair.self_repair) return 'Self repair';

  const shopId = repair.shop_profile ?? repair.shop_profile_id;
  const shopName = String(repair.shop_profile_name || '').trim();
  if (shopId && shopName) return shopName;
  if (shopId) return 'Authorized service center';

  const manualName = String(repair.manual_service_center_name || '').trim();
  if (manualName) return manualName;

  const hasManual =
    String(repair.manual_service_center_address || '').trim() ||
    String(repair.manual_service_center_phone || '').trim() ||
    String(repair.manual_service_center_email || '').trim() ||
    repair.manual_service_center_latitude != null ||
    repair.manual_service_center_longitude != null;
  if (hasManual) return 'Unlisted service center';

  if (shopName) return shopName;
  return 'Not specified';
}

/** Simple trust / evidence hint for owner-logged rows (confirmation flow is future). */
export function formatOwnerLoggedTrustLabel(repair) {
  if (!repair || repair.source !== 'owner_logged') return null;

  if (repair.self_repair) {
    return 'Owner logged · Self repair (low trust until evidence)';
  }

  const shopId = repair.shop_profile ?? repair.shop_profile_id;
  if (shopId) {
    const confirmed = repair.evidence_level === 'service_center_confirmed';
    if (confirmed) {
      return 'Service center confirmed (high trust)';
    }
    return 'Owner logged with authorized center (medium until center confirms)';
  }

  const hasManual =
    String(repair.manual_service_center_name || '').trim() ||
    String(repair.manual_service_center_address || '').trim() ||
    String(repair.manual_service_center_phone || '').trim() ||
    String(repair.manual_service_center_email || '').trim();
  if (hasManual) {
    const withPhotos =
      repair.evidence_level === 'owner_with_photos' ||
      repair.evidence_level === 'receipt_attached';
    return withPhotos
      ? 'Owner logged · Unlisted center (medium with photos/receipt)'
      : 'Owner logged · Unlisted center (low–medium until evidence)';
  }

  return 'Owner logged (low trust until evidence)';
}
