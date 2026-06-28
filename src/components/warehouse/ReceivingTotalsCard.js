import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

import FloatingCard from '../ui/FloatingCard';
import { TEXT_DARK, TEXT_MUTED } from '../../constants/colors';

function eur(minor) {
  if (minor == null) return '—';
  return `€${(Number(minor) / 100).toFixed(2)}`;
}

export default function ReceivingTotalsCard({ totals, lineCount = 0 }) {
  const ex = totals?.ex_vat_minor ?? 0;
  const vat = totals?.vat_minor ?? 0;
  const inc = totals?.inc_vat_minor ?? ex + vat;

  if (!lineCount) return null;

  return (
    <FloatingCard style={styles.card}>
      <Text style={styles.title}>Document totals ({lineCount} lines)</Text>
      <View style={styles.row}>
        <Text style={styles.label}>Ex-VAT</Text>
        <Text style={styles.value}>{eur(ex)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>VAT</Text>
        <Text style={styles.value}>{eur(vat)}</Text>
      </View>
      <View style={[styles.row, styles.grandRow]}>
        <Text style={styles.grandLabel}>Inc-VAT</Text>
        <Text style={styles.grandValue}>{eur(inc)}</Text>
      </View>
    </FloatingCard>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: 8, marginBottom: 12, padding: 14, backgroundColor: '#f8fafc' },
  title: { fontSize: 14, fontWeight: '700', color: TEXT_DARK, marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label: { fontSize: 13, color: TEXT_MUTED },
  value: { fontSize: 13, fontWeight: '600', color: TEXT_DARK },
  grandRow: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e2e8f0',
  },
  grandLabel: { fontSize: 14, fontWeight: '700', color: TEXT_DARK },
  grandValue: { fontSize: 16, fontWeight: '700', color: TEXT_DARK },
});
