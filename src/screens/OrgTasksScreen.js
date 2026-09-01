import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Linking, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, Button, FAB, Text, TextInput } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';

import ScreenBackground from '../components/ScreenBackground';
import AppCard from '../components/ui/AppCard';
import OrgAppHeader from '../components/org/OrgAppHeader';
import ServiceRecordDatePicker from '../components/vehicle/ServiceRecordDatePicker';
import {
  ackWorkOrder,
  attachWorkOrderMedia,
  checkInWorkOrder,
  confirmWorkOrderMaterialIssue,
  createWorkOrderExpense,
  createWorkOrderShipment,
  deleteWorkOrder,
  deleteWorkOrderExpense,
  deleteWorkOrderShipment,
  draftInvoiceFromWorkOrders,
  endWorkOrder,
  completeProductionWorkOrder,
  getWorkOrder,
  issueWorkOrderMaterials,
  listUnitsOfMeasure,
  listWorkOrders,
  getOperationsSummary,
  startWorkOrder,
  updateWorkOrder,
  updateWorkOrderShipment,
} from '../api/orgOperations';
import ExpenseReceiptGallery from '../components/org/ExpenseReceiptGallery';
import TransportDriverDayWizard from '../components/org/TransportDriverDayWizard';
import UnitOfMeasurePicker from '../components/org/UnitOfMeasurePicker';
import WorkOrderShipmentsEditor from '../components/org/WorkOrderShipmentsEditor';
import { compressImageForUpload } from '../utils/compressImage';
import { listOrgMaterials, listWarehouseLocations } from '../api/orgWarehouse';
import { resolveActiveOrganizationId, orgHasProductionActivity, organizationMembershipFor, readOrganizationMemberships } from '../utils/orgWorkspace';
import {
  navigateToOrgCreateTask,
  navigateToOrgHome,
  navigateToOrgInvoicing,
} from '../navigation/webNavigation';
import { useTranslation } from '../i18n';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { COLORS } from '../constants/colors';
import { useScrollContentBottomPadding } from '../utils/mobileWebInsets';
import { pickReceiptFromCamera, pickReceiptOrInvoiceAttachment } from '../utils/pickDocumentFile';
import { confirmMessage } from '../utils/crossPlatformAlert';
import { formatMaterialListLabel, stripOldMaterialSuffix } from '../utils/materialDisplayLabel';
import { formatLocalClock, localDateTimeFromParts } from '../utils/formatLocalClock';

const ON_CARD = '#0F172A';
const ON_CARD_MUTED = '#475569';

function hoursMeterDelta(prevRaw, currRaw) {
  const prev = Number(String(prevRaw || '').trim().replace(',', '.'));
  const curr = Number(String(currRaw || '').trim().replace(',', '.'));
  if (!Number.isFinite(prev) || !Number.isFinite(curr)) return null;
  if (curr < prev) return null;
  const delta = curr - prev;
  return String(Math.round(delta * 100) / 100);
}

const TIME_OPTIONS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00',
];

const TASK_TABS = [
  { id: 'open', labelKey: 'org.tasks.tabs.open', fallback: 'Open' },
  { id: 'completed', labelKey: 'org.tasks.tabs.completed', fallback: 'Completed' },
  { id: 'all', labelKey: 'org.tasks.tabs.all', fallback: 'All' },
];

function isOpenTaskStatus(status) {
  const value = String(status || '').toLowerCase();
  return value !== 'done' && value !== 'cancelled';
}

function isCompletedTaskStatus(status) {
  const value = String(status || '').toLowerCase();
  return value === 'done' || value === 'cancelled';
}

function taskHasManufacturing(task) {
  if (String(task?.task_kind || '').toLowerCase() === 'manufacturing') return true;
  const ops = Array.isArray(task?.operations) ? task.operations : [];
  return ops.some(
    (op) =>
      String(op?.activity?.activity_kind || op?.activity_kind || '').toLowerCase() ===
      'manufacturing',
  );
}

function productionReceiptDone(task) {
  const receipt = task?.production_receipt;
  return Boolean(receipt && typeof receipt === 'object' && receipt.received_at);
}

function statusLabel(status, t) {
  return t(`org.home.tasks.status.${status}`, null, status || '');
}

function taskInvoicedStatus(task) {
  const raw = String(task?.invoiced_status || '').toLowerCase();
  if (raw === 'fully_invoiced' || raw === 'partially_invoiced' || raw === 'uninvoiced') {
    return raw;
  }
  if (task?.has_issued_invoice) return 'fully_invoiced';
  return 'uninvoiced';
}

function invoicedStatusLabel(status, t) {
  const key = String(status || 'uninvoiced');
  const fallbacks = {
    uninvoiced: 'Uninvoiced',
    partially_invoiced: 'Partial',
    fully_invoiced: 'Invoiced',
  };
  return t(`org.tasks.invoiceBadge.${key}`, null, fallbacks[key] || key);
}

function formatQtyByUnitMap(map) {
  if (!map || typeof map !== 'object') return '';
  return Object.entries(map)
    .map(([unit, qty]) => `${qty}${unit && unit !== 'qty' ? ` ${unit}` : ''}`)
    .filter(Boolean)
    .join(' · ');
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

function viewerNeedsAck(task) {
  if (!task) return false;
  if (typeof task.viewer_needs_ack === 'boolean') return task.viewer_needs_ack;
  return Boolean(task.needs_ack);
}

function canShowStartButton(task) {
  if (!task) return false;
  if (task.start_acknowledged_at || task.started_at) return false;
  if (task.status === 'done' || task.status === 'cancelled') return false;
  if (viewerNeedsAck(task)) return false;
  return task.status === 'assigned' || task.status === 'draft';
}

function canShowEndButton(task) {
  if (!task) return false;
  if (task.status === 'done' || task.status === 'cancelled') return false;
  if (task.ended_at) return false;
  return Boolean(task.start_acknowledged_at || task.started_at || task.status === 'in_progress');
}

/** True when warehouse issued materials that the driver/worker has not confirmed yet. */
function taskHasPendingMaterialConfirm(task) {
  if (!task) return false;
  if (typeof task.materials_pending_confirm === 'boolean') {
    return task.materials_pending_confirm;
  }
  const issues = Array.isArray(task.material_issues) ? task.material_issues : [];
  return issues.some(
    (issue) => Boolean(issue?.pending_confirm) || issue?.status === 'issued',
  );
}

function firstPendingMaterialIssue(task) {
  const issues = Array.isArray(task?.material_issues) ? task.material_issues : [];
  return (
    issues.find(
      (issue) => Boolean(issue?.pending_confirm) || issue?.status === 'issued',
    ) || null
  );
}

function isWaitingForStartTime(task) {
  if (!task?.scheduled_date || !task?.planned_start) return false;
  if (task.start_acknowledged_at || task.started_at) return false;
  if (viewerNeedsAck(task)) return false;
  const start = localDateTimeFromParts(task.scheduled_date, task.planned_start);
  if (!start) return false;
  return Date.now() < start.getTime();
}

function timeChipValue(raw) {
  if (!raw) return '';
  return String(raw).slice(0, 5);
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

function reportUnitsForOp(op) {
  const units = Array.isArray(op?.activity?.report_units) ? op.activity.report_units : [];
  if (units.length) return units;
  if (op?.activity?.unit) return [op.activity.unit];
  return [];
}

function isKmUnit(unit) {
  const code = String(unit?.code || '').toUpperCase();
  const symbol = String(unit?.symbol || unit?.name || '').toLowerCase();
  return code === 'KM' || symbol === 'km';
}

function isDurationUnit(unit) {
  return String(unit?.measure_kind || '').toLowerCase() === 'duration';
}

function hasKmMeterInput(op) {
  return reportUnitsForOp(op).some(isKmUnit);
}

/** Duration/km are entered once on the task — not on every operation card. */
function isTaskLevelReportUnit(unit) {
  return isDurationUnit(unit) || isKmUnit(unit);
}

function opLocalReportUnits(op) {
  return reportUnitsForOp(op).filter((unit) => !isTaskLevelReportUnit(unit));
}

function taskNeedsFuelTank(task) {
  if (String(task?.task_kind || '').toLowerCase() === 'transport') return true;
  return (task?.operations || []).some(
    (op) => String(op?.activity?.activity_kind || '').toLowerCase() === 'transport',
  );
}


function isFuelMaterial(mat) {
  const unit = String(mat?.unit_code || '').trim().toLowerCase();
  if (
    ['l', 'л', 'lt', 'ltr', 'liter', 'litre', 'liters', 'litres', 'ml', 'мл', 'kg', 'кг'].includes(
      unit,
    )
  ) {
    return true;
  }
  const name = String(mat?.name || '').toLowerCase();
  return /fuel|diesel|petrol|gasoline|gasoil|adblue|ad.?blue|urea|freon|refrigerant|гориво|дизел|бензин|нафта|адблу|фрион|хладилен/.test(
    name,
  );
}

/** Liquid / fuel-ish units only for depot refuel UI (not packs, pcs, km, h…). */
function isFuelishUnit(unit) {
  const code = String(unit?.code || '').toUpperCase();
  const symbol = String(unit?.symbol || unit?.name || '').toLowerCase();
  const kind = String(unit?.measure_kind || '').toLowerCase();
  if (['L', 'ML', 'KG'].includes(code)) return true;
  if (['l', 'л', 'ml', 'мл', 'kg', 'кг'].includes(symbol)) return true;
  if (kind === 'volume' && (code === 'L' || code === 'ML' || symbol === 'l' || symbol === 'ml')) {
    return true;
  }
  if (kind === 'mass' && (code === 'KG' || symbol === 'kg')) return true;
  return false;
}

function isNumericIssueQty(raw) {
  const s = String(raw || '').trim().replace(',', '.');
  if (!s) return false;
  if (!/^\d+(\.\d+)?$/.test(s)) return false;
  return Number.isFinite(Number(s)) && Number(s) > 0;
}

function taskIsTransportFocused(task) {
  const ops = task?.operations || [];
  if (!ops.length) {
    return String(task?.task_kind || '').toLowerCase() === 'transport';
  }
  // Show transport driver UI when any transport op is present (mixed cards included).
  return ops.some(
    (op) => String(op?.activity?.activity_kind || '').toLowerCase() === 'transport',
  );
}

function taskIsTransportOnly(task) {
  const ops = task?.operations || [];
  if (!ops.length) {
    return String(task?.task_kind || '').toLowerCase() === 'transport';
  }
  return ops.every(
    (op) => String(op?.activity?.activity_kind || '').toLowerCase() === 'transport',
  );
}

function taskUsesFullMaterialsUi(task) {
  if (taskIsTransportOnly(task)) return false;
  const ops = task?.operations || [];
  return ops.some((op) => {
    if (op?.activity?.consumes_materials) return true;
    const defaults = op?.activity?.default_materials || [];
    return defaults.length > 0;
  }) || (task?.materials || []).some((m) => m.issued_qty != null && Number(m.issued_qty) > 0 && !isFuelMaterial(m));
}
function taskNeedsMachineHours(task) {
  return (task?.operations || []).some((op) => {
    if (reportUnitsForOp(op).some(isDurationUnit)) return true;
    return materialLinesForOp(op).some(
      (line) => String(line.basis || '').toLowerCase() === 'work_hours',
    );
  });
}

function taskNeedsKm(task) {
  return (task?.operations || []).some((op) => {
    if (reportUnitsForOp(op).some(isKmUnit)) return true;
    return isDistanceOutput(op);
  });
}

function opUsesDistanceForNorms(op) {
  if (isDistanceOutput(op)) return true;
  return reportUnitsForOp(op).some(isKmUnit);
}

/** Worker-facing label for a specific report unit. */
function reportUnitFieldLabel(unit, t) {
  const label = unit?.symbol || unit?.name || unit?.code || '';
  const measure = String(unit?.measure_kind || '').toLowerCase();
  if (measure === 'area' || label === 'm²' || String(label).toLowerCase() === 'm2') {
    return t('org.tasks.outputArea', { unit: label || 'm²' }, `Painted area (${label || 'm²'})`);
  }
  if (measure === 'distance' || isKmUnit(unit)) {
    return t('org.tasks.outputDistance', { unit: label || 'km' }, `Distance (${label || 'km'})`);
  }
  if (measure === 'volume' || String(label).toUpperCase() === 'L') {
    return t('org.tasks.outputVolume', { unit: label || 'L' }, `Volume (${label || 'L'})`);
  }
  if (measure === 'mass' || measure === 'weight') {
    return t('org.tasks.outputWeight', { unit: label || 'kg' }, `Weight (${label || 'kg'})`);
  }
  if (measure === 'count') {
    return t('org.tasks.outputCount', { unit: label || 'pcs' }, `Count (${label || 'pcs'})`);
  }
  if (measure === 'duration' || measure === 'time') {
    return t('org.tasks.outputHours', { unit: label || 'h' }, `Working hours (${label || 'h'})`);
  }
  if (label) {
    return t('org.tasks.outputWithUnit', { unit: label }, `Output (${label})`);
  }
  return t('org.tasks.outputGeneric', null, 'Output completed');
}

/** Worker-facing label for the one output field — never bare "Actual quantity". */
function outputFieldLabel(op, t) {
  const units = reportUnitsForOp(op);
  if (units.length === 1) return reportUnitFieldLabel(units[0], t);
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

function hydrateActualByUnitDrafts(operations) {
  const drafts = {};
  (operations || []).forEach((op) => {
    const map = {};
    const stored = op.actual_by_unit && typeof op.actual_by_unit === 'object' ? op.actual_by_unit : {};
    reportUnitsForOp(op).forEach((unit) => {
      const uid = unit.id;
      const fromStored = stored[String(uid)] ?? stored[uid];
      if (fromStored != null && String(fromStored).trim() !== '') {
        map[uid] = String(fromStored);
      } else if (
        Number(uid) === Number(op.activity?.unit_id) &&
        op.actual_qty != null
      ) {
        map[uid] = String(op.actual_qty);
      } else {
        map[uid] = '';
      }
    });
    drafts[op.id] = map;
  });
  return drafts;
}

function primaryOutputDraft(op, actualByUnitDrafts, actualDrafts, meterStartDrafts, meterEndDrafts) {
  const units = reportUnitsForOp(op);
  const byUnit = (actualByUnitDrafts && actualByUnitDrafts[op.id]) || {};
  if (hasKmMeterInput(op)) {
    const start = Number(String((meterStartDrafts && meterStartDrafts[op.id]) || '').replace(',', '.'));
    const end = Number(String((meterEndDrafts && meterEndDrafts[op.id]) || '').replace(',', '.'));
    if (Number.isFinite(start) && Number.isFinite(end) && end >= start) {
      return String(end - start);
    }
  }
  const primaryId = op.activity?.unit_id || (units[0] && units[0].id);
  if (primaryId != null && byUnit[primaryId] != null && String(byUnit[primaryId]).trim() !== '') {
    return String(byUnit[primaryId]);
  }
  const nonDuration = units.find((u) => !isDurationUnit(u) && !isKmUnit(u));
  if (nonDuration && byUnit[nonDuration.id] != null && String(byUnit[nonDuration.id]).trim() !== '') {
    return String(byUnit[nonDuration.id]);
  }
  if (actualDrafts && actualDrafts[op.id] != null && String(actualDrafts[op.id]).trim() !== '') {
    return String(actualDrafts[op.id]);
  }
  return op.actual_qty != null
    ? String(op.actual_qty)
    : op.planned_qty != null
      ? String(op.planned_qty)
      : '';
}

function workHoursDraft(op, actualByUnitDrafts) {
  const units = reportUnitsForOp(op);
  const byUnit = (actualByUnitDrafts && actualByUnitDrafts[op.id]) || {};
  const duration = units.find(isDurationUnit);
  if (duration && byUnit[duration.id] != null && String(byUnit[duration.id]).trim() !== '') {
    return String(byUnit[duration.id]);
  }
  if (op.planned_hours != null) return String(op.planned_hours);
  if (op.activity?.planned_hours != null) return String(op.activity.planned_hours);
  return '';
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

function materialLinesForOp(op) {
  const norms = op?.activity?.norms || {};
  const materials = norms.materials && typeof norms.materials === 'object' ? norms.materials : {};
  if (Array.isArray(materials.material_lines) && materials.material_lines.length) {
    return materials.material_lines;
  }
  if (Array.isArray(op?.activity?.material_lines) && op.activity.material_lines.length) {
    return op.activity.material_lines;
  }
  const ids = op?.activity?.default_material_ids || [];
  return ids.map((id) => ({
    material_id: id,
    rate: null,
    per_qty: '1',
    basis: 'output_unit',
    unit_id: null,
  }));
}

function computeLineSuggestedQty(line, { outputQty, workHours }) {
  if (!line) return null;
  const basis = String(line.basis || 'output_unit');
  let rateRaw = null;
  let perRaw = '1';
  if (basis === 'work_hours') {
    rateRaw = line.rate_hours != null && String(line.rate_hours).trim() !== ''
      ? line.rate_hours
      : line.rate;
    perRaw = line.rate_hours != null && String(line.rate_hours).trim() !== ''
      ? line.per_hours != null
        ? line.per_hours
        : 1
      : line.per_qty != null
        ? line.per_qty
        : 1;
  } else {
    rateRaw = line.rate;
    perRaw = line.per_qty != null ? line.per_qty : 1;
  }
  if (rateRaw == null || String(rateRaw).trim() === '') return null;
  const rate = Number(String(rateRaw).replace(',', '.'));
  const perQty = Number(String(perRaw).replace(',', '.'));
  if (!Number.isFinite(rate) || !Number.isFinite(perQty) || perQty === 0) return null;
  if (basis === 'work_hours') {
    const hours = Number(String(workHours ?? '').replace(',', '.'));
    if (!Number.isFinite(hours)) return null;
    return String(Number(((hours / perQty) * rate).toPrecision(12)));
  }
  const qty = Number(String(outputQty ?? '').replace(',', '.'));
  if (!Number.isFinite(qty)) return null;
  return String(Number(((qty / perQty) * rate).toPrecision(12)));
}

function collectTaskDefaultMaterials(task) {
  const byId = new Map();
  (task?.operations || []).forEach((op) => {
    const lines = materialLinesForOp(op);
    const briefs = op?.activity?.default_materials || [];
    const briefById = new Map(briefs.map((b) => [Number(b.id), b]));
    lines.forEach((line) => {
      const mid = Number(line.material_id);
      if (!mid || byId.has(mid)) return;
      const brief = briefById.get(mid) || {};
      byId.set(mid, {
        material_id: mid,
        name: stripOldMaterialSuffix(brief.name || brief.label || '') || `Material #${mid}`,
        label: brief.label || stripOldMaterialSuffix(brief.name || '') || `Material #${mid}`,
        part_number: brief.part_number || '',
        from_operations: true,
        norm_rate:
          String(line.basis || '').toLowerCase() === 'work_hours'
            ? line.rate_hours ?? line.rate ?? brief.norm_rate
            : line.rate ?? brief.norm_rate,
        norm_per_qty:
          String(line.basis || '').toLowerCase() === 'work_hours'
            ? line.per_hours || line.per_qty || brief.norm_per_qty || '1'
            : line.per_qty || brief.norm_per_qty || '1',
        norm_basis: line.basis || brief.norm_basis || 'output_unit',
        norm_unit_id: line.unit_id ?? brief.norm_unit_id ?? brief.ops_unit_id,
        unit_code: brief.unit_code || brief.unit_symbol || '',
      });
    });
  });
  return Array.from(byId.values());
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
    const name = formatMaterialListLabel(
      { name: line.material?.name, part_number: line.material?.part_number || line.part_number },
      { fallbackId: line.material_id, includeSku: false },
    );
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
  /** work | production — when org has production activity */
  const [orderSurface, setOrderSurface] = useState(
    route?.params?.orderSurface === 'production' ? 'production' : 'work',
  );
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [periodSummary, setPeriodSummary] = useState(null);
  const [selectedId, setSelectedId] = useState(routeTaskId);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [busyAction, setBusyAction] = useState(false);
  const [photoDraft, setPhotoDraft] = useState('');
  const [documentDraft, setDocumentDraft] = useState('');
  const [actualDrafts, setActualDrafts] = useState({});
  const [actualByUnitDrafts, setActualByUnitDrafts] = useState({});
  const [meterStartDrafts, setMeterStartDrafts] = useState({});
  const [meterEndDrafts, setMeterEndDrafts] = useState({});
  const [leftoverDrafts, setLeftoverDrafts] = useState({});
  const [stockRows, setStockRows] = useState([]);
  const [locations, setLocations] = useState([]);
  const [issueMaterialId, setIssueMaterialId] = useState(null);
  const [issueQty, setIssueQty] = useState('');
  const [issueUnit, setIssueUnit] = useState('');
  const [issueLocationId, setIssueLocationId] = useState(null);
  const [plannedIssueOutput, setPlannedIssueOutput] = useState('');
  const [plannedIssueHours, setPlannedIssueHours] = useState('');
  const [taskHoursStart, setTaskHoursStart] = useState('');
  const [taskHoursEnd, setTaskHoursEnd] = useState('');
  const [taskActualKm, setTaskActualKm] = useState('');
  const [taskFuelStart, setTaskFuelStart] = useState('');
  const [taskFuelEnd, setTaskFuelEnd] = useState('');
  const [taskOdometerStart, setTaskOdometerStart] = useState('');
  const [taskOdometerEnd, setTaskOdometerEnd] = useState('');
  const [showExtraMaterials, setShowExtraMaterials] = useState(false);
  const [extraMaterialSearch, setExtraMaterialSearch] = useState('');
  const [showManualExpense, setShowManualExpense] = useState(false);
  const [manualExpenseNote, setManualExpenseNote] = useState('');
  const [manualExpenseAmount, setManualExpenseAmount] = useState('');
  const [confirmIssueDrafts, setConfirmIssueDrafts] = useState({});
  const [uomUnits, setUomUnits] = useState([]);
  const [accessToken, setAccessToken] = useState('');
  const [startWizardOpen, setStartWizardOpen] = useState(false);
  const [endWizardOpen, setEndWizardOpen] = useState(false);
  const [wizardOdo, setWizardOdo] = useState('');
  const [wizardFuel, setWizardFuel] = useState('');
  const [wizardTask, setWizardTask] = useState(null);
  const [showBossFuelForm, setShowBossFuelForm] = useState(false);
  const [driverFullDetail, setDriverFullDetail] = useState(false);
  const [editScheduledDate, setEditScheduledDate] = useState('');
  const [editScheduledEndDate, setEditScheduledEndDate] = useState('');
  const [editPlannedStart, setEditPlannedStart] = useState('');
  const [editPlannedEnd, setEditPlannedEnd] = useState('');

  const [hasProduction, setHasProduction] = useState(false);

  const onBack = useCallback(() => {
    if (selectedId) {
      setSelectedId(null);
      setSelectedDetail(null);
      return;
    }
    navigateToOrgHome(navigation, { orgId: routeOrgId || orgId });
  }, [navigation, orgId, routeOrgId, selectedId]);

  const openCreateTab = useCallback(
    (mode) => {
      const resolvedMode =
        mode === 'production' || mode === 'site'
          ? mode
          : orderSurface === 'production'
            ? 'production'
            : 'site';
      navigateToOrgCreateTask(navigation, {
        orgId: routeOrgId || orgId,
        taskMode: resolvedMode,
      });
    },
    [navigation, orgId, orderSurface, routeOrgId],
  );

  const onPressAddFab = useCallback(() => {
    if (!hasProduction) {
      openCreateTab('site');
      return;
    }
    // Surface already chose work vs PO — open that create path directly.
    openCreateTab(orderSurface === 'production' ? 'production' : 'site');
  }, [hasProduction, openCreateTab, orderSurface]);

  const selectTab = useCallback((tabId) => {
    setActiveTab(tabId);
    setSelectedId(null);
    setSelectedDetail(null);
  }, []);

  const visibleRows = useMemo(() => {
    let list = rows;
    if (hasProduction) {
      list = list.filter((row) => {
        const isPo = taskHasManufacturing(row);
        return orderSurface === 'production' ? isPo : !isPo;
      });
    }
    if (activeTab === 'open') {
      list = list.filter((row) => isOpenTaskStatus(row.status));
    } else if (activeTab === 'completed') {
      list = list.filter((row) => isCompletedTaskStatus(row.status));
    }
    return list;
  }, [activeTab, hasProduction, orderSurface, rows]);

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
      try {
        const memberships = await readOrganizationMemberships();
        const membership = organizationMembershipFor(memberships, resolved);
        setHasProduction(orgHasProductionActivity(membership));
      } catch (_) {
        setHasProduction(false);
      }
      const params = { compact: 1 };
      if (filterFrom) params.from = filterFrom;
      if (filterTo) params.to = filterTo;
      setAccessToken(token || '');
      const [data, unitsData, summaryData] = await Promise.all([
        listWorkOrders(token, resolved, params),
        listUnitsOfMeasure(token, resolved).catch(() => ({ results: [] })),
        filterFrom || filterTo
          ? getOperationsSummary(token, resolved, params).catch(() => null)
          : Promise.resolve(null),
      ]);
      setCanManage(Boolean(data?.can_manage));
      setRows(Array.isArray(data?.results) ? data.results : []);
      setUomUnits(Array.isArray(unitsData?.results) ? unitsData.results : []);
      setPeriodSummary(summaryData);
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
    setDriverFullDetail(false);
  }, [selectedId]);

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
          setActualByUnitDrafts(hydrateActualByUnitDrafts(detail.operations));
          setMeterStartDrafts(meterStarts);
          setMeterEndDrafts(meterEnds);
          setTaskHoursStart(detail.hours_start != null ? String(detail.hours_start) : '');
          setTaskHoursEnd(detail.hours_end != null ? String(detail.hours_end) : '');
          setTaskActualKm(detail.actual_km != null ? String(detail.actual_km) : '');
          setTaskFuelStart(detail.fuel_start != null ? String(detail.fuel_start) : '');
          setTaskFuelEnd(detail.fuel_end != null ? String(detail.fuel_end) : '');
          setTaskOdometerStart(detail.odometer_start != null ? String(detail.odometer_start) : '');
          setTaskOdometerEnd(detail.odometer_end != null ? String(detail.odometer_end) : '');
          setLeftoverDrafts(buildLeftoverDrafts(detail.operations, detail.materials));
          setConfirmIssueDrafts({});
          setShowManualExpense(false);
          setManualExpenseNote('');
          setManualExpenseAmount('');
          setEditScheduledDate(detail.scheduled_date || '');
          setEditScheduledEndDate(detail.scheduled_end_date || '');
          setEditPlannedStart(timeChipValue(detail.planned_start));
          setEditPlannedEnd(timeChipValue(detail.planned_end));
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
    setActualByUnitDrafts(hydrateActualByUnitDrafts(updated.operations));
    setMeterStartDrafts(meterStarts);
    setMeterEndDrafts(meterEnds);
    setTaskHoursStart(updated.hours_start != null ? String(updated.hours_start) : '');
    setTaskHoursEnd(updated.hours_end != null ? String(updated.hours_end) : '');
    setTaskActualKm(updated.actual_km != null ? String(updated.actual_km) : '');
    setTaskFuelStart(updated.fuel_start != null ? String(updated.fuel_start) : '');
    setTaskFuelEnd(updated.fuel_end != null ? String(updated.fuel_end) : '');
    setTaskOdometerStart(updated.odometer_start != null ? String(updated.odometer_start) : '');
    setTaskOdometerEnd(updated.odometer_end != null ? String(updated.odometer_end) : '');
    setLeftoverDrafts(buildLeftoverDrafts(updated.operations, updated.materials));
  };

  const appendFuelPayload = (payload) => {
    if (String(taskFuelStart || '').trim() !== '') {
      payload.fuel_start = String(taskFuelStart).trim();
    } else if (selected?.fuel_start != null) {
      payload.fuel_start = null;
    }
    if (String(taskFuelEnd || '').trim() !== '') {
      payload.fuel_end = String(taskFuelEnd).trim();
    } else if (selected?.fuel_end != null) {
      payload.fuel_end = null;
    }
    if (String(taskOdometerStart || '').trim() !== '') {
      payload.odometer_start = String(taskOdometerStart).trim();
    } else if (selected?.odometer_start != null) {
      payload.odometer_start = null;
    }
    if (String(taskOdometerEnd || '').trim() !== '') {
      payload.odometer_end = String(taskOdometerEnd).trim();
    } else if (selected?.odometer_end != null) {
      payload.odometer_end = null;
    }
    return payload;
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
      const units = reportUnitsForOp(op);
      const byUnit = actualByUnitDrafts[op.id] || {};
      const payload = { id: op.id };
      const actualByUnit = {};
      units.forEach((unit) => {
        if (isKmUnit(unit)) return;
        const raw = byUnit[unit.id];
        if (raw != null && String(raw).trim() !== '') {
          actualByUnit[String(unit.id)] = String(raw).trim();
        }
      });
      if (Object.keys(actualByUnit).length) {
        payload.actual_by_unit = actualByUnit;
      }
      if (hasKmMeterInput(op)) {
        if (meterStartDrafts[op.id] != null && String(meterStartDrafts[op.id]).trim() !== '') {
          payload.meter_start = String(meterStartDrafts[op.id]).trim();
        }
        if (meterEndDrafts[op.id] != null && String(meterEndDrafts[op.id]).trim() !== '') {
          payload.meter_end = String(meterEndDrafts[op.id]).trim();
        }
      } else if (
        !units.length &&
        actualDrafts[op.id] != null &&
        String(actualDrafts[op.id]).trim() !== ''
      ) {
        payload.actual_qty = String(actualDrafts[op.id]).trim();
      } else if (units.length === 1 && actualByUnit[String(units[0].id)]) {
        payload.actual_qty = actualByUnit[String(units[0].id)];
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
    actualByUnitDrafts,
    leftoverDrafts,
    firstConsumingOpId,
  ]);

  const acknowledgeStart = async (task, wizardValues = null) => {
    if (!orgId || !task?.id) return;
    if (viewerNeedsAck(task)) {
      Alert.alert(
        t('org.tasks.startTitle', null, 'Start task'),
        t(
          'org.tasks.confirmSeenRequired',
          null,
          "Confirm you've seen this task before starting.",
        ),
      );
      return;
    }
    setBusyAction(true);
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const payload = {};
      if (wizardValues) {
        if (String(wizardValues.odometer || '').trim()) {
          payload.odometer_start = String(wizardValues.odometer).trim();
        }
        if (String(wizardValues.fuel || '').trim()) {
          payload.fuel_start = String(wizardValues.fuel).trim();
        }
      }
      const updated = await startWorkOrder(token, orgId, task.id, payload);
      replaceTask(updated);
      setStartWizardOpen(false);
      setWizardTask(null);
    } catch (e) {
      Alert.alert(
        t('org.tasks.startTitle', null, 'Start task'),
        e.message || t('org.tasks.startError', null, 'Could not start the task.'),
      );
    } finally {
      setBusyAction(false);
    }
  };

  const confirmSeenTask = async (task) => {
    if (!orgId || !task?.id) return;
    setBusyAction(true);
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const updated = await ackWorkOrder(token, orgId, task.id);
      replaceTask(updated);
    } catch (e) {
      Alert.alert(
        t('org.tasks.confirmSeenCta', null, "Confirm I've seen this task"),
        e.message || t('org.tasks.confirmSeenError', null, 'Could not confirm this task.'),
      );
    } finally {
      setBusyAction(false);
    }
  };

  const saveTaskSchedule = async () => {
    if (!orgId || !selected?.id) return;
    const startDate = editScheduledDate || '';
    const endDate = editScheduledEndDate || '';
    if (startDate && endDate && endDate < startDate) {
      Alert.alert(
        t('org.tasks.scheduleEditTitle', null, 'Schedule'),
        t(
          'org.tasks.endDateBeforeStart',
          null,
          'End date must be on or after the start date.',
        ),
      );
      return;
    }
    const sameDay = startDate && (!endDate || endDate === startDate);
    if (
      sameDay &&
      editPlannedStart &&
      editPlannedEnd &&
      editPlannedEnd < editPlannedStart
    ) {
      Alert.alert(
        t('org.tasks.scheduleEditTitle', null, 'Schedule'),
        t(
          'org.tasks.endTimeBeforeStart',
          null,
          'End time must be on or after the start time when on the same day.',
        ),
      );
      return;
    }
    setBusyAction(true);
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const updated = await updateWorkOrder(token, orgId, selected.id, {
        scheduled_date: editScheduledDate || null,
        scheduled_end_date: editScheduledEndDate || null,
        planned_start: editPlannedStart || null,
        planned_end: editPlannedEnd || null,
      });
      replaceTask(updated);
      setEditScheduledDate(updated.scheduled_date || '');
      setEditScheduledEndDate(updated.scheduled_end_date || '');
      setEditPlannedStart(timeChipValue(updated.planned_start));
      setEditPlannedEnd(timeChipValue(updated.planned_end));
      Alert.alert(
        t('org.tasks.scheduleEditTitle', null, 'Schedule'),
        t(
          'org.tasks.scheduleSaved',
          null,
          'Schedule updated. Workers must confirm again.',
        ),
      );
    } catch (e) {
      Alert.alert(
        t('org.tasks.scheduleEditTitle', null, 'Schedule'),
        e.message || t('org.tasks.scheduleSaveError', null, 'Could not save schedule.'),
      );
    } finally {
      setBusyAction(false);
    }
  };

  const openStartWizard = (task) => {
    if (viewerNeedsAck(task)) {
      Alert.alert(
        t('org.tasks.startTitle', null, 'Start task'),
        t(
          'org.tasks.confirmSeenRequired',
          null,
          "Confirm you've seen this task before starting.",
        ),
      );
      return;
    }
    if (taskNeedsFuelTank(task)) {
      setWizardTask(task);
      setWizardOdo(task.odometer_start != null ? String(task.odometer_start) : '');
      setWizardFuel(task.fuel_start != null ? String(task.fuel_start) : '');
      setStartWizardOpen(true);
      return;
    }
    acknowledgeStart(task);
  };

  const appendHoursMeterPayload = (payload, task = selected) => {
    const startVal = String(taskHoursStart || '').trim();
    const endVal = String(taskHoursEnd || '').trim();
    if (startVal !== '') {
      payload.hours_start = startVal;
    } else if (task?.hours_start != null) {
      payload.hours_start = null;
    }
    if (endVal !== '') {
      payload.hours_end = endVal;
    } else if (task?.hours_end != null) {
      payload.hours_end = null;
    }
  };

  const acknowledgeEnd = async (task, wizardValues = null) => {
    if (!orgId || !task?.id) return;
    setBusyAction(true);
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const operations = buildOperationsPayload();
      const payload = { operations };
      appendHoursMeterPayload(payload, task);
      if (wizardValues) {
        if (String(wizardValues.odometer || '').trim()) {
          payload.odometer_end = String(wizardValues.odometer).trim();
        }
        if (String(wizardValues.fuel || '').trim()) {
          payload.fuel_end = String(wizardValues.fuel).trim();
        }
        const startOdo = Number(task.odometer_start || taskOdometerStart);
        const endOdo = Number(wizardValues.odometer);
        if (
          Number.isFinite(startOdo) &&
          Number.isFinite(endOdo) &&
          endOdo >= startOdo &&
          !String(taskActualKm || '').trim()
        ) {
          payload.actual_km = String(endOdo - startOdo);
        }
      } else {
        if (String(taskActualKm || '').trim() !== '') {
          payload.actual_km = String(taskActualKm).trim();
        }
        appendFuelPayload(payload);
      }
      const updated = await endWorkOrder(token, orgId, task.id, payload);
      replaceTask(updated);
      setEndWizardOpen(false);
      setWizardTask(null);
      if (canManage && taskInvoicedStatus(updated) !== 'fully_invoiced') {
        Alert.alert(
          t('org.invoicing.promptTitle', null, 'Create invoice for this job?'),
          t(
            'org.invoicing.promptBody',
            null,
            'The job is done. Create an invoice draft now, or leave it uninvoiced for later (Accounting → Uninvoiced jobs).',
          ),
          [
            {
              text: t('org.invoicing.promptLater', null, 'Not now'),
              style: 'cancel',
            },
            {
              text: t('org.invoicing.promptYes', null, 'Yes'),
              onPress: async () => {
                try {
                  await draftInvoiceFromWorkOrders(token, orgId, [task.id]);
                  navigateToOrgInvoicing(navigation, {
                    orgId,
                    tab: 'invoices',
                    workOrderIds: [task.id],
                  });
                } catch (invErr) {
                  Alert.alert(
                    t('org.invoicing.createErrorTitle', null, 'Invoice'),
                    invErr.message ||
                      t('org.invoicing.createError', null, 'Could not create invoice draft.'),
                  );
                  navigateToOrgInvoicing(navigation, {
                    orgId,
                    tab: 'uninvoiced',
                    workOrderIds: [task.id],
                  });
                }
              },
            },
          ],
        );
      }
    } catch (e) {
      const message =
        e?.code === 'materials_pending_confirm'
          ? t(
              'org.tasks.confirmMaterialsFirst',
              null,
              'Confirm warehouse materials first',
            )
          : e.message || t('org.tasks.endError', null, 'Could not end the task.');
      Alert.alert(t('org.tasks.endTitle', null, 'End work'), message);
    } finally {
      setBusyAction(false);
    }
  };

  const completeProduction = async (task) => {
    if (!orgId || !task?.id) return;
    if (taskHasPendingMaterialConfirm(task)) {
      Alert.alert(
        t('org.tasks.completeProductionTitle', null, 'Complete production'),
        t(
          'org.tasks.confirmMaterialsFirst',
          null,
          'Confirm warehouse materials first',
        ),
      );
      return;
    }
    setBusyAction(true);
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const operations = buildOperationsPayload();
      const payload = { operations };
      appendHoursMeterPayload(payload, task);
      const plannedOrActual = (task.operations || []).find(
        (op) =>
          String(op?.activity?.activity_kind || '').toLowerCase() === 'manufacturing' &&
          (op.actual_qty != null || op.planned_qty != null),
      );
      const qty =
        plannedOrActual?.actual_qty != null
          ? String(plannedOrActual.actual_qty)
          : plannedOrActual?.planned_qty != null
            ? String(plannedOrActual.planned_qty)
            : null;
      if (qty) payload.output_qty = qty;
      const updated = await completeProductionWorkOrder(token, orgId, task.id, payload);
      replaceTask(updated);
      const receipt = updated?.production_receipt || {};
      Alert.alert(
        t('org.tasks.completeProductionTitle', null, 'Complete production'),
        t(
          'org.tasks.completeProductionToast',
          { qty: receipt.qty || qty || '—', materialId: receipt.material_id || '—' },
          `Finished goods received into stock (qty ${receipt.qty || qty || '—'}).`,
        ),
      );
    } catch (e) {
      const message =
        e?.code === 'materials_pending_confirm' ||
        e?.fieldErrors?.code === 'materials_pending_confirm'
          ? t(
              'org.tasks.confirmMaterialsFirst',
              null,
              'Confirm warehouse materials first',
            )
          : e.message ||
            t(
              'org.tasks.completeProductionError',
              null,
              'Could not complete production.',
            );
      Alert.alert(
        t('org.tasks.completeProductionTitle', null, 'Complete production'),
        message,
      );
    } finally {
      setBusyAction(false);
    }
  };

  const openEndWizard = (task) => {
    if (taskHasPendingMaterialConfirm(task)) {
      Alert.alert(
        t('org.tasks.endTitle', null, 'End work'),
        t(
          'org.tasks.confirmMaterialsFirst',
          null,
          'Confirm warehouse materials first',
        ),
      );
      return;
    }
    if (taskNeedsFuelTank(task)) {
      setWizardTask(task);
      setWizardOdo(task.odometer_end != null ? String(task.odometer_end) : taskOdometerEnd || '');
      setWizardFuel(task.fuel_end != null ? String(task.fuel_end) : taskFuelEnd || '');
      setEndWizardOpen(true);
      return;
    }
    acknowledgeEnd(task);
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
      const payload = { operations };
      appendHoursMeterPayload(payload, selected);
      if (String(taskActualKm || '').trim() !== '') {
        payload.actual_km = String(taskActualKm).trim();
      } else if (selected.actual_km != null) {
        payload.actual_km = null;
      }
      appendFuelPayload(payload);
      const updated = await updateWorkOrder(token, orgId, selected.id, payload);
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
    const transportFocused = taskIsTransportFocused(selected);
    if (transportFocused && !isNumericIssueQty(qty)) {
      Alert.alert(
        t('org.tasks.depotRefuelTitle', null, 'Refuel from base / depot'),
        t(
          'org.tasks.depotQtyNumericRequired',
          null,
          'Enter liters as a number (e.g. 400). Text like “to full” is not accepted yet.',
        ),
      );
      return;
    }
    setBusyAction(true);
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const unitCode = transportFocused
        ? String(issueUnit || 'L').trim() || 'L'
        : issueUnit.trim();
      await issueWorkOrderMaterials(token, orgId, selected.id, {
        location_id: issueLocationId,
        lines: [
          {
            material_id: issueMaterialId,
            quantity: qty.replace(',', '.'),
            unit_code: unitCode,
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

  const uploadExpensePhoto = async (picked) => {
    if (!orgId || !selected?.id || !picked) return;
    setBusyAction(true);
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      setAccessToken(token || '');
      const compressed = await compressImageForUpload(picked);
      const form = new FormData();
      form.append('expense_type', 'other');
      const file = compressed?.file;
      if (file) {
        form.append('file', file, compressed.fileName || 'receipt.jpg');
      } else if (compressed?.uri) {
        form.append('file', {
          uri: compressed.uri,
          name: compressed.fileName || 'receipt.jpg',
          type: compressed.mimeType || 'image/jpeg',
        });
      } else {
        throw new Error(t('org.tasks.expensePhotoRequired', null, 'Add at least one receipt photo.'));
      }
      await createWorkOrderExpense(token, orgId, selected.id, form);
      const detail = await getWorkOrder(token, orgId, selected.id);
      replaceTask(detail);
    } catch (e) {
      Alert.alert(
        t('org.tasks.expensesTitle', null, 'Road expenses'),
        e.message || t('org.tasks.expenseError', null, 'Could not add expense.'),
      );
    } finally {
      setBusyAction(false);
    }
  };

  const pickExpenseFromGallery = async () => {
    try {
      const picked = await pickReceiptOrInvoiceAttachment();
      if (picked) await uploadExpensePhoto(picked);
    } catch (e) {
      Alert.alert(
        t('org.tasks.expensesTitle', null, 'Road expenses'),
        e.message || t('org.tasks.expenseReceiptError', null, 'Could not pick receipt.'),
      );
    }
  };

  const pickExpenseFromCamera = async () => {
    try {
      const picked = await pickReceiptFromCamera();
      if (picked) await uploadExpensePhoto(picked);
    } catch (e) {
      Alert.alert(
        t('org.tasks.expensesTitle', null, 'Road expenses'),
        e.message || t('org.tasks.expenseReceiptError', null, 'Could not pick receipt.'),
      );
    }
  };

  const submitManualExpense = async () => {
    if (!orgId || !selected?.id) return;
    const note = String(manualExpenseNote || '').trim();
    const amount = String(manualExpenseAmount || '').trim().replace(',', '.');
    if (!note && !amount) {
      Alert.alert(
        t('org.tasks.expensesTitle', null, 'Road expenses'),
        t(
          'org.tasks.expenseManualRequired',
          null,
          'Enter a description and/or amount (with VAT).',
        ),
      );
      return;
    }
    if (amount && Number.isNaN(Number(amount))) {
      Alert.alert(
        t('org.tasks.expensesTitle', null, 'Road expenses'),
        t('org.tasks.expenseAmountInvalid', null, 'Enter a valid amount.'),
      );
      return;
    }
    setBusyAction(true);
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const payload = { expense_type: 'other', note };
      if (amount) payload.amount = amount;
      await createWorkOrderExpense(token, orgId, selected.id, payload);
      setManualExpenseNote('');
      setManualExpenseAmount('');
      setShowManualExpense(false);
      await refreshSelectedDetail();
    } catch (e) {
      Alert.alert(
        t('org.tasks.expensesTitle', null, 'Road expenses'),
        e.message || t('org.tasks.expenseError', null, 'Could not add expense.'),
      );
    } finally {
      setBusyAction(false);
    }
  };

  const confirmMaterialIssue = async (issue) => {
    if (!orgId || !selected?.id || !issue?.id) return;
    const draft = confirmIssueDrafts[issue.id] || {};
    const received =
      String(draft.received_qty || '').trim() ||
      String(issue.issued_qty || '').trim() ||
      '';
    const odometer = String(draft.odometer_km || '').trim();
    setBusyAction(true);
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const payload = {};
      if (received) payload.received_qty = received;
      if (odometer) payload.odometer_km = odometer;
      await confirmWorkOrderMaterialIssue(token, orgId, selected.id, issue.id, payload);
      await refreshSelectedDetail();
    } catch (e) {
      Alert.alert(
        t('org.tasks.depotConfirmTitle', null, 'Confirm depot fuel'),
        e.message || t('org.tasks.depotConfirmError', null, 'Could not confirm receipt.'),
      );
    } finally {
      setBusyAction(false);
    }
  };

  const refreshSelectedDetail = async () => {
    if (!orgId || !selected?.id) return null;
    const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    setAccessToken(token || '');
    const detail = await getWorkOrder(token, orgId, selected.id);
    replaceTask(detail);
    return detail;
  };

  const addShipment = async (payload) => {
    if (!orgId || !selected?.id) return;
    setBusyAction(true);
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      await createWorkOrderShipment(token, orgId, selected.id, payload);
      await refreshSelectedDetail();
    } catch (e) {
      Alert.alert(
        t('org.tasks.shipmentsTitle', null, 'Shipments'),
        e.message || t('org.tasks.shipmentError', null, 'Could not save shipment.'),
      );
    } finally {
      setBusyAction(false);
    }
  };

  const saveShipment = async (shipment, draft) => {
    if (!orgId || !selected?.id || !shipment?.id) return;
    setBusyAction(true);
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      await updateWorkOrderShipment(token, orgId, selected.id, shipment.id, draft);
      await refreshSelectedDetail();
    } catch (e) {
      Alert.alert(
        t('org.tasks.shipmentsTitle', null, 'Shipments'),
        e.message || t('org.tasks.shipmentError', null, 'Could not save shipment.'),
      );
    } finally {
      setBusyAction(false);
    }
  };

  const removeShipment = async (shipment) => {
    if (!orgId || !selected?.id || !shipment?.id) return;
    setBusyAction(true);
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      await deleteWorkOrderShipment(token, orgId, selected.id, shipment.id);
      await refreshSelectedDetail();
    } catch (e) {
      Alert.alert(
        t('org.tasks.shipmentsTitle', null, 'Shipments'),
        e.message || t('org.tasks.shipmentError', null, 'Could not save shipment.'),
      );
    } finally {
      setBusyAction(false);
    }
  };

  const saveLoadType = async (loadType) => {
    if (!orgId || !selected?.id) return;
    setBusyAction(true);
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      await updateWorkOrder(token, orgId, selected.id, { load_type: loadType });
      await refreshSelectedDetail();
    } catch (e) {
      Alert.alert(
        t('org.tasks.shipmentsTitle', null, 'Shipments'),
        e.message || t('org.tasks.shipmentError', null, 'Could not save shipment.'),
      );
    } finally {
      setBusyAction(false);
    }
  };

  const suggestionForMaterial = useCallback(
    (materialId) => {
      const mid = Number(materialId);
      const plannedOut = String(plannedIssueOutput || '').trim();
      const taskHours = String(
        taskHoursStart ||
          taskHoursEnd ||
          plannedIssueHours ||
          selected?.actual_hours ||
          '',
      ).trim();
      const taskKm = String(taskActualKm || selected?.actual_km || '').trim();

      // Task-level hours/km + optional planned output → sum per-SKU norms across ops.
      if (plannedOut || taskHours || taskKm) {
        let total = 0;
        let unit = '';
        let any = false;
        for (const op of selected?.operations || []) {
          const line = materialLinesForOp(op).find(
            (l) => Number(l.material_id) === mid,
          );
          if (!line) continue;
          const hoursFallback =
            taskHours ||
            (op.planned_hours != null
              ? String(op.planned_hours)
              : op.activity?.planned_hours != null
                ? String(op.activity.planned_hours)
                : '');
          const outputFallback = opUsesDistanceForNorms(op)
            ? taskKm || plannedOut
            : plannedOut;
          const qty = computeLineSuggestedQty(line, {
            outputQty: outputFallback,
            workHours: hoursFallback,
          });
          if (qty == null) continue;
          total += Number(qty);
          any = true;
          if (!unit) unit = expectedInputUnit(op) || '';
        }
        if (any && Number.isFinite(total)) {
          return { qty: String(Number(total.toPrecision(12))), unit };
        }
      }

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
        const liveQty = opUsesDistanceForNorms(op)
          ? taskKm ||
            primaryOutputDraft(
              op,
              actualByUnitDrafts,
              actualDrafts,
              meterStartDrafts,
              meterEndDrafts,
            )
          : primaryOutputDraft(
              op,
              actualByUnitDrafts,
              actualDrafts,
              meterStartDrafts,
              meterEndDrafts,
            );
        const hoursFallback = taskHours || workHoursDraft(op, actualByUnitDrafts);
        const line = materialLinesForOp(op).find((l) => Number(l.material_id) === mid);
        if (line?.rate != null) {
          const qty = computeLineSuggestedQty(line, {
            outputQty: liveQty,
            workHours: hoursFallback,
          });
          if (qty != null) {
            return { qty, unit: expectedInputUnit(op) || '' };
          }
        }
        let expected = null;
        if (liveQty) {
          expected =
            computeExpectedFromNorms(op, liveQty) ||
            (op.expected_input_qty != null ? String(op.expected_input_qty) : null);
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
    [
      selected,
      actualDrafts,
      actualByUnitDrafts,
      meterStartDrafts,
      meterEndDrafts,
      plannedIssueOutput,
      plannedIssueHours,
      taskHoursStart,
      taskHoursEnd,
      taskActualKm,
    ],
  );

  const transportFocused = taskIsTransportFocused(selected);

  const defaultIssueMaterials = useMemo(() => {
    const rows = collectTaskDefaultMaterials(selected);
    if (!taskIsTransportOnly(selected)) return rows;
    return rows.filter(isFuelMaterial);
  }, [selected]);

  const requiredToolsFromOps = useMemo(() => {
    const out = [];
    const seen = new Set();
    (selected?.operations || []).forEach((op) => {
      const tools = op.activity?.required_tools || [];
      tools.forEach((tool) => {
        const id = Number(tool.id);
        if (!id || seen.has(id)) return;
        seen.add(id);
        out.push(tool);
      });
    });
    return out;
  }, [selected]);

  const primaryOutputUnit = useMemo(() => {
    const ops = selected?.operations || [];
    for (const op of ops) {
      const label = opUnitLabel(op);
      if (label) return label;
    }
    return 'm²';
  }, [selected]);

  const hasHourBasedNorms = useMemo(
    () =>
      defaultIssueMaterials.some(
        (m) => String(m.norm_basis || '').toLowerCase() === 'work_hours',
      ),
    [defaultIssueMaterials],
  );

  const filteredExtraStock = useMemo(() => {
    const q = String(extraMaterialSearch || '').trim().toLowerCase();
    const defaultIds = new Set(defaultIssueMaterials.map((m) => Number(m.material_id)));
    const transportOnly = taskIsTransportOnly(selected);
    return (stockRows || [])
      .filter((row) => {
        const mid = Number(row.material_id || row.material?.id || row.id);
        if (defaultIds.has(mid)) return false;
        const matLike = {
          name: row.material?.name || row.name,
          unit_code: row.unit_code || row.material?.unit_code,
        };
        if (transportOnly && !isFuelMaterial(matLike)) return false;
        if (!q) return true;
        const label = `${row.material?.name || row.name || ''} ${
          row.part_number || row.material?.part_number || ''
        }`.toLowerCase();
        return label.includes(q);
      })
      .slice(0, 24);
  }, [stockRows, defaultIssueMaterials, extraMaterialSearch, selected]);

  const stockByMaterialId = useMemo(() => {
    const map = new Map();
    (stockRows || []).forEach((row) => {
      const mid = Number(row.material_id || row.material?.id || row.id);
      if (mid) map.set(mid, row);
    });
    return map;
  }, [stockRows]);

  const applySuggestionToIssue = useCallback(
    (mid, unitHint) => {
      setIssueMaterialId(mid);
      const transportFocused = taskIsTransportFocused(selected);
      if (transportFocused) {
        setIssueUnit(String(unitHint || 'L').trim() || 'L');
      } else if (unitHint) {
        setIssueUnit(String(unitHint));
      }
      const sug = suggestionForMaterial(mid);
      if (sug?.qty) {
        setIssueQty(sug.qty);
        if (sug.unit) setIssueUnit(sug.unit);
        else if (transportFocused) setIssueUnit('L');
      }
    },
    [suggestionForMaterial, selected],
  );

  useEffect(() => {
    if (!issueMaterialId) return;
    if (!String(plannedIssueOutput || '').trim() && !String(plannedIssueHours || '').trim()) {
      return;
    }
    const sug = suggestionForMaterial(issueMaterialId);
    if (sug?.qty) {
      setIssueQty(sug.qty);
      if (sug.unit) setIssueUnit(sug.unit);
    }
  }, [
    plannedIssueOutput,
    plannedIssueHours,
    issueMaterialId,
    suggestionForMaterial,
  ]);

  const deleteTask = async () => {
    if (!orgId || !selected?.id || !canManage) return;
    const ok = await confirmMessage(
      t('org.tasks.deleteTitle', null, 'Delete task?'),
      t(
        'org.tasks.deleteConfirm',
        null,
        'This permanently removes the task. Blocked if finished or materials were already issued.',
      ),
      {
        confirmLabel: t('common.delete', null, 'Delete'),
        cancelLabel: t('common.cancel', null, 'Cancel'),
        destructive: true,
      },
    );
    if (!ok) return;
    setBusyAction(true);
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      await deleteWorkOrder(token, orgId, selected.id);
      setSelectedId(null);
      setSelectedDetail(null);
      await load();
    } catch (e) {
      const code = e?.code;
      let message =
        e.message || t('org.tasks.deleteError', null, 'Could not delete the task.');
      if (code === 'task_completed') {
        message = t(
          'org.tasks.deleteBlockedCompleted',
          null,
          'Cannot delete a completed task. Finished tasks are kept for history.',
        );
      } else if (code === 'task_has_issued_materials') {
        message = t(
          'org.tasks.deleteBlockedMaterials',
          null,
          'Cannot delete this task because materials were already issued or consumed. Finish the task and enter leftovers instead.',
        );
      }
      Alert.alert(t('org.tasks.deleteTitle', null, 'Delete task'), message);
    } finally {
      setBusyAction(false);
    }
  };

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
    const needsSeen = viewerNeedsAck(task);
    const pendingMaterials = taskHasPendingMaterialConfirm(task);
    const pendingIssue = pendingMaterials ? firstPendingMaterialIssue(task) : null;
    const showEnd = canShowEndButton(task);
    const isManufacturing = taskHasManufacturing(task);
    const showCompleteProduction =
      isManufacturing &&
      !productionReceiptDone(task) &&
      (showEnd || (task.status === 'done' && !productionReceiptDone(task)));
    return (
      <View style={styles.actionBlock}>
        {needsSeen ? (
          <View style={styles.ackBanner}>
            <Text style={styles.waitingText}>
              {t(
                'org.tasks.confirmSeenBanner',
                null,
                'Please confirm you have seen this task before you can start.',
              )}
            </Text>
            <Button
              mode="contained"
              loading={busyAction}
              disabled={busyAction}
              onPress={() => confirmSeenTask(task)}
              style={styles.startBtn}
              contentStyle={styles.startBtnContent}
              labelStyle={styles.startBtnLabel}
            >
              {t('org.tasks.confirmSeenCta', null, "Confirm I've seen this task")}
            </Button>
          </View>
        ) : null}

        {task.start_acknowledged_at || task.started_at ? (
          <Text style={styles.startedBadge}>
            {t(
              'org.tasks.startedAt',
              { time: formatLocalClock(task.start_acknowledged_at || task.started_at) },
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
            onPress={() => openStartWizard(task)}
            style={styles.startBtn}
            contentStyle={styles.startBtnContent}
            labelStyle={styles.startBtnLabel}
          >
            {t('org.tasks.startCta', null, 'Start')}
          </Button>
        ) : null}

        {showEnd && pendingMaterials ? (
          <View style={styles.ackBanner}>
            <Text style={styles.materialsGateTitle}>
              {t(
                'org.tasks.confirmMaterialsFirst',
                null,
                'Confirm warehouse materials first',
              )}
            </Text>
            <Text style={styles.waitingText}>
              {t(
                'org.tasks.confirmMaterialsGateHint',
                null,
                'Confirm what you took from the warehouse, then enter leftovers / actuals and End work.',
              )}
            </Text>
            {pendingIssue && task.id === selected?.id ? (
              <Button
                mode="contained"
                loading={busyAction}
                disabled={busyAction}
                onPress={() => confirmMaterialIssue(pendingIssue)}
                style={styles.startBtn}
                contentStyle={styles.startBtnContent}
                labelStyle={styles.startBtnLabel}
              >
                {t('org.tasks.confirmMaterialsCta', null, 'Confirm warehouse materials')}
              </Button>
            ) : null}
          </View>
        ) : null}

        {showCompleteProduction && !pendingMaterials ? (
          <Button
            mode="contained"
            loading={busyAction}
            disabled={busyAction}
            onPress={() => completeProduction(task)}
            style={styles.endBtn}
            contentStyle={styles.startBtnContent}
            labelStyle={styles.startBtnLabel}
          >
            {t('org.tasks.completeProductionCta', null, 'Complete production')}
          </Button>
        ) : null}

        {showEnd && !pendingMaterials && !isManufacturing ? (
          <Button
            mode="contained"
            loading={busyAction}
            disabled={busyAction}
            onPress={() => openEndWizard(task)}
            style={styles.endBtn}
            contentStyle={styles.startBtnContent}
            labelStyle={styles.startBtnLabel}
          >
            {t('org.tasks.endCta', null, 'End work')}
          </Button>
        ) : null}

        {productionReceiptDone(task) ? (
          <Text style={styles.endedBadge}>
            {t(
              'org.tasks.productionReceived',
              {
                qty: task.production_receipt?.qty || '—',
              },
              `Finished goods received (${task.production_receipt?.qty || '—'})`,
            )}
          </Text>
        ) : null}

        {task.ended_at ? (
          <Text style={styles.endedBadge}>
            {t(
              'org.tasks.endedAt',
              { time: formatLocalClock(task.ended_at) },
              'Ended',
            )}
          </Text>
        ) : null}
      </View>
    );
  };

  const renderScheduleEditor = (task) => {
    if (!canManage || !task || task.status === 'done' || task.status === 'cancelled') {
      return null;
    }
    const renderTimeChips = (value, onSelect, includeNone = false) => (
      <View style={styles.chipWrap}>
        {includeNone ? (
          <Pressable
            onPress={() => onSelect('')}
            style={[styles.chip, !value && styles.chipActive]}
          >
            <Text style={[styles.chipText, !value && styles.chipTextActive]}>
              {t('org.tasks.noEndTime', null, 'None')}
            </Text>
          </Pressable>
        ) : null}
        {TIME_OPTIONS.map((opt) => {
          const active = value === opt;
          return (
            <Pressable
              key={opt}
              onPress={() => onSelect(opt)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt}</Text>
            </Pressable>
          );
        })}
      </View>
    );
    return (
      <AppCard style={styles.card}>
        <Text style={styles.section}>
          {t('org.tasks.scheduleEditTitle', null, 'Schedule')}
        </Text>
        <ServiceRecordDatePicker
          label={t('org.tasks.scheduledDate', null, 'Start date')}
          valueIso={editScheduledDate || null}
          onChangeIso={(iso) => {
            setEditScheduledDate(iso || '');
            if (iso && editScheduledEndDate && editScheduledEndDate < iso) {
              setEditScheduledEndDate('');
            }
          }}
          optional
        />
        <ServiceRecordDatePicker
          label={t('org.tasks.scheduledEndDateLabel', null, 'End date')}
          valueIso={editScheduledEndDate || null}
          onChangeIso={setEditScheduledEndDate}
          optional
          minIso={editScheduledDate || undefined}
        />
        <Text style={styles.opMeta}>{t('org.tasks.plannedStart', null, 'Start time')}</Text>
        {renderTimeChips(editPlannedStart, setEditPlannedStart)}
        <Text style={styles.opMeta}>
          {t('org.tasks.plannedEndLabel', null, 'End time')}
        </Text>
        {renderTimeChips(editPlannedEnd, (val) => {
          if (
            val &&
            editPlannedStart &&
            (!editScheduledEndDate || editScheduledEndDate === editScheduledDate) &&
            val < editPlannedStart
          ) {
            Alert.alert(
              t('org.tasks.scheduleEditTitle', null, 'Schedule'),
              t(
                'org.tasks.endTimeBeforeStart',
                null,
                'End time must be on or after the start time when on the same day.',
              ),
            );
            return;
          }
          setEditPlannedEnd(val);
        }, true)}
        <Button
          mode="contained"
          loading={busyAction}
          disabled={busyAction}
          onPress={saveTaskSchedule}
          style={styles.secondaryBtn}
        >
          {t('org.tasks.scheduleSaveCta', null, 'Save schedule')}
        </Button>
      </AppCard>
    );
  };

  const renderAckStatus = (task) => {
    if (!canManage || !task) return null;
    const people = Array.isArray(task.assignees) ? task.assignees : [];
    if (!people.length) return null;
    const pending = people.filter((p) => p.needs_ack !== false && !p.acked_at);
    const confirmed = people.filter((p) => p.acked_at || p.needs_ack === false);
    return (
      <AppCard style={styles.card}>
        <Text style={styles.section}>
          {t('org.tasks.ackStatusTitle', null, 'Seen by workers')}
        </Text>
        {pending.length === people.length ? (
          <Text style={styles.opMeta}>
            {t('org.tasks.ackStatusAllPending', null, 'Nobody has confirmed yet')}
          </Text>
        ) : confirmed.length === people.length ? (
          <Text style={styles.opMeta}>
            {t('org.tasks.ackStatusAllConfirmed', null, 'Everyone has confirmed')}
          </Text>
        ) : null}
        {people.map((person) => {
          const seen = Boolean(person.acked_at) || person.needs_ack === false;
          return (
            <View key={person.user_id || person.email} style={styles.ackRow}>
              <Text style={styles.opTitle}>{personLabel(person)}</Text>
              <Text style={seen ? styles.ackBadgeOk : styles.ackBadgePending}>
                {seen
                  ? t('org.tasks.ackStatusConfirmed', null, 'Confirmed')
                  : t('org.tasks.ackStatusPending', null, 'Not confirmed')}
              </Text>
            </View>
          );
        })}
      </AppCard>
    );
  };

  return (
    <ScreenBackground safeArea={false}>
      <View style={styles.screenRoot}>
      <OrgAppHeader
        mode="detail"
        title={
          selected
            ? taskHasManufacturing(selected)
              ? t('org.tasks.detailTitleProduction', null, 'Production order')
              : t('org.tasks.detailTitle', null, 'Task')
            : hasProduction
              ? t('org.tasks.listTitleOrders', null, 'Work & production orders')
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
              {hasProduction ? (
                <View style={styles.modeRow}>
                  {[
                    {
                      id: 'work',
                      label: t('org.tasks.surfaceWork', null, 'Work orders'),
                    },
                    {
                      id: 'production',
                      label: t('org.tasks.surfaceProduction', null, 'Production orders'),
                    },
                  ].map((item) => {
                    const active = orderSurface === item.id;
                    return (
                      <Pressable
                        key={item.id}
                        onPress={() => setOrderSurface(item.id)}
                        style={[
                          styles.modeChip,
                          active && styles.modeChipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.modeChipText,
                            active && styles.modeChipTextActive,
                          ]}
                        >
                          {item.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
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
              {periodSummary && (filterFrom || filterTo) ? (
                <AppCard style={styles.card}>
                  <Text style={styles.section}>
                    {t('org.tasks.periodSummaryTitle', null, 'Period pulse')}
                  </Text>
                  <Text style={styles.periodSummaryLine}>
                    {t(
                      'org.tasks.periodSummary',
                      {
                        area: `${periodSummary.total_m2 ?? '0'} m²`,
                        km: `${periodSummary.total_km ?? '0'} km`,
                        hours: `${periodSummary.total_hours ?? '0'} h`,
                        jobs: periodSummary.jobs_done ?? 0,
                      },
                      `From–To: ${periodSummary.total_m2 ?? '0'} m² · ${periodSummary.total_km ?? '0'} km · ${periodSummary.total_hours ?? '0'} h · ${periodSummary.jobs_done ?? 0} jobs`,
                    )}
                  </Text>
                  <Text style={styles.opMeta}>
                    {t(
                      'org.tasks.periodSummaryHint',
                      null,
                      'Totals from scheduled work in the selected range (actuals).',
                    )}
                  </Text>
                </AppCard>
              ) : null}
              </>
            ) : null}

            {selected ? (
          <>
            {taskIsTransportFocused(selected) && !driverFullDetail ? (
              <AppCard style={styles.card}>
                <TransportDriverDayWizard
                  t={t}
                  task={selected}
                  busy={busyAction}
                  fuelRequired
                  onStart={(vals) => acknowledgeStart(selected, vals)}
                  onEnd={(vals) => acknowledgeEnd(selected, vals)}
                  onConfirmSeen={() => confirmSeenTask(selected)}
                  onAddExpensePhoto={pickExpenseFromCamera}
                  onCheckIn={async (payload) => {
                    if (!orgId || !selected?.id) return;
                    setBusyAction(true);
                    try {
                      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
                      const updated = await checkInWorkOrder(
                        token,
                        orgId,
                        selected.id,
                        payload,
                      );
                      replaceTask(updated);
                    } catch (e) {
                      Alert.alert(
                        t('org.tasks.atStopCta', null, 'I’m at this stop'),
                        e.message ||
                          t('org.tasks.atStopError', null, 'Could not check in.'),
                      );
                    } finally {
                      setBusyAction(false);
                    }
                  }}
                  onOpenMaps={(step) => {
                    const url =
                      step?.maps_url ||
                      step?.fallback_url ||
                      selected.driver_route_maps_url;
                    if (url) {
                      Linking.openURL(url).catch(() => {
                        const fb = step?.fallback_url;
                        if (fb && fb !== url) Linking.openURL(fb).catch(() => {});
                      });
                    }
                  }}
                  onOpenFullDetail={() => setDriverFullDetail(true)}
                />
                {canManage ? (
                  <Button
                    mode="text"
                    onPress={() => setDriverFullDetail(true)}
                    style={styles.secondaryBtn}
                  >
                    {t(
                      'org.tasks.bossFullDetail',
                      null,
                      'Manager: open full task form',
                    )}
                  </Button>
                ) : null}
              </AppCard>
            ) : (
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
              {taskIsTransportFocused(selected) ? (
                <Button
                  mode="text"
                  onPress={() => setDriverFullDetail(false)}
                  style={styles.secondaryBtn}
                >
                  {t('org.tasks.backToDriverWizard', null, 'Back to driver day flow')}
                </Button>
              ) : null}
              {renderStartEndControls(selected)}
              {canManage &&
              selected.status !== 'done' &&
              selected.status !== 'cancelled' ? (
                <Button
                  mode="outlined"
                  loading={busyAction}
                  disabled={busyAction}
                  onPress={deleteTask}
                  style={styles.secondaryBtn}
                  textColor="#B91C1C"
                >
                  {t('org.tasks.deleteCta', null, 'Delete task')}
                </Button>
              ) : null}
            </AppCard>

            {renderScheduleEditor(selected)}
            {renderAckStatus(selected)}

            {selected.status === 'done' ? (
              <AppCard style={styles.card}>
                <Text style={styles.section}>
                  {t('org.tasks.invoicingSection', null, 'Invoicing')}
                </Text>
                <View style={styles.invoiceBadgeRow}>
                  <Text
                    style={[
                      styles.invoiceBadge,
                      taskInvoicedStatus(selected) === 'fully_invoiced' && styles.invoiceBadgeFull,
                      taskInvoicedStatus(selected) === 'partially_invoiced' &&
                        styles.invoiceBadgePartial,
                      taskInvoicedStatus(selected) === 'uninvoiced' && styles.invoiceBadgeNone,
                    ]}
                  >
                    {invoicedStatusLabel(taskInvoicedStatus(selected), t)}
                  </Text>
                </View>
                {formatQtyByUnitMap(selected.completed_qty_by_unit) ||
                formatQtyByUnitMap(selected.remaining_unbilled_qty_by_unit) ? (
                  <Text style={styles.opMeta}>
                    {t(
                      'org.tasks.invoicingTotals',
                      {
                        completed: formatQtyByUnitMap(selected.completed_qty_by_unit) || '—',
                        remaining:
                          formatQtyByUnitMap(selected.remaining_unbilled_qty_by_unit) || '0',
                      },
                      `Completed: ${formatQtyByUnitMap(selected.completed_qty_by_unit) || '—'} · Remaining unbilled: ${formatQtyByUnitMap(selected.remaining_unbilled_qty_by_unit) || '0'}`,
                    )}
                  </Text>
                ) : null}
                <Text style={[styles.fieldLabel, { marginTop: 8 }]}>
                  {t('org.tasks.invoicingLinked', null, 'Linked invoices')}
                </Text>
                {(selected.invoices || []).length ? (
                  (selected.invoices || []).map((inv) => (
                    <Button
                      key={inv.id}
                      mode="text"
                      compact
                      onPress={() =>
                        navigateToOrgInvoicing(navigation, {
                          orgId,
                          tab: 'invoices',
                          invoiceId: inv.id,
                        })
                      }
                      style={styles.secondaryBtn}
                    >
                      {t(
                        'org.tasks.invoicingOpenInvoice',
                        { number: inv.display_number || inv.number || `#${inv.id}` },
                        `Open ${inv.display_number || inv.number || `#${inv.id}`}`,
                      )}
                    </Button>
                  ))
                ) : (
                  <Text style={styles.opMeta}>
                    {t('org.tasks.invoicingNoInvoices', null, 'No invoices linked yet.')}
                  </Text>
                )}
                {(selected.invoicing_operations || []).map((op) => {
                  const unit = op.unit_symbol || op.unit_code || '';
                  const unitBit = unit ? ` ${unit}` : '';
                  return (
                    <Text key={op.operation_id} style={styles.opMeta}>
                      {t(
                        'org.tasks.invoicingOpRow',
                        {
                          name: op.activity_name || '—',
                          completed: op.completed_qty || '0',
                          billed: op.billed_qty || '0',
                          remaining: op.remaining_qty || '0',
                          unit: unitBit,
                        },
                        `${op.activity_name || '—'}: ${op.completed_qty || '0'}${unitBit} completed · ${op.billed_qty || '0'} billed · ${op.remaining_qty || '0'} left`,
                      )}
                      {' · '}
                      {invoicedStatusLabel(op.invoiced_status, t)}
                    </Text>
                  );
                })}
                {canManage && taskInvoicedStatus(selected) !== 'fully_invoiced' ? (
                  <Button
                    mode="outlined"
                    onPress={() =>
                      navigateToOrgInvoicing(navigation, {
                        orgId,
                        tab: 'uninvoiced',
                        workOrderIds: [selected.id],
                      })
                    }
                    style={styles.secondaryBtn}
                  >
                    {t('org.tasks.invoicingGoInvoice', null, 'Invoice remaining')}
                  </Button>
                ) : null}
              </AppCard>
            ) : null}

            <AppCard style={styles.card}>
              <Text style={styles.section}>
                {t('org.tasks.operationsTitle', null, 'Operations in this task')}
              </Text>
              <Text style={styles.opMeta}>
                {t(
                  'org.tasks.actualsHint',
                  null,
                  'Per operation: paint/output only (e.g. m²). Machine hours, total km, and road fuel receipt are entered once for the whole task below.',
                )}
              </Text>
              {(selected.operations || []).map((op, idx) => {
                const editable =
                  canShowEndButton(selected) || selected.status === 'in_progress';
                const unitLabelText = opUnitLabel(op);
                const localUnits = opLocalReportUnits(op);
                const draftQty = primaryOutputDraft(
                  op,
                  actualByUnitDrafts,
                  actualDrafts,
                  meterStartDrafts,
                  meterEndDrafts,
                );
                const setUnitDraft = (unitId, value) => {
                  setActualByUnitDrafts((prev) => ({
                    ...prev,
                    [op.id]: {
                      ...(prev[op.id] || {}),
                      [unitId]: value,
                    },
                  }));
                  if (Number(unitId) === Number(op.activity?.unit_id)) {
                    setActualDrafts((prev) => ({ ...prev, [op.id]: value }));
                  }
                };
                const storedLocal = localUnits
                  .map((unit) => {
                    const stored =
                      (op.actual_by_unit || {})[String(unit.id)] ??
                      (op.actual_by_unit || {})[unit.id];
                    const qty =
                      stored != null
                        ? String(stored)
                        : Number(unit.id) === Number(op.activity?.unit_id) &&
                            op.actual_qty != null
                          ? String(op.actual_qty)
                          : null;
                    if (qty == null) return null;
                    return `${reportUnitFieldLabel(unit, t)}: ${qty}`;
                  })
                  .filter(Boolean);
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
                      <>
                        {localUnits.length
                          ? localUnits.map((unit) => (
                              <TextInput
                                key={`${op.id}-${unit.id}`}
                                label={reportUnitFieldLabel(unit, t)}
                                value={(actualByUnitDrafts[op.id] || {})[unit.id] || ''}
                                onChangeText={(value) => setUnitDraft(unit.id, value)}
                                mode="outlined"
                                keyboardType="decimal-pad"
                                style={styles.input}
                                textColor={ON_CARD}
                              />
                            ))
                          : !opUsesDistanceForNorms(op) &&
                            !reportUnitsForOp(op).some(isDurationUnit) ? (
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
                          ) : (
                            <Text style={styles.opMeta}>
                              {t(
                                'org.tasks.opUsesTaskTotals',
                                null,
                                'Hours / km for this operation use the task totals below.',
                              )}
                            </Text>
                          )}
                      </>
                    ) : (
                      <Text style={styles.opMeta}>
                        {storedLocal.length
                          ? storedLocal.join(' · ')
                          : draftQty
                            ? `${outputFieldLabel(op, t)}: ${draftQty}${
                                unitLabelText ? ` ${unitLabelText}` : ''
                              }`
                            : t('org.tasks.noActualsYet', null, 'No actuals yet')}
                      </Text>
                    )}
                  </View>
                );
              })}

              {(selected.status !== 'done' &&
                selected.status !== 'cancelled' &&
                (canShowEndButton(selected) ||
                  selected.status === 'in_progress' ||
                  taskNeedsFuelTank(selected))) &&
              (taskNeedsMachineHours(selected) ||
                taskNeedsKm(selected) ||
                taskNeedsFuelTank(selected)) ? (
                <>
                  <Text style={[styles.fieldLabel, { marginTop: 8 }]}>
                    {t('org.tasks.taskTotalsTitle', null, 'Task totals (once)')}
                  </Text>
                  <Text style={styles.opMeta}>
                    {taskNeedsFuelTank(selected)
                      ? t(
                          'org.tasks.taskTotalsHintTransport',
                          null,
                          'Report km (and optional hours) once on the work card. Fuel = tank start/end + receipts — not a free liters guess.',
                        )
                      : t(
                          'org.tasks.taskTotalsHint',
                          null,
                          'Enter machine hour-meter readings (previous → current) and/or total km once for the whole work card — not per marking operation. Per-op fields are for m² and similar outputs only.',
                        )}
                  </Text>
                  {(canShowEndButton(selected) || selected.status === 'in_progress') &&
                  taskNeedsMachineHours(selected) ? (
                    <>
                      <Text style={styles.opMeta}>
                        {t(
                          'org.tasks.taskHourMeterHint',
                          null,
                          'Enter previous and current machine hour-meter readings once for the whole task (not per marking). Hours worked = current − previous.',
                        )}
                      </Text>
                      <TextInput
                        label={t(
                          'org.tasks.taskHoursPrevious',
                          null,
                          'Previous hour-meter reading',
                        )}
                        value={taskHoursStart}
                        onChangeText={setTaskHoursStart}
                        mode="outlined"
                        keyboardType="decimal-pad"
                        style={styles.input}
                        textColor={ON_CARD}
                      />
                      <TextInput
                        label={t(
                          'org.tasks.taskHoursCurrent',
                          null,
                          'Current hour-meter reading',
                        )}
                        value={taskHoursEnd}
                        onChangeText={setTaskHoursEnd}
                        mode="outlined"
                        keyboardType="decimal-pad"
                        style={styles.input}
                        textColor={ON_CARD}
                      />
                      {hoursMeterDelta(taskHoursStart, taskHoursEnd) != null ? (
                        <Text style={styles.opTitle}>
                          {t(
                            'org.tasks.taskHoursDelta',
                            { hours: hoursMeterDelta(taskHoursStart, taskHoursEnd) },
                            `Hours worked: ${hoursMeterDelta(taskHoursStart, taskHoursEnd)}`,
                          )}
                        </Text>
                      ) : selected.actual_hours != null ? (
                        <Text style={styles.opMeta}>
                          {t(
                            'org.tasks.taskMachineHoursRead',
                            { hours: selected.actual_hours },
                            `Machine hours: ${selected.actual_hours}`,
                          )}
                        </Text>
                      ) : null}
                    </>
                  ) : null}
                  {(canShowEndButton(selected) ||
                    selected.status === 'in_progress' ||
                    taskNeedsFuelTank(selected)) &&
                  (taskNeedsKm(selected) || taskNeedsFuelTank(selected)) ? (
                    <TextInput
                      label={t('org.tasks.taskTotalKm', null, 'Total km driven (task)')}
                      value={taskActualKm}
                      onChangeText={setTaskActualKm}
                      mode="outlined"
                      keyboardType="decimal-pad"
                      style={styles.input}
                      textColor={ON_CARD}
                    />
                  ) : null}
                  {taskNeedsFuelTank(selected) ? (
                    <>
                      <Text style={[styles.fieldLabel, { marginTop: 8 }]}>
                        {t('org.tasks.fuelTankTitle', null, 'Fuel tank (litres)')}
                      </Text>
                      <Text style={styles.opMeta}>
                        {t(
                          'org.tasks.fuelDriverFlowHint',
                          null,
                          'Driver: use Start (km + fuel) → mid-trip receipt photos → End (km + fuel). Expand below only if correcting paper values.',
                        )}
                      </Text>
                      <Text style={styles.opMeta}>
                        {t(
                          'org.tasks.fuelOnTruck',
                          {
                            liters:
                              selected.on_truck_liters ||
                              selected.fuel_summary?.on_truck_liters ||
                              '0',
                          },
                          `Fuel on truck now: ${
                            selected.on_truck_liters ||
                            selected.fuel_summary?.on_truck_liters ||
                            '0'
                          } L`,
                        )}
                      </Text>
                      <Button
                        mode="text"
                        onPress={() => setShowBossFuelForm((v) => !v)}
                        style={styles.secondaryBtn}
                      >
                        {showBossFuelForm
                          ? t('org.tasks.hideBossFuelForm', null, 'Hide full fuel fields')
                          : t(
                              'org.tasks.showBossFuelForm',
                              null,
                              'Edit start/end km & fuel (manager / paper)',
                            )}
                      </Button>
                      {showBossFuelForm || canManage ? (
                        <>
                      <Text style={styles.opMeta}>
                        {t(
                          'org.tasks.fuelTankHint',
                          null,
                          'Start + confirmed depot + road receipts − end. System computes burn vs norm.',
                        )}
                      </Text>
                      <TextInput
                        label={t('org.tasks.odometerStart', null, 'Odometer start (km)')}
                        value={taskOdometerStart}
                        onChangeText={setTaskOdometerStart}
                        mode="outlined"
                        keyboardType="decimal-pad"
                        style={styles.input}
                        textColor={ON_CARD}
                      />
                      <TextInput
                        label={t('org.tasks.odometerEnd', null, 'Odometer end (km)')}
                        value={taskOdometerEnd}
                        onChangeText={setTaskOdometerEnd}
                        mode="outlined"
                        keyboardType="decimal-pad"
                        style={styles.input}
                        textColor={ON_CARD}
                      />
                      <TextInput
                        label={t('org.tasks.fuelStart', null, 'Fuel start (L in tank)')}
                        value={taskFuelStart}
                        onChangeText={setTaskFuelStart}
                        mode="outlined"
                        keyboardType="decimal-pad"
                        style={styles.input}
                        textColor={ON_CARD}
                      />
                      <TextInput
                        label={t('org.tasks.fuelEnd', null, 'Fuel end (L in tank)')}
                        value={taskFuelEnd}
                        onChangeText={setTaskFuelEnd}
                        mode="outlined"
                        keyboardType="decimal-pad"
                        style={styles.input}
                        textColor={ON_CARD}
                      />
                      {selected.fuel_summary?.load_tons != null ? (
                        <Text style={styles.opMeta}>
                          {t(
                            'org.tasks.cargoTonsAuto',
                            {
                              tons: selected.fuel_summary.load_tons,
                              source:
                                selected.fuel_summary.load_tons_source === 'cargo'
                                  ? t('org.tasks.cargoTonsFromCargo', null, 'from cargo kg')
                                  : t('org.tasks.cargoTonsManual', null, 'manual'),
                            },
                            `Cargo tons for norm: ${selected.fuel_summary.load_tons} (${
                              selected.fuel_summary.load_tons_source === 'cargo'
                                ? 'from cargo kg'
                                : 'manual'
                            })`,
                          )}
                        </Text>
                      ) : null}
                      {selected.fuel_summary ? (
                        <View style={{ marginTop: 6 }}>
                          <Text style={styles.opMeta}>
                            {t(
                              'org.tasks.fuelEquationHint',
                              null,
                              'Burn = start + confirmed depot + road receipts − end. Compare to norm.',
                            )}
                          </Text>
                          <Text style={styles.opMeta}>
                            {t(
                              'org.tasks.depotIssuedSum',
                              {
                                liters: selected.fuel_summary.depot_liters || '0',
                              },
                              `Depot confirmed: ${selected.fuel_summary.depot_liters || '0'} L`,
                            )}
                          </Text>
                          {Number(selected.fuel_summary.depot_pending_liters || 0) > 0 ? (
                            <Text style={styles.opMeta}>
                              {t(
                                'org.tasks.depotPendingSum',
                                {
                                  liters: selected.fuel_summary.depot_pending_liters || '0',
                                },
                                `Depot pending confirm: ${
                                  selected.fuel_summary.depot_pending_liters || '0'
                                } L`,
                              )}
                            </Text>
                          ) : null}
                          <Text style={styles.opMeta}>
                            {t(
                              'org.tasks.fuelReceiptsSum',
                              {
                                liters: selected.fuel_summary.receipts_liters || '0',
                              },
                              `Fuel receipts: ${selected.fuel_summary.receipts_liters || '0'} L`,
                            )}
                          </Text>
                          {selected.fuel_summary.consumed_liters != null ? (
                            <Text style={styles.opMeta}>
                              {t(
                                'org.tasks.fuelConsumed',
                                { liters: selected.fuel_summary.consumed_liters },
                                `Consumed: ${selected.fuel_summary.consumed_liters} L (start + depot + receipts − end)`,
                              )}
                            </Text>
                          ) : null}
                          {selected.fuel_summary.effective_l_per_100 != null ? (
                            <Text style={styles.opTitle}>
                              {t(
                                'org.tasks.fuelEffectiveVsNorm',
                                {
                                  effective: selected.fuel_summary.effective_l_per_100,
                                  expected:
                                    selected.fuel_summary.expected_l_per_100 ||
                                    selected.fuel_summary.norm_base_rate ||
                                    '—',
                                  expectedL: selected.fuel_summary.expected_liters || '—',
                                },
                                `Effective ${selected.fuel_summary.effective_l_per_100} L/100 km vs norm ${
                                  selected.fuel_summary.expected_l_per_100 ||
                                  selected.fuel_summary.norm_base_rate ||
                                  '—'
                                } L/100 (expected ${selected.fuel_summary.expected_liters || '—'} L)`,
                              )}
                            </Text>
                          ) : (
                            <Text style={styles.opMeta}>
                              {t(
                                'org.tasks.fuelSummaryIncomplete',
                                null,
                                'Enter start, end, and km to see L/100 vs norm.',
                              )}
                            </Text>
                          )}
                        </View>
                      ) : null}
                        </>
                      ) : null}
                    </>
                  ) : null}
                </>
              ) : null}

              {(canShowEndButton(selected) ||
                selected.status === 'in_progress' ||
                taskNeedsFuelTank(selected)) &&
              selected.status !== 'done' &&
              selected.status !== 'cancelled' &&
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

              {!canShowEndButton(selected) && selected.status !== 'in_progress' ? (
                <Text style={styles.opMeta}>
                  {[
                    selected.actual_hours != null
                      ? t(
                          'org.tasks.taskMachineHoursRead',
                          { hours: selected.actual_hours },
                          `Machine hours: ${selected.actual_hours}`,
                        )
                      : null,
                    selected.actual_km != null
                      ? t(
                          'org.tasks.taskTotalKmRead',
                          { km: selected.actual_km },
                          `Total km: ${selected.actual_km}`,
                        )
                      : null,
                    selected.fuel_summary?.effective_l_per_100 != null
                      ? t(
                          'org.tasks.fuelEffectiveVsNorm',
                          {
                            effective: selected.fuel_summary.effective_l_per_100,
                            expected:
                              selected.fuel_summary.expected_l_per_100 ||
                              selected.fuel_summary.norm_base_rate ||
                              '—',
                            expectedL: selected.fuel_summary.expected_liters || '—',
                          },
                          `Effective ${selected.fuel_summary.effective_l_per_100} L/100 km vs norm`,
                        )
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' · ') ||
                    t('org.tasks.noTaskTotalsYet', null, 'No task totals yet')}
                </Text>
              ) : null}
            </AppCard>

            <AppCard style={styles.card}>
              <Text style={styles.section}>
                {transportFocused
                  ? t('org.tasks.depotRefuelTitle', null, 'Refuel from base / depot')
                  : t('org.tasks.materialsTitle', null, 'Materials')}
              </Text>
                  <Text style={styles.opMeta}>
                {transportFocused
                  ? t(
                      'org.tasks.depotRefuelHint',
                      null,
                      'Issue fuel (or AdBlue / freon) from base in litres. Driver confirms received litres before it counts on the truck.',
                    )
                  : t(
                      'org.tasks.materialsHint',
                      null,
                      'Warehouse issues materials onto this task. Enter leftover after work — consumed = issued − leftover.',
                    )}
              </Text>
              {requiredToolsFromOps.length ? (
                <View style={styles.ackBanner}>
                  <Text style={styles.materialsGateTitle}>
                    {t('org.tasks.requiredToolsTitle', null, 'Required tools')}
                  </Text>
                  <Text style={styles.opMeta}>
                    {t(
                      'org.tasks.requiredToolsHint',
                      null,
                      'Checklist only — warehouse stock is not reduced. Report broken tools via scrap in Warehouse.',
                    )}
                  </Text>
                  {requiredToolsFromOps.map((tool) => (
                    <Text key={`tool-${tool.id}`} style={styles.opMeta}>
                      · {tool.label || tool.name}
                      {tool.part_number ? ` (${tool.part_number})` : ''}
                    </Text>
                  ))}
                </View>
              ) : null}
              {taskHasPendingMaterialConfirm(selected) ? (
                <View style={styles.ackBanner}>
                  <Text style={styles.materialsGateTitle}>
                    {t(
                      'org.tasks.confirmMaterialsFirst',
                      null,
                      'Confirm warehouse materials first',
                    )}
                  </Text>
                  <Text style={styles.waitingText}>
                    {t(
                      'org.tasks.leftoverAfterConfirmHint',
                      null,
                      'Confirm receipt below. Then enter leftovers / m² / km / hours and End work.',
                    )}
                  </Text>
                </View>
              ) : null}
              {((selected.materials || []).filter((m) => !taskIsTransportOnly(selected) || isFuelMaterial(m))).length === 0 ? (
                <Text style={styles.opMeta}>
                  {taskIsTransportOnly(selected)
                    ? t(
                        'org.tasks.depotRefuelEmpty',
                        null,
                        'No fuel SKUs issued yet. Issue diesel/fuel from warehouse below.',
                      )
                    : t(
                        'org.tasks.materialsAskWarehouse',
                        null,
                        'Ask warehouse to issue materials for this task.',
                      )}
                </Text>
              ) : (
                (selected.materials || []).filter((m) => !taskIsTransportOnly(selected) || isFuelMaterial(m)).map((mat) => {
                  const mid = mat.material_id || mat.id;
                  const unitChip = mat.unit_code ? ` · ${mat.unit_code}` : '';
                  const editable =
                    !taskHasPendingMaterialConfirm(selected) &&
                    (canShowEndButton(selected) || selected.status === 'in_progress');
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
                  {(selected.material_issues || []).map((issue) => {
                    const draft = confirmIssueDrafts[issue.id] || {};
                    const pending = Boolean(issue.pending_confirm || issue.status === 'issued');
                    return (
                      <View key={issue.id} style={styles.opRow}>
                        <Text style={styles.opMeta}>
                          {formatIssueAudit(issue, t)}
                          {pending
                            ? ` · ${t('org.tasks.depotPendingBadge', null, 'Pending driver confirm')}`
                            : issue.status === 'confirmed'
                              ? ` · ${t('org.tasks.depotConfirmedBadge', null, 'Confirmed')}`
                              : ''}
                        </Text>
                        {pending && selected.status !== 'done' && selected.status !== 'cancelled' ? (
                          <>
                            <Text style={styles.opMeta}>
                              {t(
                                'org.tasks.depotConfirmHint',
                                {
                                  qty: issue.issued_qty || '—',
                                },
                                `Warehouse poured ${issue.issued_qty || '—'} L. Confirm what you received (dashboard).`,
                              )}
                            </Text>
                            <TextInput
                              label={t(
                                'org.tasks.depotReceivedQty',
                                null,
                                'Received litres (dashboard)',
                              )}
                              value={
                                draft.received_qty != null
                                  ? draft.received_qty
                                  : issue.issued_qty != null
                                    ? String(issue.issued_qty)
                                    : ''
                              }
                              onChangeText={(value) =>
                                setConfirmIssueDrafts((prev) => ({
                                  ...prev,
                                  [issue.id]: { ...(prev[issue.id] || {}), received_qty: value },
                                }))
                              }
                              mode="outlined"
                              keyboardType="decimal-pad"
                              style={styles.input}
                              textColor={ON_CARD}
                            />
                            <TextInput
                              label={t(
                                'org.tasks.depotConfirmOdometer',
                                null,
                                'Odometer at receive (km, optional)',
                              )}
                              value={draft.odometer_km || ''}
                              onChangeText={(value) =>
                                setConfirmIssueDrafts((prev) => ({
                                  ...prev,
                                  [issue.id]: { ...(prev[issue.id] || {}), odometer_km: value },
                                }))
                              }
                              mode="outlined"
                              keyboardType="decimal-pad"
                              style={styles.input}
                              textColor={ON_CARD}
                            />
                            <Button
                              mode="contained"
                              loading={busyAction}
                              disabled={busyAction}
                              onPress={() => confirmMaterialIssue(issue)}
                              style={styles.startBtn}
                              contentStyle={styles.startBtnContent}
                              labelStyle={styles.startBtnLabel}
                            >
                              {t(
                                'org.tasks.confirmMaterialsCta',
                                null,
                                'Confirm warehouse materials',
                              )}
                            </Button>
                          </>
                        ) : null}
                        {issue.confirmation?.received_qty != null ? (
                          <Text style={styles.opMeta}>
                            {t(
                              'org.tasks.depotReceivedRead',
                              {
                                qty: issue.confirmation.received_qty,
                                odo: issue.confirmation.odometer_km || '—',
                              },
                              `Received ${issue.confirmation.received_qty} L · odo ${
                                issue.confirmation.odometer_km || '—'
                              }`,
                            )}
                          </Text>
                        ) : null}
                      </View>
                    );
                  })}
                </>
              ) : null}
              {canManage && selected.status !== 'done' && selected.status !== 'cancelled' ? (
                <>
                  <Text style={styles.fieldLabel}>
                    {transportFocused
                      ? t('org.tasks.depotRefuelTitle', null, 'Refuel from base / depot')
                      : t('org.tasks.issueFromWarehouse', null, 'Issue from warehouse')}
                  </Text>
                  <Text style={styles.opMeta}>
                    {t(
                      'org.tasks.issueFromWarehouseHint',
                      null,
                      'Default list = materials from this task’s operations. Fuel ~qty uses task machine hours / total km (and paint uses op m²). Edit qty before issuing.',
                    )}
                  </Text>
                  {!transportFocused ? (
                  <TextInput
                    label={t(
                      'org.tasks.plannedIssueOutput',
                      { unit: primaryOutputUnit },
                      `Planned output for this issue (${primaryOutputUnit})`,
                    )}
                    value={plannedIssueOutput}
                    onChangeText={setPlannedIssueOutput}
                    mode="outlined"
                    keyboardType="decimal-pad"
                    style={styles.input}
                    textColor={ON_CARD}
                  />
                  ) : null}
                  {!transportFocused &&
                  hasHourBasedNorms &&
                  !String(taskHoursStart || '').trim() &&
                  !String(taskHoursEnd || '').trim() &&
                  selected?.actual_hours == null ? (
                    <TextInput
                      label={t(
                        'org.tasks.plannedIssueHours',
                        null,
                        'Planned working hours (for fuel norms) — or fill Task totals above',
                      )}
                      value={plannedIssueHours}
                      onChangeText={setPlannedIssueHours}
                      mode="outlined"
                      keyboardType="decimal-pad"
                      style={styles.input}
                      textColor={ON_CARD}
                    />
                  ) : null}
                  <Text style={styles.fieldLabel}>
                    {t('org.tasks.issueOpMaterials', null, 'From operations')}
                  </Text>
                  {defaultIssueMaterials.length === 0 ? (
                    <Text style={styles.opMeta}>
                      {transportFocused
                        ? t(
                            'org.tasks.depotRefuelEmpty',
                            null,
                            'No fuel SKUs in warehouse yet. Add diesel/fuel stock, then issue here.',
                          )
                        : t(
                            'org.tasks.issueOpMaterialsEmpty',
                            null,
                            'No default materials on the operations of this task. Pick operations with materials, or use Add extra material.',
                          )}
                    </Text>
                  ) : (
                    <View style={styles.chipWrap}>
                      {defaultIssueMaterials.map((mat) => {
                        const mid = Number(mat.material_id);
                        const stock = stockByMaterialId.get(mid);
                        const active = Number(issueMaterialId) === mid;
                        const onHand =
                          stock?.quantity_on_hand != null
                            ? ` (${stock.quantity_on_hand})`
                            : '';
                        const sug = suggestionForMaterial(mid);
                        return (
                          <Pressable
                            key={mid}
                            onPress={() =>
                              applySuggestionToIssue(mid, stock?.unit_code || mat.unit_code)
                            }
                            style={[styles.chip, active && styles.chipActive]}
                          >
                            <Text style={[styles.chipText, active && styles.chipTextActive]}>
                              {formatMaterialListLabel(mat, {
                                fallbackId: mid,
                              })}
                              {onHand}
                              {sug?.qty ? ` · ~${sug.qty}` : ''}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                  <Button
                    mode="text"
                    onPress={() => setShowExtraMaterials((v) => !v)}
                    style={styles.secondaryBtn}
                  >
                    {showExtraMaterials
                      ? t('org.tasks.hideExtraMaterial', null, 'Hide extra material')
                      : transportFocused
                        ? t('org.tasks.depotRefuelTitle', null, 'Refuel from base / depot')
                        : t('org.tasks.addExtraMaterial', null, 'Add extra material')}
                  </Button>
                  {showExtraMaterials ? (
                    <>
                      <TextInput
                        label={t(
                          'org.tasks.searchExtraMaterial',
                          null,
                          'Search full warehouse catalog',
                        )}
                        value={extraMaterialSearch}
                        onChangeText={setExtraMaterialSearch}
                        mode="outlined"
                        style={styles.input}
                        textColor={ON_CARD}
                      />
                      <View style={styles.chipWrap}>
                        {filteredExtraStock.map((row) => {
                          const mid = Number(row.material_id || row.material?.id || row.id);
                          const active = Number(issueMaterialId) === mid;
                          const label = formatMaterialListLabel(
                            {
                              name: row.material?.name || row.name,
                              label: row.material?.label || row.label,
                              part_number: row.part_number || row.material?.part_number,
                            },
                            { fallbackId: mid },
                          );
                          const onHand =
                            row.quantity_on_hand != null
                              ? ` (${row.quantity_on_hand})`
                              : '';
                          return (
                            <Pressable
                              key={mid}
                              onPress={() => applySuggestionToIssue(mid, row.unit_code)}
                              style={[styles.chip, active && styles.chipActive]}
                            >
                              <Text
                                style={[styles.chipText, active && styles.chipTextActive]}
                              >
                                {label}
                                {onHand}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                      {filteredExtraStock.length === 0 ? (
                        <Text style={styles.opMeta}>
                          {t(
                            'org.tasks.extraMaterialsEmpty',
                            null,
                            'No other warehouse SKUs match. Import stock or clear the search.',
                          )}
                        </Text>
                      ) : null}
                    </>
                  ) : null}
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
                    label={
                      transportFocused
                        ? t('org.tasks.depotIssueQtyLiters', null, 'Liters to issue (e.g. 400)')
                        : t('org.tasks.issueQty', null, 'Quantity to issue')
                    }
                    value={issueQty}
                    onChangeText={setIssueQty}
                    mode="outlined"
                    keyboardType="decimal-pad"
                    style={styles.input}
                    textColor={ON_CARD}
                    placeholder={transportFocused ? '400' : undefined}
                  />
                  {transportFocused ? (
                    <Text style={styles.opMeta}>
                      {t(
                        'org.tasks.depotIssueQtyHelper',
                        null,
                        'Enter liters as a number. “Fill to full” is not supported yet.',
                      )}
                    </Text>
                  ) : null}
                  <Text style={styles.fieldLabel}>
                    {transportFocused
                      ? t('org.tasks.depotIssueUnitSelect', null, 'Unit (fuel liquids)')
                      : t('org.tasks.issueUnitSelect', null, 'Select unit')}
                  </Text>
                  <UnitOfMeasurePicker
                    units={
                      transportFocused
                        ? (uomUnits || []).filter(isFuelishUnit)
                        : uomUnits
                    }
                    valueCode={issueUnit || (transportFocused ? 'L' : '')}
                    onChange={({ code }) => setIssueUnit(code || '')}
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


            {(taskNeedsFuelTank(selected) ||
              (selected.shipments || []).length > 0 ||
              (selected.outbound_shipments || []).length > 0 ||
              (selected.return_shipments || []).length > 0 ||
              (selected.driver_route || []).length > 0) ? (
              <AppCard style={styles.card}>
                <WorkOrderShipmentsEditor
                  t={t}
                  outboundShipments={
                    selected.outbound_shipments ||
                    (selected.shipments || []).filter((s) => s.direction === 'outbound')
                  }
                  returnShipments={
                    selected.return_shipments ||
                    (selected.shipments || []).filter((s) => s.direction === 'return')
                  }
                  driverRoute={selected.driver_route || []}
                  driverRouteOptimized={selected.driver_route_optimized || []}
                  driverRouteMapsUrl={selected.driver_route_maps_url || ''}
                  driverRouteOptimizedMapsUrl={
                    selected.driver_route_optimized_maps_url || ''
                  }
                  remainingSpace={selected.remaining_space || null}
                  loadType={selected.load_type || 'groupage'}
                  onLoadTypeChange={
                    selected.status !== 'done' && selected.status !== 'cancelled'
                      ? saveLoadType
                      : undefined
                  }
                  editable={
                    selected.status !== 'done' &&
                    selected.status !== 'cancelled' &&
                    (canManage || true)
                  }
                  busy={busyAction}
                  onAdd={addShipment}
                  onUpdate={saveShipment}
                  onRemove={removeShipment}
                />
              </AppCard>
            ) : null}

            <AppCard style={styles.card}>
              <Text style={styles.section}>
                {t('org.tasks.expensesTitle', null, 'Road / extra expenses')}
              </Text>
              <Text style={styles.opMeta}>
                {taskNeedsFuelTank(selected)
                  ? t(
                      'org.tasks.expensesHintTransport',
                      null,
                      'Photograph касови бележки only. Tank start/end + depot + photos → burn.',
                    )
                  : t(
                      'org.tasks.expensesHint',
                      null,
                      'Attach receipt photos. No need to type litres or amount.',
                    )}
              </Text>
              {(selected.expenses || []).length === 0 ? (
                <Text style={styles.opMeta}>
                  {t('org.tasks.expensesEmpty', null, 'No road expenses yet.')}
                </Text>
              ) : (
                <ExpenseReceiptGallery
                  expenses={selected.expenses || []}
                  token={accessToken}
                  t={t}
                  canDelete={selected.status !== 'done' && selected.status !== 'cancelled'}
                  onDelete={removeExpense}
                />
              )}
              {selected.status !== 'done' && selected.status !== 'cancelled' ? (
                <>
                  <Text style={styles.opMeta}>
                    {t(
                      'org.tasks.expensePhotosOnly',
                      null,
                      'Add receipt photos (camera / gallery / PDF), or enter an expense without a receipt.',
                    )}
                  </Text>
                  <View style={styles.chipWrap}>
                    <Button
                      mode="contained"
                      loading={busyAction}
                      disabled={busyAction}
                      onPress={pickExpenseFromCamera}
                      style={styles.secondaryBtn}
                    >
                      {t('org.tasks.expenseAddFromCamera', null, 'Camera')}
                    </Button>
                    <Button
                      mode="outlined"
                      loading={busyAction}
                      disabled={busyAction}
                      onPress={pickExpenseFromGallery}
                      style={styles.secondaryBtn}
                    >
                      {t('org.tasks.expenseAddFromGallery', null, 'Gallery / PDF')}
                    </Button>
                    <Button
                      mode="outlined"
                      disabled={busyAction}
                      onPress={() => setShowManualExpense((v) => !v)}
                      style={styles.secondaryBtn}
                    >
                      {t('org.tasks.expenseAddManual', null, 'Add manually')}
                    </Button>
                  </View>
                  {showManualExpense ? (
                    <>
                      <TextInput
                        label={t('org.tasks.expenseNote', null, 'Description')}
                        value={manualExpenseNote}
                        onChangeText={setManualExpenseNote}
                        mode="outlined"
                        style={styles.input}
                        textColor={ON_CARD}
                      />
                      <TextInput
                        label={t(
                          'org.tasks.expenseAmountVat',
                          null,
                          'Amount with VAT (e.g. 180.00)',
                        )}
                        value={manualExpenseAmount}
                        onChangeText={setManualExpenseAmount}
                        mode="outlined"
                        keyboardType="decimal-pad"
                        style={styles.input}
                        textColor={ON_CARD}
                      />
                      <Button
                        mode="contained"
                        loading={busyAction}
                        disabled={busyAction}
                        onPress={submitManualExpense}
                        style={styles.secondaryBtn}
                      >
                        {t('org.tasks.addExpense', null, 'Add expense')}
                      </Button>
                    </>
                  ) : null}
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
                  {selected.route_from || selected.route_to ? (
                    <Text style={styles.opMeta}>
                      {[selected.route_from, selected.route_to].filter(Boolean).join(' → ')}
                    </Text>
                  ) : null}
                </>
              ) : null}
            </AppCard>
          </>
            )}
          </>
            ) : (
          <>
            <Text style={styles.lead}>
              {canManage
                ? hasProduction && orderSurface === 'production'
                  ? t(
                      'org.tasks.listLeadProduction',
                      null,
                      'Production orders from recipes. Issue materials from warehouse, then Complete production.',
                    )
                  : hasProduction
                    ? t(
                        'org.tasks.listLeadWork',
                        null,
                        'Site work cards (tasks). Production orders are on the other tab.',
                      )
                    : t(
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
                  {hasProduction && orderSurface === 'production'
                    ? t(
                        'org.tasks.productionEmpty',
                        null,
                        'No production orders yet. Add one from a recipe.',
                      )
                    : activeTab === 'open'
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
                    <View style={styles.rowTitleRow}>
                      <Text style={[styles.rowTitle, { flex: 1 }]}>{row.title}</Text>
                      {isCompletedTaskStatus(row.status) ? (
                        <Text
                          style={[
                            styles.invoiceBadge,
                            taskInvoicedStatus(row) === 'fully_invoiced' && styles.invoiceBadgeFull,
                            taskInvoicedStatus(row) === 'partially_invoiced' &&
                              styles.invoiceBadgePartial,
                            taskInvoicedStatus(row) === 'uninvoiced' && styles.invoiceBadgeNone,
                          ]}
                        >
                          {invoicedStatusLabel(taskInvoicedStatus(row), t)}
                        </Text>
                      ) : null}
                    </View>
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
          onPress={onPressAddFab}
          label={
            hasProduction && orderSurface === 'production'
              ? t('org.tasks.addProductionOrder', null, 'Add production order')
              : t('org.tasks.addTask', null, 'Add task')
          }
          color="#fff"
        />
      ) : null}

      <Modal
        visible={startWizardOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setStartWizardOpen(false)}
      >
        <View style={styles.wizardBackdrop}>
          <View style={styles.wizardCard}>
            <Text style={styles.wizardTitle}>
              {t('org.tasks.startWizardTitle', null, 'Start trip')}
            </Text>
            <Text style={styles.wizardHint}>
              {t(
                'org.tasks.startWizardHint',
                null,
                'Enter starting odometer and fuel in tank, then start.',
              )}
            </Text>
            <TextInput
              label={t('org.tasks.odometerStart', null, 'Odometer start (km)')}
              value={wizardOdo}
              onChangeText={setWizardOdo}
              mode="outlined"
              keyboardType="decimal-pad"
              style={styles.input}
              textColor={ON_CARD}
            />
            <TextInput
              label={t('org.tasks.fuelStart', null, 'Fuel start (L in tank)')}
              value={wizardFuel}
              onChangeText={setWizardFuel}
              mode="outlined"
              keyboardType="decimal-pad"
              style={styles.input}
              textColor={ON_CARD}
            />
            <View style={styles.wizardActions}>
              <Button mode="text" onPress={() => setStartWizardOpen(false)}>
                {t('common.cancel', null, 'Cancel')}
              </Button>
              <Button
                mode="contained"
                loading={busyAction}
                disabled={busyAction || !String(wizardOdo).trim() || !String(wizardFuel).trim()}
                onPress={() =>
                  acknowledgeStart(wizardTask, {
                    odometer: wizardOdo,
                    fuel: wizardFuel,
                  })
                }
              >
                {t('org.tasks.startCta', null, 'Start')}
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={endWizardOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setEndWizardOpen(false)}
      >
        <View style={styles.wizardBackdrop}>
          <View style={styles.wizardCard}>
            <Text style={styles.wizardTitle}>
              {t('org.tasks.endWizardTitle', null, 'End trip')}
            </Text>
            <Text style={styles.wizardHint}>
              {t(
                'org.tasks.endWizardHint',
                null,
                'Enter ending odometer and fuel in tank. Km is calculated from start/end when possible.',
              )}
            </Text>
            <TextInput
              label={t('org.tasks.odometerEnd', null, 'Odometer end (km)')}
              value={wizardOdo}
              onChangeText={setWizardOdo}
              mode="outlined"
              keyboardType="decimal-pad"
              style={styles.input}
              textColor={ON_CARD}
            />
            <TextInput
              label={t('org.tasks.fuelEnd', null, 'Fuel end (L in tank)')}
              value={wizardFuel}
              onChangeText={setWizardFuel}
              mode="outlined"
              keyboardType="decimal-pad"
              style={styles.input}
              textColor={ON_CARD}
            />
            <View style={styles.wizardActions}>
              <Button mode="text" onPress={() => setEndWizardOpen(false)}>
                {t('common.cancel', null, 'Cancel')}
              </Button>
              <Button
                mode="contained"
                loading={busyAction}
                disabled={busyAction || !String(wizardOdo).trim() || !String(wizardFuel).trim()}
                onPress={() =>
                  acknowledgeEnd(wizardTask, {
                    odometer: wizardOdo,
                    fuel: wizardFuel,
                  })
                }
              >
                {t('org.tasks.endCta', null, 'End work')}
              </Button>
            </View>
          </View>
        </View>
      </Modal>
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
  rowTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  invoiceBadgeRow: { flexDirection: 'row', marginBottom: 8 },
  invoiceBadge: {
    fontSize: 11,
    fontWeight: '700',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  invoiceBadgeNone: {
    color: '#92400E',
    backgroundColor: 'rgba(245, 158, 11, 0.18)',
  },
  invoiceBadgePartial: {
    color: '#1E40AF',
    backgroundColor: 'rgba(59, 130, 246, 0.16)',
  },
  invoiceBadgeFull: {
    color: '#166534',
    backgroundColor: 'rgba(34, 197, 94, 0.16)',
  },
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
  periodSummaryLine: {
    color: ON_CARD,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 4,
    lineHeight: 22,
  },
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
  ackBanner: {
    gap: 8,
    marginBottom: 4,
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(180, 83, 9, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(180, 83, 9, 0.25)',
  },
  materialsGateTitle: {
    color: '#b45309',
    fontSize: 15,
    fontWeight: '800',
  },
  ackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(15,23,42,0.12)',
  },
  ackBadgeOk: {
    color: '#166534',
    fontSize: 12,
    fontWeight: '700',
  },
  ackBadgePending: {
    color: '#b45309',
    fontSize: 12,
    fontWeight: '700',
  },
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
  wizardBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.55)',
    justifyContent: 'center',
    padding: 20,
  },
  wizardCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
  },
  wizardTitle: {
    color: ON_CARD,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  wizardHint: {
    color: ON_CARD_MUTED,
    fontSize: 13,
    marginBottom: 10,
    lineHeight: 18,
  },
  wizardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
});
