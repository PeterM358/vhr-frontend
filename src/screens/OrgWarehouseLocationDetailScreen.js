import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, Button, Switch, Text, TextInput } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';

import ScreenBackground from '../components/ScreenBackground';
import AppCard from '../components/ui/AppCard';
import OrgAppHeader from '../components/org/OrgAppHeader';
import {
  createWarehouseLocation,
  deactivateWarehouseLocation,
  getWarehouseLocation,
  openWarehouseLocationLabel,
  updateWarehouseLocation,
} from '../api/orgWarehouse';
import { resolveActiveOrganizationId } from '../utils/orgWorkspace';
import { navigateToOrgWarehouse } from '../navigation/webNavigation';
import { useTranslation } from '../i18n';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { COLORS } from '../constants/colors';
import { useScrollContentBottomPadding } from '../utils/mobileWebInsets';

const ON_CARD = '#0F172A';
const ON_CARD_MUTED = '#475569';

function emptyAddressForm() {
  return { name: '', code: '', address: '', description: '', isActive: true };
}

function uniqueZones(children) {
  const map = new Map();
  (children || []).forEach((c) => {
    const z = String(c.address || '').trim();
    if (!z) return;
    const key = z.toLowerCase();
    if (!map.has(key)) map.set(key, z);
  });
  return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
}

export default function OrgWarehouseLocationDetailScreen({ navigation, route }) {
  const { t } = useTranslation();
  const routeOrgId = route?.params?.organizationId || route?.params?.orgId;
  const locationId = route?.params?.locationId;
  const scrollBottomPadding = useScrollContentBottomPadding(40);

  const [orgId, setOrgId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [canManage, setCanManage] = useState(false);
  const [site, setSite] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editingChildId, setEditingChildId] = useState(null);
  const [form, setForm] = useState(emptyAddressForm());

  const [zoneDraft, setZoneDraft] = useState('');
  const [editingZone, setEditingZone] = useState(null);
  const [zoneEditValue, setZoneEditValue] = useState('');
  const [extraZones, setExtraZones] = useState([]);

  const onBack = useCallback(() => {
    navigateToOrgWarehouse(navigation, {
      orgId: routeOrgId || orgId,
      tab: 'list',
    });
  }, [navigation, orgId, routeOrgId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const resolved = await resolveActiveOrganizationId(routeOrgId);
      setOrgId(resolved);
      if (!resolved || !locationId) {
        setError(t('org.warehouse.locationNotFound', null, 'Location not found.'));
        return;
      }
      const row = await getWarehouseLocation(token, resolved, locationId);
      setSite(row);
      setCanManage(true);
    } catch (e) {
      setError(e.message || t('org.warehouse.loadError', null, 'Could not load warehouse.'));
    } finally {
      setLoading(false);
    }
  }, [locationId, routeOrgId, t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const children = Array.isArray(site?.children) ? site.children : [];
  const zones = useMemo(() => {
    const fromChildren = uniqueZones(children);
    const map = new Map(fromChildren.map((z) => [z.toLowerCase(), z]));
    extraZones.forEach((z) => {
      const key = String(z || '').trim().toLowerCase();
      if (key && !map.has(key)) map.set(key, String(z).trim());
    });
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b));
  }, [children, extraZones]);

  const startAdd = () => {
    setEditingChildId(null);
    setForm(emptyAddressForm());
    setShowAdd(true);
    setMessage('');
    setError('');
  };

  const startEditChild = (child) => {
    setEditingChildId(child.id);
    setForm({
      name: child.name || '',
      code: child.code || '',
      address: child.address || '',
      description: child.description || '',
      isActive: child.is_active !== false,
    });
    setShowAdd(true);
    setMessage('');
    setError('');
  };

  const selectZone = (zoneName) => {
    setForm((p) => ({ ...p, address: zoneName }));
    if (!showAdd) {
      setShowAdd(true);
      setEditingChildId(null);
    }
  };

  const onAddZoneOnly = () => {
    const name = zoneDraft.trim();
    if (!name) {
      setError(t('org.warehouse.zoneRequired', null, 'Enter a zone name.'));
      return;
    }
    setExtraZones((prev) => {
      if (prev.some((z) => z.toLowerCase() === name.toLowerCase())) return prev;
      if (zones.some((z) => z.toLowerCase() === name.toLowerCase())) return prev;
      return [...prev, name];
    });
    setForm((p) => ({ ...p, address: name }));
    setZoneDraft('');
    setShowAdd(true);
    setEditingChildId(null);
    setError('');
    setMessage(
      t(
        'org.warehouse.zoneReady',
        null,
        'Zone ready — save a warehouse address (cupboard/rack) with this zone, or pick it when editing.',
      ),
    );
  };

  const onRenameZone = async () => {
    if (!editingZone || !orgId) return;
    const next = zoneEditValue.trim();
    if (!next) {
      setError(t('org.warehouse.zoneRequired', null, 'Enter a zone name.'));
      return;
    }
    const targets = children.filter(
      (c) => String(c.address || '').trim().toLowerCase() === editingZone.toLowerCase(),
    );
    if (!targets.length) {
      setEditingZone(null);
      return;
    }
    setBusy(true);
    setError('');
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      await Promise.all(
        targets.map((c) =>
          updateWarehouseLocation(token, orgId, c.id, { address: next }),
        ),
      );
      setEditingZone(null);
      setZoneEditValue('');
      if (form.address === editingZone) {
        setForm((p) => ({ ...p, address: next }));
      }
      setMessage(t('org.warehouse.zoneUpdated', null, 'Zone updated.'));
      await load();
    } catch (e) {
      setError(e.message || t('org.warehouse.saveError', null, 'Could not save.'));
    } finally {
      setBusy(false);
    }
  };

  const onSaveAddress = async () => {
    if (!orgId || !locationId || !canManage) return;
    if (!form.name.trim()) {
      setError(t('org.warehouse.nameRequired', null, 'Name is required.'));
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const payload = {
        name: form.name.trim(),
        code: form.code.trim() || form.name.trim(),
        address: form.address.trim(),
        description: form.description.trim(),
        is_active: Boolean(form.isActive),
        parent_id: locationId,
      };
      if (editingChildId) {
        await updateWarehouseLocation(token, orgId, editingChildId, payload);
        setMessage(t('org.warehouse.addressUpdated', null, 'Warehouse address updated.'));
      } else {
        await createWarehouseLocation(token, orgId, payload);
        setMessage(t('org.warehouse.addressCreated', null, 'Warehouse address added.'));
      }
      setShowAdd(false);
      setEditingChildId(null);
      setForm(emptyAddressForm());
      await load();
    } catch (e) {
      setError(e.message || t('org.warehouse.saveError', null, 'Could not save.'));
    } finally {
      setBusy(false);
    }
  };

  const toggleChildActive = async (child) => {
    if (!orgId || !canManage) return;
    setBusy(true);
    setError('');
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      if (child.is_active) {
        await deactivateWarehouseLocation(token, orgId, child.id);
      } else {
        await updateWarehouseLocation(token, orgId, child.id, { is_active: true });
      }
      await load();
    } catch (e) {
      setError(e.message || t('org.warehouse.saveError', null, 'Could not save.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenBackground>
      <OrgAppHeader
        mode="detail"
        title={site?.name || t('org.warehouse.locationDetail', null, 'Location')}
        onBack={onBack}
      />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: scrollBottomPadding }]}>
        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.primary} />
        ) : (
          <>
            <AppCard style={styles.card}>
              <Text style={styles.title}>{site?.name}</Text>
              <Text style={styles.meta}>
                {site?.code || ''}
                {site?.address ? ` · ${site.address}` : ''}
                {site?.qr_code ? ` · QR ${site.qr_code}` : ''}
              </Text>
              <Text style={styles.hint}>
                {t(
                  'org.warehouse.siteDetailLead',
                  null,
                  'Zones (e.g. Hale 1) → warehouse addresses / cupboards (e.g. shkaf1). Put tools into an address from Tools.',
                )}
              </Text>
              {error ? <Text style={styles.error}>{error}</Text> : null}
              {message ? <Text style={styles.message}>{message}</Text> : null}
              {canManage && site ? (
                <View style={styles.rowActions}>
                  <Button
                    mode="outlined"
                    compact
                    textColor={ON_CARD}
                    onPress={async () => {
                      try {
                        const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
                        await openWarehouseLocationLabel(token, orgId, site.id);
                      } catch (e) {
                        setError(
                          e.message || t('org.warehouse.labelError', null, 'Could not open label.'),
                        );
                      }
                    }}
                  >
                    {t('org.warehouse.printLabel', null, 'Print stamp')}
                  </Button>
                </View>
              ) : null}
            </AppCard>

            <AppCard style={styles.card}>
              <Text style={styles.section}>
                {t('org.warehouse.zonesTitle', null, 'Zones')}
              </Text>
              <Text style={styles.hint}>
                {t(
                  'org.warehouse.zonesHint',
                  null,
                  'Select a zone for the address form, or type a new name to create it. Tap Edit to rename.',
                )}
              </Text>

              <View style={styles.table}>
                <View style={[styles.tableRow, styles.tableHead]}>
                  <Text style={[styles.th, styles.colZone]}>
                    {t('org.warehouse.zone', null, 'Zone')}
                  </Text>
                  <Text style={[styles.th, styles.colCount]}>
                    {t('org.warehouse.binsInZone', null, 'Addresses')}
                  </Text>
                  <Text style={[styles.th, styles.colActions]}>
                    {t('org.warehouse.actions', null, 'Actions')}
                  </Text>
                </View>
                {!zones.length ? (
                  <Text style={[styles.hint, { paddingVertical: 8 }]}>
                    {t('org.warehouse.zonesEmpty', null, 'No zones yet. Type one below or set zone when adding an address.')}
                  </Text>
                ) : (
                  zones.map((zone) => {
                    const count = children.filter(
                      (c) => String(c.address || '').trim().toLowerCase() === zone.toLowerCase(),
                    ).length;
                    const selected =
                      String(form.address || '').trim().toLowerCase() === zone.toLowerCase();
                    const isEditing = editingZone === zone;
                    return (
                      <View key={zone} style={[styles.tableRow, selected && styles.tableRowSelected]}>
                        <View style={styles.colZone}>
                          {isEditing ? (
                            <TextInput
                              value={zoneEditValue}
                              onChangeText={setZoneEditValue}
                              mode="outlined"
                              dense
                              style={styles.zoneInput}
                              textColor={ON_CARD}
                            />
                          ) : (
                            <Pressable onPress={() => selectZone(zone)}>
                              <Text style={styles.td}>{zone}</Text>
                              {selected ? (
                                <Text style={styles.selectedMark}>
                                  {t('org.warehouse.zoneSelectedShort', null, 'Selected')}
                                </Text>
                              ) : null}
                            </Pressable>
                          )}
                        </View>
                        <Text style={[styles.td, styles.colCount]}>{count}</Text>
                        <View style={[styles.colActions, styles.rowActions]}>
                          {isEditing ? (
                            <>
                              <Pressable onPress={onRenameZone} disabled={busy}>
                                <Text style={styles.link}>{t('common.save', null, 'Save')}</Text>
                              </Pressable>
                              <Pressable
                                onPress={() => {
                                  setEditingZone(null);
                                  setZoneEditValue('');
                                }}
                              >
                                <Text style={styles.linkMuted}>{t('common.cancel', null, 'Cancel')}</Text>
                              </Pressable>
                            </>
                          ) : canManage ? (
                            <>
                              <Pressable onPress={() => selectZone(zone)}>
                                <Text style={styles.link}>
                                  {t('org.warehouse.useZone', null, 'Use')}
                                </Text>
                              </Pressable>
                              <Pressable
                                onPress={() => {
                                  setEditingZone(zone);
                                  setZoneEditValue(zone);
                                }}
                              >
                                <Text style={styles.link}>{t('common.edit', null, 'Edit')}</Text>
                              </Pressable>
                            </>
                          ) : null}
                        </View>
                      </View>
                    );
                  })
                )}
              </View>

              {canManage ? (
                <View style={styles.zoneAddRow}>
                  <TextInput
                    label={t('org.warehouse.newZone', null, 'New zone (type to create)')}
                    value={zoneDraft}
                    onChangeText={setZoneDraft}
                    mode="outlined"
                    style={[styles.input, { flex: 1 }]}
                    textColor={ON_CARD}
                  />
                  <Button mode="contained" onPress={onAddZoneOnly} loading={busy} disabled={busy}>
                    {t('org.warehouse.addZone', null, 'Add zone')}
                  </Button>
                </View>
              ) : null}
            </AppCard>

            <AppCard style={styles.card}>
              <Text style={styles.section}>
                {t('org.warehouse.addressesTitle', null, 'Warehouse addresses')}
                {` (${children.length})`}
              </Text>

              <View style={styles.table}>
                <View style={[styles.tableRow, styles.tableHead]}>
                  <Text style={[styles.th, styles.colName]}>
                    {t('org.warehouse.name', null, 'Name')}
                  </Text>
                  <Text style={[styles.th, styles.colCode]}>
                    {t('org.warehouse.codeShort', null, 'Code')}
                  </Text>
                  <Text style={[styles.th, styles.colZone]}>
                    {t('org.warehouse.zone', null, 'Zone')}
                  </Text>
                  <Text style={[styles.th, styles.colActions]}>
                    {t('org.warehouse.actions', null, 'Actions')}
                  </Text>
                </View>
                {!children.length ? (
                  <Text style={[styles.hint, { paddingVertical: 8 }]}>
                    {t(
                      'org.warehouse.addressesEmpty',
                      null,
                      'No addresses yet. Add racks, shelves, or bins (e.g. shkaf1).',
                    )}
                  </Text>
                ) : (
                  children.map((child) => (
                    <View key={child.id} style={styles.tableRow}>
                      <Text style={[styles.td, styles.colName]} numberOfLines={2}>
                        {child.name}
                        {child.is_active
                          ? ''
                          : ` (${t('org.warehouse.inactive', null, 'Inactive')})`}
                      </Text>
                      <Text style={[styles.td, styles.colCode]}>{child.code}</Text>
                      <Text style={[styles.td, styles.colZone]}>{child.address || '—'}</Text>
                      {canManage ? (
                        <View style={[styles.colActions, styles.rowActions]}>
                          <Pressable onPress={() => startEditChild(child)}>
                            <Text style={styles.link}>{t('common.edit', null, 'Edit')}</Text>
                          </Pressable>
                          <Pressable
                            onPress={async () => {
                              try {
                                const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
                                await openWarehouseLocationLabel(token, orgId, child.id);
                              } catch (e) {
                                setError(
                                  e.message
                                    || t('org.warehouse.labelError', null, 'Could not open label.'),
                                );
                              }
                            }}
                          >
                            <Text style={styles.link}>
                              {t('org.warehouse.printLabel', null, 'Print stamp')}
                            </Text>
                          </Pressable>
                          <Pressable onPress={() => toggleChildActive(child)}>
                            <Text style={styles.link}>
                              {child.is_active
                                ? t('org.warehouse.deactivate', null, 'Deactivate')
                                : t('org.warehouse.activate', null, 'Activate')}
                            </Text>
                          </Pressable>
                        </View>
                      ) : (
                        <View style={styles.colActions} />
                      )}
                    </View>
                  ))
                )}
              </View>

              {canManage ? (
                <Button mode="contained" onPress={startAdd} style={{ marginTop: 8 }}>
                  {t('org.warehouse.addAddress', null, 'Add warehouse address')}
                </Button>
              ) : null}
            </AppCard>

            {showAdd && canManage ? (
              <AppCard style={styles.card}>
                <Text style={styles.section}>
                  {editingChildId
                    ? t('org.warehouse.editAddress', null, 'Edit warehouse address')
                    : t('org.warehouse.addAddress', null, 'Add warehouse address')}
                </Text>
                <Text style={styles.hint}>
                  {t(
                    'org.warehouse.zonePickHint',
                    null,
                    'Pick a zone from the table above, or type a new zone name here — it will be created with this address.',
                  )}
                </Text>
                <TextInput
                  label={t('org.warehouse.name', null, 'Name')}
                  value={form.name}
                  onChangeText={(v) => setForm((p) => ({ ...p, name: v }))}
                  mode="outlined"
                  style={styles.input}
                  textColor={ON_CARD}
                  placeholder="shkaf1"
                />
                <TextInput
                  label={t('org.warehouse.code', null, 'Code (optional)')}
                  value={form.code}
                  onChangeText={(v) => setForm((p) => ({ ...p, code: v }))}
                  mode="outlined"
                  style={styles.input}
                  textColor={ON_CARD}
                  autoCapitalize="characters"
                />
                <TextInput
                  label={t('org.warehouse.zone', null, 'Zone')}
                  value={form.address}
                  onChangeText={(v) => setForm((p) => ({ ...p, address: v }))}
                  mode="outlined"
                  style={styles.input}
                  textColor={ON_CARD}
                  placeholder="hale1"
                />
                {zones.length ? (
                  <View style={styles.chipRow}>
                    {zones.map((z) => {
                      const active =
                        String(form.address || '').trim().toLowerCase() === z.toLowerCase();
                      return (
                        <Pressable
                          key={z}
                          onPress={() => setForm((p) => ({ ...p, address: z }))}
                          style={[styles.chip, active && styles.chipActive]}
                        >
                          <Text style={[styles.chipText, active && styles.chipTextActive]}>{z}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
                <TextInput
                  label={t('org.warehouse.description', null, 'Description')}
                  value={form.description}
                  onChangeText={(v) => setForm((p) => ({ ...p, description: v }))}
                  mode="outlined"
                  style={styles.input}
                  textColor={ON_CARD}
                  multiline
                />
                <View style={styles.switchRow}>
                  <Text style={styles.meta}>{t('org.warehouse.active', null, 'Active')}</Text>
                  <Switch
                    value={Boolean(form.isActive)}
                    onValueChange={(v) => setForm((p) => ({ ...p, isActive: v }))}
                  />
                </View>
                <View style={styles.rowActions}>
                  <Button mode="contained" onPress={onSaveAddress} loading={busy} disabled={busy}>
                    {t('common.save', null, 'Save')}
                  </Button>
                  <Button
                    mode="text"
                    onPress={() => {
                      setShowAdd(false);
                      setEditingChildId(null);
                    }}
                    textColor={ON_CARD}
                  >
                    {t('common.cancel', null, 'Cancel')}
                  </Button>
                </View>
              </AppCard>
            ) : null}
          </>
        )}
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, gap: 12 },
  card: { gap: 8, paddingVertical: 8 },
  title: { color: ON_CARD, fontSize: 20, fontWeight: '700' },
  section: { color: ON_CARD, fontSize: 15, fontWeight: '700' },
  meta: { color: ON_CARD_MUTED, fontSize: 13 },
  hint: { color: ON_CARD_MUTED, fontSize: 13, lineHeight: 18 },
  error: { color: '#B91C1C', fontSize: 13 },
  message: { color: '#047857', fontSize: 13 },
  input: { backgroundColor: '#fff' },
  zoneInput: { backgroundColor: '#fff', marginVertical: 2 },
  table: { marginTop: 4, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, overflow: 'hidden' },
  tableHead: { backgroundColor: '#F1F5F9' },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  tableRowSelected: { backgroundColor: '#EFF6FF' },
  th: { color: ON_CARD_MUTED, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  td: { color: ON_CARD, fontSize: 13 },
  colName: { flex: 1.2, minWidth: 70 },
  colCode: { flex: 0.7, minWidth: 48 },
  colZone: { flex: 1, minWidth: 64 },
  colCount: { width: 64, textAlign: 'center' },
  colActions: { flex: 1.2, minWidth: 90 },
  rowActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
  link: { color: '#1D4ED8', fontSize: 13, fontWeight: '600' },
  linkMuted: { color: ON_CARD_MUTED, fontSize: 13 },
  selectedMark: { color: '#1D4ED8', fontSize: 11, fontWeight: '600' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  zoneAddRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  chipActive: { backgroundColor: '#1D4ED8', borderColor: '#1D4ED8' },
  chipText: { color: ON_CARD, fontSize: 13 },
  chipTextActive: { color: '#fff' },
});
