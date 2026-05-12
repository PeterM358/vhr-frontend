import React, { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
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
import ScreenBackground from '../components/ScreenBackground';
import { stackContentPaddingTop } from '../navigation/stackContentInset';
import AppCard from '../components/ui/AppCard';
import FloatingCard from '../components/ui/FloatingCard';
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

const PICKUP_SHORTCUTS = [
  { key: 'plus2h', label: 'Same day +2h' },
  { key: 'plus4h', label: 'Same day +4h' },
  { key: 'nextMorning', label: 'Next day morning' },
  { key: 'nextAfternoon', label: 'Next day afternoon' },
  { key: 'plus2days', label: '+2 days' },
  { key: 'plus1week', label: '+1 week' },
  { key: 'custom', label: 'Custom ready time' },
];

/** Day offsets from bring calendar date (pickup custom UI). */
const PICKUP_CUSTOM_DAY_OFFSETS = [
  { label: 'Same day', days: 0 },
  { label: 'Next day', days: 1 },
  { label: '+2 days', days: 2 },
  { label: '+3 days', days: 3 },
  { label: '+1 week', days: 7 },
];

/** Local UI only — not submitted to API. */
function parseEstimateNumber(raw) {
  const t = String(raw ?? '').trim().replace(',', '.');
  if (t === '') return 0;
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : 0;
}

function formatTotalFromLaborParts(laborStr, partsStr) {
  const lt = String(laborStr ?? '').trim();
  const pt = String(partsStr ?? '').trim();
  if (lt === '' && pt === '') return null;

  const sum = parseEstimateNumber(laborStr) + parseEstimateNumber(partsStr);
  if (Math.abs(sum % 1) < 1e-9 || Number.isInteger(sum)) {
    return String(Math.round(sum));
  }
  return String(Math.round(sum * 100) / 100);
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

/** Card row: 12.05.2026, 08:00 */
function formatDisplayDateTimeComma(d) {
  if (!d || Number.isNaN(d.getTime())) return 'Tap to set';
  const dd = d.getDate().toString().padStart(2, '0');
  const mm = (d.getMonth() + 1).toString().padStart(2, '0');
  const yyyy = d.getFullYear();
  const hm = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  return `${dd}.${mm}.${yyyy}, ${hm}`;
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
    case 'nextMorning':
      return new Date(b.getFullYear(), b.getMonth(), b.getDate() + 1, 9, 0, 0, 0);
    case 'nextAfternoon':
      return new Date(b.getFullYear(), b.getMonth(), b.getDate() + 1, 14, 0, 0, 0);
    case 'plus2days':
      return new Date(b.getFullYear(), b.getMonth(), b.getDate() + 2, b.getHours(), b.getMinutes(), 0, 0);
    case 'plus1week':
      return new Date(b.getFullYear(), b.getMonth(), b.getDate() + 7, b.getHours(), b.getMinutes(), 0, 0);
    default:
      return null;
  }
}

export default function CreateOrUpdateOfferScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { existingOffer, selectedOfferParts = [] } = route.params || {};
  const [repairId, setRepairId] = useState(route.params?.repairId || existingOffer?.repair || null);

  const [description, setDescription] = useState('');
  const [laborEstimate, setLaborEstimate] = useState('');
  const [partsEstimate, setPartsEstimate] = useState('');
  const [price, setPrice] = useState('');
  const [availableFrom, setAvailableFrom] = useState('');
  const [bringAt, setBringAt] = useState(null);
  const [pickupAt, setPickupAt] = useState(null);
  const [optionalAvailabilityNote, setOptionalAvailabilityNote] = useState('');
  const [phoneCallAllowed, setPhoneCallAllowed] = useState(true);
  const [parts, setParts] = useState([]);
  const hydratedAvailabilityOfferIdRef = useRef(null);

  const [pickerModalVisible, setPickerModalVisible] = useState(false);
  const [pickerTarget, setPickerTarget] = useState(null);
  const [pickupSubPhase, setPickupSubPhase] = useState('shortcuts');
  const [bringCustomDateActive, setBringCustomDateActive] = useState(false);
  const [webCustomBringDateStr, setWebCustomBringDateStr] = useState('');
  const [workingDate, setWorkingDate] = useState(new Date());
  const [androidPhase, setAndroidPhase] = useState('date');
  const [androidPickerVisible, setAndroidPickerVisible] = useState(false);
  const [androidPickerContext, setAndroidPickerContext] = useState(null);

  const isWeb = Platform.OS === 'web';

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: existingOffer ? 'Update Offer' : 'Create Offer',
      headerBackTitleVisible: true,
    });
  }, [navigation, existingOffer]);

  const syncTotalFromLaborParts = useCallback((laborStr, partsStr) => {
    const next = formatTotalFromLaborParts(laborStr, partsStr);
    if (next !== null) setPrice(next);
  }, []);

  const resetPickerUi = () => {
    setPickerModalVisible(false);
    setPickerTarget(null);
    setPickupSubPhase('shortcuts');
    setBringCustomDateActive(false);
    setWebCustomBringDateStr('');
    setAndroidPickerVisible(false);
    setAndroidPickerContext(null);
    setAndroidPhase('date');
  };

  const openBringPicker = () => {
    const initial = bringAt || defaultDateAtHour(10, 0);
    setWorkingDate(new Date(initial.getTime()));
    setBringCustomDateActive(false);
    setWebCustomBringDateStr('');
    setPickerTarget('bring');
    setPickupSubPhase('shortcuts');
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
    const initial = pickupAt || new Date(bringAt.getTime() + 4 * 3600000);
    setWorkingDate(new Date(initial.getTime()));
    setPickupSubPhase('shortcuts');
    setPickerTarget('pickup');
    if (Platform.OS === 'android') {
      setPickerModalVisible(true);
      return;
    }
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

  const startAndroidPickupCustom = () => {
    setPickupSubPhase('shortcuts');
    setPickerModalVisible(false);
    setAndroidPickerContext('pickupCustom');
    setAndroidPhase('date');
    setWorkingDate(pickupAt ? new Date(pickupAt) : new Date(bringAt.getTime() + 4 * 3600000));
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

  const applyPickupDayFromBring = (daysAfterBring) => {
    if (!bringAt) return;
    const base = new Date(
      bringAt.getFullYear(),
      bringAt.getMonth(),
      bringAt.getDate() + daysAfterBring
    );
    setWorkingDate(mergeDateWithTimeOf(base, workingDate));
  };

  const onPickupShortcutPress = (key) => {
    if (key === 'custom') {
      if (Platform.OS === 'android') {
        startAndroidPickupCustom();
        return;
      }
      setPickupSubPhase('custom');
      setWorkingDate(
        pickupAt ? new Date(pickupAt) : new Date(bringAt.getTime() + 4 * 3600000)
      );
      return;
    }
    const next = pickupFromBringShortcut(bringAt, key);
    if (!next || next.getTime() <= bringAt.getTime()) {
      Alert.alert('Invalid times', 'Pickup/ready time must be after bring time.');
      return;
    }
    setPickupAt(next);
    resetPickerUi();
  };

  const confirmPickupCustom = () => {
    if (workingDate.getTime() <= bringAt.getTime()) {
      Alert.alert('Invalid times', 'Pickup/ready time must be after bring time.');
      return;
    }
    commitPickup(workingDate);
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
    console.log('🪵 DEBUG: existingOffer:', existingOffer);
    console.log('🪵 DEBUG: selectedOfferParts:', selectedOfferParts);

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
      console.log('🪵 DEBUG: initializing from selectedOfferParts');
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
    if (!price && existingOffer?.price) setPrice(existingOffer.price?.toString());
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

  const handleSubmit = async () => {
    if (!description || !repairId) {
      Alert.alert('Missing Info', 'Please provide a description and make sure repair ID is present');
      return;
    }

    if (bringAt && pickupAt && pickupAt.getTime() <= bringAt.getTime()) {
      Alert.alert('Invalid times', 'Pickup/ready time must be after bring time.');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('@access_token');
      const availability_note = buildScheduleAvailabilityNote(
        bringAt,
        pickupAt,
        optionalAvailabilityNote
      );
      const computedDuration = computeDurationMinutes(bringAt, pickupAt);

      const payload = {
        description,
        price: price ? parseFloat(price) : null,
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

  const renderBringModalBody = () => (
    <>
      <Text style={styles.modalSubtitle}>Date</Text>
      <View style={styles.chipRowWrap}>
        {BRING_QUICK_OFFSETS.map((opt) => (
          <Pressable
            key={opt.label}
            onPress={() => applyBringOffsetDays(opt.days)}
            style={styles.timeChip}
          >
            <Text style={styles.timeChipText}>{opt.label}</Text>
          </Pressable>
        ))}
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
          <Text style={styles.timeChipText}>Custom date</Text>
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
      <View style={styles.chipRowWrap}>
        {TIME_SLOTS.map((slot) => (
          <Pressable key={slot} onPress={() => applyWorkingTimeSlot(slot)} style={styles.timeChip}>
            <Text style={styles.timeChipText}>{slot}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.webPreview}>Selected: {formatPayloadDateTime(workingDate)}</Text>
    </>
  );

  const renderPickupModalBody = () => {
    if (pickupSubPhase === 'custom') {
      return (
        <>
          <Text style={styles.modalSubtitle}>Custom ready time</Text>
          {Platform.OS === 'ios' ? (
            <DateTimePicker
              value={workingDate}
              mode="datetime"
              display="spinner"
              onChange={onIosDateTimeChange}
            />
          ) : null}
          {isWeb ? (
            <>
              <Text style={styles.modalSubtitle}>Date (from bring day)</Text>
              <View style={styles.chipRowWrap}>
                {PICKUP_CUSTOM_DAY_OFFSETS.map((opt) => (
                  <Pressable
                    key={`p-${opt.label}`}
                    onPress={() => applyPickupDayFromBring(opt.days)}
                    style={styles.timeChip}
                  >
                    <Text style={styles.timeChipText}>{opt.label}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.modalSubtitle}>Time</Text>
              <View style={styles.chipRowWrap}>
                {TIME_SLOTS.map((slot) => (
                  <Pressable
                    key={`pt-${slot}`}
                    onPress={() => applyWorkingTimeSlot(slot)}
                    style={styles.timeChip}
                  >
                    <Text style={styles.timeChipText}>{slot}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.webPreview}>Selected: {formatPayloadDateTime(workingDate)}</Text>
            </>
          ) : null}
          <View style={styles.modalActions}>
            <Button onPress={() => setPickupSubPhase('shortcuts')}>Back</Button>
            <Button mode="contained" style={styles.modalDoneButton} onPress={confirmPickupCustom}>
              Done
            </Button>
          </View>
        </>
      );
    }
    return (
      <>
        <Text style={styles.modalSubtitle}>Pickup duration</Text>
        <View style={styles.shortcutCol}>
          {PICKUP_SHORTCUTS.map((s) => (
            <Pressable
              key={s.key}
              onPress={() => onPickupShortcutPress(s.key)}
              style={styles.shortcutRow}
            >
              <Text style={styles.shortcutRowText}>{s.label}</Text>
              <Text style={styles.selectorChevron}>›</Text>
            </Pressable>
          ))}
        </View>
      </>
    );
  };

  const modalTitle =
    pickerTarget === 'bring' ? 'Bring vehicle' : 'Pickup / ready';

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
        <AppCard style={styles.heroCard}>
          <Text style={styles.heroTitle}>{existingOffer ? 'Update proposal' : 'Create proposal'}</Text>
          <Text style={styles.heroSubtitle}>Send a service proposal to the client.</Text>
        </AppCard>

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
          <Text style={styles.sectionTitle}>Estimated pricing</Text>
          <Text style={styles.helperText}>
            Send an estimated repair price. Final pricing can be updated after inspection.
          </Text>
          <TextInput
            mode="outlined"
            label="Labor estimate"
            value={laborEstimate}
            onChangeText={(t) => {
              setLaborEstimate(t);
              syncTotalFromLaborParts(t, partsEstimate);
            }}
            keyboardType="decimal-pad"
            style={styles.input}
          />
          <TextInput
            mode="outlined"
            label="Parts estimate"
            value={partsEstimate}
            onChangeText={(t) => {
              setPartsEstimate(t);
              syncTotalFromLaborParts(laborEstimate, t);
            }}
            keyboardType="decimal-pad"
            style={styles.input}
          />
          <TextInput
            mode="outlined"
            label="Total estimate"
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
            style={styles.input}
          />
          <Text style={styles.helperText}>
            Total updates automatically from labor plus parts—you can adjust the total anytime.
          </Text>
        </FloatingCard>

        <FloatingCard style={styles.formCard}>
          <Text style={styles.sectionTitle}>Availability</Text>
          <Text style={[styles.helperText, { marginBottom: 12 }]}>
            Tell the client when to bring the vehicle and when it may be ready.
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
                  <Text style={styles.partMeta}>Estimated price: {part.price}</Text>
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
          {existingOffer ? 'Update Offer' : 'Send Offer'}
        </Button>
      </ScrollView>

      <Modal
        transparent
        animationType={isWeb ? 'fade' : 'slide'}
        visible={pickerModalVisible}
        onRequestClose={resetPickerUi}
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdropFill} onPress={resetPickerUi} />
          <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 16), maxHeight: '92%' }]}>
            <Text style={styles.modalTitle}>{modalTitle}</Text>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {pickerTarget === 'bring' ? renderBringModalBody() : renderPickupModalBody()}
            </ScrollView>
            {pickerTarget === 'bring' && Platform.OS === 'android' ? (
              <Button mode="outlined" onPress={startAndroidBringFullPicker} style={{ marginTop: 8 }}>
                Custom date & time (system picker)
              </Button>
            ) : null}
            {pickerTarget === 'bring' ? (
              <View style={styles.modalActions}>
                <Button onPress={resetPickerUi}>Cancel</Button>
                <Button mode="contained" style={styles.modalDoneButton} onPress={confirmBringModalDone}>
                  Done
                </Button>
              </View>
            ) : pickupSubPhase === 'shortcuts' ? (
              <View style={styles.modalActions}>
                <Button onPress={resetPickerUi}>Close</Button>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>

      {Platform.OS === 'android' && androidPickerVisible ? (
        <DateTimePicker
          key={`${androidPickerContext}-${androidPhase}`}
          value={workingDate}
          mode={androidPickerContext === 'bringCustomDate' ? 'date' : androidPhase}
          display="default"
          onChange={onAndroidDateTimeChange}
        />
      ) : null}
    </KeyboardAvoidingView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  heroCard: {
    marginBottom: 14,
    backgroundColor: COLORS.CARD_DARK,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  heroSubtitle: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.85)',
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
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalBackdropFill: {
    ...StyleSheet.absoluteFillObject,
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
    backgroundColor: 'rgba(33, 150, 243, 0.08)',
  },
  timeChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.TEXT_DARK,
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
