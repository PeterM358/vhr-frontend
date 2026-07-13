import { API_BASE_URL } from '../api/config';
import { normalizeMediaUrl } from './warehouseDocumentUrl';

const LEGACY_PRIVATE_PREFIXES = [
  'invoices/',
  'repair_media/',
  'repair_media_thumbs/',
  'vehicle_documents/',
  'external_documents/',
  'billing/',
  'network_claims/',
];

export function extractRelativeMediaPath(pathOrUrl) {
  if (!pathOrUrl) return '';
  const raw = String(pathOrUrl).trim();
  if (!raw) return '';
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    try {
      const parsed = new URL(raw);
      const idx = parsed.pathname.indexOf('/media/');
      if (idx >= 0) {
        return decodeURIComponent(parsed.pathname.slice(idx + '/media/'.length));
      }
      return decodeURIComponent(parsed.pathname.replace(/^\//, ''));
    } catch {
      return raw;
    }
  }
  return raw.replace(/^\/?media\//, '').replace(/^\//, '');
}

export function isPrivateMediaPath(pathOrUrl) {
  const path = extractRelativeMediaPath(pathOrUrl);
  if (!path) return false;
  if (path.includes('/private/') || path.startsWith('private/')) return true;
  return LEGACY_PRIVATE_PREFIXES.some((prefix) => path.startsWith(prefix));
}

export function isPublicMediaPath(pathOrUrl) {
  const path = extractRelativeMediaPath(pathOrUrl);
  if (!path) return false;
  if (path.includes('/public/') || path.startsWith('public/')) return true;
  return !isPrivateMediaPath(path);
}

/**
 * Request a fresh signed URL (S3) or authenticated blob stream (local) for private media.
 * Never cache the returned URL beyond its expiry.
 */
export async function fetchPrivateMediaAccessUrl(relativePath, token, shopHeaders = {}) {
  const path = extractRelativeMediaPath(relativePath);
  if (!path) throw new Error('Missing media path');

  const params = new URLSearchParams({ path });
  const headers = {
    ...shopHeaders,
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/api/media/download/?${params.toString()}`, {
    headers,
    credentials: 'include',
  });

  if (response.status === 401) {
    throw new Error('Authentication required for private media.');
  }
  if (!response.ok) {
    throw new Error(`Could not access private media (${response.status}).`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const payload = await response.json();
    if (!payload?.url) {
      throw new Error('Signed media URL missing from API response.');
    }
    return payload.url;
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

export async function resolveMediaDisplayUrl(pathOrUrl, token, shopHeaders = {}) {
  if (!pathOrUrl) return '';
  if (isPublicMediaPath(pathOrUrl)) {
    return normalizeMediaUrl(pathOrUrl);
  }
  if (isPrivateMediaPath(pathOrUrl)) {
    return fetchPrivateMediaAccessUrl(pathOrUrl, token, shopHeaders);
  }
  return normalizeMediaUrl(pathOrUrl);
}
