import { API_BASE_URL } from './config';
import {
  enrichApiError,
  extractDrfFieldErrors,
  formatDrfErrorMessage,
  messageFromApiResponseText,
} from '../utils/apiErrorMessage';

async function throwApiError(response, fallback) {
  const text = await response.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }
  const message = parsed
    ? formatDrfErrorMessage(parsed, fallback)
    : messageFromApiResponseText(text, fallback);
  const err = new Error(message);
  enrichApiError(err, parsed, fallback);
  if (!err.fieldErrors && parsed) {
    err.fieldErrors = extractDrfFieldErrors(parsed);
  }
  throw err;
}

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

export async function listUnitsOfMeasure(token, organizationId, params = {}) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/units-of-measure/${buildQuery(params)}`,
    { headers: authHeaders(token) },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to load units'));
  return response.json();
}

export async function listActivityDefinitions(token, organizationId, params = {}) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/activity-definitions/${buildQuery(params)}`,
    { headers: authHeaders(token) },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to load operations'));
  return response.json();
}

export async function createActivityDefinition(token, organizationId, payload) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/activity-definitions/`,
    {
      method: 'POST',
      headers: {
        ...authHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  );
  if (!response.ok) await throwApiError(response, 'Failed to create operation');
  return response.json();
}

export async function updateActivityDefinition(token, organizationId, activityId, payload) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/activity-definitions/${activityId}/`,
    {
      method: 'PATCH',
      headers: {
        ...authHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  );
  if (!response.ok) await throwApiError(response, 'Failed to update operation');
  return response.json();
}

export async function deactivateActivityDefinition(token, organizationId, activityId) {
  return updateActivityDefinition(token, organizationId, activityId, { is_active: false });
}

export async function deleteActivityDefinition(token, organizationId, activityId) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/activity-definitions/${activityId}/`,
    {
      method: 'DELETE',
      headers: authHeaders(token),
    },
  );
  if (response.status === 204) return true;
  const text = await response.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }
  const err = new Error(
    (parsed && (parsed.detail || parsed.message)) ||
      messageFromApiResponseText(text, 'Failed to delete operation'),
  );
  if (parsed?.code) err.code = parsed.code;
  throw err;
}

export async function listWorkOrders(token, organizationId, params = {}) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/work-orders/${buildQuery(params)}`,
    { headers: authHeaders(token) },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to load tasks'));
  return response.json();
}

export async function getOperationsSummary(token, organizationId, params = {}) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/operations/summary/${buildQuery(params)}`,
    { headers: authHeaders(token) },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to load operations summary'));
  return response.json();
}

export async function getAccountingSummary(token, organizationId, params = {}) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/accounting/summary/${buildQuery(params)}`,
    { headers: authHeaders(token) },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to load accounting summary'));
  return response.json();
}

export async function listOrgInvoices(token, organizationId, params = {}) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/invoices/${buildQuery(params)}`,
    { headers: authHeaders(token) },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to load invoices'));
  return response.json();
}

export async function getOrgInvoice(token, organizationId, invoiceId) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/invoices/${invoiceId}/`,
    { headers: authHeaders(token) },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to load invoice'));
  return response.json();
}

export async function draftInvoiceFromWorkOrders(
  token,
  organizationId,
  workOrderIds,
  notes = '',
  lineAmounts = null,
  lines = null,
) {
  const body = { work_order_ids: workOrderIds, notes };
  if (Array.isArray(lines) && lines.length) {
    body.lines = lines;
  } else if (Array.isArray(lineAmounts)) {
    body.line_amounts = lineAmounts;
  }
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/invoices/draft-from-work-orders/`,
    {
      method: 'POST',
      headers: {
        ...authHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  );
  if (!response.ok) await throwApiError(response, 'Failed to create invoice draft');
  return response.json();
}

export async function issueOrgInvoice(token, organizationId, invoiceId) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/invoices/${invoiceId}/issue/`,
    {
      method: 'POST',
      headers: authHeaders(token),
    },
  );
  if (!response.ok) await throwApiError(response, 'Failed to issue invoice');
  return response.json();
}

export async function markOrgInvoicePaid(token, organizationId, invoiceId) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/invoices/${invoiceId}/mark-paid/`,
    {
      method: 'POST',
      headers: authHeaders(token),
    },
  );
  if (!response.ok) await throwApiError(response, 'Failed to mark invoice paid');
  return response.json();
}

function invoiceExportFilename(invoice, fallbackExt) {
  const raw = String(invoice?.number || invoice?.id || 'draft').replace(/[^\w.-]+/g, '_');
  return `invoice-${raw}.${fallbackExt}`;
}

/** Download / open org invoice sheet (PDF when available, else printable HTML). */
export async function downloadOrgInvoicePdf(token, organizationId, invoiceId, invoice = null) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/invoices/${invoiceId}/pdf/`,
    { headers: authHeaders(token) },
  );
  if (!response.ok) await throwApiError(response, 'Failed to download invoice');
  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  const blob = await response.blob();
  const isHtml = contentType.includes('text/html');
  const filename = invoiceExportFilename(invoice, isHtml ? 'html' : 'pdf');
  if (typeof window !== 'undefined') {
    const objectUrl = URL.createObjectURL(blob);
    if (isHtml && window.open) {
      window.open(objectUrl, '_blank', 'noopener,noreferrer');
      return { url: objectUrl, contentType, filename };
    }
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    return { url: objectUrl, contentType, filename };
  }
  return { blob, contentType, filename };
}

export async function sendOrgInvoiceEmail(token, organizationId, invoiceId, email = '') {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/invoices/${invoiceId}/send-email/`,
    {
      method: 'POST',
      headers: {
        ...authHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(email ? { email } : {}),
    },
  );
  if (!response.ok) await throwApiError(response, 'Failed to send invoice email');
  return response.json();
}

export async function getFleetPlanning(token, organizationId, params = {}) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/fleet-planning/${buildQuery(params)}`,
    { headers: authHeaders(token) },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to load fleet planning'));
  return response.json();
}

export async function createWorkOrder(token, organizationId, payload) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/work-orders/`,
    {
      method: 'POST',
      headers: {
        ...authHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  );
  if (!response.ok) await throwApiError(response, 'Failed to create task');
  return response.json();
}

export async function getWorkOrder(token, organizationId, workOrderId) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/work-orders/${workOrderId}/`,
    { headers: authHeaders(token) },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to load task'));
  return response.json();
}

export async function updateWorkOrder(token, organizationId, workOrderId, payload) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/work-orders/${workOrderId}/`,
    {
      method: 'PATCH',
      headers: {
        ...authHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  );
  if (!response.ok) await throwApiError(response, 'Failed to update task');
  return response.json();
}

export async function deleteWorkOrder(token, organizationId, workOrderId) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/work-orders/${workOrderId}/`,
    {
      method: 'DELETE',
      headers: authHeaders(token),
    },
  );
  if (response.status === 204) return true;
  const text = await response.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }
  const err = new Error(
    (parsed && (parsed.detail || parsed.message)) ||
      messageFromApiResponseText(text, 'Failed to delete task'),
  );
  if (parsed?.code) err.code = parsed.code;
  throw err;
}

export async function startWorkOrder(token, organizationId, workOrderId, payload = {}) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/work-orders/${workOrderId}/start/`,
    {
      method: 'POST',
      headers: {
        ...authHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload || {}),
    },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to start task'));
  return response.json();
}

export async function ackWorkOrder(token, organizationId, workOrderId) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/work-orders/${workOrderId}/ack/`,
    {
      method: 'POST',
      headers: {
        ...authHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    },
  );
  if (!response.ok) {
    throw new Error(await parseError(response, 'Failed to confirm task'));
  }
  return response.json();
}

export async function endWorkOrder(token, organizationId, workOrderId, payload = {}) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/work-orders/${workOrderId}/end/`,
    {
      method: 'POST',
      headers: {
        ...authHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload || {}),
    },
  );
  if (!response.ok) await throwApiError(response, 'Failed to end task');
  return response.json();
}

export async function completeProductionWorkOrder(
  token,
  organizationId,
  workOrderId,
  payload = {},
) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/work-orders/${workOrderId}/complete-production/`,
    {
      method: 'POST',
      headers: {
        ...authHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload || {}),
    },
  );
  if (!response.ok) await throwApiError(response, 'Failed to complete production');
  return response.json();
}

export async function checkInWorkOrder(token, organizationId, workOrderId, payload = {}) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/work-orders/${workOrderId}/check-in/`,
    {
      method: 'POST',
      headers: {
        ...authHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload || {}),
    },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to check in'));
  return response.json();
}

export async function attachWorkOrderMedia(token, organizationId, workOrderId, payload) {
  const isFormData = typeof FormData !== 'undefined' && payload instanceof FormData;
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/work-orders/${workOrderId}/attachments/`,
    {
      method: 'POST',
      headers: {
        ...authHeaders(token),
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      },
      body: isFormData ? payload : JSON.stringify(payload || {}),
    },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to attach file'));
  return response.json();
}

export async function issueWorkOrderMaterials(token, organizationId, workOrderId, payload) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/work-orders/${workOrderId}/material-issues/`,
    {
      method: 'POST',
      headers: {
        ...authHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload || {}),
    },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to issue materials'));
  return response.json();
}

export async function confirmWorkOrderMaterialIssue(
  token,
  organizationId,
  workOrderId,
  issueId,
  payload,
) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/work-orders/${workOrderId}/material-issues/${issueId}/confirm/`,
    {
      method: 'POST',
      headers: {
        ...authHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload || {}),
    },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to confirm materials'));
  return response.json();
}

export async function listWorkOrderExpenses(token, organizationId, workOrderId) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/work-orders/${workOrderId}/expenses/`,
    { headers: authHeaders(token) },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to load expenses'));
  return response.json();
}

export async function createWorkOrderExpense(token, organizationId, workOrderId, payload) {
  const isFormData = typeof FormData !== 'undefined' && payload instanceof FormData;
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/work-orders/${workOrderId}/expenses/`,
    {
      method: 'POST',
      headers: {
        ...authHeaders(token),
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      },
      body: isFormData ? payload : JSON.stringify(payload || {}),
    },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to add expense'));
  return response.json();
}

export async function deleteWorkOrderExpense(token, organizationId, workOrderId, expenseId) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/work-orders/${workOrderId}/expenses/${expenseId}/`,
    {
      method: 'DELETE',
      headers: authHeaders(token),
    },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to delete expense'));
  return true;
}

export async function listWorkOrderStops(token, organizationId, workOrderId) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/work-orders/${workOrderId}/stops/`,
    { headers: authHeaders(token) },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to load stops'));
  return response.json();
}

export async function createWorkOrderStop(token, organizationId, workOrderId, payload) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/work-orders/${workOrderId}/stops/`,
    {
      method: 'POST',
      headers: {
        ...authHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload || {}),
    },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to add stop'));
  return response.json();
}

export async function updateWorkOrderStop(token, organizationId, workOrderId, stopId, payload) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/work-orders/${workOrderId}/stops/${stopId}/`,
    {
      method: 'PATCH',
      headers: {
        ...authHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload || {}),
    },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to update stop'));
  return response.json();
}

export async function deleteWorkOrderStop(token, organizationId, workOrderId, stopId) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/work-orders/${workOrderId}/stops/${stopId}/`,
    {
      method: 'DELETE',
      headers: authHeaders(token),
    },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to delete stop'));
  return true;
}

export async function listWorkOrderShipments(token, organizationId, workOrderId) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/work-orders/${workOrderId}/shipments/`,
    { headers: authHeaders(token) },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to load shipments'));
  return response.json();
}

export async function createWorkOrderShipment(token, organizationId, workOrderId, payload) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/work-orders/${workOrderId}/shipments/`,
    {
      method: 'POST',
      headers: {
        ...authHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload || {}),
    },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to add shipment'));
  return response.json();
}

export async function updateWorkOrderShipment(
  token,
  organizationId,
  workOrderId,
  shipmentId,
  payload,
) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/work-orders/${workOrderId}/shipments/${shipmentId}/`,
    {
      method: 'PATCH',
      headers: {
        ...authHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload || {}),
    },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to update shipment'));
  return response.json();
}

export async function deleteWorkOrderShipment(
  token,
  organizationId,
  workOrderId,
  shipmentId,
) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/work-orders/${workOrderId}/shipments/${shipmentId}/`,
    {
      method: 'DELETE',
      headers: authHeaders(token),
    },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to delete shipment'));
  return true;
}

export async function listProjects(token, organizationId, params = {}) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/projects/${buildQuery(params)}`,
    { headers: authHeaders(token) },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to load projects'));
  return response.json();
}

export async function createProject(token, organizationId, payload) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/projects/`,
    {
      method: 'POST',
      headers: {
        ...authHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to create project'));
  return response.json();
}

export async function updateProject(token, organizationId, projectId, payload) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/projects/${projectId}/`,
    {
      method: 'PATCH',
      headers: {
        ...authHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to update project'));
  return response.json();
}
