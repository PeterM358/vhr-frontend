/**
 * @file AsyncStorage helpers for Garage Scenes persistence.
 * @see docs/garage-scenes-architecture.md
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { GARAGE_SCENE_STORAGE_KEY } from './constants';
import { resolveSceneId } from './sceneRegistry';

/**
 * @returns {Promise<import('./types').GarageSceneId>}
 */
export async function loadPersistedSceneId() {
  try {
    const stored = await AsyncStorage.getItem(GARAGE_SCENE_STORAGE_KEY);
    return resolveSceneId(stored);
  } catch {
    return resolveSceneId(null);
  }
}

/**
 * @param {import('./types').GarageSceneId} id
 * @returns {Promise<void>}
 */
export async function persistSceneId(id) {
  const resolved = resolveSceneId(id);
  await AsyncStorage.setItem(GARAGE_SCENE_STORAGE_KEY, resolved);
}
