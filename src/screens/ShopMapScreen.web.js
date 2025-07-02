// src/screens/ShopMapScreen.web.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ShopMapScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Shop Map (Web Version)</Text>
      <Text>This is a placeholder for web. Map will work on mobile.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
});
