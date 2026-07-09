import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import FloatingCard from '../ui/FloatingCard';
import { COLORS } from '../../constants/colors';
import {
  VEHICLE_OPTIONAL_GROUPS,
  groupHasDisplayData,
  ODOMETER_SOURCE_OPTIONS,
} from './vehicleFormConfig';
import {
  useTranslation,
  translateVehicleFieldLabel,
  translateVehicleGroupTitle,
  translateFuelTypeLabel,
} from '../../i18n';

function labelForOdometerSource(value) {
  const o = ODOMETER_SOURCE_OPTIONS.find((x) => x.value === value);
  return o ? o.label : value;
}

export default function OptionalVehicleGroupsReadonly({ vehicle }) {
  const { t } = useTranslation();
  if (!vehicle) return null;

  return (
    <>
      {VEHICLE_OPTIONAL_GROUPS.map((group) => {
        if (!groupHasDisplayData(group.key, vehicle)) return null;
        const rows = [];

        (group.boolFields || []).forEach((bf) => {
          if (vehicle[bf.key]) {
            rows.push({
              key: bf.key,
              label: translateVehicleFieldLabel(bf.key, bf.label, t),
              value: 'Yes',
            });
          }
        });

        (group.fields || []).forEach((f) => {
          const v = vehicle[f.key];
          if (v == null || v === '') return;
          let display = String(v);
          if (f.key === 'fuel_type') {
            display = translateFuelTypeLabel(v, t);
          } else if (f.kind === 'odometer_picker' || f.key === 'odometer_source') {
            display = labelForOdometerSource(v);
          } else if (f.key === 'registration_country') {
            display =
              vehicle.registration_country_name && String(vehicle.registration_country_name).trim()
                ? String(vehicle.registration_country_name)
                : String(v);
          }
          rows.push({
            key: f.key,
            label: translateVehicleFieldLabel(f.key, f.label, t),
            value: display,
          });
        });

        if (!rows.length) return null;

        return (
          <FloatingCard key={group.key}>
            <Text style={styles.title}>{translateVehicleGroupTitle(group.key, group.title, t)}</Text>
            {rows.map((r) => (
              <View key={r.key} style={styles.row}>
                <Text style={styles.label}>{r.label}</Text>
                <Text style={styles.value}>{r.value}</Text>
              </View>
            ))}
          </FloatingCard>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
    marginBottom: 10,
  },
  row: {
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(15,23,42,0.08)',
  },
  label: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
    marginBottom: 2,
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.TEXT_DARK,
  },
});
