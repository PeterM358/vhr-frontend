import React, { useMemo } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { COLORS } from '../../constants/colors';
import { searchRepairTypes, resolvePopularRepairTypes } from '../../utils/repairTypeSearch';

export default function RepairServiceSearch({
  repairTypes,
  query,
  onQueryChange,
  onSelectType,
  selectedTypeId,
}) {
  const suggestions = useMemo(
    () => searchRepairTypes(repairTypes, query, { limit: 6 }),
    [repairTypes, query]
  );

  const popularTypes = useMemo(
    () => resolvePopularRepairTypes(repairTypes),
    [repairTypes]
  );

  const showSuggestions = query.trim().length > 0 && suggestions.length > 0;

  return (
    <View style={styles.wrap}>
      <Text variant="titleMedium" style={styles.title}>
        What do you need?
      </Text>
      <TextInput
        mode="outlined"
        value={query}
        onChangeText={onQueryChange}
        placeholder="e.g. oil change, brake noise, AC not cooling..."
        label="Search service or describe problem"
        style={styles.searchInput}
        left={<TextInput.Icon icon="magnify" />}
        right={
          query ? (
            <TextInput.Icon icon="close" onPress={() => onQueryChange('')} />
          ) : undefined
        }
      />

      {showSuggestions ? (
        <View style={styles.suggestions}>
          {suggestions.map((type) => {
            const selected = String(type.id) === String(selectedTypeId);
            return (
              <Pressable
                key={type.id}
                onPress={() => onSelectType(type)}
                style={[styles.suggestionRow, selected && styles.suggestionRowSelected]}
              >
                <Text style={[styles.suggestionName, selected && styles.suggestionNameSelected]}>
                  {type.name}
                </Text>
                {type.category_name ? (
                  <Text
                    style={[styles.suggestionMeta, selected && styles.suggestionMetaSelected]}
                  >
                    {type.category_name}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <Text style={styles.popularLabel}>Popular</Text>
      <View style={styles.chipWrap}>
        {popularTypes.map((type) => {
          const selected = String(type.id) === String(selectedTypeId);
          return (
            <Pressable
              key={type.id}
              onPress={() => onSelectType(type)}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {type.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 4,
  },
  title: {
    color: COLORS.TEXT_DARK,
    fontWeight: '700',
    marginBottom: 4,
  },
  searchInput: {
    backgroundColor: '#fff',
    marginBottom: 4,
  },
  suggestions: {
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.1)',
    borderRadius: 12,
    backgroundColor: '#fff',
    overflow: 'hidden',
    marginBottom: 8,
  },
  suggestionRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(15,23,42,0.08)',
  },
  suggestionRowSelected: {
    backgroundColor: 'rgba(37,99,235,0.1)',
  },
  suggestionName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.TEXT_DARK,
  },
  suggestionNameSelected: {
    color: '#1e40af',
  },
  suggestionMeta: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
    marginTop: 2,
  },
  suggestionMetaSelected: {
    color: '#3b82f6',
  },
  popularLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.TEXT_MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginTop: 4,
    marginBottom: 6,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.25)',
    backgroundColor: 'rgba(37,99,235,0.07)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipSelected: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  chipText: {
    color: '#1e3a8a',
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: '#fff',
  },
});
