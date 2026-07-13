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
import { navigateToRepairRequestNew } from '../../navigation/webNavigation';
import { useTranslation } from '../../i18n';

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
    repairType,
    vehicleType,
  },
  ref
) {
  const { t, locale } = useTranslation();
  const shopName = formatShopDisplayName(shop?.name || 'this shop');
  const repairOptions = useMemo(() => collectShopRepairOptions(shop), [shop]);
  const visitDays = useMemo(
    () => buildVisitSlotOptions(shop?.working_hours, { maxDays: 7, t, locale }),
    [shop?.working_hours, t, locale]
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
    navigateToRepairRequestNew(navigation, {
      serviceCenter: shopId,
      repairType: repairType || selectedRepair?.slug || undefined,
      vehicleType,
      vehicleId: vehicleId || undefined,
      repairTypeId: repairTypeId || undefined,
      description: selectedRepair
        ? t('serviceCenters.quickRequest.descriptionAtShop', {
            service: selectedRepair.name,
            shop: shopName,
          })
        : t('serviceCenters.quickRequest.requestAtShop', { shop: shopName }),
      availabilityNotes: formatPreferredVisitNote(selectedDay, timeSlot, t),
      symptoms: note.trim() || undefined,
    });
  };

  const handleSubmit = async () => {
    if (!isLoggedIn) {
      Alert.alert(
        t('serviceCenters.quickRequest.signInRequiredTitle'),
        t('serviceCenters.quickRequest.signInRequiredBody')
      );
      return;
    }
    if (!vehicles.length) {
      Alert.alert(
        t('serviceCenters.quickRequest.addVehicleTitle'),
        t('serviceCenters.quickRequest.addVehicleBody')
      );
      return;
    }
    if (!vehicleId) {
      Alert.alert(
        t('serviceCenters.quickRequest.chooseVehicleTitle'),
        t('serviceCenters.quickRequest.chooseVehicleBody')
      );
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
      const availabilityNotes = formatPreferredVisitNote(selectedDay, timeSlot, t);
      const preferredTimes = buildPreferredVisitTimes(selectedDay, timeSlot);
      const repairLabel = selectedRepair?.name || t('serviceCenters.quickRequest.defaultServiceLabel');
      const created = await createRepair(token, {
        vehicle: parseInt(vehicleId, 10),
        repair_type: repairTypeId ? parseInt(repairTypeId, 10) : null,
        description: t('serviceCenters.quickRequest.descriptionAtShop', {
          service: repairLabel,
          shop: shopName,
        }),
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
        t('serviceCenters.quickRequest.requestSentTitle'),
        t('serviceCenters.quickRequest.requestSentBody'),
        [
          {
            text: t('serviceCenters.quickRequest.viewRequest'),
            onPress: () => navigation.navigate('RepairDetail', { repairId: created.id }),
          },
          { text: t('common.ok'), style: 'cancel' },
        ]
      );
    } catch (error) {
      Alert.alert(
        t('serviceCenters.quickRequest.requestFailedTitle'),
        error.message || t('serviceCenters.quickRequest.requestFailedBody')
      );
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
          {t('serviceCenters.quickRequest.signInSubtitle', { shopName })}
        </Text>
        <Button
          mode="contained"
          onPress={() => {
            onClose?.();
            navigateToRepairRequestNew(navigation, {
              serviceCenter: shopId,
              repairType,
              vehicleType,
            });
          }}
          style={styles.primaryBtn}
        >
          {t('serviceCenters.quickRequest.signInToRequest')}
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.body}>
      <Text style={styles.subtitle}>{t('serviceCenters.quickRequest.subtitle')}</Text>

      <View style={styles.notice}>
        <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#b45309" />
        <Text style={styles.noticeText}>{t('serviceCenters.quickRequest.notice')}</Text>
      </View>

      {vehicles.length > 1 ? (
        <>
          <Text style={styles.fieldLabel}>{t('vehicles.vehicle')}</Text>
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
          <Text style={styles.fieldLabel}>{t('common.service')}</Text>
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
              {servicesExpanded
                ? t('serviceCenters.quickRequest.showFewer')
                : t('serviceCenters.quickRequest.showAllServices', { count: repairOptions.length })}
            </Button>
          ) : null}
        </>
      ) : (
        <Text style={styles.helperMuted}>{t('serviceCenters.quickRequest.noServicesListed')}</Text>
      )}

      <Text style={styles.fieldLabel}>{t('repairs.preferredVisit')}</Text>
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
        <Text style={styles.hoursHint}>
          {t('serviceCenters.quickRequest.shopHours', { hours: selectedDay.hoursLabel })}
        </Text>
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
        label={t('serviceCenters.quickRequest.notesLabel')}
        value={note}
        onChangeText={setNote}
        placeholder={t('serviceCenters.quickRequest.notesPlaceholder')}
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
            {t('repairs.sendRequest')}
          </Button>
          <Button mode="text" onPress={openFullRequest} disabled={submitting} style={styles.secondaryBtn}>
            {t('serviceCenters.quickRequest.moreOptions')}
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
