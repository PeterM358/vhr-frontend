import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, Button, Text } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';

import ScreenBackground from '../components/ScreenBackground';
import AppCard from '../components/ui/AppCard';
import OrgAppHeader from '../components/org/OrgAppHeader';
import OccupancyMonthBoard from '../components/calendar/OccupancyMonthBoard';
import { getFleetPlanning, updateWorkOrder } from '../api/orgOperations';
import { resolveActiveOrganizationId } from '../utils/orgWorkspace';
import {
  currentMonthIso,
  shiftMonth,
} from '../utils/occupancyCalendar';
import {
  navigateToOrgCreateTask,
  navigateToOrgHome,
  navigateToOrgTasks,
} from '../navigation/webNavigation';
import { useTranslation } from '../i18n';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { useScrollContentBottomPadding } from '../utils/mobileWebInsets';
import { showMessage } from '../utils/crossPlatformAlert';
import {
  isGenericHttpStatusMessage,
  platesFromVehicleOverlapConflicts,
} from '../utils/apiErrorMessage';

const ON_CARD = '#0F172A';
const ON_CARD_MUTED = '#475569';

/**
 * Org fleet adapter of the unified occupancy board.
 * @see vhr/docs/unified-occupancy-board-vision.md
 * @see vhr/docs/org-fleet-planning-vision.md
 */
export default function OrgFleetPlanningScreen({ navigation, route }) {
  const { t } = useTranslation();
  const routeOrgId = route?.params?.organizationId || route?.params?.orgId;
  const scrollBottomPadding = useScrollContentBottomPadding(40);

  const [orgId, setOrgId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [month, setMonth] = useState(() => route?.params?.month || currentMonthIso());
  const [payload, setPayload] = useState(null);
  const [idleOnly, setIdleOnly] = useState(false);

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

  const rows = useMemo(() => {
    const list = Array.isArray(payload?.vehicles) ? payload.vehicles : [];
    const filtered = idleOnly ? list.filter((row) => Number(row.idle_days) > 0) : list;
    // Busy rows first so a newly scheduled task is not buried below idle trucks.
    const sorted = [...filtered].sort((a, b) => {
      const aBusy = (a.spans || []).length;
      const bBusy = (b.spans || []).length;
      if (aBusy !== bBusy) return bBusy - aBusy;
      return 0;
    });
    return sorted.map((v) => ({
      id: v.id,
      label: v.label || v.license_plate || `#${v.id}`,
      isUnassigned: Boolean(v.is_unassigned) || v.id === 'unassigned',
      subtitle: t(
        'org.fleetPlanning.idleDays',
        { count: v.idle_days },
        `${v.idle_days} idle`,
      ),
      spans: (v.spans || []).map((s) => ({
        ...s,
        id: s.work_order_id,
      })),
    }));
  }, [idleOnly, payload, t]);

  const openCreate = useCallback(
    ({ vehicleId, scheduledDate, scheduledEndDate } = {}) => {
      const id = routeOrgId || orgId;
      const resolvedVehicle =
        vehicleId != null &&
        vehicleId !== '' &&
        vehicleId !== 'unassigned' &&
        !Number.isNaN(Number(vehicleId))
          ? vehicleId
          : undefined;
      navigateToOrgCreateTask(navigation, {
        orgId: id,
        organizationId: id,
        vehicleId: resolvedVehicle,
        scheduledDate: scheduledDate || undefined,
        scheduledEndDate: scheduledEndDate || undefined,
        returnTo: 'OrgFleetPlanning',
        returnMonth: month,
      });
    },
    [navigation, month, orgId, routeOrgId],
  );

  const onCreateRange = useCallback(
    ({ rowId, start, end }) => {
      openCreate({
        vehicleId: rowId,
        scheduledDate: start,
        scheduledEndDate: end,
      });
    },
    [openCreate],
  );

  const onOpenSpan = useCallback(
    (span) => {
      navigateToOrgTasks(navigation, {
        orgId: routeOrgId || orgId,
        taskId: span.work_order_id || span.id,
      });
    },
    [navigation, orgId, routeOrgId],
  );

  const onRescheduleSpan = useCallback(
    async ({ span, start, end }) => {
      const id = routeOrgId || orgId;
      const workOrderId = span.work_order_id || span.id;
      if (!id || !workOrderId || !start) return;
      setBusy(true);
      try {
        const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        await updateWorkOrder(token, id, workOrderId, {
          scheduled_date: start,
          scheduled_end_date: end || start,
        });
        await load();
      } catch (e) {
        const plates = platesFromVehicleOverlapConflicts(e?.vehicleOverlapConflicts);
        const body = plates.length
          ? t(
              'org.tasks.vehicleOverlapBodyPlates',
              { plates: plates.join(', ') },
              `Vehicle ${plates.join(', ')} is already on another open task.`,
            )
          : e?.message ||
            t('org.fleetPlanning.moveError', null, 'Could not move this task.');
        showMessage(
          t('org.fleetPlanning.moveTitle', null, 'Move task'),
          isGenericHttpStatusMessage(body)
            ? t('org.fleetPlanning.moveError', null, 'Could not move this task.')
            : body,
        );
      } finally {
        setBusy(false);
      }
    },
    [load, orgId, routeOrgId, t],
  );

  return (
    <ScreenBackground>
      <OrgAppHeader
        mode="detail"
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
              'org.fleetPlanning.hintPro',
              null,
              'Base calendar for the fleet: tap empty days to create, long-press a bar to move it. Same board pattern shops will use for bays later.',
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
              <Button mode="contained" compact onPress={() => openCreate({})}>
                {t('org.fleetPlanning.newTask', null, 'New task')}
              </Button>
            ) : null}
          </View>
          {payload != null && Number(payload.busy_task_count) > 0 ? (
            <Text style={styles.busySummary}>
              {t(
                'org.fleetPlanning.busySummary',
                { count: payload.busy_task_count },
                `${payload.busy_task_count} scheduled task(s) on this month board`,
              )}
            </Text>
          ) : payload != null && !loading ? (
            <Text style={styles.busySummary}>
              {t(
                'org.fleetPlanning.noBusyTasks',
                null,
                'No scheduled vehicle tasks in this month yet.',
              )}
            </Text>
          ) : null}
          {busy ? <ActivityIndicator style={{ marginTop: 8 }} /> : null}
        </AppCard>

        {loading ? (
          <ActivityIndicator style={styles.loader} />
        ) : error ? (
          <AppCard style={styles.card}>
            <Text style={styles.error}>{error}</Text>
            <Button onPress={load}>{t('common.retry', null, 'Retry')}</Button>
          </AppCard>
        ) : (
          <AppCard style={[styles.card, styles.boardCard]}>
            <OccupancyMonthBoard
              month={month}
              rows={rows}
              canEdit={Boolean(payload?.can_create_task)}
              scrollToToday
              rowColLabel={t('org.fleetPlanning.vehicleCol', null, 'Vehicle')}
              createHint={t('org.fleetPlanning.selected', null, 'Selected')}
              moveHint={t(
                'org.fleetPlanning.moveHint',
                null,
                'Move mode: tap an empty day on the same truck to drop. Tap this banner to cancel.',
              )}
              emptyHint={t(
                'org.fleetPlanning.empty',
                null,
                'No vehicles in this fleet yet. Add vehicles in Fleet first.',
              )}
              onOpenSpan={onOpenSpan}
              onCreateRange={onCreateRange}
              onRescheduleSpan={onRescheduleSpan}
            />
          </AppCard>
        )}
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  card: { padding: 14, gap: 10 },
  boardCard: { paddingHorizontal: 8, overflow: 'hidden' },
  hint: { color: ON_CARD_MUTED, fontSize: 13, lineHeight: 18 },
  monthRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  monthLabel: {
    color: ON_CARD,
    fontWeight: '700',
    fontSize: 16,
    minWidth: 84,
    textAlign: 'center',
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  outlinedLabel: { color: ON_CARD },
  busySummary: { color: ON_CARD_MUTED, fontSize: 12, lineHeight: 16 },
  loader: { marginTop: 24 },
  error: { color: '#b91c1c', marginBottom: 8 },
});
