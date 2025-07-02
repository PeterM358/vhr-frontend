import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Screens
import HomeScreen from '../screens/HomeScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ClientVehiclesScreen from '../screens/ClientVehiclesScreen';
import ShopRepairsScreen from '../screens/ShopRepairsScreen';
import ShopMapScreen from '../screens/ShopMapScreen';
import VehicleDetailScreen from '../screens/VehicleDetailScreen';
import ShopListScreen from '../screens/ShopListScreen';
import ShopDetailScreen from '../screens/ShopDetailScreen';
import ShopHomeScreen from '../screens/ShopHomeScreen';
import AuthLoadingScreen from '../screens/AuthLoadingScreen';
import PromotionDetailScreen from '../screens/PromotionDetailScreen';
import RepairDetailScreen from '../screens/RepairDetailScreen';
import ClientRepairsList from '../components/client/ClientRepairsList';
import CreateRepairScreen from '../screens/CreateRepairScreen';
import CreateVehicleScreen from '../screens/CreateVehicleScreen';
import CreatePromotionScreen from '../screens/CreatePromotionScreen';
import ShopRegisterClientScreen from '../screens/ShopRegisterClientScreen';

// ✅ THIS LINE is what was missing
const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="AuthLoading">
        <Stack.Screen name="AuthLoading" component={AuthLoadingScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="ShopHome" component={ShopHomeScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="ClientVehicles" component={ClientVehiclesScreen} />
        <Stack.Screen name="ShopRepairs" component={ShopRepairsScreen} />
        <Stack.Screen name="ShopMap" component={ShopMapScreen} />
        <Stack.Screen name="VehicleDetail" component={VehicleDetailScreen} options={{ title: 'Vehicle Details' }}/> 
        <Stack.Screen name="ShopList" component={ShopListScreen} />
        <Stack.Screen name="ShopDetail" component={ShopDetailScreen} />
        <Stack.Screen name="PromotionDetail" component={PromotionDetailScreen} options={{ title: 'Promotion Details' }}/>
        <Stack.Screen name="RepairDetail" component={RepairDetailScreen} options={{ title: 'Repair Details' }}/>
        <Stack.Screen name="ClientRepairs" component={ClientRepairsList} />
        <Stack.Screen name="CreateRepair" component={CreateRepairScreen} />
        <Stack.Screen name="CreateVehicle" component={CreateVehicleScreen} />
        <Stack.Screen name="CreatePromotion" component={CreatePromotionScreen} />
        <Stack.Screen name="ShopRegisterClient" component={ShopRegisterClientScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}