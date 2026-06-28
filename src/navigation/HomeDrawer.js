/**
 * PATH: src/navigation/HomeDrawer.js
 */

import React, { useContext } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { useNavigation } from '@react-navigation/native';
import { Text, Badge } from 'react-native-paper';
import HomeScreen from '../screens/HomeScreen';
import { WebSocketContext } from '../context/WebSocketManager';
import { AuthContext } from '../context/AuthManager';
import { logout } from '../api/auth';
import { resetFromClientDrawer } from './drawerNavigation';

import MainText from '../assets/images/main-text.png'; // ✅ Your bottom makeing image

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
          icon={() => <Text>🏠</Text>}
        />

        <DrawerItem
          label="Profile"
          onPress={() => resetFromClientDrawer(navigation, 'ClientProfile')}
          icon={() => <Text>👤</Text>}
        />

        <DrawerItem
          label="Repairs"
          onPress={() => resetFromClientDrawer(navigation, 'ClientRepairs')}
          icon={() => <Text>🛠️</Text>}
        />
        <DrawerItem
          label="Vehicles"
          onPress={() => resetFromClientDrawer(navigation, 'ClientVehicles')}
          icon={() => <Text>🚗</Text>}
        />
        <DrawerItem
          label="Activity"
          onPress={() =>
            resetFromClientDrawer(navigation, 'ClientActivity', {
              returnTo: 'Home',
              backLabel: 'Home',
              initialTab: unreadNotifications > 0 ? 'inbox' : 'repairs',
            })
          }
          icon={() => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text>🔔</Text>
              {unreadNotifications > 0 ? <Badge>{unreadNotifications}</Badge> : null}
            </View>
          )}
        />
        <DrawerItem
          label="Find Shops on Map"
          onPress={() => resetFromClientDrawer(navigation, 'ShopMap')}
          icon={() => <Text>🗺️</Text>}
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

export default function HomeDrawer() {
  return (
    <Drawer.Navigator
      screenOptions={{ headerShown: false }}
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