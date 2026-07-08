import React from 'react';
import { View, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { COLORS } from '../../constants/colors';
import { formatPreferredVisitNote } from '../../utils/shopVisitSlots';
import { useTranslation } from '../../i18n';

export default function PreferredVisitPicker({
  visitDays,
  visitDayOffset,
  onDayChange,
  visitTimeSlots,
  visitTimeSlot,
  onTimeChange,
  selectedVisitDay,
}) {
  const { t } = useTranslation();

  return (
    <View style={styles.wrap}>
      <Text variant="labelLarge" style={styles.label}>
        {t('repairs.preferredVisit')}
      </Text>
      <Text style={styles.hint}>
        {t('requestService.preferredVisitHint')}
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.dayScroll}
        contentContainerStyle={styles.chipRow}
      >
        {visitDays.map((day) => {
          const selected = day.offset === visitDayOffset;
          return (
            <Pressable
              key={day.offset}
              onPress={() => onDayChange(day.offset)}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {day.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.timeScroll}
        contentContainerStyle={styles.chipRow}
      >
        {visitTimeSlots.map((slot) => {
          const selected = slot === visitTimeSlot;
          return (
            <Pressable
              key={slot}
              onPress={() => onTimeChange(slot)}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {slot}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {selectedVisitDay ? (
        <Text style={styles.summary}>
          {formatPreferredVisitNote(selectedVisitDay, visitTimeSlot, t)}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 4,
  },
  label: {
    fontWeight: '600',
    color: COLORS.TEXT_DARK,
    marginBottom: 4,
  },
  hint: {
    color: COLORS.TEXT_MUTED,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  dayScroll: {
    marginBottom: 6,
  },
  timeScroll: {
    marginBottom: 4,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 8,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(37,99,235,0.25)',
    backgroundColor: 'rgba(37,99,235,0.07)',
    paddingHorizontal: 14,
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
  summary: {
    color: COLORS.TEXT_MUTED,
    fontSize: 12,
    marginTop: 6,
  },
});
