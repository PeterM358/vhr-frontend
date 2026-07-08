/**
 * Browser tab titles for web — never expose internal route names.
 */

import { Platform } from 'react-native';
import { t, getLocale } from '../i18n';

const BASE_TITLE = 'Veversal';

function seo(key) {
  return t(`seo.${key}`, { app: t('common.appName', null, BASE_TITLE) }, `${BASE_TITLE}`);
}

const PATH_TITLE_KEYS = {
  '/': null,
  '/dashboard': 'dashboard',
  '/partner/dashboard': 'partnerDashboard',
  '/partner/profile': 'partnerProfile',
  '/partner/public-preview': 'publicPreview',
  '/partner/repairs': 'repairs',
  '/partner/bookings': 'bookings',
  '/partner/calendar': 'calendar',
  '/partner/clients': 'clients',
  '/partner/promotions': 'promotions',
  '/partner/warehouse': 'warehouse',
  '/partner/invoicing': 'invoicing',
  '/partner/services': 'priceList',
  '/partner/notifications': 'notifications',
  '/partner/switch-center': 'switchCenter',
  '/partner/switch-center/add': 'addServiceCenter',
  '/service-centers': 'serviceCenters',
  '/sign-in': null,
  '/sign-up': null,
  '/forgot-password': null,
  '/dashboard/vehicles': 'myVehicles',
  '/dashboard/vehicles/add': 'addVehicle',
  '/dashboard/notifications': 'notifications',
  '/dashboard/repair-requests': 'repairs',
  '/dashboard/service-history': 'serviceHistory',
  '/dashboard/bookings': 'bookings',
  '/dashboard/documents': 'documents',
  '/dashboard/profile': 'profile',
};

function vehicleDetailTitleKey(pathname) {
  if (/^\/dashboard\/vehicles\/\d+$/.test(pathname)) {
    return 'vehicleDetails';
  }
  if (/^\/dashboard\/vehicles\/\d+\/specs$/.test(pathname)) {
    return 'vehicleSpecs';
  }
  if (/^\/dashboard\/vehicles\/\d+\/service-record\/service-center\/add$/.test(pathname)) {
    return 'addServiceCenter';
  }
  if (/^\/dashboard\/vehicles\/\d+\/service-record\/service-center$/.test(pathname)) {
    return 'chooseServiceCenter';
  }
  if (/^\/dashboard\/vehicles\/\d+\/service-record\/new$/.test(pathname)) {
    return 'addServiceRecord';
  }
  if (/^\/dashboard\/vehicles\/\d+\/reminders\/new$/.test(pathname)) {
    return 'addObligation';
  }
  if (/^\/dashboard\/vehicles\/\d+\/service-centers$/.test(pathname)) {
    return 'serviceCenterAccess';
  }
  return null;
}

export function normalizeWebTitlePath(pathname) {
  const raw = String(pathname || '/').split('?')[0].split('#')[0];
  if (!raw || raw === '/') return '/';
  return raw.endsWith('/') ? raw.slice(0, -1) : raw;
}

export function getWebDocumentTitle(pathname) {
  // Re-read locale on each title sync (module-level t() uses current locale).
  void getLocale();

  const normalized = normalizeWebTitlePath(pathname);
  const pathKey = PATH_TITLE_KEYS[normalized];
  if (pathKey) {
    return seo(pathKey);
  }
  if (PATH_TITLE_KEYS[normalized] === null && normalized in PATH_TITLE_KEYS) {
    return t('common.appName', null, BASE_TITLE);
  }

  const vehicleKey = vehicleDetailTitleKey(normalized);
  if (vehicleKey) {
    return seo(vehicleKey);
  }
  if (normalized.startsWith('/service-centers')) {
    return seo('serviceCenters');
  }
  if (normalized.startsWith('/service-center/')) {
    return seo('serviceCenters');
  }
  if (/^\/partner\/repairs\/\d+\/offer$/.test(normalized)) {
    return seo('sendProposal');
  }
  if (/^\/(car|truck|motorcycle|bike|ebike|scooter)-service-centers/.test(normalized)) {
    return seo('serviceCenters');
  }
  if (/^\/(oil-change|brake-repair|clutch-repair|timing-belt-replacement|diagnostics)(\/|$)/.test(normalized)) {
    return seo('serviceCenters');
  }
  return t('common.appName', null, BASE_TITLE);
}

export function syncWebDocumentTitle(pathname) {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return;
  }
  document.title = getWebDocumentTitle(pathname);
}
