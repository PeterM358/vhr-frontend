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

    // ── Premium automotive blue ───────────────────────────────────────────
    primary: COLORS.primary,            // Main accent (buttons, Appbar, icons)
    onPrimary: COLORS.onPrimary,        // Text/icons on primary

    // Use the deep blue as a strong "pressed/active" accent
    secondary: COLORS.primaryDark,
    onSecondary: COLORS.onPrimary,

    // Surface roles
    background: COLORS.background,
    surface: COLORS.surface,
    onSurface: COLORS.text,

    error: COLORS.error,
    onError: '#ffffff',

    text: COLORS.text,
    disabled: '#cccccc',
    placeholder: '#999999',
    notification: COLORS.danger,
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
