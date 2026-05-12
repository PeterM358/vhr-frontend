import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import FloatingCard from '../ui/FloatingCard';
import { COLORS } from '../../constants/colors';

export default function VehicleCatalogEbikeTrailerSection({
  expanded,
  onToggle,
  ebikeSystems,
  trailerTypes,
  selectedEbikeSystem,
  onEbikeSystemChange,
  selectedTrailerType,
  onTrailerTypeChange,
}) {
  return (
    <FloatingCard style={styles.card}>
      <Pressable onPress={onToggle} style={styles.header}>
        <Text style={styles.title}>E-bike & trailer catalog (optional)</Text>
        <MaterialCommunityIcons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={22}
          color={COLORS.TEXT_MUTED}
        />
      </Pressable>
      {expanded ? (
        <View style={styles.body}>
          <Text style={styles.label}>E-bike system</Text>
          <View style={styles.pickerBox}>
            <Picker
              selectedValue={selectedEbikeSystem}
              onValueChange={onEbikeSystemChange}
              style={styles.picker}
            >
              <Picker.Item label="—" value="" />
              {ebikeSystems.map((row) => (
                <Picker.Item
                  key={row.id}
                  label={`${row.brand_name} ${row.system_name}`.trim()}
                  value={String(row.id)}
                />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>Trailer type</Text>
          <View style={styles.pickerBox}>
            <Picker
              selectedValue={selectedTrailerType}
              onValueChange={onTrailerTypeChange}
              style={styles.picker}
            >
              <Picker.Item label="—" value="" />
              {trailerTypes.map((row) => (
                <Picker.Item key={row.id} label={row.name} value={String(row.id)} />
              ))}
            </Picker>
          </View>
        </View>
      ) : null}
    </FloatingCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
    flex: 1,
  },
  body: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(15,23,42,0.08)',
  },
  label: {
    marginTop: 8,
    marginBottom: 4,
    fontWeight: '600',
    color: COLORS.TEXT_DARK,
    fontSize: 13,
  },
  pickerBox: {
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.12)',
    borderRadius: 8,
    marginBottom: 4,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  picker: {
    width: '100%',
  },
});
