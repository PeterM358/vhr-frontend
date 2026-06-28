import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Button, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../../constants/colors';

/**
 * Persistent bottom save action — stays visible while scrolling (iOS-style floating bar).
 */
export default function FloatingSaveBar({
  onPress,
  loading = false,
  disabled = false,
  label = 'Save',
  icon = 'content-save',
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={[styles.host, { paddingBottom: Math.max(insets.bottom, 12) }]}
    >
      <View style={styles.pill}>
        <Button
          mode="contained"
          icon={icon}
          onPress={onPress}
          loading={loading}
          disabled={disabled || loading}
          style={styles.button}
          contentStyle={styles.buttonContent}
          buttonColor={theme.colors.primary}
          textColor="#fff"
        >
          {label}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    zIndex: 50,
  },
  pill: {
    width: '92%',
    maxWidth: 480,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.96)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15,23,42,0.1)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 16,
      },
      android: { elevation: 12 },
      default: {
        boxShadow: '0 8px 28px rgba(15,23,42,0.18)',
      },
    }),
  },
  button: {
    borderRadius: 22,
  },
  buttonContent: {
    height: 48,
  },
});
