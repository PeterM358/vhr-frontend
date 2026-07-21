import React, { useMemo, useState } from 'react';
import { View, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Text, Button, Portal, Dialog } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';

import { COLORS } from '../../constants/colors';
import { useTranslation } from '../../i18n';
import { navigateToPartnerServices } from '../../navigation/webNavigation';
import { getOperationIcon } from '../../icons/operationIconRegistry';
import { translateRepairTypeLabel } from '../../utils/translateShopTypeLabels';
import ShopServicePricingFields from './ShopServicePricingFields';
import {
  serviceMenuSummaryLine,
  parsePricingMoney,
} from '../../utils/servicePricingSummary';

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

function chipPriceSummary(item, t) {
  if (!itemHasPrice(item)) return t('partnerProfile.priceMissing');
  return serviceMenuSummaryLine(item, t);
}

/**
 * Operations & Pricing: select repair types and capture parts + labor + typical
 * labor time. Uses the shared ShopServicePricingFields editor so this modal and
 * the full Price List (ShopServiceMenuScreen) share identical pricing logic.
 * Writes via onUpsertOperationPricing (parts_from/to + labor_from/to +
 * typical_labor_minutes[_to]). Typical labor is not vehicle-ready completion time.
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
  const [pricingValue, setPricingValue] = useState(null);
  const [saveError, setSaveError] = useState('');

  const openPricing = (row, { ensureSelected = false } = {}) => {
    const existing = menuItemForType(serviceMenuItems, row.id);
    const initial = resolveInitialMinutes(existing, row);
    const hasRange =
      existing?.typical_labor_minutes != null &&
      existing?.typical_labor_minutes_to != null &&
      Number(existing.typical_labor_minutes_to) !== Number(existing.typical_labor_minutes);
    // Legacy labor-only rows have price_* but no parts_*; only fall back to
    // price_* for labor when there are no parts (so parts are never double-counted).
    const partsAbsent = existing?.parts_from == null && existing?.parts_to == null;
    const laborFromVal = existing?.labor_from ?? (partsAbsent ? existing?.price_from : null);
    const laborToVal = existing?.labor_to ?? (partsAbsent ? existing?.price_to : null);
    setPricingTarget({ row, ensureSelected });
    setPricingValue({
      parts_from: existing?.parts_from != null ? String(existing.parts_from) : '',
      parts_to: existing?.parts_to != null ? String(existing.parts_to) : '',
      labor_from: laborFromVal != null ? String(laborFromVal) : '',
      labor_to: laborToVal != null ? String(laborToVal) : '',
      typical_labor_minutes: existing?.typical_labor_minutes != null ? Number(existing.typical_labor_minutes) : initial,
      typical_labor_minutes_to: hasRange ? Number(existing.typical_labor_minutes_to) : null,
    });
    setSaveError('');
  };

  const closePricing = () => {
    setPricingTarget(null);
    setPricingValue(null);
    setSaveError('');
  };

  // Tapping a chip opens the pricing editor and (for a not-yet-offered service)
  // marks it as offered on save. It must NOT toggle an offered service off —
  // removing an operation is a separate action (the trailing remove button).
  const handleChipPress = (row) => {
    const id = Number(row.id);
    const selected = selectedServices.includes(id);
    openPricing(row, { ensureSelected: !selected });
  };

  const handleSavePricing = async () => {
    if (!pricingTarget || !onUpsertOperationPricing || !pricingValue) return;

    const fromMin = Math.round(Number(pricingValue.typical_labor_minutes) || 0);
    const hasRange = pricingValue.typical_labor_minutes_to != null;
    const toMin = hasRange ? Math.round(Number(pricingValue.typical_labor_minutes_to) || 0) : null;
    if (toMin != null && fromMin > 0 && toMin > 0 && toMin < fromMin) {
      setSaveError(t('servicePricingForm.rangeInvalid'));
      return;
    }
    const typicalMinutes = fromMin > 0 ? fromMin : null;
    const typicalMinutesTo = toMin != null && toMin > 0 && toMin !== fromMin ? toMin : null;
    setSaveError('');

    try {
      await onUpsertOperationPricing({
        repairType: pricingTarget.row,
        ensureSelected: pricingTarget.ensureSelected,
        typical_labor_minutes: typicalMinutes,
        typical_labor_minutes_to: typicalMinutesTo,
        parts_from: parsePricingMoney(pricingValue.parts_from),
        parts_to: parsePricingMoney(pricingValue.parts_to),
        labor_from: parsePricingMoney(pricingValue.labor_from),
        labor_to: parsePricingMoney(pricingValue.labor_to),
      });
      closePricing();
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
                        <Text style={styles.priceLine}>{chipPriceSummary(item, t)}</Text>
                      ) : null}
                    </View>
                    {selected ? (
                      <View style={styles.chipActions}>
                        <Pressable
                          onPress={(e) => {
                            e?.stopPropagation?.();
                            openPricing(row);
                          }}
                          hitSlop={8}
                          accessibilityLabel={t('partnerProfile.editPricing')}
                        >
                          <MaterialCommunityIcons
                            name="pencil-outline"
                            size={16}
                            color={COLORS.PRIMARY}
                          />
                        </Pressable>
                        <Pressable
                          onPress={(e) => {
                            e?.stopPropagation?.();
                            onToggleService(Number(row.id));
                          }}
                          hitSlop={8}
                          accessibilityLabel={t('partnerProfile.removeOperation')}
                        >
                          <MaterialCommunityIcons
                            name="close-circle-outline"
                            size={16}
                            color={COLORS.TEXT_MUTED}
                          />
                        </Pressable>
                      </View>
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
        <Dialog visible={!!pricingTarget} onDismiss={closePricing}>
          <Dialog.Title>
            {pricingTarget
              ? translateRepairTypeLabel(pricingTarget.row, t)
              : t('partnerProfile.operationsPricingTitle')}
          </Dialog.Title>
          <Dialog.ScrollArea style={styles.dialogScroll}>
            <ScrollView
              contentContainerStyle={styles.dialogBody}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
            >
              <Text style={styles.dialogHint}>{t('partnerProfile.operationsPricingHint')}</Text>

              {pricingValue ? (
                <ShopServicePricingFields
                  value={pricingValue}
                  onChange={(patch) => {
                    setSaveError('');
                    setPricingValue((prev) => ({ ...(prev || {}), ...patch }));
                  }}
                />
              ) : null}

              {saveError ? <Text style={styles.durationError}>{saveError}</Text> : null}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={closePricing}>{t('common.cancel')}</Button>
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
  chipActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    maxHeight: 460,
    paddingHorizontal: 0,
  },
  dialogBody: {
    paddingHorizontal: 24,
    paddingTop: 4,
    paddingBottom: 24,
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
