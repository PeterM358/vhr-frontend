/**
 * PATH: src/screens/HomeScreen.js
 */

import React, { useContext } from 'react';
import { View, Text, ImageBackground, StyleSheet, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Appbar, Badge, Button, useTheme } from 'react-native-paper';
import { logout } from '../api/auth';
import { WebSocketContext } from '../context/WebSocketManager';
import { AuthContext } from '../context/AuthManager';
import BASE_STYLES from '../styles/base';
import Logo from '../../assets/logo.svg';

export default function HomeScreen({ navigation }) {
  const theme = useTheme();

  const {
    isAuthenticated,
    isLoading,
    setAuthToken,
    setIsAuthenticated,
    userEmailOrPhone,
    setUserEmailOrPhone,
  } = useContext(AuthContext);

  const { notifications } = useContext(WebSocketContext);

  useFocusEffect(
    React.useCallback(() => {
      const loadUser = async () => {
        const last = await AsyncStorage.getItem('@user_email_or_phone');
        if (setUserEmailOrPhone) {
          setUserEmailOrPhone(last || '');
        }
      };
      loadUser();
    }, [setUserEmailOrPhone])
  );

  const unseenPromotions = notifications.filter(n => !n.is_read && n.repair == null).length;
  const unseenOffers = notifications.filter(n => !n.is_read && n.repair != null).length;
  const totalOffersBadge = unseenPromotions + unseenOffers;

  const handleLogout = async () => {
    await logout(navigation, setAuthToken, setIsAuthenticated, setUserEmailOrPhone);
  };

  if (isLoading) {
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

  if (!isAuthenticated) {
    return (
      <ImageBackground
        source={require('../../assets/background.jpg')}
        style={BASE_STYLES.background}
        blurRadius={5}
      >
        <View style={BASE_STYLES.overlay}>
          <Text style={styles.welcomeText}>Welcome! Please Login or Register.</Text>
        </View>
      </ImageBackground>
    );
  }

  let username = userEmailOrPhone?.trim() || 'User';
  if (username.includes('@')) username = username.split('@')[0];

  return (
    <ImageBackground
      source={require('../../assets/background.jpg')}
      style={BASE_STYLES.background}
      blurRadius={5}
    >
      <Appbar.Header style={{ backgroundColor: theme.colors.primary }}>
        <Appbar.Action icon="menu" onPress={() => navigation.openDrawer()} color={theme.colors.onPrimary} />
        <Appbar.Content title={username} titleStyle={{ color: theme.colors.onPrimary }} />
        <View style={styles.iconWithBadge}>
          <Appbar.Action
            icon="bell-outline"
            onPress={() => navigation.navigate('OffersScreen')}
            color={theme.colors.onPrimary}
          />
          {totalOffersBadge > 0 && (
            <Badge style={styles.notificationBadge}>{totalOffersBadge}</Badge>
          )}
        </View>
        <Appbar.Action icon="logout" onPress={handleLogout} color={theme.colors.onPrimary} />
      </Appbar.Header>

      <View style={BASE_STYLES.overlay}>
        <Logo width={120} height={120} style={styles.homeLogo} />

        <Text style={styles.welcomeText}>Welcome to Vehicle Repair Hub</Text>
        <Text style={styles.subText}>Use the menu or map below to navigate</Text>

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
  homeLogo: {
    alignSelf: 'center',
    marginBottom: 16,
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