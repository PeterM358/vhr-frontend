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
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons
            name={icon}
            size={22}
            color={disabled ? 'rgba(255,255,255,0.4)' : COLORS.ACCENT}
          />
        </View>
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
    backgroundColor: COLORS.CARD_DARK,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.BORDER_SOFT,
    padding: 14,
    marginBottom: 10,
    minHeight: 118,
  },
  pressed: {
    opacity: 0.9,
  },
  disabled: {
    opacity: 0.72,
  },
  placeholder: {
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(5,15,30,0.5)',
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.PRIMARY_GLASS,
  },
  badge: {
    backgroundColor: COLORS.ACCENT,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.62)',
    lineHeight: 16,
  },
  soon: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.ACCENT,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});
