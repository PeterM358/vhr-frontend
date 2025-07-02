// src/screens/ShopMapScreen.native.js
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  Button,
} from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';

export default function ShopMapScreen({ navigation }) {
  const [location, setLocation] = useState(null);
  const [shops, setShops] = useState([]);
  const [addressQuery, setAddressQuery] = useState('');
  const mapRef = useRef(null);

  const fetchShops = async (address = '') => {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    const userIdStr = await AsyncStorage.getItem(STORAGE_KEYS.USER_ID);
    const userId = parseInt(userIdStr, 10);

    try {
      const url = `http://127.0.0.1:8000/api/shops/${address ? `?address=${encodeURIComponent(address)}` : ''}`;
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
    }
  };

  const fetchEverything = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Location access is required.');
      return;
    }

    const position = await Location.getCurrentPositionAsync({});
    setLocation(position.coords);
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

  if (!location) return <ActivityIndicator size="large" style={styles.loader} />;

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          placeholder="Search by address..."
          value={addressQuery}
          onChangeText={setAddressQuery}
          style={styles.searchInput}
        />
        <Button title="Search" onPress={handleSearch} />
      </View>

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
          .filter(s => typeof s.latitude === 'number' && typeof s.longitude === 'number')
          .map(shop => (
            <Marker
              key={shop.id}
              coordinate={{ latitude: shop.latitude, longitude: shop.longitude }}
              pinColor={shop.isMyShop ? 'green' : 'red'}
            >
              <Callout onPress={() => navigation.navigate('ShopDetail', { shopId: shop.id })}>
                <View style={{ maxWidth: 200 }}>
                  <Text style={{ fontWeight: 'bold' }}>{shop.name}</Text>
                  <Text>{shop.address}</Text>
                  <Text style={{ color: 'blue', marginTop: 5 }}>Tap for details</Text>
                </View>
              </Callout>
            </Marker>
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchContainer: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    zIndex: 10,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  map: { flex: 1 },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
