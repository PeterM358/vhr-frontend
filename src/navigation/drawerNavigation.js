/**
 * Reset root stack when opening screens from the hamburger menu.
 * Back from those screens should return to Home / ShopHome, not stale detail history.
 */

import { Platform } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { syncWebPath } from './authNavigation';
import {
  notifications,
  repairRequests,
  serviceHistory,
  vehicleAdd,
  vehicles,
} from './webRoutes';

function getRootNavigation(navigation) {
  let current = navigation;
  while (current.getParent?.()) {
    current = current.getParent();
  }
  return current;
}

const WEB_PATH_BY_SCREEN = {
  ClientVehicles: vehicles(),
  CreateVehicle: vehicleAdd(),
  ClientActivity: notifications(),
  ClientNotifications: notifications(),
  ClientRepairs: repairRequests(),
  ClientServiceHistory: serviceHistory(),
};

function resolveDrawerWebPath(screenName, params) {
  if (screenName === 'ClientRepairs' && (params?.initialTab === 'offers' || params?.tab === 'offers')) {
    return repairRequests({ tab: 'offers' });
  }
  return WEB_PATH_BY_SCREEN[screenName] || null;
}

export function resetFromClientDrawer(navigation, screenName, params) {
  const root = getRootNavigation(navigation);
  const target = params ? { name: screenName, params } : { name: screenName };
  root.dispatch(
    CommonActions.reset({
      index: 1,
      routes: [{ name: 'Home' }, target],
    })
  );
  if (Platform.OS === 'web') {
    const webPath = resolveDrawerWebPath(screenName, params);
    if (webPath) {
      syncWebPath(webPath);
      requestAnimationFrame(() => syncWebPath(webPath));
    }
  }
}

export function resetFromShopDrawer(navigation, screenName, params) {
  const root = getRootNavigation(navigation);
  if (params !== undefined) {
    root.navigate(screenName, params);
  } else {
    root.navigate(screenName);
  }
}

/** Shop Repairs tab lives inside ShopDrawer — reset stack + select that drawer route. */
export function resetShopDrawerRepairs(navigation) {
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
