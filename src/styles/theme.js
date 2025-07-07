// PATH: styles/theme.js
import { DefaultTheme } from 'react-native-paper';

export const AppTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#007AFF',       // Your existing blue
    accent: '#03DAC6',
    background: '#ffffff',
    surface: '#ffffff',
    text: '#000000',
    // You can customize further
  },
};