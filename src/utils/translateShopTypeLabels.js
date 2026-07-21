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

const VEHICLE_CODE_ALIASES = {
  'agricultural-vehicle': 'agricultural',
  'agricultural-vehicles': 'agricultural',
  'construction-vehicle': 'construction',
  'construction-vehicles': 'construction',
  'e-bike': 'ebike',
  bike: 'bicycle',
};

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

const VEHICLE_TYPE_PUBLIC_KEY_BY_CODE = {
  car: 'vehicleTypes.public.car',
  truck: 'vehicleTypes.public.truck',
  motorcycle: 'vehicleTypes.public.motorcycle',
  bike: 'vehicleTypes.public.bicycle',
  bicycle: 'vehicleTypes.public.bicycle',
  ebike: 'vehicleTypes.public.ebike',
  'e-bike': 'vehicleTypes.public.ebike',
  scooter: 'vehicleTypes.public.scooter',
  van: 'vehicleTypes.public.van',
  trailer: 'vehicleTypes.public.trailer',
  agricultural: 'vehicleTypes.public.agricultural',
  construction: 'vehicleTypes.public.construction',
  other: 'vehicleTypes.public.other',
};

/** Slug → repairs.* i18n key (camelCase slug). */
const REPAIR_I18N_KEY_BY_SLUG = {
  'oil-change': 'repairs.oilChange',
  'filter-replacement': 'repairs.filterReplacement',
  'brake-fluid-change': 'repairs.brakeFluidChange',
  'coolant-change': 'repairs.coolantChange',
  'timing-belt-replacement': 'repairs.timingBeltReplacement',
  'chain-belt-service': 'repairs.chainBeltService',
  'engine-repair': 'repairs.engineRepair',
  'transmission-repair': 'repairs.transmissionRepair',
  'gearbox-repair': 'repairs.gearboxRepair',
  'suspension-repair': 'repairs.suspensionRepair',
  'brake-repair': 'repairs.brakeRepair',
  'clutch-repair': 'repairs.clutchRepair',
  diagnostics: 'repairs.diagnostics',
  'starter-repair': 'repairs.starterRepair',
  'alternator-repair': 'repairs.alternatorRepair',
  'ecu-programming': 'repairs.ecuProgramming',
  'tire-change': 'repairs.tireChange',
  'wheel-alignment': 'repairs.wheelAlignment',
  'tire-repair': 'repairs.tireRepair',
  'tire-storage': 'repairs.tireStorage',
  'paint-repair': 'repairs.paintRepair',
  'dent-repair': 'repairs.dentRepair',
  'windshield-repair': 'repairs.windshieldRepair',
  'ac-refill': 'repairs.acRefill',
  'ac-diagnostics': 'repairs.acDiagnostics',
  'ac-repair': 'repairs.acRepair',
  'battery-replacement': 'repairs.batteryReplacement',
  'battery-check': 'repairs.batteryCheck',
  'charging-system-check': 'repairs.chargingSystemCheck',
  'interior-cleaning': 'repairs.interiorCleaning',
  'exterior-detailing': 'repairs.exteriorDetailing',
  'engine-bay-cleaning': 'repairs.engineBayCleaning',
  'insurance-renewal': 'repairs.insuranceRenewal',
  'casco-insurance': 'repairs.cascoInsurance',
  'road-assistance': 'repairs.roadAssistance',
  'technical-inspection': 'repairs.technicalInspection',
  'annual-service-check': 'repairs.annualServiceCheck',
  'taxi-certification': 'repairs.taxiCertification',
  'tachograph-inspection': 'repairs.tachographInspection',
  'dashcam-installation': 'repairs.dashcamInstallation',
  'parking-sensors-installation': 'repairs.parkingSensorsInstallation',
  'tow-bar-installation': 'repairs.towBarInstallation',
  'bike-accessories-installation': 'repairs.bikeAccessoriesInstallation',
  'general-inspection': 'repairs.generalInspection',
};

function resolveVehicleTypeCode(rawCode, rawName) {
  const code = normalizeKey(rawCode || rawName);
  return VEHICLE_CODE_ALIASES[code] || code;
}

function camelCaseFromSlug(slug) {
  return String(slug || '')
    .split('-')
    .filter(Boolean)
    .map((part, idx) => (idx === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)))
    .join('');
}

function resolveRepairSlug(value) {
  const v = typeof value === 'string' ? { name: value } : value;
  const rawSlug = v.slug || v.repair_type_slug || v.code || v.repair_type_code;
  const rawName = v.repair_type_name || v.name;
  return normalizeKey(rawSlug || rawName || value);
}

export function translateVehicleTypeLabel(value, t, { public: publicLabel = false } = {}) {
  if (!value) return '';

  const v = typeof value === 'string' ? { name: value } : value;
  const rawCode = v.vehicle_type_code || v.code || v.slug || v.vehicleTypeCode || v.type_code;
  const rawName = v.name || v.vehicle_type_name || v.vehicleTypeName;

  const code = resolveVehicleTypeCode(rawCode, rawName);
  const keyMap = publicLabel ? VEHICLE_TYPE_PUBLIC_KEY_BY_CODE : VEHICLE_TYPE_KEY_BY_CODE;
  const key = keyMap[code];
  if (key) return t(key, null, String(rawName || rawCode || value));

  const nameKey = resolveVehicleTypeCode(null, rawName);
  const fallbackKey = keyMap[nameKey];
  if (fallbackKey) return t(fallbackKey, null, String(rawName || value));

  return String(rawName || rawCode || value).trim();
}

export function translateVehicleTypePublicLabel(value, t) {
  return translateVehicleTypeLabel(value, t, { public: true });
}

function humanizeSlugLabel(slug) {
  const raw = String(slug || '')
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!raw) return '';
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/** Slug → serviceCategories.* i18n key (camelCase slug). */
const SERVICE_CATEGORY_I18N_KEY_BY_SLUG = {
  maintenance: 'serviceCategories.maintenance',
  mechanical: 'serviceCategories.mechanical',
  'electrical-diagnostics': 'serviceCategories.electricalDiagnostics',
  'tires-wheels': 'serviceCategories.tiresWheels',
  'bodywork-paint': 'serviceCategories.bodyworkPaint',
  'air-conditioning': 'serviceCategories.airConditioning',
  'battery-charging': 'serviceCategories.batteryCharging',
  'cleaning-detailing': 'serviceCategories.cleaningDetailing',
  'insurance-documents': 'serviceCategories.insuranceDocuments',
  'inspections-legal': 'serviceCategories.inspectionsLegal',
  'accessories-installation': 'serviceCategories.accessoriesInstallation',
  other: 'serviceCategories.other',
};

function resolveCategorySlug(value) {
  const v = typeof value === 'string' ? { slug: value } : value || {};
  return normalizeKey(v.slug || v.category_slug || v.code || v.name || v.category_name);
}

export function translateRepairTypeLabel(value, t) {
  if (!value) return '';

  const slug = resolveRepairSlug(value);
  const v = typeof value === 'string' ? { name: value } : value;
  const rawName = v.repair_type_name || v.name || v.display_name || v.name_en || v.name_bg;
  const rawSlug = v.slug || v.repair_type_slug || v.code || v.repair_type_code;

  const explicitKey = REPAIR_I18N_KEY_BY_SLUG[slug];
  if (explicitKey) {
    return t(explicitKey, null, String(rawName || rawSlug || value));
  }

  const camel = camelCaseFromSlug(slug);
  if (camel) {
    const key = `repairs.${camel}`;
    const fallbackSentinel = '__MISSING_REPAIR_TRANSLATION__';
    const translated = t(key, null, fallbackSentinel);
    if (translated !== fallbackSentinel) return translated;

    if (camel === 'acRepair' || camel === 'acDiagnostics') {
      return t('repairs.acService', null, String(rawName || rawSlug || value));
    }
  }

  const fallback = String(rawName || '').trim() || humanizeSlugLabel(rawSlug || slug);
  return fallback || String(value).trim();
}

/**
 * Service category = grouping (Maintenance, Mechanical, …).
 * Repair type / operation = leaf service under a category.
 */
export function translateServiceCategoryLabel(value, t) {
  if (!value) return '';

  const slug = resolveCategorySlug(value);
  const v = typeof value === 'string' ? { name: value } : value || {};
  const rawName = v.category_name || v.name || v.display_name || v.name_en;

  const explicitKey = SERVICE_CATEGORY_I18N_KEY_BY_SLUG[slug];
  if (explicitKey) {
    return t(explicitKey, null, String(rawName || slug || value));
  }

  const camel = camelCaseFromSlug(slug);
  if (camel) {
    const key = `serviceCategories.${camel}`;
    const fallbackSentinel = '__MISSING_CATEGORY_TRANSLATION__';
    const translated = t(key, null, fallbackSentinel);
    if (translated !== fallbackSentinel) return translated;
  }

  return String(rawName || '').trim() || humanizeSlugLabel(slug) || String(value).trim();
}

/**
 * Business CATEGORY (business type) label — localized from the stable `key`
 * (car_repair, tire_shop, …) via the `businessCategories.<key>` i18n namespace,
 * independent of the API's `name_en` / `localized_name`. Falls back to any
 * API-provided localized/EN name, then the key.
 */
export function translateBusinessCategoryLabel(value, t) {
  if (!value) return '';
  const v = typeof value === 'string' ? { key: value } : value;
  const key = v.key || v.category_key || v.slug;
  const rawName =
    v.localized_name || v.name_en || v.name || v.category_name || v.key || '';
  if (key) {
    const sentinel = '__MISSING_BUSINESS_CATEGORY__';
    const translated = t(`businessCategories.${key}`, null, sentinel);
    if (translated !== sentinel) return translated;
  }
  return String(rawName || '').trim() || String(value).trim();
}

/**
 * Business SERVICE (non-repair offering) label — localized from the stable
 * `key` (towing, replacement_vehicle, …) via `businessServices.<key>`. Falls
 * back to any API-provided localized/EN name, then the key.
 */
export function translateBusinessServiceLabel(value, t) {
  if (!value) return '';
  const v = typeof value === 'string' ? { key: value } : value;
  const key = v.key || v.service_key || v.slug;
  const rawName =
    v.localized_name || v.name_en || v.name || v.service_name || v.key || '';
  if (key) {
    const sentinel = '__MISSING_BUSINESS_SERVICE__';
    const translated = t(`businessServices.${key}`, null, sentinel);
    if (translated !== sentinel) return translated;
  }
  return String(rawName || '').trim() || String(value).trim();
}

export function translateVehicleTypeLabels(values, t, options) {
  return (values || []).map((v) => translateVehicleTypeLabel(v, t, options)).filter(Boolean);
}

export function translateVehicleTypePublicLabels(values, t) {
  return translateVehicleTypeLabels(values, t, { public: true });
}

export function translateRepairTypeLabels(values, t) {
  return (values || []).map((v) => translateRepairTypeLabel(v, t)).filter(Boolean);
}

const FUEL_TYPE_ALIASES = {
  gasoline: 'petrol',
  hybrid_petrol: 'hybrid',
  'plug-in-hybrid': 'hybrid',
  phev: 'hybrid',
};

const FUEL_TYPE_I18N_KEYS = {
  diesel: 'fuelTypes.diesel',
  petrol: 'fuelTypes.petrol',
  gasoline: 'fuelTypes.gasoline',
  hybrid: 'fuelTypes.hybrid',
  electric: 'fuelTypes.electric',
  lpg: 'fuelTypes.lpg',
  cng: 'fuelTypes.cng',
  hydrogen: 'fuelTypes.hydrogen',
  other: 'fuelTypes.other',
};

export function translateFuelTypeLabel(value, t) {
  if (value == null || value === '') return '';
  const raw = String(value).trim();
  const normalized = normalizeKey(raw);
  const code = FUEL_TYPE_ALIASES[normalized] || normalized;
  const key = FUEL_TYPE_I18N_KEYS[code];
  if (key) return t(key, null, raw);
  return raw;
}
