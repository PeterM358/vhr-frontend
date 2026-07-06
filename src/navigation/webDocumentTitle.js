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
  '/dashboard/vehicles': `${BASE_TITLE} My Vehicles`,
  '/dashboard/vehicles/add': `${BASE_TITLE} Add Vehicle`,
  '/dashboard/notifications': `${BASE_TITLE} Notifications`,
  '/dashboard/repair-requests': `${BASE_TITLE} Repair Requests`,
  '/dashboard/service-history': `${BASE_TITLE} Service History`,
  '/dashboard/bookings': `${BASE_TITLE} Bookings`,
  '/dashboard/documents': `${BASE_TITLE} Documents`,
};

function vehicleDetailTitle(pathname) {
  if (/^\/dashboard\/vehicles\/\d+$/.test(pathname)) {
    return `${BASE_TITLE} Vehicle Details`;
  }
  if (/^\/dashboard\/vehicles\/\d+\/specs$/.test(pathname)) {
    return `${BASE_TITLE} Vehicle Specs`;
  }
  if (/^\/dashboard\/vehicles\/\d+\/service-record\/service-center\/add$/.test(pathname)) {
    return `${BASE_TITLE} Add Service Center`;
  }
  if (/^\/dashboard\/vehicles\/\d+\/service-record\/service-center$/.test(pathname)) {
    return `${BASE_TITLE} Choose Service Center`;
  }
  if (/^\/dashboard\/vehicles\/\d+\/service-record\/new$/.test(pathname)) {
    return `${BASE_TITLE} Add Service Record`;
  }
  return null;
}

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
  const vehicleTitle = vehicleDetailTitle(normalized);
  if (vehicleTitle) {
    return vehicleTitle;
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
