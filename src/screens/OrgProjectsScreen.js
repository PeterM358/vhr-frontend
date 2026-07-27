import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, Button, Text, TextInput } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';

import ScreenBackground from '../components/ScreenBackground';
import AppCard from '../components/ui/AppCard';
import OrgAppHeader from '../components/org/OrgAppHeader';
import { createProject, listProjects, updateProject } from '../api/orgOperations';
import { resolveActiveOrganizationId } from '../utils/orgWorkspace';
import { navigateToOrgHome } from '../navigation/webNavigation';
import { useTranslation } from '../i18n';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { useScrollContentBottomPadding } from '../utils/mobileWebInsets';

const ON_CARD = '#0F172A';
const ON_CARD_MUTED = '#475569';

const KIND_OPTIONS = [
  { value: 'transport', labelKey: 'org.projects.kinds.transport', fallback: 'Transport' },
  { value: 'construction', labelKey: 'org.projects.kinds.construction', fallback: 'Construction' },
  { value: 'field_service', labelKey: 'org.projects.kinds.field_service', fallback: 'Field service' },
  { value: 'road_marking', labelKey: 'org.projects.kinds.road_marking', fallback: 'Road marking' },
  { value: 'other', labelKey: 'org.projects.kinds.other', fallback: 'Other' },
];

const VOLUME_OPTIONS = [
  { value: 'loads', labelKey: 'org.projects.volumeModes.loads', fallback: 'Loads count' },
  { value: 'area', labelKey: 'org.projects.volumeModes.area', fallback: 'Square meters' },
  { value: 'both', labelKey: 'org.projects.volumeModes.both', fallback: 'Both' },
];

function emptyForm() {
  return {
    name: '',
    kind: 'transport',
    description: '',
    volumeMode: 'loads',
    loadsCount: '',
    areaM2: '',
    expectedRevenue: '',
    companies: '',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    photoRef: '',
  };
}

function formFromProject(row) {
  const contact = Array.isArray(row?.contacts) && row.contacts[0] ? row.contacts[0] : {};
  return {
    name: row?.name || '',
    kind: row?.kind || 'other',
    description: row?.description || row?.notes || '',
    volumeMode: row?.volume_mode || '',
    loadsCount: row?.loads_count != null ? String(row.loads_count) : '',
    areaM2: row?.area_m2 != null ? String(row.area_m2) : '',
    expectedRevenue: row?.expected_revenue != null ? String(row.expected_revenue) : '',
    companies: Array.isArray(row?.companies) ? row.companies.join(', ') : '',
    contactName: contact.name || '',
    contactPhone: contact.phone || '',
    contactEmail: contact.email || '',
    photoRef: Array.isArray(row?.photo_refs) && row.photo_refs[0] ? String(row.photo_refs[0]) : '',
  };
}

function volumeSummary(row, t) {
  const parts = [];
  if (row.loads_count != null && row.loads_count !== '') {
    parts.push(
      t('org.projects.loadsValue', { count: row.loads_count }, `${row.loads_count} loads`),
    );
  }
  if (row.area_m2 != null && row.area_m2 !== '') {
    parts.push(t('org.projects.areaValue', { area: row.area_m2 }, `${row.area_m2} m²`));
  }
  return parts.join(' · ');
}

export default function OrgProjectsScreen({ navigation, route }) {
  const { t } = useTranslation();
  const routeOrgId = route?.params?.organizationId || route?.params?.orgId;
  const scrollBottomPadding = useScrollContentBottomPadding(40);

  const [orgId, setOrgId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [canManage, setCanManage] = useState(false);
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState('list'); // list | create | edit
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [formMessage, setFormMessage] = useState('');

  const onBack = useCallback(() => {
    if (mode !== 'list') {
      setMode('list');
      setEditingId(null);
      setForm(emptyForm());
      setFormMessage('');
      return;
    }
    navigateToOrgHome(navigation, { orgId: routeOrgId || orgId });
  }, [mode, navigation, orgId, routeOrgId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const resolved = await resolveActiveOrganizationId(routeOrgId);
      setOrgId(resolved);
      if (!resolved) {
        setError(t('org.projects.loadError', null, 'Could not load projects.'));
        setRows([]);
        return;
      }
      const data = await listProjects(token, resolved, { active: 1 });
      setCanManage(Boolean(data?.can_manage));
      setRows(Array.isArray(data?.results) ? data.results : []);
    } catch (e) {
      setError(e.message || t('org.projects.loadError', null, 'Could not load projects.'));
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

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => {
      const hay = [
        row.name,
        row.description,
        row.notes,
        ...(Array.isArray(row.companies) ? row.companies : []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, query]);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setFormMessage('');
    setMode('create');
  };

  const openEdit = (row) => {
    setEditingId(row.id);
    setForm(formFromProject(row));
    setFormMessage('');
    setMode('edit');
  };

  const buildPayload = () => {
    const contacts = [];
    if (form.contactName.trim() || form.contactPhone.trim() || form.contactEmail.trim()) {
      contacts.push({
        name: form.contactName.trim(),
        phone: form.contactPhone.trim(),
        email: form.contactEmail.trim(),
      });
    }
    return {
      name: form.name.trim(),
      kind: form.kind,
      description: form.description.trim(),
      volume_mode: form.volumeMode || null,
      loads_count: form.loadsCount.trim() || null,
      area_m2: form.areaM2.trim() || null,
      expected_revenue: form.expectedRevenue.trim() || null,
      companies: form.companies.trim(),
      contacts,
      photo_refs: form.photoRef.trim() ? [form.photoRef.trim()] : [],
    };
  };

  const save = async () => {
    if (!orgId) return;
    if (!form.name.trim()) {
      setFormMessage(t('org.projects.nameRequired', null, 'Name is required.'));
      return;
    }
    setBusy(true);
    setFormMessage('');
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const payload = buildPayload();
      if (mode === 'edit' && editingId) {
        await updateProject(token, orgId, editingId, payload);
      } else {
        await createProject(token, orgId, payload);
      }
      setMode('list');
      setEditingId(null);
      setForm(emptyForm());
      await load();
    } catch (e) {
      setFormMessage(e.message || t('org.projects.saveError', null, 'Could not save project.'));
    } finally {
      setBusy(false);
    }
  };

  const showLoads = form.volumeMode === 'loads' || form.volumeMode === 'both' || !form.volumeMode;
  const showArea = form.volumeMode === 'area' || form.volumeMode === 'both' || !form.volumeMode;

  const renderForm = () => (
    <AppCard style={styles.card}>
      <TextInput
        label={t('org.projects.name', null, 'Name')}
        value={form.name}
        onChangeText={(v) => setField('name', v)}
        mode="outlined"
        style={styles.input}
        textColor={ON_CARD}
      />
      <Text style={styles.fieldLabel}>{t('org.projects.kind', null, 'Kind')}</Text>
      <View style={styles.chipWrap}>
        {KIND_OPTIONS.map((opt) => {
          const active = form.kind === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => setField('kind', opt.value)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {t(opt.labelKey, null, opt.fallback)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <TextInput
        label={t('org.projects.description', null, 'Description')}
        value={form.description}
        onChangeText={(v) => setField('description', v)}
        mode="outlined"
        multiline
        style={styles.input}
        textColor={ON_CARD}
      />
      <Text style={styles.fieldLabel}>
        {t('org.projects.volumeMode', null, 'Volume type')}
      </Text>
      <View style={styles.chipWrap}>
        {VOLUME_OPTIONS.map((opt) => {
          const active = form.volumeMode === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => setField('volumeMode', opt.value)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {t(opt.labelKey, null, opt.fallback)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {showLoads ? (
        <TextInput
          label={t('org.projects.loadsCount', null, 'Loads count (брой товари)')}
          value={form.loadsCount}
          onChangeText={(v) => setField('loadsCount', v)}
          mode="outlined"
          keyboardType="decimal-pad"
          style={styles.input}
          textColor={ON_CARD}
        />
      ) : null}
      {showArea ? (
        <TextInput
          label={t('org.projects.areaM2', null, 'Square meters (квадратура)')}
          value={form.areaM2}
          onChangeText={(v) => setField('areaM2', v)}
          mode="outlined"
          keyboardType="decimal-pad"
          style={styles.input}
          textColor={ON_CARD}
        />
      ) : null}
      <TextInput
        label={t('org.projects.expectedRevenue', null, 'Expected value (стойност)')}
        value={form.expectedRevenue}
        onChangeText={(v) => setField('expectedRevenue', v)}
        mode="outlined"
        keyboardType="decimal-pad"
        style={styles.input}
        textColor={ON_CARD}
      />
      <TextInput
        label={t('org.projects.companies', null, 'Companies / counterparties')}
        value={form.companies}
        onChangeText={(v) => setField('companies', v)}
        mode="outlined"
        placeholder={t('org.projects.companiesHint', null, 'Comma-separated firm names')}
        style={styles.input}
        textColor={ON_CARD}
      />
      <Text style={styles.fieldLabel}>{t('org.projects.contact', null, 'Contact')}</Text>
      <TextInput
        label={t('org.projects.contactName', null, 'Contact name')}
        value={form.contactName}
        onChangeText={(v) => setField('contactName', v)}
        mode="outlined"
        style={styles.input}
        textColor={ON_CARD}
      />
      <TextInput
        label={t('org.projects.contactPhone', null, 'Phone')}
        value={form.contactPhone}
        onChangeText={(v) => setField('contactPhone', v)}
        mode="outlined"
        style={styles.input}
        textColor={ON_CARD}
      />
      <TextInput
        label={t('org.projects.contactEmail', null, 'Email')}
        value={form.contactEmail}
        onChangeText={(v) => setField('contactEmail', v)}
        mode="outlined"
        autoCapitalize="none"
        style={styles.input}
        textColor={ON_CARD}
      />
      <TextInput
        label={t('org.projects.photoUpload', null, 'Photo URL or label')}
        value={form.photoRef}
        onChangeText={(v) => setField('photoRef', v)}
        mode="outlined"
        style={styles.input}
        textColor={ON_CARD}
      />
      {formMessage ? <Text style={styles.error}>{formMessage}</Text> : null}
      <Button mode="contained" loading={busy} disabled={busy} onPress={save}>
        {mode === 'edit'
          ? t('org.projects.update', null, 'Update project')
          : t('org.projects.save', null, 'Create project')}
      </Button>
    </AppCard>
  );

  return (
    <ScreenBackground safeArea={false}>
      <OrgAppHeader
        mode="detail"
        title={
          mode === 'create'
            ? t('org.projects.createTitle', null, 'New project')
            : mode === 'edit'
              ? t('org.projects.editTitle', null, 'Edit project')
              : t('org.projects.title', null, 'Projects')
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
        ) : mode !== 'list' ? (
          renderForm()
        ) : (
          <>
            <Text style={styles.lead}>
              {t(
                'org.projects.lead',
                null,
                'Track volume, value, contacts, and counterparties. Link projects when creating tasks.',
              )}
            </Text>
            {canManage ? (
              <Button mode="contained" onPress={openCreate} style={styles.createBtn}>
                {t('org.projects.create', null, 'New project')}
              </Button>
            ) : null}
            <AppCard style={styles.card}>
              <TextInput
                label={t('org.projects.search', null, 'Search projects')}
                value={query}
                onChangeText={setQuery}
                mode="outlined"
                style={styles.input}
                textColor={ON_CARD}
              />
              {filteredRows.length === 0 ? (
                <Text style={styles.empty}>
                  {t('org.projects.empty', null, 'No projects yet.')}
                </Text>
              ) : (
                filteredRows.map((row) => (
                  <Pressable
                    key={row.id}
                    onPress={() => (canManage ? openEdit(row) : null)}
                    style={styles.row}
                  >
                    <Text style={styles.rowTitle}>{row.name}</Text>
                    <Text style={styles.rowMeta}>
                      {[
                        row.kind
                          ? t(`org.projects.kinds.${row.kind}`, null, row.kind)
                          : null,
                        volumeSummary(row, t),
                        row.expected_revenue
                          ? t(
                              'org.projects.revenueValue',
                              { value: row.expected_revenue },
                              `Value ${row.expected_revenue}`,
                            )
                          : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                    {Array.isArray(row.companies) && row.companies.length ? (
                      <Text style={styles.rowNotes} numberOfLines={1}>
                        {row.companies.join(', ')}
                      </Text>
                    ) : null}
                    {row.description ? (
                      <Text style={styles.rowNotes} numberOfLines={2}>
                        {row.description}
                      </Text>
                    ) : null}
                    {canManage ? (
                      <Text style={styles.editHint}>
                        {t('org.projects.tapToEdit', null, 'Tap to edit')}
                      </Text>
                    ) : null}
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
  loader: { marginVertical: 24 },
  card: { padding: 14, marginBottom: 12 },
  createBtn: { marginBottom: 12 },
  input: { marginBottom: 10, backgroundColor: '#fff' },
  fieldLabel: {
    color: ON_CARD_MUTED,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  chip: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: '#eef2f7',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.12)',
  },
  chipActive: {
    backgroundColor: 'rgba(37,99,235,0.12)',
    borderColor: '#2563eb',
  },
  chipText: { color: ON_CARD, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: ON_CARD },
  row: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(15,23,42,0.12)',
    paddingVertical: 12,
  },
  rowTitle: { color: ON_CARD, fontSize: 16, fontWeight: '700', marginBottom: 4 },
  rowMeta: { color: ON_CARD_MUTED, fontSize: 13, marginBottom: 4 },
  rowNotes: { color: ON_CARD, fontSize: 13, lineHeight: 18, marginTop: 2 },
  editHint: { color: '#2563eb', fontSize: 12, fontWeight: '600', marginTop: 6 },
  empty: { color: ON_CARD_MUTED, fontSize: 14 },
  error: { color: '#b91c1c', marginBottom: 10 },
});
