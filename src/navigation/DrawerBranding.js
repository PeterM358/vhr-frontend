/**
 * Shared drawer footer, icon helpers, and dark glass theme — Veversal branding.
 */

import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import BrandLogo from '../components/BrandLogo';
import { BRAND_LOCKUP_ASPECT, IMAGES } from '../constants/images';
import { COLORS } from '../constants/colors';
import { APP_NAV_PILL_BORDER_RADIUS } from '../components/common/appNavBarMetrics';

/** Drawer footer lockup width; height follows 512×720 intrinsic ratio. */
const DRAWER_BRAND_WIDTH = 132;
const DRAWER_BRAND_HEIGHT = Math.round(DRAWER_BRAND_WIDTH * BRAND_LOCKUP_ASPECT);

export const DRAWER_ICON_SIZE = 22;
export const DRAWER_ICON_COLUMN_WIDTH = 30;
export const DRAWER_ICON_GAP = 14;
/** @react-navigation/drawer DrawerItem uses marginStart: 12 between icon and label */
const DRAWER_ITEM_ICON_LABEL_INSET = 12;
export const DRAWER_ITEM_MIN_HEIGHT = 48;

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
  return (
    <View style={styles.iconColumn}>
      <MaterialCommunityIcons name={name} size={size} color={color} />
    </View>
  );
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
      <BrandLogo
        source={IMAGES.brandDrawer}
        width={DRAWER_BRAND_WIDTH}
        height={DRAWER_BRAND_HEIGHT}
        accessibilityLabel="Veversal"
      />
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
    marginLeft: 0,
    marginVertical: 0,
    color: DRAWER_TINT.inactive,
  },
  drawerItem: {
    marginHorizontal: 10,
    borderRadius: APP_NAV_PILL_BORDER_RADIUS - 8,
    minHeight: DRAWER_ITEM_MIN_HEIGHT,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginVertical: 8,
    marginHorizontal: 20,
  },
  languageSection: {
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 4,
    gap: 8,
  },
  languageLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: DRAWER_TINT.title,
    letterSpacing: 0.4,
  },
});

const styles = StyleSheet.create({
  iconColumn: {
    width: DRAWER_ICON_COLUMN_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: DRAWER_ICON_GAP - DRAWER_ITEM_ICON_LABEL_INSET,
  },
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

export const drawerMenuItemProps = {
  labelStyle: drawerGlassStyles.itemLabel,
  activeTintColor: DRAWER_TINT.active,
  inactiveTintColor: DRAWER_TINT.inactive,
  activeBackgroundColor: DRAWER_TINT.activeBackground,
  inactiveBackgroundColor: 'transparent',
  style: drawerGlassStyles.drawerItem,
};
