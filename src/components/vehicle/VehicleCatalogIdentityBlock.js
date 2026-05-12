import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import { COLORS } from '../../constants/colors';

/**
 * Catalog drill-down (brand → model → generation → engine → trim) with legacy make/model manual fallback.
 */
export default function VehicleCatalogIdentityBlock({
  hasVehicleTypePicker,
  vehicleTypes,
  selectedVehicleType,
  onVehicleTypeChange,
  manualMode,
  onManualModeChange,
  catalogBrands,
  catalogModels,
  catalogGenerations,
  catalogEngines,
  catalogTrims,
  selectedCatalogBrand,
  onCatalogBrandChange,
  selectedCatalogModel,
  onCatalogModelChange,
  selectedCatalogGeneration,
  onCatalogGenerationChange,
  selectedCatalogEngine,
  onCatalogEngineChange,
  selectedCatalogTrim,
  onCatalogTrimChange,
  makes,
  models,
  selectedMake,
  onMakeChange,
  selectedModelLegacy,
  onModelLegacyChange,
  manualGenerationText,
  onManualGenerationTextChange,
  manualEngineCodeText,
  onManualEngineCodeTextChange,
}) {
  return (
    <>
      <Pressable
        onPress={() => onManualModeChange(!manualMode)}
        style={styles.manualToggle}
      >
        <Text style={styles.manualToggleText}>
          {manualMode
            ? 'Use catalog selection instead'
            : "Can't find your vehicle? Enter details manually."}
        </Text>
      </Pressable>

      {!manualMode ? (
        <>
          {catalogBrands.length === 0 ? (
            <Text style={styles.emptyHint}>
              No catalog brands loaded for this type yet. Try another vehicle type or use manual entry.
            </Text>
          ) : null}

          <Text style={styles.label}>Brand (catalog)</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedCatalogBrand}
              onValueChange={onCatalogBrandChange}
              style={styles.picker}
            >
              <Picker.Item label="—" value="" />
              {catalogBrands.map((b) => (
                <Picker.Item key={b.id} label={b.name} value={String(b.id)} />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>Model (catalog)</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedCatalogModel}
              onValueChange={onCatalogModelChange}
              style={styles.picker}
              enabled={!!selectedCatalogBrand}
            >
              <Picker.Item label="—" value="" />
              {catalogModels.map((m) => (
                <Picker.Item key={m.id} label={m.name} value={String(m.id)} />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>Generation</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedCatalogGeneration}
              onValueChange={onCatalogGenerationChange}
              style={styles.picker}
              enabled={!!selectedCatalogModel}
            >
              <Picker.Item label="—" value="" />
              {catalogGenerations.map((g) => (
                <Picker.Item key={g.id} label={g.name} value={String(g.id)} />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>Engine / variant</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedCatalogEngine}
              onValueChange={onCatalogEngineChange}
              style={styles.picker}
              enabled={!!selectedCatalogGeneration}
            >
              <Picker.Item label="—" value="" />
              {catalogEngines.map((e) => (
                <Picker.Item key={e.id} label={e.name} value={String(e.id)} />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>Trim</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedCatalogTrim}
              onValueChange={onCatalogTrimChange}
              style={styles.picker}
              enabled={!!selectedCatalogGeneration}
            >
              <Picker.Item label="—" value="" />
              {catalogTrims.map((t) => (
                <Picker.Item key={t.id} label={t.name} value={String(t.id)} />
              ))}
            </Picker>
          </View>
        </>
      ) : (
        <>
          <Text style={styles.label}>Make *</Text>
          <View style={styles.pickerContainer}>
            <Picker selectedValue={selectedMake} onValueChange={onMakeChange} style={styles.picker}>
              <Picker.Item label="—" value="" />
              {makes.map((m) => (
                <Picker.Item key={m.id} label={m.name} value={String(m.id)} />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>Model *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedModelLegacy}
              onValueChange={onModelLegacyChange}
              style={styles.picker}
              enabled={!!selectedMake}
            >
              <Picker.Item label="—" value="" />
              {models.map((m) => (
                <Picker.Item key={m.id} label={m.name} value={String(m.id)} />
              ))}
            </Picker>
          </View>

          <Text style={styles.label}>Generation (text, optional)</Text>
          <TextInput
            mode="outlined"
            value={manualGenerationText}
            onChangeText={onManualGenerationTextChange}
            placeholder="e.g. Mk7, F30"
            style={styles.input}
          />

          <Text style={styles.label}>Engine code (text, optional)</Text>
          <TextInput
            mode="outlined"
            value={manualEngineCodeText}
            onChangeText={onManualEngineCodeTextChange}
            placeholder="e.g. CJAA, N47"
            style={styles.input}
          />
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  manualToggle: {
    marginTop: 4,
    marginBottom: 12,
    paddingVertical: 8,
  },
  manualToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.PRIMARY,
    textDecorationLine: 'underline',
  },
  emptyHint: {
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
    fontStyle: 'italic',
    marginBottom: 10,
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
});
