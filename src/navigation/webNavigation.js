/**
 * Web navigation helpers: reset stack and set canonical absolute browser URLs.
 * Native callers keep using navigation.navigate(screenName, params) directly.
 */

import { Platform } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { syncWebPath } from './authNavigation';
import {
  dashboard,
  notifications,
  repairRequests,
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
  vehicleSpecs,
  serviceCenters,
  serviceCenterProfile,
  partnerDashboard,
  partnerProfile,
  partnerPublicPreview,
  partnerRepairs,
  partnerBookings,
  partnerCalendar,
  partnerClients,
  partnerPromotions,
  partnerWarehouse,
  partnerInvoicing,
  partnerServices,
  partnerNotifications,
  partnerSwitchCenter,
  partnerServiceCenters,
} from './webRoutes';

const PARTNER_HOME_ROUTE = {
  name: 'ShopHome',
  state: { routes: [{ name: 'ShopDashboard' }], index: 0 },
};

const HOME_ROUTE = { name: 'Home' };

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
    backLabel: 'Dashboard',
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
    syncWebPath(serviceCenters());
    requestAnimationFrame(() => syncWebPath(serviceCenters()));
    return;
  }
  root.navigate('ShopMap', params);
}

export function navigateToServiceCenterProfile(navigation, centerSlug, params = {}) {
  const routeParams = { centerSlug, ...params };
  if (Platform.OS === 'web') {
    navigation.navigate('ShopDetail', routeParams);
    syncWebPath(serviceCenterProfile(centerSlug));
    requestAnimationFrame(() => syncWebPath(serviceCenterProfile(centerSlug)));
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

export function navigateToPartnerSwitchCenter(navigation) {
  if (Platform.OS === 'web') {
    resetPartnerStackWebRoutes(navigation, [{ name: 'ChooseShop' }], partnerSwitchCenter());
    return;
  }
  const root = getRootNavigation(navigation);
  root.navigate('ChooseShop');
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
