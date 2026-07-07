/**
 * Garage scene selection — persisted user choice shared across dashboard screens.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  DEFAULT_SCENE_ID,
  getSceneById,
  loadPersistedSceneId,
  persistSceneId,
  preloadGarageScene,
  resolveSceneId,
} from '../theme/garageScenes';

/** @type {{ selectedSceneId: string, setSelectedSceneId: (id: string) => Promise<void>, getSelectedScene: () => import('../theme/garageScenes.types').GarageSceneDefinition, isReady: boolean, refreshBackground: () => Promise<void> }} */
const DEFAULT_CONTEXT = {
  selectedSceneId: DEFAULT_SCENE_ID,
  setSelectedSceneId: async () => {},
  getSelectedScene: () => getSceneById(DEFAULT_SCENE_ID),
  isReady: false,
  refreshBackground: async () => {},
};

export const GarageSceneContext = createContext(DEFAULT_CONTEXT);

/** @deprecated Use GarageSceneContext — kept for semantic clarity in new code. */
export const DashboardBackgroundContext = GarageSceneContext;

/**
 * @param {{ children: React.ReactNode }} props
 */
export function GarageSceneProvider({ children }) {
  return <DashboardBackgroundProvider>{children}</DashboardBackgroundProvider>;
}

/** @param {{ children: React.ReactNode }} props */
export function DashboardBackgroundProvider({ children }) {
  const [selectedSceneId, setSelectedSceneIdState] = useState(DEFAULT_SCENE_ID);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      const persistedId = await loadPersistedSceneId();
      const resolvedId = resolveSceneId(persistedId);
      const scene = getSceneById(resolvedId);

      if (!cancelled) {
        setSelectedSceneIdState(resolvedId);
        setIsReady(true);
        preloadGarageScene(scene);
      }
    };

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  const setSelectedSceneId = useCallback(async (id) => {
    const resolvedId = resolveSceneId(id);
    const scene = getSceneById(resolvedId);
    setSelectedSceneIdState(resolvedId);
    await persistSceneId(resolvedId);
    preloadGarageScene(scene);
  }, []);

  const refreshBackground = useCallback(async () => {
    const scene = getSceneById(selectedSceneId);
    await preloadGarageScene(scene);
  }, [selectedSceneId]);

  const getSelectedScene = useCallback(
    () => getSceneById(selectedSceneId),
    [selectedSceneId]
  );

  const value = useMemo(
    () => ({
      selectedSceneId,
      setSelectedSceneId,
      getSelectedScene,
      isReady,
      refreshBackground,
    }),
    [selectedSceneId, setSelectedSceneId, getSelectedScene, isReady, refreshBackground]
  );

  return (
    <GarageSceneContext.Provider value={value}>{children}</GarageSceneContext.Provider>
  );
}

/** @returns {typeof DEFAULT_CONTEXT} */
export function useGarageScene() {
  return useContext(GarageSceneContext);
}

/** @returns {typeof DEFAULT_CONTEXT} */
export function useDashboardBackground() {
  return useContext(DashboardBackgroundContext);
}

export { DEFAULT_SCENE_ID };
