import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from '../../constants/colors';
import {
  factorIconColor,
  factorIconName,
  factorIsActionable,
  mileageConfidenceCategoryHint,
  warningIconColor,
} from '../../utils/mileageConfidence';
import {
  useTranslation,
  translateMileageConfidenceCategory,
  translateMileageFactorActionLabel,
  translateMileageFactorLabel,
  translateMileageWarningLabel,
  translateMileageConfidenceSummary,
} from '../../i18n';

const FALLBACK_CONFIDENCE = {
  category: 'low',
  category_label: 'Low confidence',
  summary: 'Not enough corroborating records yet.',
  factors: [
    {
      key: 'service_history_on_file',
      status: 'missing',
      label: 'No completed service records yet',
      action: 'log_service',
      action_label: 'Add service record',
    },
    {
      key: 'workshop_attributed_records',
      status: 'missing',
      label: 'No workshop named on service records yet',
      action: 'log_service',
      action_label: 'Log service with provider',
    },
    {
      key: 'service_center_confirmed_records',
      status: 'missing',
      label: 'No shop-confirmed records yet',
      action: 'log_service',
      action_label: 'Add service record',
    },
  ],
  warnings: [],
};

function FactorRow({ factor, conf, onPress, interactive, t }) {
  const actionable = interactive && factorIsActionable(factor);
  const actionLabel = translateMileageFactorActionLabel(factor, t);
  const factorLabel = translateMileageFactorLabel(factor, conf, t);
  const content = (
    <>
      <MaterialCommunityIcons
        name={factorIconName(factor.status)}
        size={20}
        color={factorIconColor(factor.status)}
        style={styles.factorIcon}
      />
      <View style={styles.factorTextWrap}>
        <Text style={styles.factorLabel}>{factorLabel}</Text>
        {actionable && actionLabel ? (
          <Text style={styles.factorActionHint}>{actionLabel}</Text>
        ) : null}
      </View>
      {actionable ? (
        <MaterialCommunityIcons name="chevron-right" size={22} color={COLORS.PRIMARY} />
      ) : null}
    </>
  );

  if (!actionable) {
    return <View style={styles.factorRow}>{content}</View>;
  }

  return (
    <Pressable
      onPress={() => onPress?.(factor)}
      style={({ pressed }) => [styles.factorRow, styles.factorRowTappable, pressed && styles.factorRowPressed]}
      accessibilityRole="button"
      accessibilityLabel={`${factorLabel}. ${actionLabel || t('mileageConfidence.actions.open')}`}
    >
      {content}
    </Pressable>
  );
}

/**
 * Mileage evidence / confidence summary (`vehicle.mileage_confidence` from API).
 */
export default function MileageEvidenceCard({
  mileageConfidence,
  compact = false,
  helperText,
  interactive = false,
  onFactorPress,
  showCategoryTitle = true,
}) {
  const { t } = useTranslation();
  const conf =
    mileageConfidence && typeof mileageConfidence === 'object'
      ? mileageConfidence
      : FALLBACK_CONFIDENCE;
  const factors = Array.isArray(conf.factors) ? conf.factors : FALLBACK_CONFIDENCE.factors;
  const warnings = Array.isArray(conf.warnings) ? conf.warnings : [];
  const categoryLabel = translateMileageConfidenceCategory(conf.category, t);
  const resolvedHelper =
    helperText === undefined
      ? t('mileageConfidence.defaultHelper')
      : helperText;
  const summaryText = conf.summary ? translateMileageConfidenceSummary(conf, t) : null;

  return (
    <View>
      {resolvedHelper ? <Text style={styles.helper}>{resolvedHelper}</Text> : null}
      {showCategoryTitle ? (
        <Text style={styles.status}>{categoryLabel}</Text>
      ) : null}
      {summaryText ? (
        <Text style={[styles.summary, compact && styles.summaryCompact]}>{summaryText}</Text>
      ) : null}
      {mileageConfidenceCategoryHint(conf.category, t) ? (
        <Text style={styles.categoryHint}>{mileageConfidenceCategoryHint(conf.category, t)}</Text>
      ) : null}

      <View style={styles.factorList}>
        {factors.map((f) => (
          <FactorRow
            key={f.key}
            factor={f}
            conf={conf}
            interactive={interactive}
            onPress={onFactorPress}
            t={t}
          />
        ))}
      </View>

      {warnings.length > 0 ? (
        <View style={styles.warningBlock}>
          {warnings.map((w) => (
            <View key={w.key} style={styles.factorRow}>
              <MaterialCommunityIcons
                name="alert-outline"
                size={18}
                color={warningIconColor()}
                style={styles.factorIcon}
              />
              <Text style={styles.warningLabel}>{translateMileageWarningLabel(w, t)}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  helper: {
    color: COLORS.TEXT_MUTED,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  status: {
    color: COLORS.TEXT_DARK,
    fontWeight: '700',
    fontSize: 15,
    marginBottom: 4,
  },
  summary: {
    color: COLORS.TEXT_DARK,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
  },
  summaryCompact: {
    fontSize: 13,
  },
  categoryHint: {
    color: COLORS.TEXT_MUTED,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
  },
  factorList: {
    marginTop: 4,
    gap: 4,
  },
  factorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    gap: 4,
  },
  factorRowTappable: {
    borderRadius: 10,
    backgroundColor: 'rgba(15,76,129,0.04)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15,76,129,0.12)',
    marginBottom: 2,
  },
  factorRowPressed: {
    backgroundColor: 'rgba(15,76,129,0.1)',
  },
  factorIcon: {
    marginRight: 4,
  },
  factorTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  factorLabel: {
    color: COLORS.TEXT_DARK,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '500',
  },
  factorActionHint: {
    color: COLORS.PRIMARY,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  warningBlock: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(15,23,42,0.12)',
    gap: 6,
  },
  warningLabel: {
    flex: 1,
    color: '#92400e',
    fontSize: 13,
    lineHeight: 18,
  },
});
