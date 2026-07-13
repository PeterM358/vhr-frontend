import React from 'react';
import { StyleSheet, View } from 'react-native';
import QuickActionChip from './QuickActionChip';

export default function DashboardQuickActions({ actions = [] }) {
  if (!actions.length) return null;

  const rows = [];
  for (let i = 0; i < actions.length; i += 4) {
    rows.push(actions.slice(i, i + 4));
  }

  return (
    <View style={styles.wrap}>
      {rows.map((row, rowIndex) => (
        <View key={`qa-${rowIndex}`} style={styles.row}>
          {row.map(({ key, ...action }) => (
            <QuickActionChip key={key} {...action} />
          ))}
          {row.length < 4
            ? Array.from({ length: 4 - row.length }).map((_, i) => (
                <View key={`spacer-${rowIndex}-${i}`} style={styles.spacer} />
              ))
            : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 8,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  spacer: {
    flex: 1,
  },
});
