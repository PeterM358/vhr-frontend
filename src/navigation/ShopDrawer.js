// PATH: src/navigation/ShopDrawer.js

import React, { useContext } from 'react';
import { StyleSheet } from 'react-native';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { useNavigation } from '@react-navigation/native';
import { Text, Badge } from 'react-native-paper';

import ShopHomeScreen from '../screens/ShopHomeScreen';
import RepairsList from '../components/shop/RepairsList';
import AuthorizedClients from '../components/shop/AuthorizedClients';
import ShopPromotions from '../components/shop/ShopPromotions';
import NotificationsList from '../components/shop/NotificationsList';
import ChooseShopScreen from '../screens/ChooseShopScreen';

import { WebSocketContext } from '../context/WebSocketManager';

const Drawer = createDrawerNavigator();

function CustomDrawerContent(props) {
  const navigation = useNavigation();
  const { notifications } = useContext(WebSocketContext);
  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={styles.drawerContainer}>
      <Text style={styles.drawerTitle}>Menu</Text>

      <DrawerItem
        label="Home"
        onPress={() => props.navigation.closeDrawer()}
        icon={() => <Text>🏠</Text>}
      />
      <DrawerItem
        label="Repairs"
        onPress={() => navigation.navigate('RepairsList')}
        icon={() => <Text>🛠️</Text>}
      />
      <DrawerItem
        label="Clients"
        onPress={() => navigation.navigate('AuthorizedClients')}
        icon={() => <Text>👥</Text>}
      />
      <DrawerItem
        label="Promotions"
        onPress={() => navigation.navigate('ShopPromotions')}
        icon={() => <Text>🏷️</Text>}
      />

      <DrawerItem
        label="Notifications"
        onPress={() => navigation.navigate('NotificationsList')}
        icon={() => <Text>🔔</Text>}
      />
      {unreadCount > 0 && (
        <Badge style={styles.drawerBadge}>{unreadCount}</Badge>
      )}

      <DrawerItem
        label="Switch Shop"
        onPress={() => navigation.navigate('ChooseShop')}
        icon={() => <Text>🏪</Text>}
      />

      <DrawerItem
        label="Logout"
        onPress={() =>
          navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          })
        }
        icon={() => <Text>🚪</Text>}
      />
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
    paddingTop: 40,
  },
  drawerTitle: {
    marginLeft: 16,
    marginBottom: 8,
    fontSize: 18,
    fontWeight: 'bold',
  },
  drawerBadge: {
    marginLeft: 16,
    backgroundColor: 'red',
    color: 'white',
  },
});