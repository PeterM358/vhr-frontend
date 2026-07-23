/**
 * Map pin registry — one visual identity per primary_map_category.
 * Keys must stay in sync with backend profiles.map_pin_categories.PRIMARY_MAP_CATEGORY_KEYS.
 */

export const DEFAULT_MAP_PIN_KEY = 'general_service';

/** @type {Record<string, { icon: string, color: string, label: string, webGlyph: string }>} */
export const PIN_REGISTRY = {
  general_service: {
    icon: 'wrench',
    color: '#0F4C81',
    label: 'Service',
    webGlyph: '🔧',
  },
  tire_center: {
    icon: 'tire',
    color: '#0d9488',
    label: 'Tires',
    webGlyph: '🛞',
  },
  oil_change: {
    icon: 'oil',
    color: '#ca8a04',
    label: 'Oil change',
    webGlyph: '🛢',
  },
  diagnostics: {
    icon: 'stethoscope',
    color: '#7c3aed',
    label: 'Diagnostics',
    webGlyph: '🔬',
  },
  road_assistance: {
    icon: 'car-emergency',
    color: '#ea580c',
    label: 'Road assistance',
    webGlyph: '🆘',
  },
  body_shop: {
    icon: 'hammer-wrench',
    color: '#475569',
    label: 'Body shop',
    webGlyph: '🔨',
  },
  paint_shop: {
    icon: 'spray',
    color: '#db2777',
    label: 'Paint',
    webGlyph: '🎨',
  },
  ac_service: {
    icon: 'air-conditioner',
    color: '#0891b2',
    label: 'A/C',
    webGlyph: '❄️',
  },
  ev_service: {
    icon: 'car-electric',
    color: '#16a34a',
    label: 'EV service',
    webGlyph: '⚡',
  },
  ev_charging: {
    icon: 'ev-station',
    color: '#15803d',
    label: 'EV charging',
    webGlyph: '🔌',
  },
  motorcycle_service: {
    icon: 'motorbike',
    color: '#dc2626',
    label: 'Motorcycle',
    webGlyph: '🏍',
  },
  bicycle_service: {
    icon: 'bike',
    color: '#059669',
    label: 'Bicycle',
    webGlyph: '🚲',
  },
  ebike_service: {
    icon: 'bicycle-electric',
    color: '#10b981',
    label: 'E-bike',
    webGlyph: '⚡',
  },
  truck_service: {
    icon: 'truck',
    color: '#0F4C81',
    label: 'Truck',
    webGlyph: '🚚',
  },
  van_service: {
    icon: 'van-utility',
    color: '#4338ca',
    label: 'Van',
    webGlyph: '🚐',
  },
  car_wash: {
    icon: 'car-wash',
    color: '#0284c7',
    label: 'Car wash',
    webGlyph: '💧',
  },
  battery_shop: {
    icon: 'car-battery',
    color: '#65a30d',
    label: 'Battery',
    webGlyph: '🔋',
  },
  towing: {
    icon: 'tow-truck',
    color: '#b45309',
    label: 'Towing',
    webGlyph: '🚛',
  },
  vehicle_inspection: {
    icon: 'clipboard-check-outline',
    color: '#0369a1',
    label: 'Inspection',
    webGlyph: '✅',
  },
  locksmith: {
    icon: 'key-variant',
    color: '#57534e',
    label: 'Locksmith',
    webGlyph: '🔑',
  },
  glass_repair: {
    icon: 'car-windshield',
    color: '#38bdf8',
    label: 'Glass',
    webGlyph: '🪟',
  },
  detailing: {
    icon: 'spray-bottle',
    color: '#a855f7',
    label: 'Detailing',
    webGlyph: '✨',
  },
  parts_store: {
    icon: 'cog',
    color: '#64748b',
    label: 'Parts',
    webGlyph: '⚙️',
  },
  dealer: {
    icon: 'storefront-outline',
    color: '#1e40af',
    label: 'Dealer',
    webGlyph: '🏪',
  },
  fuel_station: {
    icon: 'gas-station',
    color: '#ef4444',
    label: 'Fuel',
    webGlyph: '⛽',
  },
  performance_tuning: {
    icon: 'speedometer',
    color: '#be123c',
    label: 'Tuning',
    webGlyph: '🏁',
  },
  parking: {
    icon: 'parking',
    color: '#334155',
    label: 'Parking',
    webGlyph: '🅿️',
  },
  camper_service: {
    icon: 'rv-truck',
    color: '#0f766e',
    label: 'Camper',
    webGlyph: '🚐',
  },
  boat_service: {
    icon: 'sail-boat',
    color: '#1e3a8a',
    label: 'Boat',
    webGlyph: '⛵',
  },
  agricultural: {
    icon: 'tractor',
    color: '#854d0e',
    label: 'Agricultural',
    webGlyph: '🚜',
  },
  heavy_equipment: {
    icon: 'excavator',
    color: '#78350f',
    label: 'Heavy equipment',
    webGlyph: '🏗',
  },
  emergency_repair: {
    icon: 'alert-octagon-outline',
    color: '#dc2626',
    label: 'Emergency',
    webGlyph: '🚨',
  },
  battery_assistance: {
    icon: 'battery-charging',
    color: '#4d7c0f',
    label: 'Battery assist',
    webGlyph: '🔋',
  },
  mot_inspection: {
    icon: 'certificate-outline',
    color: '#0e7490',
    label: 'MOT',
    webGlyph: '📋',
  },
};

export const PIN_REGISTRY_KEYS = Object.freeze(Object.keys(PIN_REGISTRY));

/**
 * @param {string | null | undefined} key
 * @returns {{ icon: string, color: string, label: string, webGlyph: string, key: string }}
 */
export function getMapPinDefinition(key) {
  const normalized = (key || '').trim().toLowerCase();
  if (normalized && PIN_REGISTRY[normalized]) {
    return { ...PIN_REGISTRY[normalized], key: normalized };
  }
  return { ...PIN_REGISTRY[DEFAULT_MAP_PIN_KEY], key: DEFAULT_MAP_PIN_KEY };
}
