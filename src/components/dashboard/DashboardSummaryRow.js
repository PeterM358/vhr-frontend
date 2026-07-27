import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

export default function DashboardSummaryRow({ items = [], compact = false }) {
  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      <View style={styles.row}>
        {items.map((item, index) => (
          <React.Fragment key={item.key}>
            {compact && index > 0 ? <View style={styles.divider} /> : null}
            <Pressable
              onPress={item.onPress}
              disabled={!item.onPress}
              style={({ pressed }) => [
                styles.cell,
                compact && styles.cellCompact,
                pressed && item.onPress && styles.cellPressed,
              ]}
              accessibilityRole={item.onPress ? 'button' : 'text'}
              accessibilityLabel={`${item.label}: ${item.value}`}
            >
              {compact ? (
                <>
                  <Text style={styles.labelCompact}>{item.label}</Text>
                  <Text style={styles.valueCompact}>{item.value}</Text>
                </>
              ) : (
                <>
                  <Text style={styles.value}>{item.value}</Text>
                  <Text style={styles.label}>{item.label}</Text>
                </>
              )}
            </Pressable>
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(5,15,30,0.64)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 12,
  },
  cardCompact: {
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginVertical: 4,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 10,
  },
  cellCompact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 8,
  },
  cellPressed: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  value: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
  },
  label: {
    color: 'rgba(255,255,255,0.74)',
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  labelCompact: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
  },
  valueCompact: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});