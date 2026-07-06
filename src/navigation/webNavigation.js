/**
 * Web navigation helpers: reset stack to avoid duplicated URL segments on web.
 * Native callers keep using navigation.navigate(screenName, params) directly.
 */

import { Platform } from 'react-native';
import { CommonActions } from '@react-navigation/native';

const HOME_ROUTE = { name: 'Home' };

function getRootNavigation(navigation) {
  let current = navigation;
  while (current.getParent?.()) {
    current = current.getParent();
  }
  return current;
}

/** Replace root stack on web so linking never concatenates sibling my-vehicles paths. */
function resetWebRoutes(navigation, tailRoutes) {
  const root = getRootNavigation(navigation);
  root.dispatch(
    CommonActions.reset({
      index: tailRoutes.length,
      routes: [HOME_ROUTE, ...tailRoutes],
    })
  );
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
    return;
  }
  navigation.navigate('Home');
}

export function navigateToVehicleList(navigation) {
  if (Platform.OS === 'web') {
    resetWebRoutes(navigation, [{ name: 'ClientVehicles' }]);
    return;
  }
  navigation.navigate('ClientVehicles');
}

export function navigateToVehicleAdd(navigation) {
  if (Platform.OS === 'web') {
    resetWebRoutes(navigation, [{ name: 'CreateVehicle' }]);
    return;
  }
  navigation.navigate('CreateVehicle');
}

export function navigateToVehicleDetail(navigation, vehicleId, params = {}) {
  if (Platform.OS === 'web') {
    resetWebRoutes(navigation, [
      { name: 'ClientVehicles' },
      { name: 'VehicleDetail', params: { vehicleId, ...params } },
    ]);
    return;
  }
  navigation.navigate('VehicleDetail', { vehicleId, ...params });
}

export function navigateToVehicleSpecs(navigation, vehicleId, params = {}) {
  if (Platform.OS === 'web') {
    resetWebRoutes(navigation, [
      { name: 'ClientVehicles' },
      { name: 'VehicleDetail', params: { vehicleId } },
      { name: 'VehicleSpecs', params: { vehicleId, ...params } },
    ]);
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
    resetWebRoutes(navigation, [
      { name: 'ClientVehicles' },
      { name: 'VehicleDetail', params: { vehicleId } },
      { name: 'LogServiceRecord', params: routeParams },
    ]);
    return;
  }
  navigation.navigate('LogServiceRecord', routeParams);
}
