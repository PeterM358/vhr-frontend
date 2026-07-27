import { API_BASE_URL } from './config';
import { messageFromApiResponseText } from '../utils/apiErrorMessage';

async function parseError(response, fallback) {
  const text = await response.text();
  return messageFromApiResponseText(text, fallback);
}

function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function buildQuery(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value));
    }
  });
  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
}

export async function listWarehouseLocations(token, organizationId, params = {}) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/warehouse/locations/${buildQuery(params)}`,
    { headers: authHeaders(token) },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to load warehouse locations'));
  return response.json();
}

export async function createWarehouseLocation(token, organizationId, payload) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/warehouse/locations/`,
    {
      method: 'POST',
      headers: {
        ...authHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to create location'));
  return response.json();
}

export async function updateWarehouseLocation(token, organizationId, locationId, payload) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/warehouse/locations/${locationId}/`,
    {
      method: 'PATCH',
      headers: {
        ...authHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to update location'));
  return response.json();
}

export async function deactivateWarehouseLocation(token, organizationId, locationId) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/warehouse/locations/${locationId}/`,
    {
      method: 'DELETE',
      headers: authHeaders(token),
    },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to deactivate location'));
  return response.json();
}
