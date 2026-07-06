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
  const modelsMissing = Boolean(catalogBrand) && catalogModels.length === 0;
  const canPickModel = Boolean(catalogBrand) && catalogModels.length > 0;
  const catalogReady = Boolean(catalogModel);

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
        Select your vehicle type, brand, model, year, and fuel type from our catalog.
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

      {modelsMissing ? (
        <View style={styles.gapBox}>
          <Text style={styles.gapTitle}>No catalog models for this brand yet</Text>
          <Text style={styles.gapText}>
            You can still add your vehicle by entering the model name manually.
          </Text>
          <Button mode="contained" onPress={onOpenManual} style={styles.gapBtn}>
            Enter model manually
          </Button>
        </View>
      ) : null}

      {canPickModel ? (
        <>
          <Text style={styles.label}>Model *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={catalogModel}
              onValueChange={onCatalogModelChange}
              style={styles.picker}
            >
              <Picker.Item label="Select model" value="" />
              {catalogModels.map((m) => (
                <Picker.Item key={m.id} label={m.name} value={String(m.id)} />
              ))}
            </Picker>
          </View>
          <Pressable onPress={onOpenManual} style={styles.inlineManualLink}>
            <Text style={styles.inlineManualLinkText}>Can&apos;t find your model? Enter it manually</Text>
          </Pressable>
        </>
      ) : null}

      {catalogReady ? (
        <>
          <Text style={styles.label}>Year *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedYear}
              onValueChange={handleYearChange}
              style={styles.picker}
            >
              <Picker.Item label="Select year" value="" />
              {yearOptions.map((y) => (
                <Picker.Item key={y} label={String(y)} value={String(y)} />
              ))}
            </Picker>
          </View>

          <FuelTypeChips value={fuelType} onChange={handleFuelChange} />

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
        </>
      ) : null}

      {catalogBrand && !modelsMissing && !catalogModel ? (
        <Pressable onPress={onOpenManual} style={styles.manualLink}>
          <Text style={styles.manualLinkText}>Can&apos;t find your vehicle? Enter model manually</Text>
        </Pressable>
      ) : null}
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
    marginTop: 12,
    marginBottom: 4,
    padding: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(37,99,235,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.15)',
    gap: 10,
  },
  gapTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
  },
  gapText: {
    fontSize: 13,
    color: COLORS.TEXT_DARK,
    lineHeight: 18,
  },
  gapBtn: {
    alignSelf: 'flex-start',
  },
  inlineManualLink: {
    marginTop: 4,
    marginBottom: 2,
    paddingVertical: 4,
  },
  inlineManualLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.PRIMARY,
    textDecorationLine: 'underline',
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
