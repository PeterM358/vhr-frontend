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

export async function listOrgWorkforce(token, organizationId) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/workforce/`,
    { headers: authHeaders(token) },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to load workforce'));
  return response.json();
}

export async function updateOrgWorkforceMember(token, organizationId, membershipId, payload) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/workforce/${membershipId}/`,
    {
      method: 'PATCH',
      headers: {
        ...authHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to update member'));
  return response.json();
}

export async function listVehicleAssignments(token, organizationId, params = {}) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/vehicle-assignments/${buildQuery(params)}`,
    { headers: authHeaders(token) },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to load assignments'));
  return response.json();
}

export async function createVehicleAssignment(token, organizationId, payload) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/vehicle-assignments/`,
    {
      method: 'POST',
      headers: {
        ...authHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to assign vehicle'));
  return response.json();
}

export async function endVehicleAssignment(token, organizationId, assignmentId) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/vehicle-assignments/${assignmentId}/`,
    {
      method: 'DELETE',
      headers: authHeaders(token),
    },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to end assignment'));
  return response.json();
}
