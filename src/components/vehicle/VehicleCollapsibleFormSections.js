import React from 'react';
import { View, Pressable, StyleSheet, Platform, Text as RNText } from 'react-native';
import { Text, TextInput, Switch, Button, ActivityIndicator } from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import FloatingCard from '../ui/FloatingCard';
import { COLORS } from '../../constants/colors';
import { VEHICLE_OPTIONAL_GROUPS, ODOMETER_SOURCE_OPTIONS } from './vehicleFormConfig';
import ServiceRecordDatePicker from './ServiceRecordDatePicker';
import { useTranslation, translateVehicleGroupTitle, translateVehicleGroupHelper } from '../../i18n';

export default function VehicleCollapsibleFormSections({
  expanded,
  onToggle,
  strings,
  onChangeString,
  bools,
  onChangeBool,
  choicesMap = {},
  /** Per choice field: loading / error / retry (e.g. registration_country). */
  choiceExtras = {},
  groups = VEHICLE_OPTIONAL_GROUPS,
}) {
  const { t } = useTranslation();
  const renderDateField = (field) => (
    <View key={field.key} style={styles.fieldBlock}>
      <ServiceRecordDatePicker
        label={field.label}
        valueIso={strings[field.key] || ''}
        onChangeIso={(v) => onChangeString(field.key, v)}
        optional
      />
    </View>
  );

  return (
    <>
      {groups.map((group) => {
        const isOpen = !!expanded[group.key];
        return (
          <FloatingCard key={group.key} style={styles.sectionCard}>
            <Pressable onPress={() => onToggle(group.key)} style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {translateVehicleGroupTitle(group.key, group.title, t)}
              </Text>
              <MaterialCommunityIcons
                name={isOpen ? 'chevron-up' : 'chevron-down'}
                size={22}
                color={COLORS.TEXT_MUTED}
              />
            </Pressable>
            {isOpen ? (
              <View style={styles.sectionBody}>
                {group.helperText ? (
                  <Text style={styles.helperText}>
                    {translateVehicleGroupHelper(group.key, group.helperText, t)}
                  </Text>
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
                  if (field.kind === 'date') {
                    return renderDateField(field);
                  }
                  if (field.kind === 'choice') {
                    const extra = choiceExtras[field.key];
                    if (extra?.loading) {
                      return (
                        <View key={field.key} style={styles.fieldBlock}>
                          <Text style={styles.label}>{field.label}</Text>
                          <ActivityIndicator animating style={styles.choiceSpinner} />
                        </View>
                      );
                    }
                    if (extra?.error) {
                      return (
                        <View key={field.key} style={styles.fieldBlock}>
                          <Text style={styles.label}>{field.label}</Text>
                          <Text style={styles.helperText}>{extra.error}</Text>
                          {extra.onRetry ? (
                            <Button mode="outlined" compact onPress={extra.onRetry} style={styles.retryBtn}>
                              Retry
                            </Button>
                          ) : null}
                        </View>
                      );
                    }
                    const options = choicesMap[field.key];
                    if (!Array.isArray(options) || options.length === 0) {
                      return (
                        <View key={field.key} style={styles.fieldBlock}>
                          <Text style={styles.label}>{field.label}</Text>
                          <Text style={styles.helperText}>No options available.</Text>
                        </View>
                      );
                    }
                    const val = strings[field.key] ?? '';
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
  iosDatePicker: {
    alignSelf: 'stretch',
  },
  datePressable: {
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.12)',
    borderRadius: 8,
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  datePressableText: {
    fontSize: 15,
    color: COLORS.TEXT_DARK,
  },
  choiceSpinner: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  retryBtn: {
    alignSelf: 'flex-start',
    marginTop: 6,
  },
});
