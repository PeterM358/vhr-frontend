/**
 * PATH: styles/theme.js
 *
 * Paper theme is wired to the centralized COLORS palette in styles/colors.js.
 * Tweak colors there to retheme the entire app.
 */

import { DefaultTheme } from 'react-native-paper';
import { COLORS } from './colors';

export const AppTheme = {
  ...DefaultTheme,
  roundness: 8,
  colors: {
    ...DefaultTheme.colors,

    // ── Veversal brand blues ──────────────────────────────────────────────
    primary: COLORS.primary,            // Buttons, active tabs, selected
    onPrimary: COLORS.onPrimary,        // White text/icons on primary

    // Deep primary for secondary / pressed accents
    secondary: COLORS.primaryPressed,
    onSecondary: COLORS.onPrimary,

    // Accent for badges / tertiary emphasis (Paper "notification" badge)
    tertiary: COLORS.accent,
    onTertiary: COLORS.onPrimary,

    // Surface roles
    background: COLORS.background,
    surface: COLORS.surface,
    onSurface: COLORS.text,
    onSurfaceDisabled: COLORS.disabled,

    error: COLORS.error,
    onError: '#ffffff',

    text: COLORS.text,
    disabled: COLORS.disabled,
    placeholder: '#999999',
    notification: COLORS.accent,
    backdrop: 'rgba(0,0,0,0.5)',
  },

  fonts: {
    ...DefaultTheme.fonts,
  },

  animation: {
    scale: 1.0,
  },
};

export default AppTheme;
