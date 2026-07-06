import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, Button } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import FloatingCard from '../ui/FloatingCard';
import { COLORS } from '../../constants/colors';
import {
  mapHealthFromApi,
  vehicleDisplayTitle,
} from '../../utils/vehicleHealthStatus';

const MAX_VISIBLE = 3;

export default function VehicleHealthSection({
  vehicles = [],
  onVehiclePress,
  onViewAllPress,
}) {
  const rows = useMemo(
    () =>
      vehicles.slice(0, MAX_VISIBLE).map((vehicle) => ({
        vehicle,
        health: mapHealthFromApi(vehicle),
      })),
    [vehicles]
  );

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
      {rows.map(({ vehicle, health }) => {
        const title = vehicleDisplayTitle(vehicle);
        const plate = vehicle.license_plate || vehicle.plate;

        return (
          <FloatingCard
            key={String(vehicle.id)}
            style={styles.card}
            onPress={() => onVehiclePress?.(vehicle)}
          >
            <Text style={styles.vehicleTitle}>{title}</Text>
            {plate ? <Text style={styles.plate}>{plate}</Text> : null}
            <View style={styles.statusRow}>
              <MaterialCommunityIcons name={health.icon} size={18} color={health.color} />
              <Text style={[styles.statusLabel, { color: health.color }]}>
                {health.status_label || health.label}
              </Text>
            </View>
            <Text style={styles.hint}>{health.shortReason}</Text>
          </FloatingCard>
        );
      })}
      {vehicles.length > MAX_VISIBLE ? (
        <Button mode="text" onPress={onViewAllPress} style={styles.viewAllBtn}>
          View all vehicles
        </Button>
      ) : null}
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
  viewAllBtn: {
    alignSelf: 'flex-start',
    marginTop: 2,
  },
});
