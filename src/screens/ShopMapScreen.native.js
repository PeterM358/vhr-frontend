import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { TextInput, Button, Surface, useTheme, Text } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { getServiceCenters, VEHICLE_TYPE_FILTER_CHIPS } from '../api/serviceCenters';
import { API_BASE_URL } from '../api/config';
import ScreenBackground from '../components/ScreenBackground';
import BASE_STYLES from '../styles/base';

const getNow = () => new Date().toISOString();

function withTimeout(promise, ms = 5000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms)),
  ]);
}

export default function ShopMapScreen({ navigation }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [location, setLocation] = useState(null);
  const [shops, setShops] = useState([]);
  const [addressQuery, setAddressQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const mapRef = useRef(null);

  const [selectedVehicleType, setSelectedVehicleType] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedRepairType, setSelectedRepairType] = useState('');
  const [repairTypes, setRepairTypes] = useState([]);
  const addressRef = useRef(addressQuery);
  addressRef.current = addressQuery;

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
        const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await fetch(`${API_BASE_URL}/api/repairs/types/`, { headers });
        const data = await res.json();
        if (res.ok && Array.isArray(data)) setRepairTypes(data);
      } catch (e) {
        console.warn('ShopMap: could not load repair types for filters', e);
      }
    })();
  }, []);

  const fetchShops = useCallback(async () => {
    const fetchStart = Date.now();
    console.log(`[${getNow()}] 📡 ShopMapScreen: fetch service centers...`);
    setLoading(true);
    const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    const userIdStr = await AsyncStorage.getItem(STORAGE_KEYS.USER_ID);
    const userId = userIdStr ? parseInt(userIdStr, 10) : null;

    try {
      const filters = {};
      const aq = addressRef.current.trim();
      if (aq) filters.address = aq;
      if (selectedVehicleType) filters.vehicle_type = selectedVehicleType;
      if (selectedCategory) filters.category = selectedCategory;
      if (selectedRepairType) filters.repair_type = selectedRepairType;

      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const shopsArray = await getServiceCenters(filters, { headers });

      const updatedShops = shopsArray.map((shop) => ({
        ...shop,
        isMyShop: Number.isInteger(userId) && Array.isArray(shop.users) && shop.users.includes(userId),
      }));

      setShops(updatedShops);
    } catch (error) {
      console.error('Error fetching shops:', error);
      Alert.alert('Error', error.message || 'Could not load shops');
    } finally {
      setLoading(false);
      const elapsed = Date.now() - fetchStart;
      console.log(`[${getNow()}] ✅ ShopMapScreen: fetch done. Elapsed: ${elapsed}ms`);
    }
  }, [selectedVehicleType, selectedCategory, selectedRepairType]);

  const fetchEverything = async () => {
    console.log(`[${getNow()}] 🟡 ShopMapScreen: Starting fetchEverything...`);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setLoading(false);
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
    console.log(`[${getNow()}] 🟢 ShopMapScreen: Location fetched`);
  };

  useEffect(() => {
    fetchEverything();
  }, []);

  useEffect(() => {
    if (!location) return;
    fetchShops();
  }, [
    location,
    selectedVehicleType,
    selectedCategory,
    selectedRepairType,
    fetchShops,
  ]);

  const handleSearch = () => {
    fetchShops();
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

  if (!location || loading) {
    return (
      <ScreenBackground safeArea={false}>
        <View style={[BASE_STYLES.flexFill, styles.loaderWrap]}>
          <ActivityIndicator size="large" />
        </View>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground safeArea={false}>
      <View style={BASE_STYLES.flexFill}>
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
            .map((s) => ({
              ...s,
              latitude: s.latitude ? parseFloat(s.latitude) : null,
              longitude: s.longitude ? parseFloat(s.longitude) : null,
            }))
            .filter((s) => !isNaN(s.latitude) && !isNaN(s.longitude))
            .map((shop) => (
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

        <View style={[styles.chromeColumn, { paddingTop: insets.top + 10 }]} pointerEvents="box-none">
          <View style={styles.rowBackSearch}>
            <Pressable
              onPress={() => {
                if (navigation.canGoBack()) {
                  navigation.goBack();
                  return;
                }
                navigation.navigate('Home');
              }}
              style={({ pressed }) => [styles.backPill, pressed && styles.backPillPressed]}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <MaterialCommunityIcons name="chevron-left" size={28} color="#fff" />
            </Pressable>

            <Surface style={styles.searchSurface} elevation={4}>
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

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
            <Pressable
              onPress={() => setSelectedVehicleType(null)}
              style={[
                styles.chip,
                selectedVehicleType === null && styles.chipSelected,
                selectedVehicleType === null && { borderColor: theme.colors.primary },
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
                  style={[styles.chip, on && styles.chipSelected, on && { borderColor: theme.colors.primary }]}
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
                selectedCategory === null && { borderColor: theme.colors.primary },
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
                  style={[styles.chip, on && styles.chipSelected, on && { borderColor: theme.colors.primary }]}
                >
                  <Text style={styles.chipText}>{c.name}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Surface style={styles.pickerSurface} elevation={2}>
            <View style={styles.pickerClip}>
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
          </Surface>
        </View>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  loaderWrap: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  map: { flex: 1 },
  chromeColumn: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: 0,
    zIndex: 20,
  },
  rowBackSearch: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backPill: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(15,23,42,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.22)',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  backPillPressed: {
    opacity: 0.9,
  },
  searchSurface: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: '#fff',
  },
  searchInput: {
    flex: 1,
    marginRight: 6,
    backgroundColor: 'transparent',
    maxHeight: 48,
  },
  searchButton: {
    height: 40,
    justifyContent: 'center',
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
  },
  chipSelected: {
    backgroundColor: 'rgba(226,237,255,0.98)',
  },
  chipText: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '500',
  },
  pickerSurface: {
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  pickerClip: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  picker: {
    width: '100%',
  },
});
