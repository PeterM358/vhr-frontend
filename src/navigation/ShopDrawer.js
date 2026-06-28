/**
 * PATH: src/navigation/ShopDrawer.js
 */

import React, { useContext, useState } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Text, Badge } from 'react-native-paper';

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
import { readCachedUnscheduledCount } from '../utils/shopCalendarBadge';
import MainText from '../assets/images/main-text.png'; // ✅ Makeing image at bottom

const Drawer = createDrawerNavigator();

function CustomDrawerContent(props) {
  const navigation = useNavigation();
  const { notifications } = useContext(WebSocketContext);
  const { setAuthToken, setIsAuthenticated, setUserEmailOrPhone } = useContext(AuthContext);
  const unreadCount = notifications.filter(n => !n.is_read).length;
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
        <Text style={styles.drawerTitle}>Menu</Text>

        <DrawerItem label="Home" onPress={() => props.navigation.closeDrawer()} icon={() => <Text>🏠</Text>} />
        <DrawerItem
          label="Center details"
          onPress={() => resetFromShopDrawer(navigation, 'ShopProfile')}
          icon={() => <Text>🏢</Text>}
        />
        <DrawerItem
          label={
            unscheduledCount > 0 ? `Calendar (${unscheduledCount})` : 'Calendar'
          }
          onPress={() => {
            props.navigation.navigate('ShopCalendar', {
              returnTo: 'ShopDashboard',
              backLabel: 'Home',
            });
            props.navigation.closeDrawer();
          }}
          icon={() => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text>📅</Text>
              {unscheduledCount > 0 ? <Badge>{unscheduledCount}</Badge> : null}
            </View>
          )}
        />
        <DrawerItem
          label="Repairs"
          onPress={() => resetShopDrawerRepairs(navigation)}
          icon={() => <Text>🛠️</Text>}
        />
        <DrawerItem
          label="Clients"
          onPress={() => resetFromShopDrawer(navigation, 'AuthorizedClients')}
          icon={() => <Text>👥</Text>}
        />
        <DrawerItem
          label="Promotions"
          onPress={() => resetFromShopDrawer(navigation, 'ShopPromotions')}
          icon={() => <Text>🏷️</Text>}
        />
        <DrawerItem
          label="Warehouse"
          onPress={() => {
            props.navigation.navigate('ShopWarehouse');
            props.navigation.closeDrawer();
          }}
          icon={() => <Text>📦</Text>}
        />
        <DrawerItem
          label="Invoicing"
          onPress={() => resetFromShopDrawer(navigation, 'ShopInvoicing')}
          icon={() => <Text>🧾</Text>}
        />
        <DrawerItem
          label="Price list"
          onPress={() => resetFromShopDrawer(navigation, 'ShopServiceMenu')}
          icon={() => <Text>📋</Text>}
        />

        <DrawerItem
          label="Notifications"
          onPress={() => resetFromShopDrawer(navigation, 'NotificationsList')}
          icon={() => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text>🔔</Text>
              {unreadCount > 0 && <Badge>{unreadCount}</Badge>}
            </View>
          )}
        />

        <DrawerItem
          label="Switch Shop"
          onPress={() => resetFromShopDrawer(navigation, 'ChooseShop')}
          icon={() => <Text>🏪</Text>}
        />
        <DrawerItem
          label="Logout"
          onPress={handleLogout}
          icon={() => <Text>🚪</Text>}
        />
      </View>

      <View style={styles.logoBottomContainer}>
        <Image source={MainText} style={styles.logoImage} resizeMode="contain" />
      </View>
    </DrawerContentScrollView>
  );
}

export default function ShopDrawer() {
  return (
    <Drawer.Navigator
      screenOptions={{ headerShown: false }}
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
    paddingTop: 40,
    paddingBottom: 20,
  },
  menuContainer: {
    flexGrow: 1,
  },
  drawerTitle: {
    marginLeft: 16,
    marginBottom: 8,
    fontSize: 18,
    fontWeight: 'bold',
  },
  logoBottomContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  logoImage: {
    width: 140,
    height: 50,
  },
});