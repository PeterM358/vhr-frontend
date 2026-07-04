import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

export default function ShopProfileMissingAlert({ fields = [] }) {
  if (!fields.length) return null;

  return (
    <View style={styles.box} accessibilityRole="alert">
      <MaterialCommunityIcons name="alert-circle-outline" size={22} color="#92400e" />
      <View style={styles.content}>
        <Text style={styles.title}>Still needed to go live</Text>
        <View style={styles.chips}>
          {fields.map((field) => (
            <View key={field} style={styles.chip}>
              <Text style={styles.chipText}>{field}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#fef3c7',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  content: {
    flex: 1,
    gap: 8,
  },
  title: {
    color: '#92400e',
    fontSize: 14,
    fontWeight: '800',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    backgroundColor: '#fde68a',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  chipText: {
    color: '#78350f',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
});
