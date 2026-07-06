/**
 * Shared in-memory (+ optional AsyncStorage) cache for rarely-changing reference data.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_PREFIX = '@vhr_ref_';
const COUNTRIES_STORAGE_KEY = `${STORAGE_PREFIX}countries_v1`;

const COUNTRIES_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const CITIES_TTL_MS = 24 * 60 * 60 * 1000;
const VEHICLE_TYPES_TTL_MS = 24 * 60 * 60 * 1000;
const REPAIR_TYPES_TTL_MS = 24 * 60 * 60 * 1000;
const VEHICLE_MAKES_TTL_MS = 24 * 60 * 60 * 1000;

const memory = {
  countries: { data: null, at: 0, promise: null },
  cities: new Map(),
  vehicleTypes: { data: null, at: 0, promise: null },
  repairTypes: { data: null, at: 0, promise: null },
  vehicleMakes: { data: null, at: 0, promise: null },
};

function isFresh(at, ttl) {
  return at > 0 && Date.now() - at < ttl;
}

function citiesCacheKey(countryId, options = {}) {
  const search = String(options.search || '').trim().toLowerCase();
  const limit = options.limit != null ? String(options.limit) : '';
  return `${countryId}|${search}|${limit}`;
}

async function readPersistedCountries() {
  try {
    const raw = await AsyncStorage.getItem(COUNTRIES_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.data || !isFresh(parsed.at, COUNTRIES_TTL_MS)) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

async function writePersistedCountries(data) {
  try {
    await AsyncStorage.setItem(
      COUNTRIES_STORAGE_KEY,
      JSON.stringify({ at: Date.now(), data })
    );
  } catch {
    // ignore storage failures
  }
}

export function invalidateReferenceDataCache() {
  memory.countries = { data: null, at: 0, promise: null };
  memory.cities.clear();
  memory.vehicleTypes = { data: null, at: 0, promise: null };
  memory.repairTypes = { data: null, at: 0, promise: null };
  memory.vehicleMakes = { data: null, at: 0, promise: null };
}

export async function fetchCountriesCached(fetcher, { force = false } = {}) {
  const bucket = memory.countries;
  if (!force && bucket.data && isFresh(bucket.at, COUNTRIES_TTL_MS)) {
    return bucket.data;
  }
  if (bucket.promise) {
    return bucket.promise;
  }

  bucket.promise = (async () => {
    if (!force) {
      const persisted = await readPersistedCountries();
      if (persisted) {
        bucket.data = persisted;
        bucket.at = Date.now();
        bucket.promise = null;
        return persisted;
      }
    }

    const data = await fetcher();
    bucket.data = data;
    bucket.at = Date.now();
    bucket.promise = null;
    await writePersistedCountries(data);
    return data;
  })().catch((err) => {
    bucket.promise = null;
    throw err;
  });

  return bucket.promise;
}

export async function fetchCitiesForCountryCached(countryId, fetcher, options = {}) {
  const key = citiesCacheKey(countryId, options);
  const bucket = memory.cities.get(key) || { data: null, at: 0, promise: null };

  if (!options.force && bucket.data && isFresh(bucket.at, CITIES_TTL_MS)) {
    return bucket.data;
  }
  if (bucket.promise) {
    return bucket.promise;
  }

  bucket.promise = fetcher()
    .then((data) => {
      bucket.data = data;
      bucket.at = Date.now();
      bucket.promise = null;
      memory.cities.set(key, bucket);
      return data;
    })
    .catch((err) => {
      bucket.promise = null;
      memory.cities.set(key, bucket);
      throw err;
    });

  memory.cities.set(key, bucket);
  return bucket.promise;
}

export async function fetchVehicleTypesCached(fetcher, { force = false } = {}) {
  const bucket = memory.vehicleTypes;
  if (!force && bucket.data && isFresh(bucket.at, VEHICLE_TYPES_TTL_MS)) {
    return bucket.data;
  }
  if (bucket.promise) {
    return bucket.promise;
  }

  bucket.promise = fetcher()
    .then((data) => {
      bucket.data = data;
      bucket.at = Date.now();
      bucket.promise = null;
      return data;
    })
    .catch((err) => {
      bucket.promise = null;
      throw err;
    });

  return bucket.promise;
}

function createSimpleBucketFetcher(bucketName, ttl) {
  return async function fetchCached(fetcher, { force = false } = {}) {
    const bucket = memory[bucketName];
    if (!force && bucket.data && isFresh(bucket.at, ttl)) {
      return bucket.data;
    }
    if (bucket.promise) {
      return bucket.promise;
    }

    bucket.promise = fetcher()
      .then((data) => {
        bucket.data = data;
        bucket.at = Date.now();
        bucket.promise = null;
        return data;
      })
      .catch((err) => {
        bucket.promise = null;
        throw err;
      });

    return bucket.promise;
  };
}

export const fetchRepairTypesCached = createSimpleBucketFetcher('repairTypes', REPAIR_TYPES_TTL_MS);
export const fetchVehicleMakesCached = createSimpleBucketFetcher('vehicleMakes', VEHICLE_MAKES_TTL_MS);
