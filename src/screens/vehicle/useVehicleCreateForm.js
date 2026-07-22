// PATH: src/screens/vehicle/useVehicleCreateForm.js
//
// Shared vehicle-creation form state + logic, extracted from the original
// single-screen CreateVehicleScreen so it can drive the Wizard Engine while
// remaining reusable across contexts (customer self-add, shop-for-client, and
// future ERP import). All validation + payload assembly rules are preserved
// verbatim from the pre-wizard screen so vehicle creation behaves identically.
//
// The hook returns:
//   - every field / setter / derived value the step UIs need
//   - validateIdentity()  -> { ok, message }  (make/brand, model, year, fuel)
//   - validateDetails()   -> { ok, message }  (kilometers + optional groups)
//   - submit()            -> created vehicle | throws Error(message)
//
// It is context-agnostic: pass `clientEmail` / `clientPhone` for the shop flow.

import { useState, useEffect, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getCountries } from '../../api/profiles';
import {
  createVehicle,
  getMakes,
  getVehicleTypes,
  getVehicleChoices,
  getVehicleFieldGroups,
  getCatalogEbikeSystems,
  getCatalogTrailerTypes,
} from '../../api/vehicles';
import { useVehicleCatalogLists } from '../../components/vehicle/useVehicleCatalogLists';
import {
  useVehicleMaintenanceSpec,
  maintenanceSpecToFormStrings,
  enginesForFuel,
} from '../../components/vehicle/useVehicleMaintenanceSpec';
import { applyVehicleCatalogFieldsToPayload } from '../../components/vehicle/vehicleIdentityPayload';
import { resolveLegacyModelId } from '../../components/vehicle/resolveLegacyModel';
import { useTranslation } from '../../i18n';
import { showMessage } from '../../utils/crossPlatformAlert';
import {
  VEHICLE_OPTIONAL_GROUPS,
  vehicleToFormStrings,
  vehicleToFormBools,
  buildOptionalVehiclePayload,
  getRelevantVehicleFieldGroups,
  resolveRelevantVehicleFieldGroups,
} from '../../components/vehicle/vehicleFormConfig';

export function useVehicleCreateForm({ clientEmail = null, clientPhone = null } = {}) {
  const { t } = useTranslation();

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
        showMessage(t('common.validation', null, 'Notice'), t('createVehicle.errors.loadDataError'), {
          variant: 'error',
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const vinHint = useMemo(() => 'Add VIN for better parts and service matching.', []);

  // ---- Validation (identity) — mirrors the pre-wizard handleSave gate ----
  const resolveModelLegacyForSubmit = useCallback(() => {
    if (!manualMode) return selectedModelLegacy;
    const modelText = String(manualModelText ?? '').trim();
    return resolveLegacyModelId(legacyModels, modelText);
  }, [manualMode, manualModelText, legacyModels, selectedModelLegacy]);

  const validateIdentity = useCallback(() => {
    if (manualMode) {
      if (!selectedMake) {
        return { ok: false, message: t('createVehicle.errors.chooseMakeBrand') };
      }
      const modelText = String(manualModelText ?? '').trim();
      if (!modelText) {
        return { ok: false, message: t('createVehicle.errors.enterModel') };
      }
      const resolved = resolveLegacyModelId(legacyModels, modelText);
      if (!resolved) {
        return { ok: false, message: t('createVehicle.errors.modelNotRecognizedBody') };
      }
      if (!selectedYear) {
        return { ok: false, message: t('createVehicle.errors.chooseYear') };
      }
      if (!optionalStrings.fuel_type) {
        return { ok: false, message: t('createVehicle.errors.chooseFuelType') };
      }
      return { ok: true };
    }
    if (!catalogBrand || (!catalogModel && !selectedModelLegacy)) {
      return { ok: false, message: t('createVehicle.errors.chooseCatalogOrManual') };
    }
    if (!selectedYear) {
      return { ok: false, message: t('createVehicle.errors.chooseYear') };
    }
    if (!optionalStrings.fuel_type) {
      return { ok: false, message: t('createVehicle.errors.chooseFuelType') };
    }
    return { ok: true };
  }, [
    manualMode,
    selectedMake,
    manualModelText,
    legacyModels,
    selectedYear,
    optionalStrings.fuel_type,
    catalogBrand,
    catalogModel,
    selectedModelLegacy,
    t,
  ]);

  // ---- Validation (details) — kilometers + optional field groups ----
  const validateDetails = useCallback(() => {
    const kmRaw = String(kilometers ?? '').trim();
    if (kmRaw) {
      const kn = Number(kmRaw);
      if (!Number.isFinite(kn) || kn < 0 || Math.round(kn) !== kn) {
        return { ok: false, message: t('createVehicle.errors.kilometersWholeNumber') };
      }
    }
    const built = buildOptionalVehiclePayload(optionalStrings, optionalBools);
    if (built.error) {
      return { ok: false, message: built.error };
    }
    return { ok: true };
  }, [kilometers, optionalStrings, optionalBools, t]);

  // ---- Submit — single-shot create (identical payload to pre-wizard) ----
  const submit = useCallback(async () => {
    const identity = validateIdentity();
    if (!identity.ok) throw new Error(identity.message);
    const details = validateDetails();
    if (!details.ok) throw new Error(details.message);

    const resolvedModelLegacy = resolveModelLegacyForSubmit();

    const kmRaw = String(kilometers ?? '').trim();
    let km = 0;
    if (kmRaw) km = Number(kmRaw);

    const built = buildOptionalVehiclePayload(optionalStrings, optionalBools);

    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      if (!token) {
        throw new Error(t('createVehicle.errors.submitFailed'));
      }
      const payload = {
        kilometers: km,
        ...built.payload,
      };

      // Prefer explicit first-registration month/year; otherwise seed from the
      // required catalog year so the API retains a registration year (serializer
      // treats `year` as read-only and pops it on create).
      const fr = String(firstRegIso ?? '').trim();
      if (fr) {
        payload.first_registration_date = fr;
      } else if (selectedYear) {
        const y = parseInt(String(selectedYear), 10);
        if (Number.isFinite(y) && y >= 1900) {
          payload.first_registration_date = `${y}-01-01`;
        }
      }
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

      const created = await createVehicle(token, {
        ...payload,
        client_email: clientEmail || '',
        client_phone: clientPhone || '',
      });
      return created;
    } catch (err) {
      console.error(err);
      throw new Error(err?.message || t('createVehicle.errors.submitFailed'));
    } finally {
      setSaving(false);
    }
  }, [
    validateIdentity,
    validateDetails,
    resolveModelLegacyForSubmit,
    kilometers,
    optionalStrings,
    optionalBools,
    firstRegIso,
    selectedYear,
    regCountryIso,
    licensePlate,
    vin,
    hasVehicleTypePicker,
    selectedVehicleType,
    manualMode,
    selectedMake,
    catalogBrand,
    catalogModel,
    catalogGeneration,
    catalogEngine,
    catalogTrim,
    selectedCatalogEbike,
    selectedCatalogTrailer,
    clientEmail,
    clientPhone,
    t,
  ]);

  return {
    // load state
    loading,
    saving,
    // reference data
    vehicleTypes,
    makes,
    hasVehicleTypePicker,
    vehicleChoices: mergedVehicleChoices,
    countriesState,
    reloadCountries,
    // identity fields
    manualMode,
    setManualMode: setManualModeWrapped,
    selectedVehicleType,
    setSelectedVehicleType,
    catalogBrand,
    onCatalogBrandChange,
    catalogModel,
    catalogGeneration,
    onCatalogGenerationChange,
    catalogEngine,
    setCatalogEngine,
    catalogTrim,
    setCatalogTrim,
    selectedMake,
    onLegacyMakeChange,
    selectedModelLegacy,
    selectedModelKey,
    onMergedModelChange,
    manualModelText,
    setManualModelText,
    manualBrandLocked,
    selectedCatalogBrandName,
    // catalog lists
    catalogBrands,
    catalogModels,
    catalogGenerations,
    catalogEngines,
    catalogTrims,
    legacyModels,
    legacyMakeId,
    // ebike / trailer
    catalogEbikeSystems,
    catalogTrailerTypes,
    selectedCatalogEbike,
    setSelectedCatalogEbike,
    selectedCatalogTrailer,
    setSelectedCatalogTrailer,
    expandedEbikeTrailer,
    setExpandedEbikeTrailer,
    poweredEquipmentEnabled,
    setPoweredEquipmentEnabled,
    showEbikeCatalogSection,
    showTrailerCatalogSection,
    showTrailerPoweredEquipmentToggle,
    // registration / mileage
    firstRegIso,
    setFirstRegIso,
    regCountryIso,
    setRegCountryIso,
    kilometers,
    setKilometers,
    licensePlate,
    setLicensePlate,
    vin,
    setVin,
    vinHint,
    selectedYear,
    setSelectedYear,
    // optional field groups
    optionalStrings,
    optionalBools,
    changeOptionalString,
    changeOptionalBool,
    expandedOptional,
    toggleOptional,
    relevantOptionalGroups,
    // spec suggestion
    specLoading,
    specFound,
    spec,
    specApplied,
    applySuggestedSpecs,
    openManualFromCatalog,
    // actions
    validateIdentity,
    validateDetails,
    submit,
  };
}

export default useVehicleCreateForm;
