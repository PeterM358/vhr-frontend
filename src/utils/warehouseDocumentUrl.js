import { API_BASE_URL } from '../api/config';
import { shopScopedHeaders } from './currentShop';

/** Align media URLs with the API host the app actually uses (localhost vs 127.0.0.1). */
export function normalizeMediaUrl(url) {
  if (!url) return '';
  if (url.startsWith('/')) {
    return `${API_BASE_URL.replace(/\/$/, '')}${url}`;
  }
  try {
    const apiOrigin = new URL(API_BASE_URL).origin;
    const parsed = new URL(url);
    if (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost') {
      const api = new URL(API_BASE_URL);
      parsed.protocol = api.protocol;
      parsed.host = api.host;
      return parsed.toString();
    }
    if (!parsed.protocol) {
      return `${apiOrigin}${url.startsWith('/') ? '' : '/'}${url}`;
    }
  } catch {
    // keep original
  }
  return url;
}

export async function fetchDocumentBlobUrl(remoteUrl, token) {
  const url = normalizeMediaUrl(remoteUrl);
  const headers = await shopScopedHeaders(token);
  const response = await fetch(url, { headers, credentials: 'include' });
  if (!response.ok) {
    throw new Error(`Could not load file (${response.status})`);
  }
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}
