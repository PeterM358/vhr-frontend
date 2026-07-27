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
  if (!response.ok) throw new Error(await parseError(response, 'Failed to create operation'));
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
  if (!response.ok) throw new Error(await parseError(response, 'Failed to update operation'));
  return response.json();
}

export async function deactivateActivityDefinition(token, organizationId, activityId) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/activity-definitions/${activityId}/`,
    {
      method: 'DELETE',
      headers: authHeaders(token),
    },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to deactivate operation'));
  return true;
}

export async function listWorkOrders(token, organizationId, params = {}) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/work-orders/${buildQuery(params)}`,
    { headers: authHeaders(token) },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to load tasks'));
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
  if (!response.ok) throw new Error(await parseError(response, 'Failed to create task'));
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
  if (!response.ok) throw new Error(await parseError(response, 'Failed to update task'));
  return response.json();
}

export async function startWorkOrder(token, organizationId, workOrderId) {
  const response = await fetch(
    `${API_BASE_URL}/api/organizations/${organizationId}/work-orders/${workOrderId}/start/`,
    {
      method: 'POST',
      headers: {
        ...authHeaders(token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to start task'));
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
  if (!response.ok) throw new Error(await parseError(response, 'Failed to end task'));
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
