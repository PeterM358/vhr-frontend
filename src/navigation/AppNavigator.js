/**
 * PATH: src/navigation/AppNavigator.js
 */

import React, { useEffect, useRef, useContext } from 'react';
import { Platform } from 'react-native';
import { NavigationContainer, getPathFromState } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBackHeaderLeft } from '../components/navigation/BackHeaderButton';
import { AuthContext } from '../context/AuthManager';
import {
  flushPendingNotificationNavigation,
  setNotificationNavigationRef,
} from '../notifications/notificationOpenRouting';

import {
  LoginScreen,
  RegisterScreen,
  PublicHomeScreen,
  PublicSeoPageScreen,
  ClientVehiclesScreen,
  ShopMapScreen,
  VehicleDetailScreen,
  VehicleSpecsScreen,
  EditVehicleDetailsScreen,
  ShopDetailScreen,
  AuthLoadingScreen,
  PromotionDetailScreen,
  ClientRepairsList,
  RepairDetailScreen,
  CreateRepairScreen,
  LogServiceRecordScreen,
  ServiceRecordServiceCenterScreen,
  MapLocationPickerScreen,
  AddManualServiceCenterScreen,
  ManageVehicleServiceCentersScreen,
  AddObligationPaymentScreen,
  CreateVehicleScreen,
  CreatePromotionScreen,
  ShopRegisterClientScreen,
  ChooseShopScreen,
  AddPartnerServiceCenterScreen,
  PartnerServiceCentersScreen,
  ClientActivityScreen,
  ClientServiceHistoryScreen,
  ClientDashboardPlaceholderScreen,
  AuthorizedClients,
  ShopPromotions,
  NotificationsList,
  RepairsList,
  NotificationsWithAppbar,
  ShopProfileScreen,
  ShopServiceMenuScreen,
  ShopInvoicingScreen,
  ShopWarehouseReceiveScreen,
  ShopInvoiceDetailScreen,
  ShopAnalyticsScreen,
  ShopComplaintsScreen,
  ShopDocumentImportsScreen,
  ShopDocumentImportDetailScreen,
  ShopWorkforceScreen,
  ShopPurchaseOrdersScreen,
  ShopPurchaseOrderDetailScreen,
  ShopGoodsReceiptScreen,
  ShopStorageLocationsScreen,
  NetworkOrganizationScreen,
  NetworkRolesScreen,
  NetworkPartnersScreen,
  NetworkInvitePartnerScreen,
  NetworkIncomingOrdersScreen,
  NetworkIncomingOrderDetailScreen,
  NetworkProductMappingScreen,
  NetworkPackagingScreen,
  NetworkClaimsListScreen,
  NetworkClaimCreateScreen,
  NetworkClaimDetailScreen,
  NetworkIncomingClaimsScreen,
  ClientProfileScreen,
  AddShopPartScreen,
  SelectRepairPartsScreen,
  CreateMasterPartScreen,
  RepairChatScreen,
  ClientLogRepairScreen,
  ClientRequestRepairScreen,
  OfferChatScreen,
  CreateOrUpdateOfferScreen,
  SelectOfferPartsScreen,
  PasswordRequestResetScreen,
  PasswordConfirmResetScreen,
} from './lazyScreens';

// Screens
import LoginErrorBoundary from '../components/auth/LoginErrorBoundary';
import { resetToPublicHome } from './authNavigation';

import ShopDrawer from './ShopDrawer';
import HomeDrawer from './HomeDrawer';

import {
  buildAppLinking,
  redirectLegacyWebUrl,
  collapseDuplicateVehiclePath,
  getCanonicalWebPath,
} from './webLinking';
import { linkingConfig } from './linkingConfig';
import { syncWebPath } from './authNavigation';
import { normalizeWebPath } from './webRoutes';
import { syncWebDocumentTitle } from './webDocumentTitle';
import { blurActiveElementOnWeb } from '../utils/webFocus';
import NavigationFallback from './NavigationFallback';
import { navigateToDashboard, navigateToVehicleDetail, navigateToVehicleList, navigateToVehicleServiceRecordNew, navigateToVehicleServiceRecordCenter, navigateToServiceCenters, navigateToPartnerDashboard } from './webNavigation';
import { appNavBarScreenOptions } from './appNavBarOptions';
import { t } from '../i18n';

const Stack = createNativeStackNavigator();

function LoginScreenRoute(props) {
  const { navigation } = props;
  return (
    <LoginErrorBoundary
      onRetry={() => navigation.replace('Login')}
      onGoHome={() => resetToPublicHome(navigation)}
    >
      <LoginScreen {...props} />
    </LoginErrorBoundary>
  );
}

/** Floating header: back/title over ScreenBackground — no solid blue bar */
const transparentStackHeader = {
  headerTransparent: true,
  headerStyle: { backgroundColor: 'transparent' },
  headerTintColor: '#ffffff',
  headerTitleStyle: { color: '#ffffff', fontWeight: '600' },
  headerShadowVisible: false,
  /** Android/Web default is left-aligned title; iOS is always centered. */
  headerTitleAlign: 'center',
};

/** Auth cards render their own logo + headings — hide stack header title everywhere. */
const authScreenOptions = {
  ...transparentStackHeader,
  headerShown: false,
};

/** Pop one screen — use when returning to the screen below (avoids duplicate stack entries). */
function stackBackHeaderLeft(navigation, label = 'Back') {
  return createBackHeaderLeft({
    onPress: () => navigation.goBack(),
    label,
    accessibilityLabel: `Back to ${label}`,
  });
}

/** Large hit target + label; avoids tiny default back control on Android with transparent headers. */
function drawerHeaderLeft(navigation, homeRoute, label = 'Home') {
  return createBackHeaderLeft({
    onPress: () => navigation.navigate(homeRoute),
    label,
    accessibilityLabel: `Back to ${label}`,
  });
}

function homeHeaderLeft(navigation) {
  return createBackHeaderLeft({
    onPress: () => navigateToDashboard(navigation),
    label: 'Dashboard',
    accessibilityLabel: 'Back to dashboard',
  });
}

function shopHomeHeaderLeft(navigation) {
  if (Platform.OS === 'web') {
    return createBackHeaderLeft({
      onPress: () => navigateToPartnerDashboard(navigation),
      label: 'Dashboard',
      accessibilityLabel: 'Back to partner dashboard',
    });
  }
  return drawerHeaderLeft(navigation, 'ShopHome', 'Home');
}

function createRepairRequestHeaderLeft(navigation) {
  return createBackHeaderLeft({
    onPress: () => {
      if (navigation.canGoBack?.()) {
        navigation.goBack();
      } else {
        navigateToServiceCenters(navigation);
      }
    },
    label: 'Back',
    accessibilityLabel: 'Back to previous page',
  });
}

function shopDetailHeaderLeft(navigation, route) {
  const { returnTo } = route.params || {};
  if (returnTo) {
    return stackBackHeaderLeft(navigation, 'Back');
  }
  return createBackHeaderLeft({
    onPress: () => {
      if (navigation.canGoBack?.()) {
        navigation.goBack();
      } else {
        navigateToServiceCenters(navigation);
      }
    },
    label: 'Map',
    accessibilityLabel: 'Back to service centers map',
  });
}

function vehicleDetailsHeaderLeft(navigation) {
  return createBackHeaderLeft({
    onPress: () => navigateToVehicleList(navigation),
    label: t('vehicles.backToVehicles', null, 'Vehicles'),
    accessibilityLabel: t('vehicles.backToVehicles', null, 'Vehicles'),
  });
}

function vehicleSpecsHeaderLeft(navigation, vehicleId) {
  return createBackHeaderLeft({
    onPress: () => navigateToVehicleDetail(navigation, vehicleId),
    label: t('vehicles.vehicle', null, 'Vehicle'),
    accessibilityLabel: t('vehicles.vehicle', null, 'Vehicle'),
  });
}

function logServiceRecordHeaderLeft(navigation, vehicleId) {
  return createBackHeaderLeft({
    onPress: () => navigateToVehicleDetail(navigation, vehicleId),
    label: t('vehicles.vehicle', null, 'Vehicle'),
    accessibilityLabel: t('vehicles.vehicle', null, 'Vehicle'),
  });
}

function serviceRecordCenterHeaderLeft(navigation, vehicleId) {
  return createBackHeaderLeft({
    onPress: () => navigateToVehicleServiceRecordNew(navigation, vehicleId),
    label: t('logServiceRecord.backToRecord', null, 'Record'),
    accessibilityLabel: t('logServiceRecord.backToRecord', null, 'Record'),
  });
}

function createVehicleHeaderLeft(navigation) {
  return createBackHeaderLeft({
    onPress: () => navigateToVehicleList(navigation),
    label: t('vehicles.backToVehicles', null, 'Vehicles'),
    accessibilityLabel: t('vehicles.backToVehicles', null, 'Vehicles'),
  });
}

function getLinkingPrefixes() {
  const prefixes = ['service1001://'];
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
    prefixes.push(window.location.origin);
  }
  return prefixes;
}

export default function AppNavigator() {
  const linking = buildAppLinking(getLinkingPrefixes());
  const navigationRef = useRef(null);
  const { isAuthenticated } = useContext(AuthContext);

  useEffect(() => {
    redirectLegacyWebUrl();
  }, []);

  useEffect(() => {
    setNotificationNavigationRef(navigationRef);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      flushPendingNotificationNavigation(true);
    }
  }, [isAuthenticated]);

  const handleNavigationStateChange = () => {
    if (Platform.OS === 'web') {
      blurActiveElementOnWeb();
    }
    if (isAuthenticated) {
      flushPendingNotificationNavigation(true);
    }
    if (Platform.OS !== 'web' || !navigationRef.current) {
      return;
    }
    try {
      const rootState = navigationRef.current.getRootState();
      const canonical = getCanonicalWebPath(rootState);
      const pathname =
        canonical != null
          ? normalizeWebPath(canonical)
          : normalizeWebPath(
              collapseDuplicateVehiclePath(getPathFromState(rootState, linkingConfig)) || '/'
            );
      syncWebPath(pathname);
      requestAnimationFrame(() => syncWebPath(pathname));
      syncWebDocumentTitle(pathname === '/PublicHome' ? '/' : pathname.split('?')[0]);
    } catch {
      syncWebDocumentTitle(window.location.pathname);
    }
  };

  const handleNavigationReady = () => {
    handleNavigationStateChange();
    if (isAuthenticated) {
      flushPendingNotificationNavigation(true);
    }
  };

  return (
    <NavigationContainer
      ref={navigationRef}
      linking={linking}
      fallback={<NavigationFallback />}
      documentTitle={{ enabled: false }}
      onReady={handleNavigationReady}
      onStateChange={handleNavigationStateChange}
    >
      <Stack.Navigator
        initialRouteName="AuthLoading"
        screenOptions={{
          ...transparentStackHeader,
          headerBackTitleVisible: false,
          ...(Platform.OS === 'android' ? { statusBarTranslucent: false } : {}),
        }}
      >
        <Stack.Screen name="AuthLoading" component={AuthLoadingScreen} options={{ headerShown: false }} />
        <Stack.Screen name="PublicHome" component={PublicHomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Login" component={LoginScreenRoute} options={authScreenOptions} />
        <Stack.Screen name="Register" component={RegisterScreen} options={authScreenOptions} />
        <Stack.Screen name="Home" component={HomeDrawer} options={{ headerShown: false }} />
        <Stack.Screen name="ShopHome" component={ShopDrawer} options={{ headerShown: false, title: 'Home' }} />

        <Stack.Screen
          name="ShopMap"
          component={ShopMapScreen}
          options={{ headerShown: false, title: 'Find Service Centers' }}
        />
        <Stack.Screen
          name="ClientVehicles"
          component={ClientVehiclesScreen}
          options={{ ...appNavBarScreenOptions, title: t('vehicles.title', null, 'Vehicles') }}
        />
        <Stack.Screen
          name="VehicleDetail"
          component={VehicleDetailScreen}
          options={{ ...appNavBarScreenOptions, title: t('vehicles.nav.details', null, 'Details') }}
        />
        <Stack.Screen
          name="VehicleSpecs"
          component={VehicleSpecsScreen}
          options={{ ...appNavBarScreenOptions, title: t('vehicles.detail.vehicleSpecs', null, 'Vehicle specs') }}
        />
        <Stack.Screen
          name="EditVehicleDetails"
          component={EditVehicleDetailsScreen}
          options={{ ...appNavBarScreenOptions, title: t('vehicles.nav.technical', null, 'Technical') }}
        />
        <Stack.Screen
          name="PublicSeoPage"
          component={PublicSeoPageScreen}
          options={{ title: 'Veversal' }}
        />
        <Stack.Screen
          name="ShopDetail"
          component={ShopDetailScreen}
          options={{ ...appNavBarScreenOptions, title: 'Service Center Details' }}
        />
        <Stack.Screen name="PromotionDetail" component={PromotionDetailScreen} options={{ title: 'Promotion Details' }}/>
        <Stack.Screen
          name="ClientRepairs"
          component={ClientRepairsList}
          options={{ ...appNavBarScreenOptions, title: 'Repairs' }}
        />
        <Stack.Screen
          name="RepairDetail"
          component={RepairDetailScreen}
          options={{ ...appNavBarScreenOptions, title: 'Repair Details' }}
        />
        <Stack.Screen
          name="CreateRepair"
          component={CreateRepairScreen}
          options={{ ...appNavBarScreenOptions, title: 'Request Service' }}
        />
        <Stack.Screen
          name="LogServiceRecord"
          component={LogServiceRecordScreen}
          options={{ ...appNavBarScreenOptions, title: t('vehicles.nav.serviceRecord', null, 'Service Record') }}
        />
        <Stack.Screen
          name="ServiceRecordServiceCenter"
          component={ServiceRecordServiceCenterScreen}
          options={{ ...appNavBarScreenOptions, title: 'Service center' }}
        />
        <Stack.Screen
          name="AddManualServiceCenter"
          component={AddManualServiceCenterScreen}
          options={{ ...appNavBarScreenOptions, title: 'Add service center' }}
        />
        <Stack.Screen
          name="MapLocationPicker"
          component={MapLocationPickerScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ManageVehicleServiceCenters"
          component={ManageVehicleServiceCentersScreen}
          options={{ ...appNavBarScreenOptions, title: 'Service center access' }}
        />
        <Stack.Screen
          name="AddObligationPayment"
          component={AddObligationPaymentScreen}
          options={{ ...appNavBarScreenOptions, title: t('vehicles.nav.obligation', null, 'Obligation') }}
        />
        <Stack.Screen
          name="CreateVehicle"
          component={CreateVehicleScreen}
          options={{ ...appNavBarScreenOptions, title: 'Add vehicle' }}
        />
        <Stack.Screen name="CreatePromotion" component={CreatePromotionScreen} options={{ title: 'Create Promotion' }}/>
        <Stack.Screen name="ShopRegisterClient" component={ShopRegisterClientScreen} options={{ title: 'Register Client' }}/>
        <Stack.Screen
          name="ChooseShop"
          component={ChooseShopScreen}
          options={{ ...appNavBarScreenOptions, title: 'Choose center' }}
        />
        <Stack.Screen
          name="AddPartnerServiceCenter"
          component={AddPartnerServiceCenterScreen}
          options={{ ...appNavBarScreenOptions, title: 'Add service center' }}
        />
        <Stack.Screen
          name="PartnerServiceCenters"
          component={PartnerServiceCentersScreen}
          options={{ headerShown: false, title: 'Explore Service Centers' }}
        />
        <Stack.Screen
          name="ClientActivity"
          component={ClientActivityScreen}
          options={{ ...appNavBarScreenOptions, title: 'Notifications' }}
        />
        <Stack.Screen
          name="OffersScreen"
          component={ClientActivityScreen}
          options={{ ...appNavBarScreenOptions, title: 'Notifications' }}
        />
        <Stack.Screen
          name="ClientNotifications"
          component={ClientActivityScreen}
          options={{ ...appNavBarScreenOptions, title: 'Notifications' }}
        />
        <Stack.Screen
          name="ClientServiceHistory"
          component={ClientServiceHistoryScreen}
          options={{ ...appNavBarScreenOptions, title: 'Service History' }}
        />
        <Stack.Screen
          name="ClientBookings"
          component={ClientDashboardPlaceholderScreen}
          options={{ ...appNavBarScreenOptions, title: 'Bookings' }}
        />
        <Stack.Screen
          name="ClientDocuments"
          component={ClientDashboardPlaceholderScreen}
          options={{ ...appNavBarScreenOptions, title: 'Documents' }}
        />
        <Stack.Screen
          name="PartnerBookings"
          component={ClientDashboardPlaceholderScreen}
          options={{ ...appNavBarScreenOptions, title: 'Bookings' }}
        />
        <Stack.Screen
          name="AuthorizedClients"
          component={AuthorizedClients}
          options={{ ...appNavBarScreenOptions, title: 'Clients' }}
        />
        <Stack.Screen
          name="ShopPromotions"
          component={ShopPromotions}
          options={{ ...appNavBarScreenOptions, title: 'Promotions' }}
        />
        <Stack.Screen
          name="RepairsList"
          component={RepairsList}
          options={{ ...appNavBarScreenOptions, title: 'Repairs' }}
        />
        <Stack.Screen
          name="NotificationsList"
          component={NotificationsList}
          options={{ ...appNavBarScreenOptions, title: 'Notifications' }}
        />
        <Stack.Screen
          name="ShopNotificationsScreen"
          component={NotificationsWithAppbar}
          options={{ ...appNavBarScreenOptions, title: 'Notifications' }}
        />
        <Stack.Screen
          name="ShopProfile"
          component={ShopProfileScreen}
          options={{ ...appNavBarScreenOptions, title: 'Profile' }}
        />
        <Stack.Screen
          name="ShopServiceMenu"
          component={ShopServiceMenuScreen}
          options={{ ...appNavBarScreenOptions, title: 'Price list' }}
        />
        <Stack.Screen
          name="ShopInvoicing"
          component={ShopInvoicingScreen}
          options={{ ...appNavBarScreenOptions, title: 'Invoicing' }}
        />
        <Stack.Screen
          name="ShopWarehouse"
          component={ShopWarehouseReceiveScreen}
          options={{ ...appNavBarScreenOptions, title: 'Warehouse' }}
        />
        <Stack.Screen
          name="ShopAnalytics"
          component={ShopAnalyticsScreen}
          options={{ ...appNavBarScreenOptions, title: t('erp.analytics.title') }}
        />
        <Stack.Screen
          name="ShopComplaints"
          component={ShopComplaintsScreen}
          options={{ ...appNavBarScreenOptions, title: t('erp.complaints.title') }}
        />
        <Stack.Screen
          name="ShopDocumentImports"
          component={ShopDocumentImportsScreen}
          options={{ ...appNavBarScreenOptions, title: t('erp.documentImports.title') }}
        />
        <Stack.Screen
          name="ShopDocumentImportDetail"
          component={ShopDocumentImportDetailScreen}
          options={{ ...appNavBarScreenOptions, title: t('erp.documentImports.detailTitle') }}
        />
        <Stack.Screen
          name="ShopWorkforce"
          component={ShopWorkforceScreen}
          options={{ ...appNavBarScreenOptions, title: t('erp.workforce.title') }}
        />
        <Stack.Screen
          name="ShopPurchaseOrders"
          component={ShopPurchaseOrdersScreen}
          options={{ ...appNavBarScreenOptions, title: t('erp.procurement.purchaseOrders') }}
        />
        <Stack.Screen
          name="ShopPurchaseOrderDetail"
          component={ShopPurchaseOrderDetailScreen}
          options={{ ...appNavBarScreenOptions, title: t('erp.procurement.poDetail') }}
        />
        <Stack.Screen
          name="ShopGoodsReceipt"
          component={ShopGoodsReceiptScreen}
          options={{ ...appNavBarScreenOptions, title: t('erp.procurement.goodsReceipt') }}
        />
        <Stack.Screen
          name="ShopStorageLocations"
          component={ShopStorageLocationsScreen}
          options={{ ...appNavBarScreenOptions, title: t('erp.procurement.storageLocations') }}
        />
        <Stack.Screen
          name="NetworkOrganization"
          component={NetworkOrganizationScreen}
          options={{ ...appNavBarScreenOptions, title: t('network.organization.title') }}
        />
        <Stack.Screen
          name="NetworkRoles"
          component={NetworkRolesScreen}
          options={{ ...appNavBarScreenOptions, title: t('network.roles.title') }}
        />
        <Stack.Screen
          name="NetworkPartners"
          component={NetworkPartnersScreen}
          options={{ ...appNavBarScreenOptions, title: t('network.partners.title') }}
        />
        <Stack.Screen
          name="NetworkInvitePartner"
          component={NetworkInvitePartnerScreen}
          options={{ ...appNavBarScreenOptions, title: t('network.invite.title') }}
        />
        <Stack.Screen
          name="NetworkIncomingOrders"
          component={NetworkIncomingOrdersScreen}
          options={{ ...appNavBarScreenOptions, title: t('network.incomingOrders.title') }}
        />
        <Stack.Screen
          name="NetworkIncomingOrderDetail"
          component={NetworkIncomingOrderDetailScreen}
          options={{ ...appNavBarScreenOptions, title: t('network.incomingOrders.detailTitle') }}
        />
        <Stack.Screen
          name="NetworkProductMapping"
          component={NetworkProductMappingScreen}
          options={{ ...appNavBarScreenOptions, title: t('network.mapping.title') }}
        />
        <Stack.Screen
          name="NetworkPackaging"
          component={NetworkPackagingScreen}
          options={{ ...appNavBarScreenOptions, title: t('network.packaging.title') }}
        />
        <Stack.Screen
          name="NetworkClaimsList"
          component={NetworkClaimsListScreen}
          options={{ ...appNavBarScreenOptions, title: t('network.claims.myClaims') }}
        />
        <Stack.Screen
          name="NetworkClaimCreate"
          component={NetworkClaimCreateScreen}
          options={{ ...appNavBarScreenOptions, title: t('network.claims.create') }}
        />
        <Stack.Screen
          name="NetworkClaimDetail"
          component={NetworkClaimDetailScreen}
          options={{ ...appNavBarScreenOptions, title: t('network.claims.detail') }}
        />
        <Stack.Screen
          name="NetworkIncomingClaims"
          component={NetworkIncomingClaimsScreen}
          options={{ ...appNavBarScreenOptions, title: t('network.claims.incoming') }}
        />
        <Stack.Screen
          name="ShopInvoiceDetail"
          component={ShopInvoiceDetailScreen}
          options={{
            title: 'Invoice',
            headerBackTitle: 'Back',
            headerBackTitleVisible: true,
          }}
        />
        
        <Stack.Screen name="AddShopPartScreen" component={AddShopPartScreen} options={{ title: 'Add Parts to Inventory' }}/>
        <Stack.Screen name="SelectRepairParts" component={SelectRepairPartsScreen} options={{ title: 'Select / Add Parts' }}/>
        <Stack.Screen name="CreateMasterPart" component={CreateMasterPartScreen} options={{ title: 'Add New Part to Catalog' }}/>
        <Stack.Screen
          name="ClientProfile"
          component={ClientProfileScreen}
          options={{ ...appNavBarScreenOptions, title: 'Profile' }}
        />
         <Stack.Screen name="OfferChat" component={OfferChatScreen} options={{ title: 'Details' }}/>
        <Stack.Screen name="RepairChat" component={RepairChatScreen} options={{ title: 'Details' }}/>
        {/* <Stack.Screen name="SelectPartsForCreate" component={SelectPartsForCreateScreen} />
        <Stack.Screen name="ManageRepairParts" component={ManageRepairPartsScreen} /> */}

        <Stack.Screen name="ClientLogRepair" component={ClientLogRepairScreen} options={{ title: 'Log Repair' }}/>
        <Stack.Screen
          name="ClientRequestRepair"
          component={ClientRequestRepairScreen}
          options={{
            title: 'Request Service',
            headerBackTitleVisible: false,
          }}
        />
        
        <Stack.Screen
          name="PasswordRequestReset"
          component={PasswordRequestResetScreen}
          options={authScreenOptions}
        />
        <Stack.Screen
          name="PasswordConfirmReset"
          component={PasswordConfirmResetScreen}
          options={authScreenOptions}
        />

        <Stack.Screen
          name="CreateOrUpdateOffer"
          component={CreateOrUpdateOfferScreen}
          options={{ title: 'Send or Update Offer' }}
        />
        <Stack.Screen
          name="SelectOfferParts"
          component={SelectOfferPartsScreen}
          options={{ headerShown: false }} // or true if you want default header
        />

      </Stack.Navigator>
    </NavigationContainer>
  );
}