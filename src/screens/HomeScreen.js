/**
 * PATH: src/screens/HomeScreen.js
 */

import React, { useContext } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Appbar, Badge, Button, useTheme } from 'react-native-paper';
import { logout } from '../api/auth';
import { WebSocketContext } from '../context/WebSocketManager';
import { AuthContext } from '../context/AuthManager';
import Logo from '../assets/images/logo.svg';
import ScreenBackground from '../components/ScreenBackground';

const WINDOW_H = Dimensions.get('window').height;
/** Hero sits ~upper third of content below header — leaves room for future promos */
const HERO_TOP_PADDING = Math.round(Math.min(Math.max(WINDOW_H * 0.22, 120), 200));

/** Dark glass header (not saturated primary full-width slab) */
const HOME_TOP_BAR = 'rgba(11,18,32,0.92)';

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

  React.useEffect(() => {
    console.log('🔄 Updated notifications state:', notifications);
  }, [notifications]);

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
      <ScreenBackground>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      </ScreenBackground>
    );
  }

  if (!isAuthenticated) {
    return (
      <ScreenBackground>
        <View style={styles.center}>
          <View style={styles.welcomeCard}>
            <Text style={styles.welcomeTitle}>Welcome! Please Login or Register.</Text>
          </View>
        </View>
      </ScreenBackground>
    );
  }

  let username = userEmailOrPhone?.trim() || 'User';
  if (username.includes('@')) username = username.split('@')[0];

  return (
    <ScreenBackground safeArea={false}>
      <Appbar.Header style={{ backgroundColor: HOME_TOP_BAR }}>
        <Appbar.Action icon="menu" onPress={() => navigation.openDrawer()} color="#fff" />
        <Appbar.Content title={username} titleStyle={{ color: '#fff' }} />
        <View style={styles.iconWithBadge}>
          <Appbar.Action
            icon="bell-outline"
            onPress={() => navigation.navigate('OffersScreen')}
            color="#fff"
          />
          {totalOffersBadge > 0 && (
            <Badge style={styles.notificationBadge}>{totalOffersBadge}</Badge>
          )}
        </View>
        <Appbar.Action icon="logout" onPress={handleLogout} color="#fff" />
      </Appbar.Header>

      <View style={styles.heroWrap}>
        <View style={styles.welcomeCard}>
          <Logo width={96} height={96} style={styles.homeLogo} />

          <Text style={styles.welcomeTitle}>Welcome to Vehicle Repair Hub</Text>
          <Text style={styles.welcomeSub}>Use the menu or map below to navigate</Text>

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
      </View>
    </ScreenBackground>
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  heroWrap: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: HERO_TOP_PADDING,
  },
  welcomeCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: 'rgba(5,15,30,0.72)',
    borderColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderRadius: 22,
    padding: 22,
    alignItems: 'center',
  },
  homeLogo: {
    alignSelf: 'center',
    marginBottom: 14,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
    color: '#fff',
  },
  welcomeSub: {
    fontSize: 15,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.78)',
    marginBottom: 18,
  },
  mapButton: {
    marginTop: 4,
    alignSelf: 'stretch',
    borderRadius: 12,
    elevation: 2,
  },
  mapButtonContent: {
    flexDirection: 'row-reverse',
    height: 50,
  },
  mapButtonLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
});