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
import { STORAGE_KEYS } from '../constants/storageKeys';
import { getServiceCenters, VEHICLE_TYPE_FILTER_CHIPS } from '../api/serviceCenters';
import { spreadShopMarkersForMap, regionForMapPoints } from '../utils/mapMarkerSpread';
import { API_BASE_URL } from '../api/config';
import { updateVehicle } from '../api/vehicles';
import ScreenBackground from '../components/ScreenBackground';
import BackHeaderButton from '../components/navigation/BackHeaderButton';
import BASE_STYLES from '../styles/base';
import { devLog } from '../utils/logger';
import { formatAuthorizeConfirmMessage } from '../utils/shopDataAccess';
import {
  buildSharedShopIdsAfterToggle,
  formatVehicleAuthorizeLabel,
  isShopAuthorizedForVehicle,
  resolveAuthorizeVehicleId,
} from '../utils/vehicleShopAuthorization';

const getNow = () => new Date().toISOString();

function withTimeout(promise, ms = 5000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms)),
  ]);
}

export default function ShopMapScreen({ navigation, route }) {
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

  const authorizeVehicleId = resolveAuthorizeVehicleId(route.params);
  const authorizeMode = authorizeVehicleId != null;
  const [authorizeVehicle, setAuthorizeVehicle] = useState(null);

  useEffect(() => {
    let alive = true;
    if (!authorizeVehicleId) {
      setAuthorizeVehicle(null);
      return undefined;
    }
    (async () => {
      try {
        const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        if (!token) return;
        const res = await fetch(`${API_BASE_URL}/api/vehicles/${authorizeVehicleId}/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (alive) setAuthorizeVehicle(data);
      } catch (error) {
        console.warn('ShopMap: could not load authorize vehicle', error);
      }
    })();
    return () => {
      alive = false;
    };
  }, [authorizeVehicleId]);

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

  const repairTypeChipOptions = useMemo(() => {
    const rows = repairTypes.filter((rt) => rt.slug);
    if (!selectedCategory) return rows;
    return rows.filter((rt) => rt.category_slug === selectedCategory);
  }, [repairTypes, selectedCategory]);

  useEffect(() => {
    if (!selectedRepairType) return;
    const stillValid = repairTypeChipOptions.some((rt) => rt.slug === selectedRepairType);
    if (!stillValid) setSelectedRepairType('');
  }, [repairTypeChipOptions, selectedRepairType]);

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
    devLog(`[${getNow()}] ShopMapScreen: fetch service centers`);
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
      devLog(`[${getNow()}] ShopMapScreen: fetch done (${elapsed}ms)`);
    }
  }, [selectedVehicleType, selectedCategory, selectedRepairType]);

  const fetchEverything = async () => {
    devLog(`[${getNow()}] ShopMapScreen: starting fetchEverything`);
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
    devLog(`[${getNow()}] ShopMapScreen: location fetched`);
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

  const openShopProfile = (shop) => {
    navigation.navigate('ShopDetail', {
      shopId: shop.id,
      returnTo: route.params?.returnTo,
      vehicleId: authorizeVehicleId ?? route.params?.vehicleId,
    });
  };

  const handleAuthorizeShop = (shop) => {
    if (!authorizeVehicle || !shop?.id) {
      openShopProfile(shop);
      return;
    }
    if (isShopAuthorizedForVehicle(authorizeVehicle, shop.id)) {
      openShopProfile(shop);
      return;
    }
    Alert.alert('Authorize service center?', formatAuthorizeConfirmMessage(shop.name), [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Authorize',
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
            const nextIds = buildSharedShopIdsAfterToggle(authorizeVehicle, shop.id, true);
            const updated = await updateVehicle(authorizeVehicle.id, { shared_with_shops_ids: nextIds }, token);
            setAuthorizeVehicle(updated);
            Alert.alert('Authorized', `${shop.name} can now see full mechanical history for this vehicle.`);
          } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Could not authorize this service center.');
          }
        },
      },
    ]);
  };

  const displayShops = useMemo(() => {
    const normalized = shops
      .map((s) => ({
        ...s,
        latitude: s.latitude ? parseFloat(s.latitude) : null,
        longitude: s.longitude ? parseFloat(s.longitude) : null,
      }))
      .filter((s) => Number.isFinite(s.latitude) && Number.isFinite(s.longitude));
    return spreadShopMarkersForMap(normalized, location);
  }, [shops, location]);

  useEffect(() => {
    if (!location || displayShops.length === 0) return;
    const region = regionForMapPoints(displayShops);
    if (region) mapRef.current?.animateToRegion(region, 1000);
  }, [location, displayShops]);

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
          {displayShops.map((shop) => {
              const isReported = shop.source === 'owner_reported';
              const markerKey = shop.list_id || `${shop.source || 'shop'}-${shop.id}`;
              const lat = shop.displayLatitude ?? shop.latitude;
              const lon = shop.displayLongitude ?? shop.longitude;
              const capabilityLine = [
                (shop.supported_vehicle_type_names || []).join(', '),
                (shop.observed_repair_type_names || shop.available_repair_names || []).join(', '),
              ]
                .filter(Boolean)
                .join(' · ');
              return (
              <Marker
                key={markerKey}
                coordinate={{ latitude: lat, longitude: lon }}
                pinColor={shop.isMyShop ? 'green' : isReported ? 'orange' : 'red'}
              >
                <Callout>
                  <View style={{ maxWidth: 220 }}>
                    <Text variant="titleMedium" style={{ fontWeight: 'bold' }}>{shop.name}</Text>
                    {isReported ? (
                      <Text variant="bodySmall" style={{ marginTop: 2 }}>
                        Reported by owners · not verified
                      </Text>
                    ) : null}
                    <Text variant="bodySmall">{shop.address}</Text>
                    {capabilityLine ? (
                      <Text variant="bodySmall" style={{ marginTop: 4, color: '#64748b' }}>
                        {capabilityLine}
                      </Text>
                    ) : null}
                    {authorizeMode ? (
                      <Pressable onPress={() => handleAuthorizeShop(shop)} style={styles.calloutAction}>
                        <Text style={styles.calloutActionPrimary}>
                          {isShopAuthorizedForVehicle(authorizeVehicle, shop.id) ? 'Authorized' : 'Authorize'}
                        </Text>
                      </Pressable>
                    ) : null}
                    <Pressable onPress={() => openShopProfile(shop)} style={styles.calloutAction}>
                      <Text style={{ color: theme.colors.primary, fontWeight: '700' }}>View profile</Text>
                    </Pressable>
                  </View>
                </Callout>
              </Marker>
            );
            })}
        </MapView>

        <View style={[styles.chromeColumn, { paddingTop: insets.top + 10 }]} pointerEvents="box-none">
          <View style={styles.rowBackSearch}>
            <BackHeaderButton
              onPress={() => {
                if (route.params?.returnTo === 'ManageVehicleServiceCenters' && authorizeVehicleId != null) {
                  navigation.navigate('ManageVehicleServiceCenters', { vehicleId: authorizeVehicleId });
                  return;
                }
                if (route.params?.returnTo === 'VehicleDetail' && authorizeVehicleId != null) {
                  navigation.navigate('VehicleDetail', { vehicleId: authorizeVehicleId });
                  return;
                }
                navigation.navigate('Home');
              }}
              label="Back"
              variant="glass"
            />

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

          {authorizeMode ? (
            <Surface style={styles.authorizeBanner} elevation={3}>
              <MaterialCommunityIcons name="car-info" size={18} color="#1d4ed8" />
              <Text style={styles.authorizeBannerText}>
                Authorizing for {formatVehicleAuthorizeLabel(authorizeVehicle)}
              </Text>
            </Surface>
          ) : null}

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

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
            <Pressable
              onPress={() => setSelectedRepairType('')}
              style={[
                styles.chip,
                !selectedRepairType && styles.chipSelected,
                !selectedRepairType && { borderColor: theme.colors.primary },
              ]}
            >
              <Text style={styles.chipText}>Any service</Text>
            </Pressable>
            {repairTypeChipOptions.map((rt) => {
              const on = selectedRepairType === rt.slug;
              return (
                <Pressable
                  key={rt.id}
                  onPress={() => setSelectedRepairType(on ? '' : rt.slug)}
                  style={[styles.chip, on && styles.chipSelected, on && { borderColor: theme.colors.primary }]}
                >
                  <Text style={styles.chipText}>{rt.name}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
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
  calloutAction: {
    marginTop: 8,
  },
  calloutActionPrimary: {
    color: '#166534',
    fontWeight: '700',
  },
  authorizeBanner: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(37,99,235,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  authorizeBannerText: {
    flex: 1,
    color: '#1e3a8a',
    fontSize: 13,
    lineHeight: 18,
  },
});
