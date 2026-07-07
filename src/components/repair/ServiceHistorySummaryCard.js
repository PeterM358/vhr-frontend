/**
 * Compact service history card — enough context without opening the record.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import FloatingCard from '../ui/FloatingCard';
import StatusBadge from '../ui/StatusBadge';
import { COLORS } from '../../constants/colors';
import { formatServiceRecordProvider } from '../../utils/serviceRecordProvider';
import {
  formatRepairListDate,
  repairHistoryKmLabel,
  repairHistoryTotalLabel,
  repairServiceTypeLabel,
  repairVehicleLabel,
} from '../../utils/repairListUtils';

export default function ServiceHistorySummaryCard({ item, onPress }) {
  const serviceName = repairServiceTypeLabel(item);
  const vehicle = repairVehicleLabel(item);
  const center = formatServiceRecordProvider(item);
  const completedDate = formatRepairListDate(item.completed_at || item.created_at) || '—';
  const mileage = repairHistoryKmLabel(item);
  const total = repairHistoryTotalLabel(item);

  return (
    <FloatingCard onPress={onPress} style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.serviceName} numberOfLines={1}>
          {serviceName}
        </Text>
        <StatusBadge status={item.status} />
      </View>

      <Text style={styles.vehicle} numberOfLines={1}>
        {vehicle}
      </Text>

      <View style={styles.metaRow}>
        <Text style={styles.meta} numberOfLines={1}>
          {center}
        </Text>
        <Text style={styles.metaDate}>{completedDate}</Text>
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.meta}>{mileage || 'Km not recorded'}</Text>
        <Text style={styles.total}>{total || '—'}</Text>
      </View>
    </FloatingCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  serviceName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
  },
  vehicle: {
    marginTop: 3,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.TEXT_DARK,
  },
  metaRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  meta: {
    flex: 1,
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
  },
  metaDate: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
  },
  footerRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  total: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
  },
});
