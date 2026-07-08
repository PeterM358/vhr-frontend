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

export function translateRepairTypeLabel(value, t) {
  if (!value) return '';

  const slug = resolveRepairSlug(value);
  const v = typeof value === 'string' ? { name: value } : value;
  const rawName = v.repair_type_name || v.name;
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

  return String(rawName || rawSlug || value).trim();
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
