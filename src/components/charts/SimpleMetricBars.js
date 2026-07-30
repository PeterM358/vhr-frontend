import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import Svg, { Rect } from 'react-native-svg';

const BAR_COLORS = ['#0EA5E9', '#10B981', '#F59E0B', '#8B5CF6'];

/**
 * Simple horizontal-ish vertical bar chart for a few metrics (m² / km / h).
 * bars: [{ key, label, value, color? }]
 */
export default function SimpleMetricBars({ bars = [], height = 140, emptyLabel = 'No data' }) {
  const rows = useMemo(
    () =>
      (Array.isArray(bars) ? bars : []).map((row, index) => ({
        ...row,
        value: Number(row.value) || 0,
        color: row.color || BAR_COLORS[index % BAR_COLORS.length],
      })),
    [bars],
  );
  const max = Math.max(...rows.map((r) => r.value), 0);
  const width = Math.max(rows.length * 56, 160);
  const chartH = height - 28;
  const barW = 28;
  const gap = (width - rows.length * barW) / (rows.length + 1);

  if (!rows.length || max <= 0) {
    return <Text style={styles.empty}>{emptyLabel}</Text>;
  }

  return (
    <View style={styles.wrap}>
      <Svg width={width} height={height}>
        {rows.map((row, index) => {
          const h = max > 0 ? (row.value / max) * (chartH - 8) : 0;
          const x = gap + index * (barW + gap);
          const y = chartH - h;
          return (
            <Rect
              key={row.key}
              x={x}
              y={y}
              width={barW}
              height={Math.max(h, 2)}
              rx={4}
              fill={row.color}
            />
          );
        })}
      </Svg>
      <View style={[styles.labels, { width }]}>
        {rows.map((row) => (
          <View key={row.key} style={styles.labelCell}>
            <Text style={styles.value}>{formatShort(row.value)}</Text>
            <Text style={styles.label}>{row.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function formatShort(n) {
  if (n >= 1000) return `${Math.round(n / 10) / 100}k`;
  if (Number.isInteger(n)) return String(n);
  return String(Math.round(n * 10) / 10);
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 4,
  },
  labelCell: {
    alignItems: 'center',
    minWidth: 48,
  },
  value: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '700',
  },
  label: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  empty: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 16,
  },
});
