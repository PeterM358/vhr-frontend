import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from '../../constants/colors';

export default function QuickActionChip({ icon, label, onPress, badge }) {
  return (
    <Pressable onPress={onPress} style={styles.chip} accessibilityRole="button">
      <View style={styles.iconWrap}>
        <MaterialCommunityIcons name={icon} size={22} color={COLORS.PRIMARY} />
        {badge > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flex: 1,
    backgroundColor: COLORS.CARD_FLOATING,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    minHeight: 78,
  },
  iconWrap: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  label: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.TEXT_DARK,
    textAlign: 'center',
  },
});
