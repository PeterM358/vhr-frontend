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
import { updateVehicle, patchVehicleReminder } from '../api/vehicles';
import { listVehicleDocuments } from '../api/documents';
import ScreenBackground from '../components/ScreenBackground';
import { stackContentPaddingTop } from '../navigation/stackContentInset';
import AppCard from '../components/ui/AppCard';
import FloatingCard from '../components/ui/FloatingCard';
import StatusBadge from '../components/ui/StatusBadge';
import { COLORS } from '../constants/colors';
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

const BASE_VEHICLE_REMINDER_SECTION_ROWS = [
  { reminder_type: 'insurance', label: 'Insurance', icon: 'shield-check-outline' },
  { reminder_type: 'technical_inspection', label: 'Technical inspection', icon: 'clipboard-check-outline' },
  { reminder_type: 'road_tax', label: 'Road tax / annual fees', icon: 'receipt-text-outline' },
  { reminder_type: 'vignette', label: 'Vignette', icon: 'ticket-confirmation-outline' },
  { reminder_type: 'oil_service', label: 'Oil service', icon: 'engine-oil' },
  { reminder_type: 'tire_change', label: 'Tire change', icon: 'tire' },
  { reminder_type: 'battery_check', label: 'Battery check', icon: 'car-battery' },
];

const SUSPENSION_REMINDER_ROW = {
  reminder_type: 'suspension_service',
  label: 'Suspension service',
  icon: 'shock-absorber',
};

function formatVehicleReminderDueLine(reminder) {
  if (!reminder) return null;
  const parts = [];
  if (reminder.due_date) {
    const label = isoToDisplayDate(String(reminder.due_date).slice(0, 10)) || reminder.due_date;
    parts.push(`Due ${label}`);
  }
  if (reminder.due_kilometers != null && reminder.due_kilometers !== '') {
    const n = Number(reminder.due_kilometers);
    if (Number.isFinite(n)) parts.push(`Due at ${n.toLocaleString()} km`);
  }
  if (reminder.due_operating_hours != null && reminder.due_operating_hours !== '') {
    const h = Number(reminder.due_operating_hours);
    if (Number.isFinite(h)) parts.push(`Due at ${h.toLocaleString()} h`);
  }
  if (reminder.predicted_due_date && !reminder.due_date) {
    const conf = reminder.prediction_confidence ? ` · ${reminder.prediction_confidence} confidence` : '';
    const est = isoToDisplayDate(String(reminder.predicted_due_date).slice(0, 10)) || reminder.predicted_due_date;
    parts.push(`Est. calendar ${est}${conf}`);
  }
  return parts.length ? parts.join(' · ') : null;
}

function reminderUiTone(uiStatus) {
  const k = String(uiStatus || '').toLowerCase();
  if (k === 'overdue') return { bg: 'rgba(220,38,38,0.15)', fg: '#B91C1C' };
  if (k === 'due_soon') return { bg: 'rgba(245,158,11,0.2)', fg: '#B45309' };
  if (k === 'pending_setup') return { bg: 'rgba(100,116,139,0.15)', fg: '#475569' };
  if (k === 'active_until') return { bg: 'rgba(22,163,74,0.15)', fg: '#15803D' };
  if (k === 'completed') return { bg: 'rgba(22,163,74,0.15)', fg: '#15803D' };
  return { bg: 'rgba(100,116,139,0.12)', fg: '#475569' };
}

function reminderDueDateHelper(reminderType) {
  if (reminderType === 'insurance') return 'Set policy valid-until date';
  if (reminderType === 'technical_inspection') return 'Set next inspection due date';
  if (reminderType === 'vignette') return 'Set vignette valid-until date';
  if (reminderType === 'road_tax') return 'Set annual fee/tax due date';
  return 'Set due date';
}

function isObligationReminderType(reminderType) {
  return ['insurance', 'technical_inspection', 'vignette', 'road_tax'].includes(String(reminderType || '').toLowerCase());
}

export default function VehicleDetailScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { vehicleId } = route.params;
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

  const [kmModalVisible, setKmModalVisible] = useState(false);
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
  const sectionScrollYs = useRef({ activeRepairs: null, serviceHistory: null });

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
      } else {
        setVehicleDocuments([]);
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
      if (route.params?.expandReminders) {
        setSectionsExpanded((prev) => ({ ...prev, remindersObligations: true }));
        navigation.setParams({ expandReminders: undefined });
      }
      if (route.params?.expandAuthorizedCenters) {
        setSectionsExpanded((prev) => ({ ...prev, authorizedCenters: true }));
        navigation.setParams({ expandAuthorizedCenters: undefined });
      }
    }, [loadVehicleDetails, navigation, route.params?.expandReminders, route.params?.expandAuthorizedCenters])
  );

  const openTechnicalDetails = () => {
    if (!vehicle) return;
    navigation.navigate('EditVehicleDetails', { vehicleId });
  };

  const openVehicleSpecs = () => {
    navigation.navigate('VehicleSpecs', { vehicleId });
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
        Alert.alert('Validation', 'Kilometers must be a whole number.');
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
      Alert.alert('Error', e.message || 'Could not update kilometers.');
    } finally {
      setKmSaving(false);
    }
  };

  const openReminderEditor = (rowTemplate, reminderRow) => {
    if (isShop) return;
    const r = reminderRow;
    if (!r?.id) {
      Alert.alert(
        'Reminder unavailable',
        'This reminder is not loaded yet. Try again in a moment, or pull to refresh when available.'
      );
      return;
    }
    setReminderDraft({
      id: r.id,
      reminder_type: rowTemplate.reminder_type,
      label: rowTemplate.label,
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
      Alert.alert('Validation', 'Choose a valid due date.');
      return;
    }

    const dueKm = parseOptionalInt(reminderDraft.due_kilometers);
    if (dueKm === undefined) {
      Alert.alert('Validation', 'Due kilometers must be a whole number or empty.');
      return;
    }
    const advDays = parseOptionalInt(reminderDraft.advance_notice_days);
    if (advDays === undefined) {
      Alert.alert('Validation', 'Advance notice days must be a whole number or empty.');
      return;
    }
    const advKm = parseOptionalInt(reminderDraft.advance_notice_kilometers);
    if (advKm === undefined) {
      Alert.alert('Validation', 'Advance notice kilometers must be a whole number or empty.');
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
      Alert.alert('Error', e.message || 'Could not save reminder.');
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

  const scrollToServiceHistorySection = useCallback(() => {
    if (!serviceHistorySorted.length) {
      Alert.alert('No completed service', 'Completed jobs will appear in service history.');
      return;
    }
    setSectionsExpanded((prev) => ({ ...prev, serviceHistory: true }));
    requestAnimationFrame(() => {
      setTimeout(() => scrollToY(sectionScrollYs.current.serviceHistory), 80);
    });
  }, [serviceHistorySorted.length, scrollToY]);

  const scrollToActiveRepairsSection = useCallback(() => {
    if (!repairs.length) {
      Alert.alert('No repairs', 'There are no repair records on this vehicle yet.');
      return;
    }
    scrollToY(sectionScrollYs.current.activeRepairs);
  }, [repairs.length, scrollToY]);

  const openLatestCompletedRepair = useCallback(() => {
    const latest = serviceHistorySorted[0];
    if (!latest?.id) {
      Alert.alert('No completed service', 'Completed jobs will appear in service history.');
      return;
    }
    navigation.navigate('RepairDetail', { repairId: latest.id });
  }, [navigation, serviceHistorySorted]);

  useEffect(() => {
    setSectionsExpanded((prev) => ({
      ...prev,
      serviceHistory: serviceHistorySorted.length <= 3,
    }));
  }, [serviceHistorySorted.length]);

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
    const name =
      r.final_repair_type_name ||
      r.effective_repair_type_name ||
      r.repair_type_name ||
      null;
    if (name) return name;
    const desc = String(r.description || '').trim();
    if (desc) return desc.length > 56 ? `${desc.slice(0, 53)}…` : desc;
    return 'Needs classification';
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
      currency: backend.currency || 'BGN',
      lastCompletedDate: backend.last_completed_at || localLifetimeSummary.lastCompletedDate || null,
      usesBackend: true,
    };
  }, [vehicle, localLifetimeSummary]);

  const formatMinorCurrency = (minorValue, currencyCode = 'BGN') => {
    if (minorValue == null) return '—';
    const n = Number(minorValue);
    if (!Number.isFinite(n)) return '—';
    return `${(n / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currencyCode || 'BGN'}`;
  };

  const formattedLifetimeMoney = useMemo(() => {
    if (lifetimeSummary.usesBackend) {
      const cc = lifetimeSummary.currency || 'BGN';
      return {
        totalSpent: formatMinorCurrency(lifetimeSummary.totalSpentMinor, cc),
        totalLabor: formatMinorCurrency(lifetimeSummary.totalLaborMinor, cc),
        totalParts: formatMinorCurrency(lifetimeSummary.totalPartsMinor, cc),
      };
    }
    return {
      totalSpent:
        lifetimeSummary.totalSpent != null
          ? `${Number(lifetimeSummary.totalSpent).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} BGN`
          : '—',
      totalLabor:
        lifetimeSummary.totalLabor != null
          ? `${Number(lifetimeSummary.totalLabor).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} BGN`
          : '—',
      totalParts:
        lifetimeSummary.totalParts != null
          ? `${Number(lifetimeSummary.totalParts).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} BGN`
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
    const raw = String(vehicle?.vehicle_type_name ?? '').trim();
    if (!raw) return null;
    if (raw.toLowerCase() === 'vehicle') return null;
    return raw;
  }, [vehicle?.vehicle_type_name]);

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
      parts.push(`Registered ${dateDisp}`);
    } else if (yr != null && Number.isFinite(yr) && !dateRaw) {
      parts.push(`Registered ~${yr}`);
    }
    return parts.length ? parts.join(' • ') : null;
  }, [vehicle]);

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
          <StatusBadge status={item.status} />
        </View>
        <Text style={styles.repairMeta} numberOfLines={2}>
          Service provider: {formatServiceRecordProvider(item)}
        </Text>
        {item.final_kilometers != null || (item.kilometers != null && item.kilometers !== '') ? (
          <Text style={styles.repairMeta}>
            {item.final_kilometers != null ? 'Current kilometers' : 'Request kilometers'}:{' '}
            {item.final_kilometers != null
              ? Number(item.final_kilometers).toLocaleString()
              : Number(item.kilometers).toLocaleString()}
          </Text>
        ) : null}
      </View>
    </TouchableRipple>
  );

  const renderCompletedHistoryCard = (item) => {
    const currency = item.currency || 'BGN';
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
              <Text style={styles.completedStampText}>Completed</Text>
            </View>
          </View>
          <Text style={styles.repairMeta} numberOfLines={2}>
            Service provider: {formatServiceRecordProvider(item)}
          </Text>
          {mediaIndicatorLabel(item) ? (
            <Chip compact style={styles.mediaChip}>
              {mediaIndicatorLabel(item)}
            </Chip>
          ) : null}
          <Text style={styles.repairMeta}>
            Completed: {item.completed_at ? new Date(item.completed_at).toLocaleDateString() : '—'}
          </Text>
          <Text style={styles.repairMeta}>
            Kilometers: {km}
            {item.final_kilometers != null ? ' (final)' : ''}
          </Text>
          {item.total_price != null && item.total_price !== '' ? (
            <Text style={styles.repairTotalLine}>
              Total: {Number(item.total_price).toLocaleString()} {currency}
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
      Alert.alert('Add activity', 'Owners log activity from the client app.');
      return;
    }
    Alert.alert('Add activity', 'Choose what you want to add for this vehicle.', [
      {
        text: 'Request service',
        onPress: () =>
          navigation.navigate('CreateRepair', {
            vehicleId,
            mode: 'request',
            returnTo: 'VehicleDetail',
            origin: 'VehicleDetail',
          }),
      },
      {
        text: 'Add service record',
        onPress: () =>
          navigation.navigate('LogServiceRecord', {
            vehicleId,
            returnTo: 'VehicleDetail',
            origin: 'VehicleDetail',
          }),
      },
      {
        text: 'Add obligation / payment',
        onPress: () =>
          navigation.navigate('AddObligationPayment', {
            vehicleId,
            returnTo: 'VehicleDetail',
            origin: 'VehicleDetail',
          }),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const toggleSection = (key) => {
    setSectionsExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleFindServiceCenters = () => {
    if (navigation?.navigate) {
      navigation.navigate('ShopMap', { vehicleId, returnTo: 'VehicleDetail' });
      return;
    }
    Alert.alert('Notice', 'Service center discovery will open here.');
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
      Alert.alert('Error', 'Could not update authorization.');
    }
  };

  const handleRevokeAuthorizedCenter = (center) => {
    Alert.alert(
      'Remove access?',
      `${center?.name || 'This service center'} will no longer see your full vehicle history.\n\nRepairs they already performed stay visible to them in their shop records.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove access',
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
    navigation.navigate('ManageVehicleServiceCenters', {
      vehicleId: vehicle?.id ?? route.params?.vehicleId,
    });
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
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: stackContentPaddingTop(insets, 12) },
          ]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
          }
        >
          <AppCard variant="dark" contentStyle={styles.heroInner} style={styles.heroCardWrap}>
            <Pressable
              onPress={openVehicleSpecs}
              accessibilityRole="button"
              accessibilityLabel="View vehicle specs"
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
                    : 'Kilometers not set'}
                </Text>
              </View>
            </Pressable>
            <Pressable
              onPress={openVehicleSpecs}
              accessibilityRole="button"
              accessibilityLabel="View specs"
              hitSlop={{ top: 6, bottom: 6, left: 8, right: 8 }}
              style={({ pressed }) => [styles.heroViewSpecsRow, pressed ? styles.heroViewSpecsPressed : null]}
            >
              <Text style={styles.heroViewSpecsText}>View specs</Text>
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
                  Update kilometers
                </Button>
                <Button
                  mode="contained-tonal"
                  compact
                  onPress={openTechnicalDetails}
                  style={styles.heroActionBtn}
                >
                  Edit technical details
                </Button>
              </View>
            ) : null}
          </AppCard>

          <FloatingCard>
            <Text style={styles.sectionTitle}>Vehicle info</Text>
            <View style={styles.infoGrid}>
              {String(vehicle.vin || '').trim()
                ? infoTile('VIN', vehicle.vin, {})
                : infoTile('VIN', 'Add VIN for better parts and service matching.', {})}
              {infoTile('Completed', String(lifetimeSummary.completedCount), {
                onPress: scrollToServiceHistorySection,
                showChevron: true,
              })}
              {infoTile('Active', String(lifetimeSummary.activeCount), {
                onPress: scrollToActiveRepairsSection,
                showChevron: true,
              })}
              {infoTile(
                'Last completed',
                lifetimeSummary.lastCompletedDate
                  ? new Date(lifetimeSummary.lastCompletedDate).toLocaleDateString()
                  : '—',
                {
                  onPress: openLatestCompletedRepair,
                  showChevron: true,
                }
              )}
            </View>
            <Text style={[styles.sectionTitle, { marginTop: 14, fontSize: 15 }]}>Lifetime summary</Text>
            <View style={styles.infoGrid}>
              <View style={styles.infoCell}>
                <Text style={styles.infoLabel}>Total spent</Text>
                <Text style={styles.infoValue}>{formattedLifetimeMoney.totalSpent}</Text>
              </View>
              <View style={styles.infoCell}>
                <Text style={styles.infoLabel}>Labor</Text>
                <Text style={styles.infoValue}>{formattedLifetimeMoney.totalLabor}</Text>
              </View>
              <View style={styles.infoCell}>
                <Text style={styles.infoLabel}>Parts</Text>
                <Text style={styles.infoValue}>{formattedLifetimeMoney.totalParts}</Text>
              </View>
            </View>
          </FloatingCard>

          <OptionalVehicleGroupsReadonly vehicle={vehicle} />

          <FloatingCard>
            <SectionHeader title="Reminders & obligations" sectionKey="remindersObligations" />
            {sectionsExpanded.remindersObligations ? (
              <>
                <Text style={styles.sectionHint}>
                  Legal obligations can be entered manually now. Automatic checks by plate/VIN can be added later where legally available.
                </Text>
                {vehicle?.mileage_prediction_hints?.prompt_message ? (
                  <Text style={styles.reminderOdometerPrompt}>{vehicle.mileage_prediction_hints.prompt_message}</Text>
                ) : null}
                {reminderSectionRows.map((row) => {
                  const r = remindersByType[row.reminder_type];
                  const dueLine = formatVehicleReminderDueLine(r);
                  const uiStatus = r?.ui_status || 'pending_setup';
                  const uiLabel = r?.ui_status_label || 'Pending setup';
                  const tone = reminderUiTone(uiStatus);
                  const ctaText = r?.cta_label || (!dueLine && !isShop ? 'Add date · Set reminder' : null);
                  return (
                    <Pressable
                      key={row.reminder_type}
                      onPress={() => {
                        if (isObligationReminderType(row.reminder_type)) {
                          navigation.navigate('AddObligationPayment', {
                            vehicleId,
                            initialReminderType: row.reminder_type,
                            returnTo: 'VehicleDetail',
                          });
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
                        <Text style={styles.reminderUnifiedTitle}>{row.label}</Text>
                        <Text style={styles.reminderUnifiedMeta} numberOfLines={2}>
                          {dueLine || 'No date or mileage set yet.'}
                        </Text>
                        {ctaText ? <Text style={styles.reminderUnifiedCta}>{ctaText}</Text> : null}
                        {!isShop && isObligationReminderType(row.reminder_type) ? (
                          <Button
                            mode="text"
                            compact
                            onPress={() =>
                              Alert.alert(
                                'Auto-check later',
                                'Automatic checks are not enabled yet. You can enter the date manually.'
                              )
                            }
                            labelStyle={styles.reminderAutoCheckLabel}
                            style={styles.reminderAutoCheckBtn}
                          >
                            Try auto-check
                          </Button>
                        ) : null}
                      </View>
                      <View style={styles.reminderUnifiedRight}>
                        <View style={[styles.reminderUnifiedPill, { backgroundColor: tone.bg }]}>
                          <Text style={[styles.reminderUnifiedPillText, { color: tone.fg }]}>{uiLabel}</Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </>
            ) : null}
          </FloatingCard>

          <View
            collapsable={false}
            onLayout={(e) => {
              sectionScrollYs.current.activeRepairs = e.nativeEvent.layout.y;
            }}
          >
            <FloatingCard>
              <Text style={styles.sectionTitle}>Active repairs</Text>
              <Text style={styles.sectionHint}>
                Active repairs are kept separate from permanent service history.
              </Text>
              {activeRepairsList.length ? (
                activeRepairsList.map((item) => (
                  <View key={`active-${item.id}`}>{renderActiveRepairCard(item)}</View>
                ))
              ) : (
                <Text style={styles.inlineEmptyMuted}>No open or in-progress repairs on this vehicle.</Text>
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
              <SectionHeader title="Service history" sectionKey="serviceHistory" />
            {sectionsExpanded.serviceHistory ? (
              serviceHistorySorted.length ? (
                serviceHistorySorted.map((item) => (
                  <View key={`hist-${item.id}`}>{renderCompletedHistoryCard(item)}</View>
                ))
              ) : (
                <Text style={styles.inlineEmptyMuted}>
                  Completed jobs will appear here as part of your service history.
                </Text>
              )
            ) : (
              <Text style={styles.sectionHint}>
                {serviceHistorySorted.length} completed records. Expand to review details.
              </Text>
            )}
            </FloatingCard>
          </View>

          {!isShop ? (
          <FloatingCard>
            <SectionHeader title="Authorized service centers" sectionKey="authorizedCenters" />
            {sectionsExpanded.authorizedCenters ? (
              <>
                <Text style={styles.sectionHint}>
                  Authorized service centers can view this vehicle history and help maintain future service records.
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
                            {center.location || 'Location not specified'}
                          </Text>
                          <Text style={styles.authorizedTapHint}>Tap for shop profile</Text>
                        </View>
                        <Button
                          mode="outlined"
                          compact
                          onPress={(e) => {
                            e?.stopPropagation?.();
                            handleRevokeAuthorizedCenter(center);
                          }}
                        >
                          Remove access
                        </Button>
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.sectionHint}>No service centers are authorized yet.</Text>
                )}
                <View style={styles.quickActions}>
                  <Button mode="contained" icon="map-search" onPress={handleFindServiceCenters}>
                    Find service centers
                  </Button>
                  <Button mode="outlined" icon="store-cog" onPress={handleManageServiceCenters}>
                    Manage service center access
                  </Button>
                </View>
              </>
            ) : null}
          </FloatingCard>
          ) : null}

          {vehicleDocuments.length > 0 ? (
            <FloatingCard>
              <SectionHeader
                title={`Documents & photos (${vehicleDocuments.length})`}
                sectionKey="documents"
              />
              {sectionsExpanded.documents ? (
                <>
                  {renderDocumentGroup('Invoices / receipts', documentGroups.invoices)}
                  {renderDocumentGroup(
                    'Insurance / inspection / vignette',
                    documentGroups.obligations
                  )}
                  {renderDocumentGroup('Vehicle photos', documentGroups.photos)}
                  {renderDocumentGroup('Other', documentGroups.other)}
                  {isShop ? (
                    <Text style={styles.sectionHint}>
                      Document archive is visible to the vehicle owner.
                    </Text>
                  ) : null}
                </>
              ) : (
                <Text style={styles.sectionHint}>
                  {vehicleDocuments.length} file{vehicleDocuments.length === 1 ? '' : 's'} on record. Expand to
                  browse.
                </Text>
              )}
            </FloatingCard>
          ) : null}
        </ScrollView>
      </View>

      {!isShop ? (
        <FAB
          icon="plus"
          label="Add activity"
          style={[styles.fab, { backgroundColor: theme.colors.primary }]}
          color={theme.colors.onPrimary}
          onPress={handleAddActivity}
        />
      ) : null}

      <Portal>
        <Modal
          visible={kmModalVisible}
          onDismiss={() => !kmSaving && setKmModalVisible(false)}
          contentContainerStyle={styles.sheetModal}
        >
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <Text style={styles.modalTitle}>Update kilometers</Text>
            <Text style={styles.modalMuted}>
              Current:{' '}
              {vehicle.kilometers != null && vehicle.kilometers !== ''
                ? `${Number(vehicle.kilometers).toLocaleString()} km`
                : '—'}
            </Text>
            <TextInput
              mode="outlined"
              label="New kilometers"
              value={kmDraft}
              onChangeText={setKmDraft}
              keyboardType="number-pad"
              style={styles.modalInput}
            />
            <View style={styles.modalActions}>
              <Button mode="text" onPress={() => !kmSaving && setKmModalVisible(false)} disabled={kmSaving}>
                Cancel
              </Button>
              <Button mode="contained" onPress={saveKmOnly} loading={kmSaving} disabled={kmSaving}>
                Save
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
              {reminderDueDateHelper(reminderDraft.reminder_type)}
            </Text>
            <ServiceRecordDatePicker
              label="Due date"
              valueIso={reminderDraft.due_date}
              onChangeIso={(iso) => setReminderDraft((d) => ({ ...d, due_date: iso }))}
              optional={isObligationReminderType(reminderDraft.reminder_type)}
            />
            {!isObligationReminderType(reminderDraft.reminder_type) ? (
              <TextInput
                mode="outlined"
                label="Due kilometers"
                value={reminderDraft.due_kilometers}
                onChangeText={(t) => setReminderDraft((d) => ({ ...d, due_kilometers: t }))}
                keyboardType="number-pad"
                style={styles.modalInput}
              />
            ) : null}
            <TextInput
              mode="outlined"
              label="Notify days before"
              value={reminderDraft.advance_notice_days}
              onChangeText={(t) => setReminderDraft((d) => ({ ...d, advance_notice_days: t }))}
              keyboardType="number-pad"
              style={styles.modalInput}
            />
            {!isObligationReminderType(reminderDraft.reminder_type) ? (
              <TextInput
                mode="outlined"
                label="Notify km before"
                value={reminderDraft.advance_notice_kilometers}
                onChangeText={(t) => setReminderDraft((d) => ({ ...d, advance_notice_kilometers: t }))}
                keyboardType="number-pad"
                style={styles.modalInput}
              />
            ) : null}
            <TextInput
              mode="outlined"
              label="Notes (optional)"
              value={reminderDraft.source_note}
              onChangeText={(t) => setReminderDraft((d) => ({ ...d, source_note: t }))}
              style={styles.modalInput}
            />
            <View style={styles.modalActions}>
              <Button mode="text" onPress={() => !reminderSaving && setReminderModalVisible(false)} disabled={reminderSaving}>
                Cancel
              </Button>
              <Button mode="contained" onPress={saveReminderPatch} loading={reminderSaving} disabled={reminderSaving}>
                Save
              </Button>
            </View>
          </KeyboardAvoidingView>
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
