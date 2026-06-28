import { getShopCalendar } from '../api/repairs';

const TTL_MS = 60_000;

let cache = {
  key: null,
  data: null,
  at: 0,
  promise: null,
};

function cacheKey(from, to, shopId) {
  return `${from}|${to}|${shopId ?? ''}`;
}

export function invalidateShopCalendarCache() {
  cache = { key: null, data: null, at: 0, promise: null };
}

export async function fetchShopCalendarCached(token, { from, to, shopId, force = false } = {}) {
  const key = cacheKey(from, to, shopId);
  const now = Date.now();

  if (!force && cache.key === key && cache.data && now - cache.at < TTL_MS) {
    return cache.data;
  }

  if (cache.promise && cache.key === key) {
    return cache.promise;
  }

  cache.key = key;
  cache.promise = getShopCalendar(token, { from, to, shopId })
    .then((data) => {
      cache.data = data;
      cache.at = Date.now();
      cache.promise = null;
      return data;
    })
    .catch((err) => {
      cache.promise = null;
      throw err;
    });

  return cache.promise;
}
