import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

export default function DashboardSummaryRow({ items = [] }) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        {items.map((item) => (
          <Pressable
            key={item.key}
            onPress={item.onPress}
            style={({ pressed }) => [styles.cell, pressed && styles.cellPressed]}
            accessibilityRole="button"
            accessibilityLabel={`${item.label}: ${item.value}`}
          >
            <Text style={styles.value}>{item.value}</Text>
            <Text style={styles.label}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(5,15,30,0.64)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 10,
  },
  cellPressed: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  value: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
  },
  label: {
    color: 'rgba(255,255,255,0.74)',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
});
