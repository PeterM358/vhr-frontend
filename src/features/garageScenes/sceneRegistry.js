/**
 * @file Scene registry — add new scenes here only.
 * @see docs/garage-scenes-architecture.md
 */

import { BACKGROUNDS } from '../../constants/images';
import { WEB_BACKGROUND_URL } from '../../constants/webBackground';
import { DEFAULT_SCENE_ID, GARAGE_SCENE_BLUR_DEFAULTS } from './constants';

/** Placeholder assets until per-scene art is bundled. */
const PLACEHOLDER_ASSETS = {
  native: BACKGROUNDS.default,
  web: BACKGROUNDS.default ?? { uri: WEB_BACKGROUND_URL },
};

/** @type {import('./types').GarageSceneDefinition[]} */
export const GARAGE_SCENE_REGISTRY = [
  {
    id: 'premium-garage',
    label: 'Premium Garage',
    description: 'Classic luxury garage — the default Veversal look.',
    assets: PLACEHOLDER_ASSETS,
    isDefault: true,
    isPremium: false,
    sortOrder: 10,
    blur: GARAGE_SCENE_BLUR_DEFAULTS,
    tags: ['garage', 'default'],
  },
  {
    id: 'modern-service-center',
    label: 'Modern Service Center',
    description: 'Clean, bright workshop floor aesthetic.',
    assets: PLACEHOLDER_ASSETS,
    isPremium: true,
    sortOrder: 20,
    tags: ['service-center', 'modern'],
  },
  {
    id: 'performance-garage',
    label: 'Performance Garage',
    description: 'Motorsport and performance tuning atmosphere.',
    assets: PLACEHOLDER_ASSETS,
    isPremium: true,
    sortOrder: 30,
    tags: ['garage', 'performance'],
  },
  {
    id: 'night-garage',
    label: 'Night Garage',
    description: 'After-hours ambient garage lighting.',
    assets: PLACEHOLDER_ASSETS,
    isPremium: true,
    sortOrder: 40,
    tags: ['garage', 'night'],
  },
  {
    id: 'mountain-adventure',
    label: 'Mountain Adventure',
    description: 'Outdoor adventure and overland spirit.',
    assets: PLACEHOLDER_ASSETS,
    isPremium: true,
    sortOrder: 50,
    tags: ['outdoor', 'adventure'],
  },
  {
    id: 'bike-workshop',
    label: 'Bike Workshop',
    description: 'Two-wheel service and craft workshop.',
    assets: PLACEHOLDER_ASSETS,
    isPremium: true,
    sortOrder: 60,
    tags: ['bike', 'workshop'],
  },
  {
    id: 'abstract-blue',
    label: 'Abstract Blue',
    description: 'Minimal abstract shapes in brand navy tones.',
    assets: PLACEHOLDER_ASSETS,
    isPremium: true,
    sortOrder: 70,
    tags: ['abstract', 'minimal'],
  },
];

/** @type {Map<string, import('./types').GarageSceneDefinition>} */
const registryById = new Map(GARAGE_SCENE_REGISTRY.map((scene) => [scene.id, scene]));

/**
 * @param {string | null | undefined} id
 * @returns {import('./types').GarageSceneDefinition}
 */
export function getSceneById(id) {
  if (id && registryById.has(id)) {
    return registryById.get(id);
  }
  return registryById.get(DEFAULT_SCENE_ID) ?? GARAGE_SCENE_REGISTRY[0];
}

/** @returns {import('./types').GarageSceneDefinition[]} */
export function listScenes() {
  return [...GARAGE_SCENE_REGISTRY].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

/** @returns {import('./types').GarageSceneDefinition} */
export function getDefaultScene() {
  return GARAGE_SCENE_REGISTRY.find((s) => s.isDefault) ?? GARAGE_SCENE_REGISTRY[0];
}

/**
 * @param {string | null | undefined} id
 * @returns {import('./types').GarageSceneId}
 */
export function resolveSceneId(id) {
  if (id && registryById.has(id)) {
    return /** @type {import('./types').GarageSceneId} */ (id);
  }
  return getDefaultScene().id;
}
