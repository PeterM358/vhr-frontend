/**
 * react-native-maps Marker wrapper for service center discovery pins.
 * Android needs tracksViewChanges toggling so custom marker views snapshot correctly.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { Marker } from 'react-native-maps';

import VeversalMapPin from './VeversalMapPin';
import { resolveShopMapPinKey } from '../../utils/resolveShopMapPin';
import { shopMapCoordinate } from '../../utils/mapMarkerSpread';

const TRACKS_VIEW_CHANGES_MS = 800;
const TRACKS_VIEW_SETTLE_MS = 120;

/**
 * @param {object} props
 * @param {object} props.shop
 * @param {boolean} props.selected
 * @param {() => void} props.onPress
 */
export default function ServiceCenterMapMarker({ shop, selected, onPress }) {
  const coord = shopMapCoordinate(shop);
  const lat = coord?.latitude ?? null;
  const lon = coord?.longitude ?? null;
  const category = resolveShopMapPinKey(shop);
  const verified = Boolean(shop?.is_verified);
  const openNow = shop?.is_open_now;
  const settleTimerRef = useRef(null);
  const layoutLoggedRef = useRef(false);

  const [tracksViewChanges, setTracksViewChanges] = useState(Platform.OS === 'android');
  const [layoutSize, setLayoutSize] = useState({ width: 0, height: 0 });

  const clearSettleTimer = useCallback(() => {
    if (settleTimerRef.current) {
      clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }
  }, []);

  const scheduleSettleTracksViewChanges = useCallback(() => {
    if (Platform.OS !== 'android') return;
    clearSettleTimer();
    settleTimerRef.current = setTimeout(() => {
      setTracksViewChanges(false);
      settleTimerRef.current = null;
    }, TRACKS_VIEW_SETTLE_MS);
  }, [clearSettleTimer]);

  const refreshTracksViewChanges = useCallback(() => {
    if (Platform.OS !== 'android') return;
    layoutLoggedRef.current = false;
    setTracksViewChanges(true);
    clearSettleTimer();
    settleTimerRef.current = setTimeout(() => {
      scheduleSettleTracksViewChanges();
    }, TRACKS_VIEW_CHANGES_MS);
  }, [clearSettleTimer, scheduleSettleTracksViewChanges]);

  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    refreshTracksViewChanges();
    return clearSettleTimer;
  }, [selected, category, verified, openNow, shop?.id, refreshTracksViewChanges, clearSettleTimer]);

  const handlePinLayout = useCallback(
    (event) => {
      const { width, height } = event.nativeEvent.layout;
      setLayoutSize({ width, height });
      if (Platform.OS !== 'android' || !tracksViewChanges) return;
      if (__DEV__ && !layoutLoggedRef.current) {
        layoutLoggedRef.current = true;
        console.log(`[service-pin] layout_width=${width} layout_height=${height}`);
      }
      scheduleSettleTracksViewChanges();
    },
    [scheduleSettleTracksViewChanges, tracksViewChanges]
  );

  useEffect(() => {
    if (!__DEV__) return;
    const render = Number.isFinite(lat) && Number.isFinite(lon);
    console.log(`[service-pin] platform=${Platform.OS}`);
    console.log(`[service-pin] shop_id=${shop?.id}`);
    console.log(`[service-pin] latitude=${lat}`);
    console.log(`[service-pin] longitude=${lon}`);
    console.log(`[service-pin] category=${category}`);
    console.log(`[service-pin] selected=${selected}`);
    console.log(`[service-pin] render=${render}`);
    if (layoutSize.width || layoutSize.height) {
      console.log(`[service-pin] layout_width=${layoutSize.width}`);
      console.log(`[service-pin] layout_height=${layoutSize.height}`);
    }
  });

  if (lat == null || lon == null) return null;

  return (
    <Marker
      coordinate={{ latitude: lat, longitude: lon }}
      anchor={{ x: 0.5, y: 0.5 }}
      zIndex={selected ? 12 : 8}
      tracksViewChanges={Platform.OS === 'android' ? tracksViewChanges : false}
      onPress={onPress}
    >
      <VeversalMapPin shop={shop} selected={selected} onLayout={handlePinLayout} />
    </Marker>
  );
}

export function buildServiceCenterMarkerKey(shop, selected = false) {
  const base = shop.list_id || `shop-${shop.id}`;
  const category = resolveShopMapPinKey(shop);
  return `${base}-${category}-${selected ? 'sel' : 'nom'}`;
}
