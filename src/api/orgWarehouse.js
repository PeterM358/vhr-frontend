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

export async function listOrgMaterials(token, organizationId, params = {}) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/warehouse/materials/${buildQuery(params)}`,
    { headers: authHeaders(token) },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to load materials'));
  return response.json();
}

export async function listMaterialsIntakes(token, organizationId, params = {}) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/warehouse/materials-intake/${buildQuery(params)}`,
    { headers: authHeaders(token) },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to load intakes'));
  return response.json();
}

export async function getMaterialsIntake(token, organizationId, intakeId) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/warehouse/materials-intake/${intakeId}/`,
    { headers: authHeaders(token) },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to load intake'));
  return response.json();
}

export async function uploadMaterialsIntake(
  token,
  organizationId,
  { file, documentKind = 'invoice', linkedProformaId } = {},
) {
  const form = new FormData();
  if (file?.file) {
    form.append('file', file.file, file.fileName || file.name || 'invoice.pdf');
  } else if (file?.uri) {
    form.append('file', {
      uri: file.uri,
      name: file.fileName || 'invoice.pdf',
      type: file.mimeType || 'application/pdf',
    });
  } else if (file instanceof Blob || (typeof File !== 'undefined' && file instanceof File)) {
    form.append('file', file, file.name || 'invoice.pdf');
  } else {
    throw new Error('No invoice file selected');
  }
  form.append('document_kind', documentKind);
  if (linkedProformaId) form.append('linked_proforma_id', String(linkedProformaId));

  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/warehouse/materials-intake/`,
    {
      method: 'POST',
      headers: authHeaders(token),
      body: form,
    },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to upload invoice'));
  return response.json();
}

export async function addMaterialsIntakeLine(token, organizationId, intakeId, payload) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/warehouse/materials-intake/${intakeId}/lines/`,
    {
      method: 'POST',
      headers: {
        ...authHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to add line'));
  return response.json();
}

export async function updateMaterialsIntakeLine(token, organizationId, intakeId, lineId, payload) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/warehouse/materials-intake/${intakeId}/lines/${lineId}/`,
    {
      method: 'PATCH',
      headers: {
        ...authHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to update line'));
  return response.json();
}

export async function deleteMaterialsIntakeLine(token, organizationId, intakeId, lineId) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/warehouse/materials-intake/${intakeId}/lines/${lineId}/`,
    {
      method: 'DELETE',
      headers: authHeaders(token),
    },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to delete line'));
  return true;
}

export async function confirmMaterialsIntake(token, organizationId, intakeId) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/warehouse/materials-intake/${intakeId}/confirm/`,
    {
      method: 'POST',
      headers: authHeaders(token),
    },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to confirm intake'));
  return response.json();
}
