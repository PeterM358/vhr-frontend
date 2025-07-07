// PATH: src/navigation/HomeDrawer.js

import React, { useContext } from 'react';
import { View, StyleSheet } from 'react-native';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { useNavigation } from '@react-navigation/native';
import { Text, Badge } from 'react-native-paper';
import HomeScreen from '../screens/HomeScreen';
import { WebSocketContext } from '../context/WebSocketManager';

const Drawer = createDrawerNavigator();

function CustomDrawerContent(props) {
  const navigation = useNavigation();
  const { notifications } = useContext(WebSocketContext);

  // Calculate unseen counts
  const unseenPromotions = notifications.filter(n => !n.is_read && n.repair == null).length;
  const unseenOffers = notifications.filter(n => !n.is_read && n.repair != null).length;
  const totalOffersBadge = unseenPromotions + unseenOffers;

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
        onPress={() => navigation.navigate('ClientRepairs')}
        icon={() => <Text>🛠️</Text>}
      />

      <DrawerItem
        label="Vehicles"
        onPress={() => navigation.navigate('ClientVehicles')}
        icon={() => <Text>🚗</Text>}
      />

      <View style={styles.drawerItemWithBadge}>
        <DrawerItem
          label="Offers"
          onPress={() => navigation.navigate('OffersScreen')}
          icon={() => <Text>🏷️</Text>}
          style={{ flex: 1 }}
        />
        {totalOffersBadge > 0 && (
          <Badge style={styles.drawerBadge}>{totalOffersBadge}</Badge>
        )}
      </View>

      <DrawerItem
        label="Find Shops on Map"
        onPress={() => navigation.navigate('ShopMap')}
        icon={() => <Text>🗺️</Text>}
      />

      <DrawerItem
        label="Logout"
        onPress={() => navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        })}
        icon={() => <Text>🚪</Text>}
      />
    </DrawerContentScrollView>
  );
}

export default function HomeDrawer() {
  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: false,
      }}
      drawerContent={(props) => <CustomDrawerContent {...props} />}
    >
      <Drawer.Screen
        name="HomeMain"
        component={HomeScreen}
        options={{ title: 'Home' }}
      />
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
  drawerItemWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
  },
  drawerBadge: {
    marginRight: 16,
    backgroundColor: 'red',
    color: 'white',
  },
});