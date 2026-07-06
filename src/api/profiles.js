import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from './config';
import { safeError } from '../utils/logger';
import {
  fetchCitiesForCountryCached,
  fetchCountriesCached,
} from '../utils/referenceDataCache';

function buildCityQuery(options = {}) {
  const params = new URLSearchParams();
  const search = String(options.search || '').trim();
  if (search) params.set('search', search);
  if (options.limit != null) params.set('limit', String(options.limit));
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

async function fetchCountriesRaw() {
  const token = await AsyncStorage.getItem('@access_token');
  const res = await fetch(`${API_BASE_URL}/api/profiles/countries/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch countries');
  return res.json();
}

async function fetchCitiesForCountryRaw(countryId, options = {}) {
  const token = await AsyncStorage.getItem('@access_token');
  const query = buildCityQuery(options);
  const res = await fetch(
    `${API_BASE_URL}/api/profiles/countries/${countryId}/cities/${query}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!res.ok) throw new Error('Failed to fetch cities');
  return res.json();
}

// 🔹 Load *my* shop profiles (those user is linked to)
export async function getMyShopProfiles() {
  const token = await AsyncStorage.getItem('@access_token');
  const res = await fetch(`${API_BASE_URL}/api/profiles/shop-profiles/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to load shop profiles');
  return res.json();
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
  return fetchCountriesCached(() => fetchCountriesRaw(), options);
}

// 🔹 Load cities for a country (cached per country/search/limit)
export async function getCitiesForCountry(countryId, options = {}) {
  if (!countryId) return [];
  return fetchCitiesForCountryCached(
    countryId,
    () => fetchCitiesForCountryRaw(countryId, options),
    options
  );
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