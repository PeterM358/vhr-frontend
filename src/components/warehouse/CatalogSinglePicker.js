import React from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Text, TextInput, ActivityIndicator } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { PRIMARY, TEXT_DARK, TEXT_MUTED } from '../../constants/colors';

/**
 * Single-select searchable chip grid (part type, brand, …).
 */
export default function CatalogSinglePicker({
  label,
  required = false,
  placeholder = 'Search…',
  items = [],
  selectedId = null,
  selectedLabel = '',
  searchValue = '',
  onSearchChange,
  onSelect,
  onCreateNew,
  creating = false,
  createLabel = '',
  emptyHint = 'Type to search the catalog.',
}) {
  const showList = searchValue.trim().length > 0 || !selectedId;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>
        {label}
        {required ? ' *' : ''}
      </Text>

      {selectedId && selectedLabel ? (
        <View style={styles.selectedRow}>
          <View style={styles.selectedChip}>
            <MaterialCommunityIcons name="check-circle" size={18} color={PRIMARY} />
            <Text style={styles.selectedText}>{selectedLabel}</Text>
          </View>
          <Pressable
            onPress={() => {
              onSelect(null);
              onSearchChange('');
            }}
            hitSlop={8}
          >
            <Text style={styles.changeLink}>Change</Text>
          </Pressable>
        </View>
      ) : null}

      {showList ? (
        <>
          <TextInput
            mode="outlined"
            dense
            placeholder={placeholder}
            value={searchValue}
            onChangeText={onSearchChange}
            style={styles.search}
          />
          {items.length === 0 && searchValue.trim().length === 0 ? (
            <Text style={styles.hint}>{emptyHint}</Text>
          ) : null}
          <ScrollView style={styles.list} nestedScrollEnabled keyboardShouldPersistTaps="handled">
            <View style={styles.chipGrid}>
              {items.map((item) => {
                const active = selectedId === item.id;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => onSelect(item)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={[styles.chipLabel, active && styles.chipLabelActive]} numberOfLines={1}>
                      {item.label}
                    </Text>
                    {item.meta ? (
                      <Text style={[styles.chipMeta, active && styles.chipMetaActive]} numberOfLines={1}>
                        {item.meta}
                      </Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
          {onCreateNew && createLabel ? (
            <Pressable onPress={onCreateNew} style={styles.createRow} disabled={creating}>
              {creating ? (
                <ActivityIndicator size={16} color={PRIMARY} />
              ) : (
                <MaterialCommunityIcons name="plus-circle-outline" size={18} color={PRIMARY} />
              )}
              <Text style={styles.createText}>{creating ? 'Creating…' : createLabel}</Text>
            </Pressable>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '600', color: TEXT_MUTED, marginBottom: 6 },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    gap: 8,
  },
  selectedChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#eff6ff',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  selectedText: { fontSize: 14, fontWeight: '600', color: TEXT_DARK, flex: 1 },
  changeLink: { fontSize: 13, fontWeight: '600', color: PRIMARY },
  search: { backgroundColor: '#fff', marginBottom: 8 },
  hint: { fontSize: 12, color: TEXT_MUTED, marginBottom: 8 },
  list: { maxHeight: 160 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minWidth: '47%',
    flexGrow: 1,
    maxWidth: '100%',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chipActive: { backgroundColor: '#eff6ff', borderColor: PRIMARY },
  chipLabel: { fontSize: 13, fontWeight: '600', color: TEXT_DARK },
  chipLabelActive: { color: PRIMARY },
  chipMeta: { fontSize: 11, color: TEXT_MUTED, marginTop: 2 },
  chipMetaActive: { color: '#1d4ed8' },
  createRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  createText: { fontSize: 13, color: PRIMARY, fontWeight: '600', flex: 1 },
});
