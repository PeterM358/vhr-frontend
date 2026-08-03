import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, Button, Switch, TextInput } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';

import ScreenBackground from '../components/ScreenBackground';
import AppCard from '../components/ui/AppCard';
import OrgAppHeader from '../components/org/OrgAppHeader';
import {
  createWarehouseLocation,
  deactivateWarehouseLocation,
  getWarehouseSettings,
  listWarehouseLocations,
  openWarehouseLocationLabel,
  updateWarehouseLocation,
  updateWarehouseSettings,
} from '../api/orgWarehouse';
import OrgMaterialsIntakePanel from '../components/org/OrgMaterialsIntakePanel';
import {
  readOrganizationMemberships,
  refreshOrganizationMemberships,
  resolveActiveOrganizationId,
} from '../utils/orgWorkspace';
import { navigateToOrgHome } from '../navigation/webNavigation';
import { useTranslation } from '../i18n';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { COLORS } from '../constants/colors';
import { useScrollContentBottomPadding } from '../utils/mobileWebInsets';

const ON_CARD = '#0F172A';
const ON_CARD_MUTED = '#475569';
const CARD_SURFACE = { color: ON_CARD };

const PRIMARY_MODES = [
  { id: 'documents', labelKey: 'org.warehouse.tabDocuments', fallback: 'Documents' },
  { id: 'materials', labelKey: 'org.warehouse.tabMaterials', fallback: 'Materials' },
];

const SECONDARY_MODES = [
  { id: 'list', labelKey: 'org.warehouse.tabLocations', fallback: 'Locations' },
  { id: 'add', labelKey: 'org.warehouse.addLocation', fallback: 'Add location' },
];

const INTAKE_POSTING_MODES = [
  {
    id: 'both',
    labelKey: 'org.warehouse.settings.modeBoth',
    fallback: 'Warehouse or accounting',
  },
  {
    id: 'warehouse',
    labelKey: 'org.warehouse.settings.modeWarehouse',
    fallback: 'Warehouse only',
  },
  {
    id: 'accounting',
    labelKey: 'org.warehouse.settings.modeAccounting',
    fallback: 'Accounting only',
  },
];

function emptyForm() {
  return {
    name: '',
    code: '',
    address: '',
    description: '',
    qrCode: '',
    isActive: true,
  };
}

function hydrate(row) {
  return {
    name: row.name || '',
    code: row.code || '',
    address: row.address || '',
    description: row.description || '',
    qrCode: row.qr_code || '',
    isActive: row.is_active !== false,
  };
}

export default function OrgWarehouseScreen({ navigation, route }) {
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

  const routeInitialTab =
    route?.params?.initialTab || route?.params?.tab || route?.params?.section || null;

  const [orgId, setOrgId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [canManage, setCanManage] = useState(false);
  const [canPostIntake, setCanPostIntake] = useState(false);
  const [canManageSettings, setCanManageSettings] = useState(false);
  const [intakePostingMode, setIntakePostingMode] = useState('both');
  const [rows, setRows] = useState([]);
  const [mode, setMode] = useState(() => {
    if (routeInitialTab === 'materials' || routeInitialTab === 'list' || routeInitialTab === 'add') {
      return routeInitialTab;
    }
    return 'documents';
  });
  const [documentsListKey, setDocumentsListKey] = useState(0);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [formMessage, setFormMessage] = useState('');
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState('');

  const setField = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  useEffect(() => {
    const tab = route?.params?.initialTab || route?.params?.tab || route?.params?.section;
    if (tab === 'documents' || tab === 'materials' || tab === 'list' || tab === 'add') {
      setMode(tab);
      if (tab === 'documents') {
        setDocumentsListKey((k) => k + 1);
      }
    }
  }, [route?.params?.initialTab, route?.params?.tab, route?.params?.section]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const resolved = await resolveActiveOrganizationId(routeOrgId);
      setOrgId(resolved);
      if (!resolved) {
        setRows([]);
        setCanManage(false);
        setCanPostIntake(false);
        setCanManageSettings(false);
        setError(t('org.warehouse.loadError', null, 'Could not load warehouse.'));
        return;
      }
      const [data, settings] = await Promise.all([
        listWarehouseLocations(token, resolved),
        getWarehouseSettings(token, resolved).catch(() => null),
      ]);
      setCanManage(Boolean(data?.can_manage ?? settings?.can_manage_warehouse));
      setCanPostIntake(
        Boolean(data?.can_post_materials_intake ?? settings?.can_post_materials_intake),
      );
      setIntakePostingMode(
        data?.intake_posting_mode || settings?.intake_posting_mode || 'both',
      );
      setCanManageSettings(Boolean(settings?.can_manage_settings));
      setRows(Array.isArray(data?.results) ? data.results : []);
    } catch (e) {
      setError(e.message || t('org.warehouse.loadError', null, 'Could not load warehouse.'));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [routeOrgId, t]);

  const saveIntakePostingMode = async (nextMode) => {
    if (!orgId || !canManageSettings || nextMode === intakePostingMode) return;
    setSettingsBusy(true);
    setSettingsMessage('');
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const data = await updateWarehouseSettings(token, orgId, {
        intake_posting_mode: nextMode,
      });
      setIntakePostingMode(data?.intake_posting_mode || nextMode);
      setCanPostIntake(Boolean(data?.can_post_materials_intake));
      setCanManage(Boolean(data?.can_manage_warehouse ?? canManage));
      setSettingsMessage(
        t('org.warehouse.settings.saved', null, 'Intake posting mode updated.'),
      );
      await refreshOrganizationMemberships(token).catch(() => null);
      await load();
    } catch (e) {
      setSettingsMessage(
        e.message || t('org.warehouse.settings.saveError', null, 'Could not save setting.'),
      );
    } finally {
      setSettingsBusy(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm());
    setFormMessage('');
  };

  const startCreate = () => {
    resetForm();
    setMode('add');
  };

  const startEdit = (row) => {
    setEditingId(row.id);
    setForm(hydrate(row));
    setFormMessage('');
    setMode('add');
  };

  const save = async () => {
    if (!orgId || !canManage) return;
    const name = form.name.trim();
    if (!name) {
      setFormMessage(t('org.warehouse.nameRequired', null, 'Name is required.'));
      return;
    }
    setBusy(true);
    setFormMessage('');
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const payload = {
        name,
        code: form.code.trim(),
        address: form.address.trim(),
        description: form.description.trim(),
        qr_code: form.qrCode.trim(),
        is_active: form.isActive,
      };
      if (editingId) {
        await updateWarehouseLocation(token, orgId, editingId, payload);
        setFormMessage(t('org.warehouse.updated', null, 'Location updated.'));
      } else {
        await createWarehouseLocation(token, orgId, payload);
        setFormMessage(t('org.warehouse.created', null, 'Location created.'));
      }
      await load();
      resetForm();
      setMode('list');
    } catch (e) {
      setFormMessage(e.message || t('org.warehouse.saveError', null, 'Could not save location.'));
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (row) => {
    if (!orgId || !canManage) return;
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      if (row.is_active) {
        await deactivateWarehouseLocation(token, orgId, row.id);
      } else {
        await updateWarehouseLocation(token, orgId, row.id, { is_active: true });
      }
      await load();
    } catch (e) {
      Alert.alert(
        t('org.warehouse.title', null, 'Warehouse'),
        e.message || t('org.warehouse.saveError', null, 'Could not save location.'),
      );
    }
  };

  const activeCount = useMemo(() => rows.filter((row) => row.is_active).length, [rows]);

  return (
    <ScreenBackground safeArea={false}>
      <OrgAppHeader
        mode="detail"
        title={t('org.warehouse.title', null, 'Warehouse')}
        onBack={onBack}
      />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: scrollBottomPadding }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.lead}>
          {t(
            'org.warehouse.lead',
            null,
            'Documents: import invoices. Materials: on-stock quantities. Locations: bins for issue.',
          )}
        </Text>

        <View style={styles.modeRow}>
          {PRIMARY_MODES.map((item) => {
            const active = mode === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => {
                  if (item.id === 'documents') {
                    setDocumentsListKey((k) => k + 1);
                  }
                  setMode(item.id);
                }}
                style={[styles.modeChip, styles.modeChipPrimary, active && styles.modeChipActive]}
              >
                <Text style={[styles.modeChipText, styles.modeChipTextPrimary, active && styles.modeChipTextActive]}>
                  {t(item.labelKey, null, item.fallback)}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.modeRowSecondary}>
          {SECONDARY_MODES.map((item) => {
            const active = mode === item.id;
            const disabled = item.id === 'add' && !canManage;
            return (
              <Pressable
                key={item.id}
                disabled={disabled}
                onPress={() => (item.id === 'add' ? startCreate() : setMode(item.id))}
                style={[
                  styles.modeChip,
                  styles.modeChipSecondary,
                  active && styles.modeChipActive,
                  disabled && styles.modeChipDisabled,
                ]}
              >
                <Text
                  style={[
                    styles.modeChipText,
                    styles.modeChipTextSecondary,
                    active && styles.modeChipTextActive,
                  ]}
                >
                  {t(item.labelKey, null, item.fallback)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {mode === 'documents' || mode === 'materials' ? (
          orgId ? (
            <OrgMaterialsIntakePanel
              organizationId={orgId}
              canManage={canManage}
              canPostIntake={canPostIntake}
              section={mode}
              locations={rows.filter((r) => r.is_active !== false)}
              navigation={navigation}
              documentsListKey={documentsListKey}
            />
          ) : loading ? (
            <ActivityIndicator color="#fff" style={styles.loader} />
          ) : (
            <AppCard style={styles.card} contentStyle={CARD_SURFACE}>
              <Text style={styles.error}>
                {error || t('org.warehouse.loadError', null, 'Could not load warehouse.')}
              </Text>
            </AppCard>
          )
        ) : loading ? (
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
              {t('org.warehouse.locationsTitle', null, 'Locations')}
            </Text>
            <Text style={styles.meta}>
              {t(
                'org.warehouse.count',
                { active: activeCount, total: rows.length },
                `${activeCount} active of ${rows.length}`,
              )}
            </Text>
            <Text style={styles.nextNote}>
              {t(
                'org.warehouse.nextSliceNote',
                null,
                'Next: warehouse users issue materials from a location; receivers confirm; workers fill only km / hours / m².',
              )}
            </Text>
            {rows.length === 0 ? (
              <Text style={styles.empty}>
                {t(
                  'org.warehouse.empty',
                  null,
                  'No locations yet. Add paint rooms, fuel tanks, or yard bins.',
                )}
              </Text>
            ) : (
              rows.map((row) => (
                <View key={row.id} style={styles.row}>
                  <View style={styles.rowBody}>
                    <Text style={styles.rowTitle}>{row.name}</Text>
                    <Text style={styles.rowMeta}>
                      {row.code}
                      {row.address ? ` · ${row.address}` : ''}
                      {row.qr_code ? ` · QR ${row.qr_code}` : ''}
                      {row.is_active
                        ? ''
                        : ` · ${t('org.warehouse.inactive', null, 'Inactive')}`}
                    </Text>
                    {row.description ? (
                      <Text style={styles.rowNotes} numberOfLines={2}>
                        {row.description}
                      </Text>
                    ) : null}
                  </View>
                  {canManage ? (
                    <View style={styles.rowActions}>
                      <Pressable onPress={() => startEdit(row)} style={styles.rowAction}>
                        <Text style={styles.rowActionText}>{t('common.edit', null, 'Edit')}</Text>
                      </Pressable>
                      <Pressable
                        onPress={async () => {
                          try {
                            const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
                            await openWarehouseLocationLabel(token, orgId, row.id);
                          } catch (e) {
                            setError(
                              e.message
                                || t('org.warehouse.labelError', null, 'Could not open label.'),
                            );
                          }
                        }}
                        style={styles.rowAction}
                      >
                        <Text style={styles.rowActionText}>
                          {t('org.warehouse.printLabel', null, 'Print stamp')}
                        </Text>
                      </Pressable>
                      <Pressable onPress={() => toggleActive(row)} style={styles.rowAction}>
                        <Text style={styles.rowActionText}>
                          {row.is_active
                            ? t('org.warehouse.deactivate', null, 'Deactivate')
                            : t('org.warehouse.activate', null, 'Activate')}
                        </Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              ))
            )}
            {canManage ? (
              <Button mode="contained" onPress={startCreate} style={styles.primaryBtn}>
                {t('org.warehouse.addLocation', null, 'Add location')}
              </Button>
            ) : null}
            {canManageSettings ? (
              <View style={styles.settingsBox}>
                <Text style={styles.sectionTitle}>
                  {t('org.warehouse.settings.title', null, 'Who can add invoices')}
                </Text>
                <Text style={styles.meta}>
                  {t(
                    'org.warehouse.settings.lead',
                    null,
                    'Controls who may upload and confirm supplier invoices into stock. Outbound issue on tasks stays warehouse/ops.',
                  )}
                </Text>
                <View style={styles.settingsModes}>
                  {INTAKE_POSTING_MODES.map((item) => {
                    const active = intakePostingMode === item.id;
                    return (
                      <Pressable
                        key={item.id}
                        disabled={settingsBusy}
                        onPress={() => saveIntakePostingMode(item.id)}
                        style={[styles.settingsChip, active && styles.settingsChipActive]}
                      >
                        <Text
                          style={[
                            styles.settingsChipText,
                            active && styles.settingsChipTextActive,
                          ]}
                        >
                          {t(item.labelKey, null, item.fallback)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {settingsMessage ? (
                  <Text style={styles.formMessage}>{settingsMessage}</Text>
                ) : null}
              </View>
            ) : null}
          </AppCard>
        ) : (
          <AppCard style={styles.card} contentStyle={CARD_SURFACE}>
            <Text style={styles.sectionTitle}>
              {editingId
                ? t('org.warehouse.editLocation', null, 'Edit location')
                : t('org.warehouse.addLocation', null, 'Add location')}
            </Text>
            <TextInput
              label={t('org.warehouse.name', null, 'Name')}
              value={form.name}
              onChangeText={(value) => setField('name', value)}
              mode="outlined"
              style={styles.input}
              textColor={ON_CARD}
            />
            <TextInput
              label={t('org.warehouse.code', null, 'Code (optional)')}
              value={form.code}
              onChangeText={(value) => setField('code', value)}
              mode="outlined"
              autoCapitalize="characters"
              style={styles.input}
              textColor={ON_CARD}
            />
            <TextInput
              label={t('org.warehouse.address', null, 'Address / zone')}
              value={form.address}
              onChangeText={(value) => setField('address', value)}
              mode="outlined"
              style={styles.input}
              textColor={ON_CARD}
            />
            <TextInput
              label={t('org.warehouse.description', null, 'Description')}
              value={form.description}
              onChangeText={(value) => setField('description', value)}
              mode="outlined"
              multiline
              style={styles.input}
              textColor={ON_CARD}
            />
            <TextInput
              label={t('org.warehouse.qrCode', null, 'QR / scan code (optional)')}
              value={form.qrCode}
              onChangeText={(value) => setField('qrCode', value)}
              mode="outlined"
              style={styles.input}
              textColor={ON_CARD}
            />
            <Text style={styles.helper}>
              {t(
                'org.warehouse.qrHelper',
                null,
                'Used on the printable door stamp. Leave blank to use ORGLOC:{id}.',
              )}
            </Text>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>{t('org.warehouse.active', null, 'Active')}</Text>
              <Switch
                value={form.isActive}
                onValueChange={(value) => setField('isActive', value)}
              />
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
              textColor={ON_CARD}
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
    marginBottom: 8,
  },
  modeRowSecondary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  modeChip: {
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  modeChipPrimary: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 110,
    alignItems: 'center',
  },
  modeChipSecondary: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  modeChipActive: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  modeChipDisabled: {
    opacity: 0.45,
  },
  modeChipText: {
    color: 'rgba(255,255,255,0.92)',
    fontWeight: '600',
  },
  modeChipTextPrimary: {
    fontSize: 15,
  },
  modeChipTextSecondary: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.78)',
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
    marginBottom: 8,
  },
  nextNote: {
    color: ON_CARD_MUTED,
    fontSize: 13,
    lineHeight: 18,
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
  settingsBox: {
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(15,23,42,0.12)',
  },
  settingsModes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  settingsChip: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(15,23,42,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.12)',
  },
  settingsChipActive: {
    backgroundColor: 'rgba(14,165,233,0.14)',
    borderColor: COLORS.PRIMARY,
  },
  settingsChipText: {
    color: ON_CARD_MUTED,
    fontSize: 13,
    fontWeight: '600',
  },
  settingsChipTextActive: {
    color: ON_CARD,
  },
});
