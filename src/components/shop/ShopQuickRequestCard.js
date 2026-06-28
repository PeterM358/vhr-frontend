import React, { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { View, StyleSheet, Pressable, Alert } from 'react-native';
import { Text, Button, TextInput, ActivityIndicator } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { COLORS } from '../../constants/colors';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import { createRepair } from '../../api/repairs';
import { collectShopRepairOptions } from '../../utils/shopRepairOptions';
import { buildVisitSlotOptions, formatPreferredVisitNote, buildPreferredVisitTimes } from '../../utils/shopVisitSlots';
import { parseOdometerKm } from '../../utils/finalizeMileageValidation';
import { formatShopDisplayName } from '../../utils/shopDisplayName';

const VISIBLE_SERVICE_CHIPS = 6;

const ShopQuickRequestCard = forwardRef(function ShopQuickRequestCard(
  {
    shop,
    shopId,
    vehicles = [],
    navigation,
    isLoggedIn = true,
    onClose,
    hideActions = false,
    onActionStateChange,
  },
  ref
) {
  const shopName = formatShopDisplayName(shop?.name || 'this shop');
  const repairOptions = useMemo(() => collectShopRepairOptions(shop), [shop]);
  const visitDays = useMemo(
    () => buildVisitSlotOptions(shop?.working_hours, { maxDays: 7 }),
    [shop?.working_hours]
  );

  const [vehicleId, setVehicleId] = useState(
    vehicles[0]?.id != null ? String(vehicles[0].id) : ''
  );
  const [repairTypeId, setRepairTypeId] = useState(
    repairOptions[0]?.id != null ? String(repairOptions[0].id) : ''
  );
  const [dayOffset, setDayOffset] = useState(visitDays[0]?.offset ?? 0);
  const [timeSlot, setTimeSlot] = useState(visitDays[0]?.slots?.[0] || '09:00');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [servicesExpanded, setServicesExpanded] = useState(false);

  const canSubmit = isLoggedIn && vehicles.length > 0 && !submitting;

  useEffect(() => {
    onActionStateChange?.({ submitting, canSubmit });
  }, [submitting, canSubmit, onActionStateChange]);

  const selectedDay =
    visitDays.find((row) => row.offset === dayOffset) || visitDays[0] || null;
  const timeSlots = selectedDay?.slots?.length ? selectedDay.slots : ['09:00'];
  const visibleRepairOptions =
    servicesExpanded || repairOptions.length <= VISIBLE_SERVICE_CHIPS
      ? repairOptions
      : repairOptions.slice(0, VISIBLE_SERVICE_CHIPS);

  const openFullRequest = () => {
    onClose?.();
    const selectedRepair = repairOptions.find((row) => String(row.id) === String(repairTypeId));
    navigation.navigate('CreateRepair', {
      vehicleId: vehicleId || undefined,
      repairTypeId: repairTypeId || undefined,
      targetingMode: 'selected_centers',
      selectedCenterIds: [Number(shopId)],
      description: selectedRepair ? `${selectedRepair.name} at ${shopName}` : `Request at ${shopName}`,
      availabilityNotes: formatPreferredVisitNote(selectedDay, timeSlot),
      symptoms: note.trim() || undefined,
      origin: 'ShopDetail',
      returnTo: 'ShopDetail',
      shopId: Number(shopId),
    });
  };

  const handleSubmit = async () => {
    if (!isLoggedIn) {
      Alert.alert('Sign in required', 'Please sign in to send a service request.');
      return;
    }
    if (!vehicles.length) {
      Alert.alert('Add a vehicle', 'Register a vehicle before requesting service.');
      return;
    }
    if (!vehicleId) {
      Alert.alert('Choose a vehicle', 'Select which vehicle this request is for.');
      return;
    }

    const selectedVehicle = vehicles.find((row) => String(row.id) === String(vehicleId));
    const selectedRepair = repairOptions.find((row) => String(row.id) === String(repairTypeId));
    const km =
      parseOdometerKm(selectedVehicle?.kilometers) ??
      parseOdometerKm(selectedVehicle?.final_kilometers) ??
      0;

    setSubmitting(true);
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const availabilityNotes = formatPreferredVisitNote(selectedDay, timeSlot);
      const preferredTimes = buildPreferredVisitTimes(selectedDay, timeSlot);
      const repairLabel = selectedRepair?.name || 'Service';
      const created = await createRepair(token, {
        vehicle: parseInt(vehicleId, 10),
        repair_type: repairTypeId ? parseInt(repairTypeId, 10) : null,
        description: `${repairLabel} at ${shopName}`,
        symptoms: note.trim() || null,
        availability_notes: availabilityNotes || null,
        client_preferred_start: preferredTimes.start,
        client_preferred_end: preferredTimes.end,
        kilometers: km,
        status: 'open',
        source: 'marketplace_request',
        request_targeting_mode: 'selected_centers',
        preferred_service_centers: [Number(shopId)],
        repair_parts_data: [],
      });

      onClose?.();
      Alert.alert(
        'Request sent',
        'The shop will review your request and confirm date and time before you should bring your vehicle.',
        [
          {
            text: 'View request',
            onPress: () => navigation.navigate('RepairDetail', { repairId: created.id }),
          },
          { text: 'OK', style: 'cancel' },
        ]
      );
    } catch (error) {
      Alert.alert('Could not send request', error.message || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  useImperativeHandle(ref, () => ({
    handleSubmit,
    openFullRequest,
    submitting,
    canSubmit,
  }));

  if (!isLoggedIn) {
    return (
      <View style={styles.body}>
        <Text style={styles.subtitle}>
          Sign in to ask {shopName} for a quote and preferred visit time.
        </Text>
        <Button
          mode="contained"
          onPress={() => {
            onClose?.();
            navigation.navigate('Login');
          }}
          style={styles.primaryBtn}
        >
          Sign in to request
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.body}>
      <Text style={styles.subtitle}>
        Pick a service and preferred visit. The shop can accept or decline — wait for their confirmation
        before you drive over.
      </Text>

      <View style={styles.notice}>
        <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#b45309" />
        <Text style={styles.noticeText}>
          Your preferred time is not booked until the center confirms.
        </Text>
      </View>

      {vehicles.length > 1 ? (
        <>
          <Text style={styles.fieldLabel}>Vehicle</Text>
          <View style={styles.chipRow}>
            {vehicles.map((item) => {
              const selected = String(item.id) === String(vehicleId);
              return (
                <Pressable
                  key={item.id}
                  onPress={() => setVehicleId(String(item.id))}
                  style={[styles.chip, selected && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {item.make_name} {item.model_name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}

      {repairOptions.length ? (
        <>
          <Text style={styles.fieldLabel}>Service</Text>
          <View style={styles.chipRow}>
            {visibleRepairOptions.map((item) => {
              const selected = String(item.id) === String(repairTypeId);
              return (
                <Pressable
                  key={item.id}
                  onPress={() => setRepairTypeId(String(item.id))}
                  style={[styles.chip, selected && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{item.name}</Text>
                </Pressable>
              );
            })}
          </View>
          {repairOptions.length > VISIBLE_SERVICE_CHIPS ? (
            <Button
              mode="text"
              compact
              onPress={() => setServicesExpanded((value) => !value)}
              style={styles.expandBtn}
            >
              {servicesExpanded ? 'Show fewer' : `Show all ${repairOptions.length} services`}
            </Button>
          ) : null}
        </>
      ) : (
        <Text style={styles.helperMuted}>This shop has not listed specific services yet.</Text>
      )}

      <Text style={styles.fieldLabel}>Preferred visit</Text>
      <View style={styles.chipRow}>
        {visitDays.map((day) => {
          const selected = day.offset === dayOffset;
          return (
            <Pressable
              key={day.offset}
              onPress={() => {
                setDayOffset(day.offset);
                if (!day.slots.includes(timeSlot)) {
                  setTimeSlot(day.slots[0] || '09:00');
                }
              }}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{day.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {selectedDay ? (
        <Text style={styles.hoursHint}>Shop hours: {selectedDay.hoursLabel}</Text>
      ) : null}

      <View style={styles.chipRow}>
        {timeSlots.map((slot) => {
          const selected = slot === timeSlot;
          return (
            <Pressable
              key={slot}
              onPress={() => setTimeSlot(slot)}
              style={[styles.chip, styles.timeChip, selected && styles.chipSelected]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{slot}</Text>
            </Pressable>
          );
        })}
      </View>

      <TextInput
        mode="outlined"
        label="Notes (optional)"
        value={note}
        onChangeText={setNote}
        placeholder="Brake noise, specific parts, etc."
        style={styles.noteInput}
        multiline
      />

      {hideActions ? null : (
        <>
          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={submitting}
            disabled={!canSubmit}
            style={styles.primaryBtn}
          >
            Send request
          </Button>
          <Button mode="text" onPress={openFullRequest} disabled={submitting} style={styles.secondaryBtn}>
            More options (photos, details)
          </Button>
          {submitting ? <ActivityIndicator style={styles.loader} color={COLORS.PRIMARY} /> : null}
        </>
      )}
    </View>
  );
});

export default ShopQuickRequestCard;

const styles = StyleSheet.create({
  body: {
    paddingBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.TEXT_MUTED,
    marginBottom: 10,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: '#9a3412',
    fontWeight: '600',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.TEXT_MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
    marginTop: 4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.12)',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipSelected: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: 'rgba(37,99,235,0.1)',
  },
  chipText: {
    fontSize: 13,
    color: COLORS.TEXT_DARK,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: COLORS.PRIMARY,
  },
  timeChip: {
    minWidth: 58,
    alignItems: 'center',
  },
  hoursHint: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
    marginBottom: 6,
  },
  helperMuted: {
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  expandBtn: {
    alignSelf: 'flex-start',
    marginTop: -4,
    marginBottom: 4,
  },
  noteInput: {
    marginTop: 4,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  primaryBtn: {
    marginTop: 4,
  },
  secondaryBtn: {
    marginTop: 2,
  },
  loader: {
    marginTop: 8,
  },
});
