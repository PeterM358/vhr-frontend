import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Alert,
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
import { Picker } from '@react-native-picker/picker';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import {
  createVehicle,
  getMakes,
  getVehicleTypes,
  getVehicleChoices,
  getVehicleFieldGroups,
  getCatalogEbikeSystems,
  getCatalogTrailerTypes,
} from '../api/vehicles';
import { stackContentPaddingTop } from '../navigation/stackContentInset';
import FloatingCard from '../components/ui/FloatingCard';
import { COLORS } from '../constants/colors';
import VehicleCollapsibleFormSections from '../components/vehicle/VehicleCollapsibleFormSections';
import VehicleCatalogIdentityBlock from '../components/vehicle/VehicleCatalogIdentityBlock';
import VehicleCatalogEbikeTrailerSection from '../components/vehicle/VehicleCatalogEbikeTrailerSection';
import { useVehicleCatalogLists } from '../components/vehicle/useVehicleCatalogLists';
import { applyVehicleCatalogFieldsToPayload } from '../components/vehicle/vehicleIdentityPayload';
import {
  VEHICLE_OPTIONAL_GROUPS,
  vehicleToFormStrings,
  vehicleToFormBools,
  buildOptionalVehiclePayload,
  getRelevantVehicleFieldGroups,
  resolveRelevantVehicleFieldGroups,
} from '../components/vehicle/vehicleFormConfig';

export default function CreateVehicleScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();

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

  const [catalogEbikeSystems, setCatalogEbikeSystems] = useState([]);
  const [catalogTrailerTypes, setCatalogTrailerTypes] = useState([]);
  const [selectedCatalogEbike, setSelectedCatalogEbike] = useState('');
  const [selectedCatalogTrailer, setSelectedCatalogTrailer] = useState('');
  const [expandedEbikeTrailer, setExpandedEbikeTrailer] = useState(false);
  const [poweredEquipmentEnabled, setPoweredEquipmentEnabled] = useState(false);

  const [vehicleChoices, setVehicleChoices] = useState({});
  const [backendFieldGroups, setBackendFieldGroups] = useState([]);

  const [year, setYear] = useState('');
  const [kilometers, setKilometers] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [vin, setVin] = useState('');

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
  } = useVehicleCatalogLists({
    manualMode,
    selectedVehicleType,
    catalogBrand,
    catalogModel,
    catalogGeneration,
    selectedMake,
  });

  const onCatalogBrandChange = (v) => {
    setCatalogBrand(v);
    setCatalogModel('');
    setCatalogGeneration('');
    setCatalogEngine('');
    setCatalogTrim('');
  };

  const onCatalogModelChange = (v) => {
    setCatalogModel(v);
    setCatalogGeneration('');
    setCatalogEngine('');
    setCatalogTrim('');
  };

  const onCatalogGenerationChange = (v) => {
    setCatalogGeneration(v);
    setCatalogEngine('');
    setCatalogTrim('');
  };

  const onLegacyMakeChange = (v) => {
    setSelectedMake(v);
    setSelectedModelLegacy('');
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [makesData, typesData, choices, ebike, trailers] = await Promise.all([
          getMakes(),
          getVehicleTypes(),
          getVehicleChoices(),
          getCatalogEbikeSystems(),
          getCatalogTrailerTypes(),
        ]);
        setMakes(makesData);
        setVehicleTypes(typesData);
        setVehicleChoices(choices && typeof choices === 'object' ? choices : {});
        setCatalogEbikeSystems(ebike);
        setCatalogTrailerTypes(trailers);
        setSelectedVehicleType('');
      } catch (err) {
        console.error(err);
        setDialogMessage('Error loading vehicle data');
        setDialogVisible(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const setManualModeWrapped = (next) => {
    setManualMode(next);
    if (next) {
      setCatalogBrand('');
      setCatalogModel('');
      setCatalogGeneration('');
      setCatalogEngine('');
      setCatalogTrim('');
    } else {
      setSelectedMake('');
      setSelectedModelLegacy('');
    }
  };

  const handleSave = async () => {
    const y = parseInt(String(year).trim(), 10);
    if (!Number.isFinite(y) || y < 1900 || y > 2100) {
      Alert.alert('Validation', 'Enter a valid year.');
      return;
    }

    if (manualMode) {
      if (!selectedMake || !selectedModelLegacy) {
        Alert.alert('Validation', 'Choose make and model, or switch to catalog selection.');
        return;
      }
    } else if (!catalogBrand || !catalogModel) {
      Alert.alert('Validation', 'Choose a catalog brand and model, or use manual entry.');
      return;
    }

    const kmRaw = String(kilometers ?? '').trim();
    let km = 0;
    if (kmRaw) {
      const kn = Number(kmRaw);
      if (!Number.isFinite(kn) || kn < 0 || Math.round(kn) !== kn) {
        Alert.alert('Validation', 'Kilometers must be a whole number.');
        return;
      }
      km = kn;
    }

    const built = buildOptionalVehiclePayload(optionalStrings, optionalBools);
    if (built.error) {
      Alert.alert('Validation', built.error);
      return;
    }

    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const payload = {
        year: y,
        kilometers: km,
        ...built.payload,
      };

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
        selectedModelLegacy,
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

      setDialogMessage('Vehicle created!');
      setDialogVisible(true);

      setTimeout(() => {
        setDialogVisible(false);
        navigation.goBack();
      }, 1500);
    } catch (err) {
      console.error(err);
      setDialogMessage(err.message || 'Submission failed');
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
    return resolveRelevantVehicleFieldGroups(backendFieldGroups, local);
  }, [
    selectedVehicleTypeCode,
    optionalStrings,
    optionalBools,
    poweredEquipmentEnabled,
    backendFieldGroups,
  ]);

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
        <KeyboardAwareScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            styles.container,
            {
              paddingTop: stackContentPaddingTop(insets, 8),
              paddingBottom: Math.max(insets.bottom, 16) + 80,
            },
          ]}
          keyboardShouldPersistTaps="always"
          enableOnAndroid
          extraScrollHeight={20}
        >
          <FloatingCard>
            <Text style={styles.cardTitle}>Basic information</Text>
            <Text style={styles.hint}>Required fields are marked *</Text>

            {hasVehicleTypePicker ? (
              <>
                <Text style={styles.label}>Vehicle type</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={selectedVehicleType}
                    onValueChange={setSelectedVehicleType}
                    style={styles.picker}
                  >
                    <Picker.Item label="Not specified" value="" />
                    {vehicleTypes.map((vt) => (
                      <Picker.Item key={vt.id} label={vt.name} value={vt.id.toString()} />
                    ))}
                  </Picker>
                </View>
              </>
            ) : (
              <Text style={styles.hintMuted}>Vehicle type can be set later when available.</Text>
            )}

            <Text style={styles.label}>License plate</Text>
            <TextInput
              mode="outlined"
              value={licensePlate}
              onChangeText={setLicensePlate}
              placeholder="e.g. CA1234AB"
              style={styles.input}
            />

            <Text style={styles.label}>VIN</Text>
            <TextInput
              mode="outlined"
              value={vin}
              onChangeText={setVin}
              placeholder={vinHint}
              style={styles.input}
            />
            <Text style={styles.microHint}>{vinHint}</Text>

            <Text style={[styles.label, { marginTop: 16 }]}>Year *</Text>
            <TextInput
              mode="outlined"
              value={year}
              onChangeText={setYear}
              placeholder="e.g. 2016"
              keyboardType="number-pad"
              style={styles.input}
            />

            <Text style={styles.label}>Kilometers</Text>
            <TextInput
              mode="outlined"
              value={kilometers}
              onChangeText={setKilometers}
              placeholder="e.g. 95000"
              keyboardType="number-pad"
              style={styles.input}
            />

            <Text style={[styles.subheading, { marginTop: 8 }]}>Make & model</Text>
            <Text style={styles.hintMuted}>
              Use the catalog when available; switch to manual entry if your vehicle is not listed.
            </Text>

            <VehicleCatalogIdentityBlock
              manualMode={manualMode}
              onManualModeChange={setManualModeWrapped}
              catalogBrands={catalogBrands}
              catalogModels={catalogModels}
              catalogGenerations={catalogGenerations}
              catalogEngines={catalogEngines}
              catalogTrims={catalogTrims}
              selectedCatalogBrand={catalogBrand}
              onCatalogBrandChange={onCatalogBrandChange}
              selectedCatalogModel={catalogModel}
              onCatalogModelChange={onCatalogModelChange}
              selectedCatalogGeneration={catalogGeneration}
              onCatalogGenerationChange={onCatalogGenerationChange}
              selectedCatalogEngine={catalogEngine}
              onCatalogEngineChange={setCatalogEngine}
              selectedCatalogTrim={catalogTrim}
              onCatalogTrimChange={setCatalogTrim}
              makes={makes}
              models={legacyModels}
              selectedMake={selectedMake}
              onMakeChange={onLegacyMakeChange}
              selectedModelLegacy={selectedModelLegacy}
              onModelLegacyChange={setSelectedModelLegacy}
              manualGenerationText={optionalStrings.generation ?? ''}
              onManualGenerationTextChange={(t) => changeOptionalString('generation', t)}
              manualEngineCodeText={optionalStrings.engine_code ?? ''}
              onManualEngineCodeTextChange={(t) => changeOptionalString('engine_code', t)}
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

          <Text style={styles.optionalIntro}>Optional details (collapsed)</Text>
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
            choicesMap={vehicleChoices}
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
