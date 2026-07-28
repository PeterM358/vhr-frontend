import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, Button, FAB, Text, TextInput } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';

import ScreenBackground from '../components/ScreenBackground';
import AppCard from '../components/ui/AppCard';
import OrgAppHeader from '../components/org/OrgAppHeader';
import ServiceRecordDatePicker from '../components/vehicle/ServiceRecordDatePicker';
import {
  attachWorkOrderMedia,
  createWorkOrderExpense,
  deleteWorkOrderExpense,
  endWorkOrder,
  getWorkOrder,
  issueWorkOrderMaterials,
  listWorkOrders,
  startWorkOrder,
  updateWorkOrder,
} from '../api/orgOperations';
import { listOrgMaterials, listWarehouseLocations } from '../api/orgWarehouse';
import { resolveActiveOrganizationId } from '../utils/orgWorkspace';
import {
  navigateToOrgCreateTask,
  navigateToOrgHome,
} from '../navigation/webNavigation';
import { useTranslation } from '../i18n';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { COLORS } from '../constants/colors';
import { useScrollContentBottomPadding } from '../utils/mobileWebInsets';
import { pickReceiptOrInvoiceAttachment } from '../utils/pickDocumentFile';

const ON_CARD = '#0F172A';
const ON_CARD_MUTED = '#475569';

const TASK_TABS = [
  { id: 'open', labelKey: 'org.tasks.tabs.open', fallback: 'Open' },
  { id: 'completed', labelKey: 'org.tasks.tabs.completed', fallback: 'Completed' },
  { id: 'all', labelKey: 'org.tasks.tabs.all', fallback: 'All' },
];

const EXPENSE_TYPES = [
  { id: 'fuel', labelKey: 'org.tasks.expenseTypes.fuel', fallback: 'Fuel' },
  { id: 'toll', labelKey: 'org.tasks.expenseTypes.toll', fallback: 'Toll' },
  { id: 'parking', labelKey: 'org.tasks.expenseTypes.parking', fallback: 'Parking' },
  { id: 'other', labelKey: 'org.tasks.expenseTypes.other', fallback: 'Other' },
];

function isOpenTaskStatus(status) {
  const value = String(status || '').toLowerCase();
  return value !== 'done' && value !== 'cancelled';
}

function isCompletedTaskStatus(status) {
  const value = String(status || '').toLowerCase();
  return value === 'done' || value === 'cancelled';
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

function scheduledRangeLabel(task) {
  if (!task?.scheduled_date) return '';
  const start = task.scheduled_date;
  const end = task.scheduled_end_date;
  const datePart =
    end && end !== start ? `${start} → ${end}` : start;
  if (task.planned_start) {
    const timePart = String(task.planned_start).slice(0, 5);
    const endTime = task.planned_end ? `–${String(task.planned_end).slice(0, 5)}` : '';
    return `${datePart} ${timePart}${endTime}`;
  }
  return datePart;
}

function scheduledStartLabel(task) {
  return scheduledRangeLabel(task);
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

function opUnitLabel(op) {
  return (
    op?.activity?.default_unit ||
    op?.activity?.unit?.symbol ||
    op?.activity?.unit?.code ||
    ''
  );
}

function isDistanceOutput(op) {
  const measure = String(op?.activity?.measure_kind || op?.activity?.unit?.measure_kind || '').toLowerCase();
  if (measure === 'distance') return true;
  const symbol = String(opUnitLabel(op)).toLowerCase();
  return symbol === 'km' || symbol.includes('km');
}

/** Worker-facing label for the one output field — never bare "Actual quantity". */
function outputFieldLabel(op, t) {
  const unit = opUnitLabel(op);
  const measure = String(op?.activity?.measure_kind || op?.activity?.unit?.measure_kind || '').toLowerCase();
  if (measure === 'area' || unit === 'm²' || String(unit).toLowerCase() === 'm2') {
    return t('org.tasks.outputArea', { unit: unit || 'm²' }, `Painted area (${unit || 'm²'})`);
  }
  if (measure === 'distance' || isDistanceOutput(op)) {
    return t('org.tasks.outputDistance', { unit: unit || 'km' }, `Distance (${unit || 'km'})`);
  }
  if (measure === 'volume') {
    return t('org.tasks.outputVolume', { unit: unit || 'm³' }, `Volume (${unit || 'm³'})`);
  }
  if (measure === 'mass' || measure === 'weight') {
    return t('org.tasks.outputWeight', { unit: unit || 'kg' }, `Weight (${unit || 'kg'})`);
  }
  if (measure === 'count') {
    return t('org.tasks.outputCount', { unit: unit || 'pcs' }, `Count (${unit || 'pcs'})`);
  }
  if (measure === 'time' || measure === 'duration') {
    return t('org.tasks.outputHours', { unit: unit || 'h' }, `Hours (${unit || 'h'})`);
  }
  if (unit) {
    return t('org.tasks.outputWithUnit', { unit }, `Output (${unit})`);
  }
  return t('org.tasks.outputGeneric', null, 'Output completed');
}

/** Mirror backend compute_expected_input_qty for live draft suggestions. */
function computeExpectedFromNorms(op, outputQty) {
  const qty = Number(String(outputQty ?? '').replace(',', '.'));
  if (!Number.isFinite(qty)) return null;
  const norms = op?.activity?.norms || {};
  const kind = String(op?.activity?.activity_kind || '').toLowerCase();
  const transport = norms.transport && typeof norms.transport === 'object' ? norms.transport : {};
  const generic = norms.generic && typeof norms.generic === 'object' ? norms.generic : {};
  const useTransport =
    kind === 'transport' ||
    transport.base_rate != null ||
    transport.per_ton_rate != null;
  if (useTransport && (transport.base_rate != null || transport.per_ton_rate != null)) {
    const base = Number(transport.base_rate || 0);
    const perTon = Number(transport.per_ton_rate || 0);
    const expected = (qty / 100) * base;
    if (!Number.isFinite(expected)) return null;
    return String(Number(expected.toPrecision(12)));
  }
  if (generic.rate != null) {
    const rate = Number(generic.rate);
    const basis = Number(generic.basis_qty != null ? generic.basis_qty : 1);
    if (!Number.isFinite(rate) || !Number.isFinite(basis) || basis === 0) return null;
    const expected = (qty / basis) * rate;
    return String(Number(expected.toPrecision(12)));
  }
  return null;
}

function expectedInputUnit(op) {
  return (
    op?.expected_input_unit ||
    op?.activity?.norm_input_unit?.symbol ||
    op?.activity?.norm_input_unit?.code ||
    ''
  );
}

function leftoverKey(opId, materialId) {
  return `${opId}:${materialId}`;
}

function taskMaterialLeftoverKey(materialId) {
  return `task:${materialId}`;
}

function buildLeftoverDrafts(operations, materials) {
  const drafts = {};
  (operations || []).forEach((op) => {
    const existing = Array.isArray(op.material_leftovers) ? op.material_leftovers : [];
    existing.forEach((line) => {
      if (line?.material_id != null) {
        drafts[leftoverKey(op.id, line.material_id)] =
          line.leftover_qty != null ? String(line.leftover_qty) : '';
        drafts[taskMaterialLeftoverKey(line.material_id)] =
          line.leftover_qty != null ? String(line.leftover_qty) : '';
      }
    });
    const mats = op.activity?.default_materials || [];
    mats.forEach((mat) => {
      const key = leftoverKey(op.id, mat.id);
      if (drafts[key] == null) drafts[key] = '';
    });
  });
  (materials || []).forEach((mat) => {
    const mid = mat.material_id || mat.id;
    if (mid == null) return;
    const key = taskMaterialLeftoverKey(mid);
    if (drafts[key] == null) {
      drafts[key] = mat.leftover_qty != null ? String(mat.leftover_qty) : '';
    }
  });
  return drafts;
}

function formatMoneyMinor(amountMinor, currency = 'BGN') {
  if (amountMinor == null || amountMinor === '') return '';
  const n = Number(amountMinor);
  if (!Number.isFinite(n)) return '';
  return `${(n / 100).toFixed(2)} ${currency || 'BGN'}`;
}

function formatIssueAudit(issue, t) {
  const who =
    issue?.issued_by?.display_name ||
    issue?.issued_by?.email ||
    (issue?.issued_by_id != null ? `#${issue.issued_by_id}` : '');
  const when = issue?.issued_at ? String(issue.issued_at).slice(0, 16).replace('T', ' ') : '';
  const loc =
    issue?.location?.name ||
    issue?.location?.code ||
    (issue?.location_id != null ? `#${issue.location_id}` : '');
  const qtyParts = (issue?.lines || []).map((line) => {
    const name = line.material?.name || `#${line.material_id}`;
    const unit = line.unit_code ? ` ${line.unit_code}` : '';
    return `${name}: ${line.quantity ?? '—'}${unit}`;
  });
  return [
    who
      ? t('org.tasks.issueAuditWho', { name: who }, `Issued by ${who}`)
      : null,
    when
      ? t('org.tasks.issueAuditWhen', { time: when }, `at ${when}`)
      : null,
    loc
      ? t('org.tasks.issueAuditLocation', { location: loc }, `from ${loc}`)
      : null,
    qtyParts.length ? qtyParts.join(', ') : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

function receiptFileLabel(ref) {
  if (!ref) return '';
  const parts = String(ref).split('/');
  return parts[parts.length - 1] || ref;
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
    routeTab === 'all' || routeTab === 'completed' ? routeTab : 'open',
  );
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [selectedId, setSelectedId] = useState(routeTaskId);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [busyAction, setBusyAction] = useState(false);
  const [photoDraft, setPhotoDraft] = useState('');
  const [documentDraft, setDocumentDraft] = useState('');
  const [actualDrafts, setActualDrafts] = useState({});
  const [meterStartDrafts, setMeterStartDrafts] = useState({});
  const [meterEndDrafts, setMeterEndDrafts] = useState({});
  const [leftoverDrafts, setLeftoverDrafts] = useState({});
  const [stockRows, setStockRows] = useState([]);
  const [locations, setLocations] = useState([]);
  const [issueMaterialId, setIssueMaterialId] = useState(null);
  const [issueQty, setIssueQty] = useState('');
  const [issueUnit, setIssueUnit] = useState('');
  const [issueLocationId, setIssueLocationId] = useState(null);
  const [expenseType, setExpenseType] = useState('fuel');
  const [expenseQty, setExpenseQty] = useState('');
  const [expenseUnit, setExpenseUnit] = useState('L');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseNote, setExpenseNote] = useState('');
  const [expenseReceipt, setExpenseReceipt] = useState(null);

  const onBack = useCallback(() => {
    if (selectedId) {
      setSelectedId(null);
      setSelectedDetail(null);
      return;
    }
    navigateToOrgHome(navigation, { orgId: routeOrgId || orgId });
  }, [navigation, orgId, routeOrgId, selectedId]);

  const openCreateTab = useCallback(() => {
    navigateToOrgCreateTask(navigation, { orgId: routeOrgId || orgId });
  }, [navigation, orgId, routeOrgId]);

  const selectTab = useCallback((tabId) => {
    setActiveTab(tabId);
    setSelectedId(null);
    setSelectedDetail(null);
  }, []);

  const visibleRows = useMemo(() => {
    let list = rows;
    if (activeTab === 'open') {
      list = list.filter((row) => isOpenTaskStatus(row.status));
    } else if (activeTab === 'completed') {
      list = list.filter((row) => isCompletedTaskStatus(row.status));
    }
    return list;
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
      const params = {};
      if (filterFrom) params.from = filterFrom;
      if (filterTo) params.to = filterTo;
      const data = await listWorkOrders(token, resolved, params);
      setCanManage(Boolean(data?.can_manage));
      setRows(Array.isArray(data?.results) ? data.results : []);
    } catch (e) {
      setError(e.message || t('org.tasks.loadError', null, 'Could not load tasks.'));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [filterFrom, filterTo, routeOrgId, t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    if (routeTaskId) setSelectedId(routeTaskId);
  }, [routeTaskId]);

  useEffect(() => {
    if (routeTab === 'all' || routeTab === 'open' || routeTab === 'completed') {
      setActiveTab(routeTab);
    }
  }, [routeTab]);

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
          setLeftoverDrafts(buildLeftoverDrafts(detail.operations, detail.materials));
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

  useEffect(() => {
    let cancelled = false;
    const loadWarehouse = async () => {
      if (!orgId || !selectedId || !canManage) {
        setStockRows([]);
        setLocations([]);
        return;
      }
      try {
        const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
        const [mats, locs] = await Promise.all([
          listOrgMaterials(token, orgId, {}).catch(() => ({ results: [] })),
          listWarehouseLocations(token, orgId, { active: 1 }).catch(() => ({ results: [] })),
        ]);
        if (!cancelled) {
          setStockRows(Array.isArray(mats?.results) ? mats.results : []);
          setLocations(
            (Array.isArray(locs?.results) ? locs.results : []).filter(
              (row) => row.is_active !== false,
            ),
          );
        }
      } catch {
        if (!cancelled) {
          setStockRows([]);
          setLocations([]);
        }
      }
    };
    loadWarehouse();
    return () => {
      cancelled = true;
    };
  }, [orgId, selectedId, canManage]);

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
    setLeftoverDrafts(buildLeftoverDrafts(updated.operations, updated.materials));
  };

  const firstConsumingOpId = useMemo(() => {
    const ops = selected?.operations || [];
    const consuming = ops.find((op) => op.activity?.consumes_materials);
    return consuming?.id || ops[0]?.id || null;
  }, [selected]);

  const buildOperationsPayload = useCallback(() => {
    const ops = selected?.operations || [];
    const materials = selected?.materials || [];
    return ops.map((op) => {
      const distance = isDistanceOutput(op);
      const payload = { id: op.id };
      if (distance) {
        if (meterStartDrafts[op.id] != null && String(meterStartDrafts[op.id]).trim() !== '') {
          payload.meter_start = String(meterStartDrafts[op.id]).trim();
        }
        if (meterEndDrafts[op.id] != null && String(meterEndDrafts[op.id]).trim() !== '') {
          payload.meter_end = String(meterEndDrafts[op.id]).trim();
        }
      } else if (actualDrafts[op.id] != null && String(actualDrafts[op.id]).trim() !== '') {
        payload.actual_qty = String(actualDrafts[op.id]).trim();
      }
      const leftovers = [];
      const seen = new Set();
      const pushLeftover = (materialId, label) => {
        if (materialId == null || seen.has(materialId)) return;
        seen.add(materialId);
        const fromTask = leftoverDrafts[taskMaterialLeftoverKey(materialId)];
        const fromOp = leftoverDrafts[leftoverKey(op.id, materialId)];
        const raw = fromTask != null && String(fromTask).trim() !== '' ? fromTask : fromOp;
        if (raw == null || String(raw).trim() === '') return;
        leftovers.push({
          material_id: materialId,
          leftover_qty: String(raw).trim(),
          label: label || '',
        });
      };
      if (op.id === firstConsumingOpId || (!firstConsumingOpId && op === ops[0])) {
        materials.forEach((mat) => {
          pushLeftover(mat.material_id || mat.id, mat.name || '');
        });
      }
      (op.activity?.default_materials || []).forEach((mat) => {
        pushLeftover(mat.id, mat.name || '');
      });
      if (leftovers.length) payload.material_leftovers = leftovers;
      return payload;
    });
  }, [
    selected,
    meterStartDrafts,
    meterEndDrafts,
    actualDrafts,
    leftoverDrafts,
    firstConsumingOpId,
  ]);

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

  const acknowledgeEnd = async (task) => {
    if (!orgId || !task?.id) return;
    setBusyAction(true);
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const operations = buildOperationsPayload();
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
      const operations = buildOperationsPayload();
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

  const submitIssue = async () => {
    if (!orgId || !selected?.id || !issueMaterialId) return;
    const qty = String(issueQty || '').trim();
    if (!qty) {
      Alert.alert(
        t('org.tasks.issueTitle', null, 'Issue materials'),
        t('org.tasks.issueQtyRequired', null, 'Enter quantity to issue.'),
      );
      return;
    }
    setBusyAction(true);
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      await issueWorkOrderMaterials(token, orgId, selected.id, {
        location_id: issueLocationId,
        lines: [
          {
            material_id: issueMaterialId,
            quantity: qty,
            unit_code: issueUnit.trim(),
          },
        ],
      });
      const detail = await getWorkOrder(token, orgId, selected.id);
      replaceTask(detail);
      setIssueQty('');
      setIssueUnit('');
    } catch (e) {
      Alert.alert(
        t('org.tasks.issueTitle', null, 'Issue materials'),
        e.message || t('org.tasks.issueError', null, 'Could not issue materials.'),
      );
    } finally {
      setBusyAction(false);
    }
  };

  const submitExpense = async () => {
    if (!orgId || !selected?.id) return;
    const qty = String(expenseQty || '').trim();
    const amountRaw = String(expenseAmount || '').trim().replace(',', '.');
    let amountMinor = null;
    if (amountRaw) {
      const major = Number(amountRaw);
      if (!Number.isFinite(major) || major < 0) {
        Alert.alert(
          t('org.tasks.expensesTitle', null, 'Road expenses'),
          t('org.tasks.expenseAmountInvalid', null, 'Enter a valid amount.'),
        );
        return;
      }
      amountMinor = Math.round(major * 100);
    }
    if (!qty && amountMinor == null && !expenseNote.trim() && !expenseReceipt) {
      Alert.alert(
        t('org.tasks.expensesTitle', null, 'Road expenses'),
        t(
          'org.tasks.expenseRequired',
          null,
          'Enter quantity, amount, note, or attach a receipt.',
        ),
      );
      return;
    }
    setBusyAction(true);
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      let payload;
      if (expenseReceipt) {
        const form = new FormData();
        form.append('expense_type', expenseType);
        if (qty) form.append('quantity', qty);
        if (expenseUnit.trim()) form.append('unit_code', expenseUnit.trim());
        if (amountMinor != null) form.append('amount_minor', String(amountMinor));
        if (expenseNote.trim()) form.append('note', expenseNote.trim());
        const file = expenseReceipt.file;
        if (file) {
          form.append('file', file, expenseReceipt.fileName || 'receipt.jpg');
        } else if (expenseReceipt.uri) {
          form.append('file', {
            uri: expenseReceipt.uri,
            name: expenseReceipt.fileName || 'receipt.jpg',
            type: expenseReceipt.mimeType || 'image/jpeg',
          });
        }
        payload = form;
      } else {
        payload = {
          expense_type: expenseType,
          quantity: qty || null,
          unit_code: expenseUnit.trim(),
          amount_minor: amountMinor,
          note: expenseNote.trim(),
        };
      }
      await createWorkOrderExpense(token, orgId, selected.id, payload);
      const detail = await getWorkOrder(token, orgId, selected.id);
      replaceTask(detail);
      setExpenseQty('');
      setExpenseAmount('');
      setExpenseNote('');
      setExpenseReceipt(null);
    } catch (e) {
      Alert.alert(
        t('org.tasks.expensesTitle', null, 'Road expenses'),
        e.message || t('org.tasks.expenseError', null, 'Could not add expense.'),
      );
    } finally {
      setBusyAction(false);
    }
  };

  const pickExpenseReceipt = async () => {
    try {
      const picked = await pickReceiptOrInvoiceAttachment();
      if (picked) setExpenseReceipt(picked);
    } catch (e) {
      Alert.alert(
        t('org.tasks.expensesTitle', null, 'Road expenses'),
        e.message || t('org.tasks.expenseReceiptError', null, 'Could not pick receipt.'),
      );
    }
  };

  const suggestionForMaterial = useCallback(
    (materialId) => {
      const mid = Number(materialId);
      const fromMats = (selected?.materials || []).find(
        (m) => Number(m.material_id || m.id) === mid,
      );
      if (fromMats?.suggested_qty != null) {
        return {
          qty: String(fromMats.suggested_qty),
          unit: fromMats.unit_code || '',
        };
      }
      for (const op of selected?.operations || []) {
        const liveQty =
          actualDrafts[op.id] ||
          (isDistanceOutput(op)
            ? null
            : op.actual_qty != null
              ? String(op.actual_qty)
              : op.planned_qty != null
                ? String(op.planned_qty)
                : '');
        let expected = null;
        if (isDistanceOutput(op)) {
          const start = Number(String(meterStartDrafts[op.id] || op.meter_start || '').replace(',', '.'));
          const end = Number(String(meterEndDrafts[op.id] || op.meter_end || '').replace(',', '.'));
          if (Number.isFinite(start) && Number.isFinite(end) && end >= start) {
            expected = computeExpectedFromNorms(op, end - start);
          } else if (op.expected_input_qty != null) {
            expected = String(op.expected_input_qty);
          }
        } else if (liveQty) {
          expected = computeExpectedFromNorms(op, liveQty) || (op.expected_input_qty != null ? String(op.expected_input_qty) : null);
        } else if (op.expected_input_qty != null) {
          expected = String(op.expected_input_qty);
        }
        const defaults = op.activity?.default_material_ids || [];
        const suggested = (op.suggested_materials || []).find(
          (s) => Number(s.material_id) === mid,
        );
        if (suggested?.suggested_qty != null || (expected && defaults.map(Number).includes(mid))) {
          return {
            qty: String(suggested?.suggested_qty || expected),
            unit: suggested?.unit_code || expectedInputUnit(op) || '',
          };
        }
      }
      return null;
    },
    [selected, actualDrafts, meterStartDrafts, meterEndDrafts],
  );

  const removeExpense = async (expenseId) => {
    if (!orgId || !selected?.id || !expenseId) return;
    setBusyAction(true);
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      await deleteWorkOrderExpense(token, orgId, selected.id, expenseId);
      const detail = await getWorkOrder(token, orgId, selected.id);
      replaceTask(detail);
    } catch (e) {
      Alert.alert(
        t('org.tasks.expensesTitle', null, 'Road expenses'),
        e.message || t('org.tasks.expenseDeleteError', null, 'Could not delete expense.'),
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
      <View style={styles.screenRoot}>
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
        contentContainerStyle={[styles.scroll, { paddingBottom: scrollBottomPadding + (canManage && !selected ? 72 : 0) }]}
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
              <>
              <View style={styles.modeRow}>
                {TASK_TABS.map((item) => {
                  const active = activeTab === item.id;
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => selectTab(item.id)}
                      style={[
                        styles.modeChip,
                        active && styles.modeChipActive,
                      ]}
                    >
                      <Text style={[styles.modeChipText, active && styles.modeChipTextActive]}>
                        {t(item.labelKey, null, item.fallback)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <AppCard style={styles.card}>
                <Text style={styles.section}>
                  {t('org.tasks.dateFilterTitle', null, 'Schedule dates')}
                </Text>
                <Text style={styles.opMeta}>
                  {t(
                    'org.tasks.dateFilterHint',
                    null,
                    'Filter by scheduled start/end range.',
                  )}
                </Text>
                <ServiceRecordDatePicker
                  label={t('org.tasks.filterFrom', null, 'From')}
                  valueIso={filterFrom || null}
                  onChangeIso={setFilterFrom}
                  optional
                  maxIso={filterTo || undefined}
                />
                <ServiceRecordDatePicker
                  label={t('org.tasks.filterTo', null, 'To')}
                  valueIso={filterTo || null}
                  onChangeIso={setFilterTo}
                  optional
                  minIso={filterFrom || undefined}
                />
                {(filterFrom || filterTo) ? (
                  <Button
                    mode="text"
                    onPress={() => {
                      setFilterFrom('');
                      setFilterTo('');
                    }}
                    style={styles.secondaryBtn}
                  >
                    {t('org.tasks.clearDateFilter', null, 'Clear dates')}
                  </Button>
                ) : null}
              </AppCard>
              </>
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
                  'Fill the labeled output for each operation (e.g. painted m² or distance). Materials leftovers are in Materials. Start/End only track time.',
                )}
              </Text>
              {(selected.operations || []).map((op, idx) => {
                const editable =
                  canShowEndButton(selected) || selected.status === 'in_progress';
                const unitLabelText = opUnitLabel(op);
                const distance = isDistanceOutput(op);
                const draftQty = actualDrafts[op.id] || '';
                const liveExpected =
                  !distance && draftQty
                    ? computeExpectedFromNorms(op, draftQty)
                    : distance
                      ? (() => {
                          const start = Number(
                            String(meterStartDrafts[op.id] || '').replace(',', '.'),
                          );
                          const end = Number(
                            String(meterEndDrafts[op.id] || '').replace(',', '.'),
                          );
                          if (
                            Number.isFinite(start) &&
                            Number.isFinite(end) &&
                            end >= start
                          ) {
                            return computeExpectedFromNorms(op, end - start);
                          }
                          return null;
                        })()
                      : null;
                const expectedQty =
                  liveExpected ||
                  (op.expected_input_qty != null ? String(op.expected_input_qty) : null);
                const expectedUnit = expectedInputUnit(op);
                return (
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
                              'Distance (km) = meter end − start.',
                            )}
                          </Text>
                        </>
                      ) : (
                        <TextInput
                          label={outputFieldLabel(op, t)}
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
                          ? ` · ${t('org.tasks.outputDistance', { unit: unitLabelText || 'km' }, `Distance (${unitLabelText || 'km'})`)}: ${op.actual_qty}`
                          : ''}
                      </Text>
                    ) : op.actual_qty != null ? (
                      <Text style={styles.opMeta}>
                        {outputFieldLabel(op, t)}: {op.actual_qty}
                        {unitLabelText ? ` ${unitLabelText}` : ''}
                      </Text>
                    ) : null}

                    {expectedQty != null ? (
                      <Text style={styles.opMeta}>
                        {t(
                          'org.tasks.suggestedMaterialsQty',
                          {
                            qty: expectedQty,
                            unit: expectedUnit,
                          },
                          `Suggested materials from norm: ~${expectedQty}${expectedUnit ? ` ${expectedUnit}` : ''}`,
                        )}
                      </Text>
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
                {t('org.tasks.materialsTitle', null, 'Materials')}
              </Text>
              <Text style={styles.opMeta}>
                {t(
                  'org.tasks.materialsHint',
                  null,
                  'Warehouse issues materials onto this task. Enter leftover after work — consumed = issued − leftover.',
                )}
              </Text>
              {(selected.materials || []).length === 0 ? (
                <Text style={styles.opMeta}>
                  {t(
                    'org.tasks.materialsAskWarehouse',
                    null,
                    'Ask warehouse to issue materials for this task.',
                  )}
                </Text>
              ) : (
                (selected.materials || []).map((mat) => {
                  const mid = mat.material_id || mat.id;
                  const unitChip = mat.unit_code ? ` · ${mat.unit_code}` : '';
                  const editable =
                    canShowEndButton(selected) || selected.status === 'in_progress';
                  const issued = mat.issued_qty != null;
                  return (
                    <View key={mid} style={styles.opRow}>
                      <Text style={styles.opTitle}>
                        {mat.name || `#${mid}`}
                        {unitChip ? (
                          <Text style={styles.unitChip}> {mat.unit_code}</Text>
                        ) : null}
                      </Text>
                      <Text style={styles.opMeta}>
                        {[
                          issued
                            ? t(
                                'org.tasks.issuedQty',
                                { qty: mat.issued_qty, unit: mat.unit_code || '' },
                                `Issued: ${mat.issued_qty} ${mat.unit_code || ''}`.trim(),
                              )
                            : t(
                                'org.tasks.notIssuedAskWarehouse',
                                null,
                                'Not issued — ask warehouse',
                              ),
                          mat.suggested_qty != null && !issued
                            ? t(
                                'org.tasks.suggestedIssueQty',
                                {
                                  qty: mat.suggested_qty,
                                  unit: mat.unit_code || '',
                                },
                                `Need ~${mat.suggested_qty} ${mat.unit_code || ''}`.trim(),
                              )
                            : null,
                          mat.leftover_qty != null
                            ? t(
                                'org.tasks.leftoverQtyShort',
                                { qty: mat.leftover_qty },
                                `Leftover: ${mat.leftover_qty}`,
                              )
                            : null,
                          mat.consumed_qty != null
                            ? t(
                                'org.tasks.consumedQty',
                                { qty: mat.consumed_qty },
                                `Consumed: ${mat.consumed_qty}`,
                              )
                            : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </Text>
                      {editable && issued ? (
                        <TextInput
                          label={t(
                            'org.tasks.leftoverFor',
                            { name: mat.name || `#${mid}` },
                            `Leftover — ${mat.name || mid}`,
                          )}
                          value={leftoverDrafts[taskMaterialLeftoverKey(mid)] || ''}
                          onChangeText={(value) =>
                            setLeftoverDrafts((prev) => ({
                              ...prev,
                              [taskMaterialLeftoverKey(mid)]: value,
                            }))
                          }
                          mode="outlined"
                          keyboardType="decimal-pad"
                          style={styles.input}
                          textColor={ON_CARD}
                        />
                      ) : null}
                    </View>
                  );
                })
              )}
              {(selected.material_issues || []).length > 0 ? (
                <>
                  <Text style={styles.fieldLabel}>
                    {t('org.tasks.issueLogTitle', null, 'Issue log')}
                  </Text>
                  {(selected.material_issues || []).map((issue) => (
                    <Text key={issue.id} style={styles.opMeta}>
                      {formatIssueAudit(issue, t)}
                      {(issue.lines || [])
                        .filter((line) => line.leftover_entered_by || line.leftover_entered_at)
                        .map((line) => {
                          const who =
                            line.leftover_entered_by?.display_name ||
                            line.leftover_entered_by?.email ||
                            (line.leftover_entered_by_id != null
                              ? `#${line.leftover_entered_by_id}`
                              : '');
                          const when = line.leftover_entered_at
                            ? String(line.leftover_entered_at).slice(0, 16).replace('T', ' ')
                            : '';
                          return (
                            `\n${t(
                              'org.tasks.leftoverAudit',
                              { name: who, time: when, qty: line.leftover_qty },
                              `Leftover ${line.leftover_qty ?? '—'} by ${who || '—'} ${when}`,
                            )}`
                          );
                        })
                        .join('')}
                    </Text>
                  ))}
                </>
              ) : null}
              {canManage && selected.status !== 'done' && selected.status !== 'cancelled' ? (
                <>
                  <Text style={styles.fieldLabel}>
                    {t('org.tasks.issueFromWarehouse', null, 'Issue from warehouse')}
                  </Text>
                  <Text style={styles.opMeta}>
                    {t(
                      'org.tasks.issueFromWarehouseHint',
                      null,
                      'Storekeeper: worker shows this task — issue stock here (including depot fuel). Suggested qty from norms when output is known.',
                    )}
                  </Text>
                  <View style={styles.chipWrap}>
                    {stockRows.slice(0, 24).map((row) => {
                      const mid = row.material_id || row.material?.id || row.id;
                      const active = Number(issueMaterialId) === Number(mid);
                      const label =
                        row.material?.name ||
                        row.name ||
                        row.part_number ||
                        `#${mid}`;
                      const onHand =
                        row.quantity_on_hand != null ? ` (${row.quantity_on_hand})` : '';
                      return (
                        <Pressable
                          key={mid}
                          onPress={() => {
                            setIssueMaterialId(mid);
                            if (row.unit_code) setIssueUnit(String(row.unit_code));
                            const sug = suggestionForMaterial(mid);
                            if (sug?.qty) {
                              setIssueQty(sug.qty);
                              if (sug.unit) setIssueUnit(sug.unit);
                            }
                          }}
                          style={[styles.chip, active && styles.chipActive]}
                        >
                          <Text style={[styles.chipText, active && styles.chipTextActive]}>
                            {label}
                            {onHand}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  {issueMaterialId && suggestionForMaterial(issueMaterialId) ? (
                    <Text style={styles.opMeta}>
                      {t(
                        'org.tasks.suggestedIssueQty',
                        {
                          qty: suggestionForMaterial(issueMaterialId).qty,
                          unit: suggestionForMaterial(issueMaterialId).unit || '',
                        },
                        `Need ~${suggestionForMaterial(issueMaterialId).qty} ${suggestionForMaterial(issueMaterialId).unit || ''}`.trim(),
                      )}
                    </Text>
                  ) : null}
                  {locations.length > 0 ? (
                    <>
                      <Text style={styles.fieldLabel}>
                        {t('org.tasks.issueLocation', null, 'Location (optional)')}
                      </Text>
                      <View style={styles.chipWrap}>
                        <Pressable
                          onPress={() => setIssueLocationId(null)}
                          style={[styles.chip, !issueLocationId && styles.chipActive]}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              !issueLocationId && styles.chipTextActive,
                            ]}
                          >
                            {t('org.tasks.noLocation', null, 'None')}
                          </Text>
                        </Pressable>
                        {locations.map((loc) => {
                          const active = Number(issueLocationId) === Number(loc.id);
                          return (
                            <Pressable
                              key={loc.id}
                              onPress={() => setIssueLocationId(loc.id)}
                              style={[styles.chip, active && styles.chipActive]}
                            >
                              <Text
                                style={[styles.chipText, active && styles.chipTextActive]}
                              >
                                {loc.name || loc.code || `#${loc.id}`}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </>
                  ) : null}
                  <TextInput
                    label={t('org.tasks.issueQty', null, 'Quantity to issue')}
                    value={issueQty}
                    onChangeText={setIssueQty}
                    mode="outlined"
                    keyboardType="decimal-pad"
                    style={styles.input}
                    textColor={ON_CARD}
                  />
                  <TextInput
                    label={t('org.tasks.issueUnit', null, 'Unit (kg, L, …)')}
                    value={issueUnit}
                    onChangeText={setIssueUnit}
                    mode="outlined"
                    style={styles.input}
                    textColor={ON_CARD}
                  />
                  <Button
                    mode="contained"
                    loading={busyAction}
                    disabled={busyAction || !issueMaterialId}
                    onPress={submitIssue}
                    style={styles.secondaryBtn}
                  >
                    {t('org.tasks.issueCta', null, 'Issue to task')}
                  </Button>
                </>
              ) : null}
            </AppCard>

            <AppCard style={styles.card}>
              <Text style={styles.section}>
                {t('org.tasks.expensesTitle', null, 'Road / extra expenses')}
              </Text>
              <Text style={styles.opMeta}>
                {t(
                  'org.tasks.expensesHint',
                  null,
                  'On-road fuel or any receipt: add expense + attach касова бележка / фактура. Depot fuel already in stock → issue from warehouse, not here.',
                )}
              </Text>
              {(selected.expenses || []).length === 0 ? (
                <Text style={styles.opMeta}>
                  {t('org.tasks.expensesEmpty', null, 'No road expenses yet.')}
                </Text>
              ) : (
                (selected.expenses || []).map((exp) => (
                  <View key={exp.id} style={styles.opRow}>
                    <Text style={styles.opTitle}>
                      {t(
                        `org.tasks.expenseTypes.${exp.expense_type}`,
                        null,
                        exp.expense_type,
                      )}
                      {exp.quantity != null
                        ? ` · ${exp.quantity}${exp.unit_code ? ` ${exp.unit_code}` : ''}`
                        : ''}
                      {exp.amount_minor != null
                        ? ` · ${formatMoneyMinor(exp.amount_minor, exp.currency)}`
                        : ''}
                    </Text>
                    {exp.note ? <Text style={styles.opMeta}>{exp.note}</Text> : null}
                    {exp.receipt_ref ? (
                      <Text style={styles.opMeta}>
                        {t(
                          'org.tasks.expenseReceiptAttached',
                          { name: receiptFileLabel(exp.receipt_ref) },
                          `Receipt: ${receiptFileLabel(exp.receipt_ref)}`,
                        )}
                      </Text>
                    ) : null}
                    {selected.status !== 'done' && selected.status !== 'cancelled' ? (
                      <Button
                        mode="text"
                        compact
                        onPress={() => removeExpense(exp.id)}
                        disabled={busyAction}
                      >
                        {t('common.delete', null, 'Delete')}
                      </Button>
                    ) : null}
                  </View>
                ))
              )}
              {selected.status !== 'done' && selected.status !== 'cancelled' ? (
                <>
                  <View style={styles.chipWrap}>
                    {EXPENSE_TYPES.map((item) => {
                      const active = expenseType === item.id;
                      return (
                        <Pressable
                          key={item.id}
                          onPress={() => setExpenseType(item.id)}
                          style={[styles.chip, active && styles.chipActive]}
                        >
                          <Text style={[styles.chipText, active && styles.chipTextActive]}>
                            {t(item.labelKey, null, item.fallback)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <TextInput
                    label={t('org.tasks.expenseQty', null, 'Quantity (e.g. liters)')}
                    value={expenseQty}
                    onChangeText={setExpenseQty}
                    mode="outlined"
                    keyboardType="decimal-pad"
                    style={styles.input}
                    textColor={ON_CARD}
                  />
                  <TextInput
                    label={t('org.tasks.expenseUnit', null, 'Unit')}
                    value={expenseUnit}
                    onChangeText={setExpenseUnit}
                    mode="outlined"
                    style={styles.input}
                    textColor={ON_CARD}
                  />
                  <TextInput
                    label={t('org.tasks.expenseAmount', null, 'Amount (e.g. 180.00)')}
                    value={expenseAmount}
                    onChangeText={setExpenseAmount}
                    mode="outlined"
                    keyboardType="decimal-pad"
                    style={styles.input}
                    textColor={ON_CARD}
                  />
                  <TextInput
                    label={t('org.tasks.expenseNote', null, 'Note')}
                    value={expenseNote}
                    onChangeText={setExpenseNote}
                    mode="outlined"
                    style={styles.input}
                    textColor={ON_CARD}
                  />
                  <Button
                    mode="outlined"
                    disabled={busyAction}
                    onPress={pickExpenseReceipt}
                    style={styles.secondaryBtn}
                  >
                    {expenseReceipt
                      ? t(
                          'org.tasks.expenseReceiptPicked',
                          { name: expenseReceipt.fileName || 'receipt' },
                          `Receipt: ${expenseReceipt.fileName || 'receipt'}`,
                        )
                      : t(
                          'org.tasks.expenseAttachReceipt',
                          null,
                          'Attach receipt (photo/PDF)',
                        )}
                  </Button>
                  {expenseReceipt ? (
                    <Button
                      mode="text"
                      compact
                      onPress={() => setExpenseReceipt(null)}
                      disabled={busyAction}
                    >
                      {t('org.tasks.expenseClearReceipt', null, 'Clear receipt')}
                    </Button>
                  ) : null}
                  <Button
                    mode="outlined"
                    loading={busyAction}
                    disabled={busyAction}
                    onPress={submitExpense}
                    style={styles.secondaryBtn}
                  >
                    {t('org.tasks.addExpense', null, 'Add expense')}
                  </Button>
                </>
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
                    : activeTab === 'completed'
                      ? t('org.tasks.completedEmpty', null, 'No completed tasks.')
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
      {canManage && !selected && !loading ? (
        <FAB
          icon="plus"
          style={[styles.fab, { backgroundColor: COLORS.PRIMARY }]}
          onPress={openCreateTab}
          label={t('org.tasks.addTask', null, 'Add task')}
          color="#fff"
        />
      ) : null}
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  screenRoot: { flex: 1 },
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
  fieldLabel: {
    color: ON_CARD,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 6,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  chip: {
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(15,23,42,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.12)',
  },
  chipActive: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  chipText: {
    color: ON_CARD,
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#fff',
  },
  unitChip: {
    color: COLORS.PRIMARY,
    fontWeight: '700',
    fontSize: 12,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 24,
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
