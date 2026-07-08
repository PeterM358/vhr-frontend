function normalizeKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\u2013\u2014]/g, '-') // normalize dashes
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const VEHICLE_TYPE_KEY_BY_CODE = {
  car: 'seo.vehicleTypes.car',
  truck: 'seo.vehicleTypes.truck',
  motorcycle: 'seo.vehicleTypes.motorcycle',
  bike: 'seo.vehicleTypes.bicycle',
  bicycle: 'seo.vehicleTypes.bicycle',
  ebike: 'seo.vehicleTypes.ebike',
  'e-bike': 'seo.vehicleTypes.ebike',
  scooter: 'seo.vehicleTypes.scooter',
  van: 'seo.vehicleTypes.van',
  trailer: 'seo.vehicleTypes.trailer',
  agricultural: 'seo.vehicleTypes.agricultural',
  construction: 'seo.vehicleTypes.construction',
  other: 'seo.vehicleTypes.other',
};

function camelCaseFromSlug(slug) {
  return String(slug || '')
    .split('-')
    .filter(Boolean)
    .map((part, idx) => (idx === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join('');
}

export function translateVehicleTypeLabel(value, t) {
  if (!value) return '';

  const v = typeof value === 'string' ? { name: value } : value;
  const rawCode = v.vehicle_type_code || v.code || v.slug || v.vehicleTypeCode || v.type_code;
  const rawName = v.name || v.vehicle_type_name || v.vehicleTypeName;

  const code = normalizeKey(rawCode || rawName);
  const key = VEHICLE_TYPE_KEY_BY_CODE[code];
  if (key) return t(key, null, String(rawName || rawCode || value));

  // Last-resort fallback for cases where only an English label is available.
  const nameKey = normalizeKey(rawName);
  const fallbackKey = VEHICLE_TYPE_KEY_BY_CODE[nameKey];
  if (fallbackKey) return t(fallbackKey, null, String(rawName || value));

  return String(rawName || rawCode || value).trim();
}

export function translateRepairTypeLabel(value, t) {
  if (!value) return '';

  const v = typeof value === 'string' ? { name: value } : value;

  const rawSlug = v.slug || v.repair_type_slug || v.code || v.repair_type_code;
  const rawName = v.repair_type_name || v.name;

  // Backend exposes only English names (no locale-aware translations), so we:
  // 1) derive the seeded slug from the name
  // 2) map it to `repairs.<camelCase(slug)>` i18n keys.
  const slugSource = rawSlug || rawName || value;
  const slug = normalizeKey(slugSource);
  const camel = camelCaseFromSlug(slug);

  if (camel) {
    const key = `repairs.${camel}`;
    const fallbackSentinel = '__MISSING_REPAIR_TRANSLATION__';
    const translated = t(key, null, fallbackSentinel);
    if (translated !== fallbackSentinel) return translated;

    // Backward-compatible aliases:
    // Older catalogs use `repairs.acService` to represent both AC repair and AC diagnostics.
    if (camel === 'acRepair' || camel === 'acDiagnostics') {
      return t('repairs.acService', null, String(rawName || rawSlug || value));
    }
  }

  return String(rawName || rawSlug || value).trim();
}

export function translateVehicleTypeLabels(values, t) {
  return (values || []).map((v) => translateVehicleTypeLabel(v, t)).filter(Boolean);
}

export function translateRepairTypeLabels(values, t) {
  return (values || []).map((v) => translateRepairTypeLabel(v, t)).filter(Boolean);
}

