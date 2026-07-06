import React, { useMemo } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import { COLORS } from '../../constants/colors';
import FuelTypeChips from './FuelTypeChips';
import {
  yearsFromGenerations,
  generationForYear,
  enginesForFuel,
} from './useVehicleMaintenanceSpec';

export default function VehicleCreateCatalogStep({
  hasVehicleTypePicker,
  vehicleTypes,
  selectedVehicleType,
  onVehicleTypeChange,
  catalogBrands,
  catalogModels,
  catalogGenerations,
  catalogEngines,
  catalogBrand,
  onCatalogBrandChange,
  catalogModel,
  onCatalogModelChange,
  selectedYear,
  onSelectedYearChange,
  catalogGeneration,
  onCatalogGenerationChange,
  catalogEngine,
  onCatalogEngineChange,
  fuelType,
  onFuelTypeChange,
  onOpenManual,
}) {
  const yearOptions = useMemo(() => yearsFromGenerations(catalogGenerations), [catalogGenerations]);
  const matchingEngines = useMemo(
    () => enginesForFuel(catalogEngines, fuelType),
    [catalogEngines, fuelType]
  );

  const handleYearChange = (year) => {
    onSelectedYearChange(year);
    const generationId = generationForYear(catalogGenerations, year);
    onCatalogGenerationChange(generationId);
    onCatalogEngineChange('');
  };

  const handleFuelChange = (nextFuel) => {
    onFuelTypeChange(nextFuel);
    onCatalogEngineChange('');
  };

  return (
    <View>
      <Text style={styles.lead}>
        Start with your vehicle from our catalog. We&apos;ll suggest maintenance specs when we have them.
      </Text>

      {hasVehicleTypePicker ? (
        <>
          <Text style={styles.label}>Vehicle type *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedVehicleType}
              onValueChange={onVehicleTypeChange}
              style={styles.picker}
            >
              <Picker.Item label="Select type" value="" />
              {vehicleTypes.map((vt) => (
                <Picker.Item key={vt.id} label={vt.name} value={vt.id.toString()} />
              ))}
            </Picker>
          </View>
        </>
      ) : null}

      <Text style={styles.label}>Make / brand *</Text>
      <View style={styles.pickerContainer}>
        <Picker selectedValue={catalogBrand} onValueChange={onCatalogBrandChange} style={styles.picker}>
          <Picker.Item label="Select brand" value="" />
          {catalogBrands.map((b) => (
            <Picker.Item key={b.id} label={b.name} value={String(b.id)} />
          ))}
        </Picker>
      </View>

      <Text style={styles.label}>Model *</Text>
      {catalogBrand && catalogModels.length === 0 ? (
        <View style={styles.gapBox}>
          <Text style={styles.gapText}>No catalog models for this brand yet.</Text>
          <Button mode="contained" compact onPress={onOpenManual}>
            Add manually
          </Button>
        </View>
      ) : null}
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={catalogModel}
          onValueChange={onCatalogModelChange}
          style={styles.picker}
          enabled={!!catalogBrand}
        >
          <Picker.Item label="Select model" value="" />
          {catalogModels.map((m) => (
            <Picker.Item key={m.id} label={m.name} value={String(m.id)} />
          ))}
        </Picker>
      </View>

      <Text style={styles.label}>Year *</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={selectedYear}
          onValueChange={handleYearChange}
          style={styles.picker}
          enabled={!!catalogModel}
        >
          <Picker.Item label="Select year" value="" />
          {yearOptions.map((y) => (
            <Picker.Item key={y} label={String(y)} value={String(y)} />
          ))}
        </Picker>
      </View>

      <FuelTypeChips value={fuelType} onChange={handleFuelChange} disabled={!catalogModel} />

      {matchingEngines.length > 1 ? (
        <>
          <Text style={styles.label}>Engine / variant</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={catalogEngine}
              onValueChange={onCatalogEngineChange}
              style={styles.picker}
            >
              <Picker.Item label="Select engine" value="" />
              {matchingEngines.map((e) => (
                <Picker.Item key={e.id} label={e.name} value={String(e.id)} />
              ))}
            </Picker>
          </View>
        </>
      ) : null}

      <Pressable onPress={onOpenManual} style={styles.manualLink}>
        <Text style={styles.manualLinkText}>Can&apos;t find your vehicle? Add manually</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  lead: {
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
    lineHeight: 18,
    marginBottom: 12,
  },
  label: {
    marginTop: 12,
    marginBottom: 4,
    fontWeight: '600',
    color: COLORS.TEXT_DARK,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.12)',
    borderRadius: 8,
    marginBottom: 4,
    backgroundColor: '#fff',
  },
  picker: {
    width: '100%',
  },
  gapBox: {
    marginBottom: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(37,99,235,0.06)',
    gap: 8,
  },
  gapText: {
    fontSize: 13,
    color: COLORS.TEXT_DARK,
  },
  manualLink: {
    marginTop: 16,
    paddingVertical: 8,
  },
  manualLinkText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.PRIMARY,
    textDecorationLine: 'underline',
  },
});
