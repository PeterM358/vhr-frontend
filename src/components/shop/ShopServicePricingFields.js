/**
 * Shared shop service pricing editor: Parts (from/to) + Labor (from/to) +
 * typical labor time (single or range). Used by BOTH the Price List expand row
 * (ShopServiceMenuScreen) and the Profile operations pricing modal
 * (ShopOperationsPricingSection) so the two surfaces share identical logic.
 *
 * Controlled component. `value` shape:
 *   {
 *     parts_from, parts_to, labor_from, labor_to,   // money strings
 *     typical_labor_minutes, typical_labor_minutes_to, // numbers | null
 *     disclaimer,                                    // string
 *   }
 * Emits partial patches via onChange(patch).
 */

import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text, TextInput, Switch } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { COLORS } from '../../constants/colors';
import { useTranslation } from '../../i18n';
import { computeClientTotalLabel } from '../../utils/servicePricingSummary';
import {
  DURATION_PRESETS_MINUTES,
  DURATION_STEP_MINUTES,
  adjustDurationMinutes,
  formatDurationPresetLabel,
  formatDurationRangeMinutes,
  formatLaborHoursCompact,
} from '../../utils/laborDuration';

export function DurationStepper({ label, value, onChange, t }) {
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

export default function ShopServicePricingFields({
  value,
  onChange,
  showDisclaimer = false,
  showTotal = true,
}) {
  const { t } = useTranslation();
  const draft = value || {};

  const durationFrom = Math.max(0, Math.round(Number(draft.typical_labor_minutes) || 0));
  const durationTo = Math.max(0, Math.round(Number(draft.typical_labor_minutes_to) || 0));
  const useDurationRange = draft.typical_labor_minutes_to != null;

  const patch = (next) => onChange && onChange(next);

  const handleToggleRange = (enabled) => {
    if (enabled) {
      const base = durationFrom > 0 ? durationFrom : 30;
      patch({
        typical_labor_minutes: base,
        typical_labor_minutes_to: Math.max(base, base + DURATION_STEP_MINUTES),
      });
    } else {
      patch({
        typical_labor_minutes: durationFrom > 0 ? durationFrom : 30,
        typical_labor_minutes_to: null,
      });
    }
  };

  const rangeError =
    useDurationRange && durationFrom > 0 && durationTo > 0 && durationTo < durationFrom;
  const rangePreview =
    useDurationRange && durationFrom > 0 && durationTo > 0
      ? formatDurationRangeMinutes(durationFrom, durationTo)
      : null;

  const totalLabel = showTotal ? computeClientTotalLabel(draft, t) : null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>{t('servicePricingForm.partsLabel')}</Text>
      <Text style={styles.sectionHint}>{t('servicePricingForm.partsHint')}</Text>
      <View style={styles.priceRow}>
        <TextInput
          label={t('servicePricingForm.partsFrom')}
          mode="outlined"
          dense
          keyboardType="decimal-pad"
          placeholder="30"
          value={draft.parts_from ?? ''}
          onChangeText={(v) => patch({ parts_from: v })}
          style={styles.halfInput}
        />
        <TextInput
          label={t('servicePricingForm.partsTo')}
          mode="outlined"
          dense
          keyboardType="decimal-pad"
          placeholder="80"
          value={draft.parts_to ?? ''}
          onChangeText={(v) => patch({ parts_to: v })}
          style={styles.halfInput}
        />
      </View>

      <Text style={styles.sectionTitle}>{t('servicePricingForm.laborLabel')}</Text>
      <Text style={styles.sectionHint}>{t('servicePricingForm.laborHint')}</Text>
      <View style={styles.priceRow}>
        <TextInput
          label={t('servicePricingForm.laborFrom')}
          mode="outlined"
          dense
          keyboardType="decimal-pad"
          placeholder="40"
          value={draft.labor_from ?? ''}
          onChangeText={(v) => patch({ labor_from: v })}
          style={styles.halfInput}
        />
        <TextInput
          label={t('servicePricingForm.laborTo')}
          mode="outlined"
          dense
          keyboardType="decimal-pad"
          placeholder="90"
          value={draft.labor_to ?? ''}
          onChangeText={(v) => patch({ labor_to: v })}
          style={styles.halfInput}
        />
      </View>

      <Text style={styles.sectionTitle}>{t('servicePricingForm.timeLabel')}</Text>
      <View style={styles.switchRow}>
        <View style={styles.switchCopy}>
          <Text style={styles.switchLabel}>{t('servicePricingForm.useRange')}</Text>
          <Text style={styles.switchHint}>{t('servicePricingForm.useRangeHint')}</Text>
        </View>
        <Switch value={useDurationRange} onValueChange={handleToggleRange} />
      </View>

      {useDurationRange ? (
        <>
          <DurationStepper
            label={t('servicePricingForm.durationFrom')}
            value={durationFrom}
            onChange={(next) => patch({ typical_labor_minutes: next })}
            t={t}
          />
          <DurationStepper
            label={t('servicePricingForm.durationTo')}
            value={durationTo}
            onChange={(next) => patch({ typical_labor_minutes_to: next })}
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
          label={null}
          value={durationFrom}
          onChange={(next) => patch({ typical_labor_minutes: next })}
          t={t}
        />
      )}

      {rangeError ? (
        <Text style={styles.error}>{t('servicePricingForm.rangeInvalid')}</Text>
      ) : null}

      {totalLabel ? <Text style={styles.total}>{totalLabel}</Text> : null}

      {showDisclaimer ? (
        <TextInput
          label={t('servicePricingForm.noteLabel')}
          mode="outlined"
          dense
          multiline
          value={draft.disclaimer ?? ''}
          onChangeText={(v) => patch({ disclaimer: v })}
          style={styles.fullInput}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
    marginTop: 4,
  },
  sectionHint: {
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.TEXT_MUTED,
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    gap: 10,
  },
  halfInput: {
    flex: 1,
    backgroundColor: '#fff',
  },
  fullInput: {
    backgroundColor: '#fff',
    marginTop: 4,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
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
    marginBottom: 4,
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
    backgroundColor: 'rgba(15,76,129,0.1)',
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
    marginBottom: 4,
  },
  error: {
    color: '#b91c1c',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  total: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.TEXT_DARK,
    marginTop: 2,
  },
});
