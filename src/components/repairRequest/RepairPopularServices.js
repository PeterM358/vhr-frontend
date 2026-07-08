import React, { useMemo } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { COLORS } from '../../constants/colors';
import { resolvePopularRepairTypes } from '../../utils/repairTypeSearch';
import { useTranslation } from '../../i18n';

export default function RepairPopularServices({
  repairTypes,
  selectedTypeId,
  onSelectType,
}) {
  const { t } = useTranslation();
  const popularTypes = useMemo(
    () => resolvePopularRepairTypes(repairTypes),
    [repairTypes]
  );

  if (!popularTypes.length) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{t('requestService.quickPopularServices')}</Text>
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
    marginTop: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.TEXT_MUTED,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
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
