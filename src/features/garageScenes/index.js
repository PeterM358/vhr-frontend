/**
 * @file Garage Scenes public API.
 * @see docs/garage-scenes-architecture.md
 */

export {
  GARAGE_SCENE_STORAGE_KEY,
  GARAGE_SCENE_PINNED_STORAGE_KEY,
  DEFAULT_SCENE_ID,
  GARAGE_SCENE_TRANSITION_MIN_MS,
  GARAGE_SCENE_TRANSITION_MAX_MS,
  GARAGE_SCENE_TRANSITION_DEFAULT_MS,
  GARAGE_SCENE_COLOR_GRADE,
  GARAGE_SCENE_BLUR_DEFAULTS,
  GARAGE_SCENE_GRADIENT_STOPS,
  GARAGE_SCENE_DEFAULT_EASING,
} from './constants';

export {
  GARAGE_SCENE_REGISTRY,
  getSceneById,
  listScenes,
  getDefaultScene,
  resolveSceneId,
} from './sceneRegistry';

export {
  GarageSceneContext,
  GarageSceneProvider,
  useGarageScene,
  resolveEffectiveSceneId,
  clampTransitionDuration,
} from './GarageSceneContext';

export { useGarageSceneOverride } from './useGarageSceneOverride';

export { loadPersistedSceneId, persistSceneId } from './persistence';
