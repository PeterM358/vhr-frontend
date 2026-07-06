import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { COLORS } from '../../constants/colors';

export const CREATE_VEHICLE_FUEL_OPTIONS = [
  { value: 'petrol', label: 'Petrol' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'hybrid_petrol', label: 'Hybrid' },
  { value: 'hybrid_petrol', label: 'Plug-in Hybrid', key: 'phev' },
  { value: 'electric', label: 'Electric' },
  { value: 'lpg', label: 'LPG' },
  { value: 'cng', label: 'CNG' },
];

export default function FuelTypeChips({ value, onChange, disabled = false }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Fuel type</Text>
      <View style={styles.chipRow}>
        {CREATE_VEHICLE_FUEL_OPTIONS.map((option) => {
          const selected = value === option.value;
          return (
            <Pressable
              key={option.key || option.value}
              disabled={disabled}
              onPress={() => onChange(option.value)}
              style={({ pressed }) => [
                styles.chip,
                selected && styles.chipSelected,
                pressed && !disabled && styles.chipPressed,
              ]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.TEXT_MUTED,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.15)',
    backgroundColor: '#fff',
  },
  chipSelected: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  chipPressed: {
    opacity: 0.9,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.TEXT_DARK,
  },
  chipTextSelected: {
    color: '#fff',
  },
});
