import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, Button, Text } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';

import ScreenBackground from '../components/ScreenBackground';
import AppCard from '../components/ui/AppCard';
import OrgAppHeader from '../components/org/OrgAppHeader';
import { listWorkOrders, startWorkOrder } from '../api/orgOperations';
import {
  readOrganizationMemberships,
  resolveActiveOrganizationId,
} from '../utils/orgWorkspace';
import {
  navigateToOrgCreateTask,
  navigateToOrgHome,
} from '../navigation/webNavigation';
import { useTranslation } from '../i18n';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { COLORS } from '../constants/colors';
import { useScrollContentBottomPadding } from '../utils/mobileWebInsets';

const ON_CARD = '#0F172A';
const ON_CARD_MUTED = '#475569';

function statusLabel(status, t) {
  return t(`org.home.tasks.status.${status}`, null, status || '');
}

function personLabel(person) {
  return person?.display_name || person?.email || `#${person?.user_id || person?.id || ''}`;
}

function vehicleLabel(vehicle) {
  return vehicle?.license_plate || vehicle?.fleet_id || vehicle?.display_name || '';
}

function scheduledStartLabel(task) {
  if (!task?.scheduled_date) return '';
  if (task.planned_start) {
    return `${task.scheduled_date} ${String(task.planned_start).slice(0, 5)}`;
  }
  return task.scheduled_date;
}

function canShowStartButton(task) {
  if (!task) return false;
  if (task.start_acknowledged_at || task.started_at) return false;
  if (task.status === 'done' || task.status === 'cancelled') return false;
  return task.status === 'assigned' || task.status === 'draft';
}

function isWaitingForStartTime(task) {
  if (!task?.scheduled_date || !task?.planned_start) return false;
  if (task.start_acknowledged_at || task.started_at) return false;
  const clock = String(task.planned_start).slice(0, 8);
  const iso = `${task.scheduled_date}T${clock.length === 5 ? `${clock}:00` : clock}`;
  const startMs = Date.parse(iso);
  if (!Number.isFinite(startMs)) return false;
  return Date.now() < startMs;
}

export default function OrgTasksScreen({ navigation, route }) {
  const { t } = useTranslation();
  const routeOrgId = route?.params?.organizationId || route?.params?.orgId;
  const initialTaskId = route?.params?.taskId || route?.params?.workOrderId || null;
  const scrollBottomPadding = useScrollContentBottomPadding(40);

  const [orgId, setOrgId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [canManage, setCanManage] = useState(false);
  const [rows, setRows] = useState([]);
  const [selectedId, setSelectedId] = useState(initialTaskId);
  const [busyStart, setBusyStart] = useState(false);

  const onBack = useCallback(() => {
    if (selectedId) {
      setSelectedId(null);
      return;
    }
    navigateToOrgHome(navigation, { orgId: routeOrgId || orgId });
  }, [navigation, orgId, routeOrgId, selectedId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const resolved = await resolveActiveOrganizationId(routeOrgId);
      setOrgId(resolved);
      if (!resolved) {
        setError(t('org.tasks.loadError', null, 'Could not load tasks.'));
        setRows([]);
        return;
      }
      const data = await listWorkOrders(token, resolved);
      setCanManage(Boolean(data?.can_manage));
      setRows(Array.isArray(data?.results) ? data.results : []);
    } catch (e) {
      setError(e.message || t('org.tasks.loadError', null, 'Could not load tasks.'));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [routeOrgId, t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const selected = useMemo(
    () => rows.find((row) => String(row.id) === String(selectedId)) || null,
    [rows, selectedId],
  );

  const acknowledgeStart = async (task) => {
    if (!orgId || !task?.id) return;
    setBusyStart(true);
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const updated = await startWorkOrder(token, orgId, task.id);
      setRows((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
    } catch (e) {
      Alert.alert(
        t('org.tasks.startTitle', null, 'Start task'),
        e.message || t('org.tasks.startError', null, 'Could not start the task.'),
      );
    } finally {
      setBusyStart(false);
    }
  };

  const renderStartControls = (task) => {
    if (!task) return null;
    if (task.start_acknowledged_at || task.started_at) {
      return (
        <Text style={styles.startedBadge}>
          {t('org.tasks.startedAt', { time: String(task.start_acknowledged_at || task.started_at).slice(11, 16) }, 'Started')}
        </Text>
      );
    }
    if (isWaitingForStartTime(task)) {
      return (
        <Text style={styles.waitingText}>
          {t(
            'org.tasks.waitingStart',
            { time: scheduledStartLabel(task) },
            `Waiting until ${scheduledStartLabel(task)}`,
          )}
        </Text>
      );
    }
    if (!canShowStartButton(task)) return null;
    return (
      <Button
        mode="contained"
        loading={busyStart}
        disabled={busyStart}
        onPress={() => acknowledgeStart(task)}
        style={styles.startBtn}
        contentStyle={styles.startBtnContent}
        labelStyle={styles.startBtnLabel}
      >
        {t('org.tasks.started', null, 'Started')}
      </Button>
    );
  };

  return (
    <ScreenBackground safeArea={false}>
      <OrgAppHeader
        mode="detail"
        title={
          selected
            ? t('org.tasks.detailTitle', null, 'Task')
            : t('org.tasks.listTitle', null, 'Tasks')
        }
        onBack={onBack}
      />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: scrollBottomPadding }]}
        keyboardShouldPersistTaps="handled"
      >
        {loading ? (
          <ActivityIndicator color="#fff" style={styles.loader} />
        ) : error ? (
          <AppCard style={styles.card}>
            <Text style={styles.error}>{error}</Text>
            <Button mode="contained" onPress={load}>
              {t('common.retry', null, 'Retry')}
            </Button>
          </AppCard>
        ) : selected ? (
          <AppCard style={styles.card}>
            <Text style={styles.title}>{selected.title}</Text>
            <Text style={styles.meta}>
              {[
                statusLabel(selected.status, t),
                scheduledStartLabel(selected),
                vehicleLabel(selected.vehicle),
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
            {selected.instructions ? (
              <Text style={styles.instructions}>{selected.instructions}</Text>
            ) : null}
            {renderStartControls(selected)}
            <Text style={styles.section}>
              {t('org.tasks.operationsTitle', null, 'Operations in this task')}
            </Text>
            {(selected.operations || []).map((op, idx) => (
              <View key={op.id || idx} style={styles.opRow}>
                <Text style={styles.opTitle}>
                  {`${idx + 1}. ${op.activity?.name || '—'}`}
                </Text>
                {op.notes ? <Text style={styles.opMeta}>{op.notes}</Text> : null}
                {(op.assignees || []).length > 0 ? (
                  <Text style={styles.opMeta}>
                    {(op.assignees || []).map(personLabel).join(', ')}
                  </Text>
                ) : null}
              </View>
            ))}
            <Text style={styles.section}>
              {t('org.tasks.overallPeople', null, 'People on this task')}
            </Text>
            <Text style={styles.opMeta}>
              {(selected.assignees || []).map(personLabel).join(', ') ||
                t('org.tasks.noPeople', null, 'No people assigned')}
            </Text>
            {selected.vehicle ? (
              <>
                <Text style={styles.section}>{t('org.tasks.vehicle', null, 'Vehicle')}</Text>
                <Text style={styles.opMeta}>{vehicleLabel(selected.vehicle)}</Text>
              </>
            ) : null}
          </AppCard>
        ) : (
          <>
            <Text style={styles.lead}>
              {t(
                'org.tasks.listLead',
                null,
                'Create multi-operation work cards and track status for your team.',
              )}
            </Text>
            {canManage ? (
              <Button
                mode="contained"
                onPress={() => navigateToOrgCreateTask(navigation, { orgId })}
                style={styles.createBtn}
              >
                {t('org.tasks.createTitle', null, 'Create task')}
              </Button>
            ) : null}
            <AppCard style={styles.card}>
              {rows.length === 0 ? (
                <Text style={styles.empty}>
                  {t('org.tasks.listEmpty', null, 'No tasks yet. Create the first work card.')}
                </Text>
              ) : (
                rows.map((row) => (
                  <Pressable
                    key={row.id}
                    onPress={() => setSelectedId(row.id)}
                    style={styles.row}
                  >
                    <Text style={styles.rowTitle}>{row.title}</Text>
                    <Text style={styles.rowMeta}>
                      {[
                        statusLabel(row.status, t),
                        scheduledStartLabel(row),
                        vehicleLabel(row.vehicle),
                        Array.isArray(row.operations) && row.operations.length
                          ? t(
                              'org.home.tasks.operationCount',
                              { count: row.operations.length },
                              `${row.operations.length} operations`,
                            )
                          : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  </Pressable>
                ))
              )}
            </AppCard>
          </>
        )}
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 14, paddingTop: 12 },
  lead: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  loader: { marginVertical: 24 },
  card: { padding: 14, marginBottom: 12 },
  createBtn: { marginBottom: 12 },
  title: { color: ON_CARD, fontSize: 18, fontWeight: '700', marginBottom: 6 },
  meta: { color: ON_CARD_MUTED, fontSize: 13, marginBottom: 10 },
  instructions: { color: ON_CARD, fontSize: 14, lineHeight: 20, marginBottom: 12 },
  section: {
    color: ON_CARD,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 14,
    marginBottom: 6,
  },
  opRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(15,23,42,0.12)',
    paddingVertical: 8,
  },
  opTitle: { color: ON_CARD, fontSize: 14, fontWeight: '700' },
  opMeta: { color: ON_CARD_MUTED, fontSize: 12, marginTop: 4 },
  row: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(15,23,42,0.12)',
    paddingVertical: 12,
  },
  rowTitle: { color: ON_CARD, fontSize: 15, fontWeight: '700' },
  rowMeta: { color: ON_CARD_MUTED, fontSize: 12, marginTop: 4 },
  empty: { color: ON_CARD_MUTED, fontSize: 14, lineHeight: 20 },
  error: { color: '#b91c1c', marginBottom: 10 },
  startBtn: { marginBottom: 8, backgroundColor: COLORS.PRIMARY },
  startBtnContent: { paddingVertical: 8 },
  startBtnLabel: { fontSize: 18, fontWeight: '800', letterSpacing: 0.3 },
  startedBadge: {
    color: '#166534',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  waitingText: {
    color: ON_CARD_MUTED,
    fontSize: 13,
    fontStyle: 'italic',
    marginBottom: 8,
  },
});
