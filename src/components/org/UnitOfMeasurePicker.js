import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

const ON_CARD = '#0F172A';
const ON_CARD_MUTED = '#475569';

/** Prefer localized name (BG/EN) over English catalog symbol like "pc". */
export function unitDisplayLabel(unit, locale = 'en') {
  if (!unit) return '';
  const loc = String(locale || 'en').toLowerCase();
  if (loc.startsWith('bg')) {
    return unit.name_bg || unit.symbol || unit.name || unit.name_en || unit.code || '';
  }
  return unit.name_en || unit.name || unit.symbol || unit.code || '';
}

/**
 * Chip select for units-of-measure (operations or materials catalog).
 * Prefer unit id when available; falls back to code.
 */
export default function UnitOfMeasurePicker({
  units = [],
  valueCode = '',
  valueId = null,
  onChange,
  disabled = false,
  emptyLabel = 'No units',
  locale = 'en',
}) {
  const list = Array.isArray(units) ? units.filter((u) => u && u.is_active !== false) : [];

  if (!list.length) {
    return (
      <Text style={styles.empty}>{emptyLabel}</Text>
    );
  }

  return (
    <View style={styles.row}>
      {list.map((unit) => {
        const selected =
          (valueId != null && Number(valueId) === Number(unit.id)) ||
          (valueCode &&
            String(valueCode).toLowerCase() === String(unit.code || '').toLowerCase()) ||
          (valueCode &&
            String(valueCode).toLowerCase() === String(unit.symbol || '').toLowerCase());
        return (
          <Pressable
            key={unit.id || unit.code}
            disabled={disabled}
            onPress={() =>
              onChange?.({
                id: unit.id,
                code: unit.code,
                symbol: unit.symbol || unit.name || unit.code,
                unit,
              })
            }
            style={[
              styles.chip,
              selected && styles.chipSelected,
              disabled && styles.chipDisabled,
            ]}
          >
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
              {unitDisplayLabel(unit, locale)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#F8FAFC',
  },
  chipSelected: {
    borderColor: '#0F766E',
    backgroundColor: '#CCFBF1',
  },
  chipDisabled: {
    opacity: 0.5,
  },
  chipText: {
    color: ON_CARD_MUTED,
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: ON_CARD,
  },
  empty: {
    color: ON_CARD_MUTED,
    fontSize: 13,
    marginBottom: 8,
  },
});
