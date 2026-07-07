/**
 * @file Garage Scene React context — stub provider, not mounted in app yet.
 * @see docs/garage-scenes-architecture.md
 */

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

import {
  GARAGE_SCENE_TRANSITION_DEFAULT_MS,
  GARAGE_SCENE_TRANSITION_MAX_MS,
  GARAGE_SCENE_TRANSITION_MIN_MS,
} from './constants';
import { getDefaultScene, getSceneById, resolveSceneId } from './sceneRegistry';
import { loadPersistedSceneId, persistSceneId } from './persistence';

/** @type {import('./types').GarageSceneContextValue} */
const NOOP_CONTEXT = {
  isReady: false,
  activeSceneId: getDefaultScene().id,
  effectiveSceneId: getDefaultScene().id,
  activeScene: getDefaultScene(),
  contextOverride: null,
  setScene: async () => {},
  setContextOverride: () => {},
  transitionToScene: async () => {},
};

export const GarageSceneContext = createContext(NOOP_CONTEXT);

/**
 * Resolves which scene id should render given user selection and overrides.
 * Pinning is not implemented yet — soft overrides apply when present.
 *
 * @param {import('./types').GarageSceneId} persistedId
 * @param {import('./types').GarageSceneContextOverride | null} override
 * @param {boolean} [_userPinned]
 * @returns {import('./types').GarageSceneId}
 */
export function resolveEffectiveSceneId(persistedId, override, _userPinned = false) {
  if (override?.priority === 'forced' && override.sceneId) {
    return resolveSceneId(override.sceneId);
  }
  // Future: if (!_userPinned && override?.priority === 'soft') return override.sceneId
  if (override?.priority === 'soft' && override.sceneId) {
    return resolveSceneId(override.sceneId);
  }
  return resolveSceneId(persistedId);
}

/**
 * Clamp transition duration to product spec (400–600 ms).
 * @param {number | undefined} durationMs
 * @returns {number}
 */
export function clampTransitionDuration(durationMs) {
  const value = durationMs ?? GARAGE_SCENE_TRANSITION_DEFAULT_MS;
  return Math.min(GARAGE_SCENE_TRANSITION_MAX_MS, Math.max(GARAGE_SCENE_TRANSITION_MIN_MS, value));
}

/**
 * Stub provider — hydrates persistence but does not render background layers.
 * Mount above client dashboard navigator during integration phase.
 *
 * @param {{ children: React.ReactNode, hydrate?: boolean }} props
 */
export function GarageSceneProvider({ children, hydrate = false }) {
  const defaultScene = getDefaultScene();
  const [isReady, setIsReady] = useState(!hydrate);
  const [activeSceneId, setActiveSceneId] = useState(defaultScene.id);
  const [contextOverride, setContextOverride] = useState(
    /** @type {import('./types').GarageSceneContextOverride | null} */ (null)
  );

  // Hydration is opt-in so importing the module never triggers AsyncStorage I/O.
  React.useEffect(() => {
    if (!hydrate) return undefined;
    let cancelled = false;
    loadPersistedSceneId().then((id) => {
      if (!cancelled) {
        setActiveSceneId(id);
        setIsReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [hydrate]);

  const effectiveSceneId = useMemo(
    () => resolveEffectiveSceneId(activeSceneId, contextOverride),
    [activeSceneId, contextOverride]
  );

  const activeScene = useMemo(() => getSceneById(effectiveSceneId), [effectiveSceneId]);

  const transitionToScene = useCallback(
    async (id, options) => {
      const resolved = resolveSceneId(id);
      const _durationMs = clampTransitionDuration(options?.durationMs);
      // Future: drive A/B background layer crossfade here.
      setActiveSceneId(resolved);
      await persistSceneId(resolved);
    },
    []
  );

  const setScene = useCallback(async (id) => {
    await transitionToScene(id);
  }, [transitionToScene]);

  const value = useMemo(
    () => ({
      isReady,
      activeSceneId,
      effectiveSceneId,
      activeScene,
      contextOverride,
      setScene,
      setContextOverride,
      transitionToScene,
    }),
    [
      isReady,
      activeSceneId,
      effectiveSceneId,
      activeScene,
      contextOverride,
      setScene,
      transitionToScene,
    ]
  );

  return <GarageSceneContext.Provider value={value}>{children}</GarageSceneContext.Provider>;
}

/** @returns {import('./types').GarageSceneContextValue} */
export function useGarageScene() {
  return useContext(GarageSceneContext);
}
