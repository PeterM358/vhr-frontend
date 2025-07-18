import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TextInput, Button, Surface, useTheme, Text } from 'react-native-paper';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { API_BASE_URL } from '../api/config';

const getNow = () => new Date().toISOString();

function withTimeout(promise, ms = 5000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms)),
  ]);
}

export default function ShopMapScreen({ navigation }) {
  const theme = useTheme();

  const [location, setLocation] = useState(null);
  const [shops, setShops] = useState([]);
  const [addressQuery, setAddressQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const mapRef = useRef(null);

  const fetchShops = async (address = '') => {
    const fetchStart = Date.now();
    console.log(`[${getNow()}] 📡 ShopMapScreen: Sending request to fetch shops...`);
    setLoading(true);
    const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    const userIdStr = await AsyncStorage.getItem(STORAGE_KEYS.USER_ID);
    const userId = parseInt(userIdStr, 10);
    console.log(`[${getNow()}] 👤 ShopMapScreen: User ID is ${userId}`);

    try {
      const url = `${API_BASE_URL}/api/profiles/shops/${address ? `?address=${encodeURIComponent(address)}` : ''}`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      const updatedShops = data.map((shop) => ({
        ...shop,
        isMyShop: Array.isArray(shop.users) && shop.users.includes(userId),
      }));

      setShops(updatedShops);
    } catch (error) {
      console.error('Error fetching shops:', error);
      Alert.alert('Error', 'Could not load shops');
    } finally {
      setLoading(false);
      const elapsed = Date.now() - fetchStart;
      const totalElapsed = Date.now() - startTime;
      console.log(`[${getNow()}] ✅ ShopMapScreen: Finished fetching shops. Elapsed: ${elapsed}ms, Total since open: ${totalElapsed}ms`);
    }
  };

  const fetchEverything = async () => {
    const startTime = Date.now();
    console.log(`[${getNow()}] 🟡 ShopMapScreen: Starting fetchEverything...`);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Location access is required.');
      return;
    }

    let position;
    try {
      position = await withTimeout(Location.getCurrentPositionAsync({}), 5000);
    } catch (err) {
      console.warn('⚠️ Location fetch timed out:', err);
      position = await Location.getLastKnownPositionAsync({});
    }
    setLocation(position.coords);
    console.log(`[${getNow()}] 🟢 ShopMapScreen: Location fetched, now fetching shops...`);
    await fetchShops();
  };

  useEffect(() => {
    fetchEverything();
  }, []);

  const handleSearch = () => {
    fetchShops(addressQuery);
  };

  useEffect(() => {
    if (!location || shops.length === 0) return;

    const allPoints = [...shops, location];
    const latitudes = allPoints.map((p) => p.latitude);
    const longitudes = allPoints.map((p) => p.longitude);

    const region = {
      latitude: (Math.min(...latitudes) + Math.max(...latitudes)) / 2,
      longitude: (Math.min(...longitudes) + Math.max(...longitudes)) / 2,
      latitudeDelta: Math.max(0.5, Math.max(...latitudes) - Math.min(...latitudes) + 0.2),
      longitudeDelta: Math.max(0.5, Math.max(...longitudes) - Math.min(...longitudes) + 0.2),
    };

    mapRef.current?.animateToRegion(region, 1000);
  }, [location, shops]);

  if (!location || loading) return <ActivityIndicator size="large" style={styles.loader} />;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        showsUserLocation={true}
        initialRegion={{
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.5,
          longitudeDelta: 0.5,
        }}
      >
        {shops
          .map(s => ({
            ...s,
            latitude: s.latitude ? parseFloat(s.latitude) : null,
            longitude: s.longitude ? parseFloat(s.longitude) : null,
          }))
          .filter(s => !isNaN(s.latitude) && !isNaN(s.longitude))
          .map(shop => (
            <Marker
              key={shop.id}
              coordinate={{ latitude: shop.latitude, longitude: shop.longitude }}
              pinColor={shop.isMyShop ? 'green' : 'red'}
            >
              <Callout onPress={() => navigation.navigate('ShopDetail', { shopId: shop.id })}>
                <View style={{ maxWidth: 200 }}>
                  <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{shop.name}</Text>
                  <Text variant="bodySmall">{shop.address}</Text>
                  <Text style={{ color: theme.colors.primary, marginTop: 5 }}>Tap for details</Text>
                </View>
              </Callout>
            </Marker>
        ))}
      </MapView>

      <Surface style={styles.searchContainer}>
        <TextInput
          mode="outlined"
          dense
          placeholder="Search by address..."
          value={addressQuery}
          onChangeText={setAddressQuery}
          style={styles.searchInput}
        />
        <Button
          mode="contained"
          icon="magnify"
          onPress={handleSearch}
          style={styles.searchButton}
          compact
        >
          Search
        </Button>
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  searchContainer: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    padding: 10,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 5,
    backgroundColor: '#fff',
  },
  searchInput: {
    flex: 1,
    marginRight: 8,
  },
  searchButton: {
    height: 40,
    justifyContent: 'center',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});