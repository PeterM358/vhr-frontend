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

/**
 * Recover object keys that were wrongly absolutized against an API request
 * path, e.g. /api/billing/receiving/4/staging/private/… → staging/private/…
 */
function recoverPrivateObjectKey(path) {
  const decoded = String(path || '');
  const envPrivate = decoded.match(
    /((?:staging|production|local|beta|dev)\/private\/.+)$/i
  );
  if (envPrivate?.[1]) return envPrivate[1];
  const plainPrivate = decoded.match(/(^|\/)(private\/.+)$/i);
  if (plainPrivate?.[2]) return plainPrivate[2];
  return decoded.replace(/^\//, '');
}

export function extractRelativeMediaPath(pathOrUrl) {
  if (!pathOrUrl) return '';
  const raw = String(pathOrUrl).trim();
  if (!raw) return '';
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    try {
      const parsed = new URL(raw);
      const idx = parsed.pathname.indexOf('/media/');
      if (idx >= 0) {
        return recoverPrivateObjectKey(
          decodeURIComponent(parsed.pathname.slice(idx + '/media/'.length))
        );
      }
      return recoverPrivateObjectKey(decodeURIComponent(parsed.pathname));
    } catch {
      return recoverPrivateObjectKey(raw);
    }
  }
  // Already a storage key (preferred from API) or /media/… relative path.
  if (
    /^(?:staging|production|local|beta|dev)\/private\//i.test(raw) ||
    /^private\//i.test(raw) ||
    LEGACY_PRIVATE_PREFIXES.some((prefix) => raw.startsWith(prefix))
  ) {
    return raw.replace(/^\//, '');
  }
  return recoverPrivateObjectKey(raw.replace(/^\/?media\//, ''));
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

  // Prefer Bearer auth without cookies — avoids CORS preflight failures when
  // Access-Control-Allow-Credentials is missing on a misconfigured edge.
  const response = await fetch(`${API_BASE_URL}/api/media/download/?${params.toString()}`, {
    headers,
    credentials: token ? 'omit' : 'include',
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
