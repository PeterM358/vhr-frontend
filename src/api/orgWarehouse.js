import { API_BASE_URL } from './config';
import { messageFromApiResponseText } from '../utils/apiErrorMessage';
import { orgScopedHeaders } from '../utils/orgWorkspace';

async function parseError(response, fallback) {
  const text = await response.text();
  return messageFromApiResponseText(text, fallback);
}

function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function orgAuthFetch(url, options = {}) {
  try {
    return await fetch(url, options);
  } catch (err) {
    const msg = String(err?.message || '');
    if (/failed to fetch|network request failed|load failed/i.test(msg)) {
      throw new Error(
        'Could not reach the server. Check your connection and try again.',
      );
    }
    throw err;
  }
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

export async function getWarehouseSettings(token, organizationId) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/warehouse/settings/`,
    { headers: authHeaders(token) },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to load warehouse settings'));
  return response.json();
}

export async function updateWarehouseSettings(token, organizationId, payload) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/warehouse/settings/`,
    {
      method: 'PATCH',
      headers: {
        ...authHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload || {}),
    },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to update warehouse settings'));
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

export async function createOrgMaterial(token, organizationId, payload) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/warehouse/materials/`,
    {
      method: 'POST',
      headers: {
        ...authHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to add material'));
  return response.json();
}

export async function updateOrgMaterial(token, organizationId, stockId, payload) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/warehouse/materials/${stockId}/`,
    {
      method: 'PATCH',
      headers: {
        ...authHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to update material'));
  return response.json();
}

export async function createMaterialScrap(token, organizationId, payload) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/warehouse/material-scrap/`,
    {
      method: 'POST',
      headers: {
        ...authHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload || {}),
    },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to write off material'));
  return response.json();
}

export async function listToolAssets(token, organizationId, params = {}) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/warehouse/tool-assets/${buildQuery(params)}`,
    { headers: authHeaders(token) },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to load tool assets'));
  return response.json();
}

export async function generateToolAssets(token, organizationId, payload) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/warehouse/tool-assets/`,
    {
      method: 'POST',
      headers: {
        ...authHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload || {}),
    },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to number tools'));
  return response.json();
}

export async function issueToolAsset(token, organizationId, assetId, payload) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/warehouse/tool-assets/${assetId}/issue/`,
    {
      method: 'POST',
      headers: {
        ...authHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload || {}),
    },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to issue tool'));
  return response.json();
}

export async function returnToolAsset(token, organizationId, assetId, payload = {}) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/warehouse/tool-assets/${assetId}/return/`,
    {
      method: 'POST',
      headers: {
        ...authHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload || {}),
    },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to return tool'));
  return response.json();
}

export async function openToolAssetLabel(token, organizationId, assetId) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/warehouse/tool-assets/${assetId}/label/`,
    { headers: authHeaders(token) },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to open tool label'));
  const html = await response.text();
  if (typeof window !== 'undefined' && window.open) {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const objectUrl = URL.createObjectURL(blob);
    window.open(objectUrl, '_blank', 'noopener,noreferrer');
    return objectUrl;
  }
  return html;
}

export async function openToolAssetBatchLabels(token, organizationId, ids) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/warehouse/tool-assets/labels/`,
    {
      method: 'POST',
      headers: {
        ...authHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids }),
    },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to open labels'));
  const html = await response.text();
  if (typeof window !== 'undefined' && window.open) {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const objectUrl = URL.createObjectURL(blob);
    window.open(objectUrl, '_blank', 'noopener,noreferrer');
    return objectUrl;
  }
  return html;
}

export async function listToolKits(token, organizationId, params = {}) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/warehouse/tool-kits/${buildQuery(params)}`,
    { headers: authHeaders(token) },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to load tool kits'));
  return response.json();
}

export async function createToolKit(token, organizationId, payload) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/warehouse/tool-kits/`,
    {
      method: 'POST',
      headers: {
        ...authHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload || {}),
    },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to create kit'));
  return response.json();
}

export async function updateToolKit(token, organizationId, kitId, payload) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/warehouse/tool-kits/${kitId}/`,
    {
      method: 'PATCH',
      headers: {
        ...authHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload || {}),
    },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to update kit'));
  return response.json();
}

export async function issueToolKit(token, organizationId, kitId, payload) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/warehouse/tool-kits/${kitId}/issue/`,
    {
      method: 'POST',
      headers: {
        ...authHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload || {}),
    },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to issue kit'));
  return response.json();
}

export async function returnToolKit(token, organizationId, kitId, payload = {}) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/warehouse/tool-kits/${kitId}/return/`,
    {
      method: 'POST',
      headers: {
        ...authHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload || {}),
    },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to return kit'));
  return response.json();
}

export async function openToolKitLabel(token, organizationId, kitId) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/warehouse/tool-kits/${kitId}/label/`,
    { headers: authHeaders(token) },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to open kit label'));
  const html = await response.text();
  if (typeof window !== 'undefined' && window.open) {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const objectUrl = URL.createObjectURL(blob);
    window.open(objectUrl, '_blank', 'noopener,noreferrer');
    return objectUrl;
  }
  return html;
}

export async function scanToolCode(token, organizationId, payload) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/warehouse/tool-scan/`,
    {
      method: 'POST',
      headers: {
        ...authHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(
        typeof payload === 'string' ? { payload } : payload || {},
      ),
    },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to resolve scan'));
  return response.json();
}

export async function listToolScrapBlame(token, organizationId) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/warehouse/tool-scrap-blame/`,
    { headers: authHeaders(token) },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to load scrap report'));
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

export async function updateMaterialsIntake(token, organizationId, intakeId, payload) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/warehouse/materials-intake/${intakeId}/`,
    {
      method: 'PATCH',
      headers: {
        ...authHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to update intake'));
  return response.json();
}

export async function deleteMaterialsIntake(token, organizationId, intakeId) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/warehouse/materials-intake/${intakeId}/`,
    {
      method: 'DELETE',
      headers: authHeaders(token),
    },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to delete draft'));
  return true;
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

export async function confirmMaterialsIntake(token, organizationId, intakeId, payload = {}) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/warehouse/materials-intake/${intakeId}/confirm/`,
    {
      method: 'POST',
      headers: {
        ...authHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload || {}),
    },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to confirm intake'));
  return response.json();
}

export function materialsIntakeFileUrl(organizationId, intakeId, { stream = true } = {}) {
  const q = stream ? '?stream=1' : '';
  return `${API_BASE_URL}/api/organizations/${organizationId}/warehouse/materials-intake/${intakeId}/file/${q}`;
}

/** Open original invoice PDF (auth + blob / signed URL). */
export async function openMaterialsIntakeFile(token, organizationId, intakeId) {
  // Prefer authenticated stream so Cyrillic filenames and S3 signing quirks
  // cannot break Content-Disposition / browser open.
  const response = await fetch(materialsIntakeFileUrl(organizationId, intakeId, { stream: true }), {
    headers: authHeaders(token),
  });
  if (!response.ok) throw new Error(await parseError(response, 'Failed to open document'));
  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  if (contentType.includes('application/json')) {
    const data = await response.json();
    const url = data?.url;
    if (!url) throw new Error('No document URL returned');
    if (typeof window !== 'undefined' && window.open) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
    return url;
  }
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  if (typeof window !== 'undefined' && window.open) {
    window.open(objectUrl, '_blank', 'noopener,noreferrer');
  }
  return objectUrl;
}

export function warehouseLocationLabelUrl(organizationId, locationId) {
  return `${API_BASE_URL}/api/organizations/${organizationId}/warehouse/locations/${locationId}/label/`;
}

/** Open printable location stamp (name + id + QR) in a new tab. */
export async function openWarehouseLocationLabel(token, organizationId, locationId) {
  const response = await fetch(warehouseLocationLabelUrl(organizationId, locationId), {
    headers: authHeaders(token),
  });
  if (!response.ok) throw new Error(await parseError(response, 'Failed to open location label'));
  const html = await response.text();
  if (typeof window !== 'undefined' && window.open) {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const objectUrl = URL.createObjectURL(blob);
    window.open(objectUrl, '_blank', 'noopener,noreferrer');
    return objectUrl;
  }
  return html;
}

export async function getOrganizationLegalEntity(token, organizationId) {
  const response = await orgAuthFetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/legal-entity/`,
    { headers: await orgScopedHeaders(token) },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to load legal entity'));
  return response.json();
}

export async function updateOrganizationLegalEntity(token, organizationId, payload) {
  const response = await orgAuthFetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/legal-entity/`,
    {
      method: 'PATCH',
      headers: {
        ...(await orgScopedHeaders(token)),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload || {}),
    },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to save legal entity'));
  return response.json();
}
