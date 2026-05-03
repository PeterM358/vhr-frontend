/**
 * PATH: src/navigation/ShopDrawer.js
 */

import React, { useContext } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { Text, Badge } from 'react-native-paper';

import ShopHomeScreen from '../screens/ShopHomeScreen';
import RepairsList from '../components/shop/RepairsList';
import AuthorizedClients from '../components/shop/AuthorizedClients';
import ShopPromotions from '../components/shop/ShopPromotions';
import NotificationsList from '../components/shop/NotificationsList';
import ChooseShopScreen from '../screens/ChooseShopScreen';
import ShopProfileScreen from '../screens/ShopProfileScreen';

import { WebSocketContext } from '../context/WebSocketManager';
import { AuthContext } from '../context/AuthManager';
import { logout } from '../api/auth';
import MainText from '../assets/images/main-text.png'; // ✅ Makeing image at bottom

const Drawer = createDrawerNavigator();

function CustomDrawerContent(props) {
  const navigation = useNavigation();
  const { notifications } = useContext(WebSocketContext);
  const { setAuthToken, setIsAuthenticated, setUserEmailOrPhone } = useContext(AuthContext);
  const unreadCount = notifications.filter(n => !n.is_read).length;

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
          label="Profile"
          onPress={() => navigation.navigate('ShopProfile')}
          icon={() => <Text>🏢</Text>}
        />
        <DrawerItem
          label="Repairs"
          onPress={() =>
            props.navigation.dispatch(DrawerActions.jumpTo('RepairsList'))
          }
          icon={() => <Text>🛠️</Text>}
        />
        <DrawerItem label="Clients" onPress={() => navigation.navigate('AuthorizedClients')} icon={() => <Text>👥</Text>} />
        <DrawerItem label="Promotions" onPress={() => navigation.navigate('ShopPromotions')} icon={() => <Text>🏷️</Text>} />

        <DrawerItem
          label="Notifications"
          onPress={() => navigation.navigate('NotificationsList')}
          icon={() => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text>🔔</Text>
              {unreadCount > 0 && <Badge>{unreadCount}</Badge>}
            </View>
          )}
        />

        <DrawerItem label="Switch Shop" onPress={() => navigation.navigate('ChooseShop')} icon={() => <Text>🏪</Text>} />
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
      <Drawer.Screen name="RepairsList" component={RepairsList} />
      <Drawer.Screen name="AuthorizedClients" component={AuthorizedClients} />
      <Drawer.Screen name="ShopPromotions" component={ShopPromotions} />
      <Drawer.Screen name="NotificationsList" component={NotificationsList} />
      <Drawer.Screen name="ChooseShop" component={ChooseShopScreen} />
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