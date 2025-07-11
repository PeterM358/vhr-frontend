// PATH: src/api/vehicles.js

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

export async function updateVehicle(vehicleId, payload, token) {
  const response = await fetch(`${API_BASE_URL}/api/vehicles/${vehicleId}/update/`, {
    method: 'PATCH',
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

export async function getMakes() {
  const token = await AsyncStorage.getItem('@access_token');
  const res = await fetch(`${API_BASE_URL}/api/vehicles/makes/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch Makes');
  return res.json();
}

export async function getModelsForMake(makeId) {
  const token = await AsyncStorage.getItem('@access_token');
  const res = await fetch(`${API_BASE_URL}/api/vehicles/makes/${makeId}/models/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to fetch models');
  return res.json();
}
