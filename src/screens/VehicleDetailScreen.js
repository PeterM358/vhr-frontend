/**
 * PATH: src/screens/VehicleDetailScreen.js
 */

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { ActivityIndicator, StyleSheet, View, Alert, ScrollView, Pressable, KeyboardAvoidingView, Platform, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Text,
  TextInput,
  useTheme,
  FAB,
  TouchableRipple,
  Button,
  Chip,
  Portal,
  Modal,
} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { API_BASE_URL } from '../api/config';
import { updateVehicle, patchVehicleReminder, getVehicleForecast } from '../api/vehicles';
import { listVehicleDocuments } from '../api/documents';
import ScreenBackground from '../components/ScreenBackground';
import AppNavigationBar from '../components/common/AppNavigationBar';
import { useScrollShadow } from '../hooks/useScrollShadow';
import { useVehicleListBack } from '../navigation/appNavBarBack';
import AppCard from '../components/ui/AppCard';
import FloatingCard from '../components/ui/FloatingCard';
import StatusBadge from '../components/ui/StatusBadge';
import { COLORS } from '../constants/colors';
import { DEFAULT_CURRENCY } from '../constants/currency';
import OptionalVehicleGroupsReadonly from '../components/vehicle/OptionalVehicleGroupsReadonly';
import ServiceRecordDatePicker from '../components/vehicle/ServiceRecordDatePicker';
import { isoToDisplayDate } from '../components/vehicle/dateFieldUtils';
import { remindersByTypeMap } from '../utils/vehicleReminderUtils';
import {
  groupVehicleDocuments,
  documentTypeLabel,
  formatDocumentRowSubtitle,
} from '../utils/vehicleDocumentTypes';
import { formatServiceRecordProvider } from '../utils/serviceRecordProvider';
import MileageConfidenceSheet from '../components/vehicle/MileageConfidenceSheet';
import VehicleForecastCard from '../components/vehicle/VehicleForecastCard';
import VehicleHealthCard from '../components/vehicle/VehicleHealthCard';
import {
  heroConfidenceSubtitle,
  mileageConfidenceCategoryPill,
  resolveMileageFactorAction,
} from '../utils/mileageConfidence';
import { mapHealthFromApi } from '../utils/vehicleHealthStatus';
import { formatRevokeConfirmMessage } from '../utils/shopDataAccess';
import { navigateToVehicleServiceRecordNew, navigateToVehicleReminderNew, navigateToVehicleManageServiceCenters, navigateToVehicleSpecs } from '../navigation/webNavigation';
import { openServiceCenters } from '../navigation/serviceCentersNavigation';
import {
  useTranslation,
  translateReminderType,
  translateReminderUiStatus,
  translateRepairStatus,
  translateMileageConfidenceCategory,
  formatVehicleReminderDueLine,
  translateReminderCtaLabel,
  translateMileagePredictionPrompt,
  translateReminderDueDateTitle,
} from '../i18n';
import { showMessage } from '../utils/crossPlatformAlert';
import { translateVehicleTypeLabel, translateRepairTypeLabel } from '../utils/translateShopTypeLabels';

const BASE_VEHICLE_REMINDER_SECTION_ROWS = [
  { reminder_type: 'insurance', icon: 'shield-check-outline' },
  { reminder_type: 'technical_inspection', icon: 'clipboard-check-outline' },
  { reminder_type: 'road_tax', icon: 'receipt-text-outline' },
  { reminder_type: 'vignette', icon: 'ticket-confirmation-outline' },
  { reminder_type: 'oil_service', icon: 'engine-oil' },
  { reminder_type: 'tire_change', icon: 'tire' },
  { reminder_type: 'battery_check', icon: 'car-battery' },
];

const SUSPENSION_REMINDER_ROW = {
  reminder_type: 'suspension_service',
  icon: 'shock-absorber',
};

function reminderUiTone(uiStatus) {
  const k = String(uiStatus || '').toLowerCase();
  if (k === 'overdue') return { bg: 'rgba(220,38,38,0.15)', fg: '#B91C1C' };
  if (k === 'due_soon') return { bg: 'rgba(245,158,11,0.2)', fg: '#B45309' };
  if (k === 'pending_setup') return { bg: 'rgba(100,116,139,0.15)', fg: '#475569' };
  if (k === 'active_until') return { bg: 'rgba(22,163,74,0.15)', fg: '#15803D' };
  if (k === 'completed') return { bg: 'rgba(22,163,74,0.15)', fg: '#15803D' };
  return { bg: 'rgba(100,116,139,0.12)', fg: '#475569' };
}

function isObligationReminderType(reminderType) {
  return ['insurance', 'technical_inspection', 'vignette', 'road_tax'].includes(String(reminderType || '').toLowerCase());
}

export default function VehicleDetailScreen({ route, navigation }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { vehicleId, mileageIntent: mileageIntentParam, backLabel: backLabelParam } = route.params || {};
  const { scrolled, onScroll, scrollEventThrottle } = useScrollShadow();
  const handleBack = useVehicleListBack(navigation);
  const backLabel = backLabelParam || t('vehicles.backToVehicles');
  const onBack = backLabelParam
    ? () => navigation.goBack()
    : handleBack;
  const [vehicle, setVehicle] = useState(null);
  const [repairs, setRepairs] = useState([]);
  const [vehicleDocuments, setVehicleDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isShop, setIsShop] = useState(false);
  const [sectionsExpanded, setSectionsExpanded] = useState({
    remindersObligations: false,
    serviceHistory: true,
    authorizedCenters: false,
    documents: false,
  });
  const [forecast, setForecast] = useState(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastExpanded, setForecastExpanded] = useState(true);
  const [pendingServiceHistoryScroll, setPendingServiceHistoryScroll] = useState(false);

  const [mileageSheetVisible, setMileageSheetVisible] = useState(false);
  const [kmModalVisible, setKmModalVisible] = useState(false);
  const [addActivityModalVisible, setAddActivityModalVisible] = useState(false);
  const [kmDraft, setKmDraft] = useState('');
  const [kmSaving, setKmSaving] = useState(false);

  const [reminderModalVisible, setReminderModalVisible] = useState(false);
  const [reminderDraft, setReminderDraft] = useState({
    id: null,
    reminder_type: '',
    label: '',
    due_date: '',
    due_kilometers: '',
    advance_notice_days: '',
    advance_notice_kilometers: '',
    source_note: '',
  });
  const [reminderSaving, setReminderSaving] = useState(false);

  const theme = useTheme();
  const scrollRef = useRef(null);
  const remindersSectionRef = useRef(null);
  const sectionScrollYs = useRef({
    activeRepairs: null,
    serviceHistory: null,
    authorizedCenters: null,
    reminders: null,
  });

  useEffect(() => {
    const loadRole = async () => {
      const val = await AsyncStorage.getItem('@is_shop');
      setIsShop(val === 'true');
    };
    loadRole();
  }, []);

  const loadVehicleDetails = useCallback(async ({ silent = false } = {}) => {
    const token = await AsyncStorage.getItem('@access_token');
    const shopFlag = await AsyncStorage.getItem('@is_shop');
    if (!silent) {
      setLoading(true);
    }
    try {
      const res = await fetch(`${API_BASE_URL}/api/vehicles/${vehicleId}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error('Failed to load vehicle');
      }
      const data = await res.json();
      setVehicle(data);
      setRepairs(data.repairs || []);
      if (shopFlag !== 'true') {
        try {
          const docs = await listVehicleDocuments(token, vehicleId);
          setVehicleDocuments(docs);
        } catch (docErr) {
          console.warn('Could not load vehicle documents', docErr);
          setVehicleDocuments([]);
        }
        setForecastLoading(true);
        try {
          const forecastData = await getVehicleForecast(vehicleId, token);
          setForecast(forecastData);
        } catch (forecastErr) {
          console.warn('Could not load vehicle forecast', forecastErr);
          setForecast(null);
        } finally {
          setForecastLoading(false);
        }
      } else {
        setVehicleDocuments([]);
        setForecast(null);
        setForecastLoading(false);
      }
    } catch (err) {
      console.error('Error fetching vehicle details:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [vehicleId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadVehicleDetails({ silent: true });
  }, [loadVehicleDetails]);

  useFocusEffect(
    useCallback(() => {
      loadVehicleDetails();
    }, [loadVehicleDetails])
  );

  useEffect(() => {
    if (route.params?.expandReminders) {
      setSectionsExpanded((prev) => ({ ...prev, remindersObligations: true }));
      navigation.setParams({ expandReminders: undefined });
    }
    if (route.params?.expandAuthorizedCenters) {
      setSectionsExpanded((prev) => ({ ...prev, authorizedCenters: true }));
      navigation.setParams({ expandAuthorizedCenters: undefined });
    }
    if (route.params?.scrollToServiceHistory) {
      setPendingServiceHistoryScroll(true);
      setSectionsExpanded((prev) => ({ ...prev, serviceHistory: true }));
      navigation.setParams({ scrollToServiceHistory: undefined });
    }
  }, [
    route.params?.expandReminders,
    route.params?.expandAuthorizedCenters,
    route.params?.scrollToServiceHistory,
    navigation,
  ]);

  const openTechnicalDetails = () => {
    if (!vehicle) return;
    navigation.navigate('EditVehicleDetails', { vehicleId });
  };

  const openVehicleSpecs = () => {
    navigateToVehicleSpecs(navigation, vehicleId);
  };

  const openKmModal = () => {
    const cur =
      vehicle?.kilometers != null && vehicle.kilometers !== ''
        ? String(vehicle.kilometers)
        : '';
    setKmDraft(cur);
    setKmModalVisible(true);
  };

  const saveKmOnly = async () => {
    const kmRaw = String(kmDraft ?? '').trim();
    let km = 0;
    if (kmRaw) {
      const kn = Number(kmRaw);
      if (!Number.isFinite(kn) || kn < 0 || Math.round(kn) !== kn) {
        showMessage(t('common.validation'), t('vehicles.detail.kilometersWholeNumber'), { variant: 'error' });
        return;
      }
      km = kn;
    }
    setKmSaving(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      await updateVehicle(vehicleId, { kilometers: km }, token);
      await loadVehicleDetails();
      setKmModalVisible(false);
    } catch (e) {
      console.error(e);
      Alert.alert(t('common.error'), e.message || t('vehicles.detail.kmUpdateError'));
    } finally {
      setKmSaving(false);
    }
  };

  const openReminderEditor = (rowTemplate, reminderRow) => {
    if (isShop) return;
    const r = reminderRow;
    if (!r?.id) {
      Alert.alert(
        t('vehicles.detail.reminderUnavailableTitle'),
        t('vehicles.detail.reminderUnavailableBody')
      );
      return;
    }
    setReminderDraft({
      id: r.id,
      reminder_type: rowTemplate.reminder_type,
      label: translateReminderType(rowTemplate.reminder_type, t),
      due_date: r.due_date != null ? String(r.due_date).slice(0, 10) : '',
      due_kilometers: r.due_kilometers != null && r.due_kilometers !== '' ? String(r.due_kilometers) : '',
      advance_notice_days:
        r.advance_notice_days != null && r.advance_notice_days !== '' ? String(r.advance_notice_days) : '',
      advance_notice_kilometers:
        r.advance_notice_kilometers != null && r.advance_notice_kilometers !== ''
          ? String(r.advance_notice_kilometers)
          : '',
      source_note: r.source_note != null ? String(r.source_note) : '',
    });
    setReminderModalVisible(true);
  };

  const parseOptionalInt = (raw) => {
    const s = String(raw ?? '').trim();
    if (!s) return null;
    const n = Number(s);
    if (!Number.isFinite(n) || Math.round(n) !== n || n < 0) return undefined;
    return n;
  };

  const saveReminderPatch = async () => {
    const id = reminderDraft.id;
    if (!id) return;
    const dueDateRaw = String(reminderDraft.due_date || '').trim();
    const dueDate = dueDateRaw
      ? /^\d{4}-\d{2}-\d{2}$/.test(dueDateRaw)
        ? dueDateRaw
        : undefined
      : null;
    if (dueDate === undefined) {
      showMessage(t('common.validation'), t('vehicles.detail.chooseValidDueDate'), { variant: 'error' });
      return;
    }

    const dueKm = parseOptionalInt(reminderDraft.due_kilometers);
    if (dueKm === undefined) {
      Alert.alert(t('common.notice'), t('vehicles.detail.dueKilometersValidation'));
      return;
    }
    const advDays = parseOptionalInt(reminderDraft.advance_notice_days);
    if (advDays === undefined) {
      showMessage(t('common.validation'), t('vehicles.detail.advanceNoticeDaysValidation'), { variant: 'error' });
      return;
    }
    const advKm = parseOptionalInt(reminderDraft.advance_notice_kilometers);
    if (advKm === undefined) {
      showMessage(t('common.validation'), t('vehicles.detail.advanceNoticeKmValidation'), { variant: 'error' });
      return;
    }

    setReminderSaving(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      await patchVehicleReminder(
        vehicleId,
        id,
        {
          due_date: dueDate,
          due_kilometers: dueKm,
          advance_notice_days: advDays,
          advance_notice_kilometers: advKm,
          source_note: String(reminderDraft.source_note ?? '').trim() || null,
        },
        token
      );
      await loadVehicleDetails();
      setReminderModalVisible(false);
    } catch (e) {
      console.error(e);
      showMessage(t('common.error'), e.message || t('vehicles.detail.saveReminderError'), { variant: 'error' });
    } finally {
      setReminderSaving(false);
    }
  };

  const inactiveRepairStatuses = useMemo(() => new Set(['done', 'canceled', 'cancelled', 'denied']), []);

  const activeRepairsList = useMemo(() => {
    return repairs.filter((r) => !inactiveRepairStatuses.has(String(r.status || '').toLowerCase()));
  }, [repairs, inactiveRepairStatuses]);

  const serviceHistorySorted = useMemo(() => {
    const done = repairs.filter((r) => String(r.status || '').toLowerCase() === 'done');
    return [...done].sort((a, b) => {
      const ta = new Date(a.completed_at || a.created_at || 0).getTime();
      const tb = new Date(b.completed_at || b.created_at || 0).getTime();
      return tb - ta;
    });
  }, [repairs]);

  const documentGroups = useMemo(
    () => groupVehicleDocuments(vehicleDocuments),
    [vehicleDocuments]
  );

  const scrollToY = useCallback((y) => {
    if (y == null || scrollRef.current == null) return;
    scrollRef.current.scrollTo({ y: Math.max(0, y - 10), animated: true });
  }, []);

  const scrollToRemindersSection = useCallback(() => {
    setSectionsExpanded((prev) => ({ ...prev, remindersObligations: true }));

    const doScroll = (attempt = 0) => {
      const scrollNode = scrollRef.current;
      const sectionNode = remindersSectionRef.current;
      if (scrollNode && sectionNode?.measureLayout) {
        try {
          sectionNode.measureLayout(
            scrollNode.getInnerViewNode?.() ?? scrollNode,
            (_x, y) => {
              scrollRef.current?.scrollTo({ y: Math.max(0, y - 12), animated: true });
            },
            () => {
              if (attempt < 8) {
                setTimeout(() => doScroll(attempt + 1), 80);
              }
            }
          );
          return;
        } catch (_err) {
          // Fall back to cached layout offset below.
        }
      }
      const cachedY = sectionScrollYs.current.reminders;
      if (cachedY != null) {
        scrollToY(cachedY);
        return;
      }
      if (attempt < 8) {
        setTimeout(() => doScroll(attempt + 1), 80);
      }
    };

    requestAnimationFrame(() => {
      setTimeout(() => doScroll(), 120);
    });
  }, [scrollToY]);

  const scrollToServiceHistorySection = useCallback(() => {
    if (!serviceHistorySorted.length) {
      showMessage(
        t('vehicles.detail.noCompletedServiceTitle'),
        t('vehicles.detail.noCompletedServiceBody'),
        { variant: 'info' }
      );
      return;
    }
    setSectionsExpanded((prev) => ({ ...prev, serviceHistory: true }));
    requestAnimationFrame(() => {
      setTimeout(() => scrollToY(sectionScrollYs.current.serviceHistory), 80);
    });
  }, [serviceHistorySorted.length, scrollToY]);

  useEffect(() => {
    if (!pendingServiceHistoryScroll || loading) return;
    const t = setTimeout(() => {
      scrollToServiceHistorySection();
      setPendingServiceHistoryScroll(false);
    }, 250);
    return () => clearTimeout(t);
  }, [pendingServiceHistoryScroll, loading, scrollToServiceHistorySection]);

  const scrollToActiveRepairsSection = useCallback(() => {
    if (!repairs.length) {
      showMessage(t('vehicles.detail.noRepairsTitle'), t('vehicles.detail.noRepairsBody'), { variant: 'info' });
      return;
    }
    scrollToY(sectionScrollYs.current.activeRepairs);
  }, [repairs.length, scrollToY]);

  const openLatestCompletedRepair = useCallback(() => {
    const latest = serviceHistorySorted[0];
    if (!latest?.id) {
      showMessage(
        t('vehicles.detail.noCompletedServiceTitle'),
        t('vehicles.detail.noCompletedServiceBody'),
        { variant: 'info' }
      );
      return;
    }
    navigation.navigate('RepairDetail', { repairId: latest.id });
  }, [navigation, serviceHistorySorted]);

  const openRepairById = useCallback(
    (repairId) => {
      if (!repairId) {
        openLatestCompletedRepair();
        return;
      }
      navigation.navigate('RepairDetail', { repairId });
    },
    [navigation, openLatestCompletedRepair]
  );

  const scrollToAuthorizedCenters = useCallback(() => {
    setSectionsExpanded((prev) => ({ ...prev, authorizedCenters: true }));
    requestAnimationFrame(() => {
      setTimeout(() => scrollToY(sectionScrollYs.current.authorizedCenters), 80);
    });
  }, [scrollToY]);

  const navigateLogServiceRecord = useCallback(
    (extraParams = {}) => {
      navigateToVehicleServiceRecordNew(navigation, vehicleId, {
        returnTo: 'VehicleDetail',
        origin: 'VehicleDetail',
        ...extraParams,
      });
    },
    [navigation, vehicleId]
  );

  const navigateObligationPayment = useCallback(
    (extraParams = {}) => {
      navigateToVehicleReminderNew(navigation, vehicleId, {
        returnTo: 'VehicleDetail',
        origin: 'VehicleDetail',
        ...extraParams,
      });
    },
    [navigation, vehicleId]
  );

  const vehicleHealth = useMemo(() => mapHealthFromApi(vehicle, t), [vehicle, t]);

  const handleHealthAction = useCallback(
    (actionKey, row) => {
      switch (actionKey) {
        case 'update_km':
          openKmModal();
          break;
        case 'log_service':
        case 'add_service_history':
          if (row?.id === 'oil') {
            navigateLogServiceRecord({ type: 'oil_service', prefillKm: true });
          } else if (row?.id === 'brake') {
            navigateLogServiceRecord({ type: 'brake', prefillKm: true });
          } else {
            navigateLogServiceRecord();
          }
          break;
        case 'schedule':
        case 'schedule_maintenance':
          navigation.navigate('CreateRepair', {
            vehicleId,
            mode: 'request',
            returnTo: 'VehicleDetail',
            origin: 'VehicleDetail',
          });
          break;
        case 'book_repair':
          navigation.navigate('CreateRepair', {
            vehicleId,
            mode: 'request',
            returnTo: 'VehicleDetail',
            origin: 'VehicleDetail',
          });
          break;
        case 'reminders':
        case 'configure_reminders':
          scrollToRemindersSection();
          break;
        default:
          break;
      }
    },
    [navigation, vehicleId, navigateLogServiceRecord, scrollToRemindersSection, openKmModal]
  );

  const handleMileageFactorPress = useCallback(
    (factor) => {
      const intent = resolveMileageFactorAction(factor);
      if (!intent) return;
      setMileageSheetVisible(false);

      switch (intent.action) {
        case 'service_history':
          scrollToServiceHistorySection();
          break;
        case 'repair_detail':
          openRepairById(intent.repairId);
          break;
        case 'log_service':
        case 'log_service_receipt':
        case 'log_service_odometer':
          navigateLogServiceRecord();
          break;
        case 'add_obligation_inspection':
          navigateObligationPayment({ initialReminderType: 'technical_inspection' });
          break;
        case 'manage_authorized_centers':
          navigateToVehicleManageServiceCenters(navigation, vehicleId);
          break;
        case 'vehicle_specs':
          navigateToVehicleSpecs(navigation, vehicleId);
          break;
        default:
          scrollToServiceHistorySection();
      }
    },
    [
      navigation,
      vehicleId,
      scrollToServiceHistorySection,
      openRepairById,
      navigateLogServiceRecord,
      navigateObligationPayment,
      scrollToAuthorizedCenters,
      navigateToVehicleManageServiceCenters,
      navigateToVehicleSpecs,
    ]
  );

  const mileageConfidence = vehicle?.mileage_confidence;
  const confidencePillStyle = useMemo(
    () => mileageConfidenceCategoryPill(mileageConfidence?.category),
    [mileageConfidence?.category]
  );

  useEffect(() => {
    setSectionsExpanded((prev) => ({
      ...prev,
      serviceHistory: serviceHistorySorted.length <= 3,
    }));
  }, [serviceHistorySorted.length]);

  useFocusEffect(
    useCallback(() => {
      if (!mileageIntentParam?.action || !vehicle) return;
      navigation.setParams({ mileageIntent: undefined });
      handleMileageFactorPress({
        action: mileageIntentParam.action,
        repair_id: mileageIntentParam.repairId,
      });
    }, [mileageIntentParam, vehicle, navigation, handleMileageFactorPress])
  );

  const authorizedServiceCenters = useMemo(() => {
    const raw =
      (Array.isArray(vehicle?.shared_with_shops) && vehicle.shared_with_shops) ||
      (Array.isArray(vehicle?.shared_with) && vehicle.shared_with) ||
      (Array.isArray(vehicle?.authorized_shops) && vehicle.authorized_shops) ||
      [];
    return raw.map((center, idx) => ({
      id: center?.id ?? `center-${idx}`,
      name: center?.name || center?.title || 'Service center',
      location:
        center?.city_name ||
        center?.city ||
        center?.address ||
        center?.location ||
        '',
    }));
  }, [vehicle]);

  const repairTypeLine = (r) => {
    const translated = translateRepairTypeLabel(
      {
        slug: r.final_repair_type_slug || r.effective_repair_type_slug || r.repair_type_slug,
        repair_type_name:
          r.final_repair_type_name ||
          r.effective_repair_type_name ||
          r.repair_type_name ||
          null,
        name:
          r.final_repair_type_name ||
          r.effective_repair_type_name ||
          r.repair_type_name ||
          null,
      },
      t
    );
    if (translated) return translated;
    const desc = String(r.description || '').trim();
    if (desc) return desc.length > 56 ? `${desc.slice(0, 53)}…` : desc;
    return t('vehicles.detail.needsClassification');
  };
  const mediaIndicatorLabel = (r) => {
    const mediaItems = Array.isArray(r.repair_media)
      ? r.repair_media
      : Array.isArray(r.media)
        ? r.media
        : [];
    if (!mediaItems.length) return null;
    const hasVideo = mediaItems.some((m) => String(m?.media_type || '').toLowerCase() === 'video');
    const hasImage = mediaItems.some((m) => {
      const t = String(m?.media_type || '').toLowerCase();
      return t === 'image' || t === 'photo';
    });
    if (hasVideo && hasImage) return 'Media attached';
    if (hasVideo) return 'Video';
    if (hasImage) return 'Photos';
    return 'Media attached';
  };

  const localLifetimeSummary = useMemo(() => {
    const completedRepairs = repairs.filter((r) => String(r.status || '').toLowerCase() === 'done');
    const activeRepairs = repairs.filter((r) => !inactiveRepairStatuses.has(String(r.status || '').toLowerCase()));
    let totalSpent = 0;
    let totalLabor = 0;
    let totalParts = 0;
    let hasTotalSpent = false;
    let hasLabor = false;
    let hasParts = false;

    completedRepairs.forEach((r) => {
      const labor = r.labor_price != null ? Number(r.labor_price) : null;
      const parts = r.parts_price != null ? Number(r.parts_price) : null;
      const total = r.total_price != null
        ? Number(r.total_price)
        : (r.calculated_total_price != null ? Number(r.calculated_total_price) : null);
      if (labor != null && Number.isFinite(labor)) {
        totalLabor += labor;
        hasLabor = true;
      }
      if (parts != null && Number.isFinite(parts)) {
        totalParts += parts;
        hasParts = true;
      }
      if (total != null && Number.isFinite(total)) {
        totalSpent += total;
        hasTotalSpent = true;
      } else if (labor != null && parts != null && Number.isFinite(labor) && Number.isFinite(parts)) {
        totalSpent += labor + parts;
        hasTotalSpent = true;
      }
    });

    const lastCompleted = completedRepairs
      .map((r) => r.completed_at || null)
      .filter(Boolean)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

    return {
      completedCount: completedRepairs.length,
      activeCount: activeRepairs.length,
      totalSpent: hasTotalSpent ? totalSpent : null,
      totalLabor: hasLabor ? totalLabor : null,
      totalParts: hasParts ? totalParts : null,
      lastCompletedDate: lastCompleted,
    };
  }, [repairs, inactiveRepairStatuses]);

  const lifetimeSummary = useMemo(() => {
    const backend = vehicle?.lifetime_summary;
    if (!backend || typeof backend !== 'object') return localLifetimeSummary;

    const readMinor = (value) => {
      if (value == null) return null;
      const n = Number(value);
      if (!Number.isFinite(n)) return null;
      return n;
    };

    return {
      completedCount:
        Number.isFinite(Number(backend.completed_repairs))
          ? Number(backend.completed_repairs)
          : localLifetimeSummary.completedCount,
      activeCount:
        Number.isFinite(Number(backend.active_repairs))
          ? Number(backend.active_repairs)
          : localLifetimeSummary.activeCount,
      totalSpentMinor: readMinor(backend.total_spent_minor),
      totalLaborMinor: readMinor(backend.total_labor_minor),
      totalPartsMinor: readMinor(backend.total_parts_minor),
      currency: backend.currency || DEFAULT_CURRENCY,
      lastCompletedDate: backend.last_completed_at || localLifetimeSummary.lastCompletedDate || null,
      usesBackend: true,
    };
  }, [vehicle, localLifetimeSummary]);

  const formatMinorCurrency = (minorValue, currencyCode = DEFAULT_CURRENCY) => {
    if (minorValue == null) return '—';
    const n = Number(minorValue);
    if (!Number.isFinite(n)) return '—';
    return `${(n / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currencyCode || DEFAULT_CURRENCY}`;
  };

  const formattedLifetimeMoney = useMemo(() => {
    if (lifetimeSummary.usesBackend) {
      const cc = lifetimeSummary.currency || DEFAULT_CURRENCY;
      return {
        totalSpent: formatMinorCurrency(lifetimeSummary.totalSpentMinor, cc),
        totalLabor: formatMinorCurrency(lifetimeSummary.totalLaborMinor, cc),
        totalParts: formatMinorCurrency(lifetimeSummary.totalPartsMinor, cc),
      };
    }
    return {
      totalSpent:
        lifetimeSummary.totalSpent != null
          ? `${Number(lifetimeSummary.totalSpent).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${DEFAULT_CURRENCY}`
          : '—',
      totalLabor:
        lifetimeSummary.totalLabor != null
          ? `${Number(lifetimeSummary.totalLabor).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${DEFAULT_CURRENCY}`
          : '—',
      totalParts:
        lifetimeSummary.totalParts != null
          ? `${Number(lifetimeSummary.totalParts).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${DEFAULT_CURRENCY}`
          : '—',
    };
  }, [lifetimeSummary]);

  const heroIdentity = useMemo(() => {
    if (!vehicle) {
      return { line1: 'Unknown vehicle', line2: null };
    }
    const catParts = [
      vehicle.catalog_brand_name,
      vehicle.catalog_model_name,
      vehicle.catalog_generation_name,
    ].filter(Boolean);
    const varParts = [vehicle.catalog_engine_name, vehicle.catalog_trim_name].filter(Boolean);
    let line1 = catParts.join(' ');
    if (!line1) {
      line1 = [vehicle.make_name, vehicle.model_name].filter(Boolean).join(' ') || 'Unknown vehicle';
    }
    const line2 = varParts.length ? varParts.join(' · ') : null;
    return { line1, line2 };
  }, [vehicle]);

  const heroTypeLabel = useMemo(() => {
    if (!vehicle) return null;
    const label = translateVehicleTypeLabel(vehicle, t);
    if (!label || label.toLowerCase() === 'vehicle') return null;
    return label;
  }, [vehicle, t]);

  /** ISO2 • Registered DD.MM.YYYY (legacy year-only → ~YYYY). */
  const heroRegistrationSubtitle = useMemo(() => {
    if (!vehicle) return null;
    const iso = String(vehicle.registration_country || '').trim().toUpperCase();
    const dateRaw = vehicle.first_registration_date;
    const dateDisp = dateRaw ? isoToDisplayDate(dateRaw) : null;
    const yr =
      vehicle.registration_year != null && vehicle.registration_year !== ''
        ? Number(vehicle.registration_year)
        : vehicle.year != null && vehicle.year !== ''
          ? Number(vehicle.year)
          : null;
    const parts = [];
    if (iso.length === 2) parts.push(iso);
    if (dateDisp) {
      parts.push(`${t('vehicles.detail.registered')} ${dateDisp}`);
    } else if (yr != null && Number.isFinite(yr) && !dateRaw) {
      parts.push(t('vehicles.detail.registeredApprox', { year: yr }));
    }
    return parts.length ? parts.join(' • ') : null;
  }, [vehicle, t]);

  const remindersByType = useMemo(
    () => remindersByTypeMap(vehicle?.reminders),
    [vehicle?.reminders]
  );

  const reminderSectionRows = useMemo(() => {
    const code = String(vehicle?.vehicle_type_code || '').toLowerCase();
    const isBike = ['bicycle', 'ebike', 'motorcycle'].includes(code);
    return isBike ? [...BASE_VEHICLE_REMINDER_SECTION_ROWS, SUSPENSION_REMINDER_ROW] : BASE_VEHICLE_REMINDER_SECTION_ROWS;
  }, [vehicle?.vehicle_type_code]);

  const renderActiveRepairCard = (item) => (
    <TouchableRipple
      borderless={false}
      style={[styles.repairCard, styles.activeRepairCard]}
      onPress={() => navigation.navigate('RepairDetail', { repairId: item.id })}
    >
      <View>
        <View style={styles.repairCardTop}>
          <Text style={styles.repairTitle} numberOfLines={1}>
            {repairTypeLine(item)}
          </Text>
          <StatusBadge status={item.status} label={translateRepairStatus(item.status, t)} />
        </View>
        <Text style={styles.repairMeta} numberOfLines={2}>
          {t('vehicles.detail.serviceProvider')}: {formatServiceRecordProvider(item, t)}
        </Text>
        {item.final_kilometers != null || (item.kilometers != null && item.kilometers !== '') ? (
          <Text style={styles.repairMeta}>
            {item.final_kilometers != null ? t('vehicles.detail.currentKilometersRepair') : t('vehicles.detail.requestKilometers')}:{' '}
            {item.final_kilometers != null
              ? Number(item.final_kilometers).toLocaleString()
              : Number(item.kilometers).toLocaleString()}
          </Text>
        ) : null}
      </View>
    </TouchableRipple>
  );

  const renderCompletedHistoryCard = (item) => {
    const currency = item.currency || DEFAULT_CURRENCY;
    const km =
      item.final_kilometers != null
        ? item.final_kilometers
        : item.kilometers != null && item.kilometers !== ''
          ? Number(item.kilometers).toLocaleString()
          : '—';

    return (
      <TouchableRipple
        borderless={false}
        style={[styles.repairCard, styles.historyRepairCard]}
        onPress={() => navigation.navigate('RepairDetail', { repairId: item.id })}
      >
        <View>
          <View style={styles.repairCardTop}>
            <Text style={styles.repairTitle} numberOfLines={1}>
              {repairTypeLine(item)}
            </Text>
            <View style={styles.completedStamp}>
              <Text style={styles.completedStampText}>{t('vehicles.detail.completed')}</Text>
            </View>
          </View>
          <Text style={styles.repairMeta} numberOfLines={2}>
          {t('vehicles.detail.serviceProvider')}: {formatServiceRecordProvider(item, t)}
        </Text>
        {mediaIndicatorLabel(item) ? (
          <Chip compact style={styles.mediaChip}>
            {mediaIndicatorLabel(item)}
          </Chip>
        ) : null}
        <Text style={styles.repairMeta}>
          {t('vehicles.detail.completedAt')}:{' '}
          {item.completed_at ? new Date(item.completed_at).toLocaleDateString() : '—'}
        </Text>
        <Text style={styles.repairMeta}>
          {t('vehicles.detail.kilometersLabel')}: {km}
          {item.final_kilometers != null ? ` (${t('vehicles.detail.kilometersFinal')})` : ''}
        </Text>
        {item.total_price != null && item.total_price !== '' ? (
          <Text style={styles.repairTotalLine}>
            {t('vehicles.detail.total')}: {Number(item.total_price).toLocaleString()} {currency}
          </Text>
        ) : null}
        </View>
      </TouchableRipple>
    );
  };

  if (loading) {
    return (
      <ScreenBackground safeArea={false}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      </ScreenBackground>
    );
  }

  if (!vehicle) {
    return (
      <ScreenBackground safeArea={false}>
        <View style={styles.center}>
          <Text style={styles.emptyText}>Vehicle not found.</Text>
        </View>
      </ScreenBackground>
    );
  }

  const handleAddActivity = () => {
    if (isShop) {
      Alert.alert(t('vehicles.detail.addActivityTitle'), t('vehicles.detail.addActivityBody'));
      return;
    }
    setAddActivityModalVisible(true);
  };

  const closeAddActivityModal = () => setAddActivityModalVisible(false);

  const handleAddActivityRequestService = () => {
    closeAddActivityModal();
    navigation.navigate('CreateRepair', {
      vehicleId,
      mode: 'request',
      returnTo: 'VehicleDetail',
      origin: 'VehicleDetail',
    });
  };

  const handleAddActivityServiceRecord = () => {
    closeAddActivityModal();
    navigateLogServiceRecord();
  };

  const handleAddActivityObligation = () => {
    closeAddActivityModal();
    navigateObligationPayment();
  };

  const toggleSection = (key) => {
    setSectionsExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleFindServiceCenters = () => {
    const vid = vehicle?.id ?? route.params?.vehicleId;
    if (!vid) return;
    openServiceCenters(navigation, {
      vehicleId: vid,
      returnTo: 'VehicleDetail',
    });
  };

  const setCenterAuthorized = async (center, shouldAuthorize) => {
    const vid = vehicle?.id ?? route.params?.vehicleId;
    if (vid == null || !vehicle) return;
    const currentIds = authorizedServiceCenters
      .map((c) => Number(c.id))
      .filter(Number.isFinite);
    const sid = Number(center.id);
    const nextIds = shouldAuthorize
      ? currentIds.includes(sid)
        ? currentIds
        : [...currentIds, sid]
      : currentIds.filter((id) => id !== sid);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const updated = await updateVehicle(vid, { shared_with_shops_ids: nextIds }, token);
      setVehicle(updated);
    } catch (e) {
      console.error(e);
      Alert.alert(t('common.error'), t('vehicles.detail.authorizationUpdateError', null, 'Could not update authorization.'));
    }
  };

  const handleRevokeAuthorizedCenter = (center) => {
    Alert.alert(
      t('vehicles.detail.revokeAccessTitle'),
      formatRevokeConfirmMessage(center?.name || t('mileageConfidence.workshopFallback')),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('vehicles.detail.revokeAccessConfirm'),
          style: 'destructive',
          onPress: () => setCenterAuthorized(center, false),
        },
      ]
    );
  };

  const handleOpenAuthorizedCenter = (center) => {
    navigation.navigate('ShopDetail', {
      shopId: center.id,
      vehicleId: vehicle?.id ?? route.params?.vehicleId,
      returnTo: 'VehicleDetail',
    });
  };

  const handleManageServiceCenters = () => {
    navigateToVehicleManageServiceCenters(navigation, vehicle?.id ?? route.params?.vehicleId);
  };

  const SectionHeader = ({ title, sectionKey }) => (
    <Pressable onPress={() => toggleSection(sectionKey)} style={styles.collapsibleHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <MaterialCommunityIcons
        name={sectionsExpanded[sectionKey] ? 'chevron-up' : 'chevron-down'}
        size={20}
        color={COLORS.TEXT_MUTED}
      />
    </Pressable>
  );

  const renderDocumentGroup = (title, items) => {
    if (!items?.length) return null;
    return (
      <View style={styles.documentGroup}>
        <Text style={styles.documentGroupTitle}>
          {title} ({items.length})
        </Text>
        {items.map((doc) => (
          <View key={doc.id} style={styles.documentRow}>
            <Text style={styles.documentRowTitle} numberOfLines={1}>
              {doc.title || doc.original_filename || documentTypeLabel(doc.document_type)}
            </Text>
            <Text style={styles.documentRowMeta} numberOfLines={2}>
              {formatDocumentRowSubtitle(doc)}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const infoTile = (label, value, { onPress, showChevron = false } = {}) => {
    const row = (
      <View style={styles.infoTileRow}>
        <View style={styles.infoTileTextCol}>
          <Text style={styles.infoLabel}>{label}</Text>
          <Text style={styles.infoValue} numberOfLines={label === 'VIN' ? 3 : 2}>
            {value}
          </Text>
        </View>
        {showChevron ? (
          <MaterialCommunityIcons name="chevron-right" size={18} color={COLORS.TEXT_MUTED} style={styles.infoTileChevron} />
        ) : null}
      </View>
    );
    if (onPress) {
      return (
        <Pressable
          key={label}
          onPress={onPress}
          style={({ pressed }) => [styles.infoCell, styles.infoCellInteractive, pressed && styles.infoCellPressed]}
          android_ripple={{ color: 'rgba(15,23,42,0.06)' }}
        >
          {row}
        </Pressable>
      );
    }
    return (
      <View key={label} style={styles.infoCell}>
        {row}
      </View>
    );
  };

  return (
    <ScreenBackground safeArea={false}>
      <View style={styles.container}>
        <AppNavigationBar
          title={t('vehicles.nav.details')}
          backLabel={backLabel}
          onBack={onBack}
          scrolled={scrolled}
        />
        <ScrollView
          ref={scrollRef}
          onScroll={onScroll}
          scrollEventThrottle={scrollEventThrottle}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: 12 },
          ]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
          }
        >
          <AppCard variant="dark" contentStyle={styles.heroInner} style={styles.heroCardWrap}>
            <Pressable
              onPress={openVehicleSpecs}
              accessibilityRole="button"
              accessibilityLabel={t('vehicles.detail.viewVehicleSpecs')}
              style={({ pressed }) => [
                styles.heroCard,
                pressed ? styles.heroIdentityPressed : null,
              ]}
            >
              <View style={styles.heroIconWrap}>
                <MaterialCommunityIcons name="car-sports" size={36} color="#fff" />
              </View>
              <View style={styles.heroBody}>
                <View style={styles.heroTopRow}>
                  <Text style={styles.heroPlate} numberOfLines={1}>
                    {vehicle.license_plate || '—'}
                  </Text>
                </View>
                <Text style={styles.heroMakeModel} numberOfLines={2}>
                  {heroIdentity.line1}
                </Text>
                {heroRegistrationSubtitle ? (
                  <Text style={styles.heroFirstReg} numberOfLines={2}>
                    {heroRegistrationSubtitle}
                  </Text>
                ) : null}
                {heroIdentity.line2 ? (
                  <Text style={styles.heroVariant} numberOfLines={1}>
                    {heroIdentity.line2}
                  </Text>
                ) : null}
                {heroTypeLabel ? <Text style={styles.heroType}>{heroTypeLabel}</Text> : null}
                <Text style={styles.heroKm}>
                  {vehicle.kilometers != null && vehicle.kilometers !== ''
                    ? `${Number(vehicle.kilometers).toLocaleString()} km`
                    : t('vehicles.detail.kilometersNotSet')}
                </Text>
                {!isShop ? (
                  <Pressable
                    onPress={() => setMileageSheetVisible(true)}
                    accessibilityRole="button"
                    accessibilityLabel={t('vehicles.detail.mileageConfidenceDetails')}
                    style={({ pressed }) => [
                      styles.heroConfidenceRow,
                      pressed && styles.heroConfidencePressed,
                    ]}
                  >
                    <View
                      style={[
                        styles.heroConfidencePill,
                        {
                          backgroundColor: confidencePillStyle.bg,
                          borderColor: confidencePillStyle.border,
                        },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name="shield-check-outline"
                        size={14}
                        color={confidencePillStyle.fg}
                      />
                      <Text style={[styles.heroConfidencePillText, { color: confidencePillStyle.fg }]}>
                        {translateMileageConfidenceCategory(mileageConfidence?.category, t)}
                      </Text>
                      <MaterialCommunityIcons name="chevron-down" size={16} color={confidencePillStyle.fg} />
                    </View>
                    <Text style={styles.heroConfidenceSub} numberOfLines={2}>
                      {heroConfidenceSubtitle(mileageConfidence, t)}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </Pressable>
            <Pressable
              onPress={openVehicleSpecs}
              accessibilityRole="button"
              accessibilityLabel={t('vehicles.detail.viewSpecs')}
              hitSlop={{ top: 6, bottom: 6, left: 8, right: 8 }}
              style={({ pressed }) => [styles.heroViewSpecsRow, pressed ? styles.heroViewSpecsPressed : null]}
            >
              <Text style={styles.heroViewSpecsText}>{t('vehicles.detail.viewSpecs')}</Text>
              <MaterialCommunityIcons name="chevron-right" size={18} color="rgba(255,255,255,0.85)" />
            </Pressable>
            {!isShop ? (
              <View style={styles.heroActionsRow}>
                <Button
                  mode="outlined"
                  compact
                  onPress={openKmModal}
                  style={styles.heroActionBtn}
                  labelStyle={styles.heroActionBtnLabel}
                  textColor="#fff"
                >
                  {t('vehicles.detail.updateKilometers')}
                </Button>
                <Button
                  mode="contained-tonal"
                  compact
                  onPress={openTechnicalDetails}
                  style={styles.heroActionBtn}
                >
                  {t('vehicles.detail.editTechnicalDetails')}
                </Button>
              </View>
            ) : null}
          </AppCard>

          {!isShop ? (
            <VehicleHealthCard health={vehicleHealth} onAction={handleHealthAction} />
          ) : null}

          <FloatingCard>
            <Text style={styles.sectionTitle}>{t('vehicles.detail.vehicleInfo')}</Text>
            <View style={styles.infoGrid}>
              {!isShop
                ? heroTypeLabel
                  ? infoTile(t('vehicles.detail.vehicleType'), heroTypeLabel, {
                      onPress: openTechnicalDetails,
                      showChevron: true,
                    })
                  : infoTile(t('vehicles.detail.vehicleType'), t('vehicles.detail.vehicleTypeNotSet'), {
                      onPress: openTechnicalDetails,
                      showChevron: true,
                    })
                : null}
              {String(vehicle.vin || '').trim()
                ? infoTile('VIN', vehicle.vin, {})
                : infoTile('VIN', t('vehicles.detail.vinHint'), {})}
              {infoTile(t('vehicles.detail.completed'), String(lifetimeSummary.completedCount), {
                onPress: scrollToServiceHistorySection,
                showChevron: true,
              })}
              {infoTile(t('vehicles.detail.active'), String(lifetimeSummary.activeCount), {
                onPress: scrollToActiveRepairsSection,
                showChevron: true,
              })}
              {infoTile(
                t('vehicles.detail.lastCompleted'),
                lifetimeSummary.lastCompletedDate
                  ? new Date(lifetimeSummary.lastCompletedDate).toLocaleDateString()
                  : '—',
                {
                  onPress: openLatestCompletedRepair,
                  showChevron: true,
                }
              )}
            </View>
            <Text style={[styles.sectionTitle, { marginTop: 14, fontSize: 15 }]}>{t('vehicles.detail.lifetimeSummary')}</Text>
            <View style={styles.infoGrid}>
              <View style={styles.infoCell}>
                <Text style={styles.infoLabel}>{t('vehicles.detail.totalSpent')}</Text>
                <Text style={styles.infoValue}>{formattedLifetimeMoney.totalSpent}</Text>
              </View>
              <View style={styles.infoCell}>
                <Text style={styles.infoLabel}>{t('vehicles.detail.labor')}</Text>
                <Text style={styles.infoValue}>{formattedLifetimeMoney.totalLabor}</Text>
              </View>
              <View style={styles.infoCell}>
                <Text style={styles.infoLabel}>{t('vehicles.detail.parts')}</Text>
                <Text style={styles.infoValue}>{formattedLifetimeMoney.totalParts}</Text>
              </View>
            </View>
          </FloatingCard>

          {!isShop ? (
            <FloatingCard>
              <VehicleForecastCard
                forecast={forecast}
                loading={forecastLoading}
                expanded={forecastExpanded}
                onToggleExpanded={() => setForecastExpanded((v) => !v)}
              />
            </FloatingCard>
          ) : null}

          <OptionalVehicleGroupsReadonly vehicle={vehicle} />

          <FloatingCard>
            <View
              ref={remindersSectionRef}
              collapsable={false}
              onLayout={(e) => {
                sectionScrollYs.current.reminders = e.nativeEvent.layout.y;
              }}
            >
            <SectionHeader title={t('vehicles.detail.remindersObligations')} sectionKey="remindersObligations" />
            {sectionsExpanded.remindersObligations ? (
              <>
                <Text style={styles.sectionHint}>
                  {t('vehicles.detail.obligationsManualHint')}
                </Text>
                {vehicle?.mileage_prediction_hints?.prompt_message ? (
                  <Text style={styles.reminderOdometerPrompt}>
                    {translateMileagePredictionPrompt(vehicle.mileage_prediction_hints.prompt_message, t)}
                  </Text>
                ) : null}
                {reminderSectionRows.map((row) => {
                  const r = remindersByType[row.reminder_type];
                  const dueLine = formatVehicleReminderDueLine(r, t);
                  const uiStatus = r?.ui_status || 'pending_setup';
                  const tone = reminderUiTone(uiStatus);
                  const ctaText =
                    translateReminderCtaLabel(r?.cta_label, t) ||
                    (!dueLine && !isShop ? t('reminders.cta.add_date_set_reminder') : null);
                  return (
                    <Pressable
                      key={row.reminder_type}
                      onPress={() => {
                        if (isObligationReminderType(row.reminder_type)) {
                          navigateObligationPayment({ initialReminderType: row.reminder_type });
                          return;
                        }
                        openReminderEditor(row, r);
                      }}
                      disabled={isShop}
                      style={({ pressed }) => [
                        styles.reminderUnifiedRow,
                        pressed && !isShop ? { opacity: 0.85 } : null,
                        isShop ? styles.reminderUnifiedRowDisabled : null,
                      ]}
                    >
                      <MaterialCommunityIcons name={row.icon} size={22} color={COLORS.PRIMARY} />
                      <View style={styles.reminderUnifiedBody}>
                        <Text style={styles.reminderUnifiedTitle}>
                          {translateReminderType(row.reminder_type, t)}
                        </Text>
                        <Text style={styles.reminderUnifiedMeta} numberOfLines={2}>
                          {dueLine || t('vehicles.detail.noDateOrMileage')}
                        </Text>
                        {ctaText ? <Text style={styles.reminderUnifiedCta}>{ctaText}</Text> : null}
                        {!isShop && isObligationReminderType(row.reminder_type) ? (
                          <Button
                            mode="text"
                            compact
                            onPress={() =>
                              Alert.alert(
                                t('vehicles.detail.autoCheckLaterTitle'),
                                t('vehicles.detail.autoCheckLaterBody')
                              )
                            }
                            labelStyle={styles.reminderAutoCheckLabel}
                            style={styles.reminderAutoCheckBtn}
                          >
                            {t('vehicles.detail.tryAutoCheck')}
                          </Button>
                        ) : null}
                      </View>
                      <View style={styles.reminderUnifiedRight}>
                        <View style={[styles.reminderUnifiedPill, { backgroundColor: tone.bg }]}>
                          <Text style={[styles.reminderUnifiedPillText, { color: tone.fg }]}>
                            {translateReminderUiStatus(uiStatus, t)}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </>
            ) : null}
            </View>
          </FloatingCard>

          <View
            collapsable={false}
            onLayout={(e) => {
              sectionScrollYs.current.activeRepairs = e.nativeEvent.layout.y;
            }}
          >
            <FloatingCard>
              <Text style={styles.sectionTitle}>{t('vehicles.detail.activeRepairs')}</Text>
              <Text style={styles.sectionHint}>
                {t('vehicles.detail.activeRepairsHint')}
              </Text>
              {activeRepairsList.length ? (
                activeRepairsList.map((item) => (
                  <View key={`active-${item.id}`}>{renderActiveRepairCard(item)}</View>
                ))
              ) : (
                <Text style={styles.inlineEmptyMuted}>{t('vehicles.detail.activeRepairsEmpty')}</Text>
              )}
            </FloatingCard>
          </View>

          <View
            collapsable={false}
            onLayout={(e) => {
              sectionScrollYs.current.serviceHistory = e.nativeEvent.layout.y;
            }}
          >
            <FloatingCard>
              <SectionHeader title={t('vehicles.serviceHistory')} sectionKey="serviceHistory" />
            {sectionsExpanded.serviceHistory ? (
              serviceHistorySorted.length ? (
                serviceHistorySorted.map((item) => (
                  <View key={`hist-${item.id}`}>{renderCompletedHistoryCard(item)}</View>
                ))
              ) : (
                <Text style={styles.inlineEmptyMuted}>
                  {t('vehicles.detail.serviceHistoryEmpty')}
                </Text>
              )
            ) : (
              <Text style={styles.sectionHint}>
                {t(
                  serviceHistorySorted.length === 1
                    ? 'vehicles.detail.serviceHistoryCollapsed_one'
                    : 'vehicles.detail.serviceHistoryCollapsed_other',
                  { count: serviceHistorySorted.length }
                )}
              </Text>
            )}
            </FloatingCard>
          </View>

          {!isShop ? (
          <View
            collapsable={false}
            onLayout={(e) => {
              sectionScrollYs.current.authorizedCenters = e.nativeEvent.layout.y;
            }}
          >
          <FloatingCard>
            <SectionHeader title={t('vehicles.detail.authorizedCenters')} sectionKey="authorizedCenters" />
            {sectionsExpanded.authorizedCenters ? (
              <>
                <Text style={styles.sectionHint}>
                  {t('vehicles.detail.authorizedCentersHint', {
                    jobAccessHint: t('vehicles.detail.bookingJobAccessHint'),
                  })}
                </Text>
                {authorizedServiceCenters.length ? (
                  <View style={styles.authorizedList}>
                    {authorizedServiceCenters.map((center) => (
                      <Pressable
                        key={center.id}
                        style={({ pressed }) => [
                          styles.authorizedCard,
                          pressed && styles.authorizedCardPressed,
                        ]}
                        onPress={() => handleOpenAuthorizedCenter(center)}
                      >
                        <View style={styles.authorizedCardMain}>
                          <Text style={styles.authorizedName}>{center.name}</Text>
                          <Text style={styles.authorizedLocation}>
                            {center.location || t('vehicles.detail.locationNotSpecified')}
                          </Text>
                          <Text style={styles.authorizedAccessBadge}>{t('vehicles.detail.fullMechanicalHistory')}</Text>
                          <Text style={styles.authorizedTapHint}>{t('vehicles.detail.tapForShopProfile')}</Text>
                        </View>
                        <Button
                          mode="outlined"
                          compact
                          onPress={(e) => {
                            e?.stopPropagation?.();
                            handleRevokeAuthorizedCenter(center);
                          }}
                        >
                          {t('vehicles.detail.removeAccess')}
                        </Button>
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.sectionHint}>{t('vehicles.detail.authorizedCentersEmpty')}</Text>
                )}
                <View style={styles.quickActions}>
                  <Button mode="contained" icon="map-search" onPress={handleFindServiceCenters}>
                    {t('vehicles.detail.findServiceCenters')}
                  </Button>
                  <Button mode="outlined" icon="store-cog" onPress={handleManageServiceCenters}>
                    {t('vehicles.detail.manageServiceCenterAccess')}
                  </Button>
                  <Button
                    mode="outlined"
                    icon="shield-key"
                    onPress={() =>
                      navigation.navigate('VehicleHistoryAccess', {
                        vehicleId,
                        returnTo: 'VehicleDetail',
                      })
                    }
                  >
                    {t('vehicles.detail.vehicleHistoryAccess')}
                  </Button>
                </View>
              </>
            ) : (
              <Text style={styles.sectionHint}>
                {t(
                  authorizedServiceCenters.length === 1
                    ? 'vehicles.detail.authorizedCentersCollapsed_one'
                    : 'vehicles.detail.authorizedCentersCollapsed_other',
                  { count: authorizedServiceCenters.length }
                )}
              </Text>
            )}
          </FloatingCard>
          </View>
          ) : null}

          {vehicleDocuments.length > 0 ? (
            <FloatingCard>
              <SectionHeader
                title={t('vehicles.detail.documentsPhotos', { count: vehicleDocuments.length })}
                sectionKey="documents"
              />
              {sectionsExpanded.documents ? (
                <>
                  {renderDocumentGroup(t('vehicles.detail.documentGroupInvoices'), documentGroups.invoices)}
                  {renderDocumentGroup(
                    t('vehicles.detail.documentGroupObligations'),
                    documentGroups.obligations
                  )}
                  {renderDocumentGroup(t('vehicles.detail.documentGroupPhotos'), documentGroups.photos)}
                  {renderDocumentGroup(t('vehicles.detail.documentGroupOther'), documentGroups.other)}
                  {isShop ? (
                    <Text style={styles.sectionHint}>
                      {t('vehicles.detail.documentArchiveShopHint')}
                    </Text>
                  ) : null}
                </>
              ) : (
                <Text style={styles.sectionHint}>
                  {t(
                    vehicleDocuments.length === 1
                      ? 'vehicles.detail.documentsPhotosCollapsed'
                      : 'vehicles.detail.documentsPhotosCollapsed_plural',
                    { count: vehicleDocuments.length }
                  )}
                </Text>
              )}
            </FloatingCard>
          ) : null}
        </ScrollView>
      </View>

      {!isShop ? (
        <FAB
          icon="plus"
          label={t('vehicles.detail.addActivity')}
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          color={theme.colors.onPrimary}
          onPress={handleAddActivity}
        />
      ) : null}

      {!isShop ? (
        <MileageConfidenceSheet
          visible={mileageSheetVisible}
          onDismiss={() => setMileageSheetVisible(false)}
          mileageConfidence={mileageConfidence}
          onFactorPress={handleMileageFactorPress}
          bottomInset={insets.bottom}
        />
      ) : null}

      <Portal>
        <Modal
          visible={kmModalVisible}
          onDismiss={() => !kmSaving && setKmModalVisible(false)}
          contentContainerStyle={styles.sheetModal}
        >
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <Text style={styles.modalTitle}>{t('vehicles.detail.currentKilometers')}</Text>
            <Text style={styles.modalMuted}>
              {t('vehicles.detail.currentKilometersHint')}
            </Text>
            <TextInput
              mode="outlined"
              label={t('vehicles.detail.kilometersLabel')}
              value={kmDraft}
              onChangeText={setKmDraft}
              keyboardType="number-pad"
              style={styles.modalInput}
              placeholder={t('vehicles.detail.kilometersPlaceholder')}
            />
            <View style={styles.modalActions}>
              <Button mode="text" onPress={() => !kmSaving && setKmModalVisible(false)} disabled={kmSaving}>
                {t('common.cancel')}
              </Button>
              <Button mode="contained" onPress={saveKmOnly} loading={kmSaving} disabled={kmSaving}>
                {t('common.save')}
              </Button>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        <Modal
          visible={reminderModalVisible}
          onDismiss={() => !reminderSaving && setReminderModalVisible(false)}
          contentContainerStyle={styles.sheetModal}
        >
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <Text style={styles.modalTitle}>
              {translateReminderDueDateTitle(reminderDraft.reminder_type, t)}
            </Text>
            <ServiceRecordDatePicker
              label={t('vehicles.detail.reminderDueDateLabel')}
              valueIso={reminderDraft.due_date}
              onChangeIso={(iso) => setReminderDraft((d) => ({ ...d, due_date: iso }))}
              optional={isObligationReminderType(reminderDraft.reminder_type)}
            />
            {!isObligationReminderType(reminderDraft.reminder_type) ? (
              <TextInput
                mode="outlined"
                label={t('vehicles.detail.reminderDueKilometersLabel')}
                value={reminderDraft.due_kilometers}
                onChangeText={(val) => setReminderDraft((d) => ({ ...d, due_kilometers: val }))}
                keyboardType="number-pad"
                style={styles.modalInput}
              />
            ) : null}
            <TextInput
              mode="outlined"
              label={t('vehicles.detail.reminderNotifyDaysBefore')}
              value={reminderDraft.advance_notice_days}
              onChangeText={(val) => setReminderDraft((d) => ({ ...d, advance_notice_days: val }))}
              keyboardType="number-pad"
              style={styles.modalInput}
            />
            {!isObligationReminderType(reminderDraft.reminder_type) ? (
              <TextInput
                mode="outlined"
                label={t('vehicles.detail.reminderNotifyKmBefore')}
                value={reminderDraft.advance_notice_kilometers}
                onChangeText={(val) => setReminderDraft((d) => ({ ...d, advance_notice_kilometers: val }))}
                keyboardType="number-pad"
                style={styles.modalInput}
              />
            ) : null}
            <TextInput
              mode="outlined"
              label={t('vehicles.detail.reminderNotesOptional')}
              value={reminderDraft.source_note}
              onChangeText={(val) => setReminderDraft((d) => ({ ...d, source_note: val }))}
              style={styles.modalInput}
            />
            <View style={styles.modalActions}>
              <Button mode="text" onPress={() => !reminderSaving && setReminderModalVisible(false)} disabled={reminderSaving}>
                {t('common.cancel')}
              </Button>
              <Button mode="contained" onPress={saveReminderPatch} loading={reminderSaving} disabled={reminderSaving}>
                {t('common.save')}
              </Button>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        <Modal
          visible={addActivityModalVisible}
          onDismiss={closeAddActivityModal}
          contentContainerStyle={styles.sheetModal}
        >
          <Text style={styles.modalTitle}>{t('vehicles.detail.addActivityTitle')}</Text>
          <Text style={styles.modalMuted}>{t('vehicles.detail.addActivityBody')}</Text>
          <Button mode="contained-tonal" onPress={handleAddActivityRequestService} style={styles.addActivityBtn}>
            {t('vehicles.detail.requestService')}
          </Button>
          <Button mode="contained-tonal" onPress={handleAddActivityServiceRecord} style={styles.addActivityBtn}>
            {t('vehicles.detail.addServiceRecord')}
          </Button>
          <Button mode="contained-tonal" onPress={handleAddActivityObligation} style={styles.addActivityBtn}>
            {t('vehicles.detail.addObligationPayment')}
          </Button>
          <View style={styles.modalActions}>
            <Button mode="text" onPress={closeAddActivityModal}>
              {t('common.cancel')}
            </Button>
          </View>
        </Modal>
      </Portal>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingBottom: 96,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroCardWrap: {
    marginBottom: 14,
  },
  heroActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  heroActionBtn: {
    flexGrow: 1,
    flexBasis: '45%',
  },
  heroActionBtnLabel: {
    fontSize: 12,
  },
  sheetModal: {
    backgroundColor: 'rgba(255,255,255,0.98)',
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
    marginBottom: 8,
  },
  modalMuted: {
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
    marginBottom: 12,
  },
  modalInput: {
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  addActivityBtn: {
    marginBottom: 8,
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroIdentityPressed: {
    opacity: 0.92,
  },
  heroViewSpecsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    alignSelf: 'flex-end',
    marginTop: 4,
    gap: 2,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  heroViewSpecsPressed: {
    opacity: 0.85,
  },
  heroViewSpecsText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.92)',
    textDecorationLine: 'underline',
  },
  heroInner: {
    paddingVertical: 4,
  },
  heroIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  heroBody: {
    flex: 1,
    minHeight: 92,
    paddingRight: 4,
    paddingBottom: 6,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  heroPlate: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  heroMakeModel: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.92)',
    marginBottom: 2,
  },
  heroFirstReg: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.82)',
    marginBottom: 2,
  },
  heroVariant: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 2,
  },
  heroType: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.78)',
  },
  heroKm: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  heroConfidenceRow: {
    marginTop: 10,
    alignSelf: 'stretch',
  },
  heroConfidencePressed: {
    opacity: 0.9,
  },
  heroConfidencePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: '100%',
  },
  heroConfidencePillText: {
    fontSize: 12,
    fontWeight: '700',
    flexShrink: 1,
  },
  heroConfidenceSub: {
    marginTop: 6,
    fontSize: 11,
    lineHeight: 15,
    color: 'rgba(255,255,255,0.72)',
  },
  sectionTitle: {
    color: COLORS.TEXT_DARK,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 10,
  },
  sectionHint: {
    color: COLORS.TEXT_MUTED,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  documentGroup: {
    marginBottom: 12,
  },
  documentGroupTitle: {
    color: COLORS.TEXT_DARK,
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 6,
  },
  documentRow: {
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.08)',
    borderRadius: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 6,
  },
  documentRowTitle: {
    color: COLORS.TEXT_DARK,
    fontWeight: '600',
    fontSize: 14,
  },
  documentRowMeta: {
    color: COLORS.TEXT_MUTED,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  infoCell: {
    width: '47%',
    minWidth: 130,
    backgroundColor: 'rgba(248,250,252,0.98)',
    borderRadius: 12,
    padding: 10,
  },
  infoCellInteractive: {
    backgroundColor: 'rgba(255,255,255,0.98)',
  },
  infoCellPressed: {
    opacity: 0.9,
  },
  infoTileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  infoTileTextCol: {
    flex: 1,
    minWidth: 0,
  },
  infoTileChevron: {
    opacity: 0.38,
    marginLeft: 2,
  },
  infoLabel: {
    color: COLORS.TEXT_MUTED,
    fontSize: 12,
    marginBottom: 3,
  },
  infoValue: {
    color: COLORS.TEXT_DARK,
    fontSize: 14,
    fontWeight: '700',
  },
  repairCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderColor: 'rgba(15,23,42,0.08)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  repairCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
  },
  activeRepairCard: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.PRIMARY,
  },
  historyRepairCard: {
    borderLeftWidth: 4,
    borderLeftColor: 'rgba(16,185,129,0.55)',
  },
  completedStamp: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(16,185,129,0.15)',
    flexShrink: 0,
  },
  completedStampText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.35,
    color: '#047857',
  },
  sectionDividerSpacing: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(15,23,42,0.08)',
    marginVertical: 16,
  },
  inlineEmptyMuted: {
    color: COLORS.TEXT_MUTED,
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  repairTotalLine: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.TEXT_DARK,
  },
  repairTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
    marginBottom: 4,
  },
  repairMeta: {
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
    marginBottom: 2,
  },
  mediaChip: {
    alignSelf: 'flex-start',
    marginTop: 6,
    marginBottom: 4,
    backgroundColor: 'rgba(37,99,235,0.1)',
  },
  repairDesc: {
    fontSize: 13,
    color: '#475569',
  },
  reminderOdometerPrompt: {
    fontSize: 12,
    color: '#B45309',
    backgroundColor: 'rgba(245,158,11,0.15)',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 8,
    lineHeight: 16,
  },
  reminderUnifiedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(15,23,42,0.08)',
    gap: 10,
  },
  reminderUnifiedBody: {
    flex: 1,
    minWidth: 0,
  },
  reminderUnifiedTitle: {
    color: COLORS.TEXT_DARK,
    fontWeight: '700',
    fontSize: 14,
  },
  reminderUnifiedMeta: {
    color: COLORS.TEXT_MUTED,
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  reminderUnifiedCta: {
    color: COLORS.PRIMARY,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  reminderAutoCheckBtn: {
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  reminderAutoCheckLabel: {
    fontSize: 12,
    marginVertical: 0,
  },
  reminderUnifiedRight: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    maxWidth: '42%',
  },
  reminderUnifiedPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  reminderUnifiedPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  reminderUnifiedRowDisabled: {
    opacity: 0.72,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  placeholderChip: {
    backgroundColor: 'rgba(37,99,235,0.08)',
    borderColor: 'rgba(37,99,235,0.2)',
  },
  authorizedList: {
    gap: 8,
    marginBottom: 10,
  },
  authorizedCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderColor: 'rgba(15,23,42,0.08)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorizedCardPressed: {
    backgroundColor: 'rgba(59,130,246,0.06)',
  },
  authorizedCardMain: {
    flex: 1,
    gap: 2,
  },
  authorizedAccessBadge: {
    alignSelf: 'flex-start',
    marginTop: 6,
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
    backgroundColor: 'rgba(34,197,94,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
  },
  authorizedTapHint: {
    color: COLORS.PRIMARY,
    fontSize: 12,
    marginTop: 2,
  },
  authorizedName: {
    color: COLORS.TEXT_DARK,
    fontSize: 14,
    fontWeight: '700',
  },
  authorizedLocation: {
    color: COLORS.TEXT_MUTED,
    fontSize: 12,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
  },
});
