/**
 * Shared drawer footer and icon helpers — Veversal branding.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Logo from '../assets/images/logo.svg';
import { COLORS } from '../constants/colors';

export const DRAWER_ICON_SIZE = 22;

export function DrawerMenuIcon({ name, color, size = DRAWER_ICON_SIZE }) {
  return <MaterialCommunityIcons name={name} size={size} color={color} />;
}

export function DrawerLabelWithBadge({ label, badge, color }) {
  return (
    <View style={styles.labelRow}>
      <Text style={[styles.labelText, color ? { color } : null]} numberOfLines={1}>
        {label}
      </Text>
      {badge != null && badge > 0 ? (
        <View style={styles.badgeWrap}>
          <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      ) : null}
    </View>
  );
}

export function DrawerVeversalLogoFooter() {
  return (
    <View style={styles.logoFooter} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Logo width={52} height={52} />
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  labelText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.TEXT_DARK,
  },
  badgeWrap: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: COLORS.PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  logoFooter: {
    alignItems: 'center',
    marginTop: 48,
    paddingTop: 28,
    paddingBottom: 12,
  },
});
