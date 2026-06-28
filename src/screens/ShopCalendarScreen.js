/**
 * Shop week calendar — plates on scheduled jobs; move proposes reschedule to owner.
 */

import React, { useCallback, useMemo, useState, useEffect, useRef, useContext } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Appbar, Badge, Button, Modal, Portal, Text, TextInput } from 'react-native-paper';
import {
  declineDirectRepairRequest,
  dismissRepairFromScheduleQueue,
  proposeRepairSchedule,
  shopConfirmVehicleArrival,
} from '../api/repairs';
import ScreenBackground from '../components/ScreenBackground';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { COLORS } from '../constants/colors';
import {
  SCHEDULE_DAY_OFFSETS,
  SCHEDULE_TIME_SLOTS,
  addCalendarDays,
  applyDayOffset,
  applyTimeSlotToDate,
  formatSchedulePreview,
  isWeb,
  mergeDateWithTime,
  parseDdMmYyyy,
} from '../utils/scheduleSlotPicker';
import { cacheUnscheduledCount } from '../utils/shopCalendarBadge';
import { fetchShopCalendarCached, invalidateShopCalendarCache } from '../utils/shopCalendarCache';
import {
  buildDailyLoadMap,
  dayLoadUsesLaborCapacity,
  formatLaborLoadChipHint,
  getDayLoadRow,
  getLaborLoadLevel,
} from '../utils/shopDayLoad';
import { formatDurationMinutes } from '../utils/laborDuration';
import { isPendingAppointmentRequest, getCalendarJobKind, calendarJobKindLabel } from '../utils/shopCalendarJob';
import { WebSocketContext } from '../context/WebSocketManager';
import { STORAGE_KEYS } from '../constants/storageKeys';

const SHOP_TOP_BAR = 'rgba(11,18,32,0.92)';
const CALENDAR_DAY_COUNT = 14;

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toApiIso(date) {
  return date.toISOString();
}

function formatDayLabel(date) {
  return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatTimeRange(startIso, endIso) {
  if (!startIso) return 'No time set';
  const start = new Date(startIso);
  const end = endIso ? new Date(endIso) : null;
  const t1 = start.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  if (!end) return t1;
  const t2 = end.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  return `${t1} – ${t2}`;
}

function dayStartLocal(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isVisitDayOrLater(startIso) {
  if (!startIso) return false;
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return false;
  return dayStartLocal(start).getTime() <= dayStartLocal(new Date()).getTime();
}

function DayLaborSummary({ loadRow }) {
  if (!dayLoadUsesLaborCapacity(loadRow)) return null;
  const booked = loadRow.bookedLaborMinutes || 0;
  const available = loadRow.availableLaborMinutes || 0;
  if (available <= 0) {
    return <Text style={styles.closedDay}>Closed</Text>;
  }
  const pct = Math.min(100, Math.round((booked / available) * 100));
  const level = getLaborLoadLevel(booked, available);
  const hint =
    formatLaborLoadChipHint(loadRow) ||
    `${formatDurationMinutes(booked)} / ${formatDurationMinutes(available)}`;
  return (
    <View style={styles.laborBarWrap}>
      <View style={styles.laborBarTrack}>
        <View
          style={[
            styles.laborBarFill,
            { width: `${pct}%` },
            level === 'busy' && styles.laborBarBusy,
            level === 'full' && styles.laborBarFull,
          ]}
        />
      </View>
      <Text
        style={[
          styles.laborBarLabel,
          level === 'busy' && styles.laborBarLabelBusy,
          level === 'full' && styles.laborBarLabelFull,
        ]}
      >
        {hint}
      </Text>
    </View>
  );
}

function groupByDay(items, rangeStart, dayCount = CALENDAR_DAY_COUNT) {
  const buckets = Array.from({ length: dayCount }, (_, i) => ({
    date: addCalendarDays(rangeStart, i),
    items: [],
  }));
  (items || []).forEach((item) => {
    const startIso = item.display_start || item.scheduled_start || item.client_preferred_start;
    if (!startIso) return;
    const d = new Date(startIso);
    const bucket = buckets.find((b) => b.date.toDateString() === d.toDateString());
    if (bucket) bucket.items.push(item);
  });
  buckets.forEach((bucket) => {
    bucket.items.sort((a, b) => {
      const aStart = new Date(a.display_start || a.scheduled_start || 0).getTime();
      const bStart = new Date(b.display_start || b.scheduled_start || 0).getTime();
      return aStart - bStart;
    });
  });
  return buckets;
}

function CompactJobCard({
  item,
  onOpen,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  loadingPrimary,
  loadingSecondary,
  secondaryDestructive,
  statusHint,
}) {
  const kind = getCalendarJobKind(item);
  const vehicle = [item.vehicle_make, item.vehicle_model].filter(Boolean).join(' ') || 'Vehicle';
  const plate = item.vehicle_license_plate;
  const timeStart = item.display_start || item.scheduled_start || item.client_preferred_start;
  const timeEnd = item.display_end || item.scheduled_end || item.client_preferred_end;
  const timeLabel =
    kind === 'needs_date' ? 'Pick a time' : formatTimeRange(timeStart, timeEnd);
  const isRequest = kind === 'client_request';

  return (
    <Pressable
      onPress={() => onOpen?.(item)}
      style={({ pressed }) => [
        styles.compactCard,
        isRequest && styles.compactCardRequest,
        pressed && { opacity: 0.92 },
      ]}
    >
      <View style={styles.compactHeader}>
        <Text style={[styles.compactTime, isRequest && styles.compactTimeRequest]}>{timeLabel}</Text>
        <View style={[styles.kindPill, isRequest ? styles.kindPillRequest : styles.kindPillBooked]}>
          <Text style={[styles.kindPillText, isRequest && styles.kindPillTextRequest]}>
            {calendarJobKindLabel(kind)}
          </Text>
        </View>
      </View>
      <Text style={styles.compactVehicle} numberOfLines={1}>
        {plate ? `${plate} · ${vehicle}` : vehicle}
      </Text>
      <Text style={styles.compactService} numberOfLines={2}>
        {item.repair_type_name || 'Repair type: not selected'}
        {item.vehicle_type_name ? ` · ${item.vehicle_type_name}` : ' · Vehicle type: not selected'}
      </Text>
      {statusHint ? <Text style={styles.compactHint}>{statusHint}</Text> : null}
      {primaryLabel || secondaryLabel ? (
        <View style={styles.compactActions}>
          {primaryLabel ? (
            <Button
              mode="contained"
              compact
              onPress={() => onPrimary?.(item)}
              loading={loadingPrimary}
              disabled={loadingPrimary}
              style={styles.compactBtn}
            >
              {primaryLabel}
            </Button>
          ) : null}
          {secondaryLabel ? (
            <Button
              mode="outlined"
              compact
              onPress={() => onSecondary?.(item)}
              loading={loadingSecondary}
              disabled={loadingSecondary}
              style={styles.compactBtn}
              textColor={secondaryDestructive ? '#B91C1C' : undefined}
            >
              {secondaryLabel}
            </Button>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

function QueueJobRow({ item, onSchedule, onDismiss, dismissing }) {
  return (
    <CompactJobCard
      item={item}
      primaryLabel="Schedule"
      onPrimary={onSchedule}
      secondaryLabel="Not now"
      onSecondary={onDismiss}
      loadingSecondary={dismissing}
      secondaryDestructive={false}
    />
  );
}

function DayJobCard({
  item,
  onOpen,
  onReschedule,
  onConfirmArrival,
  onDecline,
  confirming,
  declining,
}) {
  const kind = getCalendarJobKind(item);
  const pending = item.pending_reschedule?.status === 'pending';
  const atShop = Boolean(item.vehicle_arrived_at);
  const startIso = item.display_start || item.scheduled_start || item.client_preferred_start;
  const visitDayOrLater = isVisitDayOrLater(startIso);
  const canConfirmArrival =
    kind === 'booked'
    && !pending
    && !atShop
    && item.schedule_confirmed !== false
    && visitDayOrLater;
  const statusHint = atShop
    ? 'Vehicle at center'
    : kind === 'booked' && !pending && !visitDayOrLater
      ? 'Arrived available on visit day'
      : null;

  if (kind === 'client_request') {
    return (
      <CompactJobCard
        item={item}
        onOpen={onOpen}
        primaryLabel="Schedule visit"
        onPrimary={onReschedule}
        secondaryLabel="Decline"
        onSecondary={onDecline}
        loadingSecondary={declining === item.id}
        secondaryDestructive
        statusHint={statusHint}
      />
    );
  }

  return (
    <CompactJobCard
      item={item}
      onOpen={onOpen}
      primaryLabel={canConfirmArrival ? 'Arrived' : null}
      onPrimary={canConfirmArrival ? onConfirmArrival : null}
      loadingPrimary={confirming === item.id}
      secondaryLabel={pending ? 'Reschedule' : 'Change time'}
      onSecondary={onReschedule}
      statusHint={statusHint}
    />
  );
}

export default function ShopCalendarScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { refreshNotifications, setNotifications } = useContext(WebSocketContext);
  const backLabel = route.params?.backLabel || 'Home';
  const returnTo = route.params?.returnTo || 'ShopDashboard';

  const handleBackHome = () => {
    navigation.navigate(returnTo);
  };
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [loading, setLoading] = useState(true);
  const [calendar, setCalendar] = useState({
    scheduled: [],
    unscheduled: [],
    unscheduled_count: 0,
    daily_load: [],
  });
  const [selectedJob, setSelectedJob] = useState(null);
  const [moveDate, setMoveDate] = useState(() => applyDayOffset(new Date(), 1, new Date()));
  const [moveNote, setMoveNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [dismissingId, setDismissingId] = useState(null);
  const [confirmingArrivalId, setConfirmingArrivalId] = useState(null);
  const [selectedDayOffset, setSelectedDayOffset] = useState(1);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('09:00');
  const [customDateActive, setCustomDateActive] = useState(false);
  const [webCustomDateStr, setWebCustomDateStr] = useState('');
  const [androidPickerPhase, setAndroidPickerPhase] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [toast, setToast] = useState(null);
  const loadGenerationRef = useRef(0);

  const rangeEnd = useMemo(() => addCalendarDays(weekStart, CALENDAR_DAY_COUNT), [weekStart]);
  const dayBuckets = useMemo(
    () => groupByDay(calendar.scheduled, weekStart, CALENDAR_DAY_COUNT),
    [calendar.scheduled, weekStart]
  );
  const dailyLoadMap = useMemo(
    () => buildDailyLoadMap(calendar.daily_load),
    [calendar.daily_load]
  );
  const unscheduledCount = calendar.unscheduled_count ?? calendar.unscheduled?.length ?? 0;

  const loadCalendar = useCallback(async ({ force = false } = {}) => {
    const generation = ++loadGenerationRef.current;
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const data = await fetchShopCalendarCached(token, {
        from: toApiIso(weekStart),
        to: toApiIso(rangeEnd),
        force,
      });
      if (generation !== loadGenerationRef.current) return;
      const count = data.unscheduled_count ?? (data.unscheduled || []).length;
      setCalendar({
        scheduled: data.scheduled || [],
        unscheduled: data.unscheduled || [],
        unscheduled_count: count,
        daily_load: data.daily_load || [],
      });
      await cacheUnscheduledCount(count);
    } catch (err) {
      if (generation !== loadGenerationRef.current) return;
      console.error('Shop calendar load failed', err);
      Alert.alert('Error', err.message || 'Could not load calendar');
    } finally {
      if (generation === loadGenerationRef.current) {
        setLoading(false);
      }
    }
  }, [weekStart, rangeEnd]);

  useFocusEffect(
    useCallback(() => {
      loadCalendar();
    }, [loadCalendar])
  );

  useEffect(() => {
    const focusDate = route.params?.focusDate;
    if (focusDate) {
      const parsed = new Date(focusDate);
      if (!Number.isNaN(parsed.getTime())) {
        setWeekStart(startOfWeek(parsed));
      }
    }
  }, [route.params?.focusDate]);

  useEffect(() => {
    const focusRepairId = route.params?.focusRepairId;
    if (!focusRepairId) return;
    const job =
      calendar.scheduled?.find((row) => Number(row.id) === Number(focusRepairId)) ||
      calendar.unscheduled?.find((row) => Number(row.id) === Number(focusRepairId));
    if (!job) return;
    if (job.schedule_confirmed === false || (!job.scheduled_start && job.client_preferred_start)) {
      setSelectedJob(job);
    }
  }, [route.params?.focusRepairId, calendar.scheduled, calendar.unscheduled]);

  const resetPickerState = (baseDate) => {
    const base = baseDate || applyDayOffset(new Date(), 1, new Date());
    setMoveDate(base);
    setSelectedDayOffset(1);
    setSelectedTimeSlot('09:00');
    setCustomDateActive(false);
    setWebCustomDateStr('');
    setAndroidPickerPhase(null);
  };

  const openMoveModal = (job) => {
    const preferred = job.client_preferred_start || job.display_start;
    const base = job.scheduled_start
      ? new Date(job.scheduled_start)
      : preferred
        ? new Date(preferred)
        : applyDayOffset(new Date(), 1, new Date());
    setSelectedJob(job);
    setMoveNote('');
    resetPickerState(base);
    const timeSource = job.scheduled_start || preferred;
    if (timeSource) {
      const d = new Date(timeSource);
      setSelectedTimeSlot(
        `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
      );
      setMoveDate(d);
    }
  };

  const closeMoveModal = () => {
    setSelectedJob(null);
    setSaving(false);
    setAndroidPickerPhase(null);
  };

  const pickDayOffset = (days) => {
    setCustomDateActive(false);
    setSelectedDayOffset(days);
    const next = applyDayOffset(new Date(), days, applyTimeSlotToDate(moveDate, selectedTimeSlot));
    setMoveDate(next);
  };

  const pickTimeSlot = (slot) => {
    setSelectedTimeSlot(slot);
    setMoveDate(applyTimeSlotToDate(moveDate, slot));
  };

  const openCustomDate = () => {
    setCustomDateActive(true);
    if (isWeb) {
      setWebCustomDateStr(formatSchedulePreview(moveDate).split(',')[0] || '');
      return;
    }
    if (Platform.OS === 'android') {
      setAndroidPickerPhase('date');
    }
  };

  const applyWebCustomDate = () => {
    const parsed = parseDdMmYyyy(webCustomDateStr);
    if (!parsed) {
      Alert.alert('Invalid date', 'Use DD.MM.YYYY');
      return;
    }
    setMoveDate(mergeDateWithTime(parsed, moveDate));
    setCustomDateActive(false);
  };

  const onAndroidPickerChange = (event, picked) => {
    if (event?.type === 'dismissed') {
      setAndroidPickerPhase(null);
      return;
    }
    if (!picked) {
      setAndroidPickerPhase(null);
      return;
    }
    if (androidPickerPhase === 'date') {
      setMoveDate(mergeDateWithTime(picked, moveDate));
      setAndroidPickerPhase('time');
      return;
    }
    setMoveDate(mergeDateWithTime(moveDate, picked));
    setAndroidPickerPhase(null);
  };

  const submitMove = async () => {
    if (!selectedJob) return;
    const end = new Date(moveDate.getTime() + 2 * 60 * 60 * 1000);
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const result = await proposeRepairSchedule(token, selectedJob.id, {
        scheduledStart: toApiIso(moveDate),
        scheduledEnd: toApiIso(end),
        note: moveNote,
      });
      closeMoveModal();
      invalidateShopCalendarCache();
      await loadCalendar({ force: true });
      if (result.mode === 'proposal') {
        Alert.alert(
          'Sent to client',
          'The owner must accept or decline the new time before it is confirmed.'
        );
      } else {
        Alert.alert('Scheduled', 'Appointment time saved.');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not update schedule');
    } finally {
      setSaving(false);
    }
  };

  const confirmArrival = async (job) => {
    setConfirmingArrivalId(job.id);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      await shopConfirmVehicleArrival(token, job.id);
      invalidateShopCalendarCache();
      await loadCalendar({ force: true });
      Alert.alert('Vehicle arrived', 'Repair is now in service. The owner has been notified.');
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not confirm arrival');
    } finally {
      setConfirmingArrivalId(null);
    }
  };

  const openRepairDetail = (job) => {
    navigation.navigate('RepairDetail', {
      repairId: job.id,
      returnTo: 'ShopCalendar',
      backLabel: 'Calendar',
    });
  };

  const removeRepairFromNotifications = (repairId) => {
    if (typeof setNotifications !== 'function') return;
    setNotifications((prev) => prev.filter((row) => Number(row.repair) !== Number(repairId)));
  };

  const removeJobFromCalendarState = (repairId) => {
    setCalendar((prev) => {
      const scheduled = (prev.scheduled || []).filter((row) => Number(row.id) !== Number(repairId));
      const unscheduled = (prev.unscheduled || []).filter((row) => Number(row.id) !== Number(repairId));
      const removedFromUnscheduled = (prev.unscheduled || []).length !== unscheduled.length;
      return {
        scheduled,
        unscheduled,
        unscheduled_count: removedFromUnscheduled
          ? Math.max(0, (prev.unscheduled_count ?? unscheduled.length) - 1)
          : prev.unscheduled_count ?? unscheduled.length,
      };
    });
  };

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3200);
  };

  const closeConfirmDialog = () => setConfirmDialog(null);

  const executeDecline = async (job) => {
    setDismissingId(job.id);
    setConfirmDialog((prev) => (prev ? { ...prev, loading: true } : prev));
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      if (!token) {
        throw new Error('Not signed in');
      }
      await declineDirectRepairRequest(token, job.id);
      removeJobFromCalendarState(job.id);
      removeRepairFromNotifications(job.id);
      refreshNotifications?.();
      invalidateShopCalendarCache();
      await loadCalendar({ force: true });
      closeConfirmDialog();
      showToast('Appointment declined — owner notified.');
    } catch (err) {
      closeConfirmDialog();
      showToast(err.message || 'Could not decline request');
    } finally {
      setDismissingId(null);
    }
  };

  const promptDecline = (job) => {
    setConfirmDialog({
      title: 'Decline appointment?',
      message:
        'The owner will be notified that you cannot take this visit. The request will be removed from your calendar.',
      confirmLabel: 'Decline',
      destructive: true,
      loading: false,
      onConfirm: () => executeDecline(job),
    });
  };

  const executeDismiss = async (job) => {
    setDismissingId(job.id);
    setConfirmDialog((prev) => (prev ? { ...prev, loading: true } : prev));
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      if (!token) {
        throw new Error('Not signed in');
      }
      await dismissRepairFromScheduleQueue(token, job.id);
      removeJobFromCalendarState(job.id);
      invalidateShopCalendarCache();
      await loadCalendar({ force: true });
      closeConfirmDialog();
    } catch (err) {
      closeConfirmDialog();
      showToast(err.message || 'Could not remove from queue');
    } finally {
      setDismissingId(null);
    }
  };

  const promptDismiss = (job) => {
    setConfirmDialog({
      title: 'Remove from queue?',
      message: 'This job will leave the calendar queue. You can still find it under Repairs.',
      confirmLabel: 'Remove',
      destructive: false,
      loading: false,
      onConfirm: () => executeDismiss(job),
    });
  };

  const dismissUnscheduled = (job) => {
    if (isPendingAppointmentRequest(job)) {
      promptDecline(job);
      return;
    }
    promptDismiss(job);
  };

  const isReschedule = Boolean(selectedJob?.scheduled_start);
  const modalTitle = isReschedule ? 'Move appointment' : 'Schedule appointment';

  return (
    <ScreenBackground safeArea={false}>
      <Appbar.Header style={{ backgroundColor: SHOP_TOP_BAR }}>
        <Appbar.Action
          icon="arrow-left"
          onPress={handleBackHome}
          color="#fff"
          accessibilityLabel={`Back to ${backLabel}`}
        />
        <Appbar.Action icon="menu" onPress={() => navigation.openDrawer()} color="#fff" />
        <Appbar.Content title="Calendar" titleStyle={{ color: '#fff' }} />
        <Appbar.Action
          icon="chevron-left"
          onPress={() => setWeekStart((w) => addCalendarDays(w, -CALENDAR_DAY_COUNT))}
          color="#fff"
        />
        <Appbar.Action
          icon="chevron-right"
          onPress={() => setWeekStart((w) => addCalendarDays(w, CALENDAR_DAY_COUNT))}
          color="#fff"
        />
      </Appbar.Header>

      <View style={styles.weekLabelWrap}>
        <Text style={styles.weekLabel}>
          {formatDayLabel(weekStart)} – {formatDayLabel(addCalendarDays(weekStart, CALENDAR_DAY_COUNT - 1))}
        </Text>
        <Button compact mode="text" textColor="#fff" onPress={() => setWeekStart(startOfWeek(new Date()))}>
          Today
        </Button>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} color="#fff" />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {unscheduledCount > 0 ? (
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>No date yet</Text>
                <Badge style={styles.countBadge}>{unscheduledCount}</Badge>
              </View>
              <Text style={styles.sectionHint}>
                Open requests waiting for you to pick a day and time
              </Text>
              {calendar.unscheduled.map((job) => (
                <QueueJobRow
                  key={`u-${job.id}`}
                  item={job}
                  onSchedule={openMoveModal}
                  onDismiss={dismissUnscheduled}
                  dismissing={dismissingId === job.id}
                />
              ))}
            </View>
          ) : null}

          {dayBuckets.map((bucket) => {
            const loadRow = getDayLoadRow(dailyLoadMap, bucket.date);
            return (
            <View key={bucket.date.toISOString()} style={styles.section}>
              <Text style={styles.sectionTitle}>{formatDayLabel(bucket.date)}</Text>
              <DayLaborSummary loadRow={loadRow} />
              {bucket.items.length === 0 ? (
                <Text style={styles.emptyDay}>—</Text>
              ) : (
                bucket.items.map((job) => (
                  <DayJobCard
                    key={job.id}
                    item={job}
                    onOpen={openRepairDetail}
                    onReschedule={openMoveModal}
                    onConfirmArrival={confirmArrival}
                    onDecline={promptDecline}
                    confirming={confirmingArrivalId}
                    declining={dismissingId}
                  />
                ))
              )}
            </View>
            );
          })}
        </ScrollView>
      )}

      <Portal>
        <Modal visible={!!selectedJob} onDismiss={closeMoveModal} contentContainerStyle={styles.modal}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>{modalTitle}</Text>
            {selectedJob ? (
              <Text style={styles.modalSub}>
                {(selectedJob.vehicle_license_plate || 'Vehicle') +
                  ' · ' +
                  (selectedJob.repair_type_name || 'Service')}
              </Text>
            ) : null}

            <Text style={styles.modalLabel}>Date</Text>
            <View style={styles.chipRow}>
              {SCHEDULE_DAY_OFFSETS.map((opt) => (
                <Pressable
                  key={opt.label}
                  onPress={() => pickDayOffset(opt.days)}
                  style={[
                    styles.chip,
                    !customDateActive && selectedDayOffset === opt.days && styles.chipSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      !customDateActive && selectedDayOffset === opt.days && styles.chipTextSelected,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
              <Pressable
                onPress={openCustomDate}
                style={[styles.chip, customDateActive && styles.chipSelected]}
              >
                <Text style={[styles.chipText, customDateActive && styles.chipTextSelected]}>
                  Custom date
                </Text>
              </Pressable>
            </View>

            {Platform.OS === 'ios' && customDateActive ? (
              <DateTimePicker
                value={moveDate}
                mode="date"
                display="spinner"
                onChange={(_, d) => {
                  if (d) setMoveDate(mergeDateWithTime(d, moveDate));
                }}
              />
            ) : null}

            {isWeb && customDateActive ? (
              <View style={styles.webCustomBlock}>
                <TextInput
                  mode="outlined"
                  label="Custom date (DD.MM.YYYY)"
                  value={webCustomDateStr}
                  onChangeText={setWebCustomDateStr}
                  placeholder="12.06.2026"
                  dense
                />
                <Button mode="outlined" compact onPress={applyWebCustomDate} style={styles.webApplyBtn}>
                  Apply date
                </Button>
              </View>
            ) : null}

            {Platform.OS === 'android' && androidPickerPhase ? (
              <DateTimePicker
                value={moveDate}
                mode={androidPickerPhase}
                onChange={onAndroidPickerChange}
              />
            ) : null}

            <Text style={styles.modalLabel}>Time</Text>
            <View style={styles.chipRow}>
              {SCHEDULE_TIME_SLOTS.map((slot) => (
                <Pressable
                  key={slot}
                  onPress={() => pickTimeSlot(slot)}
                  style={[styles.chip, selectedTimeSlot === slot && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, selectedTimeSlot === slot && styles.chipTextSelected]}>
                    {slot}
                  </Text>
                </Pressable>
              ))}
            </View>

            <TextInput
              mode="outlined"
              label="Note for client (optional)"
              value={moveNote}
              onChangeText={setMoveNote}
              style={styles.noteInput}
            />

            <Text style={styles.modalPreview}>Selected: {formatSchedulePreview(moveDate)}</Text>

            <View style={styles.modalActions}>
              <Button mode="text" onPress={closeMoveModal} disabled={saving}>
                Cancel
              </Button>
              <Button mode="contained" onPress={submitMove} loading={saving} disabled={saving}>
                {isReschedule ? 'Send to client' : 'Schedule'}
              </Button>
            </View>
          </ScrollView>
        </Modal>
      </Portal>

      <ConfirmDialog
        visible={Boolean(confirmDialog)}
        title={confirmDialog?.title}
        message={confirmDialog?.message}
        confirmLabel={confirmDialog?.confirmLabel}
        destructive={confirmDialog?.destructive}
        loading={confirmDialog?.loading}
        onConfirm={confirmDialog?.onConfirm}
        onCancel={closeConfirmDialog}
      />

      {toast ? (
        <View style={styles.toastWrap} pointerEvents="none">
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      ) : null}
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  weekLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  weekLabel: { color: '#fff', fontSize: 15, fontWeight: '600' },
  loader: { marginTop: 24 },
  scroll: { paddingHorizontal: 12, paddingBottom: 24 },
  section: { marginBottom: 16 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  countBadge: { backgroundColor: '#DC2626' },
  sectionHint: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginBottom: 8 },
  emptyDay: { color: 'rgba(255,255,255,0.35)', fontSize: 12, marginBottom: 4, marginLeft: 4 },
  closedDay: { color: 'rgba(255,255,255,0.45)', fontSize: 11, marginBottom: 6, marginLeft: 4 },
  laborBarWrap: { marginBottom: 8, marginLeft: 4, marginRight: 8 },
  laborBarTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
    marginBottom: 4,
  },
  laborBarFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: 'rgba(96,165,250,0.9)',
  },
  laborBarBusy: { backgroundColor: '#f59e0b' },
  laborBarFull: { backgroundColor: '#ef4444' },
  laborBarLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 11 },
  laborBarLabelBusy: { color: '#fcd34d' },
  laborBarLabelFull: { color: '#fca5a5', fontWeight: '600' },
  compactCard: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 6,
  },
  compactCardRequest: {
    borderLeftWidth: 3,
    borderLeftColor: '#DC2626',
    backgroundColor: '#FFFBFB',
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  compactTime: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  compactTimeRequest: {
    color: '#DC2626',
  },
  kindPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  kindPillRequest: {
    backgroundColor: 'rgba(220,38,38,0.12)',
  },
  kindPillBooked: {
    backgroundColor: 'rgba(37,99,235,0.1)',
  },
  kindPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.PRIMARY,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  kindPillTextRequest: {
    color: '#B91C1C',
  },
  compactVehicle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.TEXT_DARK,
  },
  compactService: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  compactHint: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
    fontStyle: 'italic',
  },
  compactActions: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  compactBtn: {
    flex: 1,
  },
  toastWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    backgroundColor: 'rgba(15,23,42,0.92)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  toastText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  modal: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    maxHeight: '90%',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  modalSub: { fontSize: 14, color: '#64748B', marginBottom: 12 },
  modalLabel: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 8, marginTop: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  chipSelected: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: 'rgba(37,99,235,0.08)',
  },
  chipText: { fontSize: 13, color: '#334155' },
  chipTextSelected: { color: COLORS.PRIMARY, fontWeight: '600' },
  webCustomBlock: { marginBottom: 8, gap: 8 },
  webApplyBtn: { alignSelf: 'flex-start' },
  noteInput: { marginTop: 4, backgroundColor: '#fff' },
  modalPreview: { fontSize: 14, color: '#334155', marginTop: 10, fontWeight: '600' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 16, marginBottom: 8 },
});
