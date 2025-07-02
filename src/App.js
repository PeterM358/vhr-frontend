import React from 'react';
import { ImageBackground, StyleSheet } from 'react-native';
import AppNavigator from './navigation/AppNavigator';

export default function App() {
  return (
    <ImageBackground
      source={require('./assets/background.jpg')}
      style={styles.background}
      resizeMode="cover"
    >
      <AppNavigator />
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
});
