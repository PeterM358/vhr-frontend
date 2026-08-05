/**
 * Glass-pill back control for transparent stack headers over mixed backgrounds.
 * Narrow viewports are always chevron-only — labels collide with centered titles.
 */

import React, { useMemo } from 'react';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { APP_NAV_BACK_LABEL_MIN_WIDTH } from '../common/appNavBarMetrics';

const VARIANT_THEME = {
  glass: {
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    pressedBackgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderColor: 'rgba(255, 255, 255, 0.22)',
    color: '#ffffff',
  },
  dark: {
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    pressedBackgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderColor: 'rgba(255, 255, 255, 0.22)',
    color: '#ffffff',
  },
  light: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    pressedBackgroundColor: 'rgba(255, 255, 255, 1)',
    borderColor: 'rgba(15, 23, 42, 0.14)',
    color: '#0f172a',
  },
};

/** Accessible name for chevron-only (and labeled) back controls. */
export function backControlAccessibilityLabel(label) {
  const trimmed = String(label || '').trim();
  if (!trimmed) return 'Back';
  if (/^back\b/i.test(trimmed)) return trimmed;
  return `Back to ${trimmed}`;
}

export function shouldShowBackLabel(label, width, iconOnly) {
  if (!label || iconOnly) return false;
  // Phones / narrow web: arrow only — long "Back to …" pills overlap titles.
  if (width < APP_NAV_BACK_LABEL_MIN_WIDTH) return false;
  return true;
}

export function useEffectiveIconOnlyBack(iconOnlyBack = false) {
  const { width } = useWindowDimensions();
  return iconOnlyBack || width < APP_NAV_BACK_LABEL_MIN_WIDTH;
}

export default function BackHeaderButton({
  onPress,
  label = 'Back',
  variant = 'glass',
  accessibilityLabel,
  iconOnly = false,
  style,
  containerStyle,
}) {
  const { width } = useWindowDimensions();
  const theme = VARIANT_THEME[variant] || VARIANT_THEME.glass;
  const showLabel = useMemo(
    () => shouldShowBackLabel(label, width, iconOnly),
    [label, width, iconOnly],
  );
  const a11yLabel = accessibilityLabel || backControlAccessibilityLabel(label);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
      style={({ pressed }) => [styles.outer, containerStyle, pressed && styles.outerPressed]}
    >
      <View
        style={[
          styles.pill,
          {
            backgroundColor: theme.backgroundColor,
            borderColor: theme.borderColor,
          },
          !showLabel && styles.pillIconOnly,
          style,
        ]}
      >
        <MaterialCommunityIcons name="chevron-left" size={22} color={theme.color} />
        {showLabel ? (
          <Text style={[styles.label, { color: theme.color }]} numberOfLines={1}>
            {label}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

/** React Navigation `headerLeft` factory — keeps existing onPress handlers. */
export function createBackHeaderLeft({
  onPress,
  label = 'Back',
  variant = 'glass',
  accessibilityLabel,
  iconOnly = false,
}) {
  return function BackHeaderLeft() {
    return (
      <BackHeaderButton
        onPress={onPress}
        label={label}
        variant={variant}
        accessibilityLabel={accessibilityLabel}
        iconOnly={iconOnly}
        containerStyle={styles.navSlot}
      />
    );
  };
}

const styles = StyleSheet.create({
  outer: {
    justifyContent: 'center',
  },
  outerPressed: {
    opacity: 0.92,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 36,
    paddingLeft: 4,
    paddingRight: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.22,
        shadowRadius: 6,
      },
      android: { elevation: 4 },
      default: {
        boxShadow: '0 2px 10px rgba(15, 23, 42, 0.24)',
      },
    }),
  },
  pillIconOnly: {
    paddingRight: 4,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    marginLeft: -2,
    maxWidth: 148,
  },
  navSlot: {
    marginLeft: Platform.OS === 'android' ? 2 : 0,
    minHeight: Platform.OS === 'android' ? 48 : 44,
    justifyContent: 'center',
  },
});
