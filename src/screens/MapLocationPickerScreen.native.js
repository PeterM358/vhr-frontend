/**
 * Tap or drag a pin to pick coordinates (manual service center, shop profile, etc.).
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Text } from 'react-native-paper';

import MapPickerChrome from '../components/map/MapPickerChrome';
import ScreenBackground from '../components/ScreenBackground';
import { COLORS } from '../constants/colors';
import BASE_STYLES from '../styles/base';

const DEFAULT_REGION = {
  latitude: 42.6977,
  longitude: 23.3219,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

function parseCoord(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export default function MapLocationPickerScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const returnScreen = route.params?.returnScreen || 'AddManualServiceCenter';

  const initialLat = parseCoord(route.params?.initialLatitude);
  const initialLon = parseCoord(route.params?.initialLongitude);

  const [region, setRegion] = useState(DEFAULT_REGION);
  const [pin, setPin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);
  const [geoHint, setGeoHint] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (initialLat != null && initialLon != null) {
          if (!cancelled) {
            const next = {
              latitude: initialLat,
              longitude: initialLon,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            };
            setRegion(next);
            setPin({ latitude: initialLat, longitude: initialLon });
          }
        } else {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const loc = await Location.getCurrentPositionAsync({});
            if (!cancelled) {
              const next = {
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              };
              setRegion(next);
              setPin({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
            }
          }
        }
      } catch (e) {
        console.warn('MapLocationPicker: could not load GPS', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialLat, initialLon]);

  const pinLabel = useMemo(() => {
    if (!pin) return 'Tap the map to place a pin';
    return `${pin.latitude.toFixed(5)}, ${pin.longitude.toFixed(5)}`;
  }, [pin]);

  const handleLocateMe = async () => {
    setLocating(true);
    setGeoHint('');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission denied. Enable location in settings or place a pin manually.');
      }
      const loc = await Location.getCurrentPositionAsync({});
      const next = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
      setRegion(next);
      setPin({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    } catch (e) {
      setGeoHint(e?.message || 'Could not get your location.');
    } finally {
      setLocating(false);
    }
  };

  const handleMapPress = useCallback((e) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setPin({ latitude, longitude });
  }, []);

  const handleConfirm = () => {
    if (!pin) return;
    navigation.navigate({
      name: returnScreen,
      params: {
        mapPick: {
          latitude: pin.latitude,
          longitude: pin.longitude,
        },
        draft: route.params?.preservedDraft ?? route.params?.draft,
        vehicleId: route.params?.vehicleId,
        requireSetup: route.params?.requireSetup,
      },
      merge: true,
    });
  };

  if (loading) {
    return (
      <ScreenBackground safeArea={false}>
        <View style={[BASE_STYLES.flexFill, styles.loader]}>
          <ActivityIndicator size="large" />
        </View>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground safeArea={false}>
      <View style={BASE_STYLES.flexFill}>
        <MapView
          style={styles.map}
          region={region}
          onRegionChangeComplete={setRegion}
          onPress={handleMapPress}
        >
          {pin ? (
            <Marker
              coordinate={pin}
              draggable
              onDragEnd={(e) => setPin(e.nativeEvent.coordinate)}
            />
          ) : null}
        </MapView>

        <MapPickerChrome
          topInset={insets.top}
          title="Pick location on map"
          onBack={() => navigation.goBack()}
          rightAction={
            <Button
              mode="contained-tonal"
              compact
              icon="crosshairs-gps"
              loading={locating}
              disabled={locating}
              onPress={handleLocateMe}
            >
              Locate
            </Button>
          }
        />

        <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
          <Text style={styles.coordHint}>{pinLabel}</Text>
          {geoHint ? <Text style={styles.geoError}>{geoHint}</Text> : null}
          <Button mode="outlined" icon="crosshairs-gps" onPress={handleLocateMe} loading={locating} disabled={locating}>
            Use my location
          </Button>
          <Button mode="contained" onPress={handleConfirm} disabled={!pin} style={styles.confirmBtn}>
            Use this location
          </Button>
        </View>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
  loader: { justifyContent: 'center', alignItems: 'center' },
  footer: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 0,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15,23,42,0.12)',
  },
  coordHint: {
    color: COLORS.TEXT_MUTED,
    textAlign: 'center',
  },
  geoError: {
    color: '#b45309',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  confirmBtn: { borderRadius: 10 },
});
