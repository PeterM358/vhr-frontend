/**
 * PATH: styles/theme.js
 */

import { DefaultTheme } from 'react-native-paper';

export const AppTheme = {
  ...DefaultTheme,
  roundness: 8,
  colors: {
    ...DefaultTheme.colors,

    // ✅ Brand colors
    primary: '#429bdb',         // Main brand blue (buttons, Appbar, icons)
    onPrimary: '#ffffff',       // Text/icons on primary

    secondary: '#007ACC',       // Stronger blue for accents like "Find Shops on Map"
    onSecondary: '#ffffff',     // White text on blue buttons

    background: '#ffffff',      // Screen background
    surface: '#ffffff',         // Cards, sheets
    onSurface: '#000000',       // Text/icons on surfaces

    error: '#B00020',
    onError: '#ffffff',

    text: '#000000',            // General text
    disabled: '#cccccc',
    placeholder: '#999999',
    notification: '#FF3B30',
    backdrop: 'rgba(0,0,0,0.5)',
  },

  fonts: {
    ...DefaultTheme.fonts,
    // You can customize weights/sizes here
  },

  animation: {
    scale: 1.0,
  },
};