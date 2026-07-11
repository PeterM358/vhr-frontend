import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { COLORS } from '../../styles/colors';
import DISCOVERY_MOBILE, { discoveryMinFont } from './discoveryMobileTokens';

export default function DiscoveryViewToggle({ value, onChange, listLabel, mapLabel, style }) {
  return (
    <View style={[styles.wrap, style]}>
      <Pressable
        onPress={() => onChange('list')}
        style={({ pressed }) => [
          styles.tab,
          value === 'list' && styles.tabActive,
          pressed && styles.tabPressed,
        ]}
        accessibilityRole="button"
        accessibilityState={{ selected: value === 'list' }}
      >
        <MaterialCommunityIcons
          name="format-list-bulleted"
          size={16}
          color={value === 'list' ? COLORS.primary : '#64748b'}
          style={styles.tabIcon}
        />
        <Text style={[styles.tabText, value === 'list' && styles.tabTextActive]}>{listLabel}</Text>
      </Pressable>
      <Pressable
        onPress={() => onChange('map')}
        style={({ pressed }) => [
          styles.tab,
          value === 'map' && styles.tabActive,
          pressed && styles.tabPressed,
        ]}
        accessibilityRole="button"
        accessibilityState={{ selected: value === 'map' }}
      >
        <MaterialCommunityIcons
          name="map-outline"
          size={16}
          color={value === 'map' ? COLORS.primary : '#64748b'}
          style={styles.tabIcon}
        />
        <Text style={[styles.tabText, value === 'map' && styles.tabTextActive]}>{mapLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    backgroundColor: '#e8eef5',
    borderRadius: DISCOVERY_MOBILE.radius.segmented,
    padding: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: DISCOVERY_MOBILE.color.border,
    minHeight: DISCOVERY_MOBILE.height.segmented,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: DISCOVERY_MOBILE.radius.segmented - 2,
    cursor: 'pointer',
  },
  tabActive: {
    backgroundColor: '#fff',
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  tabPressed: {
    opacity: 0.92,
  },
  tabIcon: {
    marginRight: 6,
  },
  tabText: {
    fontSize: discoveryMinFont(13),
    fontWeight: '600',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#0f172a',
    fontWeight: '700',
  },
});
