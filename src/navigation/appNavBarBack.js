import { useCallback } from 'react';
import { Platform } from 'react-native';
import { DrawerActions } from '@react-navigation/native';
import {
  navigateToDashboard,
  navigateToPartnerDashboard,
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
  return useCallback(() => {
    if (Platform.OS === 'web') {
      navigateToPartnerDashboard(navigation);
      return;
    }
    const parent = navigation.getParent?.();
    if (parent?.openDrawer) {
      navigation.dispatch(DrawerActions.jumpTo('ShopDashboard'));
      return;
    }
    navigateToPartnerDashboard(navigation);
  }, [navigation]);
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
    if (returnTo) {
      navigation.navigate(returnTo);
      return;
    }
    if (navigation.canGoBack?.()) {
      navigation.goBack();
    }
  }, [navigation, returnTo, backLabel]);
}
