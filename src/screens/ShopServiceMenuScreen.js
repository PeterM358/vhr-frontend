import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  ActivityIndicator,
  Button,
  Searchbar,
  Switch,
  Text,
} from 'react-native-paper';

import ScreenBackground from '../components/ScreenBackground';
import AppNavigationBar from '../components/common/AppNavigationBar';
import FloatingCard from '../components/ui/FloatingCard';
import AppCard from '../components/ui/AppCard';
import { COLORS } from '../constants/colors';
import { useScrollShadow } from '../hooks/useScrollShadow';
import { usePartnerDashboardBack } from '../navigation/appNavBarBack';
import { useTranslation } from '../i18n';
import { API_BASE_URL } from '../api/config';
import {
  createServiceMenuItem,
  getServiceMenu,
  refreshServiceMenuFromHistory,
  updateServiceMenuItem,
} from '../api/serviceMenu';
import { getVehicleTypes } from '../api/vehicles';
import { getMyShopProfiles } from '../api/profiles';
import { resetFromShopDrawer } from '../navigation/drawerNavigation';
import { getOperationIcon } from '../icons/operationIconRegistry';
import { translateRepairTypeLabel } from '../utils/translateShopTypeLabels';
import { vehicleTypeEmoji } from '../utils/vehicleTypeIcons';
import ShopServicePricingFields from '../components/shop/ShopServicePricingFields';
import {
  serviceMenuSummaryLine,
  parsePricingMoney,
} from '../utils/servicePricingSummary';

const DEFAULT_SCOPE = 'default';

function scopeKeyForItem(item) {
  return item?.vehicle_type != null ? String(item.vehicle_type) : DEFAULT_SCOPE;
}

function compositeKey(repairTypeId, scope) {
  return `${repairTypeId}::${scope}`;
}

function emptyDraft() {
  return {
    parts_from: '',
    parts_to: '',
    labor_from: '',
    labor_to: '',
    typical_labor_minutes: null,
    typical_labor_minutes_to: null,
    disclaimer: '',
    is_published: false,
  };
}

function itemToDraft(item) {
  return {
    parts_from: item.parts_from != null ? String(item.parts_from) : '',
    parts_to: item.parts_to != null ? String(item.parts_to) : '',
    labor_from: item.labor_from != null ? String(item.labor_from) : '',
    labor_to: item.labor_to != null ? String(item.labor_to) : '',
    typical_labor_minutes:
      item.typical_labor_minutes != null ? Number(item.typical_labor_minutes) : null,
    typical_labor_minutes_to:
      item.typical_labor_minutes_to != null ? Number(item.typical_labor_minutes_to) : null,
    disclaimer: item.disclaimer || '',
    is_published: Boolean(item.is_published),
  };
}

function toIdArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => (entry && typeof entry === 'object' ? entry.id : entry))
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id));
}

export default function ShopServiceMenuScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { scrolled, onScroll, scrollEventThrottle } = useScrollShadow();
  const handleBack = usePartnerDashboardBack(navigation);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addingTypeId, setAddingTypeId] = useState(null);
  const [savingKey, setSavingKey] = useState(null);
  const [togglingPublishKey, setTogglingPublishKey] = useState(null);
  const [items, setItems] = useState([]);
  const [repairTypes, setRepairTypes] = useState([]);
  const [supportedVehicleTypes, setSupportedVehicleTypes] = useState([]);
  const [shopProfileId, setShopProfileId] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [expandedTypeId, setExpandedTypeId] = useState(null);
  const [activeScope, setActiveScope] = useState({});
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [addSearch, setAddSearch] = useState('');

  const buildDrafts = (rows) => {
    const next = {};
    (rows || []).forEach((item) => {
      next[compositeKey(item.repair_type, scopeKeyForItem(item))] = itemToDraft(item);
    });
    return next;
  };

  const loadMenu = useCallback(async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const shopId = await AsyncStorage.getItem('@current_shop_id');
      setShopProfileId(shopId);
      if (!token || !shopId) {
        setItems([]);
        setRepairTypes([]);
        setSupportedVehicleTypes([]);
        return;
      }
      const [menuData, typesRes, vehicleTypes, myProfiles] = await Promise.all([
        getServiceMenu(token, shopId),
        fetch(`${API_BASE_URL}/api/repairs/types/`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        getVehicleTypes().catch(() => []),
        getMyShopProfiles().catch(() => []),
      ]);
      const typesJson = typesRes.ok ? await typesRes.json() : [];
      const profile = Array.isArray(myProfiles)
        ? myProfiles.find((p) => String(p.id) === String(shopId)) || myProfiles[0]
        : null;
      const supportedIds = new Set(toIdArray(profile?.supported_vehicle_types));
      const supported = (Array.isArray(vehicleTypes) ? vehicleTypes : [])
        .filter((v) => supportedIds.has(Number(v.id)))
        .map((v) => ({ id: Number(v.id), name: v.name, code: v.code }));

      setItems(Array.isArray(menuData) ? menuData : []);
      setRepairTypes(Array.isArray(typesJson) ? typesJson : []);
      setSupportedVehicleTypes(supported);
      setDrafts(buildDrafts(menuData));
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to load price list');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadMenu();
    }, [loadMenu])
  );

  const repairTypeById = useMemo(() => {
    const map = new Map();
    repairTypes.forEach((rt) => map.set(Number(rt.id), rt));
    return map;
  }, [repairTypes]);

  const groups = useMemo(() => {
    const byType = new Map();
    items.forEach((item) => {
      const rtId = Number(item.repair_type);
      if (!byType.has(rtId)) {
        byType.set(rtId, { repairTypeId: rtId, byScope: {}, sample: item });
      }
      byType.get(rtId).byScope[scopeKeyForItem(item)] = item;
    });
    const list = Array.from(byType.values()).map((group) => {
      const meta = repairTypeById.get(group.repairTypeId) || group.sample;
      const anyPublished = Object.values(group.byScope).some((it) => it.is_published);
      return { ...group, meta, anyPublished };
    });
    list.sort((a, b) => {
      if (a.anyPublished !== b.anyPublished) return a.anyPublished ? -1 : 1;
      const an = a.meta?.name || a.sample?.repair_type_name || '';
      const bn = b.meta?.name || b.sample?.repair_type_name || '';
      return an.localeCompare(bn);
    });
    return list;
  }, [items, repairTypeById]);

  const existingTypeIds = useMemo(
    () => new Set(items.map((item) => Number(item.repair_type))),
    [items]
  );

  const addableTypes = useMemo(() => {
    const q = addSearch.trim().toLowerCase();
    return repairTypes
      .filter((rt) => !existingTypeIds.has(Number(rt.id)))
      .filter((rt) => {
        if (!q) return true;
        return (
          (rt.name || '').toLowerCase().includes(q) ||
          (rt.category_name || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }, [repairTypes, existingTypeIds, addSearch]);

  const updateDraft = (key, field, value) => {
    setDrafts((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || emptyDraft()), [field]: value },
    }));
  };

  const patchDraft = (key, patch) => {
    setDrafts((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || emptyDraft()), ...patch },
    }));
  };

  const compatibleVehicleTypes = useCallback(
    (meta) => {
      const compatIds = new Set(toIdArray(meta?.vehicle_types));
      if (compatIds.size === 0) return supportedVehicleTypes;
      return supportedVehicleTypes.filter((v) => compatIds.has(Number(v.id)));
    },
    [supportedVehicleTypes]
  );

  const scopesForGroup = useCallback(
    (group) => {
      const scopes = [{ key: DEFAULT_SCOPE, label: t('serviceMenu.allVehicles'), code: null }];
      compatibleVehicleTypes(group.meta).forEach((v) => {
        scopes.push({ key: String(v.id), label: v.name, code: v.code });
      });
      return scopes;
    },
    [compatibleVehicleTypes, t]
  );

  const upsertItem = (updated) => {
    setItems((prev) => {
      const idx = prev.findIndex((row) => row.id === updated.id);
      if (idx === -1) return [...prev, updated];
      const copy = [...prev];
      copy[idx] = updated;
      return copy;
    });
    setDrafts((prev) => ({
      ...prev,
      [compositeKey(updated.repair_type, scopeKeyForItem(updated))]: itemToDraft(updated),
    }));
  };

  const handleRefreshFromHistory = async () => {
    if (!shopProfileId) return;
    setRefreshing(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const result = await refreshServiceMenuFromHistory(token, shopProfileId);
      const nextItems = result?.items || [];
      setItems(nextItems);
      setDrafts(buildDrafts(nextItems));
      Alert.alert(
        'Updated',
        `Refreshed ${result?.updated ?? nextItems.length} item(s) from completed jobs.`
      );
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to refresh from history');
    } finally {
      setRefreshing(false);
    }
  };

  const buildPayload = (draft, scope) => ({
    parts_from: parsePricingMoney(draft.parts_from),
    parts_to: parsePricingMoney(draft.parts_to),
    labor_from: parsePricingMoney(draft.labor_from),
    labor_to: parsePricingMoney(draft.labor_to),
    typical_labor_minutes:
      draft.typical_labor_minutes != null && Number(draft.typical_labor_minutes) > 0
        ? Number(draft.typical_labor_minutes)
        : null,
    typical_labor_minutes_to:
      draft.typical_labor_minutes_to != null && Number(draft.typical_labor_minutes_to) > 0
        ? Number(draft.typical_labor_minutes_to)
        : null,
    disclaimer: draft.disclaimer || '',
    is_published: Boolean(draft.is_published),
    vehicle_type: scope === DEFAULT_SCOPE ? null : Number(scope),
  });

  const handleSaveScope = async (group, scope) => {
    if (!shopProfileId) return;
    const key = compositeKey(group.repairTypeId, scope);
    const draft = drafts[key] || emptyDraft();
    setSavingKey(key);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const existing = group.byScope[scope];
      const payload = buildPayload(draft, scope);
      const saved = existing
        ? await updateServiceMenuItem(token, shopProfileId, existing.id, payload)
        : await createServiceMenuItem(token, shopProfileId, {
            repair_type: group.repairTypeId,
            ...payload,
          });
      upsertItem(saved);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to save price list item');
    } finally {
      setSavingKey(null);
    }
  };

  const handleTogglePublish = async (group, scope, nextPublished) => {
    const key = compositeKey(group.repairTypeId, scope);
    updateDraft(key, 'is_published', nextPublished);
    const existing = group.byScope[scope];
    if (!existing) {
      // No saved row yet — the toggle is captured in the draft and persisted on save.
      return;
    }
    setTogglingPublishKey(key);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const draft = { ...(drafts[key] || itemToDraft(existing)), is_published: nextPublished };
      const saved = await updateServiceMenuItem(
        token,
        shopProfileId,
        existing.id,
        buildPayload(draft, scope)
      );
      upsertItem(saved);
    } catch (err) {
      updateDraft(key, 'is_published', !nextPublished);
      Alert.alert('Error', err.message || 'Could not update price list visibility');
    } finally {
      setTogglingPublishKey(null);
    }
  };

  const handleAddType = async (repairType) => {
    if (!shopProfileId) return;
    setAddingTypeId(repairType.id);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const created = await createServiceMenuItem(token, shopProfileId, {
        repair_type: repairType.id,
        is_published: false,
        typical_labor_minutes: repairType.default_labor_minutes || null,
      });
      upsertItem(created);
      setExpandedTypeId(Number(created.repair_type));
      setShowAddPanel(false);
      setAddSearch('');
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not add service');
    } finally {
      setAddingTypeId(null);
    }
  };

  const renderGroup = (group) => {
    const { meta } = group;
    const rtId = group.repairTypeId;
    const expanded = expandedTypeId === rtId;
    const scopes = scopesForGroup(group);
    const scope = activeScope[rtId] || DEFAULT_SCOPE;
    const key = compositeKey(rtId, scope);
    const existing = group.byScope[scope];
    const draft = drafts[key] || (existing ? itemToDraft(existing) : emptyDraft());
    const iconName = getOperationIcon(meta || group.sample);
    const defaultItem = group.byScope[DEFAULT_SCOPE];
    const vehiclePriced = Object.keys(group.byScope).filter((k) => k !== DEFAULT_SCOPE).length;
    const summaryBase = serviceMenuSummaryLine(defaultItem, t);
    const summary = vehiclePriced
      ? `${summaryBase} · ${t('serviceMenu.pricesCount', { count: vehiclePriced })}`
      : summaryBase;
    const isPublished = Boolean(draft.is_published);
    const compatible = compatibleVehicleTypes(meta);

    return (
      <FloatingCard
        key={rtId}
        style={[styles.menuRow, group.anyPublished && styles.menuRowPublished]}
      >
        <Pressable
          onPress={() => setExpandedTypeId((id) => (id === rtId ? null : rtId))}
          style={styles.menuRowMain}
        >
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name={iconName} size={22} color={COLORS.PRIMARY} />
          </View>
          <View style={styles.menuRowBody}>
            <Text style={styles.menuRowTitle}>
              {translateRepairTypeLabel(meta || group.sample, t) || t('common.service')}
            </Text>
            {meta?.category_name ? (
              <Text style={styles.menuRowCategory}>{meta.category_name}</Text>
            ) : null}
            <Text style={styles.menuRowRange}>{summary}</Text>
          </View>
          <MaterialCommunityIcons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={22}
            color={COLORS.TEXT_MUTED}
          />
        </Pressable>

        {expanded ? (
          <View style={styles.editBlock}>
            <Text style={styles.editHint}>{t('serviceMenu.vehiclePricingHint')}</Text>

            {compatible.length === 0 ? (
              <Text style={styles.noVehiclesHint}>{t('serviceMenu.noSupportedVehicles')}</Text>
            ) : (
              <View style={styles.scopeChipRow}>
                {scopes.map((s) => {
                  const active = s.key === scope;
                  const priced = Boolean(group.byScope[s.key]);
                  return (
                    <Pressable
                      key={s.key}
                      onPress={() =>
                        setActiveScope((prev) => ({ ...prev, [rtId]: s.key }))
                      }
                      style={[styles.scopeChip, active && styles.scopeChipActive]}
                    >
                      <Text style={styles.scopeChipEmoji}>
                        {s.key === DEFAULT_SCOPE ? '🚗' : vehicleTypeEmoji(s.code, s.label)}
                      </Text>
                      <Text
                        style={[styles.scopeChipLabel, active && styles.scopeChipLabelActive]}
                        numberOfLines={1}
                      >
                        {s.label}
                      </Text>
                      {priced ? <View style={styles.scopeChipDot} /> : null}
                    </Pressable>
                  );
                })}
              </View>
            )}

            <ShopServicePricingFields
              value={draft}
              onChange={(patch) => patchDraft(key, patch)}
              showDisclaimer
            />

            <View style={styles.publishRow}>
              <Text style={styles.publishLabel}>
                {isPublished ? 'Published' : 'Hidden'}
                {scope !== DEFAULT_SCOPE
                  ? ` · ${t('serviceMenu.editingScope', {
                      scope: scopes.find((s) => s.key === scope)?.label || '',
                    })}`
                  : ''}
              </Text>
              <Switch
                value={isPublished}
                onValueChange={(v) => handleTogglePublish(group, scope, v)}
                disabled={togglingPublishKey === key || savingKey === key}
              />
            </View>

            <Button
              mode="contained"
              onPress={() => handleSaveScope(group, scope)}
              loading={savingKey === key}
              disabled={savingKey === key}
            >
              Save prices
            </Button>
          </View>
        ) : null}
      </FloatingCard>
    );
  };

  return (
    <ScreenBackground safeArea={false}>
      <AppNavigationBar
        title={t('drawer.partner.priceList')}
        backLabel={t('navigation.backToDashboard')}
        onBack={handleBack}
        scrolled={scrolled}
      />
      <ScrollView
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        contentContainerStyle={[styles.content, { paddingTop: 12 }]}
      >
        <AppCard variant="dark" style={styles.heroCard}>
          <Text style={styles.heroTitle}>{t('drawer.partner.priceList')}</Text>
          <Text style={styles.heroSubtitle}>
            All your services are listed here. Toggle Published to show prices on your public profile
            — expand a row to set parts, labor, and per-vehicle prices.
          </Text>
          <View style={styles.heroActions}>
            <Button
              mode="contained"
              icon="plus"
              onPress={() => setShowAddPanel((v) => !v)}
              disabled={!shopProfileId}
            >
              Add service
            </Button>
            <Button
              mode="outlined"
              textColor="#fff"
              onPress={handleRefreshFromHistory}
              loading={refreshing}
              disabled={refreshing || !shopProfileId}
            >
              Learn from history
            </Button>
          </View>
        </AppCard>

        {showAddPanel ? (
          <FloatingCard style={styles.addPanel}>
            <Text style={styles.addPanelTitle}>Pick a service type</Text>
            <Searchbar
              placeholder="Oil, brakes, diagnostics…"
              value={addSearch}
              onChangeText={setAddSearch}
              style={styles.searchBar}
              inputStyle={styles.searchInput}
            />
            <View style={styles.typeGrid}>
              {addableTypes.length === 0 ? (
                <Text style={styles.addEmpty}>
                  {addSearch.trim()
                    ? 'No matching types — try another search.'
                    : 'All common service types are already on your price list.'}
                </Text>
              ) : (
                addableTypes.slice(0, 24).map((type) => (
                  <Pressable
                    key={type.id}
                    onPress={() => handleAddType(type)}
                    disabled={addingTypeId === type.id}
                    style={({ pressed }) => [
                      styles.typeTile,
                      pressed && styles.typeTilePressed,
                      addingTypeId === type.id && styles.typeTileDisabled,
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={getOperationIcon(type)}
                      size={26}
                      color={COLORS.PRIMARY}
                    />
                    <Text style={styles.typeTileLabel} numberOfLines={2}>
                      {type.name}
                    </Text>
                  </Pressable>
                ))
              )}
            </View>
          </FloatingCard>
        ) : null}

        {loading ? (
          <ActivityIndicator style={styles.loader} color={COLORS.PRIMARY} />
        ) : groups.length === 0 ? (
          <FloatingCard>
            <Text style={styles.emptyTitle}>No services on your price list yet</Text>
            <Text style={styles.emptyText}>
              Tap Add service to pick oil change, brakes, diagnostics, and more — or learn price
              ranges automatically from completed jobs.
            </Text>
          </FloatingCard>
        ) : (
          groups.map((group) => renderGroup(group))
        )}

        <Button
          mode="text"
          onPress={() => resetFromShopDrawer(navigation, 'ShopProfile')}
          style={styles.backLink}
          textColor="#fff"
        >
          Back to center details
        </Button>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  heroCard: {
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 20,
    marginBottom: 14,
  },
  heroActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  addPanel: {
    gap: 10,
  },
  addPanelTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
  },
  searchBar: {
    backgroundColor: '#fff',
    elevation: 0,
  },
  searchInput: {
    fontSize: 14,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  typeTile: {
    width: '30%',
    minWidth: 96,
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  typeTilePressed: {
    backgroundColor: 'rgba(37,99,235,0.08)',
    borderColor: COLORS.PRIMARY,
  },
  typeTileDisabled: {
    opacity: 0.6,
  },
  typeTileLabel: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.TEXT_DARK,
    textAlign: 'center',
    lineHeight: 14,
  },
  addEmpty: {
    color: COLORS.TEXT_MUTED,
    fontSize: 13,
    lineHeight: 18,
  },
  loader: {
    marginTop: 24,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
    marginBottom: 6,
  },
  emptyText: {
    color: COLORS.TEXT_MUTED,
    lineHeight: 20,
  },
  menuRow: {
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  menuRowPublished: {
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  menuRowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(37,99,235,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuRowBody: {
    flex: 1,
  },
  menuRowTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
  },
  menuRowCategory: {
    fontSize: 11,
    color: COLORS.TEXT_MUTED,
    marginTop: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  menuRowRange: {
    fontSize: 13,
    color: COLORS.PRIMARY,
    fontWeight: '600',
    marginTop: 3,
  },
  computedTotal: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.TEXT_DARK,
    marginTop: 4,
  },
  editBlock: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
    gap: 8,
  },
  scopeChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  scopeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
  },
  scopeChipActive: {
    backgroundColor: 'rgba(37,99,235,0.12)',
    borderColor: COLORS.PRIMARY,
  },
  scopeChipEmoji: {
    fontSize: 14,
  },
  scopeChipLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.TEXT_DARK,
    maxWidth: 120,
  },
  scopeChipLabelActive: {
    color: COLORS.PRIMARY,
  },
  scopeChipDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  noVehiclesHint: {
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.TEXT_MUTED,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  editSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
    marginTop: 4,
  },
  editHint: {
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.TEXT_MUTED,
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    gap: 10,
  },
  halfInput: {
    flex: 1,
    backgroundColor: '#fff',
  },
  fullInput: {
    backgroundColor: '#fff',
  },
  publishRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  publishLabel: {
    color: COLORS.TEXT_DARK,
    flex: 1,
    paddingRight: 12,
    fontWeight: '500',
  },
  backLink: {
    marginTop: 8,
  },
});
