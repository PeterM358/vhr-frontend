/**
 * Garage scene registry — thin compatibility layer over dashboard backgrounds.
 * Visual constants and transition timing live here; assets come from `src/backgrounds/`.
 */

import { Platform } from 'react-native';

import {
  DASHBOARD_BACKGROUND_BLUR,
  DASHBOARD_BACKGROUND_BRIGHTNESS,
  DASHBOARD_BACKGROUND_OVERLAY,
  FALLBACK_BACKGROUND,
  getBackgroundById,
  getBackgroundNativeSource,
  getBackgroundWebUri,
  toGarageSceneShape,
} from '../backgrounds/backgroundRegistry';
import { WEB_BACKGROUND_URL } from '../constants/webBackground';

export const GARAGE_SCENE_STORAGE_KEY = '@veversal/garage_scene_id';
export const DEFAULT_SCENE_ID = FALLBACK_BACKGROUND.id;

export const GARAGE_SCENE_TRANSITION_MIN_MS = 400;
export const GARAGE_SCENE_TRANSITION_MAX_MS = 600;
export const GARAGE_SCENE_TRANSITION_DEFAULT_MS = 500;

/** @deprecated Manual scene list — backgrounds are folder-driven now. */
export const GARAGE_SCENES = [toGarageSceneShape(FALLBACK_BACKGROUND)];

/**
 * @param {string | null | undefined} id
 * @returns {import('./garageScenes.types').GarageSceneDefinition}
 */
export function getSceneById(id) {
  return toGarageSceneShape(getBackgroundById(id));
}

/**
 * @param {string | null | undefined} id
 * @returns {string}
 */
export function resolveSceneId(id) {
  if (id && getBackgroundById(id)) {
    return id;
  }
  return DEFAULT_SCENE_ID;
}

/** @returns {import('./garageScenes.types').GarageSceneDefinition[]} */
export function getEnabledScenes() {
  return GARAGE_SCENES;
}

/**
 * @param {import('./garageScenes.types').GarageSceneDefinition} scene
 * @returns {number | { uri: string }}
 */
export function getSceneImageSource(scene) {
  if (scene?.nativeImage != null) {
    if (Platform.OS === 'web' && typeof scene.nativeImage === 'number') {
      return { uri: getBackgroundWebUri(getBackgroundById(scene.id)) };
    }
    return scene.nativeImage;
  }
  return getBackgroundNativeSource(getBackgroundById(scene?.id));
}

/**
 * @param {import('./garageScenes.types').GarageSceneDefinition} scene
 * @returns {string}
 */
export function getSceneWebUri(scene) {
  if (scene?.id) {
    return getBackgroundWebUri(getBackgroundById(scene.id));
  }
  return WEB_BACKGROUND_URL;
}

export function clampTransitionDuration(durationMs) {
  const value = durationMs ?? GARAGE_SCENE_TRANSITION_DEFAULT_MS;
  return Math.min(
    GARAGE_SCENE_TRANSITION_MAX_MS,
    Math.max(GARAGE_SCENE_TRANSITION_MIN_MS, value)
  );
}

export {
  DASHBOARD_BACKGROUND_OVERLAY as DEFAULT_OVERLAY,
  DASHBOARD_BACKGROUND_BLUR,
  DASHBOARD_BACKGROUND_BRIGHTNESS,
};
