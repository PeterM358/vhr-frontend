// PATH: src/App.js
import React from 'react';
import { ImageBackground, StyleSheet } from 'react-native';
import AppNavigator from './navigation/AppNavigator';
import { WebSocketProvider } from './context/WebSocketManager';
import { Provider as PaperProvider } from 'react-native-paper';
import { AppTheme } from './styles/theme';
import { ThemeProvider } from './context/ThemeManager';
import AuthManager from './context/AuthManager';

export default function App() {
  return (
    <ThemeProvider>
      <PaperProvider theme={AppTheme}>
        <AuthManager>
          <WebSocketProvider>
            <ImageBackground
              source={require('./assets/background.jpg')}
              style={styles.background}
              resizeMode="cover"
            >
              <AppNavigator />
            </ImageBackground>
          </WebSocketProvider>
        </AuthManager>
      </PaperProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
});