// Native (default) map pin marker body for react-native-maps.

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { resolveShopMapPin } from '../../utils/resolveShopMapPin';

export const PIN_SIZE = 38;
const ICON_SIZE = 18;
const BADGE_PAD_X = 8;
const BADGE_PAD_TOP = 4;

/**
 * @param {object} props
 * @param {object} props.shop
 * @param {boolean} [props.selected]
 * @param {number} [props.size]
 * @param {import('react-native').ViewProps['onLayout']} [props.onLayout]
 */
export default function VeversalMapPin({ shop, selected = false, size = PIN_SIZE, onLayout }) {
  const pin = resolveShopMapPin(shop);
  const verified = Boolean(shop?.is_verified);
  const openNow = shop?.is_open_now;
  const isMyShop = Boolean(shop?.isMyShop);
  const scale = selected ? 1.12 : 1;
  const diameter = size * scale;
  const wrapWidth = diameter + BADGE_PAD_X;
  const wrapHeight = diameter + BADGE_PAD_TOP + 8;

  let statusColor = null;
  if (openNow === true) statusColor = '#22c55e';
  else if (openNow === false) statusColor = '#94a3b8';

  const useAndroidGlyph = Platform.OS === 'android';

  return (
    <View
      collapsable={false}
      onLayout={onLayout}
      style={[
        styles.wrap,
        {
          width: wrapWidth,
          height: wrapHeight,
          minWidth: wrapWidth,
          minHeight: wrapHeight,
        },
      ]}
    >
      <View
        style={[
          styles.pin,
          {
            width: diameter,
            height: diameter,
            borderRadius: diameter / 2,
            backgroundColor: pin.color,
          },
          selected && styles.pinSelected,
          isMyShop && styles.pinMyShop,
        ]}
      >
        {useAndroidGlyph ? (
          <Text style={[styles.glyph, { fontSize: ICON_SIZE * scale }]}>{pin.webGlyph}</Text>
        ) : (
          <MaterialCommunityIcons name={pin.icon} size={ICON_SIZE * scale} color="#fff" />
        )}
      </View>
      {verified ? (
        <View style={[styles.badge, styles.verifiedBadge, { right: selected ? 0 : 2 }]}>
          {useAndroidGlyph ? (
            <Text style={styles.badgeGlyph}>✓</Text>
          ) : (
            <MaterialCommunityIcons name="check-decagram" size={12} color="#fff" />
          )}
        </View>
      ) : null}
      {statusColor ? (
        <View
          style={[
            styles.badge,
            styles.statusDot,
            { backgroundColor: statusColor, left: selected ? 0 : 2 },
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  pin: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#0f172a',
    shadowOpacity: 0.28,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 6,
  },
  glyph: {
    color: '#fff',
    textAlign: 'center',
    includeFontPadding: false,
    lineHeight: 20,
  },
  badgeGlyph: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
    includeFontPadding: false,
  },
  pinSelected: {
    borderColor: '#c4b5fd',
    borderWidth: 3,
  },
  pinMyShop: {
    borderColor: '#86efac',
  },
  badge: {
    position: 'absolute',
    top: 0,
  },
  verifiedBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#fff',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#fff',
    bottom: 2,
    top: undefined,
  },
});
