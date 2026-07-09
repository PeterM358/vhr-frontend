import React, { useMemo } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text, Button, TextInput } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import { COLORS } from '../../constants/colors';
import FuelTypeChips from './FuelTypeChips';
import {
  yearsFromGenerations,
  generationForYear,
  enginesForFuel,
} from './useVehicleMaintenanceSpec';
import { mergeCatalogAndLegacyModels } from './resolveLegacyModel';
import { useTranslation } from '../../i18n';

export default function VehicleCreateCatalogStep({
  hasVehicleTypePicker,
  vehicleTypes,
  selectedVehicleType,
  onVehicleTypeChange,
  catalogBrands,
  catalogModels,
  legacyModels,
  catalogGenerations,
  catalogEngines,
  catalogBrand,
  onCatalogBrandChange,
  selectedModelKey,
  onMergedModelChange,
  selectedYear,
  onSelectedYearChange,
  catalogGeneration,
  onCatalogGenerationChange,
  catalogEngine,
  onCatalogEngineChange,
  fuelType,
  onFuelTypeChange,
  licensePlate,
  onLicensePlateChange,
  vin,
  onVinChange,
  vinHint,
  onOpenManual,
}) {
  const { t } = useTranslation();
  const mergedModels = useMemo(
    () => mergeCatalogAndLegacyModels(catalogModels, legacyModels),
    [catalogModels, legacyModels]
  );
  const yearOptions = useMemo(() => yearsFromGenerations(catalogGenerations), [catalogGenerations]);
  const matchingEngines = useMemo(
    () => enginesForFuel(catalogEngines, fuelType),
    [catalogEngines, fuelType]
  );
  const modelsMissing = Boolean(catalogBrand) && mergedModels.length === 0;
  const canPickModel = Boolean(catalogBrand) && mergedModels.length > 0;
  const modelReady = Boolean(selectedModelKey);

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
              <Picker.Item label={t('createVehicle.selectType')} value="" />
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
          <Picker.Item label={t('createVehicle.selectBrand')} value="" />
          {catalogBrands.map((b) => (
            <Picker.Item key={b.id} label={b.name} value={String(b.id)} />
          ))}
        </Picker>
      </View>

      {modelsMissing ? (
        <View style={styles.gapBox}>
          <Text style={styles.gapTitle}>No models found for this brand</Text>
          <Text style={styles.gapText}>
            You can still add your vehicle by entering the model name manually.
          </Text>
          <Button mode="contained" onPress={onOpenManual} style={styles.gapBtn}>
            Add model manually
          </Button>
        </View>
      ) : null}

      {canPickModel ? (
        <>
          <Text style={styles.label}>Model *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedModelKey}
              onValueChange={onMergedModelChange}
              style={styles.picker}
            >
              <Picker.Item label={t('createVehicle.selectModel')} value="" />
              {mergedModels.map((m) => (
                <Picker.Item key={m.key} label={m.name} value={m.key} />
              ))}
            </Picker>
          </View>
          <Pressable onPress={onOpenManual} style={styles.inlineManualLink}>
            <Text style={styles.inlineManualLinkText}>
              Can&apos;t find your model? Add model manually
            </Text>
          </Pressable>
        </>
      ) : null}

      {modelReady ? (
        <>
          <Text style={styles.label}>Year *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedYear}
              onValueChange={handleYearChange}
              style={styles.picker}
            >
              <Picker.Item label={t('createVehicle.selectYear')} value="" />
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
                  <Picker.Item label={t('createVehicle.selectEngine')} value="" />
                  {matchingEngines.map((e) => (
                    <Picker.Item key={e.id} label={e.name} value={String(e.id)} />
                  ))}
                </Picker>
              </View>
            </>
          ) : null}

          <Text style={styles.label}>Registration number</Text>
          <TextInput
            mode="outlined"
            value={licensePlate}
            onChangeText={onLicensePlateChange}
            placeholder="e.g. CA1234AB"
            style={styles.input}
          />

          <Text style={styles.label}>VIN (optional)</Text>
          <TextInput
            mode="outlined"
            value={vin}
            onChangeText={onVinChange}
            placeholder={vinHint}
            style={styles.input}
          />
          {vinHint ? <Text style={styles.microHint}>{vinHint}</Text> : null}
        </>
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
  input: {
    marginBottom: 4,
    backgroundColor: '#fff',
  },
  microHint: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
    marginTop: -4,
    marginBottom: 4,
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
});
