import React, { useMemo } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import FloatingCard from '../ui/FloatingCard';
import { COLORS } from '../../constants/colors';
import { getHealthStatusAccent } from '../../utils/vehicleHealthStatus';
import {
  useTranslation,
  translateHealthAction,
  translateHealthDomainLabel,
  translateHealthInlineAction,
} from '../../i18n';

const REASON_ROW_MAP = {
  no_oil_service_history: {
    id: 'oil',
    domainId: 'oil',
    icon: 'engine-oil',
    actionKey: 'add_service_history',
  },
  oil_service_overdue: {
    id: 'oil',
    domainId: 'oil',
    icon: 'engine-oil',
    actionKey: 'schedule_maintenance',
  },
  oil_service_due_soon: {
    id: 'oil',
    domainId: 'oil',
    icon: 'engine-oil',
    actionKey: 'schedule_maintenance',
  },
  no_brake_check_history: {
    id: 'brake',
    domainId: 'brake_history',
    icon: 'car-brake-alert',
    actionKey: 'add_service_history',
  },
  brake_check_overdue: {
    id: 'brake',
    domainId: 'brake',
    icon: 'car-brake-alert',
    actionKey: 'schedule_maintenance',
  },
  brake_check_due_soon: {
    id: 'brake',
    domainId: 'brake',
    icon: 'car-brake-alert',
    actionKey: 'schedule_maintenance',
  },
  no_reminders: {
    id: 'reminders',
    domainId: 'reminders',
    icon: 'bell-outline',
    actionKey: 'configure_reminders',
  },
  mileage_missing: {
    id: 'mileage',
    domainId: 'mileage',
    icon: 'speedometer',
    actionKey: 'update_km',
  },
  mileage_stale: {
    id: 'mileage',
    domainId: 'mileage',
    icon: 'speedometer-slow',
    actionKey: 'update_km',
  },
  active_repairs: {
    id: 'active_repairs',
    domainId: 'active_repairs',
    icon: 'wrench',
    actionKey: 'book_repair',
  },
  denied_repairs: {
    id: 'denied_repairs',
    domainId: 'denied_repairs',
    icon: 'close-circle-outline',
    actionKey: 'book_repair',
  },
};

function buildHealthRows(reasons, translateFn) {
  const rows = [];
  const seen = new Set();
  for (const reason of reasons || []) {
    const base = REASON_ROW_MAP[reason.key];
    if (base) {
      if (seen.has(base.id)) continue;
      seen.add(base.id);
      rows.push({
        ...base,
        label: translateHealthDomainLabel(base.domainId, base.domainId, translateFn),
        button: translateHealthInlineAction(base.actionKey, base.actionKey, translateFn),
        reasonKey: reason.key,
        severity: reason.severity,
      });
      continue;
    }
    if (String(reason.key || '').startsWith('obligation_overdue_')) {
      if (seen.has('obligation')) continue;
      seen.add('obligation');
      rows.push({
        id: 'obligation',
        label: translateHealthDomainLabel('obligations', 'Obligations', translateFn),
        icon: 'shield-alert-outline',
        button: translateHealthInlineAction('configure_reminders', 'Setup', translateFn),
        actionKey: 'configure_reminders',
        reasonKey: reason.key,
        severity: reason.severity,
      });
    }
  }
  return rows;
}

function InlineAction({ label, accent, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.inlineBtn,
        pressed && styles.inlineBtnPressed,
        { borderColor: accent.color, backgroundColor: accent.bgTint },
      ]}
      accessibilityRole="button"
    >
      <Text style={[styles.inlineBtnText, { color: accent.color }]}>{label}</Text>
    </Pressable>
  );
}

export default function VehicleHealthCard({ health, onAction }) {
  const { t } = useTranslation();
  const rows = useMemo(() => buildHealthRows(health?.reasons, t), [health?.reasons, t]);

  if (!health) return null;

  const accent = getHealthStatusAccent(health.status);
  const isHealthy = health.status === 'healthy';
  const showPrimaryCta =
    !isHealthy &&
    (health.reasons || []).some((row) => String(row.key || '').includes('history'));

  return (
    <FloatingCard statusAccent={health.status} style={styles.card}>
      <View style={styles.headerRow}>
        <MaterialCommunityIcons name={health.icon} size={20} color={accent.color} />
        <Text style={[styles.statusTitle, { color: accent.color }]}>
          {health.status_label || health.label}
        </Text>
      </View>
      <Text style={styles.subtitle}>{health.subtitle}</Text>

      {rows.length ? (
        <View style={styles.rowList}>
          {rows.map((row) => (
            <View key={row.id} style={styles.statusRow}>
              <MaterialCommunityIcons name={row.icon} size={18} color={accent.color} style={styles.rowIcon} />
              <Text style={styles.rowLabel} numberOfLines={1}>
                {row.label}
              </Text>
              <View style={styles.rowDots} />
              <InlineAction
                label={row.button}
                accent={accent}
                onPress={() => onAction?.(row.actionKey, row)}
              />
            </View>
          ))}
        </View>
      ) : isHealthy ? (
        <View style={styles.healthyRow}>
          <MaterialCommunityIcons name="check-circle-outline" size={18} color={accent.color} />
          <Text style={styles.healthyText}>{t('health.subtitle.healthy')}</Text>
        </View>
      ) : null}

      {showPrimaryCta ? (
        <Button
          mode="contained"
          compact
          onPress={() => onAction?.('add_service_history', null)}
          style={styles.primaryCta}
          labelStyle={styles.primaryCtaLabel}
          buttonColor={accent.color}
          textColor="#fff"
        >
          {translateHealthAction('add_service_history', t)}
        </Button>
      ) : null}
    </FloatingCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 14,
    paddingVertical: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
    lineHeight: 18,
    marginBottom: 12,
  },
  rowList: {
    gap: 8,
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 34,
    gap: 8,
  },
  rowIcon: {
    width: 20,
  },
  rowLabel: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.TEXT_DARK,
  },
  rowDots: {
    flex: 1,
    minWidth: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(15,23,42,0.12)',
    marginBottom: 4,
    marginHorizontal: 4,
  },
  inlineBtn: {
    minHeight: 32,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
  },
  inlineBtnPressed: {
    opacity: 0.85,
  },
  inlineBtnText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  healthyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  healthyText: {
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
  },
  primaryCta: {
    marginTop: 12,
    alignSelf: 'stretch',
    borderRadius: 10,
  },
  primaryCtaLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginVertical: 4,
  },
});
