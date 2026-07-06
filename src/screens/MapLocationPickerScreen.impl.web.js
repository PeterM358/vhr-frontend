/**
 * Web map pin picker (Leaflet) — same return contract as native.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { MapContainer, TileLayer, Marker, useMapEvents, ZoomControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Text } from 'react-native-paper';

import MapPickerChrome from '../components/map/MapPickerChrome';
import ScreenBackground from '../components/ScreenBackground';
import { COLORS } from '../constants/colors';
import BASE_STYLES from '../styles/base';
import { getWebGeolocation } from '../utils/webGeolocation';
import { ensureLeafletCss } from '../utils/leafletAssets.web';

function configureLeafletIcons() {
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}

const DEFAULT_CENTER = [42.6977, 23.3219];

function parseCoord(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function MapClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      onPick([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

function ChangeView({ center, zoom }) {
  const map = useMap();
  React.useEffect(() => {
    if (center) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);
  return null;
}

export default function MapLocationPickerScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const returnScreen = route.params?.returnScreen || 'AddManualServiceCenter';
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    let alive = true;
    ensureLeafletCss()
      .then(() => {
        configureLeafletIcons();
        if (alive) setMapReady(true);
      })
      .catch((err) => {
        console.error('Leaflet CSS failed to load', err);
      });
    return () => {
      alive = false;
    };
  }, []);

  const initialLat = parseCoord(route.params?.initialLatitude);
  const initialLon = parseCoord(route.params?.initialLongitude);

  const [pin, setPin] = useState(() =>
    initialLat != null && initialLon != null ? [initialLat, initialLon] : null
  );
  const [mapCenter, setMapCenter] = useState(() =>
    initialLat != null && initialLon != null ? [initialLat, initialLon] : DEFAULT_CENTER
  );
  const [locating, setLocating] = useState(false);
  const [geoHint, setGeoHint] = useState('');

  const pinLabel = useMemo(() => {
    if (!pin) return 'Click the map to place a pin, or use your location';
    return `${pin[0].toFixed(5)}, ${pin[1].toFixed(5)}`;
  }, [pin]);

  const handleLocateMe = async () => {
    setLocating(true);
    setGeoHint('');
    try {
      const { latitude, longitude } = await getWebGeolocation();
      const coords = [latitude, longitude];
      setPin(coords);
      setMapCenter(coords);
    } catch (err) {
      setGeoHint(err?.message || 'Could not get your location.');
    } finally {
      setLocating(false);
    }
  };

  const handleConfirm = () => {
    if (!pin) return;
    navigation.navigate({
      name: returnScreen,
      params: {
        mapPick: {
          latitude: pin[0],
          longitude: pin[1],
        },
        draft: route.params?.preservedDraft ?? route.params?.draft,
        vehicleId: route.params?.vehicleId,
        requireSetup: route.params?.requireSetup,
      },
      merge: true,
    });
  };

  return (
    <ScreenBackground safeArea={false}>
      <View style={BASE_STYLES.flexFill}>
        <View style={styles.mapWrap}>
          {!mapReady ? (
            <View style={styles.mapLoading}>
              <ActivityIndicator size="large" color="#fff" />
            </View>
          ) : (
          <MapContainer
            center={mapCenter}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <ChangeView center={mapCenter} zoom={13} />
            <ZoomControl position="bottomright" />
            <MapClickHandler onPick={setPin} />
            {pin ? (
              <Marker
                position={pin}
                draggable
                eventHandlers={{
                  dragend: (e) => {
                    const { lat, lng } = e.target.getLatLng();
                    setPin([lat, lng]);
                  },
                }}
              />
            ) : null}
          </MapContainer>
          )}
        </View>

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
              labelStyle={styles.locateLabel}
            >
              Locate me
            </Button>
          }
        />

        <Pressable
          style={[styles.locateFab, { bottom: insets.bottom + 168 }]}
          onPress={handleLocateMe}
          disabled={locating}
          accessibilityRole="button"
          accessibilityLabel="Locate me"
        >
          {locating ? (
            <ActivityIndicator color={COLORS.PRIMARY} size="small" />
          ) : (
            <MaterialCommunityIcons name="crosshairs-gps" size={26} color={COLORS.PRIMARY} />
          )}
        </Pressable>

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
  mapWrap: { flex: 1, minHeight: 320 },
  mapLoading: { flex: 1, minHeight: 320, alignItems: 'center', justifyContent: 'center' },
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
  coordHint: { color: COLORS.TEXT_MUTED, textAlign: 'center' },
  geoError: { color: '#b45309', fontSize: 13, textAlign: 'center', lineHeight: 18 },
  confirmBtn: { marginTop: 2 },
  locateLabel: { fontSize: 13 },
  locateFab: {
    position: 'absolute',
    right: 16,
    zIndex: 500,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15,23,42,0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
});
