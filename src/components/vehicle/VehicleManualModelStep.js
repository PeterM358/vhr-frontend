import React, { useMemo } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text, Button, TextInput } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import { COLORS } from '../../constants/colors';
import FuelTypeChips from './FuelTypeChips';
import { yearsFromGenerations } from './useVehicleMaintenanceSpec';
import { filterLegacyModelSuggestions } from './resolveLegacyModel';

export default function VehicleManualModelStep({
  brandLocked,
  brandName,
  makes,
  selectedMake,
  onMakeChange,
  manualModelText,
  onManualModelTextChange,
  legacyModels,
  selectedYear,
  onSelectedYearChange,
  fuelType,
  onFuelTypeChange,
  licensePlate,
  onLicensePlateChange,
  vin,
  onVinChange,
  vinHint,
  onBackToCatalog,
}) {
  const yearOptions = useMemo(() => yearsFromGenerations([]), []);
  const suggestions = useMemo(
    () => filterLegacyModelSuggestions(legacyModels, manualModelText),
    [legacyModels, manualModelText]
  );

  const applySuggestion = (name) => {
    onManualModelTextChange(name);
  };

  return (
    <View>
      <Text style={styles.lead}>
        Enter your model name for {brandLocked ? brandName || 'this brand' : 'your vehicle'}. Year and fuel
        type help us match maintenance specs when available.
      </Text>

      {brandLocked ? (
        <>
          <Text style={styles.label}>Make / brand</Text>
          <View style={[styles.pickerContainer, styles.pickerDisabled]}>
            <Picker selectedValue={brandName || ''} enabled={false} style={styles.picker}>
              <Picker.Item label={brandName || '—'} value={brandName || ''} />
            </Picker>
          </View>
        </>
      ) : (
        <>
          <Text style={styles.label}>Make / brand *</Text>
          <View style={styles.pickerContainer}>
            <Picker selectedValue={selectedMake} onValueChange={onMakeChange} style={styles.picker}>
              <Picker.Item label="Select brand" value="" />
              {(makes || []).map((m) => (
                <Picker.Item key={m.id} label={m.name} value={String(m.id)} />
              ))}
            </Picker>
          </View>
        </>
      )}

      <Text style={styles.label}>Model *</Text>
      <TextInput
        mode="outlined"
        value={manualModelText}
        onChangeText={onManualModelTextChange}
        placeholder="e.g. Golf, 3 Series, C-Class"
        style={styles.input}
        autoCapitalize="words"
        autoCorrect={false}
      />
      {suggestions.length > 0 ? (
        <View style={styles.suggestionsWrap}>
          <Text style={styles.suggestionsLabel}>Suggestions</Text>
          <View style={styles.suggestionRow}>
            {suggestions.map((m) => (
              <Pressable
                key={`${m.id}-${m.name}`}
                onPress={() => applySuggestion(m.name)}
                style={({ pressed }) => [styles.suggestionChip, pressed && styles.suggestionChipPressed]}
              >
                <Text style={styles.suggestionChipText}>{m.name}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <Text style={styles.label}>Year *</Text>
      <View style={styles.pickerContainer}>
        <Picker selectedValue={selectedYear} onValueChange={onSelectedYearChange} style={styles.picker}>
          <Picker.Item label="Select year" value="" />
          {yearOptions.map((y) => (
            <Picker.Item key={y} label={String(y)} value={String(y)} />
          ))}
        </Picker>
      </View>

      <FuelTypeChips value={fuelType} onChange={onFuelTypeChange} />

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

      <Button mode="text" onPress={onBackToCatalog} compact style={styles.backBtn}>
        Back to catalog selection
      </Button>
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
  pickerDisabled: {
    backgroundColor: 'rgba(15,23,42,0.04)',
  },
  picker: {
    width: '100%',
  },
  suggestionsWrap: {
    marginTop: 4,
    marginBottom: 8,
  },
  suggestionsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.TEXT_MUTED,
    marginBottom: 6,
  },
  suggestionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.15)',
    backgroundColor: '#fff',
  },
  suggestionChipPressed: {
    opacity: 0.85,
  },
  suggestionChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.TEXT_DARK,
  },
  backBtn: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },
});
