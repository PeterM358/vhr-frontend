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
}) {
  return (
    <FloatingCard>
      <Pressable onPress={onToggle} style={styles.header}>
        <Text style={styles.title}>{title}</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  title: {
    color: COLORS.TEXT_DARK,
    fontWeight: '700',
    fontSize: 17,
    flex: 1,
  },
  body: {
    marginTop: 8,
    paddingTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(15,23,42,0.08)',
  },
});
