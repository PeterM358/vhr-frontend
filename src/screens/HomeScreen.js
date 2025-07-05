// PATH: src/screens/HomeScreen.js

import React, { useEffect, useState, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ImageBackground,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logout } from '../api/auth';
import { WebSocketContext } from '../context/WebSocketManager';
import BASE_STYLES from '../styles/base';
import CommonButton from '../components/CommonButton';

export default function HomeScreen({ navigation }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmailOrPhone, setUserEmailOrPhone] = useState('');
  const [loading, setLoading] = useState(true);

  const { notifications } = useContext(WebSocketContext);

  // Calculate unseen counts
  const unseenPromotions = notifications.filter(n => !n.is_read && n.repair == null).length;
  const unseenOffers = notifications.filter(n => !n.is_read && n.repair != null).length;
  const totalOffersBadge = unseenPromotions + unseenOffers;

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', checkAuth);
    return unsubscribe;
  }, [navigation]);

  const checkAuth = async () => {
    const token = await AsyncStorage.getItem('@access_token');
    const emailOrPhone = await AsyncStorage.getItem('@user_email_or_phone');
    setIsAuthenticated(!!token);
    setUserEmailOrPhone(emailOrPhone || '');
    setLoading(false);
  };

  const handleLogout = async () => {
    await logout(navigation);
  };

  if (!isAuthenticated) {
    return (
      <ImageBackground
        source={require('../assets/background.jpg')}
        style={BASE_STYLES.background}
        blurRadius={5}
      >
        <View style={BASE_STYLES.overlay}>
          <CommonButton title="Login" onPress={() => navigation.navigate('Login')} />
          <CommonButton title="Register" onPress={() => navigation.navigate('Register')} />
        </View>
      </ImageBackground>
    );
  }

  if (loading) {
    return (
      <ImageBackground
        source={require('../assets/background.jpg')}
        style={BASE_STYLES.background}
        blurRadius={5}
      >
        <View style={BASE_STYLES.overlay}>
          <ActivityIndicator size="large" />
        </View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground
      source={require('../assets/background.jpg')}
      style={BASE_STYLES.background}
      blurRadius={5}
    >
      <View style={BASE_STYLES.overlay}>
        <Text style={BASE_STYLES.title}>Welcome, {userEmailOrPhone}</Text>

        <View style={BASE_STYLES.tabBar}>
          <TouchableOpacity
            onPress={() => navigation.navigate('ClientRepairs')}
            style={BASE_STYLES.inactiveTab}
          >
            <Text>Repairs</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('ClientVehicles')}
            style={BASE_STYLES.inactiveTab}
          >
            <Text>Vehicles</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('OffersScreen')}
            style={BASE_STYLES.inactiveTab}
          >
            <View style={styles.tabButtonContent}>
              <Text>Offers</Text>
              {totalOffersBadge > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{totalOffersBadge}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>

        <CommonButton title="Find Shops on Map" onPress={() => navigation.navigate('ShopMap')} />
        <CommonButton title="Logout" color="red" onPress={handleLogout} />
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  tabButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    marginLeft: 6,
    backgroundColor: 'red',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});