import { useCallback } from 'react';
import { Platform } from 'react-native';
import { navigateToShopDashboard } from './drawerNavigation';
import {
  navigateToDashboard,
  navigateToServiceCenters,
  navigateToVehicleDetail,
  navigateToVehicleList,
  navigateToVehicleServiceRecordNew,
} from './webNavigation';

export function useGoBackOr(navigation, fallback) {
  return useCallback(() => {
    if (navigation.canGoBack?.()) {
      navigation.goBack();
      return;
    }
    fallback?.(navigation);
  }, [navigation, fallback]);
}

export function useClientDashboardBack(navigation) {
  return useCallback(() => navigateToDashboard(navigation), [navigation]);
}

export function usePartnerDashboardBack(navigation) {
  return useCallback(() => navigateToShopDashboard(navigation), [navigation]);
}

export function useVehicleListBack(navigation) {
  return useCallback(() => navigateToVehicleList(navigation), [navigation]);
}

export function useVehicleDetailBack(navigation, vehicleId) {
  return useCallback(() => {
    if (vehicleId) {
      navigateToVehicleDetail(navigation, vehicleId);
      return;
    }
    navigation.goBack();
  }, [navigation, vehicleId]);
}

export function useServiceRecordBack(navigation, vehicleId) {
  return useCallback(() => {
    if (vehicleId) {
      navigateToVehicleServiceRecordNew(navigation, vehicleId);
      return;
    }
    navigation.goBack();
  }, [navigation, vehicleId]);
}

export function useServiceCentersBack(navigation) {
  return useGoBackOr(navigation, navigateToServiceCenters);
}

export function useReturnToBack(navigation, returnTo, backLabel) {
  return useCallback(() => {
    if (returnTo === 'Home' || returnTo === 'HomeMain') {
      if (Platform.OS === 'web') {
        navigateToDashboard(navigation);
        return;
      }
    }
    if (returnTo === 'ShopDashboard') {
      navigateToShopDashboard(navigation);
      return;
    }
    if (returnTo) {
      navigation.navigate(returnTo);
      return;
    }
    if (navigation.canGoBack?.()) {
      navigation.goBack();
    }
  }, [navigation, returnTo, backLabel]);
}
