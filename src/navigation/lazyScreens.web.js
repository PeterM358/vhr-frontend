/**
 * Web-only lazy screen imports — keeps Leaflet and heavy screens off the initial parse path.
 */

import React, { Suspense, lazy } from 'react';
import NavigationFallback from './NavigationFallback';

function lazyScreen(importFn) {
  const Lazy = lazy(importFn);
  return function LazyScreen(props) {
    return (
      <Suspense fallback={<NavigationFallback />}>
        <Lazy {...props} />
      </Suspense>
    );
  };
}

// Critical path: auth, public home, dashboard shell
export { default as LoginScreen } from '../screens/LoginScreen';
export { default as RegisterScreen } from '../screens/RegisterScreen';
export { default as PublicHomeScreen } from '../screens/PublicHomeScreen';
export { default as AuthLoadingScreen } from '../screens/AuthLoadingScreen';
export { default as ClientVehiclesScreen } from '../screens/ClientVehiclesScreen';
export { default as VehicleDetailScreen } from '../screens/VehicleDetailScreen';
export { default as ClientActivityScreen } from '../screens/ClientActivityScreen';
export { default as ClientRepairsList } from '../components/client/ClientRepairsList';
export { default as PasswordRequestResetScreen } from '../screens/PasswordRequestResetScreen';
export { default as PasswordConfirmResetScreen } from '../screens/PasswordConfirmResetScreen';

// Maps — static imports avoid Metro async chunk module ID mismatches on web
export { default as ShopMapScreen } from '../screens/ShopMapScreen.impl.web';
export { default as MapLocationPickerScreen } from '../screens/MapLocationPickerScreen.impl.web';

// Profile / reference-data screens (countries/cities loaded on demand)
export const ClientProfileScreen = lazyScreen(() => import('../screens/ClientProfileScreen'));
// Service center detail/profile — static imports avoid Metro async chunk module ID mismatches on web
export { default as ShopProfileScreen } from '../screens/ShopProfileScreen';
export const EditVehicleDetailsScreen = lazyScreen(() => import('../screens/EditVehicleDetailsScreen'));
export const CreateVehicleScreen = lazyScreen(() => import('../screens/CreateVehicleScreen'));
export const AddManualServiceCenterScreen = lazyScreen(() => import('../screens/AddManualServiceCenterScreen'));

// Heavy or rarely-used screens
export const PublicSeoPageScreen = lazyScreen(() => import('../screens/PublicSeoPageScreen'));
export const VehicleSpecsScreen = lazyScreen(() => import('../screens/VehicleSpecsScreen'));
export { default as ShopDetailScreen } from '../screens/ShopDetailScreen';
export { default as CreateRepairScreen } from '../screens/CreateRepairScreen';
export const PromotionDetailScreen = lazyScreen(() => import('../screens/PromotionDetailScreen'));
export { default as RepairDetailScreen } from '../screens/RepairDetailScreen';
export const LogServiceRecordScreen = lazyScreen(() => import('../screens/LogServiceRecordScreen'));
export const ServiceRecordServiceCenterScreen = lazyScreen(
  () => import('../screens/ServiceRecordServiceCenterScreen')
);
export { default as ManageVehicleServiceCentersScreen } from '../screens/ManageVehicleServiceCentersScreen';
export { default as AddObligationPaymentScreen } from '../screens/AddObligationPaymentScreen';
export const CreatePromotionScreen = lazyScreen(() => import('../screens/CreatePromotionScreen'));
export const ShopRegisterClientScreen = lazyScreen(() => import('../screens/ShopRegisterClientScreen'));
// Partner screens — static imports avoid Metro async chunk module ID mismatches on web
export { default as ChooseShopScreen } from '../screens/ChooseShopScreen';
export { default as AddPartnerServiceCenterScreen } from '../screens/AddPartnerServiceCenterScreen';
export { default as PartnerServiceCentersScreen } from '../screens/PartnerServiceCentersScreen.web';
export const ClientServiceHistoryScreen = lazyScreen(() => import('../screens/ClientServiceHistoryScreen'));
export { default as ClientDashboardPlaceholderScreen } from '../screens/ClientDashboardPlaceholderScreen';
export { default as AuthorizedClients } from '../components/shop/AuthorizedClients';
export { default as ShopPromotions } from '../components/shop/ShopPromotions';
export { default as NotificationsList } from '../components/shop/NotificationsList';
export { default as RepairsList } from '../components/shop/RepairsList';
export const NotificationsWithAppbar = lazyScreen(() => import('../components/shop/NotificationsWithAppbar'));
export { default as ShopServiceMenuScreen } from '../screens/ShopServiceMenuScreen';
export { default as ShopInvoicingScreen } from '../screens/ShopInvoicingScreen';
export { default as ShopWarehouseReceiveScreen } from '../screens/ShopWarehouseReceiveScreen';
export const ShopInvoiceDetailScreen = lazyScreen(() => import('../screens/ShopInvoiceDetailScreen'));
export const AddShopPartScreen = lazyScreen(() => import('../screens/AddShopPartScreen'));
export const SelectRepairPartsScreen = lazyScreen(() => import('../screens/SelectRepairPartsScreen'));
export const CreateMasterPartScreen = lazyScreen(() => import('../screens/CreateMasterPartScreen'));
export const RepairChatScreen = lazyScreen(() => import('../screens/RepairChatScreen'));
export const ClientLogRepairScreen = lazyScreen(() => import('../screens/ClientLogRepairScreen'));
export const ClientRequestRepairScreen = lazyScreen(() => import('../screens/ClientRequestRepairScreen'));
export const OfferChatScreen = lazyScreen(() => import('../screens/OfferChatScreen'));
export { default as CreateOrUpdateOfferScreen } from '../screens/CreateOrUpdateOfferScreen';
export const SelectOfferPartsScreen = lazyScreen(() => import('../screens/SelectOfferPartsScreen'));
