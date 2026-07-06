import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import FloatingCard from '../ui/FloatingCard';
import { COLORS } from '../../constants/colors';

function SpecRow({ label, value }) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export default function VehicleSpecSuggestionCard({
  loading,
  spec,
  found,
  onApply,
  applied,
}) {
  if (loading) {
    return (
      <FloatingCard>
        <Text style={styles.title}>Looking up maintenance specs…</Text>
      </FloatingCard>
    );
  }

  if (!found || !spec) {
    return (
      <FloatingCard style={styles.emptyCard}>
        <Text style={styles.title}>Maintenance specifications</Text>
        <Text style={styles.emptyText}>
          We don&apos;t have verified specifications for this exact model yet. You can add them later
          under optional details.
        </Text>
      </FloatingCard>
    );
  }

  const battery =
    spec.battery_type && spec.battery_capacity_ah
      ? `${spec.battery_type} ${spec.battery_capacity_ah}Ah`
      : spec.battery_type || spec.battery_capacity_ah || '';

  const oilLine = [spec.oil_viscosity, spec.oil_approval].filter(Boolean).join(' · ');

  return (
    <FloatingCard style={styles.card}>
      <Text style={styles.title}>Recommended maintenance specs for this vehicle</Text>
      <SpecRow label="Engine oil" value={oilLine} />
      <SpecRow label="Oil capacity" value={spec.oil_capacity_l ? `${spec.oil_capacity_l} L` : ''} />
      <SpecRow label="Battery" value={battery} />
      <SpecRow label="Coolant" value={spec.coolant_type} />
      <SpecRow label="Brake fluid" value={spec.brake_fluid_type} />
      <SpecRow label="Transmission oil" value={spec.transmission_oil} />
      <SpecRow label="Timing" value={spec.timing_service_note} />
      {spec.source_note ? <Text style={styles.sourceNote}>{spec.source_note}</Text> : null}
      <Text style={styles.disclaimer}>
        Specifications are suggestions. Always verify with the service center or manufacturer data
        before service.
      </Text>
      {!applied ? (
        <Button mode="contained" onPress={onApply} style={styles.applyBtn}>
          Use these specs
        </Button>
      ) : (
        <Text style={styles.appliedText}>Specs applied — you can edit them in optional details.</Text>
      )}
    </FloatingCard>
  );
}

const styles = StyleSheet.create({
  card: {
    borderColor: 'rgba(37,99,235,0.2)',
  },
  emptyCard: {
    borderColor: 'rgba(15,23,42,0.08)',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
    lineHeight: 18,
  },
  row: {
    marginBottom: 8,
  },
  rowLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.TEXT_MUTED,
  },
  rowValue: {
    fontSize: 14,
    color: COLORS.TEXT_DARK,
    marginTop: 2,
  },
  sourceNote: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
    fontStyle: 'italic',
    marginTop: 4,
  },
  disclaimer: {
    fontSize: 11,
    color: COLORS.TEXT_MUTED,
    marginTop: 10,
    lineHeight: 16,
  },
  applyBtn: {
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  appliedText: {
    marginTop: 10,
    fontSize: 13,
    color: COLORS.PRIMARY,
    fontWeight: '600',
  },
});
