/**
 * Web map pin picker (Leaflet) — same return contract as native.
 */

import 'leaflet/dist/leaflet.css';
import React, { useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { MapContainer, TileLayer, Marker, useMapEvents, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Text } from 'react-native-paper';

import MapPickerChrome from '../components/map/MapPickerChrome';
import ScreenBackground from '../components/ScreenBackground';
import { COLORS } from '../constants/colors';
import BASE_STYLES from '../styles/base';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

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

export default function MapLocationPickerScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const returnScreen = route.params?.returnScreen || 'AddManualServiceCenter';

  const initialLat = parseCoord(route.params?.initialLatitude);
  const initialLon = parseCoord(route.params?.initialLongitude);

  const [pin, setPin] = useState(() =>
    initialLat != null && initialLon != null ? [initialLat, initialLon] : null
  );

  const center = pin || (initialLat != null && initialLon != null ? [initialLat, initialLon] : DEFAULT_CENTER);

  const pinLabel = useMemo(() => {
    if (!pin) return 'Click the map to place a pin';
    return `${pin[0].toFixed(5)}, ${pin[1].toFixed(5)}`;
  }, [pin]);

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
        logServiceRecordDraft: route.params?.logServiceRecordDraft,
        requireSetup: route.params?.requireSetup,
      },
      merge: true,
    });
  };

  return (
    <ScreenBackground safeArea={false}>
      <View style={BASE_STYLES.flexFill}>
        <View style={styles.mapWrap}>
          <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
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
        </View>

        <MapPickerChrome
          topInset={insets.top}
          title="Pick location on map"
          onBack={() => navigation.goBack()}
        />

        <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
          <Text style={styles.coordHint}>{pinLabel}</Text>
          <Button mode="contained" onPress={handleConfirm} disabled={!pin}>
            Use this location
          </Button>
        </View>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  mapWrap: { flex: 1, minHeight: 320 },
  footer: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 12,
    padding: 12,
  },
  coordHint: { color: COLORS.TEXT_MUTED, marginBottom: 10, textAlign: 'center' },
});
