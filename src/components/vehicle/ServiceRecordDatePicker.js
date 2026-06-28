/**
 * Date picker for Add Service Record: ISO (YYYY-MM-DD) in state, DD.MM.YYYY display on native.
 */

import React, { useMemo, useState } from 'react';
import { View, Pressable, StyleSheet, Platform, Text as RNText } from 'react-native';
import { Text } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import WebDateInput from './WebDateInput';
import {
  parseIsoToLocalDate,
  localDateToIso,
  isoToDisplayDate,
  registrationDatePickerPlaceholder,
} from './dateFieldUtils';
import { COLORS } from '../../constants/colors';

function clampIsoToBounds(iso, minIso, maxIso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  let out = iso;
  if (minIso && out < minIso) out = minIso;
  if (maxIso && out > maxIso) out = maxIso;
  return out;
}

export default function ServiceRecordDatePicker({
  valueIso,
  onChangeIso,
  label,
  optional = false,
  /** Inclusive max (YYYY-MM-DD), e.g. today for completed service date */
  maxIso = null,
  /** Inclusive min (YYYY-MM-DD) */
  minIso = null,
}) {
  const [androidOpen, setAndroidOpen] = useState(false);
  const [iosOptionalOpen, setIosOptionalOpen] = useState(false);

  const displayText = useMemo(() => {
    if (!valueIso) return optional ? '— Optional —' : '—';
    return isoToDisplayDate(valueIso) || valueIso;
  }, [valueIso, optional]);

  const pickerValue = useMemo(() => {
    if (valueIso && /^\d{4}-\d{2}-\d{2}$/.test(valueIso)) {
      return parseIsoToLocalDate(valueIso) || registrationDatePickerPlaceholder();
    }
    const fallbackIso = maxIso || minIso || localDateToIso(new Date());
    return parseIsoToLocalDate(fallbackIso) || registrationDatePickerPlaceholder();
  }, [valueIso, maxIso, minIso]);

  const maximumDate = maxIso
    ? parseIsoToLocalDate(maxIso) || undefined
    : undefined;
  const minimumDate = minIso
    ? parseIsoToLocalDate(minIso) || undefined
    : undefined;

  const applyDate = (d) => {
    if (!d) return;
    let next = localDateToIso(d);
    next = clampIsoToBounds(next, minIso, maxIso);
    onChangeIso(next);
  };

  const clearIfOptional = () => {
    if (optional) onChangeIso('');
  };

  if (Platform.OS === 'web') {
    return (
      <View style={styles.wrap}>
        {label ? (
          <Text variant="labelLarge" style={styles.label}>
            {label}
            {optional ? ' (optional)' : ''}
          </Text>
        ) : null}
        <WebDateInput value={valueIso || ''} onChange={(v) => onChangeIso(clampIsoToBounds(v, minIso, maxIso))} min={minIso || undefined} max={maxIso || undefined} />
        {optional && valueIso ? (
          <Pressable onPress={clearIfOptional} style={styles.clearBtn}>
            <RNText style={styles.clearText}>Clear</RNText>
          </Pressable>
        ) : null}
      </View>
    );
  }

  if (Platform.OS === 'ios') {
    if (optional && !valueIso) {
      return (
        <View style={styles.wrap}>
          {label ? (
            <Text variant="labelLarge" style={styles.label}>
              {label}
              {optional ? ' (optional)' : ''}
            </Text>
          ) : null}
          <Pressable
            onPress={() => setIosOptionalOpen(true)}
            style={styles.datePressable}
            accessibilityRole="button"
          >
            <RNText style={styles.datePressableText}>{displayText}</RNText>
          </Pressable>
          {iosOptionalOpen ? (
            <DateTimePicker
              value={pickerValue}
              mode="date"
              display="spinner"
              minimumDate={minimumDate}
              maximumDate={maximumDate}
              onChange={(_e, d) => {
                if (d) {
                  applyDate(d);
                  setIosOptionalOpen(false);
                }
              }}
              style={styles.iosPicker}
            />
          ) : null}
        </View>
      );
    }
    return (
      <View style={styles.wrap}>
        {label ? (
          <Text variant="labelLarge" style={styles.label}>
            {label}
            {optional ? ' (optional)' : ''}
          </Text>
        ) : null}
        <DateTimePicker
          value={pickerValue}
          mode="date"
          display={optional ? 'compact' : 'spinner'}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={(_e, d) => {
            if (d) applyDate(d);
          }}
          style={optional ? undefined : styles.iosPicker}
        />
        {optional && valueIso ? (
          <Pressable onPress={clearIfOptional} style={styles.clearBtn}>
            <RNText style={styles.clearText}>Clear date</RNText>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {label ? (
        <Text variant="labelLarge" style={styles.label}>
          {label}
          {optional ? ' (optional)' : ''}
        </Text>
      ) : null}
      <Pressable
        onPress={() => setAndroidOpen(true)}
        style={styles.datePressable}
        accessibilityRole="button"
        accessibilityLabel={label || 'Choose date'}
      >
        <RNText style={styles.datePressableText}>{displayText}</RNText>
      </Pressable>
      {androidOpen ? (
        <DateTimePicker
          value={pickerValue}
          mode="date"
          display="default"
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onChange={(event, d) => {
            setAndroidOpen(false);
            if (event.type === 'set' && d) {
              applyDate(d);
            }
          }}
        />
      ) : null}
      {optional && valueIso ? (
        <Pressable onPress={clearIfOptional} style={styles.clearBtn}>
          <RNText style={styles.clearText}>Clear date</RNText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 6 },
  label: { marginTop: 6, marginBottom: 6, fontWeight: '600' },
  datePressable: {
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.12)',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  datePressableText: {
    fontSize: 16,
    color: COLORS.TEXT_DARK,
  },
  iosPicker: { alignSelf: 'stretch' },
  clearBtn: { marginTop: 6, alignSelf: 'flex-start' },
  clearText: { color: COLORS.PRIMARY, fontWeight: '600', fontSize: 14 },
});
