/**
 * Web navigation helpers: reset stack and set canonical absolute browser URLs.
 * Native callers keep using navigation.navigate(screenName, params) directly.
 */

import { Platform } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncWebPath, storeAuthReturnUrl } from './authNavigation';
import {
  dashboard,
  notifications,
  repairRequests,
  repairRequestNew,
  repairRequestDetail,
  serviceHistory,
  bookings,
  documents,
  profile,
  vehicleAdd,
  vehicleDetail,
  vehicles,
  vehicleServiceRecordNew,
  vehicleServiceRecordCenter,
  vehicleServiceRecordCenterAdd,
  vehicleReminderNew,
  vehicleManageServiceCenters,
  vehicleHistoryAccess,
  vehicleSpecs,
  serviceCenters,
  serviceCenterProfile,
  partnerDashboard,
  partnerProfile,
  partnerPublicPreview,
  partnerRepairs,
  partnerRepairOffer,
  repairDetailWebPath,
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
  partnerAnalytics,
  partnerWorkforce,
  partnerDocumentImports,
  partnerDocumentImportDetail,
  partnerComplaints,
  partnerPurchaseOrders,
  partnerPurchaseOrderDetail,
  partnerGoodsReceipt,
  partnerStorageLocations,
} from './webRoutes';

const PARTNER_HOME_ROUTE = {
  name: 'ShopHome',
  state: { routes: [{ name: 'ShopDashboard' }], index: 0 },
};

const HOME_ROUTE = {
  name: 'Home',
  state: { routes: [{ name: 'HomeMain' }], index: 0 },
};

async function hasStoredAuthToken() {
  const token = await AsyncStorage.getItem('@access_token');
  return !!(token && token !== 'null' && token !== 'undefined');
}

function buildRepairRequestRouteParams(params = {}) {
  const serviceCenter =
    params.serviceCenter ?? params.serviceCenterId ?? params.shopId ?? params.shop_id;
  const centerId =
    serviceCenter != null && serviceCenter !== '' ? Number(serviceCenter) : null;
  const routeParams = { ...params };
  if (centerId != null && !Number.isNaN(centerId)) {
    routeParams.serviceCenter = centerId;
    routeParams.shopId = centerId;
    routeParams.targetingMode = 'selected_centers';
    routeParams.selectedCenterIds = [centerId];
  }
  delete routeParams.origin;
  delete routeParams.returnTo;
  return routeParams;
}

function getRootNavigation(navigation) {
  let current = navigation;
  while (current.getParent?.()) {
    current = current.getParent();
  }
  return current;
}

function resetWebRoutes(navigation, tailRoutes, absolutePath) {
  const root = getRootNavigation(navigation);
  root.dispatch(
    CommonActions.reset({
      index: tailRoutes.length,
      routes: [HOME_ROUTE, ...tailRoutes],
    })
  );
  if (absolutePath) {
    syncWebPath(absolutePath);
    requestAnimationFrame(() => syncWebPath(absolutePath));
  }
}

export function navigateToDashboard(navigation) {
  const root = getRootNavigation(navigation);
  if (Platform.OS === 'web') {
    root.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: 'Home',
            state: { routes: [{ name: 'HomeMain' }], index: 0 },
          },
        ],
      })
    );
    syncWebPath(dashboard());
    requestAnimationFrame(() => syncWebPath(dashboard()));
    return;
  }
  navigation.navigate('Home');
}

export function navigateToVehicleList(navigation) {
  if (Platform.OS === 'web') {
    resetWebRoutes(navigation, [{ name: 'ClientVehicles' }], vehicles());
    return;
  }
  navigation.navigate('ClientVehicles');
}

export function navigateToVehicleAdd(navigation) {
  if (Platform.OS === 'web') {
    resetWebRoutes(navigation, [{ name: 'CreateVehicle' }], vehicleAdd());
    return;
  }
  navigation.navigate('CreateVehicle');
}

export function navigateToVehicleDetail(navigation, vehicleId, params = {}) {
  if (Platform.OS === 'web') {
    resetWebRoutes(
      navigation,
      [
        { name: 'ClientVehicles' },
        { name: 'VehicleDetail', params: { vehicleId, ...params } },
      ],
      vehicleDetail(vehicleId)
    );
    return;
  }
  navigation.navigate('VehicleDetail', { vehicleId, ...params });
}

export function navigateToVehicleSpecs(navigation, vehicleId, params = {}) {
  if (Platform.OS === 'web') {
    resetWebRoutes(
      navigation,
      [
        { name: 'ClientVehicles' },
        { name: 'VehicleDetail', params: { vehicleId } },
        { name: 'VehicleSpecs', params: { vehicleId, ...params } },
      ],
      vehicleSpecs(vehicleId)
    );
    return;
  }
  navigation.navigate('VehicleSpecs', { vehicleId, ...params });
}

export function navigateToVehicleServiceRecordNew(navigation, vehicleId, params = {}) {
  const { type, prefillKm, ...rest } = params;
  const routeParams = {
    vehicleId,
    ...rest,
  };
  if (type != null) routeParams.type = type;
  if (prefillKm != null) routeParams.prefillKm = prefillKm;

  if (Platform.OS === 'web') {
    resetWebRoutes(
      navigation,
      [
        { name: 'ClientVehicles' },
        { name: 'VehicleDetail', params: { vehicleId } },
        { name: 'LogServiceRecord', params: routeParams },
      ],
      vehicleServiceRecordNew(vehicleId, type != null ? { type } : {})
    );
    return;
  }
  navigation.navigate('LogServiceRecord', routeParams);
}

export function navigateToVehicleReminderNew(navigation, vehicleId, params = {}) {
  const { reminderType, initialReminderType, returnTo, origin, ...rest } = params;
  const effectiveType = reminderType || initialReminderType;
  const routeParams = {
    vehicleId,
    returnTo: returnTo || 'VehicleDetail',
    ...rest,
  };
  if (effectiveType) routeParams.initialReminderType = effectiveType;
  if (origin) routeParams.origin = origin;

  if (Platform.OS === 'web') {
    resetWebRoutes(
      navigation,
      [
        { name: 'ClientVehicles' },
        { name: 'VehicleDetail', params: { vehicleId } },
        { name: 'AddObligationPayment', params: routeParams },
      ],
      vehicleReminderNew({ vehicleId, reminderType: effectiveType })
    );
    return;
  }
  navigation.navigate('AddObligationPayment', routeParams);
}

export function navigateToVehicleManageServiceCenters(navigation, vehicleId, params = {}) {
  const routeParams = { vehicleId, returnTo: 'VehicleDetail', ...params };

  if (Platform.OS === 'web') {
    resetWebRoutes(
      navigation,
      [
        { name: 'ClientVehicles' },
        { name: 'VehicleDetail', params: { vehicleId } },
        { name: 'ManageVehicleServiceCenters', params: routeParams },
      ],
      vehicleManageServiceCenters(vehicleId)
    );
    return;
  }
  navigation.navigate('ManageVehicleServiceCenters', routeParams);
}

export function navigateToVehicleHistoryAccess(navigation, vehicleId, params = {}) {
  const routeParams = { vehicleId, returnTo: 'VehicleDetail', ...params };

  if (Platform.OS === 'web') {
    resetWebRoutes(
      navigation,
      [
        { name: 'ClientVehicles' },
        { name: 'VehicleDetail', params: { vehicleId } },
        { name: 'VehicleHistoryAccess', params: routeParams },
      ],
      vehicleHistoryAccess(vehicleId)
    );
    return;
  }
  navigation.navigate('VehicleHistoryAccess', routeParams);
}

export function navigateToVehicleServiceRecordCenter(navigation, vehicleId, params = {}) {
  const { type, ...rest } = params;
  const routeParams = { vehicleId, ...rest };
  if (type != null) routeParams.type = type;

  if (Platform.OS === 'web') {
    resetWebRoutes(
      navigation,
      [
        { name: 'ClientVehicles' },
        { name: 'VehicleDetail', params: { vehicleId } },
        { name: 'LogServiceRecord', params: { vehicleId, type } },
        { name: 'ServiceRecordServiceCenter', params: routeParams },
      ],
      vehicleServiceRecordCenter(vehicleId)
    );
    return;
  }
  navigation.navigate('ServiceRecordServiceCenter', routeParams);
}

export function navigateToNotifications(navigation, params = {}) {
  const routeParams = {
    initialTab: 'inbox',
    returnTo: 'Home',
    backLabelKey: 'navigation.dashboard',
    ...params,
  };
  if (Platform.OS === 'web') {
    resetWebRoutes(navigation, [{ name: 'ClientActivity', params: routeParams }], notifications());
    return;
  }
  navigation.navigate('ClientActivity', routeParams);
}

export function navigateToRepairRequests(navigation, params = {}) {
  const { tab, ...rest } = params;
  const routeParams = { ...rest };
  if (tab) routeParams.initialTab = tab;
  const path = tab ? repairRequests({ tab }) : repairRequests();
  if (Platform.OS === 'web') {
    resetWebRoutes(navigation, [{ name: 'ClientRepairs', params: routeParams }], path);
    return;
  }
  navigation.navigate('ClientRepairs', routeParams);
}

export async function navigateToRepairRequestNew(navigation, params = {}) {
  const { repairType, vehicleType, ...rest } = params;
  const serviceCenter =
    rest.serviceCenter ?? rest.serviceCenterId ?? rest.shopId ?? rest.shop_id;
  const routeParams = buildRepairRequestRouteParams({
    serviceCenter,
    repairType,
    vehicleType,
    ...rest,
  });
  const path = repairRequestNew({ serviceCenter, repairType, vehicleType });

  const authed = await hasStoredAuthToken();
  if (!authed) {
    // Keep map/browse in history (navigate, not replace) so Login can goBack.
    await storeAuthReturnUrl(path);
    const root = getRootNavigation(navigation);
    root.navigate('Login');
    if (Platform.OS === 'web') {
      syncWebPath('/login');
      requestAnimationFrame(() => syncWebPath('/login'));
    }
    return;
  }

  const root = getRootNavigation(navigation);
  if (Platform.OS === 'web') {
    resetWebRoutes(root, [{ name: 'CreateRepair', params: routeParams }], path);
    return;
  }
  root.navigate('CreateRepair', routeParams);
}

const PARTNER_REPAIR_DETAIL_RETURN_TOS = new Set([
  'RepairsList',
  'ShopDashboard',
  'ShopCalendar',
  'ShopHome',
]);

function normalizeRepairId(repairId) {
  const id = Number(repairId);
  return Number.isFinite(id) ? id : repairId;
}

function buildRepairDetailRouteParams(repairId, params = {}) {
  const routeParams = { repairId: normalizeRepairId(repairId), ...params };
  delete routeParams.origin;
  delete routeParams.vehicleId;
  return routeParams;
}

/** Web-safe repair detail navigation — resets stack + syncs URL (avoids blank screen without fetch). */
export function navigateToRepairDetail(navigation, repairId, params = {}) {
  if (repairId == null || repairId === '') return;
  const returnTo = params.returnTo;
  if (Platform.OS === 'web') {
    if (PARTNER_REPAIR_DETAIL_RETURN_TOS.has(returnTo)) {
      navigateToPartnerRepairDetail(navigation, repairId, params);
      return;
    }
    navigateToRepairRequestDetail(navigation, repairId, params);
    return;
  }
  const root = getRootNavigation(navigation);
  root.navigate('RepairDetail', buildRepairDetailRouteParams(repairId, params));
}

export function navigateToRepairRequestDetail(navigation, repairId, params = {}) {
  const { returnTo, shopId, backLabel, initialTab, tab, ...rest } = params;
  const routeParams = buildRepairDetailRouteParams(repairId, {
    returnTo,
    shopId,
    backLabel,
    ...rest,
  });
  const path = repairRequestDetail(repairId);

  if (Platform.OS === 'web') {
    const tailRoutes = [];
    if (returnTo === 'ShopDetail' && shopId != null) {
      tailRoutes.push({ name: 'ShopMap' });
      tailRoutes.push({ name: 'ShopDetail', params: { shopId } });
    } else if (returnTo === 'ClientRepairs') {
      const listTab = initialTab || tab;
      const listParams = listTab ? { initialTab: listTab } : undefined;
      tailRoutes.push({ name: 'ClientRepairs', params: listParams });
    }
    tailRoutes.push({ name: 'RepairDetail', params: routeParams });
    resetWebRoutes(navigation, tailRoutes, path);
    return;
  }

  navigation.navigate('RepairDetail', routeParams);
}

export function navigateToServiceHistory(navigation) {
  if (Platform.OS === 'web') {
    resetWebRoutes(navigation, [{ name: 'ClientServiceHistory' }], serviceHistory());
    return;
  }
  navigation.navigate('ClientServiceHistory');
}

export function navigateToBookings(navigation) {
  if (Platform.OS === 'web') {
    resetWebRoutes(
      navigation,
      [
        {
          name: 'ClientBookings',
          params: {
            title: 'Bookings',
            body: 'Your upcoming and past service bookings will appear here.',
          },
        },
      ],
      bookings()
    );
    return;
  }
  navigation.navigate('ClientBookings', {
    title: 'Bookings',
    body: 'Your upcoming and past service bookings will appear here.',
  });
}

export function navigateToDocuments(navigation) {
  if (Platform.OS === 'web') {
    resetWebRoutes(
      navigation,
      [
        {
          name: 'ClientDocuments',
          params: {
            title: 'Documents',
            body: 'Vehicle documents, invoices and warranty files will be collected here.',
          },
        },
      ],
      documents()
    );
    return;
  }
  navigation.navigate('ClientDocuments', {
    title: 'Documents',
    body: 'Vehicle documents, invoices and warranty files will be collected here.',
  });
}

export function navigateToProfile(navigation) {
  if (Platform.OS === 'web') {
    resetWebRoutes(navigation, [{ name: 'ClientProfile' }], profile());
    return;
  }
  navigation.navigate('ClientProfile');
}

export function navigateToVehicleServiceRecordCenterAdd(navigation, vehicleId, params = {}) {
  const { type, ...rest } = params;
  const routeParams = { vehicleId, ...rest };
  if (type != null) routeParams.type = type;

  if (Platform.OS === 'web') {
    resetWebRoutes(
      navigation,
      [
        { name: 'ClientVehicles' },
        { name: 'VehicleDetail', params: { vehicleId } },
        { name: 'LogServiceRecord', params: { vehicleId, type } },
        { name: 'AddManualServiceCenter', params: routeParams },
      ],
      vehicleServiceRecordCenterAdd(vehicleId)
    );
    return;
  }
  navigation.navigate('AddManualServiceCenter', routeParams);
}

export function navigateToServiceCenters(navigation, params = {}) {
  const root = getRootNavigation(navigation);
  if (Platform.OS === 'web') {
    root.navigate('ShopMap', params);
    syncWebPath(serviceCenters(params));
    requestAnimationFrame(() => syncWebPath(serviceCenters(params)));
    return;
  }
  root.navigate('ShopMap', params);
}

export function navigateToServiceCenterProfile(navigation, centerSlug, params = {}) {
  const slug = String(centerSlug || '').trim().toLowerCase();
  if (/^\d+$/.test(slug)) {
    navigateToServiceCenterDetail(navigation, parseInt(slug, 10), {
      ...params,
      shopId: parseInt(slug, 10),
    });
    return;
  }
  const routeParams = { centerSlug: slug, ...params };
  if (Platform.OS === 'web') {
    navigation.navigate('ShopDetail', routeParams);
    syncWebPath(serviceCenterProfile(centerSlug, params));
    requestAnimationFrame(() => syncWebPath(serviceCenterProfile(centerSlug, params)));
    return;
  }
  navigation.navigate('ShopDetail', routeParams);
}

/** @deprecated use navigateToServiceCenterProfile when public_slug is available */
export function navigateToServiceCenterDetail(navigation, shopId, params = {}) {
  const slug = params.public_slug || params.slug || params.centerSlug;
  if (slug) {
    navigateToServiceCenterProfile(navigation, slug, { shopId, ...params });
    return;
  }
  const routeParams = { shopId, ...params };
  if (Platform.OS === 'web') {
    navigation.navigate('ShopDetail', routeParams);
    return;
  }
  navigation.navigate('ShopDetail', routeParams);
}

export function navigateToPartnerDashboard(navigation) {
  const root = getRootNavigation(navigation);
  if (Platform.OS === 'web') {
    root.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: 'ShopHome',
            state: { routes: [{ name: 'ShopDashboard' }], index: 0 },
          },
        ],
      })
    );
    syncWebPath(partnerDashboard());
    requestAnimationFrame(() => syncWebPath(partnerDashboard()));
    return;
  }
  root.navigate('ShopHome', { screen: 'ShopDashboard' });
}

export function navigateToPartnerProfile(navigation, params = {}) {
  const root = getRootNavigation(navigation);
  if (Platform.OS === 'web') {
    root.navigate('ShopProfile', params);
    syncWebPath(partnerProfile(params));
    requestAnimationFrame(() => syncWebPath(partnerProfile(params)));
    return;
  }
  root.navigate('ShopProfile', params);
}

export function navigateToPartnerPublicPreview(navigation, params = {}) {
  const previewParams = { expandSection: 'public_preview', ...params };
  if (Platform.OS === 'web') {
    const root = getRootNavigation(navigation);
    root.navigate('ShopProfile', previewParams);
    syncWebPath(partnerPublicPreview(params));
    requestAnimationFrame(() => syncWebPath(partnerPublicPreview(params)));
    return;
  }
  navigation.navigate('ShopProfile', previewParams);
}

function resetPartnerStackWebRoutes(navigation, tailRoutes, absolutePath) {
  const root = getRootNavigation(navigation);
  root.dispatch(
    CommonActions.reset({
      index: tailRoutes.length,
      routes: [PARTNER_HOME_ROUTE, ...tailRoutes],
    })
  );
  if (absolutePath) {
    syncWebPath(absolutePath);
    requestAnimationFrame(() => syncWebPath(absolutePath));
  }
}

function resetPartnerDrawerWebRoutes(navigation, drawerScreen, params, absolutePath) {
  const root = getRootNavigation(navigation);
  root.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [
        {
          name: 'ShopHome',
          state: {
            index: 1,
            routes: [{ name: 'ShopDashboard' }, { name: drawerScreen, params }],
          },
        },
      ],
    })
  );
  if (absolutePath) {
    syncWebPath(absolutePath);
    requestAnimationFrame(() => syncWebPath(absolutePath));
  }
}

export function navigateToPartnerRepairs(navigation) {
  if (Platform.OS === 'web') {
    resetPartnerDrawerWebRoutes(navigation, 'RepairsList', undefined, partnerRepairs());
    return;
  }
  const root = getRootNavigation(navigation);
  root.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [
        {
          name: 'ShopHome',
          state: {
            index: 1,
            routes: [{ name: 'ShopDashboard' }, { name: 'RepairsList' }],
          },
        },
      ],
    })
  );
}

function buildPartnerOfferRouteParams(repairId, params = {}) {
  const routeParams = {
    repairId,
    selectedOfferParts: params.selectedOfferParts,
    existingOffer: params.existingOffer,
    offerId: params.offerId ?? params.existingOffer?.id,
    repairTypeId: params.repairTypeId,
  };
  Object.keys(routeParams).forEach((key) => {
    if (routeParams[key] === undefined) {
      delete routeParams[key];
    }
  });
  return routeParams;
}

export function navigateToPartnerRepairOffer(navigation, repairId, params = {}) {
  const { includeRepairDetail = true, ...rest } = params;
  const routeParams = buildPartnerOfferRouteParams(repairId, rest);
  const path = partnerRepairOffer(repairId, {
    offerId: routeParams.offerId,
  });

  if (Platform.OS === 'web') {
    const root = getRootNavigation(navigation);
    const tailRoutes = [];
    if (includeRepairDetail) {
      tailRoutes.push({
        name: 'RepairDetail',
        params: {
          repairId,
          returnTo: 'RepairsList',
          backLabelKey: 'drawer.partner.repairs',
        },
      });
    }
    tailRoutes.push({ name: 'CreateOrUpdateOffer', params: routeParams });

    const partnerHomeRoute = includeRepairDetail
      ? {
          name: 'ShopHome',
          state: {
            index: 1,
            routes: [{ name: 'ShopDashboard' }, { name: 'RepairsList' }],
          },
        }
      : PARTNER_HOME_ROUTE;

    root.dispatch(
      CommonActions.reset({
        index: tailRoutes.length,
        routes: [partnerHomeRoute, ...tailRoutes],
      })
    );
    syncWebPath(path);
    requestAnimationFrame(() => syncWebPath(path));
    return;
  }

  navigation.navigate('CreateOrUpdateOffer', routeParams);
}

function buildPartnerListParams(params = {}) {
  const listParams = {};
  const tab = params.initialTab || params.statusFilter || params.tab;
  if (tab) {
    listParams.initialTab = tab;
  }
  return Object.keys(listParams).length ? listParams : undefined;
}

function buildPartnerHomeRouteForRepairDetail(returnTo, listParams) {
  if (returnTo === 'RepairsList') {
    return {
      name: 'ShopHome',
      state: {
        index: 1,
        routes: [
          { name: 'ShopDashboard' },
          { name: 'RepairsList', params: listParams },
        ],
      },
    };
  }
  if (returnTo === 'ShopCalendar') {
    return {
      name: 'ShopHome',
      state: {
        index: 1,
        routes: [
          { name: 'ShopDashboard' },
          {
            name: 'ShopCalendar',
            params: { returnTo: 'ShopDashboard', backLabelKey: 'navigation.dashboard' },
          },
        ],
      },
    };
  }
  return PARTNER_HOME_ROUTE;
}

export function navigateToPartnerRepairDetail(navigation, repairId, params = {}) {
  const routeParams = {
    repairId: normalizeRepairId(repairId),
    returnTo: 'ShopDashboard',
    backLabelKey: 'navigation.dashboard',
    ...params,
  };
  if (!routeParams.backLabelKey && !routeParams.backLabel) {
    routeParams.backLabelKey = 'navigation.dashboard';
  }
  const listParams = buildPartnerListParams(routeParams);

  if (Platform.OS === 'web') {
    const root = getRootNavigation(navigation);
    const webPath = repairDetailWebPath(routeParams);
    root.dispatch(
      CommonActions.reset({
        index: 1,
        routes: [
          buildPartnerHomeRouteForRepairDetail(routeParams.returnTo, listParams),
          { name: 'RepairDetail', params: routeParams },
        ],
      })
    );
    syncWebPath(webPath);
    requestAnimationFrame(() => syncWebPath(webPath));
    return;
  }

  navigation.navigate('RepairDetail', routeParams);
}

export function navigateToPartnerCalendar(navigation, params = {}) {
  const routeParams = {
    returnTo: 'ShopDashboard',
    backLabel: 'Home',
    ...params,
  };
  if (Platform.OS === 'web') {
    resetPartnerDrawerWebRoutes(navigation, 'ShopCalendar', routeParams, partnerCalendar());
    return;
  }
  navigation.navigate('ShopCalendar', routeParams);
}

export function navigateToPartnerClients(navigation) {
  if (Platform.OS === 'web') {
    resetPartnerStackWebRoutes(navigation, [{ name: 'AuthorizedClients' }], partnerClients());
    return;
  }
  const root = getRootNavigation(navigation);
  root.navigate('AuthorizedClients');
}

export function navigateToPartnerPromotions(navigation) {
  if (Platform.OS === 'web') {
    resetPartnerStackWebRoutes(navigation, [{ name: 'ShopPromotions' }], partnerPromotions());
    return;
  }
  const root = getRootNavigation(navigation);
  root.navigate('ShopPromotions');
}

export function navigateToPartnerWarehouse(navigation) {
  if (Platform.OS === 'web') {
    resetPartnerDrawerWebRoutes(navigation, 'ShopWarehouse', undefined, partnerWarehouse());
    return;
  }
  navigation.navigate('ShopWarehouse');
}

export function navigateToPartnerInvoicing(navigation) {
  if (Platform.OS === 'web') {
    resetPartnerStackWebRoutes(navigation, [{ name: 'ShopInvoicing' }], partnerInvoicing());
    return;
  }
  const root = getRootNavigation(navigation);
  root.navigate('ShopInvoicing');
}

export function navigateToPartnerServices(navigation) {
  if (Platform.OS === 'web') {
    resetPartnerStackWebRoutes(navigation, [{ name: 'ShopServiceMenu' }], partnerServices());
    return;
  }
  const root = getRootNavigation(navigation);
  root.navigate('ShopServiceMenu');
}

export function navigateToPartnerNotifications(navigation) {
  if (Platform.OS === 'web') {
    resetPartnerStackWebRoutes(navigation, [{ name: 'NotificationsList' }], partnerNotifications());
    return;
  }
  const root = getRootNavigation(navigation);
  root.navigate('NotificationsList');
}

export function navigateToPartnerSwitchCenter(navigation, params = {}) {
  if (Platform.OS === 'web') {
    resetPartnerStackWebRoutes(
      navigation,
      [{ name: 'ChooseShop', params }],
      partnerSwitchCenter(params)
    );
    return;
  }
  const root = getRootNavigation(navigation);
  root.navigate('ChooseShop', params);
}

export function navigateToPartnerAddServiceCenter(navigation, params = {}) {
  if (Platform.OS === 'web') {
    resetPartnerStackWebRoutes(
      navigation,
      [
        { name: 'ChooseShop' },
        { name: 'AddPartnerServiceCenter', params },
      ],
      partnerAddServiceCenter(params)
    );
    return;
  }
  const root = getRootNavigation(navigation);
  root.navigate('AddPartnerServiceCenter', params);
}

export function navigateToPartnerServiceCenters(navigation, params = {}) {
  if (Platform.OS === 'web') {
    resetPartnerStackWebRoutes(
      navigation,
      [{ name: 'PartnerServiceCenters', params }],
      partnerServiceCenters()
    );
    return;
  }
  const root = getRootNavigation(navigation);
  root.navigate('PartnerServiceCenters', params);
}

export function navigateToPartnerBookings(navigation) {
  const routeParams = {
    title: 'Bookings',
    body: 'Your service center bookings and appointment history will appear here.',
  };
  if (Platform.OS === 'web') {
    resetPartnerStackWebRoutes(
      navigation,
      [{ name: 'PartnerBookings', params: routeParams }],
      partnerBookings()
    );
    return;
  }
  navigation.navigate('PartnerBookings', routeParams);
}

export function navigateToPartnerAnalytics(navigation) {
  if (Platform.OS === 'web') {
    resetPartnerStackWebRoutes(navigation, [{ name: 'ShopAnalytics' }], partnerAnalytics());
    return;
  }
  navigation.navigate('ShopAnalytics');
}

export function navigateToPartnerWorkforce(navigation) {
  if (Platform.OS === 'web') {
    resetPartnerStackWebRoutes(navigation, [{ name: 'ShopWorkforce' }], partnerWorkforce());
    return;
  }
  navigation.navigate('ShopWorkforce');
}

export function navigateToPartnerDocumentImports(navigation) {
  if (Platform.OS === 'web') {
    resetPartnerStackWebRoutes(navigation, [{ name: 'ShopDocumentImports' }], partnerDocumentImports());
    return;
  }
  navigation.navigate('ShopDocumentImports');
}

export function navigateToPartnerDocumentImportDetail(navigation, importId) {
  const params = { importId };
  if (Platform.OS === 'web') {
    resetPartnerStackWebRoutes(
      navigation,
      [
        { name: 'ShopDocumentImports' },
        { name: 'ShopDocumentImportDetail', params },
      ],
      partnerDocumentImportDetail(importId)
    );
    return;
  }
  navigation.navigate('ShopDocumentImportDetail', params);
}

export function navigateToPartnerComplaints(navigation) {
  if (Platform.OS === 'web') {
    resetPartnerStackWebRoutes(navigation, [{ name: 'ShopComplaints' }], partnerComplaints());
    return;
  }
  navigation.navigate('ShopComplaints');
}

export function navigateToPartnerPurchaseOrders(navigation) {
  if (Platform.OS === 'web') {
    resetPartnerStackWebRoutes(navigation, [{ name: 'ShopPurchaseOrders' }], partnerPurchaseOrders());
    return;
  }
  navigation.navigate('ShopPurchaseOrders');
}

export function navigateToPartnerStorageLocations(navigation) {
  if (Platform.OS === 'web') {
    resetPartnerStackWebRoutes(navigation, [{ name: 'ShopStorageLocations' }], partnerStorageLocations());
    return;
  }
  navigation.navigate('ShopStorageLocations');
}
