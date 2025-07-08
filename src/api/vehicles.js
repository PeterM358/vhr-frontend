// src/api/vehicles.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from './config';


export async function getVehicles() {
  const token = await AsyncStorage.getItem('@access_token');
  const response = await fetch(`${API_BASE_URL}/api/vehicles/`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch vehicles');
  }

  return await response.json();
}

// api/vehicles.js
export async function updateVehicle(vehicleId, payload, token) {
  const response = await fetch(`${API_BASE_URL}/api/vehicles/${vehicleId}/update/`, {
    method: 'PATCH', // ✅ not POST or GET
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Failed to update vehicle');
  }

  return response.json();
}


export async function getBrands() {
  const token = await AsyncStorage.getItem('@access_token');
  const res = await fetch(`${API_BASE_URL}/api/vehicles/brands/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch brands');
  return res.json();
}

export async function getModelsForBrand(brandId) {
  const token = await AsyncStorage.getItem('@access_token');
  const res = await fetch(`${API_BASE_URL}/api/vehicles/brands/${brandId}/models/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch models');
  return res.json();
}
