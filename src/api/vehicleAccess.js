import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from './config';

async function authHeaders() {
  const token = await AsyncStorage.getItem('@access_token');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

function throwVehicleAccessError(data, fallback, status) {
  const detail = data?.detail || fallback;
  const code = data?.code;
  const message = code ? `${detail} (${code})` : detail;
  const err = new Error(message);
  err.code = code;
  err.status = status;
  err.responseText = JSON.stringify(data || {});
  throw err;
}

export async function createVehicleAccessRequest(vehicleId, payload) {
  const response = await fetch(`${API_BASE_URL}/api/vehicles/${vehicleId}/access-requests/`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(payload || {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throwVehicleAccessError(data, 'Unable to request vehicle history access', response.status);
  }
  return data;
}

export async function getVehicleAccessRequest(vehicleId, requestId) {
  const response = await fetch(
    `${API_BASE_URL}/api/vehicles/${vehicleId}/access-requests/${requestId}/`,
    { headers: await authHeaders() }
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throwVehicleAccessError(data, 'Unable to load access request');
  }
  return data;
}

export async function previewVehicleAccessToken({ token, code } = {}) {
  const response = await fetch(`${API_BASE_URL}/api/vehicles/access/token-preview/`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({
      token: token || undefined,
      code: code || undefined,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throwVehicleAccessError(data, 'Unable to preview authorization');
  }
  return data;
}

export async function respondToVehicleAccessRequest(requestId, payload) {
  const response = await fetch(
    `${API_BASE_URL}/api/vehicles/access/requests/${requestId}/respond/`,
    {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify(payload || {}),
    }
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throwVehicleAccessError(data, 'Unable to respond to access request');
  }
  return data;
}

export async function getVehicleAccessSecurityCenter(vehicleId) {
  const path = vehicleId
    ? `/api/vehicles/${vehicleId}/access/security-center/`
    : '/api/vehicles/access/security-center/';
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: await authHeaders(),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throwVehicleAccessError(data, 'Unable to load vehicle access');
  }
  return data;
}

export async function revokeVehicleAccessGrant(grantId) {
  const response = await fetch(
    `${API_BASE_URL}/api/vehicles/access/grants/${grantId}/revoke/`,
    {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({}),
    }
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throwVehicleAccessError(data, 'Unable to revoke access');
  }
  return data;
}

export async function unblockShopForVehicleAccess(shopId) {
  const response = await fetch(
    `${API_BASE_URL}/api/vehicles/access/blocked-shops/${shopId}/unblock/`,
    {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({}),
    }
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throwVehicleAccessError(data, 'Unable to unblock shop');
  }
  return data;
}
