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
  TextInput,
} from 'react-native-paper';

import ScreenBackground from '../components/ScreenBackground';
import FloatingCard from '../components/ui/FloatingCard';
import AppCard from '../components/ui/AppCard';
import { COLORS } from '../constants/colors';
import { useStackBodyPaddingTop } from '../navigation/stackContentInset';
import { formatMoneyAmount } from '../constants/currency';
import { API_BASE_URL } from '../api/config';
import {
  createServiceMenuItem,
  getServiceMenu,
  refreshServiceMenuFromHistory,
  updateServiceMenuItem,
} from '../api/serviceMenu';
import { resetFromShopDrawer } from '../navigation/drawerNavigation';
import { resolveRepairTypeIcon } from '../utils/repairTypeIcons';
import {
  formatDurationHoursInput,
  formatDurationMinutes,
  parseDurationHoursInput,
} from '../utils/laborDuration';

function formatComponentRange(from, to, label) {
  if (from != null && to != null && String(from) !== String(to)) {
    return `${label} ${formatMoneyAmount(from)}–${formatMoneyAmount(to)}`;
  }
  if (from != null) return `${label} from ${formatMoneyAmount(from)}`;
  if (to != null) return `${label} from ${formatMoneyAmount(to)}`;
  return null;
}

function formatPriceRange(from, to) {
  if (from != null && to != null && String(from) !== String(to)) {
    return `Total ${formatMoneyAmount(from)} – ${formatMoneyAmount(to)}`;
  }
  if (from != null) return `Total from ${formatMoneyAmount(from)}`;
  if (to != null) return `Total from ${formatMoneyAmount(to)}`;
  return 'Set parts & labor';
}

function formatMenuSummary(item) {
  const parts = formatComponentRange(item.parts_from, item.parts_to, 'Parts');
  const labor = formatComponentRange(item.labor_from, item.labor_to, 'Labor');
  const duration =
    item.typical_labor_minutes != null && item.typical_labor_minutes > 0
      ? `~${formatDurationMinutes(item.typical_labor_minutes)} labor`
      : null;
  const bits = [parts, labor, duration].filter(Boolean);
  const total = formatPriceRange(item.price_from, item.price_to);
  if (bits.length) return `${bits.join(' · ')}`;
  return total;
}

function computeTotalFromDraft(draft) {
  const parse = (v) => {
    const t = String(v ?? '').trim().replace(',', '.');
    if (!t) return null;
    const n = parseFloat(t);
    return Number.isFinite(n) ? n : null;
  };
  const pf = parse(draft?.parts_from);
  const pt = parse(draft?.parts_to);
  const lf = parse(draft?.labor_from);
  const lt = parse(draft?.labor_to);
  const from =
    pf != null || lf != null ? (pf ?? 0) + (lf ?? 0) : null;
  const to =
    pt != null || lt != null ? (pt ?? pf ?? 0) + (lt ?? lf ?? 0) : null;
  if (from == null && to == null) return null;
  return formatPriceRange(from, to);
}

function MenuItemRow({
  item,
  draft,
  expanded,
  onToggle,
  onUpdateDraft,
  onSave,
  onTogglePublish,
  saving,
  togglingPublish,
}) {
  const iconName = resolveRepairTypeIcon(item);
  const rangeLabel = formatMenuSummary(item);
  const totalLabel =
    item.price_from != null || item.price_to != null
      ? formatPriceRange(item.price_from, item.price_to)
      : null;
  const draftTotalLabel = expanded ? computeTotalFromDraft(draft) : null;
  const isPublished = Boolean(draft?.is_published);

  return (
    <FloatingCard style={[styles.menuRow, isPublished && styles.menuRowPublished]}>
      <View style={styles.menuRowHeader}>
        <Pressable onPress={onToggle} style={styles.menuRowMain}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name={iconName} size={22} color={COLORS.PRIMARY} />
          </View>
          <View style={styles.menuRowBody}>
            <Text style={styles.menuRowTitle}>{item.repair_type_name || 'Service'}</Text>
            {item.category_name ? (
              <Text style={styles.menuRowCategory}>{item.category_name}</Text>
            ) : null}
            <Text style={styles.menuRowRange}>{rangeLabel}</Text>
            {totalLabel ? <Text style={styles.menuRowTotal}>{totalLabel}</Text> : null}
          </View>
          <MaterialCommunityIcons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={22}
            color={COLORS.TEXT_MUTED}
          />
        </Pressable>
        <View style={styles.publishToggleCol}>
          <Text style={styles.publishToggleLabel}>{isPublished ? 'Published' : 'Hidden'}</Text>
          <Switch
            value={isPublished}
            onValueChange={onTogglePublish}
            disabled={togglingPublish || saving}
          />
        </View>
      </View>

      {expanded ? (
        <View style={styles.editBlock}>
          <Text style={styles.editSectionTitle}>Parts (EUR)</Text>
          <Text style={styles.editHint}>
            Typical parts cost for this service. Used to pre-fill offers and shown as part of the
            public total when published.
          </Text>
          <View style={styles.priceRow}>
            <TextInput
              label="Parts from"
              mode="outlined"
              dense
              keyboardType="decimal-pad"
              placeholder="e.g. 30"
              value={draft?.parts_from ?? ''}
              onChangeText={(t) => onUpdateDraft('parts_from', t)}
              style={styles.halfInput}
            />
            <TextInput
              label="Parts to"
              mode="outlined"
              dense
              keyboardType="decimal-pad"
              placeholder="e.g. 80"
              value={draft?.parts_to ?? ''}
              onChangeText={(t) => onUpdateDraft('parts_to', t)}
              style={styles.halfInput}
            />
          </View>
          <Text style={styles.editSectionTitle}>Labor (EUR)</Text>
          <Text style={styles.editHint}>
            Workshop labor price for this service. Same job can cost more on premium cars
            (diagnostics, tools) — adjust labor EUR here, not the time below.
          </Text>
          <View style={styles.priceRow}>
            <TextInput
              label="Labor from"
              mode="outlined"
              dense
              keyboardType="decimal-pad"
              placeholder="e.g. 40"
              value={draft?.labor_from ?? ''}
              onChangeText={(t) => onUpdateDraft('labor_from', t)}
              style={styles.halfInput}
            />
            <TextInput
              label="Labor to"
              mode="outlined"
              dense
              keyboardType="decimal-pad"
              placeholder="e.g. 90"
              value={draft?.labor_to ?? ''}
              onChangeText={(t) => onUpdateDraft('labor_to', t)}
              style={styles.halfInput}
            />
          </View>
          <Text style={styles.editSectionTitle}>Labor time (hours)</Text>
          <Text style={styles.editHint}>
            Billable normohours for calendar capacity (oil change ~1h). Used when scheduling —
            not wall-clock from arrival to pickup.
          </Text>
          <TextInput
            label="Usually takes (hours)"
            mode="outlined"
            dense
            keyboardType="decimal-pad"
            placeholder="e.g. 1 or 1.5"
            value={draft?.typical_labor_hours ?? ''}
            onChangeText={(t) => onUpdateDraft('typical_labor_hours', t)}
            style={styles.fullInput}
          />
          {draftTotalLabel ? (
            <Text style={styles.computedTotal}>Clients see: {draftTotalLabel}</Text>
          ) : null}
          <TextInput
            label="Note for clients (optional)"
            mode="outlined"
            dense
            multiline
            value={draft?.disclaimer ?? ''}
            onChangeText={(t) => onUpdateDraft('disclaimer', t)}
            style={styles.fullInput}
          />
          <Button mode="contained" onPress={onSave} loading={saving} disabled={saving}>
            Save prices
          </Button>
        </View>
      ) : null}
    </FloatingCard>
  );
}

export default function ShopServiceMenuScreen() {
  const navigation = useNavigation();
  const bodyPadTop = useStackBodyPaddingTop(12);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addingTypeId, setAddingTypeId] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [togglingPublishId, setTogglingPublishId] = useState(null);
  const [items, setItems] = useState([]);
  const [repairTypes, setRepairTypes] = useState([]);
  const [shopProfileId, setShopProfileId] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [expandedId, setExpandedId] = useState(null);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [addSearch, setAddSearch] = useState('');

  const buildDrafts = (rows) => {
    const next = {};
    (rows || []).forEach((item) => {
      next[item.id] = {
        parts_from: item.parts_from != null ? String(item.parts_from) : '',
        parts_to: item.parts_to != null ? String(item.parts_to) : '',
        labor_from: item.labor_from != null ? String(item.labor_from) : '',
        labor_to: item.labor_to != null ? String(item.labor_to) : '',
        typical_labor_hours: formatDurationHoursInput(item.typical_labor_minutes),
        disclaimer: item.disclaimer || '',
        is_published: Boolean(item.is_published),
      };
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
        return;
      }
      const [menuData, typesRes] = await Promise.all([
        getServiceMenu(token, shopId),
        fetch(`${API_BASE_URL}/api/repairs/types/`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      const typesJson = typesRes.ok ? await typesRes.json() : [];
      setItems(Array.isArray(menuData) ? menuData : []);
      setRepairTypes(Array.isArray(typesJson) ? typesJson : []);
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

  const existingTypeIds = useMemo(
    () => new Set(items.map((item) => item.repair_type)),
    [items]
  );

  const addableTypes = useMemo(() => {
    const q = addSearch.trim().toLowerCase();
    return repairTypes
      .filter((t) => !existingTypeIds.has(t.id))
      .filter((t) => {
        if (!q) return true;
        return (
          (t.name || '').toLowerCase().includes(q) ||
          (t.category_name || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }, [repairTypes, existingTypeIds, addSearch]);

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

  const parseMoney = (raw) => {
    const t = String(raw ?? '').trim().replace(',', '.');
    if (t === '') return null;
    const n = parseFloat(t);
    return Number.isFinite(n) ? n : null;
  };

  const updateDraft = (itemId, field, value) => {
    setDrafts((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], [field]: value },
    }));
  };

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      if (Boolean(a.is_published) !== Boolean(b.is_published)) {
        return a.is_published ? -1 : 1;
      }
      return (a.repair_type_name || '').localeCompare(b.repair_type_name || '');
    });
  }, [items]);

  const patchMenuItem = async (item, patch) => {
    const token = await AsyncStorage.getItem('@access_token');
    if (!token || !shopProfileId) throw new Error('Not signed in');
    const draft = drafts[item.id] || {};
    return updateServiceMenuItem(token, shopProfileId, item.id, {
      parts_from: parseMoney(draft.parts_from ?? item.parts_from),
      parts_to: parseMoney(draft.parts_to ?? item.parts_to),
      labor_from: parseMoney(draft.labor_from ?? item.labor_from),
      labor_to: parseMoney(draft.labor_to ?? item.labor_to),
      typical_labor_minutes: parseDurationHoursInput(
        draft.typical_labor_hours ?? formatDurationHoursInput(item.typical_labor_minutes)
      ),
      disclaimer: draft.disclaimer ?? item.disclaimer ?? '',
      is_published: Boolean(draft.is_published),
      ...patch,
    });
  };

  const applyMenuItemUpdate = (updated) => {
    setItems((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
    setDrafts((prev) => ({
      ...prev,
      [updated.id]: {
        parts_from: updated.parts_from != null ? String(updated.parts_from) : '',
        parts_to: updated.parts_to != null ? String(updated.parts_to) : '',
        labor_from: updated.labor_from != null ? String(updated.labor_from) : '',
        labor_to: updated.labor_to != null ? String(updated.labor_to) : '',
        typical_labor_hours: formatDurationHoursInput(updated.typical_labor_minutes),
        disclaimer: updated.disclaimer || '',
        is_published: Boolean(updated.is_published),
      },
    }));
  };

  const handleTogglePublish = async (item, nextPublished) => {
    updateDraft(item.id, 'is_published', nextPublished);
    setTogglingPublishId(item.id);
    try {
      const updated = await patchMenuItem(item, { is_published: nextPublished });
      applyMenuItemUpdate(updated);
    } catch (err) {
      updateDraft(item.id, 'is_published', !nextPublished);
      Alert.alert('Error', err.message || 'Could not update price list visibility');
    } finally {
      setTogglingPublishId(null);
    }
  };

  const handleSaveItem = async (item) => {
    const draft = drafts[item.id];
    if (!draft || !shopProfileId) return;
    setSavingId(item.id);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const updated = await patchMenuItem(item, {
        parts_from: parseMoney(draft.parts_from),
        parts_to: parseMoney(draft.parts_to),
        labor_from: parseMoney(draft.labor_from),
        labor_to: parseMoney(draft.labor_to),
        typical_labor_minutes: parseDurationHoursInput(draft.typical_labor_hours),
        disclaimer: draft.disclaimer || '',
        is_published: Boolean(draft.is_published),
      });
      applyMenuItemUpdate(updated);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to save price list item');
    } finally {
      setSavingId(null);
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
      setItems((prev) => [...prev, created].sort((a, b) =>
        (a.repair_type_name || '').localeCompare(b.repair_type_name || '')
      ));
      setDrafts((prev) => ({
        ...prev,
        [created.id]: {
          parts_from: '',
          parts_to: '',
          labor_from: '',
          labor_to: '',
          typical_labor_hours: formatDurationHoursInput(created.typical_labor_minutes),
          disclaimer: '',
          is_published: false,
        },
      }));
      setExpandedId(created.id);
      setShowAddPanel(false);
      setAddSearch('');
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not add service');
    } finally {
      setAddingTypeId(null);
    }
  };

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: bodyPadTop }]}>
        <AppCard variant="dark" style={styles.heroCard}>
          <Text style={styles.heroTitle}>Price list</Text>
          <Text style={styles.heroSubtitle}>
            All your services are listed here. Toggle Published to show prices on your public profile
            — expand a row to edit parts and labor.
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
                      name={resolveRepairTypeIcon(type)}
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
        ) : items.length === 0 ? (
          <FloatingCard>
            <Text style={styles.emptyTitle}>No services on your price list yet</Text>
            <Text style={styles.emptyText}>
              Tap Add service to pick oil change, brakes, diagnostics, and more — or learn price
              ranges automatically from completed jobs.
            </Text>
          </FloatingCard>
        ) : (
          sortedItems.map((item) => (
            <MenuItemRow
              key={item.id}
              item={item}
              draft={drafts[item.id]}
              expanded={expandedId === item.id}
              onToggle={() => setExpandedId((id) => (id === item.id ? null : item.id))}
              onUpdateDraft={(field, value) => updateDraft(item.id, field, value)}
              onTogglePublish={(v) => handleTogglePublish(item, v)}
              onSave={() => handleSaveItem(item)}
              saving={savingId === item.id}
              togglingPublish={togglingPublishId === item.id}
            />
          ))
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
  menuRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuRowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  publishToggleCol: {
    alignItems: 'center',
    paddingLeft: 4,
    minWidth: 72,
  },
  publishToggleLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.TEXT_MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 2,
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
  menuRowTotal: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
    marginTop: 2,
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
