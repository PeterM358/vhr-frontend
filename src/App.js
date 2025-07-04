// App.js
import React from 'react';
import { ImageBackground, StyleSheet } from 'react-native';
import AppNavigator from './navigation/AppNavigator';
import { WebSocketProvider } from './context/WebSocketManager';
import AuthManager from './context/AuthManager';

export default function App() {
  return (
    <AuthManager>
      <ImageBackground
        source={require('./assets/background.jpg')}
        style={styles.background}
        resizeMode="cover"
      >
        <AppNavigator />
      </ImageBackground>
    </AuthManager>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
});