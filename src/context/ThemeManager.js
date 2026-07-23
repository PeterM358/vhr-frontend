// PATH: src/context/ThemeManager.js
import React, { createContext, useState } from 'react';
import { AppTheme } from '../styles/theme';
import { DarkTheme as PaperDarkTheme } from 'react-native-paper';
import { COLORS } from '../styles/colors';

export const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);

  const toggleTheme = () => setIsDark(prev => !prev);

  const theme = isDark
    ? {
        ...PaperDarkTheme,
        colors: {
          ...PaperDarkTheme.colors,
          primary: COLORS.primary,
          onPrimary: COLORS.onPrimary,
          secondary: COLORS.primaryPressed,
          tertiary: COLORS.accent,
          notification: COLORS.accent,
          disabled: COLORS.disabled,
        },
      }
    : AppTheme;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}