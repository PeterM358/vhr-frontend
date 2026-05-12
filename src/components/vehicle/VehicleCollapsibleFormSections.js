import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text, TextInput, Switch } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import FloatingCard from '../ui/FloatingCard';
import { COLORS } from '../../constants/colors';
import { VEHICLE_OPTIONAL_GROUPS, ODOMETER_SOURCE_OPTIONS } from './vehicleFormConfig';

export default function VehicleCollapsibleFormSections({
  expanded,
  onToggle,
  strings,
  onChangeString,
  bools,
  onChangeBool,
  choicesMap = {},
  groups = VEHICLE_OPTIONAL_GROUPS,
}) {
  return (
    <>
      {groups.map((group) => {
        const isOpen = !!expanded[group.key];
        return (
          <FloatingCard key={group.key} style={styles.sectionCard}>
            <Pressable onPress={() => onToggle(group.key)} style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{group.title}</Text>
              <MaterialCommunityIcons
                name={isOpen ? 'chevron-up' : 'chevron-down'}
                size={22}
                color={COLORS.TEXT_MUTED}
              />
            </Pressable>
            {isOpen ? (
              <View style={styles.sectionBody}>
                {group.helperText ? (
                  <Text style={styles.helperText}>{group.helperText}</Text>
                ) : null}
                {(group.boolFields || []).map((bf) => (
                  <View key={bf.key} style={styles.switchRow}>
                    <Text style={styles.switchLabel}>{bf.label}</Text>
                    <Switch value={!!bools[bf.key]} onValueChange={(v) => onChangeBool(bf.key, v)} />
                  </View>
                ))}
                {(group.fields || []).map((field) => {
                  if (field.kind === 'odometer_picker') {
                    const val = strings[field.key] || 'owner';
                    return (
                      <View key={field.key} style={styles.fieldBlock}>
                        <Text style={styles.label}>{field.label}</Text>
                        <View style={styles.pickerBox}>
                          <Picker
                            selectedValue={val}
                            onValueChange={(v) => onChangeString(field.key, v)}
                            style={styles.picker}
                          >
                            {ODOMETER_SOURCE_OPTIONS.map((o) => (
                              <Picker.Item key={o.value} label={o.label} value={o.value} />
                            ))}
                          </Picker>
                        </View>
                      </View>
                    );
                  }
                  if (field.kind === 'choice') {
                    const options = choicesMap[field.key];
                    const val = strings[field.key] ?? '';
                    if (Array.isArray(options) && options.length > 0) {
                      return (
                        <View key={field.key} style={styles.fieldBlock}>
                          <Text style={styles.label}>{field.label}</Text>
                          <View style={styles.pickerBox}>
                            <Picker
                              selectedValue={val}
                              onValueChange={(v) => onChangeString(field.key, v)}
                              style={styles.picker}
                            >
                              <Picker.Item label="—" value="" />
                              {options.map((o) => (
                                <Picker.Item key={o.value} label={o.label} value={o.value} />
                              ))}
                            </Picker>
                          </View>
                        </View>
                      );
                    }
                  }
                  const keyboardType =
                    field.kind === 'int' || field.kind === 'decimal' ? 'decimal-pad' : 'default';
                  return (
                    <View key={field.key} style={styles.fieldBlock}>
                      <Text style={styles.label}>{field.label}</Text>
                      <TextInput
                        mode="outlined"
                        dense
                        value={strings[field.key] ?? ''}
                        onChangeText={(t) => onChangeString(field.key, t)}
                        placeholder={field.placeholder || ''}
                        keyboardType={keyboardType}
                        style={styles.input}
                      />
                    </View>
                  );
                })}
              </View>
            ) : null}
          </FloatingCard>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  sectionCard: {
    marginBottom: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
    flex: 1,
  },
  sectionBody: {
    marginTop: 8,
    paddingTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(15,23,42,0.08)',
  },
  fieldBlock: {
    marginBottom: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.TEXT_MUTED,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#fff',
  },
  pickerBox: {
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.12)',
    borderRadius: 8,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  picker: {
    width: '100%',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 12,
  },
  switchLabel: {
    flex: 1,
    fontSize: 14,
    color: COLORS.TEXT_DARK,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
    lineHeight: 17,
    marginBottom: 8,
  },
});
