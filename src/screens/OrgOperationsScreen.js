import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, Button, Switch, TextInput } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';

import ScreenBackground from '../components/ScreenBackground';
import AppCard from '../components/ui/AppCard';
import OrgAppHeader from '../components/org/OrgAppHeader';
import {
  createActivityDefinition,
  deleteActivityDefinition,
  listActivityDefinitions,
  listUnitsOfMeasure,
  updateActivityDefinition,
} from '../api/orgOperations';
import { listOrgMaterials } from '../api/orgWarehouse';
import { getMaterialsCatalog } from '../api/materials';
import {
  readOrganizationMemberships,
  resolveActiveOrganizationId,
} from '../utils/orgWorkspace';
import { formatMaterialListLabel } from '../utils/materialDisplayLabel';
import { navigateToOrgHome, navigateToOrgWarehouse } from '../navigation/webNavigation';
import { useTranslation } from '../i18n';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { COLORS } from '../constants/colors';
import { useScrollContentBottomPadding } from '../utils/mobileWebInsets';
import { confirmMessage, showMessage } from '../utils/crossPlatformAlert';

/** Hardcoded on-card colors — avoid Paper theme / CSS inheritance washing text white. */
const ON_CARD = '#0F172A';
const ON_CARD_MUTED = '#475569';
const CARD_SURFACE = { color: ON_CARD };

const KIND_OPTIONS = [
  { value: 'transport', labelKey: 'org.operations.kinds.transport' },
  { value: 'road_marking', labelKey: 'org.operations.kinds.road_marking' },
  { value: 'field_service', labelKey: 'org.operations.kinds.field_service' },
  { value: 'construction', labelKey: 'org.operations.kinds.construction' },
  { value: 'warehouse_task', labelKey: 'org.operations.kinds.warehouse_task' },
  { value: 'labor_only', labelKey: 'org.operations.kinds.labor_only' },
  { value: 'inspection', labelKey: 'org.operations.kinds.inspection' },
  { value: 'other', labelKey: 'org.operations.kinds.other' },
];

/** Kind → preferred output measure_kinds (worker reports). Multi-select allowed. */
const KIND_OUTPUT_MEASURES = {
  transport: ['distance', 'duration', 'count', 'mass'],
  construction: ['area', 'volume', 'mass', 'count', 'duration', 'distance'],
  road_marking: ['area', 'distance', 'count', 'duration', 'volume', 'mass'],
  field_service: ['count', 'duration', 'area', 'distance', 'volume', 'mass'],
  warehouse_task: ['count', 'mass', 'volume', 'duration'],
  labor_only: ['duration', 'count'],
  inspection: ['count', 'duration'],
  workshop_service: ['duration', 'count', 'volume'],
  other: ['area', 'distance', 'duration', 'volume', 'mass', 'count'],
};

/** Always offer these measure kinds on Worker reports (in addition to kind prefs). */
const REPORT_MEASURE_KINDS = [
  'area',
  'distance',
  'duration',
  'volume',
  'mass',
  'count',
];

/** Kind → preferred consumed-input measure_kinds (for norms). */
const KIND_INPUT_MEASURES = {
  transport: ['volume'],
  construction: ['volume', 'mass'],
  road_marking: ['volume', 'mass'],
  field_service: ['volume', 'count', 'mass'],
  warehouse_task: ['count', 'mass', 'volume'],
  labor_only: [],
  inspection: [],
  workshop_service: ['count', 'volume'],
  other: null,
};

const MODES = [
  { id: 'list', labelKey: 'org.operations.allOperations' },
  { id: 'add', labelKey: 'org.operations.addOperation' },
];

function unitLabel(unit) {
  if (!unit) return '';
  return unit.symbol || unit.name || unit.code || '';
}

function materialLabel(row) {
  return formatMaterialListLabel(row);
}

/** Prefer area (m²), then distance (km), else first non-duration report unit. */
function resolveOutputBasisUnit(form, findUnit) {
  const reportIds = Array.isArray(form?.reportUnitIds) ? form.reportUnitIds : [];
  const units = reportIds.map((id) => findUnit(id)).filter(Boolean);
  const byKind = (kind) =>
    units.find((u) => String(u.measure_kind || '').toLowerCase() === kind);
  return (
    byKind('area') ||
    byKind('distance') ||
    units.find((u) => String(u.measure_kind || '').toLowerCase() !== 'duration') ||
    findUnit(form?.unitId) ||
    findUnit(reportIds[0]) ||
    null
  );
}

function materialBasisLabel(meta, outputUnitLbl, t) {
  if (meta?.basis === 'work_hours') {
    return t('org.operations.basisWorkHoursShort', null, 'h');
  }
  return outputUnitLbl || t('org.operations.basisOutputShort', null, 'out');
}

/** Map warehouse / master unit_code onto operations UnitOfMeasure id. */
function resolveMaterialOpsUnitId(mat, units) {
  if (!mat) return null;
  const direct = mat.ops_unit_id ?? mat.norm_unit_id ?? mat.unit_id;
  if (direct != null && direct !== '') {
    const n = Number(direct);
    if (Number.isFinite(n) && n > 0) return n;
  }
  const code = String(mat.unit_code || mat.unit_symbol || '')
    .trim()
    .toLowerCase();
  if (!code || !Array.isArray(units)) return null;
  const aliases = {
    piece: 'pcs',
    pc: 'pcs',
    pcs: 'pcs',
    бр: 'pcs',
    kg: 'kg',
    кг: 'kg',
    g: 'g',
    l: 'l',
    lt: 'l',
    liter: 'l',
    litre: 'l',
    ml: 'ml',
  };
  const want = aliases[code] || code;
  const match = units.find((u) => {
    const uc = String(u.code || '')
      .trim()
      .toLowerCase();
    const us = String(u.symbol || '')
      .trim()
      .toLowerCase();
    return uc === want || us === want || uc === code || us === code;
  });
  return match ? Number(match.id) : null;
}

function materialUnitDisplay(mat, findUnit, meta) {
  const fromMeta = meta?.unitId ? findUnit(meta.unitId) : null;
  if (fromMeta) return unitLabel(fromMeta);
  const sym = String(mat?.unit_symbol || mat?.unit_code || '').trim();
  return sym || '';
}

function emptyMaterialNorm(overrides = {}) {
  return {
    rate: '',
    perQty: '1',
    rateHours: '',
    perHours: '1',
    basis: 'output_unit',
    unitId: null,
    unitFromMaster: false,
    ...overrides,
  };
}

/** Hours field: digits + optional decimal only (no "per hour" text). */
function sanitizeHoursInput(value) {
  const raw = String(value || '').replace(/,/g, '.');
  let out = '';
  let seenDot = false;
  for (const ch of raw) {
    if (ch >= '0' && ch <= '9') out += ch;
    else if (ch === '.' && !seenDot) {
      out += '.';
      seenDot = true;
    }
  }
  return out;
}

const sanitizeDecimalInput = sanitizeHoursInput;

function emptyFormState() {
  return {
    name: '',
    code: '',
    kind: 'transport',
    unitId: null,
    reportUnitIds: [],
    notes: '',
    isActive: true,
    plannedHours: '',
    consumesMaterials: false,
    materialUnitId: null,
    defaultMaterialIds: [],
    materialNorms: {},
    materialSearch: '',
    transportBaseRate: '',
    transportPerTonRate: '',
    transportRateUnitId: null,
    laborPresetHours: '',
    normRate: '',
    normBasisQty: '1',
    normInputUnitId: null,
  };
}

function hydrateFromRow(row) {
  const norms = row?.norms && typeof row.norms === 'object' ? row.norms : {};
  const transport = norms.transport || {};
  const labor = norms.labor || {};
  const materials = norms.materials || {};
  const generic = norms.generic || {};
  const materialIds = Array.isArray(materials.default_material_ids)
    ? materials.default_material_ids
    : Array.isArray(row.default_material_ids)
      ? row.default_material_ids
      : [];
  const materialNorms = {};
  const lines = Array.isArray(materials.material_lines)
    ? materials.material_lines
    : Array.isArray(row.material_lines)
      ? row.material_lines
      : [];
  lines.forEach((line) => {
    const mid = Number(line.material_id);
    if (!mid) return;
    const basis = line.basis === 'work_hours' ? 'work_hours' : 'output_unit';
    let rate = line.rate != null ? String(line.rate) : '';
    let perQty = line.per_qty != null ? String(line.per_qty) : '1';
    let rateHours = line.rate_hours != null ? String(line.rate_hours) : '';
    let perHours = line.per_hours != null ? String(line.per_hours) : '1';
    // Legacy: work_hours stored only in rate/per_qty — split into hour fields.
    if (basis === 'work_hours' && !rateHours && rate) {
      rateHours = rate;
      perHours = perQty || '1';
      rate = '';
      perQty = '1';
    }
    materialNorms[mid] = emptyMaterialNorm({
      rate,
      perQty,
      rateHours,
      perHours,
      basis,
      unitId: line.unit_id || null,
      unitFromMaster: Boolean(line.unit_id),
    });
  });
  // Legacy: apply global generic rate to every default SKU without a line rate.
  const legacyRate =
    generic.rate != null
      ? String(generic.rate)
      : row.norm_rate != null && row.activity_kind !== 'transport'
        ? String(row.norm_rate)
        : '';
  const legacyPer =
    generic.basis_qty != null
      ? String(generic.basis_qty)
      : row.norm_basis_qty != null
        ? String(row.norm_basis_qty)
        : '1';
  const legacyUnit =
    generic.input_unit_id ||
    (row.activity_kind !== 'transport'
      ? row.norm_input_unit_id || row.norm_input_unit?.id || null
      : null);
  materialIds.forEach((rawId) => {
    const mid = Number(rawId);
    if (!mid || materialNorms[mid]) return;
    materialNorms[mid] = emptyMaterialNorm({
      rate: legacyRate,
      perQty: legacyPer,
      basis: 'output_unit',
      unitId: legacyUnit,
    });
  });
  // Prefill unit from material master briefs when line had no unit_id.
  const briefs = Array.isArray(row.default_materials) ? row.default_materials : [];
  briefs.forEach((brief) => {
    const mid = Number(brief.id);
    if (!mid || !materialNorms[mid]) return;
    if (materialNorms[mid].unitId) return;
    const opsId = brief.ops_unit_id || brief.norm_unit_id;
    if (opsId) {
      materialNorms[mid] = {
        ...materialNorms[mid],
        unitId: Number(opsId),
        unitFromMaster: true,
      };
    }
  });
  return {
    name: row.name || '',
    code: row.code || '',
    kind: row.activity_kind || 'other',
    unitId: row.unit_id || row.unit?.id || null,
    reportUnitIds: (() => {
      const fromList = Array.isArray(row.report_unit_ids)
        ? row.report_unit_ids.map((id) => Number(id)).filter(Boolean)
        : [];
      if (fromList.length) return fromList;
      const primary = row.unit_id || row.unit?.id;
      return primary ? [Number(primary)] : [];
    })(),
    notes: row.notes || '',
    isActive: row.is_active !== false,
    plannedHours: row.planned_hours != null ? String(row.planned_hours) : '',
    consumesMaterials: Boolean(
      row.consumes_materials ?? materials.consumes_materials,
    ),
    materialUnitId:
      materials.default_material_unit_id ||
      row.norm_input_unit_id ||
      row.norm_input_unit?.id ||
      null,
    defaultMaterialIds: materialIds.map((id) => Number(id)).filter(Boolean),
    materialNorms,
    materialSearch: '',
    transportBaseRate:
      transport.base_rate != null
        ? String(transport.base_rate)
        : row.norm_rate != null && row.activity_kind === 'transport'
          ? String(row.norm_rate)
          : '',
    transportPerTonRate:
      transport.per_ton_rate != null ? String(transport.per_ton_rate) : '',
    transportRateUnitId:
      transport.rate_unit_id ||
      (row.activity_kind === 'transport'
        ? row.norm_input_unit_id || row.norm_input_unit?.id || null
        : null),
    laborPresetHours:
      labor.preset_hours != null
        ? String(labor.preset_hours)
        : row.planned_hours != null && row.activity_kind === 'labor_only'
          ? String(row.planned_hours)
          : '',
    normRate: legacyRate,
    normBasisQty: legacyPer,
    normInputUnitId: legacyUnit,
  };
}

function buildNormsPayload(form) {
  const norms = {};
  if (form.kind === 'transport') {
    if (form.transportBaseRate.trim() || form.transportPerTonRate.trim()) {
      norms.transport = {
        base_rate: form.transportBaseRate.trim() || null,
        per_ton_rate: form.transportPerTonRate.trim() || null,
        per_load_rate: null,
        rate_unit_id: form.transportRateUnitId || null,
        input_keys: ['km', 'tons'],
      };
    }
  } else if (form.kind === 'labor_only') {
    const hours = sanitizeHoursInput(form.laborPresetHours || form.plannedHours);
    if (hours) {
      norms.labor = { preset_hours: hours };
    }
  }

  if (form.kind !== 'labor_only') {
    const ids = form.consumesMaterials ? (form.defaultMaterialIds || []).slice(0, 40) : [];
    const materialLines = ids.map((mid) => {
      const meta = (form.materialNorms && form.materialNorms[mid]) || {};
      const rate = String(meta.rate || '').trim() || null;
      const perQty = String(meta.perQty || '1').trim() || '1';
      const rateHours = String(meta.rateHours || '').trim() || null;
      const perHours = String(meta.perHours || '1').trim() || '1';
      let basis = meta.basis === 'work_hours' ? 'work_hours' : 'output_unit';
      if (rateHours && !rate) basis = 'work_hours';
      else if (rate && !rateHours) basis = 'output_unit';
      return {
        material_id: mid,
        rate,
        per_qty: perQty,
        rate_hours: rateHours,
        per_hours: perHours,
        basis,
        unit_id: meta.unitId || form.materialUnitId || form.normInputUnitId || null,
      };
    });
    // Keep a legacy generic rate from the first output_unit line for older clients.
    const firstOutput = materialLines.find((line) => line.rate);
    if (firstOutput) {
      norms.generic = {
        rate: firstOutput.rate,
        basis_qty: firstOutput.per_qty || '1',
        input_unit_id: firstOutput.unit_id || null,
        input_key: '',
      };
    } else if (form.normRate.trim() || form.normInputUnitId) {
      norms.generic = {
        rate: form.normRate.trim() || null,
        basis_qty: form.normBasisQty.trim() || null,
        input_unit_id: form.normInputUnitId || null,
        input_key: '',
      };
    }
    norms.materials = {
      consumes_materials: Boolean(form.consumesMaterials),
      default_material_unit_id: form.consumesMaterials
        ? form.materialUnitId || form.normInputUnitId || null
        : null,
      default_material_ids: ids,
      material_lines: materialLines,
    };
  }

  const planned = sanitizeHoursInput(form.plannedHours || form.laborPresetHours);
  if (form.kind === 'labor_only' && planned) {
    // already set above
  } else if (planned && !norms.labor) {
    norms.labor = { preset_hours: planned };
  }

  return norms;
}

function kindExampleKey(kind) {
  return `org.operations.wizard.examples.${kind}`;
}

function normSummaryText(row, t, kindLabel) {
  const norms = row?.norms || {};
  if (norms.transport?.base_rate != null) {
    const perTon = norms.transport.per_ton_rate;
    return t(
      'org.operations.transportNormSummary',
      {
        base: norms.transport.base_rate,
        perTon: perTon || '0',
        unit: 'L',
      },
      perTon
        ? `${norms.transport.base_rate} L/100 km empty + ${perTon} L/t`
        : `${norms.transport.base_rate} L/100 km empty`,
    );
  }
  if (norms.labor?.preset_hours != null) {
    return t(
      'org.operations.laborNormSummary',
      { hours: norms.labor.preset_hours },
      `${norms.labor.preset_hours} h`,
    );
  }
  if (row.norm_rate != null) {
    return t(
      'org.operations.normSummary',
      {
        rate: row.norm_rate,
        basis: row.norm_basis_qty || '1',
        unit: unitLabel(row.unit) || '—',
        input: unitLabel(row.norm_input_unit) || '—',
      },
      `${row.norm_rate} ${unitLabel(row.norm_input_unit) || ''} / ${row.norm_basis_qty || '1'} ${unitLabel(row.unit) || ''}`.trim(),
    );
  }
  if (row.planned_hours != null) {
    return t(
      'org.operations.laborNormSummary',
      { hours: row.planned_hours },
      `${row.planned_hours} h`,
    );
  }
  return kindLabel(row.activity_kind);
}

export default function OrgOperationsScreen({ navigation, route }) {
  const { t } = useTranslation();
  const routeOrgId = route?.params?.organizationId || route?.params?.orgId;
  const scrollBottomPadding = useScrollContentBottomPadding(40);

  const onBack = useCallback(async () => {
    const orgs = await readOrganizationMemberships();
    if (orgs.length > 0) {
      navigateToOrgHome(navigation, { orgId: routeOrgId || orgs[0]?.id });
      return;
    }
    if (navigation?.canGoBack?.()) navigation.goBack();
  }, [navigation, routeOrgId]);

  const [orgId, setOrgId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [canManage, setCanManage] = useState(false);
  const [rows, setRows] = useState([]);
  const [units, setUnits] = useState([]);
  const [materialCatalog, setMaterialCatalog] = useState([]);
  const [selectedMaterials, setSelectedMaterials] = useState([]);
  const [mode, setMode] = useState('list');
  const [wizardStep, setWizardStep] = useState(0);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyFormState);
  const [busy, setBusy] = useState(false);
  const [formMessage, setFormMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const setField = useCallback((key, value) => {
    setFieldErrors((prev) => {
      if (!prev || !prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const stepDefs = useMemo(
    () => [
      {
        key: 'basics',
        title: t('org.operations.wizard.stepBasics', null, 'Basics'),
        hint: t(
          'org.operations.wizard.stepBasicsHint',
          null,
          'Name the operation and choose its kind (filters units & norms).',
        ),
      },
      {
        key: 'output',
        title: t('org.operations.wizard.stepOutput', null, 'Worker reports'),
        hint: t(
          'org.operations.wizard.stepOutputHint',
          null,
          'Multi-select what the worker reports on this operation (m², hours, km, liters…).',
        ),
      },
      {
        key: 'materials',
        title: t('org.operations.wizard.stepMaterialsNorms', null, 'Materials + norms'),
        hint: t(
          'org.operations.wizard.stepMaterialsNormsHint',
          null,
          'Toggle labor-only vs labor + materials. Each SKU has its own basis — paint per m² and fuel per working hour can both be set on the same operation.',
        ),
      },
      {
        key: 'review',
        title: t('org.operations.wizard.stepReview', null, 'Review'),
        hint: t(
          'org.operations.wizard.stepReviewHint',
          null,
          'Check output unit, time norm, rates, and materials, then save.',
        ),
      },
    ],
    [t],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const resolved = await resolveActiveOrganizationId(routeOrgId);
      setOrgId(resolved);
      if (!resolved) {
        setRows([]);
        setUnits([]);
        setCanManage(false);
        setError(t('org.operations.loadError', null, 'Could not load operations.'));
        return;
      }
      const [data, unitsData] = await Promise.all([
        listActivityDefinitions(token, resolved),
        listUnitsOfMeasure(token, resolved).catch(() => ({ results: [] })),
      ]);
      setCanManage(Boolean(data?.can_manage));
      setRows(Array.isArray(data?.results) ? data.results : []);
      setUnits(Array.isArray(unitsData?.results) ? unitsData.results : []);
    } catch (e) {
      setError(e.message || t('org.operations.loadError', null, 'Could not load operations.'));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [routeOrgId, t]);

  const searchMaterials = useCallback(async (query) => {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const resolved = orgId || (await resolveActiveOrganizationId(routeOrgId));
      if (resolved) {
        const params = {};
        if (query && String(query).trim()) params.search = String(query).trim();
        const data = await listOrgMaterials(token, resolved, params);
        const list = Array.isArray(data?.results) ? data.results : [];
        setMaterialCatalog(list.slice(0, 40));
        return;
      }
      const params = {};
      if (query && String(query).trim()) params.search = String(query).trim();
      const data = await getMaterialsCatalog(token, params);
      const list = Array.isArray(data) ? data : data?.results || [];
      setMaterialCatalog(list.slice(0, 40));
    } catch {
      setMaterialCatalog([]);
    }
  }, [orgId, routeOrgId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const kindLabel = useCallback(
    (value) => t(`org.operations.kinds.${value}`, null, value),
    [t],
  );

  const findUnit = useCallback(
    (id) => (id == null ? null : units.find((u) => u.id === id) || null),
    [units],
  );

  const filterUnitsByKind = useCallback(
    (measureKinds) => {
      if (!measureKinds) return units;
      if (!measureKinds.length) return [];
      const preferred = units.filter((u) => measureKinds.includes(u.measure_kind));
      return preferred.length ? preferred : units;
    },
    [units],
  );

  const outputUnits = useMemo(() => {
    const preferred = KIND_OUTPUT_MEASURES[form.kind] || REPORT_MEASURE_KINDS;
    const kinds = [...new Set([...preferred, ...REPORT_MEASURE_KINDS])];
    return filterUnitsByKind(kinds);
  }, [filterUnitsByKind, form.kind]);

  const inputUnits = useMemo(
    () => filterUnitsByKind(KIND_INPUT_MEASURES[form.kind]),
    [filterUnitsByKind, form.kind],
  );

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyFormState());
    setSelectedMaterials([]);
    setMaterialCatalog([]);
    setFormMessage('');
    setWizardStep(0);
  };

  const startCreate = () => {
    resetForm();
    setMode('add');
    searchMaterials('');
  };

  const startEdit = (row) => {
    const hydrated = hydrateFromRow(row);
    setEditingId(row.id);
    setForm(hydrated);
    setSelectedMaterials(
      Array.isArray(row.default_materials) ? row.default_materials : [],
    );
    setFormMessage('');
    setWizardStep(0);
    setMode('add');
    searchMaterials('');
  };

  const closeWizard = () => {
    resetForm();
    setMode('list');
  };

  const validateStep = (stepIndex) => {
    if (stepIndex === 0) {
      if (!form.name.trim()) {
        setFormMessage(t('org.operations.nameRequired', null, 'Name is required.'));
        return false;
      }
    }
    setFormMessage('');
    return true;
  };

  const goNext = () => {
    if (!validateStep(wizardStep)) return;
    if (wizardStep < stepDefs.length - 1) setWizardStep((s) => s + 1);
  };

  const goPrev = () => {
    setFormMessage('');
    if (wizardStep > 0) setWizardStep((s) => s - 1);
  };

  const toggleMaterial = (mat) => {
    const id = Number(mat.id);
    const masterUnitId = resolveMaterialOpsUnitId(mat, units);
    setForm((prev) => {
      const exists = (prev.defaultMaterialIds || []).includes(id);
      const nextIds = exists
        ? prev.defaultMaterialIds.filter((x) => x !== id)
        : [...(prev.defaultMaterialIds || []), id].slice(0, 40);
      const nextNorms = { ...(prev.materialNorms || {}) };
      if (exists) {
        delete nextNorms[id];
      } else if (!nextNorms[id]) {
        // Smart default: 1st SKU → output (m²/km); additional SKUs → work_hours (fuel).
        const alreadyHasOutput = Object.values(nextNorms).some(
          (m) => (m?.basis || 'output_unit') === 'output_unit' && String(m?.rate || '').trim(),
        );
        const preferHours = alreadyHasOutput || Object.keys(nextNorms).length > 0;
        nextNorms[id] = emptyMaterialNorm({
          rate: preferHours ? '' : prev.normRate || '',
          perQty: preferHours ? '1' : prev.normBasisQty || '1',
          rateHours: preferHours ? prev.normRate || '' : '',
          perHours: '1',
          basis: preferHours ? 'work_hours' : 'output_unit',
          unitId: masterUnitId || prev.materialUnitId || prev.normInputUnitId || null,
          unitFromMaster: Boolean(masterUnitId),
        });
      }
      return {
        ...prev,
        defaultMaterialIds: nextIds,
        materialNorms: nextNorms,
        consumesMaterials: true,
      };
    });
    setSelectedMaterials((prev) => {
      const exists = prev.some((m) => Number(m.id) === id);
      if (exists) return prev.filter((m) => Number(m.id) !== id);
      return [...prev, mat].slice(0, 40);
    });
  };

  const setMaterialNormField = (materialId, key, value) => {
    const mid = Number(materialId);
    setForm((prev) => ({
      ...prev,
      materialNorms: {
        ...(prev.materialNorms || {}),
        [mid]: {
          ...emptyMaterialNorm({
            unitId: prev.materialUnitId || prev.normInputUnitId || null,
          }),
          ...((prev.materialNorms && prev.materialNorms[mid]) || {}),
          [key]: value,
        },
      },
    }));
  };

  const save = async () => {
    if (!orgId || !canManage) return;
    const trimmedName = form.name.trim();
    if (!trimmedName) {
      setFormMessage(t('org.operations.nameRequired', null, 'Name is required.'));
      setWizardStep(0);
      return;
    }
    setBusy(true);
    setFormMessage('');
    setFieldErrors({});
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const norms = buildNormsPayload(form);
      const plannedHours =
        sanitizeHoursInput(form.plannedHours) ||
        sanitizeHoursInput(form.laborPresetHours) ||
        null;
      const payload = {
        name: trimmedName,
        code: form.code.trim(),
        activity_kind: form.kind,
        report_unit_ids: (form.reportUnitIds || []).slice(0, 12),
        unit_id: (form.reportUnitIds && form.reportUnitIds[0]) || form.unitId || null,
        notes: form.notes.trim(),
        planned_hours: plannedHours,
        consumes_materials: form.kind === 'labor_only' ? false : Boolean(form.consumesMaterials),
        norms,
        is_active: form.isActive,
      };
      if (form.kind === 'transport') {
        payload.norm_rate = form.transportBaseRate.trim() || null;
        payload.norm_basis_qty = form.transportBaseRate.trim() ? '1' : null;
        payload.norm_input_unit_id = form.transportRateUnitId || null;
      } else if (form.kind !== 'labor_only') {
        const firstOutputLine = (form.defaultMaterialIds || [])
          .map((mid) => (form.materialNorms && form.materialNorms[mid]) || {})
          .find((meta) => meta.basis !== 'work_hours' && String(meta.rate || '').trim());
        const firstMeta = firstOutputLine || {};
        payload.norm_rate =
          String(firstMeta.rate || '').trim() || form.normRate.trim() || null;
        payload.norm_basis_qty =
          String(firstMeta.perQty || '').trim() || form.normBasisQty.trim() || null;
        payload.norm_input_unit_id =
          firstMeta.unitId || form.normInputUnitId || form.materialUnitId || null;
      } else {
        payload.norm_rate = null;
        payload.norm_basis_qty = null;
        payload.norm_input_unit_id = null;
      }

      if (editingId) {
        await updateActivityDefinition(token, orgId, editingId, payload);
        setFormMessage(t('org.operations.updated', null, 'Operation updated.'));
      } else {
        await createActivityDefinition(token, orgId, payload);
        setFormMessage(t('org.operations.created', null, 'Operation created.'));
      }
      await load();
      closeWizard();
    } catch (e) {
      const errors = e?.fieldErrors || {};
      setFieldErrors(errors);
      if (errors.code || errors.name) {
        setWizardStep(0);
      }
      setFormMessage(e.message || t('org.operations.saveError', null, 'Could not save operation.'));
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (row) => {
    if (!orgId || !canManage) return;
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      await updateActivityDefinition(token, orgId, row.id, { is_active: !row.is_active });
      await load();
    } catch (e) {
      Alert.alert(
        t('org.operations.title', null, 'Operations'),
        e.message || t('org.operations.saveError', null, 'Could not save operation.'),
      );
    }
  };

  const deleteOperation = async (row) => {
    if (!orgId || !canManage || !row?.id) return;
    const ok = await confirmMessage(
      t('org.operations.deleteTitle', null, 'Delete operation?'),
      t(
        'org.operations.deleteConfirm',
        null,
        'This permanently removes the operation. Blocked if it is used on any task — deactivate instead.',
      ),
      {
        confirmLabel: t('common.delete', null, 'Delete'),
        cancelLabel: t('common.cancel', null, 'Cancel'),
        destructive: true,
      },
    );
    if (!ok) return;
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      await deleteActivityDefinition(token, orgId, row.id);
      if (editingId === row.id) closeWizard();
      await load();
    } catch (e) {
      const message =
        e?.code === 'operation_in_use'
          ? t(
              'org.operations.deleteBlockedInUse',
              null,
              'Cannot delete this operation because it is used on one or more tasks. Deactivate it instead.',
            )
          : e.message || t('org.operations.deleteError', null, 'Could not delete the operation.');
      showMessage(t('org.operations.deleteTitle', null, 'Delete operation'), message, {
        variant: 'error',
      });
    }
  };

  const activeCount = useMemo(() => rows.filter((row) => row.is_active).length, [rows]);

  const renderUnitChips = (selectedId, onSelect, unitList = units) => (
    <View style={styles.kindWrap}>
      <Pressable
        onPress={() => onSelect(null)}
        style={[styles.kindChip, selectedId == null && styles.kindChipActive]}
      >
        <Text style={[styles.kindChipText, selectedId == null && styles.kindChipTextActive]}>
          {t('org.operations.unitNone', null, 'None')}
        </Text>
      </Pressable>
      {unitList.map((unit) => {
        const active = selectedId === unit.id;
        return (
          <Pressable
            key={unit.id}
            onPress={() => onSelect(unit.id)}
            style={[styles.kindChip, active && styles.kindChipActive]}
          >
            <Text style={[styles.kindChipText, active && styles.kindChipTextActive]}>
              {unitLabel(unit)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  const toggleReportUnit = (unitId) => {
    setForm((prev) => {
      const current = Array.isArray(prev.reportUnitIds) ? prev.reportUnitIds : [];
      const exists = current.includes(unitId);
      const next = exists
        ? current.filter((id) => id !== unitId)
        : [...current, unitId].slice(0, 12);
      return {
        ...prev,
        reportUnitIds: next,
        unitId: next[0] || null,
      };
    });
  };

  const renderMultiReportUnitChips = (unitList = outputUnits) => (
    <View style={styles.kindWrap}>
      <Pressable
        onPress={() =>
          setForm((prev) => ({ ...prev, reportUnitIds: [], unitId: null }))
        }
        style={[
          styles.kindChip,
          !(form.reportUnitIds || []).length && styles.kindChipActive,
        ]}
      >
        <Text
          style={[
            styles.kindChipText,
            !(form.reportUnitIds || []).length && styles.kindChipTextActive,
          ]}
        >
          {t('org.operations.unitNone', null, 'None')}
        </Text>
      </Pressable>
      {unitList.map((unit) => {
        const active = (form.reportUnitIds || []).includes(unit.id);
        return (
          <Pressable
            key={unit.id}
            onPress={() => toggleReportUnit(unit.id)}
            style={[styles.kindChip, active && styles.kindChipActive]}
          >
            <Text style={[styles.kindChipText, active && styles.kindChipTextActive]}>
              {unitLabel(unit)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  const renderNormsByKind = () => {
    const outputUnit =
      unitLabel(findUnit((form.reportUnitIds || [])[0] || form.unitId)) || 'm²';
    const inputUnit = unitLabel(findUnit(form.normInputUnitId)) || 'L';

    if (form.kind === 'transport') {
      return (
        <>
          <Text style={styles.fieldLabel}>
            {t('org.operations.wizard.consumedInputLabel', null, 'Consumed input (numbers only)')}
          </Text>
          <Text style={styles.helper}>
            {t(
              'org.operations.transportNormsHelper',
              null,
              'Numbers only — L/100 km empty + L/t. On the task: km + fuel start/end + receipts. Do not ask workers to invent liters used.',
            )}
          </Text>
          <Text style={styles.helper}>
            {t(
              'org.operations.wizard.normsMaterialsHint',
              null,
              'Pick fuel SKU on the next step; here only the rate.',
            )}
          </Text>
          <TextInput
            label={t(
              'org.operations.transportBaseRate',
              null,
              'Fuel L / 100 km (empty)',
            )}
            value={form.transportBaseRate}
            onChangeText={(value) => setField('transportBaseRate', value)}
            mode="outlined"
            keyboardType="decimal-pad"
            style={styles.input}
            textColor={ON_CARD}
            placeholder="25"
          />
          <TextInput
            label={t(
              'org.operations.transportPerTonRate',
              null,
              'Extra L / ton (loaded)',
            )}
            value={form.transportPerTonRate}
            onChangeText={(value) => setField('transportPerTonRate', value)}
            mode="outlined"
            keyboardType="decimal-pad"
            style={styles.input}
            textColor={ON_CARD}
            placeholder="0.4"
          />
          <Text style={styles.fieldLabel}>
            {t('org.operations.transportRateUnit', null, 'Fuel unit')}
          </Text>
          {renderUnitChips(
            form.transportRateUnitId,
            (id) => setField('transportRateUnitId', id),
            inputUnits,
          )}
        </>
      );
    }
    if (form.kind === 'labor_only') {
      return (
        <>
          <Text style={styles.helper}>
            {t(
              'org.operations.laborNormsHelper',
              null,
              'Preset hours for this labor-only operation. Task lines can override later.',
            )}
          </Text>
          <TextInput
            label={t('org.operations.presetHours', null, 'Preset hours')}
            value={form.laborPresetHours || form.plannedHours}
            onChangeText={(value) => {
              const hours = sanitizeHoursInput(value);
              setField('laborPresetHours', hours);
              setField('plannedHours', hours);
            }}
            mode="outlined"
            keyboardType="decimal-pad"
            style={styles.input}
            textColor={ON_CARD}
          />
        </>
      );
    }
    return (
      <>
        <Text style={styles.fieldLabel}>
          {t('org.operations.wizard.consumedInputLabel', null, 'Consumed input (numbers only)')}
        </Text>
        <Text style={styles.helper}>
          {t(
            'org.operations.normsHelper',
            {
              rate: form.normRate || '0.5',
              inputUnit,
              basis: form.normBasisQty || '1',
              outputUnit,
            },
            `Numbers only — e.g. ${form.normRate || '0.5'} ${inputUnit} per ${form.normBasisQty || '1'} ${outputUnit}. Not free text.`,
          )}
        </Text>
        <Text style={styles.helper}>
          {t(
            'org.operations.wizard.normsMaterialsHint',
            null,
            'Pick paint/fuel SKU on the next step; here only the rate.',
          )}
        </Text>
        <TextInput
          label={t(
            'org.operations.normRateLabeled',
            { unit: inputUnit },
            `Rate (${inputUnit})`,
          )}
          value={form.normRate}
          onChangeText={(value) => setField('normRate', value)}
          mode="outlined"
          keyboardType="decimal-pad"
          style={styles.input}
          textColor={ON_CARD}
          placeholder="0.5"
        />
        <TextInput
          label={t(
            'org.operations.normBasisLabeled',
            { unit: outputUnit },
            `Per (${outputUnit})`,
          )}
          value={form.normBasisQty}
          onChangeText={(value) => setField('normBasisQty', value)}
          mode="outlined"
          keyboardType="decimal-pad"
          style={styles.input}
          textColor={ON_CARD}
          placeholder="1"
        />
        <Text style={styles.fieldLabel}>
          {t(
            'org.operations.normInputUnitLabeled',
            { outputUnit },
            `Input unit (e.g. L paint) — rate applies per ${outputUnit}`,
          )}
        </Text>
        {renderUnitChips(
          form.normInputUnitId,
          (id) => setField('normInputUnitId', id),
          inputUnits,
        )}
        <Text style={styles.helper}>
          {t(
            'org.operations.wizard.normsFormulaPreview',
            {
              rate: form.normRate || '0.5',
              inputUnit,
              basis: form.normBasisQty || '1',
              outputUnit,
            },
            `${inputUnit}: [${form.normRate || '0.5'}] per [${form.normBasisQty || '1'}] ${outputUnit}`,
          )}
        </Text>
      </>
    );
  };

  const renderWizardBody = () => {
    const stepKey = stepDefs[wizardStep]?.key;
    if (stepKey === 'basics') {
      return (
        <>
          <TextInput
            label={t('org.operations.name', null, 'Name')}
            value={form.name}
            onChangeText={(value) => setField('name', value)}
            mode="outlined"
            style={styles.input}
            textColor={ON_CARD}
            error={Boolean(fieldErrors.name)}
          />
          {fieldErrors.name ? <Text style={styles.fieldError}>{fieldErrors.name}</Text> : null}
          <TextInput
            label={t('org.operations.code', null, 'Code (optional)')}
            value={form.code}
            onChangeText={(value) => setField('code', value)}
            mode="outlined"
            autoCapitalize="characters"
            style={styles.input}
            textColor={ON_CARD}
            error={Boolean(fieldErrors.code)}
          />
          <Text style={styles.helper}>
            {t(
              'org.operations.codeHelper',
              null,
              'Leave blank to auto-generate from the name (works with Bulgarian names too).',
            )}
          </Text>
          {fieldErrors.code ? <Text style={styles.fieldError}>{fieldErrors.code}</Text> : null}
          <Text style={styles.fieldLabel}>{t('org.operations.kind', null, 'Kind')}</Text>
          <View style={styles.kindWrap}>
            {KIND_OPTIONS.map((option) => {
              const active = form.kind === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setField('kind', option.value)}
                  style={[styles.kindChip, active && styles.kindChipActive]}
                >
                  <Text style={[styles.kindChipText, active && styles.kindChipTextActive]}>
                    {t(option.labelKey, null, option.value)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.helper}>
            {t(
              kindExampleKey(form.kind),
              null,
              form.kind === 'transport'
                ? 'Example: Sofia–Varna haul → worker reports km (meter start/end) + ~9 h time norm.'
                : form.kind === 'construction' || form.kind === 'road_marking'
                  ? 'Example: hidroizolaciq / marking → worker reports m² done.'
                  : 'Pick a kind to suggest the right output units and norms.',
            )}
          </Text>
          <TextInput
            label={t('org.operations.notes', null, 'Notes')}
            value={form.notes}
            onChangeText={(value) => setField('notes', value)}
            mode="outlined"
            multiline
            style={styles.input}
            textColor={ON_CARD}
          />
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>{t('org.operations.active', null, 'Active')}</Text>
            <Switch
              value={form.isActive}
              onValueChange={(value) => setField('isActive', value)}
            />
          </View>
        </>
      );
    }
    if (stepKey === 'output') {
      const selectedReportLabels = (form.reportUnitIds || [])
        .map((id) => unitLabel(findUnit(id)))
        .filter(Boolean);
      return (
        <>
          <Text style={styles.fieldLabel}>
            {t(
              'org.operations.wizard.workerReportsLabel',
              null,
              'Worker reports — multi-select',
            )}
          </Text>
          <Text style={styles.helper}>
            {t(
              form.kind === 'transport'
                ? 'org.operations.wizard.outputUnitHelperTransport'
                : 'org.operations.wizard.outputUnitHelper',
              null,
              form.kind === 'transport'
                ? 'Prefer km (+ optional hours). Fuel litres come from tank start/end + receipts on the task — not as the main report chip.'
                : 'Prefer m² (or km) on the operation. Working hours once on the task. Do not pick L here for paint leftovers — leftovers go on Materials.',
            )}
          </Text>
          {renderMultiReportUnitChips(outputUnits)}
          {selectedReportLabels.length ? (
            <Text style={styles.helper}>
              {t(
                'org.operations.wizard.reportUnitsSelected',
                { units: selectedReportLabels.join(' · ') },
                `Selected: ${selectedReportLabels.join(' · ')}`,
              )}
            </Text>
          ) : null}
          <Text style={styles.helper}>
            {t(
              kindExampleKey(form.kind),
              null,
              form.kind === 'transport'
                ? 'Example: Sofia–Varna haul → km + hours.'
                : 'Example: marking machine → m² + working hours.',
            )}
          </Text>
          {form.kind !== 'labor_only' ? (
            <>
              <TextInput
                label={t('org.operations.plannedHours', null, 'Time norm (hours)')}
                value={form.plannedHours}
                onChangeText={(value) => setField('plannedHours', sanitizeHoursInput(value))}
                mode="outlined"
                keyboardType="decimal-pad"
                style={styles.input}
                textColor={ON_CARD}
                placeholder="9"
              />
              <Text style={styles.helper}>
                {t(
                  'org.operations.wizard.plannedHoursHelper',
                  null,
                  'Optional planned hours when hours are not selected as a report unit. Material fuel norms can use reported working hours.',
                )}
              </Text>
            </>
          ) : null}
        </>
      );
    }
    if (stepKey === 'materials') {
      if (form.kind === 'labor_only') {
        return (
          <Text style={styles.helper}>
            {t(
              'org.operations.wizard.laborNoMaterials',
              null,
              'Labor-only operations do not consume warehouse materials.',
            )}
          </Text>
        );
      }
      const selectedIds = form.defaultMaterialIds || [];
      const catalogRows = [
        ...selectedMaterials,
        ...materialCatalog.filter(
          (m) => !selectedMaterials.some((s) => Number(s.id) === Number(m.id)),
        ),
      ];
      const outputBasisUnit = resolveOutputBasisUnit(form, findUnit);
      const outputUnitLbl = unitLabel(outputBasisUnit) || 'm²';
      const dualNormSummary = (() => {
        const parts = selectedIds
          .map((mid) => {
            const meta = (form.materialNorms && form.materialNorms[mid]) || {};
            const mat =
              selectedMaterials.find((m) => Number(m.id) === Number(mid)) ||
              catalogRows.find((m) => Number(m.id) === Number(mid));
            const inputUnit =
              materialUnitDisplay(mat, findUnit, meta) ||
              unitLabel(findUnit(meta.unitId)) ||
              unitLabel(findUnit(form.materialUnitId)) ||
              '';
            const name = materialLabel(mat) || `#${mid}`;
            const chunks = [];
            if (String(meta.rate || '').trim()) {
              chunks.push(
                t(
                  'org.operations.materialNormLineSummary',
                  {
                    rate: meta.rate,
                    input: inputUnit,
                    per: meta.perQty || '1',
                    basis: outputUnitLbl,
                    name,
                  },
                  `${meta.rate}${inputUnit ? ` ${inputUnit}` : ''} / ${meta.perQty || '1'} ${outputUnitLbl} (${name})`,
                ),
              );
            }
            if (String(meta.rateHours || '').trim()) {
              const hLabel = t('org.operations.basisWorkHoursShort', null, 'h');
              chunks.push(
                t(
                  'org.operations.materialNormLineSummary',
                  {
                    rate: meta.rateHours,
                    input: inputUnit,
                    per: meta.perHours || '1',
                    basis: hLabel,
                    name,
                  },
                  `${meta.rateHours}${inputUnit ? ` ${inputUnit}` : ''} / ${meta.perHours || '1'} ${hLabel} (${name})`,
                ),
              );
            }
            return chunks.length ? chunks.join(' · ') : null;
          })
          .filter(Boolean);
        return parts.length ? parts.join(' + ') : '';
      })();
      return (
        <>
          {form.kind === 'transport' ? (
            <>
              <Text style={styles.fieldLabel}>
                {t('org.operations.wizard.consumedInputLabel', null, 'Consumed input (numbers only)')}
              </Text>
              {renderNormsByKind()}
            </>
          ) : null}
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>
              {t('org.operations.consumesMaterials', null, 'Consumes materials')}
            </Text>
            <Switch
              value={form.consumesMaterials}
              onValueChange={(value) => setField('consumesMaterials', value)}
            />
          </View>
          <Text style={styles.helper}>
                {t(
                  'org.operations.wizard.materialsNormsCoupledHint',
                  null,
                  'Off = labor-only. On = add separate SKU lines (e.g. paint per m² AND machine fuel per working hour). Fuel norms are for expected calc from task hours/km — workers do not enter fuel hours on every operation.',
                )}
              </Text>
              {form.consumesMaterials ? (
            <>
              <Text style={styles.fieldLabel}>
                {t('org.operations.defaultMaterials', null, 'Default materials (SKUs)')}
              </Text>
              <Text style={styles.helper}>
                {t(
                  'org.operations.wizard.dualMaterialSlotsHint',
                  null,
                  'Add lines as needed: (1) paint/thinner → rate per m², (2) optional fuel → rate per working hour or per km. Workers report m² per op; hours/km once on the task.',
                )}
              </Text>
              <TextInput
                label={t('org.operations.searchMaterials', null, 'Search materials')}
                value={form.materialSearch}
                onChangeText={(value) => {
                  setField('materialSearch', value);
                  searchMaterials(value);
                }}
                mode="outlined"
                style={styles.input}
                textColor={ON_CARD}
              />
              <View style={styles.kindWrap}>
                {catalogRows.map((mat) => {
                  const active = selectedIds.includes(Number(mat.id));
                  return (
                    <Pressable
                      key={mat.id}
                      onPress={() => toggleMaterial(mat)}
                      style={[styles.kindChip, active && styles.kindChipActive]}
                    >
                      <Text
                        style={[styles.kindChipText, active && styles.kindChipTextActive]}
                        numberOfLines={1}
                      >
                        {materialLabel(mat)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {catalogRows.length === 0 ? (
                <Text style={styles.helper}>
                  {t(
                    'org.operations.materialsEmptyImport',
                    null,
                    'Import an invoice to add materials.',
                  )}{' '}
                  <Text
                    style={styles.linkInline}
                    onPress={() => navigateToOrgWarehouse(navigation, { orgId })}
                  >
                    {t('org.operations.openWarehouse', null, 'Open warehouse')}
                  </Text>
                </Text>
              ) : selectedIds.length === 0 ? (
                <Text style={styles.helper}>
                  {t(
                    'org.operations.noMaterialsSelected',
                    null,
                    'No SKUs selected yet. Search and tap to multi-select fuel, paint, bitumen…',
                  )}
                </Text>
              ) : (
                selectedIds.map((mid, lineIdx) => {
                  const mat =
                    selectedMaterials.find((m) => Number(m.id) === Number(mid)) ||
                    catalogRows.find((m) => Number(m.id) === Number(mid));
                  const meta = (form.materialNorms && form.materialNorms[mid]) || emptyMaterialNorm();
                  const basisIsHours = meta.basis === 'work_hours';
                  const unitLbl =
                    materialUnitDisplay(mat, findUnit, meta) ||
                    t('org.operations.unitNone', null, 'None');
                  // Lock unit from master when we resolved it; rare override via chips.
                  const showUnitOverride = !meta.unitFromMaster || !meta.unitId;
                  return (
                    <View key={mid} style={styles.materialNormCard}>
                      <Text style={styles.opTitleInline}>
                        {t(
                          'org.operations.materialNormLineTitle',
                          {
                            n: lineIdx + 1,
                            name: materialLabel(mat) || `#${mid}`,
                          },
                          `SKU ${lineIdx + 1}: ${materialLabel(mat) || `#${mid}`}`,
                        )}
                      </Text>
                      <Text style={styles.helper}>
                        {t(
                          'org.operations.materialNormCardHint',
                          null,
                          'Two independent norms — paint/m² and fuel/hour stay separate when you switch basis. Unit comes from the warehouse material.',
                        )}
                      </Text>
                      <Text style={styles.fieldLabel}>
                        {t(
                          'org.operations.materialNormOutputBlock',
                          { unit: outputUnitLbl },
                          `Per ${outputUnitLbl} (output)`,
                        )}
                      </Text>
                      <TextInput
                        label={t(
                          'org.operations.materialNormRateOutput',
                          { unit: unitLbl, output: outputUnitLbl },
                          `Rate (e.g. 0.7 ${unitLbl} / ${outputUnitLbl})`,
                        )}
                        value={meta.rate || ''}
                        onChangeText={(value) =>
                          setMaterialNormField(mid, 'rate', sanitizeDecimalInput(value))
                        }
                        mode="outlined"
                        keyboardType="decimal-pad"
                        style={styles.input}
                        textColor={ON_CARD}
                      />
                      <TextInput
                        label={t(
                          'org.operations.materialNormPerOutput',
                          { unit: outputUnitLbl },
                          `Per output qty (e.g. 1 ${outputUnitLbl})`,
                        )}
                        value={meta.perQty || '1'}
                        onChangeText={(value) =>
                          setMaterialNormField(mid, 'perQty', sanitizeDecimalInput(value))
                        }
                        mode="outlined"
                        keyboardType="decimal-pad"
                        style={styles.input}
                        textColor={ON_CARD}
                      />
                      <Text style={styles.fieldLabel}>
                        {t(
                          'org.operations.materialNormHoursBlock',
                          null,
                          'Per working hour',
                        )}
                      </Text>
                      <TextInput
                        label={t(
                          'org.operations.materialNormRateHours',
                          { unit: unitLbl },
                          `Rate (e.g. 2.5 ${unitLbl} / h)`,
                        )}
                        value={meta.rateHours || ''}
                        onChangeText={(value) =>
                          setMaterialNormField(mid, 'rateHours', sanitizeDecimalInput(value))
                        }
                        mode="outlined"
                        keyboardType="decimal-pad"
                        style={styles.input}
                        textColor={ON_CARD}
                      />
                      <TextInput
                        label={t(
                          'org.operations.materialNormPerHours',
                          null,
                          'Per working hours (e.g. 1)',
                        )}
                        value={meta.perHours || '1'}
                        onChangeText={(value) =>
                          setMaterialNormField(mid, 'perHours', sanitizeDecimalInput(value))
                        }
                        mode="outlined"
                        keyboardType="decimal-pad"
                        style={styles.input}
                        textColor={ON_CARD}
                      />
                      <Text style={styles.fieldLabel}>
                        {t(
                          'org.operations.materialNormBasis',
                          null,
                          'Active basis for this SKU',
                        )}
                      </Text>
                      <Text style={styles.helper}>
                        {t(
                          'org.operations.materialNormBasisHelper',
                          null,
                          'Which rate is used for expected calc. Switching does not clear the other pair.',
                        )}
                      </Text>
                      <View style={styles.kindWrap}>
                        <Pressable
                          onPress={() => setMaterialNormField(mid, 'basis', 'output_unit')}
                          style={[
                            styles.kindChip,
                            !basisIsHours && styles.kindChipActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.kindChipText,
                              !basisIsHours && styles.kindChipTextActive,
                            ]}
                          >
                            {t(
                              'org.operations.basisOutputUnit',
                              { unit: outputUnitLbl },
                              `Use ${outputUnitLbl} rate`,
                            )}
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() => setMaterialNormField(mid, 'basis', 'work_hours')}
                          style={[
                            styles.kindChip,
                            basisIsHours && styles.kindChipActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.kindChipText,
                              basisIsHours && styles.kindChipTextActive,
                            ]}
                          >
                            {t(
                              'org.operations.basisWorkHours',
                              null,
                              'Use working-hour rate',
                            )}
                          </Text>
                        </Pressable>
                      </View>
                      <Text style={styles.fieldLabel}>
                        {t('org.operations.materialUnitFromMaster', null, 'Material unit')}
                      </Text>
                      <Text style={styles.helper}>
                        {t(
                          'org.operations.materialUnitFromMasterHint',
                          { unit: unitLbl },
                          `From warehouse / material master: ${unitLbl}`,
                        )}
                      </Text>
                      {showUnitOverride ? (
                        <>
                          <Text style={styles.helper}>
                            {t(
                              'org.operations.materialUnitOverride',
                              null,
                              'Override only if the master unit is missing:',
                            )}
                          </Text>
                          {renderUnitChips(
                            meta.unitId,
                            (id) => {
                              const midNum = Number(mid);
                              setForm((prev) => ({
                                ...prev,
                                materialNorms: {
                                  ...(prev.materialNorms || {}),
                                  [midNum]: {
                                    ...emptyMaterialNorm(),
                                    ...((prev.materialNorms && prev.materialNorms[midNum]) || {}),
                                    unitId: id,
                                    unitFromMaster: false,
                                  },
                                },
                              }));
                            },
                            inputUnits.length ? inputUnits : units,
                          )}
                        </>
                      ) : null}
                    </View>
                  );
                })
              )}
              {dualNormSummary ? (
                <Text style={[styles.helper, styles.opTitleInline]}>
                  {t(
                    'org.operations.wizard.dualNormsSummary',
                    { summary: dualNormSummary },
                    `Norms: ${dualNormSummary}`,
                  )}
                </Text>
              ) : null}
            </>
          ) : null}
        </>
      );
    }
    // review
    const hours =
      sanitizeHoursInput(form.plannedHours) ||
      sanitizeHoursInput(form.laborPresetHours) ||
      t('org.operations.wizard.none', null, 'None');
    const selectedIdsReview = form.defaultMaterialIds || [];
    const materialNames = selectedMaterials
      .filter((m) => selectedIdsReview.includes(Number(m.id)))
      .map(materialLabel)
      .join(', ');
    let rateLine = t('org.operations.wizard.none', null, 'None');
    if (form.kind === 'transport' && (form.transportBaseRate || form.transportPerTonRate)) {
      const fuelUnit = unitLabel(findUnit(form.transportRateUnitId)) || 'L';
      rateLine = t(
        'org.operations.transportNormSummary',
        {
          base: form.transportBaseRate || '0',
          perTon: form.transportPerTonRate || '0',
          unit: fuelUnit,
        },
        `${form.transportBaseRate || '0'} ${fuelUnit}/100 km empty` +
          (form.transportPerTonRate
            ? ` + ${form.transportPerTonRate} ${fuelUnit}/t`
            : ''),
      );
    } else if (selectedIdsReview.length) {
      const reviewOutputLbl =
        unitLabel(resolveOutputBasisUnit(form, findUnit)) || 'm²';
      const parts = selectedIdsReview
        .map((mid) => {
          const meta = (form.materialNorms && form.materialNorms[mid]) || {};
          const mat =
            selectedMaterials.find((m) => Number(m.id) === Number(mid)) || { id: mid };
          const inputUnit =
            materialUnitDisplay(mat, findUnit, meta) ||
            unitLabel(findUnit(meta.unitId)) ||
            unitLabel(findUnit(form.materialUnitId)) ||
            '';
          const chunks = [];
          if (String(meta.rate || '').trim()) {
            chunks.push(
              `${materialLabel(mat)}: ${meta.rate}${inputUnit ? ` ${inputUnit}` : ''} / ${
                meta.perQty || '1'
              } ${reviewOutputLbl}`,
            );
          }
          if (String(meta.rateHours || '').trim()) {
            const hLabel = t('org.operations.basisWorkHoursShort', null, 'h');
            chunks.push(
              `${materialLabel(mat)}: ${meta.rateHours}${inputUnit ? ` ${inputUnit}` : ''} / ${
                meta.perHours || '1'
              } ${hLabel}`,
            );
          }
          return chunks.length ? chunks.join(' · ') : null;
        })
        .filter(Boolean);
      if (parts.length) rateLine = parts.join(' · ');
    } else if (form.normRate.trim()) {
      rateLine = `${form.normRate} ${unitLabel(findUnit(form.normInputUnitId)) || ''} / ${
        form.normBasisQty || '1'
      } ${unitLabel(findUnit(form.unitId)) || ''}`.trim();
    }
    return (
      <View style={styles.reviewBlock}>
        <Text style={styles.reviewLine}>
          <Text style={styles.reviewKey}>{t('org.operations.name', null, 'Name')}: </Text>
          {form.name.trim() || '—'}
        </Text>
        <Text style={styles.reviewLine}>
          <Text style={styles.reviewKey}>{t('org.operations.kind', null, 'Kind')}: </Text>
          {kindLabel(form.kind)}
        </Text>
        <Text style={styles.reviewLine}>
          <Text style={styles.reviewKey}>
            {t('org.operations.wizard.workerReportsLabel', null, 'Worker reports')}:{' '}
          </Text>
          {(form.reportUnitIds || [])
            .map((id) => unitLabel(findUnit(id)))
            .filter(Boolean)
            .join(' · ') ||
            unitLabel(findUnit(form.unitId)) ||
            t('org.operations.unitNone', null, 'None')}
        </Text>
        <Text style={styles.reviewLine}>
          <Text style={styles.reviewKey}>
            {t('org.operations.plannedHours', null, 'Time norm (hours)')}:{' '}
          </Text>
          {hours}
        </Text>
        <Text style={styles.reviewLine}>
          <Text style={styles.reviewKey}>
            {t('org.operations.wizard.ratesReview', null, 'Norm rates')}:{' '}
          </Text>
          {rateLine}
        </Text>
        <Text style={styles.reviewLine}>
          <Text style={styles.reviewKey}>
            {t('org.operations.consumesMaterials', null, 'Consumes materials')}:{' '}
          </Text>
          {form.kind === 'labor_only' || !form.consumesMaterials
            ? t('org.operations.wizard.no', null, 'No')
            : t('org.operations.wizard.yes', null, 'Yes')}
        </Text>
        {form.consumesMaterials && materialNames ? (
          <Text style={styles.reviewLine}>
            <Text style={styles.reviewKey}>
              {t('org.operations.defaultMaterials', null, 'Default materials')}:{' '}
            </Text>
            {materialNames}
          </Text>
        ) : null}
        {form.notes.trim() ? (
          <Text style={styles.reviewLine}>
            <Text style={styles.reviewKey}>{t('org.operations.notes', null, 'Notes')}: </Text>
            {form.notes.trim()}
          </Text>
        ) : null}
      </View>
    );
  };

  const currentStep = stepDefs[wizardStep];

  const renderWizardModal = () => (
    <Modal
      visible={mode === 'add'}
      animationType="slide"
      transparent
      onRequestClose={closeWizard}
      statusBarTranslucent
    >
      <View style={styles.modalBackdrop} pointerEvents="box-none">
        <View style={styles.modalSheet}>
          <ScrollView
            contentContainerStyle={styles.modalScroll}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.wizardHeaderRow}>
              <Text style={[styles.sectionTitle, styles.wizardHeaderTitle]}>
                {editingId
                  ? t('org.operations.editOperation', null, 'Edit operation')
                  : t('org.operations.addOperation', null, 'Add operation')}
              </Text>
              <Pressable onPress={closeWizard} hitSlop={8} style={styles.wizardExitBtn}>
                <Text style={styles.wizardExitText}>
                  {t('org.operations.wizard.exit', null, 'Exit')}
                </Text>
              </Pressable>
            </View>
            <View style={styles.stepRow}>
              {stepDefs.map((s, idx) => (
                <Pressable
                  key={s.key}
                  onPress={() => {
                    if (idx <= wizardStep || (idx > 0 && validateStep(0))) {
                      if (idx > wizardStep) {
                        for (let i = wizardStep; i < idx; i += 1) {
                          if (!validateStep(i)) return;
                        }
                      }
                      setWizardStep(idx);
                    }
                  }}
                  style={[
                    styles.stepChip,
                    idx === wizardStep && styles.stepChipActive,
                    idx < wizardStep && styles.stepChipDone,
                  ]}
                >
                  <Text
                    style={[
                      styles.stepChipText,
                      idx === wizardStep && styles.stepChipTextActive,
                    ]}
                  >
                    {idx + 1}. {s.title}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.stepHint}>{currentStep?.hint}</Text>
            {renderWizardBody()}
            {formMessage ? <Text style={styles.formMessage}>{formMessage}</Text> : null}
            <View style={styles.wizardNav}>
              {wizardStep > 0 ? (
                <Button mode="outlined" onPress={goPrev} style={styles.navBtn} textColor={ON_CARD}>
                  {t('common.back', null, 'Back')}
                </Button>
              ) : (
                <Button mode="text" onPress={closeWizard} textColor={ON_CARD} style={styles.navBtn}>
                  {t('common.cancel', null, 'Cancel')}
                </Button>
              )}
              {wizardStep < stepDefs.length - 1 ? (
                <Button mode="contained" onPress={goNext} style={styles.navBtn}>
                  {t('common.continue', null, 'Continue')}
                </Button>
              ) : (
                <Button
                  mode="contained"
                  loading={busy}
                  disabled={busy}
                  onPress={save}
                  style={styles.navBtn}
                >
                  {t('common.save', null, 'Save')}
                </Button>
              )}
            </View>
            {editingId ? (
              <Button
                mode="text"
                textColor="#B91C1C"
                onPress={() => {
                  const row = rows.find((r) => r.id === editingId);
                  if (row) deleteOperation(row);
                }}
                style={styles.deleteInWizard}
              >
                {t('common.delete', null, 'Delete')}
              </Button>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <ScreenBackground safeArea={false}>
      <OrgAppHeader
        mode="detail"
        title={t('org.operations.title', null, 'Operations')}
        onBack={onBack}
      />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: scrollBottomPadding }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.lead}>
          {t(
            'org.operations.lead',
            null,
            'Define the operations your company uses on work cards — transport, marking, field work, and more.',
          )}
        </Text>

        <View style={styles.modeRow}>
          {MODES.map((item) => {
            const active = mode === item.id;
            const disabled = item.id === 'add' && !canManage;
            return (
              <Pressable
                key={item.id}
                disabled={disabled}
                onPress={() => (item.id === 'add' ? startCreate() : setMode('list'))}
                style={[styles.modeChip, active && styles.modeChipActive, disabled && styles.modeChipDisabled]}
              >
                <Text style={[styles.modeChipText, active && styles.modeChipTextActive]}>
                  {t(item.labelKey, null, item.id)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {loading ? (
          <ActivityIndicator color="#fff" style={styles.loader} />
        ) : error ? (
          <AppCard style={styles.card} contentStyle={CARD_SURFACE}>
            <Text style={styles.error}>{error}</Text>
            <Button mode="contained" onPress={load} style={styles.retry}>
              {t('common.retry', null, 'Retry')}
            </Button>
          </AppCard>
        ) : (
          <AppCard style={styles.card} contentStyle={CARD_SURFACE}>
            <Text style={styles.sectionTitle}>
              {t('org.operations.catalogTitle', null, 'Company operations')}
            </Text>
            <Text style={styles.meta}>
              {t(
                'org.operations.count',
                { active: activeCount, total: rows.length },
                `${activeCount} active of ${rows.length}`,
              )}
            </Text>
            {rows.length === 0 ? (
              <Text style={styles.empty}>
                {t(
                  'org.operations.empty',
                  null,
                  'No operations yet. Create transport, road marking, or other work types your team uses.',
                )}
              </Text>
            ) : (
              rows.map((row) => (
                <View key={row.id} style={styles.row}>
                  <View style={styles.rowBody}>
                    <Text style={styles.rowTitle}>{row.name}</Text>
                    <Text style={styles.rowMeta}>
                      {row.code} · {kindLabel(row.activity_kind)}
                      {row.unit ? ` · ${unitLabel(row.unit)}` : ''}
                      {row.consumes_materials
                        ? ` · ${t('org.operations.consumesMaterialsShort', null, 'Materials')}`
                        : row.activity_kind === 'labor_only'
                          ? ` · ${t('org.operations.laborOnlyShort', null, 'Labor')}`
                          : ''}
                      {row.is_active
                        ? ''
                        : ` · ${t('org.operations.inactive', null, 'Inactive')}`}
                    </Text>
                    {row.notes ? (
                      <Text style={styles.rowNotes} numberOfLines={2}>
                        {row.notes}
                      </Text>
                    ) : null}
                    <Text style={styles.rowMeta}>{normSummaryText(row, t, kindLabel)}</Text>
                  </View>
                  {canManage ? (
                    <View style={styles.rowActions}>
                      <Pressable onPress={() => startEdit(row)} style={styles.rowAction}>
                        <Text style={styles.rowActionText}>{t('common.edit', null, 'Edit')}</Text>
                      </Pressable>
                      <Pressable onPress={() => toggleActive(row)} style={styles.rowAction}>
                        <Text style={styles.rowActionText}>
                          {row.is_active
                            ? t('org.operations.deactivate', null, 'Deactivate')
                            : t('org.operations.activate', null, 'Activate')}
                        </Text>
                      </Pressable>
                      <Pressable onPress={() => deleteOperation(row)} style={styles.rowAction}>
                        <Text style={[styles.rowActionText, styles.rowActionDanger]}>
                          {t('common.delete', null, 'Delete')}
                        </Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              ))
            )}
            {canManage ? (
              <Button mode="contained" onPress={startCreate} style={styles.primaryBtn}>
                {t('org.operations.addOperation', null, 'Add operation')}
              </Button>
            ) : null}
          </AppCard>
        )}
      </ScrollView>
      {renderWizardModal()}
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.62)',
    justifyContent: 'flex-end',
    zIndex: 100000,
    elevation: 100000,
    ...(Platform.OS === 'web' ? { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 } : {}),
  },
  modalSheet: {
    maxHeight: '92%',
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingTop: 14,
    paddingHorizontal: 14,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    zIndex: 100001,
    elevation: 100001,
  },
  modalScroll: {
    paddingBottom: 24,
  },
  lead: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
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
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '600',
  },
  modeChipTextActive: {
    color: COLORS.TEXT_DARK,
  },
  loader: {
    marginVertical: 24,
  },
  card: {
    padding: 14,
    marginBottom: 12,
    color: ON_CARD,
  },
  sectionTitle: {
    color: ON_CARD,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  meta: {
    color: ON_CARD_MUTED,
    fontSize: 12,
    marginBottom: 12,
  },
  helper: {
    color: ON_CARD_MUTED,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  fieldError: {
    color: '#B00020',
    fontSize: 13,
    marginTop: -4,
    marginBottom: 8,
  },
  empty: {
    color: ON_CARD_MUTED,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  error: {
    color: '#b91c1c',
    marginBottom: 10,
  },
  retry: {
    alignSelf: 'flex-start',
  },
  row: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(15,23,42,0.12)',
    paddingVertical: 12,
  },
  rowBody: {
    marginBottom: 8,
  },
  rowTitle: {
    color: ON_CARD,
    fontSize: 15,
    fontWeight: '700',
  },
  rowMeta: {
    color: ON_CARD_MUTED,
    fontSize: 12,
    marginTop: 4,
  },
  rowNotes: {
    color: ON_CARD_MUTED,
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  rowActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  rowAction: {
    paddingVertical: 4,
  },
  rowActionDanger: {
    color: '#B91C1C',
  },
  deleteInWizard: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  rowActionText: {
    color: COLORS.PRIMARY,
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  fieldLabel: {
    color: ON_CARD,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  kindWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  kindChip: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  kindChipActive: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  kindChipText: {
    color: ON_CARD,
    fontSize: 12,
    fontWeight: '600',
  },
  kindChipTextActive: {
    color: '#FFFFFF',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  switchLabel: {
    color: ON_CARD,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    paddingRight: 12,
  },
  formMessage: {
    color: ON_CARD_MUTED,
    marginBottom: 10,
  },
  primaryBtn: {
    marginTop: 4,
    marginBottom: 4,
  },
  stepRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  stepChip: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  stepChipActive: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  stepChipDone: {
    borderColor: COLORS.PRIMARY,
  },
  stepChipText: {
    color: ON_CARD,
    fontSize: 11,
    fontWeight: '600',
  },
  stepChipTextActive: {
    color: '#FFFFFF',
  },
  stepHint: {
    color: ON_CARD_MUTED,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  wizardNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 8,
  },
  navBtn: {
    flex: 1,
  },
  wizardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 12,
  },
  wizardHeaderTitle: {
    flex: 1,
    marginBottom: 0,
  },
  wizardExitBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  wizardExitText: {
    color: ON_CARD,
    fontSize: 13,
    fontWeight: '700',
  },
  materialNormCard: {
    marginTop: 10,
    marginBottom: 4,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  opTitleInline: {
    color: ON_CARD,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  reviewBlock: {
    marginBottom: 8,
  },
  reviewLine: {
    color: ON_CARD,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 6,
  },
  reviewKey: {
    color: ON_CARD_MUTED,
    fontWeight: '700',
  },
  linkInline: {
    color: COLORS.PRIMARY,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
