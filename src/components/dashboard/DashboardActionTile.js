import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Badge, Text } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from '../../constants/colors';

export default function DashboardActionTile({
  icon,
  title,
  subtitle,
  count,
  onPress,
  disabled = false,
  placeholder = false,
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.tile,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        placeholder && styles.placeholder,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
    >
      <View style={styles.iconRow}>
        <MaterialCommunityIcons
          name={icon}
          size={22}
          color={disabled ? COLORS.TEXT_MUTED : COLORS.PRIMARY}
        />
        {count != null && count > 0 ? (
          <Badge style={styles.badge}>{count > 99 ? '99+' : count}</Badge>
        ) : null}
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={styles.subtitle} numberOfLines={3}>
          {subtitle}
        </Text>
      ) : null}
      {placeholder ? <Text style={styles.soon}>Coming soon</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: COLORS.CARD_FLOATING,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    minHeight: 118,
  },
  pressed: {
    opacity: 0.92,
  },
  disabled: {
    opacity: 0.72,
  },
  placeholder: {
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.12)',
    backgroundColor: 'rgba(245,247,250,0.88)',
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  badge: {
    backgroundColor: COLORS.PRIMARY,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
    lineHeight: 16,
  },
  soon: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.PRIMARY,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});
