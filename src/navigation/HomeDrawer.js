/**
 * PATH: src/navigation/HomeDrawer.js
 */

import React, { useContext } from 'react';
import { View, StyleSheet } from 'react-native';
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
} from './DrawerBranding';
import { COLORS } from '../constants/colors';

const Drawer = createDrawerNavigator();

function CustomDrawerContent(props) {
  const navigation = useNavigation();
  const { notifications } = useContext(WebSocketContext);
  const { setAuthToken, setIsAuthenticated, setUserEmailOrPhone } = useContext(AuthContext);

  const unreadNotifications = notifications.filter((n) => !n.is_read).length;

  const handleLogout = async () => {
    await logout(navigation, setAuthToken, setIsAuthenticated, setUserEmailOrPhone);
  };

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={styles.drawerContainer}
    >
      <View style={styles.menuContainer}>
        <Text style={styles.drawerTitle}>Menu</Text>

        <DrawerItem
          label="Home"
          onPress={() => props.navigation.closeDrawer()}
          icon={({ color, size }) => <DrawerMenuIcon name="home-outline" color={color} size={size} />}
          labelStyle={styles.itemLabel}
          activeTintColor={COLORS.PRIMARY}
          inactiveTintColor={COLORS.TEXT_DARK}
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
          labelStyle={styles.itemLabel}
          activeTintColor={COLORS.PRIMARY}
          inactiveTintColor={COLORS.TEXT_DARK}
        />

        <DrawerItem
          label="Repairs"
          onPress={() => {
            const root = navigation.getParent?.() || navigation;
            navigateToRepairRequests(root);
          }}
          icon={({ color, size }) => <DrawerMenuIcon name="wrench-outline" color={color} size={size} />}
          labelStyle={styles.itemLabel}
          activeTintColor={COLORS.PRIMARY}
          inactiveTintColor={COLORS.TEXT_DARK}
        />

        <DrawerItem
          label="Vehicles"
          onPress={() => {
            const root = navigation.getParent?.() || navigation;
            navigateToVehicleList(root);
          }}
          icon={({ color, size }) => <DrawerMenuIcon name="car-outline" color={color} size={size} />}
          labelStyle={styles.itemLabel}
          activeTintColor={COLORS.PRIMARY}
          inactiveTintColor={COLORS.TEXT_DARK}
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
          labelStyle={styles.itemLabel}
          activeTintColor={COLORS.PRIMARY}
          inactiveTintColor={COLORS.TEXT_DARK}
        />

        <DrawerItem
          label="Find Service Centers"
          onPress={() => openServiceCenters(navigation)}
          icon={({ color, size }) => (
            <DrawerMenuIcon name="map-marker-radius" color={color} size={size} />
          )}
          labelStyle={styles.itemLabel}
          activeTintColor={COLORS.PRIMARY}
          inactiveTintColor={COLORS.TEXT_DARK}
        />

        <View style={styles.divider} />

        <DrawerItem
          label="Logout"
          onPress={handleLogout}
          icon={({ color, size }) => <DrawerMenuIcon name="logout" color={color} size={size} />}
          labelStyle={styles.itemLabel}
          activeTintColor={COLORS.PRIMARY}
          inactiveTintColor={COLORS.TEXT_DARK}
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
        headerShown: false,
        drawerActiveTintColor: COLORS.PRIMARY,
        drawerInactiveTintColor: COLORS.TEXT_DARK,
        drawerLabelStyle: styles.itemLabel,
        drawerItemStyle: styles.drawerItem,
      }}
      drawerContent={(props) => <CustomDrawerContent {...props} />}
    >
      <Drawer.Screen name="HomeMain" component={HomeScreen} />
    </Drawer.Navigator>
  );
}

const styles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 36,
    paddingBottom: 16,
  },
  menuContainer: {
    flexGrow: 1,
  },
  drawerTitle: {
    marginLeft: 20,
    marginBottom: 12,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: COLORS.TEXT_MUTED,
  },
  itemLabel: {
    fontSize: 15,
    fontWeight: '500',
    marginLeft: -8,
  },
  drawerItem: {
    marginHorizontal: 8,
    borderRadius: 10,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(15,23,42,0.1)',
    marginVertical: 8,
    marginHorizontal: 20,
  },
});
