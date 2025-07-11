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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { useNavigation } from '@react-navigation/native';
import { API_BASE_URL } from '../api/config';
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
  const [selectedShop, setSelectedShop] = useState(null);
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
      const userId = parseInt(userIdStr, 10);

      const url = `${API_BASE_URL}/api/profiles/shops/${address ? `?address=${encodeURIComponent(address)}` : ''}`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      const updatedShops = data.map(shop => ({
        ...shop,
        isMyShop: Array.isArray(shop.users) && shop.users.includes(userId),
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

  const handleViewDetails = () => {
    if (selectedShop) {
      navigation.navigate('ShopDetail', { shopId: selectedShop.id });
    }
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Back button in top-left corner */}
      <Pressable style={styles.backButton} onPress={() => navigation.navigate('Home')}>
        <Text style={styles.backButtonText}>← Back</Text>
      </Pressable>

      {/* Search box */}
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
          .filter(s => typeof s.latitude === 'number' && typeof s.longitude === 'number')
          .map(shop => (
            <Marker
              key={shop.id}
              position={[shop.latitude, shop.longitude]}
              eventHandlers={{
                click: () => setSelectedShop(shop),
              }}
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

      {selectedShop && (
        <View style={styles.detailsBox}>
          <Text style={styles.detailsText}>
            Selected: {selectedShop.name} - {selectedShop.address}
          </Text>
          <Pressable style={styles.detailsButton} onPress={handleViewDetails}>
            <Text style={styles.detailsButtonText}>View Details</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, position: 'relative' },
  map: { flex: 1, height: '100%', width: '100%' },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 1100,
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  searchContainer: {
    position: 'absolute',
    top: 70,
    left: 20,
    right: 20,
    zIndex: 1000,
    backgroundColor: '#fff',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
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
    backgroundColor: '#007AFF',
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
  popupButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  detailsBox: {
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  detailsText: {
    marginBottom: 8,
    fontSize: 16,
  },
  detailsButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  detailsButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});