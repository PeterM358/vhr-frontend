import { API_BASE_URL } from './config';
import { messageFromApiResponseText } from '../utils/apiErrorMessage';
import { shopScopedHeaders } from '../utils/currentShop';

async function parseError(response, fallback) {
  const text = await response.text();
  return messageFromApiResponseText(text, fallback);
}

function authHeaders(token) {
  return shopScopedHeaders(token);
}

export async function getInvoiceSeries(token) {
  const response = await fetch(`${API_BASE_URL}/api/billing/series/`, {
    headers: await authHeaders(token),
  });
  if (!response.ok) {
    throw new Error(await parseError(response, 'Failed to load invoice series'));
  }
  return response.json();
}

export async function createInvoiceSeries(token, payload) {
  const response = await fetch(`${API_BASE_URL}/api/billing/series/`, {
    method: 'POST',
    headers: { ...(await authHeaders(token)), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(await parseError(response, 'Failed to create invoice series'));
  }
  return response.json();
}

export async function updateInvoiceSeries(token, seriesId, payload) {
  const response = await fetch(`${API_BASE_URL}/api/billing/series/${seriesId}/`, {
    method: 'PATCH',
    headers: { ...(await authHeaders(token)), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(await parseError(response, 'Failed to update invoice series'));
  }
  return response.json();
}

export async function getInvoices(token, { status } = {}) {
  const qs = new URLSearchParams();
  if (status) qs.set('status', status);
  const suffix = qs.toString() ? `?${qs}` : '';
  const response = await fetch(`${API_BASE_URL}/api/billing/invoices/${suffix}`, {
    headers: await authHeaders(token),
  });
  if (!response.ok) {
    throw new Error(await parseError(response, 'Failed to load invoices'));
  }
  return response.json();
}

export async function getInvoiceById(token, invoiceId) {
  const response = await fetch(`${API_BASE_URL}/api/billing/invoices/${invoiceId}/`, {
    headers: await authHeaders(token),
  });
  if (!response.ok) {
    throw new Error(await parseError(response, 'Failed to load invoice'));
  }
  return response.json();
}

export async function draftInvoiceFromRepairs(token, repairIds, notes = '') {
  const response = await fetch(`${API_BASE_URL}/api/billing/invoices/draft-from-repairs/`, {
    method: 'POST',
    headers: { ...(await authHeaders(token)), 'Content-Type': 'application/json' },
    body: JSON.stringify({ repair_ids: repairIds, notes }),
  });
  if (!response.ok) {
    throw new Error(await parseError(response, 'Failed to create invoice draft'));
  }
  return response.json();
}

export async function issueInvoice(token, invoiceId) {
  const response = await fetch(`${API_BASE_URL}/api/billing/invoices/${invoiceId}/issue/`, {
    method: 'POST',
    headers: await authHeaders(token),
  });
  if (!response.ok) {
    throw new Error(await parseError(response, 'Failed to issue invoice'));
  }
  return response.json();
}

export async function markInvoicePaid(token, invoiceId) {
  const response = await fetch(`${API_BASE_URL}/api/billing/invoices/${invoiceId}/mark-paid/`, {
    method: 'POST',
    headers: await authHeaders(token),
  });
  if (!response.ok) {
    throw new Error(await parseError(response, 'Failed to mark invoice paid'));
  }
  return response.json();
}

export async function getLegalEntities(token) {
  const response = await fetch(`${API_BASE_URL}/api/billing/legal-entities/`, {
    headers: await authHeaders(token),
  });
  if (!response.ok) {
    throw new Error(await parseError(response, 'Failed to load companies'));
  }
  return response.json();
}

export async function createLegalEntity(token, payload) {
  const response = await fetch(`${API_BASE_URL}/api/billing/legal-entities/`, {
    method: 'POST',
    headers: { ...(await authHeaders(token)), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(await parseError(response, 'Failed to create company'));
  }
  return response.json();
}

export async function updateLegalEntity(token, entityId, payload) {
  const response = await fetch(`${API_BASE_URL}/api/billing/legal-entities/${entityId}/`, {
    method: 'PATCH',
    headers: { ...(await authHeaders(token)), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(await parseError(response, 'Failed to update company'));
  }
  return response.json();
}

export async function uploadLegalEntityLogo(token, entityId, attachment) {
  const formData = new FormData();
  if (attachment?.file) {
    formData.append('logo', attachment.file, attachment.fileName || 'invoice-logo');
  } else if (attachment?.uri) {
    formData.append('logo', {
      uri: attachment.uri,
      name: attachment.fileName || 'invoice-logo.png',
      type: attachment.mimeType || 'image/png',
    });
  } else {
    throw new Error('No logo file selected');
  }

  const response = await fetch(`${API_BASE_URL}/api/billing/legal-entities/${entityId}/logo/`, {
    method: 'POST',
    headers: await authHeaders(token),
    body: formData,
  });
  if (!response.ok) {
    throw new Error(await parseError(response, 'Failed to upload company logo'));
  }
  return response.json();
}

export async function deleteLegalEntityLogo(token, entityId) {
  const response = await fetch(`${API_BASE_URL}/api/billing/legal-entities/${entityId}/logo/`, {
    method: 'DELETE',
    headers: await authHeaders(token),
  });
  if (!response.ok && response.status !== 204) {
    throw new Error(await parseError(response, 'Failed to remove company logo'));
  }
}

export async function getLegalEntitySummary(token, entityId) {
  const response = await fetch(`${API_BASE_URL}/api/billing/legal-entities/${entityId}/summary/`, {
    headers: await authHeaders(token),
  });
  if (!response.ok) {
    throw new Error(await parseError(response, 'Failed to load company summary'));
  }
  return response.json();
}
