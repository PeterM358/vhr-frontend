import React, { useState, useEffect, useLayoutEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, TextInput, Button, Switch } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { createOffer, updateOffer } from '../api/offers';
import { getOfferDraft } from '../api/serviceMenu';
import { getMyShopProfiles } from '../api/profiles';
import { DEFAULT_CURRENCY, formatMoneyAmount } from '../constants/currency';
import { computeFromSum, computeToSum } from '../utils/offerPricing';
import { fetchShopCalendarCached } from '../utils/shopCalendarCache';
import {
  buildDailyLoadMap,
  getDayLoadRow,
  buildScheduledByDayMap,
  dateKeyLocal,
  DAY_LOAD_CHIP_STYLES,
  DAY_LOAD_TEXT_STYLES,
  formatDayLoadChipHint,
  formatDayLoadHeroLine,
  formatDayLoadLabel,
  formatDayLoadPeekLine,
  getBookingsForDate,
  getBookedTimeSet,
  getDayLoadLevel,
} from '../utils/shopDayLoad';
import ScreenBackground from '../components/ScreenBackground';
import { stackContentPaddingTop } from '../navigation/stackContentInset';
import FloatingCard from '../components/ui/FloatingCard';
import DayBookingsPopup from '../components/shop/DayBookingsPopup';
import { COLORS } from '../constants/colors';

const TIME_SLOTS = [
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
];

const BRING_QUICK_OFFSETS = [
  { label: 'Today', days: 0 },
  { label: 'Tomorrow', days: 1 },
  { label: '+2 days', days: 2 },
  { label: '+3 days', days: 3 },
  { label: '+1 week', days: 7 },
  { label: '+2 weeks', days: 14 },
];

const PICKUP_DAY_OFFSETS_FROM_BRING = [
  { label: 'Same day', days: 0 },
  { label: '+1 day', days: 1 },
  { label: '+2 days', days: 2 },
  { label: '+3 days', days: 3 },
  { label: '+1 week', days: 7 },
  { label: '+2 weeks', days: 14 },
];

/** Local UI only — not submitted to API. */
function parseEstimateNumber(raw) {
  const t = String(raw ?? '').trim().replace(',', '.');
  if (t === '') return 0;
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : 0;
}

function computeQuotedTotal(laborFrom, partsFrom) {
  return computeFromSum(laborFrom, partsFrom);
}

function formatEstimateAmount(n) {
  if (!Number.isFinite(n)) return '0';
  if (Math.abs(n % 1) < 1e-9 || Number.isInteger(n)) return String(Math.round(n));
  return String(Math.round(n * 100) / 100);
}

function validatePricingInputs(laborFrom, laborTo, partsFrom, partsTo, total) {
  const lf = String(laborFrom ?? '').trim();
  const pf = String(partsFrom ?? '').trim();
  const totalStr = String(total ?? '').trim();
  if (!lf) return 'Enter labor from/exact amount.';
  if (!pf) return 'Enter parts from/exact amount.';
  if (!totalStr) return 'Enter quoted total.';
  if (parseEstimateNumber(lf) < 0 || parseEstimateNumber(pf) < 0) {
    return 'Amounts cannot be negative.';
  }
  const lt = String(laborTo ?? '').trim();
  const pt = String(partsTo ?? '').trim();
  if (lt && parseEstimateNumber(lt) < parseEstimateNumber(lf)) {
    return 'Labor To must be at least Labor from/exact.';
  }
  if (pt && parseEstimateNumber(pt) < parseEstimateNumber(pf)) {
    return 'Parts To must be at least Parts from/exact.';
  }
  if (!Number.isFinite(parseFloat(totalStr))) return 'Enter a valid quoted total.';
  return null;
}

function dayStart(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function splitDateTimePhrase(phrase) {
  const t = String(phrase || '').trim();
  const timeMatch = t.match(/\s(\d{1,2}:\d{2}(?::\d{2})?)$/);
  if (timeMatch) {
    return {
      date: t.slice(0, -timeMatch[0].length).trim(),
      time: timeMatch[1].trim(),
    };
  }
  return { date: t, time: '' };
}

function parseAvailabilityNoteFromApi(note) {
  const raw = String(note || '').trim();
  const empty = { bringDate: '', bringTime: '', pickupDate: '', pickupTime: '', extra: '' };
  if (!raw) return empty;
  const m = raw.match(/Bring vehicle:\s*([^.\n]+?)\.\s*Pickup\/ready:\s*([^.\n]+?)\.?(.*)$/is);
  if (m) {
    const extra = m[3].trim().replace(/^\.\s*/, '').trim();
    const b = splitDateTimePhrase(m[1]);
    const p = splitDateTimePhrase(m[2]);
    return {
      bringDate: b.date,
      bringTime: b.time,
      pickupDate: p.date,
      pickupTime: p.time,
      extra,
    };
  }
  return { ...empty, extra: raw };
}

function normalizeDateLabel(label) {
  const t = String(label || '').trim().toLowerCase();
  if (!t) return null;
  const now = new Date();
  if (t === 'today') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  if (t === 'tomorrow') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  }
  const m = t.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) {
    const day = parseInt(m[1], 10);
    const month = parseInt(m[2], 10) - 1;
    const year = parseInt(m[3], 10);
    const d = new Date(year, month, day);
    if (d.getFullYear() !== year || d.getMonth() !== month || d.getDate() !== day) return null;
    return d;
  }
  return null;
}

function parseTimeToMinutes(timeStr) {
  const t = String(timeStr || '').trim();
  const m = t.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

function dateFromParsedLabelAndTime(dateLabel, timeStr) {
  const base = normalizeDateLabel(dateLabel);
  if (!base) return null;
  const tm = parseTimeToMinutes(timeStr);
  if (tm == null) return null;
  const h = Math.floor(tm / 60);
  const m = tm % 60;
  return new Date(base.getFullYear(), base.getMonth(), base.getDate(), h, m, 0, 0);
}

/** API / human-readable note: 12.05.2026 08:00 */
function formatPayloadDateTime(d) {
  if (!d || Number.isNaN(d.getTime())) return '';
  const dd = d.getDate().toString().padStart(2, '0');
  const mm = (d.getMonth() + 1).toString().padStart(2, '0');
  const yyyy = d.getFullYear();
  const hm = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  return `${dd}.${mm}.${yyyy} ${hm}`;
}

/** Card row: Mon 12.05.2026, 08:00 */
function formatDisplayDateTimeComma(d) {
  if (!d || Number.isNaN(d.getTime())) return 'Tap to set';
  const dd = d.getDate().toString().padStart(2, '0');
  const mm = (d.getMonth() + 1).toString().padStart(2, '0');
  const yyyy = d.getFullYear();
  const hm = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  const weekday = d.toLocaleDateString(undefined, { weekday: 'short' });
  return `${weekday} ${dd}.${mm}.${yyyy}, ${hm}`;
}

function formatBigDatePreview(d) {
  if (!d || Number.isNaN(d.getTime())) {
    return { dayName: '—', dateLine: 'Pick a date', timeLine: '—' };
  }
  return {
    dayName: d.toLocaleDateString(undefined, { weekday: 'long' }),
    dateLine: d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }),
    timeLine: `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`,
  };
}

function dayOffsetFromToday(d) {
  const today = dayStart(new Date());
  const target = dayStart(d);
  return Math.round((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

function dayOffsetFromAnchor(anchor, target) {
  if (!anchor || !target) return null;
  const a = dayStart(anchor);
  const t = dayStart(target);
  return Math.round((t.getTime() - a.getTime()) / (24 * 60 * 60 * 1000));
}

function workingTimeSlotString(d) {
  if (!d || Number.isNaN(d.getTime())) return '';
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function buildScheduleAvailabilityNote(bringAt, pickupAt, optionalNote) {
  const opt = String(optionalNote || '').trim();
  const parts = [];
  if (bringAt && !Number.isNaN(bringAt.getTime())) {
    parts.push(`Bring vehicle: ${formatPayloadDateTime(bringAt)}.`);
  }
  if (pickupAt && !Number.isNaN(pickupAt.getTime())) {
    parts.push(`Pickup/ready: ${formatPayloadDateTime(pickupAt)}.`);
  }
  let core = parts.join(' ').trim();
  if (core && opt) return `${core} ${opt}`;
  if (core) return core;
  if (opt) return opt;
  return null;
}

function computeDurationMinutes(bringAt, pickupAt) {
  if (!bringAt || !pickupAt || Number.isNaN(bringAt.getTime()) || Number.isNaN(pickupAt.getTime())) {
    return null;
  }
  const ms = pickupAt.getTime() - bringAt.getTime();
  if (ms <= 0) return null;
  return Math.round(ms / 60000);
}

function defaultDateAtHour(hour, minute) {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate(), hour, minute, 0, 0);
}

function applyTimeStringToDate(baseDay, timeStr) {
  const tm = parseTimeToMinutes(timeStr);
  if (tm == null) return new Date(baseDay);
  const h = Math.floor(tm / 60);
  const m = tm % 60;
  return new Date(baseDay.getFullYear(), baseDay.getMonth(), baseDay.getDate(), h, m, 0, 0);
}

function parseDdMmYyyy(str) {
  const m = String(str || '').trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const month = parseInt(m[2], 10) - 1;
  const year = parseInt(m[3], 10);
  const d = new Date(year, month, day);
  if (d.getFullYear() !== year || d.getMonth() !== month || d.getDate() !== day) return null;
  return d;
}

function mergeDateWithTimeOf(baseDay, timeSource) {
  return new Date(
    baseDay.getFullYear(),
    baseDay.getMonth(),
    baseDay.getDate(),
    timeSource.getHours(),
    timeSource.getMinutes(),
    0,
    0
  );
}

function pickupFromBringShortcut(bring, key) {
  if (!bring || Number.isNaN(bring.getTime())) return null;
  const b = new Date(bring.getTime());
  switch (key) {
    case 'plus2h':
      return new Date(b.getTime() + 2 * 3600000);
    case 'plus4h':
      return new Date(b.getTime() + 4 * 3600000);
    default:
      return null;
  }
}

export default function CreateOrUpdateOfferScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { existingOffer, selectedOfferParts = [], shopId: routeShopId } = route.params || {};
  const [repairId, setRepairId] = useState(route.params?.repairId || existingOffer?.repair || null);
  const [shopId, setShopId] = useState(routeShopId ?? existingOffer?.shop ?? null);

  const [description, setDescription] = useState('');
  const [laborFrom, setLaborFrom] = useState('');
  const [laborTo, setLaborTo] = useState('');
  const [partsFrom, setPartsFrom] = useState('');
  const [partsTo, setPartsTo] = useState('');
  const [price, setPrice] = useState('');
  const priceManuallyEditedRef = useRef(false);
  const [availableFrom, setAvailableFrom] = useState('');
  const [bringAt, setBringAt] = useState(null);
  const [pickupAt, setPickupAt] = useState(null);
  const [optionalAvailabilityNote, setOptionalAvailabilityNote] = useState('');
  const [phoneCallAllowed, setPhoneCallAllowed] = useState(true);
  const [parts, setParts] = useState([]);
  const [offerDraft, setOfferDraft] = useState(null);
  const [draftDismissed, setDraftDismissed] = useState(false);
  const hydratedAvailabilityOfferIdRef = useRef(null);

  const [pickerModalVisible, setPickerModalVisible] = useState(false);
  const [pickerTarget, setPickerTarget] = useState(null);
  const [bringCustomDateActive, setBringCustomDateActive] = useState(false);
  const [pickupCustomDateActive, setPickupCustomDateActive] = useState(false);
  const [webCustomBringDateStr, setWebCustomBringDateStr] = useState('');
  const [workingDate, setWorkingDate] = useState(new Date());
  const [androidPhase, setAndroidPhase] = useState('date');
  const [androidPickerVisible, setAndroidPickerVisible] = useState(false);
  const [androidPickerContext, setAndroidPickerContext] = useState(null);
  const [dailyLoadMap, setDailyLoadMap] = useState(() => new Map());
  const [scheduledByDay, setScheduledByDay] = useState(() => new Map());
  const [dailyVehicleCapacity, setDailyVehicleCapacity] = useState(null);
  const [dayBookingsPopupDate, setDayBookingsPopupDate] = useState(null);

  const isWeb = Platform.OS === 'web';

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: existingOffer ? 'Update proposal' : 'Send proposal',
      headerBackTitleVisible: true,
    });
  }, [navigation, existingOffer]);

  const syncTotalFromEstimates = useCallback((nextLaborFrom, nextPartsFrom) => {
    if (priceManuallyEditedRef.current) return;
    const lf = String(nextLaborFrom ?? '').trim();
    const pf = String(nextPartsFrom ?? '').trim();
    if (!lf && !pf) {
      setPrice('');
      return;
    }
    setPrice(formatEstimateAmount(computeQuotedTotal(nextLaborFrom, nextPartsFrom)));
  }, []);

  const loadDayLoadForPicker = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('@access_token');
      if (!token) return;
      let resolvedShopId = shopId;
      if (!resolvedShopId) {
        const shops = await getMyShopProfiles();
        resolvedShopId = shops?.[0]?.id ?? null;
        if (resolvedShopId) setShopId(resolvedShopId);
      }
      const from = dayStart(new Date());
      const to = new Date(from);
      to.setDate(to.getDate() + 21);
      to.setHours(23, 59, 59, 999);
      const data = await fetchShopCalendarCached(token, {
        from: from.toISOString(),
        to: to.toISOString(),
        shopId: resolvedShopId,
      });
      setDailyLoadMap(buildDailyLoadMap(data.daily_load));
      setScheduledByDay(buildScheduledByDayMap(data.scheduled));
      setDailyVehicleCapacity(
        data.daily_vehicle_capacity != null ? Number(data.daily_vehicle_capacity) : null
      );
    } catch (err) {
      console.warn('Could not load shop day load', err);
    }
  }, [shopId]);

  const getBookedCountForDate = useCallback(
    (date) => {
      const row = getDayLoadRow(dailyLoadMap, date);
      return row?.bookedCount ?? 0;
    },
    [dailyLoadMap]
  );

  const getLaborRowForDate = useCallback(
    (date) => getDayLoadRow(dailyLoadMap, date),
    [dailyLoadMap]
  );

  const getBookingsOnDate = useCallback(
    (date) => getBookingsForDate(scheduledByDay, date),
    [scheduledByDay]
  );

  const selectedDayBookings = useMemo(
    () => getBookingsOnDate(workingDate),
    [workingDate, getBookingsOnDate]
  );

  const selectedDayLoad = useMemo(() => {
    const booked = getBookedCountForDate(workingDate);
    const laborRow = getLaborRowForDate(workingDate);
    return {
      booked,
      laborRow,
      level: getDayLoadLevel(booked, dailyVehicleCapacity, laborRow),
      label: formatDayLoadLabel(booked, dailyVehicleCapacity, laborRow),
      chipHint: formatDayLoadChipHint(booked, selectedDayBookings, laborRow),
      peekLine: formatDayLoadPeekLine(booked, selectedDayBookings, laborRow),
      heroLine: formatDayLoadHeroLine(booked, dailyVehicleCapacity, laborRow),
      bookings: selectedDayBookings,
    };
  }, [
    workingDate,
    dailyVehicleCapacity,
    getBookedCountForDate,
    getLaborRowForDate,
    selectedDayBookings,
  ]);

  const dayBookingsPopupBookings = useMemo(() => {
    if (!dayBookingsPopupDate) return [];
    return getBookingsOnDate(dayBookingsPopupDate);
  }, [dayBookingsPopupDate, getBookingsOnDate]);

  const dayBookingsPopupLabel = useMemo(() => {
    if (!dayBookingsPopupDate || Number.isNaN(dayBookingsPopupDate.getTime())) return '';
    return dayBookingsPopupDate.toLocaleDateString(undefined, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, [dayBookingsPopupDate]);

  const openDayBookingsPopup = (date) => {
    if (!date || Number.isNaN(date.getTime())) return;
    if (getBookedCountForDate(date) <= 0) return;
    setDayBookingsPopupDate(new Date(date.getTime()));
  };

  const closeDayBookingsPopup = () => setDayBookingsPopupDate(null);

  const resetPickerUi = () => {
    setPickerModalVisible(false);
    setPickerTarget(null);
    setBringCustomDateActive(false);
    setPickupCustomDateActive(false);
    setWebCustomBringDateStr('');
    setAndroidPickerVisible(false);
    setAndroidPickerContext(null);
    setAndroidPhase('date');
    setDayBookingsPopupDate(null);
  };

  const openBringPicker = () => {
    const initial = bringAt || defaultDateAtHour(10, 0);
    setWorkingDate(new Date(initial.getTime()));
    const offset = dayOffsetFromToday(initial);
    const matchesQuick = BRING_QUICK_OFFSETS.some((opt) => opt.days === offset);
    setBringCustomDateActive(Boolean(bringAt) && !matchesQuick);
    setWebCustomBringDateStr('');
    setPickerTarget('bring');
    loadDayLoadForPicker();
    if (Platform.OS === 'android') {
      setPickerModalVisible(true);
      return;
    }
    setPickerModalVisible(true);
  };

  const openPickupPicker = () => {
    if (!bringAt || Number.isNaN(bringAt.getTime())) {
      Alert.alert('Bring time required', 'Set bring vehicle date and time first.');
      return;
    }
    const initial =
      pickupAt && pickupAt.getTime() > bringAt.getTime()
        ? pickupAt
        : pickupFromBringShortcut(bringAt, 'plus4h') || new Date(bringAt.getTime() + 4 * 3600000);
    setWorkingDate(new Date(initial.getTime()));
    const offset = dayOffsetFromAnchor(bringAt, initial);
    const matchesQuick = PICKUP_DAY_OFFSETS_FROM_BRING.some((opt) => opt.days === offset);
    setPickupCustomDateActive(Boolean(pickupAt) && !matchesQuick);
    setBringCustomDateActive(false);
    setWebCustomBringDateStr('');
    setPickerTarget('pickup');
    setPickerModalVisible(true);
  };

  const commitBring = (date) => {
    setBringAt(new Date(date.getTime()));
    resetPickerUi();
  };

  const commitPickup = (date) => {
    setPickupAt(new Date(date.getTime()));
    resetPickerUi();
  };

  const applyBringOffsetDays = (days) => {
    const n = new Date();
    const base = new Date(n.getFullYear(), n.getMonth(), n.getDate() + days);
    const next = mergeDateWithTimeOf(base, workingDate);
    setWorkingDate(next);
    setBringCustomDateActive(false);
  };

  const applyWorkingTimeSlot = (timeStr) => {
    setWorkingDate(applyTimeStringToDate(workingDate, timeStr));
  };

  const onIosBringDateOnlyChange = (_e, date) => {
    if (date) {
      setWorkingDate(mergeDateWithTimeOf(date, workingDate));
    }
  };

  const onIosDateTimeChange = (_e, date) => {
    if (date) setWorkingDate(date);
  };

  const onAndroidDateTimeChange = (event, date) => {
    if (event?.type === 'dismissed') {
      setAndroidPickerVisible(false);
      setAndroidPickerContext(null);
      setAndroidPhase('date');
      return;
    }
    if (!date) return;
    const ctx = androidPickerContext;
    if (ctx === 'bringCustomDate') {
      setWorkingDate(mergeDateWithTimeOf(date, workingDate));
      setAndroidPickerVisible(false);
      setAndroidPickerContext(null);
      return;
    }
    if (ctx === 'pickupCustomDate') {
      setWorkingDate(mergeDateWithTimeOf(date, workingDate));
      setAndroidPickerVisible(false);
      setAndroidPickerContext(null);
      return;
    }
    if (ctx === 'bring') {
      if (androidPhase === 'date') {
        const next = mergeDateWithTimeOf(date, workingDate);
        setWorkingDate(next);
        setAndroidPhase('time');
        return;
      }
      const next = new Date(workingDate);
      next.setHours(date.getHours(), date.getMinutes(), 0, 0);
      commitBring(next);
      setAndroidPickerVisible(false);
      setAndroidPickerContext(null);
      setAndroidPhase('date');
      return;
    }
    if (ctx === 'pickupCustom') {
      if (androidPhase === 'date') {
        const next = mergeDateWithTimeOf(date, workingDate);
        setWorkingDate(next);
        setAndroidPhase('time');
        return;
      }
      const next = new Date(workingDate);
      next.setHours(date.getHours(), date.getMinutes(), 0, 0);
      if (next.getTime() <= bringAt.getTime()) {
        Alert.alert('Invalid times', 'Pickup/ready time must be after bring time.');
        setAndroidPickerVisible(false);
        setAndroidPickerContext(null);
        setAndroidPhase('date');
        return;
      }
      commitPickup(next);
      setAndroidPickerVisible(false);
      setAndroidPickerContext(null);
      setAndroidPhase('date');
    }
  };

  const startAndroidBringCustomDate = () => {
    setBringCustomDateActive(false);
    setAndroidPickerContext('bringCustomDate');
    setAndroidPhase('date');
    setAndroidPickerVisible(true);
  };

  const startAndroidBringFullPicker = () => {
    resetPickerUi();
    setAndroidPickerContext('bring');
    setAndroidPhase('date');
    setWorkingDate(bringAt ? new Date(bringAt) : defaultDateAtHour(10, 0));
    setAndroidPickerVisible(true);
  };

  const startAndroidPickupCustomDate = () => {
    setPickupCustomDateActive(false);
    setAndroidPickerContext('pickupCustomDate');
    setAndroidPhase('date');
    setAndroidPickerVisible(true);
  };

  const startAndroidPickupFullPicker = () => {
    resetPickerUi();
    setAndroidPickerContext('pickupCustom');
    setAndroidPhase('date');
    setWorkingDate(
      pickupAt && pickupAt.getTime() > bringAt.getTime()
        ? new Date(pickupAt)
        : new Date(bringAt.getTime() + 4 * 3600000)
    );
    setAndroidPickerVisible(true);
  };

  const applyWebCustomBringDate = () => {
    const parsed = parseDdMmYyyy(webCustomBringDateStr);
    if (!parsed) {
      Alert.alert('Invalid date', 'Use DD.MM.YYYY (example: 12.05.2026).');
      return false;
    }
    setWorkingDate(mergeDateWithTimeOf(parsed, workingDate));
    setBringCustomDateActive(false);
    return true;
  };

  const applyPickupOffsetDays = (daysAfterBring) => {
    if (!bringAt) return;
    const base = new Date(
      bringAt.getFullYear(),
      bringAt.getMonth(),
      bringAt.getDate() + daysAfterBring
    );
    setWorkingDate(mergeDateWithTimeOf(base, workingDate));
    setPickupCustomDateActive(false);
  };

  const confirmPickupModalDone = () => {
    let next = workingDate;
    if (isWeb && pickupCustomDateActive) {
      const parsed = parseDdMmYyyy(webCustomBringDateStr);
      if (!parsed) {
        Alert.alert('Invalid date', 'Use DD.MM.YYYY (example: 12.05.2026).');
        return;
      }
      next = mergeDateWithTimeOf(parsed, workingDate);
      setPickupCustomDateActive(false);
    }
    if (next.getTime() <= bringAt.getTime()) {
      Alert.alert('Invalid times', 'Pickup/ready time must be after bring time.');
      return;
    }
    commitPickup(next);
  };

  const confirmBringModalDone = () => {
    let next = workingDate;
    if (isWeb && bringCustomDateActive) {
      const parsed = parseDdMmYyyy(webCustomBringDateStr);
      if (!parsed) {
        Alert.alert('Invalid date', 'Use DD.MM.YYYY (example: 12.05.2026).');
        return;
      }
      next = mergeDateWithTimeOf(parsed, workingDate);
      setBringCustomDateActive(false);
    }
    commitBring(next);
  };

  useEffect(() => {
    if (route.params?.repairId && !repairId) {
      setRepairId(route.params.repairId);
    }

    if (selectedOfferParts.length > 0) {
      const normalized = selectedOfferParts.map((p) => ({
        partsMasterId: p.parts_master || p.partsMasterId || p.parts_master_id,
        quantity: p.quantity,
        price: p.price_per_item || p.price,
        labor: p.labor_cost || p.labor,
        note: p.note || '',
        partsMaster: p.parts_master_detail || p.partsMaster,
      }));
      setParts(normalized);
    } else if (existingOffer?.parts?.length > 0) {
      const normalized = existingOffer.parts.map((p) => ({
        partsMasterId: p.parts_master || p.partsMasterId,
        quantity: p.quantity,
        price: p.price_per_item || p.price,
        labor: p.labor_cost || p.labor,
        note: p.note || '',
        partsMaster: p.parts_master_detail || p.partsMaster,
      }));
      setParts(normalized);
    }

    if (!description && existingOffer?.description) setDescription(existingOffer.description);
    if (existingOffer?.labor_from != null) setLaborFrom(String(existingOffer.labor_from));
    if (existingOffer?.labor_to != null) setLaborTo(String(existingOffer.labor_to));
    if (existingOffer?.parts_from != null) setPartsFrom(String(existingOffer.parts_from));
    if (existingOffer?.parts_to != null) setPartsTo(String(existingOffer.parts_to));
    if (!price && existingOffer?.price != null) setPrice(String(existingOffer.price));
    if (!availableFrom && existingOffer?.available_from) setAvailableFrom(existingOffer.available_from);

    const offerIdForHydrate = existingOffer?.id ?? null;
    if (offerIdForHydrate != null && hydratedAvailabilityOfferIdRef.current !== offerIdForHydrate) {
      hydratedAvailabilityOfferIdRef.current = offerIdForHydrate;
      if (existingOffer?.availability_note) {
        const parsed = parseAvailabilityNoteFromApi(existingOffer.availability_note);
        const b = dateFromParsedLabelAndTime(parsed.bringDate, parsed.bringTime);
        const p = dateFromParsedLabelAndTime(parsed.pickupDate, parsed.pickupTime);
        if (b) setBringAt(b);
        if (p) setPickupAt(p);
        setOptionalAvailabilityNote(parsed.extra || '');
      }
    }
    if (!existingOffer?.id) {
      hydratedAvailabilityOfferIdRef.current = null;
    }

    if (existingOffer?.phone_call_allowed != null) setPhoneCallAllowed(Boolean(existingOffer.phone_call_allowed));
  }, [route.params]);

  useEffect(() => {
    let active = true;
    const loadDraft = async () => {
      if (existingOffer?.id || draftDismissed) return;
      const rid = repairId ?? route.params?.repairId ?? null;
      if (!rid) return;
      try {
        const token = await AsyncStorage.getItem('@access_token');
        const shopProfileId = await AsyncStorage.getItem('@current_shop_id');
        if (!token || !shopProfileId) return;
        const draft = await getOfferDraft(token, rid, shopProfileId);
        if (active && draft) setOfferDraft(draft);
      } catch (err) {
        if (__DEV__) {
          console.warn('offer draft load failed', err);
        }
      }
    };
    loadDraft();
    return () => {
      active = false;
    };
  }, [repairId, route.params?.repairId, existingOffer?.id, draftDismissed]);

  const applyOfferDraft = () => {
    if (!offerDraft) return;
    const labor = offerDraft.labor_estimate != null ? String(offerDraft.labor_estimate) : '';
    const partsVal = offerDraft.parts_estimate != null ? String(offerDraft.parts_estimate) : '';
    if (labor) setLaborFrom(labor);
    if (partsVal) setPartsFrom(partsVal);
    if (labor || partsVal) syncTotalFromEstimates(labor, partsVal);
    if (offerDraft.suggested_price != null) {
      setPrice(String(offerDraft.suggested_price));
    }
    if (Array.isArray(offerDraft.parts) && offerDraft.parts.length > 0) {
      setParts(
        offerDraft.parts.map((p) => ({
          partsMasterId: p.parts_master_id,
          quantity: p.quantity || 1,
          price: p.price_per_item || '0',
          labor: p.labor_cost || '0',
          note: p.note || '',
          partsMaster: p.parts_master_name ? { name: p.parts_master_name } : null,
        }))
      );
    }
    setDraftDismissed(true);
    setOfferDraft(null);
  };

  const draftSourceLabel =
    offerDraft?.source === 'history'
      ? 'Prior job on this vehicle'
      : offerDraft?.source === 'offer'
        ? 'Your last offer for this service'
      : offerDraft?.source === 'menu'
        ? 'Published price list'
        : offerDraft?.source === 'manual'
          ? 'No automatic suggestion'
          : null;

  const handleSubmit = async () => {
    if (!repairId) {
      Alert.alert('Missing Info', 'Repair ID is missing. Please reopen this offer from repair details.');
      return;
    }

    if (bringAt && pickupAt && pickupAt.getTime() <= bringAt.getTime()) {
      Alert.alert('Invalid times', 'Pickup/ready time must be after bring time.');
      return;
    }

    const pricingError = validatePricingInputs(laborFrom, laborTo, partsFrom, partsTo, price);
    if (pricingError) {
      Alert.alert('Pricing required', pricingError);
      return;
    }

    const quotedTotal = parseFloat(String(price).trim());

    try {
      const token = await AsyncStorage.getItem('@access_token');
      const availability_note = buildScheduleAvailabilityNote(
        bringAt,
        pickupAt,
        optionalAvailabilityNote
      );
      const computedDuration = computeDurationMinutes(bringAt, pickupAt);

      const payload = {
        description: String(description || '').trim(),
        labor_from: parseFloat(String(laborFrom).trim()),
        labor_to: String(laborTo || '').trim() ? parseFloat(String(laborTo).trim()) : null,
        parts_from: parseFloat(String(partsFrom).trim()),
        parts_to: String(partsTo || '').trim() ? parseFloat(String(partsTo).trim()) : null,
        price: quotedTotal,
        available_from: availableFrom || null,
        estimated_duration_minutes: computedDuration != null ? computedDuration : null,
        availability_note,
        phone_call_allowed: phoneCallAllowed,
        repair: repairId,
        parts: parts.map((p) => ({
          parts_master: p.partsMasterId,
          quantity: parseInt(p.quantity),
          price_per_item: parseFloat(p.price),
          labor_cost: parseFloat(p.labor),
          note: p.note,
        })),
      };

      if (existingOffer?.id) {
        await updateOffer(token, existingOffer.id, payload);
        Alert.alert('Success', 'Offer updated');
      } else {
        await createOffer(token, payload);
        Alert.alert('Success', 'Offer created');
      }

      if (navigation.canGoBack()) {
        navigation.goBack();
        return;
      }
      if (repairId) {
        navigation.navigate('RepairDetail', { repairId });
        return;
      }
      navigation.navigate('Home');
    } catch (err) {
      console.error(err);
      Alert.alert('Error', err.message || 'Failed to send offer');
    }
  };

  const navigateToSelectParts = () => {
    const rid = repairId ?? route.params?.repairId ?? existingOffer?.repair ?? null;
    navigation.navigate('SelectOfferParts', {
      offerId: existingOffer?.id || null,
      currentParts: parts,
      existingOffer,
      repairId: rid,
    });
  };

  const renderDateTimeHero = (showLoad = false) => {
    const preview = formatBigDatePreview(workingDate);
    const canPeek = showLoad && selectedDayLoad.booked > 0;
    return (
      <View style={styles.dateHero}>
        <Text style={styles.dateHeroDay}>{preview.dayName}</Text>
        <Text style={styles.dateHeroDate}>{preview.dateLine}</Text>
        <Text style={styles.dateHeroTime}>{preview.timeLine}</Text>
        {showLoad && selectedDayLoad.heroLine && !canPeek ? (
          <Text
            style={[
              styles.dayLoadHeroLine,
              selectedDayLoad.level === 'full' && styles.dayLoadHeroFull,
              selectedDayLoad.level === 'busy' && styles.dayLoadHeroBusy,
            ]}
          >
            {selectedDayLoad.heroLine}
          </Text>
        ) : null}
        {canPeek ? (
          <Pressable
            onPress={() => openDayBookingsPopup(workingDate)}
            style={({ pressed }) => [styles.dayLoadPeekBtn, pressed && { opacity: 0.85 }]}
          >
            <Text
              style={[
                styles.dayLoadPeekText,
                selectedDayLoad.level === 'full' && styles.dayLoadHeroFull,
                selectedDayLoad.level === 'busy' && styles.dayLoadHeroBusy,
              ]}
            >
              {selectedDayLoad.peekLine || `${selectedDayLoad.booked} booked`}
            </Text>
            <Text style={styles.dayLoadPeekHint}>Tap to see bookings</Text>
          </Pressable>
        ) : null}
      </View>
    );
  };

  const renderBringDayChip = (opt) => {
    const chipDate = dayStart(new Date());
    chipDate.setDate(chipDate.getDate() + opt.days);
    const bookings = getBookingsOnDate(chipDate);
    const booked = bookings.length || getBookedCountForDate(chipDate);
    const laborRow = getLaborRowForDate(chipDate);
    const level = getDayLoadLevel(booked, dailyVehicleCapacity, laborRow);
    const chipHint = formatDayLoadChipHint(booked, bookings, laborRow);
    const selected = !bringCustomDateActive && dayOffsetFromToday(workingDate) === opt.days;
    return (
      <Pressable
        key={opt.label}
        onPress={() => applyBringOffsetDays(opt.days)}
        style={[
          styles.timeChip,
          styles.dayLoadChip,
          DAY_LOAD_CHIP_STYLES[level],
          selected && styles.timeChipSelected,
          selected && level === 'full' && styles.timeChipSelectedFull,
        ]}
      >
        <Text style={[styles.timeChipText, selected && styles.timeChipTextSelected]}>
          {opt.label}
        </Text>
        {chipHint ? (
          <Pressable
            onPress={(event) => {
              event?.stopPropagation?.();
              openDayBookingsPopup(chipDate);
            }}
            hitSlop={6}
            style={styles.dayLoadChipPeek}
          >
            <Text
              style={[
                styles.dayLoadChipSub,
                DAY_LOAD_TEXT_STYLES[level],
                selected && styles.dayLoadChipSubSelected,
              ]}
            >
              {chipHint}
            </Text>
          </Pressable>
        ) : null}
      </Pressable>
    );
  };

  const renderTimeSlotChips = (showBookedHints = false) => {
    const activeSlot = workingTimeSlotString(workingDate);
    const bookedTimes = showBookedHints
      ? getBookedTimeSet(getBookingsOnDate(workingDate))
      : new Set();
    return (
      <View style={styles.chipRowWrap}>
        {TIME_SLOTS.map((slot) => {
          const selected = activeSlot === slot;
          const isBooked = bookedTimes.has(slot);
          return (
            <Pressable
              key={slot}
              onPress={() => applyWorkingTimeSlot(slot)}
              style={[
                styles.timeChip,
                isBooked && !selected && styles.timeChipBooked,
                selected && styles.timeChipSelected,
              ]}
            >
              <Text style={[styles.timeChipText, selected && styles.timeChipTextSelected]}>
                {slot}
              </Text>
              {isBooked ? (
                <Text
                  style={[
                    styles.timeChipBookedSub,
                    selected && styles.timeChipBookedSubSelected,
                  ]}
                >
                  booked
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    );
  };

  const renderBringModalBody = () => (
    <>
      {renderDateTimeHero(true)}
      <Text style={styles.modalSubtitle}>Date</Text>
      <View style={styles.chipRowWrap}>
        {BRING_QUICK_OFFSETS.map((opt) => renderBringDayChip(opt))}
        <Pressable
          onPress={() => {
            if (Platform.OS === 'ios') {
              setBringCustomDateActive(true);
              return;
            }
            if (isWeb) {
              setBringCustomDateActive(true);
              setWebCustomBringDateStr(
                `${workingDate.getDate().toString().padStart(2, '0')}.${(workingDate.getMonth() + 1).toString().padStart(2, '0')}.${workingDate.getFullYear()}`
              );
              return;
            }
            startAndroidBringCustomDate();
          }}
          style={[styles.timeChip, bringCustomDateActive && styles.timeChipSelected]}
        >
          <Text style={[styles.timeChipText, bringCustomDateActive && styles.timeChipTextSelected]}>
            Custom date
          </Text>
        </Pressable>
      </View>
      {Platform.OS === 'ios' && bringCustomDateActive ? (
        <DateTimePicker
          value={workingDate}
          mode="date"
          display="spinner"
          onChange={onIosBringDateOnlyChange}
        />
      ) : null}
      {isWeb && bringCustomDateActive ? (
        <View style={styles.webCustomDateBlock}>
          <Text style={styles.helperMuted}>Custom date (DD.MM.YYYY)</Text>
          <TextInput
            mode="outlined"
            dense
            value={webCustomBringDateStr}
            onChangeText={setWebCustomBringDateStr}
            placeholder="12.05.2026"
            style={styles.webCustomInput}
          />
          <Button mode="outlined" compact onPress={applyWebCustomBringDate}>
            Apply custom date
          </Button>
        </View>
      ) : null}
      <Text style={styles.modalSubtitle}>Time</Text>
      {renderTimeSlotChips(true)}
    </>
  );

  const renderPickupModalBody = () => (
    <>
      {renderDateTimeHero()}
      <Text style={styles.modalSubtitle}>Ready date (after bring day)</Text>
      <View style={styles.chipRowWrap}>
        {PICKUP_DAY_OFFSETS_FROM_BRING.map((opt) => {
          const selected =
            !pickupCustomDateActive && dayOffsetFromAnchor(bringAt, workingDate) === opt.days;
          return (
            <Pressable
              key={opt.label}
              onPress={() => applyPickupOffsetDays(opt.days)}
              style={[styles.timeChip, selected && styles.timeChipSelected]}
            >
              <Text style={[styles.timeChipText, selected && styles.timeChipTextSelected]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => {
            if (Platform.OS === 'ios') {
              setPickupCustomDateActive(true);
              return;
            }
            if (isWeb) {
              setPickupCustomDateActive(true);
              setWebCustomBringDateStr(
                `${workingDate.getDate().toString().padStart(2, '0')}.${(workingDate.getMonth() + 1).toString().padStart(2, '0')}.${workingDate.getFullYear()}`
              );
              return;
            }
            startAndroidPickupCustomDate();
          }}
          style={[styles.timeChip, pickupCustomDateActive && styles.timeChipSelected]}
        >
          <Text style={[styles.timeChipText, pickupCustomDateActive && styles.timeChipTextSelected]}>
            Custom date
          </Text>
        </Pressable>
      </View>
      {Platform.OS === 'ios' && pickupCustomDateActive ? (
        <DateTimePicker
          value={workingDate}
          mode="date"
          display="spinner"
          minimumDate={bringAt || undefined}
          onChange={onIosBringDateOnlyChange}
        />
      ) : null}
      {isWeb && pickupCustomDateActive ? (
        <View style={styles.webCustomDateBlock}>
          <Text style={styles.helperMuted}>Custom date (DD.MM.YYYY)</Text>
          <TextInput
            mode="outlined"
            dense
            value={webCustomBringDateStr}
            onChangeText={setWebCustomBringDateStr}
            placeholder="12.05.2026"
            style={styles.webCustomInput}
          />
          <Button mode="outlined" compact onPress={applyWebCustomBringDate}>
            Apply custom date
          </Button>
        </View>
      ) : null}
      <Text style={styles.modalSubtitle}>Time</Text>
      {renderTimeSlotChips()}
    </>
  );

  const modalTitle =
    pickerTarget === 'bring' ? 'Bring vehicle' : 'Pickup / ready';

  const fromSumAmount = computeFromSum(laborFrom, partsFrom);
  const toSumAmount = computeToSum(laborFrom, laborTo, partsFrom, partsTo);
  const showFromSum = String(laborFrom || '').trim() && String(partsFrom || '').trim();
  const showToSum =
    showFromSum &&
    (String(laborTo || '').trim() || String(partsTo || '').trim()) &&
    toSumAmount !== fromSumAmount;

  return (
    <ScreenBackground safeArea={false}>
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: 'transparent' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={[
        styles.container,
        { paddingTop: stackContentPaddingTop(insets, 4), paddingBottom: Math.max(insets.bottom, 16) },
      ]}>
        <Text style={styles.pageIntro}>Send a service proposal to the client.</Text>

        {offerDraft && !draftDismissed && !existingOffer ? (
          <FloatingCard style={styles.formCard}>
            <Text style={styles.sectionTitle}>Suggested pricing</Text>
            <Text style={styles.helperText}>
              Source: {draftSourceLabel}
              {offerDraft.notes ? ` — ${offerDraft.notes}` : ''}
            </Text>
            {offerDraft.suggested_price != null ? (
              <Text style={styles.helperText}>
                Suggested total: {formatMoneyAmount(offerDraft.suggested_price)}
              </Text>
            ) : null}
            <View style={styles.draftActions}>
              <Button mode="contained" onPress={applyOfferDraft} style={styles.draftBtn}>
                Use suggestion
              </Button>
              <Button mode="text" onPress={() => setDraftDismissed(true)}>
                Dismiss
              </Button>
            </View>
          </FloatingCard>
        ) : null}

        <FloatingCard style={styles.formCard}>
          <Text style={styles.sectionTitle}>Repair notes</Text>
          <TextInput
            mode="outlined"
            label="Description"
            value={description}
            onChangeText={setDescription}
            multiline
            style={styles.input}
          />
        </FloatingCard>

        <FloatingCard style={styles.formCard}>
          <Text style={styles.sectionTitle}>Estimated pricing ({DEFAULT_CURRENCY})</Text>
          <Text style={styles.helperText}>
            From/exact is required. To is optional for a range. Total is saved separately from the from sum.
          </Text>
          <Text style={styles.fieldGroupLabel}>Labor</Text>
          <View style={styles.rangeRow}>
            <TextInput
              mode="outlined"
              label="From/exact"
              value={laborFrom}
              onChangeText={(t) => {
                setLaborFrom(t);
                syncTotalFromEstimates(t, partsFrom);
              }}
              keyboardType="decimal-pad"
              placeholder="10"
              right={<TextInput.Affix text="€" />}
              style={styles.rangeInput}
            />
            <TextInput
              mode="outlined"
              label="To (optional)"
              value={laborTo}
              onChangeText={setLaborTo}
              keyboardType="decimal-pad"
              placeholder="50"
              right={<TextInput.Affix text="€" />}
              style={styles.rangeInput}
            />
          </View>
          <Text style={styles.fieldGroupLabel}>Parts</Text>
          <View style={styles.rangeRow}>
            <TextInput
              mode="outlined"
              label="From/exact"
              value={partsFrom}
              onChangeText={(t) => {
                setPartsFrom(t);
                syncTotalFromEstimates(laborFrom, t);
              }}
              keyboardType="decimal-pad"
              placeholder="50"
              right={<TextInput.Affix text="€" />}
              style={styles.rangeInput}
            />
            <TextInput
              mode="outlined"
              label="To (optional)"
              value={partsTo}
              onChangeText={setPartsTo}
              keyboardType="decimal-pad"
              placeholder="150"
              right={<TextInput.Affix text="€" />}
              style={styles.rangeInput}
            />
          </View>
          {showFromSum ? (
            <Text style={styles.pricingSumLine}>
              From sum: {formatMoneyAmount(fromSumAmount, DEFAULT_CURRENCY)}
            </Text>
          ) : null}
          {showToSum ? (
            <Text style={styles.pricingSumLine}>
              To sum: {formatMoneyAmount(toSumAmount, DEFAULT_CURRENCY)}
            </Text>
          ) : null}
          <TextInput
            mode="outlined"
            label="Quoted total"
            value={price}
            onChangeText={(t) => {
              priceManuallyEditedRef.current = true;
              setPrice(t);
            }}
            keyboardType="decimal-pad"
            placeholder="e.g. 115"
            right={<TextInput.Affix text="€" />}
            style={styles.input}
          />
          <Text style={styles.helperText}>
            From sum and to sum are saved on the offer. Quoted total is what the client books against.
          </Text>
        </FloatingCard>

        <FloatingCard style={styles.formCard}>
          <Text style={styles.sectionTitle}>Availability</Text>
          <Text style={[styles.helperText, { marginBottom: 12 }]}>
            Tell the client when to bring the vehicle and when it may be ready. Day chips show bookings
            and times already taken from your calendar.
          </Text>

          <Pressable
            onPress={openBringPicker}
            style={({ pressed }) => [styles.selectorRow, pressed && styles.selectorRowPressed]}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.selectorLine}>
                Bring vehicle: {bringAt ? formatDisplayDateTimeComma(bringAt) : 'Tap to set'}
              </Text>
            </View>
            <Text style={styles.selectorChevron}>›</Text>
          </Pressable>

          <Pressable
            onPress={openPickupPicker}
            style={({ pressed }) => [styles.selectorRow, pressed && styles.selectorRowPressed]}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.selectorLine}>
                Pickup / ready: {pickupAt ? formatDisplayDateTimeComma(pickupAt) : 'Tap to set'}
              </Text>
            </View>
            <Text style={styles.selectorChevron}>›</Text>
          </Pressable>

          <TextInput
            mode="outlined"
            label="Availability note (optional)"
            value={optionalAvailabilityNote}
            onChangeText={setOptionalAvailabilityNote}
            placeholder="Any extra detail for the client"
            multiline
            style={styles.input}
          />

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Phone call allowed</Text>
            <Switch value={phoneCallAllowed} onValueChange={setPhoneCallAllowed} />
          </View>
          <Text style={styles.helperText}>You can update the offer later.</Text>
        </FloatingCard>

        <FloatingCard>
          <Text style={styles.sectionTitle}>Estimated parts</Text>
          <Text style={styles.helperText}>
            Add parts if you already know what may be needed. Final parts can be updated during repair.
          </Text>
          <Button
            mode="outlined"
            icon="tools"
            onPress={navigateToSelectParts}
            style={styles.partsButton}
          >
            Manage estimated parts
          </Button>
        </FloatingCard>

        <FloatingCard>
          <Text style={styles.sectionTitle}>Selected estimated parts</Text>
          {parts.length === 0 ? (
            <Text style={styles.emptyText}>No estimated parts selected yet.</Text>
          ) : (
            <View>
            {parts.map((part, index) => (
              <FloatingCard key={index} style={styles.partCard}>
                <Text style={styles.partTitle}>{part.partsMaster?.name || 'Part'}</Text>
                {!!part.partsMaster?.part_number && (
                  <Text style={styles.partMeta}>Part number: {part.partsMaster.part_number}</Text>
                )}
                  <Text style={styles.partMeta}>Qty: {part.quantity}</Text>
                  <Text style={styles.partMeta}>
                    Estimated price: {formatMoneyAmount(part.price, DEFAULT_CURRENCY)}
                  </Text>
                  {part.note && <Text>Note: {part.note}</Text>}
              </FloatingCard>
            ))}
            </View>
          )}
        </FloatingCard>

        <Button
          mode="contained"
          onPress={handleSubmit}
          style={styles.submitButton}
        >
          {existingOffer ? 'Update proposal' : 'Send proposal'}
        </Button>
      </ScrollView>

      <Modal
        transparent
        animationType={isWeb ? 'fade' : 'slide'}
        visible={pickerModalVisible}
        onRequestClose={resetPickerUi}
      >
        <Pressable style={styles.modalBackdrop} onPress={resetPickerUi}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalKeyboardWrap}
          >
            <Pressable
              style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 16), maxHeight: '92%' }]}
              onPress={(event) => event.stopPropagation()}
            >
              <Text style={styles.modalTitle}>{modalTitle}</Text>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
              >
                {pickerTarget === 'bring' ? renderBringModalBody() : renderPickupModalBody()}
              </ScrollView>
              {pickerTarget === 'bring' && Platform.OS === 'android' ? (
                <Button mode="outlined" onPress={startAndroidBringFullPicker} style={{ marginTop: 8 }}>
                  Custom date & time (system picker)
                </Button>
              ) : null}
              {pickerTarget === 'pickup' && Platform.OS === 'android' ? (
                <Button mode="outlined" onPress={startAndroidPickupFullPicker} style={{ marginTop: 8 }}>
                  Custom date & time (system picker)
                </Button>
              ) : null}
              <View style={styles.modalActions}>
                <Button onPress={resetPickerUi}>Cancel</Button>
                <Button
                  mode="contained"
                  style={styles.modalDoneButton}
                  onPress={pickerTarget === 'bring' ? confirmBringModalDone : confirmPickupModalDone}
                >
                  Done
                </Button>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      {Platform.OS === 'android' && androidPickerVisible ? (
        <DateTimePicker
          key={`${androidPickerContext}-${androidPhase}`}
          value={workingDate}
          mode={androidPickerContext === 'bringCustomDate' || androidPickerContext === 'pickupCustomDate' ? 'date' : androidPhase}
          display="default"
          onChange={onAndroidDateTimeChange}
        />
      ) : null}

      <DayBookingsPopup
        visible={Boolean(dayBookingsPopupDate)}
        dateLabel={dayBookingsPopupLabel}
        bookings={dayBookingsPopupBookings}
        onClose={closeDayBookingsPopup}
      />
    </KeyboardAvoidingView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  pageIntro: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 15,
    marginBottom: 14,
    lineHeight: 21,
  },
  fieldGroupLabel: {
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
    marginBottom: 6,
    marginTop: 4,
  },
  rangeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  rangeInput: {
    flex: 1,
    marginBottom: 0,
  },
  pricingSumLine: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.PRIMARY,
    marginBottom: 10,
    marginTop: 4,
  },
  input: {
    marginBottom: 12,
  },
  formCard: {
    marginBottom: 14,
  },
  helperText: {
    color: COLORS.TEXT_MUTED,
    marginTop: 2,
  },
  draftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  draftBtn: {
    flexGrow: 0,
  },
  helperMuted: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
    marginBottom: 6,
  },
  sectionTitle: {
    marginBottom: 10,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
  },
  selectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  selectorRowPressed: {
    backgroundColor: 'rgba(15, 23, 42, 0.04)',
  },
  selectorLine: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_DARK,
  },
  selectorChevron: {
    fontSize: 22,
    color: COLORS.TEXT_MUTED,
    marginLeft: 8,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalKeyboardWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
    marginBottom: 12,
  },
  modalSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.TEXT_MUTED,
    marginBottom: 8,
    marginTop: 8,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  modalDoneButton: {
    marginLeft: 8,
  },
  chipRowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
  },
  timeChipSelected: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: COLORS.PRIMARY,
  },
  timeChipSelectedFull: {
    borderColor: '#dc2626',
    backgroundColor: '#dc2626',
  },
  timeChipBooked: {
    borderColor: 'rgba(100,116,139,0.55)',
    backgroundColor: 'rgba(241,245,249,0.95)',
  },
  timeChipBookedSub: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 2,
  },
  timeChipBookedSubSelected: {
    color: 'rgba(255,255,255,0.9)',
  },
  dayLoadChip: {
    minWidth: 88,
    alignItems: 'center',
  },
  dayLoadChipSub: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  dayLoadChipSubSelected: {
    color: 'rgba(255,255,255,0.92)',
  },
  dayLoadHeroLine: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    color: COLORS.TEXT_MUTED,
    paddingHorizontal: 8,
  },
  dayLoadHeroBusy: {
    color: '#b45309',
  },
  dayLoadHeroFull: {
    color: '#b91c1c',
    fontWeight: '600',
  },
  dayLoadPeekBtn: {
    marginTop: 8,
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  dayLoadPeekText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.PRIMARY,
    textAlign: 'center',
  },
  dayLoadPeekHint: {
    marginTop: 2,
    fontSize: 11,
    color: COLORS.TEXT_MUTED,
    textAlign: 'center',
  },
  dayLoadChipPeek: {
    marginTop: 2,
    paddingHorizontal: 4,
    paddingBottom: 2,
  },
  timeChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.TEXT_DARK,
  },
  timeChipTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  dateHero: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.2)',
  },
  dateHeroDay: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.PRIMARY,
    textTransform: 'capitalize',
  },
  dateHeroDate: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.TEXT_DARK,
    textAlign: 'center',
  },
  dateHeroTime: {
    marginTop: 8,
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.TEXT_DARK,
    letterSpacing: 1,
  },
  webPreview: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.TEXT_DARK,
  },
  webCustomDateBlock: {
    marginTop: 8,
    marginBottom: 8,
  },
  webCustomInput: {
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  shortcutCol: {
    marginTop: 4,
  },
  shortcutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  shortcutRowText: {
    fontSize: 16,
    color: COLORS.TEXT_DARK,
  },
  partsButton: {
    marginTop: 4,
  },
  emptyText: {
    color: COLORS.TEXT_MUTED,
    fontStyle: 'italic',
  },
  partCard: {
    marginVertical: 6,
    marginHorizontal: 0,
  },
  partTitle: {
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
    marginBottom: 2,
  },
  partMeta: {
    color: COLORS.TEXT_MUTED,
  },
  submitButton: {
    marginVertical: 18,
  },
  switchRow: {
    marginTop: 4,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchLabel: {
    color: COLORS.TEXT_DARK,
    fontWeight: '600',
  },
});
