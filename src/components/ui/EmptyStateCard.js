// PATH: src/components/ui/EmptyStateCard.js
//
// Empty list placeholder — soft FloatingCard (no full-width white sheet).

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import FloatingCard from './FloatingCard';
import { COLORS } from '../../constants/colors';

export default function EmptyStateCard({
  title,
  subtitle,
  icon = 'information-outline',
  style,
}) {
  return (
    <FloatingCard accent={false} style={[styles.wrap, style]}>
      <View style={styles.iconWrap}>
        <MaterialCommunityIcons name={icon} size={26} color={COLORS.PRIMARY} />
      </View>
      {!!title && <Text style={styles.title}>{title}</Text>}
      {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </FloatingCard>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: 22,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(37,99,235,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  title: {
    color: COLORS.TEXT_DARK,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    color: COLORS.TEXT_MUTED,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
