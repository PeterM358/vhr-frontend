import { Platform } from 'react-native';
import { API_BASE_URL } from './config';

function appendFileToFormData(formData, attachment) {
  if (Platform.OS === 'web' && attachment.file) {
    formData.append('file', attachment.file);
    return;
  }
  formData.append('file', {
    uri: attachment.uri,
    name: attachment.fileName || 'upload.jpg',
    type: attachment.mimeType || 'application/octet-stream',
  });
}

function appendOptionalFields(formData, fields) {
  Object.entries(fields).forEach(([key, value]) => {
    if (value == null || value === '') return;
    formData.append(key, String(value));
  });
}

/**
 * GET /api/vehicles/:vehicleId/documents/
 */
export async function listVehicleDocuments(token, vehicleId) {
  const response = await fetch(`${API_BASE_URL}/api/vehicles/${vehicleId}/documents/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    const err = new Error('Failed to fetch vehicle documents');
    err.responseText = errText;
    throw err;
  }
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

/**
 * POST /api/vehicles/:vehicleId/documents/
 */
export async function uploadVehicleDocument(token, vehicleId, attachment, meta = {}) {
  const formData = new FormData();
  appendFileToFormData(formData, attachment);
  formData.append('document_type', meta.document_type || attachment.documentType || 'other');
  appendOptionalFields(formData, {
    title: meta.title,
    notes: meta.notes,
    valid_until: meta.valid_until,
    total_amount_minor: meta.total_amount_minor,
    currency: meta.currency,
    paid_date: meta.paid_date,
    issue_date: meta.issue_date,
  });

  const response = await fetch(`${API_BASE_URL}/api/vehicles/${vehicleId}/documents/`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    const err = new Error('Failed to upload vehicle document');
    err.responseText = errText;
    throw err;
  }
  return response.json();
}

/**
 * POST /api/vehicles/:vehicleId/repairs/:repairId/documents/
 */
export async function uploadRepairDocument(token, vehicleId, repairId, attachment, meta = {}) {
  const formData = new FormData();
  appendFileToFormData(formData, attachment);
  formData.append('document_type', meta.document_type || attachment.documentType || 'other');
  appendOptionalFields(formData, {
    title: meta.title,
    notes: meta.notes,
    total_amount_minor: meta.total_amount_minor,
    currency: meta.currency,
    paid_date: meta.paid_date,
    issue_date: meta.issue_date,
  });

  const response = await fetch(
    `${API_BASE_URL}/api/vehicles/${vehicleId}/repairs/${repairId}/documents/`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    }
  );
  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    const err = new Error('Failed to upload repair document');
    err.responseText = errText;
    throw err;
  }
  return response.json();
}

/** Upload many attachments; returns { failed: number }. */
export async function uploadRepairDocuments(token, vehicleId, repairId, attachments, meta = {}) {
  const results = await Promise.allSettled(
    attachments.map((item) =>
      uploadRepairDocument(token, vehicleId, repairId, item, {
        ...meta,
        document_type: item.documentType,
        title: item.title || meta.title || '',
        notes: meta.notes,
        total_amount_minor:
          item.documentType === 'receipt' || item.documentType === 'repair_invoice'
            ? meta.total_amount_minor
            : undefined,
      })
    )
  );
  const failed = results.filter((r) => r.status === 'rejected').length;
  results
    .filter((r) => r.status === 'rejected')
    .forEach((r) => console.warn('Repair document upload failed', r.reason));
  return { failed, total: attachments.length };
}
