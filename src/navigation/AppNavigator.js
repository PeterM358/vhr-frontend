/**
 * PATH: src/navigation/AppNavigator.js
 */

import React from 'react';
import { Platform, Pressable, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

// Screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import PublicHomeScreen from '../screens/PublicHomeScreen';
import ClientVehiclesScreen from '../screens/ClientVehiclesScreen';
import ShopMapScreen from '../screens/ShopMapScreen';
import VehicleDetailScreen from '../screens/VehicleDetailScreen';
import EditVehicleDetailsScreen from '../screens/EditVehicleDetailsScreen';
import ShopDetailScreen from '../screens/ShopDetailScreen';
import AuthLoadingScreen from '../screens/AuthLoadingScreen';
import PromotionDetailScreen from '../screens/PromotionDetailScreen';
import ClientRepairsList from '../components/client/ClientRepairsList';
import RepairDetailScreen from '../screens/RepairDetailScreen';
import CreateRepairScreen from '../screens/CreateRepairScreen';
import CreateVehicleScreen from '../screens/CreateVehicleScreen';
import CreatePromotionScreen from '../screens/CreatePromotionScreen';
import ShopRegisterClientScreen from '../screens/ShopRegisterClientScreen';
import ChooseShopScreen from '../screens/ChooseShopScreen';
import OffersScreen from '../screens/OffersScreen';

import AuthorizedClients from '../components/shop/AuthorizedClients';
import ShopPromotions from '../components/shop/ShopPromotions';
import NotificationsList from '../components/shop/NotificationsList';
import RepairsList from '../components/shop/RepairsList';

import ShopDrawer from './ShopDrawer';
import HomeDrawer from './HomeDrawer';
import NotificationsWithAppbar from '../components/shop/NotificationsWithAppbar';

import ShopProfileScreen from '../screens/ShopProfileScreen';
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


const Stack = createNativeStackNavigator();

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

/** Large hit target + label; avoids tiny default back control on Android with transparent headers. */
function homeHeaderLeft(navigation) {
  return () => (
    <Pressable
      onPress={() => {
        if (navigation.canGoBack()) {
          navigation.goBack();
          return;
        }
        navigation.navigate('Home');
      }}
      accessibilityRole="button"
      accessibilityLabel="Back"
      hitSlop={{ top: 18, bottom: 18, left: 10, right: 10 }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: Platform.OS === 'android' ? 52 : 44,
        paddingVertical: 8,
        paddingRight: 10,
        paddingLeft: Platform.OS === 'android' ? 4 : 0,
      }}
    >
      <MaterialCommunityIcons name="chevron-left" size={26} color="#fff" />
      <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600', marginLeft: 2 }}>Back</Text>
    </Pressable>
  );
}

export default function AppNavigator() {
  // Deep linking configuration
  const linking = {
    prefixes: ['service1001://'],
    config: {
      screens: {
        PasswordConfirmReset: 'reset-password/:uid/:token',
      },
    },
  };

  return (
    <NavigationContainer linking={linking}>
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
          component={LoginScreen}
          options={{ ...transparentStackHeader, title: '' }}
        />
        <Stack.Screen
          name="Register"
          component={RegisterScreen}
          options={{ ...transparentStackHeader, title: 'Sign Up' }}
        />
        <Stack.Screen name="Home" component={HomeDrawer} options={{ headerShown: false }} />
        <Stack.Screen name="ShopHome" component={ShopDrawer} options={{ headerShown: false, title: 'Home' }} />

        <Stack.Screen
          name="ShopMap"
          component={ShopMapScreen}
          options={{ headerShown: false, title: 'Find Shops on Map' }}
        />
        <Stack.Screen
          name="ClientVehicles"
          component={ClientVehiclesScreen}
          options={({ navigation }) => ({
            ...transparentStackHeader,
            title: 'My Vehicles',
            headerLeft: homeHeaderLeft(navigation),
          })}
        />
        <Stack.Screen name="VehicleDetail" component={VehicleDetailScreen} options={{ title: 'Vehicle Details' }}/> 
        <Stack.Screen
          name="EditVehicleDetails"
          component={EditVehicleDetailsScreen}
          options={{ title: 'Technical details' }}
        />
        <Stack.Screen
          name="ShopDetail"
          component={ShopDetailScreen}
          options={{ title: 'Service Details' }}
        />
        <Stack.Screen name="PromotionDetail" component={PromotionDetailScreen} options={{ title: 'Promotion Details' }}/>
        <Stack.Screen
          name="ClientRepairs"
          component={ClientRepairsList}
          options={({ navigation, route }) => {
            const fromVehicleDetail = !!route.params?.fromVehicleDetail;
            return {
              ...transparentStackHeader,
              title: fromVehicleDetail ? 'Vehicle Repairs' : 'Repairs',
              ...(fromVehicleDetail ? {} : { headerLeft: homeHeaderLeft(navigation) }),
            };
          }}
        />
        <Stack.Screen name="RepairDetail" component={RepairDetailScreen} options={{ title: 'Repair Details' }}/>
        <Stack.Screen name="CreateRepair" component={CreateRepairScreen} options={{ title: 'Request Service' }}/>
        <Stack.Screen name="CreateVehicle" component={CreateVehicleScreen} options={{ title: 'Create Vehicle' }}/>
        <Stack.Screen name="CreatePromotion" component={CreatePromotionScreen} options={{ title: 'Create Promotion' }}/>
        <Stack.Screen name="ShopRegisterClient" component={ShopRegisterClientScreen} options={{ title: 'Register Client' }}/>
        <Stack.Screen name="ChooseShop" component={ChooseShopScreen} options={{ title: '' }}/>
        <Stack.Screen
          name="OffersScreen"
          component={OffersScreen}
          options={{ headerShown: false, title: 'Offers' }}
        />
        <Stack.Screen name="AuthorizedClients" component={AuthorizedClients} options={{ title: 'Authorized Clients' }}/>
        <Stack.Screen name="ShopPromotions" component={ShopPromotions} options={{ title: 'Promotions' }}/>
        <Stack.Screen name="RepairsList" component={RepairsList} options={{ title: 'Repairs' }}/>
        <Stack.Screen name="NotificationsList" component={NotificationsList} options={{ title: 'Notifications' }}/>
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
        <Stack.Screen name="ShopProfile" component={ShopProfileScreen} options={{ title: 'Profile' }}/>
        
        <Stack.Screen name="AddShopPartScreen" component={AddShopPartScreen} options={{ title: 'Add Parts to Inventory' }}/>
        <Stack.Screen name="SelectRepairParts" component={SelectRepairPartsScreen} options={{ title: 'Select / Add Parts' }}/>
        <Stack.Screen name="CreateMasterPart" component={CreateMasterPartScreen} options={{ title: 'Add New Part to Catalog' }}/>
        <Stack.Screen
          name="ClientProfile"
          component={ClientProfileScreen}
          options={{
            title: 'Profile',
          }}
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