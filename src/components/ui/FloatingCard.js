// PATH: src/components/ui/FloatingCard.js
//
// Single global “floating” card over ScreenBackground — soft grey, iOS/macOS-like.
// Default is neutral (no stripe). Pass accent={true} only for selected /
// highlighted rows (e.g. unread notification).

import React from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/colors';

export default function FloatingCard({
  children,
  style,
  onPress,
  accent = false,
  ...rest
}) {
  const accentStyle = accent === true ? styles.accent : null;

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          accentStyle,
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
    <View style={[styles.card, accentStyle, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.CARD_FLOATING,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
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
