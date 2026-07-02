import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import FloatingCard from '../ui/FloatingCard';
import { COLORS } from '../../constants/colors';

/**
 * Explanatory empty state — no CTA (primary actions live in the hero / FAB).
 */
export default function DashboardEmptyState({ title, body, style }) {
  return (
    <FloatingCard accent={false} style={[styles.card, style]}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {body ? <Text style={styles.body}>{body}</Text> : null}
    </FloatingCard>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'stretch',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
    marginBottom: 6,
    textAlign: 'center',
  },
  body: {
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
    lineHeight: 20,
    textAlign: 'center',
  },
});
