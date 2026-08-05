/**
 * Vehicles | Planning switcher for the unified Fleet area.
 * Shown on fleet list and fleet planning so both live under one drawer entry.
 */

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { COLORS } from '../../constants/colors';
import { useTranslation } from '../../i18n';

export const FLEET_AREA = {
  VEHICLES: 'vehicles',
  PLANNING: 'planning',
};

function AreaChip({ label, active, onPress, accessibilityLabel }) {
  return (
    <Pressable
      onPress={active ? undefined : onPress}
      disabled={active}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={accessibilityLabel || label}
      style={({ pressed }) => [
        styles.chip,
        active && styles.chipActive,
        pressed && !active && styles.chipPressed,
      ]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function FleetAreaSwitch({
  activeArea,
  onSelectVehicles,
  onSelectPlanning,
  showPlanning = true,
  style,
}) {
  const { t } = useTranslation();
  if (!showPlanning) return null;

  return (
    <View style={[styles.wrap, style]} accessibilityRole="tablist">
      <AreaChip
        label={t('org.fleet.area.vehicles', null, 'Vehicles')}
        active={activeArea === FLEET_AREA.VEHICLES}
        onPress={onSelectVehicles}
        accessibilityLabel={t('org.fleet.area.vehiclesA11y', null, 'Fleet vehicles')}
      />
      <AreaChip
        label={t('org.fleet.area.planning', null, 'Planning table')}
        active={activeArea === FLEET_AREA.PLANNING}
        onPress={onSelectPlanning}
        accessibilityLabel={t(
          'org.fleet.area.planningA11y',
          null,
          'Fleet planning table',
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
  },
  chip: {
    flex: 1,
    minHeight: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: COLORS.PRIMARY_GLASS,
    borderColor: COLORS.PRIMARY,
  },
  chipPressed: {
    opacity: 0.88,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.78)',
  },
  chipTextActive: {
    color: '#fff',
  },
});
