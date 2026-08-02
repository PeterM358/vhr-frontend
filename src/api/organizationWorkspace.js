import { API_BASE_URL } from './config';
import { messageFromApiResponseText } from '../utils/apiErrorMessage';
import { orgScopedHeaders } from '../utils/orgWorkspace';

async function parseError(response, fallback) {
  const text = await response.text();
  return messageFromApiResponseText(text, fallback);
}

export async function createOrganizationOnboarding(token, payload) {
  const response = await fetch(`${API_BASE_URL}/api/organizations/onboarding/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await parseError(response, 'Failed to create organization'));
  return response.json();
}

export async function listOrganizationWorkspace(token) {
  const response = await fetch(`${API_BASE_URL}/api/organizations/workspace/`, {
    headers: await orgScopedHeaders(token),
  });
  if (!response.ok) throw new Error(await parseError(response, 'Failed to load organizations'));
  return response.json();
}

export async function getOrganizationWorkspaceContext(token, organizationId) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/workspace/`,
    { headers: await orgScopedHeaders(token) },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to load organization context'));
  return response.json();
}

export async function getPublicOrganizationProfile(slug) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/public/${encodeURIComponent(slug)}/`,
  );
  if (!response.ok) throw new Error(await parseError(response, 'Organization not found'));
  return response.json();
}

export async function getOrganizationPublicProfileSettings(token, organizationId) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/public-profile/`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to load public profile settings'));
  return response.json();
}

export async function updateOrganizationPublicProfileSettings(token, organizationId, payload) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/public-profile/`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to update public profile'));
  return response.json();
}

export async function getOrganizationActivities(token, organizationId) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/activities/`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to load organization activities'));
  return response.json();
}

export async function updateOrganizationActivities(token, organizationId, payload) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/activities/`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to update organization activities'));
  return response.json();
}
