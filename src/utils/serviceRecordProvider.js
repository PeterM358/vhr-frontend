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
export function formatOwnerLoggedTrustLabel(repair, translateFn) {
  const tr = (key, fallback) =>
    translateFn ? translateFn(key, null, fallback) : fallback;

  if (!repair || repair.source !== 'owner_logged') return null;

  if (repair.self_repair) {
    return tr(
      'serviceRecord.trust.ownerSelfRepair',
      'Owner logged · Self repair (low trust until evidence)'
    );
  }

  const shopId = repair.shop_profile ?? repair.shop_profile_id;
  if (shopId) {
    const status = ownerLoggedConfirmationStatus(repair);
    if (status === 'confirmed' || repair.evidence_level === 'service_center_confirmed') {
      return tr(
        'serviceRecord.trust.serviceCenterConfirmed',
        'Service center confirmed (high trust)'
      );
    }
    if (status === 'pending') {
      return tr(
        'serviceRecord.trust.confirmationRequested',
        'Confirmation requested from selected service center'
      );
    }
    if (status === 'rejected') {
      return tr(
        'serviceRecord.trust.serviceCenterRejected',
        'Service center did not confirm this owner-logged record'
      );
    }
    return tr(
      'serviceRecord.trust.workshopAttributed',
      'Workshop attributed (owner logged with selected service center)'
    );
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
      ? tr(
          'serviceRecord.trust.ownerWorkshopWithProof',
          'Owner logged · Workshop (medium with photos/receipt)'
        )
      : tr(
          'serviceRecord.trust.ownerWorkshopLow',
          'Owner logged · Workshop (low–medium until evidence)'
        );
  }

  return tr('serviceRecord.trust.ownerLoggedLow', 'Owner logged (low trust until evidence)');
}

function isOwnerSelfRepairLabel(value) {
  const raw = String(value || '').trim().toLowerCase();
  return raw === 'owner (self-repair)' || raw === 'owner (self repair)';
}

/**
 * Shop/history cards: who did the work vs how the row was created.
 * Pass translateFn (t) for BG+EN; without it returns English fallbacks.
 */
export function formatServiceRecordLabels(repair, translateFn) {
  const tr = (key, fallback) =>
    translateFn ? translateFn(key, null, fallback) : fallback;

  if (!repair) {
    return {
      performedBy: tr('serviceRecord.performedByNotSpecified', 'Not specified'),
      recordOrigin: '',
      recordTrust: '',
    };
  }

  let performedBy = tr('serviceRecord.performedByNotSpecified', 'Not specified');
  if (repair.self_repair || isOwnerSelfRepairLabel(repair.performed_by)) {
    performedBy = tr('serviceRecord.performedByOwnerSelf', 'Owner (self-repair)');
  } else if (repair.performed_by && !isOwnerSelfRepairLabel(repair.performed_by)) {
    // Prefer proper nouns (shop names) from API; only translate known boilerplate.
    const pb = String(repair.performed_by).trim();
    if (pb.toLowerCase() === 'service center' || pb.toLowerCase() === 'not specified') {
      performedBy =
        pb.toLowerCase() === 'service center'
          ? tr('serviceRecord.performedByServiceCenter', 'Service center')
          : tr('serviceRecord.performedByNotSpecified', 'Not specified');
    } else {
      performedBy = pb;
    }
  } else if (repair.shop_profile_name || repair.shop_name) {
    performedBy = repair.shop_profile_name || repair.shop_name;
  } else if (String(repair.manual_service_center_name || '').trim()) {
    performedBy = repair.manual_service_center_name.trim();
  }

  const source = repair.source;
  const evidence = repair.evidence_level;
  const confirmation = String(repair.service_center_confirmation_status || '').toLowerCase();

  let recordOrigin = '';
  let recordTrust = '';

  if (source === 'marketplace_request') {
    if (repair.status === 'done' && (repair.shop_profile || repair.shop_profile_id || repair.shop_name)) {
      recordOrigin = tr(
        'serviceRecord.origin.clientRequestCompleted',
        'Client request completed by a service center'
      );
      recordTrust =
        evidence === 'service_center_confirmed'
          ? tr('serviceRecord.trust.finalizedByShop', 'High — finalized by shop on platform')
          : tr('serviceRecord.trust.reviewPhotos', 'Review photos or invoice if needed');
    } else if (repair.status === 'open') {
      recordOrigin = tr(
        'serviceRecord.origin.openClientRequest',
        'Open client request (not completed yet)'
      );
      recordTrust = tr('serviceRecord.trust.noServiceYet', 'No service performed yet');
    } else {
      recordOrigin = tr(
        'serviceRecord.origin.startedFromClientRequest',
        'Started from a client request'
      );
      recordTrust = tr('serviceRecord.trust.inProgress', 'In progress on platform');
    }
  } else if (source === 'owner_logged') {
    recordOrigin = tr(
      'serviceRecord.origin.ownerAdded',
      'Owner added this to vehicle history'
    );
    if (evidence === 'service_center_confirmed' || confirmation === 'confirmed') {
      recordTrust = tr(
        'serviceRecord.trust.serviceCenterConfirmedRecord',
        'High — service center confirmed the record'
      );
    } else if (
      evidence === 'owner_with_photos' ||
      evidence === 'receipt_attached' ||
      evidence === 'platform_invoice_linked'
    ) {
      recordTrust = tr(
        'serviceRecord.trust.ownerAttachedProof',
        'Medium — owner attached proof'
      );
    } else {
      recordTrust = tr(
        'serviceRecord.trust.ownerTypedNotLiveJob',
        'Owner typed this — not the same as a live shop job on the platform'
      );
    }
  } else if (source === 'service_center_direct') {
    recordOrigin = tr(
      'serviceRecord.origin.shopLogged',
      'Service center logged this job on the platform'
    );
    recordTrust = tr(
      'serviceRecord.trust.shopEntered',
      'High — shop-entered service record'
    );
  } else if (repair.record_origin || repair.record_trust) {
    // Fall back to API English only when we cannot classify source.
    recordOrigin = repair.record_origin || '';
    recordTrust = repair.record_trust || '';
  } else if (source) {
    recordOrigin = tr('serviceRecord.origin.imported', 'Imported or external record');
    recordTrust = evidence
      ? String(evidence).replace(/_/g, ' ')
      : '';
  }

  if (!recordTrust) {
    recordTrust =
      formatOwnerLoggedTrustLabel(repair, translateFn) ||
      (evidence === 'service_center_confirmed'
        ? tr('serviceRecord.trust.highShopConfirmed', 'High — shop confirmed on platform')
        : '');
  }

  return { performedBy, recordOrigin, recordTrust };
}
