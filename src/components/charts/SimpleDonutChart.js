import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import Svg, { Circle, G, Path } from 'react-native-svg';

const DEFAULT_COLORS = ['#0EA5E9', '#F59E0B', '#10B981', '#8B5CF6', '#64748B', '#EF4444'];

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

/**
 * Lightweight donut/pie from share slices — uses react-native-svg only.
 * slices: [{ key, label, value, color? }]
 */
export default function SimpleDonutChart({
  slices = [],
  size = 200,
  strokeWidth = 36,
  emptyLabel = 'No data',
  centerLabel = '',
  centerSubLabel = '',
}) {
  const positive = useMemo(
    () =>
      (Array.isArray(slices) ? slices : [])
        .map((row, index) => ({
          ...row,
          value: Number(row.value) || 0,
          color: row.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
        }))
        .filter((row) => row.value > 0),
    [slices],
  );

  const total = positive.reduce((sum, row) => sum + row.value, 0);
  const cx = size / 2;
  const cy = size / 2;
  const r = (size - strokeWidth) / 2;

  let angle = 0;
  const arcs = positive.map((row) => {
    const sweep = total > 0 ? (row.value / total) * 360 : 0;
    const start = angle;
    const end = angle + sweep;
    angle = end;
    // Full circle special-case: SVG arc of 360 is empty.
    if (sweep >= 359.9) {
      return {
        ...row,
        full: true,
        start,
        end,
      };
    }
    return {
      ...row,
      full: false,
      d: describeArc(cx, cy, r, start, end),
      start,
      end,
    };
  });

  return (
    <View style={styles.wrap}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          {total <= 0 ? (
            <Circle
              cx={cx}
              cy={cy}
              r={r}
              stroke="#CBD5E1"
              strokeWidth={strokeWidth}
              fill="none"
            />
          ) : (
            <G>
              {arcs.map((arc) =>
                arc.full ? (
                  <Circle
                    key={arc.key}
                    cx={cx}
                    cy={cy}
                    r={r}
                    stroke={arc.color}
                    strokeWidth={strokeWidth}
                    fill="none"
                  />
                ) : (
                  <Path
                    key={arc.key}
                    d={arc.d}
                    stroke={arc.color}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeLinecap="butt"
                  />
                ),
              )}
            </G>
          )}
        </Svg>
        <View style={[styles.center, { width: size, height: size }]} pointerEvents="none">
          {total <= 0 ? (
            <Text style={styles.empty}>{emptyLabel}</Text>
          ) : (
            <>
              {centerLabel ? <Text style={styles.centerMain}>{centerLabel}</Text> : null}
              {centerSubLabel ? <Text style={styles.centerSub}>{centerSubLabel}</Text> : null}
            </>
          )}
        </View>
      </View>
      <View style={styles.legend}>
        {positive.map((row) => {
          const pct = total > 0 ? Math.round((row.value / total) * 1000) / 10 : 0;
          return (
            <View key={row.key} style={styles.legendRow}>
              <View style={[styles.swatch, { backgroundColor: row.color }]} />
              <Text style={styles.legendText}>
                {row.label}: {pct}%
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 14,
  },
  center: {
    position: 'absolute',
    left: 0,
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  centerMain: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  centerSub: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
    textAlign: 'center',
  },
  empty: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
  },
  legend: {
    alignSelf: 'stretch',
    gap: 6,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  swatch: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  legendText: {
    color: '#334155',
    fontSize: 13,
  },
});
