import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, FlatList, StyleSheet, Pressable, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Text, ActivityIndicator, Searchbar, Chip } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import FloatingCard from '../ui/FloatingCard';
import EmptyStateCard from '../ui/EmptyStateCard';
import ProTabBar from '../ui/ProTabBar';
import { PRIMARY, TEXT_DARK, TEXT_MUTED } from '../../constants/colors';
import { listStockInventory, listStockMovements } from '../../api/warehouse';
import { showMessage } from '../../utils/crossPlatformAlert';
import { useTranslation } from '../../i18n';

function StockStatusBadge({ status, qty, inStockLabel, outOfStockLabel }) {
  const inStock = status === 'in_stock' || Number(qty) > 0;
  return (
    <View style={[styles.badge, inStock ? styles.badgeIn : styles.badgeOut]}>
      <Text style={[styles.badgeText, inStock ? styles.badgeTextIn : styles.badgeTextOut]}>
        {inStock ? inStockLabel : outOfStockLabel}
      </Text>
    </View>
  );
}

function StockRow({ row, onSelect }) {
  const { t } = useTranslation();
  const qty = Number(row.stock_quantity);
  return (
    <Pressable onPress={() => onSelect(row)}>
      <FloatingCard style={styles.stockCard}>
        <View style={styles.row}>
          <MaterialCommunityIcons
            name={qty > 0 ? 'package-variant-closed' : 'package-variant-closed-remove'}
            size={22}
            color={qty > 0 ? PRIMARY : '#b45309'}
          />
          <View style={styles.body}>
            <Text style={styles.title} numberOfLines={1}>
              {row.part_name || 'Part'}
            </Text>
            <Text style={styles.meta}>
              {row.part_number || '—'}
              {row.brand ? ` · ${row.brand}` : ''}
              {row.shop_sku ? ` · SKU ${row.shop_sku}` : ''}
            </Text>
            {row.part_type ? <Text style={styles.meta}>{row.part_type}</Text> : null}
          </View>
          <View style={styles.qtyCol}>
            <StockStatusBadge
              status={row.stock_status}
              qty={qty}
              inStockLabel={t('partnerDashboard.warehouse.inStock', null, 'In stock')}
              outOfStockLabel={t('partnerDashboard.warehouse.outOfStock', null, 'Out of stock')}
            />
            <Text style={[styles.qty, qty <= 0 && styles.qtyLow]}>
              {row.stock_quantity}
              {row.stock_unit ? ` ${row.stock_unit}` : ''}
            </Text>
          </View>
        </View>
      </FloatingCard>
    </Pressable>
  );
}

function MovementRow({ mv, movementLabels }) {
  const delta = Number(mv.quantity_delta);
  const positive = delta > 0;
  const typeLabel = movementLabels[mv.movement_type] || mv.movement_type;
  const ref = mv.reference || mv.invoice_number || '';

  return (
    <FloatingCard style={styles.moveCard}>
      <View style={styles.row}>
        <MaterialCommunityIcons
          name={positive ? 'arrow-down-bold' : 'arrow-up-bold'}
          size={20}
          color={positive ? '#15803d' : '#dc2626'}
        />
        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={1}>
            {typeLabel}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {mv.part_name || mv.part_number || 'Part'}
          </Text>
          {ref ? (
            <Text style={styles.refLine} numberOfLines={1}>
              {mv.movement_type === 'repair_usage' ? 'Repair: ' : 'Doc: '}
              {ref}
            </Text>
          ) : null}
          <Text style={styles.meta}>{mv.created_at?.slice(0, 10) || ''}</Text>
        </View>
        <Text style={[styles.delta, positive ? styles.deltaPos : styles.deltaNeg]}>
          {positive ? '+' : ''}
          {mv.quantity_delta}
          {mv.stock_unit ? ` ${mv.stock_unit}` : ''}
        </Text>
      </View>
    </FloatingCard>
  );
}

export default function ShopWarehouseStockPanel() {
  const { t } = useTranslation();
  const stockViewTabs = useMemo(
    () => [
      { value: 'stock', label: t('partnerDashboard.warehouse.stockTab'), icon: 'package-variant-closed' },
      { value: 'movements', label: t('partnerDashboard.warehouse.movementsTab'), icon: 'swap-horizontal' },
    ],
    [t]
  );
  const sortOptions = useMemo(
    () => [
      { value: 'name', label: t('partnerDashboard.warehouse.sortName') },
      { value: 'qty', label: t('partnerDashboard.warehouse.sortQty') },
      { value: 'part_number', label: t('partnerDashboard.warehouse.sortPartNumber') },
      { value: 'brand', label: t('partnerDashboard.warehouse.sortBrand') },
    ],
    [t]
  );
  const movementLabels = useMemo(
    () => ({
      purchase: t('partnerDashboard.warehouse.movementPurchase', null, 'Goods in'),
      repair_usage: t('partnerDashboard.warehouse.movementRepairUsage', null, 'Used on repair'),
      adjustment: t('partnerDashboard.warehouse.movementAdjustment', null, 'Adjustment'),
      supplier_return: t('partnerDashboard.warehouse.movementSupplierReturn', null, 'Return to supplier'),
    }),
    [t]
  );
  const [view, setView] = useState('stock');
  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState([]);
  const [movements, setMovements] = useState([]);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('name');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [showCatalogZeros, setShowCatalogZeros] = useState(false);
  const [selectedPartId, setSelectedPartId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const [stockRows, movementRows] = await Promise.all([
        listStockInventory(token, {
          search: search.trim(),
          sort,
          inStock: inStockOnly,
          hideOrphanZero: !showCatalogZeros,
        }),
        listStockMovements(token, {
          shopPartId: selectedPartId || undefined,
          limit: 150,
        }),
      ]);
      setInventory(Array.isArray(stockRows) ? stockRows : []);
      setMovements(Array.isArray(movementRows) ? movementRows : []);
    } catch (err) {
      showMessage('Stock', err.message || 'Could not load stock');
    } finally {
      setLoading(false);
    }
  }, [inStockOnly, search, selectedPartId, showCatalogZeros, sort]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    if (view === 'movements') {
      load();
    }
  }, [selectedPartId, view]);

  const selectedPart = useMemo(
    () => inventory.find((r) => r.shop_part_id === selectedPartId),
    [inventory, selectedPartId]
  );

  const handleSelectPart = (row) => {
    setSelectedPartId(row.shop_part_id);
    setView('movements');
  };

  if (loading && !inventory.length && !movements.length) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={PRIMARY} />
      </View>
    );
  }

  return (
    <View style={styles.panelRoot}>
      <ProTabBar tabs={stockViewTabs} value={view} onChange={setView} style={styles.viewTabs} />

      {view === 'stock' ? (
        <>
          <View style={styles.filters}>
            <Searchbar
              placeholder="Search part, number, SKU…"
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={load}
              onClearIconPress={() => setSearch('')}
              style={styles.search}
              inputStyle={{ fontSize: 14 }}
            />
            <View style={styles.sortRow}>
              {sortOptions.map((opt) => (
                <Chip
                  key={opt.value}
                  compact
                  selected={sort === opt.value}
                  onPress={() => setSort(opt.value)}
                  style={styles.sortChip}
                >
                  {opt.label}
                </Chip>
              ))}
              <Chip
                compact
                selected={inStockOnly}
                onPress={() => setInStockOnly((v) => !v)}
                style={styles.sortChip}
              >
                In stock only
              </Chip>
              <Chip
                compact
                selected={showCatalogZeros}
                onPress={() => setShowCatalogZeros((v) => !v)}
                style={styles.sortChip}
              >
                Show 0-qty catalog
              </Chip>
            </View>
          </View>
          <FlatList
            data={inventory}
            keyExtractor={(item) => String(item.shop_part_id)}
            contentContainerStyle={styles.list}
            refreshing={loading}
            onRefresh={load}
            ListEmptyComponent={
              <EmptyStateCard
                icon="package-variant"
                title={t('partnerDashboard.warehouse.inventoryEmptyTitle')}
                subtitle={t('partnerDashboard.warehouse.inventoryEmptySubtitle')}
              />
            }
            renderItem={({ item }) => <StockRow row={item} onSelect={handleSelectPart} />}
          />
        </>
      ) : (
        <FlatList
          data={movements}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshing={loading}
          onRefresh={load}
          ListHeaderComponent={
            <View style={styles.moveHeader}>
              {selectedPart ? (
                <Pressable
                  onPress={() => {
                    setSelectedPartId(null);
                    load();
                  }}
                  style={styles.filterBanner}
                >
                  <Text style={styles.filterTitle}>
                    {selectedPart.part_name}
                  </Text>
                  <Text style={styles.filterText}>
                    Purchase docs and repair usage for this part — tap to show all movements
                  </Text>
                </Pressable>
              ) : (
                <>
                  <Text style={styles.sectionTitle}>Stock movements</Text>
                  <Text style={styles.sectionHint}>
                    Goods in from supplier invoices, returns, and repair usage
                  </Text>
                </>
              )}
            </View>
          }
          ListEmptyComponent={
            <EmptyStateCard
              icon="swap-horizontal"
              title={t('partnerDashboard.warehouse.noMovementsTitle')}
              subtitle={
                selectedPart
                  ? 'No ledger entries for this part — if you deleted documents from the database, movements may have been removed too.'
                  : 'Movements appear when you complete receiving (goods in) or use parts on repairs.'
              }
            />
          }
          renderItem={({ item }) => <MovementRow mv={item} movementLabels={movementLabels} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panelRoot: { flex: 1, minHeight: 0 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  viewTabs: { marginHorizontal: 0 },
  filters: { paddingHorizontal: 12, paddingTop: 8 },
  search: { marginBottom: 8, backgroundColor: 'rgba(255,255,255,0.95)' },
  sortRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  sortChip: { backgroundColor: 'rgba(255,255,255,0.9)' },
  list: { padding: 12, paddingBottom: 40 },
  stockCard: { marginBottom: 8, padding: 12 },
  moveCard: { marginBottom: 6, padding: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  body: { flex: 1 },
  title: { fontSize: 15, fontWeight: '600', color: TEXT_DARK },
  meta: { fontSize: 12, color: TEXT_MUTED, marginTop: 2 },
  refLine: { fontSize: 12, color: TEXT_DARK, marginTop: 2, fontWeight: '500' },
  qtyCol: { alignItems: 'flex-end', gap: 4 },
  qty: { fontSize: 16, fontWeight: '700', color: TEXT_DARK },
  qtyLow: { color: '#b45309' },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  badgeIn: { backgroundColor: '#dcfce7' },
  badgeOut: { backgroundColor: '#fef3c7' },
  badgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  badgeTextIn: { color: '#15803d' },
  badgeTextOut: { color: '#b45309' },
  delta: { fontSize: 14, fontWeight: '700' },
  deltaPos: { color: '#15803d' },
  deltaNeg: { color: '#dc2626' },
  moveHeader: { marginBottom: 8 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.95)',
  },
  sectionHint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 4,
    marginBottom: 4,
  },
  filterBanner: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 4,
  },
  filterTitle: { fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 4 },
  filterText: { fontSize: 12, color: 'rgba(255,255,255,0.85)', lineHeight: 17 },
});
