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
import { Badge, Button, Modal, Portal, Text, TextInput } from 'react-native-paper';
import PartnerAppHeader from '../components/partner/PartnerAppHeader';
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
  dayOffsetFromAnchor,
  dayOffsetFromToday,
  dayStart,
  ensurePickupAfterBring,
  formatCustomDateInput,
  formatSchedulePreview,
  isWeb,
  mergeDateWithTime,
  parseDdMmYyyy,
} from '../utils/scheduleSlotPicker';
import { cacheUnscheduledCount } from '../utils/shopCalendarBadge';
import { fetchShopCalendarCached, invalidateShopCalendarCache } from '../utils/shopCalendarCache';
import { navigateToShopDashboard } from '../navigation/drawerNavigation';
import { navigateToRepairDetail } from '../navigation/webNavigation';
import { normalizeReturnToRoute } from '../utils/partnerNavChrome';
import {
  buildDailyLoadMap,
  dayLoadUsesLaborCapacity,
  getDayLoadRow,
  getLaborLoadLevel,
} from '../utils/shopDayLoad';
import { formatDurationMinutes } from '../utils/laborDuration';
import {
  assignShopBayNumbers,
  getBayAccent,
  getCalendarJobKind,
  getOccupancyRoleForDay,
  isPendingAppointmentRequest,
  isPendingReschedule,
} from '../utils/shopCalendarJob';
import { WebSocketContext } from '../context/WebSocketManager';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { useTranslation } from '../i18n';
import { isCalendarNotification } from '../utils/shopNotificationRouting';
import { normalizeNotification } from '../utils/normalizeNotification';
import {
  sameCalendarDay,
  scheduleModalStatusKey,
} from '../utils/shopCalendarScheduleModal';

const CALENDAR_DAY_COUNT = 14;
/** Backup poll; realtime accepts refresh via WS calendar notifications. */
const CALENDAR_POLL_MS = 30_000;

function localeTag(locale) {
  const key = String(locale || '').trim().toLowerCase();
  if (!key) return undefined;
  if (key === 'bg') return 'bg-BG';
  if (key === 'en') return 'en-GB';
  return key;
}

function formatDayLabel(date, locale) {
  return date.toLocaleDateString(localeTag(locale), { weekday: 'short', day: 'numeric', month: 'short' });
}

function formatTimeRange(startIso, endIso, locale, t) {
  if (!startIso) return t('partnerDashboard.calendar.noTimeSet');
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return t('partnerDashboard.calendar.noTimeSet');
  const end = endIso ? new Date(endIso) : null;
  const timeLocale = localeTag(locale);
  const t1 = start.toLocaleTimeString(timeLocale, { hour: '2-digit', minute: '2-digit' });
  if (!end || Number.isNaN(end.getTime())) return t1;
  const t2 = end.toLocaleTimeString(timeLocale, { hour: '2-digit', minute: '2-digit' });
  return `${t1} – ${t2}`;
}

function localizedLaborLoadChipHint(row, t) {
  if (!dayLoadUsesLaborCapacity(row)) return null;
  const booked = row.bookedLaborMinutes || 0;
  const remaining = row.remainingLaborMinutes;
  if (booked <= 0 && remaining != null) {
    return t('partnerDashboard.calendar.load.free', {
      duration: formatDurationMinutes(remaining),
    });
  }
  if (remaining != null) {
    return t('partnerDashboard.calendar.load.left', {
      booked: formatDurationMinutes(booked),
      remaining: formatDurationMinutes(remaining),
    });
  }
  if (booked > 0) return formatDurationMinutes(booked);
  return null;
}

function jobKindLabel(kind, t) {
  return t(`partnerDashboard.calendar.jobKinds.${kind}`, null, kind);
}

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

function timeSlotFromDate(d) {
  if (!d || Number.isNaN(d.getTime())) return '09:00';
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function defaultPickupFromBring(bring, durationMs = 2 * 60 * 60 * 1000) {
  if (!bring || Number.isNaN(bring.getTime())) {
    return applyDayOffset(new Date(), 1, new Date());
  }
  return ensurePickupAfterBring(bring, new Date(bring.getTime() + durationMs));
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

function DayLaborSummary({ loadRow, t }) {
  if (!dayLoadUsesLaborCapacity(loadRow)) return null;
  const booked = loadRow.bookedLaborMinutes || 0;
  const available = loadRow.availableLaborMinutes || 0;
  if (available <= 0) {
    return <Text style={styles.closedDay}>{t('partnerDashboard.calendar.closed')}</Text>;
  }
  const pct = Math.min(100, Math.round((booked / available) * 100));
  const level = getLaborLoadLevel(booked, available);
  const hint =
    localizedLaborLoadChipHint(loadRow, t) ||
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
  const rangeStartDay = dayStart(rangeStart);
  const rangeEndDay = dayStart(addCalendarDays(rangeStart, dayCount - 1));
  (items || []).forEach((item) => {
    const startIso = item.display_start || item.scheduled_start || item.client_preferred_start;
    if (!startIso) return;
    const startDay = dayStart(new Date(startIso));
    if (Number.isNaN(startDay.getTime())) return;
    // Null / missing scheduled_end → same-day occupancy (do not crash or hang).
    const endIso = item.display_end || item.scheduled_end || item.client_preferred_end || startIso;
    let endDay = dayStart(new Date(endIso));
    if (Number.isNaN(endDay.getTime()) || endDay < startDay) {
      endDay = startDay;
    }
    // Skip jobs that cannot intersect the visible range.
    if (endDay < rangeStartDay || startDay > rangeEndDay) return;
    buckets.forEach((bucket) => {
      const bucketDay = dayStart(bucket.date);
      if (bucketDay >= startDay && bucketDay <= endDay) {
        bucket.items.push(item);
      }
    });
  });
  buckets.forEach((bucket) => {
    bucket.items.sort((a, b) => {
      const aStart = new Date(a.display_start || a.scheduled_start || a.client_preferred_start || 0).getTime();
      const bStart = new Date(b.display_start || b.scheduled_start || b.client_preferred_start || 0).getTime();
      return aStart - bStart;
    });
  });
  return buckets;
}

function BayChip({ bayNumber, t }) {
  if (!bayNumber) return null;
  const accent = getBayAccent(bayNumber);
  return (
    <View style={[styles.bayChip, { backgroundColor: accent.bg, borderColor: accent.border }]}>
      <Text style={[styles.bayChipText, { color: accent.text }]}>
        {t('partnerDashboard.calendar.occupancy.bay', { n: bayNumber })}
      </Text>
    </View>
  );
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
  occupancyRole = null,
  bayNumber = null,
  t,
  locale,
}) {
  const kind = getCalendarJobKind(item);
  const pending = isPendingReschedule(item);
  const vehicle = [item.vehicle_make, item.vehicle_model].filter(Boolean).join(' ') || t('partnerDashboard.calendar.vehicleFallback');
  const plate = item.vehicle_license_plate;
  const timeStart = item.display_start || item.scheduled_start || item.client_preferred_start;
  const timeEnd = item.display_end || item.scheduled_end || item.client_preferred_end;
  const isRequest = kind === 'client_request';
  const isStay = occupancyRole === 'stay';
  const isReadyDay = occupancyRole === 'ready';
  const isBringDay = occupancyRole === 'bring';
  const isMultiDay = isStay || isReadyDay || isBringDay;
  const showBay = Boolean(bayNumber) && isMultiDay;
  const bayAccent = showBay ? getBayAccent(bayNumber) : null;

  // Middle days: compact identity row (bay + plate), not a full duplicate card.
  if (isStay) {
    const plateLabel = plate || vehicle;
    const serviceShort = item.repair_type_name;
    return (
      <Pressable
        onPress={() => onOpen?.(item)}
        style={({ pressed }) => [
          styles.stayRow,
          bayAccent && {
            borderLeftColor: bayAccent.border,
            backgroundColor: bayAccent.bg,
          },
          pressed && { opacity: 0.92 },
        ]}
      >
        <BayChip bayNumber={bayNumber} t={t} />
        <Text style={styles.stayRowText} numberOfLines={1}>
          {plateLabel}
          {serviceShort ? ` · ${serviceShort}` : ''}
        </Text>
      </Pressable>
    );
  }

  let timeLabel;
  if (kind === 'needs_date') {
    timeLabel = t('partnerDashboard.calendar.pickTime');
  } else if (isReadyDay) {
    timeLabel = formatTimeRange(timeEnd || timeStart, null, locale, t);
  } else if (isBringDay) {
    timeLabel = formatTimeRange(timeStart, null, locale, t);
  } else {
    timeLabel = formatTimeRange(timeStart, timeEnd, locale, t);
  }

  let badgeKind = kind;
  let badgeLabel = jobKindLabel(kind, t);
  if (isRequest) {
    badgeKind = 'client_request';
    badgeLabel = jobKindLabel('client_request', t);
  } else if (isReadyDay) {
    badgeKind = 'ready';
    badgeLabel = t('partnerDashboard.calendar.occupancy.pickup');
  } else if (pending) {
    badgeKind = 'pending_confirm';
    badgeLabel = jobKindLabel('pending_confirm', t);
  } else if (isBringDay) {
    badgeKind = 'booked';
    badgeLabel = t('partnerDashboard.calendar.occupancy.comeIn');
  }

  // Bay chip is the shared multi-day identity; drop the old prose hint when present.
  const occupancyHint =
    isMultiDay && !showBay
      ? t('partnerDashboard.calendar.occupancy.multiDayHint')
      : null;

  const cardBody = (
    <>
      <View style={styles.compactHeader}>
        <View style={styles.compactHeaderLeft}>
          {showBay ? <BayChip bayNumber={bayNumber} t={t} /> : null}
          <Text
            style={[
              styles.compactTime,
              isRequest && styles.compactTimeRequest,
              pending && !showBay && styles.compactTimePending,
            ]}
          >
            {timeLabel}
          </Text>
        </View>
        <View
          style={[
            styles.kindPill,
            badgeKind === 'client_request' && styles.kindPillRequest,
            badgeKind === 'ready' && styles.kindPillReady,
            badgeKind === 'pending_confirm' && styles.kindPillPending,
            badgeKind === 'booked' && styles.kindPillBooked,
          ]}
        >
          <Text
            style={[
              styles.kindPillText,
              badgeKind === 'client_request' && styles.kindPillTextRequest,
              badgeKind === 'ready' && styles.kindPillTextReady,
              badgeKind === 'pending_confirm' && styles.kindPillTextPending,
            ]}
          >
            {badgeLabel}
          </Text>
        </View>
      </View>
      <Text style={styles.compactVehicle} numberOfLines={1}>
        {plate ? `${plate} · ${vehicle}` : vehicle}
      </Text>
      {!isReadyDay ? (
        <Text style={styles.compactService} numberOfLines={2}>
          {item.repair_type_name || t('partnerDashboard.calendar.repairTypeMissing')}
          {item.vehicle_type_name ? ` · ${item.vehicle_type_name}` : ` · ${t('partnerDashboard.calendar.vehicleTypeMissing')}`}
        </Text>
      ) : null}
      {occupancyHint ? <Text style={styles.compactHint}>{occupancyHint}</Text> : null}
      {statusHint ? <Text style={styles.compactHint}>{statusHint}</Text> : null}
    </>
  );

  const actionRow =
    primaryLabel || secondaryLabel ? (
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
    ) : null;

  // Keep Arrived / Change time outside Pressable so web clicks do not open Booking detail.
  if (actionRow) {
    return (
      <View
        style={[
          styles.compactCard,
          isRequest && styles.compactCardRequest,
          bayAccent && {
            borderLeftWidth: 3,
            borderLeftColor: bayAccent.border,
          },
          !bayAccent && pending && styles.compactCardPending,
        ]}
      >
        <Pressable onPress={() => onOpen?.(item)} style={({ pressed }) => [pressed && { opacity: 0.92 }]}>
          {cardBody}
        </Pressable>
        {actionRow}
      </View>
    );
  }

  return (
    <Pressable
      onPress={() => onOpen?.(item)}
      style={({ pressed }) => [
        styles.compactCard,
        isRequest && styles.compactCardRequest,
        bayAccent && {
          borderLeftWidth: 3,
          borderLeftColor: bayAccent.border,
        },
        !bayAccent && pending && styles.compactCardPending,
        pressed && { opacity: 0.92 },
      ]}
    >
      {cardBody}
    </Pressable>
  );
}

function QueueJobRow({ item, onSchedule, onDismiss, dismissing, t, locale }) {
  return (
    <CompactJobCard
      item={item}
      primaryLabel={t('partnerDashboard.calendar.schedule')}
      onPrimary={onSchedule}
      secondaryLabel={t('partnerDashboard.calendar.notNow')}
      onSecondary={onDismiss}
      loadingSecondary={dismissing}
      secondaryDestructive={false}
      t={t}
      locale={locale}
    />
  );
}

function DayJobCard({
  item,
  dayDate,
  onOpen,
  onReschedule,
  onConfirmArrival,
  onDecline,
  confirming,
  declining,
  bayNumber = null,
  t,
  locale,
}) {
  const kind = getCalendarJobKind(item);
  const pending = isPendingReschedule(item);
  const occupancyRole = getOccupancyRoleForDay(item, dayDate) || 'single';
  const atShop = Boolean(item.vehicle_arrived_at);
  const startIso = item.display_start || item.scheduled_start || item.client_preferred_start;
  const visitDayOrLater = isVisitDayOrLater(startIso);
  const cardDayIsToday =
    Boolean(dayDate) && dayStartLocal(dayDate).getTime() === dayStartLocal(new Date()).getTime();
  // Arrived only on bring/single visit-day card for today (same API as RepairDetail).
  const canConfirmArrival =
    (occupancyRole === 'single' || occupancyRole === 'bring')
    && kind === 'booked'
    && !pending
    && !atShop
    && item.schedule_confirmed !== false
    && Boolean(item.scheduled_start || item.display_start)
    && visitDayOrLater
    && cardDayIsToday;
  const statusHint = atShop
    ? t('partnerDashboard.calendar.vehicleAtCenter')
    : (occupancyRole === 'single' || occupancyRole === 'bring')
      && kind === 'booked'
      && !pending
      && !visitDayOrLater
      ? t('partnerDashboard.calendar.arrivalOnVisitDay')
      : null;

  if (kind === 'client_request') {
    return (
      <CompactJobCard
        item={item}
        occupancyRole={occupancyRole}
        bayNumber={bayNumber}
        onOpen={onOpen}
        primaryLabel={t('partnerDashboard.calendar.scheduleVisit')}
        onPrimary={onReschedule}
        secondaryLabel={t('partnerDashboard.calendar.decline')}
        onSecondary={onDecline}
        loadingSecondary={declining === item.id}
        secondaryDestructive
        statusHint={statusHint}
        t={t}
        locale={locale}
      />
    );
  }

  const showActions = occupancyRole !== 'stay';

  return (
    <CompactJobCard
      item={item}
      occupancyRole={occupancyRole}
      bayNumber={bayNumber}
      onOpen={onOpen}
      primaryLabel={showActions && canConfirmArrival ? t('partnerDashboard.calendar.arrived') : null}
      onPrimary={showActions && canConfirmArrival ? onConfirmArrival : null}
      loadingPrimary={confirming === item.id}
      secondaryLabel={
        showActions
          ? (pending ? t('partnerDashboard.calendar.reschedule') : t('partnerDashboard.calendar.changeTime'))
          : null
      }
      onSecondary={showActions ? onReschedule : null}
      statusHint={statusHint}
      t={t}
      locale={locale}
    />
  );
}

export default function ShopCalendarScreen() {
  const { t, locale } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute();
  const { refreshNotifications, setNotifications, notifications } = useContext(WebSocketContext);
  const backLabel = route.params?.backLabel || t('common.home');
  const returnTo = normalizeReturnToRoute(route.params?.returnTo) || 'ShopDashboard';

  const handleBackHome = () => {
    if (returnTo === 'ShopDashboard') {
      navigateToShopDashboard(navigation);
      return;
    }
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
  const [bringDate, setBringDate] = useState(() => applyDayOffset(new Date(), 1, new Date()));
  const [pickupDate, setPickupDate] = useState(() => defaultPickupFromBring(applyDayOffset(new Date(), 1, new Date())));
  const [moveNote, setMoveNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [dismissingId, setDismissingId] = useState(null);
  const [confirmingArrivalId, setConfirmingArrivalId] = useState(null);
  const [bringDayOffset, setBringDayOffset] = useState(1);
  const [bringTimeSlot, setBringTimeSlot] = useState('09:00');
  const [bringCustomDateActive, setBringCustomDateActive] = useState(false);
  const [webBringCustomDateStr, setWebBringCustomDateStr] = useState('');
  const [pickupDayOffset, setPickupDayOffset] = useState(0);
  const [pickupTimeSlot, setPickupTimeSlot] = useState('11:00');
  const [pickupCustomDateActive, setPickupCustomDateActive] = useState(false);
  const [webPickupCustomDateStr, setWebPickupCustomDateStr] = useState('');
  const [androidPickerTarget, setAndroidPickerTarget] = useState(null); // 'bring' | 'pickup'
  const [androidPickerPhase, setAndroidPickerPhase] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [toast, setToast] = useState(null);
  const loadGenerationRef = useRef(0);
  const lastCalendarNotifRef = useRef(null);
  const mountedRef = useRef(true);
  const loadCalendarRef = useRef(null);
  /** repairId → statusKey dismissed for this screen session (Cancel). */
  const sessionDismissedFocusRef = useRef(new Map());
  const consumedDeepLinkRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const pickupDayOffsets = useMemo(
    () => [
      { label: t('partnerDashboard.createOffer.pickupSameDay'), days: 0 },
      { label: t('partnerDashboard.createOffer.pickupPlus1Day'), days: 1 },
      { label: t('partnerDashboard.createOffer.pickupPlus2Days'), days: 2 },
      { label: t('partnerDashboard.createOffer.pickupPlus3Days'), days: 3 },
      { label: t('partnerDashboard.createOffer.pickupPlus1Week'), days: 7 },
    ],
    [t]
  );

  const rangeEnd = useMemo(() => addCalendarDays(weekStart, CALENDAR_DAY_COUNT), [weekStart]);
  const dayBuckets = useMemo(
    () => groupByDay(calendar.scheduled, weekStart, CALENDAR_DAY_COUNT),
    [calendar.scheduled, weekStart]
  );
  const bayByJobId = useMemo(
    () => assignShopBayNumbers(calendar.scheduled),
    [calendar.scheduled]
  );
  const dailyLoadMap = useMemo(
    () => buildDailyLoadMap(calendar.daily_load),
    [calendar.daily_load]
  );
  const unscheduledCount = calendar.unscheduled_count ?? calendar.unscheduled?.length ?? 0;

  const loadCalendar = useCallback(async ({ force = false, quiet = false } = {}) => {
    const generation = ++loadGenerationRef.current;
    if (!quiet && mountedRef.current) setLoading(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const data = await fetchShopCalendarCached(token, {
        from: toApiIso(weekStart),
        to: toApiIso(rangeEnd),
        force,
      });
      if (generation !== loadGenerationRef.current || !mountedRef.current) return;
      const count = data.unscheduled_count ?? (data.unscheduled || []).length;
      setCalendar({
        scheduled: data.scheduled || [],
        unscheduled: data.unscheduled || [],
        unscheduled_count: count,
        daily_load: data.daily_load || [],
      });
      await cacheUnscheduledCount(count);
    } catch (err) {
      if (generation !== loadGenerationRef.current || !mountedRef.current) return;
      console.error('Shop calendar load failed', err);
      // Quiet polls must not block or alert — initial paint already has a spinner path.
      if (!quiet) {
        Alert.alert(t('common.error'), err.message || t('partnerDashboard.calendar.loadError'));
      }
    } finally {
      // Always clear loading for the latest generation. Quiet polls never set loading
      // true, but they can supersede an in-flight initial fetch — skipping clear here
      // left the spinner up until week arrows remounted a non-quiet load.
      if (generation === loadGenerationRef.current && mountedRef.current) {
        setLoading(false);
      }
    }
  }, [weekStart, rangeEnd, t]);

  loadCalendarRef.current = loadCalendar;

  useFocusEffect(
    useCallback(() => {
      // Stable focus subscription — avoid re-subscribing when loadCalendar identity changes
      // (weekStart/t), which previously stacked force fetches into a request storm.
      loadCalendarRef.current?.({ force: true });
      const pollId = setInterval(() => {
        // Quiet backup poll uses cache TTL (no invalidate) so in-flight requests dedupe.
        loadCalendarRef.current?.({ force: false, quiet: true });
      }, CALENDAR_POLL_MS);
      return () => clearInterval(pollId);
    }, [])
  );

  useEffect(() => {
    if (!Array.isArray(notifications) || notifications.length === 0) return;
    const newest = normalizeNotification(notifications[0]);
    if (!newest?.id || !isCalendarNotification(newest)) return;
    if (lastCalendarNotifRef.current === newest.id) return;
    const prevId = lastCalendarNotifRef.current;
    lastCalendarNotifRef.current = newest.id;
    // Seed on first observation so an existing calendar notif does not race the
    // focus load with a quiet refetch (which previously stuck loading forever).
    if (prevId == null) return;
    // Client accept / schedule updates: refresh immediately (WS path).
    invalidateShopCalendarCache();
    loadCalendarRef.current?.({ force: true, quiet: true });
  }, [notifications]);

  // Apply deep-link focusDate once; clear sticky focusRepairId so drawer re-opens
  // do not keep forcing the schedule modal (React Navigation merges params).
  useEffect(() => {
    const focusRepairId = route.params?.focusRepairId;
    const focusDate = route.params?.focusDate;
    if (focusRepairId == null && !focusDate) return;

    const token = `${focusRepairId ?? ''}|${focusDate ?? ''}`;
    if (consumedDeepLinkRef.current === token) return;
    consumedDeepLinkRef.current = token;

    if (focusDate) {
      const parsed = new Date(focusDate);
      if (!Number.isNaN(parsed.getTime())) {
        const next = startOfWeek(parsed);
        setWeekStart((prev) => (sameCalendarDay(prev, next) ? prev : next));
      }
    }

    navigation.setParams({ focusRepairId: undefined, focusDate: undefined });
  }, [route.params?.focusRepairId, route.params?.focusDate, navigation]);

  const syncBringPickerMeta = (nextBring) => {
    const offset = dayOffsetFromToday(nextBring);
    const matchesQuick = SCHEDULE_DAY_OFFSETS.some((opt) => opt.days === offset);
    setBringDayOffset(matchesQuick ? offset : null);
    setBringCustomDateActive(!matchesQuick);
    setBringTimeSlot(timeSlotFromDate(nextBring));
    setWebBringCustomDateStr(matchesQuick ? '' : formatCustomDateInput(nextBring));
  };

  const syncPickupPickerMeta = (nextPickup, bring) => {
    const offset = dayOffsetFromAnchor(bring, nextPickup);
    const matchesQuick = pickupDayOffsets.some((opt) => opt.days === offset);
    setPickupDayOffset(matchesQuick ? offset : null);
    setPickupCustomDateActive(Boolean(nextPickup) && !matchesQuick);
    setPickupTimeSlot(timeSlotFromDate(nextPickup));
    setWebPickupCustomDateStr(matchesQuick ? '' : formatCustomDateInput(nextPickup));
  };

  const applyBringChange = (nextBring, { preservePickup = true } = {}) => {
    const candidate =
      preservePickup && pickupDate && !Number.isNaN(pickupDate.getTime())
        ? pickupDate
        : defaultPickupFromBring(nextBring);
    const safePickup = ensurePickupAfterBring(nextBring, candidate);
    setBringDate(nextBring);
    syncBringPickerMeta(nextBring);
    setPickupDate(safePickup);
    syncPickupPickerMeta(safePickup, nextBring);
  };

  const applyPickupChange = (nextPickup) => {
    const safePickup = ensurePickupAfterBring(bringDate, nextPickup);
    if (safePickup.getTime() <= bringDate.getTime()) {
      Alert.alert(
        t('partnerDashboard.calendar.invalidDateTitle'),
        t('partnerDashboard.createOffer.pickupAfterBringBody')
      );
      return;
    }
    setPickupDate(safePickup);
    syncPickupPickerMeta(safePickup, bringDate);
  };

  const openMoveModal = (job) => {
    const preferred = job.client_preferred_start || job.display_start;
    const preferredEnd = job.client_preferred_end || job.display_end;
    const baseBring = job.scheduled_start
      ? new Date(job.scheduled_start)
      : preferred
        ? new Date(preferred)
        : applyDayOffset(new Date(), 1, new Date());
    let durationMs = 2 * 60 * 60 * 1000;
    const endSource = job.scheduled_end || preferredEnd;
    if (endSource) {
      const end = new Date(endSource);
      if (!Number.isNaN(end.getTime()) && end.getTime() > baseBring.getTime()) {
        durationMs = end.getTime() - baseBring.getTime();
      }
    }
    const basePickup = endSource
      ? ensurePickupAfterBring(baseBring, new Date(endSource))
      : defaultPickupFromBring(baseBring, durationMs);

    setSelectedJob(job);
    setMoveNote('');
    setAndroidPickerTarget(null);
    setAndroidPickerPhase(null);
    setBringDate(baseBring);
    syncBringPickerMeta(baseBring);
    setPickupDate(basePickup);
    syncPickupPickerMeta(basePickup, baseBring);
  };

  const closeMoveModal = () => {
    // Session dismiss: Cancel must not re-force the modal for this job status.
    if (selectedJob?.id != null) {
      const statusKey = scheduleModalStatusKey(selectedJob);
      if (statusKey) {
        sessionDismissedFocusRef.current.set(Number(selectedJob.id), statusKey);
      }
    }
    if (route.params?.focusRepairId != null) {
      navigation.setParams({ focusRepairId: undefined });
    }
    setSelectedJob(null);
    setSaving(false);
    setAndroidPickerTarget(null);
    setAndroidPickerPhase(null);
  };

  const pickBringDayOffset = (days) => {
    const next = applyDayOffset(new Date(), days, bringDate);
    applyBringChange(next);
  };

  const pickBringTimeSlot = (slot) => {
    applyBringChange(applyTimeSlotToDate(bringDate, slot));
  };

  const openBringCustomDate = () => {
    setBringCustomDateActive(true);
    setBringDayOffset(null);
    if (isWeb) {
      setWebBringCustomDateStr(formatCustomDateInput(bringDate));
      return;
    }
    if (Platform.OS === 'android') {
      setAndroidPickerTarget('bring');
      setAndroidPickerPhase('date');
    }
  };

  const applyWebBringCustomDate = () => {
    const parsed = parseDdMmYyyy(webBringCustomDateStr);
    if (!parsed) {
      Alert.alert(t('partnerDashboard.calendar.invalidDateTitle'), t('partnerDashboard.calendar.invalidDate'));
      return;
    }
    applyBringChange(mergeDateWithTime(parsed, bringDate));
  };

  const pickPickupDayOffset = (days) => {
    const base = addCalendarDays(dayStart(bringDate), days);
    const next = ensurePickupAfterBring(bringDate, mergeDateWithTime(base, pickupDate));
    applyPickupChange(next);
  };

  const pickPickupTimeSlot = (slot) => {
    applyPickupChange(applyTimeSlotToDate(pickupDate, slot));
  };

  const openPickupCustomDate = () => {
    setPickupCustomDateActive(true);
    setPickupDayOffset(null);
    if (isWeb) {
      setWebPickupCustomDateStr(formatCustomDateInput(pickupDate));
      return;
    }
    if (Platform.OS === 'android') {
      setAndroidPickerTarget('pickup');
      setAndroidPickerPhase('date');
    }
  };

  const applyWebPickupCustomDate = () => {
    const raw = String(webPickupCustomDateStr || '').trim();
    if (!raw) {
      // Re-open existing custom pickup without retyping.
      applyPickupChange(pickupDate);
      return;
    }
    const parsed = parseDdMmYyyy(raw);
    if (!parsed) {
      Alert.alert(t('partnerDashboard.calendar.invalidDateTitle'), t('partnerDashboard.calendar.invalidDate'));
      return;
    }
    applyPickupChange(mergeDateWithTime(parsed, pickupDate));
  };

  const onAndroidPickerChange = (event, picked) => {
    if (event?.type === 'dismissed') {
      setAndroidPickerPhase(null);
      setAndroidPickerTarget(null);
      return;
    }
    if (!picked) {
      setAndroidPickerPhase(null);
      setAndroidPickerTarget(null);
      return;
    }
    const target = androidPickerTarget || 'bring';
    if (androidPickerPhase === 'date') {
      if (target === 'pickup') {
        setPickupDate(mergeDateWithTime(picked, pickupDate));
      } else {
        setBringDate(mergeDateWithTime(picked, bringDate));
      }
      setAndroidPickerPhase('time');
      return;
    }
    if (target === 'pickup') {
      applyPickupChange(mergeDateWithTime(pickupDate, picked));
    } else {
      applyBringChange(mergeDateWithTime(bringDate, picked));
    }
    setAndroidPickerPhase(null);
    setAndroidPickerTarget(null);
  };

  const submitMove = async () => {
    if (!selectedJob) return;
    if (!bringDate || Number.isNaN(bringDate.getTime()) || !pickupDate || Number.isNaN(pickupDate.getTime())) {
      return;
    }
    const safePickup = ensurePickupAfterBring(bringDate, pickupDate);
    if (safePickup.getTime() <= bringDate.getTime()) {
      Alert.alert(
        t('partnerDashboard.calendar.invalidDateTitle'),
        t('partnerDashboard.createOffer.pickupAfterBringBody')
      );
      return;
    }
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const result = await proposeRepairSchedule(token, selectedJob.id, {
        scheduledStart: toApiIso(bringDate),
        scheduledEnd: toApiIso(safePickup),
        note: moveNote,
      });
      closeMoveModal();
      invalidateShopCalendarCache();
      await loadCalendar({ force: true });
      if (result.mode === 'proposal') {
        Alert.alert(
          t('partnerDashboard.calendar.sentToClientTitle'),
          t('partnerDashboard.calendar.sentToClientBody')
        );
      } else {
        Alert.alert(t('partnerDashboard.calendar.scheduledTitle'), t('partnerDashboard.calendar.scheduledBody'));
      }
    } catch (err) {
      Alert.alert(t('common.error'), err.message || t('partnerDashboard.calendar.scheduleError'));
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
      Alert.alert(
        t('partnerDashboard.calendar.vehicleArrivedTitle'),
        t('partnerDashboard.calendar.vehicleArrivedBody')
      );
    } catch (err) {
      Alert.alert(t('common.error'), err.message || t('partnerDashboard.calendar.arrivalError'));
    } finally {
      setConfirmingArrivalId(null);
    }
  };

  const openRepairDetail = (job) => {
    navigateToRepairDetail(navigation, job.id, {
      returnTo: 'ShopCalendar',
      backLabelKey: 'drawer.partner.calendar',
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
        throw new Error(t('partnerDashboard.calendar.notSignedIn'));
      }
      await declineDirectRepairRequest(token, job.id);
      removeJobFromCalendarState(job.id);
      removeRepairFromNotifications(job.id);
      refreshNotifications?.();
      invalidateShopCalendarCache();
      await loadCalendar({ force: true });
      closeConfirmDialog();
      showToast(t('partnerDashboard.calendar.declineToast'));
    } catch (err) {
      closeConfirmDialog();
      showToast(err.message || t('partnerDashboard.calendar.declineError'));
    } finally {
      setDismissingId(null);
    }
  };

  const promptDecline = (job) => {
    setConfirmDialog({
      title: t('partnerDashboard.calendar.declineTitle'),
      message: t('partnerDashboard.calendar.declineMessage'),
      confirmLabel: t('partnerDashboard.calendar.decline'),
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
        throw new Error(t('partnerDashboard.calendar.notSignedIn'));
      }
      await dismissRepairFromScheduleQueue(token, job.id);
      removeJobFromCalendarState(job.id);
      invalidateShopCalendarCache();
      await loadCalendar({ force: true });
      closeConfirmDialog();
    } catch (err) {
      closeConfirmDialog();
      showToast(err.message || t('partnerDashboard.calendar.removeError'));
    } finally {
      setDismissingId(null);
    }
  };

  const promptDismiss = (job) => {
    setConfirmDialog({
      title: t('partnerDashboard.calendar.removeTitle'),
      message: t('partnerDashboard.calendar.removeMessage'),
      confirmLabel: t('partnerDashboard.calendar.remove'),
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
  const modalTitle = isReschedule
    ? t('partnerDashboard.calendar.moveTitle')
    : t('partnerDashboard.calendar.scheduleTitle');

  return (
    <ScreenBackground safeArea={false}>
      <PartnerAppHeader
        title={t('drawer.partner.calendar')}
        backLabel={backLabel}
        onBack={handleBackHome}
        iconOnlyBack
        showCalendar={false}
        loadCalendarBadge={false}
      />

      <View style={styles.weekLabelWrap}>
        <Button
          compact
          mode="text"
          textColor="#fff"
          onPress={() => setWeekStart((w) => addCalendarDays(w, -CALENDAR_DAY_COUNT))}
          accessibilityLabel="Previous period"
        >
          ‹
        </Button>
        <Text style={styles.weekLabel}>
          {formatDayLabel(weekStart, locale)} – {formatDayLabel(addCalendarDays(weekStart, CALENDAR_DAY_COUNT - 1), locale)}
        </Text>
        <Button
          compact
          mode="text"
          textColor="#fff"
          onPress={() => setWeekStart((w) => addCalendarDays(w, CALENDAR_DAY_COUNT))}
          accessibilityLabel="Next period"
        >
          ›
        </Button>
        <Button compact mode="text" textColor="#fff" onPress={() => setWeekStart(startOfWeek(new Date()))}>
          {t('partnerDashboard.calendar.today')}
        </Button>
      </View>

      {unscheduledCount > 0 ? (
        <View style={styles.unscheduledBanner} accessibilityRole="text">
          <Text style={styles.unscheduledBannerText}>
            {t('partnerDashboard.calendar.unscheduledBanner', { count: unscheduledCount })}
          </Text>
        </View>
      ) : null}

      {loading ? (
        <ActivityIndicator style={styles.loader} color="#fff" />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {unscheduledCount > 0 ? (
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>{t('partnerDashboard.calendar.noDateYet')}</Text>
                <Badge style={styles.countBadge}>{unscheduledCount}</Badge>
              </View>
              <Text style={styles.sectionHint}>
                {t('partnerDashboard.calendar.noDateYetHint')}
              </Text>
              {calendar.unscheduled.map((job) => (
                <QueueJobRow
                  key={`u-${job.id}`}
                  item={job}
                  onSchedule={openMoveModal}
                  onDismiss={dismissUnscheduled}
                  dismissing={dismissingId === job.id}
                  t={t}
                  locale={locale}
                />
              ))}
            </View>
          ) : null}

          {dayBuckets.map((bucket) => {
            const loadRow = getDayLoadRow(dailyLoadMap, bucket.date);
            return (
            <View key={bucket.date.toISOString()} style={styles.section}>
              <Text style={styles.sectionTitle}>{formatDayLabel(bucket.date, locale)}</Text>
              <DayLaborSummary loadRow={loadRow} t={t} />
              {bucket.items.length === 0 ? (
                <Text style={styles.emptyDay}>—</Text>
              ) : (
                bucket.items.map((job) => (
                  <DayJobCard
                    key={`${job.id}-${bucket.date.toISOString()}`}
                    item={job}
                    dayDate={bucket.date}
                    bayNumber={bayByJobId.get(job.id) || null}
                    onOpen={openRepairDetail}
                    onReschedule={openMoveModal}
                    onConfirmArrival={confirmArrival}
                    onDecline={promptDecline}
                    confirming={confirmingArrivalId}
                    declining={dismissingId}
                    t={t}
                    locale={locale}
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
                {(selectedJob.vehicle_license_plate || t('partnerDashboard.calendar.vehicleFallback')) +
                  ' · ' +
                  (selectedJob.repair_type_name || t('partnerDashboard.calendar.serviceFallback'))}
              </Text>
            ) : null}

            <Text style={styles.modalSectionTitle}>
              {t('partnerDashboard.calendar.comeInSection')}
            </Text>
            <Text style={styles.modalLabel}>{t('partnerDashboard.calendar.dateLabel')}</Text>
            <View style={styles.chipRow}>
              {SCHEDULE_DAY_OFFSETS.map((opt) => (
                <Pressable
                  key={opt.label}
                  onPress={() => pickBringDayOffset(opt.days)}
                  style={[
                    styles.chip,
                    !bringCustomDateActive && bringDayOffset === opt.days && styles.chipSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      !bringCustomDateActive && bringDayOffset === opt.days && styles.chipTextSelected,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
              <Pressable
                onPress={openBringCustomDate}
                style={[styles.chip, bringCustomDateActive && styles.chipSelected]}
              >
                <Text style={[styles.chipText, bringCustomDateActive && styles.chipTextSelected]}>
                  {t('partnerDashboard.calendar.customDate')}
                </Text>
              </Pressable>
            </View>

            {Platform.OS === 'ios' && bringCustomDateActive ? (
              <DateTimePicker
                value={bringDate}
                mode="date"
                display="spinner"
                onChange={(_, d) => {
                  if (d) applyBringChange(mergeDateWithTime(d, bringDate));
                }}
              />
            ) : null}

            {isWeb && bringCustomDateActive ? (
              <View style={styles.webCustomBlock}>
                <TextInput
                  mode="outlined"
                  label={t('partnerDashboard.calendar.customDateLabel')}
                  value={webBringCustomDateStr}
                  onChangeText={setWebBringCustomDateStr}
                  placeholder="12.06.2026"
                  dense
                />
                <Button mode="outlined" compact onPress={applyWebBringCustomDate} style={styles.webApplyBtn}>
                  {t('partnerDashboard.calendar.applyDate')}
                </Button>
              </View>
            ) : null}

            <Text style={styles.modalLabel}>{t('partnerDashboard.calendar.timeLabel')}</Text>
            <View style={styles.chipRow}>
              {SCHEDULE_TIME_SLOTS.map((slot) => (
                <Pressable
                  key={`bring-${slot}`}
                  onPress={() => pickBringTimeSlot(slot)}
                  style={[styles.chip, bringTimeSlot === slot && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, bringTimeSlot === slot && styles.chipTextSelected]}>
                    {slot}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.modalSectionTitle}>
              {t('partnerDashboard.calendar.pickupSection')}
            </Text>
            <Text style={styles.modalLabel}>{t('partnerDashboard.calendar.dateLabel')}</Text>
            <View style={styles.chipRow}>
              {pickupDayOffsets.map((opt) => (
                <Pressable
                  key={opt.label}
                  onPress={() => pickPickupDayOffset(opt.days)}
                  style={[
                    styles.chip,
                    !pickupCustomDateActive && pickupDayOffset === opt.days && styles.chipSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      !pickupCustomDateActive && pickupDayOffset === opt.days && styles.chipTextSelected,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
              <Pressable
                onPress={openPickupCustomDate}
                style={[styles.chip, pickupCustomDateActive && styles.chipSelected]}
              >
                <Text style={[styles.chipText, pickupCustomDateActive && styles.chipTextSelected]}>
                  {t('partnerDashboard.calendar.customDate')}
                </Text>
              </Pressable>
            </View>

            {Platform.OS === 'ios' && pickupCustomDateActive ? (
              <DateTimePicker
                value={pickupDate}
                mode="date"
                display="spinner"
                onChange={(_, d) => {
                  if (d) applyPickupChange(mergeDateWithTime(d, pickupDate));
                }}
              />
            ) : null}

            {isWeb && pickupCustomDateActive ? (
              <View style={styles.webCustomBlock}>
                <TextInput
                  mode="outlined"
                  label={t('partnerDashboard.calendar.customDateLabel')}
                  value={webPickupCustomDateStr}
                  onChangeText={setWebPickupCustomDateStr}
                  placeholder="12.06.2026"
                  dense
                />
                <Button mode="outlined" compact onPress={applyWebPickupCustomDate} style={styles.webApplyBtn}>
                  {t('partnerDashboard.calendar.applyDate')}
                </Button>
              </View>
            ) : null}

            {Platform.OS === 'android' && androidPickerPhase ? (
              <DateTimePicker
                value={androidPickerTarget === 'pickup' ? pickupDate : bringDate}
                mode={androidPickerPhase}
                onChange={onAndroidPickerChange}
              />
            ) : null}

            <Text style={styles.modalLabel}>{t('partnerDashboard.calendar.timeLabel')}</Text>
            <View style={styles.chipRow}>
              {SCHEDULE_TIME_SLOTS.map((slot) => (
                <Pressable
                  key={`pickup-${slot}`}
                  onPress={() => pickPickupTimeSlot(slot)}
                  style={[styles.chip, pickupTimeSlot === slot && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, pickupTimeSlot === slot && styles.chipTextSelected]}>
                    {slot}
                  </Text>
                </Pressable>
              ))}
            </View>

            <TextInput
              mode="outlined"
              label={t('partnerDashboard.calendar.noteLabel')}
              value={moveNote}
              onChangeText={setMoveNote}
              style={styles.noteInput}
            />

            <Text style={styles.modalPreview}>
              {t('partnerDashboard.calendar.comeInPreview', {
                datetime: formatSchedulePreview(bringDate),
              })}
            </Text>
            <Text style={styles.modalPreviewSecondary}>
              {t('partnerDashboard.calendar.pickupPreview', {
                datetime: formatSchedulePreview(pickupDate),
              })}
            </Text>

            <View style={styles.modalActions}>
              <Button mode="text" onPress={closeMoveModal} disabled={saving}>
                {t('common.cancel')}
              </Button>
              <Button mode="contained" onPress={submitMove} loading={saving} disabled={saving}>
                {isReschedule ? t('partnerDashboard.calendar.sendToClient') : t('partnerDashboard.calendar.schedule')}
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
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  weekLabel: { color: '#fff', fontSize: 15, fontWeight: '600', flex: 1, textAlign: 'center' },
  unscheduledBanner: {
    marginHorizontal: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(220, 38, 38, 0.18)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(252, 165, 165, 0.45)',
  },
  unscheduledBannerText: {
    color: '#FEE2E2',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
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
    backgroundColor: 'rgba(63,169,245,0.9)',
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
  compactCardPending: {
    borderLeftWidth: 3,
    borderLeftColor: '#D97706',
    backgroundColor: '#FFFBEB',
  },
  stayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#64748B',
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 4,
  },
  stayRowText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  bayChip: {
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  bayChipText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  compactHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  compactTime: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  compactTimeRequest: {
    color: '#DC2626',
  },
  compactTimePending: {
    color: '#B45309',
  },
  kindPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  kindPillRequest: {
    backgroundColor: 'rgba(220,38,38,0.12)',
  },
  kindPillReady: {
    backgroundColor: 'rgba(13,148,136,0.14)',
  },
  kindPillPending: {
    backgroundColor: 'rgba(217,119,6,0.16)',
  },
  kindPillBooked: {
    backgroundColor: 'rgba(15,76,129,0.1)',
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
  kindPillTextReady: {
    color: '#0F766E',
  },
  kindPillTextPending: {
    color: '#B45309',
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
  modalSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 8,
    marginBottom: 4,
  },
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
    backgroundColor: 'rgba(15,76,129,0.08)',
  },
  chipText: { fontSize: 13, color: '#334155' },
  chipTextSelected: { color: COLORS.PRIMARY, fontWeight: '600' },
  webCustomBlock: { marginBottom: 8, gap: 8 },
  webApplyBtn: { alignSelf: 'flex-start' },
  noteInput: { marginTop: 4, backgroundColor: '#fff' },
  modalPreview: { fontSize: 14, color: '#334155', marginTop: 10, fontWeight: '600' },
  modalPreviewSecondary: { fontSize: 14, color: '#334155', marginTop: 4, fontWeight: '600' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 16, marginBottom: 8 },
});
