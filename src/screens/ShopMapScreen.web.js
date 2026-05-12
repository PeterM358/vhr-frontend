// PATH: src/screens/ShopMapScreen.web.js
import 'leaflet/dist/leaflet.css';
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
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
import { Picker } from '@react-native-picker/picker';
import { getServiceCenters, VEHICLE_TYPE_FILTER_CHIPS } from '../api/serviceCenters';
import { API_BASE_URL } from '../api/config';
import ScreenBackground from '../components/ScreenBackground';
import BASE_STYLES from '../styles/base';

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
  }, [center, zoom, map]);
  return null;
}

export default function ShopMapScreen() {
  const navigation = useNavigation();
  const [shops, setShops] = useState([]);
  const [addressQuery, setAddressQuery] = useState('');
  const addressRef = useRef(addressQuery);
  addressRef.current = addressQuery;
  const userLocRef = useRef(null);

  const [center, setCenter] = useState([42.6977, 23.3219]);
  const zoom = 12;
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState(null);
  userLocRef.current = userLocation;

  const [selectedVehicleType, setSelectedVehicleType] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedRepairType, setSelectedRepairType] = useState('');
  const [repairTypes, setRepairTypes] = useState([]);

  const categoryOptions = useMemo(() => {
    const map = {};
    repairTypes.forEach((rt) => {
      const slug = rt.category_slug;
      const name = rt.category_name || slug;
      if (slug && name && !map[slug]) map[slug] = name;
    });
    return Object.entries(map)
      .map(([slug, name]) => ({ slug, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [repairTypes]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/repairs/types/`);
        const data = await res.json();
        if (res.ok && Array.isArray(data)) setRepairTypes(data);
      } catch (e) {
        console.warn('ShopMap web: could not load repair types', e);
      }
    })();
  }, []);

  const fetchShops = useCallback(async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const userIdStr = await AsyncStorage.getItem(STORAGE_KEYS.USER_ID);
      const userId = userIdStr ? parseInt(userIdStr, 10) : null;
      const hasValidToken =
        !!token && token !== 'null' && token !== 'undefined';

      const filters = {};
      const aq = addressRef.current.trim();
      if (aq) filters.address = aq;
      if (selectedVehicleType) filters.vehicle_type = selectedVehicleType;
      if (selectedCategory) filters.category = selectedCategory;
      if (selectedRepairType) filters.repair_type = selectedRepairType;

      const headers = hasValidToken ? { Authorization: `Bearer ${token}` } : {};

      const tryFetch = async (h) => getServiceCenters(filters, { headers: h });

      let shopsArray;
      try {
        shopsArray = await tryFetch(headers);
      } catch (err) {
        if (err.response?.status === 401 && hasValidToken) {
          shopsArray = await tryFetch({});
        } else {
          throw err;
        }
      }

      const updatedShops = shopsArray.map((shop) => ({
        ...shop,
        isMyShop: Number.isInteger(userId) && Array.isArray(shop.users) && shop.users.includes(userId),
      }));

      setShops(updatedShops);

      if (!userLocRef.current && updatedShops.length > 0) {
        const lat = parseFloat(updatedShops[0].latitude);
        const lng = parseFloat(updatedShops[0].longitude);
        if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
          setCenter([lat, lng]);
        }
      }
    } catch (error) {
      console.error('Error fetching shops:', error);
      window.alert(error.message || 'Could not load shops');
    } finally {
      setLoading(false);
    }
  }, [selectedVehicleType, selectedCategory, selectedRepairType]);

  useEffect(() => {
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
  }, []);

  useEffect(() => {
    fetchShops();
  }, [fetchShops]);

  const handleSearch = () => {
    fetchShops();
  };

  if (loading) {
    return (
      <ScreenBackground safeArea={false} contentMaxWidth={false}>
        <View style={BASE_STYLES.loadingCenter}>
          <ActivityIndicator size="large" />
        </View>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground safeArea={false} contentMaxWidth={false}>
      <View style={styles.container}>
        <View style={styles.topChrome} pointerEvents="box-none">
          <View style={styles.rowFirst}>
            <Pressable
              style={({ hovered, pressed }) => [
                styles.backPill,
                (pressed || hovered) && styles.backPillPressed,
              ]}
              onPress={() => {
                if (navigation.canGoBack()) {
                  navigation.goBack();
                  return;
                }
                navigation.navigate('Home');
              }}
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

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
            <Pressable
              onPress={() => setSelectedVehicleType(null)}
              style={[
                styles.chip,
                selectedVehicleType === null && styles.chipSelected,
              ]}
            >
              <Text style={styles.chipText}>Any vehicle</Text>
            </Pressable>
            {VEHICLE_TYPE_FILTER_CHIPS.map((vt) => {
              const on = selectedVehicleType === vt.code;
              return (
                <Pressable
                  key={vt.code}
                  onPress={() => setSelectedVehicleType(on ? null : vt.code)}
                  style={[styles.chip, on && styles.chipSelected]}
                >
                  <Text style={styles.chipText}>{vt.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
            <Pressable
              onPress={() => setSelectedCategory(null)}
              style={[
                styles.chip,
                selectedCategory === null && styles.chipSelected,
              ]}
            >
              <Text style={styles.chipText}>Any category</Text>
            </Pressable>
            {categoryOptions.map((c) => {
              const on = selectedCategory === c.slug;
              return (
                <Pressable
                  key={c.slug}
                  onPress={() => setSelectedCategory(on ? null : c.slug)}
                  style={[styles.chip, on && styles.chipSelected]}
                >
                  <Text style={styles.chipText}>{c.name}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.pickerWrap}>
            <Picker
              selectedValue={selectedRepairType}
              onValueChange={(v) => setSelectedRepairType(v || '')}
              style={styles.picker}
            >
              <Picker.Item label="Service type (any)" value="" />
              {repairTypes
                .filter((rt) => rt.slug)
                .map((rt) => (
                  <Picker.Item key={rt.id} label={rt.name} value={rt.slug} />
                ))}
            </Picker>
          </View>
        </View>

        <MapContainer center={center} zoom={zoom} style={styles.map} zoomControl={false}>
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ChangeView center={center} zoom={zoom} />

          <ZoomControl position="bottomright" />

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
            .map((shop) => ({
              ...shop,
              latitude: shop.latitude ? parseFloat(shop.latitude) : null,
              longitude: shop.longitude ? parseFloat(shop.longitude) : null,
            }))
            .filter((s) => !isNaN(s.latitude) && !isNaN(s.longitude))
            .map((shop) => (
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
    </ScreenBackground>
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
  },
  rowFirst: {
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
  filterRow: {
    marginTop: 8,
    maxHeight: 40,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    marginRight: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.12)',
    justifyContent: 'center',
    cursor: 'pointer',
    alignSelf: 'flex-start',
  },
  chipSelected: {
    backgroundColor: 'rgba(226,237,255,0.98)',
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '500',
  },
  pickerWrap: {
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: '#fff',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
  },
  picker: {
    width: '100%',
  },
  popupButton: {
    backgroundColor: '#34C759',
    padding: 6,
    borderRadius: 6,
    marginTop: 6,
    alignItems: 'center',
    cursor: 'pointer',
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
