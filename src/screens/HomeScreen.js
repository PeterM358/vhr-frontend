// PATH: src/screens/HomeScreen.js

import React, { useEffect, useState, useContext } from 'react';
import {
  View,
  Text,
  ImageBackground,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logout } from '../api/auth';
import { WebSocketContext } from '../context/WebSocketManager';
import BASE_STYLES from '../styles/base';
import { Appbar, Badge, Button } from 'react-native-paper';

export default function HomeScreen({ navigation }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmailOrPhone, setUserEmailOrPhone] = useState('');
  const [loading, setLoading] = useState(true);

  const { notifications } = useContext(WebSocketContext);

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

  /** ---------- RENDER ---------- */

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

  /** ---------- NOT AUTHENTICATED ---------- */
  if (!isAuthenticated) {
    return (
      <ImageBackground
        source={require('../assets/background.jpg')}
        style={BASE_STYLES.background}
        blurRadius={5}
      >
        <View style={BASE_STYLES.overlay}>
          <Text style={styles.welcomeText}>
            Welcome! Please Login or Register.
          </Text>
        </View>
      </ImageBackground>
    );
  }

  /** ---------- AUTHENTICATED ---------- */
  let username = userEmailOrPhone.trim();
  if (username.includes('@')) {
    username = username.split('@')[0];
  }

  return (
    <ImageBackground
      source={require('../assets/background.jpg')}
      style={BASE_STYLES.background}
      blurRadius={5}
    >
      <Appbar.Header style={styles.appbar}>
        <Appbar.Action
          icon="menu"
          color="#fff"
          onPress={() => navigation.openDrawer()}
        />
        <Appbar.Content
          title={username}
          titleStyle={styles.appbarTitle}
        />

        <View style={styles.iconWithBadge}>
          <Appbar.Action
            icon="bell-outline"
            color="#fff"
            onPress={() => navigation.navigate('OffersScreen')}
          />
          {totalOffersBadge > 0 && (
            <Badge style={styles.notificationBadge}>{totalOffersBadge}</Badge>
          )}
        </View>

        <Appbar.Action
          icon="logout"
          color="#fff"
          onPress={handleLogout}
        />
      </Appbar.Header>

      <View style={BASE_STYLES.overlay}>
        <Text style={styles.welcomeText}>
          Welcome to Vehicle Repair Hub
        </Text>
        <Text style={styles.subText}>
          Use the menu or map below to navigate
        </Text>

        <Button
          mode="contained"
          icon="map-marker"
          onPress={() => navigation.navigate('ShopMap')}
          style={styles.button}
        >
          Find Shops on Map
        </Button>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  appbar: {
    backgroundColor: '#007AFF',
  },
  appbarTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  iconWithBadge: {
    position: 'relative',
    marginRight: 8,
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'red',
    color: 'white',
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
  },
  subText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#555',
    marginBottom: 20,
  },
  button: {
    marginVertical: 12,
    alignSelf: 'center',
    width: '80%',
    maxWidth: 400,
  },
});