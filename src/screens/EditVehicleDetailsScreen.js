import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, Button, Dialog, Portal, Switch, Text, TextInput } from 'react-native-paper';

import { API_BASE_URL } from '../api/config';
import { getCountries } from '../api/profiles';
import {
  getCatalogEbikeSystems,
  getCatalogTrailerTypes,
  getVehicleChoices,
  getVehicleFieldGroups,
  getVehicleTypes,
  updateVehicle,
} from '../api/vehicles';
import { Picker } from '@react-native-picker/picker';
import { confirmMessage } from '../utils/crossPlatformAlert';
import ScreenBackground from '../components/ScreenBackground';
import AppNavigationBar from '../components/common/AppNavigationBar';
import FloatingCard from '../components/ui/FloatingCard';
import { COLORS } from '../constants/colors';
import { useScrollShadow } from '../hooks/useScrollShadow';
import { useGoBackOr } from '../navigation/appNavBarBack';
import { navigateToVehicleReminderNew, navigateToVehicleManageServiceCenters } from '../navigation/webNavigation';
import VehicleCatalogEbikeTrailerSection from '../components/vehicle/VehicleCatalogEbikeTrailerSection';
import VehicleRegistrationIdentityBlock from '../components/vehicle/VehicleRegistrationIdentityBlock';
import VehicleCollapsibleFormSections from '../components/vehicle/VehicleCollapsibleFormSections';
import {
  buildOptionalVehiclePayload,
  getRelevantVehicleFieldGroups,
  resolveRelevantVehicleFieldGroups,
  VEHICLE_OPTIONAL_GROUPS,
  vehicleToFormBools,
  vehicleToFormStrings,
  registrationCountryToFormCode,
  profileCountriesToPickerOptions,
} from '../components/vehicle/vehicleFormConfig';
import { isoToDisplayDate } from '../components/vehicle/dateFieldUtils';
import MileageEvidenceCard from '../components/vehicle/MileageEvidenceCard';
import MileageConfidenceSheet from '../components/vehicle/MileageConfidenceSheet';
import { resolveMileageFactorAction } from '../utils/mileageConfidence';
import { useTranslation, translateMileageConfidenceCategory } from '../i18n';
import { translateVehicleTypeLabel } from '../utils/translateShopTypeLabels';

export default function EditVehicleDetailsScreen({ navigation, route }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { vehicleId } = route.params || {};
  const { scrolled, onScroll, scrollEventThrottle } = useScrollShadow();
  const handleBack = useGoBackOr(navigation);

  const [vehicleChoices, setVehicleChoices] = useState({});
  const [countriesState, setCountriesState] = useState({
    status: 'loading',
    rows: [],
    error: '',
  });
  const [backendFieldGroups, setBackendFieldGroups] = useState([]);
  const [catalogEbikeSystems, setCatalogEbikeSystems] = useState([]);
  const [catalogTrailerTypes, setCatalogTrailerTypes] = useState([]);

  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [selectedVehicleTypeId, setSelectedVehicleTypeId] = useState('');
  const [initialVehicleTypeId, setInitialVehicleTypeId] = useState('');
  const [vehicleTypeCode, setVehicleTypeCode] = useState('');
  const [identityPlate, setIdentityPlate] = useState('');
  const [identityTypeName, setIdentityTypeName] = useState('');
  const [identityBrandModel, setIdentityBrandModel] = useState('');
  const [identityVin, setIdentityVin] = useState('');
  const [vinEditable, setVinEditable] = useState('');
  const [vinLocked, setVinLocked] = useState(true);
  const [regFirstIso, setRegFirstIso] = useState('');
  const [regCountryIso, setRegCountryIso] = useState('');

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
  const [registrationExpanded, setRegistrationExpanded] = useState(false);
  const [mileageConfidence, setMileageConfidence] = useState(null);
  const [mileageSheetVisible, setMileageSheetVisible] = useState(false);
  const [poweredEquipmentEnabled, setPoweredEquipmentEnabled] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogMessage, setDialogMessage] = useState('');

  const goBackToVehicleDetail = useCallback(() => {
    if (!vehicleId) {
      navigation.goBack();
      return;
    }
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('VehicleDetail', { vehicleId });
  }, [navigation, vehicleId]);

  const openFromMileageIntent = useCallback(
    (factor) => {
      const intent = resolveMileageFactorAction(factor);
      if (!intent) return;
      const action = intent.action;
      if (action === 'repair_detail' && intent.repairId) {
        navigation.navigate('RepairDetail', { repairId: intent.repairId });
        return;
      }
      if (action === 'log_service' || action === 'log_service_receipt' || action === 'log_service_odometer') {
        navigation.navigate('LogServiceRecord', {
          vehicleId,
          returnTo: 'EditVehicleDetails',
          origin: 'EditVehicleDetails',
        });
        return;
      }
      if (action === 'add_obligation_inspection') {
        navigateToVehicleReminderNew(navigation, vehicleId, {
          initialReminderType: 'technical_inspection',
          returnTo: 'EditVehicleDetails',
          origin: 'EditVehicleDetails',
        });
        return;
      }
      if (action === 'manage_authorized_centers') {
        navigateToVehicleManageServiceCenters(navigation, vehicleId, {
          returnTo: 'EditVehicleDetails',
          origin: 'EditVehicleDetails',
        });
        return;
      }
      if (action === 'vehicle_specs') {
        navigation.navigate('VehicleSpecs', { vehicleId });
        return;
      }
      navigation.navigate('VehicleDetail', {
        vehicleId,
        mileageIntent: { action, repairId: intent.repairId },
      });
    },
    [navigation, vehicleId]
  );

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

  const reloadCountries = useCallback(async () => {
    setCountriesState((prev) => ({ ...prev, status: 'loading', error: '' }));
    try {
      const raw = await getCountries();
      const list = Array.isArray(raw) ? raw : [];
      setCountriesState({ status: 'success', rows: list, error: '' });
    } catch (e) {
      const msg = e && typeof e.message === 'string' ? e.message : '';
      if (__DEV__) console.warn('[EditVehicleDetails] getCountries failed', msg);
      setCountriesState({ status: 'error', rows: [], error: 'Could not load countries.' });
    }
  }, []);

  const mergedVehicleChoices = useMemo(() => {
    return vehicleChoices && typeof vehicleChoices === 'object' ? { ...vehicleChoices } : {};
  }, [vehicleChoices]);

  const countryPickerOptions = useMemo(
    () => profileCountriesToPickerOptions(countriesState.rows || []),
    [countriesState.rows]
  );

  const registrationDateLabel = useMemo(() => {
    const iso = String(regFirstIso || '').trim();
    return iso ? isoToDisplayDate(iso) || iso : t('vehicles.detail.notSet');
  }, [regFirstIso, t]);

  const registrationCountryLabel = useMemo(() => {
    const code = String(regCountryIso || '').trim().toUpperCase();
    if (!code) return t('vehicles.detail.notSet');
    const hit = countryPickerOptions.find((o) => o.value === code);
    return hit?.label || code;
  }, [regCountryIso, countryPickerOptions, t]);

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

  const hasVehicleTypePicker = vehicleTypes.length > 0;

  const vehicleTypeLabel = useCallback(
    (typeId) => {
      if (!typeId) return t('vehicles.detail.notSet');
      const row = vehicleTypes.find((vt) => String(vt.id) === String(typeId));
      return row?.name || identityTypeName || t('vehicles.detail.notSet');
    },
    [vehicleTypes, identityTypeName, t]
  );

  const applyVehicleTypeChange = useCallback(
    async (nextId) => {
      const prevId = selectedVehicleTypeId;
      const next = nextId ? String(nextId) : '';
      if (next === String(prevId || '')) return;

      const fromLabel = vehicleTypeLabel(prevId);
      const toLabel = vehicleTypeLabel(next);

      if (prevId && next) {
        const ok = await confirmMessage(
          'Change vehicle type?',
          `Are you sure you want to change from ${fromLabel} to ${toLabel}? This affects reminders, service matching, and what your workshop sees.`,
          { confirmLabel: 'Change type' }
        );
        if (!ok) return;
      } else if (prevId && !next) {
        const ok = await confirmMessage(
          'Clear vehicle type?',
          `Remove ${fromLabel} as the vehicle type?`,
          { confirmLabel: 'Clear type' }
        );
        if (!ok) return;
      }

      setSelectedVehicleTypeId(next);
      const row = vehicleTypes.find((vt) => String(vt.id) === next);
      setVehicleTypeCode(row?.code || '');
      setIdentityTypeName(row?.name || t('vehicles.detail.notSet'));
    },
    [selectedVehicleTypeId, vehicleTypeLabel, vehicleTypes]
  );

  const reloadVehicleTypes = useCallback(async () => {
    try {
      const rows = await getVehicleTypes();
      setVehicleTypes(Array.isArray(rows) ? rows : []);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not load vehicle types.');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!vehicleId) return;
      try {
        const token = await AsyncStorage.getItem('@access_token');
        setCountriesState({ status: 'loading', rows: [], error: '' });
        const [choices, ebikeRows, trailerRows, vehicleRes] = await Promise.all([
          getVehicleChoices(),
          getCatalogEbikeSystems(),
          getCatalogTrailerTypes(),
          fetch(`${API_BASE_URL}/api/vehicles/${vehicleId}/`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        let typeRows = [];
        try {
          typeRows = await getVehicleTypes();
        } catch (typeErr) {
          if (__DEV__) console.warn('[EditVehicleDetails] getVehicleTypes failed', typeErr);
        }
        let countryList = [];
        try {
          const rawCountries = await getCountries();
          countryList = Array.isArray(rawCountries) ? rawCountries : [];
          if (!cancelled) {
            setCountriesState({ status: 'success', rows: countryList, error: '' });
          }
        } catch (ce) {
          const msg = ce && typeof ce.message === 'string' ? ce.message : '';
          if (__DEV__) console.warn('[EditVehicleDetails] getCountries failed', msg);
          if (!cancelled) {
            setCountriesState({ status: 'error', rows: [], error: 'Could not load countries.' });
          }
        }
        const vehicle = await vehicleRes.json();
        if (cancelled) return;

        setVehicleChoices(choices && typeof choices === 'object' ? choices : {});
        setCatalogEbikeSystems(ebikeRows);
        setCatalogTrailerTypes(trailerRows);
        setVehicleTypes(Array.isArray(typeRows) ? typeRows : []);

        setMileageConfidence(vehicle.mileage_confidence || null);
        let resolvedTypeId =
          vehicle.vehicle_type != null && vehicle.vehicle_type !== ''
            ? String(vehicle.vehicle_type)
            : '';
        if (!resolvedTypeId && vehicle.vehicle_type_code && Array.isArray(typeRows)) {
          const hit = typeRows.find((vt) => vt.code === vehicle.vehicle_type_code);
          if (hit?.id != null) resolvedTypeId = String(hit.id);
        }
        setSelectedVehicleTypeId(resolvedTypeId);
        setInitialVehicleTypeId(resolvedTypeId);
        setVehicleTypeCode(vehicle.vehicle_type_code || '');
        setIdentityPlate(vehicle.license_plate || '—');
        setIdentityTypeName(vehicle.vehicle_type_name || t('vehicles.detail.notSet'));
        const line =
          [vehicle.catalog_brand_name, vehicle.catalog_model_name, vehicle.catalog_generation_name]
            .filter(Boolean)
            .join(' ') ||
          [vehicle.make_name, vehicle.model_name].filter(Boolean).join(' ') ||
          'Unknown vehicle';
        setIdentityBrandModel(line);
        const existingVin = String(vehicle.vin || '').trim();
        setIdentityVin(existingVin || '—');
        setVinEditable(existingVin);
        setVinLocked(!!existingVin);

        const frd = vehicle.first_registration_date;
        const frdIso = frd ? String(frd).slice(0, 10) : '';
        setRegFirstIso(frdIso);
        setRegCountryIso(registrationCountryToFormCode(vehicle.registration_country, countryList));
        setRegistrationExpanded(!frdIso && !registrationCountryToFormCode(vehicle.registration_country, countryList));

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
      const fr = String(regFirstIso ?? '').trim();
      payload.first_registration_date = fr || null;
      const rc = String(regCountryIso ?? '').trim().toUpperCase();
      payload.registration_country = rc || null;
      if (!vinLocked) {
        const v = String(vinEditable ?? '').trim();
        payload.vin = v || null;
      }
      if (String(selectedVehicleTypeId || '') !== String(initialVehicleTypeId || '')) {
        payload.vehicle_type = selectedVehicleTypeId ? parseInt(selectedVehicleTypeId, 10) : null;
      }
      delete payload.odometer_verified;
      delete payload.odometer_source;
      await updateVehicle(vehicleId, payload, token);
      Alert.alert('Saved', 'Vehicle details updated.');
      goBackToVehicleDetail();
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
        <AppNavigationBar
          title={t('vehicles.detail.technicalDetails')}
          backLabel={t('vehicles.vehicle')}
          onBack={handleBack}
          scrolled={scrolled}
        />
        <KeyboardAwareScrollView
          style={{ flex: 1 }}
          onScroll={onScroll}
          scrollEventThrottle={scrollEventThrottle}
          contentContainerStyle={[
            styles.container,
            {
              paddingTop: 12,
              paddingBottom: Math.max(insets.bottom, 16) + 132,
            },
          ]}
          keyboardShouldPersistTaps="always"
          enableOnAndroid
          extraScrollHeight={20}
        >
          {hasVehicleTypePicker ? (
            <FloatingCard style={{ marginBottom: 10 }}>
              <Text style={styles.cardTitle}>{t('vehicles.detail.vehicleIdentity')}</Text>
              <Text style={styles.fieldLabel}>{t('vehicles.detail.vehicleType')}</Text>
              <Text style={styles.hintMuted}>
                Car, truck, motorcycle, bicycle, trailer, etc. Workshops and service matching use this on bookings.
              </Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedVehicleTypeId}
                  onValueChange={applyVehicleTypeChange}
                  style={styles.picker}
                >
                  <Picker.Item label={t('vehicles.detail.notSet')} value="" />
                  {vehicleTypes.map((vt) => (
                    <Picker.Item key={vt.id} label={vt.name} value={String(vt.id)} />
                  ))}
                </Picker>
              </View>
              <View style={styles.identityRow}>
                <Text style={styles.identityLabel}>Plate</Text>
                <Text style={styles.identityValue}>{identityPlate}</Text>
              </View>
              <View style={styles.identityRow}>
                <Text style={styles.identityLabel}>Brand / model</Text>
                <Text style={styles.identityValue}>{identityBrandModel}</Text>
              </View>
              {vinLocked ? (
                <View style={styles.identityRow}>
                  <Text style={styles.identityLabel}>VIN</Text>
                  <Text style={styles.identityValue} selectable>
                    {identityVin}
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={styles.identityLabel}>VIN (optional)</Text>
                  <TextInput
                    mode="outlined"
                    value={vinEditable}
                    onChangeText={setVinEditable}
                    placeholder="17-character VIN"
                    autoCapitalize="characters"
                    style={{ marginBottom: 8 }}
                  />
                </>
              )}
              <View style={styles.identityRow}>
                <Text style={styles.identityLabel}>First registration</Text>
                <Text style={styles.identityValue}>{registrationDateLabel}</Text>
              </View>
              <View style={styles.identityRow}>
                <Text style={styles.identityLabel}>Reg. country</Text>
                <Text style={styles.identityValue}>{registrationCountryLabel}</Text>
              </View>
              <Pressable
                onPress={() => setRegistrationExpanded((v) => !v)}
                style={styles.registrationToggle}
                accessibilityRole="button"
              >
                <Text style={styles.registrationToggleText}>
                  {registrationExpanded
                    ? t('vehicles.detail.hideRegistrationEditor')
                    : regFirstIso || regCountryIso
                      ? t('vehicles.detail.editRegistration')
                      : t('vehicles.detail.addRegistrationOptional')}
                </Text>
                <MaterialCommunityIcons
                  name={registrationExpanded ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={COLORS.PRIMARY}
                />
              </Pressable>
              <Text style={styles.hintMuted}>
                {vinLocked
                  ? 'Plate, make/model, and VIN are locked after creation. Changing vehicle type asks for confirmation. Registration: add date once if you skipped it at create; country can change later. Kilometers are on the vehicle screen.'
                  : 'Add your VIN once, then save. Registration is optional and edited below when expanded.'}
              </Text>
            </FloatingCard>
          ) : (
            <FloatingCard style={{ marginBottom: 10 }}>
              <Text style={styles.cardTitle}>Vehicle identity</Text>
              <Text style={styles.helperMuted}>
                Vehicle types could not be loaded. Pull to refresh or tap retry — Car, Truck, Motorcycle, etc. should
                appear here.
              </Text>
              <Button mode="outlined" compact onPress={reloadVehicleTypes} style={{ alignSelf: 'flex-start', marginTop: 8 }}>
                Retry vehicle types
              </Button>
              <View style={styles.identityRow}>
                <Text style={styles.identityLabel}>Plate</Text>
                <Text style={styles.identityValue}>{identityPlate}</Text>
              </View>
              <View style={styles.identityRow}>
                <Text style={styles.identityLabel}>Brand / model</Text>
                <Text style={styles.identityValue}>{identityBrandModel}</Text>
              </View>
              {vinLocked ? (
                <View style={styles.identityRow}>
                  <Text style={styles.identityLabel}>VIN</Text>
                  <Text style={styles.identityValue} selectable>
                    {identityVin}
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={styles.identityLabel}>VIN (optional)</Text>
                  <TextInput
                    mode="outlined"
                    value={vinEditable}
                    onChangeText={setVinEditable}
                    placeholder="17-character VIN"
                    autoCapitalize="characters"
                    style={{ marginBottom: 8 }}
                  />
                </>
              )}
              <View style={styles.identityRow}>
                <Text style={styles.identityLabel}>First registration</Text>
                <Text style={styles.identityValue}>{registrationDateLabel}</Text>
              </View>
              <View style={styles.identityRow}>
                <Text style={styles.identityLabel}>Reg. country</Text>
                <Text style={styles.identityValue}>{registrationCountryLabel}</Text>
              </View>
              <Pressable
                onPress={() => setRegistrationExpanded((v) => !v)}
                style={styles.registrationToggle}
                accessibilityRole="button"
              >
                <Text style={styles.registrationToggleText}>
                  {registrationExpanded
                    ? t('vehicles.detail.hideRegistrationEditor')
                    : regFirstIso || regCountryIso
                      ? t('vehicles.detail.editRegistration')
                      : t('vehicles.detail.addRegistrationOptional')}
                </Text>
                <MaterialCommunityIcons
                  name={registrationExpanded ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={COLORS.PRIMARY}
                />
              </Pressable>
            </FloatingCard>
          )}

          {registrationExpanded ? (
            <FloatingCard style={{ marginTop: 10 }}>
              <VehicleRegistrationIdentityBlock
                firstRegistrationIso={regFirstIso}
                onChangeFirstRegistrationIso={setRegFirstIso}
                registrationCountryIso={regCountryIso}
                onChangeRegistrationCountryIso={setRegCountryIso}
                countriesState={countriesState}
                onRetryCountries={reloadCountries}
                lockFirstRegistrationDate={!!String(regFirstIso || '').trim()}
              />
            </FloatingCard>
          ) : null}

          <Text style={styles.sectionLead}>{t('vehicles.detail.technicalEditLead')}</Text>

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

          <Text style={styles.optionalIntro}>{t('vehicles.detail.technicalSectionsCollapsed')}</Text>
          <VehicleCollapsibleFormSections
            expanded={expandedOptional}
            onToggle={toggleOptional}
            strings={optionalStrings}
            onChangeString={changeOptionalString}
            bools={optionalBools}
            onChangeBool={changeOptionalBool}
            choicesMap={mergedVehicleChoices}
            groups={relevantOptionalGroups}
          />

          <FloatingCard style={styles.mileageEvidenceCard}>
            <Pressable
              onPress={() => setMileageSheetVisible(true)}
              accessibilityRole="button"
              style={styles.mileageEvidenceHeader}
            >
              <Text style={styles.cardTitle}>{t('vehicles.detail.mileageEvidence')}</Text>
              <MaterialCommunityIcons name="chevron-right" size={22} color={COLORS.PRIMARY} />
            </Pressable>
            <MileageEvidenceCard
              mileageConfidence={mileageConfidence}
              compact
              helperText={t('mileageConfidence.tapRowHint')}
              interactive
              onFactorPress={openFromMileageIntent}
            />
          </FloatingCard>
        </KeyboardAwareScrollView>
        <View style={[styles.bottomActionBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          <View style={styles.bottomActionRow}>
            <Button
              mode="outlined"
              onPress={goBackToVehicleDetail}
              disabled={saving}
              style={styles.cancelButton}
              labelStyle={styles.cancelButtonLabel}
            >
              {t('common.cancel')}
            </Button>
            <Button
              mode="contained"
              onPress={handleSave}
              loading={saving}
              disabled={saving}
              style={styles.saveButton}
              contentStyle={styles.saveButtonContent}
            >
              {t('vehicles.detail.saveChanges')}
            </Button>
          </View>
        </View>

        <MileageConfidenceSheet
          visible={mileageSheetVisible}
          onDismiss={() => setMileageSheetVisible(false)}
          mileageConfidence={mileageConfidence}
          onFactorPress={(factor) => {
            setMileageSheetVisible(false);
            openFromMileageIntent(factor);
          }}
          bottomInset={insets.bottom}
        />

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
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.TEXT_MUTED,
    marginBottom: 4,
  },
  helperMuted: {
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
    lineHeight: 18,
  },
  identityValue: { color: COLORS.TEXT_DARK, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
  pickerContainer: {
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.12)',
    borderRadius: 8,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  picker: {
    width: '100%',
  },
  registrationToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingVertical: 6,
  },
  registrationToggleText: {
    color: COLORS.PRIMARY,
    fontWeight: '600',
    fontSize: 14,
  },
  mileageEvidenceCard: {
    marginTop: 2,
  },
  mileageEvidenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
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

