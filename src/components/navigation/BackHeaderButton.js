/**
 * Glass-pill back control for transparent stack headers over mixed backgrounds.
 */

import React, { useMemo } from 'react';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

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

function shouldShowLabel(label, width, iconOnly) {
  if (!label || iconOnly) return false;
  if (width >= 600) return true;
  if (width < 360) return label.length <= 4;
  return label.length <= 14;
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
  const showLabel = useMemo(() => shouldShowLabel(label, width, iconOnly), [label, width, iconOnly]);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label || 'Back'}
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
