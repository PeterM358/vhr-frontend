import React from 'react';
import { StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import DashboardCard from './DashboardCard';

export default function DashboardHeroCard({ title, subtitle, contextLine }) {
  return (
    <DashboardCard style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {contextLine ? <Text style={styles.context}>{contextLine}</Text> : null}
    </DashboardCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: 'rgba(255,255,255,0.78)',
    maxWidth: 520,
  },
  context: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
});
