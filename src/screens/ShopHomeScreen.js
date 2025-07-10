/**
 * PATH: src/screens/ShopHomeScreen.js
 */

import React, { useContext, useState } from 'react';
import { View, Text, ImageBackground, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Appbar, Badge, Button, useTheme } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logout } from '../api/auth';

import { WebSocketContext } from '../context/WebSocketManager';
import { AuthContext } from '../context/AuthManager';
import BASE_STYLES from '../styles/base';
import Logo from '../../assets/logo.svg';

export default function ShopHomeScreen() {
  const navigation = useNavigation();
  const theme = useTheme();

  const { setAuthToken, setIsAuthenticated, setUserEmailOrPhone } = useContext(AuthContext);
  const { notifications } = useContext(WebSocketContext);

  const [loading, setLoading] = useState(true);
  const [shopDisplayName, setShopDisplayName] = useState('Shop');

  const unreadCount = notifications.filter(n => !n.is_read).length;

  useFocusEffect(
    React.useCallback(() => {
      const loadShopUser = async () => {
        const stored = await AsyncStorage.getItem('@user_email_or_phone');
        let display = 'Shop';
        if (stored?.trim()) {
          display = stored.includes('@') ? stored.split('@')[0] : stored;
        }
        setShopDisplayName(display);
        setLoading(false);
      };
      loadShopUser();
    }, [])
  );

  const handleLogout = async () => {
    await logout(navigation, setAuthToken, setIsAuthenticated, setUserEmailOrPhone);
  };

  if (loading) {
    return (
      <ImageBackground
        source={require('../../assets/background.jpg')}
        style={BASE_STYLES.background}
        blurRadius={5}
      >
        <View style={BASE_STYLES.overlay}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground
      source={require('../../assets/background.jpg')}
      style={BASE_STYLES.background}
      blurRadius={5}
    >
      <Appbar.Header style={{ backgroundColor: theme.colors.primary }}>
        <Appbar.Action
          icon="menu"
          onPress={() => navigation.openDrawer()}
          color={theme.colors.onPrimary}
        />
        <Appbar.Content
          title={shopDisplayName}
          titleStyle={{ color: theme.colors.onPrimary }}
        />
        <View style={styles.iconWithBadge}>
          <Appbar.Action
            icon="bell-outline"
            onPress={() => navigation.navigate('ShopNotificationsScreen')}
            color={theme.colors.onPrimary}
          />
          {unreadCount > 0 && (
            <Badge style={styles.notificationBadge}>{unreadCount}</Badge>
          )}
        </View>
        <Appbar.Action
          icon="logout"
          onPress={handleLogout}
          color={theme.colors.onPrimary}
        />
      </Appbar.Header>

      <View style={BASE_STYLES.overlay}>
        <Logo width={120} height={120} style={styles.shopLogo} />

        <Text style={[styles.welcomeText, { color: theme.colors.onBackground }]}>
          Welcome to Your Shop Dashboard
        </Text>
        <Text style={[styles.subText, { color: theme.colors.onBackground }]}>
          Use the menu or map below to navigate
        </Text>

        <Button
          mode="contained"
          icon="map"
          onPress={() => navigation.navigate('ShopMap')}
          style={[styles.mapButton, { backgroundColor: theme.colors.primary }]}
          contentStyle={styles.mapButtonContent}
          labelStyle={styles.mapButtonLabel}
        >
          Find Shops on Map
        </Button>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
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
  shopLogo: {
    alignSelf: 'center',
    marginBottom: 16,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  mapButton: {
    marginVertical: 16,
    alignSelf: 'center',
    width: '85%',
    maxWidth: 400,
    borderRadius: 12,
    elevation: 2,
  },
  mapButtonContent: {
    flexDirection: 'row-reverse',
    height: 50,
  },
  mapButtonLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
});