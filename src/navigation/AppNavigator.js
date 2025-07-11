/**
 * PATH: src/navigation/AppNavigator.js
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from 'react-native-paper';

// Screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ClientVehiclesScreen from '../screens/ClientVehiclesScreen';
import ShopMapScreen from '../screens/ShopMapScreen';
import VehicleDetailScreen from '../screens/VehicleDetailScreen';
import ShopDetailScreen from '../screens/ShopDetailScreen';
import AuthLoadingScreen from '../screens/AuthLoadingScreen';
import PromotionDetailScreen from '../screens/PromotionDetailScreen';
import RepairDetailScreen from '../screens/RepairDetailScreen';
import ClientRepairsList from '../components/client/ClientRepairsList';
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

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const theme = useTheme();

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="AuthLoading"
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.primary },
          headerTintColor: theme.colors.onPrimary,
          headerTitleStyle: { color: theme.colors.onPrimary },
        }}
      >
        <Stack.Screen name="AuthLoading" component={AuthLoadingScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Login" component={LoginScreen} options={{ title: '' }}/>
        <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Sign Up' }}/>
        <Stack.Screen name="Home" component={HomeDrawer} options={{ headerShown: false }} />
        <Stack.Screen name="ShopHome" component={ShopDrawer} options={{ headerShown: false, title: 'Home' }} />

        <Stack.Screen name="ShopMap" component={ShopMapScreen} options={{ title: 'Find Shops on Map' }} />
        <Stack.Screen name="ClientVehicles" component={ClientVehiclesScreen} options={{ title: 'My Vehicles' }}/>
        <Stack.Screen name="VehicleDetail" component={VehicleDetailScreen} options={{ title: 'Vehicle Details' }}/> 
        <Stack.Screen name="ShopDetail" component={ShopDetailScreen} options={{ title: 'Shop Details' }}/>
        <Stack.Screen name="PromotionDetail" component={PromotionDetailScreen} options={{ title: 'Promotion Details' }}/>
        <Stack.Screen name="RepairDetail" component={RepairDetailScreen} options={{ title: 'Repair Details' }}/>
        <Stack.Screen name="ClientRepairs" component={ClientRepairsList} options={{ title: 'Repairs' }}/>
        <Stack.Screen name="CreateRepair" component={CreateRepairScreen} options={{ title: 'Create Repair' }}/>
        <Stack.Screen name="CreateVehicle" component={CreateVehicleScreen} options={{ title: 'Create Vehicle' }}/>
        <Stack.Screen name="CreatePromotion" component={CreatePromotionScreen} options={{ title: 'Create Promotion' }}/>
        <Stack.Screen name="ShopRegisterClient" component={ShopRegisterClientScreen} options={{ title: 'Register Client' }}/>
        <Stack.Screen name="ChooseShop" component={ChooseShopScreen} options={{ title: '' }}/>
        <Stack.Screen name="OffersScreen" component={OffersScreen} options={{ title: 'Offers' }}/>
        <Stack.Screen name="AuthorizedClients" component={AuthorizedClients} options={{ title: 'Authorized Clients' }}/>
        <Stack.Screen name="ShopPromotions" component={ShopPromotions} options={{ title: 'Promotions' }}/>
        <Stack.Screen name="RepairsList" component={RepairsList} options={{ title: 'Repairs' }}/>
        <Stack.Screen name="NotificationsList" component={NotificationsList} options={{ title: 'Notifications' }}/>
        <Stack.Screen
          name="ShopNotificationsScreen"
          component={NotificationsWithAppbar}
          options={{
            title: 'Notifications',
            headerBackTitle: 'Back',
          }}
        />
        <Stack.Screen name="ShopProfile" component={ShopProfileScreen} options={{ title: 'Profile' }}/>
        <Stack.Screen
          name="ClientProfile"
          component={ClientProfileScreen}
          options={{
            title: 'Profile',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}