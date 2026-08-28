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
  navigateToPartnerRepairs,
  navigateToRepairRequests,
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
  // Prefer real stack history (e.g. OrgHome → ClientProfile) over jumping to client Home.
  return useGoBackOr(navigation, navigateToDashboard);
}

export function usePartnerDashboardBack(navigation) {
  return useCallback(() => navigateToShopDashboard(navigation), [navigation]);
}

export function useVehicleListBack(navigation) {
  // RN7: navigate('ClientVehicles') pushes a duplicate list and creates List↔Detail loops.
  return useGoBackOr(navigation, navigateToVehicleList);
}

export function useVehicleDetailBack(navigation, vehicleId) {
  return useCallback(() => {
    if (navigation?.canGoBack?.()) {
      navigation.goBack();
      return;
    }
    if (vehicleId) {
      navigateToVehicleDetail(navigation, vehicleId);
      return;
    }
    navigation.goBack();
  }, [navigation, vehicleId]);
}

export function useServiceRecordBack(navigation, vehicleId) {
  return useCallback(() => {
    if (navigation?.canGoBack?.()) {
      navigation.goBack();
      return;
    }
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

    // List hubs: always land on the list (don't pop CreateRepair / nested detail).
    if (routeName === 'ClientRepairs') {
      navigateToRepairRequests(navigation, returnParams || {});
      return;
    }
    if (routeName === 'RepairsList') {
      navigateToPartnerRepairs(navigation);
      return;
    }

    // RN7: navigate(returnTo) can push a duplicate — prefer popping history first.
    if (navigation?.canGoBack?.()) {
      navigation.goBack();
      return;
    }
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
    if (routeName === 'ShopCalendar') {
      navigateToPartnerCalendar(navigation, returnParams || {});
      return;
    }
    if (routeName) {
      if (returnParams && Object.keys(returnParams).length) {
        navigation.navigate(routeName, returnParams);
        return;
      }
      navigation.navigate(routeName);
    }
  }, [navigation, returnTo, backLabel, returnParams]);
}
