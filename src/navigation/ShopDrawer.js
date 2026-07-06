/**
 * PATH: src/navigation/ShopDrawer.js
 */

import React, { useContext, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Text } from 'react-native-paper';

import ShopHomeScreen from '../screens/ShopHomeScreen';
import ShopCalendarScreen from '../screens/ShopCalendarScreen';
import RepairsList from '../components/shop/RepairsList';
import AuthorizedClients from '../components/shop/AuthorizedClients';
import ShopPromotions from '../components/shop/ShopPromotions';
import NotificationsList from '../components/shop/NotificationsList';
import ChooseShopScreen from '../screens/ChooseShopScreen';
import ShopWarehouseHubScreen from '../screens/ShopWarehouseHubScreen';

import { WebSocketContext } from '../context/WebSocketManager';
import { AuthContext } from '../context/AuthManager';
import { logout } from '../api/auth';
import { resetFromShopDrawer, resetShopDrawerRepairs } from './drawerNavigation';
import {
  navigateToPartnerCalendar,
  navigateToPartnerClients,
  navigateToPartnerInvoicing,
  navigateToPartnerNotifications,
  navigateToPartnerProfile,
  navigateToPartnerPromotions,
  navigateToPartnerServiceCenters,
  navigateToPartnerServices,
  navigateToPartnerSwitchCenter,
  navigateToPartnerWarehouse,
} from './webNavigation';
import { readCachedUnscheduledCount } from '../utils/shopCalendarBadge';
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
  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const [unscheduledCount, setUnscheduledCount] = useState(0);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      (async () => {
        const count = await readCachedUnscheduledCount();
        if (active) setUnscheduledCount(count);
      })();
      return () => {
        active = false;
      };
    }, [])
  );

  const handleLogout = async () => {
    await logout(navigation, setAuthToken, setIsAuthenticated, setUserEmailOrPhone);
  };

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={styles.drawerContainer}
    >
      <View style={styles.menuContainer}>
        <Text style={styles.drawerTitle}>Partner menu</Text>

        <DrawerItem
          label="Home"
          onPress={() => props.navigation.closeDrawer()}
          icon={({ color, size }) => <DrawerMenuIcon name="home-outline" color={color} size={size} />}
          labelStyle={styles.itemLabel}
          activeTintColor={COLORS.PRIMARY}
          inactiveTintColor={COLORS.TEXT_DARK}
        />

        <DrawerItem
          label="Center details"
          onPress={() => {
            if (Platform.OS === 'web') {
              navigateToPartnerProfile(navigation);
            } else {
              resetFromShopDrawer(navigation, 'ShopProfile');
            }
          }}
          icon={({ color, size }) => <DrawerMenuIcon name="store-outline" color={color} size={size} />}
          labelStyle={styles.itemLabel}
          activeTintColor={COLORS.PRIMARY}
          inactiveTintColor={COLORS.TEXT_DARK}
        />

        <DrawerItem
          label={() => <DrawerLabelWithBadge label="Calendar" badge={unscheduledCount} />}
          onPress={() => {
            if (Platform.OS === 'web') {
              navigateToPartnerCalendar(navigation);
            } else {
              props.navigation.navigate('ShopCalendar', {
                returnTo: 'ShopDashboard',
                backLabel: 'Home',
              });
            }
            props.navigation.closeDrawer();
          }}
          icon={({ color, size }) => (
            <DrawerMenuIcon name="calendar-month-outline" color={color} size={size} />
          )}
          labelStyle={styles.itemLabel}
          activeTintColor={COLORS.PRIMARY}
          inactiveTintColor={COLORS.TEXT_DARK}
        />

        <DrawerItem
          label="Repairs"
          onPress={() => resetShopDrawerRepairs(navigation)}
          icon={({ color, size }) => <DrawerMenuIcon name="car-wrench" color={color} size={size} />}
          labelStyle={styles.itemLabel}
          activeTintColor={COLORS.PRIMARY}
          inactiveTintColor={COLORS.TEXT_DARK}
        />

        <DrawerItem
          label="Clients"
          onPress={() => {
            if (Platform.OS === 'web') {
              navigateToPartnerClients(navigation);
            } else {
              resetFromShopDrawer(navigation, 'AuthorizedClients');
            }
          }}
          icon={({ color, size }) => (
            <DrawerMenuIcon name="account-group-outline" color={color} size={size} />
          )}
          labelStyle={styles.itemLabel}
          activeTintColor={COLORS.PRIMARY}
          inactiveTintColor={COLORS.TEXT_DARK}
        />

        <DrawerItem
          label="Promotions"
          onPress={() => {
            if (Platform.OS === 'web') {
              navigateToPartnerPromotions(navigation);
            } else {
              resetFromShopDrawer(navigation, 'ShopPromotions');
            }
          }}
          icon={({ color, size }) => <DrawerMenuIcon name="tag-outline" color={color} size={size} />}
          labelStyle={styles.itemLabel}
          activeTintColor={COLORS.PRIMARY}
          inactiveTintColor={COLORS.TEXT_DARK}
        />

        <DrawerItem
          label="Warehouse"
          onPress={() => {
            if (Platform.OS === 'web') {
              navigateToPartnerWarehouse(navigation);
            } else {
              props.navigation.navigate('ShopWarehouse');
            }
            props.navigation.closeDrawer();
          }}
          icon={({ color, size }) => <DrawerMenuIcon name="warehouse" color={color} size={size} />}
          labelStyle={styles.itemLabel}
          activeTintColor={COLORS.PRIMARY}
          inactiveTintColor={COLORS.TEXT_DARK}
        />

        <DrawerItem
          label="Invoicing"
          onPress={() => {
            if (Platform.OS === 'web') {
              navigateToPartnerInvoicing(navigation);
            } else {
              resetFromShopDrawer(navigation, 'ShopInvoicing');
            }
          }}
          icon={({ color, size }) => (
            <DrawerMenuIcon name="receipt-text-outline" color={color} size={size} />
          )}
          labelStyle={styles.itemLabel}
          activeTintColor={COLORS.PRIMARY}
          inactiveTintColor={COLORS.TEXT_DARK}
        />

        <DrawerItem
          label="Price list"
          onPress={() => {
            if (Platform.OS === 'web') {
              navigateToPartnerServices(navigation);
            } else {
              resetFromShopDrawer(navigation, 'ShopServiceMenu');
            }
          }}
          icon={({ color, size }) => (
            <DrawerMenuIcon name="clipboard-list-outline" color={color} size={size} />
          )}
          labelStyle={styles.itemLabel}
          activeTintColor={COLORS.PRIMARY}
          inactiveTintColor={COLORS.TEXT_DARK}
        />

        <DrawerItem
          label={() => <DrawerLabelWithBadge label="Notifications" badge={unreadCount} />}
          onPress={() => {
            if (Platform.OS === 'web') {
              navigateToPartnerNotifications(navigation);
            } else {
              resetFromShopDrawer(navigation, 'NotificationsList');
            }
          }}
          icon={({ color, size }) => <DrawerMenuIcon name="bell-outline" color={color} size={size} />}
          labelStyle={styles.itemLabel}
          activeTintColor={COLORS.PRIMARY}
          inactiveTintColor={COLORS.TEXT_DARK}
        />

        <DrawerItem
          label="Explore Service Centers"
          onPress={() => {
            if (Platform.OS === 'web') {
              navigateToPartnerServiceCenters(navigation);
            } else {
              resetFromShopDrawer(navigation, 'PartnerServiceCenters');
            }
            props.navigation.closeDrawer();
          }}
          icon={({ color, size }) => <DrawerMenuIcon name="map-search-outline" color={color} size={size} />}
          labelStyle={styles.itemLabel}
          activeTintColor={COLORS.PRIMARY}
          inactiveTintColor={COLORS.TEXT_DARK}
        />

        <DrawerItem
          label="Switch Service Center"
          onPress={() => {
            if (Platform.OS === 'web') {
              navigateToPartnerSwitchCenter(navigation);
            } else {
              resetFromShopDrawer(navigation, 'ChooseShop');
            }
          }}
          icon={({ color, size }) => <DrawerMenuIcon name="swap-horizontal" color={color} size={size} />}
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

export default function ShopDrawer() {
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
      <Drawer.Screen name="ShopDashboard" component={ShopHomeScreen} />
      <Drawer.Screen name="ShopCalendar" component={ShopCalendarScreen} />
      <Drawer.Screen name="RepairsList" component={RepairsList} />
      <Drawer.Screen name="AuthorizedClients" component={AuthorizedClients} />
      <Drawer.Screen name="ShopPromotions" component={ShopPromotions} />
      <Drawer.Screen name="NotificationsList" component={NotificationsList} />
      <Drawer.Screen name="ChooseShop" component={ChooseShopScreen} />
      <Drawer.Screen name="ShopWarehouse" component={ShopWarehouseHubScreen} />
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
