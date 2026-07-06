/**
 * Web-only navigation helpers that pair screen navigation with canonical paths.
 * Native callers should keep using navigation.navigate(screenName, params) directly.
 */

import { Platform } from 'react-native';
import {
  dashboard,
  vehicleAdd,
  vehicleDetail,
  vehicleList,
  vehicleServiceRecordNew,
  vehicleSpecs,
} from './webRoutes';
import { syncWebPath } from './authNavigation';

function maybeSyncWebPath(path) {
  if (Platform.OS === 'web' && path) {
    syncWebPath(path);
  }
}

export function navigateToDashboard(navigation) {
  navigation.navigate('Home');
  maybeSyncWebPath(dashboard());
}

export function navigateToVehicleList(navigation) {
  navigation.navigate('ClientVehicles');
  maybeSyncWebPath(vehicleList());
}

export function navigateToVehicleAdd(navigation) {
  navigation.navigate('CreateVehicle');
  maybeSyncWebPath(vehicleAdd());
}

export function navigateToVehicleDetail(navigation, vehicleId, params = {}) {
  navigation.navigate('VehicleDetail', { vehicleId, ...params });
  maybeSyncWebPath(vehicleDetail(vehicleId));
}

export function navigateToVehicleSpecs(navigation, vehicleId, params = {}) {
  navigation.navigate('VehicleSpecs', { vehicleId, ...params });
  maybeSyncWebPath(vehicleSpecs(vehicleId));
}

export function navigateToVehicleServiceRecordNew(navigation, vehicleId, params = {}) {
  const { type, prefillKm, ...rest } = params;
  const routeParams = {
    vehicleId,
    ...rest,
  };
  if (type != null) routeParams.type = type;
  if (prefillKm != null) routeParams.prefillKm = prefillKm;
  navigation.navigate('LogServiceRecord', routeParams);
  maybeSyncWebPath(
    vehicleServiceRecordNew(vehicleId, {
      ...(type != null ? { type } : {}),
    })
  );
}
