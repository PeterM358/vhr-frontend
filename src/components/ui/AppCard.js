// PATH: src/components/ui/AppCard.js
//
// Thin wrapper: default “light” cards delegate to FloatingCard (global style).
// `variant="dark"` keeps glass hero panels for contrast on ScreenBackground.

import React from 'react';
import { View, StyleSheet } from 'react-native';
import FloatingCard from './FloatingCard';
import { COLORS } from '../../constants/colors';

export default function AppCard({
  variant = 'light',
  onPress,
  style,
  contentStyle,
  children,
  accent = false,
  ...rest
}) {
  if (variant === 'dark') {
    return (
      <View style={[styles.darkCard, accent && styles.darkAccent, style]} {...rest}>
        <View style={contentStyle}>{children}</View>
      </View>
    );
  }

  return (
    <FloatingCard onPress={onPress} accent={accent} style={style} {...rest}>
      {contentStyle ? <View style={contentStyle}>{children}</View> : children}
    </FloatingCard>
  );
}

const styles = StyleSheet.create({
  darkCard: {
    backgroundColor: COLORS.CARD_DARK,
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.BORDER_SOFT,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },
  darkAccent: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.PRIMARY,
  },
});
