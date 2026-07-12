import { API_BASE_URL } from './config';
import { messageFromApiResponseText } from '../utils/apiErrorMessage';
import { shopScopedHeaders } from '../utils/currentShop';

async function parseError(response, fallback) {
  const text = await response.text();
  return messageFromApiResponseText(text, fallback);
}

function orgQuery(organizationId) {
  return organizationId ? `?organization_id=${organizationId}` : '';
}

export async function getMyOrganization(token, organizationId) {
  const response = await fetch(`${API_BASE_URL}/api/network/organization/${orgQuery(organizationId)}`, {
    headers: await shopScopedHeaders(token),
  });
  if (!response.ok) throw new Error(await parseError(response, 'Failed to load organization'));
  return response.json();
}

export async function createMyOrganization(token, payload) {
  const response = await fetch(`${API_BASE_URL}/api/network/organization/`, {
    method: 'POST',
    headers: { ...(await shopScopedHeaders(token)), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await parseError(response, 'Failed to create organization'));
  return response.json();
}

export async function listOrganizationRoles(token, organizationId) {
  const response = await fetch(`${API_BASE_URL}/api/network/roles/${orgQuery(organizationId)}`, {
    headers: await shopScopedHeaders(token),
  });
  if (!response.ok) throw new Error(await parseError(response, 'Failed to load roles'));
  return response.json();
}

export async function activateOrganizationRole(token, organizationId, roleType) {
  const response = await fetch(`${API_BASE_URL}/api/network/roles/${orgQuery(organizationId)}`, {
    method: 'POST',
    headers: { ...(await shopScopedHeaders(token)), 'Content-Type': 'application/json' },
    body: JSON.stringify({ organization_id: organizationId, role_type: roleType }),
  });
  if (!response.ok) throw new Error(await parseError(response, 'Failed to activate role'));
  return response.json();
}

export async function listBusinessPartners(token, organizationId) {
  const response = await fetch(`${API_BASE_URL}/api/network/partners/${orgQuery(organizationId)}`, {
    headers: await shopScopedHeaders(token),
  });
  if (!response.ok) throw new Error(await parseError(response, 'Failed to load partners'));
  return response.json();
}

export async function listBusinessRelationships(token, organizationId) {
  const response = await fetch(`${API_BASE_URL}/api/network/relationships/${orgQuery(organizationId)}`, {
    headers: await shopScopedHeaders(token),
  });
  if (!response.ok) throw new Error(await parseError(response, 'Failed to load relationships'));
  return response.json();
}

export async function createBusinessInvitation(token, organizationId, payload) {
  const response = await fetch(`${API_BASE_URL}/api/network/invitations/${orgQuery(organizationId)}`, {
    method: 'POST',
    headers: { ...(await shopScopedHeaders(token)), 'Content-Type': 'application/json' },
    body: JSON.stringify({ organization_id: organizationId, ...payload }),
  });
  if (!response.ok) throw new Error(await parseError(response, 'Failed to send invitation'));
  return response.json();
}

export async function acceptBusinessInvitation(token, payload) {
  const response = await fetch(`${API_BASE_URL}/api/network/invitations/accept/`, {
    method: 'POST',
    headers: { ...(await shopScopedHeaders(token)), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await parseError(response, 'Failed to accept invitation'));
  return response.json();
}

export async function listIncomingOrders(token, organizationId) {
  const response = await fetch(`${API_BASE_URL}/api/network/incoming-orders/${orgQuery(organizationId)}`, {
    headers: await shopScopedHeaders(token),
  });
  if (!response.ok) throw new Error(await parseError(response, 'Failed to load incoming orders'));
  return response.json();
}

export async function incomingOrderAction(token, organizationId, documentId, action, payload = {}) {
  const response = await fetch(
    `${API_BASE_URL}/api/network/incoming-orders/${documentId}/${action}/${orgQuery(organizationId)}`,
    {
      method: 'POST',
      headers: { ...(await shopScopedHeaders(token)), 'Content-Type': 'application/json' },
      body: JSON.stringify({ organization_id: organizationId, ...payload }),
    },
  );
  if (!response.ok) throw new Error(await parseError(response, 'Failed to update incoming order'));
  return response.json();
}

export async function sendPurchaseOrderNetwork(token, poId, payload) {
  const response = await fetch(`${API_BASE_URL}/api/network/purchase-orders/${poId}/send/`, {
    method: 'POST',
    headers: { ...(await shopScopedHeaders(token)), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await parseError(response, 'Failed to send PO over network'));
  return response.json();
}

export async function listProductMappings(token, organizationId) {
  const response = await fetch(`${API_BASE_URL}/api/network/product-mappings/${orgQuery(organizationId)}`, {
    headers: await shopScopedHeaders(token),
  });
  if (!response.ok) throw new Error(await parseError(response, 'Failed to load product mappings'));
  return response.json();
}

export async function createProductMapping(token, organizationId, payload) {
  const response = await fetch(`${API_BASE_URL}/api/network/product-mappings/${orgQuery(organizationId)}`, {
    method: 'POST',
    headers: { ...(await shopScopedHeaders(token)), 'Content-Type': 'application/json' },
    body: JSON.stringify({ organization_id: organizationId, ...payload }),
  });
  if (!response.ok) throw new Error(await parseError(response, 'Failed to create mapping'));
  return response.json();
}

export async function listPackaging(token, shopPartId) {
  const qs = shopPartId ? `?shop_part_id=${shopPartId}` : '';
  const response = await fetch(`${API_BASE_URL}/api/parts/packaging/${qs}`, {
    headers: await shopScopedHeaders(token),
  });
  if (!response.ok) throw new Error(await parseError(response, 'Failed to load packaging'));
  return response.json();
}

export async function createPackaging(token, payload) {
  const response = await fetch(`${API_BASE_URL}/api/parts/packaging/`, {
    method: 'POST',
    headers: { ...(await shopScopedHeaders(token)), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await parseError(response, 'Failed to create packaging'));
  return response.json();
}

export async function supersedePackaging(token, packagingId, payload) {
  const response = await fetch(`${API_BASE_URL}/api/parts/packaging/${packagingId}/supersede/`, {
    method: 'POST',
    headers: { ...(await shopScopedHeaders(token)), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await parseError(response, 'Failed to supersede packaging'));
  return response.json();
}
