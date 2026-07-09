import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenBackground from '../components/ScreenBackground';
import {
  Text,
  TextInput,
  Button,
  ActivityIndicator,
  Switch,
  Portal,
  Dialog,
} from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { getCountries } from '../api/profiles';
import {
  createVehicle,
  getMakes,
  getVehicleTypes,
  getVehicleChoices,
  getVehicleFieldGroups,
  getCatalogEbikeSystems,
  getCatalogTrailerTypes,
} from '../api/vehicles';
import AppNavigationBar from '../components/common/AppNavigationBar';
import { useScrollShadow } from '../hooks/useScrollShadow';
import { useVehicleListBack } from '../navigation/appNavBarBack';
import FloatingCard from '../components/ui/FloatingCard';
import { COLORS } from '../constants/colors';
import VehicleCollapsibleFormSections from '../components/vehicle/VehicleCollapsibleFormSections';
import VehicleCreateCatalogStep from '../components/vehicle/VehicleCreateCatalogStep';
import VehicleManualModelStep from '../components/vehicle/VehicleManualModelStep';
import VehicleCatalogEbikeTrailerSection from '../components/vehicle/VehicleCatalogEbikeTrailerSection';
import VehicleRegistrationIdentityBlock from '../components/vehicle/VehicleRegistrationIdentityBlock';
import VehicleSpecSuggestionCard from '../components/vehicle/VehicleSpecSuggestionCard';
import MonthYearPicker from '../components/vehicle/MonthYearPicker';
import { useVehicleCatalogLists } from '../components/vehicle/useVehicleCatalogLists';
import {
  useVehicleMaintenanceSpec,
  maintenanceSpecToFormStrings,
  enginesForFuel,
} from '../components/vehicle/useVehicleMaintenanceSpec';
import { applyVehicleCatalogFieldsToPayload } from '../components/vehicle/vehicleIdentityPayload';
import { resolveLegacyModelId } from '../components/vehicle/resolveLegacyModel';
import { useTranslation } from '../i18n';
import { showMessage } from '../utils/crossPlatformAlert';
import {
  VEHICLE_OPTIONAL_GROUPS,
  vehicleToFormStrings,
  vehicleToFormBools,
  buildOptionalVehiclePayload,
  getRelevantVehicleFieldGroups,
  resolveRelevantVehicleFieldGroups,
} from '../components/vehicle/vehicleFormConfig';

export default function CreateVehicleScreen({ navigation, route }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { scrolled, onScroll, scrollEventThrottle } = useScrollShadow();
  const handleBack = useVehicleListBack(navigation);

  const clientEmail = route?.params?.clientEmail || null;
  const clientPhone = route?.params?.clientPhone || null;

  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [makes, setMakes] = useState([]);

  const [selectedVehicleType, setSelectedVehicleType] = useState('');
  const [manualMode, setManualMode] = useState(false);

  const [catalogBrand, setCatalogBrand] = useState('');
  const [catalogModel, setCatalogModel] = useState('');
  const [catalogGeneration, setCatalogGeneration] = useState('');
  const [catalogEngine, setCatalogEngine] = useState('');
  const [catalogTrim, setCatalogTrim] = useState('');

  const [selectedMake, setSelectedMake] = useState('');
  const [selectedModelLegacy, setSelectedModelLegacy] = useState('');
  const [selectedModelKey, setSelectedModelKey] = useState('');
  const [manualModelText, setManualModelText] = useState('');
  const [manualBrandLocked, setManualBrandLocked] = useState(false);

  const [catalogEbikeSystems, setCatalogEbikeSystems] = useState([]);
  const [catalogTrailerTypes, setCatalogTrailerTypes] = useState([]);
  const [selectedCatalogEbike, setSelectedCatalogEbike] = useState('');
  const [selectedCatalogTrailer, setSelectedCatalogTrailer] = useState('');
  const [expandedEbikeTrailer, setExpandedEbikeTrailer] = useState(false);
  const [poweredEquipmentEnabled, setPoweredEquipmentEnabled] = useState(false);

  const [vehicleChoices, setVehicleChoices] = useState({});
  const [countriesState, setCountriesState] = useState({
    status: 'loading',
    rows: [],
    error: '',
  });
  const [backendFieldGroups, setBackendFieldGroups] = useState([]);

  const [firstRegIso, setFirstRegIso] = useState('');
  const [regCountryIso, setRegCountryIso] = useState('');
  const [kilometers, setKilometers] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [vin, setVin] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [specApplied, setSpecApplied] = useState(false);

  const [optionalStrings, setOptionalStrings] = useState(() => vehicleToFormStrings({}));
  const [optionalBools, setOptionalBools] = useState(() => vehicleToFormBools({}));

  const [expandedOptional, setExpandedOptional] = useState(() => {
    const init = {};
    VEHICLE_OPTIONAL_GROUPS.forEach((g) => {
      init[g.key] = false;
    });
    return init;
  });

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogMessage, setDialogMessage] = useState('');

  const toggleOptional = (key) => {
    setExpandedOptional((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const changeOptionalString = (key, value) => {
    setOptionalStrings((prev) => ({ ...prev, [key]: value }));
  };

  const changeOptionalBool = (key, value) => {
    setOptionalBools((prev) => ({ ...prev, [key]: value }));
  };

  const hasVehicleTypePicker = vehicleTypes.length > 0;

  const {
    catalogBrands,
    catalogModels,
    catalogGenerations,
    catalogEngines,
    catalogTrims,
    legacyModels,
    legacyMakeId,
  } = useVehicleCatalogLists({
    manualMode,
    selectedVehicleType,
    catalogBrand,
    catalogModel,
    catalogGeneration,
    selectedMake,
    makes,
  });

  const onCatalogBrandChange = (v) => {
    setCatalogBrand(v);
    setCatalogModel('');
    setCatalogGeneration('');
    setCatalogEngine('');
    setCatalogTrim('');
    setSelectedModelKey('');
    setSelectedModelLegacy('');
    setSelectedMake('');
  };

  const onMergedModelChange = (key) => {
    setSelectedModelKey(key);
    setCatalogGeneration('');
    setCatalogEngine('');
    setCatalogTrim('');
    setSpecApplied(false);
    if (!key) {
      setCatalogModel('');
      setSelectedModelLegacy('');
      setSelectedMake('');
      return;
    }
    if (String(key).startsWith('catalog:')) {
      setCatalogModel(String(key).slice('catalog:'.length));
      setSelectedModelLegacy('');
      setSelectedMake('');
      setSelectedYear('');
      return;
    }
    if (String(key).startsWith('legacy:')) {
      setCatalogModel('');
      setSelectedModelLegacy(String(key).slice('legacy:'.length));
      if (legacyMakeId) setSelectedMake(legacyMakeId);
      setSelectedYear('');
    }
  };

  const onCatalogGenerationChange = (v) => {
    setCatalogGeneration(v);
    setCatalogEngine('');
    setCatalogTrim('');
  };

  const reloadCountries = useCallback(async () => {
    setCountriesState((prev) => ({ ...prev, status: 'loading', error: '' }));
    try {
      const raw = await getCountries();
      const list = Array.isArray(raw) ? raw : [];
      setCountriesState({ status: 'success', rows: list, error: '' });
    } catch (e) {
      const msg = e && typeof e.message === 'string' ? e.message : '';
      if (__DEV__) console.warn('[CreateVehicle] getCountries failed', msg);
      setCountriesState({ status: 'error', rows: [], error: 'Could not load countries.' });
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        setCountriesState({ status: 'loading', rows: [], error: '' });
        const [makesData, typesData, choices, ebike, trailers] = await Promise.all([
          getMakes(),
          getVehicleTypes(),
          getVehicleChoices(),
          getCatalogEbikeSystems(),
          getCatalogTrailerTypes(),
        ]);
        try {
          const rawCountries = await getCountries();
          const list = Array.isArray(rawCountries) ? rawCountries : [];
          setCountriesState({ status: 'success', rows: list, error: '' });
        } catch (ce) {
          const msg = ce && typeof ce.message === 'string' ? ce.message : '';
          if (__DEV__) console.warn('[CreateVehicle] getCountries failed', msg);
          setCountriesState({ status: 'error', rows: [], error: t('createVehicle.errors.loadCountriesError') });
        }
        setMakes(makesData);
        setVehicleTypes(typesData);
        setVehicleChoices(choices && typeof choices === 'object' ? choices : {});
        setCatalogEbikeSystems(ebike);
        setCatalogTrailerTypes(trailers);
        setSelectedVehicleType('');
      } catch (err) {
        console.error(err);
        setDialogMessage(t('createVehicle.errors.loadDataError'));
        setDialogVisible(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const setManualModeWrapped = (next) => {
    setManualMode(next);
    setSpecApplied(false);
    if (next) {
      setCatalogModel('');
      setCatalogGeneration('');
      setCatalogEngine('');
      setCatalogTrim('');
      setSelectedModelKey('');
      setSelectedModelLegacy('');
      setManualModelText('');
    } else {
      setSelectedMake('');
      setSelectedModelLegacy('');
      setSelectedModelKey('');
      setManualModelText('');
      setManualBrandLocked(false);
    }
  };

  const onLegacyMakeChange = (v) => {
    setSelectedMake(v);
    setSelectedModelLegacy('');
    setManualModelText('');
  };

  const selectedCatalogBrandName = useMemo(() => {
    const brand = catalogBrands.find((b) => String(b.id) === String(catalogBrand));
    return brand?.name || '';
  }, [catalogBrands, catalogBrand]);

  const selectedEngineRow = useMemo(
    () => catalogEngines.find((row) => String(row.id) === String(catalogEngine)),
    [catalogEngines, catalogEngine]
  );

  const { loading: specLoading, found: specFound, spec } = useVehicleMaintenanceSpec({
    vehicleTypeId: selectedVehicleType,
    catalogBrand,
    catalogModel,
    catalogGeneration,
    catalogEngine,
    year: selectedYear,
    fuelType: optionalStrings.fuel_type,
    engineCode: selectedEngineRow?.engine_code || optionalStrings.engine_code,
  });

  useEffect(() => {
    if (!optionalStrings.fuel_type || manualMode) return;
    const matches = enginesForFuel(catalogEngines, optionalStrings.fuel_type);
    if (matches.length === 1 && String(matches[0].id) !== String(catalogEngine)) {
      setCatalogEngine(String(matches[0].id));
    }
  }, [optionalStrings.fuel_type, catalogEngines, catalogEngine, manualMode]);

  const applySuggestedSpecs = () => {
    const mapped = maintenanceSpecToFormStrings(spec);
    setOptionalStrings((prev) => ({ ...prev, ...mapped }));
    setSpecApplied(true);
  };

  const openManualFromCatalog = () => {
    if (hasVehicleTypePicker && !selectedVehicleType) {
      showMessage(t('common.validation'), t('createVehicle.errors.selectTypeFirst'), { variant: 'error' });
      return;
    }
    if (!catalogBrand) {
      showMessage(t('common.validation'), t('createVehicle.errors.selectBrandFirst'), { variant: 'error' });
      return;
    }
    const brand = catalogBrands.find((b) => String(b.id) === String(catalogBrand));
    const match =
      brand && makes?.length
        ? makes.find(
            (m) => String(m.name || '').toLowerCase() === String(brand.name || '').toLowerCase()
          )
        : null;
    setManualBrandLocked(Boolean(match));
    setSelectedMake(match ? String(match.id) : legacyMakeId || '');
    setSelectedModelLegacy('');
    setSelectedModelKey('');
    setManualModelText('');
    setManualMode(true);
    setSpecApplied(false);
    setCatalogModel('');
    setCatalogGeneration('');
    setCatalogEngine('');
    setCatalogTrim('');
  };

  const handleSave = async () => {
    let resolvedModelLegacy = selectedModelLegacy;
    if (manualMode) {
      if (!selectedMake) {
        showMessage(t('common.validation'), t('createVehicle.errors.chooseMakeBrand'), { variant: 'error' });
        return;
      }
      const modelText = String(manualModelText ?? '').trim();
      if (!modelText) {
        showMessage(t('common.validation'), t('createVehicle.errors.enterModel'), { variant: 'error' });
        return;
      }
      resolvedModelLegacy = resolveLegacyModelId(legacyModels, modelText);
      if (!resolvedModelLegacy) {
        showMessage(
          t('createVehicle.errors.modelNotRecognizedTitle'),
          t('createVehicle.errors.modelNotRecognizedBody'),
          { variant: 'error' }
        );
        return;
      }
      if (!selectedYear) {
        showMessage(t('common.validation'), t('createVehicle.errors.chooseYear'), { variant: 'error' });
        return;
      }
      if (!optionalStrings.fuel_type) {
        showMessage(t('common.validation'), t('createVehicle.errors.chooseFuelType'), { variant: 'error' });
        return;
      }
    } else if (!catalogBrand || (!catalogModel && !selectedModelLegacy)) {
      showMessage(t('common.validation'), t('createVehicle.errors.chooseCatalogOrManual'), { variant: 'error' });
      return;
    } else if (!selectedYear) {
      showMessage(t('common.validation'), t('createVehicle.errors.chooseYear'), { variant: 'error' });
      return;
    } else if (!optionalStrings.fuel_type) {
      showMessage(t('common.validation'), t('createVehicle.errors.chooseFuelType'), { variant: 'error' });
      return;
    }

    const kmRaw = String(kilometers ?? '').trim();
    let km = 0;
    if (kmRaw) {
      const kn = Number(kmRaw);
      if (!Number.isFinite(kn) || kn < 0 || Math.round(kn) !== kn) {
        showMessage(t('common.validation'), t('createVehicle.errors.kilometersWholeNumber'), { variant: 'error' });
        return;
      }
      km = kn;
    }

    const built = buildOptionalVehiclePayload(optionalStrings, optionalBools);
    if (built.error) {
      showMessage(t('common.validation'), built.error, { variant: 'error' });
      return;
    }

    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const payload = {
        kilometers: km,
        ...built.payload,
      };

      const fr = String(firstRegIso ?? '').trim();
      if (fr) payload.first_registration_date = fr;
      const rc = String(regCountryIso ?? '').trim().toUpperCase();
      if (rc) payload.registration_country = rc;

      const plate = String(licensePlate ?? '').trim();
      if (plate) payload.license_plate = plate;
      const vinVal = String(vin ?? '').trim();
      if (vinVal) payload.vin = vinVal;

      if (hasVehicleTypePicker && selectedVehicleType) {
        payload.vehicle_type = parseInt(selectedVehicleType, 10);
      }

      applyVehicleCatalogFieldsToPayload(payload, {
        manualMode,
        selectedMake,
        selectedModelLegacy: resolvedModelLegacy,
        catalogBrand,
        catalogModel,
        catalogGeneration,
        catalogEngine,
        catalogTrim,
        catalogEbike: selectedCatalogEbike,
        catalogTrailer: selectedCatalogTrailer,
      });

      await createVehicle(token, {
        ...payload,
        client_email: clientEmail || '',
        client_phone: clientPhone || '',
      });

      setDialogMessage(t('createVehicle.errors.createdSuccess'));
      setDialogVisible(true);

      setTimeout(() => {
        setDialogVisible(false);
        navigation.goBack();
      }, 1500);
    } catch (err) {
      console.error(err);
      setDialogMessage(err.message || t('createVehicle.errors.submitFailed'));
      setDialogVisible(true);
    } finally {
      setSaving(false);
    }
  };

  const vinHint = useMemo(
    () => 'Add VIN for better parts and service matching.',
    []
  );

  const selectedVehicleTypeCode = useMemo(() => {
    if (!selectedVehicleType) return '';
    const row = vehicleTypes.find((vt) => String(vt.id) === String(selectedVehicleType));
    return row?.code || '';
  }, [vehicleTypes, selectedVehicleType]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await getVehicleFieldGroups(selectedVehicleTypeCode || undefined);
        if (!cancelled) setBackendFieldGroups(Array.isArray(rows) ? rows : []);
      } catch (_e) {
        if (!cancelled) setBackendFieldGroups([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedVehicleTypeCode]);

  const relevantOptionalGroups = useMemo(() => {
    const local = getRelevantVehicleFieldGroups(selectedVehicleTypeCode, {
        ...optionalStrings,
        ...optionalBools,
        powered_equipment_enabled: poweredEquipmentEnabled,
      });
    const resolved = resolveRelevantVehicleFieldGroups(backendFieldGroups, local);
    return resolved
      .filter((group) => group.key !== 'odometer')
      .map((group) => {
        if (group.key !== 'technical') return group;
        return {
          ...group,
          fields: (group.fields || []).filter((field) => field.key !== 'fuel_type'),
        };
      });
  }, [
    selectedVehicleTypeCode,
    optionalStrings,
    optionalBools,
    poweredEquipmentEnabled,
    backendFieldGroups,
  ]);

  const mergedVehicleChoices = useMemo(() => {
    return vehicleChoices && typeof vehicleChoices === 'object' ? { ...vehicleChoices } : {};
  }, [vehicleChoices]);

  const showTrailerPoweredEquipmentToggle = useMemo(
    () =>
      String(selectedVehicleTypeCode || '').toLowerCase() === 'trailer' &&
      !relevantOptionalGroups.some((g) => g.key === 'technical'),
    [selectedVehicleTypeCode, relevantOptionalGroups]
  );

  const showEbikeCatalogSection = useMemo(() => {
    const code = String(selectedVehicleTypeCode || '').toLowerCase();
    if (code === 'bicycle' || code === 'ebike' || code === 'e-bike') return true;
    return Boolean(selectedCatalogEbike || optionalStrings.ebike_system || optionalStrings.motor_brand || optionalStrings.motor_model);
  }, [selectedVehicleTypeCode, selectedCatalogEbike, optionalStrings]);

  const showTrailerCatalogSection = useMemo(() => {
    const code = String(selectedVehicleTypeCode || '').toLowerCase();
    if (code === 'trailer') return true;
    return Boolean(selectedCatalogTrailer || optionalStrings.trailer_type || optionalBools.braked_trailer);
  }, [selectedVehicleTypeCode, selectedCatalogTrailer, optionalStrings, optionalBools]);

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
      <View style={{ flex: 1 }}>
        <AppNavigationBar
          title={t('createVehicle.title')}
          backLabel={t('vehicles.backToVehicles')}
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
              paddingBottom: Math.max(insets.bottom, 16) + 80,
            },
          ]}
          keyboardShouldPersistTaps="always"
          enableOnAndroid
          extraScrollHeight={20}
        >
          <FloatingCard>
            <Text style={styles.cardTitle}>Your vehicle</Text>
            {!manualMode ? (
              <VehicleCreateCatalogStep
                hasVehicleTypePicker={hasVehicleTypePicker}
                vehicleTypes={vehicleTypes}
                selectedVehicleType={selectedVehicleType}
                onVehicleTypeChange={setSelectedVehicleType}
                catalogBrands={catalogBrands}
                catalogModels={catalogModels}
                legacyModels={legacyModels}
                catalogGenerations={catalogGenerations}
                catalogEngines={catalogEngines}
                catalogBrand={catalogBrand}
                onCatalogBrandChange={onCatalogBrandChange}
                selectedModelKey={selectedModelKey}
                onMergedModelChange={onMergedModelChange}
                selectedYear={selectedYear}
                onSelectedYearChange={setSelectedYear}
                catalogGeneration={catalogGeneration}
                onCatalogGenerationChange={onCatalogGenerationChange}
                catalogEngine={catalogEngine}
                onCatalogEngineChange={setCatalogEngine}
                fuelType={optionalStrings.fuel_type}
                onFuelTypeChange={(v) => {
                  setSpecApplied(false);
                  changeOptionalString('fuel_type', v);
                }}
                licensePlate={licensePlate}
                onLicensePlateChange={setLicensePlate}
                vin={vin}
                onVinChange={setVin}
                vinHint={vinHint}
                onOpenManual={openManualFromCatalog}
              />
            ) : (
              <VehicleManualModelStep
                brandLocked={manualBrandLocked}
                brandName={selectedCatalogBrandName}
                makes={makes}
                selectedMake={selectedMake}
                onMakeChange={onLegacyMakeChange}
                manualModelText={manualModelText}
                onManualModelTextChange={setManualModelText}
                legacyModels={legacyModels}
                selectedYear={selectedYear}
                onSelectedYearChange={setSelectedYear}
                fuelType={optionalStrings.fuel_type}
                onFuelTypeChange={(v) => {
                  setSpecApplied(false);
                  changeOptionalString('fuel_type', v);
                }}
                licensePlate={licensePlate}
                onLicensePlateChange={setLicensePlate}
                vin={vin}
                onVinChange={setVin}
                vinHint={vinHint}
                onBackToCatalog={() => setManualModeWrapped(false)}
              />
            )}
          </FloatingCard>

          {!manualMode ? (
            <VehicleSpecSuggestionCard
              loading={specLoading}
              found={specFound}
              spec={spec}
              applied={specApplied}
              onApply={applySuggestedSpecs}
            />
          ) : null}

          <FloatingCard>
            <Text style={styles.cardTitle}>{t('createVehicle.registrationMileage')}</Text>

            <MonthYearPicker
              valueIso={firstRegIso}
              onChangeIso={setFirstRegIso}
              label={t('createVehicle.firstRegistrationOptional')}
            />

            <VehicleRegistrationIdentityBlock
              firstRegistrationIso={firstRegIso}
              onChangeFirstRegistrationIso={setFirstRegIso}
              registrationCountryIso={regCountryIso}
              onChangeRegistrationCountryIso={setRegCountryIso}
              countriesState={countriesState}
              onRetryCountries={reloadCountries}
              hideTitle
              hideHint
              countryOnly
            />

            <Text style={styles.label}>{t('createVehicle.kilometers')}</Text>
            <TextInput
              mode="outlined"
              value={kilometers}
              onChangeText={setKilometers}
              placeholder="e.g. 95000"
              keyboardType="number-pad"
              style={styles.input}
            />
          </FloatingCard>

          {showEbikeCatalogSection || showTrailerCatalogSection ? (
            <VehicleCatalogEbikeTrailerSection
              expanded={expandedEbikeTrailer}
              onToggle={() => setExpandedEbikeTrailer((v) => !v)}
              ebikeSystems={showEbikeCatalogSection ? catalogEbikeSystems : []}
              trailerTypes={showTrailerCatalogSection ? catalogTrailerTypes : []}
              selectedEbikeSystem={selectedCatalogEbike}
              onEbikeSystemChange={setSelectedCatalogEbike}
              selectedTrailerType={selectedCatalogTrailer}
              onTrailerTypeChange={setSelectedCatalogTrailer}
            />
          ) : null}

          <Text style={styles.optionalIntro}>Advanced details (optional)</Text>
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

          <Button mode="contained" onPress={handleSave} style={styles.saveBtn}>
            Save vehicle
          </Button>

          {saving ? <ActivityIndicator animating size="small" style={{ marginTop: 8 }} /> : null}
        </KeyboardAwareScrollView>

        <Portal>
          <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
            <Dialog.Title>Notice</Dialog.Title>
            <Dialog.Content>
              <Text>{dialogMessage}</Text>
            </Dialog.Content>
            <Dialog.Actions>
              <Button mode="text" onPress={() => setDialogVisible(false)}>OK</Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    paddingHorizontal: 16,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
    marginBottom: 6,
  },
  subheading: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
  },
  hint: {
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
    marginBottom: 10,
  },
  hintMuted: {
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  optionalIntro: {
    marginTop: 8,
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  label: {
    marginTop: 12,
    marginBottom: 4,
    fontWeight: '600',
    color: COLORS.TEXT_DARK,
  },
  microHint: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
    marginTop: -4,
    marginBottom: 4,
  },
  input: {
    marginBottom: 4,
    backgroundColor: '#fff',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.12)',
    borderRadius: 8,
    marginBottom: 4,
    backgroundColor: '#fff',
  },
  picker: {
    width: '100%',
  },
  saveBtn: {
    marginVertical: 20,
  },
  toggleRow: {
    marginTop: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleLabel: {
    color: COLORS.TEXT_DARK,
    fontWeight: '600',
    fontSize: 14,
  },
});
