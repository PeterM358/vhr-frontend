import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
import {
  readOrganizationMemberships,
  resolveActiveOrganizationId,
} from '../utils/orgWorkspace';
import { navigateToOrgHome } from '../navigation/webNavigation';
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

const MODES = [
  { id: 'list', labelKey: 'org.operations.allOperations' },
  { id: 'add', labelKey: 'org.operations.addOperation' },
];

function unitLabel(unit) {
  if (!unit) return '';
  return unit.symbol || unit.name || unit.code || '';
}

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
    normRate:
      generic.rate != null
        ? String(generic.rate)
        : row.norm_rate != null && row.activity_kind !== 'transport'
          ? String(row.norm_rate)
          : '',
    normBasisQty:
      generic.basis_qty != null
        ? String(generic.basis_qty)
        : row.norm_basis_qty != null
          ? String(row.norm_basis_qty)
          : '1',
    normInputUnitId:
      generic.input_unit_id ||
      (row.activity_kind !== 'transport'
        ? row.norm_input_unit_id || row.norm_input_unit?.id || null
        : null),
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
    const hours = form.laborPresetHours.trim() || form.plannedHours.trim();
    if (hours) {
      norms.labor = { preset_hours: hours };
    }
  } else if (form.normRate.trim() || form.normInputUnitId) {
    norms.generic = {
      rate: form.normRate.trim() || null,
      basis_qty: form.normBasisQty.trim() || null,
      input_unit_id: form.normInputUnitId || null,
      input_key: '',
    };
  }

  if (form.kind !== 'labor_only') {
    norms.materials = {
      consumes_materials: Boolean(form.consumesMaterials),
      default_material_unit_id: form.consumesMaterials
        ? form.materialUnitId || form.normInputUnitId || null
        : null,
    };
  }

  if (form.kind === 'labor_only' && (form.laborPresetHours.trim() || form.plannedHours.trim())) {
    // already set
  } else if (form.plannedHours.trim() && !norms.labor) {
    norms.labor = { preset_hours: form.plannedHours.trim() };
  }

  return norms;
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
      },
      perTon
        ? `${norms.transport.base_rate} + ${perTon} / t`
        : `${norms.transport.base_rate} base`,
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
          'Name the operation and choose its kind.',
        ),
      },
      {
        key: 'output',
        title: t('org.operations.wizard.stepOutput', null, 'Output & time'),
        hint: t(
          'org.operations.wizard.stepOutputHint',
          null,
          'Primary unit and planned hours (norm time for training later).',
        ),
      },
      {
        key: 'norms',
        title: t('org.operations.wizard.stepNorms', null, 'Norms'),
        hint: t(
          'org.operations.wizard.stepNormsHint',
          null,
          'Optional rates — fuel burn, paint per m², or labor hours.',
        ),
      },
      {
        key: 'materials',
        title: t('org.operations.wizard.stepMaterials', null, 'Materials'),
        hint: t(
          'org.operations.wizard.stepMaterialsHint',
          null,
          'Does this operation consume warehouse materials? Lines are added on the task later.',
        ),
      },
      {
        key: 'review',
        title: t('org.operations.wizard.stepReview', null, 'Review'),
        hint: t(
          'org.operations.wizard.stepReviewHint',
          null,
          'Check everything, then save.',
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

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyFormState());
    setFormMessage('');
    setWizardStep(0);
  };

  const startCreate = () => {
    resetForm();
    setMode('add');
  };

  const startEdit = (row) => {
    setEditingId(row.id);
    setForm(hydrateFromRow(row));
    setFormMessage('');
    setWizardStep(0);
    setMode('add');
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
      const payload = {
        name: trimmedName,
        code: form.code.trim(),
        activity_kind: form.kind,
        unit_id: form.unitId || null,
        notes: form.notes.trim(),
        planned_hours: form.plannedHours.trim() || form.laborPresetHours.trim() || null,
        consumes_materials: form.kind === 'labor_only' ? false : Boolean(form.consumesMaterials),
        norms,
        is_active: form.isActive,
      };
      if (form.kind === 'transport') {
        payload.norm_rate = form.transportBaseRate.trim() || null;
        payload.norm_basis_qty = form.transportBaseRate.trim() ? '1' : null;
        payload.norm_input_unit_id = form.transportRateUnitId || null;
      } else if (form.kind !== 'labor_only') {
        payload.norm_rate = form.normRate.trim() || null;
        payload.norm_basis_qty = form.normBasisQty.trim() || null;
        payload.norm_input_unit_id = form.normInputUnitId || null;
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
      resetForm();
      setMode('list');
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

  const renderUnitChips = (selectedId, onSelect) => (
    <View style={styles.kindWrap}>
      <Pressable
        onPress={() => onSelect(null)}
        style={[styles.kindChip, selectedId == null && styles.kindChipActive]}
      >
        <Text style={[styles.kindChipText, selectedId == null && styles.kindChipTextActive]}>
          {t('org.operations.unitNone', null, 'None')}
        </Text>
      </Pressable>
      {units.map((unit) => {
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
    if (form.kind === 'transport') {
      return (
        <>
          <Text style={styles.helper}>
            {t(
              'org.operations.transportNormsHelper',
              null,
              'Fuel burn: base rate plus extra per ton in the trailer (e.g. DAF 25 L + 0.4 L/t). Driver later fills km and load.',
            )}
          </Text>
          <TextInput
            label={t('org.operations.transportBaseRate', null, 'Base fuel rate')}
            value={form.transportBaseRate}
            onChangeText={(value) => setField('transportBaseRate', value)}
            mode="outlined"
            keyboardType="decimal-pad"
            style={styles.input}
            textColor={ON_CARD}
          />
          <TextInput
            label={t('org.operations.transportPerTonRate', null, 'Per ton rate')}
            value={form.transportPerTonRate}
            onChangeText={(value) => setField('transportPerTonRate', value)}
            mode="outlined"
            keyboardType="decimal-pad"
            style={styles.input}
            textColor={ON_CARD}
          />
          <Text style={styles.fieldLabel}>
            {t('org.operations.transportRateUnit', null, 'Fuel unit')}
          </Text>
          {renderUnitChips(form.transportRateUnitId, (id) => setField('transportRateUnitId', id))}
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
              setField('laborPresetHours', value);
              setField('plannedHours', value);
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
        <Text style={styles.helper}>
          {t(
            'org.operations.normsHelper',
            null,
            'How much input is consumed per basis quantity of the primary unit (e.g. 0.8 L paint per 1 m²).',
          )}
        </Text>
        <TextInput
          label={t('org.operations.normRate', null, 'Rate')}
          value={form.normRate}
          onChangeText={(value) => setField('normRate', value)}
          mode="outlined"
          keyboardType="decimal-pad"
          style={styles.input}
          textColor={ON_CARD}
        />
        <TextInput
          label={t('org.operations.normBasisQty', null, 'Per (basis qty)')}
          value={form.normBasisQty}
          onChangeText={(value) => setField('normBasisQty', value)}
          mode="outlined"
          keyboardType="decimal-pad"
          style={styles.input}
          textColor={ON_CARD}
        />
        <Text style={styles.fieldLabel}>
          {t('org.operations.normInputUnit', null, 'Consumed input unit')}
        </Text>
        {renderUnitChips(form.normInputUnitId, (id) => setField('normInputUnitId', id))}
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
          <Text style={styles.fieldLabel}>{t('org.operations.unit', null, 'Unit of measure')}</Text>
          <Text style={styles.helper}>
            {t(
              'org.operations.wizard.outputUnitHelper',
              null,
              'What the worker reports as output (km, m², hours, loads…).',
            )}
          </Text>
          {renderUnitChips(form.unitId, (id) => setField('unitId', id))}
          {form.kind !== 'labor_only' ? (
            <>
              <TextInput
                label={t('org.operations.plannedHours', null, 'Planned / norm hours')}
                value={form.plannedHours}
                onChangeText={(value) => setField('plannedHours', value)}
                mode="outlined"
                keyboardType="decimal-pad"
                style={styles.input}
                textColor={ON_CARD}
              />
              <Text style={styles.helper}>
                {t(
                  'org.operations.wizard.plannedHoursHelper',
                  null,
                  'Used later to see who is on norm and who needs training.',
                )}
              </Text>
            </>
          ) : null}
        </>
      );
    }
    if (stepKey === 'norms') {
      return (
        <>
          <Text style={styles.fieldLabel}>{t('org.operations.normsTitle', null, 'Norms (optional)')}</Text>
          {renderNormsByKind()}
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
      return (
        <>
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
              'org.operations.wizard.materialsLinesLater',
              null,
              'Material lines are issued on the task from a warehouse location — not on this form.',
            )}
          </Text>
          {form.consumesMaterials ? (
            <>
              <Text style={styles.fieldLabel}>
                {t('org.operations.materialUnit', null, 'Default material unit')}
              </Text>
              {renderUnitChips(form.materialUnitId, (id) => setField('materialUnitId', id))}
            </>
          ) : null}
        </>
      );
    }
    // review
    const hours =
      form.plannedHours.trim() ||
      form.laborPresetHours.trim() ||
      t('org.operations.wizard.none', null, 'None');
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
          <Text style={styles.reviewKey}>{t('org.operations.unit', null, 'Unit of measure')}: </Text>
          {unitLabel(findUnit(form.unitId)) || t('org.operations.unitNone', null, 'None')}
        </Text>
        <Text style={styles.reviewLine}>
          <Text style={styles.reviewKey}>
            {t('org.operations.plannedHours', null, 'Planned / norm hours')}:{' '}
          </Text>
          {hours}
        </Text>
        <Text style={styles.reviewLine}>
          <Text style={styles.reviewKey}>
            {t('org.operations.consumesMaterials', null, 'Consumes materials')}:{' '}
          </Text>
          {form.kind === 'labor_only' || !form.consumesMaterials
            ? t('org.operations.wizard.no', null, 'No')
            : t('org.operations.wizard.yes', null, 'Yes')}
        </Text>
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
        ) : mode === 'list' ? (
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
        ) : (
          <AppCard style={styles.card} contentStyle={CARD_SURFACE}>
            <Text style={styles.sectionTitle}>
              {editingId
                ? t('org.operations.editOperation', null, 'Edit operation')
                : t('org.operations.addOperation', null, 'Add operation')}
            </Text>
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
                <Button
                  mode="text"
                  onPress={() => {
                    resetForm();
                    setMode('list');
                  }}
                  textColor={ON_CARD}
                  style={styles.navBtn}
                >
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
          </AppCard>
        )}
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 14,
    paddingTop: 12,
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
});
