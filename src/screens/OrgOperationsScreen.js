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
import { navigateToOrgHome, navigateToOrgWarehouse } from '../navigation/webNavigation';
import { useTranslation } from '../i18n';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { COLORS } from '../constants/colors';
import { useScrollContentBottomPadding } from '../utils/mobileWebInsets';

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

/** Kind → preferred output measure_kinds (worker reports). */
const KIND_OUTPUT_MEASURES = {
  transport: ['distance', 'duration', 'count'],
  construction: ['area', 'volume', 'mass', 'count'],
  road_marking: ['area', 'distance', 'count'],
  field_service: ['count', 'duration', 'area', 'distance'],
  warehouse_task: ['count', 'mass', 'volume'],
  labor_only: ['duration'],
  inspection: ['count', 'duration'],
  workshop_service: ['duration', 'count'],
  other: null,
};

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
  if (!row) return '';
  const name = row.name || `Material #${row.id}`;
  const sku = row.part_number || row.shop_sku || '';
  return sku ? `${name} (${sku})` : name;
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
    materialNorms[mid] = {
      rate: line.rate != null ? String(line.rate) : '',
      perQty: line.per_qty != null ? String(line.per_qty) : '1',
      basis: line.basis === 'work_hours' ? 'work_hours' : 'output_unit',
      unitId: line.unit_id || null,
    };
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
    materialNorms[mid] = {
      rate: legacyRate,
      perQty: legacyPer,
      basis: 'output_unit',
      unitId: legacyUnit,
    };
  });
  return {
    name: row.name || '',
    code: row.code || '',
    kind: row.activity_kind || 'other',
    unitId: row.unit_id || row.unit?.id || null,
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
      return {
        material_id: mid,
        rate: String(meta.rate || '').trim() || null,
        per_qty: String(meta.perQty || form.normBasisQty || '1').trim() || '1',
        basis: meta.basis === 'work_hours' ? 'work_hours' : 'output_unit',
        unit_id: meta.unitId || form.materialUnitId || form.normInputUnitId || null,
      };
    });
    // Keep a legacy generic rate from the first output_unit line for older clients.
    const firstOutput = materialLines.find(
      (line) => line.basis === 'output_unit' && line.rate,
    );
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

  const setField = useCallback((key, value) => {
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
          'ONE primary output the worker reports (m², km, h…) plus optional time norm in hours.',
        ),
      },
      {
        key: 'materials',
        title: t('org.operations.wizard.stepMaterialsNorms', null, 'Materials + norms'),
        hint: t(
          'org.operations.wizard.stepMaterialsNormsHint',
          null,
          'Toggle labor-only vs labor + materials. For each SKU set the norm rate and basis (per output unit or per working hour).',
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

  const outputUnits = useMemo(
    () => filterUnitsByKind(KIND_OUTPUT_MEASURES[form.kind]),
    [filterUnitsByKind, form.kind],
  );

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
    setForm((prev) => {
      const exists = (prev.defaultMaterialIds || []).includes(id);
      const nextIds = exists
        ? prev.defaultMaterialIds.filter((x) => x !== id)
        : [...(prev.defaultMaterialIds || []), id].slice(0, 40);
      const nextNorms = { ...(prev.materialNorms || {}) };
      if (exists) {
        delete nextNorms[id];
      } else if (!nextNorms[id]) {
        nextNorms[id] = {
          rate: prev.normRate || '',
          perQty: prev.normBasisQty || '1',
          basis: 'output_unit',
          unitId: prev.materialUnitId || prev.normInputUnitId || null,
        };
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
          rate: '',
          perQty: '1',
          basis: 'output_unit',
          unitId: prev.materialUnitId || prev.normInputUnitId || null,
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
        unit_id: form.unitId || null,
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
        const firstId = (form.defaultMaterialIds || [])[0];
        const firstMeta =
          firstId != null ? (form.materialNorms && form.materialNorms[firstId]) || {} : {};
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

  const renderNormsByKind = () => {
    const outputUnit = unitLabel(findUnit(form.unitId)) || 'm²';
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
              'Numbers only — two fuel rates. Worker reports km on End (meter start/end), not liters here.',
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
          />
          <TextInput
            label={t('org.operations.code', null, 'Code (optional)')}
            value={form.code}
            onChangeText={(value) => setField('code', value)}
            mode="outlined"
            autoCapitalize="characters"
            style={styles.input}
            textColor={ON_CARD}
          />
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
      return (
        <>
          <Text style={styles.fieldLabel}>
            {t('org.operations.wizard.workerReportsLabel', null, 'Worker reports (output)')}
          </Text>
          <Text style={styles.helper}>
            {t(
              'org.operations.wizard.outputUnitHelper',
              null,
              'ONE primary output only (m² or km). Paint/fuel liters are NOT selected here — they are norms + leftovers later.',
            )}
          </Text>
          {renderUnitChips(form.unitId, (id) => setField('unitId', id), outputUnits)}
          <Text style={styles.helper}>
            {t(
              kindExampleKey(form.kind),
              null,
              form.kind === 'transport'
                ? 'Example: Sofia–Varna haul → km + ~9 h.'
                : 'Example: hidroizolaciq → m².',
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
                  'Numeric hours only (e.g. 9). Not a rate — rates belong on the next step.',
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
      const outputUnitLbl = unitLabel(findUnit(form.unitId)) || 'm²';
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
              'Off = labor-only. On = pick SKUs and set each norm (e.g. paint 0.5 kg per 1 m²; machine fuel 3 L per working hour). Worker still reports ONE output unit.',
            )}
          </Text>
          {form.consumesMaterials ? (
            <>
              <Text style={styles.fieldLabel}>
                {t('org.operations.defaultMaterials', null, 'Default materials (SKUs)')}
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
                selectedIds.map((mid) => {
                  const mat =
                    selectedMaterials.find((m) => Number(m.id) === Number(mid)) ||
                    catalogRows.find((m) => Number(m.id) === Number(mid));
                  const meta = (form.materialNorms && form.materialNorms[mid]) || {
                    rate: '',
                    perQty: '1',
                    basis: 'output_unit',
                    unitId: null,
                  };
                  const basisIsHours = meta.basis === 'work_hours';
                  return (
                    <View key={mid} style={styles.materialNormBlock}>
                      <Text style={styles.opTitleInline}>{materialLabel(mat) || `#${mid}`}</Text>
                      <TextInput
                        label={t(
                          'org.operations.materialNormRate',
                          null,
                          'Norm rate (e.g. 0.5)',
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
                        label={
                          basisIsHours
                            ? t(
                                'org.operations.materialNormPerHours',
                                null,
                                'Per working hours (e.g. 1)',
                              )
                            : t(
                                'org.operations.materialNormPerOutput',
                                { unit: outputUnitLbl },
                                `Per output qty (e.g. 1 ${outputUnitLbl})`,
                              )
                        }
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
                        {t('org.operations.materialNormBasis', null, 'Norm basis')}
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
                              `Per ${outputUnitLbl} (output)`,
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
                              'Per working hour',
                            )}
                          </Text>
                        </Pressable>
                      </View>
                      <Text style={styles.fieldLabel}>
                        {t('org.operations.materialUnit', null, 'Material unit (optional)')}
                      </Text>
                      {renderUnitChips(
                        meta.unitId,
                        (id) => setMaterialNormField(mid, 'unitId', id),
                        inputUnits.length ? inputUnits : units,
                      )}
                    </View>
                  );
                })
              )}
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
      const parts = selectedIdsReview
        .map((mid) => {
          const meta = (form.materialNorms && form.materialNorms[mid]) || {};
          if (!meta.rate) return null;
          const mat =
            selectedMaterials.find((m) => Number(m.id) === Number(mid)) || { id: mid };
          const basis =
            meta.basis === 'work_hours'
              ? t('org.operations.basisWorkHoursShort', null, 'h')
              : unitLabel(findUnit(form.unitId)) || 'out';
          return `${materialLabel(mat)}: ${meta.rate}/${meta.perQty || '1'} ${basis}`;
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
            {t('org.operations.wizard.workerReportsLabel', null, 'Worker reports (output)')}:{' '}
          </Text>
          {unitLabel(findUnit(form.unitId)) || t('org.operations.unitNone', null, 'None')}
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
  materialNormBlock: {
    marginTop: 8,
    marginBottom: 12,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#CBD5E1',
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
