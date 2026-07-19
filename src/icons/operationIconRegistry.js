/**
 * Global operation / repair-type icon identity.
 *
 * Backend stores a stable semantic `icon_key` on RepairType.icon (and category.icon).
 * This registry is the only place that maps keys → visual tokens (MaterialCommunityIcons).
 * Premium packs can swap the visual adapter without changing callers or keys.
 */

export const GENERIC_SERVICE_ICON_KEY = 'generic_service';

/** Default visual pack: semantic icon_key → MaterialCommunityIcons glyph name. */
export const DEFAULT_OPERATION_VISUAL_PACK = Object.freeze({
  oil_change: 'oil',
  filter: 'air-filter',
  brake_fluid: 'car-brake-fluid-level',
  coolant: 'car-coolant-level',
  timing_belt: 'sync',
  chain_belt: 'link-variant',
  engine: 'engine',
  transmission: 'car-shift-pattern',
  clutch: 'car-cog',
  suspension: 'car-traction-control',
  brake_service: 'car-brake-alert',
  electrical_diagnostics: 'car-electric',
  starter: 'engine-outline',
  alternator: 'sine-wave',
  ecu: 'laptop',
  tire_service: 'tire',
  wheel_alignment: 'crosshairs-gps',
  tire_storage: 'archive-outline',
  bodywork: 'hammer-wrench',
  paint: 'spray',
  windshield: 'car-windshield',
  ac_service: 'air-conditioner',
  ac_fan: 'fan',
  battery: 'car-battery',
  battery_check: 'battery-check',
  charging: 'ev-station',
  interior_cleaning: 'seat-outline',
  detailing: 'car-wash',
  engine_bay_cleaning: 'spray-bottle',
  insurance_documents: 'file-document-outline',
  insurance_renewal: 'file-refresh-outline',
  casco: 'shield-check-outline',
  road_assistance: 'tow-truck',
  inspections: 'clipboard-check-outline',
  annual_service: 'calendar-check-outline',
  taxi_certification: 'card-account-details-outline',
  tachograph: 'speedometer',
  dashcam: 'camera-outline',
  parking_sensors: 'radar',
  towbar: 'tow-truck',
  bike_accessories: 'bike',
  general_inspection: 'clipboard-search-outline',
  maintenance: 'car-wrench',
  mechanical: 'engine',
  accessories: 'tools',
  [GENERIC_SERVICE_ICON_KEY]: 'car-wrench',
});

/**
 * Seeded RepairType slug → semantic icon_key.
 * Never keyed by translated display names.
 */
export const SEEDED_OPERATION_ICON_KEYS = Object.freeze({
  'oil-change': 'oil_change',
  'filter-replacement': 'filter',
  'brake-fluid-change': 'brake_fluid',
  'coolant-change': 'coolant',
  'timing-belt-replacement': 'timing_belt',
  'chain-belt-service': 'chain_belt',
  'engine-repair': 'engine',
  'transmission-repair': 'transmission',
  'gearbox-repair': 'transmission',
  'suspension-repair': 'suspension',
  'brake-repair': 'brake_service',
  'clutch-repair': 'clutch',
  diagnostics: 'electrical_diagnostics',
  'starter-repair': 'starter',
  'alternator-repair': 'alternator',
  'ecu-programming': 'ecu',
  'tire-change': 'tire_service',
  'wheel-alignment': 'wheel_alignment',
  'tire-repair': 'tire_service',
  'tire-storage': 'tire_storage',
  'paint-repair': 'paint',
  'dent-repair': 'bodywork',
  'windshield-repair': 'windshield',
  'ac-refill': 'ac_service',
  'ac-diagnostics': 'ac_service',
  'ac-repair': 'ac_fan',
  'battery-replacement': 'battery',
  'battery-check': 'battery_check',
  'charging-system-check': 'charging',
  'interior-cleaning': 'interior_cleaning',
  'exterior-detailing': 'detailing',
  'engine-bay-cleaning': 'engine_bay_cleaning',
  'insurance-renewal': 'insurance_renewal',
  'casco-insurance': 'casco',
  'road-assistance': 'road_assistance',
  'technical-inspection': 'inspections',
  'annual-service-check': 'annual_service',
  'taxi-certification': 'taxi_certification',
  'tachograph-inspection': 'tachograph',
  'dashcam-installation': 'dashcam',
  'parking-sensors-installation': 'parking_sensors',
  'tow-bar-installation': 'towbar',
  'bike-accessories-installation': 'bike_accessories',
  'general-inspection': 'general_inspection',
});

/** ServiceCategory slug → semantic icon_key */
export const CATEGORY_ICON_KEYS = Object.freeze({
  maintenance: 'maintenance',
  mechanical: 'mechanical',
  'electrical-diagnostics': 'electrical_diagnostics',
  'tires-wheels': 'tire_service',
  'bodywork-paint': 'bodywork',
  'air-conditioning': 'ac_service',
  'battery-charging': 'battery',
  'cleaning-detailing': 'detailing',
  'insurance-documents': 'insurance_documents',
  'inspections-legal': 'inspections',
  'accessories-installation': 'accessories',
  other: GENERIC_SERVICE_ICON_KEY,
});

/**
 * Legacy API values (old MCI glyph names, including invalid ones that rendered as "?").
 * Maps to semantic keys so pre-backfill data still resolves correctly.
 */
export const LEGACY_ICON_ALIASES = Object.freeze({
  oil: 'oil_change',
  'air-filter': 'filter',
  'car-brake-fluid-level': 'brake_fluid',
  'thermometer-water': 'coolant',
  'car-coolant-level': 'coolant',
  sync: 'timing_belt',
  chain: 'chain_belt',
  'link-variant': 'chain_belt',
  engine: 'engine',
  'car-shift-pattern': 'transmission',
  'car-manual-transmission': 'transmission',
  'car-shock-absorber': 'suspension',
  'car-traction-control': 'suspension',
  'brake-disc': 'brake_service',
  'car-brake-alert': 'brake_service',
  'car-brake-parking': 'brake_service',
  stethoscope: 'electrical_diagnostics',
  'car-electric': 'electrical_diagnostics',
  'engine-outline': 'starter',
  'sine-wave': 'alternator',
  laptop: 'ecu',
  tire: 'tire_service',
  'crosshairs-gps': 'wheel_alignment',
  'archive-outline': 'tire_storage',
  spray: 'paint',
  'hammer-wrench': 'bodywork',
  'car-windshield': 'windshield',
  'air-conditioner': 'ac_service',
  fan: 'ac_fan',
  'car-battery': 'battery',
  'battery-check': 'battery_check',
  'ev-station': 'charging',
  'seat-outline': 'interior_cleaning',
  'car-wash': 'detailing',
  'spray-bottle': 'engine_bay_cleaning',
  'file-refresh-outline': 'insurance_renewal',
  'file-document-outline': 'insurance_documents',
  'shield-check-outline': 'casco',
  'tow-truck': 'road_assistance',
  'clipboard-check-outline': 'inspections',
  'calendar-check-outline': 'annual_service',
  'card-account-details-outline': 'taxi_certification',
  speedometer: 'tachograph',
  'camera-outline': 'dashcam',
  radar: 'parking_sensors',
  bike: 'bike_accessories',
  'clipboard-search-outline': 'general_inspection',
  'wrench-cog': 'maintenance',
  'car-wrench': GENERIC_SERVICE_ICON_KEY,
  wrench: GENERIC_SERVICE_ICON_KEY,
  tools: 'accessories',
  'shape-outline': GENERIC_SERVICE_ICON_KEY,
  'car-cog': 'clutch',
});

const KNOWN_ICON_KEYS = new Set([
  ...Object.keys(DEFAULT_OPERATION_VISUAL_PACK),
  ...Object.values(SEEDED_OPERATION_ICON_KEYS),
  ...Object.values(CATEGORY_ICON_KEYS),
  ...Object.values(LEGACY_ICON_ALIASES),
]);

const warnedUnknown = new Set();

let visualPack = DEFAULT_OPERATION_VISUAL_PACK;
let visualAdapter = null;

function normalizeKey(raw) {
  if (raw == null) return '';
  return String(raw).trim().toLowerCase().replace(/-/g, '_');
}

function normalizeSlug(raw) {
  if (raw == null) return '';
  return String(raw).trim().toLowerCase().replace(/_/g, '-');
}

function warnUnknownOnce(raw) {
  const key = String(raw || '').trim();
  if (!key) return;
  const isDev =
    (typeof __DEV__ !== 'undefined' && __DEV__) ||
    (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production');
  if (!isDev || warnedUnknown.has(key)) return;
  warnedUnknown.add(key);
  // eslint-disable-next-line no-console
  console.warn(`[operationIconRegistry] unknown icon_key "${key}" → ${GENERIC_SERVICE_ICON_KEY}`);
}

/**
 * Swap the visual implementation (premium icon pack). Keys stay semantic.
 * @param {(iconKey: string) => string | null | undefined} adapter
 */
export function setOperationIconVisualAdapter(adapter) {
  visualAdapter = typeof adapter === 'function' ? adapter : null;
}

/** Restore the default MaterialCommunityIcons pack. */
export function resetOperationIconVisualAdapter() {
  visualAdapter = null;
  visualPack = DEFAULT_OPERATION_VISUAL_PACK;
}

/**
 * @param {Record<string, string>} pack
 */
export function setOperationIconVisualPack(pack) {
  if (pack && typeof pack === 'object') {
    visualPack = pack;
  }
}

function coerceEntity(input) {
  if (input == null) return null;
  if (typeof input === 'string') {
    return { icon_key: input, icon: input };
  }
  return input;
}

function pickRawIconKey(entity) {
  if (!entity) return '';
  const candidates = [
    entity.icon_key,
    entity.repair_type_icon_key,
    entity.icon,
    entity.repair_type_icon,
  ];
  for (const c of candidates) {
    if (c != null && String(c).trim()) return String(c).trim();
  }
  return '';
}

function pickCategoryIconKey(entity) {
  if (!entity) return '';
  const candidates = [
    entity.category_icon_key,
    entity.category_icon,
    entity.category?.icon_key,
    entity.category?.icon,
  ];
  for (const c of candidates) {
    if (c != null && String(c).trim()) return String(c).trim();
  }
  const catSlug = normalizeSlug(entity.category_slug || entity.category?.slug);
  if (catSlug && CATEGORY_ICON_KEYS[catSlug]) return CATEGORY_ICON_KEYS[catSlug];
  return '';
}

function pickSlug(entity) {
  if (!entity) return '';
  return normalizeSlug(
    entity.slug ||
      entity.repair_type_slug ||
      entity.slug_en ||
      entity.operation_slug ||
      entity.repair_type?.slug
  );
}

/**
 * Resolve a raw value (semantic key, legacy glyph, or slug-like) to a known icon_key.
 */
export function normalizeOperationIconKey(raw) {
  if (raw == null || !String(raw).trim()) return null;
  const trimmed = String(raw).trim();
  const asSlug = normalizeSlug(trimmed);
  const asKey = normalizeKey(trimmed);

  if (SEEDED_OPERATION_ICON_KEYS[asSlug]) return SEEDED_OPERATION_ICON_KEYS[asSlug];
  if (CATEGORY_ICON_KEYS[asSlug]) return CATEGORY_ICON_KEYS[asSlug];
  if (LEGACY_ICON_ALIASES[trimmed]) return LEGACY_ICON_ALIASES[trimmed];
  if (LEGACY_ICON_ALIASES[asSlug]) return LEGACY_ICON_ALIASES[asSlug];
  if (DEFAULT_OPERATION_VISUAL_PACK[asKey]) return asKey;
  if (KNOWN_ICON_KEYS.has(asKey)) return asKey;
  return null;
}

/**
 * Fallback chain: operation icon_key → category icon_key → slug map → generic_service.
 * Never derives from translated display names.
 *
 * @param {object | string | null | undefined} input
 * @returns {string} semantic icon_key
 */
export function resolveOperationIconKey(input) {
  const entity = coerceEntity(input);

  const fromOp = normalizeOperationIconKey(pickRawIconKey(entity));
  if (fromOp) return fromOp;

  const fromCategory = normalizeOperationIconKey(pickCategoryIconKey(entity));
  if (fromCategory) return fromCategory;

  const slug = pickSlug(entity);
  if (slug && SEEDED_OPERATION_ICON_KEYS[slug]) {
    return SEEDED_OPERATION_ICON_KEYS[slug];
  }
  if (slug && CATEGORY_ICON_KEYS[slug]) {
    return CATEGORY_ICON_KEYS[slug];
  }

  const raw = pickRawIconKey(entity) || pickCategoryIconKey(entity) || slug;
  if (raw) warnUnknownOnce(raw);
  return GENERIC_SERVICE_ICON_KEY;
}

function resolveVisualToken(iconKey) {
  const key = iconKey || GENERIC_SERVICE_ICON_KEY;
  if (visualAdapter) {
    const adapted = visualAdapter(key);
    if (adapted != null && String(adapted).trim()) {
      return String(adapted).trim();
    }
  }
  const fromPack = visualPack[key] || DEFAULT_OPERATION_VISUAL_PACK[key];
  if (fromPack && String(fromPack).trim()) return String(fromPack).trim();
  return DEFAULT_OPERATION_VISUAL_PACK[GENERIC_SERVICE_ICON_KEY];
}

/**
 * @param {object | string | null | undefined} input operation / repair type / icon_key
 * @returns {string} MaterialCommunityIcons glyph name (never "?" / help-circle)
 */
export function getOperationIcon(input) {
  const iconKey = resolveOperationIconKey(input);
  const glyph = resolveVisualToken(iconKey);
  if (!glyph || glyph === '?' || glyph === 'help-circle' || glyph === 'help-circle-outline') {
    return DEFAULT_OPERATION_VISUAL_PACK[GENERIC_SERVICE_ICON_KEY];
  }
  return glyph;
}

/**
 * @deprecated Use getOperationIcon — kept for call-site migration.
 */
export function resolveRepairTypeIcon(repairType) {
  return getOperationIcon(repairType);
}

export const DEFAULT_REPAIR_TYPE_ICON =
  DEFAULT_OPERATION_VISUAL_PACK[GENERIC_SERVICE_ICON_KEY];

/** Test helper: clear __DEV__ unknown warnings. */
export function _resetUnknownIconWarningsForTests() {
  warnedUnknown.clear();
}
