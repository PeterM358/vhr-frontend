/**
 * PATH: src/navigation/AppNavigator.js
 */

import React, { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { NavigationContainer, getPathFromState } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBackHeaderLeft } from '../components/navigation/BackHeaderButton';

// Screens
import LoginScreen from '../screens/LoginScreen';
import LoginErrorBoundary from '../components/auth/LoginErrorBoundary';
import { resetToPublicHome } from './authNavigation';
import RegisterScreen from '../screens/RegisterScreen';
import PublicHomeScreen from '../screens/PublicHomeScreen';
import PublicSeoPageScreen from '../screens/PublicSeoPageScreen';
import ClientVehiclesScreen from '../screens/ClientVehiclesScreen';
import ShopMapScreen from '../screens/ShopMapScreen';
import VehicleDetailScreen from '../screens/VehicleDetailScreen';
import VehicleSpecsScreen from '../screens/VehicleSpecsScreen';
import EditVehicleDetailsScreen from '../screens/EditVehicleDetailsScreen';
import ShopDetailScreen from '../screens/ShopDetailScreen';
import AuthLoadingScreen from '../screens/AuthLoadingScreen';
import PromotionDetailScreen from '../screens/PromotionDetailScreen';
import ClientRepairsList from '../components/client/ClientRepairsList';
import RepairDetailScreen from '../screens/RepairDetailScreen';
import CreateRepairScreen from '../screens/CreateRepairScreen';
import LogServiceRecordScreen from '../screens/LogServiceRecordScreen';
import ServiceRecordServiceCenterScreen from '../screens/ServiceRecordServiceCenterScreen';
import MapLocationPickerScreen from '../screens/MapLocationPickerScreen';
import AddManualServiceCenterScreen from '../screens/AddManualServiceCenterScreen';
import ManageVehicleServiceCentersScreen from '../screens/ManageVehicleServiceCentersScreen';
import AddObligationPaymentScreen from '../screens/AddObligationPaymentScreen';
import CreateVehicleScreen from '../screens/CreateVehicleScreen';
import CreatePromotionScreen from '../screens/CreatePromotionScreen';
import ShopRegisterClientScreen from '../screens/ShopRegisterClientScreen';
import ChooseShopScreen from '../screens/ChooseShopScreen';
import ClientActivityScreen from '../screens/ClientActivityScreen';
import ClientServiceHistoryScreen from '../screens/ClientServiceHistoryScreen';
import ClientDashboardPlaceholderScreen from '../screens/ClientDashboardPlaceholderScreen';

import AuthorizedClients from '../components/shop/AuthorizedClients';
import ShopPromotions from '../components/shop/ShopPromotions';
import NotificationsList from '../components/shop/NotificationsList';
import RepairsList from '../components/shop/RepairsList';

import ShopDrawer from './ShopDrawer';
import HomeDrawer from './HomeDrawer';
import NotificationsWithAppbar from '../components/shop/NotificationsWithAppbar';

import ShopProfileScreen from '../screens/ShopProfileScreen';
import ShopServiceMenuScreen from '../screens/ShopServiceMenuScreen';
import ShopInvoicingScreen from '../screens/ShopInvoicingScreen';
import ShopWarehouseReceiveScreen from '../screens/ShopWarehouseReceiveScreen';
import ShopInvoiceDetailScreen from '../screens/ShopInvoiceDetailScreen';
import ClientProfileScreen from '../screens/ClientProfileScreen';
import AddShopPartScreen from '../screens/AddShopPartScreen';

import SelectRepairPartsScreen from '../screens/SelectRepairPartsScreen';
import CreateMasterPartScreen from '../screens/CreateMasterPartScreen';
import RepairChatScreen from '../screens/RepairChatScreen';

// import SelectPartsForCreateScreen from '../screens/SelectPartsForCreateScreen';
// import ManageRepairPartsScreen from '../screens/ManageRepairPartsScreen';


import ClientLogRepairScreen from '../screens/ClientLogRepairScreen';
import ClientRequestRepairScreen from '../screens/ClientRequestRepairScreen';

import OfferChatScreen from '../screens/OfferChatScreen';
import CreateOrUpdateOfferScreen from '../screens/CreateOrUpdateOfferScreen';
import SelectOfferPartsScreen from '../screens/SelectOfferPartsScreen';


import PasswordRequestResetScreen from '../screens/PasswordRequestResetScreen';
import PasswordConfirmResetScreen from '../screens/PasswordConfirmResetScreen';

import { buildAppLinking, redirectLegacyWebUrl, collapseDuplicateVehiclePath, getCanonicalWebPath } from './webLinking';
import { linkingConfig } from './linkingConfig';
import { syncWebPath } from './authNavigation';
import { normalizeWebPath } from './webRoutes';
import { syncWebDocumentTitle } from './webDocumentTitle';
import { blurActiveElementOnWeb } from '../utils/webFocus';
import NavigationFallback from './NavigationFallback';
import { navigateToDashboard, navigateToVehicleDetail, navigateToVehicleList, navigateToVehicleServiceRecordNew, navigateToVehicleServiceRecordCenter } from './webNavigation';

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
  return drawerHeaderLeft(navigation, 'ShopHome', 'Home');
}

function vehicleDetailsHeaderLeft(navigation) {
  return createBackHeaderLeft({
    onPress: () => navigateToVehicleList(navigation),
    label: 'My Vehicles',
    accessibilityLabel: 'Back to my vehicles',
  });
}

function vehicleSpecsHeaderLeft(navigation, vehicleId) {
  return createBackHeaderLeft({
    onPress: () => navigateToVehicleDetail(navigation, vehicleId),
    label: 'Vehicle',
    accessibilityLabel: 'Back to vehicle details',
  });
}

function logServiceRecordHeaderLeft(navigation, vehicleId) {
  return createBackHeaderLeft({
    onPress: () => navigateToVehicleDetail(navigation, vehicleId),
    label: 'Vehicle',
    accessibilityLabel: 'Back to vehicle details',
  });
}

function serviceRecordCenterHeaderLeft(navigation, vehicleId) {
  return createBackHeaderLeft({
    onPress: () => navigateToVehicleServiceRecordNew(navigation, vehicleId),
    label: 'Record',
    accessibilityLabel: 'Back to service record',
  });
}

function createVehicleHeaderLeft(navigation) {
  return createBackHeaderLeft({
    onPress: () => navigateToVehicleList(navigation),
    label: 'My Vehicles',
    accessibilityLabel: 'Back to my vehicles',
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

  useEffect(() => {
    redirectLegacyWebUrl();
  }, []);

  const handleNavigationStateChange = () => {
    if (Platform.OS === 'web') {
      blurActiveElementOnWeb();
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

  return (
    <NavigationContainer
      ref={navigationRef}
      linking={linking}
      fallback={<NavigationFallback />}
      documentTitle={{ enabled: false }}
      onReady={handleNavigationStateChange}
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
        <Stack.Screen
          name="Login"
          component={LoginScreenRoute}
          options={{ ...transparentStackHeader, title: 'Sign in', headerShown: Platform.OS === 'web' ? false : true }}
        />
        <Stack.Screen
          name="Register"
          component={RegisterScreen}
          options={{ ...transparentStackHeader, title: 'Create account' }}
        />
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
          options={({ navigation }) => ({
            ...transparentStackHeader,
            title: 'My Vehicles',
            headerLeft: homeHeaderLeft(navigation),
            headerBackVisible: false,
          })}
        />
        <Stack.Screen
          name="VehicleDetail"
          component={VehicleDetailScreen}
          options={({ navigation, route }) => {
            const backLabel = route.params?.backLabel;
            if (backLabel) {
              return {
                title: 'Vehicle Details',
                headerLeft: stackBackHeaderLeft(navigation, backLabel),
                headerBackVisible: false,
              };
            }
            return {
              title: 'Vehicle Details',
              headerLeft: vehicleDetailsHeaderLeft(navigation),
            };
          }}
        />
        <Stack.Screen
          name="VehicleSpecs"
          component={VehicleSpecsScreen}
          options={({ navigation, route }) => ({
            title: 'Vehicle specs',
            headerLeft: vehicleSpecsHeaderLeft(navigation, route.params?.vehicleId),
            headerBackVisible: false,
          })}
        />
        <Stack.Screen
          name="EditVehicleDetails"
          component={EditVehicleDetailsScreen}
          options={{ title: 'Technical details' }}
        />
        <Stack.Screen
          name="PublicSeoPage"
          component={PublicSeoPageScreen}
          options={{ title: 'Veversal' }}
        />
        <Stack.Screen
          name="ShopDetail"
          component={ShopDetailScreen}
          options={{ title: 'Service Center Details' }}
        />
        <Stack.Screen name="PromotionDetail" component={PromotionDetailScreen} options={{ title: 'Promotion Details' }}/>
        <Stack.Screen
          name="ClientRepairs"
          component={ClientRepairsList}
          options={({ navigation, route }) => {
            const fromVehicleDetail = !!route.params?.fromVehicleDetail;
            return {
              ...transparentStackHeader,
              title: fromVehicleDetail ? 'Vehicle Repairs' : 'Repair Requests',
              ...(fromVehicleDetail
                ? {}
                : { headerLeft: homeHeaderLeft(navigation), headerBackVisible: false }),
            };
          }}
        />
        <Stack.Screen
          name="RepairDetail"
          component={RepairDetailScreen}
          options={({ navigation, route }) => {
            const returnTo = route.params?.returnTo;
            const backLabel = route.params?.backLabel;
            if (returnTo === 'ClientActivity' || returnTo === 'ClientNotifications') {
              return {
                title: 'Repair',
                headerLeft: stackBackHeaderLeft(navigation, backLabel || 'Notifications'),
                headerBackVisible: false,
              };
            }
            if (returnTo === 'ClientRepairs' || returnTo === 'ClientServiceHistory') {
              return {
                title: 'Repair',
                headerLeft: stackBackHeaderLeft(navigation, backLabel || 'Dashboard'),
                headerBackVisible: false,
              };
            }
            if (returnTo === 'ShopCalendar') {
              return {
                title: 'Repair',
                headerLeft: stackBackHeaderLeft(navigation, backLabel || 'Calendar'),
                headerBackVisible: false,
              };
            }
            return { title: 'Repair Details' };
          }}
        />
        <Stack.Screen name="CreateRepair" component={CreateRepairScreen} options={{ title: 'Request Service' }}/>
        <Stack.Screen
          name="LogServiceRecord"
          component={LogServiceRecordScreen}
          options={({ navigation, route }) => ({
            title: 'Add Service Record',
            headerLeft: logServiceRecordHeaderLeft(navigation, route.params?.vehicleId),
            headerBackVisible: false,
          })}
        />
        <Stack.Screen
          name="ServiceRecordServiceCenter"
          component={ServiceRecordServiceCenterScreen}
          options={({ navigation, route }) => ({
            title: 'Service center',
            headerLeft: serviceRecordCenterHeaderLeft(navigation, route.params?.vehicleId),
            headerBackVisible: false,
          })}
        />
        <Stack.Screen
          name="AddManualServiceCenter"
          component={AddManualServiceCenterScreen}
          options={({ navigation, route }) => ({
            title: 'Add service center',
            headerLeft: serviceRecordCenterHeaderLeft(navigation, route.params?.vehicleId),
            headerBackVisible: false,
          })}
        />
        <Stack.Screen
          name="MapLocationPicker"
          component={MapLocationPickerScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ManageVehicleServiceCenters"
          component={ManageVehicleServiceCentersScreen}
          options={{ title: 'Service center access' }}
        />
        <Stack.Screen
          name="AddObligationPayment"
          component={AddObligationPaymentScreen}
          options={{ title: 'Add Obligation / Payment' }}
        />
        <Stack.Screen
          name="CreateVehicle"
          component={CreateVehicleScreen}
          options={({ navigation }) => ({
            title: 'Add vehicle',
            headerLeft: createVehicleHeaderLeft(navigation),
            headerBackVisible: false,
          })}
        />
        <Stack.Screen name="CreatePromotion" component={CreatePromotionScreen} options={{ title: 'Create Promotion' }}/>
        <Stack.Screen name="ShopRegisterClient" component={ShopRegisterClientScreen} options={{ title: 'Register Client' }}/>
        <Stack.Screen
          name="ChooseShop"
          component={ChooseShopScreen}
          options={({ navigation }) => ({
            title: '',
            headerLeft: shopHomeHeaderLeft(navigation),
            headerBackVisible: false,
          })}
        />
        <Stack.Screen
          name="ClientActivity"
          component={ClientActivityScreen}
          options={{ headerShown: false, title: 'Notifications' }}
        />
        <Stack.Screen
          name="OffersScreen"
          component={ClientActivityScreen}
          options={{ headerShown: false, title: 'Notifications' }}
        />
        <Stack.Screen
          name="ClientNotifications"
          component={ClientActivityScreen}
          options={{ headerShown: false, title: 'Notifications' }}
        />
        <Stack.Screen
          name="ClientServiceHistory"
          component={ClientServiceHistoryScreen}
          options={({ navigation }) => ({
            ...transparentStackHeader,
            title: 'Service History',
            headerLeft: homeHeaderLeft(navigation),
            headerBackVisible: false,
          })}
        />
        <Stack.Screen
          name="ClientBookings"
          component={ClientDashboardPlaceholderScreen}
          options={({ navigation }) => ({
            ...transparentStackHeader,
            title: 'Bookings',
            headerLeft: homeHeaderLeft(navigation),
            headerBackVisible: false,
          })}
        />
        <Stack.Screen
          name="ClientDocuments"
          component={ClientDashboardPlaceholderScreen}
          options={({ navigation }) => ({
            ...transparentStackHeader,
            title: 'Documents',
            headerLeft: homeHeaderLeft(navigation),
            headerBackVisible: false,
          })}
        />
        <Stack.Screen
          name="AuthorizedClients"
          component={AuthorizedClients}
          options={({ navigation }) => ({
            title: 'Authorized Clients',
            headerLeft: shopHomeHeaderLeft(navigation),
            headerBackVisible: false,
          })}
        />
        <Stack.Screen
          name="ShopPromotions"
          component={ShopPromotions}
          options={({ navigation }) => ({
            title: 'Promotions',
            headerLeft: shopHomeHeaderLeft(navigation),
            headerBackVisible: false,
          })}
        />
        <Stack.Screen name="RepairsList" component={RepairsList} options={{ title: 'Repairs' }}/>
        <Stack.Screen
          name="NotificationsList"
          component={NotificationsList}
          options={({ navigation }) => ({
            title: 'Notifications',
            headerLeft: shopHomeHeaderLeft(navigation),
            headerBackVisible: false,
          })}
        />
        <Stack.Screen
          name="ShopNotificationsScreen"
          component={NotificationsWithAppbar}
          options={{
            ...transparentStackHeader,
            title: 'Notifications',
            headerBackTitle: 'Back',
            headerBackTitleVisible: true,
          }}
        />
        <Stack.Screen
          name="ShopProfile"
          component={ShopProfileScreen}
          options={({ navigation }) => ({
            title: 'Profile',
            headerLeft: shopHomeHeaderLeft(navigation),
            headerBackVisible: false,
          })}
        />
        <Stack.Screen
          name="ShopServiceMenu"
          component={ShopServiceMenuScreen}
          options={({ navigation }) => ({
            title: 'Price list',
            headerLeft: shopHomeHeaderLeft(navigation),
            headerBackVisible: false,
          })}
        />
        <Stack.Screen
          name="ShopInvoicing"
          component={ShopInvoicingScreen}
          options={({ navigation }) => ({
            title: 'Invoicing',
            headerLeft: shopHomeHeaderLeft(navigation),
            headerBackVisible: false,
          })}
        />
        <Stack.Screen
          name="ShopWarehouse"
          component={ShopWarehouseReceiveScreen}
          options={({ navigation }) => ({
            title: 'Warehouse',
            headerLeft: shopHomeHeaderLeft(navigation),
            headerBackVisible: false,
          })}
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
          options={({ navigation }) => ({
            title: 'Profile',
            headerLeft: homeHeaderLeft(navigation),
            headerBackVisible: false,
          })}
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
          options={{ ...transparentStackHeader, title: 'Reset Password' }}
        />
        <Stack.Screen
          name="PasswordConfirmReset"
          component={PasswordConfirmResetScreen}
          options={{ ...transparentStackHeader, title: 'New Password' }}
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