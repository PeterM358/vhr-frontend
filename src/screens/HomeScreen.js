// PATH: src/screens/HomeScreen.js
import React, { useContext } from 'react';
import { View, Text, ImageBackground, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logout } from '../api/auth';
import { WebSocketContext } from '../context/WebSocketManager';
import { AuthContext } from '../context/AuthManager';
import BASE_STYLES from '../styles/base';
import { Appbar, Badge, Button } from 'react-native-paper';

export default function HomeScreen({ navigation }) {
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
        const emailOrPhone = await AsyncStorage.getItem('@user_email_or_phone');
        if (setUserEmailOrPhone) {
          setUserEmailOrPhone(emailOrPhone || '');
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

  if (!isAuthenticated) {
    return (
      <ImageBackground
        source={require('../assets/background.jpg')}
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
      source={require('../assets/background.jpg')}
      style={BASE_STYLES.background}
      blurRadius={5}
    >
      <Appbar.Header style={styles.appbar}>
        <Appbar.Action icon="menu" color="#fff" onPress={() => navigation.openDrawer()} />
        <Appbar.Content title={username} titleStyle={styles.appbarTitle} />
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
        <Appbar.Action icon="logout" color="#fff" onPress={handleLogout} />
      </Appbar.Header>

      <View style={BASE_STYLES.overlay}>
        <Text style={styles.welcomeText}>Welcome to Vehicle Repair Hub</Text>
        <Text style={styles.subText}>Use the menu or map below to navigate</Text>

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
  appbar: { backgroundColor: '#007AFF' },
  appbarTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  iconWithBadge: { position: 'relative', marginRight: 8 },
  notificationBadge: { position: 'absolute', top: 4, right: 4, backgroundColor: 'red', color: 'white' },
  welcomeText: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 8, color: '#333' },
  subText: { fontSize: 16, textAlign: 'center', color: '#555', marginBottom: 20 },
  button: { marginVertical: 12, alignSelf: 'center', width: '80%', maxWidth: 400 },
});