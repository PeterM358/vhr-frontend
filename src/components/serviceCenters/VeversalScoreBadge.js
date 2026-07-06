import React from 'react';
import { StyleSheet } from 'react-native';
import { Chip } from 'react-native-paper';

export default function VeversalScoreBadge({ score, compact = false }) {
  if (score == null || !Number.isFinite(Number(score))) {
    return null;
  }
  const value = Number(score).toFixed(0);
  return (
    <Chip
      compact={compact}
      icon="star-circle"
      style={styles.chip}
      textStyle={styles.text}
    >
      Veversal {value}
    </Chip>
  );
}

const styles = StyleSheet.create({
  chip: {
    backgroundColor: '#fef3c7',
    height: 26,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400e',
  },
});
