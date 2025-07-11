import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from './config';

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
    console.error('Backend Validation Error:', errorData);
    throw new Error(JSON.stringify(errorData));
  }
  return res.json();
}

// 🔹 Load countries
export async function getCountries() {
  const token = await AsyncStorage.getItem('@access_token');
  const res = await fetch(`${API_BASE_URL}/api/profiles/countries/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch countries');
  return res.json();
}

// 🔹 Load cities for a country
export async function getCitiesForCountry(countryId) {
  const token = await AsyncStorage.getItem('@access_token');
  const res = await fetch(`${API_BASE_URL}/api/profiles/countries/${countryId}/cities/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch cities');
  return res.json();
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