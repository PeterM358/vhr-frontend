/**
 * Folder-based dashboard background registry.
 *
 * Drop a .webp into `src/assets/backgrounds/<category>/` and rebuild — no registry edits.
 * Metro `require.context` picks up new files automatically.
 */

import { Platform } from 'react-native';

import { BACKGROUNDS } from '../constants/images';
import { WEB_BACKGROUND_URL } from '../constants/webBackground';

/** @typedef {'cars' | 'bikes' | 'trucks' | 'default'} BackgroundCategory */

/**
 * @typedef {Object} DashboardBackgroundDefinition
 * @property {string} id — `{category}/{stem}` e.g. `cars/premium_garage_day`
 * @property {BackgroundCategory} category
 * @property {string} stem — filename without extension
 * @property {string} label
 * @property {number | { uri: string }} nativeImage
 * @property {{ uri: string }} webImage
 */

const CATEGORY_PATTERN = /^\.\/([^/]+)\/([^/]+)\.webp$/;

/** @type {Record<BackgroundCategory, DashboardBackgroundDefinition[]>} */
const registryByCategory = {
  cars: [],
  bikes: [],
  trucks: [],
  default: [],
};

/** @type {Map<string, DashboardBackgroundDefinition>} */
const registryById = new Map();

const FALLBACK_NATIVE = BACKGROUNDS.default;
const FALLBACK_WEB = { uri: WEB_BACKGROUND_URL };

/**
 * @param {BackgroundCategory} category
 * @param {string} stem
 */
function webUriFor(category, stem) {
  return `/backgrounds/${category}/${stem}.webp`;
}

/**
 * @param {string} stem
 * @returns {string}
 */
function humanizeStem(stem) {
  return stem
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/**
 * @param {string} contextKey — e.g. `./cars/premium_garage_day.webp`
 * @param {() => number} requireFn
 */
function registerAsset(contextKey, requireFn) {
  const match = contextKey.match(CATEGORY_PATTERN);
  if (!match) return;

  const [, categoryRaw, stem] = match;
  /** @type {BackgroundCategory} */
  const category = categoryRaw;
  if (!Object.prototype.hasOwnProperty.call(registryByCategory, category)) {
    return;
  }

  const nativeImage = requireFn();
  const id = `${category}/${stem}`;

  /** @type {DashboardBackgroundDefinition} */
  const entry = {
    id,
    category,
    stem,
    label: humanizeStem(stem),
    nativeImage,
    webImage: { uri: webUriFor(category, stem) },
  };

  registryByCategory[category].push(entry);
  registryById.set(id, entry);
}

try {
  // eslint-disable-next-line import/no-unresolved, global-require
  const context = require.context('../assets/backgrounds', true, /\.webp$/);
  context.keys().forEach((key) => {
    registerAsset(key, () => context(key));
  });
} catch {
  // require.context unavailable — registry stays empty; resolver uses fallback.
}

/** @type {DashboardBackgroundDefinition} */
export const FALLBACK_BACKGROUND = {
  id: 'default/premium_dark',
  category: 'default',
  stem: 'premium_dark',
  label: 'Premium Dark',
  nativeImage: FALLBACK_NATIVE,
  webImage: FALLBACK_WEB,
};

/**
 * @param {BackgroundCategory} category
 * @returns {DashboardBackgroundDefinition[]}
 */
export function getBackgroundsForCategory(category) {
  const entries = registryByCategory[category] ?? [];
  if (entries.length > 0) {
    return entries;
  }
  if (category === 'default') {
    return registryByCategory.default.length > 0
      ? registryByCategory.default
      : [FALLBACK_BACKGROUND];
  }
  return [];
}

/**
 * @param {string | null | undefined} id
 * @returns {DashboardBackgroundDefinition}
 */
export function getBackgroundById(id) {
  if (id && registryById.has(id)) {
    return registryById.get(id);
  }
  if (id === FALLBACK_BACKGROUND.id) {
    return FALLBACK_BACKGROUND;
  }
  return FALLBACK_BACKGROUND;
}

/**
 * @param {import('./vehicleCategories').BackgroundCategory[]} categories
 * @returns {DashboardBackgroundDefinition[]}
 */
export function poolForCategories(categories) {
  const pool = [];
  const seenIds = new Set();

  for (const category of categories) {
    for (const entry of getBackgroundsForCategory(category)) {
      if (!seenIds.has(entry.id)) {
        seenIds.add(entry.id);
        pool.push(entry);
      }
    }
  }

  return pool.length > 0 ? pool : [FALLBACK_BACKGROUND];
}

/**
 * @param {DashboardBackgroundDefinition} background
 * @returns {number | { uri: string }}
 */
export function getBackgroundNativeSource(background) {
  return background?.nativeImage ?? FALLBACK_NATIVE;
}

/**
 * @param {DashboardBackgroundDefinition} background
 * @returns {string}
 */
export function getBackgroundWebUri(background) {
  const webImage = background?.webImage ?? FALLBACK_WEB;
  if (typeof webImage === 'object' && webImage?.uri) {
    return webImage.uri;
  }
  return WEB_BACKGROUND_URL;
}

/** Shared visual treatment — matches legacy garage scenes. */
export const DASHBOARD_BACKGROUND_OVERLAY = [
  { offset: '0', color: '#000', opacity: '0.65' },
  { offset: '0.5', color: '#000', opacity: '0.45' },
  { offset: '1', color: '#000', opacity: '0.75' },
];

export const DASHBOARD_BACKGROUND_BLUR = { native: 2, web: 2 };
export const DASHBOARD_BACKGROUND_BRIGHTNESS = { native: 1, web: 0.68 };

/**
 * Adapt registry entry to legacy garage scene shape for ScreenBackground / crossfade.
 * @param {DashboardBackgroundDefinition} background
 */
export function toGarageSceneShape(background) {
  const resolved = background ?? FALLBACK_BACKGROUND;
  return {
    id: resolved.id,
    label: resolved.label,
    description: `${resolved.category} dashboard background`,
    enabled: true,
    nativeImage: getBackgroundNativeSource(resolved),
    webImage: resolved.webImage ?? FALLBACK_WEB,
    overlay: DASHBOARD_BACKGROUND_OVERLAY,
    blur: DASHBOARD_BACKGROUND_BLUR,
    brightness: DASHBOARD_BACKGROUND_BRIGHTNESS,
  };
}

export function isRegistryEmpty() {
  return registryById.size === 0;
}

export function getRegisteredCategories() {
  /** @type {BackgroundCategory[]} */
  const categories = [];
  for (const [category, entries] of Object.entries(registryByCategory)) {
    if (entries.length > 0) {
      categories.push(/** @type {BackgroundCategory} */ (category));
    }
  }
  return categories;
}
