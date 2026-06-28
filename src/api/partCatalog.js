import { API_BASE_URL } from './config';
import { shopScopedHeaders } from '../utils/currentShop';

async function authGet(token, path) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: await shopScopedHeaders(token),
  });
  if (!response.ok) {
    throw new Error('Failed to load catalog');
  }
  return response.json();
}

async function authPost(token, path, body) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      ...(await shopScopedHeaders(token)),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const text = await response.text();
    let message = 'Could not save catalog entry';
    try {
      const data = JSON.parse(text);
      message = data?.detail || data?.name?.[0] || data?.brand?.[0] || message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  return response.json();
}

export function fetchPartTypes(token, search = '') {
  const q = search ? `?search=${encodeURIComponent(search)}` : '';
  return authGet(token, `/api/parts/part-types/${q}`);
}

export function fetchPartBrands(token, search = '') {
  const q = search ? `?search=${encodeURIComponent(search)}` : '';
  return authGet(token, `/api/parts/part-brands/${q}`);
}

export function fetchUnits(token, dimension = '') {
  const q = dimension ? `?dimension=${encodeURIComponent(dimension)}` : '';
  return authGet(token, `/api/parts/units/${q}`);
}

export function createPartType(token, name) {
  return authPost(token, '/api/parts/part-types/', { name });
}

export function createPartBrand(token, name) {
  return authPost(token, '/api/parts/part-brands/', { name });
}
