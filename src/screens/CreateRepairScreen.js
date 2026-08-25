/**
 * PATH: src/screens/CreateRepairScreen.js
 * Marketplace Request Service — WizardEngine (same chrome as Log Service Record).
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { StyleSheet, View, Alert } from 'react-native';
import ScreenBackground from '../components/ScreenBackground';
import AppNavigationBar from '../components/common/AppNavigationBar';
import { useServiceCentersBack } from '../navigation/appNavBarBack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import {
  Text,
  Button,
  ActivityIndicator,
  Portal,
  Dialog,
} from 'react-native-paper';

import { API_BASE_URL } from '../api/config';
import { createRepair, getRepairById, updateRepair, uploadRepairMedia } from '../api/repairs';
import { getServiceCenters } from '../api/serviceCenters';
import { getShopById } from '../api/shops';
import { listOrgFleet } from '../api/fleet';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { resolveActiveOrganizationId } from '../utils/orgWorkspace';
import { resolveRepairTypeForSubmit } from '../utils/repairTypeSearch';
import { parseOdometerKm } from '../utils/finalizeMileageValidation';
import {
  buildVisitSlotOptions,
  buildPreferredVisitTimes,
  formatPreferredVisitNote,
} from '../utils/shopVisitSlots';
import { navigateToRepairRequestDetail } from '../navigation/webNavigation';
import { useTranslation } from '../i18n';
import { WizardEngine, createMemoryAdapter } from '../wizard';
import {
  RepairRequestVehicleStep,
  RepairRequestProblemStep,
  RepairRequestPhotosStep,
  RepairRequestWhenStep,
  RepairRequestRoutingStep,
} from './repairRequest/RepairRequestWizardSteps';

export default function CreateRepairScreen({ navigation, route }) {
  const { t, locale } = useTranslation();
  const handleBack = useServiceCentersBack(navigation);

  const isEditMode = route.params?.mode === 'edit_request';
  const editRepairId = route.params?.repairId ? Number(route.params.repairId) : null;
  const preselectedVehicleId = route.params?.vehicleId?.toString() || '';
  const organizationIdParam =
    route.params?.organizationId || route.params?.orgId || null;
  const preselectedShopId = route.params?.shopId
    ? Number(route.params.shopId)
    : route.params?.serviceCenter
      ? Number(route.params.serviceCenter)
      : null;
  const [vehicles, setVehicles] = useState([]);
  const [repairTypes, setRepairTypes] = useState([]);
  const [fleetOrganizationId, setFleetOrganizationId] = useState(
    organizationIdParam != null ? String(organizationIdParam) : null,
  );

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
        const orgId = organizationIdParam
          ? await resolveActiveOrganizationId(organizationIdParam)
          : null;
        if (orgId) setFleetOrganizationId(String(orgId));
        else setFleetOrganizationId(null);

        const loadPersonalVehicles = async () => {
          const vehicleRes = await fetch(`${API_BASE_URL}/api/vehicles/`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!vehicleRes.ok) throw new Error('Failed to fetch form data');
          return vehicleRes.json();
        };

        const loadFleetVehicles = async (organizationId) => {
          const data = await listOrgFleet(token, organizationId, {});
          const rows = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : [];
          return rows.map((row) => ({
            id: row.id,
            license_plate: row.license_plate || '',
            make_name: '',
            model_name: row.display_name || row.fleet_id || '',
            display_name: row.display_name || '',
            kilometers: row.kilometers,
            vehicle_type_code: row.vehicle_type_code,
            managing_organization_id: organizationId,
          }));
        };

        const requests = [
          orgId ? loadFleetVehicles(orgId) : loadPersonalVehicles(),
          fetch(`${API_BASE_URL}/api/repairs/types/`, { headers: { Authorization: `Bearer ${token}` } }),
        ];
        if (isEditMode && editRepairId) {
          requests.push(getRepairById(token, editRepairId));
        }
        const [vehicleData, typeRes, editRepair] = await Promise.all(requests);

        if (!typeRes.ok) throw new Error('Failed to fetch form data');

        setVehicles(Array.isArray(vehicleData) ? vehicleData : []);
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

        if (!isEditMode && !vehicleId && Array.isArray(vehicleData) && vehicleData.length > 0) {
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
        setServiceCenters(Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : []);
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
    setTargetingMode('selected_centers');
  }, []);

  const inferredTypePreview = useMemo(() => {
    if (repairTypeId) return null;
    const text = String(symptoms || '').trim();
    if (!text) return null;
    const { type, source } = resolveRepairTypeForSubmit(repairTypes, repairTypeId, text);
    if (!type || source === 'selected') return null;
    return { type, source };
  }, [repairTypes, repairTypeId, symptoms]);

  const handleSubmitRequest = async () => {
    if (saving) return;
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

        if (
          (returnTo === 'OrgFleetVehicleDetail' || origin === 'OrgFleetVehicleDetail') &&
          parsedVehicleId &&
          route.params?.organizationId
        ) {
          navigation.navigate('OrgFleetVehicleDetail', {
            organizationId: route.params.organizationId,
            vehicleId: parsedVehicleId,
          });
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

  const validateVehicleStep = useCallback(() => {
    if (!vehicleId) {
      return { ok: false, message: t('requestService.vehicleRequiredError') };
    }
    return { ok: true };
  }, [t, vehicleId]);

  const validateProblemStep = useCallback(() => {
    const hasRepairType = Boolean(repairTypeId);
    const hasWrittenDetails = Boolean(String(symptoms || '').trim());
    if (!hasRepairType && !hasWrittenDetails) {
      return { ok: false, message: t('requestService.describeOrPickType') };
    }
    return { ok: true };
  }, [repairTypeId, symptoms, t]);

  const validateWhenStep = useCallback(() => {
    if (!selectedVisitDay || !visitTimeSlot) {
      return { ok: false, message: t('requestService.preferredVisitHint') };
    }
    return { ok: true };
  }, [selectedVisitDay, t, visitTimeSlot]);

  const validateRoutingStep = useCallback(() => {
    if (targetingMode === 'selected_centers' && selectedCenterIds.length === 0) {
      return { ok: false, message: t('requestService.selectCenterOrMode') };
    }
    return { ok: true };
  }, [selectedCenterIds.length, t, targetingMode]);

  const formContext = useMemo(
    () => ({
      navigation,
      isEditMode,
      fleetOrganizationId,
      vehicles,
      vehicleId,
      setVehicleId,
      selectedVehicle,
      showVehiclePicker,
      setShowVehiclePicker,
      headerServiceCenter,
      preselectedShopId,
      handleChangeServiceCenter,
      symptoms,
      setSymptoms,
      repairTypes,
      repairTypeId,
      selectedRepairType,
      selectRepairType,
      clearRepairType,
      browseServicesExpanded,
      setBrowseServicesExpanded,
      inferredTypePreview,
      selectedMedia,
      handlePickPhoto,
      handlePickVideo,
      removeSelectedMedia,
      existingMedia,
      visitDays,
      visitDayOffset,
      setVisitDayOffset,
      visitTimeSlots,
      visitTimeSlot,
      setVisitTimeSlot,
      selectedVisitDay,
      visitExtraNotes,
      setVisitExtraNotes,
      kilometers,
      setKilometers,
      targetingMode,
      setTargetingMode,
      loadingCenters,
      serviceCenters,
      selectedCenterIds,
      toggleServiceCenterSelection,
      requiresGuarantee,
      setRequiresGuarantee,
      preferredRadiusKm,
      setPreferredRadiusKm,
      submitTypeNotice,
    }),
    [
      browseServicesExpanded,
      clearRepairType,
      existingMedia,
      fleetOrganizationId,
      handleChangeServiceCenter,
      handlePickPhoto,
      handlePickVideo,
      headerServiceCenter,
      inferredTypePreview,
      isEditMode,
      kilometers,
      loadingCenters,
      navigation,
      preferredRadiusKm,
      preselectedShopId,
      removeSelectedMedia,
      repairTypeId,
      repairTypes,
      requiresGuarantee,
      selectRepairType,
      selectedCenterIds,
      selectedMedia,
      selectedRepairType,
      selectedVehicle,
      selectedVisitDay,
      serviceCenters,
      showVehiclePicker,
      submitTypeNotice,
      symptoms,
      targetingMode,
      vehicleId,
      vehicles,
      visitDayOffset,
      visitDays,
      visitExtraNotes,
      visitTimeSlot,
      visitTimeSlots,
    ],
  );

  const wizardSteps = useMemo(
    () => [
      {
        id: 'vehicle',
        titleKey: 'requestServiceWizard.vehicleTitle',
        title: 'Vehicle',
        validate: () => validateVehicleStep(),
        Component: RepairRequestVehicleStep,
      },
      {
        id: 'problem',
        titleKey: 'requestServiceWizard.problemTitle',
        title: 'Problem',
        validate: () => validateProblemStep(),
        Component: RepairRequestProblemStep,
      },
      {
        id: 'photos',
        titleKey: 'requestServiceWizard.photosTitle',
        title: 'Photos',
        optional: true,
        Component: RepairRequestPhotosStep,
      },
      {
        id: 'when',
        titleKey: 'requestServiceWizard.whenTitle',
        title: 'Visit',
        validate: () => validateWhenStep(),
        Component: RepairRequestWhenStep,
      },
      {
        id: 'routing',
        titleKey: 'requestServiceWizard.routingTitle',
        title: 'Routing',
        validate: () => validateRoutingStep(),
        Component: RepairRequestRoutingStep,
      },
    ],
    [validateProblemStep, validateRoutingStep, validateVehicleStep, validateWhenStep],
  );

  const adapter = useMemo(() => createMemoryAdapter({}), []);

  const onWizardFinish = useCallback(async () => {
    await handleSubmitRequest();
  }, [handleSubmitRequest]);

  if (loading) {
    return <ActivityIndicator animating size="large" style={{ flex: 1 }} />;
  }

  return (
    <ScreenBackground safeArea={false}>
      <View style={styles.root}>
        <AppNavigationBar
          title={isEditMode ? t('requestService.editTitle') : t('repairs.requestService')}
          backLabel={t('common.back')}
          onBack={handleBack}
        />
        <WizardEngine
          steps={wizardSteps}
          adapter={adapter}
          context={formContext}
          onFinish={onWizardFinish}
          onExit={handleBack}
          showFinishLater={false}
          finishLabelKey={isEditMode ? 'requestService.saveChanges' : 'repairs.sendRequest'}
        />
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
});
