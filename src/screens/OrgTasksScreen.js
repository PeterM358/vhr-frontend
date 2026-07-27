import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, Button, Text, TextInput } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';

import ScreenBackground from '../components/ScreenBackground';
import AppCard from '../components/ui/AppCard';
import OrgAppHeader from '../components/org/OrgAppHeader';
import {
  attachWorkOrderMedia,
  endWorkOrder,
  getWorkOrder,
  listWorkOrders,
  startWorkOrder,
  updateWorkOrder,
} from '../api/orgOperations';
import { resolveActiveOrganizationId } from '../utils/orgWorkspace';
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

const TASK_TABS = [
  { id: 'open', labelKey: 'org.tasks.tabs.open', fallback: 'Open' },
  { id: 'all', labelKey: 'org.tasks.tabs.all', fallback: 'All' },
  { id: 'add', labelKey: 'org.tasks.tabs.add', fallback: 'Add' },
];

function isOpenTaskStatus(status) {
  const value = String(status || '').toLowerCase();
  return value !== 'done' && value !== 'cancelled';
}

function statusLabel(status, t) {
  return t(`org.home.tasks.status.${status}`, null, status || '');
}

function personLabel(person) {
  return person?.display_name || person?.email || `#${person?.user_id || person?.id || ''}`;
}

function vehicleLabel(vehicle) {
  return vehicle?.license_plate || vehicle?.fleet_id || vehicle?.display_name || '';
}

function taskVehicles(task) {
  if (Array.isArray(task?.vehicles) && task.vehicles.length) return task.vehicles;
  if (task?.vehicle) return [task.vehicle];
  return [];
}

function vehiclesLabel(task) {
  return taskVehicles(task).map(vehicleLabel).filter(Boolean).join(', ');
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

function canShowEndButton(task) {
  if (!task) return false;
  if (task.status === 'done' || task.status === 'cancelled') return false;
  if (task.ended_at) return false;
  return Boolean(task.start_acknowledged_at || task.started_at || task.status === 'in_progress');
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

function isDistanceOutput(op) {
  const measure = String(op?.activity?.measure_kind || op?.activity?.unit?.measure_kind || '').toLowerCase();
  if (measure === 'distance') return true;
  const symbol = String(
    op?.activity?.default_unit || op?.activity?.unit?.symbol || op?.activity?.unit?.code || '',
  ).toLowerCase();
  return symbol === 'km' || symbol.includes('km');
}

function leftoverKey(opId, materialId) {
  return `${opId}:${materialId}`;
}

function buildLeftoverDrafts(operations) {
  const drafts = {};
  (operations || []).forEach((op) => {
    const existing = Array.isArray(op.material_leftovers) ? op.material_leftovers : [];
    existing.forEach((line) => {
      if (line?.material_id != null) {
        drafts[leftoverKey(op.id, line.material_id)] =
          line.leftover_qty != null ? String(line.leftover_qty) : '';
      }
    });
    const materials = op.activity?.default_materials || [];
    materials.forEach((mat) => {
      const key = leftoverKey(op.id, mat.id);
      if (drafts[key] == null) drafts[key] = '';
    });
  });
  return drafts;
}

export default function OrgTasksScreen({ navigation, route }) {
  const { t } = useTranslation();
  const routeOrgId = route?.params?.organizationId || route?.params?.orgId;
  const routeTaskId = route?.params?.taskId || route?.params?.workOrderId || null;
  const routeTab = String(route?.params?.tab || '').toLowerCase();
  const scrollBottomPadding = useScrollContentBottomPadding(40);

  const [orgId, setOrgId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [canManage, setCanManage] = useState(false);
  const [rows, setRows] = useState([]);
  const [activeTab, setActiveTab] = useState(
    routeTab === 'all' || routeTab === 'add' ? routeTab : 'open',
  );
  const [selectedId, setSelectedId] = useState(routeTaskId);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [busyAction, setBusyAction] = useState(false);
  const [photoDraft, setPhotoDraft] = useState('');
  const [documentDraft, setDocumentDraft] = useState('');
  const [actualDrafts, setActualDrafts] = useState({});
  const [meterStartDrafts, setMeterStartDrafts] = useState({});
  const [meterEndDrafts, setMeterEndDrafts] = useState({});
  const [leftoverDrafts, setLeftoverDrafts] = useState({});

  const onBack = useCallback(() => {
    if (selectedId) {
      setSelectedId(null);
      setSelectedDetail(null);
      return;
    }
    navigateToOrgHome(navigation, { orgId: routeOrgId || orgId });
  }, [navigation, orgId, routeOrgId, selectedId]);

  const openCreateTab = useCallback(() => {
    setActiveTab('add');
    navigateToOrgCreateTask(navigation, { orgId: routeOrgId || orgId });
  }, [navigation, orgId, routeOrgId]);

  const selectTab = useCallback(
    (tabId) => {
      if (tabId === 'add') {
        if (!canManage) return;
        openCreateTab();
        return;
      }
      setActiveTab(tabId);
      setSelectedId(null);
      setSelectedDetail(null);
    },
    [canManage, openCreateTab],
  );

  const visibleRows = useMemo(() => {
    if (activeTab === 'all') return rows;
    return rows.filter((row) => isOpenTaskStatus(row.status));
  }, [activeTab, rows]);

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
      setActiveTab((prev) => (prev === 'add' ? 'open' : prev));
    }, [load]),
  );

  useEffect(() => {
    if (routeTaskId) setSelectedId(routeTaskId);
  }, [routeTaskId]);

  useEffect(() => {
    if (routeTab === 'all' || routeTab === 'open') setActiveTab(routeTab);
    if (routeTab === 'add' && canManage) openCreateTab();
  }, [canManage, openCreateTab, routeTab]);

  useEffect(() => {
    let cancelled = false;
    const loadDetail = async () => {
      if (!orgId || !selectedId) {
        setSelectedDetail(null);
        return;
      }
      try {
        const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        const detail = await getWorkOrder(token, orgId, selectedId);
        if (!cancelled) {
          setSelectedDetail(detail);
          setRows((prev) => {
            const exists = prev.some((row) => String(row.id) === String(detail.id));
            if (!exists) return [detail, ...prev];
            return prev.map((row) => (String(row.id) === String(detail.id) ? detail : row));
          });
          const drafts = {};
          const meterStarts = {};
          const meterEnds = {};
          (detail.operations || []).forEach((op) => {
            drafts[op.id] = op.actual_qty != null ? String(op.actual_qty) : '';
            meterStarts[op.id] = op.meter_start != null ? String(op.meter_start) : '';
            meterEnds[op.id] = op.meter_end != null ? String(op.meter_end) : '';
          });
          setActualDrafts(drafts);
          setMeterStartDrafts(meterStarts);
          setMeterEndDrafts(meterEnds);
          setLeftoverDrafts(buildLeftoverDrafts(detail.operations));
        }
      } catch (e) {
        if (!cancelled) {
          Alert.alert(
            t('org.tasks.detailTitle', null, 'Task'),
            e.message || t('org.tasks.loadError', null, 'Could not load tasks.'),
          );
          setSelectedId(null);
          setSelectedDetail(null);
        }
      }
    };
    loadDetail();
    return () => {
      cancelled = true;
    };
  }, [orgId, selectedId, t]);

  const selected = selectedDetail;

  const replaceTask = (updated) => {
    setSelectedDetail(updated);
    setRows((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
    const drafts = {};
    const meterStarts = {};
    const meterEnds = {};
    (updated.operations || []).forEach((op) => {
      drafts[op.id] = op.actual_qty != null ? String(op.actual_qty) : '';
      meterStarts[op.id] = op.meter_start != null ? String(op.meter_start) : '';
      meterEnds[op.id] = op.meter_end != null ? String(op.meter_end) : '';
    });
    setActualDrafts(drafts);
    setMeterStartDrafts(meterStarts);
    setMeterEndDrafts(meterEnds);
    setLeftoverDrafts(buildLeftoverDrafts(updated.operations));
  };

  const acknowledgeStart = async (task) => {
    if (!orgId || !task?.id) return;
    setBusyAction(true);
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const updated = await startWorkOrder(token, orgId, task.id);
      replaceTask(updated);
    } catch (e) {
      Alert.alert(
        t('org.tasks.startTitle', null, 'Start task'),
        e.message || t('org.tasks.startError', null, 'Could not start the task.'),
      );
    } finally {
      setBusyAction(false);
    }
  };

  const buildOperationsActualsPayload = (task = selected) =>
    (task?.operations || [])
      .filter((op) => op.id != null)
      .map((op) => {
        const payload = { id: op.id };
        if (isDistanceOutput(op)) {
          payload.meter_start =
            meterStartDrafts[op.id] === '' || meterStartDrafts[op.id] == null
              ? null
              : meterStartDrafts[op.id];
          payload.meter_end =
            meterEndDrafts[op.id] === '' || meterEndDrafts[op.id] == null
              ? null
              : meterEndDrafts[op.id];
        } else {
          payload.actual_qty =
            actualDrafts[op.id] === '' || actualDrafts[op.id] == null
              ? null
              : actualDrafts[op.id];
        }
        if (op.activity?.consumes_materials) {
          const materials = op.activity?.default_materials || [];
          payload.material_leftovers = materials.map((mat) => ({
            material_id: mat.id,
            leftover_qty:
              leftoverDrafts[leftoverKey(op.id, mat.id)] === ''
                ? null
                : leftoverDrafts[leftoverKey(op.id, mat.id)] || null,
            label: mat.name || '',
          }));
        }
        return payload;
      });

  const acknowledgeEnd = async (task) => {
    if (!orgId || !task?.id) return;
    setBusyAction(true);
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const operations = buildOperationsActualsPayload(task);
      const updated = await endWorkOrder(token, orgId, task.id, { operations });
      replaceTask(updated);
    } catch (e) {
      Alert.alert(
        t('org.tasks.endTitle', null, 'End work'),
        e.message || t('org.tasks.endError', null, 'Could not end the task.'),
      );
    } finally {
      setBusyAction(false);
    }
  };

  const attachRef = async (kind) => {
    if (!orgId || !selected?.id) return;
    const draft = kind === 'photo' ? photoDraft.trim() : documentDraft.trim();
    if (!draft) return;
    setBusyAction(true);
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const updated = await attachWorkOrderMedia(token, orgId, selected.id, {
        kind,
        ref: draft,
        label: draft,
      });
      replaceTask(updated);
      if (kind === 'photo') setPhotoDraft('');
      else setDocumentDraft('');
    } catch (e) {
      Alert.alert(
        t('org.tasks.attachTitle', null, 'Attach'),
        e.message || t('org.tasks.attachError', null, 'Could not attach file.'),
      );
    } finally {
      setBusyAction(false);
    }
  };

  const saveActuals = async () => {
    if (!orgId || !selected?.id) return;
    setBusyAction(true);
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const operations = buildOperationsActualsPayload();
      const updated = await updateWorkOrder(token, orgId, selected.id, { operations });
      replaceTask(updated);
    } catch (e) {
      Alert.alert(
        t('org.tasks.actualsTitle', null, 'Actuals'),
        e.message || t('org.tasks.actualsError', null, 'Could not save actuals.'),
      );
    } finally {
      setBusyAction(false);
    }
  };

  const renderStartEndControls = (task) => {
    if (!task) return null;
    return (
      <View style={styles.actionBlock}>
        {task.start_acknowledged_at || task.started_at ? (
          <Text style={styles.startedBadge}>
            {t(
              'org.tasks.startedAt',
              { time: String(task.start_acknowledged_at || task.started_at).slice(11, 16) },
              'Started',
            )}
          </Text>
        ) : isWaitingForStartTime(task) ? (
          <Text style={styles.waitingText}>
            {t(
              'org.tasks.waitingStart',
              { time: scheduledStartLabel(task) },
              `Waiting until ${scheduledStartLabel(task)}`,
            )}
          </Text>
        ) : canShowStartButton(task) ? (
          <Button
            mode="contained"
            loading={busyAction}
            disabled={busyAction}
            onPress={() => acknowledgeStart(task)}
            style={styles.startBtn}
            contentStyle={styles.startBtnContent}
            labelStyle={styles.startBtnLabel}
          >
            {t('org.tasks.startCta', null, 'Start')}
          </Button>
        ) : null}

        {canShowEndButton(task) ? (
          <Button
            mode="contained"
            loading={busyAction}
            disabled={busyAction}
            onPress={() => acknowledgeEnd(task)}
            style={styles.endBtn}
            contentStyle={styles.startBtnContent}
            labelStyle={styles.startBtnLabel}
          >
            {t('org.tasks.endCta', null, 'End work')}
          </Button>
        ) : null}

        {task.ended_at ? (
          <Text style={styles.endedBadge}>
            {t(
              'org.tasks.endedAt',
              { time: String(task.ended_at).slice(11, 16) },
              'Ended',
            )}
          </Text>
        ) : null}
      </View>
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
        ) : (
          <>
            {!selected ? (
              <View style={styles.modeRow}>
                {TASK_TABS.map((item) => {
                  const active = activeTab === item.id;
                  const disabled = item.id === 'add' && !canManage;
                  return (
                    <Pressable
                      key={item.id}
                      disabled={disabled}
                      onPress={() => selectTab(item.id)}
                      style={[
                        styles.modeChip,
                        active && styles.modeChipActive,
                        disabled && styles.modeChipDisabled,
                      ]}
                    >
                      <Text style={[styles.modeChipText, active && styles.modeChipTextActive]}>
                        {t(item.labelKey, null, item.fallback)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {selected ? (
          <>
            <AppCard style={styles.card}>
              <Text style={styles.title}>{selected.title}</Text>
              <Text style={styles.meta}>
                {[
                  statusLabel(selected.status, t),
                  selected.project?.name,
                  scheduledStartLabel(selected),
                  vehiclesLabel(selected),
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
              {selected.instructions ? (
                <Text style={styles.instructions}>{selected.instructions}</Text>
              ) : null}
              {renderStartEndControls(selected)}
            </AppCard>

            <AppCard style={styles.card}>
              <Text style={styles.section}>
                {t('org.tasks.operationsTitle', null, 'Operations in this task')}
              </Text>
              <Text style={styles.opMeta}>
                {t(
                  'org.tasks.actualsHint',
                  null,
                  'Fill output actuals before End. Start/End buttons only track time — do not re-enter clock times here.',
                )}
              </Text>
              {(selected.operations || []).map((op, idx) => {
                const editable =
                  canShowEndButton(selected) || selected.status === 'in_progress';
                const unitLabelText =
                  op.activity?.default_unit ||
                  op.activity?.unit?.symbol ||
                  '';
                const distance = isDistanceOutput(op);
                const materials =
                  op.activity?.consumes_materials
                    ? op.activity?.default_materials || []
                    : [];
                return (
                  <View key={op.id || idx} style={styles.opRow}>
                    <Text style={styles.opTitle}>
                      {`${idx + 1}. ${op.activity?.name || '—'}`}
                      {unitLabelText ? ` · ${unitLabelText}` : ''}
                    </Text>
                    {op.notes ? <Text style={styles.opMeta}>{op.notes}</Text> : null}
                    {(op.assignees || []).length > 0 ? (
                      <Text style={styles.opMeta}>
                        {(op.assignees || []).map(personLabel).join(', ')}
                      </Text>
                    ) : null}
                    {editable ? (
                      distance ? (
                        <>
                          <TextInput
                            label={t('org.tasks.meterStart', null, 'Meter start')}
                            value={meterStartDrafts[op.id] || ''}
                            onChangeText={(value) =>
                              setMeterStartDrafts((prev) => ({ ...prev, [op.id]: value }))
                            }
                            mode="outlined"
                            keyboardType="decimal-pad"
                            style={styles.input}
                            textColor={ON_CARD}
                          />
                          <TextInput
                            label={t('org.tasks.meterEnd', null, 'Meter end')}
                            value={meterEndDrafts[op.id] || ''}
                            onChangeText={(value) =>
                              setMeterEndDrafts((prev) => ({ ...prev, [op.id]: value }))
                            }
                            mode="outlined"
                            keyboardType="decimal-pad"
                            style={styles.input}
                            textColor={ON_CARD}
                          />
                          <Text style={styles.opMeta}>
                            {t(
                              'org.tasks.meterKmHint',
                              null,
                              'km is computed from meter end − start (no separate km field).',
                            )}
                          </Text>
                        </>
                      ) : (
                        <TextInput
                          label={
                            unitLabelText
                              ? t(
                                  'org.tasks.actualQtyWithUnit',
                                  { unit: unitLabelText },
                                  `Actual (${unitLabelText})`,
                                )
                              : t('org.tasks.actualQty', null, 'Actual quantity')
                          }
                          value={actualDrafts[op.id] || ''}
                          onChangeText={(value) =>
                            setActualDrafts((prev) => ({ ...prev, [op.id]: value }))
                          }
                          mode="outlined"
                          keyboardType="decimal-pad"
                          style={styles.input}
                          textColor={ON_CARD}
                        />
                      )
                    ) : distance && (op.meter_start != null || op.meter_end != null) ? (
                      <Text style={styles.opMeta}>
                        {t('org.tasks.meterStart', null, 'Meter start')}: {op.meter_start ?? '—'}
                        {' · '}
                        {t('org.tasks.meterEnd', null, 'Meter end')}: {op.meter_end ?? '—'}
                        {op.actual_qty != null
                          ? ` · ${t('org.tasks.actualQty', null, 'Actual')}: ${op.actual_qty}`
                          : ''}
                        {op.expected_input_qty != null
                          ? ` · ${t('org.tasks.expectedInputQtyShort', null, 'Expected')}: ${op.expected_input_qty}`
                          : ''}
                      </Text>
                    ) : op.actual_qty != null ? (
                      <Text style={styles.opMeta}>
                        {t('org.tasks.actualQty', null, 'Actual')}: {op.actual_qty}
                        {unitLabelText ? ` ${unitLabelText}` : ''}
                      </Text>
                    ) : null}

                    {op.expected_input_qty != null ? (
                      <Text style={styles.opMeta}>
                        {t(
                          'org.tasks.expectedInputQty',
                          { qty: op.expected_input_qty },
                          `Expected input (norm): ${op.expected_input_qty}`,
                        )}
                      </Text>
                    ) : null}

                    {op.activity?.consumes_materials ? (
                      <>
                        <Text style={styles.opMeta}>
                          {t(
                            'org.tasks.leftoverHint',
                            null,
                            'Leftover (остатък) per issued material. Consumed = issued − leftover (issue comes later).',
                          )}
                        </Text>
                        {materials.length === 0 ? (
                          <Text style={styles.opMeta}>
                            {t(
                              'org.tasks.leftoverNoSkus',
                              null,
                              'No default SKUs on this operation yet — leftovers will appear once materials are issued.',
                            )}
                          </Text>
                        ) : (
                          materials.map((mat) => (
                            <TextInput
                              key={mat.id}
                              label={t(
                                'org.tasks.leftoverFor',
                                { name: mat.name || `#${mat.id}` },
                                `Leftover — ${mat.name || mat.id}`,
                              )}
                              value={leftoverDrafts[leftoverKey(op.id, mat.id)] || ''}
                              onChangeText={(value) =>
                                setLeftoverDrafts((prev) => ({
                                  ...prev,
                                  [leftoverKey(op.id, mat.id)]: value,
                                }))
                              }
                              mode="outlined"
                              keyboardType="decimal-pad"
                              style={styles.input}
                              textColor={ON_CARD}
                              disabled={!editable}
                            />
                          ))
                        )}
                      </>
                    ) : null}
                  </View>
                );
              })}
              {(canShowEndButton(selected) || selected.status === 'in_progress') &&
              (selected.operations || []).length > 0 ? (
                <Button
                  mode="outlined"
                  loading={busyAction}
                  disabled={busyAction}
                  onPress={saveActuals}
                  style={styles.secondaryBtn}
                >
                  {t('org.tasks.saveActuals', null, 'Save actuals')}
                </Button>
              ) : null}
            </AppCard>

            <AppCard style={styles.card}>
              <Text style={styles.section}>
                {t('org.tasks.attachmentsTitle', null, 'Photos & documents')}
              </Text>
              {(selected.photo_refs || []).length > 0 ? (
                <Text style={styles.opMeta}>
                  {t('org.tasks.photosLabel', null, 'Photos')}: {(selected.photo_refs || []).join(', ')}
                </Text>
              ) : null}
              {(selected.document_refs || []).length > 0 ? (
                <Text style={styles.opMeta}>
                  {t('org.tasks.documentsLabel', null, 'Documents')}:{' '}
                  {(selected.document_refs || []).join(', ')}
                </Text>
              ) : null}
              {selected.status !== 'done' && selected.status !== 'cancelled' ? (
                <>
                  <TextInput
                    label={t('org.tasks.photoUpload', null, 'Photo URL or label')}
                    value={photoDraft}
                    onChangeText={setPhotoDraft}
                    mode="outlined"
                    style={styles.input}
                    textColor={ON_CARD}
                  />
                  <Button
                    mode="outlined"
                    disabled={busyAction || !photoDraft.trim()}
                    onPress={() => attachRef('photo')}
                    style={styles.secondaryBtn}
                  >
                    {t('org.tasks.addPhoto', null, 'Add photo')}
                  </Button>
                  <TextInput
                    label={t('org.tasks.documentUpload', null, 'Document URL or label')}
                    value={documentDraft}
                    onChangeText={setDocumentDraft}
                    mode="outlined"
                    style={styles.input}
                    textColor={ON_CARD}
                  />
                  <Button
                    mode="outlined"
                    disabled={busyAction || !documentDraft.trim()}
                    onPress={() => attachRef('document')}
                    style={styles.secondaryBtn}
                  >
                    {t('org.tasks.addDocument', null, 'Add document')}
                  </Button>
                </>
              ) : null}
            </AppCard>

            <AppCard style={styles.card}>
              <Text style={styles.section}>
                {t('org.tasks.overallPeople', null, 'People on this task')}
              </Text>
              <Text style={styles.opMeta}>
                {(selected.assignees || []).map(personLabel).join(', ') ||
                  t('org.tasks.noPeople', null, 'No people assigned')}
              </Text>
              {taskVehicles(selected).length > 0 ? (
                <>
                  <Text style={styles.section}>
                    {t('org.tasks.vehicles', null, 'Vehicles')}
                  </Text>
                  <Text style={styles.opMeta}>{vehiclesLabel(selected)}</Text>
                </>
              ) : null}
            </AppCard>
          </>
            ) : (
          <>
            <Text style={styles.lead}>
              {canManage
                ? t(
                    'org.tasks.listLead',
                    null,
                    'Create multi-operation work cards and track status for your team.',
                  )
                : t(
                    'org.tasks.workerListLead',
                    null,
                    'Open a task to start, fill operations, upload docs, and end work.',
                  )}
            </Text>
            <AppCard style={styles.card}>
              {visibleRows.length === 0 ? (
                <Text style={styles.empty}>
                  {activeTab === 'open'
                    ? t('org.tasks.openEmpty', null, 'No open tasks.')
                    : t('org.tasks.listEmpty', null, 'No tasks yet. Create the first work card.')}
                </Text>
              ) : (
                visibleRows.map((row) => (
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
                        vehiclesLabel(row),
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
  modeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  modeChip: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  modeChipActive: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  modeChipDisabled: {
    opacity: 0.45,
  },
  modeChipText: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 13,
    fontWeight: '700',
  },
  modeChipTextActive: {
    color: '#0F172A',
  },
  loader: { marginVertical: 24 },
  card: { padding: 14, marginBottom: 12 },
  title: { color: ON_CARD, fontSize: 18, fontWeight: '700', marginBottom: 6 },
  meta: { color: ON_CARD_MUTED, fontSize: 13, marginBottom: 10 },
  instructions: { color: ON_CARD, fontSize: 14, lineHeight: 20, marginBottom: 12 },
  section: {
    color: ON_CARD,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 4,
    marginBottom: 6,
  },
  opRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(15,23,42,0.12)',
    paddingVertical: 8,
  },
  opTitle: { color: ON_CARD, fontSize: 14, fontWeight: '700' },
  opMeta: { color: ON_CARD_MUTED, fontSize: 12, marginTop: 4 },
  input: { marginTop: 8, marginBottom: 4, backgroundColor: '#fff' },
  row: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(15,23,42,0.12)',
    paddingVertical: 12,
  },
  rowTitle: { color: ON_CARD, fontSize: 15, fontWeight: '700' },
  rowMeta: { color: ON_CARD_MUTED, fontSize: 12, marginTop: 4 },
  empty: { color: ON_CARD_MUTED, fontSize: 14, lineHeight: 20 },
  error: { color: '#b91c1c', marginBottom: 10 },
  actionBlock: { marginBottom: 4, gap: 8 },
  startBtn: { backgroundColor: COLORS.PRIMARY },
  endBtn: { backgroundColor: '#0f766e' },
  startBtnContent: { paddingVertical: 8 },
  startBtnLabel: { fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
  secondaryBtn: { marginTop: 8 },
  startedBadge: {
    color: '#166534',
    fontSize: 14,
    fontWeight: '700',
  },
  endedBadge: {
    color: '#0f766e',
    fontSize: 14,
    fontWeight: '700',
  },
  waitingText: {
    color: ON_CARD_MUTED,
    fontSize: 13,
    fontStyle: 'italic',
  },
});
