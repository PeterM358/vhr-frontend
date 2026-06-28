import AsyncStorage from '@react-native-async-storage/async-storage';

const UNSCHEDULED_COUNT_KEY = '@shop_unscheduled_count';
const UNSCHEDULED_FETCHED_AT_KEY = '@shop_unscheduled_fetched_at';
const BADGE_TTL_MS = 60_000;

export async function cacheUnscheduledCount(count) {
  try {
    await AsyncStorage.multiSet([
      [UNSCHEDULED_COUNT_KEY, String(Math.max(0, Number(count) || 0))],
      [UNSCHEDULED_FETCHED_AT_KEY, String(Date.now())],
    ]);
  } catch {
    /* ignore */
  }
}

export async function readCachedUnscheduledCount() {
  try {
    const raw = await AsyncStorage.getItem(UNSCHEDULED_COUNT_KEY);
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

export async function shouldRefreshUnscheduledCount(maxAgeMs = BADGE_TTL_MS) {
  try {
    const raw = await AsyncStorage.getItem(UNSCHEDULED_FETCHED_AT_KEY);
    const fetchedAt = Number(raw);
    if (!Number.isFinite(fetchedAt) || fetchedAt <= 0) return true;
    return Date.now() - fetchedAt > maxAgeMs;
  } catch {
    return true;
  }
}
