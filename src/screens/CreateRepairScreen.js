/**
 * PATH: src/screens/CreateRepairScreen.js
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Alert,
  Pressable,
} from 'react-native';
import ScreenBackground from '../components/ScreenBackground';
import AppNavigationBar from '../components/common/AppNavigationBar';
import { useScrollShadow } from '../hooks/useScrollShadow';
import { useServiceCentersBack } from '../navigation/appNavBarBack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
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

import { API_BASE_URL } from '../api/config';
import { createRepair, getRepairById, updateRepair, uploadRepairMedia } from '../api/repairs';
import { getServiceCenters } from '../api/serviceCenters';
import { getShopById } from '../api/shops';
import { STORAGE_KEYS } from '../constants/storageKeys';
import FloatingCard from '../components/ui/FloatingCard';
import RepairRequestHeader from '../components/repairRequest/RepairRequestHeader';
import RepairProblemInput from '../components/repairRequest/RepairProblemInput';
import RepairPopularServices from '../components/repairRequest/RepairPopularServices';
import RepairServicePicker from '../components/repairRequest/RepairServicePicker';
import SelectedServicePill from '../components/repairRequest/SelectedServicePill';
import RepairMediaSection from '../components/repairRequest/RepairMediaSection';
import PreferredVisitPicker from '../components/repairRequest/PreferredVisitPicker';
import { resolveRepairTypeForSubmit } from '../utils/repairTypeSearch';
import { COLORS } from '../constants/colors';
import { parseOdometerKm } from '../utils/finalizeMileageValidation';
import {
  buildVisitSlotOptions,
  buildPreferredVisitTimes,
  formatPreferredVisitNote,
} from '../utils/shopVisitSlots';
import { navigateToRepairRequestDetail } from '../navigation/webNavigation';
import {
  useScrollContentBottomPaddingWithFooter,
} from '../utils/mobileWebInsets';
import { useTranslation } from '../i18n';

export default function CreateRepairScreen({ navigation, route }) {
  const { t, locale } = useTranslation();
  const insets = useSafeAreaInsets();
  const scrollBottomPadding = useScrollContentBottomPaddingWithFooter(110);
  const { scrolled, onScroll, scrollEventThrottle } = useScrollShadow();
  const handleBack = useServiceCentersBack(navigation);

  const isEditMode = route.params?.mode === 'edit_request';
  const editRepairId = route.params?.repairId ? Number(route.params.repairId) : null;
  const preselectedVehicleId = route.params?.vehicleId?.toString() || '';
  const preselectedShopId = route.params?.shopId
    ? Number(route.params.shopId)
    : route.params?.serviceCenter
      ? Number(route.params.serviceCenter)
      : null;
  const fromVehicleDetail = route.params?.origin === 'VehicleDetail' || route.params?.returnTo === 'VehicleDetail';
  const [vehicles, setVehicles] = useState([]);
  const [repairTypes, setRepairTypes] = useState([]);

  const [vehicleId, setVehicleId] = useState(preselectedVehicleId);
  const [repairTypeId, setRepairTypeId] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [visitDayOffset, setVisitDayOffset] = useState(1);
  const [visitTimeSlot, setVisitTimeSlot] = useState('09:00');
  const [visitExtraNotes, setVisitExtraNotes] = useState('');
  const [availabilityNotes, setAvailabilityNotes] = useState(
    route.params?.availabilityNotes || ''
  );
  const [kilometers, setKilometers] = useState('');
  const [status] = useState('open');
  const [targetingMode, setTargetingMode] = useState(
    preselectedShopId ? 'selected_centers' : route.params?.targetingMode || 'all_qualified'
  );
  const [serviceCenters, setServiceCenters] = useState([]);
  const [selectedCenterIds, setSelectedCenterIds] = useState(() => {
    if (route.params?.selectedCenterIds?.length) {
      return route.params.selectedCenterIds.map((id) => Number(id)).filter((id) => !Number.isNaN(id));
    }
    if (preselectedShopId) return [preselectedShopId];
    return [];
  });
  const [requiresGuarantee, setRequiresGuarantee] = useState(false);
  const [preferredRadiusKm, setPreferredRadiusKm] = useState('');
  const [loadingCenters, setLoadingCenters] = useState(false);
  const [preselectedCenter, setPreselectedCenter] = useState(null);
  const [browseServicesExpanded, setBrowseServicesExpanded] = useState(false);
  const [submitTypeNotice, setSubmitTypeNotice] = useState('');
  const [showAdvancedPreferences, setShowAdvancedPreferences] = useState(false);
  const [centerPickerUnlocked, setCenterPickerUnlocked] = useState(!preselectedShopId);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogMessage, setDialogMessage] = useState('');
  const [selectedMedia, setSelectedMedia] = useState([]);
  const [existingMedia, setExistingMedia] = useState([]);
  const [showVehiclePicker, setShowVehiclePicker] = useState(!preselectedVehicleId);

  useEffect(() => {
    if (route.params) {
      if (route.params.vehicleId) setVehicleId(route.params.vehicleId.toString());
      if (route.params.repairTypeId) setRepairTypeId(route.params.repairTypeId.toString());
      if (route.params.symptoms !== undefined) setSymptoms(route.params.symptoms);
      if (route.params.description !== undefined && !route.params.symptoms) {
        setSymptoms(route.params.description);
      }
      if (route.params.availabilityNotes !== undefined) {
        setAvailabilityNotes(route.params.availabilityNotes);
      }
      if (
        route.params.targetingMode === 'selected_centers' &&
        preselectedShopId &&
        !route.params.selectedCenterIds?.length
      ) {
        setSelectedCenterIds([preselectedShopId]);
      }
      if (route.params.kilometers !== undefined) setKilometers(route.params.kilometers);
      if (route.params.targetingMode) setTargetingMode(route.params.targetingMode);
      if (route.params.selectedCenterIds) setSelectedCenterIds(route.params.selectedCenterIds);
      if (route.params.requiresGuarantee !== undefined) setRequiresGuarantee(!!route.params.requiresGuarantee);
      if (route.params.preferredRadiusKm !== undefined) {
        setPreferredRadiusKm(route.params.preferredRadiusKm ? String(route.params.preferredRadiusKm) : '');
      }
    }
  }, [route.params, preselectedShopId]);

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => String(v.id) === String(vehicleId)),
    [vehicles, vehicleId]
  );

  const selectedRepairType = useMemo(
    () => repairTypes.find((t) => String(t.id) === String(repairTypeId)),
    [repairTypes, repairTypeId]
  );

  const headerServiceCenter = useMemo(() => {
    if (preselectedCenter && !centerPickerUnlocked) return preselectedCenter;
    if (preselectedShopId && selectedCenterIds.length === 1 && serviceCenters.length) {
      return serviceCenters.find((c) => Number(c.id) === Number(selectedCenterIds[0])) || preselectedCenter;
    }
    return preselectedCenter;
  }, [preselectedCenter, centerPickerUnlocked, preselectedShopId, selectedCenterIds, serviceCenters]);

  useEffect(() => {
    if (selectedVehicle) {
      setShowVehiclePicker(false);
    }
  }, [selectedVehicle]);

  useEffect(() => {
    if (isEditMode || !selectedVehicle) return;
    const vk = selectedVehicle.kilometers;
    if (vk != null && vk !== '') {
      setKilometers(String(vk));
    }
  }, [selectedVehicle, isEditMode]);

  const visitDays = useMemo(
    () => buildVisitSlotOptions(null, { maxDays: 14, t, locale }),
    [t, locale]
  );
  const selectedVisitDay = useMemo(
    () => visitDays.find((row) => row.offset === visitDayOffset) || visitDays[0] || null,
    [visitDays, visitDayOffset]
  );
  const visitTimeSlots = selectedVisitDay?.slots?.length ? selectedVisitDay.slots : ['09:00'];

  useEffect(() => {
    if (!visitDays.length) return;
    if (!visitDays.some((row) => row.offset === visitDayOffset)) {
      setVisitDayOffset(visitDays[0].offset);
    }
  }, [visitDays, visitDayOffset]);

  useEffect(() => {
    if (!visitTimeSlots.includes(visitTimeSlot)) {
      setVisitTimeSlot(visitTimeSlots[0]);
    }
  }, [visitTimeSlots, visitTimeSlot]);

  useEffect(() => {
    const slug = route.params?.repairType;
    if (!slug || !repairTypes.length || repairTypeId) return;
    const match = repairTypes.find(
      (t) => t.slug === slug || t.repair_type_slug === slug
    );
    if (match) setRepairTypeId(String(match.id));
  }, [repairTypes, route.params?.repairType, repairTypeId]);

  useEffect(() => {
    if (!preselectedShopId) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        const shop = await getShopById(preselectedShopId, token);
        if (!cancelled) {
          setPreselectedCenter(shop);
          setTargetingMode('selected_centers');
          setSelectedCenterIds([preselectedShopId]);
        }
      } catch (err) {
        console.warn('Failed to load preselected service center', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [preselectedShopId]);

  useEffect(() => {
    const fetchFormData = async () => {
      try {
        const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        const requests = [
          fetch(`${API_BASE_URL}/api/vehicles/`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE_URL}/api/repairs/types/`, { headers: { Authorization: `Bearer ${token}` } }),
        ];
        if (isEditMode && editRepairId) {
          requests.push(getRepairById(token, editRepairId));
        }
        const [vehicleRes, typeRes, editRepair] = await Promise.all(requests);

        if (!vehicleRes.ok || !typeRes.ok) throw new Error('Failed to fetch form data');

        const vehicleData = await vehicleRes.json();
        setVehicles(vehicleData);
        setRepairTypes(await typeRes.json());
        if (isEditMode && editRepair) {
          if (editRepair.status !== 'open') {
            setDialogMessage(t('requestService.onlyOpenEditable'));
            setDialogVisible(true);
            navigation.goBack();
            return;
          }
          setVehicleId(String(editRepair.vehicle || ''));
          setRepairTypeId(editRepair.repair_type != null ? String(editRepair.repair_type) : '');
          const symptomText = [editRepair.symptoms, editRepair.description]
            .map((s) => String(s || '').trim())
            .filter(Boolean)
            .join('\n\n');
          setSymptoms(symptomText);
          setKilometers(editRepair.kilometers != null ? String(editRepair.kilometers) : '');
          setTargetingMode(editRepair.request_targeting_mode || 'all_qualified');
          setSelectedCenterIds(
            Array.isArray(editRepair.preferred_service_centers)
              ? editRepair.preferred_service_centers.map((id) => Number(id)).filter((id) => !Number.isNaN(id))
              : []
          );
          setRequiresGuarantee(!!editRepair.requires_guarantee);
          setPreferredRadiusKm(
            editRepair.preferred_radius_km != null ? String(editRepair.preferred_radius_km) : ''
          );
          setAvailabilityNotes(editRepair.availability_notes || '');
          setVisitExtraNotes(editRepair.availability_notes || '');
          if (editRepair.client_preferred_start) {
            const preferred = new Date(editRepair.client_preferred_start);
            if (!Number.isNaN(preferred.getTime())) {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const preferredDay = new Date(preferred);
              preferredDay.setHours(0, 0, 0, 0);
              const offset = Math.round((preferredDay - today) / (24 * 60 * 60 * 1000));
              setVisitDayOffset(offset);
              setVisitTimeSlot(
                `${preferred.getHours().toString().padStart(2, '0')}:${preferred.getMinutes().toString().padStart(2, '0')}`
              );
            }
          }
          const existing = Array.isArray(editRepair.repair_media)
            ? editRepair.repair_media
            : Array.isArray(editRepair.media)
              ? editRepair.media
              : [];
          setExistingMedia(existing);
          setShowVehiclePicker(false);
        }

        if (!isEditMode && !vehicleId && vehicleData.length > 0) {
          setVehicleId(vehicleData[0].id.toString());
        }
      } catch (err) {
        console.error('? Error:', err);
        setDialogMessage(t('requestService.loadFormError'));
        setDialogVisible(true);
      } finally {
        setLoading(false);
      }
    };
    fetchFormData();
  }, []);

  useEffect(() => {
    const fetchCenters = async () => {
      if (targetingMode !== 'selected_centers') {
        setServiceCenters([]);
        return;
      }
      setLoadingCenters(true);
      try {
        const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        const filters = {};
        if (selectedVehicle?.vehicle_type_code) filters.vehicle_type = selectedVehicle.vehicle_type_code;
        if (selectedRepairType?.slug) filters.repair_type = selectedRepairType.slug;
        const data = await getServiceCenters(filters, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        setServiceCenters(data);
      } catch (err) {
        console.warn('Failed to load service centers for targeting', err);
        setServiceCenters([]);
      } finally {
        setLoadingCenters(false);
      }
    };
    fetchCenters();
  }, [targetingMode, selectedVehicle?.vehicle_type_code, selectedRepairType?.slug]);

  const toggleServiceCenterSelection = (id) => {
    const n = Number(id);
    setSelectedCenterIds((prev) =>
      prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]
    );
  };

  const requestMediaPermission = async () => {
    const { status: perm } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm !== 'granted') {
      Alert.alert(t('requestService.permissionRequired'), t('requestService.permissionMedia'));
      return false;
    }
    return true;
  };

  const addMediaAsset = (asset, mediaType) => {
    const extension = asset?.fileName?.split('.').pop() || (mediaType === 'video' ? 'mp4' : 'jpg');
    const fallbackName = `repair-${mediaType}-${Date.now()}.${extension}`;
    const next = {
      localId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      uri: asset.uri,
      mediaType,
      fileName: asset.fileName || fallbackName,
      mimeType: asset.mimeType || (mediaType === 'video' ? 'video/mp4' : 'image/jpeg'),
    };
    setSelectedMedia((prev) => [...prev, next]);
  };

  const handlePickPhoto = async () => {
    try {
      const allowed = await requestMediaPermission();
      if (!allowed) return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.length) {
        addMediaAsset(result.assets[0], 'image');
      }
    } catch (err) {
      console.error(err);
      Alert.alert(t('common.error'), t('requestService.pickPhotoFailed'));
    }
  };

  const handlePickVideo = async () => {
    try {
      const allowed = await requestMediaPermission();
      if (!allowed) return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false,
        quality: 0.8,
      });
      if (!result.canceled && result.assets?.length) {
        addMediaAsset(result.assets[0], 'video');
      }
    } catch (err) {
      console.error(err);
      Alert.alert(t('common.error'), t('requestService.pickVideoFailed'));
    }
  };

  const removeSelectedMedia = (localId) => {
    setSelectedMedia((prev) => prev.filter((m) => m.localId !== localId));
  };

  const selectRepairType = useCallback((type) => {
    setRepairTypeId(String(type.id));
    setSubmitTypeNotice('');
    setBrowseServicesExpanded(false);
  }, []);

  const clearRepairType = useCallback(() => {
    setRepairTypeId('');
    setSubmitTypeNotice('');
  }, []);

  const handleChangeServiceCenter = useCallback(() => {
    setCenterPickerUnlocked(true);
    setShowAdvancedPreferences(true);
    setTargetingMode('selected_centers');
  }, []);

  const hasServiceCenter = useMemo(() => {
    if (preselectedShopId || targetingMode === 'selected_centers') {
      return selectedCenterIds.length > 0;
    }
    return true;
  }, [preselectedShopId, targetingMode, selectedCenterIds.length]);

  const canSubmit = useMemo(() => {
    if (!vehicleId || saving || !hasServiceCenter) return false;
    const hasRepairType = Boolean(repairTypeId);
    const hasWrittenDetails = Boolean(String(symptoms || '').trim());
    const hasVisit = Boolean(selectedVisitDay && visitTimeSlot);
    return hasVisit && (hasRepairType || hasWrittenDetails);
  }, [
    vehicleId,
    saving,
    hasServiceCenter,
    repairTypeId,
    symptoms,
    selectedVisitDay,
    visitTimeSlot,
  ]);

  const inferredTypePreview = useMemo(() => {
    if (repairTypeId) return null;
    const text = String(symptoms || '').trim();
    if (!text) return null;
    const { type, source } = resolveRepairTypeForSubmit(repairTypes, repairTypeId, text);
    if (!type || source === 'selected') return null;
    return { type, source };
  }, [repairTypes, repairTypeId, symptoms]);

  const handleSubmitRequest = () => {
    if (!vehicleId) {
      setDialogMessage(t('requestService.vehicleRequiredError'));
      setDialogVisible(true);
      return;
    }
    const hasWrittenDetails = Boolean(String(symptoms || '').trim());
    if (!repairTypeId && !hasWrittenDetails) {
      setDialogMessage(t('requestService.describeOrPickType'));
      setDialogVisible(true);
      return;
    }
    if (targetingMode === 'selected_centers' && selectedCenterIds.length === 0) {
      setDialogMessage(t('requestService.selectCenterOrMode'));
      setDialogVisible(true);
      return;
    }

    const resolved = resolveRepairTypeForSubmit(repairTypes, repairTypeId, symptoms);
    if (!repairTypeId && resolved.type) {
      if (resolved.source === 'matched') {
        setSubmitTypeNotice(t('requestService.classifyAs', { name: resolved.type.name }));
      } else if (resolved.source === 'default') {
        setSubmitTypeNotice(
          t('requestService.noTypeSelected', { name: resolved.type.name })
        );
      }
    } else {
      setSubmitTypeNotice('');
    }

    saveRepair(resolved.type?.id || repairTypeId);
  };

  const resolveKilometersForApi = () => {
    const vk = parseOdometerKm(selectedVehicle?.kilometers);
    if (vk != null) return vk;
    const fromInput = parseOdometerKm(kilometers);
    return fromInput != null ? fromInput : 0;
  };

  const saveRepair = async (resolvedTypeId = null) => {
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const shopProfileId = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_SHOP_ID);
      const kmForApi = resolveKilometersForApi();
      const preferredTimes = buildPreferredVisitTimes(selectedVisitDay, visitTimeSlot);
      const preferredNote = formatPreferredVisitNote(selectedVisitDay, visitTimeSlot, t);
      const extraNotes = String(visitExtraNotes || availabilityNotes || '').trim();
      const availabilityText = [preferredNote, extraNotes && extraNotes !== preferredNote ? extraNotes : '']
        .filter(Boolean)
        .join('. ');

      const typeIdForApi = resolvedTypeId || repairTypeId || selectedRepairType?.id;
      const parsedVehicleId = parseInt(vehicleId, 10);
      if (!Number.isFinite(parsedVehicleId)) {
        throw new Error(t('requestService.vehicleRequiredError'));
      }

      const symptomText = String(symptoms || '').trim();

      const body = {
        repair_type: typeIdForApi ? parseInt(String(typeIdForApi), 10) : null,
        description: '',
        symptoms: symptomText,
        kilometers: kmForApi,
        status,
        request_targeting_mode: targetingMode,
        preferred_service_centers:
          targetingMode === 'selected_centers' ? selectedCenterIds : [],
        requires_guarantee: requiresGuarantee,
        preferred_radius_km: preferredRadiusKm ? parseInt(preferredRadiusKm, 10) : null,
        availability_notes: availabilityText || null,
        client_preferred_start: preferredTimes.start,
        client_preferred_end: preferredTimes.end,
        repair_parts_data: [],
      };
      if (!isEditMode) {
        body.vehicle = parsedVehicleId;
        body.source = 'marketplace_request';
        body.status = 'open';
      }

      const isShop = await AsyncStorage.getItem('@is_shop');
      if (isShop === 'true' && shopProfileId) {
        body.shop_profile_id = parseInt(shopProfileId);
      }

      let savedRepairId = editRepairId;
      if (isEditMode && editRepairId) {
        const editPayload = { ...body };
        delete editPayload.status;
        delete editPayload.repair_parts_data;
        delete editPayload.shop_profile_id;
        delete editPayload.vehicle;
        try {
          await updateRepair(token, editRepairId, editPayload);
        } catch (patchErr) {
          console.warn('Edit payload rejected, retrying minimal payload', patchErr?.responseText || patchErr?.message);
          const minimalPayload = {
            repair_type: editPayload.repair_type,
            description: editPayload.description,
            symptoms: editPayload.symptoms,
            request_targeting_mode: editPayload.request_targeting_mode,
            requires_guarantee: editPayload.requires_guarantee,
            preferred_radius_km: editPayload.preferred_radius_km,
            kilometers: editPayload.kilometers,
          };
          if (Array.isArray(editPayload.preferred_service_centers)) {
            minimalPayload.preferred_service_centers = editPayload.preferred_service_centers;
          }
          await updateRepair(token, editRepairId, minimalPayload);
        }
      } else {
        const createdRepair = await createRepair(token, body);
        savedRepairId = createdRepair?.id;
      }

      let mediaUploadFailed = false;
      if (savedRepairId && selectedMedia.length > 0) {
        const uploadResults = await Promise.allSettled(
          selectedMedia.map((item) => uploadRepairMedia(token, savedRepairId, item))
        );
        mediaUploadFailed = uploadResults.some((r) => r.status === 'rejected');
      }

      setDialogMessage(
        mediaUploadFailed
          ? (isEditMode ? t('requestService.requestUpdatedMediaFailed') : t('requestService.repairCreatedMediaFailed'))
          : (isEditMode ? t('requestService.requestUpdated') : t('requestService.repairCreated'))
      );
      setDialogVisible(true);

      setTimeout(() => {
        setDialogVisible(false);
        const returnTo = route.params?.returnTo;
        const origin = route.params?.origin;
        const parsedVehicleId = parseInt(vehicleId, 10);

        if (isEditMode && savedRepairId) {
          navigateToRepairRequestDetail(navigation, savedRepairId, {
            returnTo: 'ClientRepairs',
            backLabel: t('requestService.backRequests'),
          });
          return;
        }
        if (returnTo === 'VehicleDetail' || origin === 'VehicleDetail') {
          navigation.navigate('VehicleDetail', { vehicleId: parsedVehicleId });
          return;
        }

        if ((returnTo === 'ClientRepairs' || origin === 'ClientRepairs') && parsedVehicleId) {
          navigation.navigate('ClientRepairs', {
            vehicleId: parsedVehicleId,
            fromVehicleDetail: true,
          });
          return;
        }

        if ((returnTo === 'ShopDetail' || origin === 'ShopDetail') && route.params?.shopId) {
          navigation.navigate('ShopDetail', { shopId: route.params.shopId });
          return;
        }

        if (savedRepairId) {
          const shopId = preselectedShopId || route.params?.shopId;
          if (shopId) {
            navigateToRepairRequestDetail(navigation, savedRepairId, {
              returnTo: 'ShopDetail',
              shopId,
              backLabel: t('requestService.backServiceCenter'),
            });
          } else {
            navigateToRepairRequestDetail(navigation, savedRepairId, {
              returnTo: 'ClientRepairs',
              backLabel: t('requestService.backDashboard'),
            });
          }
          return;
        }

        if (navigation.canGoBack()) {
          navigation.goBack();
          return;
        }
        navigation.navigate('Home');
      }, 1500);
    } catch (err) {
      console.error('Save Error:', err);
      if (__DEV__) {
        console.warn('Repair request payload debug:', {
          vehicleId,
          repairTypeId: typeIdForApi,
          selectedRepairTypeId: selectedRepairType?.id,
          responseText: err?.responseText,
        });
      }
      setDialogMessage(err.message || t('requestService.submissionFailed'));
      setDialogVisible(true);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <ActivityIndicator animating={true} size="large" style={{ flex: 1 }} />;
  }

  return (
    <ScreenBackground safeArea={false}>
      <View style={styles.root}>
        <AppNavigationBar
          title={isEditMode ? t('requestService.editTitle') : t('repairs.requestService')}
          backLabel={t('common.back')}
          onBack={handleBack}
          scrolled={scrolled}
        />
        <KeyboardAwareScrollView
          onScroll={onScroll}
          scrollEventThrottle={scrollEventThrottle}
          contentContainerStyle={[
            styles.container,
            { paddingTop: 12, paddingBottom: scrollBottomPadding },
          ]}
          keyboardShouldPersistTaps="always"
        >
          <RepairRequestHeader
            serviceCenter={headerServiceCenter}
            selectedVehicle={selectedVehicle}
            onChangeVehicle={() => setShowVehiclePicker((prev) => !prev)}
            onChangeServiceCenter={preselectedShopId ? handleChangeServiceCenter : null}
            showVehiclePicker={showVehiclePicker}
            isEditMode={isEditMode}
          />

          {!isEditMode && (!selectedVehicle || showVehiclePicker) ? (
            <FloatingCard>
              <Text variant="labelLarge" style={styles.label}>{t('requestService.vehicleRequired')}</Text>
              <View style={styles.pickerContainer}>
                <Picker selectedValue={vehicleId} onValueChange={setVehicleId} style={styles.picker}>
                  {vehicles.map((v) => (
                    <Picker.Item
                      key={v.id}
                      label={`${v.license_plate} (${v.make_name} ${v.model_name})`}
                      value={v.id.toString()}
                    />
                  ))}
                </Picker>
              </View>
            </FloatingCard>
          ) : null}

          <FloatingCard>
            <RepairProblemInput
              value={symptoms}
              onChangeText={setSymptoms}
              repairTypes={repairTypes}
              selectedTypeId={repairTypeId}
              onSelectType={selectRepairType}
            />
          </FloatingCard>

          <FloatingCard>
            <RepairPopularServices
              repairTypes={repairTypes}
              selectedTypeId={repairTypeId}
              onSelectType={selectRepairType}
            />
            <SelectedServicePill repairType={selectedRepairType} onChange={clearRepairType} />
            <RepairServicePicker
              repairTypes={repairTypes}
              selectedTypeId={repairTypeId}
              onSelectType={selectRepairType}
              expanded={browseServicesExpanded}
              onToggleExpanded={() => setBrowseServicesExpanded((prev) => !prev)}
            />
            {inferredTypePreview && !selectedRepairType ? (
              <Text style={styles.inferredTypeNotice}>
                {inferredTypePreview.source === 'matched'
                  ? t('requestService.inferredMatched', { name: inferredTypePreview.type.name })
                  : t('requestService.inferredDefault', { name: inferredTypePreview.type.name })}
              </Text>
            ) : null}
          </FloatingCard>

          <FloatingCard>
            <RepairMediaSection
              selectedMedia={selectedMedia}
              onPickPhoto={handlePickPhoto}
              onPickVideo={handlePickVideo}
              onRemoveMedia={removeSelectedMedia}
              existingMedia={existingMedia}
              isEditMode={isEditMode}
            />
          </FloatingCard>

          <FloatingCard>
            <PreferredVisitPicker
              visitDays={visitDays}
              visitDayOffset={visitDayOffset}
              onDayChange={setVisitDayOffset}
              visitTimeSlots={visitTimeSlots}
              visitTimeSlot={visitTimeSlot}
              onTimeChange={setVisitTimeSlot}
              selectedVisitDay={selectedVisitDay}
            />
            <TextInput
              mode="outlined"
              value={visitExtraNotes}
              onChangeText={setVisitExtraNotes}
              placeholder={t('requestService.extraTimingNotes')}
              style={styles.input}
              multiline
            />
            {submitTypeNotice ? (
              <Text style={styles.submitTypeNotice}>{submitTypeNotice}</Text>
            ) : null}

            {fromVehicleDetail && selectedVehicle ? (
              <View style={styles.optionalKmInline}>
                <Text variant="labelLarge" style={styles.label}>{t('requestService.kilometersOptional')}</Text>
                <TextInput
                  mode="outlined"
                  value={kilometers}
                  onChangeText={setKilometers}
                  placeholder={
                    selectedVehicle.kilometers != null && selectedVehicle.kilometers !== ''
                      ? t('requestService.kilometersShownOnVehicle', {
                          km: Number(selectedVehicle.kilometers).toLocaleString(),
                        })
                      : t('requestService.kilometersCurrentOdometer')
                  }
                  keyboardType="numeric"
                  style={styles.input}
                />
              </View>
            ) : null}
          </FloatingCard>

          <FloatingCard>
            <Pressable
              onPress={() => setShowAdvancedPreferences((prev) => !prev)}
              style={styles.preferencesToggle}
            >
              <Text variant="titleMedium" style={styles.sectionTitle}>
                {t('requestService.routingPreferences')}
              </Text>
              <Text style={styles.preferencesToggleHint}>
                {showAdvancedPreferences ? t('requestService.hideAdvanced') : t('requestService.showAdvanced')}
              </Text>
            </Pressable>

            {showAdvancedPreferences || centerPickerUnlocked ? (
              <>
                <Text style={styles.sectionHint}>
                  {t('requestService.routingHint')}
                </Text>
                <Text variant="labelLarge" style={styles.label}>{t('requestService.whoReceives')}</Text>
                <View style={styles.targetingList}>
                  {[
                    { value: 'all_qualified', label: t('requestService.targetingAllQualified') },
                    { value: 'selected_centers', label: t('requestService.targetingSelected') },
                    { value: 'verified_only', label: t('requestService.targetingVerified') },
                    { value: 'operator_assisted', label: t('requestService.targetingOperator') },
                  ].map((opt) => {
                    const selected = targetingMode === opt.value;
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() => setTargetingMode(opt.value)}
                        style={[styles.targetingOption, selected && styles.targetingOptionSelected]}
                      >
                        <Text style={[styles.targetingOptionText, selected && styles.targetingOptionTextSelected]}>
                          {opt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {targetingMode === 'selected_centers' ? (
                  <View style={styles.centerBlock}>
                    <Text style={styles.centerLabel}>{t('requestService.preferredCenters')}</Text>
                    {loadingCenters ? (
                      <ActivityIndicator size="small" />
                    ) : serviceCenters.length ? (
                      <View style={styles.centerChipsWrap}>
                        {serviceCenters.map((c) => {
                          const selected = selectedCenterIds.includes(Number(c.id));
                          return (
                            <Pressable
                              key={c.id}
                              onPress={() => toggleServiceCenterSelection(c.id)}
                              style={[styles.centerChip, selected && styles.centerChipSelected]}
                            >
                              <Text style={[styles.centerChipText, selected && styles.centerChipTextSelected]}>
                                {c.name || t('requestService.serviceCenterFallback', { id: c.id })}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    ) : (
                      <Text style={styles.emptySmall}>
                        {t('requestService.noMatchingCenters')}
                      </Text>
                    )}
                  </View>
                ) : null}

                <Pressable
                  onPress={() => setRequiresGuarantee((prev) => !prev)}
                  style={[styles.guaranteeCard, requiresGuarantee && styles.guaranteeCardSelected]}
                >
                  <Text style={[styles.guaranteeTitle, requiresGuarantee && styles.guaranteeTitleSelected]}>
                    {t('requestService.guaranteeTitle')}
                  </Text>
                  <Text style={[styles.guaranteeHelper, requiresGuarantee && styles.guaranteeHelperSelected]}>
                    {t('requestService.guaranteeHelper')}
                  </Text>
                  <View style={styles.guaranteeStateRow}>
                    <Text style={[styles.guaranteeStateText, requiresGuarantee && styles.guaranteeStateTextSelected]}>
                      {requiresGuarantee ? t('requestService.enabled') : t('requestService.disabled')}
                    </Text>
                    <Button
                      mode={requiresGuarantee ? 'contained-tonal' : 'outlined'}
                      compact
                      onPress={() => setRequiresGuarantee((prev) => !prev)}
                    >
                      {requiresGuarantee ? t('requestService.turnOff') : t('requestService.turnOn')}
                    </Button>
                  </View>
                </Pressable>
                <Text variant="labelLarge" style={styles.label}>{t('requestService.preferredRadius')}</Text>
                <TextInput
                  mode="outlined"
                  value={preferredRadiusKm}
                  onChangeText={setPreferredRadiusKm}
                  keyboardType="numeric"
                  placeholder={t('requestService.radiusPlaceholder')}
                  style={styles.input}
                />
              </>
            ) : (
              <Text style={styles.sectionHint}>
                {t('requestService.routingDefaultsHint')}
              </Text>
            )}
          </FloatingCard>

          {!(fromVehicleDetail && selectedVehicle) ? (
            <FloatingCard>
              <Text variant="titleMedium" style={styles.sectionTitle}>{t('vehicles.vehicleDetails')}</Text>
              <Text variant="labelLarge" style={styles.label}>{t('requestService.kilometersOptional')}</Text>
              <TextInput
                mode="outlined"
                value={kilometers}
                onChangeText={setKilometers}
                placeholder={t('requestService.kilometersPlaceholder')}
                keyboardType="numeric"
                style={styles.input}
              />
              <Text style={styles.sectionHint}>
                {t('requestService.kilometersHint')}
              </Text>
            </FloatingCard>
          ) : null}
        </KeyboardAwareScrollView>

        <View style={[styles.bottomActionBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          <Button
            mode="contained"
            onPress={handleSubmitRequest}
            loading={saving}
            disabled={!canSubmit}
            style={styles.sendButton}
            contentStyle={styles.sendButtonContent}
          >
            {isEditMode ? t('requestService.saveChanges') : t('repairs.sendRequest')}
          </Button>
        </View>
      </View>

      <Portal>
        <Dialog
          visible={dialogVisible}
          onDismiss={() => setDialogVisible(false)}
        >
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
  root: {
    flex: 1,
  },
  container: {
    padding: 12,
    gap: 8,
  },
  sectionTitle: {
    color: COLORS.TEXT_DARK,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionHint: {
    color: COLORS.TEXT_MUTED,
    marginBottom: 10,
  },
  inferredTypeNotice: {
    marginTop: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    color: '#1e40af',
    fontSize: 13,
    lineHeight: 19,
  },
  submitTypeNotice: {
    marginTop: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    color: '#166534',
    fontSize: 13,
    lineHeight: 19,
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
  preferencesToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  preferencesToggleHint: {
    color: COLORS.PRIMARY,
    fontWeight: '600',
    fontSize: 13,
  },
  targetingList: {
    marginTop: 6,
    gap: 8,
    marginBottom: 8,
  },
  targetingOption: {
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.25)',
    backgroundColor: 'rgba(37,99,235,0.06)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  targetingOptionSelected: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: COLORS.PRIMARY,
  },
  targetingOptionText: {
    color: '#1e3a8a',
    fontWeight: '600',
  },
  targetingOptionTextSelected: {
    color: '#fff',
  },
  optionalKmInline: {
    marginBottom: 8,
  },
  centerBlock: {
    marginTop: 6,
  },
  centerLabel: {
    fontWeight: '600',
    color: COLORS.TEXT_DARK,
    marginBottom: 8,
  },
  centerChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  centerChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.25)',
    backgroundColor: 'rgba(37,99,235,0.07)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 6,
  },
  centerChipSelected: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  centerChipText: {
    color: '#1e3a8a',
    fontSize: 12,
    fontWeight: '600',
  },
  centerChipTextSelected: {
    color: '#fff',
  },
  guaranteeCard: {
    marginTop: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.2)',
    borderRadius: 12,
    padding: 12,
    backgroundColor: 'rgba(37,99,235,0.06)',
  },
  guaranteeCardSelected: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: 'rgba(37,99,235,0.14)',
  },
  guaranteeTitle: {
    color: COLORS.TEXT_DARK,
    fontWeight: '700',
    marginBottom: 4,
  },
  guaranteeTitleSelected: {
    color: '#1e3a8a',
  },
  guaranteeHelper: {
    color: COLORS.TEXT_MUTED,
    fontSize: 12,
    marginBottom: 8,
  },
  guaranteeHelperSelected: {
    color: '#1e40af',
  },
  guaranteeStateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  guaranteeStateText: {
    color: COLORS.TEXT_MUTED,
    fontWeight: '700',
    fontSize: 12,
  },
  guaranteeStateTextSelected: {
    color: '#1e3a8a',
  },
  emptySmall: {
    color: COLORS.TEXT_MUTED,
    marginTop: 6,
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
  sendButton: {
    borderRadius: 12,
  },
  sendButtonContent: {
    minHeight: 48,
  },
});
