// PATH: src/context/ThemeManager.js
import React, { createContext, useState } from 'react';
import { AppTheme } from '../styles/theme';
import { DarkTheme as PaperDarkTheme } from 'react-native-paper';

export const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);

  const toggleTheme = () => setIsDark(prev => !prev);

  const theme = isDark
    ? { ...PaperDarkTheme, colors: { ...PaperDarkTheme.colors, primary: '#007AFF' } }
    : AppTheme;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}