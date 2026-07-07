/**
 * Browser tab titles for web — never expose internal route names.
 */

import { Platform } from 'react-native';

const BASE_TITLE = 'Veversal';

const PATH_TITLES = {
  '/': BASE_TITLE,
  '/dashboard': `${BASE_TITLE} Dashboard`,
  '/partner/dashboard': `${BASE_TITLE} Partner Dashboard`,
  '/partner/profile': `${BASE_TITLE} Partner Profile`,
  '/partner/public-preview': `${BASE_TITLE} Public Page Preview`,
  '/partner/repairs': `${BASE_TITLE} Repairs`,
  '/partner/bookings': `${BASE_TITLE} Bookings`,
  '/partner/calendar': `${BASE_TITLE} Calendar`,
  '/partner/clients': `${BASE_TITLE} Clients`,
  '/partner/promotions': `${BASE_TITLE} Promotions`,
  '/partner/warehouse': `${BASE_TITLE} Warehouse`,
  '/partner/invoicing': `${BASE_TITLE} Invoicing`,
  '/partner/services': `${BASE_TITLE} Price List`,
  '/partner/notifications': `${BASE_TITLE} Notifications`,
  '/partner/switch-center': `${BASE_TITLE} Switch Service Center`,
  '/partner/switch-center/add': `${BASE_TITLE} Add Service Center`,
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
  '/dashboard/profile': `${BASE_TITLE} Profile`,
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
  if (/^\/dashboard\/vehicles\/\d+\/reminders\/new$/.test(pathname)) {
    return `${BASE_TITLE} Add Obligation / Payment`;
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
  if (normalized.startsWith('/service-centers')) {
    return `${BASE_TITLE} Service Centers`;
  }
  if (normalized.startsWith('/service-center/')) {
    return `${BASE_TITLE} Service Center`;
  }
  if (/^\/partner\/repairs\/\d+\/offer$/.test(normalized)) {
    return `${BASE_TITLE} Send Proposal`;
  }
  if (/^\/(car|truck|motorcycle|bike|ebike|scooter)-service-centers/.test(normalized)) {
    return `${BASE_TITLE} Service Centers`;
  }
  if (/^\/(oil-change|brake-repair|clutch-repair|timing-belt-replacement|diagnostics)(\/|$)/.test(normalized)) {
    return `${BASE_TITLE} Service Centers`;
  }
  return PATH_TITLES[normalized] ?? BASE_TITLE;
}

export function syncWebDocumentTitle(pathname) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return;
  }
  document.title = getWebDocumentTitle(pathname);
}
