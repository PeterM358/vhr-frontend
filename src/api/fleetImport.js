import { API_BASE_URL } from './config';
import { fleetUploadErrorMessage, messageFromApiResponseText } from '../utils/apiErrorMessage';
import { getLocale } from '../i18n';

async function parseError(response, fallback) {
  const text = await response.text();
  return fleetUploadErrorMessage({
    status: response.status,
    bodyText: text,
    locale: getLocale(),
    fallback: messageFromApiResponseText(text, fallback),
  });
}

function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function listOrganizations(token) {
  const response = await fetch(`${API_BASE_URL}/api/organizations/`, {
    headers: authHeaders(token),
  });
  if (!response.ok) throw new Error(await parseError(response, 'Failed to load organizations'));
  return response.json();
}

export async function uploadFleetRegister(token, organizationId, filePayload) {
  const form = new FormData();
  const blob = filePayload.file || filePayload;
  form.append('file', blob, filePayload.fileName || blob.name || 'fleet-register.xlsx');
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/fleet-import/upload/`,
    {
      method: 'POST',
      headers: authHeaders(token),
      body: form,
    },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to upload fleet register'));
  return response.json();
}

export async function getFleetImportBatch(token, organizationId, batchId) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/fleet-import/${batchId}/`,
    { headers: authHeaders(token) },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to load import batch'));
  return response.json();
}

export async function getFleetImportRows(token, organizationId, batchId) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/fleet-import/${batchId}/rows/`,
    { headers: authHeaders(token) },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to load import rows'));
  return response.json();
}

export async function patchFleetImportRow(token, organizationId, batchId, rowId, payload) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/fleet-import/${batchId}/rows/${rowId}/`,
    {
      method: 'PATCH',
      headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to update row decision'));
  return response.json();
}

export async function bulkDecideFleetImportRows(token, organizationId, batchId, payload) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/fleet-import/${batchId}/rows/bulk-decide/`,
    {
      method: 'POST',
      headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to apply bulk decisions'));
  return response.json();
}

export async function confirmFleetImport(token, organizationId, batchId) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/fleet-import/${batchId}/confirm/`,
    {
      method: 'POST',
      headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to confirm fleet import'));
  return response.json();
}

export async function getFleetImportResult(token, organizationId, batchId) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/fleet-import/${batchId}/result/`,
    { headers: authHeaders(token) },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to load import result'));
  return response.json();
}

export function fleetImportErrorReportUrl(organizationId, batchId, locale = 'en') {
  const qs = locale.startsWith('bg') ? '?locale=bg' : '';
  return `${API_BASE_URL}/api/organizations/${organizationId}/fleet-import/${batchId}/errors.csv${qs}`;
}

export function organizationsWithFleetImportAccess(organizations = []) {
  return organizations.filter((org) => org.manage_fleet);
}
