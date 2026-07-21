import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import { COLORS } from '../../constants/colors';
import { useTranslation } from '../../i18n';

/**
 * Searchable multi-select chip list with select-all / clear.
 */
export default function SearchableChipSelector({
  items = [],
  selectedIds = [],
  onChangeSelectedIds,
  searchPlaceholder,
  emptyHint,
  showSelectAll = true,
  allMode = false,
  allModeLabel,
  onToggleAllMode,
  allModeHint,
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const resolvedSearchPlaceholder =
    searchPlaceholder ?? t('chipSelector.searchPlaceholder', null, 'Search…');
  const resolvedEmptyHint = emptyHint ?? t('chipSelector.noMatches', null, 'No matches.');
  const resolvedAllModeLabel = allModeLabel ?? t('chipSelector.all', null, 'All');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const label = String(item.label || '').toLowerCase();
      const meta = String(item.meta || '').toLowerCase();
      return label.includes(q) || meta.includes(q);
    });
  }, [items, query]);

  const toggleId = (id) => {
    const n = Number(id);
    if (allMode && onToggleAllMode) onToggleAllMode(false);
    onChangeSelectedIds(
      selectedIds.includes(n) ? selectedIds.filter((x) => x !== n) : [...selectedIds, n]
    );
  };

  const selectAllFiltered = () => {
    if (onToggleAllMode) onToggleAllMode(false);
    const merged = new Set(selectedIds.map(Number));
    filtered.forEach((item) => merged.add(Number(item.id)));
    onChangeSelectedIds(Array.from(merged));
  };

  const clearAll = () => {
    if (onToggleAllMode) onToggleAllMode(false);
    onChangeSelectedIds([]);
  };

  const selectAllItems = () => {
    if (onToggleAllMode) onToggleAllMode(false);
    onChangeSelectedIds(items.map((item) => Number(item.id)));
  };

  return (
    <View style={styles.wrap}>
      {onToggleAllMode ? (
        <Pressable
          onPress={() => onToggleAllMode(!allMode)}
          style={[styles.allModeChip, allMode && styles.allModeChipSelected]}
        >
          <Text style={[styles.allModeText, allMode && styles.allModeTextSelected]}>{resolvedAllModeLabel}</Text>
        </Pressable>
      ) : null}
      {allModeHint && allMode ? (
        <Text style={styles.allModeHint}>{allModeHint}</Text>
      ) : null}

      {!allMode ? (
        <>
          <TextInput
            mode="outlined"
            dense
            placeholder={resolvedSearchPlaceholder}
            value={query}
            onChangeText={setQuery}
            style={styles.search}
            left={<TextInput.Icon icon="magnify" />}
          />

          {showSelectAll ? (
            <View style={styles.actionRow}>
              <Button compact mode="text" onPress={selectAllItems} disabled={!items.length}>
                {t('chipSelector.selectAll', null, 'Select all')}
              </Button>
              <Button compact mode="text" onPress={selectAllFiltered} disabled={!filtered.length}>
                {t('chipSelector.selectShown', null, 'Select shown')}
              </Button>
              <Button compact mode="text" onPress={clearAll} disabled={!selectedIds.length}>
                {t('chipSelector.clear', null, 'Clear')}
              </Button>
            </View>
          ) : null}

          <Text style={styles.countHint}>
            {t('chipSelector.selectedCount', { count: selectedIds.length }, `${selectedIds.length} selected`)}
            {query.trim()
              ? ` · ${t('chipSelector.shownCount', { count: filtered.length }, `${filtered.length} shown`)}`
              : ''}
          </Text>

          <View style={styles.chipWrap}>
            {filtered.map((item) => {
              const selected = selectedIds.includes(Number(item.id));
              return (
                <Pressable
                  key={item.id}
                  onPress={() => toggleId(item.id)}
                  style={[styles.chip, selected && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {item.prefix ? `${item.prefix} ` : ''}
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {!filtered.length ? <Text style={styles.emptyHint}>{resolvedEmptyHint}</Text> : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 4,
  },
  search: {
    backgroundColor: '#fff',
    marginBottom: 4,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 2,
  },
  countHint: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
    marginBottom: 8,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: 'rgba(226,237,255,0.65)',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.08)',
  },
  chipSelected: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  chipText: {
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#fff',
  },
  emptyHint: {
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
    fontStyle: 'italic',
    marginTop: 4,
  },
  allModeChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(226,237,255,0.65)',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.12)',
    marginBottom: 8,
  },
  allModeChipSelected: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  allModeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  allModeTextSelected: {
    color: '#fff',
  },
  allModeHint: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
    marginBottom: 8,
    lineHeight: 18,
  },
});
