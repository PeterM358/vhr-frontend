/**
 * PATH: src/screens/CreateRepairScreen.js
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Alert,
  Pressable,
  Image,
} from 'react-native';
import ScreenBackground from '../components/ScreenBackground';
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
  IconButton,
} from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

import { API_BASE_URL } from '../api/config';
import { createRepair, getRepairById, updateRepair, uploadRepairMedia } from '../api/repairs';
import { getServiceCenters } from '../api/serviceCenters';
import { STORAGE_KEYS } from '../constants/storageKeys';
import FloatingCard from '../components/ui/FloatingCard';
import EmptyStateCard from '../components/ui/EmptyStateCard';
import { COLORS } from '../constants/colors';
import { parseOdometerKm } from '../utils/finalizeMileageValidation';
import {
  buildVisitSlotOptions,
  buildPreferredVisitTimes,
  formatPreferredVisitNote,
} from '../utils/shopVisitSlots';



export default function CreateRepairScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();

  const isEditMode = route.params?.mode === 'edit_request';
  const editRepairId = route.params?.repairId ? Number(route.params.repairId) : null;
  const preselectedVehicleId = route.params?.vehicleId?.toString() || '';
  const preselectedShopId = route.params?.shopId
    ? Number(route.params.shopId)
    : route.params?.serviceCenter
      ? Number(route.params.serviceCenter)
      : null;
  const fromVehicleDetail = route.params?.origin === 'VehicleDetail' || route.params?.returnTo === 'VehicleDetail';
  const fromShopDetail = route.params?.origin === 'ShopDetail' || route.params?.returnTo === 'ShopDetail';
  const [vehicles, setVehicles] = useState([]);
  const [repairTypes, setRepairTypes] = useState([]);

  const [vehicleId, setVehicleId] = useState(preselectedVehicleId);
  const [repairTypeId, setRepairTypeId] = useState('');
  const [serviceCategorySlug, setServiceCategorySlug] = useState('');
  const [description, setDescription] = useState('');
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
    route.params?.targetingMode || 'all_qualified'
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

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogMessage, setDialogMessage] = useState('');
  const [selectedMedia, setSelectedMedia] = useState([]);
  const [existingMedia, setExistingMedia] = useState([]);
  const [showVehiclePicker, setShowVehiclePicker] = useState(!preselectedVehicleId);

  // Restore state when returning from related flows
  useEffect(() => {
    if (route.params) {
      if (route.params.vehicleId) setVehicleId(route.params.vehicleId.toString());
      if (route.params.repairTypeId) setRepairTypeId(route.params.repairTypeId.toString());
      if (route.params.serviceCategorySlug !== undefined) setServiceCategorySlug(route.params.serviceCategorySlug);
      if (route.params.description !== undefined) setDescription(route.params.description);
      if (route.params.symptoms !== undefined) setSymptoms(route.params.symptoms);
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
  }, [route.params]);

  const selectedVehicle = useMemo(
    () => vehicles.find((v) => String(v.id) === String(vehicleId)),
    [vehicles, vehicleId]
  );

  const selectedRepairType = useMemo(
    () => repairTypes.find((t) => String(t.id) === String(repairTypeId)),
    [repairTypes, repairTypeId]
  );

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

  useEffect(() => {
    navigation.setOptions({
      title: isEditMode ? 'Edit Request' : 'Request Service',
      headerRight: () => null,
    });
  }, [navigation, isEditMode]);

  const categoryOptions = useMemo(() => {
    const map = {};
    repairTypes.forEach((t) => {
      const slug = t.category_slug;
      const name = t.category_name || slug;
      if (slug && name && !map[slug]) map[slug] = name;
    });
    return Object.entries(map)
      .map(([slug, name]) => ({ slug, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [repairTypes]);

  const filteredRepairTypes = useMemo(() => {
    const rows = serviceCategorySlug
      ? repairTypes.filter((t) => t.category_slug === serviceCategorySlug)
      : repairTypes;
    return [...rows].sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
  }, [repairTypes, serviceCategorySlug]);

  const visitDays = useMemo(() => buildVisitSlotOptions(null, { maxDays: 14 }), []);
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

  // Initial data load
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
            setDialogMessage('Only open requests can be edited.');
            setDialogVisible(true);
            navigation.goBack();
            return;
          }
          setVehicleId(String(editRepair.vehicle || ''));
          setRepairTypeId(editRepair.repair_type != null ? String(editRepair.repair_type) : '');
          setDescription(editRepair.description || '');
          setSymptoms(editRepair.symptoms || '');
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
        setDialogMessage('Error loading form data');
        setDialogVisible(true);
      } finally {
        setLoading(false);
      }
    };
    fetchFormData();
  }, []);

  useEffect(() => {
    if (!repairTypeId) return;
    if (!filteredRepairTypes.some((t) => String(t.id) === String(repairTypeId))) {
      setRepairTypeId('');
    }
  }, [filteredRepairTypes, repairTypeId]);

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
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Allow access to photos/videos to attach media.');
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
      Alert.alert('Error', 'Failed to pick photo.');
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
      Alert.alert('Error', 'Failed to pick video.');
    }
  };

  const removeSelectedMedia = (localId) => {
    setSelectedMedia((prev) => prev.filter((m) => m.localId !== localId));
  };

  const selectServiceCategory = (slug) => {
    setServiceCategorySlug(slug);
  };

  const selectRepairType = (type) => {
    setRepairTypeId(String(type.id));
    if (type.category_slug) {
      setServiceCategorySlug(type.category_slug);
    }
  };

  const resolvedRepairTypeId = useMemo(() => {
    if (repairTypeId) return repairTypeId;
    return '';
  }, [repairTypeId]);

  const handleSubmitRequest = () => {
    if (!vehicleId) {
      setDialogMessage('Vehicle is required.');
      setDialogVisible(true);
      return;
    }
    const typeId = resolvedRepairTypeId || selectedRepairType?.id;
    const hasRepairType = Boolean(typeId);
    const hasWrittenDetails =
      Boolean(String(description || '').trim()) || Boolean(String(symptoms || '').trim());
    const hasMedia = selectedMedia.length > 0;
    if (!hasRepairType && !hasWrittenDetails && !hasMedia) {
      setDialogMessage(
        'Select a service type (e.g. Oil change), or add symptoms or photos so shops understand the request.'
      );
      setDialogVisible(true);
      return;
    }
    if (targetingMode === 'selected_centers' && selectedCenterIds.length === 0) {
      setDialogMessage('Select at least one service center or choose another targeting mode.');
      setDialogVisible(true);
      return;
    }
    saveRepair();
  };

  const resolveKilometersForApi = () => {
    const vk = parseOdometerKm(selectedVehicle?.kilometers);
    if (vk != null) return vk;
    const fromInput = parseOdometerKm(kilometers);
    return fromInput != null ? fromInput : 0;
  };

  // Save service request intake
  const saveRepair = async () => {
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const shopProfileId = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_SHOP_ID);
      const kmForApi = resolveKilometersForApi();
      const preferredTimes = buildPreferredVisitTimes(selectedVisitDay, visitTimeSlot);
      const preferredNote = formatPreferredVisitNote(selectedVisitDay, visitTimeSlot);
      const extraNotes = String(visitExtraNotes || availabilityNotes || '').trim();
      const availabilityText = [preferredNote, extraNotes && extraNotes !== preferredNote ? extraNotes : '']
        .filter(Boolean)
        .join('. ');

      const typeIdForApi = resolvedRepairTypeId || selectedRepairType?.id;
      const parsedVehicleId = parseInt(vehicleId, 10);
      if (!Number.isFinite(parsedVehicleId)) {
        throw new Error('Vehicle is required.');
      }

      const body = {
        repair_type: typeIdForApi ? parseInt(String(typeIdForApi), 10) : null,
        description: String(description || '').trim(),
        symptoms: String(symptoms || '').trim(),
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
        delete editPayload.status; // keep current status unchanged
        delete editPayload.repair_parts_data;
        delete editPayload.shop_profile_id;
        delete editPayload.vehicle; // do not allow changing vehicle in edit mode
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
          ? (isEditMode ? 'Request updated, but some media failed to upload.' : 'Repair was created, but some media failed to upload.')
          : (isEditMode ? 'Request updated!' : 'Repair created!')
      );
      setDialogVisible(true);

      setTimeout(() => {
        setDialogVisible(false);
        const returnTo = route.params?.returnTo;
        const origin = route.params?.origin;
        const parsedVehicleId = parseInt(vehicleId, 10);

        if (isEditMode && savedRepairId) {
          navigation.navigate('RepairDetail', { repairId: savedRepairId });
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
          navigation.navigate('RepairDetail', {
            repairId: savedRepairId,
            vehicleId: parsedVehicleId,
            origin: returnTo || origin || null,
          });
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
          repairTypeId: resolvedRepairTypeId,
          selectedRepairTypeId: selectedRepairType?.id,
          responseText: err?.responseText,
        });
      }
      setDialogMessage(err.message || 'Submission failed');
      setDialogVisible(true);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <ActivityIndicator animating={true} size="large" style={{ flex: 1 }} />;
  }

  return (
    <ScreenBackground>
      <View style={styles.root}>
        <KeyboardAwareScrollView
          contentContainerStyle={[
            styles.container,
            { paddingBottom: 110 + Math.max(insets.bottom, 10) },
          ]}
          keyboardShouldPersistTaps="always"
        >
          <FloatingCard>
            <Text variant="titleMedium" style={styles.sectionTitle}>Problem</Text>
            <Text style={styles.sectionHint}>
              Share symptoms and details so service centers understand the issue quickly.
            </Text>
            <Text variant="labelLarge" style={styles.label}>Repair category</Text>
            <View style={styles.centerChipsWrap}>
              <Pressable
                onPress={() => selectServiceCategory('')}
                style={[styles.centerChip, !serviceCategorySlug && styles.centerChipSelected]}
              >
                <Text style={[styles.centerChipText, !serviceCategorySlug && styles.centerChipTextSelected]}>
                  All
                </Text>
              </Pressable>
              {categoryOptions.map((c) => {
                const selected = serviceCategorySlug === c.slug;
                return (
                  <Pressable
                    key={c.slug}
                    onPress={() => selectServiceCategory(c.slug)}
                    style={[styles.centerChip, selected && styles.centerChipSelected]}
                  >
                    <Text style={[styles.centerChipText, selected && styles.centerChipTextSelected]}>
                      {c.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text variant="labelLarge" style={[styles.label, { marginTop: 8 }]}>Repair type</Text>
            <View style={styles.centerChipsWrap}>
              {filteredRepairTypes.length === 0 ? (
                <Text style={styles.sectionHint}>No service types in this category.</Text>
              ) : (
                filteredRepairTypes.map((t) => {
                  const selected = String(t.id) === String(repairTypeId);
                  return (
                    <Pressable
                      key={t.id}
                      onPress={() => selectRepairType(t)}
                      style={[styles.centerChip, selected && styles.centerChipSelected]}
                    >
                      <Text style={[styles.centerChipText, selected && styles.centerChipTextSelected]}>
                        {t.name}
                      </Text>
                    </Pressable>
                  );
                })
              )}
            </View>
            <Text style={styles.sectionHint}>
              {repairTypeId
                ? `${selectedRepairType?.name || 'Service'} selected — description is optional.`
                : 'Pick a service type (recommended) or describe the problem below.'}
            </Text>
            {selectedVehicle ? (
              <View style={styles.vehicleSummaryCard}>
                <View style={styles.vehicleSummaryMain}>
                  <Text style={styles.vehicleSummaryPlate}>{selectedVehicle.license_plate || '�'}</Text>
                  <Text style={styles.vehicleSummaryName}>
                    {[selectedVehicle.make_name, selectedVehicle.model_name].filter(Boolean).join(' ') || 'Vehicle'}
                  </Text>
                  <Text style={styles.vehicleSummaryKm}>
                    {selectedVehicle.kilometers != null && selectedVehicle.kilometers !== ''
                      ? `${Number(selectedVehicle.kilometers).toLocaleString()} km`
                      : 'Kilometers not set'}
                  </Text>
                </View>
                {!isEditMode ? (
                  <Button mode="text" compact onPress={() => setShowVehiclePicker((prev) => !prev)}>
                    {showVehiclePicker ? 'Hide vehicle list' : 'Change vehicle'}
                  </Button>
                ) : null}
              </View>
            ) : null}
            {!isEditMode && (!selectedVehicle || showVehiclePicker) ? (
              <>
                <Text variant="labelLarge" style={styles.label}>Vehicle *</Text>
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
              </>
            ) : null}
            {fromVehicleDetail && selectedVehicle ? (
              <View style={styles.optionalKmInline}>
                <Text variant="labelLarge" style={styles.label}>Kilometers (optional)</Text>
                <TextInput
                  mode="outlined"
                  value={kilometers}
                  onChangeText={setKilometers}
                  placeholder={
                    selectedVehicle.kilometers != null && selectedVehicle.kilometers !== ''
                      ? `Shown on vehicle: ${Number(selectedVehicle.kilometers).toLocaleString()}`
                      : 'Current odometer if you know it'
                  }
                  keyboardType="numeric"
                  style={styles.input}
                />
                <Text style={styles.sectionHint}>
                  Service requests use the odometer on your vehicle profile (shown above). Update it on
                  the vehicle screen if it has changed since your last service.
                </Text>
              </View>
            ) : null}
            {fromShopDetail ? (
              <Text style={styles.shopRequestNotice}>
                Your preferred visit time is a suggestion only. Wait for the shop to confirm before you
                bring your vehicle.
              </Text>
            ) : null}
            <Text variant="labelLarge" style={styles.label}>Symptoms</Text>
            <TextInput
              mode="outlined"
              value={symptoms}
              onChangeText={setSymptoms}
              placeholder="Describe symptoms, noises, warning lights..."
              style={styles.input}
              multiline
            />
            <Text variant="labelLarge" style={styles.label}>Preferred visit time</Text>
            <Text style={styles.sectionHint}>
              Pick a day and time. The shop must confirm before it counts as booked.
            </Text>
            <View style={styles.centerChipsWrap}>
              {visitDays.map((day) => {
                const selected = day.offset === visitDayOffset;
                return (
                  <Pressable
                    key={day.offset}
                    onPress={() => setVisitDayOffset(day.offset)}
                    style={[styles.centerChip, selected && styles.centerChipSelected]}
                  >
                    <Text style={[styles.centerChipText, selected && styles.centerChipTextSelected]}>
                      {day.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={[styles.centerChipsWrap, { marginTop: 4 }]}>
              {visitTimeSlots.map((slot) => {
                const selected = slot === visitTimeSlot;
                return (
                  <Pressable
                    key={slot}
                    onPress={() => setVisitTimeSlot(slot)}
                    style={[styles.centerChip, selected && styles.centerChipSelected]}
                  >
                    <Text style={[styles.centerChipText, selected && styles.centerChipTextSelected]}>
                      {slot}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            {selectedVisitDay ? (
              <Text style={styles.sectionHint}>
                {formatPreferredVisitNote(selectedVisitDay, visitTimeSlot)}
              </Text>
            ) : null}
            <TextInput
              mode="outlined"
              value={visitExtraNotes}
              onChangeText={setVisitExtraNotes}
              placeholder="Extra timing notes (optional)"
              style={styles.input}
              multiline
            />
            <Text variant="labelLarge" style={styles.label}>
              {repairTypeId ? 'Extra notes (optional)' : 'Description'}
            </Text>
            <TextInput
              mode="outlined"
              value={description}
              onChangeText={setDescription}
              placeholder={
                repairTypeId
                  ? 'Anything else the shop should know (optional)'
                  : 'What should the shop look at?'
              }
              style={styles.input}
              multiline
            />

            <Text variant="labelLarge" style={styles.label}>Media</Text>
            <View style={styles.mediaActionsRow}>
              <Button mode="outlined" icon="camera" onPress={handlePickPhoto}>
                Add photo
              </Button>
              <Button mode="outlined" icon="video" onPress={handlePickVideo}>
                Add video
              </Button>
            </View>
            {selectedMedia.length > 0 ? (
              <View style={styles.mediaPreviewList}>
                {selectedMedia.map((item) => (
                  <View key={item.localId} style={styles.mediaPreviewCard}>
                    {item.mediaType === 'image' ? (
                      <Image source={{ uri: item.uri }} style={styles.mediaPreviewImage} />
                    ) : (
                      <View style={styles.mediaPreviewVideo}>
                        <Text style={styles.mediaPreviewVideoText}>Video</Text>
                      </View>
                    )}
                    <Text numberOfLines={1} style={styles.mediaPreviewName}>{item.fileName}</Text>
                    <IconButton
                      icon="close"
                      size={18}
                      style={styles.mediaRemoveBtn}
                      onPress={() => removeSelectedMedia(item.localId)}
                    />
                  </View>
                ))}
              </View>
            ) : (
              <EmptyStateCard
                icon="camera-outline"
                title="No media selected yet"
                subtitle="You can submit without media, or add photos/videos for better request quality."
              />
            )}
            {isEditMode && existingMedia.length > 0 ? (
              <View style={styles.readOnlyMediaWrap}>
                <Text style={styles.label}>Existing media (read-only)</Text>
                <Text style={styles.sectionHint}>
                  Existing attachments are shown in request details. You can add more media here.
                </Text>
                {existingMedia.map((item, idx) => (
                  <View key={`existing-${item.id || item.file || idx}`} style={styles.existingMediaItem}>
                    <Text style={styles.mediaPreviewName}>
                      {(item.description || item.file || item.url || 'Existing media').toString()}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </FloatingCard>

          <FloatingCard>
            <Text variant="titleMedium" style={styles.sectionTitle}>Preferences</Text>
            <Text style={styles.sectionHint}>
              Advanced routing options are available if you want more control.
            </Text>
            <Text variant="labelLarge" style={styles.label}>Who should receive request?</Text>
            <View style={styles.targetingList}>
              {[
                { value: 'all_qualified', label: 'Nearby qualified service centers' },
                { value: 'selected_centers', label: 'Selected service centers' },
                { value: 'verified_only', label: 'Verified service centers only' },
                { value: 'operator_assisted', label: 'Ask platform to help choose' },
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
                <Text style={styles.centerLabel}>Preferred service centers</Text>
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
                            {c.name || `Service Center #${c.id}`}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : (
                  <Text style={styles.emptySmall}>
                    No matching service centers available for current vehicle/service filters.
                  </Text>
                )}
              </View>
            ) : null}

            <Pressable
              onPress={() => setRequiresGuarantee((prev) => !prev)}
              style={[styles.guaranteeCard, requiresGuarantee && styles.guaranteeCardSelected]}
            >
              <Text style={[styles.guaranteeTitle, requiresGuarantee && styles.guaranteeTitleSelected]}>
                Request guaranteed service centers
              </Text>
              <Text style={[styles.guaranteeHelper, requiresGuarantee && styles.guaranteeHelperSelected]}>
                Only service centers offering guarantee will receive this request.
              </Text>
              <View style={styles.guaranteeStateRow}>
                <Text style={[styles.guaranteeStateText, requiresGuarantee && styles.guaranteeStateTextSelected]}>
                  {requiresGuarantee ? 'Enabled' : 'Disabled'}
                </Text>
                <Button
                  mode={requiresGuarantee ? 'contained-tonal' : 'outlined'}
                  compact
                  onPress={() => setRequiresGuarantee((prev) => !prev)}
                >
                  {requiresGuarantee ? 'Turn off' : 'Turn on'}
                </Button>
              </View>
            </Pressable>
            <Text variant="labelLarge" style={styles.label}>Preferred radius (km)</Text>
            <TextInput
              mode="outlined"
              value={preferredRadiusKm}
              onChangeText={setPreferredRadiusKm}
              keyboardType="numeric"
              placeholder="Optional, e.g. 15"
              style={styles.input}
            />
          </FloatingCard>

          {!(fromVehicleDetail && selectedVehicle) ? (
            <FloatingCard>
              <Text variant="titleMedium" style={styles.sectionTitle}>Vehicle details</Text>
              <Text variant="labelLarge" style={styles.label}>Kilometers (optional)</Text>
              <TextInput
                mode="outlined"
                value={kilometers}
                onChangeText={setKilometers}
                placeholder="e.g. 95000"
                keyboardType="numeric"
                style={styles.input}
              />
              <Text style={styles.sectionHint}>
                Optional current-km hint for this request.
              </Text>
              <Text style={styles.sectionHint}>
                You can later add invoices, parts, and final repair details to the vehicle history.
              </Text>
              {/* TODO(service-history): Add a separate "Log service record" flow outside this service-request intake screen. */}
              {/* TODO(intake): Add manual repair logging mode separate from request-intake workflow. */}
              {/* TODO(intake): Add invoice OCR intake for structured service-history extraction. */}
              {/* TODO(intake): Add photo-based part extraction suggestions from uploaded media. */}
            </FloatingCard>
          ) : (
            <FloatingCard>
              <Text style={styles.sectionHint}>
                You can later add invoices, parts, and final repair details to the vehicle history.
              </Text>
              {/* TODO(service-history): Add a separate "Log service record" flow outside this service-request intake screen. */}
              {/* TODO(intake): Add manual repair logging mode separate from request-intake workflow. */}
              {/* TODO(intake): Add invoice OCR intake for structured service-history extraction. */}
              {/* TODO(intake): Add photo-based part extraction suggestions from uploaded media. */}
            </FloatingCard>
          )}
        </KeyboardAwareScrollView>

        <View style={[styles.bottomActionBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
          <Button
            mode="contained"
            onPress={handleSubmitRequest}
            loading={saving}
            disabled={saving}
            style={styles.sendButton}
            contentStyle={styles.sendButtonContent}
          >
            {isEditMode ? 'Save changes' : 'Send request'}
          </Button>
        </View>
      </View>

      <Portal>
        <Dialog
          visible={dialogVisible}
          onDismiss={() => setDialogVisible(false)}
        >
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
  shopRequestNotice: {
    marginBottom: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    color: '#9a3412',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
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
  vehicleSummaryCard: {
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.1)',
    borderRadius: 12,
    backgroundColor: '#fff',
    padding: 10,
    marginBottom: 8,
  },
  vehicleSummaryMain: {
    marginBottom: 4,
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
  mediaActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  mediaPreviewList: {
    gap: 8,
  },
  mediaPreviewCard: {
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.08)',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    position: 'relative',
  },
  mediaPreviewImage: {
    width: '100%',
    height: 140,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
    marginBottom: 8,
  },
  mediaPreviewVideo: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    backgroundColor: 'rgba(15,23,42,0.10)',
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaPreviewVideoText: {
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
  },
  mediaPreviewName: {
    color: COLORS.TEXT_DARK,
    fontSize: 12,
    paddingRight: 30,
  },
  mediaRemoveBtn: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
  readOnlyMediaWrap: {
    marginTop: 10,
  },
  existingMediaItem: {
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.08)',
    borderRadius: 8,
    backgroundColor: '#fff',
    padding: 8,
    marginBottom: 6,
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