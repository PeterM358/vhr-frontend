import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

function ActionTile({ icon, title, subtitle, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
      accessibilityRole="button"
    >
      <View style={styles.iconWrap}>
        <MaterialCommunityIcons name={icon} size={22} color="#93c5fd" />
      </View>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <Text style={styles.subtitle} numberOfLines={2}>
        {subtitle}
      </Text>
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
          {row.map((tile) => (
            <ActionTile key={tile.key} {...tile} />
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
    minHeight: 112,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: 'rgba(5,15,30,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  pressed: {
    opacity: 0.9,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(37,99,235,0.16)',
    marginBottom: 10,
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
