import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import FloatingCard from '../ui/FloatingCard';
import { COLORS } from '../../constants/colors';

export default function RecommendedActionsSection({ actions = [], onActionPress }) {
  if (!actions.length) return null;

  return (
    <View style={styles.list}>
      {actions.map((item) => (
        <FloatingCard key={item.id} style={styles.card}>
          <View style={styles.row}>
            <View style={styles.copy}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.vehicle} numberOfLines={1}>
                {item.vehicleName}
              </Text>
            </View>
            <Button
              mode="contained-tonal"
              compact
              onPress={() => onActionPress?.(item)}
              style={styles.cta}
              labelStyle={styles.ctaLabel}
            >
              {item.cta}
            </Button>
          </View>
        </FloatingCard>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 0,
  },
  card: {
    marginBottom: 10,
    paddingVertical: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
  },
  vehicle: {
    marginTop: 3,
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
  },
  cta: {
    borderRadius: 10,
    flexShrink: 0,
  },
  ctaLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
});
