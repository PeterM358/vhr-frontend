import React, { useCallback, useState } from 'react';
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

  const children = Array.isArray(site?.children) ? site.children : [];

  return (
    <ScreenBackground>
      <OrgAppHeader
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
                  'Add warehouse addresses (bins / racks) inside this site. Materials and numbered tools go into an address later.',
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
                {t('org.warehouse.addressesTitle', null, 'Warehouse addresses')}
                {` (${children.length})`}
              </Text>
              {!children.length ? (
                <Text style={styles.hint}>
                  {t(
                    'org.warehouse.addressesEmpty',
                    null,
                    'No addresses yet. Add racks, shelves, or bins (e.g. A-01).',
                  )}
                </Text>
              ) : (
                children.map((child) => (
                  <View key={child.id} style={styles.childRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.childTitle}>{child.name}</Text>
                      <Text style={styles.meta}>
                        {child.code}
                        {child.address ? ` · ${child.address}` : ''}
                        {child.is_active
                          ? ''
                          : ` · ${t('org.warehouse.inactive', null, 'Inactive')}`}
                      </Text>
                    </View>
                    {canManage ? (
                      <View style={styles.rowActions}>
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
                    ) : null}
                  </View>
                ))
              )}

              {canManage ? (
                <Button mode="contained" onPress={startAdd} style={{ marginTop: 8 }}>
                  {t('org.warehouse.addAddress', null, 'Add warehouse address')}
                </Button>
              ) : null}
              {canManage && !children.length && !showAdd ? (
                <Text style={[styles.hint, { marginTop: 4 }]}>
                  {t(
                    'org.warehouse.addAddressHint',
                    null,
                    'This is the place: tap “Add warehouse address” for racks/bins inside this site.',
                  )}
                </Text>
              ) : null}
            </AppCard>

            {showAdd && canManage ? (
              <AppCard style={styles.card}>
                <Text style={styles.section}>
                  {editingChildId
                    ? t('org.warehouse.editAddress', null, 'Edit warehouse address')
                    : t('org.warehouse.addAddress', null, 'Add warehouse address')}
                </Text>
                <TextInput
                  label={t('org.warehouse.name', null, 'Name')}
                  value={form.name}
                  onChangeText={(v) => setForm((p) => ({ ...p, name: v }))}
                  mode="outlined"
                  style={styles.input}
                  textColor={ON_CARD}
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
                  label={t('org.warehouse.address', null, 'Address / zone')}
                  value={form.address}
                  onChangeText={(v) => setForm((p) => ({ ...p, address: v }))}
                  mode="outlined"
                  style={styles.input}
                  textColor={ON_CARD}
                />
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
  childRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
    alignItems: 'flex-start',
  },
  childTitle: { color: ON_CARD, fontWeight: '600', fontSize: 15 },
  rowActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center' },
  link: { color: '#1D4ED8', fontSize: 13, fontWeight: '600' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
