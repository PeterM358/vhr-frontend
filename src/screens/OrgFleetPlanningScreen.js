import React, { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, Button, Text } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';

import ScreenBackground from '../components/ScreenBackground';
import AppCard from '../components/ui/AppCard';
import OrgAppHeader from '../components/org/OrgAppHeader';
import { getFleetPlanning } from '../api/orgOperations';
import { resolveActiveOrganizationId } from '../utils/orgWorkspace';
import {
  navigateToOrgCreateTask,
  navigateToOrgHome,
  navigateToOrgTasks,
} from '../navigation/webNavigation';
import { useTranslation } from '../i18n';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { useScrollContentBottomPadding } from '../utils/mobileWebInsets';

const ON_CARD = '#0F172A';
const ON_CARD_MUTED = '#475569';
const DAY_W = 28;
const LABEL_W = 108;
const ROW_H = 36;

function currentMonthIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function shiftMonth(monthIso, delta) {
  const [y, m] = String(monthIso).split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function daysInMonth(monthIso) {
  const [y, m] = String(monthIso).split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return Array.from({ length: last }, (_, i) => i + 1);
}

function isoDay(monthIso, day) {
  const [y, m] = String(monthIso).split('-');
  return `${y}-${m}-${String(day).padStart(2, '0')}`;
}

function dayOverlapsSpan(dayIso, span) {
  const start = span?.start || span?.scheduled_date;
  const end = span?.end || span?.scheduled_end_date || start;
  if (!start) return false;
  return dayIso >= start && dayIso <= (end || start);
}

function statusColor(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'done') return '#94A3B8';
  if (s === 'in_progress') return '#0EA5E9';
  if (s === 'assigned') return '#6366F1';
  return '#F59E0B';
}

export default function OrgFleetPlanningScreen({ navigation, route }) {
  const { t } = useTranslation();
  const routeOrgId = route?.params?.organizationId || route?.params?.orgId;
  const scrollBottomPadding = useScrollContentBottomPadding(40);
  const { width: winW } = useWindowDimensions();

  const [orgId, setOrgId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [month, setMonth] = useState(
    () => route?.params?.month || currentMonthIso(),
  );
  const [payload, setPayload] = useState(null);
  const [idleOnly, setIdleOnly] = useState(false);
  const [selection, setSelection] = useState(null);

  const onBack = useCallback(() => {
    navigateToOrgHome(navigation, { orgId: routeOrgId || orgId });
  }, [navigation, orgId, routeOrgId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const resolved = await resolveActiveOrganizationId(routeOrgId);
      setOrgId(resolved);
      if (!resolved) {
        setPayload(null);
        setError(t('org.fleetPlanning.loadError', null, 'Could not load planning.'));
        return;
      }
      const data = await getFleetPlanning(token, resolved, { month });
      setPayload(data);
    } catch (e) {
      setPayload(null);
      setError(e.message || t('org.fleetPlanning.loadError', null, 'Could not load planning.'));
    } finally {
      setLoading(false);
    }
  }, [month, routeOrgId, t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const days = useMemo(() => daysInMonth(month), [month]);

  const vehicles = useMemo(() => {
    const rows = Array.isArray(payload?.vehicles) ? payload.vehicles : [];
    if (!idleOnly) return rows;
    return rows.filter((row) => Number(row.idle_days) > 0);
  }, [idleOnly, payload]);

  const openCreate = useCallback(
    ({ vehicleId, scheduledDate, scheduledEndDate } = {}) => {
      const id = routeOrgId || orgId;
      navigateToOrgCreateTask(navigation, {
        orgId: id,
        organizationId: id,
        vehicleId: vehicleId || undefined,
        scheduledDate: scheduledDate || undefined,
        scheduledEndDate: scheduledEndDate || undefined,
        returnTo: 'OrgFleetPlanning',
        returnMonth: month,
      });
    },
    [navigation, month, orgId, routeOrgId],
  );

  const openTask = useCallback(
    (workOrderId) => {
      navigateToOrgTasks(navigation, {
        orgId: routeOrgId || orgId,
        taskId: workOrderId,
      });
    },
    [navigation, orgId, routeOrgId],
  );

  const onEmptyDayPress = useCallback(
    (vehicle, day) => {
      const dayIso = isoDay(month, day);
      if (
        selection &&
        String(selection.vehicleId) === String(vehicle.id) &&
        selection.start &&
        dayIso !== selection.start
      ) {
        const start = selection.start < dayIso ? selection.start : dayIso;
        const end = selection.start < dayIso ? dayIso : selection.start;
        setSelection(null);
        openCreate({
          vehicleId: vehicle.id,
          scheduledDate: start,
          scheduledEndDate: end === start ? undefined : end,
        });
        return;
      }
      setSelection({ vehicleId: vehicle.id, start: dayIso, end: dayIso });
    },
    [month, openCreate, selection],
  );

  const createFromSelection = useCallback(() => {
    if (!selection?.vehicleId || !selection?.start) {
      openCreate({});
      return;
    }
    openCreate({
      vehicleId: selection.vehicleId,
      scheduledDate: selection.start,
      scheduledEndDate:
        selection.end && selection.end !== selection.start ? selection.end : undefined,
    });
    setSelection(null);
  }, [openCreate, selection]);

  const gridMinWidth = LABEL_W + days.length * DAY_W;
  const boardWidth = Math.max(winW - 32, gridMinWidth);

  return (
    <ScreenBackground>
      <OrgAppHeader
        title={t('org.fleetPlanning.title', null, 'Fleet planning')}
        onBack={onBack}
      />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: scrollBottomPadding }]}
        keyboardShouldPersistTaps="handled"
      >
        <AppCard style={styles.card}>
          <Text style={styles.hint}>
            {t(
              'org.fleetPlanning.hint',
              null,
              'Vehicles × days. Tap an empty day (twice for a range) to create a task — the bar is the task.',
            )}
          </Text>
          <View style={styles.monthRow}>
            <Button compact onPress={() => setMonth((m) => shiftMonth(m, -1))}>
              ‹
            </Button>
            <Text style={styles.monthLabel}>{month}</Text>
            <Button compact onPress={() => setMonth((m) => shiftMonth(m, 1))}>
              ›
            </Button>
            <Button compact onPress={() => setMonth(currentMonthIso())}>
              {t('org.fleetPlanning.today', null, 'Today')}
            </Button>
          </View>
          <View style={styles.actions}>
            <Button
              mode={idleOnly ? 'contained' : 'outlined'}
              compact
              onPress={() => setIdleOnly((v) => !v)}
              labelStyle={!idleOnly ? styles.outlinedLabel : undefined}
            >
              {t('org.fleetPlanning.idleOnly', null, 'Idle only')}
            </Button>
            {payload?.can_create_task ? (
              <Button mode="contained" compact onPress={createFromSelection}>
                {selection?.start
                  ? t('org.fleetPlanning.createSelected', null, 'Create task')
                  : t('org.fleetPlanning.newTask', null, 'New task')}
              </Button>
            ) : null}
          </View>
          {selection?.start ? (
            <Text style={styles.selectionHint}>
              {t(
                'org.fleetPlanning.selectionHint',
                {
                  start: selection.start,
                  end: selection.end || selection.start,
                },
                `Selected ${selection.start} → ${selection.end || selection.start}. Tap another day on the same truck for a range, or Create.`,
              )}
            </Text>
          ) : null}
        </AppCard>

        {loading ? (
          <ActivityIndicator style={styles.loader} />
        ) : error ? (
          <AppCard style={styles.card}>
            <Text style={styles.error}>{error}</Text>
            <Button onPress={load}>{t('common.retry', null, 'Retry')}</Button>
          </AppCard>
        ) : !vehicles.length ? (
          <AppCard style={styles.card}>
            <Text style={styles.helper}>
              {t(
                'org.fleetPlanning.empty',
                null,
                'No vehicles in this fleet yet. Add vehicles in Fleet first.',
              )}
            </Text>
          </AppCard>
        ) : (
          <AppCard style={[styles.card, styles.boardCard]}>
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View style={{ minWidth: boardWidth }}>
                <View style={styles.headerRow}>
                  <View style={[styles.labelCell, styles.headerLabel]}>
                    <Text style={styles.headerText}>
                      {t('org.fleetPlanning.vehicleCol', null, 'Vehicle')}
                    </Text>
                  </View>
                  {days.map((d) => (
                    <View key={`h-${d}`} style={styles.dayCell}>
                      <Text style={styles.dayHeader}>{d}</Text>
                    </View>
                  ))}
                </View>
                {vehicles.map((vehicle) => (
                  <View key={vehicle.id} style={styles.row}>
                    <View style={styles.labelCell}>
                      <Text style={styles.vehicleLabel} numberOfLines={2}>
                        {vehicle.label || vehicle.license_plate || `#${vehicle.id}`}
                      </Text>
                      <Text style={styles.idleBadge}>
                        {t(
                          'org.fleetPlanning.idleDays',
                          { count: vehicle.idle_days },
                          `${vehicle.idle_days} idle`,
                        )}
                      </Text>
                    </View>
                    {days.map((d) => {
                      const dayIso = isoDay(month, d);
                      const spans = (vehicle.spans || []).filter((s) =>
                        dayOverlapsSpan(dayIso, s),
                      );
                      const selected =
                        selection &&
                        String(selection.vehicleId) === String(vehicle.id) &&
                        dayIso >= selection.start &&
                        dayIso <= (selection.end || selection.start);
                      if (spans.length) {
                        const primary = spans[0];
                        return (
                          <Pressable
                            key={`${vehicle.id}-${d}`}
                            onPress={() => openTask(primary.work_order_id)}
                            style={[
                              styles.dayCell,
                              styles.busyCell,
                              { backgroundColor: statusColor(primary.status) },
                            ]}
                          >
                            <Text style={styles.busyMark} numberOfLines={1}>
                              •
                            </Text>
                          </Pressable>
                        );
                      }
                      return (
                        <Pressable
                          key={`${vehicle.id}-${d}`}
                          onPress={() =>
                            payload?.can_create_task
                              ? onEmptyDayPress(vehicle, d)
                              : null
                          }
                          style={[
                            styles.dayCell,
                            styles.emptyCell,
                            selected && styles.selectedCell,
                          ]}
                        />
                      );
                    })}
                  </View>
                ))}
              </View>
            </ScrollView>
          </AppCard>
        )}
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 12,
  },
  card: {
    padding: 14,
    gap: 10,
  },
  boardCard: {
    paddingHorizontal: 8,
    overflow: 'hidden',
  },
  hint: {
    color: ON_CARD_MUTED,
    fontSize: 13,
    lineHeight: 18,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  monthLabel: {
    color: ON_CARD,
    fontWeight: '700',
    fontSize: 16,
    minWidth: 84,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  outlinedLabel: {
    color: ON_CARD,
  },
  selectionHint: {
    color: ON_CARD_MUTED,
    fontSize: 12,
  },
  loader: {
    marginTop: 24,
  },
  error: {
    color: '#b91c1c',
    marginBottom: 8,
  },
  helper: {
    color: ON_CARD_MUTED,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#CBD5E1',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: ROW_H,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  labelCell: {
    width: LABEL_W,
    paddingHorizontal: 6,
    paddingVertical: 4,
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  headerLabel: {
    minHeight: 28,
  },
  headerText: {
    fontSize: 11,
    fontWeight: '700',
    color: ON_CARD_MUTED,
  },
  vehicleLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: ON_CARD,
  },
  idleBadge: {
    fontSize: 10,
    color: ON_CARD_MUTED,
  },
  dayCell: {
    width: DAY_W,
    minHeight: ROW_H,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: '#E2E8F0',
  },
  dayHeader: {
    fontSize: 10,
    color: ON_CARD_MUTED,
    fontWeight: '600',
  },
  emptyCell: {
    backgroundColor: '#FFFFFF',
  },
  selectedCell: {
    backgroundColor: '#DBEAFE',
  },
  busyCell: {
    opacity: 0.92,
  },
  busyMark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
