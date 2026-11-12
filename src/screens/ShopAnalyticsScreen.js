import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import ScreenBackground from '../components/ScreenBackground';
import PartnerAppHeader from '../components/partner/PartnerAppHeader';
import AppCard from '../components/ui/AppCard';
import SimpleMetricBars from '../components/charts/SimpleMetricBars';
import ErpAccessGate from '../components/erp/ErpAccessGate';
import useShopErpContext from '../hooks/useShopErpContext';
import { usePartnerDashboardBack } from '../navigation/appNavBarBack';
import { useScrollShadow } from '../hooks/useScrollShadow';
import { getOwnerAnalyticsSummary } from '../api/erp';
import { formatMoneyMinor } from '../constants/currency';
import { COLORS } from '../constants/colors';
import { useTranslation } from '../i18n';

function monthBounds(offsetMonths = 0) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + offsetMonths;
  const start = new Date(y, m, 1);
  const end = new Date(y, m + 1, 0);
  const iso = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { from: iso(start), to: iso(end) };
}

function monthLabel(ym, locale) {
  const [y, m] = String(ym || '').split('-').map(Number);
  if (!y || !m) return ym;
  try {
    return new Date(y, m - 1, 1).toLocaleDateString(locale || undefined, {
      month: 'short',
    });
  } catch {
    return ym;
  }
}

export default function ShopAnalyticsScreen() {
  const onBack = usePartnerDashboardBack();
  const { t, locale } = useTranslation();
  const { loading, shopProfile, membership, shopId, error } = useShopErpContext();
  const { scrolled, onScroll, scrollEventThrottle } = useScrollShadow();
  const [period, setPeriod] = useState('month');
  const [summary, setSummary] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [fetching, setFetching] = useState(false);

  const periodParams = useMemo(() => {
    if (period === 'prev') {
      const b = monthBounds(-1);
      return { date_from: b.from, date_to: b.to, months: 6 };
    }
    if (period === 'month') {
      const b = monthBounds(0);
      return { date_from: b.from, date_to: b.to, months: 6 };
    }
    const end = monthBounds(0);
    const start = monthBounds(-5);
    return { date_from: start.from, date_to: end.to, months: 6 };
  }, [period]);

  const load = useCallback(async () => {
    if (!shopId) return;
    setLoadError('');
    setFetching(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const data = await getOwnerAnalyticsSummary(token, shopId, periodParams);
      setSummary(data);
    } catch (e) {
      setSummary(null);
      setLoadError(e.message || t('erp.common.error'));
    } finally {
      setFetching(false);
    }
  }, [shopId, periodParams, t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const revenueMinor = Number(summary?.revenue?.header_total_sales_minor) || 0;
  const completed = Number(summary?.completed_repairs) || 0;
  const billableHours = Number(summary?.labor?.billable_hours) || 0;
  const laborEntries = Number(summary?.labor?.entry_count) || 0;

  const monthlyBars = useMemo(() => {
    const rows = Array.isArray(summary?.monthly) ? summary.monthly : [];
    return rows.map((row) => ({
      key: row.month,
      label: monthLabel(row.month, locale),
      value: (Number(row.revenue_minor) || 0) / 100,
    }));
  }, [summary?.monthly, locale]);

  const repairBars = useMemo(() => {
    const rows = Array.isArray(summary?.monthly) ? summary.monthly : [];
    return rows.map((row) => ({
      key: `r-${row.month}`,
      label: monthLabel(row.month, locale),
      value: Number(row.completed_repairs) || 0,
      color: '#10B981',
    }));
  }, [summary?.monthly, locale]);

  const periodChips = [
    { key: 'month', label: t('erp.analytics.periodThisMonth') },
    { key: 'prev', label: t('erp.analytics.periodLastMonth') },
    { key: 'all', label: t('erp.analytics.periodLastSix') },
  ];

  return (
    <ErpAccessGate
      routeName="ShopAnalytics"
      shopProfile={shopProfile}
      membership={membership}
      loading={loading}
      error={error}
      onBack={onBack}
      title={t('erp.analytics.title')}
    >
      <ScreenBackground safeArea={false}>
        <PartnerAppHeader
          title={t('erp.analytics.title')}
          onBack={onBack}
          iconOnlyBack
          scrolled={scrolled}
        />
        <ScrollView
          onScroll={onScroll}
          scrollEventThrottle={scrollEventThrottle}
          contentContainerStyle={styles.content}
        >
          <Text style={styles.lead}>{t('erp.analytics.lead')}</Text>

          <View style={styles.chipRow}>
            {periodChips.map((chip) => {
              const active = period === chip.key;
              return (
                <Pressable
                  key={chip.key}
                  onPress={() => setPeriod(chip.key)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {chip.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {fetching && !summary ? (
            <ActivityIndicator color={COLORS.PRIMARY} style={{ marginTop: 24 }} />
          ) : null}
          {loadError ? <Text style={styles.error}>{loadError}</Text> : null}

          {summary ? (
            <>
              <View style={styles.kpiRow}>
                <AppCard style={styles.kpiCard}>
                  <Text style={styles.kpiLabel}>{t('erp.analytics.completedRepairs')}</Text>
                  <Text style={styles.kpiValue}>{completed}</Text>
                </AppCard>
                <AppCard style={styles.kpiCard}>
                  <Text style={styles.kpiLabel}>{t('erp.analytics.revenue')}</Text>
                  <Text style={styles.kpiValue}>
                    {formatMoneyMinor(revenueMinor, 'EUR') || '—'}
                  </Text>
                </AppCard>
              </View>
              <View style={styles.kpiRow}>
                <AppCard style={styles.kpiCard}>
                  <Text style={styles.kpiLabel}>{t('erp.analytics.billableHours')}</Text>
                  <Text style={styles.kpiValue}>{billableHours}</Text>
                </AppCard>
                <AppCard style={styles.kpiCard}>
                  <Text style={styles.kpiLabel}>{t('erp.analytics.laborEntries')}</Text>
                  <Text style={styles.kpiValue}>{laborEntries}</Text>
                </AppCard>
              </View>

              <AppCard style={styles.chartCard}>
                <Text style={styles.chartTitle}>{t('erp.analytics.monthlyRevenue')}</Text>
                <Text style={styles.chartHint}>{t('erp.analytics.monthlyRevenueHint')}</Text>
                <SimpleMetricBars
                  bars={monthlyBars}
                  height={150}
                  emptyLabel={t('erp.analytics.chartEmpty')}
                />
              </AppCard>

              <AppCard style={styles.chartCard}>
                <Text style={styles.chartTitle}>{t('erp.analytics.monthlyRepairs')}</Text>
                <SimpleMetricBars
                  bars={repairBars}
                  height={150}
                  emptyLabel={t('erp.analytics.chartEmpty')}
                />
              </AppCard>
            </>
          ) : null}

          {!fetching && !summary && !loadError ? (
            <AppCard>
              <Text style={styles.emptyTitle}>{t('erp.analytics.emptyTitle')}</Text>
              <Text style={styles.emptyBody}>{t('erp.analytics.emptyBody')}</Text>
            </AppCard>
          ) : null}
        </ScrollView>
      </ScreenBackground>
    </ErpAccessGate>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },
  lead: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 14,
    lineHeight: 20,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  chipActive: {
    backgroundColor: COLORS.PRIMARY,
    borderColor: COLORS.PRIMARY,
  },
  chipText: {
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
    fontSize: 13,
  },
  chipTextActive: {
    color: '#fff',
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
  },
  kpiCard: {
    flex: 1,
    gap: 4,
  },
  kpiLabel: {
    color: COLORS.TEXT_MUTED,
    fontSize: 12,
    fontWeight: '600',
  },
  kpiValue: {
    color: COLORS.TEXT_DARK,
    fontSize: 20,
    fontWeight: '800',
  },
  chartCard: {
    gap: 6,
  },
  chartTitle: {
    color: COLORS.TEXT_DARK,
    fontSize: 15,
    fontWeight: '700',
  },
  chartHint: {
    color: COLORS.TEXT_MUTED,
    fontSize: 12,
    marginBottom: 4,
  },
  error: {
    color: '#fecaca',
  },
  emptyTitle: {
    color: COLORS.TEXT_DARK,
    fontWeight: '700',
    fontSize: 16,
  },
  emptyBody: {
    marginTop: 6,
    color: COLORS.TEXT_MUTED,
    lineHeight: 20,
  },
});
