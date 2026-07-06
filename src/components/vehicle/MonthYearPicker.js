import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Text } from 'react-native-paper';
import { COLORS } from '../../constants/colors';
import { normalizeRegistrationDateForApi } from './dateFieldUtils';

const MONTHS = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

function parseIsoMonthYear(iso) {
  const raw = String(iso || '').trim();
  const match = /^(\d{4})-(\d{2})(?:-\d{2})?$/.exec(raw);
  if (!match) return { year: '', month: '' };
  return { year: match[1], month: match[2] };
}

function buildYearOptions() {
  const current = new Date().getFullYear();
  const years = [];
  for (let y = current; y >= 1980; y -= 1) {
    years.push(String(y));
  }
  return years;
}

/**
 * Month + year selectors (no day). Stores YYYY-MM-01 for API compatibility.
 */
export default function MonthYearPicker({
  valueIso,
  onChangeIso,
  label = 'First registration',
  disabled = false,
}) {
  const { year, month } = useMemo(() => parseIsoMonthYear(valueIso), [valueIso]);
  const years = useMemo(() => buildYearOptions(), []);

  const emit = (nextYear, nextMonth) => {
    if (!nextYear || !nextMonth) {
      onChangeIso('');
      return;
    }
    onChangeIso(normalizeRegistrationDateForApi(`${nextYear}-${nextMonth}`));
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <View style={styles.pickerBox}>
          <Picker
            enabled={!disabled}
            selectedValue={month || ''}
            onValueChange={(v) => emit(year || String(new Date().getFullYear()), v)}
            style={styles.picker}
          >
            <Picker.Item label="Month" value="" />
            {MONTHS.map((m) => (
              <Picker.Item key={m.value} label={m.label} value={m.value} />
            ))}
          </Picker>
        </View>
        <View style={styles.pickerBox}>
          <Picker
            enabled={!disabled}
            selectedValue={year || ''}
            onValueChange={(v) => emit(v, month || '01')}
            style={styles.picker}
          >
            <Picker.Item label="Year" value="" />
            {years.map((y) => (
              <Picker.Item key={y} label={y} value={y} />
            ))}
          </Picker>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 8,
    marginBottom: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.TEXT_MUTED,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  pickerBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.12)',
    borderRadius: 8,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  picker: {
    width: '100%',
  },
});
