/**
 * PATH: src/screens/VehicleDetailScreen.js
 */

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { ActivityIndicator, StyleSheet, View, Alert, ScrollView, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
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
import ScreenBackground from '../components/ScreenBackground';
import { stackContentPaddingTop } from '../navigation/stackContentInset';
import AppCard from '../components/ui/AppCard';
import FloatingCard from '../components/ui/FloatingCard';
import StatusBadge from '../components/ui/StatusBadge';
import { COLORS } from '../constants/colors';
import OptionalVehicleGroupsReadonly from '../components/vehicle/OptionalVehicleGroupsReadonly';

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
  if (reminder.due_date) parts.push(`Due ${reminder.due_date}`);
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
    parts.push(`Est. calendar ${reminder.predicted_due_date}${conf}`);
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

function isoToDisplayDate(isoDate) {
  const raw = String(isoDate || '').trim();
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return raw;
  return `${m[3]}.${m[2]}.${m[1]}`;
}

function displayDateToIso(displayDate) {
  const raw = String(displayDate || '').trim();
  if (!raw) return null;
  const m = raw.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!m) return undefined;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  const dt = new Date(Date.UTC(year, month - 1, day));
  const valid =
    dt.getUTCFullYear() === year &&
    dt.getUTCMonth() + 1 === month &&
    dt.getUTCDate() === day;
  if (!valid) return undefined;
  return `${m[3]}-${m[2]}-${m[1]}`;
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
  const [loading, setLoading] = useState(true);
  const [isShop, setIsShop] = useState(false);
  const [sectionsExpanded, setSectionsExpanded] = useState({
    remindersObligations: false,
    serviceHistory: true,
    authorizedCenters: false,
    documents: false,
    quickActions: false,
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

  const loadVehicleDetails = useCallback(async () => {
    const token = await AsyncStorage.getItem('@access_token');
    try {
      const res = await fetch(`${API_BASE_URL}/api/vehicles/${vehicleId}/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setVehicle(data);
      setRepairs(data.repairs || []);
    } catch (err) {
      console.error('Error fetching vehicle details:', err);
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  useFocusEffect(
    useCallback(() => {
      loadVehicleDetails();
    }, [loadVehicleDetails])
  );

  const openTechnicalDetails = () => {
    if (!vehicle) return;
    navigation.navigate('EditVehicleDetails', { vehicleId });
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
      due_date: r.due_date != null ? isoToDisplayDate(String(r.due_date)) : '',
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
    const dueDate = displayDateToIso(reminderDraft.due_date);
    if (dueDate === undefined) {
      Alert.alert('Validation', 'Enter a valid date as DD.MM.YYYY.');
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

  const serviceCenterLine = (r) =>
    r.shop_profile_name || r.shop_name || r.shop_email || '—';
  const repairTypeLine = (r) =>
    r.final_repair_type_name ||
    r.effective_repair_type_name ||
    r.repair_type_name ||
    'Needs classification';
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

  const remindersByType = useMemo(() => {
    const list = Array.isArray(vehicle?.reminders) ? vehicle.reminders : [];
    const m = {};
    list.forEach((row) => {
      if (row?.reminder_type) m[row.reminder_type] = row;
    });
    return m;
  }, [vehicle?.reminders]);

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
          Service center: {serviceCenterLine(item)}
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
            Service center: {serviceCenterLine(item)}
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

  const completedCount = repairs.filter((r) => r.status === 'done').length;
  const upcomingCount = repairs.filter((r) => ['booked', 'ongoing', 'waiting_parts'].includes(r.status)).length;

  const handleAddActivity = () => {
    Alert.alert(
      'Add activity',
      'Choose what you want to add for this vehicle.',
      [
        {
          text: 'Request service',
          onPress: () =>
            navigation.navigate('CreateRepair', {
              vehicleId,
              mode: 'request_repair',
              preselectedStatus: 'open',
              returnTo: 'VehicleDetail',
              origin: 'VehicleDetail',
            }),
        },
        {
          text: 'Add service record',
          onPress: () =>
            navigation.navigate('CreateRepair', {
              vehicleId,
              mode: 'service_record',
              preselectedStatus: 'done',
              returnTo: 'VehicleDetail',
              origin: 'VehicleDetail',
            }),
        },
        // TODO(service-history): Introduce a separate "Log service record" flow/screen distinct from service-request intake.
        { text: 'Upload receipt/document (coming soon)', onPress: () => Alert.alert('Coming soon') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const toggleSection = (key) => {
    setSectionsExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleFindServiceCenters = () => {
    if (navigation?.navigate) {
      navigation.navigate('ShopMap', { vehicleId });
      return;
    }
    Alert.alert('Notice', 'Service center discovery will open here.');
  };

  const handleManageAuthorizedCenter = (center) => {
    Alert.alert(
      'Manage access',
      `Remove access / Manage for ${center?.name || 'this service center'} is coming soon.`
    );
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
        >
          <AppCard variant="dark" contentStyle={styles.heroInner} style={styles.heroCardWrap}>
            <View style={styles.heroCard}>
              <View style={styles.heroIconWrap}>
                <MaterialCommunityIcons name="car-sports" size={36} color="#fff" />
              </View>
              <View style={styles.heroBody}>
                <View style={styles.heroTopRow}>
                  <Text style={styles.heroPlate} numberOfLines={1}>
                    {vehicle.license_plate || '—'}
                  </Text>
                  {vehicle.year ? (
                    <View style={styles.heroBadge}>
                      <Text style={styles.heroBadgeText}>{vehicle.year}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.heroMakeModel} numberOfLines={2}>
                  {heroIdentity.line1}
                </Text>
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
            </View>
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
                      onPress={() => openReminderEditor(row, r)}
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
                      <View key={center.id} style={styles.authorizedCard}>
                        <View style={styles.authorizedCardMain}>
                          <Text style={styles.authorizedName}>{center.name}</Text>
                          <Text style={styles.authorizedLocation}>
                            {center.location || 'Location not specified'}
                          </Text>
                        </View>
                        <Button mode="outlined" compact onPress={() => handleManageAuthorizedCenter(center)}>
                          Remove access / Manage
                        </Button>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.sectionHint}>No service centers are authorized yet.</Text>
                )}
                <View style={styles.quickActions}>
                  <Button mode="contained" icon="map-search" onPress={handleFindServiceCenters}>
                    Find service centers
                  </Button>
                  <Button
                    mode="text"
                    icon="plus-circle-outline"
                    onPress={() => Alert.alert('Coming soon', 'Add service center manually (coming soon)')}
                  >
                    Add service center manually (coming soon)
                  </Button>
                </View>
              </>
            ) : null}
          </FloatingCard>

          <FloatingCard>
            <SectionHeader title="Documents & photos" sectionKey="documents" />
            {sectionsExpanded.documents ? (
              <>
                <Text style={styles.sectionHint}>
                  Vehicle documents such as insurance, inspection papers, invoices and receipts will appear here.
                </Text>
                <View style={styles.chipsWrap}>
                  <Chip compact style={styles.placeholderChip}>Invoices</Chip>
                  <Chip compact style={styles.placeholderChip}>Inspection docs</Chip>
                  <Chip compact style={styles.placeholderChip}>Insurance papers</Chip>
                  <Chip compact style={styles.placeholderChip}>Vehicle photos</Chip>
                </View>
              </>
            ) : null}
          </FloatingCard>

          <FloatingCard>
            <SectionHeader title="Quick actions" sectionKey="quickActions" />
            {sectionsExpanded.quickActions ? (
              <>
                <View style={styles.quickActions}>
                  <Button mode="contained" icon="plus" onPress={handleAddActivity}>
                    Add activity
                  </Button>
                  <Button
                    mode="outlined"
                    icon="history"
                    onPress={() =>
                      navigation.navigate('ClientRepairs', {
                        vehicleId,
                        fromVehicleDetail: true,
                      })
                    }
                  >
                    Vehicle history
                  </Button>
                  <Button
                    mode="text"
                    icon="calendar-clock"
                    onPress={() =>
                      Alert.alert(
                        'Coming soon',
                        'Scheduling and reminder management will be added in future iterations.'
                      )
                    }
                  >
                    Reminders center (soon)
                  </Button>
                </View>
                <View style={styles.kpiRow}>
                  <Chip compact style={styles.kpiChip}>Repairs: {repairs.length}</Chip>
                  <Chip compact style={styles.kpiChip}>Upcoming: {upcomingCount}</Chip>
                  <Chip compact style={styles.kpiChip}>Done: {completedCount}</Chip>
                </View>
              </>
            ) : null}
          </FloatingCard>
        </ScrollView>
      </View>

      <FAB
        icon="plus"
        label="Add activity"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color={theme.colors.onPrimary}
        onPress={handleAddActivity}
      />

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
            <Text style={styles.modalMuted}>Date format: DD.MM.YYYY</Text>
            <TextInput
              mode="outlined"
              label="Due date"
              value={reminderDraft.due_date}
              onChangeText={(t) => setReminderDraft((d) => ({ ...d, due_date: t }))}
              placeholder="DD.MM.YYYY"
              style={styles.modalInput}
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
  heroBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.14)',
    marginLeft: 8,
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  heroMakeModel: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.92)',
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
  },
  authorizedCardMain: {
    gap: 2,
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
  quickActions: {
    gap: 10,
    marginBottom: 12,
  },
  kpiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  kpiChip: {
    backgroundColor: 'rgba(15,23,42,0.08)',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
  },
});
