/**
 * PATH: src/screens/LogServiceRecordScreen.js
 * Completed maintenance/repair work only — not obligations (see AddObligationPaymentScreen).
 * Multi-step flow via WizardEngine (src/wizard) — same pattern as CreateVehicleScreen.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { StyleSheet, View, Alert, Platform } from 'react-native';
import ScreenBackground from '../components/ScreenBackground';
import AppNavigationBar from '../components/common/AppNavigationBar';
import { useVehicleDetailBack } from '../navigation/appNavBarBack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Text,
  Button,
  ActivityIndicator,
  Portal,
  Dialog,
} from 'react-native-paper';

import { API_BASE_URL } from '../api/config';
import { createRepair, requestOwnerLoggedRepairConfirmation } from '../api/repairs';
import { uploadRepairDocuments } from '../api/documents';
import { patchVehicleReminder } from '../api/vehicles';
import {
  buildManualServiceCenterDraft,
  manualDraftHasData,
  workshopSummaryLines,
} from '../utils/manualServiceCenterDraft';
import {
  validateManualServiceCenterInput,
  parseOptionalCoordinate,
  roundCoordinateForApi,
} from '../utils/manualServiceCenter';
import {
  buildLogServiceRecordFormDraft,
  applyLogServiceRecordFormDraft,
} from '../utils/logServiceRecordFormDraft';
import {
  knownWorkshopsFromVehicleRepairs,
} from '../utils/knownVehicleWorkshops';
import * as Location from 'expo-location';
import {
  PROVIDER_PICKER_FILTER_THRESHOLD,
  buildProviderPickerOptions,
  distinctProviderCities,
  filterProviderPickerOptions,
  providerOptionsHaveCoordinates,
} from '../utils/serviceProviderPicker';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { localDateToIso, isSaneServiceIso } from '../components/vehicle/dateFieldUtils';
import {
  DEFAULT_OIL_INTERVAL_KM,
  computeNextOilDueKm,
  computeNextOilDueDateIso,
} from '../utils/oilServiceDefaults';
import {
  filterServiceRecordRepairTypes,
  classifyServiceRecordFormVariant,
  resolveOwnerLoggedRepairMoney,
  findServiceRecordTypeByVariant,
  resolveServiceRecordVariantParam,
} from '../utils/serviceRecordRepairTypes';
import {
  pickOdometerPhotoAttachment,
  pickReceiptOrInvoiceAttachment,
  pickVehiclePhotoAttachment,
} from '../utils/pickDocumentFile';
import { DEFAULT_CURRENCY } from '../constants/currency';
import {
  analyzeFinalizeKilometers,
  hasOdometerPhotoAttachment,
  parseOdometerKm,
} from '../utils/finalizeMileageValidation';
import {
  navigateToVehicleDetail,
  navigateToVehicleServiceRecordCenter,
  navigateToVehicleServiceRecordCenterAdd,
} from '../navigation/webNavigation';
import { useTranslation } from '../i18n';
import {
  saveServiceRecordFormDraft,
  loadServiceRecordFormDraft,
  loadServiceRecordManualCenterDraft,
  clearServiceRecordDrafts,
} from '../utils/serviceRecordDraftStorage';
import { WizardEngine, createMemoryAdapter } from '../wizard';
import {
  ServiceRecordTypeStep,
  ServiceRecordWhenMileageStep,
  ServiceRecordCostsStep,
  ServiceRecordProviderStep,
  ServiceRecordNotesStep,
} from './serviceRecord/ServiceRecordWizardSteps';

async function applyPostCreateReminderPatches({
  token,
  vehicleId,
  vehicle,
  variant,
  patches,
}) {
  const list = Array.isArray(vehicle?.reminders) ? vehicle.reminders : [];
  const findRow = (rt) => list.find((r) => r.reminder_type === rt);

  if (variant === 'oil') {
    const row = findRow('oil_service');
    const body = {};
    if (patches.nextDueKm != null) body.due_kilometers = patches.nextDueKm;
    if (patches.nextOilDueIso) body.due_date = patches.nextOilDueIso;
    if (row?.id && Object.keys(body).length) {
      await patchVehicleReminder(vehicleId, row.id, body, token);
    }
  } else if (variant === 'technical_inspection') {
    const row = findRow('technical_inspection');
    if (row?.id && patches.technicalValidIso) {
      await patchVehicleReminder(vehicleId, row.id, { due_date: patches.technicalValidIso }, token);
    }
  } else if (variant === 'brake_service') {
    const row = findRow('brake_check');
    if (row?.id && patches.brakeNextKm != null) {
      await patchVehicleReminder(vehicleId, row.id, { due_kilometers: patches.brakeNextKm }, token);
    }
  }
}

export default function LogServiceRecordScreen({ navigation, route }) {
  const { t } = useTranslation();
  const vehicleId = route.params?.vehicleId != null ? String(route.params.vehicleId) : '';
  const handleBack = useVehicleDetailBack(navigation, vehicleId);

  const todayIso = useMemo(() => localDateToIso(new Date()), []);

  const [vehicle, setVehicle] = useState(null);
  const [allRepairTypes, setAllRepairTypes] = useState([]);
  const [repairTypeId, setRepairTypeId] = useState('');

  const [completedAtIso, setCompletedAtIso] = useState(() => localDateToIso(new Date()));
  const [finalKilometers, setFinalKilometers] = useState('');
  const [notes, setNotes] = useState('');
  /** null | 'self' | 'authorized' | 'manual' */
  const [providerMode, setProviderMode] = useState(null);
  const [selectedShopProfileId, setSelectedShopProfileId] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [manualAddress, setManualAddress] = useState('');
  const [manualCountryId, setManualCountryId] = useState(null);
  const [manualCityId, setManualCityId] = useState(null);
  const [manualCountryIso, setManualCountryIso] = useState('');
  const [manualCityName, setManualCityName] = useState('');
  const [manualLatitude, setManualLatitude] = useState('');
  const [manualLongitude, setManualLongitude] = useState('');
  const [laborPrice, setLaborPrice] = useState('');
  const [partsPrice, setPartsPrice] = useState('');
  const [totalPrice, setTotalPrice] = useState('');
  const totalManuallyEditedRef = useRef(false);

  const [nextDueKm, setNextDueKm] = useState('');
  const [nextOilDueIso, setNextOilDueIso] = useState('');
  const [oilIntervalKm, setOilIntervalKm] = useState(DEFAULT_OIL_INTERVAL_KM);
  const [oilNextDueKmEdited, setOilNextDueKmEdited] = useState(false);
  const [oilNextDueDateEdited, setOilNextDueDateEdited] = useState(false);

  const [technicalValidIso, setTechnicalValidIso] = useState('');

  const [brakeNextCheckKm, setBrakeNextCheckKm] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogMessage, setDialogMessage] = useState('');
  const [providerSearchQuery, setProviderSearchQuery] = useState('');
  const [providerCityFilter, setProviderCityFilter] = useState('');
  const [providerNearMe, setProviderNearMe] = useState(false);
  const [providerUserLocation, setProviderUserLocation] = useState(null);
  const [providerLocationLoading, setProviderLocationLoading] = useState(false);
  const lastFormDraftKeyRef = useRef('');

  const filteredTypes = useMemo(() => filterServiceRecordRepairTypes(allRepairTypes), [allRepairTypes]);

  const selectedType = useMemo(
    () => filteredTypes.find((t) => String(t.id) === String(repairTypeId)),
    [filteredTypes, repairTypeId]
  );
  const variant = classifyServiceRecordFormVariant(selectedType);

  const authorizedCenters = useMemo(() => {
    const list = vehicle?.shared_with_shops;
    return Array.isArray(list) ? list : [];
  }, [vehicle]);

  const knownWorkshops = useMemo(
    () => knownWorkshopsFromVehicleRepairs(vehicle?.repairs),
    [vehicle?.repairs]
  );

  const allProviderOptions = useMemo(
    () => buildProviderPickerOptions(authorizedCenters, knownWorkshops),
    [authorizedCenters, knownWorkshops]
  );

  const hasProviderPickerOptions = allProviderOptions.length > 0;

  const showProviderFilters = allProviderOptions.length > PROVIDER_PICKER_FILTER_THRESHOLD;

  const providerCities = useMemo(
    () => distinctProviderCities(allProviderOptions),
    [allProviderOptions]
  );

  const providerPickerValue = useMemo(() => {
    if (providerMode === 'authorized' && selectedShopProfileId) {
      return `shop:${selectedShopProfileId}`;
    }
    return '';
  }, [providerMode, selectedShopProfileId]);

  const filteredProviderOptions = useMemo(
    () =>
      filterProviderPickerOptions({
        options: allProviderOptions,
        searchQuery: showProviderFilters ? providerSearchQuery : '',
        cityFilter: showProviderFilters ? providerCityFilter : '',
        nearMeEnabled: showProviderFilters && providerNearMe,
        userLocation: providerUserLocation,
        selectedPickerValue: providerPickerValue,
      }),
    [
      allProviderOptions,
      showProviderFilters,
      providerSearchQuery,
      providerCityFilter,
      providerNearMe,
      providerUserLocation,
      providerPickerValue,
    ]
  );

  const canFilterByNearMe = useMemo(
    () => providerOptionsHaveCoordinates(allProviderOptions),
    [allProviderOptions]
  );

  const toggleProviderNearMe = async () => {
    if (providerNearMe) {
      setProviderNearMe(false);
      return;
    }
    setProviderLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location', 'Allow location to filter workshops near you.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setProviderUserLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      setProviderNearMe(true);
    } catch (e) {
      console.warn('Provider near-me location failed', e);
      Alert.alert('Location', 'Could not get your location. Try again.');
    } finally {
      setProviderLocationLoading(false);
    }
  };

  const clearManualProviderFields = () => {
    setManualName('');
    setManualPhone('');
    setManualEmail('');
    setManualAddress('');
    setManualCountryId(null);
    setManualCityId(null);
    setManualCountryIso('');
    setManualCityName('');
    setManualLatitude('');
    setManualLongitude('');
  };

  const applyManualDraft = useCallback((draft) => {
    if (!draft) return;
    setProviderMode('manual');
    setSelectedShopProfileId('');
    setManualName(draft.name || '');
    setManualPhone(draft.phone || '');
    setManualEmail(draft.email || '');
    setManualAddress(draft.address || '');
    setManualCountryId(draft.countryId ?? null);
    setManualCityId(draft.cityId ?? null);
    setManualCountryIso(draft.countryIso || '');
    setManualCityName(draft.cityName || '');
    setManualLatitude(draft.latitude || '');
    setManualLongitude(draft.longitude || '');
  }, []);

  const currentManualDraft = useMemo(
    () =>
      buildManualServiceCenterDraft({
        name: manualName,
        phone: manualPhone,
        email: manualEmail,
        address: manualAddress,
        countryId: manualCountryId,
        cityId: manualCityId,
        countryIso: manualCountryIso,
        cityName: manualCityName,
        latitude: manualLatitude,
        longitude: manualLongitude,
      }),
    [
      manualName,
      manualPhone,
      manualEmail,
      manualAddress,
      manualCountryId,
      manualCityId,
      manualCountryIso,
      manualCityName,
      manualLatitude,
      manualLongitude,
    ]
  );

  const hasManualCenter = providerMode === 'manual' && manualDraftHasData(currentManualDraft);
  const workshopSummary = useMemo(
    () => workshopSummaryLines(currentManualDraft),
    [currentManualDraft]
  );

  const selectedProviderLabel = useMemo(() => {
    if (providerMode === 'self') return 'I did it myself';
    if (providerMode === 'authorized' && selectedShopProfileId) {
      const hit = allProviderOptions.find(
        (o) => o.kind === 'shop' && String(o.shopId) === String(selectedShopProfileId)
      );
      return hit?.label?.replace(/ · authorized$/, '') || 'Selected service center';
    }
    if (providerMode === 'manual' && hasManualCenter) {
      return workshopSummary.title || 'Unlisted service center';
    }
    return null;
  }, [
    providerMode,
    selectedShopProfileId,
    allProviderOptions,
    hasManualCenter,
    workshopSummary.title,
  ]);

  const buildCurrentFormDraft = useCallback(
    () =>
      buildLogServiceRecordFormDraft({
        repairTypeId,
        completedAtIso,
        finalKilometers,
        notes,
        providerMode,
        selectedShopProfileId,
        laborPrice,
        partsPrice,
        totalPrice,
        totalManuallyEdited: totalManuallyEditedRef.current,
        nextDueKm,
        nextOilDueIso,
        oilIntervalKm,
        oilNextDueKmEdited,
        oilNextDueDateEdited,
        technicalValidIso,
        brakeNextCheckKm,
      }),
    [
      repairTypeId,
      completedAtIso,
      finalKilometers,
      notes,
      providerMode,
      selectedShopProfileId,
      laborPrice,
      partsPrice,
      totalPrice,
      nextDueKm,
      nextOilDueIso,
      oilIntervalKm,
      oilNextDueKmEdited,
      oilNextDueDateEdited,
      technicalValidIso,
      brakeNextCheckKm,
    ]
  );

  const persistFormDraftToStorage = useCallback(
    async (draft) => {
      if (!vehicleId || !draft) return;
      try {
        await saveServiceRecordFormDraft(vehicleId, draft);
      } catch (e) {
        console.warn('Could not persist service record draft', e);
      }
    },
    [vehicleId]
  );

  const restoreFormDraft = useCallback((draft) => {
    if (!draft) return;
    const key = JSON.stringify(draft);
    if (lastFormDraftKeyRef.current === key) return;
    lastFormDraftKeyRef.current = key;
    applyLogServiceRecordFormDraft(draft, {
      setRepairTypeId,
      setCompletedAtIso,
      setFinalKilometers,
      setNotes,
      setProviderMode,
      setSelectedShopProfileId,
      setLaborPrice,
      setPartsPrice,
      setTotalPrice,
      setTotalManuallyEdited: (v) => {
        totalManuallyEditedRef.current = v;
      },
      setNextDueKm,
      setNextOilDueIso,
      setOilIntervalKm,
      setOilNextDueKmEdited,
      setOilNextDueDateEdited,
      setTechnicalValidIso,
      setBrakeNextCheckKm,
    });
  }, []);

  const openServiceCenterHub = useCallback(async () => {
    const formDraft = buildCurrentFormDraft();
    await persistFormDraftToStorage(formDraft);
    if (Platform.OS === 'web') {
      navigateToVehicleServiceRecordCenter(navigation, vehicleId, {
        type: route.params?.type,
        formDraft,
      });
      return;
    }
    navigation.navigate('ServiceRecordServiceCenter', {
      vehicleId,
      type: route.params?.type,
      formDraft,
    });
  }, [
    buildCurrentFormDraft,
    navigation,
    vehicleId,
    route.params?.type,
    persistFormDraftToStorage,
  ]);

  const openEditManualCenter = useCallback(async () => {
    const formDraft = buildCurrentFormDraft();
    await persistFormDraftToStorage(formDraft);
    if (Platform.OS === 'web') {
      navigateToVehicleServiceRecordCenterAdd(navigation, vehicleId, {
        type: route.params?.type,
      });
      return;
    }
    navigation.navigate('AddManualServiceCenter', {
      vehicleId,
      type: route.params?.type,
      draft: currentManualDraft,
    });
  }, [
    buildCurrentFormDraft,
    currentManualDraft,
    navigation,
    vehicleId,
    route.params?.type,
    persistFormDraftToStorage,
  ]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        if (!vehicleId) return;
        try {
          const draft = await loadServiceRecordFormDraft(vehicleId);
          if (!cancelled && draft) {
            lastFormDraftKeyRef.current = '';
            restoreFormDraft(draft);
          }

          const patch = route.params?.providerPatch;
          if (!cancelled && patch) {
            lastFormDraftKeyRef.current = '';
            restoreFormDraft({ ...(draft || {}), ...patch });
            navigation.setParams({ providerPatch: undefined });
          }

          const manualDraft = await loadServiceRecordManualCenterDraft(vehicleId);
          if (!cancelled && manualDraft && manualDraftHasData(manualDraft)) {
            applyManualDraft(manualDraft);
          }
        } catch (e) {
          console.warn('Could not restore service record draft', e);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [
      vehicleId,
      route.params?.providerPatch,
      restoreFormDraft,
      applyManualDraft,
      navigation,
    ])
  );

  useEffect(() => {
    const draft = route.params?.manualServiceCenterDraft;
    if (!draft) return;
    lastFormDraftKeyRef.current = '';
    applyManualDraft(draft);
    navigation.setParams({ manualServiceCenterDraft: undefined });
  }, [route.params?.manualServiceCenterDraft, applyManualDraft, navigation]);

  useEffect(() => {
    if (variant !== 'oil') return;
    if (!oilNextDueDateEdited && completedAtIso) {
      const autoDate = computeNextOilDueDateIso(completedAtIso);
      if (autoDate) setNextOilDueIso(autoDate);
    }
    if (!oilNextDueKmEdited && String(finalKilometers || '').trim()) {
      const autoKm = computeNextOilDueKm(finalKilometers, oilIntervalKm);
      if (autoKm) setNextDueKm(autoKm);
    }
  }, [
    variant,
    completedAtIso,
    finalKilometers,
    oilIntervalKm,
    oilNextDueDateEdited,
    oilNextDueKmEdited,
  ]);

  useEffect(() => {
    if (nextOilDueIso && !isSaneServiceIso(nextOilDueIso)) {
      setNextOilDueIso('');
      setOilNextDueDateEdited(false);
    }
  }, [nextOilDueIso]);

  useEffect(() => {
    const load = async () => {
      try {
        const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        const vid = parseInt(vehicleId, 10);
        if (!Number.isFinite(vid)) {
          setDialogMessage('Missing vehicle.');
          setDialogVisible(true);
          setLoading(false);
          return;
        }
        const [vRes, tRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/vehicles/${vid}/`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE_URL}/api/repairs/types/`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        if (!vRes.ok || !tRes.ok) throw new Error('Failed to load form data');
        const vData = await vRes.json();
        const types = await tRes.json();
        setVehicle(vData);
        setAllRepairTypes(Array.isArray(types) ? types : []);
      } catch (e) {
        console.error(e);
        setDialogMessage(e.message || 'Error loading data');
        setDialogVisible(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [vehicleId]);

  useEffect(() => {
    if (loading || repairTypeId || !filteredTypes.length) return;
    const typeParam = route.params?.type;
    if (!typeParam) return;
    const variant = resolveServiceRecordVariantParam(typeParam);
    const match = findServiceRecordTypeByVariant(filteredTypes, variant);
    if (match?.id != null) {
      setRepairTypeId(String(match.id));
    }
  }, [loading, repairTypeId, filteredTypes, route.params?.type]);

  useEffect(() => {
    if (!vehicle || finalKilometers) return;
    if (route.params?.prefillKm !== true) return;
    if (vehicle.kilometers == null || vehicle.kilometers === '') return;
    setFinalKilometers(String(vehicle.kilometers));
  }, [vehicle, route.params?.prefillKm, finalKilometers]);

  useEffect(() => {
    if (!repairTypeId) return;
    if (!filteredTypes.some((t) => String(t.id) === String(repairTypeId))) {
      setRepairTypeId('');
    }
  }, [filteredTypes, repairTypeId]);

  const addAttachment = (item) => {
    if (!item) return;
    setPendingAttachments((prev) => [...prev, item]);
  };

  const removeAttachment = (localId) => {
    setPendingAttachments((prev) => prev.filter((a) => a.localId !== localId));
  };

  const handlePickReceipt = async () => {
    try {
      addAttachment(await pickReceiptOrInvoiceAttachment());
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not pick receipt or invoice.');
    }
  };

  const handlePickPhoto = async () => {
    try {
      addAttachment(await pickVehiclePhotoAttachment());
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not pick photo.');
    }
  };

  const handlePickOdometerPhoto = async () => {
    try {
      addAttachment(await pickOdometerPhotoAttachment());
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not pick odometer photo.');
    }
  };

  const resolvedCompletedIso = () => {
    const s = String(completedAtIso || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return undefined;
    return s;
  };

  const resolvedNextOilDueIso = () => {
    const s = String(nextOilDueIso || '').trim();
    if (!s) return null;
    if (!isSaneServiceIso(s)) return undefined;
    return s;
  };

  const resolvedTechnicalValidIso = () => {
    const s = String(technicalValidIso || '').trim();
    if (!s) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return undefined;
    return s;
  };

  const parseOptionalInt = (raw) => {
    const str = String(raw ?? '').trim();
    if (!str) return null;
    const n = parseInt(str, 10);
    if (!Number.isFinite(n) || n < 0) return undefined;
    return n;
  };

  const parseOptionalFloat = (raw) => {
    const str = String(raw ?? '').trim();
    if (!str) return null;
    const n = parseFloat(str);
    if (!Number.isFinite(n)) return undefined;
    return n;
  };

  const formatSumTotal = (labor, parts) => {
    const sum = (labor ?? 0) + (parts ?? 0);
    return Number.isInteger(sum) ? String(sum) : sum.toFixed(2);
  };

  const syncTotalFromLaborParts = useCallback((nextLabor, nextParts) => {
    if (totalManuallyEditedRef.current) return;
    const lStr = String(nextLabor ?? '').trim();
    const pStr = String(nextParts ?? '').trim();
    if (!lStr && !pStr) {
      setTotalPrice('');
      return;
    }
    const labor = lStr ? parseFloat(lStr) : 0;
    const parts = pStr ? parseFloat(pStr) : 0;
    if (!Number.isFinite(labor) || !Number.isFinite(parts)) return;
    setTotalPrice(formatSumTotal(labor, parts));
  }, []);

  const handleLaborChange = useCallback(
    (text) => {
      setLaborPrice(text);
      syncTotalFromLaborParts(text, partsPrice);
    },
    [partsPrice, syncTotalFromLaborParts]
  );

  const handlePartsChange = useCallback(
    (text) => {
      setPartsPrice(text);
      syncTotalFromLaborParts(laborPrice, text);
    },
    [laborPrice, syncTotalFromLaborParts]
  );

  const handleTotalChange = useCallback((text) => {
    totalManuallyEditedRef.current = true;
    setTotalPrice(text);
  }, []);

  const handleSubmit = async () => {
    const vid = parseInt(vehicleId, 10);
    if (!Number.isFinite(vid)) {
      setDialogMessage('Vehicle is required.');
      setDialogVisible(true);
      return;
    }
    if (!repairTypeId) {
      setDialogMessage('Select a service type.');
      setDialogVisible(true);
      return;
    }
    const dateIso = resolvedCompletedIso();
    if (dateIso === undefined) {
      setDialogMessage('Choose a valid completed date.');
      setDialogVisible(true);
      return;
    }
    if (!dateIso) {
      setDialogMessage('Completed date is required.');
      setDialogVisible(true);
      return;
    }
    if (dateIso > todayIso) {
      setDialogMessage('Completed date cannot be in the future.');
      setDialogVisible(true);
      return;
    }

    const fkRaw = parseOdometerKm(finalKilometers);
    const fk = fkRaw == null && String(finalKilometers ?? '').trim() ? undefined : fkRaw;
    if (fk === undefined) {
      setDialogMessage('Kilometers at service must be a whole number or empty.');
      setDialogVisible(true);
      return;
    }

    if (variant === 'oil' && fk == null) {
      setDialogMessage('Kilometers at service are required for an oil service record.');
      setDialogVisible(true);
      return;
    }
    if (variant === 'brake_service' && fk == null) {
      setDialogMessage('Kilometers at service are required for a brake service record.');
      setDialogVisible(true);
      return;
    }

    let mileageJumpAcknowledged = false;
    if (fk != null) {
      const priorMax = vehicle?.prior_max_odometer_km;
      const analysis = analyzeFinalizeKilometers(fk, priorMax);
      if (!analysis.ok) {
        if (analysis.blocked) {
          setDialogMessage(analysis.message);
          setDialogVisible(true);
          return;
        }
        const hasPhoto = hasOdometerPhotoAttachment(pendingAttachments);
        if (hasPhoto) {
          mileageJumpAcknowledged = true;
        } else {
          const confirmed = await new Promise((resolve) => {
            Alert.alert(
              'Large odometer increase',
              analysis.message,
              [
                { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
                {
                  text: 'Add odometer photo',
                  onPress: async () => {
                    try {
                      const attachment = await pickOdometerPhotoAttachment();
                      if (attachment) {
                        setPendingAttachments((prev) => [...prev, attachment]);
                        Alert.alert(
                          'Photo added',
                          'Odometer photo attached. Tap save again to continue.'
                        );
                      }
                    } catch (err) {
                      Alert.alert('Error', err.message || 'Could not pick odometer photo.');
                    }
                    resolve(false);
                  },
                },
                { text: 'Confirm reading', onPress: () => resolve(true) },
              ],
              { cancelable: true, onDismiss: () => resolve(false) }
            );
          });
          if (!confirmed) {
            return;
          }
          mileageJumpAcknowledged = true;
        }
      }
    }

    const nextOilIso = resolvedNextOilDueIso();
    if (nextOilIso === undefined) {
      setDialogMessage('Next oil due date must be empty or a valid date.');
      setDialogVisible(true);
      return;
    }
    const nextKmParsed = parseOptionalInt(nextDueKm);
    if (nextKmParsed === undefined) {
      setDialogMessage('Next due km must be a whole number or empty.');
      setDialogVisible(true);
      return;
    }

    const techValid = variant === 'technical_inspection' ? resolvedTechnicalValidIso() : null;
    if (techValid === undefined) {
      setDialogMessage('Valid-until / next inspection date must be a valid date.');
      setDialogVisible(true);
      return;
    }
    if (variant === 'technical_inspection' && !techValid) {
      setDialogMessage('Valid until / next inspection due date is required.');
      setDialogVisible(true);
      return;
    }

    const brakeNext = parseOptionalInt(brakeNextCheckKm);
    if (brakeNext === undefined) {
      setDialogMessage('Recommended next check km must be a whole number or empty.');
      setDialogVisible(true);
      return;
    }

    let labor = parseOptionalFloat(laborPrice);
    let parts = parseOptionalFloat(partsPrice);
    let total = parseOptionalFloat(totalPrice);
    if (labor === undefined || parts === undefined || total === undefined) {
      setDialogMessage('Cost fields must be valid numbers or empty.');
      setDialogVisible(true);
      return;
    }

    const money = resolveOwnerLoggedRepairMoney(labor, parts, total);
    labor = money.labor_price;
    parts = money.parts_price;
    total = money.total_price;

    if (providerMode === 'manual') {
      const manualErr = validateManualServiceCenterInput({
        phone: manualPhone,
        email: manualEmail,
        address: manualAddress,
        city: manualCityName,
        countryIso: manualCountryIso,
        latitude: manualLatitude,
        longitude: manualLongitude,
      });
      if (manualErr) {
        setDialogMessage(manualErr);
        setDialogVisible(true);
        return;
      }
    }

    if (providerMode === 'authorized') {
      const shopId = parseInt(selectedShopProfileId, 10);
      if (!Number.isFinite(shopId)) {
        setDialogMessage(t('logServiceRecord.errors.selectCenter'));
        setDialogVisible(true);
        return;
      }
    }

    const rt = parseInt(repairTypeId, 10);
    const completed_at = `${dateIso}T12:00:00.000Z`;
    const kmForVehicle = fk != null ? fk : 0;

    setSaving(true);
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const body = {
        vehicle: vid,
        source: 'owner_logged',
        status: 'done',
        repair_type: rt,
        final_repair_type: rt,
        completed_at,
        final_kilometers: fk,
        kilometers: kmForVehicle,
        description: String(notes || '').trim() || '',
        self_repair: providerMode === 'self',
        shop_profile:
          providerMode === 'authorized' && selectedShopProfileId
            ? parseInt(selectedShopProfileId, 10)
            : null,
        manual_service_center_name:
          providerMode === 'manual' ? String(manualName || '').trim() || null : null,
        manual_service_center_phone:
          providerMode === 'manual' ? String(manualPhone || '').trim() || null : null,
        manual_service_center_email:
          providerMode === 'manual' ? String(manualEmail || '').trim() || null : null,
        manual_service_center_address:
          providerMode === 'manual' ? String(manualAddress || '').trim() || null : null,
        manual_service_center_city:
          providerMode === 'manual' ? manualCityName || null : null,
        manual_service_center_country:
          providerMode === 'manual' ? manualCountryIso || null : null,
        manual_service_center_latitude:
          providerMode === 'manual' ? roundCoordinateForApi(manualLatitude) : null,
        manual_service_center_longitude:
          providerMode === 'manual' ? roundCoordinateForApi(manualLongitude) : null,
        evidence_level: 'owner_entered',
        labor_price: labor,
        parts_price: parts,
        total_price: total,
        currency: DEFAULT_CURRENCY,
        repair_parts_data: [],
        symptoms: '',
      };
      if (mileageJumpAcknowledged) {
        body.mileage_large_jump_acknowledged = true;
      }

      const created = await createRepair(token, body);
      const newId = created?.id;
      if (!newId) {
        setDialogMessage(t('logServiceRecord.errors.noRepairId'));
        setDialogVisible(true);
        return;
      }

      try {
        await applyPostCreateReminderPatches({
          token,
          vehicleId: vid,
          vehicle,
          variant,
          patches: {
            nextDueKm: nextKmParsed,
            nextOilDueIso: nextOilIso,
            technicalValidIso: techValid,
            brakeNextKm: brakeNext,
          },
        });
      } catch (remErr) {
        console.warn('Reminder patch after service record failed', remErr);
      }

      let uploadFailed = false;
      if (pendingAttachments.length > 0) {
        const amountMinor =
          total != null && Number.isFinite(Number(total)) ? Math.round(Number(total) * 100) : undefined;
        const { failed } = await uploadRepairDocuments(token, vid, newId, pendingAttachments, {
          currency: DEFAULT_CURRENCY,
          total_amount_minor: amountMinor,
          notes: String(notes || '').trim() || undefined,
        });
        uploadFailed = failed > 0;
      }

      if (uploadFailed) {
        Alert.alert(
          t('addObligationPayment.documents'),
          t('logServiceRecord.documentsSavedPartial')
        );
      }
      const linkedShopSelected =
        providerMode === 'authorized' &&
        selectedShopProfileId &&
        Number.isFinite(parseInt(selectedShopProfileId, 10));
      const returnToVehicleHistory = () => {
        AsyncStorage.removeItem(STORAGE_KEYS.logServiceRecordDraftKey(String(vid))).catch(() => {});
        clearServiceRecordDrafts(vid).catch(() => {});
        const returnTo = route.params?.returnTo;
        const organizationId = route.params?.organizationId;
        if (returnTo === 'OrgFleetVehicleDetail' && organizationId) {
          navigation.navigate('OrgFleetVehicleDetail', {
            organizationId,
            vehicleId: vid,
          });
          return;
        }
        if (Platform.OS === 'web') {
          navigateToVehicleDetail(navigation, vid, { scrollToServiceHistory: true });
          return;
        }
        navigation.navigate({
          name: 'VehicleDetail',
          params: {
            vehicleId: vid,
            scrollToServiceHistory: true,
          },
          merge: true,
        });
      };

      if (linkedShopSelected) {
        Alert.alert('Service record saved', 'Ask the selected service center to confirm this record?', [
          {
            text: 'Later',
            style: 'cancel',
            onPress: returnToVehicleHistory,
          },
          {
            text: 'Ask now',
            onPress: async () => {
              try {
                await requestOwnerLoggedRepairConfirmation(token, newId);
              } catch (_e) {
                // Non-blocking: owner can request later from detail.
              }
              returnToVehicleHistory();
            },
          },
        ]);
        return;
      }

      returnToVehicleHistory();
    } catch (err) {
      console.error(err);
      setDialogMessage(err.message || 'Could not save service record.');
      setDialogVisible(true);
    } finally {
      setSaving(false);
    }
  };

  const vehicleSummary = useMemo(() => {
    if (!vehicle) return null;
    const plate = vehicle.license_plate || '—';
    const name = [vehicle.make_name, vehicle.model_name].filter(Boolean).join(' ') || 'Vehicle';
    const km =
      vehicle.kilometers != null && vehicle.kilometers !== ''
        ? `${Number(vehicle.kilometers).toLocaleString()} km`
        : 'Kilometers not set';
    return { plate, name, km };
  }, [vehicle]);

  const validateTypeStep = useCallback(() => {
    if (!repairTypeId) {
      return { ok: false, message: t('logServiceRecord.errors.selectType', null, 'Select a service type.') };
    }
    return { ok: true };
  }, [repairTypeId, t]);

  const validateWhenMileageStep = useCallback(() => {
    const dateIso = resolvedCompletedIso();
    if (dateIso === undefined) {
      return { ok: false, message: 'Choose a valid completed date.' };
    }
    if (!dateIso) {
      return { ok: false, message: 'Completed date is required.' };
    }
    if (dateIso > todayIso) {
      return { ok: false, message: 'Completed date cannot be in the future.' };
    }
    const fkRaw = parseOdometerKm(finalKilometers);
    const fk = fkRaw == null && String(finalKilometers ?? '').trim() ? undefined : fkRaw;
    if (fk === undefined) {
      return { ok: false, message: 'Kilometers at service must be a whole number or empty.' };
    }
    if (variant === 'oil' && fk == null) {
      return { ok: false, message: 'Kilometers at service are required for an oil service record.' };
    }
    if (variant === 'brake_service' && fk == null) {
      return { ok: false, message: 'Kilometers at service are required for a brake service record.' };
    }
    if (variant === 'technical_inspection') {
      const techValid = resolvedTechnicalValidIso();
      if (techValid === undefined || !techValid) {
        return { ok: false, message: 'Valid until / next inspection due date is required.' };
      }
    }
    return { ok: true };
  }, [
    resolvedCompletedIso,
    resolvedTechnicalValidIso,
    finalKilometers,
    variant,
    todayIso,
  ]);

  const formContext = useMemo(
    () => ({
      vehicleSummary,
      repairTypeId,
      setRepairTypeId,
      filteredTypes,
      variant,
      todayIso,
      completedAtIso,
      setCompletedAtIso,
      finalKilometers,
      setFinalKilometers,
      technicalValidIso,
      setTechnicalValidIso,
      oilIntervalKm,
      setOilIntervalKm,
      setOilNextDueKmEdited,
      nextDueKm,
      setNextDueKm,
      nextOilDueIso,
      setNextOilDueIso,
      setOilNextDueDateEdited,
      brakeNextCheckKm,
      setBrakeNextCheckKm,
      laborPrice,
      partsPrice,
      totalPrice,
      handleLaborChange,
      handlePartsChange,
      handleTotalChange,
      providerMode,
      setProviderMode,
      selectedProviderLabel,
      workshopSummary,
      manualPhone,
      manualEmail,
      openEditManualCenter,
      openServiceCenterHub,
      setSelectedShopProfileId,
      clearManualProviderFields,
      notes,
      setNotes,
      pendingAttachments,
      handlePickReceipt,
      handlePickOdometerPhoto,
      handlePickPhoto,
      removeAttachment,
      saving,
    }),
    [
      vehicleSummary,
      repairTypeId,
      filteredTypes,
      variant,
      todayIso,
      completedAtIso,
      finalKilometers,
      technicalValidIso,
      oilIntervalKm,
      nextDueKm,
      nextOilDueIso,
      brakeNextCheckKm,
      laborPrice,
      partsPrice,
      totalPrice,
      handleLaborChange,
      handlePartsChange,
      handleTotalChange,
      providerMode,
      selectedProviderLabel,
      workshopSummary,
      manualPhone,
      manualEmail,
      openEditManualCenter,
      openServiceCenterHub,
      clearManualProviderFields,
      notes,
      pendingAttachments,
      handlePickReceipt,
      handlePickOdometerPhoto,
      handlePickPhoto,
      saving,
    ]
  );

  const wizardSteps = useMemo(
    () => [
      {
        id: 'service',
        titleKey: 'serviceRecordWizard.serviceTitle',
        title: 'Service type',
        validate: () => validateTypeStep(),
        Component: ServiceRecordTypeStep,
      },
      {
        id: 'whenMileage',
        titleKey: 'serviceRecordWizard.whenMileageTitle',
        title: 'Date & mileage',
        validate: () => validateWhenMileageStep(),
        Component: ServiceRecordWhenMileageStep,
      },
      {
        id: 'costs',
        titleKey: 'serviceRecordWizard.costsTitle',
        title: 'Costs',
        optional: true,
        Component: ServiceRecordCostsStep,
      },
      {
        id: 'provider',
        titleKey: 'serviceRecordWizard.providerTitle',
        title: 'Provider',
        optional: true,
        Component: ServiceRecordProviderStep,
      },
      {
        id: 'notes',
        titleKey: 'serviceRecordWizard.notesTitle',
        title: 'Notes & evidence',
        optional: true,
        Component: ServiceRecordNotesStep,
      },
    ],
    [validateTypeStep, validateWhenMileageStep]
  );

  const adapter = useMemo(() => createMemoryAdapter({}), []);

  const onWizardFinish = useCallback(async () => {
    await handleSubmit();
  }, [handleSubmit]);

  if (loading) {
    return <ActivityIndicator animating size="large" style={{ flex: 1 }} />;
  }

  return (
    <ScreenBackground safeArea={false}>
      <View style={styles.root}>
        <AppNavigationBar
          title={t('vehicles.nav.serviceRecord')}
          backLabel={t('vehicles.vehicle')}
          onBack={handleBack}
        />
        <WizardEngine
          steps={wizardSteps}
          adapter={adapter}
          context={formContext}
          onFinish={onWizardFinish}
          onExit={handleBack}
          showFinishLater={false}
          finishLabelKey="logServiceRecord.save"
        />
      </View>

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>{t('common.notice')}</Dialog.Title>
          <Dialog.Content>
            <Text>{dialogMessage}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button mode="text" onPress={() => setDialogVisible(false)}>
              {t('common.ok')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
