import { API_BASE_URL } from './config';
import { messageFromApiResponseText } from '../utils/apiErrorMessage';
import { shopScopedHeaders } from '../utils/currentShop';

async function parseError(response, fallback) {
  const text = await response.text();
  return messageFromApiResponseText(text, fallback);
}

export async function getOwnerAnalyticsSummary(token, shopId, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const url = `${API_BASE_URL}/api/repairs/shops/${shopId}/analytics/summary/${qs ? `?${qs}` : ''}`;
  const response = await fetch(url, { headers: await shopScopedHeaders(token) });
  if (!response.ok) throw new Error(await parseError(response, 'Failed to load analytics'));
  return response.json();
}

export async function listShopComplaints(token, shopId, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const url = `${API_BASE_URL}/api/repairs/shops/${shopId}/complaints/${qs ? `?${qs}` : ''}`;
  const response = await fetch(url, { headers: await shopScopedHeaders(token) });
  if (!response.ok) throw new Error(await parseError(response, 'Failed to load complaints'));
  return response.json();
}

export async function updateShopComplaint(token, shopId, complaintId, payload) {
  const response = await fetch(
    `${API_BASE_URL}/api/repairs/shops/${shopId}/complaints/${complaintId}/`,
    {
      method: 'PATCH',
      headers: { ...(await shopScopedHeaders(token)), 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to update complaint'));
  return response.json();
}

export async function listDocumentImports(token, shopId, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const url = `${API_BASE_URL}/api/profiles/shop-profiles/${shopId}/document-imports/${qs ? `?${qs}` : ''}`;
  const response = await fetch(url, { headers: await shopScopedHeaders(token) });
  if (!response.ok) throw new Error(await parseError(response, 'Failed to load document imports'));
  return response.json();
}

export async function listShopEmployees(token, shopId) {
  const response = await fetch(
    `${API_BASE_URL}/api/profiles/shop-profiles/${shopId}/employees/`,
    { headers: await shopScopedHeaders(token) },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to load employees'));
  return response.json();
}

export async function listShopDepartments(token, shopId) {
  const response = await fetch(
    `${API_BASE_URL}/api/profiles/shop-profiles/${shopId}/departments/`,
    { headers: await shopScopedHeaders(token) },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to load departments'));
  return response.json();
}

export async function deleteAccount(token) {
  const response = await fetch(`${API_BASE_URL}/api/users/account/delete/`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(await parseError(response, 'Failed to delete account'));
  return response.json();
}
