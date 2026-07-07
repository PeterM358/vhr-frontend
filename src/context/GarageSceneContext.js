/**
 * Garage scene selection — persisted user preference for ScreenBackground.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  DEFAULT_SCENE_ID,
  GARAGE_SCENE_STORAGE_KEY,
  getSceneById,
  resolveSceneId,
} from '../theme/garageScenes';

/** @type {import('../theme/garageScenes.types').GarageSceneDefinition} */
const FALLBACK_SCENE = getSceneById(DEFAULT_SCENE_ID);

/** @type {{ selectedSceneId: string, setSelectedSceneId: (id: string) => Promise<void>, getSelectedScene: () => import('../theme/garageScenes.types').GarageSceneDefinition, isReady: boolean }} */
const DEFAULT_CONTEXT = {
  selectedSceneId: DEFAULT_SCENE_ID,
  setSelectedSceneId: async () => {},
  getSelectedScene: () => FALLBACK_SCENE,
  isReady: false,
};

export const GarageSceneContext = createContext(DEFAULT_CONTEXT);

async function loadPersistedSceneId() {
  try {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(GARAGE_SCENE_STORAGE_KEY);
      if (stored != null) {
        return resolveSceneId(stored);
      }
    }
    const stored = await AsyncStorage.getItem(GARAGE_SCENE_STORAGE_KEY);
    return resolveSceneId(stored);
  } catch {
    return DEFAULT_SCENE_ID;
  }
}

async function persistSceneId(id) {
  const resolved = resolveSceneId(id);
  try {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      localStorage.setItem(GARAGE_SCENE_STORAGE_KEY, resolved);
    }
    await AsyncStorage.setItem(GARAGE_SCENE_STORAGE_KEY, resolved);
  } catch {
    // Non-fatal — scene still applies for the current session.
  }
}

/**
 * @param {{ children: React.ReactNode }} props
 */
export function GarageSceneProvider({ children }) {
  const [selectedSceneId, setSelectedSceneIdState] = useState(DEFAULT_SCENE_ID);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadPersistedSceneId().then((id) => {
      if (!cancelled) {
        setSelectedSceneIdState(id);
        setIsReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setSelectedSceneId = useCallback(async (id) => {
    const resolved = resolveSceneId(id);
    setSelectedSceneIdState(resolved);
    await persistSceneId(resolved);
  }, []);

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
    }),
    [selectedSceneId, setSelectedSceneId, getSelectedScene, isReady]
  );

  return (
    <GarageSceneContext.Provider value={value}>{children}</GarageSceneContext.Provider>
  );
}

/** @returns {{ selectedSceneId: string, setSelectedSceneId: (id: string) => Promise<void>, getSelectedScene: () => import('../theme/garageScenes.types').GarageSceneDefinition, isReady: boolean }} */
export function useGarageScene() {
  return useContext(GarageSceneContext);
}
