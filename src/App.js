// PATH: App.js
import React from 'react';
import { ImageBackground, StyleSheet } from 'react-native';
import AppNavigator from './navigation/AppNavigator';
import { WebSocketProvider } from './context/WebSocketManager';

export default function App() {
  return (
    <WebSocketProvider>
      <ImageBackground
        source={require('./assets/background.jpg')}
        style={styles.background}
        resizeMode="cover"
      >
        <AppNavigator />
      </ImageBackground>
    </WebSocketProvider>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
});