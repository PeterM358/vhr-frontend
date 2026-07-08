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
  return repair?.vehicle ?? repair?.vehicle_id ?? null;
}

function primaryIssueLabel(health, t) {
  const firstReason = (health?.reasons || [])[0];
  if (firstReason?.label) return firstReason.label;
  if (health?.shortReason && health.shortReason !== health.status_label) {
    return health.shortReason;
  }
  return health?.status_label || health?.label || t('common.allClear');
}

function primaryCtaLabel(health, hasActiveRepair, t) {
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
          (repair) => Number(repairVehicleId(repair)) === Number(vehicle.id)
        );
        return { vehicle, health, activeRepair };
      }),
    [vehicles, activeRepairs, t]
  );

  if (!vehicles.length) {
    return (
      <FloatingCard accent={false}>
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
        const ctaLabel = primaryCtaLabel(health, Boolean(activeRepair), t);

        const handlePrimaryPress = () => {
          if (activeRepair?.id) {
            onViewRepair?.(activeRepair.id);
            return;
          }
          onRequestService?.(vehicle);
        };

        return (
          <FloatingCard key={String(vehicle.id)} statusAccent={health.status} style={styles.card}>
            <View style={styles.headerRow}>
              <View style={styles.titleBlock}>
                <Text style={styles.vehicleTitle}>{title}</Text>
                <View style={styles.statusRow}>
                  <MaterialCommunityIcons name={health.icon} size={16} color={health.color} />
                  <Text style={[styles.statusLabel, { color: health.color }]}>
                    {health.status_label || health.label}
                  </Text>
                </View>
              </View>
              <Button mode="text" compact onPress={() => onVehiclePress?.(vehicle)} labelStyle={styles.linkLabel}>
                {t('common.view')}
              </Button>
            </View>

            <Text style={styles.issue} numberOfLines={2}>
              {issue}
            </Text>

            <Button
              mode="contained"
              compact
              onPress={handlePrimaryPress}
              style={styles.primaryCta}
              labelStyle={styles.primaryCtaLabel}
            >
              {ctaLabel}
            </Button>
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
    marginBottom: 10,
    paddingVertical: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  vehicleTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  linkLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  issue: {
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
    lineHeight: 18,
    marginBottom: 10,
  },
  primaryCta: {
    alignSelf: 'flex-start',
    borderRadius: 10,
  },
  primaryCtaLabel: {
    fontSize: 13,
    fontWeight: '700',
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
