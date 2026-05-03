// PATH: src/screens/ShopMapScreen.web.js
import 'leaflet/dist/leaflet.css';
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  ZoomControl,
} from 'react-leaflet';
import L from 'leaflet';
import { COLORS } from '../styles/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { useNavigation } from '@react-navigation/native';
import { API_BASE_URL } from '../api/config';
import BASE_STYLES from '../styles/base';
// import 'leaflet/dist/leaflet.css';

// Fix Leaflet's default icon URLs
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function ChangeView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, zoom);
  }, [center, zoom]);
  return null;
}

export default function ShopMapScreen() {
  const navigation = useNavigation();
  const [shops, setShops] = useState([]);
  const [addressQuery, setAddressQuery] = useState('');
  const [center, setCenter] = useState([42.6977, 23.3219]); // Sofia center
  const [zoom, setZoom] = useState(12);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    // Get browser geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = [position.coords.latitude, position.coords.longitude];
          setUserLocation(coords);
          setCenter(coords);
        },
        () => {
          console.warn('Geolocation permission denied or unavailable.');
        }
      );
    }

    fetchShops();
  }, []);

  const fetchShops = async (address = '') => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const userIdStr = await AsyncStorage.getItem(STORAGE_KEYS.USER_ID);
      const userId = userIdStr ? parseInt(userIdStr, 10) : null;
      const hasValidToken =
        !!token && token !== 'null' && token !== 'undefined';

      const url = `${API_BASE_URL}/api/profiles/shops/${address ? `?address=${encodeURIComponent(address)}` : ''}`;
      const headers = hasValidToken ? { Authorization: `Bearer ${token}` } : {};
      let response = await fetch(url, { headers });
      let data = await response.json();

      // If a stale token sneaks in, retry as true guest.
      if (!response.ok && response.status === 401 && hasValidToken) {
        response = await fetch(url, { headers: {} });
        data = await response.json();
      }

      if (!response.ok) {
        console.error('Shop fetch failed:', response.status, data);
        throw new Error(data?.detail || 'Could not load shops');
      }

      const shopsArray = Array.isArray(data) ? data : [];
      const updatedShops = shopsArray.map(shop => ({
        ...shop,
        isMyShop: Number.isInteger(userId) && Array.isArray(shop.users) && shop.users.includes(userId),
      }));

      setShops(updatedShops);

      if (!userLocation && updatedShops.length > 0) {
        setCenter([updatedShops[0].latitude, updatedShops[0].longitude]);
      }
    } catch (error) {
      console.error('Error fetching shops:', error);
      window.alert('Could not load shops');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchShops(addressQuery);
  };

  if (loading) {
    return (
      <View style={BASE_STYLES.loadingCenter}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topChrome}>
        <Pressable
          style={({ hovered, pressed }) => [
            styles.backPill,
            (pressed || hovered) && styles.backPillPressed,
          ]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backPillIcon}>←</Text>
        </Pressable>
        <View style={styles.searchContainer}>
          <TextInput
            placeholder="Search by address..."
            value={addressQuery}
            onChangeText={setAddressQuery}
            style={styles.searchInput}
          />
          <Pressable style={styles.searchButton} onPress={handleSearch}>
            <Text style={styles.searchButtonText}>Search</Text>
          </Pressable>
        </View>
      </View>

      <MapContainer center={center} zoom={zoom} style={styles.map} zoomControl={false}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ChangeView center={center} zoom={zoom} />

        {/* Built-in Leaflet Zoom Controls in bottom right */}
        <ZoomControl position="bottomright" />

        {/* User location marker */}
        {userLocation && (
          <Marker
            position={userLocation}
            icon={L.icon({
              iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
              shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
              iconSize: [25, 41],
              iconAnchor: [12, 41],
              popupAnchor: [1, -34],
              shadowSize: [41, 41],
            })}
          >
            <Popup>
              <Text style={{ fontWeight: 'bold' }}>You are here</Text>
            </Popup>
          </Marker>
        )}

        {shops
          .map(shop => ({
            ...shop,
            latitude: shop.latitude ? parseFloat(shop.latitude) : null,
            longitude: shop.longitude ? parseFloat(shop.longitude) : null,
          }))
          .filter(s => !isNaN(s.latitude) && !isNaN(s.longitude))
          .map(shop => (
            <Marker
              key={shop.id}
              position={[shop.latitude, shop.longitude]}
              icon={L.icon({
                iconUrl: shop.isMyShop
                  ? 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png'
                  : 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
                shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41],
              })}
            >
              <Popup>
                <View style={{ maxWidth: 200 }}>
                  <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>{shop.name}</Text>
                  <Text style={{ marginBottom: 4 }}>{shop.address}</Text>

                  <Pressable
                    style={[styles.popupButton, styles.detailsButton]}
                    onPress={() => navigation.navigate('ShopDetail', { shopId: shop.id })}
                  >
                    <Text style={styles.popupButtonText}>View Details</Text>
                  </Pressable>

                  <Pressable
                    style={styles.popupButton}
                    onPress={() => {
                      const gmaps = `https://www.google.com/maps/search/?api=1&query=${shop.latitude},${shop.longitude}`;
                      window.open(gmaps, '_blank');
                    }}
                  >
                    <Text style={styles.popupButtonText}>Open in Google Maps</Text>
                  </Pressable>
                </View>
              </Popup>
            </Marker>
        ))}
      </MapContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, position: 'relative' },
  map: { flex: 1, height: '100%', width: '100%' },
  topChrome: {
    position: 'absolute',
    top: 14,
    left: 16,
    right: 16,
    zIndex: 1100,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  backPill: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(15,23,42,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.22)',
    cursor: 'pointer',
    boxShadow: '0 2px 10px rgba(0,0,0,0.35)',
  },
  backPillPressed: {
    opacity: 0.9,
  },
  backPillIcon: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 24,
  },
  searchContainer: {
    flex: 1,
    zIndex: 1000,
    backgroundColor: '#fff',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    boxShadow: '0 2px 10px rgba(0,0,0,0.25)',
    gap: 10,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  searchButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  popupButton: {
    backgroundColor: '#34C759',
    padding: 6,
    borderRadius: 6,
    marginTop: 6,
    alignItems: 'center',
  },
  detailsButton: {
    backgroundColor: COLORS.primary,
  },
  popupButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});