import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from './config';
import { fetchVehicleTypesCached } from '../utils/referenceDataCache';

async function fetchVehicleTypesRaw() {
  const token = await AsyncStorage.getItem('@access_token');
  const res = await fetch(`${API_BASE_URL}/api/vehicles/types/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to load vehicle types');
  const rows = await res.json();
  return Array.isArray(rows) ? rows : [];
}

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

/** GET /api/vehicles/:id/forecast/ — anonymized cohort + own usage/spend estimates. */
export async function getVehicleForecast(vehicleId, token, { horizonMonths = 12 } = {}) {
  const params = new URLSearchParams();
  if (horizonMonths != null) params.set('horizon_months', String(horizonMonths));
  const qs = params.toString();
  const response = await fetch(
    `${API_BASE_URL}/api/vehicles/${vehicleId}/forecast/${qs ? `?${qs}` : ''}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!response.ok) {
    throw new Error('Failed to fetch vehicle forecast');
  }
  return response.json();
}

export async function patchVehicleReminder(vehicleId, reminderId, payload, token) {
  const response = await fetch(
    `${API_BASE_URL}/api/vehicles/${vehicleId}/reminders/${reminderId}/`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    }
  );
  if (!response.ok) {
    throw new Error('Failed to update reminder');
  }
  return response.json();
}

/** POST /api/vehicles/:id/expenses/ — amounts are minor units (see VehicleExpense.amount_minor). */
export async function createVehicleExpense(vehicleId, payload, token) {
  const response = await fetch(`${API_BASE_URL}/api/vehicles/${vehicleId}/expenses/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    const err = new Error('Failed to create expense');
    err.responseText = errText;
    throw err;
  }
  return response.json();
}

export async function getVehicleTypes(options = {}) {
  return fetchVehicleTypesCached(() => fetchVehicleTypesRaw(), options);
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

export async function getVehicleChoices() {
  const token = await AsyncStorage.getItem('@access_token');
  const res = await fetch(`${API_BASE_URL}/api/vehicles/choices/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return {};
  const data = await res.json();
  return data && typeof data === 'object' ? data : {};
}

export async function getVehicleFieldGroups(vehicleTypeIdOrCode) {
  const token = await AsyncStorage.getItem('@access_token');
  const qs = catalogQuery({ vehicle_type: vehicleTypeIdOrCode });
  const res = await fetch(`${API_BASE_URL}/api/vehicles/field-groups/${qs}`, {
    headers: withAuthHeaders(token),
  });
  if (!res.ok) return [];
  const rows = await res.json();
  return Array.isArray(rows) ? rows : [];
}

function withAuthHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

function catalogQuery(params) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v != null && String(v).trim() !== '') q.set(k, String(v).trim());
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

export async function lookupVehicleMaintenanceSpec({
  vehicleType,
  catalogBrand,
  catalogModel,
  catalogGeneration,
  catalogEngine,
  year,
  fuelType,
  engineCode,
}) {
  const token = await AsyncStorage.getItem('@access_token');
  const qs = catalogQuery({
    vehicle_type: vehicleType,
    catalog_brand: catalogBrand,
    catalog_model: catalogModel,
    catalog_generation: catalogGeneration,
    catalog_engine: catalogEngine,
    year,
    fuel_type: fuelType,
    engine_code: engineCode,
  });
  const res = await fetch(`${API_BASE_URL}/api/vehicles/catalog/specs/lookup/${qs}`, {
    headers: withAuthHeaders(token),
  });
  if (!res.ok) return { found: false, spec: null };
  return res.json();
}

export async function getCatalogBrands(vehicleTypeIdOrCode) {
  const token = await AsyncStorage.getItem('@access_token');
  const qs = catalogQuery({ vehicle_type: vehicleTypeIdOrCode });
  const res = await fetch(`${API_BASE_URL}/api/vehicles/catalog/brands/${qs}`, {
    headers: withAuthHeaders(token),
  });
  if (!res.ok) return [];
  const rows = await res.json();
  return Array.isArray(rows) ? rows : [];
}

export async function getCatalogModels(brandId, vehicleTypeIdOrCode) {
  const token = await AsyncStorage.getItem('@access_token');
  const qs = catalogQuery({ brand: brandId, vehicle_type: vehicleTypeIdOrCode });
  const res = await fetch(`${API_BASE_URL}/api/vehicles/catalog/models/${qs}`, {
    headers: withAuthHeaders(token),
  });
  if (!res.ok) return [];
  const rows = await res.json();
  return Array.isArray(rows) ? rows : [];
}

export async function getCatalogGenerations(modelId) {
  const token = await AsyncStorage.getItem('@access_token');
  const qs = catalogQuery({ model: modelId });
  const res = await fetch(`${API_BASE_URL}/api/vehicles/catalog/generations/${qs}`, {
    headers: withAuthHeaders(token),
  });
  if (!res.ok) return [];
  const rows = await res.json();
  return Array.isArray(rows) ? rows : [];
}

export async function getCatalogEngines(generationId) {
  const token = await AsyncStorage.getItem('@access_token');
  const qs = catalogQuery({ generation: generationId });
  const res = await fetch(`${API_BASE_URL}/api/vehicles/catalog/engines/${qs}`, {
    headers: withAuthHeaders(token),
  });
  if (!res.ok) return [];
  const rows = await res.json();
  return Array.isArray(rows) ? rows : [];
}

export async function getCatalogTrims(generationId) {
  const token = await AsyncStorage.getItem('@access_token');
  const qs = catalogQuery({ generation: generationId });
  const res = await fetch(`${API_BASE_URL}/api/vehicles/catalog/trims/${qs}`, {
    headers: withAuthHeaders(token),
  });
  if (!res.ok) return [];
  const rows = await res.json();
  return Array.isArray(rows) ? rows : [];
}

export async function getCatalogEbikeSystems() {
  const token = await AsyncStorage.getItem('@access_token');
  const res = await fetch(`${API_BASE_URL}/api/vehicles/catalog/ebike-systems/`, {
    headers: withAuthHeaders(token),
  });
  if (!res.ok) return [];
  const rows = await res.json();
  return Array.isArray(rows) ? rows : [];
}

export async function getCatalogTrailerTypes() {
  const token = await AsyncStorage.getItem('@access_token');
  const res = await fetch(`${API_BASE_URL}/api/vehicles/catalog/trailer-types/`, {
    headers: withAuthHeaders(token),
  });
  if (!res.ok) return [];
  const rows = await res.json();
  return Array.isArray(rows) ? rows : [];
}

export async function createVehicle(token, data, clientInfo = {}) {
  const payload = { ...data, ...clientInfo };

  const response = await fetch(`${API_BASE_URL}/api/vehicles/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Create vehicle failed: ${response.status} ${errorText}`);
  }

  return await response.json();
}