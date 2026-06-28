import { API_BASE_URL } from './config';

async function parseError(response, fallback) {
  const text = await response.text();
  try {
    const parsed = JSON.parse(text);
    if (parsed?.detail) return String(parsed.detail);
    if (typeof parsed === 'object' && parsed !== null) {
      const parts = Object.values(parsed).flat().map(String);
      if (parts.length) return parts.join('\n');
    }
  } catch {
    if (text.trim()) return text.trim();
  }
  return fallback;
}

function authHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

export async function getServiceMenu(token, shopProfileId) {
  const qs = new URLSearchParams({ shop_profile_id: String(shopProfileId) });
  const response = await fetch(`${API_BASE_URL}/api/repairs/service-menu/?${qs}`, {
    headers: authHeaders(token),
  });
  if (!response.ok) {
    throw new Error(await parseError(response, 'Failed to load price list'));
  }
  return response.json();
}

export async function createServiceMenuItem(token, shopProfileId, payload) {
  const qs = new URLSearchParams({ shop_profile_id: String(shopProfileId) });
  const response = await fetch(`${API_BASE_URL}/api/repairs/service-menu/?${qs}`, {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, shop_profile: shopProfileId }),
  });
  if (!response.ok) {
    throw new Error(await parseError(response, 'Failed to create price list item'));
  }
  return response.json();
}

export async function updateServiceMenuItem(token, shopProfileId, itemId, payload) {
  const qs = new URLSearchParams({ shop_profile_id: String(shopProfileId) });
  const response = await fetch(`${API_BASE_URL}/api/repairs/service-menu/${itemId}/?${qs}`, {
    method: 'PATCH',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(await parseError(response, 'Failed to update price list item'));
  }
  return response.json();
}

export async function refreshServiceMenuFromHistory(token, shopProfileId) {
  const qs = new URLSearchParams({ shop_profile_id: String(shopProfileId) });
  const response = await fetch(
    `${API_BASE_URL}/api/repairs/service-menu/refresh-from-history/?${qs}`,
    {
      method: 'POST',
      headers: authHeaders(token),
    }
  );
  if (!response.ok) {
    throw new Error(await parseError(response, 'Failed to refresh price list from history'));
  }
  return response.json();
}

export async function getOfferDraft(token, repairId, shopProfileId) {
  const qs = new URLSearchParams({ shop_profile_id: String(shopProfileId) });
  const response = await fetch(
    `${API_BASE_URL}/api/repairs/repair/${repairId}/offer-draft/?${qs}`,
    { headers: authHeaders(token) }
  );
  if (!response.ok) {
    throw new Error(await parseError(response, 'Failed to load offer draft'));
  }
  return response.json();
}

export async function getPartsExport(token, repairId, shopProfileId, parts) {
  const qs = new URLSearchParams({ shop_profile_id: String(shopProfileId) });
  if (parts != null && String(parts).trim() !== '') {
    qs.set('parts', String(parts).trim());
  }
  const response = await fetch(
    `${API_BASE_URL}/api/repairs/repair/${repairId}/parts-export/?${qs}`,
    { headers: authHeaders(token) }
  );
  if (!response.ok) {
    throw new Error(await parseError(response, 'Failed to build parts export'));
  }
  return response.json();
}
