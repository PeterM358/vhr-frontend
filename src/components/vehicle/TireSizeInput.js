import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { COLORS } from '../../constants/colors';
import { useTranslation } from '../../i18n';
import { parseTireSize, tireSizePartChange } from './tireSizeUtils';

export default function TireSizeInput({ value, onChange, label }) {
  const { t } = useTranslation();
  const parts = useMemo(() => parseTireSize(value), [value]);

  const onPartChange = (part, next) => {
    onChange(tireSizePartChange(value, part, next));
  };

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.groupLabel}>{label}</Text> : null}
      <View style={styles.row}>
        <View style={styles.cell}>
          <Text style={styles.cellLabel}>{t('vehicleFields.tireWidth')}</Text>
          <TextInput
            mode="outlined"
            dense
            value={parts.width}
            onChangeText={(v) => onPartChange('width', v)}
            keyboardType="number-pad"
            maxLength={3}
            placeholder="225"
            style={styles.input}
          />
        </View>
        <Text style={styles.sep}>/</Text>
        <View style={styles.cell}>
          <Text style={styles.cellLabel}>{t('vehicleFields.tireProfile')}</Text>
          <TextInput
            mode="outlined"
            dense
            value={parts.profile}
            onChangeText={(v) => onPartChange('profile', v)}
            keyboardType="number-pad"
            maxLength={2}
            placeholder="45"
            style={styles.input}
          />
        </View>
        <Text style={styles.sep}>R</Text>
        <View style={[styles.cell, styles.rimCell]}>
          <Text style={styles.cellLabel}>{t('vehicleFields.tireRim')}</Text>
          <TextInput
            mode="outlined"
            dense
            value={parts.rim}
            onChangeText={(v) => onPartChange('rim', v)}
            keyboardType="number-pad"
            maxLength={2}
            placeholder="17"
            style={styles.input}
          />
        </View>
      </View>
      <Text style={styles.hint}>{t('vehicleFields.tireSizeHint')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 4,
  },
  groupLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.TEXT_MUTED,
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
  },
  cell: {
    flex: 1,
    minWidth: 0,
  },
  rimCell: {
    flex: 0.85,
  },
  cellLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.TEXT_MUTED,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#fff',
    textAlign: 'center',
  },
  sep: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.TEXT_MUTED,
    paddingBottom: 10,
  },
  hint: {
    marginTop: 4,
    fontSize: 11,
    color: COLORS.TEXT_MUTED,
  },
});
