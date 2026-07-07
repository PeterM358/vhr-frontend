/**
 * Glass-pill icon control for floating nav bars (menu, bell, logout, etc.).
 */

import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const VARIANT_THEME = {
  glass: {
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
    pressedBackgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderColor: 'rgba(255, 255, 255, 0.22)',
    color: '#ffffff',
  },
};

export default function GlassNavIconButton({
  icon,
  onPress,
  variant = 'glass',
  accessibilityLabel,
  size = 22,
  style,
  containerStyle,
}) {
  const theme = VARIANT_THEME[variant] || VARIANT_THEME.glass;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || icon}
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
          style,
        ]}
      >
        <MaterialCommunityIcons name={icon} size={size} color={theme.color} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  outer: {
    justifyContent: 'center',
  },
  outerPressed: {
    opacity: 0.92,
  },
  pill: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
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
});
