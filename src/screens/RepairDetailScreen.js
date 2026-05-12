import React, { useEffect, useState, useMemo, useLayoutEffect } from 'react';
import {
  View,
  Alert,
  ActivityIndicator,
  StyleSheet,
  FlatList,
  Linking,
  Modal,
  Pressable,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Card,
  Text,
  TextInput,
  Button,
  useTheme,
} from 'react-native-paper';
import { Picker } from '@react-native-picker/picker';
import { API_BASE_URL } from '../api/config';
import {
  getRepairById,
  getRepairParts,
  addRepairPart,
  deleteRepairPart,
  updateRepairPart,
  updateRepair,
  uploadRepairMedia,
  deleteRepairMedia,
} from '../api/repairs';
import { getShopParts, prepareRepairPartsData } from '../api/parts';
import { getOffersForRepair, bookOffer, unbookOffer, deleteOffer } from '../api/offers';
import { RepairsList } from '../components/shop/RepairsList';
import ScreenBackground from '../components/ScreenBackground';
import { stackContentPaddingTop } from '../navigation/stackContentInset';
import AppCard from '../components/ui/AppCard';
import FloatingCard from '../components/ui/FloatingCard';
import StatusBadge from '../components/ui/StatusBadge';
import { COLORS } from '../constants/colors';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'expo-image-picker';

function formatPaymentStatus(status) {
  if (!status) return '—';
  const map = {
    unpaid: 'Unpaid',
    partially_paid: 'Partially paid',
    paid: 'Paid',
    included_in_invoice: 'Included in invoice',
  };
  return map[String(status)] || String(status).replace(/_/g, ' ');
}

function formatHistoryDate(raw) {
  if (raw == null || raw === '') return null;
  try {
    return new Date(raw).toLocaleString();
  } catch {
    return null;
  }
}

function normalizeRepairMedia(repair) {
  const raw =
    repair?.repair_media ||
    repair?.media ||
    repair?.files ||
    repair?.repair_files ||
    [];
  if (!Array.isArray(raw)) return [];
  return raw;
}

function mediaUrl(item) {
  return item?.file || item?.url || item?.uri || item?.image || item?.thumbnail || null;
}

function normalizeMediaType(item) {
  const explicit = String(item?.media_type || item?.type || '').toLowerCase();
  if (explicit) return explicit;
  const url = String(mediaUrl(item) || '').toLowerCase();
  if (/\.(mp4|mov|webm)(\?|$)/.test(url)) return 'video';
  if (/\.(jpg|jpeg|png|webp|gif)(\?|$)/.test(url)) return 'image';
  return '';
}

export default function RepairDetailScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { repairId } = route.params;
  const theme = useTheme();

  const [repair, setRepair] = useState(null);
  const [repairParts, setRepairParts] = useState([]);
  const [selectedParts, setSelectedParts] = useState([]);
  const [availableShopParts, setAvailableShopParts] = useState([]);
  const [newPart, setNewPart] = useState({
    shopPartId: '',
    quantity: '1',
    price: '',
    note: '',
  });
  const [shopDescription, setShopDescription] = useState('');

  const [loading, setLoading] = useState(true);
  const [isShop, setIsShop] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [shopProfileId, setShopProfileId] = useState(null);
  const [editDescription, setEditDescription] = useState('');
  const [finalKilometers, setFinalKilometers] = useState('');
  const [laborPrice, setLaborPrice] = useState('');
  const [partsPrice, setPartsPrice] = useState('');
  const [totalPrice, setTotalPrice] = useState('');
  const [currency, setCurrency] = useState('BGN');
  const [paymentStatus, setPaymentStatus] = useState('unpaid');
  const [warrantyMonths, setWarrantyMonths] = useState('');
  const [offers, setOffers] = useState([]);
  const [repairTypes, setRepairTypes] = useState([]);
  const [finalRepairTypeId, setFinalRepairTypeId] = useState('');
  const [selectedImageUri, setSelectedImageUri] = useState(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  useLayoutEffect(() => {
    const st = String(repair?.status || '').toLowerCase();
    let title = 'Repair';
    if (st === 'open') title = 'Service Request';
    else if (st === 'done') title = 'Service record';
    else if (st === 'ongoing') title = 'Repair';
    navigation.setOptions({
      headerBackTitleVisible: false,
      title,
    });
  }, [navigation, repair?.status]);

  const handleUpdateRepair = async ({ finalize = false, showSuccessAlert = true } = {}) => {
    if (repair.status === 'done') {
      Alert.alert("This repair is completed and can no longer be edited.");
      return false;
    }
    console.log("💾 Save button clicked");
    const partsToSend = selectedParts.length > 0 ? selectedParts : repairParts;
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const shopProfileId = await AsyncStorage.getItem('@current_shop_id');
      const { repairPartsData, newShopParts } = await prepareRepairPartsData(
        token,
        shopProfileId,
        partsToSend,
        availableShopParts
      );
      setAvailableShopParts(newShopParts);

      const body = {
        description: editDescription,
        shop_description: shopDescription,
        repair_parts_data: repairPartsData,
      };
      const parsedFinalRepairTypeId = String(finalRepairTypeId || '').trim()
        ? parseInt(finalRepairTypeId, 10)
        : null;
      if (parsedFinalRepairTypeId === null || !Number.isNaN(parsedFinalRepairTypeId)) {
        body.final_repair_type = parsedFinalRepairTypeId;
      }
      const parsedLaborPrice = String(laborPrice || '').trim() ? parseFloat(laborPrice) : null;
      const parsedPartsPrice = String(partsPrice || '').trim() ? parseFloat(partsPrice) : null;
      const parsedTotalPrice = String(totalPrice || '').trim() ? parseFloat(totalPrice) : null;
      const parsedFinalKilometers = String(finalKilometers || '').trim()
        ? parseInt(finalKilometers, 10)
        : null;
      if (!Number.isNaN(parsedFinalKilometers)) {
        body.final_kilometers = parsedFinalKilometers;
      }
      if (parsedLaborPrice === null || !Number.isNaN(parsedLaborPrice)) {
        body.labor_price = parsedLaborPrice;
      }
      if (parsedPartsPrice === null || !Number.isNaN(parsedPartsPrice)) {
        body.parts_price = parsedPartsPrice;
      }
      if (parsedTotalPrice === null || !Number.isNaN(parsedTotalPrice)) {
        body.total_price = parsedTotalPrice;
      }
      body.currency = (currency || 'BGN').trim() || 'BGN';
      body.payment_status = paymentStatus || 'unpaid';
      const parsedWarrantyMonths = String(warrantyMonths || '').trim()
        ? parseInt(warrantyMonths, 10)
        : null;
      if (!Number.isNaN(parsedWarrantyMonths)) {
        body.warranty_months = parsedWarrantyMonths;
      }
      if (finalize) {
        body.status = 'done';
      }
      console.log('📦 Body to send:', JSON.stringify(body, null, 2));

      await updateRepair(token, repairId, body);
      await refreshRepair();
      await refreshParts();
      if (showSuccessAlert) {
        Alert.alert('Saved', finalize ? 'Repair finalized successfully.' : 'Repair progress saved successfully.');
      }
      return true;
    } catch (err) {
      console.error('❌ Update Error:', err);
      Alert.alert('Error', err.message || 'Failed to update repair');
      return false;
    }
  };

  useEffect(() => {
    const loadData = async () => {
      const token = await AsyncStorage.getItem('@access_token');
      const shopFlag = await AsyncStorage.getItem('@is_shop');
      const storedUserId = await AsyncStorage.getItem('@user_id');
      setIsShop(shopFlag === 'true');
      setCurrentUserId(storedUserId ? Number(storedUserId) : null);

      // Fetch shop profile id if isShop
      if (shopFlag === 'true') {
        const currentShopId = await AsyncStorage.getItem('@current_shop_id');
        setShopProfileId(parseInt(currentShopId));
      } else {
        setShopProfileId(null);
      }

      try {
        let repairData;
        let repairTypesData = [];
        if (shopFlag === 'true') {
          const [r, partsData, shopPartsData, repairTypesRes] = await Promise.all([
            getRepairById(token, repairId),
            getRepairParts(token, repairId),
            getShopParts(token),
            fetch(`${API_BASE_URL}/api/repairs/types/`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
          ]);
          repairData = r;
          if (repairTypesRes.ok) {
            repairTypesData = await repairTypesRes.json();
          }
          setRepairParts(partsData);
          setAvailableShopParts(shopPartsData);
        } else {
          repairData = await getRepairById(token, repairId);
          setRepairParts(repairData.repair_parts || []);
        }

        setRepair(repairData);
        setEditDescription(repairData.description || '');
        setShopDescription(repairData.shop_description || '');
        setFinalKilometers(
          repairData.final_kilometers != null ? String(repairData.final_kilometers) : ''
        );
        setLaborPrice(repairData.labor_price != null ? String(repairData.labor_price) : '');
        setPartsPrice(repairData.parts_price != null ? String(repairData.parts_price) : '');
        setTotalPrice(repairData.total_price != null ? String(repairData.total_price) : '');
        setCurrency(repairData.currency || 'BGN');
        setPaymentStatus(repairData.payment_status || 'unpaid');
        setWarrantyMonths(repairData.warranty_months != null ? String(repairData.warranty_months) : '');
        setFinalRepairTypeId(
          repairData.final_repair_type != null
            ? String(repairData.final_repair_type)
            : repairData.repair_type != null
              ? String(repairData.repair_type)
              : ''
        );
        setRepairTypes(Array.isArray(repairTypesData) ? repairTypesData : []);
        const offersData = await getOffersForRepair(token, repairId);
        setOffers(offersData);

      } catch (error) {
        console.error(error);
        Alert.alert('Error', 'Failed to load repair data.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [repairId]);

  // Handle route.params updates (e.g., after selecting parts)
  useEffect(() => {
    if (route.params?.addedParts) {
      setSelectedParts(route.params.addedParts);
    }
  }, [route.params]);

  // If using useLayoutEffect to set navigation options, ensure selectedParts is in the dependency array.
  // (Not present in this file, but if you add one, include selectedParts as a dependency.)

  // Refresh offers and repair when coming back to this screen
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      refreshRepair();
      refreshOffers();
    });
    return unsubscribe;
  }, [navigation, repairId]);

  const refreshOffers = async () => {
    const token = await AsyncStorage.getItem('@access_token');
    const offersData = await getOffersForRepair(token, repairId);
    setOffers(offersData);
  };

  const refreshRepair = async () => {
    const token = await AsyncStorage.getItem('@access_token');
    const repairData = await getRepairById(token, repairId);
    setRepair(repairData);
    setEditDescription(repairData.description || '');
    setShopDescription(repairData.shop_description || '');
    setFinalKilometers(
      repairData.final_kilometers != null ? String(repairData.final_kilometers) : ''
    );
    setLaborPrice(repairData.labor_price != null ? String(repairData.labor_price) : '');
    setPartsPrice(repairData.parts_price != null ? String(repairData.parts_price) : '');
    setTotalPrice(repairData.total_price != null ? String(repairData.total_price) : '');
    setCurrency(repairData.currency || 'BGN');
    setPaymentStatus(repairData.payment_status || 'unpaid');
    setWarrantyMonths(repairData.warranty_months != null ? String(repairData.warranty_months) : '');
    setFinalRepairTypeId(
      repairData.final_repair_type != null
        ? String(repairData.final_repair_type)
        : repairData.repair_type != null
          ? String(repairData.repair_type)
          : ''
    );
  };

  const handleFinalizeRepair = async () => {
    if (repair.status !== 'ongoing') return;
    await handleUpdateRepair({ finalize: true, showSuccessAlert: true });
  };

  const refreshParts = async () => {
    const token = await AsyncStorage.getItem('@access_token');
    const parts = await getRepairParts(token, repairId);
    setRepairParts(parts);
  };

  const isMyShopRepair = useMemo(() => {
    return isShop && repair && repair.shop_profile === shopProfileId;
  }, [isShop, repair, shopProfileId]);

  const shopProfileIdNum = shopProfileId != null ? Number(shopProfileId) : null;

  const shopHasBookedOfferForRepair = useMemo(() => {
    if (!isShop || shopProfileIdNum == null || Number.isNaN(shopProfileIdNum)) return false;
    if (!Array.isArray(offers)) return false;
    return offers.some((o) => o.is_booked && Number(o.shop) === shopProfileIdNum);
  }, [isShop, shopProfileIdNum, offers]);

  /** Shop may see license plate: assigned on repair, or has booked offer on this request. */
  const isShopAuthorizedForVehiclePlate = useMemo(() => {
    if (!isShop || !repair || shopProfileIdNum == null || Number.isNaN(shopProfileIdNum)) return false;
    if (repair.shop_profile != null && Number(repair.shop_profile) === shopProfileIdNum) return true;
    return shopHasBookedOfferForRepair;
  }, [isShop, repair, shopProfileIdNum, shopHasBookedOfferForRepair]);

  const canViewerSeeVehiclePlate = useMemo(() => {
    if (!repair) return false;
    if (!isShop) return true;
    const st = String(repair.status || '').toLowerCase();
    if (st === 'open') {
      return isShopAuthorizedForVehiclePlate;
    }
    return isShopAuthorizedForVehiclePlate || st === 'booked' || st === 'ongoing' || st === 'done';
  }, [repair, isShop, isShopAuthorizedForVehiclePlate]);

  const handleAddPart = async () => {
    if (!newPart.shopPartId) {
      Alert.alert('Validation', 'Select a part.');
      return;
    }
    try {
      const token = await AsyncStorage.getItem('@access_token');
      await addRepairPart(token, repairId, {
        shop_part_id: parseInt(newPart.shopPartId),
        quantity: parseInt(newPart.quantity),
        price_per_item_at_use: newPart.price,
        note: newPart.note,
      });
      setNewPart({ shopPartId: '', quantity: '1', price: '', note: '' });
      await refreshParts();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to add part.');
    }
  };

  const handleDeletePart = async (partId) => {
    try {
      const token = await AsyncStorage.getItem('@access_token');
      await deleteRepairPart(token, repairId, partId);
      await refreshParts();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to delete part.');
    }
  };

  const handleUpdatePart = async (partId, field, value) => {
    try {
      const token = await AsyncStorage.getItem('@access_token');
      await updateRepairPart(token, repairId, partId, { [field]: value });
      await refreshParts();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to update part.');
    }
  };

  const handleBookOffer = async (selectedOfferId) => {
    console.log("💥 handleBookOffer called");
    console.log("📌 FULL repair object:", JSON.stringify(repair, null, 2));
    console.log("📌 repair.offer:", repair?.offer);
    console.log("📌 repair.vehicle:", repair?.vehicle);

    if (!selectedOfferId || !repair?.vehicle) {
      Alert.alert('Error', 'Missing offer or vehicle information.');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('@access_token');
      await bookOffer(token, selectedOfferId, repair.vehicle);
      console.log("✅ Booking request sent:", selectedOfferId, repair.vehicle);
      Alert.alert('Success', 'Offer booked!');
      await refreshRepair();
      await refreshOffers();
    } catch (err) {
      console.error("❌ Booking failed:", err);
      Alert.alert('Error', err.message || 'Failed to book offer');
    }
  };

  const handleUnbookOffer = async (selectedOfferId) => {
    console.log("💥 handleUnbookOffer called");
    console.log("📌 selectedOfferId:", selectedOfferId);
    console.log("📌 repair.vehicle:", repair?.vehicle);

    if (!selectedOfferId || !repair?.vehicle) {
      Alert.alert('Error', 'Missing offer or vehicle information.');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('@access_token');
      await unbookOffer(token, selectedOfferId, repair.vehicle);
      Alert.alert('Booking Cancelled', 'You have cancelled your booking.');
      await refreshRepair();
      await refreshOffers();
    } catch (err) {
      console.error("❌ Cancel failed:", err);
      Alert.alert('Error', err.message || 'Failed to cancel booking');
    }
  };

  const handleDeleteOffer = async (selectedOfferId) => {
    Alert.alert('Delete offer', 'Are you sure you want to delete this offer?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem('@access_token');
            await deleteOffer(token, selectedOfferId);
            await refreshOffers();
          } catch (err) {
            Alert.alert('Error', err.message || 'Failed to delete offer');
          }
        },
      },
    ]);
  };

  const handleOpenOfferChat = () => {
    navigation.navigate('RepairChat', { repairId });
  };

  const handleCallShop = async (phone) => {
    if (!phone) return;
    const phoneUrl = `tel:${String(phone).replace(/\s+/g, '')}`;
    // TODO: Track call click attribution for offer analytics.
    const supported = await Linking.canOpenURL(phoneUrl);
    if (!supported) {
      Alert.alert('Call unavailable', 'This device cannot place phone calls.');
      return;
    }
    await Linking.openURL(phoneUrl);
  };

  const renderRepairPartItem = ({ item }) => (
    <View style={{ borderBottomWidth: 1, borderBottomColor: '#ddd', paddingVertical: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ flex: 2 }}>
          {item.partsMaster?.name || item.part_master_detail?.name || item.shop_part_detail?.part?.name || 'Unnamed Part'}
        </Text>
        <Text style={{ flex: 1, textAlign: 'center' }}>{item.quantity}</Text>
        <Text style={{ flex: 1, textAlign: 'center' }}>
          {item.price_per_item_at_use ?? item.price ?? '—'}
        </Text>
        <Text style={{ flex: 1, textAlign: 'center' }}>
          {item.labor_cost ?? item.labor ?? '—'}
        </Text>
      </View>
      {item.note ? <Text style={{ fontStyle: 'italic', fontSize: 12, marginTop: 2 }}>Note: {item.note}</Text> : null}
    </View>
  );

  if (loading || !repair) {
    return (
      <ScreenBackground safeArea={false}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      </ScreenBackground>
    );
  }

  // Debugging: Button/visibility debug logs for shops
  console.log("🔍 isShop:", isShop);
  console.log("🔍 repair.status:", repair?.status);
  console.log("🔍 repair.shop_profile:", repair?.shop_profile);
  console.log("🔍 shopProfileId:", shopProfileId);
  if (repair && isShop) {
    console.log("🧠 DEBUG MATCH:", {
      status: repair.status,
      repairShop: repair.shop_profile,
      myShop: shopProfileId,
      isOwner: repair.shop_profile === shopProfileId,
    });
  }

  // Show minimal view only when identity/request fields are missing (not when plate is intentionally hidden).
  const hasMainRepairFields =
    Object.prototype.hasOwnProperty.call(repair, 'vehicle_make') ||
    Object.prototype.hasOwnProperty.call(repair, 'vehicle_model') ||
    Object.prototype.hasOwnProperty.call(repair, 'description') ||
    Object.prototype.hasOwnProperty.call(repair, 'symptoms');
  if (!hasMainRepairFields) {
    const LimitedRepairView = require('./RepairDetailLimitedScreen').default;
    return <LimitedRepairView repair={repair} />;
  }

  const targetingModeLabelMap = {
    all_qualified: 'All qualified nearby service centers',
    selected_centers: 'Selected service centers',
    verified_only: 'Verified/guaranteed centers only',
    operator_assisted: 'Platform assisted matching',
  };
  const targetingLabel = targetingModeLabelMap[repair.request_targeting_mode] || 'All qualified nearby service centers';
  const preferredCenterNames = Array.isArray(repair.preferred_service_center_names)
    ? repair.preferred_service_center_names
    : [];
  const statusLower = String(repair.status || '').toLowerCase();
  const isDone = statusLower === 'done';
  const isOpenStatus = statusLower === 'open';
  const isOngoingStatus = statusLower === 'ongoing';
  const shouldShowTargetingCardForClient =
    !isDone &&
    !isShop &&
    (repair.request_targeting_mode !== 'all_qualified' || preferredCenterNames.length > 0);
  const repairMedia = normalizeRepairMedia(repair);
  const mediaItems = repairMedia.filter((m) => {
    const type = normalizeMediaType(m);
    return type === 'image' || type === 'photo' || type === 'video';
  });
  const imageMediaItems = mediaItems.filter((m) => {
    const type = normalizeMediaType(m);
    return type === 'image' || type === 'photo';
  });
  const videoMediaItems = mediaItems.filter((m) => normalizeMediaType(m) === 'video');
  const hasFinancialSummary =
    repair.labor_price != null ||
    repair.parts_price != null ||
    repair.total_price != null ||
    repair.calculated_total_price != null;
  const vehicleDisplay = `${repair.vehicle_make || ''} ${repair.vehicle_model || ''}`.trim() || 'Vehicle';
  const completionRecordedAt = formatHistoryDate(repair.completed_at || repair.updated_at);
  const summaryCurrency = repair.currency || 'BGN';
  const displayPartsList = selectedParts.length > 0 ? selectedParts : repairParts;
  const completedServiceTypeName =
    repair.final_repair_type_name ||
    repair.effective_repair_type_name ||
    repair.repair_type_name ||
    'Not specified';
  const qualityWarnings = Array.isArray(repair.quality_warnings) ? repair.quality_warnings : [];
  const showMissingTypeWarning =
    isShop &&
    qualityWarnings.includes('missing_repair_type') &&
    repair.status === 'ongoing' &&
    repair.shop_profile === shopProfileId;
  const isOpenRequest = isOpenStatus;
  const isClientOwner =
    !isShop &&
    (
      currentUserId == null ||
      repair?.client == null ||
      Number(repair.client) === Number(currentUserId)
    );
  const canEditClientRequest = isOpenRequest && isClientOwner;

  const heroReferenceLine = isOpenStatus
    ? `Request #${repair.id}`
    : isOngoingStatus
      ? `Repair #${repair.id}`
      : `Reference #${repair.id}`;

  const handleEditRequest = () => {
    if (!canEditClientRequest) return;
    navigation.navigate('CreateRepair', {
      mode: 'edit_request',
      repairId: repair.id,
      vehicleId: repair.vehicle ? String(repair.vehicle) : '',
      repairTypeId: repair.repair_type != null ? String(repair.repair_type) : '',
      symptoms: repair.symptoms || '',
      description: repair.description || '',
      targetingMode: repair.request_targeting_mode || 'all_qualified',
      selectedCenterIds: Array.isArray(repair.preferred_service_centers) ? repair.preferred_service_centers : [],
      requiresGuarantee: !!repair.requires_guarantee,
      preferredRadiusKm:
        repair.preferred_radius_km != null ? String(repair.preferred_radius_km) : '',
      kilometers: repair.kilometers != null ? String(repair.kilometers) : '',
      origin: 'RepairDetail',
      returnTo: 'RepairDetail',
    });
  };

  const requestMediaLibraryPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Allow access to photos/videos to attach media.');
      return false;
    }
    return true;
  };

  const handlePickAndUploadPhoto = async () => {
    if (!canEditClientRequest || uploadingMedia) return;
    try {
      const allowed = await requestMediaLibraryPermission();
      if (!allowed) return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      const extension = asset?.fileName?.split('.').pop() || 'jpg';
      const fallbackName = `repair-image-${Date.now()}.${extension}`;
      const mediaItem = {
        uri: asset.uri,
        mediaType: 'image',
        fileName: asset.fileName || fallbackName,
        mimeType: asset.mimeType || 'image/jpeg',
      };
      setUploadingMedia(true);
      const token = await AsyncStorage.getItem('@access_token');
      await uploadRepairMedia(token, repairId, mediaItem);
      await refreshRepair();
    } catch (err) {
      console.error(err);
      Alert.alert('Upload failed', 'Could not add this photo. Please try again.');
    } finally {
      setUploadingMedia(false);
    }
  };

  const handlePickAndUploadVideo = async () => {
    if (!canEditClientRequest || uploadingMedia) return;
    try {
      const allowed = await requestMediaLibraryPermission();
      if (!allowed) return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: false,
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      const extension = asset?.fileName?.split('.').pop() || 'mp4';
      const fallbackName = `repair-video-${Date.now()}.${extension}`;
      const mediaItem = {
        uri: asset.uri,
        mediaType: 'video',
        fileName: asset.fileName || fallbackName,
        mimeType: asset.mimeType || 'video/mp4',
      };
      setUploadingMedia(true);
      const token = await AsyncStorage.getItem('@access_token');
      await uploadRepairMedia(token, repairId, mediaItem);
      await refreshRepair();
    } catch (err) {
      console.error(err);
      Alert.alert('Upload failed', 'Could not add this video. Please try again.');
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleAddPhotoOrVideo = () => {
    if (!canEditClientRequest || uploadingMedia) return;
    Alert.alert('Add photo or video', undefined, [
      { text: 'Photo', onPress: () => { handlePickAndUploadPhoto(); } },
      { text: 'Video', onPress: () => { handlePickAndUploadVideo(); } },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleConfirmDeleteMedia = (mediaItem) => {
    if (!canEditClientRequest || mediaItem.id == null) return;
    Alert.alert('Remove this media from the request?', '', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem('@access_token');
            await deleteRepairMedia(token, repairId, mediaItem.id);
            await refreshRepair();
          } catch (err) {
            console.error(err);
            Alert.alert(
              "Couldn't remove media",
              err.message || 'Something went wrong. You can try again in a moment.'
            );
          }
        },
      },
    ]);
  };

  return (
    <>
    <ScreenBackground safeArea={false}>
      <FlatList
        ListHeaderComponent={
          <View>
            <AppCard variant="dark" style={styles.heroWrap} contentStyle={styles.heroInner}>
              <View style={styles.heroTop}>
                <View style={styles.heroTextCol}>
                  <Text style={styles.heroTitle}>{vehicleDisplay}</Text>
                  <Text
                    style={canViewerSeeVehiclePlate ? styles.heroPlate : styles.heroPlateHidden}
                  >
                    {canViewerSeeVehiclePlate
                      ? (String(repair.vehicle_license_plate || '').trim() || '—')
                      : 'Plate hidden until booking'}
                  </Text>
                  {repair.vehicle_vin ? (
                    <Text style={styles.heroMeta}>VIN: {repair.vehicle_vin}</Text>
                  ) : null}
                  <Text style={styles.heroReference}>{heroReferenceLine}</Text>
                  <Text style={styles.heroMeta}>Service type: {completedServiceTypeName}</Text>
                  <Text style={styles.heroMeta}>
                    {isDone ? 'Final kilometers: ' : 'Request kilometers: '}
                    {isDone && repair.final_kilometers != null
                      ? repair.final_kilometers
                      : repair.kilometers != null
                        ? repair.kilometers
                        : '—'}
                  </Text>
                </View>
                <StatusBadge status={repair.status} />
              </View>
            </AppCard>

            {!isDone ? (
            <FloatingCard>
              <Text style={styles.cardTitle}>Request details</Text>
              {canEditClientRequest ? (
                <Button mode="outlined" onPress={handleEditRequest} style={styles.editRequestButton}>
                  Edit request
                </Button>
              ) : null}
              {repair.symptoms ? <Text style={styles.detailLine}>Symptoms: {repair.symptoms}</Text> : null}
              {repair.description ? <Text style={styles.detailLine}>Description: {repair.description}</Text> : null}
              <Text style={styles.detailLine}>Guarantee requested: {repair.requires_guarantee ? 'Yes' : 'No'}</Text>
              {repair.preferred_radius_km ? (
                <Text style={styles.detailLine}>Preferred radius: {repair.preferred_radius_km} km</Text>
              ) : null}
              <Text style={styles.detailLine}>Targeting mode: {targetingLabel}</Text>
              {isShop && repair.request_targeting_mode !== 'all_qualified' ? (
                <Text style={styles.mutedText}>Matching details are available for non-default targeting modes.</Text>
              ) : null}
            </FloatingCard>
            ) : null}

            {shouldShowTargetingCardForClient ? (
            <FloatingCard>
              <Text style={styles.cardTitle}>
                Request targeting
              </Text>
              {preferredCenterNames.length > 0 ? (
                <View style={styles.chipsWrap}>
                  {preferredCenterNames.map((name, idx) => (
                    <View key={`${name}-${idx}`} style={styles.chip}>
                      <Text style={styles.chipText}>{name}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.mutedText}>
                  {repair.request_targeting_mode === 'all_qualified' &&
                    'Sent to qualified service centers matching this vehicle and service.'}
                  {repair.request_targeting_mode === 'verified_only' &&
                    'Sent only to verified/guaranteed service centers.'}
                  {repair.request_targeting_mode === 'operator_assisted' &&
                    'Platform-assisted matching requested.'}
                  {repair.request_targeting_mode === 'selected_centers' &&
                    'No specific centers selected for this request.'}
                </Text>
              )}
            </FloatingCard>
            ) : null}

            {isDone ? (
            <FloatingCard style={styles.historyRecordCard}>
              <Text style={styles.cardTitle}>Completed service record</Text>
              <Text style={styles.historyHelperText}>
                This repair is now part of the vehicle service history.
              </Text>
              <View style={styles.completedPillRow}>
                <View style={styles.completedPill}>
                  <Text style={styles.completedPillText}>Completed</Text>
                </View>
              </View>

              <Text style={styles.summarySectionTitle}>Service</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Service type</Text>
                <Text style={styles.summaryValue}>{completedServiceTypeName}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Service center</Text>
                <Text style={styles.summaryValue}>{repair.shop_profile_name || '—'}</Text>
              </View>
              {completionRecordedAt ? (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Completed on</Text>
                  <Text style={styles.summaryValue}>{completionRecordedAt}</Text>
                </View>
              ) : null}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Final kilometers</Text>
                <Text style={styles.summaryValue}>
                  {repair.final_kilometers != null
                    ? repair.final_kilometers
                    : repair.kilometers != null
                      ? repair.kilometers
                      : '—'}
                </Text>
              </View>

              <Text style={styles.summarySectionTitle}>Notes</Text>
              {repair.shop_description ? (
                <Text style={styles.detailLine}>Workshop notes: {repair.shop_description}</Text>
              ) : null}
              {repair.description ? (
                <Text style={styles.detailLine}>Original request: {repair.description}</Text>
              ) : null}
              {repair.symptoms ? (
                <Text style={styles.mutedText}>Symptoms: {repair.symptoms}</Text>
              ) : null}
              {!repair.shop_description && !repair.description && !repair.symptoms ? (
                <Text style={styles.mutedText}>No notes captured for this record.</Text>
              ) : null}

              <Text style={styles.summarySectionTitle}>Parts used</Text>
              {displayPartsList.length === 0 ? (
                <Text style={styles.mutedText}>No parts recorded for this service.</Text>
              ) : (
                <>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ flex: 2, fontWeight: 'bold' }}>Part</Text>
                    <Text style={{ flex: 1, fontWeight: 'bold', textAlign: 'center' }}>Qty</Text>
                    <Text style={{ flex: 1, fontWeight: 'bold', textAlign: 'center' }}>Price</Text>
                    <Text style={{ flex: 1, fontWeight: 'bold', textAlign: 'center' }}>Labor</Text>
                  </View>
                  {displayPartsList.map((item, index) => (
                    <View key={item.id || index}>{renderRepairPartItem({ item })}</View>
                  ))}
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }}>
                    <Text style={{ fontWeight: 'bold', marginRight: 10 }}>Line items total:</Text>
                    <Text>
                      {displayPartsList
                        .reduce((acc, part) => {
                          const price =
                            parseFloat(part.price) || parseFloat(part.price_per_item_at_use) || 0;
                          const labor =
                            parseFloat(part.labor) || parseFloat(part.labor_cost) || 0;
                          const qty = parseInt(part.quantity, 10) || 1;
                          return acc + (price + labor) * qty;
                        }, 0)
                        .toFixed(2)}{' '}
                      {summaryCurrency}
                    </Text>
                  </View>
                </>
              )}

              <Text style={styles.summarySectionTitle}>Amounts</Text>
              {hasFinancialSummary ? (
                <>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Labor</Text>
                    <Text style={styles.summaryValue}>
                      {repair.labor_price != null ? `${repair.labor_price} ${summaryCurrency}` : '—'}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Parts (summary)</Text>
                    <Text style={styles.summaryValue}>
                      {repair.parts_price != null ? `${repair.parts_price} ${summaryCurrency}` : '—'}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Total</Text>
                    <Text style={[styles.summaryValue, styles.summaryValueEmphasis]}>
                      {repair.total_price != null || repair.calculated_total_price != null
                        ? `${repair.total_price ?? repair.calculated_total_price} ${summaryCurrency}`
                        : '—'}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Payment status</Text>
                    <Text style={styles.summaryValue}>{formatPaymentStatus(repair.payment_status)}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Warranty</Text>
                    <Text style={styles.summaryValue}>
                      {repair.warranty_months != null ? `${repair.warranty_months} months` : '—'}
                    </Text>
                  </View>
                </>
              ) : (
                <Text style={styles.mutedText}>Financial summary not added yet.</Text>
              )}
              <Text style={[styles.mutedText, { marginTop: 8 }]}>
                Invoice generation will be added later.
              </Text>
            </FloatingCard>
            ) : isOpenStatus && isShop ? (
            <FloatingCard>
              <Text style={styles.cardTitle}>Request review</Text>
              <Text style={styles.mutedText}>
                Review the customer request, photos, and details before sending an offer.
              </Text>
            </FloatingCard>
            ) : isOpenStatus ? null : (
            <Card mode="outlined" style={styles.headerCard}>
              <Card.Title
                title="Repair management"
              />
              <Card.Content>
                  <Text style={styles.mutedText}>Track parts, notes, and final repair details.</Text>
                  {repair.status === 'ongoing' ? (
                    <View style={styles.serviceStateChip}>
                      <Text style={styles.serviceStateChipText}>Vehicle currently in service</Text>
                    </View>
                  ) : null}
                  {isShop && repair && repair.status === 'ongoing' && repair.shop_profile === shopProfileId && (
                    <View style={{ alignItems: 'flex-start', marginBottom: 8 }}>
                      <Button
                        mode="outlined"
                        onPress={() => {
                          if (repair.status === 'done') {
                            Alert.alert("This repair is completed and can no longer be edited.");
                            return;
                          }
                          navigation.navigate('SelectRepairParts', {
                            currentParts: (selectedParts.length > 0 ? selectedParts : repairParts).map(p => ({
                              partsMasterId: p.partsMasterId || p.part_master || p.part_master_detail?.id || p.partsMaster?.id || p.shop_part?.part?.id,
                              shopPartId: p.shopPartId || p.shop_part_id || p.shop_part?.id,
                              quantity: p.quantity || 1,
                              price: p.price || p.price_per_item_at_use || '',
                              labor: p.labor || p.labor_cost || '',
                              note: p.note || '',
                              partsMaster: p.partsMaster || p.part_master_detail || p.parts_master_detail || p.shop_part_detail?.part || {},
                            })),
                            vehicleId: repair.vehicle?.toString() || '',
                            repairTypeId: repair.repair_type?.toString() || '',
                            description: editDescription || '',
                            kilometers: repair.kilometers?.toString() || '',
                            status: repair.status || 'open',
                            returnTo: 'RepairDetail',
                            repairId: repairId,
                          });
                        }}
                      >
                        Manage Parts
                      </Button>
                    </View>
                  )}
                  <Text style={styles.partsSectionLabel}>Parts used</Text>
                  {(selectedParts.length > 0 ? selectedParts : repairParts).length === 0 ? (
                    <Text style={{ fontStyle: 'italic', color: 'gray' }}>No parts recorded yet.</Text>
                  ) : (
                    <>
                      {/* Table header row */}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                        <Text style={{ flex: 2, fontWeight: 'bold' }}>Part</Text>
                        <Text style={{ flex: 1, fontWeight: 'bold', textAlign: 'center' }}>Qty</Text>
                        <Text style={{ flex: 1, fontWeight: 'bold', textAlign: 'center' }}>Price</Text>
                        <Text style={{ flex: 1, fontWeight: 'bold', textAlign: 'center' }}>Labor</Text>
                      </View>
                      {(selectedParts.length > 0 ? selectedParts : repairParts).map((item, index) => (
                        <View key={item.id || index}>
                          {renderRepairPartItem({ item })}
                        </View>
                      ))}
                      {/* Total row */}
                      {(selectedParts.length > 0 ? selectedParts : repairParts).length > 0 && (
                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }}>
                          <Text style={{ fontWeight: 'bold', marginRight: 10 }}>Total:</Text>
                          <Text>
                            {(
                              (selectedParts.length > 0 ? selectedParts : repairParts).reduce((acc, part) => {
                                const price = parseFloat(part.price) || parseFloat(part.price_per_item_at_use) || 0;
                                const labor = parseFloat(part.labor) || parseFloat(part.labor_cost) || 0;
                                const qty = parseInt(part.quantity) || 1;
                                return acc + (price + labor) * qty;
                              }, 0)
                            ).toFixed(2)} BGN
                          </Text>
                        </View>
                      )}
                    </>
                  )}
                  {(isMyShopRepair || (isShop && repair.status === 'ongoing' && repair.shop_profile === shopProfileId)) && (
                    <>
                      {repair.status === 'ongoing' && isShop && repair.shop_profile === shopProfileId && (
                        <>
                          <TextInput
                            mode="outlined"
                            placeholder="Shop notes"
                            value={shopDescription}
                            onChangeText={setShopDescription}
                            style={styles.input}
                            multiline
                          />
                          <TextInput
                            mode="outlined"
                            label="Final vehicle kilometers"
                            keyboardType="numeric"
                            value={finalKilometers}
                            onChangeText={setFinalKilometers}
                            style={styles.input}
                          />
                          <Text style={styles.mutedText}>
                            Used for vehicle history and future service reminders.
                          </Text>
                          <Text style={styles.labelSmall}>Final service type</Text>
                          <View style={styles.pickerContainer}>
                            <Picker selectedValue={finalRepairTypeId} onValueChange={setFinalRepairTypeId}>
                              <Picker.Item label="Not specified" value="" />
                              {repairTypes.map((type) => (
                                <Picker.Item key={type.id} label={type.name} value={String(type.id)} />
                              ))}
                            </Picker>
                          </View>
                          <Text style={styles.mutedText}>
                            Used for service history, reminders, and statistics.
                          </Text>
                          {showMissingTypeWarning ? (
                            <Text style={styles.warningText}>
                              Service type missing. Add it before finalizing for better history.
                            </Text>
                          ) : null}
                          <Text style={styles.partsSectionLabel}>Repair financial summary</Text>
                          <TextInput
                            mode="outlined"
                            label="Labor price"
                            keyboardType="numeric"
                            value={laborPrice}
                            onChangeText={setLaborPrice}
                            style={styles.input}
                          />
                          <TextInput
                            mode="outlined"
                            label="Parts price"
                            keyboardType="numeric"
                            value={partsPrice}
                            onChangeText={setPartsPrice}
                            style={styles.input}
                          />
                          <TextInput
                            mode="outlined"
                            label="Total price"
                            keyboardType="numeric"
                            value={totalPrice}
                            onChangeText={setTotalPrice}
                            style={styles.input}
                          />
                          <TextInput
                            mode="outlined"
                            label="Currency"
                            value={currency}
                            onChangeText={setCurrency}
                            style={styles.input}
                          />
                          <Text style={styles.labelSmall}>Payment status</Text>
                          <View style={styles.pickerContainer}>
                            <Picker selectedValue={paymentStatus} onValueChange={setPaymentStatus}>
                              <Picker.Item label="Unpaid" value="unpaid" />
                              <Picker.Item label="Partially paid" value="partially_paid" />
                              <Picker.Item label="Paid" value="paid" />
                              <Picker.Item label="Included in invoice" value="included_in_invoice" />
                            </Picker>
                          </View>
                          <TextInput
                            mode="outlined"
                            label="Warranty months"
                            keyboardType="numeric"
                            value={warrantyMonths}
                            onChangeText={setWarrantyMonths}
                            style={styles.input}
                          />
                          <Button mode="contained" onPress={handleUpdateRepair} style={styles.progressButton}>
                            Save repair progress
                          </Button>
                          {repair.status === 'ongoing' ? (
                            <Button mode="outlined" onPress={handleFinalizeRepair} style={styles.progressButton}>
                              Finalize repair
                            </Button>
                          ) : null}
                          <Text style={styles.mutedText}>Invoice generation coming later.</Text>
                        </>
                      )}
                    </>
                  )}
                  {(!isShop || repair.shop_profile !== shopProfileId) && (
                    <>
                      <Text style={styles.partsSectionLabel}>Repair financial summary</Text>
                      {hasFinancialSummary ? (
                        <>
                          <Text style={styles.detailLine}>Labor: {repair.labor_price ?? '—'} {repair.currency || 'BGN'}</Text>
                          <Text style={styles.detailLine}>Parts: {repair.parts_price ?? '—'} {repair.currency || 'BGN'}</Text>
                          <Text style={styles.detailLine}>
                            Total: {repair.total_price ?? repair.calculated_total_price ?? '—'} {repair.currency || 'BGN'}
                          </Text>
                          <Text style={styles.detailLine}>Payment status: {formatPaymentStatus(repair.payment_status)}</Text>
                          <Text style={styles.detailLine}>
                            Warranty: {repair.warranty_months != null ? `${repair.warranty_months} months` : '—'}
                          </Text>
                        </>
                      ) : (
                        <Text style={styles.mutedText}>Financial summary not added yet.</Text>
                      )}
                      <Text style={styles.mutedText}>Invoice generation will be added later.</Text>
                    </>
                  )}
                </Card.Content>
            </Card>
            )}

            <FloatingCard style={styles.mediaCardCompact}>
              <Text style={styles.cardTitle}>Photos & videos</Text>
              <Text style={styles.mutedText}>
                {isDone
                  ? 'Part of the permanent service record as visual proof and history evidence.'
                  : isOpenStatus
                    ? canEditClientRequest
                      ? 'Add or remove photos and videos while this request is open. After a shop is booked, media here becomes read-only.'
                      : 'Photos and videos attached to this service request.'
                    : 'Documentation shared during this repair.'}
              </Text>
              {canEditClientRequest ? (
                <Button
                  mode="outlined"
                  onPress={handleAddPhotoOrVideo}
                  disabled={uploadingMedia}
                  style={styles.mediaAddButton}
                >
                  {uploadingMedia ? 'Uploading…' : 'Add photo or video'}
                </Button>
              ) : null}
              {mediaItems.length > 0 ? (
                <>
                  {imageMediaItems.length > 0 ? (
                    <View style={styles.mediaGrid}>
                      {imageMediaItems.map((m, imgIdx) => (
                        <View
                          key={m.id != null ? `img-${m.id}` : `img-legacy-${imgIdx}`}
                          style={styles.imageMediaCard}
                        >
                          <View style={styles.imageMediaCardInner}>
                            <Pressable onPress={() => setSelectedImageUri(mediaUrl(m))}>
                              <Image source={{ uri: mediaUrl(m) }} style={styles.imageMediaThumb} />
                            </Pressable>
                            {canEditClientRequest && m.id != null ? (
                              <Pressable
                                style={styles.mediaRemoveBtn}
                                onPress={() => handleConfirmDeleteMedia(m)}
                                accessibilityLabel="Remove media"
                                hitSlop={10}
                              >
                                <MaterialCommunityIcons name="trash-can-outline" size={18} color="#fff" />
                              </Pressable>
                            ) : null}
                          </View>
                          <View style={styles.mediaMetaRow}>
                            <Text style={styles.mediaType}>Image</Text>
                            <Text style={styles.mediaDateText}>
                              {m.created_at ? new Date(m.created_at).toLocaleDateString() : '—'}
                            </Text>
                          </View>
                          {(m.description || m.caption) ? (
                            <Text style={styles.mediaCaption} numberOfLines={2}>
                              {m.description || m.caption}
                            </Text>
                          ) : null}
                        </View>
                      ))}
                    </View>
                  ) : null}

                  {videoMediaItems.length > 0 ? (
                    <View style={{ marginTop: imageMediaItems.length > 0 ? 10 : 8 }}>
                      {videoMediaItems.map((m, vidIdx) => (
                        <View
                          key={m.id != null ? `vid-${m.id}` : `vid-legacy-${vidIdx}`}
                          style={styles.videoMediaCard}
                        >
                          <View style={styles.videoMediaHeaderRow}>
                            <View style={[styles.videoMediaTop, styles.videoMediaTopGrow]}>
                              <MaterialCommunityIcons name="video-outline" size={20} color={COLORS.PRIMARY} />
                              <Text style={styles.mediaType}>Video</Text>
                              <Text style={styles.mediaDateText}>
                                {m.created_at ? new Date(m.created_at).toLocaleDateString() : '—'}
                              </Text>
                            </View>
                            {canEditClientRequest && m.id != null ? (
                              <Pressable
                                style={styles.mediaRemoveBtnInline}
                                onPress={() => handleConfirmDeleteMedia(m)}
                                accessibilityLabel="Remove media"
                                hitSlop={10}
                              >
                                <MaterialCommunityIcons name="trash-can-outline" size={22} color={COLORS.TEXT_MUTED} />
                              </Pressable>
                            ) : null}
                          </View>
                          <Text style={styles.mediaCaption} numberOfLines={2}>
                            {m.description || m.caption || mediaUrl(m)?.split('/').pop() || 'Video attachment'}
                          </Text>
                          <Button mode="outlined" compact style={styles.videoPlayBtn}>
                            Play (coming soon)
                          </Button>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </>
              ) : (
                <Text style={styles.detailLine}>No photos or videos added yet.</Text>
              )}
            </FloatingCard>

            {!isDone ? (
            <Card mode="outlined" style={styles.headerCard}>
              <Card.Title
                title="Offers"
              />
              <Card.Content>
                  {isShop && shopProfileId !== null && !offers.some(o => parseInt(o.shop) === shopProfileId) && (
                    <Button
                      mode="contained"
                      onPress={() =>
                        navigation.navigate('CreateOrUpdateOffer', {
                          repairId,
                          selectedOfferParts: [],
                        })
                      }
                      style={{ marginBottom: 10 }}
                    >
                      Send offer
                    </Button>
                  )}
                  {offers.length === 0 ? (
                    <>
                      <Text style={styles.offerEmptyText}>
                        {isShop ? 'Be the first to send an offer.' : 'Service centers have not sent offers yet.'}
                      </Text>
                      <Text style={styles.offerEmptyHint}>
                        {isShop
                          ? 'Send an offer to start the conversation.'
                          : 'Chat becomes available after a service center sends an offer.'}
                      </Text>
                    </>
                  ) : (
                    (() => {
                      const hasBooked = offers.some((o) => o.is_booked);
                      const sortedOffers = [...offers].sort((a, b) => (b.is_booked ? 1 : 0) - (a.is_booked ? 1 : 0));
                      return sortedOffers.map((offer) => (
                        <FloatingCard key={offer.id} style={styles.offerCard}>
                          <View style={styles.offerTopRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.offerShopName}>
                                {offer.shop_name || offer.shop_profile_name || 'Service Center'}
                              </Text>
                              <View style={styles.offerBadgesRow}>
                                {offer.is_booked ? (
                                  <View style={styles.offerBadgeBooked}>
                                    <Text style={styles.offerBadgeBookedText}>Booked</Text>
                                  </View>
                                ) : (
                                  <View style={styles.offerBadgeSoft}>
                                    <Text style={styles.offerBadgeSoftText}>Best match</Text>
                                  </View>
                                )}
                                <View style={styles.offerBadgeSoft}>
                                  <Text style={styles.offerBadgeSoftText}>Fast response</Text>
                                </View>
                              </View>
                            </View>
                            <Text style={styles.offerPrice}>{offer.price != null ? `${offer.price} BGN` : 'Quote pending'}</Text>
                          </View>

                          <Text style={styles.offerDescription}>{offer.description || 'Service proposal available.'}</Text>
                          {offer.availability_note ? (
                            <Text style={styles.offerMetaText}>Availability: {offer.availability_note}</Text>
                          ) : offer.available_from ? (
                            <Text style={styles.offerMetaText}>
                              Available from: {new Date(offer.available_from).toLocaleString()}
                            </Text>
                          ) : null}
                          {offer.is_guaranteed ? (
                            <View style={styles.offerBadgeSoft}>
                              <Text style={styles.offerBadgeSoftText}>Guarantee included</Text>
                            </View>
                          ) : null}
                          {offer.parts?.length ? (
                            <Text style={styles.offerMetaText}>Included parts: {offer.parts.length}</Text>
                          ) : null}
                          {offer.estimated_duration_minutes ? (
                            <Text style={styles.offerMetaText}>
                              Estimated duration: {offer.estimated_duration_minutes} min
                            </Text>
                          ) : null}

                          <View style={styles.offerActionsRow}>
                            {isShop && shopProfileId !== null && parseInt(offer.shop) === shopProfileId && (
                              <>
                                <Button
                                  mode="outlined"
                                  onPress={() =>
                                    navigation.navigate('CreateOrUpdateOffer', {
                                      repairId,
                                      offerId: offer.id,
                                      existingOffer: offer,
                                      selectedOfferParts: offer.parts || [],
                                    })
                                  }
                                >
                                  Edit offer
                                </Button>
                                <Button mode="text" textColor="#dc2626" onPress={() => handleDeleteOffer(offer.id)}>
                                  Delete offer
                                </Button>
                                <Button mode="outlined" onPress={handleOpenOfferChat}>
                                  Open chat
                                </Button>
                                {offer.phone_call_allowed && (offer.shop_phone_e164 || offer.shop_phone) ? (
                                  <Button mode="text" onPress={() => handleCallShop(offer.shop_phone_e164 || offer.shop_phone)}>
                                    Call
                                  </Button>
                                ) : null}
                              </>
                            )}
                            {!isShop && (
                              <>
                                {!hasBooked && !offer.is_booked ? (
                                  <Button mode="contained" onPress={() => handleBookOffer(offer.id)}>
                                    {offer.is_promotion ? 'Book promotion' : 'Book offer'}
                                  </Button>
                                ) : null}
                                <Button mode="outlined" onPress={handleOpenOfferChat}>
                                  Open chat
                                </Button>
                                {offer.phone_call_allowed && (offer.shop_phone_e164 || offer.shop_phone) ? (
                                  <Button mode="text" onPress={() => handleCallShop(offer.shop_phone_e164 || offer.shop_phone)}>
                                    Call
                                  </Button>
                                ) : null}
                                {offer.is_booked ? (
                                  <Button mode="text" onPress={() => handleUnbookOffer(offer.id)}>
                                    Cancel booking
                                  </Button>
                                ) : null}
                              </>
                            )}
                          </View>
                        </FloatingCard>
                      ));
                    })()
                  )}
                </Card.Content>
            </Card>
            ) : null}

          </View>
        }
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: stackContentPaddingTop(insets, 4) },
        ]}
      />
    </ScreenBackground>
    <Modal
      visible={Boolean(selectedImageUri)}
      transparent
      animationType="fade"
      onRequestClose={() => setSelectedImageUri(null)}
    >
      <View style={styles.lightboxBackdrop}>
        <Pressable style={styles.lightboxClose} onPress={() => setSelectedImageUri(null)}>
          <MaterialCommunityIcons name="close" size={26} color="#fff" />
        </Pressable>
        {selectedImageUri ? (
          <Image source={{ uri: selectedImageUri }} style={styles.lightboxImage} resizeMode="contain" />
        ) : null}
      </View>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  heroWrap: {
    marginHorizontal: 0,
    marginTop: 8,
  },
  heroInner: {
    paddingVertical: 4,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  heroTextCol: {
    flex: 1,
    paddingRight: 10,
    minWidth: 0,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
  },
  heroPlate: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  heroPlateHidden: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 4,
  },
  heroReference: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 13,
    marginTop: 4,
    fontWeight: '600',
  },
  heroSub: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    marginTop: 2,
  },
  heroMeta: {
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  cardTitle: {
    color: COLORS.TEXT_DARK,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  detailLine: {
    color: COLORS.TEXT_DARK,
    fontSize: 14,
    marginBottom: 6,
    lineHeight: 20,
  },
  editRequestButton: {
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  mutedText: {
    color: COLORS.TEXT_MUTED,
    fontSize: 13,
    lineHeight: 18,
  },
  warningText: {
    color: '#b45309',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 6,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: 'rgba(37,99,235,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.25)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 6,
  },
  chipText: {
    color: '#1e3a8a',
    fontSize: 12,
    fontWeight: '700',
  },
  mediaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(15,23,42,0.1)',
    paddingVertical: 8,
    gap: 10,
  },
  mediaType: {
    color: COLORS.PRIMARY,
    fontWeight: '700',
    textTransform: 'capitalize',
    minWidth: 70,
  },
  mediaCaption: {
    color: COLORS.TEXT_DARK,
    fontSize: 12,
    marginTop: 2,
  },
  mediaCardCompact: {
    paddingBottom: 6,
  },
  mediaAddButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  imageMediaCard: {
    width: '48%',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.08)',
    borderRadius: 12,
    backgroundColor: '#fff',
    padding: 6,
  },
  imageMediaCardInner: {
    position: 'relative',
  },
  mediaRemoveBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.52)',
    borderRadius: 18,
    padding: 6,
  },
  mediaRemoveBtnInline: {
    padding: 4,
    marginLeft: 4,
  },
  imageMediaThumb: {
    width: '100%',
    height: 110,
    borderRadius: 8,
    backgroundColor: 'rgba(15,23,42,0.06)',
    marginBottom: 6,
  },
  mediaMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  mediaDateText: {
    color: COLORS.TEXT_MUTED,
    fontSize: 11,
  },
  videoMediaCard: {
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.08)',
    borderRadius: 12,
    backgroundColor: '#fff',
    padding: 10,
    marginBottom: 8,
  },
  videoMediaHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  videoMediaTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  videoMediaTopGrow: {
    flex: 1,
    flexWrap: 'wrap',
  },
  videoPlayBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  lightboxBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  lightboxImage: {
    width: '100%',
    height: '85%',
  },
  lightboxClose: {
    position: 'absolute',
    top: 42,
    right: 16,
    zIndex: 2,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCard: {
    marginHorizontal: 0,
    marginVertical: 8,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.08)',
  },
  addPartCard: {
    marginHorizontal: 0,
    marginVertical: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.08)',
  },
  partCard: {
    marginHorizontal: 0,
    marginVertical: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.08)',
  },
  input: {
    marginVertical: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  labelSmall: {
    color: COLORS.TEXT_MUTED,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  offerCard: {
    marginHorizontal: 0,
    marginVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.08)',
  },
  offerEmptyText: {
    textAlign: 'center',
    marginTop: 10,
    color: COLORS.TEXT_MUTED,
  },
  offerEmptyHint: {
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 10,
    color: COLORS.TEXT_MUTED,
    fontSize: 13,
  },
  offerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 10,
  },
  offerShopName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
    marginBottom: 6,
  },
  offerBadgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  offerBadgeSoft: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.07)',
  },
  offerBadgeSoftText: {
    color: COLORS.TEXT_MUTED,
    fontSize: 12,
    fontWeight: '600',
  },
  offerBadgeBooked: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(16,185,129,0.15)',
  },
  offerBadgeBookedText: {
    color: '#047857',
    fontSize: 12,
    fontWeight: '700',
  },
  offerPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.TEXT_DARK,
  },
  offerDescription: {
    color: COLORS.TEXT_DARK,
    marginBottom: 8,
  },
  offerMetaText: {
    color: COLORS.TEXT_MUTED,
    marginBottom: 4,
  },
  offerActionsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    width: '100%',
    alignSelf: 'stretch',
  },
  partsSectionLabel: {
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
    marginTop: 6,
    marginBottom: 6,
  },
  progressButton: {
    marginTop: 8,
  },
  serviceStateChip: {
    alignSelf: 'flex-start',
    marginTop: 8,
    marginBottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(37,99,235,0.12)',
  },
  serviceStateChipText: {
    color: '#1e3a8a',
    fontSize: 12,
    fontWeight: '700',
  },
  serviceStateChipDone: {
    alignSelf: 'flex-start',
    marginTop: 8,
    marginBottom: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(16,185,129,0.15)',
  },
  serviceStateChipDoneText: {
    color: '#047857',
    fontSize: 12,
    fontWeight: '700',
  },
  summaryValueEmphasis: {
    fontWeight: '800',
    fontSize: 15,
  },
  historyRecordCard: {
    marginHorizontal: 0,
    marginVertical: 8,
  },
  historyHelperText: {
    color: COLORS.TEXT_MUTED,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  completedPillRow: {
    marginBottom: 12,
  },
  completedPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(16,185,129,0.18)',
  },
  completedPillText: {
    color: '#047857',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  summarySectionTitle: {
    marginTop: 10,
    marginBottom: 6,
    color: COLORS.TEXT_DARK,
    fontWeight: '800',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.45,
    opacity: 0.88,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 5,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(15,23,42,0.06)',
  },
  summaryLabel: {
    color: COLORS.TEXT_MUTED,
    fontSize: 13,
    flex: 1,
    paddingRight: 8,
  },
  summaryValue: {
    flex: 1,
    textAlign: 'right',
    color: COLORS.TEXT_DARK,
    fontSize: 14,
    fontWeight: '600',
  },
});