import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import FloatingCard from '../ui/FloatingCard';
import { COLORS } from '../../constants/colors';

/**
 * TODO(backend): vehicle health scores from mileage, service history, recalls.
 */
export default function VehicleHealthSection({ vehicles = [] }) {
  if (!vehicles.length) {
    return (
      <FloatingCard accent={false}>
        <Text style={styles.sectionTitle}>Vehicle Health</Text>
        <Text style={styles.emptyBody}>
          Add your first vehicle to unlock maintenance insights, service history, reminders and
          preventive recommendations.
        </Text>
      </FloatingCard>
    );
  }

  return (
    <View style={styles.list}>
      {vehicles.slice(0, 3).map((vehicle, index) => {
        const title =
          [vehicle.make_name || vehicle.make, vehicle.model_name || vehicle.model]
            .filter(Boolean)
            .join(' ') || 'Your vehicle';
        const plate = vehicle.license_plate || vehicle.plate;
        // Rotate placeholder statuses for demo until backend provides real health.
        const statusKeys = ['healthy', 'maintenance', 'urgent', 'unknown'];
        const statusKey = statusKeys[index % statusKeys.length];
        const status = {
          healthy: { label: 'Healthy', color: '#059669', icon: 'check-circle-outline' },
          maintenance: { label: 'Maintenance recommended', color: '#d97706', icon: 'wrench-clock' },
          urgent: { label: 'Urgent attention', color: '#dc2626', icon: 'alert-circle-outline' },
          unknown: { label: 'No history available', color: '#64748b', icon: 'help-circle-outline' },
        }[statusKey];

        return (
          <FloatingCard key={String(vehicle.id)} style={styles.card}>
            <Text style={styles.vehicleTitle}>{title}</Text>
            {plate ? <Text style={styles.plate}>{plate}</Text> : null}
            <View style={styles.statusRow}>
              <MaterialCommunityIcons name={status.icon} size={18} color={status.color} />
              <Text style={[styles.statusLabel, { color: status.color }]}>{status.label}</Text>
            </View>
            <Text style={styles.hint}>Health insights will use your service history and reminders.</Text>
          </FloatingCard>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 0,
  },
  card: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
    marginBottom: 6,
  },
  emptyBody: {
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
    lineHeight: 19,
  },
  vehicleTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
  },
  plate: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
    marginTop: 2,
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
    lineHeight: 17,
  },
});
