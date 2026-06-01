import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button, Text } from 'react-native-paper';
import { API_BASE_URL } from '../api/config';
import { getVehicleChoices } from '../api/vehicles';
import ScreenBackground from '../components/ScreenBackground';
import FloatingCard from '../components/ui/FloatingCard';
import { COLORS } from '../constants/colors';
import { stackContentPaddingTop } from '../navigation/stackContentInset';
import {
  getRelevantVehicleFieldGroups,
  groupHasDisplayData,
  ODOMETER_SOURCE_OPTIONS,
} from '../components/vehicle/vehicleFormConfig';

function isoToDisplayDate(isoDate) {
  const raw = String(isoDate || '').trim();
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return raw;
  return `${m[3]}.${m[2]}.${m[1]}`;
}

function labelForOdometerSource(value) {
  const o = ODOMETER_SOURCE_OPTIONS.find((x) => x.value === value);
  return o ? o.label : value;
}

function choiceLabel(choicesMap, fieldKey, rawValue) {
  if (rawValue == null || rawValue === '') return null;
  const options = choicesMap[fieldKey];
  if (!Array.isArray(options)) return String(rawValue);
  const hit = options.find((o) => String(o.value) === String(rawValue));
  return hit ? hit.label : String(rawValue);
}

function brandModelLine(vehicle) {
  const cat = [
    vehicle.catalog_brand_name,
    vehicle.catalog_model_name,
    vehicle.catalog_generation_name,
  ]
    .filter(Boolean)
    .join(' ');
  if (cat) return cat;
  const legacy = [vehicle.make_name, vehicle.model_name].filter(Boolean).join(' ');
  return legacy || null;
}

export default function VehicleSpecsScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { vehicleId } = route.params || {};
  const [vehicle, setVehicle] = useState(null);
  const [choices, setChoices] = useState({});
  const [loading, setLoading] = useState(true);
  const [isShop, setIsShop] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const shopFlag = await AsyncStorage.getItem('@is_shop');
        if (!cancelled) setIsShop(shopFlag === 'true');
      })();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const load = useCallback(async () => {
    if (!vehicleId) return;
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const [res, choiceRows] = await Promise.all([
        fetch(`${API_BASE_URL}/api/vehicles/${vehicleId}/`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        getVehicleChoices(),
      ]);
      const data = await res.json();
      setVehicle(res.ok ? data : null);
      setChoices(choiceRows && typeof choiceRows === 'object' ? choiceRows : {});
    } catch (_e) {
      setVehicle(null);
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const poweredEquipmentEnabled = useMemo(() => {
    if (!vehicle) return false;
    return [
      vehicle.fuel_type,
      vehicle.engine_displacement,
      vehicle.engine_code,
      vehicle.power_hp,
      vehicle.power_kw,
      vehicle.motor_brand,
      vehicle.motor_model,
      vehicle.battery_capacity_wh,
      vehicle.ebike_system,
    ].some((v) => v != null && String(v).trim() !== '');
  }, [vehicle]);

  const relevantGroups = useMemo(() => {
    if (!vehicle) return [];
    const code = vehicle.vehicle_type_code || '';
    return getRelevantVehicleFieldGroups(code, {
      ...vehicle,
      powered_equipment_enabled: poweredEquipmentEnabled,
    });
  }, [vehicle, poweredEquipmentEnabled]);

  const identityRows = useMemo(() => {
    if (!vehicle) return [];
    const rows = [];
    const plate = String(vehicle.license_plate || '').trim();
    if (plate) rows.push({ key: 'plate', label: 'License plate', value: plate });
    const vin = String(vehicle.vin || '').trim();
    if (vin) rows.push({ key: 'vin', label: 'VIN', value: vin });
    const vt = String(vehicle.vehicle_type_name || '').trim();
    if (vt) rows.push({ key: 'type', label: 'Vehicle type', value: vt });
    const bm = brandModelLine(vehicle);
    if (bm) rows.push({ key: 'brand', label: 'Brand / model', value: bm });
    const regName = String(vehicle.registration_country_name || '').trim();
    const regIso = String(vehicle.registration_country || '').trim().toUpperCase();
    if (regName || regIso) {
      const display =
        regName && regIso && regIso.length === 2 ? `${regName} (${regIso})` : regName || regIso;
      rows.push({ key: 'regCountry', label: 'Registration country', value: display });
    }
    if (vehicle.first_registration_date) {
      rows.push({
        key: 'firstReg',
        label: 'First registration',
        value: isoToDisplayDate(vehicle.first_registration_date),
      });
    }
    return rows;
  }, [vehicle]);

  const renderOptionalGroup = (group) => {
    if (!vehicle || !groupHasDisplayData(group.key, vehicle)) return null;
    const rows = [];

    (group.boolFields || []).forEach((bf) => {
      if (vehicle[bf.key]) {
        rows.push({ key: bf.key, label: bf.label, value: 'Yes' });
      }
    });

    (group.fields || []).forEach((f) => {
      const v = vehicle[f.key];
      if (v == null || v === '') return;
      let display = String(v);
      if (f.kind === 'choice') {
        const lbl = choiceLabel(choices, f.key, v);
        display = lbl != null ? lbl : String(v);
      } else if (f.kind === 'odometer_picker' || f.key === 'odometer_source') {
        display = labelForOdometerSource(v);
      } else if (f.kind === 'date') {
        display = isoToDisplayDate(v);
      } else if (f.kind === 'decimal' || f.kind === 'int') {
        display = String(v);
      }
      rows.push({ key: f.key, label: f.label, value: display });
    });

    if (!rows.length) return null;

    return (
      <FloatingCard key={group.key} style={styles.card}>
        <Text style={styles.cardTitle}>{group.title}</Text>
        {group.helperText && group.key === 'odometer' ? (
          <Text style={styles.cardHint}>{group.helperText}</Text>
        ) : null}
        {rows.map((r) => (
          <View key={r.key} style={styles.row}>
            <Text style={styles.label}>{r.label}</Text>
            <Text style={styles.value}>{r.value}</Text>
          </View>
        ))}
      </FloatingCard>
    );
  };

  const openEditTechnical = () => {
    navigation.navigate('EditVehicleDetails', { vehicleId });
  };

  if (loading) {
    return (
      <ScreenBackground safeArea={false}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      </ScreenBackground>
    );
  }

  if (!vehicle) {
    return (
      <ScreenBackground safeArea={false}>
        <View style={styles.center}>
          <Text style={styles.errorText}>Could not load vehicle specs.</Text>
          <Button mode="contained-tonal" onPress={load} style={{ marginTop: 12 }}>
            Retry
          </Button>
        </View>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground safeArea={false}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: stackContentPaddingTop(insets, 12),
            paddingBottom: Math.max(insets.bottom, 16) + (isShop ? 24 : 88),
          },
        ]}
      >
        {identityRows.length > 0 ? (
          <FloatingCard style={styles.card}>
            <Text style={styles.cardTitle}>Identity</Text>
            {identityRows.map((r) => (
              <View key={r.key} style={styles.row}>
                <Text style={styles.label}>{r.label}</Text>
                <Text style={styles.value}>{r.value}</Text>
              </View>
            ))}
          </FloatingCard>
        ) : null}

        {relevantGroups.map((g) => renderOptionalGroup(g))}
      </ScrollView>

      {!isShop ? (
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Button mode="contained" icon="wrench" onPress={openEditTechnical} style={styles.editBtn}>
            Edit technical details
          </Button>
        </View>
      ) : null}
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  card: {
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
    marginBottom: 10,
  },
  cardHint: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
    lineHeight: 17,
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
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: 'rgba(15,23,42,0.92)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  editBtn: {
    borderRadius: 10,
  },
});
