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

  const vehicleLine = selectedVehicle
    ? [
        selectedVehicle.license_plate,
        [selectedVehicle.make_name, selectedVehicle.model_name].filter(Boolean).join(' '),
      ]
        .filter(Boolean)
        .join(' ')
    : null;

  return (
    <FloatingCard>
      {centerName ? (
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Requesting service from:</Text>
          <Text style={styles.summaryValue}>{centerName}</Text>
          {onChangeServiceCenter ? (
            <Button mode="text" compact onPress={onChangeServiceCenter} style={styles.changeBtn}>
              Change
            </Button>
          ) : null}
        </View>
      ) : null}

      {vehicleLine ? (
        <View style={[styles.summaryRow, centerName && styles.summaryRowSpaced]}>
          <Text style={styles.summaryLabel}>Vehicle:</Text>
          <Text style={styles.summaryValue}>{vehicleLine}</Text>
          {!isEditMode && onChangeVehicle ? (
            <Button mode="text" compact onPress={onChangeVehicle} style={styles.changeBtn}>
              {showVehiclePicker ? 'Hide list' : 'Change vehicle'}
            </Button>
          ) : null}
        </View>
      ) : null}
    </FloatingCard>
  );
}

const styles = StyleSheet.create({
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  summaryRowSpaced: {
    marginTop: 10,
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.TEXT_MUTED,
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
    flexShrink: 1,
  },
  changeBtn: {
    marginLeft: 'auto',
  },
});
