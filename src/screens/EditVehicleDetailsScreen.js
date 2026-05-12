import React, { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, Button, Dialog, Portal, Switch, Text } from 'react-native-paper';

import { API_BASE_URL } from '../api/config';
import {
  getCatalogEbikeSystems,
  getCatalogTrailerTypes,
  getVehicleChoices,
  getVehicleFieldGroups,
  updateVehicle,
} from '../api/vehicles';
import ScreenBackground from '../components/ScreenBackground';
import FloatingCard from '../components/ui/FloatingCard';
import { COLORS } from '../constants/colors';
import { stackContentPaddingTop } from '../navigation/stackContentInset';
import VehicleCatalogEbikeTrailerSection from '../components/vehicle/VehicleCatalogEbikeTrailerSection';
import VehicleCollapsibleFormSections from '../components/vehicle/VehicleCollapsibleFormSections';
import {
  buildOptionalVehiclePayload,
  getRelevantVehicleFieldGroups,
  resolveRelevantVehicleFieldGroups,
  VEHICLE_OPTIONAL_GROUPS,
  vehicleToFormBools,
  vehicleToFormStrings,
} from '../components/vehicle/vehicleFormConfig';

export default function EditVehicleDetailsScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { vehicleId } = route.params || {};

  const [vehicleChoices, setVehicleChoices] = useState({});
  const [backendFieldGroups, setBackendFieldGroups] = useState([]);
  const [catalogEbikeSystems, setCatalogEbikeSystems] = useState([]);
  const [catalogTrailerTypes, setCatalogTrailerTypes] = useState([]);

  const [vehicleTypeCode, setVehicleTypeCode] = useState('');
  const [identityPlate, setIdentityPlate] = useState('');
  const [identityTypeName, setIdentityTypeName] = useState('');
  const [identityBrandModel, setIdentityBrandModel] = useState('');
  const [identityYear, setIdentityYear] = useState('');
  const [identityVin, setIdentityVin] = useState('');

  const [editCatalogEbike, setEditCatalogEbike] = useState('');
  const [editCatalogTrailer, setEditCatalogTrailer] = useState('');
  const [optionalStrings, setOptionalStrings] = useState(() => vehicleToFormStrings({}));
  const [optionalBools, setOptionalBools] = useState(() => vehicleToFormBools({}));
  const [expandedOptional, setExpandedOptional] = useState(() => {
    const init = {};
    VEHICLE_OPTIONAL_GROUPS.forEach((g) => {
      init[g.key] = false;
    });
    return init;
  });
  const [expandedEbikeTrailer, setExpandedEbikeTrailer] = useState(false);
  const [poweredEquipmentEnabled, setPoweredEquipmentEnabled] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogMessage, setDialogMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await getVehicleFieldGroups(vehicleTypeCode || undefined);
        if (!cancelled) setBackendFieldGroups(Array.isArray(rows) ? rows : []);
      } catch (_e) {
        if (!cancelled) setBackendFieldGroups([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vehicleTypeCode]);

  const relevantOptionalGroups = useMemo(() => {
    const local = getRelevantVehicleFieldGroups(vehicleTypeCode, {
      ...optionalStrings,
      ...optionalBools,
      powered_equipment_enabled: poweredEquipmentEnabled,
    });
    const resolved = resolveRelevantVehicleFieldGroups(backendFieldGroups, local);
    return resolved.filter((group) => group.key !== 'odometer');
  }, [vehicleTypeCode, optionalStrings, optionalBools, poweredEquipmentEnabled, backendFieldGroups]);

  const showTrailerPoweredEquipmentToggle = useMemo(
    () =>
      String(vehicleTypeCode || '').toLowerCase() === 'trailer' &&
      !relevantOptionalGroups.some((g) => g.key === 'technical'),
    [vehicleTypeCode, relevantOptionalGroups]
  );

  const showEbikeCatalogSection = useMemo(() => {
    const code = String(vehicleTypeCode || '').toLowerCase();
    if (code === 'bicycle' || code === 'ebike' || code === 'e-bike') return true;
    return Boolean(editCatalogEbike || optionalStrings.ebike_system || optionalStrings.motor_brand || optionalStrings.motor_model);
  }, [vehicleTypeCode, editCatalogEbike, optionalStrings]);

  const showTrailerCatalogSection = useMemo(() => {
    const code = String(vehicleTypeCode || '').toLowerCase();
    if (code === 'trailer') return true;
    return Boolean(editCatalogTrailer || optionalStrings.trailer_type || optionalBools.braked_trailer);
  }, [vehicleTypeCode, editCatalogTrailer, optionalStrings, optionalBools]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!vehicleId) return;
      try {
        const token = await AsyncStorage.getItem('@access_token');
        const [choices, ebikeRows, trailerRows, vehicleRes] = await Promise.all([
          getVehicleChoices(),
          getCatalogEbikeSystems(),
          getCatalogTrailerTypes(),
          fetch(`${API_BASE_URL}/api/vehicles/${vehicleId}/`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        const vehicle = await vehicleRes.json();
        if (cancelled) return;

        setVehicleChoices(choices && typeof choices === 'object' ? choices : {});
        setCatalogEbikeSystems(ebikeRows);
        setCatalogTrailerTypes(trailerRows);

        setVehicleTypeCode(vehicle.vehicle_type_code || '');
        setIdentityPlate(vehicle.license_plate || '—');
        setIdentityTypeName(vehicle.vehicle_type_name || 'Vehicle');
        const line =
          [vehicle.catalog_brand_name, vehicle.catalog_model_name, vehicle.catalog_generation_name]
            .filter(Boolean)
            .join(' ') ||
          [vehicle.make_name, vehicle.model_name].filter(Boolean).join(' ') ||
          'Unknown vehicle';
        setIdentityBrandModel(line);
        setIdentityYear(vehicle.year != null ? String(vehicle.year) : '—');
        setIdentityVin(String(vehicle.vin || '').trim() ? String(vehicle.vin) : '—');

        setEditCatalogEbike(vehicle.catalog_ebike_system != null ? String(vehicle.catalog_ebike_system) : '');
        setEditCatalogTrailer(vehicle.catalog_trailer_type != null ? String(vehicle.catalog_trailer_type) : '');
        setOptionalStrings(vehicleToFormStrings(vehicle));
        setOptionalBools(vehicleToFormBools(vehicle));

        const hasPoweredTrailerData = [
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
        setPoweredEquipmentEnabled(hasPoweredTrailerData);
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setDialogMessage('Could not load vehicle details.');
          setDialogVisible(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vehicleId]);

  const toggleOptional = (key) => setExpandedOptional((prev) => ({ ...prev, [key]: !prev[key] }));
  const changeOptionalString = (key, value) => setOptionalStrings((prev) => ({ ...prev, [key]: value }));
  const changeOptionalBool = (key, value) => setOptionalBools((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    const built = buildOptionalVehiclePayload(optionalStrings, optionalBools);
    if (built.error) {
      Alert.alert('Validation', built.error);
      return;
    }

    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const payload = {
        catalog_ebike_system: editCatalogEbike ? parseInt(editCatalogEbike, 10) : null,
        catalog_trailer_type: editCatalogTrailer ? parseInt(editCatalogTrailer, 10) : null,
        ...built.payload,
      };
      delete payload.odometer_verified;
      delete payload.odometer_source;
      await updateVehicle(vehicleId, payload, token);
      Alert.alert('Saved', 'Vehicle details updated.');
      navigation.goBack();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', e.message || 'Could not save vehicle.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ScreenBackground safeArea={false}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator animating size="large" color="#fff" />
        </View>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground safeArea={false}>
      <View style={styles.root}>
        <KeyboardAwareScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            styles.container,
            {
              paddingTop: stackContentPaddingTop(insets, 8),
              paddingBottom: Math.max(insets.bottom, 16) + 132,
            },
          ]}
          keyboardShouldPersistTaps="always"
          enableOnAndroid
          extraScrollHeight={20}
        >
          <FloatingCard>
            <Text style={styles.cardTitle}>Vehicle identity (locked)</Text>
            <View style={styles.identityRow}>
              <Text style={styles.identityLabel}>Plate</Text>
              <Text style={styles.identityValue}>{identityPlate}</Text>
            </View>
            <View style={styles.identityRow}>
              <Text style={styles.identityLabel}>Vehicle type</Text>
              <Text style={styles.identityValue}>{identityTypeName}</Text>
            </View>
            <View style={styles.identityRow}>
              <Text style={styles.identityLabel}>Brand / model</Text>
              <Text style={styles.identityValue}>{identityBrandModel}</Text>
            </View>
            <View style={styles.identityRow}>
              <Text style={styles.identityLabel}>Year</Text>
              <Text style={styles.identityValue}>{identityYear}</Text>
            </View>
            <View style={styles.identityRow}>
              <Text style={styles.identityLabel}>VIN</Text>
              <Text style={styles.identityValue} selectable>
                {identityVin}
              </Text>
            </View>
            <Text style={styles.hintMuted}>
              Core identity and VIN are locked to protect vehicle history. Update kilometers on the vehicle screen. Contact support or use a correction flow if identity or VIN are wrong.
            </Text>
          </FloatingCard>

          <Text style={styles.sectionLead}>
            Edit engine, trailer, e-bike, and other technical fields below. Service reminders are edited from each reminder row on the vehicle screen.
          </Text>

          {showEbikeCatalogSection || showTrailerCatalogSection ? (
            <VehicleCatalogEbikeTrailerSection
              expanded={expandedEbikeTrailer}
              onToggle={() => setExpandedEbikeTrailer((v) => !v)}
              ebikeSystems={showEbikeCatalogSection ? catalogEbikeSystems : []}
              trailerTypes={showTrailerCatalogSection ? catalogTrailerTypes : []}
              selectedEbikeSystem={editCatalogEbike}
              onEbikeSystemChange={setEditCatalogEbike}
              selectedTrailerType={editCatalogTrailer}
              onTrailerTypeChange={setEditCatalogTrailer}
            />
          ) : null}

          {showTrailerPoweredEquipmentToggle ? (
            <FloatingCard style={{ marginBottom: 10 }}>
              <Text style={styles.cardTitle}>Powered equipment</Text>
              <Text style={styles.hintMuted}>
                Use technical fields only if this trailer has a refrigeration unit, generator, hydraulic system, or other powered equipment.
              </Text>
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Powered equipment</Text>
                <Switch value={poweredEquipmentEnabled} onValueChange={setPoweredEquipmentEnabled} />
              </View>
            </FloatingCard>
          ) : null}

          <Text style={styles.optionalIntro}>Technical sections (collapsed)</Text>
          <VehicleCollapsibleFormSections
            expanded={expandedOptional}
            onToggle={toggleOptional}
            strings={optionalStrings}
            onChangeString={changeOptionalString}
            bools={optionalBools}
            onChangeBool={changeOptionalBool}
            choicesMap={vehicleChoices}
            groups={relevantOptionalGroups}
          />

          <FloatingCard style={styles.mileageEvidenceCard}>
            <Text style={styles.cardTitle}>Mileage evidence</Text>
            <Text style={styles.mileageEvidenceText}>
              Mileage confidence is calculated automatically from service history, invoices, receipts, inspections, and chronological consistency.
            </Text>
            <Text style={styles.mileageEvidenceStatus}>Confidence: Not enough evidence yet</Text>
            <View style={styles.mileageEvidenceBullets}>
              <Text style={styles.mileageEvidenceBullet}>- No verified service-center records yet</Text>
              <Text style={styles.mileageEvidenceBullet}>- No receipts/invoices attached yet</Text>
              <Text style={styles.mileageEvidenceBullet}>- No inspection/imported records yet</Text>
            </View>
          </FloatingCard>
        </KeyboardAwareScrollView>
        <View style={[styles.bottomActionBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          <View style={styles.bottomActionRow}>
            <Button
              mode="outlined"
              onPress={() => navigation.goBack()}
              disabled={saving}
              style={styles.cancelButton}
              labelStyle={styles.cancelButtonLabel}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSave}
              loading={saving}
              disabled={saving}
              style={styles.saveButton}
              contentStyle={styles.saveButtonContent}
            >
              Save changes
            </Button>
          </View>
        </View>

        <Portal>
          <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
            <Dialog.Title>Notice</Dialog.Title>
            <Dialog.Content>
              <Text>{dialogMessage}</Text>
            </Dialog.Content>
            <Dialog.Actions>
              <Button mode="text" onPress={() => setDialogVisible(false)}>
                OK
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { paddingHorizontal: 16 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: COLORS.TEXT_DARK, marginBottom: 8 },
  hintMuted: { fontSize: 13, color: COLORS.TEXT_MUTED, fontStyle: 'italic', marginTop: 6 },
  optionalIntro: { marginTop: 8, marginBottom: 8, fontSize: 14, fontWeight: '700', color: '#fff' },
  sectionLead: {
    fontSize: 13,
    color: 'rgba(226,232,240,0.92)',
    lineHeight: 18,
    marginBottom: 4,
    paddingHorizontal: 2,
  },
  toggleRow: { marginTop: 2, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toggleLabel: { color: COLORS.TEXT_DARK, fontWeight: '600', fontSize: 14 },
  identityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(15,23,42,0.08)',
    paddingVertical: 6,
    gap: 10,
  },
  identityLabel: { color: COLORS.TEXT_MUTED, fontSize: 13 },
  identityValue: { color: COLORS.TEXT_DARK, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
  mileageEvidenceCard: {
    marginTop: 2,
  },
  mileageEvidenceText: {
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
    lineHeight: 18,
  },
  mileageEvidenceStatus: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
  },
  mileageEvidenceBullets: {
    marginTop: 8,
    gap: 4,
  },
  mileageEvidenceBullet: {
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
    lineHeight: 18,
  },
  bottomActionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: 'rgba(4,14,30,0.88)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(148,163,184,0.26)',
  },
  bottomActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cancelButton: {
    flex: 1,
    borderColor: 'rgba(148,163,184,0.5)',
    borderRadius: 12,
  },
  cancelButtonLabel: {
    color: '#e2e8f0',
    fontWeight: '600',
  },
  saveButton: {
    flex: 2,
    borderRadius: 12,
  },
  saveButtonContent: {
    minHeight: 48,
  },
});

