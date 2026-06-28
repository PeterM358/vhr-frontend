import { API_BASE_URL } from './config';
import { Share } from 'react-native';
import { messageFromApiResponseText } from '../utils/apiErrorMessage';
import { shopScopedHeaders } from '../utils/currentShop';

async function parseError(response, fallback) {
  const text = await response.text();
  return messageFromApiResponseText(text, fallback);
}

async function authHeaders(token) {
  return shopScopedHeaders(token);
}

export async function listReceivingSessions(token) {
  const response = await fetch(`${API_BASE_URL}/api/billing/receiving/`, {
    headers: await authHeaders(token),
  });
  if (!response.ok) {
    throw new Error(await parseError(response, 'Failed to load receiving sessions'));
  }
  return response.json();
}

export async function createReceivingSession(token, { supplierName, notes, batchKind } = {}) {
  const response = await fetch(`${API_BASE_URL}/api/billing/receiving/`, {
    method: 'POST',
    headers: { ...(await authHeaders(token)), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      supplier_name: supplierName || '',
      notes: notes || '',
      batch_kind: batchKind || 'receipt',
    }),
  });
  if (!response.ok) {
    throw new Error(await parseError(response, 'Failed to start receiving'));
  }
  return response.json();
}

export async function getReceivingSession(token, batchId) {
  const response = await fetch(`${API_BASE_URL}/api/billing/receiving/${batchId}/`, {
    headers: await authHeaders(token),
  });
  if (!response.ok) {
    throw new Error(await parseError(response, 'Failed to load receiving session'));
  }
  return response.json();
}

export async function uploadReceivingInvoice(token, batchId, file) {
  const form = new FormData();
  if (file?.file) {
    form.append('file', file.file, file.fileName || file.file.name);
  } else if (file?.uri) {
    form.append('file', {
      uri: file.uri,
      name: file.fileName || 'invoice.pdf',
      type: file.mimeType || 'application/pdf',
    });
  } else if (file instanceof File || file instanceof Blob) {
    form.append('file', file, file.name || 'invoice.pdf');
  } else {
    throw new Error('No file selected');
  }
  const response = await fetch(`${API_BASE_URL}/api/billing/receiving/${batchId}/upload-invoice/`, {
    method: 'POST',
    headers: await authHeaders(token),
    body: form,
  });
  if (!response.ok) {
    throw new Error(await parseError(response, 'Could not read invoice'));
  }
  return response.json();
}

export async function addReceivingManualLine(token, batchId, payload) {
  const response = await fetch(`${API_BASE_URL}/api/billing/receiving/${batchId}/manual/`, {
    method: 'POST',
    headers: { ...(await authHeaders(token)), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      part_type_id: payload.part_type_id,
      part_brand_id: payload.part_brand_id || null,
      brand_raw: payload.brand_raw || '',
      part_number: payload.part_number || '',
      quantity: payload.quantity ?? 1,
      unit_id: payload.unit_id,
      unit_price: payload.unit_price,
      unit_price_ex_vat: payload.unit_price_ex_vat,
      unit_vat: payload.unit_vat,
      unit_price_inc_vat: payload.unit_price_inc_vat,
      vat_rate_percent: payload.vat_rate_percent,
      shop_sku: payload.shop_sku || '',
      name: payload.name || '',
    }),
  });
  if (!response.ok) {
    throw new Error(await parseError(response, 'Could not add part'));
  }
  return response.json();
}

export async function updateReceivingLine(token, batchId, lineId, payload) {
  const response = await fetch(
    `${API_BASE_URL}/api/billing/receiving/${batchId}/lines/${lineId}/`,
    {
      method: 'PATCH',
      headers: { ...(await authHeaders(token)), 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  );
  if (!response.ok) {
    throw new Error(await parseError(response, 'Could not update line'));
  }
  return response.json();
}

export async function deleteReceivingLine(token, batchId, lineId) {
  const response = await fetch(
    `${API_BASE_URL}/api/billing/receiving/${batchId}/lines/${lineId}/`,
    {
      method: 'DELETE',
      headers: await authHeaders(token),
    }
  );
  if (!response.ok) {
    throw new Error(await parseError(response, 'Could not remove line'));
  }
  return response.json();
}

export async function scanReceivingCode(token, batchId, { code, quantity = 1 }) {
  const response = await fetch(`${API_BASE_URL}/api/billing/receiving/${batchId}/scan/`, {
    method: 'POST',
    headers: { ...(await authHeaders(token)), 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, quantity }),
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!response.ok) {
    throw new Error(messageFromApiResponseText(text, 'Scan failed'));
  }
  return data;
}

export async function updateReceivingSession(token, batchId, payload) {
  const response = await fetch(`${API_BASE_URL}/api/billing/receiving/${batchId}/`, {
    method: 'PATCH',
    headers: { ...(await authHeaders(token)), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(await parseError(response, 'Could not update receiving session'));
  }
  return response.json();
}

export async function listShopSuppliers(token, search = '') {
  const q = search ? `?search=${encodeURIComponent(search)}` : '';
  const response = await fetch(`${API_BASE_URL}/api/billing/suppliers${q}`, {
    headers: await authHeaders(token),
  });
  if (!response.ok) {
    throw new Error(await parseError(response, 'Could not load suppliers'));
  }
  return response.json();
}

export async function createShopSupplier(token, displayName) {
  const response = await fetch(`${API_BASE_URL}/api/billing/suppliers/`, {
    method: 'POST',
    headers: { ...(await authHeaders(token)), 'Content-Type': 'application/json' },
    body: JSON.stringify({ display_name: displayName }),
  });
  if (!response.ok) {
    throw new Error(await parseError(response, 'Could not create supplier'));
  }
  return response.json();
}

export async function listPurchaseDocuments(token, { supplierId, documentType } = {}) {
  const params = new URLSearchParams();
  if (supplierId) params.set('supplier_id', String(supplierId));
  if (documentType) params.set('document_type', documentType);
  const q = params.toString() ? `?${params.toString()}` : '';
  const response = await fetch(`${API_BASE_URL}/api/billing/purchase-documents${q}`, {
    headers: await authHeaders(token),
  });
  if (!response.ok) {
    throw new Error(await parseError(response, 'Could not load documents'));
  }
  return response.json();
}

export async function getPurchaseDocument(token, documentId) {
  const response = await fetch(`${API_BASE_URL}/api/billing/purchase-documents/${documentId}/`, {
    headers: await authHeaders(token),
  });
  if (!response.ok) {
    throw new Error(await parseError(response, 'Could not load document'));
  }
  return response.json();
}

export async function listPendingReceivingSessions(token) {
  const response = await fetch(`${API_BASE_URL}/api/billing/receiving/`, {
    headers: await authHeaders(token),
  });
  if (!response.ok) {
    throw new Error(await parseError(response, 'Could not load drafts'));
  }
  return response.json();
}

export async function deleteReceivingSession(token, batchId) {
  const response = await fetch(`${API_BASE_URL}/api/billing/receiving/${batchId}/`, {
    method: 'DELETE',
    headers: await authHeaders(token),
  });
  if (!response.ok) {
    throw new Error(await parseError(response, 'Could not delete draft'));
  }
  return true;
}

export async function listStockInventory(
  token,
  { search = '', sort = 'name', inStock = false, hideOrphanZero = true } = {}
) {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (sort) params.set('sort', sort);
  if (inStock) params.set('in_stock', '1');
  if (!hideOrphanZero) params.set('hide_orphan_zero', '0');
  const q = params.toString() ? `?${params.toString()}` : '';
  const response = await fetch(`${API_BASE_URL}/api/billing/stock/inventory/${q}`, {
    headers: await authHeaders(token),
  });
  if (!response.ok) {
    throw new Error(await parseError(response, 'Could not load stock'));
  }
  return response.json();
}

export async function listStockMovements(token, { shopPartId, limit = 100 } = {}) {
  const params = new URLSearchParams();
  if (shopPartId) params.set('shop_part_id', String(shopPartId));
  if (limit) params.set('limit', String(limit));
  const q = params.toString() ? `?${params.toString()}` : '';
  const response = await fetch(`${API_BASE_URL}/api/billing/stock/movements/${q}`, {
    headers: await authHeaders(token),
  });
  if (!response.ok) {
    throw new Error(await parseError(response, 'Could not load movements'));
  }
  return response.json();
}

export async function commitReceivingSession(token, batchId) {
  const response = await fetch(`${API_BASE_URL}/api/billing/receiving/${batchId}/commit/`, {
    method: 'POST',
    headers: await authHeaders(token),
  });
  if (!response.ok) {
    throw new Error(await parseError(response, 'Could not complete receiving'));
  }
  return response.json();
}

export async function importReceivingCsv(token, file, { batchId, batchKind, supplierName } = {}) {
  const form = new FormData();
  if (file?.file) {
    form.append('file', file.file, file.fileName);
  } else if (file?.uri) {
    form.append('file', {
      uri: file.uri,
      name: file.fileName || 'import.csv',
      type: file.mimeType || 'text/csv',
    });
  }
  if (batchId) form.append('batch_id', String(batchId));
  if (batchKind) form.append('batch_kind', batchKind);
  if (supplierName) form.append('supplier_name', supplierName);
  const response = await fetch(`${API_BASE_URL}/api/billing/receiving/import-csv/`, {
    method: 'POST',
    headers: await authHeaders(token),
    body: form,
  });
  if (!response.ok) {
    throw new Error(await parseError(response, 'CSV import failed'));
  }
  return response.json();
}

export async function downloadBillingCsv(token, exportPath, filename) {
  const response = await fetch(`${API_BASE_URL}/api/billing/${exportPath}`, {
    headers: await authHeaders(token),
  });
  if (!response.ok) {
    throw new Error(await parseError(response, 'Export failed'));
  }
  const text = await response.text();
  if (typeof document !== 'undefined') {
    const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    return true;
  }
  await Share.share({ message: text, title: filename });
  return true;
}

/** Human labels for API issue codes */
export const LINE_ISSUE_LABELS = {
  part_type: 'Type',
  quantity: 'Qty',
  unit: 'Unit',
  unit_price: 'Unit price',
  part_number: 'Part #',
  unit_dimension_mismatch: 'Unit mismatch',
};

export const HEADER_ISSUE_LABELS = {
  supplier_name: 'Supplier',
  invoice_number: 'Doc #',
  invoice_date: 'Date',
};
