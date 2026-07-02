import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import ScreenBackground from '../components/ScreenBackground';

/** Shown while React Navigation resolves deep links / initial web URL. */
export default function NavigationFallback() {
  return (
    <ScreenBackground>
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
