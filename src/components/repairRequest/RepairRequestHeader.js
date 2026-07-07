import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import FloatingCard from '../ui/FloatingCard';
import { COLORS } from '../../constants/colors';
import { formatShopDisplayName } from '../../utils/shopDisplayName';

export default function RepairRequestHeader({
  serviceCenter,
  selectedVehicle,
  onChangeVehicle,
  onChangeServiceCenter,
  showVehiclePicker,
  isEditMode,
}) {
  const centerName = serviceCenter?.name
    ? formatShopDisplayName(serviceCenter.name)
    : null;

  return (
    <FloatingCard>
      {centerName ? (
        <View style={styles.centerRow}>
          <View style={styles.centerTextCol}>
            <Text style={styles.centerLabel}>Requesting service from</Text>
            <Text style={styles.centerName}>{centerName}</Text>
          </View>
          {onChangeServiceCenter ? (
            <Button mode="text" compact onPress={onChangeServiceCenter}>
              Change
            </Button>
          ) : null}
        </View>
      ) : null}

      {selectedVehicle ? (
        <View style={[styles.vehicleCard, centerName && styles.vehicleCardSpaced]}>
          <Text style={styles.vehiclePlate}>{selectedVehicle.license_plate || '—'}</Text>
          <Text style={styles.vehicleName}>
            {[selectedVehicle.make_name, selectedVehicle.model_name].filter(Boolean).join(' ') ||
              'Vehicle'}
          </Text>
          <Text style={styles.vehicleKm}>
            {selectedVehicle.kilometers != null && selectedVehicle.kilometers !== ''
              ? `${Number(selectedVehicle.kilometers).toLocaleString()} km`
              : 'Kilometers not set'}
          </Text>
          {!isEditMode && onChangeVehicle ? (
            <Button mode="text" compact onPress={onChangeVehicle} style={styles.changeVehicleBtn}>
              {showVehiclePicker ? 'Hide vehicle list' : 'Change vehicle'}
            </Button>
          ) : null}
        </View>
      ) : null}

      <Text style={styles.intro}>
        Tell us what you need. The service center will confirm before your visit is booked.
      </Text>
    </FloatingCard>
  );
}

const styles = StyleSheet.create({
  centerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  centerTextCol: {
    flex: 1,
  },
  centerLabel: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  centerName: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
    marginTop: 2,
  },
  vehicleCard: {
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.08)',
    borderRadius: 12,
    backgroundColor: '#fff',
    padding: 10,
    marginTop: 4,
  },
  vehicleCardSpaced: {
    marginTop: 10,
  },
  vehiclePlate: {
    color: COLORS.TEXT_DARK,
    fontWeight: '800',
    fontSize: 16,
  },
  vehicleName: {
    color: COLORS.TEXT_DARK,
    marginTop: 2,
  },
  vehicleKm: {
    color: COLORS.TEXT_MUTED,
    marginTop: 2,
    fontSize: 12,
  },
  changeVehicleBtn: {
    alignSelf: 'flex-start',
    marginLeft: -8,
    marginTop: 2,
  },
  intro: {
    color: COLORS.TEXT_MUTED,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
  },
});
