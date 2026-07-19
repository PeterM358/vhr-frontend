import { useCallback } from 'react';
import { Platform } from 'react-native';
import { useTranslation } from '../i18n';
import {
  normalizeReturnToRoute,
  safeInvokeFallback,
} from '../utils/partnerNavChrome';
import { navigateToShopDashboard } from './drawerNavigation';
import {
  navigateToDashboard,
  navigateToPartnerCalendar,
  navigateToServiceCenters,
  navigateToVehicleDetail,
  navigateToVehicleList,
  navigateToVehicleServiceRecordNew,
} from './webNavigation';

export function useGoBackOr(navigation, fallback) {
  return useCallback(() => {
    if (navigation?.canGoBack?.()) {
      navigation.goBack();
      return;
    }
    // Callers sometimes pass route params / options by mistake — never invoke those.
    safeInvokeFallback(fallback, navigation);
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

export function useRouteBackLabel(route, fallbackKey = 'common.back') {
  const { t } = useTranslation();
  if (route.params?.backLabelKey) {
    return t(route.params.backLabelKey);
  }
  if (route.params?.backLabel) {
    return route.params.backLabel;
  }
  return t(fallbackKey);
}

export function useReturnToBack(navigation, returnTo, backLabel, returnParams) {
  return useCallback(() => {
    const routeName = normalizeReturnToRoute(returnTo);
    if (routeName === 'Home' || routeName === 'HomeMain') {
      if (Platform.OS === 'web') {
        navigateToDashboard(navigation);
        return;
      }
    }
    if (routeName === 'ShopDashboard') {
      navigateToShopDashboard(navigation);
      return;
    }
    // ShopCalendar lives inside ShopHome drawer — not a root stack route.
    // Prefer history (calendar → detail push/reset), else partner calendar helper.
    if (routeName === 'ShopCalendar') {
      if (navigation?.canGoBack?.()) {
        navigation.goBack();
        return;
      }
      navigateToPartnerCalendar(navigation, returnParams || {});
      return;
    }
    if (routeName) {
      if (returnParams && Object.keys(returnParams).length) {
        navigation.navigate(routeName, returnParams);
        return;
      }
      navigation.navigate(routeName);
      return;
    }
    if (navigation?.canGoBack?.()) {
      navigation.goBack();
    }
  }, [navigation, returnTo, backLabel, returnParams]);
}
