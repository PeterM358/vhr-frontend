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

// Maps (Leaflet split into *.impl.web.js chunks)
export const ShopMapScreen = lazyScreen(() => import('../screens/ShopMapScreen'));
export const MapLocationPickerScreen = lazyScreen(() => import('../screens/MapLocationPickerScreen'));

// Profile / reference-data screens (countries/cities loaded on demand)
export const ClientProfileScreen = lazyScreen(() => import('../screens/ClientProfileScreen'));
export const ShopProfileScreen = lazyScreen(() => import('../screens/ShopProfileScreen'));
export const EditVehicleDetailsScreen = lazyScreen(() => import('../screens/EditVehicleDetailsScreen'));
export const CreateVehicleScreen = lazyScreen(() => import('../screens/CreateVehicleScreen'));
export const AddManualServiceCenterScreen = lazyScreen(() => import('../screens/AddManualServiceCenterScreen'));

// Heavy or rarely-used screens
export const PublicSeoPageScreen = lazyScreen(() => import('../screens/PublicSeoPageScreen'));
export const VehicleSpecsScreen = lazyScreen(() => import('../screens/VehicleSpecsScreen'));
export const ShopDetailScreen = lazyScreen(() => import('../screens/ShopDetailScreen'));
export const PromotionDetailScreen = lazyScreen(() => import('../screens/PromotionDetailScreen'));
export const RepairDetailScreen = lazyScreen(() => import('../screens/RepairDetailScreen'));
export const CreateRepairScreen = lazyScreen(() => import('../screens/CreateRepairScreen'));
export const LogServiceRecordScreen = lazyScreen(() => import('../screens/LogServiceRecordScreen'));
export const ServiceRecordServiceCenterScreen = lazyScreen(
  () => import('../screens/ServiceRecordServiceCenterScreen')
);
export const ManageVehicleServiceCentersScreen = lazyScreen(
  () => import('../screens/ManageVehicleServiceCentersScreen')
);
export const AddObligationPaymentScreen = lazyScreen(() => import('../screens/AddObligationPaymentScreen'));
export const CreatePromotionScreen = lazyScreen(() => import('../screens/CreatePromotionScreen'));
export const ShopRegisterClientScreen = lazyScreen(() => import('../screens/ShopRegisterClientScreen'));
export const ChooseShopScreen = lazyScreen(() => import('../screens/ChooseShopScreen'));
export const ClientServiceHistoryScreen = lazyScreen(() => import('../screens/ClientServiceHistoryScreen'));
export const ClientDashboardPlaceholderScreen = lazyScreen(
  () => import('../screens/ClientDashboardPlaceholderScreen')
);
export const AuthorizedClients = lazyScreen(() => import('../components/shop/AuthorizedClients'));
export const ShopPromotions = lazyScreen(() => import('../components/shop/ShopPromotions'));
export const NotificationsList = lazyScreen(() => import('../components/shop/NotificationsList'));
export const RepairsList = lazyScreen(() => import('../components/shop/RepairsList'));
export const NotificationsWithAppbar = lazyScreen(() => import('../components/shop/NotificationsWithAppbar'));
export const ShopServiceMenuScreen = lazyScreen(() => import('../screens/ShopServiceMenuScreen'));
export const ShopInvoicingScreen = lazyScreen(() => import('../screens/ShopInvoicingScreen'));
export const ShopWarehouseReceiveScreen = lazyScreen(() => import('../screens/ShopWarehouseReceiveScreen'));
export const ShopInvoiceDetailScreen = lazyScreen(() => import('../screens/ShopInvoiceDetailScreen'));
export const AddShopPartScreen = lazyScreen(() => import('../screens/AddShopPartScreen'));
export const SelectRepairPartsScreen = lazyScreen(() => import('../screens/SelectRepairPartsScreen'));
export const CreateMasterPartScreen = lazyScreen(() => import('../screens/CreateMasterPartScreen'));
export const RepairChatScreen = lazyScreen(() => import('../screens/RepairChatScreen'));
export const ClientLogRepairScreen = lazyScreen(() => import('../screens/ClientLogRepairScreen'));
export const ClientRequestRepairScreen = lazyScreen(() => import('../screens/ClientRequestRepairScreen'));
export const OfferChatScreen = lazyScreen(() => import('../screens/OfferChatScreen'));
export const CreateOrUpdateOfferScreen = lazyScreen(() => import('../screens/CreateOrUpdateOfferScreen'));
export const SelectOfferPartsScreen = lazyScreen(() => import('../screens/SelectOfferPartsScreen'));
