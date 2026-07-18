import React, { useEffect, useState, useMemo, useLayoutEffect, useRef, useCallback, useContext } from 'react';
import {
  View,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Linking,
  Modal,
  Pressable,
  Image,
  Platform,
  ScrollView,
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
  createRepairOperation,
  startRepairOperation,
  completeRepairOperation,
  cancelRepairOperation,
  operationStatusLabel,
  addRepairPart,
  deleteRepairPart,
  updateRepairPart,
  issueRepairPartFromStock,
  reverseRepairPartStockIssue,
  repairPartSourceLabel,
  updateRepair,
  getRelatedServiceHistory,
  requestOwnerLoggedRepairConfirmation,
  respondOwnerLoggedRepairConfirmation,
  respondRepairReschedule,
  counterRepairReschedule,
  shopRespondRepairReschedule,
  shopConfirmVehicleArrival,
  clientReportVehicleArrival,
  cancelScheduledAppointment,
  uploadRepairMedia,
  deleteRepairMedia,
} from '../api/repairs';
import { getShopParts, prepareRepairPartsData } from '../api/parts';
import { getOffersForRepair, bookOffer, unbookOffer, deleteOffer } from '../api/offers';
import { RepairsList } from '../components/shop/RepairsList';
import RepairOutcomePanel from '../components/client/RepairOutcomePanel';
import AppNavigationBar from '../components/common/AppNavigationBar';
import PartnerAppHeader from '../components/partner/PartnerAppHeader';
import ScreenBackground from '../components/ScreenBackground';
import { useScrollShadow } from '../hooks/useScrollShadow';
import { useReturnToBack, useGoBackOr, useRouteBackLabel } from '../navigation/appNavBarBack';
import RepairMediaThumbnail from '../components/repair/RepairMediaThumbnail';
import { navigateToPartnerRepairOffer } from '../navigation/webNavigation';
import { markRepairNotificationsRead } from '../api/notifications';
import { WebSocketContext } from '../context/WebSocketManager';
import {
  SCHEDULE_DAY_OFFSETS,
  SCHEDULE_TIME_SLOTS,
  applyDayOffset,
  applyTimeSlotToDate,
  formatSchedulePreview,
} from '../utils/scheduleSlotPicker';
import {
  isVehicleAtShop,
  isUpcomingAppointment,
  clientReportedArrival,
  getVisitDisplayText,
  canCancelAppointment,
} from '../utils/repairArrival';
import AppCard from '../components/ui/AppCard';
import FloatingCard from '../components/ui/FloatingCard';
import RelatedServiceHistoryCard from '../components/repair/RelatedServiceHistoryCard';
import {
  createVehicleAccessRequest,
  getVehicleAccessRequest,
} from '../api/vehicleAccess';
import StatusBadge from '../components/ui/StatusBadge';
import { COLORS } from '../constants/colors';
import { useTranslation, translateRepairStatus } from '../i18n';
import { translateRepairTypeLabel } from '../utils/translateShopTypeLabels';
import { formatDurationMinutes } from '../utils/laborDuration';
import { getOperationIcon } from '../icons/operationIconRegistry';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'expo-image-picker';
import {
  formatOwnerLoggedTrustLabel,
  formatServiceRecordProvider,
  ownerLoggedConfirmationStatus,
} from '../utils/serviceRecordProvider';
import { DEFAULT_CURRENCY, formatMoneyAmount } from '../constants/currency';
import { formatOfferPrimaryPrice, formatOfferPricingLines } from '../utils/offerPricing';
import { getPartnerRequestGuide } from '../utils/partnerRepairLifecycle';
import {
  analyzeFinalizeKilometers,
  hasOdometerPhotoAttachment,
  repairHasOdometerEvidence,
  parseOdometerKm,
  resolveEffectiveFinalizeKm,
  suggestFinalizeKm,
  initialFinalKilometersInput,
} from '../utils/finalizeMileageValidation';
import { pickOdometerPhotoAttachment } from '../utils/pickDocumentFile';
import { uploadRepairDocument } from '../api/documents';
import { showMessage } from '../utils/crossPlatformAlert';
import { messageFromApiError } from '../utils/apiErrorMessage';
import { safeError } from '../utils/logger';
import { getPartsExport } from '../api/serviceMenu';
import { presentPartsExportShareSheet } from '../utils/partsExportShare';
import { computePartsTotals } from '../utils/repairPartsTotals';
import {
  readShopMemberships,
  shopCapabilityEnabled,
  shopHasPermission,
  shopMembershipFor,
} from '../utils/shopErpAccess';
import { STORAGE_KEYS } from '../constants/storageKeys';
import FinalizeOdometerEvidenceSheet from '../components/repair/FinalizeOdometerEvidenceSheet';
import RepairInvoicingCard from '../components/shop/RepairInvoicingCard';

function resolveEffectiveServiceTypeId(finalRepairTypeId, repair) {
  const fromForm = String(finalRepairTypeId || '').trim();
  if (fromForm) return fromForm;
  if (repair?.final_repair_type != null && repair.final_repair_type !== '') {
    return String(repair.final_repair_type);
  }
  if (repair?.repair_type != null && repair.repair_type !== '') {
    return String(repair.repair_type);
  }
  return '';
}

function formatEvidenceLevel(level) {
  if (!level) return null;
  const k = String(level).toLowerCase();
  const map = {
    owner_entered: 'Owner entered',
    owner_with_photos: 'Owner with photos',
    receipt_attached: 'Receipt attached',
    service_center_confirmed: 'Service center confirmed',
    platform_invoice_linked: 'Platform invoice linked',
    inventory_stock_linked: 'Inventory stock linked',
    later_inspection_confirmed: 'Later inspection confirmed',
    disputed: 'Disputed',
    admin_verified: 'Admin verified',
    imported_document: 'Imported document',
    external_import: 'External import',
  };
  return map[k] || String(level).replace(/_/g, ' ');
}

function hasOdometerEvidenceAvailable(repair, pendingPhoto) {
  return Boolean(
    pendingPhoto ||
      hasOdometerPhotoAttachment(repair?.documents) ||
      repairHasOdometerEvidence(repair)
  );
}

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

const PAYMENT_STATUS_OPTIONS = [
  { value: 'paid', label: 'Paid on pickup', hint: 'Customer paid when collecting the vehicle' },
  { value: 'unpaid', label: 'Unpaid', hint: 'Bill later — common for fleet accounts' },
  {
    value: 'included_in_invoice',
    label: 'Monthly invoice',
    hint: 'Company / fleet — settle on periodic invoice',
  },
  { value: 'partially_paid', label: 'Partial deposit', hint: 'Deposit received, balance outstanding' },
];

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

function parseApiErrorMessage(error, fallback = 'Request failed.') {
  return messageFromApiError(error, fallback);
}

export default function RepairDetailScreen({ route, navigation }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { returnTo } = route.params || {};
  const repairId = useMemo(() => {
    const id = Number(route.params?.repairId);
    return Number.isFinite(id) ? id : null;
  }, [route.params?.repairId]);
  const { scrolled, onScroll, scrollEventThrottle } = useScrollShadow();
  const backLabel = useRouteBackLabel(route);
  const returnParams = useMemo(() => {
    if (returnTo !== 'RepairsList' && returnTo !== 'ClientRepairs') return undefined;
    const tab = route.params?.initialTab || route.params?.statusFilter || route.params?.tab;
    return tab ? { initialTab: tab } : undefined;
  }, [returnTo, route.params?.initialTab, route.params?.statusFilter, route.params?.tab]);
  const handleBack = useReturnToBack(navigation, returnTo, backLabel, returnParams);
  const fallbackBack = useGoBackOr(navigation);
  const onBack = returnTo || route.params?.backLabel || route.params?.backLabelKey ? handleBack : fallbackBack;
  const { setNotifications, refreshUnreadFromRest } = useContext(WebSocketContext);
  const theme = useTheme();

  const [repair, setRepair] = useState(null);
  const [repairParts, setRepairParts] = useState([]);
  const [operations, setOperations] = useState([]);
  const [operationsExpanded, setOperationsExpanded] = useState({});
  const [operationActionId, setOperationActionId] = useState(null);
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
  const [shopUsesInventory, setShopUsesInventory] = useState(false);
  const [canIssueStock, setCanIssueStock] = useState(false);
  const [issuingPartId, setIssuingPartId] = useState(null);
  const [reversingPartId, setReversingPartId] = useState(null);
  const [editDescription, setEditDescription] = useState('');
  const [finalKilometers, setFinalKilometers] = useState('');
  const [laborPrice, setLaborPrice] = useState('');
  const [partsPrice, setPartsPrice] = useState('');
  const [totalPrice, setTotalPrice] = useState('');
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const [pendingOdometerPhoto, setPendingOdometerPhoto] = useState(null);
  const [finalizeKmError, setFinalizeKmError] = useState('');
  const [finalizeTypeError, setFinalizeTypeError] = useState('');
  const [odometerEvidenceSheet, setOdometerEvidenceSheet] = useState(null);
  const [odometerDiscrepancyNote, setOdometerDiscrepancyNote] = useState('');
  const [odometerSheetFinalizing, setOdometerSheetFinalizing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('unpaid');
  const [paymentStatusSaving, setPaymentStatusSaving] = useState(false);
  const [warrantyMonths, setWarrantyMonths] = useState('');
  const totalManuallyEditedRef = useRef(false);
  const [offers, setOffers] = useState([]);
  const [repairTypes, setRepairTypes] = useState([]);
  const [finalRepairTypeId, setFinalRepairTypeId] = useState('');
  const [selectedImageUri, setSelectedImageUri] = useState(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [requestingConfirmation, setRequestingConfirmation] = useState(false);
  const [respondingConfirmation, setRespondingConfirmation] = useState(false);
  const [respondingReschedule, setRespondingReschedule] = useState(false);
  const [partsExportExtra, setPartsExportExtra] = useState('');
  const [exportingParts, setExportingParts] = useState(false);
  const [counterModalVisible, setCounterModalVisible] = useState(false);
  const [counterDate, setCounterDate] = useState(() => applyDayOffset(new Date(), 1, new Date()));
  const [counterTimeSlot, setCounterTimeSlot] = useState('09:00');
  const [counterDayOffset, setCounterDayOffset] = useState(1);
  const [counterNote, setCounterNote] = useState('');
  const [submittingCounter, setSubmittingCounter] = useState(false);
  const [respondingArrival, setRespondingArrival] = useState(false);
  const [cancelingAppointment, setCancelingAppointment] = useState(false);
  const [relatedServiceHistory, setRelatedServiceHistory] = useState(null);
  const [relatedHistoryLoading, setRelatedHistoryLoading] = useState(false);
  const [historyAccessRequest, setHistoryAccessRequest] = useState(null);
  const [requestingHistoryAccess, setRequestingHistoryAccess] = useState(false);

  const navTitle = useMemo(() => {
    if (!repair) return t('repairs.detail.navRepairDetails');
    const st = String(repair.status || '').toLowerCase();
    if (st === 'open') {
      if (repair.scheduled_start) return t('repairs.detail.navBooking');
      return t('repairs.detail.navRequest');
    }
    if (st === 'done') return t('repairs.detail.serviceRecordTitle');
    if (st === 'ongoing') return t('repairs.detail.navRepair');
    return t('repairs.detail.navRepairDetails');
  }, [repair, t]);

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

  const runFinalizeMileageGate = useCallback(
    async (parsedFinalKilometers) => {
      const priorMax = repair?.prior_max_odometer_km;
      const analysis = analyzeFinalizeKilometers(parsedFinalKilometers, priorMax);
      if (analysis.ok) {
        setFinalizeKmError('');
        return { proceed: true, jumpAcknowledged: false };
      }
      if (hasOdometerEvidenceAvailable(repair, pendingOdometerPhoto)) {
        setFinalizeKmError('');
        return { proceed: true, jumpAcknowledged: true };
      }
      setFinalizeKmError(analysis.message);
      return {
        proceed: false,
        needsEvidenceSheet: true,
        analysis,
        km: parsedFinalKilometers,
      };
    },
    [repair, pendingOdometerPhoto]
  );

  const handlePickDashboardPhoto = useCallback(async () => {
    try {
      const attachment = await pickOdometerPhotoAttachment();
      if (attachment) {
        setPendingOdometerPhoto(attachment);
        setFinalizeKmError('');
      }
    } catch (err) {
      showMessage('Error', err.message || 'Could not pick dashboard photo.');
    }
  }, []);

  const handleUpdateRepair = async ({
    finalize = false,
    showSuccessAlert = true,
    mileageLargeJumpAcknowledged = false,
    skipMileageGate = false,
    odometerNote = '',
    partsOverride = null,
  } = {}) => {
    if (repair.status === 'done') {
      Alert.alert("This repair is completed and can no longer be edited.");
      return false;
    }
    const partsToSend = partsOverride ?? (selectedParts.length > 0 ? selectedParts : repairParts);
    const partsTotals = computePartsTotals(partsToSend);
    try {
      if (finalize) {
        const effectiveTypeId = resolveEffectiveServiceTypeId(finalRepairTypeId, repair);
        if (!effectiveTypeId) {
          const msg = 'Select the final service type before completing this repair.';
          setFinalizeTypeError(msg);
          showMessage('Service type required', msg);
          return false;
        }
        setFinalizeTypeError('');
      }

      if (finalize && !skipMileageGate) {
        const effectiveKm = resolveEffectiveFinalizeKm(finalKilometers, repair);
        if (effectiveKm == null) {
          const msg = 'Enter the final vehicle kilometers before completing this repair.';
          setFinalizeKmError(msg);
          setOdometerEvidenceSheet({
            visible: true,
            analysis: { blocked: false, message: msg, requiresOdometerEvidence: false },
            km: null,
          });
          return false;
        }
        const gate = await runFinalizeMileageGate(effectiveKm);
        if (!gate.proceed) {
          if (gate.needsEvidenceSheet) {
            setOdometerEvidenceSheet({
              visible: true,
              analysis: gate.analysis,
              km: gate.km,
            });
          }
          return false;
        }
        if (gate.jumpAcknowledged) {
          mileageLargeJumpAcknowledged = true;
        }
      }

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
      const noteText = String(odometerNote || odometerDiscrepancyNote || '').trim();
      if (noteText) {
        const noteLine = `Odometer note: ${noteText}`;
        body.shop_description = [String(shopDescription || '').trim(), noteLine].filter(Boolean).join('\n');
      }
      const parsedFinalRepairTypeId = String(finalRepairTypeId || '').trim()
        ? parseInt(finalRepairTypeId, 10)
        : null;
      const effectiveTypeIdForSave = resolveEffectiveServiceTypeId(finalRepairTypeId, repair);
      if (parsedFinalRepairTypeId != null && !Number.isNaN(parsedFinalRepairTypeId)) {
        body.final_repair_type = parsedFinalRepairTypeId;
      } else if (effectiveTypeIdForSave) {
        const parsedEffective = parseInt(effectiveTypeIdForSave, 10);
        if (!Number.isNaN(parsedEffective)) {
          body.final_repair_type = parsedEffective;
        }
      } else if (parsedFinalRepairTypeId === null) {
        body.final_repair_type = null;
      }
      const parsedLaborPrice = partsToSend.length
        ? partsTotals.laborSum
        : String(laborPrice || '').trim()
          ? parseFloat(laborPrice)
          : null;
      const parsedPartsPrice = partsToSend.length
        ? partsTotals.partsSum
        : String(partsPrice || '').trim()
          ? parseFloat(partsPrice)
          : null;
      let parsedTotalPrice = String(totalPrice || '').trim() ? parseFloat(totalPrice) : null;
      if (partsToSend.length > 0) {
        parsedTotalPrice = partsTotals.total;
      } else if (
        (parsedTotalPrice === null || Number.isNaN(parsedTotalPrice)) &&
        (parsedLaborPrice != null || parsedPartsPrice != null)
      ) {
        const labor = Number.isFinite(parsedLaborPrice) ? parsedLaborPrice : 0;
        const parts = Number.isFinite(parsedPartsPrice) ? parsedPartsPrice : 0;
        parsedTotalPrice = labor + parts;
      }
      const parsedFinalKilometers =
        parseOdometerKm(finalKilometers) ?? suggestFinalizeKm(repair);
      if (parsedFinalKilometers != null) {
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
      body.currency = DEFAULT_CURRENCY;
      body.payment_status = paymentStatus || 'unpaid';
      const parsedWarrantyMonths = String(warrantyMonths || '').trim()
        ? parseInt(warrantyMonths, 10)
        : null;
      if (!Number.isNaN(parsedWarrantyMonths)) {
        body.warranty_months = parsedWarrantyMonths;
      }
      if (finalize) {
        body.status = 'done';
        if (mileageLargeJumpAcknowledged) {
          body.mileage_large_jump_acknowledged = true;
        }
      }

      if (pendingOdometerPhoto && repair?.vehicle) {
        await uploadRepairDocument(token, repair.vehicle, repairId, pendingOdometerPhoto, {
          document_type: pendingOdometerPhoto.documentType,
          title: pendingOdometerPhoto.title || 'Odometer photo',
          notes: noteText || undefined,
          currency: DEFAULT_CURRENCY,
        });
        setPendingOdometerPhoto(null);
      }

      await updateRepair(token, repairId, body);
      await refreshRepair();
      await refreshParts();
      if (showSuccessAlert) {
        if (finalize) {
          showMessage(
            'Repair completed',
            'The client was notified that the vehicle is ready for pickup.',
            { variant: 'success' }
          );
        } else {
          showMessage('Saved', 'Repair progress saved successfully.');
        }
      }
      setFinalizeKmError('');
      setFinalizeTypeError('');
      setOdometerEvidenceSheet(null);
      setOdometerDiscrepancyNote('');
      return true;
    } catch (err) {
      console.error('❌ Update Error:', err);
      const message = parseApiErrorMessage(err, 'Failed to update repair');
      if (/odometer|kilometer|\bkm\b/i.test(message)) {
        setFinalizeKmError(message);
        const effectiveKm = resolveEffectiveFinalizeKm(finalKilometers, repair);
        const analysis = analyzeFinalizeKilometers(effectiveKm, repair?.prior_max_odometer_km);
        setOdometerEvidenceSheet({
          visible: true,
          analysis: analysis.ok
            ? { blocked: true, message, requiresOdometerEvidence: true }
            : analysis,
          km: effectiveKm,
        });
        setOdometerSheetFinalizing(false);
        return false;
      }
      if (/service type|final_repair_type|repair_type/i.test(message)) {
        setFinalizeTypeError(message);
      }
      showMessage('Error', message);
      setOdometerSheetFinalizing(false);
      return false;
    }
  };

  useEffect(() => {
    if (repairId == null) {
      setLoading(false);
      return undefined;
    }

    const loadData = async () => {
      const token = await AsyncStorage.getItem('@access_token');
      const shopFlag = await AsyncStorage.getItem('@is_shop');
      const storedUserId = await AsyncStorage.getItem('@user_id');
      setIsShop(shopFlag === 'true');
      setCurrentUserId(storedUserId ? Number(storedUserId) : null);

      // Fetch shop profile id if isShop
      if (shopFlag === 'true') {
        const currentShopId = await AsyncStorage.getItem('@current_shop_id');
        const parsedShopId = parseInt(currentShopId, 10);
        setShopProfileId(parsedShopId);
        const [profilesRaw, memberships] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.SHOP_PROFILES),
          readShopMemberships(),
        ]);
        let profile = null;
        if (profilesRaw) {
          try {
            const profiles = JSON.parse(profilesRaw);
            profile = profiles.find((row) => Number(row.id) === parsedShopId) || null;
          } catch {
            profile = null;
          }
        }
        const membership = shopMembershipFor(memberships, parsedShopId);
        setShopUsesInventory(shopCapabilityEnabled(profile, 'uses_inventory'));
        setCanIssueStock(shopHasPermission(membership, 'move_stock'));
      } else {
        setShopProfileId(null);
        setShopUsesInventory(false);
        setCanIssueStock(false);
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
        setOperations(Array.isArray(repairData.operations) ? repairData.operations : []);
        setEditDescription(repairData.description || '');
        setShopDescription(repairData.shop_description || '');
        setFinalKilometers(initialFinalKilometersInput(repairData));
        setLaborPrice(repairData.labor_price != null ? String(repairData.labor_price) : '');
        setPartsPrice(repairData.parts_price != null ? String(repairData.parts_price) : '');
        setTotalPrice(repairData.total_price != null ? String(repairData.total_price) : '');
        totalManuallyEditedRef.current = repairData.total_price != null;
        setCurrency(repairData.currency || DEFAULT_CURRENCY);
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

  useEffect(() => {
    let cancelled = false;

    const loadRelatedHistory = async () => {
      if (!isShop || !repair?.id) {
        setRelatedServiceHistory(null);
        return;
      }
      const hasAccess =
        repair.shop_data_access_scope ||
        Boolean(String(repair.vehicle_license_plate || '').trim());
      if (!hasAccess) {
        setRelatedServiceHistory(null);
        return;
      }

      setRelatedHistoryLoading(true);
      try {
        const token = await AsyncStorage.getItem('@access_token');
        const data = await getRelatedServiceHistory(token, repair.id);
        if (!cancelled) setRelatedServiceHistory(data);
      } catch (error) {
        console.warn('Related service history unavailable', error);
        if (!cancelled) setRelatedServiceHistory(null);
      } finally {
        if (!cancelled) setRelatedHistoryLoading(false);
      }
    };

    loadRelatedHistory();
    return () => {
      cancelled = true;
    };
  }, [isShop, repair?.id, repair?.shop_data_access_scope, repair?.vehicle_license_plate]);

  // Handle route.params updates (e.g., after selecting parts) — save immediately once.
  useEffect(() => {
    const added = route.params?.addedParts;
    if (!added?.length || !repair || repair.status === 'done' || loading) return;

    let cancelled = false;
    (async () => {
      setSelectedParts(added);
      const totals = computePartsTotals(added);
      setLaborPrice(String(totals.laborSum));
      setPartsPrice(String(totals.partsSum));
      setTotalPrice(String(totals.total));
      totalManuallyEditedRef.current = false;

      const ok = await handleUpdateRepair({
        partsOverride: added,
        showSuccessAlert: true,
      });
      if (!cancelled && ok) {
        navigation.setParams({ addedParts: undefined });
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params?.addedParts, repair?.id, loading]);

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
    setOperations(Array.isArray(repairData.operations) ? repairData.operations : []);
    setEditDescription(repairData.description || '');
    setShopDescription(repairData.shop_description || '');
    setFinalKilometers(initialFinalKilometersInput(repairData));
    setLaborPrice(repairData.labor_price != null ? String(repairData.labor_price) : '');
    setPartsPrice(repairData.parts_price != null ? String(repairData.parts_price) : '');
    setTotalPrice(repairData.total_price != null ? String(repairData.total_price) : '');
    totalManuallyEditedRef.current = repairData.total_price != null;
    setCurrency(repairData.currency || DEFAULT_CURRENCY);
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
    if (String(repair?.status || '').toLowerCase() !== 'ongoing') {
      showMessage('Cannot finalize', 'Only ongoing repairs can be finalized.');
      return;
    }
    await handleUpdateRepair({ finalize: true, showSuccessAlert: true });
  };

  const handleOdometerSheetFinalize = async () => {
    if (!pendingOdometerPhoto) return;
    setOdometerSheetFinalizing(true);
    await handleUpdateRepair({
      finalize: true,
      showSuccessAlert: true,
      skipMileageGate: true,
      odometerNote: odometerDiscrepancyNote,
    });
    setOdometerSheetFinalizing(false);
  };

  const handleOdometerSheetConfirmWithoutPhoto = async () => {
    setOdometerSheetFinalizing(true);
    await handleUpdateRepair({
      finalize: true,
      showSuccessAlert: true,
      skipMileageGate: true,
      mileageLargeJumpAcknowledged: true,
      odometerNote: odometerDiscrepancyNote,
    });
    setOdometerSheetFinalizing(false);
  };

  const refreshParts = async () => {
    const token = await AsyncStorage.getItem('@access_token');
    const parts = await getRepairParts(token, repairId);
    setRepairParts(parts);
  };

  const handleAddOperation = async () => {
    if (!isMyShopRepair || !repairTypes.length) return;
    const defaultType = repairTypes[0];
    try {
      setOperationActionId('create');
      const token = await AsyncStorage.getItem('@access_token');
      const nextSequence = (operations.reduce((max, row) => Math.max(max, Number(row.sequence) || 0), 0) || 0) + 10;
      await createRepairOperation(token, repairId, {
        repair_type_id: defaultType.id,
        sequence: nextSequence,
      });
      await refreshRepair();
    } catch (err) {
      showMessage('Could not add operation', messageFromApiError(err, 'Please try again.'));
    } finally {
      setOperationActionId(null);
    }
  };

  const handleOperationLifecycle = async (operationId, action) => {
    if (!isMyShopRepair) return;
    try {
      setOperationActionId(operationId);
      const token = await AsyncStorage.getItem('@access_token');
      if (action === 'start') {
        await startRepairOperation(token, repairId, operationId);
      } else if (action === 'complete') {
        await completeRepairOperation(token, repairId, operationId);
      } else if (action === 'cancel') {
        await cancelRepairOperation(token, repairId, operationId);
      }
      await refreshRepair();
      await refreshParts();
    } catch (err) {
      showMessage('Operation update failed', messageFromApiError(err, 'Please try again.'));
    } finally {
      setOperationActionId(null);
    }
  };

  const computeOperationSubtotals = (operationId) => {
    const opParts = repairParts.filter(
      (part) => Number(part.service_order_operation_id) === Number(operationId)
    );
    return computePartsTotals(opParts);
  };

  const renderRepairTotalsFooter = () => {
    if (!repair || (!isMyShopRepair && !isShop)) return null;
    if (footerTotals.total <= 0 && footerTotals.partsSum <= 0 && footerTotals.laborSum <= 0) {
      return null;
    }
    return (
      <FloatingCard style={styles.lightActionCard}>
        <Text style={styles.cardTitle}>Repair totals</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Parts total</Text>
          <Text style={styles.summaryValue}>
            {formatMoneyAmount(footerTotals.partsSum, footerTotals.currency)}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Labor total</Text>
          <Text style={styles.summaryValue}>
            {formatMoneyAmount(footerTotals.laborSum, footerTotals.currency)}
          </Text>
        </View>
        <View style={[styles.summaryRow, { borderBottomWidth: 0 }]}>
          <Text style={[styles.summaryLabel, { fontWeight: '700', color: COLORS.TEXT_DARK }]}>Grand total</Text>
          <Text style={[styles.summaryValue, styles.summaryValueEmphasis]}>
            {formatMoneyAmount(footerTotals.total, footerTotals.currency)}
          </Text>
        </View>
        {repair.total_margin != null && repair.total_parts_cost != null ? (
          <Text style={[styles.mutedText, { marginTop: 8 }]}>
            Internal margin: {formatMoneyAmount(parseFloat(repair.total_margin), footerTotals.currency)}
          </Text>
        ) : null}
      </FloatingCard>
    );
  };

  const toggleOperationExpanded = (operationId) => {
    setOperationsExpanded((prev) => ({ ...prev, [operationId]: !prev[operationId] }));
  };

  const renderOperationsSection = () => {
    if (!isShop || !isMyShopRepair || String(repair?.status || '').toLowerCase() === 'done') {
      return null;
    }
    const progress = repair?.operations_progress;
    return (
      <FloatingCard style={styles.lightActionCard}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.cardTitle}>Operations</Text>
          {progress ? (
            <Text style={styles.mutedText}>
              {progress.completed}/{progress.total} completed
            </Text>
          ) : null}
        </View>
        <Text style={styles.mutedText}>
          Split work into job lines. One default operation is enough for simple repairs.
        </Text>
        {operations.length === 0 ? (
          <Text style={styles.mutedText}>No operations yet — add one to organize parts and labor.</Text>
        ) : (
          operations.map((op) => {
            const expanded = operationsExpanded[op.id];
            const opParts = repairParts.filter(
              (part) => Number(part.service_order_operation_id) === Number(op.id)
            );
            const opTotals = computeOperationSubtotals(op.id);
            return (
              <View key={op.id} style={{ marginTop: 12, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#ddd' }}>
                <Pressable onPress={() => toggleOperationExpanded(op.id)}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8, paddingRight: 8 }}>
                      <MaterialCommunityIcons
                        name={getOperationIcon(op)}
                        size={20}
                        color={COLORS.PRIMARY}
                      />
                      <Text style={{ fontWeight: '600', flexShrink: 1 }}>
                        {op.sequence != null ? `${op.sequence} · ` : ''}
                        {op.operation_name || 'Work performed'}
                      </Text>
                    </View>
                    <StatusBadge status={op.status} label={operationStatusLabel(op.status)} />
                  </View>
                  <Text style={styles.mutedText}>
                    Parts {formatMoneyAmount(opTotals.partsSum, DEFAULT_CURRENCY)} · Labor{' '}
                    {formatMoneyAmount(opTotals.laborSum, DEFAULT_CURRENCY)} · Total{' '}
                    {formatMoneyAmount(opTotals.total, DEFAULT_CURRENCY)}
                  </Text>
                </Pressable>
                {expanded ? (
                  <View style={{ marginTop: 8, gap: 6 }}>
                    {opParts.length ? (
                      <View>
                        <Text style={styles.mutedText}>Parts</Text>
                        {opParts.map((part) => (
                          <Text key={part.id} style={styles.detailLine}>
                            {(part.description || part.part_master_detail?.name || 'Part').trim()} ×{' '}
                            {part.quantity || 1}
                          </Text>
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.mutedText}>No parts on this operation yet.</Text>
                    )}
                    {op.assigned_mechanics?.length ? (
                      <Text style={styles.mutedText}>Mechanics: {op.assigned_mechanics.join(', ')}</Text>
                    ) : null}
                    {op.notes ? <Text style={styles.mutedText}>{op.notes}</Text> : null}
                    {op.status !== 'completed' && op.status !== 'cancelled' && op.status !== 'declined' ? (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {op.status !== 'in_progress' ? (
                          <Button
                            compact
                            mode="outlined"
                            loading={operationActionId === op.id}
                            disabled={operationActionId != null}
                            onPress={() => handleOperationLifecycle(op.id, 'start')}
                          >
                            Start
                          </Button>
                        ) : null}
                        <Button
                          compact
                          mode="contained"
                          loading={operationActionId === op.id}
                          disabled={operationActionId != null}
                          onPress={() => handleOperationLifecycle(op.id, 'complete')}
                        >
                          Complete
                        </Button>
                        <Button
                          compact
                          mode="outlined"
                          textColor={COLORS.ERROR || '#b91c1c'}
                          loading={operationActionId === op.id}
                          disabled={operationActionId != null}
                          onPress={() => handleOperationLifecycle(op.id, 'cancel')}
                        >
                          Cancel
                        </Button>
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </View>
            );
          })
        )}
        <Button
          mode="outlined"
          icon="plus"
          style={{ marginTop: 12 }}
          loading={operationActionId === 'create'}
          disabled={operationActionId != null || !repairTypes.length}
          onPress={handleAddOperation}
        >
          Add operation
        </Button>
      </FloatingCard>
    );
  };

  const isMyShopRepair = useMemo(() => {
    if (!isShop || !repair || shopProfileId == null) return false;
    return Number(repair.shop_profile) === Number(shopProfileId);
  }, [isShop, repair, shopProfileId]);

  const handleSavePaymentStatus = async (nextStatus) => {
    const statusToSave = nextStatus ?? paymentStatus;
    if (!isShop || !isMyShopRepair || paymentStatusSaving) return false;
    setPaymentStatusSaving(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      await updateRepair(token, repairId, { payment_status: statusToSave || 'unpaid' });
      setPaymentStatus(statusToSave);
      await refreshRepair();
      showMessage('Payment status updated', '', { variant: 'success' });
      return true;
    } catch (err) {
      showMessage('Error', parseApiErrorMessage(err, 'Could not update payment status.'));
      return false;
    } finally {
      setPaymentStatusSaving(false);
    }
  };

  const shopProfileIdNum = shopProfileId != null ? Number(shopProfileId) : null;

  const shopHasBookedOfferForRepair = useMemo(() => {
    if (!isShop || shopProfileIdNum == null || Number.isNaN(shopProfileIdNum)) return false;
    if (!Array.isArray(offers)) return false;
    return offers.some((o) => o.is_booked && Number(o.shop) === shopProfileIdNum);
  }, [isShop, shopProfileIdNum, offers]);

  /** Shop may see plate when API exposes it (booked job or vehicle authorized for shop). */
  const canViewerSeeVehiclePlate = useMemo(() => {
    if (!repair) return false;
    if (!isShop) return true;
    return Boolean(String(repair.vehicle_license_plate || '').trim());
  }, [repair, isShop]);

  const canOpenVehicleProfile = useMemo(
    () => isShop && Boolean(repair?.can_open_vehicle_profile && repair?.vehicle),
    [isShop, repair?.can_open_vehicle_profile, repair?.vehicle]
  );

  const displayPartsList = selectedParts.length > 0 ? selectedParts : repairParts;
  const displayPartsTotals = useMemo(
    () => computePartsTotals(displayPartsList),
    [selectedParts, repairParts]
  );
  const repairDerivedTotals = useMemo(() => {
    const currency = repair?.currency || DEFAULT_CURRENCY;
    const parts = repair?.total_parts_customer;
    const labor = repair?.total_labor_customer;
    const grand = repair?.total_repair_customer;
    if (parts == null && labor == null && grand == null) return null;
    return {
      partsSum: parts != null ? parseFloat(parts) : 0,
      laborSum: labor != null ? parseFloat(labor) : 0,
      total: grand != null ? parseFloat(grand) : 0,
      currency,
    };
  }, [
    repair?.total_parts_customer,
    repair?.total_labor_customer,
    repair?.total_repair_customer,
    repair?.currency,
  ]);
  const footerTotals = repairDerivedTotals || {
    partsSum: displayPartsTotals.partsSum,
    laborSum: displayPartsTotals.laborSum,
    total: displayPartsTotals.total,
    currency: repair?.currency || DEFAULT_CURRENCY,
  };
  const hasPartsLines = displayPartsList.length > 0;

  const openVehicleProfile = useCallback(() => {
    if (!canOpenVehicleProfile) return;
    navigation.navigate('VehicleDetail', {
      vehicleId: String(repair.vehicle),
      backLabel: t('repairs.detail.navRepair'),
      returnTo: 'RepairDetail',
      repairId,
    });
  }, [canOpenVehicleProfile, navigation, repair?.vehicle, repairId, t]);

  const linkedShopProfileId = useMemo(() => {
    const raw = repair?.shop_profile ?? repair?.shop_profile_id;
    if (raw == null || raw === '') return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }, [repair?.shop_profile, repair?.shop_profile_id]);

  const canOpenShopProfile = useMemo(
    () => !isShop && linkedShopProfileId != null,
    [isShop, linkedShopProfileId]
  );

  const openShopProfile = useCallback(() => {
    if (!canOpenShopProfile || linkedShopProfileId == null) return;
    navigation.navigate('ShopDetail', {
      shopId: linkedShopProfileId,
      vehicleId: repair?.vehicle ? Number(repair.vehicle) : undefined,
      returnTo: 'RepairDetail',
      repairId,
    });
  }, [canOpenShopProfile, linkedShopProfileId, navigation, repair?.vehicle, repairId]);

  const localizedPaymentStatus = useCallback(
    (status) => {
      if (!status) return '—';
      const key = String(status).toLowerCase();
      return t(`repairs.detail.paymentStatusValues.${key}`, null, formatPaymentStatus(status));
    },
    [t]
  );

  const renderLinkedServiceCenterValue = useCallback(
    (name, { emphasize = false } = {}) => {
      const displayName = String(name || '').trim() || '—';
      if (!canOpenShopProfile || displayName === '—') {
        return (
          <Text style={[styles.summaryValue, emphasize ? styles.summaryValueEmphasis : null]}>
            {displayName}
          </Text>
        );
      }
      return (
        <Pressable
          onPress={openShopProfile}
          accessibilityRole="link"
          style={({ pressed }) => [pressed ? { opacity: 0.85 } : null]}
        >
          <Text style={[styles.summaryValue, styles.shopNameLink, emphasize ? styles.summaryValueEmphasis : null]}>
            {displayName}
          </Text>
          <Text style={styles.shopTapHint}>{t('vehicles.detail.tapForShopProfile')}</Text>
        </Pressable>
      );
    },
    [canOpenShopProfile, openShopProfile, t]
  );

  const openHistoryRepair = useCallback(
    (historyRepairId) => {
      if (!historyRepairId) return;
      navigation.push('RepairDetail', { repairId: historyRepairId });
    },
    [navigation]
  );

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
    if (!selectedOfferId || !repair?.vehicle) {
      Alert.alert('Error', 'Missing offer or vehicle information.');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('@access_token');
      await bookOffer(token, selectedOfferId, repair.vehicle);
      Alert.alert('Success', 'Offer booked!');
      await refreshRepair();
      await refreshOffers();
    } catch (err) {
      safeError('Booking failed', err);
      Alert.alert('Error', err.message || 'Failed to book offer');
    }
  };

  const handleUnbookOffer = async (selectedOfferId) => {
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
      safeError('Cancel booking failed', err);
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

  const handleIssuePartFromStock = async (partId) => {
    try {
      setIssuingPartId(partId);
      const token = await AsyncStorage.getItem('@access_token');
      await issueRepairPartFromStock(token, repairId, partId);
      await refreshParts();
    } catch (err) {
      Alert.alert('Stock issue failed', err.responseText || err.message || 'Could not issue from stock.');
    } finally {
      setIssuingPartId(null);
    }
  };

  const handleReverseStockIssue = (partId, partLabel) => {
    Alert.alert(
      'Reverse stock issue?',
      `Return "${partLabel}" to warehouse stock? The part line stays on this repair — only the stock deduction is undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reverse stock issue',
          style: 'destructive',
          onPress: async () => {
            try {
              setReversingPartId(partId);
              const token = await AsyncStorage.getItem('@access_token');
              await reverseRepairPartStockIssue(token, repairId, partId);
              await refreshParts();
            } catch (err) {
              Alert.alert(
                'Reverse failed',
                err.message || err.responseText || 'Could not reverse stock issue.',
              );
            } finally {
              setReversingPartId(null);
            }
          },
        },
      ],
    );
  };

  const renderRepairPartItem = ({ item }) => {
    const stockBacked = ['inventory', 'catalog', 'catalog_pick'].includes(item.source_type);
    const partLabel =
      item.partsMaster?.name ||
      item.part_master_detail?.name ||
      item.shop_part_detail?.part?.name ||
      item.description ||
      'Unnamed Part';
    const canIssueThisPart =
      shopUsesInventory &&
      canIssueStock &&
      shopCanManagePartsOnRepair &&
      stockBacked &&
      !item.stock_issued &&
      Boolean(item.shop_part_detail || item.shop_part_id);
    const canReverseStockIssue =
      shopUsesInventory &&
      canIssueStock &&
      shopCanManagePartsOnRepair &&
      item.stock_issued;
    const partBusy = issuingPartId === item.id || reversingPartId === item.id;
    return (
    <View style={{ borderBottomWidth: 1, borderBottomColor: '#ddd', paddingVertical: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ flex: 2 }}>
          {item.partsMaster?.name || item.part_master_detail?.name || item.shop_part_detail?.part?.name || item.description || 'Unnamed Part'}
        </Text>
        <Text style={{ flex: 1, textAlign: 'center' }}>{item.quantity}</Text>
        <Text style={{ flex: 1, textAlign: 'center' }}>
          {item.price_per_item_at_use ?? item.price ?? '—'}
        </Text>
        <Text style={{ flex: 1, textAlign: 'center' }}>
          {item.labor_cost ?? item.labor ?? '—'}
        </Text>
      </View>
      <Text style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
        {repairPartSourceLabel(item.source_type)}
        {item.stock_issued ? ' · Issued from stock' : stockBacked ? ' · Not issued' : ''}
      </Text>
      {canIssueThisPart ? (
        <Button
          mode="outlined"
          compact
          loading={issuingPartId === item.id}
          disabled={partBusy}
          onPress={() => handleIssuePartFromStock(item.id)}
          style={{ alignSelf: 'flex-start', marginTop: 4 }}
        >
          Issue from stock
        </Button>
      ) : null}
      {canReverseStockIssue ? (
        <Button
          mode="outlined"
          compact
          loading={reversingPartId === item.id}
          disabled={partBusy}
          onPress={() => handleReverseStockIssue(item.id, partLabel)}
          style={{ alignSelf: 'flex-start', marginTop: 4 }}
          textColor="#b45309"
        >
          Reverse stock issue
        </Button>
      ) : null}
      {item.note ? <Text style={{ fontStyle: 'italic', fontSize: 12, marginTop: 2 }}>Note: {item.note}</Text> : null}
    </View>
  );
  };

  if (loading || !repair) {
    return (
      <ScreenBackground safeArea={false}>
        <View style={styles.center}>
          {repairId == null && !loading ? (
            <Text style={{ color: '#fff', textAlign: 'center', paddingHorizontal: 24 }}>
              Repair not found — open this job from your repairs list.
            </Text>
          ) : (
            <ActivityIndicator size="large" color="#fff" />
          )}
        </View>
      </ScreenBackground>
    );
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
  const sourceLower = String(repair.source || '').toLowerCase();
  const isDone = statusLower === 'done';
  const isOpenStatus = statusLower === 'open';
  const isOngoingStatus = statusLower === 'ongoing';
  const vehicleAtShop = isVehicleAtShop(repair);
  const upcomingAppointment = isUpcomingAppointment(repair);
  const visitDisplayText = getVisitDisplayText(repair);
  const ownerCheckedIn = clientReportedArrival(repair);
  const isOwnerLoggedServiceRecord = sourceLower === 'owner_logged' && isDone;
  const ownerLoggedConfirmation = ownerLoggedConfirmationStatus(repair);
  const hasSelectedShopProvider = Boolean(repair?.shop_profile || repair?.shop_profile_id);
  const hasManualProvider = Boolean(
    String(repair?.manual_service_center_name || '').trim() ||
      String(repair?.manual_service_center_address || '').trim() ||
      String(repair?.manual_service_center_city || '').trim() ||
      String(repair?.manual_service_center_country || '').trim() ||
      String(repair?.manual_service_center_phone || '').trim() ||
      String(repair?.manual_service_center_email || '').trim() ||
      repair?.manual_service_center_latitude != null ||
      repair?.manual_service_center_longitude != null
  );
  const isClientOwner =
    !isShop &&
    (
      currentUserId == null ||
      repair?.client == null ||
      Number(repair.client) === Number(currentUserId)
    );
  const showCancelAppointment =
    canCancelAppointment(repair) && (isClientOwner || (isShop && isMyShopRepair));
  const canRequestServiceCenterConfirmation =
    isOwnerLoggedServiceRecord &&
    isClientOwner &&
    hasSelectedShopProvider &&
    ownerLoggedConfirmation !== 'pending' &&
    ownerLoggedConfirmation !== 'confirmed';
  const canShopRespondToConfirmation =
    isOwnerLoggedServiceRecord &&
    isShop &&
    repair?.shop_profile != null &&
    Number(repair.shop_profile) === Number(shopProfileId) &&
    ownerLoggedConfirmation === 'pending';
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
  const vehicleDisplay =
    `${repair.vehicle_make || ''} ${repair.vehicle_model || ''}`.trim() ||
    t('repairs.detail.vehicleFallback');
  const completionRecordedAt = formatHistoryDate(repair.completed_at || repair.updated_at);
  const summaryCurrency = repair.currency || DEFAULT_CURRENCY;
  const completedServiceTypeName =
    translateRepairTypeLabel(
      {
        slug:
          repair.final_repair_type_slug ||
          repair.effective_repair_type_slug ||
          repair.repair_type_slug,
        repair_type_name:
          repair.final_repair_type_name ||
          repair.effective_repair_type_name ||
          repair.repair_type_name ||
          null,
        name:
          repair.final_repair_type_name ||
          repair.effective_repair_type_name ||
          repair.repair_type_name ||
          null,
      },
      t
    ) || t('vehicles.detail.notSpecified');
  const qualityWarnings = Array.isArray(repair.quality_warnings) ? repair.quality_warnings : [];
  const showMissingTypeWarning =
    isShop &&
    repair.status === 'ongoing' &&
    Number(repair.shop_profile) === Number(shopProfileId) &&
    !resolveEffectiveServiceTypeId(finalRepairTypeId, repair);
  const isOpenRequest = isOpenStatus;
  const canEditClientRequest = isOpenRequest && isClientOwner;

  const heroReferenceLine = isOwnerLoggedServiceRecord
    ? t('repairs.detail.referenceServiceRecord', { id: repair.id })
    : isOpenStatus
      ? t('repairs.detail.referenceRequest', { id: repair.id })
      : isOngoingStatus
        ? t('repairs.detail.referenceRepair', { id: repair.id })
        : t('repairs.detail.referenceGeneric', { id: repair.id });

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

  const handleRequestServiceCenterConfirmation = async () => {
    if (!canRequestServiceCenterConfirmation || requestingConfirmation) return;
    try {
      setRequestingConfirmation(true);
      const token = await AsyncStorage.getItem('@access_token');
      await requestOwnerLoggedRepairConfirmation(token, repairId);
      await refreshRepair();
      Alert.alert('Confirmation requested', 'The selected service center was notified.');
    } catch (err) {
      Alert.alert(
        'Could not request confirmation',
        parseApiErrorMessage(err, 'Please try again.')
      );
    } finally {
      setRequestingConfirmation(false);
    }
  };

  const pendingReschedule = repair?.pending_reschedule_proposal;
  const rescheduleInitiator = pendingReschedule?.initiated_by || 'shop';
  const pendingFromShop = rescheduleInitiator === 'shop';
  const pendingFromOwner = rescheduleInitiator === 'owner';

  const handleShopArrival = async () => {
    try {
      setRespondingArrival(true);
      const token = await AsyncStorage.getItem('@access_token');
      await shopConfirmVehicleArrival(token, repairId);
      await refreshRepair();
      Alert.alert('Vehicle arrived', 'The repair is now in service.');
    } catch (err) {
      Alert.alert('Could not confirm', parseApiErrorMessage(err, 'Please try again.'));
    } finally {
      setRespondingArrival(false);
    }
  };

  const handleRequestVehicleHistory = async () => {
    const vehicleId = repair?.vehicle?.id || repair?.vehicle;
    if (!vehicleId) {
      showMessage(t('common.error'), t('repairs.detail.historyAccess.missingVehicle'));
      return;
    }
    try {
      setRequestingHistoryAccess(true);
      const data = await createVehicleAccessRequest(vehicleId, {
        related_repair_id: repairId,
        shop_profile_id: shopProfileIdNum || linkedShopProfileId || undefined,
        reason: t('repairs.detail.historyAccess.defaultReason'),
        requested_scope: 'BASIC_SERVICE_HISTORY',
        channel: 'qr_in_person',
      });
      setHistoryAccessRequest(data);
    } catch (err) {
      let errorBody = null;
      try {
        errorBody = err?.responseText ? JSON.parse(err.responseText) : null;
      } catch {
        errorBody = null;
      }
      const code = err?.code || errorBody?.code;
      const isDuplicatePending =
        code === 'duplicate_pending' ||
        code === 'already_pending' ||
        (Number(err?.status) === 409 && /pending|duplicate/i.test(String(code || '')));

      // If the API ever returns the existing pending request/token, restore the card.
      const existingRequest =
        errorBody?.request ||
        errorBody?.access_request ||
        (errorBody?.id && errorBody?.status ? errorBody : null);
      if (existingRequest?.id) {
        setHistoryAccessRequest((prev) => ({
          ...prev,
          ...existingRequest,
          authorization_token:
            existingRequest.authorization_token || prev?.authorization_token,
          authorization_code:
            existingRequest.authorization_code || prev?.authorization_code,
          qr_payload: existingRequest.qr_payload || prev?.qr_payload,
        }));
      }

      if (isDuplicatePending) {
        showMessage(
          t('repairs.detail.historyAccess.alreadySentTitle'),
          t('repairs.detail.historyAccess.alreadySent')
        );
        return;
      }

      const fallback =
        code === 'shop_ineligible'
          ? t('repairs.detail.historyAccess.shopIneligible')
          : t('repairs.detail.historyAccess.requestFailed');
      showMessage(
        t('repairs.detail.historyAccess.requestFailed'),
        parseApiErrorMessage(err, fallback)
      );
    } finally {
      setRequestingHistoryAccess(false);
    }
  };

  const refreshHistoryAccessRequest = async () => {
    if (!historyAccessRequest?.id) return;
    const vehicleId = repair?.vehicle?.id || repair?.vehicle;
    if (!vehicleId) return;
    try {
      const data = await getVehicleAccessRequest(vehicleId, historyAccessRequest.id);
      setHistoryAccessRequest((prev) => ({
        ...prev,
        ...data,
        authorization_token: prev?.authorization_token,
        authorization_code: prev?.authorization_code,
        qr_payload: prev?.qr_payload,
      }));
      if (data.status === 'approved' || data.status === 'partially_approved') {
        await refreshRepair();
      }
    } catch (err) {
      // Keep showing the last known waiting card.
    }
  };

  const handleClientArrival = async () => {
    try {
      setRespondingArrival(true);
      const token = await AsyncStorage.getItem('@access_token');
      await clientReportVehicleArrival(token, repairId);
      await refreshRepair();
      Alert.alert(
        t('repairs.detail.checkedInTitle'),
        t('repairs.detail.checkedInBody')
      );
    } catch (err) {
      Alert.alert(t('repairs.detail.couldNotCheckIn'), parseApiErrorMessage(err, 'Please try again.'));
    } finally {
      setRespondingArrival(false);
    }
  };

  const handleCancelAppointment = () => {
    Alert.alert(
      t('repairs.detail.cancelAppointmentTitle'),
      isShop
        ? t('repairs.detail.cancelAppointmentShopBody')
        : t('repairs.detail.cancelAppointmentOwnerBody'),
      [
        { text: t('repairs.detail.keepAppointment'), style: 'cancel' },
        {
          text: t('repairs.detail.cancelAppointment'),
          style: 'destructive',
          onPress: async () => {
            try {
              setCancelingAppointment(true);
              const token = await AsyncStorage.getItem('@access_token');
              await cancelScheduledAppointment(token, repairId);
              await markRepairNotificationsRead(repairId, {
                setNotifications,
                refreshUnreadFromRest,
              });
              await refreshRepair();
              Alert.alert(
                t('repairs.detail.appointmentCanceled'),
                t('repairs.detail.appointmentCanceledBody')
              );
            } catch (err) {
              Alert.alert(t('repairs.detail.couldNotCancel'), parseApiErrorMessage(err, 'Please try again.'));
            } finally {
              setCancelingAppointment(false);
            }
          },
        },
      ]
    );
  };

  const afterRescheduleAction = async (action) => {
    await markRepairNotificationsRead(repairId, {
      setNotifications,
      refreshUnreadFromRest,
    });
    await refreshRepair();
    if (returnTo === 'ClientActivity' || returnTo === 'ClientNotifications') {
      navigation.goBack();
      return;
    }
    Alert.alert(
      action === 'accept' ? 'New time confirmed' : 'Reschedule declined',
      action === 'accept'
        ? 'Your appointment was updated.'
        : 'The shop will keep the previous time unless they contact you.'
    );
  };

  const handleRescheduleResponse = async (action) => {
    if (!pendingReschedule || respondingReschedule || isShop || !pendingFromShop) return;
    try {
      setRespondingReschedule(true);
      const token = await AsyncStorage.getItem('@access_token');
      await respondRepairReschedule(token, repairId, {
        proposalId: pendingReschedule.id,
        action,
      });
      await afterRescheduleAction(action);
    } catch (err) {
      Alert.alert('Could not respond', parseApiErrorMessage(err, 'Please try again.'));
    } finally {
      setRespondingReschedule(false);
    }
  };

  const handleShopRescheduleResponse = async (action) => {
    if (!pendingReschedule || respondingReschedule || !isShop || !pendingFromOwner) return;
    try {
      setRespondingReschedule(true);
      const token = await AsyncStorage.getItem('@access_token');
      await shopRespondRepairReschedule(token, repairId, {
        proposalId: pendingReschedule.id,
        action,
      });
      await refreshRepair();
      Alert.alert(
        action === 'accept' ? 'Time confirmed' : 'Suggestion declined',
        action === 'accept'
          ? 'The appointment was updated.'
          : 'The previous time stays on the calendar.'
      );
    } catch (err) {
      Alert.alert('Could not respond', parseApiErrorMessage(err, 'Please try again.'));
    } finally {
      setRespondingReschedule(false);
    }
  };

  const openCounterModal = () => {
    const base = pendingReschedule?.proposed_start
      ? new Date(pendingReschedule.proposed_start)
      : applyDayOffset(new Date(), 1, new Date());
    setCounterDate(base);
    setCounterTimeSlot(
      `${base.getHours().toString().padStart(2, '0')}:${base.getMinutes().toString().padStart(2, '0')}`
    );
    setCounterDayOffset(1);
    setCounterNote('');
    setCounterModalVisible(true);
  };

  const submitCounter = async () => {
    const start = applyTimeSlotToDate(counterDate, counterTimeSlot);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    try {
      setSubmittingCounter(true);
      const token = await AsyncStorage.getItem('@access_token');
      await counterRepairReschedule(token, repairId, {
        scheduledStart: start.toISOString(),
        scheduledEnd: end.toISOString(),
        note: counterNote,
      });
      setCounterModalVisible(false);
      await markRepairNotificationsRead(repairId, {
        setNotifications,
        refreshUnreadFromRest,
      });
      await refreshRepair();
      Alert.alert(
        'Suggestion sent',
        'The service center will accept or decline your preferred time.'
      );
      if (returnTo === 'ClientActivity' || returnTo === 'ClientNotifications') {
        navigation.goBack();
      }
    } catch (err) {
      Alert.alert('Could not send', parseApiErrorMessage(err, 'Please try again.'));
    } finally {
      setSubmittingCounter(false);
    }
  };

  const handleShopConfirmationResponse = async (action) => {
    if (!canShopRespondToConfirmation || respondingConfirmation) return;
    const run = async (note) => {
      try {
        setRespondingConfirmation(true);
        const token = await AsyncStorage.getItem('@access_token');
        await respondOwnerLoggedRepairConfirmation(token, repairId, {
          action,
          note: note || undefined,
        });
        await refreshRepair();
        Alert.alert(
          action === 'confirm' ? 'Record confirmed' : 'Record rejected',
          action === 'confirm'
            ? 'This service record is now confirmed by your service center.'
            : 'The owner will see your rejection note.'
        );
      } catch (err) {
        Alert.alert(
          'Could not submit response',
          parseApiErrorMessage(err, 'Please try again.')
        );
      } finally {
        setRespondingConfirmation(false);
      }
    };

    if (action === 'confirm') {
      await run('');
      return;
    }
    Alert.alert(
      'Reject confirmation',
      'The owner will see that this record was not confirmed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: () => run('Service center could not verify this record.'),
        },
      ]
    );
  };

  const handleExportPartsRequest = async () => {
    if (!isShop || !repair?.id || !shopProfileId || exportingParts) return;
    const extra = String(partsExportExtra || '').trim();
    try {
      setExportingParts(true);
      const token = await AsyncStorage.getItem('@access_token');
      const payload = await getPartsExport(token, repair.id, shopProfileId, extra || undefined);
      await presentPartsExportShareSheet(payload.share_text, { title: 'Parts request' });
    } catch (err) {
      Alert.alert('Export failed', parseApiErrorMessage(err, 'Could not build parts export.'));
    } finally {
      setExportingParts(false);
    }
  };

  const displayPartsForExport = selectedParts.length > 0 ? selectedParts : repairParts;
  const shopCanManagePartsOnRepair =
    isShop &&
    shopProfileId != null &&
    !isDone &&
    (parseInt(repair?.shop_profile, 10) === shopProfileId ||
      offers.some((o) => parseInt(o.shop, 10) === shopProfileId));

  const shopCanFinalizeOngoing =
    isShop &&
    repair?.status === 'ongoing' &&
    shopProfileId != null &&
    Number(repair.shop_profile) === Number(shopProfileId);

  const showOffersPhase = isOpenStatus && !isDone;

  const navigateToManageParts = () => {
    if (repair.status === 'done') {
      Alert.alert('This repair is completed and can no longer be edited.');
      return;
    }
    navigation.navigate('SelectRepairParts', {
      currentParts: displayPartsForExport.map((p) => ({
        partsMasterId:
          p.partsMasterId ||
          p.part_master ||
          p.part_master_detail?.id ||
          p.partsMaster?.id ||
          p.shop_part?.part?.id,
        shopPartId: p.shopPartId || p.shop_part_id || p.shop_part?.id,
        quantity: p.quantity || 1,
        price: p.price || p.price_per_item_at_use || '',
        labor: p.labor || p.labor_cost || '',
        note: p.note || '',
        partsMaster:
          p.partsMaster || p.part_master_detail || p.parts_master_detail || p.shop_part_detail?.part || {},
      })),
      vehicleId: repair.vehicle?.toString() || '',
      repairTypeId:
        repair.final_repair_type?.toString() ||
        repair.repair_type?.toString() ||
        '',
      description: editDescription || '',
      kilometers: repair.kilometers?.toString() || '',
      status: repair.status || 'open',
      returnTo: 'RepairDetail',
      repairId,
    });
  };

  const renderShopFinalizeServiceTypeCard = () => {
    if (!shopCanFinalizeOngoing) return null;
    return (
      <FloatingCard
        style={[
          styles.lightActionCard,
          finalizeTypeError ? styles.lightActionCardError : null,
        ]}
      >
        <Text style={styles.cardSectionTitle}>Final service type *</Text>
        <Text style={styles.cardBodyText}>
          Required before you can finalize. Used for service history, reminders, and statistics.
        </Text>
        <View
          style={[styles.pickerContainer, finalizeTypeError ? styles.pickerContainerError : null]}
        >
          <Picker
            selectedValue={finalRepairTypeId}
            onValueChange={(value) => {
              setFinalRepairTypeId(value);
              if (finalizeTypeError) setFinalizeTypeError('');
            }}
            style={styles.pickerLight}
            itemStyle={styles.pickerItemLight}
          >
            <Picker.Item label="Select service type…" value="" color={COLORS.TEXT_DARK} />
            {repairTypes.map((type) => (
              <Picker.Item
                key={type.id}
                label={type.name}
                value={String(type.id)}
                color={COLORS.TEXT_DARK}
              />
            ))}
          </Picker>
        </View>
        {finalizeTypeError ? (
          <Text style={styles.errorText}>{finalizeTypeError}</Text>
        ) : showMissingTypeWarning ? (
          <Text style={styles.warningTextOnLight}>
            Service type missing — choose one above before tapping Finalize repair.
          </Text>
        ) : null}
      </FloatingCard>
    );
  };

  const renderPaymentStatusSelector = ({ saveOnSelect = false } = {}) => {
    const selectedHint =
      PAYMENT_STATUS_OPTIONS.find((opt) => opt.value === paymentStatus)?.hint || '';
    return (
      <View style={styles.completionSection}>
        <Text style={styles.cardSectionTitle}>Payment status</Text>
        <Text style={styles.cardBodyText}>
          {saveOnSelect
            ? 'Update when the customer pays — e.g. mark Paid on pickup, or Monthly invoice for fleet accounts.'
            : 'Finalize when the work is finished — payment does not block completion. Mark how money was handled: paid on pickup for retail, or unpaid / monthly invoice for fleet and company accounts.'}
        </Text>
        <View style={styles.paymentChipRow}>
          {PAYMENT_STATUS_OPTIONS.map((opt) => {
            const selected = paymentStatus === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => {
                  setPaymentStatus(opt.value);
                  if (saveOnSelect) {
                    handleSavePaymentStatus(opt.value);
                  }
                }}
                disabled={saveOnSelect && paymentStatusSaving}
                style={[
                  styles.paymentChip,
                  selected ? styles.paymentChipSelected : null,
                  saveOnSelect && paymentStatusSaving ? styles.paymentChipDisabled : null,
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <Text
                  style={[styles.paymentChipText, selected ? styles.paymentChipTextSelected : null]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {selectedHint ? <Text style={styles.cardBodyText}>{selectedHint}</Text> : null}
        {saveOnSelect ? (
          <Button
            mode="outlined"
            loading={paymentStatusSaving}
            disabled={paymentStatusSaving}
            onPress={() => handleSavePaymentStatus()}
            style={styles.progressButton}
          >
            Save payment status
          </Button>
        ) : null}
      </View>
    );
  };

  const renderPartsSupplierSection = () => {
    if (!isShop || !repair?.id || !shopCanManagePartsOnRepair) return null;
    return (
      <View style={styles.partsSupplierSection}>
        <Text style={styles.partsSectionLabel}>Parts supplier request</Text>
        <Text style={styles.mutedText}>
          Export VIN, year, engine, and parts on this repair to your supplier via email or Viber.
        </Text>
        {displayPartsForExport.length > 0 ? (
          <View style={{ marginBottom: 8 }}>
            {displayPartsForExport.map((p, idx) => (
              <Text key={idx} style={styles.detailLine}>
                •{' '}
                {p.partsMaster?.name ||
                  p.part_master_detail?.name ||
                  p.parts_master_detail?.name ||
                  p.shop_part_detail?.part?.name ||
                  'Part'}{' '}
                ×{p.quantity || 1}
              </Text>
            ))}
          </View>
        ) : (
          <Text style={styles.mutedText}>
            No parts yet — add parts above or typical parts will be suggested from the service type.
          </Text>
        )}
        <TextInput
          mode="outlined"
          label="Extra parts (comma-separated)"
          value={partsExportExtra}
          onChangeText={setPartsExportExtra}
          style={styles.input}
        />
        <Button
          mode="contained-tonal"
          icon="share-variant"
          loading={exportingParts}
          disabled={exportingParts}
          onPress={handleExportPartsRequest}
        >
          Export parts request
        </Button>
      </View>
    );
  };

  const renderOffersSection = () => {
    if (isDone || !showOffersPhase) return null;
    return (
      <Card
        mode="outlined"
        style={[styles.headerCard, !isShop && styles.offersProminentCard]}
      >
        <Card.Title
          title={
            !isShop && offers.length > 0
              ? t('repairs.detail.offersWithCount', { count: offers.length })
              : t('repairs.detail.offers')
          }
          subtitle={
            !isShop && offers.length > 0
              ? t('repairs.detail.compareAndBook')
              : undefined
          }
        />
        <Card.Content>
          {isShop && shopProfileId !== null && !offers.some((o) => parseInt(o.shop) === shopProfileId) && (
            <Button
              mode="contained"
              onPress={() =>
                navigateToPartnerRepairOffer(navigation, repairId, {
                  selectedOfferParts: [],
                })
              }
              style={{ marginBottom: 10 }}
            >
              {t('partnerDashboard.actions.sendOffer')}
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
                    <Text style={styles.offerPrice}>{formatOfferPrimaryPrice(offer)}</Text>
                    {(() => {
                      const pricing = formatOfferPricingLines(offer);
                      if (pricing.estimateLine && pricing.quotedLine) {
                        return (
                          <Text style={styles.offerMetaText}>
                            {pricing.estimateLine.replace(/^Estimate\s+/, 'Est. ')}
                          </Text>
                        );
                      }
                      return null;
                    })()}
                  </View>

                  <Text style={styles.offerDescription}>
                    {offer.description || 'Service proposal available.'}
                  </Text>
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
                            navigateToPartnerRepairOffer(navigation, repairId, {
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
                          <Button
                            mode="text"
                            onPress={() => handleCallShop(offer.shop_phone_e164 || offer.shop_phone)}
                          >
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
                          <Button
                            mode="text"
                            onPress={() => handleCallShop(offer.shop_phone_e164 || offer.shop_phone)}
                          >
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
    );
  };

  return (
    <>
    <ScreenBackground safeArea={false}>
      {isShop ? (
        <PartnerAppHeader
          title={navTitle}
          backLabel={backLabel}
          onBack={onBack}
          iconOnlyBack={Boolean(backLabel && String(backLabel).length > 8)}
          showBack={Boolean(returnTo || route.params?.backLabel || route.params?.backLabelKey || navigation.canGoBack?.())}
          scrolled={scrolled}
        />
      ) : (
        <AppNavigationBar
          title={navTitle}
          backLabel={backLabel}
          onBack={onBack}
          iconOnlyBack={Boolean(backLabel && String(backLabel).length > 8)}
          showBack={Boolean(returnTo || route.params?.backLabel || route.params?.backLabelKey || navigation.canGoBack?.())}
          scrolled={scrolled}
        />
      )}
      <ScrollView
        key={`repair-${repair.id}-${repair.status}`}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: 12 },
        ]}
      >
          <View>
            <AppCard variant="dark" style={styles.heroWrap} contentStyle={styles.heroInner}>
              <Pressable
                disabled={!canOpenVehicleProfile}
                onPress={openVehicleProfile}
                style={({ pressed }) => [pressed && canOpenVehicleProfile ? { opacity: 0.9 } : null]}
              >
                <View style={styles.heroTop}>
                  <View style={styles.heroTextCol}>
                    <Text style={styles.heroTitle}>{vehicleDisplay}</Text>
                    <Text
                      style={canViewerSeeVehiclePlate ? styles.heroPlate : styles.heroPlateHidden}
                    >
                      {canViewerSeeVehiclePlate
                        ? (String(repair.vehicle_license_plate || '').trim() || '—')
                        : t('repairs.detail.plateHiddenUntilBooking')}
                    </Text>
                    {canOpenVehicleProfile ? (
                      <Text style={styles.heroVehicleLink}>{t('repairs.detail.tapOpenVehicleProfile')}</Text>
                    ) : null}
                    {repair.vehicle_vin ? (
                      <Text style={styles.heroMeta}>
                        {t('repairs.detail.vinLabel')}: {repair.vehicle_vin}
                      </Text>
                    ) : null}
                    <Text style={styles.heroReference}>{heroReferenceLine}</Text>
                    {repair.scheduled_start ? (
                      <Text style={styles.heroMeta}>
                        {t('repairs.detail.scheduled')}{' '}
                        {new Date(repair.scheduled_start).toLocaleString()}
                      </Text>
                    ) : null}
                    {repair.scheduled_end ? (
                      <Text style={styles.heroMeta}>
                        {t('repairs.detail.estimatedCompletion')}{' '}
                        {new Date(repair.scheduled_end).toLocaleString()}
                      </Text>
                    ) : null}
                    {repair.planned_labor_minutes != null && repair.planned_labor_minutes > 0 ? (
                      <Text style={styles.heroMeta}>
                        {t('repairs.detail.plannedLabor')}{' '}
                        {formatDurationMinutes(repair.planned_labor_minutes)}
                      </Text>
                    ) : null}
                    <Text style={styles.heroMeta}>
                      {t('repairs.detail.serviceType')}: {completedServiceTypeName}
                    </Text>
                    {isDone ? (
                      <Text style={styles.heroMeta}>
                        {t('repairs.detail.payment')}: {localizedPaymentStatus(repair.payment_status)}
                      </Text>
                    ) : null}
                    <Text style={styles.heroMeta}>
                      {isDone
                        ? `${t('repairs.detail.finalKilometers')}: `
                        : `${t('repairs.detail.requestKilometers')}: `}
                      {isDone && repair.final_kilometers != null
                        ? repair.final_kilometers
                        : repair.kilometers != null
                          ? repair.kilometers
                          : '—'}
                    </Text>
                  </View>
                  <StatusBadge
                    status={repair.status}
                    label={translateRepairStatus(repair.status, t)}
                  />
                </View>
              </Pressable>
            </AppCard>

            {renderShopFinalizeServiceTypeCard()}

            {renderOperationsSection()}

            {renderRepairTotalsFooter()}

            {isDone && isMyShopRepair ? (
              <FloatingCard style={styles.lightActionCard}>
                <Text style={styles.cardTitle}>Repair completed</Text>
                <Text style={styles.mutedText}>
                  The client is notified in the app when you finalize. If they have no app but an email on
                  file, a pickup email can be sent once mail is enabled. Update payment status below when
                  they pay.
                </Text>
              </FloatingCard>
            ) : null}

            {isDone && isMyShopRepair ? (
              <FloatingCard style={styles.lightActionCard}>
                {renderPaymentStatusSelector({ saveOnSelect: true })}
              </FloatingCard>
            ) : null}

            {isDone && isMyShopRepair ? (
              <RepairInvoicingCard
                repair={repair}
                onRepairUpdated={setRepair}
                onOpenInvoice={(invoiceId) =>
                  navigation.navigate('ShopInvoiceDetail', { invoiceId })
                }
                onOpenInvoicingHome={() => navigation.navigate('ShopInvoicing')}
              />
            ) : null}

            {!isShop && isDone && repair.shop_profile_name ? (
              <FloatingCard style={styles.readyPickupClientCard}>
                <Text style={styles.cardTitle}>{t('repairs.detail.readyForPickup')}</Text>
                <Text style={styles.mutedText}>
                  {canOpenShopProfile ? (
                    <>
                      <Text style={styles.shopNameLink} onPress={openShopProfile} accessibilityRole="link">
                        {repair.shop_profile_name}
                      </Text>
                      {t('repairs.detail.readyForPickupAfterShop', { vehicle: vehicleDisplay })}
                    </>
                  ) : (
                    t('repairs.detail.readyForPickupBody', {
                      shopName: repair.shop_profile_name,
                      vehicle: vehicleDisplay,
                    })
                  )}
                </Text>
                {canOpenShopProfile ? (
                  <Text style={[styles.shopTapHint, styles.shopTapHintLeft]}>
                    {t('vehicles.detail.tapForShopProfile')}
                  </Text>
                ) : null}
              </FloatingCard>
            ) : null}

            {!isShop && isDone && isClientOwner && repair.shop_profile ? (
              <RepairOutcomePanel
                repair={repair}
                shopProfileId={Number(repair.shop_profile)}
              />
            ) : null}

            {!isShop && isOngoingStatus ? (
              <FloatingCard style={styles.ongoingClientCard}>
                <Text style={styles.cardTitle}>Repair in progress</Text>
                <Text style={styles.mutedText}>
                  {repair.shop_profile_name
                    ? `Your vehicle is being serviced at ${repair.shop_profile_name}.`
                    : 'This repair is in progress.'}{' '}
                  New offers are not available on this request — send a new request if you need
                  other quotes.
                </Text>
              </FloatingCard>
            ) : null}

            {!isShop && pendingReschedule?.status === 'pending' && pendingFromShop ? (
              <FloatingCard style={styles.rescheduleCard}>
                <Text style={styles.cardTitle}>Reschedule request</Text>
                <Text style={styles.detailLine}>
                  {pendingReschedule.shop_profile_name || 'Service center'} proposed a new time:
                </Text>
                <Text style={styles.detailLine}>
                  {pendingReschedule.proposed_start
                    ? new Date(pendingReschedule.proposed_start).toLocaleString()
                    : '—'}
                </Text>
                {pendingReschedule.note ? (
                  <Text style={styles.mutedText}>Note: {pendingReschedule.note}</Text>
                ) : null}
                <View style={styles.rescheduleActions}>
                  <Button
                    mode="contained"
                    onPress={() => handleRescheduleResponse('accept')}
                    loading={respondingReschedule}
                    disabled={respondingReschedule}
                  >
                    Accept
                  </Button>
                  <Button
                    mode="outlined"
                    onPress={() => handleRescheduleResponse('decline')}
                    disabled={respondingReschedule}
                  >
                    Decline
                  </Button>
                  <Button
                    mode="text"
                    onPress={openCounterModal}
                    disabled={respondingReschedule}
                  >
                    Suggest different time
                  </Button>
                </View>
              </FloatingCard>
            ) : null}

            {!isShop && pendingReschedule?.status === 'pending' && pendingFromOwner ? (
              <FloatingCard style={styles.rescheduleCard}>
                <Text style={styles.cardTitle}>Waiting for shop</Text>
                <Text style={styles.detailLine}>
                  You suggested{' '}
                  {pendingReschedule.proposed_start
                    ? new Date(pendingReschedule.proposed_start).toLocaleString()
                    : 'a new time'}
                  . {pendingReschedule.shop_profile_name || 'The service center'} will confirm or
                  decline.
                </Text>
              </FloatingCard>
            ) : null}

            {isShop && pendingReschedule?.status === 'pending' && pendingFromOwner ? (
              <FloatingCard style={styles.rescheduleCard}>
                <Text style={styles.cardTitle}>Client suggested new time</Text>
                <Text style={styles.detailLine}>
                  Proposed:{' '}
                  {pendingReschedule.proposed_start
                    ? new Date(pendingReschedule.proposed_start).toLocaleString()
                    : '—'}
                </Text>
                {pendingReschedule.note ? (
                  <Text style={styles.mutedText}>Note: {pendingReschedule.note}</Text>
                ) : null}
                <View style={styles.rescheduleActions}>
                  <Button
                    mode="contained"
                    onPress={() => handleShopRescheduleResponse('accept')}
                    loading={respondingReschedule}
                    disabled={respondingReschedule}
                  >
                    Accept
                  </Button>
                  <Button
                    mode="outlined"
                    onPress={() => handleShopRescheduleResponse('decline')}
                    disabled={respondingReschedule}
                  >
                    Decline
                  </Button>
                </View>
              </FloatingCard>
            ) : null}

            {!isDone && upcomingAppointment && !isShop && isClientOwner ? (
              <FloatingCard style={styles.rescheduleCard}>
                <Text style={styles.cardTitle}>{t('repairs.detail.upcomingAppointment')}</Text>
                <Text style={styles.detailLine}>
                  {t('repairs.detail.scheduled')}{' '}
                  {repair.scheduled_start
                    ? new Date(repair.scheduled_start).toLocaleString()
                    : '—'}
                </Text>
                {repair.scheduled_end ? (
                  <Text style={styles.detailLine}>
                    {t('repairs.detail.estimatedCompletion')}{' '}
                    {new Date(repair.scheduled_end).toLocaleString()}
                  </Text>
                ) : null}
                <Text style={styles.mutedText}>
                  {ownerCheckedIn
                    ? t('repairs.detail.checkedInWaiting')
                    : t('repairs.detail.visitNotStarted')}
                </Text>
                {!ownerCheckedIn ? (
                  <Button
                    mode="contained"
                    onPress={handleClientArrival}
                    loading={respondingArrival}
                    disabled={respondingArrival || cancelingAppointment}
                    style={styles.arrivalButton}
                  >
                    {t('repairs.detail.checkInButton')}
                  </Button>
                ) : null}
                {showCancelAppointment ? (
                  <Button
                    mode="outlined"
                    onPress={handleCancelAppointment}
                    loading={cancelingAppointment}
                    disabled={cancelingAppointment || respondingArrival}
                    style={styles.cancelAppointmentButton}
                    textColor="#B91C1C"
                  >
                    {t('repairs.detail.cancelAppointment')}
                  </Button>
                ) : null}
              </FloatingCard>
            ) : null}

            {!isDone &&
            isShop &&
            isMyShopRepair &&
            !vehicleAtShop &&
            repair.scheduled_start ? (
              <FloatingCard style={styles.rescheduleCard}>
                <Text style={styles.cardTitle}>Awaiting arrival</Text>
                <Text style={styles.detailLine}>
                  Appointment:{' '}
                  {new Date(repair.scheduled_start).toLocaleString()}
                </Text>
                {repair.client_arrival_reported_at ? (
                  <Text style={styles.mutedText}>
                    Client checked in at{' '}
                    {new Date(repair.client_arrival_reported_at).toLocaleString()}.
                    Confirm when the vehicle is on site.
                  </Text>
                ) : (
                  <Text style={styles.mutedText}>
                    Mark arrived once the vehicle is physically at your center.
                  </Text>
                )}
                <Button
                  mode="contained"
                  onPress={handleShopArrival}
                  loading={respondingArrival}
                  disabled={respondingArrival || cancelingAppointment}
                  style={styles.arrivalButton}
                >
                  Vehicle arrived
                </Button>
                {showCancelAppointment ? (
                  <Button
                    mode="outlined"
                    onPress={handleCancelAppointment}
                    loading={cancelingAppointment}
                    disabled={cancelingAppointment || respondingArrival}
                    style={styles.cancelAppointmentButton}
                    textColor="#B91C1C"
                  >
                    {t('repairs.detail.cancelAppointment')}
                  </Button>
                ) : null}
              </FloatingCard>
            ) : null}

            {isShop &&
            isMyShopRepair &&
            !isDone &&
            repair?.shop_data_access_scope !== 'owner_grant' &&
            repair?.shop_data_access_scope !== 'authorized_mechanical' ? (
              <FloatingCard style={styles.rescheduleCard}>
                <Text style={styles.cardTitle}>
                  {t('repairs.detail.historyAccess.cardTitle')}
                </Text>
                {!historyAccessRequest ? (
                  <>
                    <Text style={styles.mutedText}>
                      {t('repairs.detail.historyAccess.cardHint')}
                    </Text>
                    <Button
                      mode="contained"
                      onPress={handleRequestVehicleHistory}
                      loading={requestingHistoryAccess}
                      disabled={requestingHistoryAccess}
                      style={styles.arrivalButton}
                    >
                      {t('repairs.detail.historyAccess.requestButton')}
                    </Button>
                  </>
                ) : (
                  <>
                    <Text style={styles.detailLine}>
                      {t('repairs.detail.historyAccess.scope')}:{' '}
                      {historyAccessRequest.requested_scope}
                    </Text>
                    <Text style={styles.detailLine}>
                      {t('repairs.detail.historyAccess.duration')}:{' '}
                      {historyAccessRequest.requested_duration}
                    </Text>
                    <Text style={styles.detailLine}>
                      {t('repairs.detail.historyAccess.status')}:{' '}
                      {historyAccessRequest.status === 'pending'
                        ? t('repairs.detail.historyAccess.waiting')
                        : historyAccessRequest.status}
                    </Text>
                    {historyAccessRequest.authorization_code ? (
                      <Text style={[styles.cardTitle, { marginTop: 8 }]}>
                        {historyAccessRequest.authorization_code}
                      </Text>
                    ) : null}
                    {historyAccessRequest.qr_payload ? (
                      <Text style={styles.mutedText} selectable>
                        {historyAccessRequest.qr_payload}
                      </Text>
                    ) : null}
                    {historyAccessRequest.status === 'pending' ? (
                      <Button
                        mode="outlined"
                        onPress={refreshHistoryAccessRequest}
                        style={styles.arrivalButton}
                      >
                        {t('repairs.detail.historyAccess.refresh')}
                      </Button>
                    ) : null}
                  </>
                )}
              </FloatingCard>
            ) : null}

            {!isShop ? renderOffersSection() : null}

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
              {visitDisplayText ? (
                <Text style={styles.detailLine}>{visitDisplayText}</Text>
              ) : null}
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

            {isDone ? (
            <FloatingCard style={styles.historyRecordCard}>
              <Text style={styles.cardTitle}>
                {isOwnerLoggedServiceRecord
                  ? t('repairs.detail.serviceRecordTitle')
                  : t('repairs.detail.completedServiceRecord')}
              </Text>
              <Text style={styles.historyHelperText}>
                {isOwnerLoggedServiceRecord
                  ? t('repairs.detail.ownerLoggedRecordHelper')
                  : t('repairs.detail.completedRecordHelper')}
              </Text>
              <View style={styles.completedPillRow}>
                <View style={styles.completedPill}>
                  <Text style={styles.completedPillText}>{t('repairs.detail.completedBadge')}</Text>
                </View>
              </View>

              <Text style={styles.summarySectionTitle}>{t('repairs.detail.sectionService')}</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{t('repairs.detail.serviceType')}</Text>
                <Text style={styles.summaryValue}>{completedServiceTypeName}</Text>
              </View>
              {isOwnerLoggedServiceRecord ? (
                <>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Service provider</Text>
                    <Text style={styles.summaryValue}>{formatServiceRecordProvider(repair)}</Text>
                  </View>
                  {formatOwnerLoggedTrustLabel(repair) ? (
                    <Text style={styles.trustHint}>{formatOwnerLoggedTrustLabel(repair)}</Text>
                  ) : null}
                  {hasSelectedShopProvider ? (
                    <View style={styles.confirmationCard}>
                      {ownerLoggedConfirmation === 'confirmed' ? (
                        <>
                          <Text style={styles.confirmationTitle}>Confirmed by service center</Text>
                          <Text style={styles.confirmationBody}>
                            {repair.shop_profile_name || 'Selected service center'} confirmed this record.
                          </Text>
                        </>
                      ) : ownerLoggedConfirmation === 'pending' ? (
                        <>
                          <Text style={styles.confirmationTitle}>Confirmation requested</Text>
                          <Text style={styles.confirmationBody}>
                            Waiting for {repair.shop_profile_name || 'the selected service center'} to confirm this
                            service record.
                          </Text>
                        </>
                      ) : ownerLoggedConfirmation === 'rejected' ? (
                        <>
                          <Text style={styles.confirmationTitle}>Service center did not confirm</Text>
                          <Text style={styles.confirmationBody}>
                            {repair.confirmation_note ||
                              'The center declined confirmation for this owner-logged record.'}
                          </Text>
                        </>
                      ) : (
                        <>
                          <Text style={styles.confirmationTitle}>Workshop attributed</Text>
                          <Text style={styles.confirmationBody}>
                            You selected {repair.shop_profile_name || 'a service center'} for this record. It is not
                            confirmed until the center approves it.
                          </Text>
                        </>
                      )}
                      {canRequestServiceCenterConfirmation ? (
                        <Button
                          mode="outlined"
                          loading={requestingConfirmation}
                          disabled={requestingConfirmation}
                          onPress={handleRequestServiceCenterConfirmation}
                          style={styles.confirmationActionBtn}
                        >
                          Request confirmation
                        </Button>
                      ) : null}
                      {canShopRespondToConfirmation ? (
                        <View style={styles.confirmationShopActions}>
                          <Button
                            mode="contained"
                            compact
                            loading={respondingConfirmation}
                            disabled={respondingConfirmation}
                            onPress={() => handleShopConfirmationResponse('confirm')}
                          >
                            Confirm
                          </Button>
                          <Button
                            mode="outlined"
                            compact
                            loading={respondingConfirmation}
                            disabled={respondingConfirmation}
                            onPress={() => handleShopConfirmationResponse('reject')}
                          >
                            Reject
                          </Button>
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                  {hasManualProvider ? (
                    <View style={styles.confirmationCard}>
                      <Text style={styles.confirmationTitle}>Unlisted service center</Text>
                      <Text style={styles.confirmationBody}>
                        No platform confirmation available yet for manual/unlisted centers.
                      </Text>
                    </View>
                  ) : null}
                  {isOwnerLoggedServiceRecord ? (
                    <View style={styles.evidenceChips}>
                      {(repair.evidence_level === 'owner_with_photos' ||
                        repair.evidence_level === 'service_center_confirmed') && (
                        <View style={styles.evidenceChip}>
                          <Text style={styles.evidenceChipText}>Photos attached</Text>
                        </View>
                      )}
                      {(repair.evidence_level === 'receipt_attached' ||
                        repair.evidence_level === 'service_center_confirmed') && (
                        <View style={styles.evidenceChip}>
                          <Text style={styles.evidenceChipText}>Receipt attached</Text>
                        </View>
                      )}
                      {String(repair.evidence_level || '').toLowerCase() === 'owner_with_photos' ? (
                        <View style={styles.evidenceChip}>
                          <Text style={styles.evidenceChipText}>Odometer photo attached (if tagged)</Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                  {!repair.self_repair && String(repair.manual_service_center_phone || '').trim() ? (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Phone</Text>
                      <Text style={styles.summaryValue}>{repair.manual_service_center_phone}</Text>
                    </View>
                  ) : null}
                  {!repair.self_repair && String(repair.manual_service_center_email || '').trim() ? (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Email</Text>
                      <Text style={styles.summaryValue}>{repair.manual_service_center_email}</Text>
                    </View>
                  ) : null}
                  {!repair.self_repair && String(repair.manual_service_center_address || '').trim() ? (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Address</Text>
                      <Text style={styles.summaryValue}>{repair.manual_service_center_address}</Text>
                    </View>
                  ) : null}
                  {!repair.self_repair &&
                  (String(repair.manual_service_center_city || '').trim() ||
                    String(repair.manual_service_center_country || '').trim()) ? (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>City / country</Text>
                      <Text style={styles.summaryValue}>
                        {[repair.manual_service_center_city, repair.manual_service_center_country]
                          .filter((x) => String(x || '').trim())
                          .join(', ')}
                      </Text>
                    </View>
                  ) : null}
                  {!repair.self_repair &&
                  repair.manual_service_center_latitude != null &&
                  repair.manual_service_center_longitude != null ? (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Location</Text>
                      <Text style={styles.summaryValue}>
                        {String(repair.manual_service_center_latitude)},{' '}
                        {String(repair.manual_service_center_longitude)}
                      </Text>
                    </View>
                  ) : null}
                </>
              ) : (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{t('repairs.detail.serviceCenter')}</Text>
                  <View style={styles.summaryValueCol}>
                    {renderLinkedServiceCenterValue(repair.shop_profile_name)}
                  </View>
                </View>
              )}
              {sourceLower === 'service_center_direct' ? (
                <View style={styles.confirmationCard}>
                  <Text style={styles.confirmationTitle}>Created by service center</Text>
                  <Text style={styles.confirmationBody}>High confidence record.</Text>
                </View>
              ) : null}
              {completionRecordedAt ? (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{t('repairs.detail.completedOn')}</Text>
                  <Text style={styles.summaryValue}>{completionRecordedAt}</Text>
                </View>
              ) : null}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{t('repairs.detail.finalKilometers')}</Text>
                <Text style={styles.summaryValue}>
                  {repair.final_kilometers != null
                    ? repair.final_kilometers
                    : repair.kilometers != null
                      ? repair.kilometers
                      : '—'}
                </Text>
              </View>
              {isOwnerLoggedServiceRecord && repair.evidence_level ? (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Evidence</Text>
                  <Text style={styles.summaryValue}>{formatEvidenceLevel(repair.evidence_level)}</Text>
                </View>
              ) : null}

              <Text style={styles.summarySectionTitle}>{t('repairs.detail.sectionNotes')}</Text>
              {repair.shop_description ? (
                <Text style={styles.detailLine}>Workshop notes: {repair.shop_description}</Text>
              ) : null}
              {repair.description ? (
                <Text style={styles.detailLine}>
                  {isOwnerLoggedServiceRecord ? 'Notes: ' : 'Original request: '}
                  {repair.description}
                </Text>
              ) : null}
              {repair.symptoms ? (
                <Text style={styles.mutedText}>
                  {isOwnerLoggedServiceRecord ? 'Details: ' : 'Symptoms: '}
                  {repair.symptoms}
                </Text>
              ) : null}
              {!repair.shop_description && !repair.description && !repair.symptoms ? (
                <Text style={styles.mutedText}>No notes captured for this record.</Text>
              ) : null}

              <Text style={styles.summarySectionTitle}>{t('repairs.detail.sectionPartsUsed')}</Text>
              {displayPartsList.length === 0 ? (
                <Text style={styles.mutedText}>{t('repairs.detail.noPartsRecorded')}</Text>
              ) : (
                <>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ flex: 2, fontWeight: 'bold' }}>{t('repairs.detail.partColumn')}</Text>
                    <Text style={{ flex: 1, fontWeight: 'bold', textAlign: 'center' }}>{t('repairs.detail.qtyColumn')}</Text>
                    <Text style={{ flex: 1, fontWeight: 'bold', textAlign: 'center' }}>{t('repairs.detail.priceColumn')}</Text>
                    <Text style={{ flex: 1, fontWeight: 'bold', textAlign: 'center' }}>{t('repairs.detail.laborColumn')}</Text>
                  </View>
                  {displayPartsList.map((item, index) => (
                    <View key={item.id || index}>{renderRepairPartItem({ item })}</View>
                  ))}
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }}>
                    <Text style={{ fontWeight: 'bold', marginRight: 10 }}>{t('repairs.detail.lineItemsTotal')}</Text>
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

              <Text style={styles.summarySectionTitle}>{t('repairs.detail.sectionAmounts')}</Text>
              {hasFinancialSummary ? (
                <>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>{t('repairs.detail.labor')}</Text>
                    <Text style={styles.summaryValue}>
                      {repair.labor_price != null ? `${repair.labor_price} ${summaryCurrency}` : '—'}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>{t('repairs.detail.partsSummary')}</Text>
                    <Text style={styles.summaryValue}>
                      {repair.parts_price != null ? `${repair.parts_price} ${summaryCurrency}` : '—'}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>{t('repairs.detail.total')}</Text>
                    <Text style={[styles.summaryValue, styles.summaryValueEmphasis]}>
                      {repair.total_price != null || repair.calculated_total_price != null
                        ? `${repair.total_price ?? repair.calculated_total_price} ${summaryCurrency}`
                        : '—'}
                    </Text>
                  </View>
                </>
              ) : (
                <Text style={styles.mutedText}>{t('repairs.detail.noAmountsRecorded')}</Text>
              )}
              {!(isDone && isMyShopRepair) ? (
                isMyShopRepair ? (
                  renderPaymentStatusSelector({ saveOnSelect: true })
                ) : (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>{t('repairs.detail.paymentStatus')}</Text>
                    <Text style={styles.summaryValue}>{localizedPaymentStatus(repair.payment_status)}</Text>
                  </View>
                )
              ) : null}
              {hasFinancialSummary ? (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{t('repairs.detail.warranty')}</Text>
                  <Text style={styles.summaryValue}>
                    {repair.warranty_months != null
                      ? t('repairs.detail.warrantyMonths', { count: repair.warranty_months })
                      : '—'}
                  </Text>
                </View>
              ) : null}
              <Text style={[styles.mutedText, { marginTop: 8 }]}>
                {isMyShopRepair && isDone
                  ? 'Payment can be updated in the card above when the customer pays.'
                  : isMyShopRepair
                    ? 'After finalize, create a platform invoice or attach an external PDF.'
                    : null}
              </Text>
            </FloatingCard>
            ) : isOpenStatus && isShop ? (
            (() => {
              const guide = getPartnerRequestGuide(repair, {
                offers,
                shopProfileId,
                vehicleAtShop,
                isMyShopRepair,
              });
              if (!guide) return null;
              return (
                <FloatingCard>
                  <Text style={styles.cardTitle}>{guide.title}</Text>
                  <Text style={styles.mutedText}>{guide.body}</Text>
                </FloatingCard>
              );
            })()
            ) : isOpenStatus ? null : (
            <Card mode="outlined" style={styles.headerCard}>
              <Card.Title
                title="Repair management"
              />
              <Card.Content>
                  <Text style={styles.mutedText}>Track parts, notes, and final repair details.</Text>
                  {vehicleAtShop ? (
                    <View style={styles.serviceStateChip}>
                      <Text style={styles.serviceStateChipText}>Vehicle at service center</Text>
                    </View>
                  ) : null}
                  {shopCanManagePartsOnRepair ? (
                    <View style={{ alignItems: 'flex-start', marginBottom: 8 }}>
                      <Button mode="outlined" onPress={navigateToManageParts}>
                        Manage Parts
                      </Button>
                    </View>
                  ) : null}
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
                      {displayPartsList.map((item, index) => (
                        <View key={item.id || index}>
                          {renderRepairPartItem({ item })}
                        </View>
                      ))}
                      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }}>
                        <Text style={{ fontWeight: 'bold', marginRight: 10 }}>Total:</Text>
                        <Text>
                          {formatMoneyAmount(displayPartsTotals.total, DEFAULT_CURRENCY)}
                        </Text>
                      </View>
                    </>
                  )}
                  {renderPartsSupplierSection()}
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
                            onChangeText={(text) => {
                              setFinalKilometers(text);
                              if (finalizeKmError) setFinalizeKmError('');
                            }}
                            style={styles.input}
                            error={Boolean(finalizeKmError)}
                          />
                          {finalizeKmError ? (
                            <Text style={styles.errorText}>{finalizeKmError}</Text>
                          ) : null}
                          <Button
                            mode="outlined"
                            icon="camera"
                            onPress={handlePickDashboardPhoto}
                            style={styles.dashboardPhotoBtn}
                          >
                            {pendingOdometerPhoto ? 'Change dashboard photo' : 'Upload dashboard photo'}
                          </Button>
                          {pendingOdometerPhoto ? (
                            <Text style={styles.mutedText}>Dashboard photo ready — will upload when you save or finalize.</Text>
                          ) : null}
                          <Text style={styles.mutedText}>
                            Used for vehicle history and future service reminders. Defaults to the vehicle
                            odometer ({repair?.vehicle_kilometers != null
                              ? `${Number(repair.vehicle_kilometers).toLocaleString()} km`
                              : 'from profile'}).
                            {repair?.prior_max_odometer_km != null
                              ? ` Previous service record: ${Number(repair.prior_max_odometer_km).toLocaleString()} km.`
                              : ''}
                          </Text>
                          <Text style={styles.partsSectionLabel}>Repair financial summary</Text>
                          {hasPartsLines ? (
                            <>
                              <Text style={styles.detailLine}>
                                Parts (from list): {formatMoneyAmount(displayPartsTotals.partsSum, DEFAULT_CURRENCY)}
                              </Text>
                              <Text style={styles.detailLine}>
                                Labor (from list): {formatMoneyAmount(displayPartsTotals.laborSum, DEFAULT_CURRENCY)}
                              </Text>
                              <Text style={[styles.detailLine, { fontWeight: '600' }]}>
                                Total: {formatMoneyAmount(displayPartsTotals.total, DEFAULT_CURRENCY)}
                              </Text>
                              <Text style={styles.mutedText}>
                                Amounts come from your parts list. Edit line items via Manage parts.
                              </Text>
                            </>
                          ) : (
                            <>
                              <TextInput
                                mode="outlined"
                                label="Labor price"
                                keyboardType="numeric"
                                value={laborPrice}
                                onChangeText={handleLaborChange}
                                style={styles.input}
                              />
                              <TextInput
                                mode="outlined"
                                label="Parts price"
                                keyboardType="numeric"
                                value={partsPrice}
                                onChangeText={handlePartsChange}
                                style={styles.input}
                              />
                              <TextInput
                                mode="outlined"
                                label="Total price"
                                keyboardType="numeric"
                                value={totalPrice}
                                onChangeText={handleTotalChange}
                                style={styles.input}
                              />
                              <Text style={styles.mutedText}>
                                Total updates from labor + parts unless you edit it directly.
                              </Text>
                            </>
                          )}
                          <Text style={styles.mutedText}>All amounts are in {DEFAULT_CURRENCY}.</Text>
                          <View style={styles.completionSection}>
                            <Text style={styles.cardSectionTitle}>Payment & completion</Text>
                            <Text style={styles.cardBodyText}>
                              Finalize when the work is finished — payment does not block completion.
                            </Text>
                          </View>
                          {renderPaymentStatusSelector()}
                          <TextInput
                            mode="outlined"
                            label="Warranty months"
                            keyboardType="numeric"
                            value={warrantyMonths}
                            onChangeText={setWarrantyMonths}
                            style={styles.input}
                          />
                          <Button
                            mode="contained"
                            onPress={() => handleUpdateRepair()}
                            style={styles.progressButton}
                          >
                            Save repair progress
                          </Button>
                          {String(repair.status || '').toLowerCase() === 'ongoing' ? (
                            <Button
                              mode="contained"
                              onPress={() => handleFinalizeRepair()}
                              style={styles.progressButton}
                            >
                              Finalize repair
                            </Button>
                          ) : null}
                          <Text style={styles.mutedText}>
                            You can finalize before payment is collected — update payment status later
                            from the completed record when needed.
                          </Text>
                        </>
                      )}
                    </>
                  )}
                  {(!isShop || repair.shop_profile !== shopProfileId) && (
                    <>
                      <Text style={styles.partsSectionLabel}>Repair financial summary</Text>
                      {hasFinancialSummary ? (
                        <>
                          <Text style={styles.detailLine}>Labor: {formatMoneyAmount(repair.labor_price, repair.currency)}</Text>
                          <Text style={styles.detailLine}>Parts: {formatMoneyAmount(repair.parts_price, repair.currency)}</Text>
                          <Text style={styles.detailLine}>
                            Total: {formatMoneyAmount(repair.total_price ?? repair.calculated_total_price, repair.currency)}
                          </Text>
                          <Text style={styles.detailLine}>Payment status: {formatPaymentStatus(repair.payment_status)}</Text>
                          <Text style={styles.detailLine}>
                            Warranty: {repair.warranty_months != null ? `${repair.warranty_months} months` : '—'}
                          </Text>
                        </>
                      ) : (
                        <Text style={styles.mutedText}>Financial summary not added yet.</Text>
                      )}
                      <Text style={styles.mutedText}>
                        {isMyShopRepair
                          ? 'After finalize, create a platform invoice or attach an external PDF.'
                          : null}
                      </Text>
                    </>
                  )}
                </Card.Content>
            </Card>
            )}

            {isShop && (repair.shop_data_access_scope || canViewerSeeVehiclePlate) ? (
              <RelatedServiceHistoryCard
                payload={relatedServiceHistory}
                loading={relatedHistoryLoading}
                onOpenFullRecord={openHistoryRepair}
              />
            ) : null}

            {shouldShowTargetingCardForClient ? (
            <FloatingCard>
              <Text style={styles.cardTitle}>Request targeting</Text>
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

            <FloatingCard style={styles.mediaCardCompact}>
              <Text style={styles.cardTitle}>{t('repairs.detail.photosAndVideos')}</Text>
              <Text style={styles.mutedText}>
                {isDone
                  ? isOwnerLoggedServiceRecord
                    ? t('repairs.detail.photosOwnerLoggedDone')
                    : t('repairs.detail.photosPermanentRecord')
                  : isOpenStatus
                    ? canEditClientRequest
                      ? 'Add or remove photos and videos while this request is open. After a shop is booked, media here becomes read-only.'
                      : 'Photos and videos attached to this request.'
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
                            <RepairMediaThumbnail
                              sourcePath={mediaUrl(m)}
                              onPress={setSelectedImageUri}
                              style={styles.imageMediaThumb}
                            />
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
                <Text style={styles.detailLine}>{t('repairs.detail.noPhotosOrVideos')}</Text>
              )}
            </FloatingCard>

            {isShop ? renderOffersSection() : null}

          </View>
      </ScrollView>
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
    <Modal
      visible={counterModalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setCounterModalVisible(false)}
    >
      <View style={styles.counterModalBackdrop}>
        <View style={styles.counterModalCard}>
          <Text style={styles.counterModalTitle}>Suggest a different time</Text>
          <Text style={styles.counterModalPreview}>{formatSchedulePreview(counterDate)}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.counterDayRow}>
            {SCHEDULE_DAY_OFFSETS.map((opt) => (
              <Pressable
                key={opt.label}
                onPress={() => {
                  setCounterDayOffset(opt.days);
                  const next = applyDayOffset(
                    new Date(),
                    opt.days,
                    applyTimeSlotToDate(counterDate, counterTimeSlot)
                  );
                  setCounterDate(next);
                }}
                style={[
                  styles.counterChip,
                  counterDayOffset === opt.days && styles.counterChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.counterChipText,
                    counterDayOffset === opt.days && styles.counterChipTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.counterDayRow}>
            {SCHEDULE_TIME_SLOTS.map((slot) => (
              <Pressable
                key={slot}
                onPress={() => {
                  setCounterTimeSlot(slot);
                  setCounterDate(applyTimeSlotToDate(counterDate, slot));
                }}
                style={[
                  styles.counterChip,
                  counterTimeSlot === slot && styles.counterChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.counterChipText,
                    counterTimeSlot === slot && styles.counterChipTextActive,
                  ]}
                >
                  {slot}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <TextInput
            label="Note (optional)"
            value={counterNote}
            onChangeText={setCounterNote}
            mode="outlined"
            style={styles.counterNoteInput}
          />
          <View style={styles.counterModalActions}>
            <Button mode="outlined" onPress={() => setCounterModalVisible(false)}>
              Cancel
            </Button>
            <Button mode="contained" loading={submittingCounter} onPress={submitCounter}>
              Send to shop
            </Button>
          </View>
        </View>
      </View>
    </Modal>
    <FinalizeOdometerEvidenceSheet
      visible={Boolean(odometerEvidenceSheet?.visible)}
      onDismiss={() => setOdometerEvidenceSheet(null)}
      analysis={odometerEvidenceSheet?.analysis}
      enteredKm={odometerEvidenceSheet?.km}
      priorMaxKm={repair?.prior_max_odometer_km}
      pendingPhoto={pendingOdometerPhoto}
      discrepancyNote={odometerDiscrepancyNote}
      onChangeDiscrepancyNote={setOdometerDiscrepancyNote}
      onPickPhoto={handlePickDashboardPhoto}
      onFinalizeWithPhoto={handleOdometerSheetFinalize}
      onConfirmWithoutPhoto={handleOdometerSheetConfirmWithoutPhoto}
      allowConfirmWithoutPhoto={Boolean(
        odometerEvidenceSheet?.analysis?.requiresPhotoOrConfirm &&
          !odometerEvidenceSheet?.analysis?.blocked
      )}
      finalizing={odometerSheetFinalizing}
      bottomInset={insets.bottom}
    />
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
  heroVehicleLink: {
    color: 'rgba(147,197,253,0.95)',
    fontSize: 12,
    marginTop: 6,
    fontWeight: '600',
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
  partsExportCard: {
    marginBottom: 12,
    gap: 8,
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
  arrivalButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  cancelAppointmentButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  rescheduleCard: {
    marginBottom: 12,
    borderColor: 'rgba(245,158,11,0.35)',
    borderWidth: 1,
  },
  rescheduleActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  counterModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  counterModalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
  },
  counterModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    color: '#0f172a',
  },
  counterModalPreview: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 12,
  },
  counterDayRow: {
    marginBottom: 10,
  },
  counterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
  },
  counterChipActive: {
    backgroundColor: '#2563eb',
  },
  counterChipText: {
    color: '#334155',
    fontWeight: '600',
    fontSize: 13,
  },
  counterChipTextActive: {
    color: '#fff',
  },
  counterNoteInput: {
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  counterModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  warningText: {
    color: '#b45309',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 6,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 4,
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
  offersProminentCard: {
    borderColor: COLORS.PRIMARY,
    borderWidth: 2,
    marginBottom: 12,
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
  pickerContainerError: {
    borderColor: '#b91c1c',
    borderWidth: 2,
  },
  finalizeRequiredCard: {
    marginBottom: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.22)',
  },
  lightActionCard: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: 'rgba(37,99,235,0.4)',
  },
  lightActionCardError: {
    borderColor: '#b91c1c',
  },
  cardSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
    marginBottom: 6,
  },
  cardBodyText: {
    fontSize: 14,
    color: COLORS.TEXT_MUTED,
    lineHeight: 20,
    marginBottom: 8,
  },
  labelSmallDark: {
    color: COLORS.TEXT_DARK,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 6,
  },
  warningTextOnLight: {
    color: '#b45309',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
    fontWeight: '600',
  },
  paymentChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  paymentChip: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(15,23,42,0.18)',
    backgroundColor: '#f8fafc',
  },
  paymentChipSelected: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: 'rgba(37,99,235,0.12)',
  },
  paymentChipDisabled: {
    opacity: 0.55,
  },
  paymentChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.TEXT_DARK,
  },
  paymentChipTextSelected: {
    color: COLORS.PRIMARY,
  },
  completionSection: {
    marginTop: 12,
    marginBottom: 4,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(15,23,42,0.12)',
  },
  pickerLight: {
    width: '100%',
    color: COLORS.TEXT_DARK,
  },
  pickerItemLight: {
    color: COLORS.TEXT_DARK,
    fontSize: 16,
  },
  finalizeRequiredCardTop: {
    marginTop: 4,
  },
  finalizeRequiredCardError: {
    backgroundColor: '#fff5f5',
    borderColor: '#b91c1c',
  },
  ongoingClientCard: {
    marginBottom: 10,
  },
  readyPickupClientCard: {
    marginBottom: 10,
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
  },
  partsSupplierSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(15,23,42,0.12)',
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
  dashboardPhotoBtn: {
    marginTop: 4,
    marginBottom: 4,
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
  trustHint: {
    color: COLORS.TEXT_MUTED,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
    fontStyle: 'italic',
  },
  confirmationCard: {
    marginBottom: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(37,99,235,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.2)',
    gap: 6,
  },
  confirmationTitle: {
    color: COLORS.TEXT_DARK,
    fontSize: 13,
    fontWeight: '700',
  },
  confirmationBody: {
    color: COLORS.TEXT_MUTED,
    fontSize: 13,
    lineHeight: 18,
  },
  confirmationActionBtn: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  confirmationShopActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  evidenceChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  evidenceChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(15,23,42,0.08)',
  },
  evidenceChipText: {
    color: COLORS.TEXT_DARK,
    fontSize: 12,
    fontWeight: '600',
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
  summaryValueCol: {
    flex: 1,
    alignItems: 'flex-end',
  },
  shopNameLink: {
    color: COLORS.PRIMARY,
    fontWeight: '700',
  },
  shopTapHint: {
    color: COLORS.TEXT_MUTED,
    fontSize: 11,
    marginTop: 2,
    textAlign: 'right',
  },
  shopTapHintLeft: {
    textAlign: 'left',
  },
});