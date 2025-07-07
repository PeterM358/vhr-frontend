// PATH: src/screens/ShopHomeScreen.js

import React, { useContext, useEffect, useState } from 'react';
import {
  View,
  Text,
  ImageBackground,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Appbar, Badge, Button } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logout } from '../api/auth';

import { WebSocketContext } from '../context/WebSocketManager';
import BASE_STYLES from '../styles/base';

export default function ShopHomeScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [shopDisplayName, setShopDisplayName] = useState('Shop');

  const { notifications } = useContext(WebSocketContext);
  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    const fetchData = async () => {
      const token = await AsyncStorage.getItem('@access_token');
      const storedEmailOrPhone = await AsyncStorage.getItem('@user_email_or_phone');

      let displayName = 'Shop';

      if (storedEmailOrPhone) {
        if (storedEmailOrPhone.includes('@')) {
          // email: take part before @
          displayName = storedEmailOrPhone.split('@')[0];
        } else {
          // phone number
          displayName = storedEmailOrPhone;
        }
      }

      setShopDisplayName(displayName);
      setLoading(false);
    };

    fetchData();
  }, []);

  const handleLogout = async () => {
    await logout(navigation);
  };

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
      <Appbar.Header style={styles.appbar}>
        <Appbar.Action
          icon="menu"
          color="#fff"
          onPress={() => navigation.openDrawer()}
        />
        <Appbar.Content
          title={shopDisplayName}
          titleStyle={styles.appbarTitle}
        />
        <View style={styles.iconWithBadge}>
          <Appbar.Action
            icon="bell-outline"
            color="#fff"
            onPress={() => navigation.navigate('NotificationsList')}
          />
          {unreadCount > 0 && (
            <Badge style={styles.notificationBadge}>{unreadCount}</Badge>
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
          Welcome to Your Shop Dashboard
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