import React, { useMemo } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import FloatingCard from '../ui/FloatingCard';

const STATUS_THEME = {
  healthy: {
    accent: '#34d399',
    border: 'rgba(52,211,153,0.45)',
    bg: 'rgba(11,18,32,0.88)',
  },
  maintenance_recommended: {
    accent: '#fb923c',
    border: 'rgba(251,146,60,0.5)',
    bg: 'rgba(11,18,32,0.9)',
  },
  needs_attention: {
    accent: '#f87171',
    border: 'rgba(248,113,113,0.55)',
    bg: 'rgba(11,18,32,0.92)',
  },
};

const REASON_ROW_MAP = {
  no_oil_service_history: {
    id: 'oil',
    label: 'Oil service',
    icon: 'engine-oil',
    button: 'Add',
    actionKey: 'add_service_history',
  },
  oil_service_overdue: {
    id: 'oil',
    label: 'Oil service',
    icon: 'engine-oil',
    button: 'Configure',
    actionKey: 'schedule_maintenance',
  },
  oil_service_due_soon: {
    id: 'oil',
    label: 'Oil service',
    icon: 'engine-oil',
    button: 'Configure',
    actionKey: 'schedule_maintenance',
  },
  no_brake_check_history: {
    id: 'brake',
    label: 'Brake history',
    icon: 'car-brake-alert',
    button: 'Add',
    actionKey: 'add_service_history',
  },
  brake_check_overdue: {
    id: 'brake',
    label: 'Brake service',
    icon: 'car-brake-alert',
    button: 'Configure',
    actionKey: 'schedule_maintenance',
  },
  brake_check_due_soon: {
    id: 'brake',
    label: 'Brake service',
    icon: 'car-brake-alert',
    button: 'Configure',
    actionKey: 'schedule_maintenance',
  },
  no_reminders: {
    id: 'reminders',
    label: 'Reminders',
    icon: 'bell-outline',
    button: 'Setup',
    actionKey: 'configure_reminders',
  },
  mileage_missing: {
    id: 'mileage',
    label: 'Mileage',
    icon: 'speedometer',
    button: 'Update',
    actionKey: 'update_km',
  },
  mileage_stale: {
    id: 'mileage',
    label: 'Mileage',
    icon: 'speedometer-slow',
    button: 'Update',
    actionKey: 'update_km',
  },
  active_repairs: {
    id: 'active_repairs',
    label: 'Active repairs',
    icon: 'wrench',
    button: 'Book',
    actionKey: 'book_repair',
  },
  denied_repairs: {
    id: 'denied_repairs',
    label: 'Repair request',
    icon: 'close-circle-outline',
    button: 'Book',
    actionKey: 'book_repair',
  },
};

function buildHealthRows(reasons) {
  const rows = [];
  const seen = new Set();
  for (const reason of reasons || []) {
    const base = REASON_ROW_MAP[reason.key];
    if (base) {
      if (seen.has(base.id)) continue;
      seen.add(base.id);
      rows.push({ ...base, reasonKey: reason.key, severity: reason.severity });
      continue;
    }
    if (String(reason.key || '').startsWith('obligation_overdue_')) {
      if (seen.has('obligation')) continue;
      seen.add('obligation');
      rows.push({
        id: 'obligation',
        label: 'Obligations',
        icon: 'shield-alert-outline',
        button: 'Setup',
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
      style={({ pressed }) => [styles.inlineBtn, pressed && styles.inlineBtnPressed, { borderColor: accent }]}
      accessibilityRole="button"
    >
      <Text style={[styles.inlineBtnText, { color: accent }]}>{label}</Text>
    </Pressable>
  );
}

export default function VehicleHealthCard({ health, onAction }) {
  const rows = useMemo(() => buildHealthRows(health?.reasons), [health?.reasons]);

  if (!health) return null;

  const theme = STATUS_THEME[health.status] || STATUS_THEME.healthy;
  const isHealthy = health.status === 'healthy';
  const showPrimaryCta =
    !isHealthy &&
    (health.reasons || []).some((row) => String(row.key || '').includes('history'));

  return (
    <FloatingCard
      style={[
        styles.card,
        {
          backgroundColor: theme.bg,
          borderWidth: 1,
          borderColor: theme.border,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <MaterialCommunityIcons name={health.icon} size={20} color={theme.accent} />
        <Text style={[styles.statusTitle, { color: theme.accent }]}>
          {health.status_label || health.label}
        </Text>
      </View>
      <Text style={styles.subtitle}>{health.subtitle}</Text>

      {rows.length ? (
        <View style={styles.rowList}>
          {rows.map((row) => (
            <View key={row.id} style={styles.statusRow}>
              <MaterialCommunityIcons name={row.icon} size={18} color={theme.accent} style={styles.rowIcon} />
              <Text style={styles.rowLabel} numberOfLines={1}>
                {row.label}
              </Text>
              <View style={styles.rowDots} />
              <InlineAction
                label={row.button}
                accent={theme.accent}
                onPress={() => onAction?.(row.actionKey, row)}
              />
            </View>
          ))}
        </View>
      ) : isHealthy ? (
        <View style={styles.healthyRow}>
          <MaterialCommunityIcons name="check-circle-outline" size={18} color="#34d399" />
          <Text style={styles.healthyText}>No urgent issues found.</Text>
        </View>
      ) : null}

      {showPrimaryCta ? (
        <Button
          mode="contained"
          compact
          onPress={() => onAction?.('add_service_history', null)}
          style={styles.primaryCta}
          labelStyle={styles.primaryCtaLabel}
          buttonColor={theme.accent}
          textColor="#0b1220"
        >
          Add service history
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
    color: 'rgba(255,255,255,0.75)',
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
    color: '#fff',
  },
  rowDots: {
    flex: 1,
    minWidth: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.18)',
    marginBottom: 4,
    marginHorizontal: 4,
  },
  inlineBtn: {
    minHeight: 32,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    justifyContent: 'center',
  },
  inlineBtnPressed: {
    opacity: 0.85,
    backgroundColor: 'rgba(255,255,255,0.08)',
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
    color: 'rgba(255,255,255,0.85)',
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
