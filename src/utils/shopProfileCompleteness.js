/**
 * Public profile completion — inferred from ShopProfile + related UI state.
 * No backend completeness flag. Structured for future per-section onboarding.
 */

import { parseOptionalCoordinate } from './manualServiceCenter';

export const SHOP_PROFILE_BUILD_SECTIONS = [
  'public_preview',
  'business',
  'contact_location',
  'operations',
  'photos',
  'working_hours',
  'warranty',
  'company',
  'warehouse',
  'online_presence',
];

/** Required for the public profile completion bar. */
export const PUBLIC_PROFILE_REQUIRED_KEYS = [
  'business name',
  'description',
  'address',
  'phone',
  'working hours',
  'photos',
  'operation',
  'operation price',
  'legal name',
  'vat number',
  'invoice address',
];

/** Soft polish — shown as optional hints, not required. */
export const PUBLIC_PROFILE_OPTIONAL_KEYS = [
  'google business',
  'facebook',
  'instagram',
  'warranty',
  'warehouse',
];

/** Minimum fields to start serving jobs (map discovery gate). */
export const ESSENTIAL_GATE_KEYS = [
  'business name',
  'map pin',
  'address',
  'city',
  'country',
  'vehicle type',
];

function hasValidMapPin(profile) {
  const lat = parseOptionalCoordinate(profile?.latitude);
  const lon = parseOptionalCoordinate(profile?.longitude);
  if (lat == null || lon == null) return false;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return false;
  return true;
}

function vehicleTypeIds(profile, options = {}) {
  const fromOptions = options.vehicleTypeIds;
  if (Array.isArray(fromOptions)) {
    return fromOptions.filter((id) => id != null).map((id) => Number(id));
  }
  const fromProfile = profile?.supported_vehicle_types;
  if (Array.isArray(fromProfile)) {
    return fromProfile.filter((id) => id != null).map((id) => Number(id));
  }
  return [];
}

function hasPhone(profile) {
  if (String(profile?.phone_e164 || '').trim()) return true;
  if (String(profile?.phone || '').trim()) return true;
  const national = String(profile?.phone_national || '').trim();
  const prefix = String(profile?.phone_country_code || '').trim();
  return Boolean(national && prefix);
}

function hasWorkingHours(profile, options = {}) {
  if (options.hasWorkingHours === true) return true;
  if (options.hasWorkingHours === false) return false;
  const hours = options.workingHours ?? profile?.working_hours;
  if (!hours || typeof hours !== 'object' || Array.isArray(hours)) return false;
  return Object.keys(hours).some((key) => {
    if (key === 'lunch_break') return false;
    const row = hours[key];
    if (!row || typeof row !== 'object') return false;
    if (row.closed) return false;
    return Boolean(String(row.start || '').trim() && String(row.end || '').trim());
  });
}

function photoCount(profile, options = {}) {
  if (typeof options.photoCount === 'number') return options.photoCount;
  return Array.isArray(profile?.images) ? profile.images.length : 0;
}

function selectedOperationIds(profile, options = {}) {
  if (Array.isArray(options.operationIds)) {
    return options.operationIds.filter((id) => id != null).map((id) => Number(id));
  }
  const fromProfile = profile?.available_repairs;
  if (Array.isArray(fromProfile)) {
    return fromProfile.filter((id) => id != null).map((id) => Number(id));
  }
  return [];
}

function menuItemHasPrice(item) {
  if (!item) return false;
  return (
    item.price_from != null ||
    item.price_to != null ||
    item.labor_from != null ||
    item.labor_to != null ||
    item.parts_from != null ||
    item.parts_to != null
  );
}

function hasPricedOperation(options = {}) {
  if (options.hasOperationPrice === true) return true;
  if (options.hasOperationPrice === false) return false;
  const items = Array.isArray(options.serviceMenuItems) ? options.serviceMenuItems : [];
  const selected = new Set(selectedOperationIds(null, options));
  if (!selected.size) {
    return items.some((item) => menuItemHasPrice(item));
  }
  return items.some(
    (item) => selected.has(Number(item.repair_type)) && menuItemHasPrice(item)
  );
}

function hasInvoiceTaxId(legalEntity) {
  const vatRegistered = legalEntity?.vat_registered !== false;
  const vat = String(legalEntity?.vat_number || '').trim();
  const eik = String(legalEntity?.eik_number || '').trim();
  if (vatRegistered) return Boolean(vat);
  return Boolean(eik || vat);
}

function hasInvoiceAddress(profile) {
  return Boolean(
    String(profile?.invoice_address_line1 || '').trim() || String(profile?.address || '').trim()
  );
}

function resolveLegalEntity(profile, options = {}) {
  if (options.legalEntity) return options.legalEntity;
  return profile?.legal_entity_detail || null;
}

function fieldMissingMap(profile, options = {}) {
  const ops = selectedOperationIds(profile, options);
  const legalEntity = resolveLegalEntity(profile, options);
  return {
    'business name': !String(profile?.name || '').trim(),
    description: !String(profile?.description || '').trim(),
    address: !String(profile?.address || '').trim(),
    phone: !hasPhone(profile),
    'working hours': !hasWorkingHours(profile, options),
    photos: photoCount(profile, options) < 3,
    operation: ops.length < 1,
    'operation price': !hasPricedOperation({ ...options, operationIds: ops }),
    'map pin': !hasValidMapPin(profile),
    country: !profile?.country,
    city: !profile?.city,
    'vehicle type': !vehicleTypeIds(profile, options).length,
    'legal name': !String(legalEntity?.legal_name || '').trim(),
    'vat number': !hasInvoiceTaxId(legalEntity),
    'invoice address': !hasInvoiceAddress(profile),
    'google business': true,
    facebook: !String(profile?.facebook_url || '').trim(),
    instagram: !String(profile?.instagram_url || '').trim(),
    warranty: profile?.offers_guarantee !== true,
    warehouse: !profile?.warehouse_enabled,
  };
}

/**
 * Required public-profile fields still missing (completion bar).
 * @param {object|null} profile
 * @param {object} [options]
 */
export function getShopProfileIncompleteFields(profile, options = {}) {
  if (!profile) {
    return [...PUBLIC_PROFILE_REQUIRED_KEYS];
  }
  const missing = fieldMissingMap(profile, options);
  return PUBLIC_PROFILE_REQUIRED_KEYS.filter((key) => missing[key]);
}

/**
 * Essentials to open repair requests / map discovery (stricter gate, fewer fields).
 */
export function getShopProfileGateIncompleteFields(profile, options = {}) {
  if (!profile) {
    return [...ESSENTIAL_GATE_KEYS];
  }
  const missing = fieldMissingMap(profile, options);
  return ESSENTIAL_GATE_KEYS.filter((key) => missing[key]);
}

export function isShopProfileEssentialsComplete(profile, options = {}) {
  return getShopProfileGateIncompleteFields(profile, options).length === 0;
}

export function hasShopMapPin(profile) {
  return hasValidMapPin(profile);
}

export function getShopProfileCompletionPercent(profile, options = {}) {
  const missing = getShopProfileIncompleteFields(profile, options);
  const done = PUBLIC_PROFILE_REQUIRED_KEYS.length - missing.length;
  return Math.max(
    0,
    Math.min(100, Math.round((done / PUBLIC_PROFILE_REQUIRED_KEYS.length) * 100))
  );
}

/** Optional polish items (not required). */
export function getShopProfileStrengthHints(profile, options = {}) {
  const missing = fieldMissingMap(profile, options);
  const hints = [];
  if (!missing.facebook) hints.push('facebook');
  if (!missing.instagram) hints.push('instagram');
  if (!missing.warranty) hints.push('warranty');
  if (!missing.warehouse) hints.push('warehouse');
  if (!missing['google business']) hints.push('google business');
  return hints;
}

export function getShopProfileOptionalMissing(profile, options = {}) {
  if (!profile) return [...PUBLIC_PROFILE_OPTIONAL_KEYS];
  const missing = fieldMissingMap(profile, options);
  return PUBLIC_PROFILE_OPTIONAL_KEYS.filter((key) => missing[key]);
}

/**
 * Per-section completion snapshot for future guided onboarding.
 * @returns {{ key: string, completed: boolean, missingFields: string[], completionPercent: number }}
 */
export function getShopProfileSectionStatus(sectionKey, profile, options = {}) {
  const missingMap = profile ? fieldMissingMap(profile, options) : null;

  const sectionRequired = {
    public_preview: [],
    business: ['business name', 'description'],
    contact_location: ['address', 'phone', 'map pin', 'city', 'country'],
    operations: ['operation', 'operation price', 'vehicle type'],
    photos: ['photos'],
    working_hours: ['working hours'],
    warranty: [],
    company: ['legal name', 'vat number', 'invoice address'],
    warehouse: [],
    online_presence: [],
  };

  const optionalForSection = {
    warranty: ['warranty'],
    warehouse: ['warehouse'],
    online_presence: ['google business', 'facebook', 'instagram'],
  };

  const required = sectionRequired[sectionKey] || [];
  const optional = optionalForSection[sectionKey] || [];

  if (!profile || !missingMap) {
    return {
      key: sectionKey,
      completed: false,
      missingFields: required,
      completionPercent: 0,
      optionalMissing: optional,
    };
  }

  const missingFields = required.filter((key) => missingMap[key]);
  const optionalMissing = optional.filter((key) => missingMap[key]);
  const total = required.length || 1;
  const done = total - missingFields.length;
  const completionPercent =
    required.length === 0
      ? optional.length
        ? Math.round(((optional.length - optionalMissing.length) / optional.length) * 100)
        : 100
      : Math.round((done / total) * 100);

  return {
    key: sectionKey,
    completed: missingFields.length === 0,
    missingFields,
    completionPercent,
    optionalMissing,
  };
}

export function getAllShopProfileSectionStatuses(profile, options = {}) {
  return SHOP_PROFILE_BUILD_SECTIONS.map((key) =>
    getShopProfileSectionStatus(key, profile, options)
  );
}
