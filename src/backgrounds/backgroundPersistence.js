/**
 * Daily dashboard background persistence.
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const DASHBOARD_BACKGROUND_STORAGE_KEY = '@veversal/dashboard_background';

/**
 * Local calendar date key (YYYY-MM-DD).
 * @returns {string}
 */
export function todayDateKey() {
  return new Date().toLocaleDateString('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * @typedef {Object} StoredDashboardBackground
 * @property {string} date — YYYY-MM-DD
 * @property {string} backgroundId
 * @property {string[]} eligibleCategories
 */

/**
 * @returns {Promise<StoredDashboardBackground | null>}
 */
export async function loadStoredDashboardBackground() {
  try {
    let raw = null;
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      raw = localStorage.getItem(DASHBOARD_BACKGROUND_STORAGE_KEY);
    } else {
      raw = await AsyncStorage.getItem(DASHBOARD_BACKGROUND_STORAGE_KEY);
    }
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.date || !parsed?.backgroundId) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * @param {StoredDashboardBackground} payload
 */
export async function persistDashboardBackground(payload) {
  const serialized = JSON.stringify(payload);
  try {
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      localStorage.setItem(DASHBOARD_BACKGROUND_STORAGE_KEY, serialized);
    }
    await AsyncStorage.setItem(DASHBOARD_BACKGROUND_STORAGE_KEY, serialized);
  } catch {
    // Non-fatal — background still applies for the current session.
  }
}

/**
 * @param {StoredDashboardBackground | null} stored
 * @param {string} today
 * @returns {boolean}
 */
export function isStoredBackgroundFresh(stored, today = todayDateKey()) {
  return !!(stored && stored.date === today);
}
