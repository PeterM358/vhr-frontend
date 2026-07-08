/**
 * Web-only path normalization and linking helpers.
 * Maps legacy URLs to canonical user-facing paths.
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CommonActions,
  getPathFromState as getPathFromStateDefault,
  getStateFromPath as getStateFromPathDefault,
} from '@react-navigation/native';
import { linkingConfig } from './linkingConfig';
import { syncWebDocumentTitle } from './webDocumentTitle';
import { storeAuthReturnUrl, syncWebPath } from './authNavigation';
import { resolveLegacyShopPath } from '../api/seo';
import {
  getLegacyRedirectTarget,
  getNavigationStateFromSeoPath,
  getSeoPathFromNavigationState,
} from '../utils/seo/seoPaths';
import {
  dashboard,
  documents,
  normalizeWebPath,
  notifications,
  parseRouteQuery,
  parseServiceRecordQuery,
  partnerDashboard,
  partnerProfile,
  partnerPublicPreview,
  partnerRepairs,
  partnerRepairOffer,
  partnerBookings,
  partnerCalendar,
  partnerClients,
  partnerPromotions,
  partnerWarehouse,
  partnerInvoicing,
  partnerServices,
  partnerNotifications,
  partnerSwitchCenter,
  partnerAddServiceCenter,
  partnerServiceCenters,
  profile,
  repairRequests,
  repairRequestNew,
  repairRequestDetail,
  serviceCenters,
  serviceCenterProfile,
  serviceHistory,
  vehicleAdd,
  vehicleDetail,
  vehicleServiceRecordNew,
  vehicleServiceRecordCenter,
  vehicleServiceRecordCenterAdd,
  vehicleReminderNew,
  vehicleManageServiceCenters,
  vehicleSpecs,
  vehicles,
} from './webRoutes';
import { toCanonicalPublicPath, toCanonicalAppPath, localizeCanonicalPath, getSupportedLanguagePrefixFromPathname } from './localizedRoutes';
import { STORAGE_KEY_LOCALE, SUPPORTED_LOCALES, getLocale, syncLocaleFromWebPathname } from '../i18n';

function findFocusedRoute(state) {
  if (!state?.routes?.length) return null;
  const index = typeof state.index === 'number' ? state.index : state.routes.length - 1;
  let route = state.routes[index];
  while (route?.state?.routes?.length) {
    const nestedIndex =
      typeof route.state.index === 'number' ? route.state.index : route.state.routes.length - 1;
    route = route.state.routes[nestedIndex];
  }
  return route;
}

function buildServiceRecordPathSuffix(params = {}) {
  const query = new URLSearchParams();
  if (params.type != null && params.type !== '') {
    query.set('type', String(params.type));
  }
  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
}

function vehicleStackState(tailRoutes) {
  const homeRoute = {
    name: 'Home',
    state: { routes: [{ name: 'HomeMain' }], index: 0 },
  };
  return {
    index: tailRoutes.length,
    routes: [homeRoute, ...tailRoutes],
  };
}

/**
 * Absolute path for the focused route (leading "/").
 * React Navigation pushState requires absolute paths — relative paths stack onto the current URL.
 */
export function getCanonicalWebPath(state) {
  const route = findFocusedRoute(state);
  if (!route?.name) return null;

  const params = route.params || {};
  const vehicleId = params.vehicleId;

  switch (route.name) {
    case 'PublicHome':
      return '/';
    case 'Home':
    case 'HomeMain':
      return dashboard();
    case 'ClientVehicles':
      return vehicles();
    case 'CreateVehicle':
      return vehicleAdd();
    case 'VehicleDetail':
      return vehicleId != null ? vehicleDetail(vehicleId) : vehicles();
    case 'VehicleSpecs':
      return vehicleId != null ? vehicleSpecs(vehicleId) : vehicles();
    case 'LogServiceRecord':
      return vehicleId != null
        ? vehicleServiceRecordNew(vehicleId, { type: params.type })
        : vehicles();
    case 'AddObligationPayment':
      return vehicleId != null
        ? vehicleReminderNew({
            vehicleId,
            reminderType: params.initialReminderType || params.reminderType || params.type,
          })
        : vehicles();
    case 'ManageVehicleServiceCenters':
      return vehicleId != null ? vehicleManageServiceCenters(vehicleId) : vehicles();
    case 'ServiceRecordServiceCenter':
      return vehicleId != null ? vehicleServiceRecordCenter(vehicleId) : vehicles();
    case 'AddManualServiceCenter':
      return vehicleId != null ? vehicleServiceRecordCenterAdd(vehicleId) : vehicles();
    case 'ClientActivity':
    case 'ClientNotifications':
      return notifications();
    case 'ClientRepairs': {
      const tab = params.initialTab || params.tab;
      return tab === 'offers' ? repairRequests({ tab: 'offers' }) : repairRequests();
    }
    case 'CreateRepair': {
      const serviceCenter = params.serviceCenter ?? params.shopId;
      return repairRequestNew({
        serviceCenter,
        repairType: params.repairType,
        vehicleType: params.vehicleType,
      });
    }
    case 'RepairDetail':
      return params.repairId != null ? repairRequestDetail(params.repairId) : repairRequests();
    case 'OffersScreen':
      return repairRequests({ tab: 'offers' });
    case 'ClientServiceHistory':
      return serviceHistory();
    case 'ClientBookings':
      return `${dashboard()}/bookings`;
    case 'ClientDocuments':
      return documents();
    case 'ClientProfile':
      return profile();
    case 'ShopMap':
      return serviceCenters({
        vehicleId: params.vehicleId,
        returnTo: params.returnTo,
      });
    case 'ShopDetail':
      if (params.centerSlug) {
        return serviceCenterProfile(params.centerSlug, {
          vehicleId: params.vehicleId,
          returnTo: params.returnTo,
        });
      }
      return serviceCenters({
        vehicleId: params.vehicleId,
        returnTo: params.returnTo,
      });
    case 'ShopProfile':
      if (params.expandSection === 'public_preview') {
        return partnerPublicPreview();
      }
      return partnerProfile(params);
    case 'ShopHome':
    case 'ShopDashboard':
      return partnerDashboard();
    case 'RepairsList':
      return partnerRepairs();
    case 'ShopCalendar':
      return partnerCalendar();
    case 'AuthorizedClients':
      return partnerClients();
    case 'ShopPromotions':
      return partnerPromotions();
    case 'ShopWarehouse':
      return partnerWarehouse();
    case 'ShopInvoicing':
      return partnerInvoicing();
    case 'ShopServiceMenu':
      return partnerServices();
    case 'NotificationsList':
    case 'ShopNotificationsScreen':
      return partnerNotifications();
    case 'ChooseShop':
      return partnerSwitchCenter(params);
    case 'AddPartnerServiceCenter':
      return partnerAddServiceCenter(params);
    case 'PartnerServiceCenters':
      return partnerServiceCenters();
    case 'PartnerBookings':
      return partnerBookings();
    case 'CreateOrUpdateOffer': {
      const repairId = params.repairId ?? params.existingOffer?.repair;
      if (repairId != null) {
        return partnerRepairOffer(repairId, {
          offerId: params.offerId ?? params.existingOffer?.id,
        });
      }
      return partnerRepairs();
    }
    default:
      return null;
  }
}

/** Parse dashboard vehicle paths (and legacy my-vehicles) into navigation state. */
export function getVehicleNavigationStateFromPath(path) {
  const trimmed = String(path || '').replace(/^\//, '').replace(/\/$/, '');
  if (!trimmed) return null;

  const [pathPart, queryPart] = trimmed.split('?');
  const query = parseServiceRecordQuery(queryPart);

  const legacy = pathPart.startsWith('my-vehicles');
  const base = legacy ? 'my-vehicles' : 'dashboard/vehicles';

  if (pathPart === base) {
    return vehicleStackState([{ name: 'ClientVehicles' }]);
  }
  if (pathPart === `${base}/add`) {
    return vehicleStackState([{ name: 'CreateVehicle' }]);
  }

  let match = pathPart.match(
    new RegExp(`^${base.replace('/', '\\/')}\\/(\\d+)\\/service-record\\/service-center\\/add$`)
  );
  if (match) {
    const id = parseInt(match[1], 10);
    if (!Number.isFinite(id)) return null;
    return vehicleStackState([
      { name: 'ClientVehicles' },
      { name: 'VehicleDetail', params: { vehicleId: id } },
      { name: 'LogServiceRecord', params: { vehicleId: id, ...query } },
      { name: 'AddManualServiceCenter', params: { vehicleId: id, ...query } },
    ]);
  }

  match = pathPart.match(
    new RegExp(`^${base.replace('/', '\\/')}\\/(\\d+)\\/service-record\\/service-center$`)
  );
  if (match) {
    const id = parseInt(match[1], 10);
    if (!Number.isFinite(id)) return null;
    return vehicleStackState([
      { name: 'ClientVehicles' },
      { name: 'VehicleDetail', params: { vehicleId: id } },
      { name: 'LogServiceRecord', params: { vehicleId: id, ...query } },
      { name: 'ServiceRecordServiceCenter', params: { vehicleId: id, ...query } },
    ]);
  }

  match = pathPart.match(new RegExp(`^${base.replace('/', '\\/')}\\/(\\d+)\\/service-record\\/new$`));
  if (match) {
    const id = parseInt(match[1], 10);
    if (!Number.isFinite(id)) return null;
    return vehicleStackState([
      { name: 'ClientVehicles' },
      { name: 'VehicleDetail', params: { vehicleId: id } },
      {
        name: 'LogServiceRecord',
        params: { vehicleId: id, ...query },
      },
    ]);
  }

  match = pathPart.match(new RegExp(`^${base.replace('/', '\\/')}\\/(\\d+)\\/reminders\\/new$`));
  if (match) {
    const id = parseInt(match[1], 10);
    if (!Number.isFinite(id)) return null;
    const reminderType = query.reminderType || query.type || query.initialReminderType;
    const routeParams = {
      vehicleId: id,
      returnTo: 'VehicleDetail',
      ...query,
    };
    if (reminderType) routeParams.initialReminderType = reminderType;
    return vehicleStackState([
      { name: 'ClientVehicles' },
      { name: 'VehicleDetail', params: { vehicleId: id } },
      { name: 'AddObligationPayment', params: routeParams },
    ]);
  }

  match = pathPart.match(new RegExp(`^${base.replace('/', '\\/')}\\/(\\d+)\\/service-centers$`));
  if (match) {
    const id = parseInt(match[1], 10);
    if (!Number.isFinite(id)) return null;
    return vehicleStackState([
      { name: 'ClientVehicles' },
      { name: 'VehicleDetail', params: { vehicleId: id } },
      { name: 'ManageVehicleServiceCenters', params: { vehicleId: id, returnTo: 'VehicleDetail' } },
    ]);
  }

  match = pathPart.match(new RegExp(`^${base.replace('/', '\\/')}\\/(\\d+)\\/specs$`));
  if (match) {
    const id = parseInt(match[1], 10);
    if (!Number.isFinite(id)) return null;
    return vehicleStackState([
      { name: 'ClientVehicles' },
      { name: 'VehicleDetail', params: { vehicleId: id } },
      { name: 'VehicleSpecs', params: { vehicleId: id } },
    ]);
  }

  match = pathPart.match(new RegExp(`^${base.replace('/', '\\/')}\\/(\\d+)$`));
  if (match) {
    const id = parseInt(match[1], 10);
    if (!Number.isFinite(id)) return null;
    return vehicleStackState([
      { name: 'ClientVehicles' },
      { name: 'VehicleDetail', params: { vehicleId: id } },
    ]);
  }

  return null;
}

/** Parse dashboard section paths (notifications, repairs, service history, etc.). */
export function getDashboardNavigationStateFromPath(path) {
  const trimmed = String(path || '').replace(/^\//, '').replace(/\/$/, '');
  if (!trimmed.startsWith('dashboard/')) return null;
  if (trimmed.startsWith('dashboard/vehicles')) return null;

  const [pathPart, queryPart] = trimmed.split('?');
  const query = parseRouteQuery(queryPart);

  if (pathPart === 'dashboard/notifications') {
    return vehicleStackState([
      {
        name: 'ClientActivity',
        params: { initialTab: 'inbox', returnTo: 'Home', backLabelKey: 'navigation.dashboard' },
      },
    ]);
  }
  if (pathPart === 'dashboard/repair-requests') {
    const tab = query.tab || 'open';
    return vehicleStackState([{ name: 'ClientRepairs', params: { initialTab: tab } }]);
  }
  if (pathPart === 'dashboard/repair-requests/new') {
    const serviceCenter = query.serviceCenter || query.serviceCenterId || query.shopId;
    const centerId = serviceCenter != null ? parseInt(String(serviceCenter), 10) : null;
    const routeParams = {
      repairType: query.repairType || undefined,
      vehicleType: query.vehicleType || undefined,
    };
    if (centerId != null && Number.isFinite(centerId)) {
      routeParams.serviceCenter = centerId;
      routeParams.shopId = centerId;
      routeParams.targetingMode = 'selected_centers';
      routeParams.selectedCenterIds = [centerId];
    }
    return vehicleStackState([{ name: 'CreateRepair', params: routeParams }]);
  }
  const repairDetailMatch = pathPart.match(/^dashboard\/repair-requests\/(\d+)$/);
  if (repairDetailMatch) {
    const repairId = parseInt(repairDetailMatch[1], 10);
    if (!Number.isFinite(repairId)) return null;
    return vehicleStackState([
      { name: 'ClientRepairs' },
      { name: 'RepairDetail', params: { repairId, returnTo: 'ClientRepairs', backLabel: 'Requests' } },
    ]);
  }
  if (pathPart === 'dashboard/offers') {
    return vehicleStackState([{ name: 'ClientRepairs', params: { initialTab: 'offers' } }]);
  }
  if (pathPart === 'dashboard/service-history') {
    return vehicleStackState([{ name: 'ClientServiceHistory' }]);
  }
  if (pathPart === 'dashboard/bookings') {
    return vehicleStackState([
      {
        name: 'ClientBookings',
        params: {
          title: 'Bookings',
          body: 'Your upcoming and past service bookings will appear here.',
        },
      },
    ]);
  }
  if (pathPart === 'dashboard/documents') {
    return vehicleStackState([
      {
        name: 'ClientDocuments',
        params: {
          title: 'Documents',
          body: 'Vehicle documents, invoices and warranty files will be collected here.',
        },
      },
    ]);
  }
  if (pathPart === 'dashboard/profile') {
    return vehicleStackState([{ name: 'ClientProfile' }]);
  }

  return null;
}

function getRootNavigation(navigation) {
  let current = navigation;
  while (current.getParent?.()) {
    current = current.getParent();
  }
  return current;
}

/** Client/partner dashboard paths that require sign-in on web. */
export function isProtectedWebPath(path) {
  const pathOnly = String(path || '')
    .split('?')[0]
    .replace(/^\//, '')
    .replace(/\/$/, '');
  return (
    pathOnly === 'dashboard' ||
    pathOnly.startsWith('dashboard/') ||
    pathOnly.startsWith('partner/')
  );
}

/** Reset the root stack from a canonical browser path (login return URLs, web deep links). */
export function resetNavigationToCanonicalPath(navigation, path) {
  const normalized = normalizeWebPath(path);
  const state = resolveNavigationStateFromCanonicalPath(normalized);
  if (!state?.routes?.length) {
    return false;
  }
  const root = getRootNavigation(navigation);
  root.dispatch(
    CommonActions.reset({
      index: typeof state.index === 'number' ? state.index : state.routes.length - 1,
      routes: state.routes,
    })
  );
  syncWebPath(normalized);
  if (Platform.OS === 'web') {
    requestAnimationFrame(() => syncWebPath(normalized));
  }
  return true;
}

/** Resolve a canonical absolute web path into a navigation state (web deep links). */
export function resolveNavigationStateFromCanonicalPath(input) {
  const normalized = normalizeWebLinkingPath(String(input || '').replace(/^\//, ''));
  const serviceCenterState = getServiceCenterNavigationStateFromPath(normalized);
  if (serviceCenterState?.redirectPath) {
    const redirected = normalizeWebLinkingPath(
      String(serviceCenterState.redirectPath).replace(/^\//, '')
    );
    const redirectedState = getServiceCenterNavigationStateFromPath(redirected);
    if (redirectedState?.routes) {
      return redirectedState;
    }
  }
  if (serviceCenterState?.routes) {
    return serviceCenterState;
  }
  const partnerState = getPartnerNavigationStateFromPath(normalized);
  if (partnerState) {
    return partnerState;
  }
  const vehicleState = getVehicleNavigationStateFromPath(normalized);
  if (vehicleState) {
    return vehicleState;
  }
  const dashboardState = getDashboardNavigationStateFromPath(normalized);
  if (dashboardState) {
    return dashboardState;
  }
  return getStateFromPathDefault(normalized, linkingConfig);
}

/** Parse public service center and SEO discovery paths into navigation state. */
export function getServiceCenterNavigationStateFromPath(path) {
  const trimmed = String(path || '').replace(/^\//, '').replace(/\/$/, '');
  const [pathPart, queryPart] = trimmed.split('?');
  const query = parseRouteQuery(queryPart);
  const vehicleContext = buildVehicleAuthorizeRouteParams(query);

  if (query.type === 'city' && query.citySlug) {
    return {
      routes: [
        {
          name: 'ShopMap',
          params: { citySlug: String(query.citySlug).toLowerCase(), ...vehicleContext },
        },
      ],
    };
  }

  const legacyRedirect = getLegacyRedirectTarget(pathPart);
  if (legacyRedirect) {
    return { redirectPath: legacyRedirect };
  }

  const seoState = getNavigationStateFromSeoPath(pathPart);
  if (seoState?.routes) {
    return mergeVehicleAuthorizeContext(seoState, vehicleContext);
  }

  return null;
}

function buildVehicleAuthorizeRouteParams(query = {}) {
  const params = {};
  const vehicleId = parseVehicleIdFromQuery(query);
  if (vehicleId != null) {
    params.vehicleId = vehicleId;
  }
  if (query.returnTo) {
    params.returnTo = String(query.returnTo);
  }
  return params;
}

function parseVehicleIdFromQuery(query = {}) {
  const raw = query.vehicleId || query.vehicle_id;
  if (raw == null || raw === '') return null;
  const id = parseInt(String(raw), 10);
  return Number.isFinite(id) ? id : null;
}

function mergeVehicleAuthorizeContext(state, vehicleContext) {
  if (!vehicleContext || !Object.keys(vehicleContext).length) {
    return state;
  }
  return {
    ...state,
    routes: (state.routes || []).map((route) => ({
      ...route,
      params: { ...(route.params || {}), ...vehicleContext },
    })),
  };
}

/** Parse partner dashboard/profile paths into navigation state. */
export function getPartnerNavigationStateFromPath(path) {
  const trimmed = String(path || '').replace(/^\//, '').replace(/\/$/, '');
  if (!trimmed.startsWith('partner/')) return null;

  const [pathPart, queryPart] = trimmed.split('?');
  const query = parseRouteQuery(queryPart);

  const partnerHome = {
    name: 'ShopHome',
    state: { routes: [{ name: 'ShopDashboard' }], index: 0 },
  };

  if (pathPart === 'partner/dashboard') {
    return {
      routes: [partnerHome],
    };
  }
  if (pathPart === 'partner/profile') {
    const params = {};
    if (query.requireSetup === 'true' || query.requireSetup === true) {
      params.requireSetup = true;
    }
    return {
      routes: [{ name: 'ShopProfile', params }],
    };
  }
  if (pathPart === 'partner/public-preview') {
    return {
      routes: [{ name: 'ShopProfile', params: { expandSection: 'public_preview', ...query } }],
    };
  }
  if (pathPart === 'partner/repairs') {
    return {
      routes: [
        {
          name: 'ShopHome',
          state: {
            index: 1,
            routes: [{ name: 'ShopDashboard' }, { name: 'RepairsList' }],
          },
        },
      ],
    };
  }
  const partnerRepairOfferMatch = pathPart.match(/^partner\/repairs\/(\d+)\/offer$/);
  if (partnerRepairOfferMatch) {
    const repairId = parseInt(partnerRepairOfferMatch[1], 10);
    const offerParams = { repairId };
    if (query.offerId) {
      offerParams.offerId = parseInt(query.offerId, 10);
    }
    return {
      routes: [
        {
          name: 'ShopHome',
          state: {
            index: 1,
            routes: [{ name: 'ShopDashboard' }, { name: 'RepairsList' }],
          },
        },
        { name: 'RepairDetail', params: { repairId, returnTo: 'RepairsList' } },
        { name: 'CreateOrUpdateOffer', params: offerParams },
      ],
      index: 2,
    };
  }
  if (pathPart === 'partner/calendar') {
    return {
      routes: [
        {
          name: 'ShopHome',
          state: {
            index: 1,
            routes: [
              { name: 'ShopDashboard' },
              {
                name: 'ShopCalendar',
                params: { returnTo: 'ShopDashboard', backLabel: 'Home' },
              },
            ],
          },
        },
      ],
    };
  }
  if (pathPart === 'partner/warehouse') {
    return {
      routes: [
        {
          name: 'ShopHome',
          state: {
            index: 1,
            routes: [{ name: 'ShopDashboard' }, { name: 'ShopWarehouse' }],
          },
        },
      ],
    };
  }
  if (pathPart === 'partner/clients') {
    return {
      routes: [partnerHome, { name: 'AuthorizedClients' }],
      index: 1,
    };
  }
  if (pathPart === 'partner/promotions') {
    return {
      routes: [partnerHome, { name: 'ShopPromotions' }],
      index: 1,
    };
  }
  if (pathPart === 'partner/invoicing') {
    return {
      routes: [partnerHome, { name: 'ShopInvoicing' }],
      index: 1,
    };
  }
  if (pathPart === 'partner/services') {
    return {
      routes: [partnerHome, { name: 'ShopServiceMenu' }],
      index: 1,
    };
  }
  if (pathPart === 'partner/notifications') {
    return {
      routes: [partnerHome, { name: 'NotificationsList' }],
      index: 1,
    };
  }
  if (pathPart === 'partner/switch-center') {
    return {
      routes: [partnerHome, { name: 'ChooseShop' }],
      index: 1,
    };
  }
  if (pathPart === 'partner/switch-center/add') {
    return {
      routes: [
        partnerHome,
        { name: 'ChooseShop' },
        { name: 'AddPartnerServiceCenter' },
      ],
      index: 2,
    };
  }
  if (pathPart === 'partner/service-centers') {
    return {
      routes: [partnerHome, { name: 'PartnerServiceCenters' }],
      index: 1,
    };
  }
  if (pathPart === 'partner/bookings') {
    return {
      routes: [
        partnerHome,
        {
          name: 'PartnerBookings',
          params: {
            title: 'Bookings',
            body: 'Your service center bookings and appointment history will appear here.',
          },
        },
      ],
      index: 1,
    };
  }

  return null;
}

/** @deprecated */
export function collapseDuplicateVehiclePath(path) {
  if (!path) return path;
  return normalizeWebPath(path);
}

/** Strip leading slash and normalize legacy path segments before parsing. */
export function normalizeWebLinkingPath(path) {
  if (!path) return '';

  const absolute = normalizeWebPath(path);
  // Root (`/`) should not be treated as a public SEO "service-centers" page.
  // Mapping it to service-centers breaks unauthenticated landing.
  const absolutePathOnly = String(absolute || '/').split('?')[0].split('#')[0];
  if (absolutePathOnly === '/') {
    return '';
  }
  const canonical = toCanonicalPublicPath(absolute);
  const trimmed = absolute.replace(/^\//, '').replace(/\/$/, '');
  const canonicalTrimmed = canonical.replace(/^\//, '').replace(/\/$/, '');

  if (!canonicalTrimmed || canonicalTrimmed === 'PublicHome') {
    return '';
  }
  if (canonicalTrimmed === 'AuthLoading') {
    return '';
  }
  if (canonicalTrimmed === 'ShopMap') {
    return 'service-centers';
  }
  if (canonicalTrimmed.startsWith('ShopMap/')) {
    return `service-centers${canonicalTrimmed.slice('ShopMap'.length)}`;
  }
  if (canonicalTrimmed === 'Home/HomeMain') {
    return 'dashboard';
  }
  if (canonicalTrimmed.startsWith('Home/HomeMain/')) {
    return `dashboard${canonicalTrimmed.slice('Home/HomeMain'.length)}`;
  }
  if (canonicalTrimmed === 'ShopHome/ShopDashboard' || canonicalTrimmed === 'ShopHome') {
    return 'partner/dashboard';
  }
  if (canonicalTrimmed.startsWith('ShopHome/')) {
    return 'partner/dashboard';
  }
  if (canonicalTrimmed === 'ClientVehicles' || canonicalTrimmed.startsWith('ClientVehicles/')) {
    return canonicalTrimmed.replace(/^ClientVehicles/, 'dashboard/vehicles');
  }
  if (canonicalTrimmed === 'CreateVehicle' || canonicalTrimmed.startsWith('CreateVehicle/')) {
    return 'dashboard/vehicles/add';
  }
  if (canonicalTrimmed === 'LogServiceRecord' || canonicalTrimmed.startsWith('LogServiceRecord')) {
    const vid = canonicalTrimmed.match(/vehicleId[=:](\d+)/i)?.[1];
    return vid ? `dashboard/vehicles/${vid}/service-record/new` : 'dashboard/vehicles';
  }
  if (canonicalTrimmed === 'AddObligationPayment' || canonicalTrimmed.startsWith('AddObligationPayment')) {
    const vid = canonicalTrimmed.match(/vehicleId[=:](\d+)/i)?.[1];
    const reminderType = canonicalTrimmed.match(/initialReminderType[=:]([^&/]+)/i)?.[1];
    return vid ? vehicleReminderNew({ vehicleId: vid, reminderType }) : 'dashboard/vehicles';
  }
  if (canonicalTrimmed === 'ManageVehicleServiceCenters' || canonicalTrimmed.startsWith('ManageVehicleServiceCenters')) {
    const vid = canonicalTrimmed.match(/vehicleId[=:](\d+)/i)?.[1];
    return vid ? vehicleManageServiceCenters(vid) : 'dashboard/vehicles';
  }
  if (canonicalTrimmed === 'AddManualServiceCenter' || canonicalTrimmed.startsWith('AddManualServiceCenter')) {
    const vid = canonicalTrimmed.match(/vehicleId[=:](\d+)/i)?.[1];
    return vid ? `dashboard/vehicles/${vid}/service-record/service-center/add` : 'dashboard/vehicles';
  }
  if (canonicalTrimmed === 'add' || canonicalTrimmed.startsWith('add/')) {
    return 'dashboard/vehicles/add';
  }
  if (canonicalTrimmed.startsWith('VehicleDetail/')) {
    return canonicalTrimmed.replace(/^VehicleDetail/, 'dashboard/vehicles');
  }
  if (canonicalTrimmed === 'ClientActivity' || canonicalTrimmed.startsWith('ClientActivity/')) {
    return 'dashboard/notifications';
  }
  if (canonicalTrimmed === 'ClientRepairs' || canonicalTrimmed.startsWith('ClientRepairs/')) {
    return 'dashboard/repair-requests';
  }
  if (canonicalTrimmed === 'CreateRepair' || canonicalTrimmed.startsWith('CreateRepair')) {
    return 'dashboard/repair-requests/new';
  }
  if (canonicalTrimmed === 'RepairDetail' || canonicalTrimmed.startsWith('RepairDetail')) {
    const repairId = canonicalTrimmed.match(/repairId[=:](\d+)/i)?.[1];
    return repairId ? `dashboard/repair-requests/${repairId}` : 'dashboard/repair-requests';
  }
  if (canonicalTrimmed === 'CreateOrUpdateOffer' || canonicalTrimmed.startsWith('CreateOrUpdateOffer')) {
    const repairId = canonicalTrimmed.match(/repairId[=:](\d+)/i)?.[1];
    return repairId ? `partner/repairs/${repairId}/offer` : 'partner/repairs';
  }
  if (canonicalTrimmed === 'ClientProfile' || canonicalTrimmed.startsWith('ClientProfile/')) {
    return 'dashboard/profile';
  }
  if (canonicalTrimmed === 'ShopProfile' || canonicalTrimmed.startsWith('ShopProfile/')) {
    return 'partner/profile';
  }
  if (canonicalTrimmed === 'partner/RepairsList' || canonicalTrimmed.startsWith('partner/RepairsList')) {
    return 'partner/repairs';
  }
  if (canonicalTrimmed === 'partner/ShopCalendar' || canonicalTrimmed.startsWith('partner/ShopCalendar')) {
    return 'partner/calendar';
  }
  if (canonicalTrimmed === 'partner/ShopWarehouse' || canonicalTrimmed.startsWith('partner/ShopWarehouse')) {
    return 'partner/warehouse';
  }
  if (canonicalTrimmed === 'AuthorizedClients' || canonicalTrimmed.startsWith('AuthorizedClients')) {
    return 'partner/clients';
  }
  if (canonicalTrimmed === 'ShopPromotions' || canonicalTrimmed.startsWith('ShopPromotions')) {
    return 'partner/promotions';
  }
  if (canonicalTrimmed === 'ShopInvoicing' || canonicalTrimmed.startsWith('ShopInvoicing')) {
    return 'partner/invoicing';
  }
  if (canonicalTrimmed === 'ShopServiceMenu' || canonicalTrimmed.startsWith('ShopServiceMenu')) {
    return 'partner/services';
  }
  if (canonicalTrimmed === 'NotificationsList' || canonicalTrimmed.startsWith('NotificationsList')) {
    return 'partner/notifications';
  }
  if (canonicalTrimmed === 'ChooseShop' || canonicalTrimmed.startsWith('ChooseShop')) {
    return 'partner/switch-center';
  }
  if (canonicalTrimmed === 'AddPartnerServiceCenter' || canonicalTrimmed.startsWith('AddPartnerServiceCenter')) {
    return 'partner/switch-center/add';
  }
  if (canonicalTrimmed === 'PartnerServiceCenters' || canonicalTrimmed.startsWith('PartnerServiceCenters')) {
    return 'partner/service-centers';
  }
  if (canonicalTrimmed === 'ShopDetail' || canonicalTrimmed.startsWith('ShopDetail/')) {
    const shopId = canonicalTrimmed.match(/shopId[=:](\d+)/i)?.[1];
    return shopId ? `service-centers/${shopId}` : 'service-centers';
  }

  return canonicalTrimmed;
}

async function hasStoredAuthToken() {
  const token = await AsyncStorage.getItem('@access_token');
  return !!(token && token !== 'null' && token !== 'undefined');
}

function readStoredWebLocale() {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY_LOCALE);
    if (stored && SUPPORTED_LOCALES.includes(stored)) {
      return stored;
    }
  } catch {
    // ignore
  }
  return null;
}

/** Prefix a canonical app path with the stored or active locale (replace, not push). */
function localizePathForRedirect(canonicalPath) {
  const pathOnly = String(canonicalPath || '/').split('?')[0].split('#')[0];
  if (!pathOnly || pathOnly === '/') {
    return pathOnly || '/';
  }
  const lang = readStoredWebLocale() || getLocale() || 'en';
  return localizeCanonicalPath(pathOnly, lang);
}

async function resolveDashboardRedirectTarget(pathname) {
  const authed = await hasStoredAuthToken();
  if (!authed) {
    return '/';
  }
  if (getSupportedLanguagePrefixFromPathname(pathname)) {
    return null;
  }
  const isShop = (await AsyncStorage.getItem('@is_shop')) === 'true';
  if (isShop && (pathname === '/dashboard' || pathname === '/dashboard/')) {
    return localizePathForRedirect('/partner/dashboard');
  }
  return localizePathForRedirect(pathname);
}

async function resolvePartnerRedirectTarget(pathname) {
  if (getSupportedLanguagePrefixFromPathname(pathname)) {
    return null;
  }
  const authed = await hasStoredAuthToken();
  if (!authed) {
    return '/';
  }
  return localizePathForRedirect(pathname);
}

async function localizeAppTargetIfNeeded(rawTarget) {
  if (!rawTarget) return rawTarget;
  const qIndex = rawTarget.indexOf('?');
  const queryPart = qIndex >= 0 ? rawTarget.slice(qIndex) : '';
  const pathPart = qIndex >= 0 ? rawTarget.slice(0, qIndex) : rawTarget;

  if (getSupportedLanguagePrefixFromPathname(pathPart)) {
    return rawTarget;
  }

  const appCanonical = toCanonicalAppPath(pathPart);
  if (!appCanonical) {
    return rawTarget;
  }

  const root = appCanonical.replace(/^\//, '').split('/')[0];
  if (root !== 'dashboard' && root !== 'partner') {
    return rawTarget;
  }

  const authed = await hasStoredAuthToken();
  if (!authed) {
    return rawTarget;
  }

  if (root === 'dashboard') {
    const isShop = (await AsyncStorage.getItem('@is_shop')) === 'true';
    if (isShop && (pathPart === '/dashboard' || pathPart === '/dashboard/')) {
      return `${localizePathForRedirect('/partner/dashboard')}${queryPart}`;
    }
  }

  const localized = localizePathForRedirect(appCanonical);
  if (localized === pathPart) {
    return rawTarget;
  }
  return `${localized}${queryPart}`;
}

function parseRepairIdFromSearch(search) {
  if (!search) return null;
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const raw = params.get('repairId') || params.get('repair_id');
  if (!raw) return null;
  const id = parseInt(raw, 10);
  return Number.isFinite(id) ? id : null;
}

function legacyRepairDetailNavigationState() {
  if (typeof window === 'undefined') return null;
  const pathname = window.location.pathname || '';
  if (pathname !== '/RepairDetail' && !pathname.startsWith('/RepairDetail/')) {
    return null;
  }
  const repairId = parseRepairIdFromSearch(window.location.search);
  if (!repairId) return null;
  return vehicleStackState([
    { name: 'ClientRepairs' },
    { name: 'RepairDetail', params: { repairId, returnTo: 'ClientRepairs', backLabel: 'Requests' } },
  ]);
}

function legacyCreateOrUpdateOfferNavigationState() {
  if (typeof window === 'undefined') return null;
  const pathname = window.location.pathname || '';
  if (pathname !== '/CreateOrUpdateOffer' && !pathname.startsWith('/CreateOrUpdateOffer/')) {
    return null;
  }
  const repairId = parseRepairIdFromSearch(window.location.search);
  if (!repairId) return null;
  const query = parseRouteQuery(window.location.search);
  const offerParams = { repairId };
  if (query.offerId) {
    offerParams.offerId = parseInt(query.offerId, 10);
  }
  return {
    routes: [
      {
        name: 'ShopHome',
        state: {
          index: 1,
          routes: [{ name: 'ShopDashboard' }, { name: 'RepairsList' }],
        },
      },
      { name: 'RepairDetail', params: { repairId, returnTo: 'RepairsList' } },
      { name: 'CreateOrUpdateOffer', params: offerParams },
    ],
    index: 2,
  };
}

function parseVehicleIdFromSearch(search) {
  if (!search) return null;
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const raw = params.get('vehicleId') || params.get('vehicle_id');
  if (!raw) return null;
  const id = parseInt(raw, 10);
  return Number.isFinite(id) ? id : null;
}

function parseShopIdFromSearch(search) {
  if (!search) return null;
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const raw = params.get('shopId') || params.get('shop_id');
  if (!raw) return null;
  const id = parseInt(raw, 10);
  return Number.isFinite(id) ? id : null;
}

function legacyShopDetailNavigationState() {
  if (typeof window === 'undefined') return null;
  const pathname = window.location.pathname || '';
  if (pathname !== '/ShopDetail' && !pathname.startsWith('/ShopDetail/')) {
    return null;
  }
  const shopId = parseShopIdFromSearch(window.location.search);
  if (!shopId) return null;
  return {
    routes: [
      { name: 'ShopMap' },
      { name: 'ShopDetail', params: { shopId } },
    ],
    index: 1,
  };
}

function legacyShopProfileNavigationState() {
  if (typeof window === 'undefined') return null;
  const pathname = window.location.pathname || '';
  if (pathname !== '/ShopProfile' && !pathname.startsWith('/ShopProfile/')) {
    return null;
  }
  const search = window.location.search || '';
  const query = parseRouteQuery(search);
  if (query.expandSection === 'public_preview') {
    return {
      routes: [{ name: 'ShopProfile', params: { expandSection: 'public_preview' } }],
    };
  }
  const params = {};
  if (query.requireSetup === 'true' || query.requireSetup === true) {
    params.requireSetup = true;
  }
  return {
    routes: [{ name: 'ShopProfile', params }],
  };
}

/**
 * Replace legacy browser URLs in the address bar (bookmarks, old history).
 */
export async function redirectLegacyWebUrl() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return;
  }

  const { pathname, search, hash } = window.location;
  const current = `${pathname}${search}`;
  let target = null;

  const canonical = normalizeWebPath(current);
  if (canonical !== current) {
    target = canonical;
  } else if (pathname === '/PublicHome' || pathname.startsWith('/PublicHome/')) {
    target = '/';
  } else if (pathname === '/ShopMap' || pathname.startsWith('/ShopMap/')) {
    target = pathname.replace(/^\/ShopMap/, '/service-centers');
  } else if (pathname === '/ShopHome/ShopDashboard' || pathname.startsWith('/ShopHome/ShopDashboard/')) {
    target = pathname.replace(/^\/ShopHome\/ShopDashboard/, '/partner/dashboard');
  } else if (pathname === '/ShopHome' || pathname.startsWith('/ShopHome/')) {
    target = '/partner/dashboard';
  } else if (pathname === '/Home/HomeMain' || pathname.startsWith('/Home/HomeMain/')) {
    const authed = await hasStoredAuthToken();
    target = authed
      ? pathname.replace(/^\/Home\/HomeMain/, '/dashboard')
      : '/';
  } else if (pathname === '/CreateRepair' || pathname.startsWith('/CreateRepair')) {
    const query = parseRouteQuery(search);
    const serviceCenter = query.shopId || query.shop_id || query.serviceCenter || query.serviceCenterId;
    const nextParams = {};
    if (serviceCenter) nextParams.serviceCenter = serviceCenter;
    if (query.repairType) nextParams.repairType = query.repairType;
    if (query.vehicleType) nextParams.vehicleType = query.vehicleType;
    target = repairRequestNew(nextParams);
  } else if (pathname === '/RepairDetail' || pathname.startsWith('/RepairDetail')) {
    const repairId = parseRepairIdFromSearch(search);
    if (repairId) {
      target = repairRequestDetail(repairId);
    } else {
      target = repairRequests();
    }
  } else if (pathname === '/CreateOrUpdateOffer' || pathname.startsWith('/CreateOrUpdateOffer')) {
    const query = parseRouteQuery(search);
    const repairId = query.repairId || query.repair_id;
    if (repairId) {
      const nextParams = {};
      if (query.offerId) nextParams.offerId = query.offerId;
      target = partnerRepairOffer(repairId, nextParams);
    } else {
      target = partnerRepairs();
    }
  } else if (
    pathname === '/dashboard/repair-requests/new' ||
    pathname.startsWith('/dashboard/repair-requests/new')
  ) {
    const authed = await hasStoredAuthToken();
    if (!authed) {
      await storeAuthReturnUrl(`${pathname}${search}`);
      target = '/login';
    }
  } else if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
    const authed = await hasStoredAuthToken();
    if (!authed) {
      target = '/';
    } else {
      const dashboardTarget = await resolveDashboardRedirectTarget(pathname);
      if (dashboardTarget && dashboardTarget !== pathname) {
        target = `${dashboardTarget}${search}`;
      }
    }
  } else if (pathname === '/partner' || pathname.startsWith('/partner/')) {
    const partnerTarget = await resolvePartnerRedirectTarget(pathname);
    if (partnerTarget && partnerTarget !== pathname) {
      target = `${partnerTarget}${search}`;
    }
  } else if (pathname === '/ClientVehicles' || pathname.startsWith('/ClientVehicles/')) {
    target = pathname.replace(/^\/ClientVehicles/, '/dashboard/vehicles');
  } else if (pathname === '/CreateVehicle' || pathname.startsWith('/CreateVehicle/')) {
    target = '/dashboard/vehicles/add';
  } else if (pathname === '/LogServiceRecord' || pathname.startsWith('/LogServiceRecord')) {
    const vid = parseVehicleIdFromSearch(search);
    target = vid ? `/dashboard/vehicles/${vid}/service-record/new` : '/dashboard/vehicles';
  } else if (pathname === '/AddObligationPayment' || pathname.startsWith('/AddObligationPayment')) {
    const vid = parseVehicleIdFromSearch(search);
    const query = parseRouteQuery(search);
    const reminderType = query.initialReminderType || query.reminderType || query.type;
    target = vid ? vehicleReminderNew({ vehicleId: vid, reminderType }) : vehicles();
  } else if (pathname === '/ManageVehicleServiceCenters' || pathname.startsWith('/ManageVehicleServiceCenters')) {
    const vid = parseVehicleIdFromSearch(search);
    target = vid ? vehicleManageServiceCenters(vid) : vehicles();
  } else if (pathname === '/AddManualServiceCenter' || pathname.startsWith('/AddManualServiceCenter')) {
    const vid = parseVehicleIdFromSearch(search);
    target = vid ? `/dashboard/vehicles/${vid}/service-record/service-center/add` : '/dashboard/vehicles';
  } else if (pathname === '/add' || pathname.startsWith('/add/')) {
    target = '/dashboard/vehicles/add';
  } else if (pathname === '/VehicleDetail' || pathname.startsWith('/VehicleDetail/')) {
    target = pathname.replace(/^\/VehicleDetail/, '/dashboard/vehicles');
  } else if (pathname === '/ClientActivity' || pathname.startsWith('/ClientActivity/')) {
    target = '/dashboard/notifications';
  } else if (pathname === '/ClientRepairs' || pathname.startsWith('/ClientRepairs/')) {
    const tab = new URLSearchParams(search).get('tab');
    target = tab === 'offers' ? '/dashboard/repair-requests?tab=offers' : '/dashboard/repair-requests';
  } else if (pathname === '/ClientProfile' || pathname.startsWith('/ClientProfile/')) {
    target = '/dashboard/profile';
  } else if (pathname === '/ShopProfile' || pathname.startsWith('/ShopProfile/')) {
    const query = parseRouteQuery(search);
    if (query.expandSection === 'public_preview') {
      target = '/partner/public-preview';
    } else if (query.requireSetup === 'true') {
      target = '/partner/profile?requireSetup=true';
    } else {
      target = '/partner/profile';
    }
  } else if (pathname === '/partner/RepairsList' || pathname.startsWith('/partner/RepairsList')) {
    target = '/partner/repairs';
  } else if (pathname === '/partner/ShopCalendar' || pathname.startsWith('/partner/ShopCalendar')) {
    target = '/partner/calendar';
  } else if (pathname === '/partner/ShopWarehouse' || pathname.startsWith('/partner/ShopWarehouse')) {
    target = '/partner/warehouse';
  } else if (pathname === '/AuthorizedClients' || pathname.startsWith('/AuthorizedClients')) {
    target = '/partner/clients';
  } else if (pathname === '/ShopPromotions' || pathname.startsWith('/ShopPromotions')) {
    target = '/partner/promotions';
  } else if (pathname === '/ShopInvoicing' || pathname.startsWith('/ShopInvoicing')) {
    target = '/partner/invoicing';
  } else if (pathname === '/ShopServiceMenu' || pathname.startsWith('/ShopServiceMenu')) {
    target = '/partner/services';
  } else if (pathname === '/NotificationsList' || pathname.startsWith('/NotificationsList')) {
    target = '/partner/notifications';
  } else if (pathname === '/ChooseShop' || pathname.startsWith('/ChooseShop')) {
    target = '/partner/switch-center';
  } else if (pathname === '/AddPartnerServiceCenter' || pathname.startsWith('/AddPartnerServiceCenter')) {
    target = '/partner/switch-center/add';
  } else if (pathname === '/PartnerServiceCenters' || pathname.startsWith('/PartnerServiceCenters')) {
    target = '/partner/service-centers';
  } else if (pathname === '/bg/servizi' || pathname.startsWith('/bg/servizi/')) {
    target = pathname.replace(/^\/bg\/servizi(\/|$)/, '/bg/avtoservizi$1');
  } else if (/^\/bg\/serviz\//.test(pathname)) {
    target = pathname.replace(/^\/bg\/serviz\//, '/bg/avtoserviz/');
  } else if (pathname === '/PublicSeoPage' || pathname.startsWith('/PublicSeoPage')) {
    const query = parseRouteQuery(search);
    if (query.type === 'city' && query.citySlug) {
      target = `/service-centers/${String(query.citySlug).toLowerCase()}`;
    } else {
      target = '/service-centers';
    }
  } else {
    const legacySeo = getLegacyRedirectTarget(pathname.replace(/^\//, ''));
    if (legacySeo) {
      target = legacySeo;
    }
  }

  if (!target) {
    const numericCenter = pathname.match(/^\/service-centers\/(\d+)$/);
    const numericProfile = pathname.match(/^\/service-center\/(\d+)$/);
    const shopId = numericCenter?.[1] || numericProfile?.[1];
    if (shopId) {
      target = await resolveLegacyShopPath(parseInt(shopId, 10));
    }
  }

  if (
    !target &&
    (pathname === '/dashboard/vehicles' || pathname.startsWith('/dashboard/vehicles/')) &&
    !(await hasStoredAuthToken())
  ) {
    target = '/';
  } else if (!target && (pathname === '/ShopDetail' || pathname.startsWith('/ShopDetail/'))) {
    const shopId = parseShopIdFromSearch(search);
    if (shopId) {
      target = await resolveLegacyShopPath(shopId);
    } else {
      target = '/service-centers';
    }
  }

  if (target) {
    target = await localizeAppTargetIfNeeded(target);
  } else if (!getSupportedLanguagePrefixFromPathname(pathname)) {
    const directLocalized = await localizeAppTargetIfNeeded(pathname);
    if (directLocalized && directLocalized !== pathname) {
      target = `${directLocalized}${search}`;
    }
  }

  if (target && target !== current) {
    window.history.replaceState(window.history.state, '', `${target}${hash}`);
    syncLocaleFromWebPathname();
  } else if (!target) {
    syncLocaleFromWebPathname();
  }

  syncWebDocumentTitle(target || pathname);
}

export function buildAppLinking(prefixes) {
  const base = {
    prefixes,
    config: linkingConfig,
  };

  if (Platform.OS !== 'web') {
    return base;
  }

  return {
    ...base,
    getStateFromPath(path, options) {
      const legacyRepair = legacyRepairDetailNavigationState();
      if (legacyRepair) {
        return legacyRepair;
      }
      const legacyOffer = legacyCreateOrUpdateOfferNavigationState();
      if (legacyOffer) {
        return legacyOffer;
      }
      const legacyShop = legacyShopDetailNavigationState();
      if (legacyShop) {
        return legacyShop;
      }
      const legacyProfile = legacyShopProfileNavigationState();
      if (legacyProfile) {
        return legacyProfile;
      }
      const normalized = normalizeWebLinkingPath(path);
      const resolved = resolveNavigationStateFromCanonicalPath(normalized);
      if (resolved?.routes) {
        return resolved;
      }
      return getStateFromPathDefault(normalized, linkingConfig);
    },
    getPathFromState(state, options) {
      const seoPath = getSeoPathFromNavigationState(state);
      if (seoPath) {
        return normalizeWebPath(seoPath);
      }
      const canonical = getCanonicalWebPath(state);
      if (canonical != null) {
        return normalizeWebPath(canonical);
      }
      const fallback = getPathFromStateDefault(state, linkingConfig);
      return normalizeWebPath(`/${String(fallback || '').replace(/^\//, '')}`);
    },
  };
}
