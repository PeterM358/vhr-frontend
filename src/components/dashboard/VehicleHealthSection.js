import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, Button } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import FloatingCard from '../ui/FloatingCard';
import { COLORS } from '../../constants/colors';
import {
  mapHealthFromApi,
  vehicleDisplayTitle,
  applyActiveRepairHealthOverride,
} from '../../utils/vehicleHealthStatus';
import { useTranslation } from '../../i18n';

const MAX_VISIBLE = 3;

function repairVehicleId(repair) {
  const raw = repair?.vehicle ?? repair?.vehicle_id ?? null;
  if (raw == null) return null;
  if (typeof raw === 'object') {
    const nested = raw.id ?? raw.pk ?? null;
    return nested == null ? null : Number(nested);
  }
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function primaryIssueLabel(health, t) {
  const firstReason = (health?.reasons || [])[0];
  if (firstReason?.label) return firstReason.label;
  if (health?.shortReason && health.shortReason !== health.status_label) {
    return health.shortReason;
  }
  return health?.status_label || health?.label || t('common.allClear');
}

function primaryCtaLabel(hasActiveRepair, t) {
  if (hasActiveRepair) return t('dashboard.health.viewRequest');
  return t('dashboard.health.requestService');
}

export default function VehicleHealthSection({
  vehicles = [],
  activeRepairs = [],
  onVehiclePress,
  onViewAllPress,
  onRequestService,
  onViewRepair,
}) {
  const { t } = useTranslation();

  const rows = useMemo(
    () =>
      vehicles.slice(0, MAX_VISIBLE).map((vehicle) => {
        const health = applyActiveRepairHealthOverride(
          mapHealthFromApi(vehicle, t),
          vehicle.id,
          activeRepairs
        );
        const activeRepair = (activeRepairs || []).find(
          (repair) => repairVehicleId(repair) === Number(vehicle.id)
        );
        return { vehicle, health, activeRepair };
      }),
    [vehicles, activeRepairs, t]
  );

  if (!vehicles.length) {
    return (
      <FloatingCard accent={false} style={styles.emptyCard}>
        <Text style={styles.emptyTitle}>{t('dashboard.health.noVehiclesTitle')}</Text>
        <Text style={styles.emptyBody}>{t('dashboard.health.noVehiclesBody')}</Text>
      </FloatingCard>
    );
  }

  return (
    <View style={styles.list}>
      {rows.map(({ vehicle, health, activeRepair }) => {
        const title = vehicleDisplayTitle(vehicle, t);
        const issue = primaryIssueLabel(health, t);
        const ctaLabel = primaryCtaLabel(Boolean(activeRepair), t);

        const handlePrimaryPress = () => {
          if (activeRepair?.id) {
            onViewRepair?.(activeRepair.id);
            return;
          }
          onRequestService?.(vehicle);
        };

        return (
          <FloatingCard
            key={String(vehicle.id)}
            statusAccent={health.status}
            style={styles.card}
            onPress={() => onVehiclePress?.(vehicle)}
            accessibilityRole="button"
            accessibilityLabel={t('dashboard.health.openVehicleA11y', { vehicle: title })}
          >
            <View style={styles.row}>
              <View style={styles.copy}>
                <Text style={styles.vehicleTitle} numberOfLines={1}>
                  {title}
                </Text>
                <View style={styles.statusRow}>
                  <MaterialCommunityIcons name={health.icon} size={14} color={health.color} />
                  <Text style={[styles.statusLabel, { color: health.color }]} numberOfLines={1}>
                    {health.status_label || health.label}
                  </Text>
                </View>
                <Text style={styles.issue} numberOfLines={1}>
                  {issue}
                </Text>
              </View>
              <Button
                mode="contained"
                compact
                onPress={(e) => {
                  e?.stopPropagation?.();
                  handlePrimaryPress();
                }}
                style={styles.primaryCta}
                labelStyle={styles.primaryCtaLabel}
              >
                {ctaLabel}
              </Button>
            </View>
          </FloatingCard>
        );
      })}
      {vehicles.length > MAX_VISIBLE ? (
        <Button mode="text" onPress={onViewAllPress} style={styles.viewAllBtn} labelStyle={styles.viewAllLabel}>
          {t('dashboard.health.viewAll')}
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 0,
  },
  card: {
    marginBottom: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  emptyCard: {
    paddingVertical: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  vehicleTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
  },
  issue: {
    marginTop: 2,
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
    lineHeight: 16,
  },
  primaryCta: {
    borderRadius: 10,
    flexShrink: 0,
  },
  primaryCtaLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginVertical: 0,
  },
  viewAllBtn: {
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  viewAllLabel: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
    marginBottom: 6,
  },
  emptyBody: {
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
    lineHeight: 19,
  },
});
