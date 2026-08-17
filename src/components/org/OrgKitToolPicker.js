import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text, TextInput } from 'react-native-paper';

import { useTranslation } from '../../i18n';

const ON_CARD = '#0F172A';
const ON_CARD_MUTED = '#475569';

function materialLabel(asset) {
  return String(asset?.material?.name || '').trim();
}

export default function OrgKitToolPicker({
  assets = [],
  selectedIds = [],
  onChangeSelectedIds,
  maxItems = 40,
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [materialFilter, setMaterialFilter] = useState('');

  const selectedSet = useMemo(() => new Set(selectedIds.map(Number)), [selectedIds]);

  const inStock = useMemo(
    () => (assets || []).filter((a) => a.status === 'in_stock'),
    [assets],
  );

  const materialTypes = useMemo(() => {
    const map = new Map();
    inStock.forEach((a) => {
      const name = materialLabel(a) || t('org.warehouse.tools.unnamedType', null, 'Unnamed');
      const key = String(a.material_id || name);
      if (!map.has(key)) {
        map.set(key, { key, name, materialId: a.material_id, count: 0 });
      }
      map.get(key).count += 1;
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [inStock, t]);

  const selectedAssets = useMemo(
    () =>
      selectedIds
        .map((id) => inStock.find((a) => Number(a.id) === Number(id)) || assets.find((a) => Number(a.id) === Number(id)))
        .filter(Boolean),
    [assets, inStock, selectedIds],
  );

  const selectedMaterialIds = useMemo(() => {
    const set = new Set();
    selectedAssets.forEach((a) => {
      if (a.material_id != null) set.add(Number(a.material_id));
    });
    return set;
  }, [selectedAssets]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return inStock.filter((a) => {
      if (materialFilter) {
        const key = String(a.material_id || materialLabel(a) || t('org.warehouse.tools.unnamedType', null, 'Unnamed'));
        if (key !== materialFilter) return false;
      }
      if (!q) return true;
      const tag = String(a.asset_tag || '').toLowerCase();
      const name = materialLabel(a).toLowerCase();
      return tag.includes(q) || name.includes(q);
    });
  }, [inStock, materialFilter, query, t]);

  const addAsset = (asset) => {
    const id = Number(asset.id);
    if (!Number.isFinite(id) || selectedSet.has(id) || asset.kit_id) return;
    if (selectedIds.length >= maxItems) return;
    onChangeSelectedIds([...selectedIds, id]);
  };

  const removeAsset = (id) => {
    onChangeSelectedIds(selectedIds.filter((x) => Number(x) !== Number(id)));
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.hint}>
        {t(
          'org.warehouse.tools.kitPickerHint',
          null,
          'Search and filter by machine type. Each numbered tool can be in only one kit, and only once in this bag.',
        )}
      </Text>

      <View style={styles.chipWrap}>
        <Pressable
          onPress={() => setMaterialFilter('')}
          style={[styles.typeChip, !materialFilter && styles.typeChipActive]}
        >
          <Text style={[styles.typeChipText, !materialFilter && styles.typeChipTextActive]}>
            {t('org.warehouse.tools.kitFilterAll', null, 'All types')}
            {` (${inStock.length})`}
          </Text>
        </Pressable>
        {materialTypes.map((row) => {
          const active = materialFilter === row.key;
          return (
            <Pressable
              key={row.key}
              onPress={() => setMaterialFilter(active ? '' : row.key)}
              style={[styles.typeChip, active && styles.typeChipActive]}
            >
              <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>
                {row.name} ({row.count})
              </Text>
            </Pressable>
          );
        })}
      </View>

      <TextInput
        mode="outlined"
        dense
        value={query}
        onChangeText={setQuery}
        style={styles.search}
        textColor={ON_CARD}
        placeholder={t('org.warehouse.tools.kitSearch', null, 'Search TOOL-001 or бормашина')}
      />

      {selectedAssets.length ? (
        <View style={styles.selectedBox}>
          <Text style={styles.meta}>
            {t(
              'org.warehouse.tools.kitSelectedCount',
              { count: selectedAssets.length },
              `${selectedAssets.length} in this kit`,
            )}
          </Text>
          <View style={styles.chipWrap}>
            {selectedAssets.map((asset) => (
              <Pressable
                key={asset.id}
                onPress={() => removeAsset(asset.id)}
                style={styles.selectedChip}
              >
                <Text style={styles.selectedChipText}>
                  {asset.asset_tag}
                  {materialLabel(asset) ? ` · ${materialLabel(asset)}` : ''}
                  {'  ×'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : (
        <Text style={styles.meta}>
          {t('org.warehouse.tools.kitNoneSelected', null, 'No tools in this kit yet.')}
        </Text>
      )}

      <ScrollView style={styles.list} nestedScrollEnabled>
        {!filtered.length ? (
          <Text style={[styles.hint, { padding: 10 }]}>
            {t('org.warehouse.tools.kitPickerEmpty', null, 'No matching in-stock tools.')}
          </Text>
        ) : (
          filtered.map((asset) => {
            const selected = selectedSet.has(Number(asset.id));
            const inOtherKit = Boolean(asset.kit_id);
            const sameTypeSelected =
              !selected
              && asset.material_id != null
              && selectedMaterialIds.has(Number(asset.material_id));
            return (
              <Pressable
                key={asset.id}
                onPress={() => (selected ? removeAsset(asset.id) : addAsset(asset))}
                disabled={inOtherKit}
                style={[styles.pickRow, selected && styles.pickRowSelected, inOtherKit && styles.pickRowDisabled]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.tag, inOtherKit && styles.disabledText]}>{asset.asset_tag}</Text>
                  <Text style={styles.meta}>
                    {materialLabel(asset) || '—'}
                    {inOtherKit
                      ? ` · ${t(
                          'org.warehouse.tools.alreadyInKit',
                          { kit: asset.kit?.name || asset.kit?.code || '' },
                          `Already in kit ${asset.kit?.name || asset.kit?.code || ''}`,
                        )}`
                      : ''}
                    {sameTypeSelected
                      ? ` · ${t('org.warehouse.tools.sameTypeInKit', null, 'This type is already in the kit')}`
                      : ''}
                  </Text>
                </View>
                <Text style={[styles.action, selected && styles.actionSelected, inOtherKit && styles.disabledText]}>
                  {inOtherKit
                    ? t('org.warehouse.tools.kitLocked', null, 'In a kit')
                    : selected
                      ? t('org.warehouse.tools.kitRemove', null, 'Remove')
                      : t('org.warehouse.tools.kitAdd', null, 'Add')}
                </Text>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8, marginTop: 4 },
  hint: { color: ON_CARD_MUTED, fontSize: 12, lineHeight: 17 },
  meta: { color: ON_CARD_MUTED, fontSize: 12 },
  search: { backgroundColor: '#fff' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  typeChip: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#F8FAFC',
  },
  typeChipActive: { backgroundColor: '#0F172A', borderColor: '#0F172A' },
  typeChipText: { color: ON_CARD, fontSize: 12, fontWeight: '600' },
  typeChipTextActive: { color: '#fff' },
  selectedBox: {
    borderWidth: 1,
    borderColor: '#DBEAFE',
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 8,
    gap: 6,
  },
  selectedChip: {
    backgroundColor: '#1D4ED8',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  selectedChipText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  list: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    maxHeight: 280,
  },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#fff',
  },
  pickRowSelected: { backgroundColor: '#F0FDF4' },
  pickRowDisabled: { backgroundColor: '#F8FAFC' },
  tag: { color: ON_CARD, fontWeight: '700', fontSize: 13 },
  disabledText: { color: '#94A3B8' },
  action: { color: '#1D4ED8', fontSize: 12, fontWeight: '700' },
  actionSelected: { color: '#166534' },
});
