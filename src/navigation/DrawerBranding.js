/**
 * Shared drawer footer, icon helpers, and dark glass theme — Veversal branding.
 */

import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Logo from '../assets/images/logo.svg';
import { COLORS } from '../constants/colors';
import { APP_NAV_PILL_BORDER_RADIUS } from '../components/common/appNavBarMetrics';

export const DRAWER_ICON_SIZE = 22;

export const DRAWER_GLASS = {
  backgroundColor: 'rgba(15, 23, 42, 0.78)',
  borderColor: 'rgba(255, 255, 255, 0.18)',
};

export const DRAWER_TINT = {
  active: COLORS.PRIMARY,
  inactive: 'rgba(255, 255, 255, 0.92)',
  title: 'rgba(255, 255, 255, 0.55)',
  activeBackground: 'rgba(37, 99, 235, 0.18)',
};

export const drawerScreenOptions = {
  headerShown: false,
  drawerActiveTintColor: DRAWER_TINT.active,
  drawerInactiveTintColor: DRAWER_TINT.inactive,
  drawerActiveBackgroundColor: DRAWER_TINT.activeBackground,
  drawerInactiveBackgroundColor: 'transparent',
  drawerStyle: {
    backgroundColor: 'transparent',
    width: 300,
  },
  overlayColor: 'rgba(0, 0, 0, 0.45)',
};

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

export const drawerGlassStyles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: DRAWER_GLASS.backgroundColor,
    borderRightWidth: 1,
    borderRightColor: DRAWER_GLASS.borderColor,
    ...(Platform.OS === 'web'
      ? {
          backdropFilter: 'saturate(180%) blur(20px)',
          WebkitBackdropFilter: 'saturate(180%) blur(20px)',
        }
      : {}),
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 36,
    paddingBottom: 16,
  },
  menuContainer: {
    flexGrow: 1,
  },
  drawerTitle: {
    marginLeft: 20,
    marginBottom: 12,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: DRAWER_TINT.title,
  },
  itemLabel: {
    fontSize: 15,
    fontWeight: '500',
    marginLeft: -8,
    color: DRAWER_TINT.inactive,
  },
  drawerItem: {
    marginHorizontal: 10,
    borderRadius: APP_NAV_PILL_BORDER_RADIUS - 8,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginVertical: 8,
    marginHorizontal: 20,
  },
});

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
    color: DRAWER_TINT.inactive,
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
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 24,
  },
});
