import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, Button, Switch, Text, TextInput } from 'react-native-paper';
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
  const [editingId, setEditingId] = useState(null);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [kind, setKind] = useState('transport');
  const [unitId, setUnitId] = useState(null);
  const [normInputUnitId, setNormInputUnitId] = useState(null);
  const [notes, setNotes] = useState('');
  const [normRate, setNormRate] = useState('');
  const [normBasisQty, setNormBasisQty] = useState('1');
  const [isActive, setIsActive] = useState(true);
  const [busy, setBusy] = useState(false);
  const [formMessage, setFormMessage] = useState('');

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

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setCode('');
    setKind('transport');
    setUnitId(null);
    setNormInputUnitId(null);
    setNotes('');
    setNormRate('');
    setNormBasisQty('1');
    setIsActive(true);
    setFormMessage('');
  };

  const startCreate = () => {
    resetForm();
    setMode('add');
  };

  const startEdit = (row) => {
    setEditingId(row.id);
    setName(row.name || '');
    setCode(row.code || '');
    setKind(row.activity_kind || 'other');
    setUnitId(row.unit_id || row.unit?.id || null);
    setNormInputUnitId(row.norm_input_unit_id || row.norm_input_unit?.id || null);
    setNotes(row.notes || '');
    setNormRate(row.norm_rate != null ? String(row.norm_rate) : '');
    setNormBasisQty(row.norm_basis_qty != null ? String(row.norm_basis_qty) : '1');
    setIsActive(row.is_active !== false);
    setFormMessage('');
    setMode('add');
  };

  const save = async () => {
    if (!orgId || !canManage) return;
    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormMessage(t('org.operations.nameRequired', null, 'Name is required.'));
      return;
    }
    setBusy(true);
    setFormMessage('');
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const payload = {
        name: trimmedName,
        activity_kind: kind,
        unit_id: unitId || null,
        notes: notes.trim(),
        norm_rate: normRate.trim() || null,
        norm_basis_qty: normBasisQty.trim() || null,
        norm_input_unit_id: normInputUnitId || null,
        is_active: isActive,
      };
      if (code.trim()) payload.code = code.trim();
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
          <AppCard style={styles.card}>
            <Text style={styles.error}>{error}</Text>
            <Button mode="contained" onPress={load} style={styles.retry}>
              {t('common.retry', null, 'Retry')}
            </Button>
          </AppCard>
        ) : mode === 'list' ? (
          <AppCard style={styles.card}>
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
                      {row.is_active
                        ? ''
                        : ` · ${t('org.operations.inactive', null, 'Inactive')}`}
                    </Text>
                    {row.notes ? (
                      <Text style={styles.rowNotes} numberOfLines={2}>
                        {row.notes}
                      </Text>
                    ) : null}
                    {row.norm_rate != null ? (
                      <Text style={styles.rowMeta}>
                        {t(
                          'org.operations.normSummary',
                          {
                            rate: row.norm_rate,
                            basis: row.norm_basis_qty || '1',
                            unit: unitLabel(row.unit) || '—',
                            input: unitLabel(row.norm_input_unit) || '—',
                          },
                          `${row.norm_rate} ${unitLabel(row.norm_input_unit) || ''} / ${row.norm_basis_qty || '1'} ${unitLabel(row.unit) || ''}`.trim(),
                        )}
                      </Text>
                    ) : null}
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
          <AppCard style={styles.card}>
            <Text style={styles.sectionTitle}>
              {editingId
                ? t('org.operations.editOperation', null, 'Edit operation')
                : t('org.operations.addOperation', null, 'Add operation')}
            </Text>
            <TextInput
              label={t('org.operations.name', null, 'Name')}
              value={name}
              onChangeText={setName}
              mode="outlined"
              style={styles.input}
              textColor={COLORS.TEXT_DARK}
            />
            <TextInput
              label={t('org.operations.code', null, 'Code (optional)')}
              value={code}
              onChangeText={setCode}
              mode="outlined"
              autoCapitalize="characters"
              style={styles.input}
              textColor={COLORS.TEXT_DARK}
            />
            <Text style={styles.fieldLabel}>{t('org.operations.kind', null, 'Kind')}</Text>
            <View style={styles.kindWrap}>
              {KIND_OPTIONS.map((option) => {
                const active = kind === option.value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setKind(option.value)}
                    style={[styles.kindChip, active && styles.kindChipActive]}
                  >
                    <Text style={[styles.kindChipText, active && styles.kindChipTextActive]}>
                      {t(option.labelKey, null, option.value)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.fieldLabel}>{t('org.operations.unit', null, 'Unit of measure')}</Text>
            {renderUnitChips(unitId, setUnitId)}
            <TextInput
              label={t('org.operations.notes', null, 'Notes')}
              value={notes}
              onChangeText={setNotes}
              mode="outlined"
              multiline
              style={styles.input}
              textColor={COLORS.TEXT_DARK}
            />
            <Text style={styles.fieldLabel}>{t('org.operations.normsTitle', null, 'Norms (optional)')}</Text>
            <Text style={styles.helper}>
              {t(
                'org.operations.normsHelper',
                null,
                'How much input is consumed per basis quantity of the primary unit (e.g. 0.8 L paint per 1 m²).',
              )}
            </Text>
            <TextInput
              label={t('org.operations.normRate', null, 'Rate')}
              value={normRate}
              onChangeText={setNormRate}
              mode="outlined"
              keyboardType="decimal-pad"
              style={styles.input}
              textColor={COLORS.TEXT_DARK}
            />
            <TextInput
              label={t('org.operations.normBasisQty', null, 'Per (basis qty)')}
              value={normBasisQty}
              onChangeText={setNormBasisQty}
              mode="outlined"
              keyboardType="decimal-pad"
              style={styles.input}
              textColor={COLORS.TEXT_DARK}
            />
            <Text style={styles.fieldLabel}>
              {t('org.operations.normInputUnit', null, 'Consumed input unit')}
            </Text>
            {renderUnitChips(normInputUnitId, setNormInputUnitId)}
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>{t('org.operations.active', null, 'Active')}</Text>
              <Switch value={isActive} onValueChange={setIsActive} />
            </View>
            {formMessage ? <Text style={styles.formMessage}>{formMessage}</Text> : null}
            <Button mode="contained" loading={busy} disabled={busy} onPress={save} style={styles.primaryBtn}>
              {t('common.save', null, 'Save')}
            </Button>
            <Button
              mode="text"
              onPress={() => {
                resetForm();
                setMode('list');
              }}
              textColor={COLORS.TEXT_DARK}
            >
              {t('common.cancel', null, 'Cancel')}
            </Button>
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
  },
  sectionTitle: {
    color: COLORS.TEXT_DARK,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  meta: {
    color: COLORS.TEXT_MUTED,
    fontSize: 12,
    marginBottom: 12,
  },
  helper: {
    color: COLORS.TEXT_MUTED,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  empty: {
    color: COLORS.TEXT_MUTED,
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
    color: COLORS.TEXT_DARK,
    fontSize: 15,
    fontWeight: '700',
  },
  rowMeta: {
    color: COLORS.TEXT_MUTED,
    fontSize: 12,
    marginTop: 4,
  },
  rowNotes: {
    color: COLORS.TEXT_MUTED,
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
    color: COLORS.TEXT_MUTED,
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
    backgroundColor: '#eef2f7',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.12)',
  },
  kindChipActive: {
    backgroundColor: COLORS.PRIMARY_SOFT || '#dbeafe',
    borderColor: COLORS.PRIMARY,
  },
  kindChipText: {
    color: COLORS.TEXT_DARK,
    fontSize: 12,
    fontWeight: '600',
  },
  kindChipTextActive: {
    color: COLORS.TEXT_DARK,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  switchLabel: {
    color: COLORS.TEXT_DARK,
    fontSize: 14,
    fontWeight: '600',
  },
  formMessage: {
    color: COLORS.TEXT_DARK,
    marginBottom: 10,
  },
  primaryBtn: {
    marginTop: 4,
    marginBottom: 4,
  },
});
