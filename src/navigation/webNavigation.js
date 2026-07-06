/**
 * Web navigation helpers: reset stack and set canonical absolute browser URLs.
 * Native callers keep using navigation.navigate(screenName, params) directly.
 */

import { Platform } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { syncWebPath } from './authNavigation';
import {
  dashboard,
  vehicleAdd,
  vehicleDetail,
  vehicles,
  vehicleServiceRecordNew,
  vehicleSpecs,
} from './webRoutes';

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
