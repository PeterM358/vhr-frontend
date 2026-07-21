import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { API_BASE_URL } from './config';
import { safeError, devLog } from '../utils/logger';
import {
  fetchCitiesForCountryCached,
  fetchCountriesCached,
} from '../utils/referenceDataCache';
import {
  describeApiListShape,
  normalizeApiListResponse,
} from '../utils/normalizeApiList';

function buildCityQuery(options = {}) {
  const params = new URLSearchParams();
  const search = String(options.search || '').trim();
  if (search) params.set('search', search);
  if (options.limit != null) params.set('limit', String(options.limit));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

function logCountryLoad({ endpoint, status, raw, normalizedCount, error = '' }) {
  if (!__DEV__) return;
  devLog(
    `[country-load] platform=${Platform.OS} api_base=${API_BASE_URL} endpoint=${endpoint} status=${status} raw_shape=${describeApiListShape(raw)} normalized_count=${normalizedCount} error=${error}`
  );
}

function logReferenceLoad(label, { endpoint, status, normalizedCount, error = '' }) {
  if (!__DEV__) return;
  devLog(
    `[${label}] platform=${Platform.OS} api_base=${API_BASE_URL} endpoint=${endpoint} status=${status} normalized_count=${normalizedCount} error=${error}`
  );
}

function normalizeFetchedList(raw, resourceLabel) {
  const rows = normalizeApiListResponse(raw);
  if (rows === null) {
    throw new Error(`Unexpected ${resourceLabel} response shape`);
  }
  return rows;
}

async function fetchCountriesRaw() {
  const endpoint = '/api/profiles/countries/';
  const token = await AsyncStorage.getItem('@access_token');
  let status = 0;
  let raw = null;
  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    status = res.status;
    if (!res.ok) {
      throw new Error(`Failed to fetch countries (${status})`);
    }
    raw = await res.json();
    const rows = normalizeFetchedList(raw, 'countries');
    logCountryLoad({
      endpoint,
      status,
      raw,
      normalizedCount: rows.length,
    });
    return rows;
  } catch (err) {
    const message = err?.message || String(err);
    logCountryLoad({
      endpoint,
      status,
      raw,
      normalizedCount: 0,
      error: message,
    });
    throw err;
  }
}

async function fetchCitiesForCountryRaw(countryId, options = {}) {
  const token = await AsyncStorage.getItem('@access_token');
  const query = buildCityQuery(options);
  const endpoint = `/api/profiles/countries/${countryId}/cities/${query}`;
  let status = 0;
  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    status = res.status;
    if (!res.ok) throw new Error(`Failed to fetch cities (${status})`);
    const raw = await res.json();
    const rows = normalizeFetchedList(raw, 'cities');
    logReferenceLoad('city-load', {
      endpoint,
      status,
      normalizedCount: rows.length,
    });
    return rows;
  } catch (err) {
    const message = err?.message || String(err);
    logReferenceLoad('city-load', {
      endpoint,
      status,
      normalizedCount: 0,
      error: message,
    });
    throw err;
  }
}

// 🔹 Create a new service center linked to the current shop user
export async function createShopProfile(payload) {
  const token = await AsyncStorage.getItem('@access_token');
  const res = await fetch(`${API_BASE_URL}/api/profiles/shop-profiles/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    safeError('Shop profile create failed', errorData?.detail || 'validation error');
    throw new Error(JSON.stringify(errorData));
  }
  return res.json();
}

// 🔹 Load *my* shop profiles (those user is linked to)
// In-flight dedup: concurrent callers (e.g. dashboard focus fans out multiple
// loaders) share a single request. Cleared on settle so mutations still refetch.
let myShopProfilesInFlight = null;

async function fetchMyShopProfiles() {
  const token = await AsyncStorage.getItem('@access_token');
  const res = await fetch(`${API_BASE_URL}/api/profiles/shop-profiles/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to load shop profiles');
  return res.json();
}

export function getMyShopProfiles() {
  if (myShopProfilesInFlight) return myShopProfilesInFlight;
  myShopProfilesInFlight = fetchMyShopProfiles().finally(() => {
    myShopProfilesInFlight = null;
  });
  return myShopProfilesInFlight;
}

// 🔹 Update a shop profile
export async function updateShopProfile(profileId, payload) {
  const token = await AsyncStorage.getItem('@access_token');
  const res = await fetch(`${API_BASE_URL}/api/profiles/shop-profiles/${profileId}/`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json();
    safeError('Shop profile update failed', errorData?.detail || 'validation error');
    throw new Error(JSON.stringify(errorData));
  }
  return res.json();
}

// 🔹 Load countries (cached)
export async function getCountries(options = {}) {
  const rows = await fetchCountriesCached(() => fetchCountriesRaw(), options);
  if (!options.force && rows.length === 0) {
    return fetchCountriesCached(() => fetchCountriesRaw(), { ...options, force: true });
  }
  return rows;
}

// 🔹 Load cities for a country (cached per country/search/limit)
export async function getCitiesForCountry(countryId, options = {}) {
  if (!countryId) return [];
  const rows = await fetchCitiesForCountryCached(
    countryId,
    () => fetchCitiesForCountryRaw(countryId, options),
    options
  );
  if (!options.force && rows.length === 0) {
    return fetchCitiesForCountryCached(
      countryId,
      () => fetchCitiesForCountryRaw(countryId, options),
      { ...options, force: true }
    );
  }
  return rows;
}

/** Search cities for discovery (lazy; cached per search term). */
export async function searchDiscoveryCities(search, options = {}) {
  const term = String(search || '').trim();
  if (!term) return [];
  const params = new URLSearchParams();
  params.set('search', term);
  if (options.country) params.set('country', String(options.country));
  if (options.limit != null) params.set('limit', String(options.limit));
  const res = await fetch(`${API_BASE_URL}/api/profiles/cities/?${params.toString()}`);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function getClientProfile() {
  const token = await AsyncStorage.getItem('@access_token');
  const res = await fetch(`${API_BASE_URL}/api/profiles/client-profile/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch client profile');
  return res.json();
}

export async function updateClientProfile(payload) {
  const token = await AsyncStorage.getItem('@access_token');
  const res = await fetch(`${API_BASE_URL}/api/profiles/client-profile/`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to update client profile');
  return res.json();
}

export async function uploadShopInvoiceLogo(profileId, token, attachment) {
  const formData = new FormData();
  if (attachment?.file) {
    formData.append('logo', attachment.file, attachment.fileName || 'invoice-logo');
  } else if (attachment?.uri) {
    formData.append('logo', {
      uri: attachment.uri,
      name: attachment.fileName || 'invoice-logo.png',
      type: attachment.mimeType || 'image/png',
    });
  } else {
    throw new Error('No logo file selected');
  }

  const res = await fetch(`${API_BASE_URL}/api/profiles/shop_profiles/${profileId}/invoice-logo/`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Failed to upload invoice logo');
  }
  return res.json();
}

export async function deleteShopInvoiceLogo(profileId, token) {
  const res = await fetch(`${API_BASE_URL}/api/profiles/shop_profiles/${profileId}/invoice-logo/`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 204) {
    throw new Error('Failed to remove invoice logo');
  }
}
/** Subscription payment catalog + Stripe/bank instructions for a shop. */
export async function getSubscriptionPaymentOptions(shopId) {
  const token = await AsyncStorage.getItem('@access_token');
  const res = await fetch(
    `${API_BASE_URL}/api/profiles/shop-profiles/${shopId}/subscription-payment-options/`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error('Failed to load subscription payment options');
  return res.json();
}

/** Create (or reuse) a pending bank payment request. Server sets amount/currency. */
export async function createSubscriptionPaymentRequest(shopId, { planKey, billingInterval }) {
  const token = await AsyncStorage.getItem('@access_token');
  const res = await fetch(
    `${API_BASE_URL}/api/profiles/shop-profiles/${shopId}/subscription-payment-requests/`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        plan_key: planKey,
        billing_interval: billingInterval,
      }),
    }
  );
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(JSON.stringify(errorData));
  }
  return res.json();
}

/** Start Stripe Checkout (subscription mode). Server resolves Price IDs/amounts. */
export async function createSubscriptionCheckout(shopId, { planKey, billingInterval }) {
  const token = await AsyncStorage.getItem('@access_token');
  const res = await fetch(
    `${API_BASE_URL}/api/profiles/shop-profiles/${shopId}/subscription-checkout/`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        plan_key: planKey,
        billing_interval: billingInterval,
      }),
    }
  );
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(JSON.stringify(errorData));
  }
  return res.json();
}

export async function listSubscriptionPaymentRequests(shopId) {
  const token = await AsyncStorage.getItem('@access_token');
  const res = await fetch(
    `${API_BASE_URL}/api/profiles/shop-profiles/${shopId}/subscription-payment-requests/`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error('Failed to load payment requests');
  return res.json();
}

export async function getShopEntitlementsApi(shopId) {
  const token = await AsyncStorage.getItem('@access_token');
  const res = await fetch(
    `${API_BASE_URL}/api/profiles/shop-profiles/${shopId}/entitlements/`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error('Failed to load entitlements');
  return res.json();
}
