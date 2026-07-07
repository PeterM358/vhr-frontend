// Premium floating glass bubble for public auth screens over ScreenBackground.
// Matches dark glass tokens used on PublicHome and password-reset flows.

import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { COLORS } from '../../constants/colors';

export default function AuthGlassCard({ children, style, contentStyle, ...rest }) {
  return (
    <View style={[styles.card, Platform.OS === 'web' && styles.cardWeb, style]} {...rest}>
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    backgroundColor: COLORS.CARD_DARK,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.BORDER_SOFT,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
  },
  cardWeb: {
    backdropFilter: 'saturate(180%) blur(20px)',
    WebkitBackdropFilter: 'saturate(180%) blur(20px)',
    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.38)',
  },
  content: {
    paddingHorizontal: 22,
    paddingVertical: 26,
    alignItems: 'stretch',
  },
});
