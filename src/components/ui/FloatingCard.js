// PATH: src/components/ui/FloatingCard.js
//
// Single global “floating” card over ScreenBackground — soft grey, iOS/macOS-like.
// Default is neutral (no stripe). Pass accent={true} only for selected /
// highlighted rows (e.g. unread notification).

import React, { useMemo } from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/colors';
import { getHealthStatusAccent } from '../../utils/vehicleHealthStatus';

export default function FloatingCard({
  children,
  style,
  onPress,
  accent = false,
  statusAccent = null,
  ...rest
}) {
  const accentStyle = accent === true ? styles.accent : null;
  const statusAccentStyle = useMemo(() => {
    if (!statusAccent) return null;
    const tokens = getHealthStatusAccent(statusAccent);
    return {
      borderLeftWidth: 4,
      borderLeftColor: tokens.color,
    };
  }, [statusAccent]);

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          accentStyle,
          statusAccentStyle,
          pressed && styles.pressed,
          style,
        ]}
        {...rest}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View style={[styles.card, accentStyle, statusAccentStyle, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  accent: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.PRIMARY,
  },
  pressed: {
    opacity: 0.92,
  },
});
