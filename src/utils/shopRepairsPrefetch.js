import { getRepairs } from '../api/repairs';

const TAB_KEYS = ['open', 'ongoing', 'done'];
const CACHE_TTL_MS = 90_000;

let cache = {
  open: null,
  ongoing: null,
  done: null,
  fetchedAt: 0,
};

export function getCachedShopRepairs(status) {
  if (cache.fetchedAt <= 0 || Date.now() - cache.fetchedAt >= CACHE_TTL_MS) {
    return null;
  }
  return cache[status] ?? null;
}

export function setCachedShopRepairs(status, rows) {
  cache = {
    ...cache,
    [status]: Array.isArray(rows) ? rows : [],
    fetchedAt: Date.now(),
  };
}

export function invalidateShopRepairsCache() {
  cache = { open: null, ongoing: null, done: null, fetchedAt: 0 };
}

/** Fetch a single status tab — one API call. */
export async function fetchShopRepairsTab(token, status) {
  if (!token || !TAB_KEYS.includes(status)) return [];
  const rows = await getRepairs(token, { status });
  const list = Array.isArray(rows) ? rows : [];
  setCachedShopRepairs(status, list);
  return list;
}

/**
 * @deprecated Prefer fetchShopRepairsTab — loads only what you need.
 */
export async function prefetchShopRepairsTabs(token) {
  if (!token) return null;
  const status = 'open';
  const rows = await fetchShopRepairsTab(token, status);
  return { open: rows, ongoing: cache.ongoing, done: cache.done };
}
