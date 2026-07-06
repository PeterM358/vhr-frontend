/**
 * Browser tab titles for web — never expose internal route names.
 */

import { Platform } from 'react-native';

const BASE_TITLE = 'Veversal';

const PATH_TITLES = {
  '/': BASE_TITLE,
  '/dashboard': `${BASE_TITLE} Dashboard`,
  '/partner/dashboard': `${BASE_TITLE} Partner Dashboard`,
  '/service-centers': `${BASE_TITLE} Service Centers`,
  '/sign-in': BASE_TITLE,
  '/sign-up': BASE_TITLE,
  '/forgot-password': BASE_TITLE,
  '/my-vehicles': `${BASE_TITLE} My Vehicles`,
  '/my-vehicles/add': `${BASE_TITLE} Add Vehicle`,
};

export function normalizeWebTitlePath(pathname) {
  const raw = String(pathname || '/').split('?')[0].split('#')[0];
  if (!raw || raw === '/') return '/';
  return raw.endsWith('/') ? raw.slice(0, -1) : raw;
}

export function getWebDocumentTitle(pathname) {
  const normalized = normalizeWebTitlePath(pathname);
  if (PATH_TITLES[normalized]) {
    return PATH_TITLES[normalized];
  }
  if (normalized.startsWith('/service-center/')) {
    return `${BASE_TITLE} Service Center`;
  }
  return PATH_TITLES[normalized] ?? BASE_TITLE;
}

export function syncWebDocumentTitle(pathname) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return;
  }
  document.title = getWebDocumentTitle(pathname);
}
