import React, { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from '../../constants/colors';
import { DEFAULT_CURRENCY } from '../../constants/currency';
import {
  confidenceTone,
  formatForecastMinor,
  formatKm,
  hasForecastContent,
} from '../../utils/vehicleForecast';

function ConfidencePill({ confidence }) {
  const tone = confidenceTone(confidence);
  return (
    <View style={[styles.pill, { backgroundColor: tone.bg }]}>
      <Text style={[styles.pillText, { color: tone.fg }]}>{confidence || 'low'} confidence</Text>
    </View>
  );
}

export default function VehicleForecastCard({ forecast, loading, expanded, onToggleExpanded }) {
  const currency = forecast?.currency || DEFAULT_CURRENCY;
  const showCard = loading || hasForecastContent(forecast);

  const usageLine = useMemo(() => {
    const usage = forecast?.usage;
    if (!usage?.km_per_year) return null;
    return `~${Number(usage.km_per_year).toLocaleString()} km/year`;
  }, [forecast]);

  const spendLine = useMemo(() => {
    const own = forecast?.own_spend;
    if (!own?.forecast_maintenance_minor) return null;
    const months = forecast?.horizon_months || 12;
    const range = own.forecast_range_minor;
    if (Array.isArray(range) && range[0] != null && range[1] != null) {
      return `${formatForecastMinor(range[0], currency)} – ${formatForecastMinor(range[1], currency)} over ${months} mo (your history)`;
    }
    return `${formatForecastMinor(own.forecast_maintenance_minor, currency)} over ${months} mo (your history)`;
  }, [forecast, currency]);

  const cohortLabel = useMemo(() => {
    const c = forecast?.cohort;
    if (!c?.make_name && !c?.model_name) return null;
    return [c.make_name, c.model_name].filter(Boolean).join(' ');
  }, [forecast]);

  const upcoming = Array.isArray(forecast?.upcoming_services) ? forecast.upcoming_services.slice(0, 5) : [];

  if (!showCard) return null;

  return (
    <View style={styles.card}>
      <Pressable
        onPress={onToggleExpanded}
        style={({ pressed }) => [styles.header, pressed && styles.headerPressed]}
        accessibilityRole="button"
        accessibilityState={{ expanded: !!expanded }}
      >
        <View style={styles.headerLeft}>
          <MaterialCommunityIcons name="chart-timeline-variant" size={22} color={COLORS.PRIMARY} />
          <Text style={styles.title}>Maintenance forecast</Text>
        </View>
        <MaterialCommunityIcons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={22}
          color="#64748B"
        />
      </Pressable>

      {loading ? (
        <ActivityIndicator style={styles.loader} color={COLORS.PRIMARY} />
      ) : null}

      {!loading && expanded ? (
        <View style={styles.body}>
          <Text style={styles.disclaimer}>{forecast?.disclaimer}</Text>

          {usageLine ? (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Your usage</Text>
              <View style={styles.rowRight}>
                <Text style={styles.rowValue}>{usageLine}</Text>
                <ConfidencePill confidence={forecast?.usage?.confidence} />
              </View>
            </View>
          ) : null}

          {spendLine ? (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Spend estimate</Text>
              <Text style={styles.rowValueMultiline}>{spendLine}</Text>
            </View>
          ) : null}

          {forecast?.fleet?.km_per_year_median != null ? (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Fleet ({forecast.fleet.fleet_id})</Text>
              <Text style={styles.rowValue}>
                Median {Number(forecast.fleet.km_per_year_median).toLocaleString()} km/year
                {forecast.fleet.this_vehicle_km_per_year != null
                  ? ` · yours ${Number(forecast.fleet.this_vehicle_km_per_year).toLocaleString()}`
                  : ''}
              </Text>
            </View>
          ) : null}

          {cohortLabel && forecast?.cohort?.available ? (
            <Text style={styles.cohortHeading}>
              Similar vehicles: {cohortLabel}
              {forecast.cohort.vehicle_type_code ? ` (${forecast.cohort.vehicle_type_code})` : ''}
            </Text>
          ) : null}

          {upcoming.length > 0 ? (
            <View style={styles.upcomingBlock}>
              <Text style={styles.subheading}>Likely upcoming</Text>
              {upcoming.map((row) => (
                <View key={row.family} style={styles.upcomingRow}>
                  <View style={styles.upcomingTop}>
                    <Text style={styles.upcomingTitle}>{row.family_label || row.family}</Text>
                    <ConfidencePill confidence={row.confidence} />
                  </View>
                  <Text style={styles.upcomingMeta}>
                    {row.km_remaining > 0
                      ? `In about ${formatKm(row.km_remaining)}`
                      : 'Due now or overdue (estimate)'}
                    {row.estimated_due_km != null ? ` · typical near ${formatKm(row.estimated_due_km)}` : ''}
                    {row.estimated_date ? ` · ~${row.estimated_date}` : ''}
                  </Text>
                  {row.estimated_cost_minor != null ? (
                    <Text style={styles.upcomingCost}>
                      Typical cost {formatForecastMinor(row.estimated_cost_minor, currency)}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          ) : forecast?.cohort?.reason === 'insufficient_cohort_data' ? (
            <Text style={styles.muted}>
              Not enough similar vehicles on the platform yet for model-specific intervals.
            </Text>
          ) : null}
        </View>
      ) : null}

      {!loading && !expanded && usageLine ? (
        <Text style={styles.collapsedHint} numberOfLines={2}>
          {usageLine}
          {upcoming[0]?.family_label
            ? ` · Next likely: ${upcoming[0].family_label}`
            : ''}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 4,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  headerPressed: { opacity: 0.85 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 16, fontWeight: '600', color: '#0F172A' },
  loader: { marginVertical: 8 },
  body: { paddingTop: 4, paddingBottom: 8, gap: 10 },
  disclaimer: { fontSize: 12, lineHeight: 17, color: '#64748B' },
  row: { gap: 4 },
  rowLabel: { fontSize: 12, fontWeight: '600', color: '#64748B', textTransform: 'uppercase' },
  rowRight: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  rowValue: { fontSize: 15, color: '#0F172A' },
  rowValueMultiline: { fontSize: 15, color: '#0F172A', lineHeight: 21 },
  cohortHeading: { fontSize: 14, fontWeight: '600', color: '#334155', marginTop: 4 },
  subheading: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 4 },
  upcomingBlock: { gap: 10, marginTop: 4 },
  upcomingRow: {
    backgroundColor: 'rgba(248,250,252,0.95)',
    borderRadius: 10,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(148,163,184,0.35)',
  },
  upcomingTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  upcomingTitle: { fontSize: 15, fontWeight: '600', color: '#0F172A', flex: 1 },
  upcomingMeta: { fontSize: 13, color: '#475569', marginTop: 4, lineHeight: 18 },
  upcomingCost: { fontSize: 13, color: '#334155', marginTop: 4, fontWeight: '500' },
  pill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  pillText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  muted: { fontSize: 13, color: '#64748B', lineHeight: 18 },
  collapsedHint: { fontSize: 13, color: '#475569', paddingBottom: 4 },
});
