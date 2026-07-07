/**
 * PATH: src/navigation/HomeDrawer.js
 */

import React, { useContext } from 'react';
import { View } from 'react-native';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { useNavigation } from '@react-navigation/native';
import { Text } from 'react-native-paper';
import HomeScreen from '../screens/HomeScreen';
import { WebSocketContext } from '../context/WebSocketManager';
import { AuthContext } from '../context/AuthManager';
import { logout } from '../api/auth';
import { openServiceCenters } from './serviceCentersNavigation';
import {
  navigateToNotifications,
  navigateToProfile,
  navigateToRepairRequests,
  navigateToVehicleList,
} from './webNavigation';
import {
  DrawerMenuIcon,
  DrawerLabelWithBadge,
  DrawerVeversalLogoFooter,
  drawerGlassStyles,
  drawerScreenOptions,
  DRAWER_TINT,
} from './DrawerBranding';

const Drawer = createDrawerNavigator();

function CustomDrawerContent(props) {
  const navigation = useNavigation();
  const { notifications } = useContext(WebSocketContext);
  const { setAuthToken, setIsAuthenticated, setUserEmailOrPhone } = useContext(AuthContext);

  const unreadNotifications = notifications.filter((n) => !n.is_read).length;

  const handleLogout = async () => {
    await logout(navigation, setAuthToken, setIsAuthenticated, setUserEmailOrPhone);
  };

  const itemProps = {
    labelStyle: drawerGlassStyles.itemLabel,
    activeTintColor: DRAWER_TINT.active,
    inactiveTintColor: DRAWER_TINT.inactive,
    activeBackgroundColor: DRAWER_TINT.activeBackground,
    inactiveBackgroundColor: 'transparent',
    style: drawerGlassStyles.drawerItem,
  };

  return (
    <DrawerContentScrollView
      {...props}
      style={drawerGlassStyles.scrollView}
      contentContainerStyle={drawerGlassStyles.container}
    >
      <View style={drawerGlassStyles.menuContainer}>
        <Text style={drawerGlassStyles.drawerTitle}>Menu</Text>

        <DrawerItem
          label="Home"
          onPress={() => props.navigation.closeDrawer()}
          icon={({ color, size }) => <DrawerMenuIcon name="home-outline" color={color} size={size} />}
          {...itemProps}
        />

        <DrawerItem
          label="Profile"
          onPress={() => {
            const root = navigation.getParent?.() || navigation;
            navigateToProfile(root);
          }}
          icon={({ color, size }) => (
            <DrawerMenuIcon name="account-circle-outline" color={color} size={size} />
          )}
          {...itemProps}
        />

        <DrawerItem
          label="Repairs"
          onPress={() => {
            const root = navigation.getParent?.() || navigation;
            navigateToRepairRequests(root);
          }}
          icon={({ color, size }) => <DrawerMenuIcon name="wrench-outline" color={color} size={size} />}
          {...itemProps}
        />

        <DrawerItem
          label="Vehicles"
          onPress={() => {
            const root = navigation.getParent?.() || navigation;
            navigateToVehicleList(root);
          }}
          icon={({ color, size }) => <DrawerMenuIcon name="car-outline" color={color} size={size} />}
          {...itemProps}
        />

        <DrawerItem
          label={() => (
            <DrawerLabelWithBadge label="Notifications" badge={unreadNotifications} />
          )}
          onPress={() => {
            const root = navigation.getParent?.() || navigation;
            navigateToNotifications(root);
          }}
          icon={({ color, size }) => <DrawerMenuIcon name="bell-outline" color={color} size={size} />}
          {...itemProps}
        />

        <DrawerItem
          label="Find Service Centers"
          onPress={() => openServiceCenters(navigation)}
          icon={({ color, size }) => (
            <DrawerMenuIcon name="map-marker-radius" color={color} size={size} />
          )}
          {...itemProps}
        />

        <View style={drawerGlassStyles.divider} />

        <DrawerItem
          label="Logout"
          onPress={handleLogout}
          icon={({ color, size }) => <DrawerMenuIcon name="logout" color={color} size={size} />}
          {...itemProps}
        />
      </View>

      <DrawerVeversalLogoFooter />
    </DrawerContentScrollView>
  );
}

export default function HomeDrawer() {
  return (
    <Drawer.Navigator
      screenOptions={{
        ...drawerScreenOptions,
        drawerLabelStyle: drawerGlassStyles.itemLabel,
        drawerItemStyle: drawerGlassStyles.drawerItem,
      }}
      drawerContent={(props) => <CustomDrawerContent {...props} />}
    >
      <Drawer.Screen name="HomeMain" component={HomeScreen} />
    </Drawer.Navigator>
  );
}
