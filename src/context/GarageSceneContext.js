/**
 * Dashboard background selection — vehicle-aware, persisted once per day.
 * Replaces manual garage scene wiring; all dashboard screens share one background.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getVehicles } from '../api/vehicles';
import {
  getBackgroundById,
  toGarageSceneShape,
  FALLBACK_BACKGROUND,
} from '../backgrounds/backgroundRegistry';
import {
  isStoredBackgroundFresh,
  isStoredBackgroundValid,
  resolveDashboardBackground,
  resolveEligibleCategories,
} from '../backgrounds/backgroundResolver';
import {
  loadStoredDashboardBackground,
  persistDashboardBackground,
  todayDateKey,
} from '../backgrounds/backgroundPersistence';
import { preloadDashboardBackground } from '../backgrounds/preloadBackground';
import { AuthContext } from './AuthManager';
import {
  DEFAULT_SCENE_ID,
  GARAGE_SCENE_STORAGE_KEY,
} from '../theme/garageScenes';

const FALLBACK_SCENE = toGarageSceneShape(FALLBACK_BACKGROUND);

/** @type {{ selectedSceneId: string, setSelectedSceneId: (id: string) => Promise<void>, getSelectedScene: () => import('../theme/garageScenes.types').GarageSceneDefinition, isReady: boolean, refreshBackground: () => Promise<void> }} */
const DEFAULT_CONTEXT = {
  selectedSceneId: FALLBACK_BACKGROUND.id,
  setSelectedSceneId: async () => {},
  getSelectedScene: () => FALLBACK_SCENE,
  isReady: false,
  refreshBackground: async () => {},
};

export const GarageSceneContext = createContext(DEFAULT_CONTEXT);

/** @deprecated Use GarageSceneContext — kept for semantic clarity in new code. */
export const DashboardBackgroundContext = GarageSceneContext;

async function migrateLegacySceneStorage() {
  try {
    let legacy = null;
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      legacy = localStorage.getItem(GARAGE_SCENE_STORAGE_KEY);
      if (legacy) localStorage.removeItem(GARAGE_SCENE_STORAGE_KEY);
    }
    const asyncLegacy = await AsyncStorage.getItem(GARAGE_SCENE_STORAGE_KEY);
    if (asyncLegacy) {
      await AsyncStorage.removeItem(GARAGE_SCENE_STORAGE_KEY);
    }
  } catch {
    // Non-fatal migration.
  }
}

/**
 * @param {{ children: React.ReactNode }} props
 */
export function GarageSceneProvider({ children }) {
  return <DashboardBackgroundProvider>{children}</DashboardBackgroundProvider>;
}

/** @param {{ children: React.ReactNode }} props */
export function DashboardBackgroundProvider({ children }) {
  const { isAuthenticated, authToken, isLoading: authLoading } = useContext(AuthContext);
  const hasSession = isAuthenticated || !!authToken;

  const [selectedSceneId, setSelectedSceneIdState] = useState(FALLBACK_BACKGROUND.id);
  const [isReady, setIsReady] = useState(false);
  const vehiclesRef = useRef([]);
  const resolveInFlight = useRef(null);

  const applyBackground = useCallback(async (background, eligibleCategories) => {
    const today = todayDateKey();
    setSelectedSceneIdState(background.id);
    await persistDashboardBackground({
      date: today,
      backgroundId: background.id,
      eligibleCategories,
    });
    preloadDashboardBackground(background);
  }, []);

  const resolveAndApply = useCallback(
    async ({ forceRefresh = false, vehiclesOverride = null } = {}) => {
      if (resolveInFlight.current) {
        return resolveInFlight.current;
      }

      const task = (async () => {
        const vehicles = vehiclesOverride ?? vehiclesRef.current ?? [];
        const eligibleCategories = resolveEligibleCategories(vehicles);
        const today = todayDateKey();

        if (!forceRefresh) {
          const stored = await loadStoredDashboardBackground();
          if (
            isStoredBackgroundFresh(stored, today) &&
            isStoredBackgroundValid(stored.backgroundId, eligibleCategories)
          ) {
            const background = getBackgroundById(stored.backgroundId);
            setSelectedSceneIdState(background.id);
            preloadDashboardBackground(background);
            return;
          }
        }

        const background = resolveDashboardBackground(vehicles, today);
        await applyBackground(background, eligibleCategories);
      })();

      resolveInFlight.current = task;
      try {
        await task;
      } finally {
        resolveInFlight.current = null;
      }
    },
    [applyBackground]
  );

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      await migrateLegacySceneStorage();

      if (authLoading) return;

      if (!hasSession) {
        vehiclesRef.current = [];
        if (!cancelled) {
          setSelectedSceneIdState(FALLBACK_BACKGROUND.id);
          setIsReady(true);
        }
        return;
      }

      try {
        const vehicles = await getVehicles().catch(() => []);
        vehiclesRef.current = Array.isArray(vehicles) ? vehicles : [];
      } catch {
        vehiclesRef.current = [];
      }

      if (!cancelled) {
        await resolveAndApply({ vehiclesOverride: vehiclesRef.current });
        if (!cancelled) {
          setIsReady(true);
        }
      }
    };

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [authLoading, hasSession, resolveAndApply]);

  const setSelectedSceneId = useCallback(
    async (id) => {
      const background = getBackgroundById(id);
      const eligibleCategories = resolveEligibleCategories(vehiclesRef.current);
      await applyBackground(background, eligibleCategories);
    },
    [applyBackground]
  );

  const refreshBackground = useCallback(async () => {
    if (!hasSession) return;
    try {
      const vehicles = await getVehicles().catch(() => []);
      vehiclesRef.current = Array.isArray(vehicles) ? vehicles : [];
    } catch {
      vehiclesRef.current = [];
    }
    await resolveAndApply({ forceRefresh: true, vehiclesOverride: vehiclesRef.current });
  }, [hasSession, resolveAndApply]);

  const getSelectedScene = useCallback(
    () => toGarageSceneShape(getBackgroundById(selectedSceneId)),
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
