import React, { useMemo, useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text, TextInput, Button, Portal, Dialog, Switch } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';

import { COLORS } from '../../constants/colors';
import { useTranslation } from '../../i18n';
import { navigateToPartnerServices } from '../../navigation/webNavigation';
import { getOperationIcon } from '../../icons/operationIconRegistry';
import { translateRepairTypeLabel } from '../../utils/translateShopTypeLabels';
import {
  DURATION_PRESETS_MINUTES,
  DURATION_STEP_MINUTES,
  adjustDurationMinutes,
  formatDurationPresetLabel,
  formatDurationRangeMinutes,
  formatLaborHoursCompact,
  formatTypicalLaborTime,
  parseDurationMinutesInput,
} from '../../utils/laborDuration';

function menuItemForType(menuItems, repairTypeId) {
  return (menuItems || []).find((row) => Number(row.repair_type) === Number(repairTypeId));
}

function itemHasPrice(item) {
  if (!item) return false;
  return (
    item.labor_from != null ||
    item.labor_to != null ||
    item.price_from != null ||
    item.price_to != null
  );
}

function resolveInitialMinutes(existing, row) {
  if (existing?.typical_labor_minutes != null) return Number(existing.typical_labor_minutes);
  if (row?.default_labor_minutes != null) return Number(row.default_labor_minutes);
  return 30;
}

function laborPriceSummary(item, t) {
  if (!item) return t('partnerProfile.priceMissing');
  // Published menu amounts are labor only.
  const from = item.labor_from ?? item.price_from;
  const to = item.labor_to ?? item.price_to;
  const laborTime = formatTypicalLaborTime(
    item.typical_labor_minutes,
    item.typical_labor_minutes_to
  );
  const priceBits = [];
  if (from != null && to != null && String(from) !== String(to)) {
    priceBits.push(t('partnerProfile.laborPriceRange', { from, to }));
  } else if (from != null) {
    priceBits.push(t('partnerProfile.laborPriceFrom', { price: from }));
  } else if (to != null) {
    priceBits.push(t('partnerProfile.laborPriceFrom', { price: to }));
  } else {
    priceBits.push(t('partnerProfile.priceMissing'));
  }
  if (laborTime) priceBits.unshift(laborTime);
  return priceBits.join(' · ');
}

function DurationStepper({ label, value, onChange, t }) {
  const minutes = Math.max(0, Math.round(Number(value) || 0));
  const selectedPreset = DURATION_PRESETS_MINUTES.includes(minutes) ? minutes : null;

  return (
    <View style={styles.durationBlock}>
      {label ? <Text style={styles.durationLabel}>{label}</Text> : null}
      <View style={styles.presetWrap}>
        {DURATION_PRESETS_MINUTES.map((preset) => {
          const selected = selectedPreset === preset;
          return (
            <Pressable
              key={preset}
              onPress={() => onChange(preset)}
              style={[styles.presetChip, selected && styles.presetChipSelected]}
            >
              <Text style={[styles.presetChipText, selected && styles.presetChipTextSelected]}>
                {formatDurationPresetLabel(preset)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.stepperRow}>
        <Pressable
          onPress={() => onChange(adjustDurationMinutes(minutes, -DURATION_STEP_MINUTES))}
          style={styles.stepperBtn}
          accessibilityLabel={t('partnerProfile.durationMinus15')}
        >
          <MaterialCommunityIcons name="minus" size={20} color={COLORS.TEXT_DARK} />
          <Text style={styles.stepperBtnText}>15</Text>
        </Pressable>
        <TextInput
          label={t('partnerProfile.customMinutes')}
          mode="outlined"
          keyboardType="number-pad"
          value={minutes > 0 ? String(minutes) : ''}
          onChangeText={(text) => {
            const digits = String(text || '').replace(/[^\d]/g, '');
            if (digits === '') {
              onChange(0);
              return;
            }
            const parsed = parseInt(digits, 10);
            onChange(Number.isFinite(parsed) ? parsed : 0);
          }}
          style={styles.customMinutesInput}
          dense
        />
        <Pressable
          onPress={() => onChange(adjustDurationMinutes(minutes, DURATION_STEP_MINUTES))}
          style={styles.stepperBtn}
          accessibilityLabel={t('partnerProfile.durationPlus15')}
        >
          <MaterialCommunityIcons name="plus" size={20} color={COLORS.TEXT_DARK} />
          <Text style={styles.stepperBtnText}>15</Text>
        </Pressable>
      </View>
      {minutes > 0 ? (
        <Text style={styles.durationPreview}>
          {formatLaborHoursCompact(minutes) || `${minutes} min`}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * Operations & Pricing: select repair types and capture typical labor time + price range.
 * Writes via onUpsertOperationPricing (labor_from/to + typical_labor_minutes[_to]).
 * Typical labor is not estimated vehicle completion time.
 */
export default function ShopOperationsPricingSection({
  styles: parentStyles,
  repairTypesByCategory = [],
  selectedServices = [],
  serviceMenuItems = [],
  onToggleService,
  onUpsertOperationPricing,
  savingPricing = false,
}) {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const [pricingTarget, setPricingTarget] = useState(null);
  const [useDurationRange, setUseDurationRange] = useState(false);
  const [durationMin, setDurationMin] = useState(30);
  const [durationFrom, setDurationFrom] = useState(30);
  const [durationTo, setDurationTo] = useState(45);
  const [durationError, setDurationError] = useState('');
  const [priceFrom, setPriceFrom] = useState('');
  const [priceTo, setPriceTo] = useState('');

  const openPricing = (row, { ensureSelected = false } = {}) => {
    const existing = menuItemForType(serviceMenuItems, row.id);
    const initial = resolveInitialMinutes(existing, row);
    const hasRange =
      existing?.typical_labor_minutes != null &&
      existing?.typical_labor_minutes_to != null &&
      Number(existing.typical_labor_minutes_to) !== Number(existing.typical_labor_minutes);
    setPricingTarget({ row, ensureSelected });
    setUseDurationRange(hasRange);
    setDurationMin(initial);
    setDurationFrom(initial);
    setDurationTo(
      hasRange
        ? Number(existing.typical_labor_minutes_to)
        : Math.max(initial, initial + DURATION_STEP_MINUTES)
    );
    setDurationError('');
    const from = existing?.labor_from ?? existing?.price_from;
    const to = existing?.labor_to ?? existing?.price_to;
    setPriceFrom(from != null ? String(from) : '');
    setPriceTo(to != null ? String(to) : '');
  };

  const handleChipPress = (row) => {
    const id = Number(row.id);
    const selected = selectedServices.includes(id);
    if (selected) {
      onToggleService(id);
      return;
    }
    openPricing(row, { ensureSelected: true });
  };

  const handleToggleDurationRange = (enabled) => {
    setDurationError('');
    if (enabled) {
      const base = durationMin > 0 ? durationMin : 30;
      setDurationFrom(base);
      setDurationTo(Math.max(base, base + DURATION_STEP_MINUTES));
    } else {
      setDurationMin(durationFrom > 0 ? durationFrom : 30);
    }
    setUseDurationRange(enabled);
  };

  const handleSavePricing = async () => {
    if (!pricingTarget || !onUpsertOperationPricing) return;

    let typicalMinutes = null;
    let typicalMinutesTo = null;
    if (useDurationRange) {
      const fromRaw = Math.round(Number(durationFrom) || 0);
      const toRaw = Math.round(Number(durationTo) || 0);
      const from = fromRaw > 0 ? fromRaw : null;
      const to = toRaw > 0 ? toRaw : null;
      if (from != null && to != null && to < from) {
        setDurationError(t('partnerProfile.durationRangeInvalid'));
        return;
      }
      if ((from == null) !== (to == null)) {
        setDurationError(t('partnerProfile.durationRequired'));
        return;
      }
      typicalMinutes = from;
      typicalMinutesTo = to != null && to !== from ? to : null;
    } else {
      typicalMinutes = parseDurationMinutesInput(durationMin);
      typicalMinutesTo = null;
    }
    setDurationError('');

    const from = String(priceFrom || '').trim().replace(',', '.');
    const to = String(priceTo || '').trim().replace(',', '.');
    const fromNum = from === '' ? null : parseFloat(from);
    const toNum = to === '' ? null : parseFloat(to);
    try {
      await onUpsertOperationPricing({
        repairType: pricingTarget.row,
        ensureSelected: pricingTarget.ensureSelected,
        typical_labor_minutes: typicalMinutes,
        typical_labor_minutes_to: typicalMinutesTo,
        labor_from: Number.isFinite(fromNum) ? fromNum : null,
        labor_to: Number.isFinite(toNum) ? toNum : null,
      });
      setPricingTarget(null);
    } catch {
      // Keep modal open; parent already surfaced the error.
    }
  };

  const selectedMissingPrice = useMemo(() => {
    return selectedServices.filter((id) => {
      const item = menuItemForType(serviceMenuItems, id);
      return !itemHasPrice(item);
    }).length;
  }, [selectedServices, serviceMenuItems]);

  const rangePreview =
    useDurationRange && durationFrom > 0 && durationTo > 0
      ? formatDurationRangeMinutes(durationFrom, durationTo)
      : null;

  return (
    <View>
      <Text style={parentStyles?.helperText}>
        {t('partnerProfile.operationsHelper')}
      </Text>
      <Text style={parentStyles?.helperMuted}>
        {t('partnerProfile.operationsExamples')}
      </Text>
      <Pressable
        onPress={() => navigateToPartnerServices(navigation)}
        style={styles.priceListLink}
        accessibilityRole="link"
        accessibilityLabel={t('partnerProfile.editFullPriceList')}
      >
        <MaterialCommunityIcons name="clipboard-list-outline" size={16} color={COLORS.PRIMARY} />
        <Text style={styles.priceListLinkText}>{t('partnerProfile.editFullPriceList')}</Text>
        <MaterialCommunityIcons name="chevron-right" size={18} color={COLORS.PRIMARY} />
      </Pressable>
      {selectedMissingPrice > 0 ? (
        <Text style={styles.warning}>
          {t('partnerProfile.operationsMissingPrices', { count: selectedMissingPrice })}
        </Text>
      ) : null}

      {repairTypesByCategory.map(([category, rows]) => (
        <View key={category} style={parentStyles?.categoryBlock || styles.categoryBlock}>
          <Text style={parentStyles?.categoryTitle || styles.categoryTitle}>{category}</Text>
          <View style={parentStyles?.chipWrap || styles.chipWrap}>
            {rows.map((row) => {
              const selected = selectedServices.includes(Number(row.id));
              const item = menuItemForType(serviceMenuItems, row.id);
              const priced = itemHasPrice(item);
              return (
                <Pressable
                  key={row.id}
                  onPress={() => handleChipPress(row)}
                  onLongPress={() => openPricing(row)}
                  style={[
                    parentStyles?.chip || styles.chip,
                    selected && (parentStyles?.chipSelected || styles.chipSelected),
                    selected && !priced && styles.chipNeedsPrice,
                  ]}
                >
                  <View style={parentStyles?.serviceChipInner || styles.serviceChipInner}>
                    <MaterialCommunityIcons
                      name={getOperationIcon(row)}
                      size={16}
                      color={selected ? COLORS.PRIMARY : COLORS.TEXT_MUTED}
                    />
                    <View style={styles.chipTextCol}>
                      <Text
                        style={[
                          parentStyles?.chipText || styles.chipText,
                          selected && (parentStyles?.chipTextSelected || styles.chipTextSelected),
                        ]}
                      >
                        {translateRepairTypeLabel(row, t)}
                      </Text>
                      {selected ? (
                        <Text style={styles.priceLine}>{laborPriceSummary(item, t)}</Text>
                      ) : null}
                    </View>
                    {selected ? (
                      <Pressable
                        onPress={(e) => {
                          e?.stopPropagation?.();
                          openPricing(row);
                        }}
                        hitSlop={8}
                      >
                        <MaterialCommunityIcons
                          name="pencil-outline"
                          size={16}
                          color={COLORS.PRIMARY}
                        />
                      </Pressable>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}

      {!repairTypesByCategory.length ? (
        <Text style={parentStyles?.helperMuted}>
          {t('partnerProfile.operationsLoading')}
        </Text>
      ) : null}

      <Portal>
        <Dialog visible={!!pricingTarget} onDismiss={() => setPricingTarget(null)}>
          <Dialog.Title>
            {pricingTarget
              ? translateRepairTypeLabel(pricingTarget.row, t)
              : t('partnerProfile.operationsPricingTitle')}
          </Dialog.Title>
          <Dialog.ScrollArea style={styles.dialogScroll}>
            <View style={styles.dialogBody}>
              <Text style={styles.dialogHint}>{t('partnerProfile.operationsPricingHint')}</Text>
              <Text style={styles.dialogHint}>{t('partnerProfile.operationsPartsHint')}</Text>

              <View style={styles.switchRow}>
                <View style={styles.switchCopy}>
                  <Text style={styles.switchLabel}>{t('partnerProfile.useDurationRange')}</Text>
                  <Text style={styles.switchHint}>{t('partnerProfile.useDurationRangeHint')}</Text>
                </View>
                <Switch value={useDurationRange} onValueChange={handleToggleDurationRange} />
              </View>

              {useDurationRange ? (
                <>
                  <DurationStepper
                    label={t('partnerProfile.durationFrom')}
                    value={durationFrom}
                    onChange={(next) => {
                      setDurationError('');
                      setDurationFrom(next);
                    }}
                    t={t}
                  />
                  <DurationStepper
                    label={t('partnerProfile.durationTo')}
                    value={durationTo}
                    onChange={(next) => {
                      setDurationError('');
                      setDurationTo(next);
                    }}
                    t={t}
                  />
                  {rangePreview ? (
                    <Text style={styles.rangePreview}>
                      {t('partnerProfile.durationRangePreview', { range: rangePreview })}
                    </Text>
                  ) : null}
                </>
              ) : (
                <DurationStepper
                  label={t('partnerProfile.typicalLaborTime')}
                  value={durationMin}
                  onChange={(next) => {
                    setDurationError('');
                    setDurationMin(next);
                  }}
                  t={t}
                />
              )}

              {durationError ? <Text style={styles.durationError}>{durationError}</Text> : null}

              <Text style={styles.durationLabel}>{t('partnerProfile.laborPriceSection')}</Text>
              <View style={styles.priceRow}>
                <TextInput
                  label={t('partnerProfile.laborFrom')}
                  mode="outlined"
                  keyboardType="decimal-pad"
                  value={priceFrom}
                  onChangeText={setPriceFrom}
                  style={[styles.dialogInput, styles.priceInput]}
                  placeholder="40"
                />
                <TextInput
                  label={t('partnerProfile.laborTo')}
                  mode="outlined"
                  keyboardType="decimal-pad"
                  value={priceTo}
                  onChangeText={setPriceTo}
                  style={[styles.dialogInput, styles.priceInput]}
                  placeholder="70"
                />
              </View>
            </View>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setPricingTarget(null)}>{t('common.cancel')}</Button>
            <Button loading={savingPricing} disabled={savingPricing} onPress={handleSavePricing}>
              {t('common.save')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  priceListLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: 4,
    marginBottom: 12,
    paddingVertical: 4,
  },
  priceListLinkText: {
    color: COLORS.PRIMARY,
    fontSize: 14,
    fontWeight: '700',
  },
  warning: {
    color: '#92400e',
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  categoryBlock: {
    marginBottom: 12,
  },
  categoryTitle: {
    color: COLORS.TEXT_DARK,
    fontWeight: '700',
    marginBottom: 6,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.12)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#fff',
    maxWidth: '100%',
  },
  chipSelected: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: 'rgba(37,99,235,0.08)',
  },
  chipNeedsPrice: {
    borderColor: '#f59e0b',
    backgroundColor: '#fffbeb',
  },
  serviceChipInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chipTextCol: {
    flexShrink: 1,
  },
  chipText: {
    color: COLORS.TEXT_DARK,
    fontWeight: '600',
    fontSize: 13,
  },
  chipTextSelected: {
    color: COLORS.PRIMARY,
  },
  priceLine: {
    color: COLORS.TEXT_MUTED,
    fontSize: 11,
    marginTop: 2,
  },
  dialogScroll: {
    maxHeight: 420,
    paddingHorizontal: 0,
  },
  dialogBody: {
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  dialogHint: {
    color: COLORS.TEXT_MUTED,
    fontSize: 13,
    marginBottom: 10,
    lineHeight: 18,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  switchCopy: {
    flex: 1,
  },
  switchLabel: {
    color: COLORS.TEXT_DARK,
    fontWeight: '700',
    fontSize: 13,
  },
  switchHint: {
    color: COLORS.TEXT_MUTED,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  durationBlock: {
    marginBottom: 12,
  },
  durationLabel: {
    color: COLORS.TEXT_DARK,
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 8,
  },
  presetWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  presetChip: {
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.14)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: '#fff',
    minHeight: 36,
    justifyContent: 'center',
  },
  presetChipSelected: {
    borderColor: COLORS.PRIMARY,
    backgroundColor: 'rgba(37,99,235,0.1)',
  },
  presetChipText: {
    color: COLORS.TEXT_DARK,
    fontSize: 12,
    fontWeight: '600',
  },
  presetChipTextSelected: {
    color: COLORS.PRIMARY,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepperBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minWidth: 56,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.14)',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
  },
  stepperBtnText: {
    color: COLORS.TEXT_DARK,
    fontSize: 12,
    fontWeight: '700',
  },
  customMinutesInput: {
    flex: 1,
    backgroundColor: '#fff',
  },
  durationPreview: {
    color: COLORS.TEXT_MUTED,
    fontSize: 12,
    marginTop: 6,
  },
  rangePreview: {
    color: COLORS.TEXT_MUTED,
    fontSize: 12,
    marginBottom: 8,
  },
  durationError: {
    color: '#b91c1c',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  dialogInput: {
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  priceRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  priceInput: {
    flex: 1,
  },
});
