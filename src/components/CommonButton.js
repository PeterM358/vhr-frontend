import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { COLORS } from '../styles/colors';

export default function CommonButton({ title, onPress, color, style }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.button, { backgroundColor: color || COLORS.primary }, style]}
    >
      <Text style={styles.buttonText}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
