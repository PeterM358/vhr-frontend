import React, { useMemo } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { COLORS } from '../../constants/colors';
import { searchRepairTypes } from '../../utils/repairTypeSearch';
import { useTranslation } from '../../i18n';

export default function RepairProblemInput({
  value,
  onChangeText,
  repairTypes,
  selectedTypeId,
  onSelectType,
}) {
  const { t } = useTranslation();
  const suggestions = useMemo(
    () => searchRepairTypes(repairTypes, value, { limit: 6 }),
    [repairTypes, value]
  );

  const showSuggestions = value.trim().length > 0 && suggestions.length > 0;

  return (
    <View style={styles.wrap}>
      <Text variant="titleMedium" style={styles.title}>
        {t('requestService.whatIsProblem')}
      </Text>
      <TextInput
        mode="outlined"
        value={value}
        onChangeText={onChangeText}
        placeholder={t('requestService.problemPlaceholder')}
        multiline
        numberOfLines={3}
        style={styles.input}
      />

      {showSuggestions ? (
        <View style={styles.suggestionsWrap}>
          <Text style={styles.suggestionsLabel}>{t('requestService.suggestedServices')}</Text>
          <View style={styles.chipWrap}>
            {suggestions.map((type) => {
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
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6,
  },
  title: {
    color: COLORS.TEXT_DARK,
    fontWeight: '700',
    marginBottom: 2,
  },
  input: {
    backgroundColor: '#fff',
    minHeight: 88,
  },
  suggestionsWrap: {
    marginTop: 4,
  },
  suggestionsLabel: {
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
    borderColor: 'rgba(15,76,129,0.25)',
    backgroundColor: 'rgba(15,76,129,0.07)',
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
