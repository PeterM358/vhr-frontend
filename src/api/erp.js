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

export async function createClientComplaint(token, payload) {
  const response = await fetch(`${API_BASE_URL}/api/repairs/complaints/`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await parseError(response, 'Failed to submit complaint'));
  return response.json();
}

export async function listDocumentImports(token, shopId, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const url = `${API_BASE_URL}/api/profiles/shop-profiles/${shopId}/document-imports/${qs ? `?${qs}` : ''}`;
  const response = await fetch(url, { headers: await shopScopedHeaders(token) });
  if (!response.ok) throw new Error(await parseError(response, 'Failed to load document imports'));
  return response.json();
}

export async function uploadDocumentImport(token, shopId, filePayload, fields = {}) {
  const form = new FormData();
  const blob = filePayload.file || filePayload;
  form.append('file', blob, filePayload.fileName || blob.name || 'document.pdf');
  if (fields.repair_id != null) form.append('repair_id', String(fields.repair_id));
  if (fields.total_amount_minor != null) form.append('total_amount_minor', String(fields.total_amount_minor));
  if (fields.supplier_name) form.append('supplier_name', fields.supplier_name);
  if (fields.document_date) form.append('document_date', fields.document_date);

  const response = await fetch(
    `${API_BASE_URL}/api/profiles/shop-profiles/${shopId}/document-imports/upload/`,
    {
      method: 'POST',
      headers: await shopScopedHeaders(token),
      body: form,
    },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to upload document'));
  return response.json();
}

export async function getDocumentImportLines(token, shopId, importId) {
  const response = await fetch(
    `${API_BASE_URL}/api/profiles/shop-profiles/${shopId}/document-imports/${importId}/lines/`,
    { headers: await shopScopedHeaders(token) },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to load import lines'));
  return response.json();
}

export async function confirmDocumentImport(token, shopId, importId, fields) {
  const response = await fetch(
    `${API_BASE_URL}/api/profiles/shop-profiles/${shopId}/document-imports/${importId}/confirm/`,
    {
      method: 'POST',
      headers: { ...(await shopScopedHeaders(token)), 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
    },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to confirm import'));
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

export async function createShopReview(token, shopId, payload) {
  const response = await fetch(
    `${API_BASE_URL}/api/profiles/shops/${shopId}/reviews/create/`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to submit review'));
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

// --- Procurement / warehouse ERP ---

export async function listPurchaseOrders(token, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const url = `${API_BASE_URL}/api/billing/purchase-orders/${qs ? `?${qs}` : ''}`;
  const response = await fetch(url, { headers: await shopScopedHeaders(token) });
  if (!response.ok) throw new Error(await parseError(response, 'Failed to load purchase orders'));
  return response.json();
}

export async function getPurchaseOrder(token, poId) {
  const response = await fetch(`${API_BASE_URL}/api/billing/purchase-orders/${poId}/`, {
    headers: await shopScopedHeaders(token),
  });
  if (!response.ok) throw new Error(await parseError(response, 'Failed to load purchase order'));
  return response.json();
}

export async function createPurchaseOrder(token, payload) {
  const response = await fetch(`${API_BASE_URL}/api/billing/purchase-orders/`, {
    method: 'POST',
    headers: { ...(await shopScopedHeaders(token)), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await parseError(response, 'Failed to create purchase order'));
  return response.json();
}

export async function updatePurchaseOrder(token, poId, payload) {
  const response = await fetch(`${API_BASE_URL}/api/billing/purchase-orders/${poId}/`, {
    method: 'PATCH',
    headers: { ...(await shopScopedHeaders(token)), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await parseError(response, 'Failed to update purchase order'));
  return response.json();
}

export async function purchaseOrderAction(token, poId, action, payload = {}) {
  const response = await fetch(`${API_BASE_URL}/api/billing/purchase-orders/${poId}/${action}/`, {
    method: 'POST',
    headers: { ...(await shopScopedHeaders(token)), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await parseError(response, `Failed to ${action} purchase order`));
  return response.json();
}

export async function listGoodsReceipts(token, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const url = `${API_BASE_URL}/api/billing/goods-receipts/${qs ? `?${qs}` : ''}`;
  const response = await fetch(url, { headers: await shopScopedHeaders(token) });
  if (!response.ok) throw new Error(await parseError(response, 'Failed to load goods receipts'));
  return response.json();
}

export async function postGoodsReceipt(token, payload) {
  const response = await fetch(`${API_BASE_URL}/api/billing/goods-receipts/`, {
    method: 'POST',
    headers: { ...(await shopScopedHeaders(token)), 'Content-Type': 'application/json' },
    body: JSON.stringify({ post: true, ...payload }),
  });
  if (!response.ok) throw new Error(await parseError(response, 'Failed to post goods receipt'));
  return response.json();
}

export async function listWarehouses(token) {
  const response = await fetch(`${API_BASE_URL}/api/billing/warehouses/`, {
    headers: await shopScopedHeaders(token),
  });
  if (!response.ok) throw new Error(await parseError(response, 'Failed to load warehouses'));
  return response.json();
}

export async function listStorageLocations(token, warehouseId) {
  const qs = new URLSearchParams({ warehouse_id: String(warehouseId) }).toString();
  const response = await fetch(`${API_BASE_URL}/api/billing/storage-locations/?${qs}`, {
    headers: await shopScopedHeaders(token),
  });
  if (!response.ok) throw new Error(await parseError(response, 'Failed to load storage locations'));
  return response.json();
}

export async function createStorageLocation(token, payload) {
  const response = await fetch(`${API_BASE_URL}/api/billing/storage-locations/`, {
    method: 'POST',
    headers: { ...(await shopScopedHeaders(token)), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await parseError(response, 'Failed to create storage location'));
  return response.json();
}

export async function scanStorageLocation(token, warehouseId, code) {
  const qs = new URLSearchParams({ warehouse_id: String(warehouseId), code }).toString();
  const response = await fetch(`${API_BASE_URL}/api/billing/storage-locations/scan/?${qs}`, {
    headers: await shopScopedHeaders(token),
  });
  if (!response.ok) throw new Error(await parseError(response, 'Storage address not found'));
  return response.json();
}

export function storageLocationLabelUrl(locationId) {
  return `${API_BASE_URL}/api/billing/storage-locations/${locationId}/label/`;
}

