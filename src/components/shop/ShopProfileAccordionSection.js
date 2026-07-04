import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import FloatingCard from '../ui/FloatingCard';
import { COLORS } from '../../constants/colors';

export default function ShopProfileAccordionSection({
  title,
  expanded,
  onToggle,
  children,
  needsAttention = false,
}) {
  return (
    <FloatingCard style={needsAttention ? styles.attentionCard : null}>
      <Pressable onPress={onToggle} style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {needsAttention ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Required</Text>
          </View>
        ) : null}
        <MaterialCommunityIcons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={22}
          color={COLORS.TEXT_MUTED}
        />
      </Pressable>
      {expanded ? <View style={styles.body}>{children}</View> : null}
    </FloatingCard>
  );
}

const styles = StyleSheet.create({
  attentionCard: {
    borderWidth: 1,
    borderColor: '#f59e0b',
    backgroundColor: '#fffbeb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    gap: 8,
  },
  title: {
    color: COLORS.TEXT_DARK,
    fontWeight: '700',
    fontSize: 17,
    flex: 1,
  },
  badge: {
    backgroundColor: '#fde68a',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  badgeText: {
    color: '#92400e',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  body: {
    marginTop: 8,
    paddingTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(15,23,42,0.08)',
  },
});
