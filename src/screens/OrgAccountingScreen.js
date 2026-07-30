import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, Button, Text } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';

import ScreenBackground from '../components/ScreenBackground';
import AppCard from '../components/ui/AppCard';
import OrgAppHeader from '../components/org/OrgAppHeader';
import ServiceRecordDatePicker from '../components/vehicle/ServiceRecordDatePicker';
import SimpleDonutChart from '../components/charts/SimpleDonutChart';
import SimpleMetricBars from '../components/charts/SimpleMetricBars';
import { getAccountingSummary, listWorkOrders } from '../api/orgOperations';
import { resolveActiveOrganizationId } from '../utils/orgWorkspace';
import {
  navigateToOrgHome,
  navigateToOrgInvoicing,
  navigateToOrgWarehouse,
  navigateToOrgWorkforce,
} from '../navigation/webNavigation';
import { useTranslation } from '../i18n';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { useScrollContentBottomPadding } from '../utils/mobileWebInsets';

const ON_CARD = '#0F172A';
const ON_CARD_MUTED = '#475569';

const COST_COLORS = {
  materials: '#10B981',
  workforce: '#0EA5E9',
  task_expenses: '#8B5CF6',
  other: '#8B5CF6',
  fleet: '#F59E0B',
  services: '#64748B',
  facility: '#94A3B8',
  utilities: '#CBD5E1',
};

const REVENUE_COLOR = '#059669';

function currentMonthIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function monthBounds(monthIso) {
  if (!monthIso || !/^\d{4}-\d{2}$/.test(monthIso)) return { from: '', to: '' };
  const [y, m] = monthIso.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  const mm = String(m).padStart(2, '0');
  return {
    from: `${y}-${mm}-01`,
    to: `${y}-${mm}-${String(last).padStart(2, '0')}`,
  };
}

function formatMoney(amount, currency = 'BGN') {
  if (amount == null || amount === '') return '—';
  const n = Number(amount);
  if (!Number.isFinite(n)) return `${amount} ${currency}`;
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currency}`;
}

export default function OrgAccountingScreen({ navigation, route }) {
  const { t } = useTranslation();
  const routeOrgId = route?.params?.organizationId || route?.params?.orgId;
  const scrollBottomPadding = useScrollContentBottomPadding(40);

  const [orgId, setOrgId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState(null);
  const [uninvoicedCount, setUninvoicedCount] = useState(0);
  const [month, setMonth] = useState(currentMonthIso());
  const [filterFrom, setFilterFrom] = useState(() => monthBounds(currentMonthIso()).from);
  const [filterTo, setFilterTo] = useState(() => monthBounds(currentMonthIso()).to);

  const onBack = useCallback(() => {
    navigateToOrgHome(navigation, { orgId: routeOrgId || orgId });
  }, [navigation, orgId, routeOrgId]);

  const applyMonth = useCallback((monthIso) => {
    setMonth(monthIso);
    const bounds = monthBounds(monthIso);
    setFilterFrom(bounds.from);
    setFilterTo(bounds.to);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const resolved = await resolveActiveOrganizationId(routeOrgId);
      setOrgId(resolved);
      if (!resolved) {
        setError(t('org.accounting.loadError', null, 'Could not load accounting.'));
        setSummary(null);
        return;
      }
      const params = {};
      if (filterFrom) params.from = filterFrom;
      if (filterTo) params.to = filterTo;
      const [data, jobsRes] = await Promise.all([
        getAccountingSummary(token, resolved, params),
        listWorkOrders(token, resolved, { status: 'done', uninvoiced: true }).catch(() => ({
          results: [],
        })),
      ]);
      setSummary(data);
      setUninvoicedCount(Array.isArray(jobsRes?.results) ? jobsRes.results.length : 0);
    } catch (e) {
      setError(e.message || t('org.accounting.loadError', null, 'Could not load accounting.'));
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [filterFrom, filterTo, routeOrgId, t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const currency = summary?.totals?.currency || 'BGN';

  const costLabel = useCallback(
    (key, fallback) => {
      const map = {
        materials: t('org.accounting.shares.materials', null, 'Materials'),
        workforce: t('org.accounting.shares.workforce', null, 'Workforce'),
        task_expenses: t('org.accounting.shares.taskExpenses', null, 'Task expenses'),
        other: t('org.accounting.shares.other', null, 'Other expenses'),
        fleet: t('org.accounting.shares.fleet', null, 'Fleet maintenance'),
        services: t('org.accounting.shares.services', null, 'Services'),
        facility: t('org.accounting.shares.facility', null, 'Facility rent'),
        utilities: t('org.accounting.shares.utilities', null, 'Utilities'),
      };
      return map[key] || fallback || key;
    },
    [t],
  );

  const costPieSlices = useMemo(() => {
    const rows = Array.isArray(summary?.cost_breakdown)
      ? summary.cost_breakdown
      : Array.isArray(summary?.cost_shares)
        ? summary.cost_shares
        : [];
    return rows
      .filter((row) => !row.stub)
      .map((row) => ({
        key: row.key,
        label: costLabel(row.key, row.label),
        value: Number(row.amount) || 0,
        color: COST_COLORS[row.key],
      }));
  }, [summary, costLabel]);

  const periodCompareBars = useMemo(() => {
    if (!summary) return [];
    const liveCosts = (Array.isArray(summary.cost_breakdown) ? summary.cost_breakdown : [])
      .filter((row) => !row.stub && Number(row.amount) > 0)
      .map((row) => ({
        key: `cost-${row.key}`,
        label: costLabel(row.key, row.label),
        value: Number(row.amount) || 0,
        color: COST_COLORS[row.key] || '#64748B',
      }));
    const revenue = Number(summary.totals?.revenue_amount ?? summary.issued_invoices?.amount) || 0;
    const bars = [...liveCosts];
    if (revenue > 0 || liveCosts.length) {
      bars.push({
        key: 'revenue',
        label: t('org.accounting.bars.revenue', null, 'Issued invoices'),
        value: revenue,
        color: REVENUE_COLOR,
      });
    }
    return bars;
  }, [summary, costLabel, t]);

  const stubCostRows = useMemo(() => {
    const rows = Array.isArray(summary?.cost_breakdown) ? summary.cost_breakdown : [];
    return rows.filter((row) => row.stub);
  }, [summary]);

  const outputBars = useMemo(() => {
    const ops = summary?.operations || {};
    return [
      {
        key: 'm2',
        label: t('org.accounting.metrics.m2', null, 'm²'),
        value: Number(ops.total_m2) || 0,
      },
      {
        key: 'km',
        label: t('org.accounting.metrics.km', null, 'km'),
        value: Number(ops.total_km) || 0,
      },
      {
        key: 'hours',
        label: t('org.accounting.metrics.hours', null, 'h'),
        value: Number(ops.total_hours) || 0,
      },
    ];
  }, [summary, t]);

  const phase2 = Array.isArray(summary?.phase2) ? summary.phase2 : [];

  return (
    <ScreenBackground safeArea={false}>
      <OrgAppHeader
        mode="detail"
        title={t('org.accounting.title', null, 'Accounting')}
        onBack={onBack}
      />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: scrollBottomPadding }]}
        keyboardShouldPersistTaps="handled"
      >
        <AppCard style={styles.card}>
          <Text style={styles.section}>
            {t('org.accounting.periodTitle', null, 'Period')}
          </Text>
          <Text style={styles.hint}>
            {t(
              'org.accounting.periodHint',
              null,
              'Pick a month or custom From–To for the company pulse.',
            )}
          </Text>
          <View style={styles.monthRow}>
            <Button
              mode="outlined"
              compact
              onPress={() => {
                const [y, m] = month.split('-').map(Number);
                const d = new Date(y, m - 2, 1);
                applyMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
              }}
              labelStyle={styles.outlinedLabel}
            >
              ←
            </Button>
            <Text style={styles.monthLabel}>{month}</Text>
            <Button
              mode="outlined"
              compact
              onPress={() => {
                const [y, m] = month.split('-').map(Number);
                const d = new Date(y, m, 1);
                applyMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
              }}
              labelStyle={styles.outlinedLabel}
            >
              →
            </Button>
            <Button mode="text" compact onPress={() => applyMonth(currentMonthIso())}>
              {t('org.accounting.thisMonth', null, 'This month')}
            </Button>
          </View>
          <ServiceRecordDatePicker
            label={t('org.accounting.filterFrom', null, 'From')}
            valueIso={filterFrom || null}
            onChangeIso={setFilterFrom}
            optional
            maxIso={filterTo || undefined}
          />
          <ServiceRecordDatePicker
            label={t('org.accounting.filterTo', null, 'To')}
            valueIso={filterTo || null}
            onChangeIso={setFilterTo}
            optional
            minIso={filterFrom || undefined}
          />
        </AppCard>

        {loading ? <ActivityIndicator color="#fff" style={styles.loader} /> : null}
        {error ? (
          <AppCard style={styles.card}>
            <Text style={styles.error}>{error}</Text>
            <Button mode="contained" onPress={load}>
              {t('common.retry', null, 'Retry')}
            </Button>
          </AppCard>
        ) : null}

        {!loading && !error && summary ? (
          <>
            <AppCard style={styles.card}>
              <Text style={styles.section}>
                {t('org.accounting.pulseTitle', null, 'Month pulse')}
              </Text>
              <Text style={styles.pulseLine}>
                {t(
                  'org.accounting.periodSummary',
                  {
                    from: summary.from,
                    to: summary.to,
                    area: `${summary.operations?.total_m2 ?? '0'} m²`,
                    km: `${summary.operations?.total_km ?? '0'} km`,
                    hours: `${summary.operations?.total_hours ?? '0'} h`,
                    jobs: summary.operations?.jobs_done ?? 0,
                  },
                  `From–To: ${summary.operations?.total_m2 ?? '0'} m² · ${summary.operations?.total_km ?? '0'} km · ${summary.operations?.total_hours ?? '0'} h · ${summary.operations?.jobs_done ?? 0} jobs`,
                )}
              </Text>

              <View style={styles.stripRow}>
                <View style={[styles.stripCell, styles.stripRevenue]}>
                  <Text style={styles.stripValue}>
                    {formatMoney(summary.totals?.revenue_amount, currency)}
                  </Text>
                  <Text style={styles.stripLabel}>
                    {t('org.accounting.strip.revenue', null, 'Revenue')}
                  </Text>
                  <Text style={styles.stripHint}>
                    {t(
                      'org.accounting.strip.revenueHint',
                      { count: summary.issued_invoices?.count ?? 0 },
                      `${summary.issued_invoices?.count ?? 0} issued invoice(s)`,
                    )}
                  </Text>
                </View>
                <View style={styles.stripCell}>
                  <Text style={styles.stripValue}>
                    {formatMoney(summary.totals?.cost_amount, currency)}
                  </Text>
                  <Text style={styles.stripLabel}>
                    {t('org.accounting.strip.costs', null, 'Costs')}
                  </Text>
                  <Text style={styles.stripHint}>
                    {t(
                      'org.accounting.strip.costsHint',
                      null,
                      'Materials + workforce + task expenses',
                    )}
                  </Text>
                </View>
                <View style={styles.stripCell}>
                  <Text style={styles.stripValue}>
                    {formatMoney(summary.totals?.margin_amount, currency)}
                  </Text>
                  <Text style={styles.stripLabel}>
                    {t('org.accounting.strip.margin', null, 'Margin ≈')}
                  </Text>
                  <Text style={styles.stripHint}>
                    {t(
                      'org.accounting.strip.marginHint',
                      null,
                      'Approximate — revenue minus period costs',
                    )}
                  </Text>
                </View>
              </View>

              <View style={styles.cardsGrid}>
                <View style={styles.metricCard}>
                  <Text style={styles.metricValue}>
                    {formatMoney(summary.issued_invoices?.amount, currency)}
                  </Text>
                  <Text style={styles.metricLabel}>
                    {t(
                      'org.accounting.cards.issuedInvoices',
                      null,
                      'Issued invoices (to clients)',
                    )}
                  </Text>
                  <Text style={styles.metricHint}>
                    {t(
                      'org.accounting.cards.issuedInvoicesHint',
                      { count: summary.issued_invoices?.count ?? 0 },
                      `${summary.issued_invoices?.count ?? 0} invoice(s) in period`,
                    )}
                  </Text>
                  <Button
                    compact
                    mode="text"
                    onPress={() => navigateToOrgInvoicing(navigation, { orgId })}
                  >
                    {t('org.accounting.openInvoices', null, 'Open invoicing')}
                  </Button>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricValue}>
                    {formatMoney(summary.materials_cost?.amount, currency)}
                  </Text>
                  <Text style={styles.metricLabel}>
                    {t('org.accounting.cards.materials', null, 'Materials (intake)')}
                  </Text>
                  <Text style={styles.metricHint}>
                    {t(
                      'org.accounting.cards.documentsHint',
                      { count: summary.documents?.confirmed_count ?? 0 },
                      `${summary.documents?.confirmed_count ?? 0} confirmed docs`,
                    )}
                  </Text>
                  <Button
                    compact
                    mode="text"
                    onPress={() => navigateToOrgWarehouse(navigation, { orgId })}
                  >
                    {t('org.accounting.openWarehouse', null, 'Warehouse')}
                  </Button>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricValue}>
                    {formatMoney(summary.workforce_cost?.amount, currency)}
                  </Text>
                  <Text style={styles.metricLabel}>
                    {t('org.accounting.cards.workforce', null, 'Workforce cost')}
                  </Text>
                  <Text style={styles.metricHint}>
                    {t(
                      'org.accounting.cards.workforceHint',
                      { count: summary.workforce_cost?.employees_with_salary ?? 0 },
                      `${summary.workforce_cost?.employees_with_salary ?? 0} with salary set`,
                    )}
                  </Text>
                  <Button
                    compact
                    mode="text"
                    onPress={() => navigateToOrgWorkforce(navigation, { orgId })}
                  >
                    {t('org.accounting.setSalaries', null, 'Set salaries')}
                  </Button>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricValue}>
                    {formatMoney(summary.other_expenses?.amount, currency)}
                  </Text>
                  <Text style={styles.metricLabel}>
                    {t('org.accounting.cards.other', null, 'Task expenses')}
                  </Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricValue}>
                    {formatMoney(summary.estimated_payroll?.amount, currency)}
                  </Text>
                  <Text style={styles.metricLabel}>
                    {t('org.accounting.cards.estimatedPayroll', null, 'Estimated payroll')}
                  </Text>
                  <Text style={styles.metricHint}>
                    {t(
                      'org.accounting.cards.estimatedPayrollHint',
                      null,
                      'Prorated base + optional m²/km rates (Phase 1).',
                    )}
                  </Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricValue}>
                    {formatMoney(summary.project_expected_revenue?.amount, currency)}
                  </Text>
                  <Text style={styles.metricLabel}>
                    {t(
                      'org.accounting.cards.projects',
                      null,
                      'Project portfolio (expected value)',
                    )}
                  </Text>
                  <Text style={styles.metricHint}>
                    {t(
                      'org.accounting.cards.projectsHint',
                      null,
                      'Not this period’s turnover — active project stock.',
                    )}
                  </Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricValue}>
                    {summary.documents?.intake_count ?? 0}
                  </Text>
                  <Text style={styles.metricLabel}>
                    {t('org.accounting.cards.documents', null, 'Intake documents')}
                  </Text>
                </View>
              </View>
            </AppCard>

            <AppCard style={styles.card}>
              <Text style={styles.section}>
                {t('org.invoicing.uninvoicedTitle', null, 'Completed jobs ready to invoice')}
              </Text>
              <Text style={styles.hint}>
                {uninvoicedCount > 0
                  ? t(
                      'org.accounting.uninvoicedCount',
                      { count: uninvoicedCount },
                      `${uninvoicedCount} completed job(s) waiting for an invoice.`,
                    )
                  : t(
                      'org.accounting.uninvoicedNone',
                      null,
                      'No uninvoiced completed jobs right now.',
                    )}
              </Text>
              <Button
                mode="contained"
                style={{ marginTop: 10 }}
                onPress={() => navigateToOrgInvoicing(navigation, { orgId })}
              >
                {t('org.accounting.openInvoicing', null, 'Invoice jobs')}
              </Button>
            </AppCard>

            <AppCard style={styles.card}>
              <Text style={styles.section}>
                {t('org.accounting.pieTitle', null, 'Cost mix (period)')}
              </Text>
              <Text style={styles.hint}>
                {t(
                  'org.accounting.pieHint',
                  null,
                  'Costs only — materials, workforce, task expenses. Revenue is shown separately.',
                )}
              </Text>
              <SimpleDonutChart
                slices={costPieSlices}
                emptyLabel={t('org.accounting.pieEmpty', null, 'Set salaries or costs to see shares')}
                centerLabel={formatMoney(summary.totals?.cost_amount, currency)}
                centerSubLabel={t('org.accounting.totalCost', null, 'Total cost')}
              />
              {stubCostRows.length ? (
                <View style={styles.stubBlock}>
                  <Text style={styles.stubTitle}>
                    {t(
                      'org.accounting.stubCategoriesTitle',
                      null,
                      'Not tracked yet',
                    )}
                  </Text>
                  {stubCostRows.map((row) => (
                    <View key={row.key} style={styles.stubRow}>
                      <Text style={styles.stubLabel}>{costLabel(row.key, row.label)}</Text>
                      <Text style={styles.stubBadge}>—</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </AppCard>

            <AppCard style={styles.card}>
              <Text style={styles.section}>
                {t('org.accounting.compareTitle', null, 'Period picture')}
              </Text>
              <Text style={styles.hint}>
                {t(
                  'org.accounting.compareHint',
                  null,
                  'Live cost categories vs issued invoice revenue for this From–To.',
                )}
              </Text>
              <SimpleMetricBars
                bars={periodCompareBars}
                emptyLabel={t(
                  'org.accounting.compareEmpty',
                  null,
                  'No costs or issued invoices in this period',
                )}
              />
            </AppCard>

            <AppCard style={styles.card}>
              <Text style={styles.section}>
                {t('org.accounting.outputTitle', null, 'Operational output')}
              </Text>
              <SimpleMetricBars
                bars={outputBars}
                emptyLabel={t('org.accounting.outputEmpty', null, 'No m² / km / hours in this period')}
              />
            </AppCard>

            <AppCard style={styles.card}>
              <Text style={styles.section}>
                {t('org.accounting.phase2Title', null, 'Coming later')}
              </Text>
              <Text style={styles.hint}>
                {t(
                  'org.accounting.phase2Hint',
                  null,
                  'Rent, utilities, richer analytics, taxes, insurance, and bank sync — later.',
                )}
              </Text>
              {phase2.map((row) => (
                <View key={row.key} style={styles.phase2Row}>
                  <Text style={styles.phase2Label}>{row.label}</Text>
                  <Text style={styles.phase2Badge}>
                    {t('org.accounting.comingSoon', null, 'Coming soon')}
                  </Text>
                </View>
              ))}
            </AppCard>
          </>
        ) : null}
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 14,
    paddingTop: 12,
    gap: 12,
  },
  card: {
    marginBottom: 4,
  },
  loader: {
    marginVertical: 24,
  },
  section: {
    color: ON_CARD,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  hint: {
    color: ON_CARD_MUTED,
    fontSize: 13,
    marginBottom: 10,
  },
  pulseLine: {
    color: ON_CARD,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  stripRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  stripCell: {
    flexGrow: 1,
    flexBasis: '30%',
    minWidth: 100,
    backgroundColor: 'rgba(148,163,184,0.12)',
    borderRadius: 12,
    padding: 10,
  },
  stripRevenue: {
    backgroundColor: 'rgba(16,185,129,0.12)',
  },
  stripValue: {
    color: ON_CARD,
    fontSize: 15,
    fontWeight: '700',
  },
  stripLabel: {
    color: ON_CARD_MUTED,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  stripHint: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  monthLabel: {
    color: ON_CARD,
    fontSize: 16,
    fontWeight: '700',
    minWidth: 84,
    textAlign: 'center',
  },
  outlinedLabel: {
    color: ON_CARD,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    width: '47%',
    minWidth: 140,
    flexGrow: 1,
    backgroundColor: 'rgba(148,163,184,0.12)',
    borderRadius: 12,
    padding: 12,
  },
  metricValue: {
    color: ON_CARD,
    fontSize: 16,
    fontWeight: '700',
  },
  metricLabel: {
    color: ON_CARD_MUTED,
    fontSize: 12,
    marginTop: 4,
  },
  metricHint: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 4,
  },
  stubBlock: {
    marginTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(15,23,42,0.12)',
    paddingTop: 8,
  },
  stubTitle: {
    color: ON_CARD_MUTED,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  stubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  stubLabel: {
    color: ON_CARD,
    fontSize: 13,
    flex: 1,
    paddingRight: 8,
  },
  stubBadge: {
    color: '#94A3B8',
    fontSize: 13,
  },
  phase2Row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(15,23,42,0.12)',
  },
  phase2Label: {
    color: ON_CARD,
    fontSize: 13,
    flex: 1,
    paddingRight: 8,
  },
  phase2Badge: {
    color: '#94A3B8',
    fontSize: 12,
  },
  error: {
    color: '#b91c1c',
    marginBottom: 8,
  },
});
