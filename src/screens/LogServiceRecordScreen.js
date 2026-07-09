/**
 * PATH: src/screens/LogServiceRecordScreen.js
 * Completed maintenance/repair work only — not obligations (see AddObligationPaymentScreen).
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { StyleSheet, View, Alert, Pressable, Platform } from 'react-native';
import ScreenBackground from '../components/ScreenBackground';
import AppNavigationBar from '../components/common/AppNavigationBar';
import { useScrollShadow } from '../hooks/useScrollShadow';
import { useVehicleDetailBack } from '../navigation/appNavBarBack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import {
  Text,
  TextInput,
  Button,
  ActivityIndicator,
  Portal,
  Dialog,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

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
  parseProviderPickerValue,
} from '../utils/knownVehicleWorkshops';
import * as Location from 'expo-location';
import {
  PROVIDER_PICKER_FILTER_THRESHOLD,
  buildProviderPickerOptions,
  distinctProviderCities,
  filterProviderPickerOptions,
  formatProviderOptionLabel,
  providerOptionsHaveCoordinates,
} from '../utils/serviceProviderPicker';
import { STORAGE_KEYS } from '../constants/storageKeys';
import FloatingCard from '../components/ui/FloatingCard';
import { COLORS } from '../constants/colors';
import ServiceRecordDatePicker from '../components/vehicle/ServiceRecordDatePicker';
import { localDateToIso, isSaneServiceIso } from '../components/vehicle/dateFieldUtils';
import {
  OIL_INTERVAL_KM_OPTIONS,
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
import DocumentAttachmentList, {
  DocumentAttachmentActions,
} from '../components/documents/DocumentAttachmentList';
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
import { translateRepairTypeLabel } from '../utils/translateShopTypeLabels';
import {
  saveServiceRecordFormDraft,
  loadServiceRecordFormDraft,
  loadServiceRecordManualCenterDraft,
  clearServiceRecordDrafts,
} from '../utils/serviceRecordDraftStorage';

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
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const vehicleId = route.params?.vehicleId != null ? String(route.params.vehicleId) : '';
  const { scrolled, onScroll, scrollEventThrottle } = useScrollShadow();
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
        setDialogMessage('Select an authorized service center or choose another provider option.');
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
        setDialogMessage('Saved, but no repair id returned.');
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
          'Documents',
          'Service record saved, but some documents failed to upload.'
        );
      }
      const linkedShopSelected =
        providerMode === 'authorized' &&
        selectedShopProfileId &&
        Number.isFinite(parseInt(selectedShopProfileId, 10));
      const returnToVehicleHistory = () => {
        AsyncStorage.removeItem(STORAGE_KEYS.logServiceRecordDraftKey(String(vid))).catch(() => {});
        clearServiceRecordDrafts(vid).catch(() => {});
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

  const renderCostFields = (showLaborParts) => (
    <>
      {showLaborParts ? (
        <>
          <Text variant="labelLarge" style={styles.label}>
            Labor
          </Text>
          <TextInput
            mode="outlined"
            value={laborPrice}
            onChangeText={handleLaborChange}
            keyboardType="decimal-pad"
            style={styles.input}
          />
          <Text variant="labelLarge" style={styles.label}>
            Parts
          </Text>
          <TextInput
            mode="outlined"
            value={partsPrice}
            onChangeText={handlePartsChange}
            keyboardType="decimal-pad"
            style={styles.input}
          />
        </>
      ) : null}
      <Text variant="labelLarge" style={styles.label}>
        {showLaborParts ? 'Total' : 'Total paid'}
      </Text>
      <TextInput
        mode="outlined"
        value={totalPrice}
        onChangeText={handleTotalChange}
        keyboardType="decimal-pad"
        style={styles.input}
      />
      <Text style={styles.sectionHint}>
        Amounts use major units (EUR). Total updates when labor or parts change; you can still edit it.
        If only total is filled, labor is stored as 0 and parts as the total.
      </Text>
    </>
  );

  if (loading) {
    return <ActivityIndicator animating size="large" style={{ flex: 1 }} />;
  }

  return (
    <ScreenBackground safeArea={false}>
      <View style={styles.root}>
        <AppNavigationBar
          title={t('logServiceRecord.title')}
          backLabel={t('vehicles.vehicle')}
          onBack={handleBack}
          scrolled={scrolled}
        />
        <KeyboardAwareScrollView
          onScroll={onScroll}
          scrollEventThrottle={scrollEventThrottle}
          contentContainerStyle={[
            styles.container,
            { paddingTop: 12, paddingBottom: 110 + Math.max(insets.bottom, 10) },
          ]}
          keyboardShouldPersistTaps="handled"
          enableResetScrollToCoords={false}
          enableAutomaticScroll
          extraScrollHeight={24}
        >
          <FloatingCard>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              {t('logServiceRecord.title')}
            </Text>
            <Text style={styles.subtitle}>
              {t('logServiceRecord.subtitle')}
            </Text>
            {vehicleSummary ? (
              <View style={styles.vehicleSummaryCard}>
                <Text style={styles.vehicleSummaryPlate}>{vehicleSummary.plate}</Text>
                <Text style={styles.vehicleSummaryName}>{vehicleSummary.name}</Text>
                <Text style={styles.vehicleSummaryKm}>{vehicleSummary.km}</Text>
              </View>
            ) : (
              <Text style={styles.sectionHint}>{t('logServiceRecord.vehicleNotLoaded')}</Text>
            )}
          </FloatingCard>

          <FloatingCard>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              {t('logServiceRecord.sections.service')}
            </Text>
            <Text variant="labelLarge" style={styles.label}>
              {t('logServiceRecord.serviceTypeLabel')}
            </Text>
            <View style={styles.pickerContainer}>
              <Picker selectedValue={repairTypeId} onValueChange={setRepairTypeId} style={styles.picker}>
                <Picker.Item label={t('logServiceRecord.selectType')} value="" />
                {filteredTypes.map((repairType) => (
                  <Picker.Item
                    key={repairType.id}
                    label={
                      translateRepairTypeLabel(repairType, t) ||
                      repairType.name ||
                      `Type ${repairType.id}`
                    }
                    value={String(repairType.id)}
                  />
                ))}
              </Picker>
            </View>
          </FloatingCard>

          <FloatingCard>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Service date & mileage
            </Text>
            <ServiceRecordDatePicker
              label="Completed date *"
              valueIso={completedAtIso}
              onChangeIso={setCompletedAtIso}
              optional={false}
              maxIso={todayIso}
              minIso="1950-01-01"
            />
            <Text style={styles.sectionHint}>
              Shown as DD.MM.YYYY. You can pick today or any past date.
            </Text>

            {(variant === 'oil' || variant === 'brake_service' || variant === 'generic') && (
              <>
                <Text variant="labelLarge" style={styles.label}>
                  Kilometers at service{variant === 'generic' ? '' : ' *'}
                </Text>
                <TextInput
                  mode="outlined"
                  value={finalKilometers}
                  onChangeText={setFinalKilometers}
                  placeholder="Odometer when service was completed"
                  keyboardType="numeric"
                  style={styles.input}
                />
                <Text style={styles.kmHelper}>
                  Old records are allowed — including lower mileage (dashboard replacement, correction, or historical
                  entry). Vehicle current km only increases when this value is higher. Possible rollback warnings lower
                  confidence only; they never block save.
                </Text>
              </>
            )}

            {variant === 'technical_inspection' ? (
              <>
                <ServiceRecordDatePicker
                  label="Valid until / next inspection due *"
                  valueIso={technicalValidIso}
                  onChangeIso={setTechnicalValidIso}
                  optional={false}
                />
                <Text style={styles.sectionHint}>
                  This updates your technical inspection reminder. Use Add Obligation / Payment if you only need to set
                  a due date without logging workshop work.
                </Text>
              </>
            ) : null}

            {variant === 'oil' ? (
              <>
                <Text variant="labelLarge" style={styles.label}>
                  Oil change interval
                </Text>
                <View style={styles.oilIntervalRow}>
                  {OIL_INTERVAL_KM_OPTIONS.map((opt) => {
                    const on = oilIntervalKm === opt.km;
                    return (
                      <Pressable
                        key={opt.km}
                        onPress={() => {
                          setOilIntervalKm(opt.km);
                          setOilNextDueKmEdited(false);
                        }}
                        style={[styles.oilIntervalChip, on && styles.oilIntervalChipOn]}
                      >
                        <Text style={[styles.oilIntervalChipText, on && styles.oilIntervalChipTextOn]}>
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text variant="labelLarge" style={styles.label}>
                  Next due km
                </Text>
                <TextInput
                  mode="outlined"
                  value={nextDueKm}
                  onChangeText={(text) => {
                    setOilNextDueKmEdited(true);
                    setNextDueKm(text);
                  }}
                  placeholder="Auto: current km + interval"
                  keyboardType="numeric"
                  style={styles.input}
                />
                <ServiceRecordDatePicker
                  label="Next due date"
                  valueIso={nextOilDueIso}
                  onChangeIso={(iso) => {
                    setOilNextDueDateEdited(true);
                    setNextOilDueIso(iso);
                  }}
                  optional
                  minIso={completedAtIso || todayIso}
                />
                <Text style={styles.sectionHint}>
                  Defaults to +{oilIntervalKm.toLocaleString()} km and +1 year from the service date. Edit either
                  field to override.
                </Text>
              </>
            ) : null}

            {variant === 'brake_service' ? (
              <>
                <Text variant="labelLarge" style={styles.label}>
                  Recommended next brake check km (optional)
                </Text>
                <TextInput
                  mode="outlined"
                  value={brakeNextCheckKm}
                  onChangeText={setBrakeNextCheckKm}
                  placeholder="Overrides default recommendation after save if set"
                  keyboardType="numeric"
                  style={styles.input}
                />
              </>
            ) : null}
          </FloatingCard>

          <FloatingCard>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Costs
            </Text>
            {renderCostFields(variant !== 'technical_inspection')}
          </FloatingCard>

          <FloatingCard>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Service provider
            </Text>
            <Text style={styles.sectionHint}>
              Optional. Link who performed the work, or mark it as owner-performed.
            </Text>

            {selectedProviderLabel ? (
              <View style={styles.manualSummaryCard}>
                <Text variant="titleSmall" style={styles.unlistedTitle}>
                  {providerMode === 'self' ? 'Self-performed' : 'Service center'}
                </Text>
                <Text style={styles.manualSummaryName}>{selectedProviderLabel}</Text>
                {providerMode === 'manual'
                  ? workshopSummary.lines.map((line) => (
                      <Text key={line} style={styles.manualSummaryMeta}>
                        {line}
                      </Text>
                    ))
                  : null}
                {providerMode === 'manual' && String(manualPhone || '').trim() ? (
                  <Text style={styles.manualSummaryMeta}>{manualPhone}</Text>
                ) : null}
                {providerMode === 'manual' && String(manualEmail || '').trim() ? (
                  <Text style={styles.manualSummaryMeta}>{manualEmail}</Text>
                ) : null}
                {providerMode === 'manual' ? (
                  <Text style={styles.manualSummaryHint}>
                    Saved in the directory and linked to this record — not authorized on your vehicle
                    until they join the platform.
                  </Text>
                ) : null}
                <View style={styles.manualSummaryActions}>
                  {providerMode === 'manual' ? (
                    <Button mode="outlined" compact onPress={openEditManualCenter}>
                      Edit
                    </Button>
                  ) : null}
                  <Button mode="outlined" compact onPress={openServiceCenterHub}>
                    Change
                  </Button>
                  <Button
                    mode="text"
                    compact
                    onPress={() => {
                      setProviderMode(null);
                      setSelectedShopProfileId('');
                      clearManualProviderFields();
                    }}
                  >
                    Remove
                  </Button>
                </View>
              </View>
            ) : (
              <Button
                mode="outlined"
                icon={() => (
                  <MaterialCommunityIcons name="account-hard-hat" size={20} color={COLORS.PRIMARY} />
                )}
                onPress={openServiceCenterHub}
                style={styles.unlistedToggleBtn}
              >
                Who performed this service?
              </Button>
            )}
          </FloatingCard>

          <FloatingCard>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Notes & evidence
            </Text>
            <Text variant="labelLarge" style={styles.label}>
              Notes
            </Text>
            <TextInput
              mode="outlined"
              value={notes}
              onChangeText={setNotes}
              placeholder={
                variant === 'technical_inspection'
                  ? 'Station, findings, etc.'
                  : 'What was done, parts brands, etc.'
              }
              style={styles.input}
              multiline
            />
            <Text variant="labelLarge" style={[styles.label, styles.attachmentsLabel]}>
              Attachments (optional)
            </Text>
            <Text style={styles.sectionHint}>
              Odometer photos are optional evidence — no automatic mileage reading.
            </Text>
            <DocumentAttachmentActions
              onAddReceipt={handlePickReceipt}
              onAddOdometerPhoto={handlePickOdometerPhoto}
              onAddPhoto={handlePickPhoto}
              disabled={saving}
            />
            <DocumentAttachmentList
              attachments={pendingAttachments}
              onRemove={removeAttachment}
              emptyHint="Add receipts, invoices, or photos now — they upload after you save."
            />
            <Text style={styles.sectionHint}>
              Files are linked to this service record after save. You can add more from the record detail screen later.
            </Text>
          </FloatingCard>
        </KeyboardAwareScrollView>

        <View style={[styles.bottomActionBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={saving}
            disabled={saving}
            style={styles.sendButton}
            contentStyle={styles.sendButtonContent}
          >
            {t('logServiceRecord.save')}
          </Button>
        </View>
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
  container: {
    padding: 12,
    gap: 8,
  },
  sectionTitle: {
    color: COLORS.TEXT_DARK,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    color: COLORS.TEXT_MUTED,
    fontSize: 14,
    marginBottom: 10,
    lineHeight: 20,
  },
  sectionHint: {
    color: COLORS.TEXT_MUTED,
    marginBottom: 10,
    fontSize: 13,
  },
  kmHelper: {
    color: COLORS.TEXT_MUTED,
    fontSize: 13,
    marginBottom: 8,
    lineHeight: 18,
  },
  label: {
    marginTop: 10,
    marginBottom: 4,
    fontWeight: '600',
  },
  input: {
    marginBottom: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  picker: {
    width: '100%',
  },
  providerFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  providerFilterHint: {
    flex: 1,
    color: COLORS.TEXT_MUTED,
    fontSize: 12,
    lineHeight: 16,
  },
  providerFilterCount: {
    color: COLORS.TEXT_MUTED,
    fontSize: 12,
    marginBottom: 6,
  },
  oilIntervalRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  oilIntervalChip: {
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.15)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  oilIntervalChipOn: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: 'rgba(37,99,235,0.08)',
  },
  oilIntervalChipText: {
    color: COLORS.TEXT_DARK,
    fontSize: 13,
    fontWeight: '600',
  },
  oilIntervalChipTextOn: {
    color: COLORS.PRIMARY,
  },
  vehicleSummaryCard: {
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.1)',
    borderRadius: 12,
    backgroundColor: '#fff',
    padding: 10,
  },
  vehicleSummaryPlate: {
    color: COLORS.TEXT_DARK,
    fontWeight: '800',
    fontSize: 16,
  },
  vehicleSummaryName: {
    color: COLORS.TEXT_DARK,
    marginTop: 2,
  },
  vehicleSummaryKm: {
    color: COLORS.TEXT_MUTED,
    marginTop: 2,
    fontSize: 12,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 8,
  },
  switchLabel: {
    fontWeight: '600',
    color: COLORS.TEXT_DARK,
  },
  unlistedToggleBtn: {
    marginTop: 4,
    alignSelf: 'stretch',
  },
  unlistedTitle: {
    color: COLORS.TEXT_DARK,
    fontWeight: '700',
  },
  manualSummaryCard: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.1)',
    borderRadius: 12,
    backgroundColor: '#fff',
    padding: 12,
  },
  manualSummaryName: {
    color: COLORS.TEXT_DARK,
    fontWeight: '600',
    marginTop: 4,
  },
  manualSummaryMeta: {
    color: COLORS.TEXT_MUTED,
    fontSize: 13,
    marginTop: 2,
  },
  manualSummaryHint: {
    color: COLORS.TEXT_MUTED,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 8,
  },
  manualSummaryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  attachmentsLabel: {
    marginTop: 12,
  },
  bottomActionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: 'rgba(245,247,250,0.96)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(15,23,42,0.12)',
  },
  sendButton: {
    borderRadius: 12,
  },
  sendButtonContent: {
    paddingVertical: 10,
  },
});
