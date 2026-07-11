import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Badge, Text } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from '../../constants/colors';

function ActionTile({ icon, title, subtitle, count, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
      accessibilityRole="button"
    >
      <View style={styles.iconRow}>
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons name={icon} size={22} color="#93c5fd" />
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
    </Pressable>
  );
}

export default function DashboardActionGrid({ tiles = [] }) {
  if (!tiles.length) return null;

  const rows = [];
  for (let i = 0; i < tiles.length; i += 2) {
    rows.push(tiles.slice(i, i + 2));
  }

  return (
    <View style={styles.wrap}>
      {rows.map((row, rowIndex) => (
        <View key={`grid-row-${rowIndex}`} style={styles.row}>
          {row.map(({ key, ...tile }) => (
            <ActionTile key={key} {...tile} />
          ))}
          {row.length === 1 ? <View style={styles.spacer} /> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 18,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  spacer: {
    flex: 1,
  },
  tile: {
    flex: 1,
    minWidth: '46%',
    minHeight: 112,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: COLORS.CARD_DARK,
    borderWidth: 1,
    borderColor: COLORS.BORDER_SOFT,
  },
  pressed: {
    opacity: 0.9,
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
    backgroundColor: 'rgba(37,99,235,0.16)',
  },
  badge: {
    backgroundColor: COLORS.PRIMARY,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 16,
    color: 'rgba(255,255,255,0.62)',
  },
});
