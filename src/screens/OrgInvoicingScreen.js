import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, Button, Checkbox, Text } from 'react-native-paper';

import ScreenBackground from '../components/ScreenBackground';
import AppCard from '../components/ui/AppCard';
import EmptyStateCard from '../components/ui/EmptyStateCard';
import OrgAppHeader from '../components/org/OrgAppHeader';
import {
  draftInvoiceFromWorkOrders,
  getOrgInvoice,
  issueOrgInvoice,
  listOrgInvoices,
  listWorkOrders,
  markOrgInvoicePaid,
} from '../api/orgOperations';
import { resolveActiveOrganizationId } from '../utils/orgWorkspace';
import { navigateToOrgHome } from '../navigation/webNavigation';
import { useTranslation } from '../i18n';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { formatMoneyMinor } from '../constants/currency';
import { useScrollContentBottomPadding } from '../utils/mobileWebInsets';
import {
  invoiceDisplayNumber,
  invoiceListSubtitle,
  invoiceTotalLabel,
} from '../utils/billingInvoices';

const ON_CARD = '#0F172A';
const ON_CARD_MUTED = '#475569';

export default function OrgInvoicingScreen({ navigation, route }) {
  const { t } = useTranslation();
  const routeOrgId = route?.params?.organizationId || route?.params?.orgId;
  const preselectIds = useMemo(() => {
    const raw = route?.params?.workOrderIds || route?.params?.preselectIds || [];
    return Array.isArray(raw) ? raw.map((id) => Number(id)).filter(Boolean) : [];
  }, [route?.params?.workOrderIds, route?.params?.preselectIds]);
  const initialTab = route?.params?.tab === 'invoices' ? 'invoices' : 'uninvoiced';
  const scrollBottomPadding = useScrollContentBottomPadding(80);

  const [orgId, setOrgId] = useState(null);
  const [tab, setTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uninvoiced, setUninvoiced] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [selectedIds, setSelectedIds] = useState(preselectIds);
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState(null);

  const onBack = useCallback(() => {
    if (detail) {
      setDetail(null);
      return;
    }
    navigateToOrgHome(navigation, { orgId: routeOrgId || orgId });
  }, [detail, navigation, orgId, routeOrgId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const resolved = await resolveActiveOrganizationId(routeOrgId);
      setOrgId(resolved);
      if (!resolved) {
        setError(t('org.invoicing.loadError', null, 'Could not load invoicing.'));
        return;
      }
      const [jobsRes, invRes] = await Promise.all([
        listWorkOrders(token, resolved, { status: 'done', uninvoiced: true }),
        listOrgInvoices(token, resolved),
      ]);
      const jobs = Array.isArray(jobsRes?.results) ? jobsRes.results : [];
      setUninvoiced(jobs);
      setInvoices(Array.isArray(invRes?.results) ? invRes.results : []);
      setSelectedIds((prev) => {
        if (preselectIds.length) {
          return preselectIds.filter((id) => jobs.some((row) => Number(row.id) === Number(id)));
        }
        return prev.filter((id) => jobs.some((row) => Number(row.id) === Number(id)));
      });
    } catch (e) {
      setError(e.message || t('org.invoicing.loadError', null, 'Could not load invoicing.'));
    } finally {
      setLoading(false);
    }
  }, [preselectIds, routeOrgId, t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const toggleSelect = (id) => {
    const num = Number(id);
    setSelectedIds((prev) =>
      prev.includes(num) ? prev.filter((row) => row !== num) : [...prev, num],
    );
  };

  const createDraft = async (ids) => {
    if (!orgId || !ids.length) return;
    setBusy(true);
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const invoice = await draftInvoiceFromWorkOrders(token, orgId, ids);
      setDetail(invoice);
      setTab('invoices');
      await load();
    } catch (e) {
      Alert.alert(
        t('org.invoicing.createErrorTitle', null, 'Invoice'),
        e.message || t('org.invoicing.createError', null, 'Could not create invoice draft.'),
      );
    } finally {
      setBusy(false);
    }
  };

  const openInvoice = async (invoiceId) => {
    if (!orgId) return;
    setBusy(true);
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const invoice = await getOrgInvoice(token, orgId, invoiceId);
      setDetail(invoice);
    } catch (e) {
      Alert.alert(t('common.error', null, 'Error'), e.message || t('org.invoicing.loadError'));
    } finally {
      setBusy(false);
    }
  };

  const issueCurrent = async () => {
    if (!orgId || !detail?.id) return;
    setBusy(true);
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const invoice = await issueOrgInvoice(token, orgId, detail.id);
      setDetail(invoice);
      await load();
      Alert.alert(
        t('org.invoicing.issuedTitle', null, 'Invoice issued'),
        t('org.invoicing.issuedBody', { number: invoice.number || '—' }, `Issued ${invoice.number || '—'}`),
      );
    } catch (e) {
      Alert.alert(
        t('org.invoicing.issueErrorTitle', null, 'Issue invoice'),
        e.message || t('org.invoicing.issueError', null, 'Could not issue invoice.'),
      );
    } finally {
      setBusy(false);
    }
  };

  const markPaid = async () => {
    if (!orgId || !detail?.id) return;
    setBusy(true);
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const invoice = await markOrgInvoicePaid(token, orgId, detail.id);
      setDetail(invoice);
      await load();
    } catch (e) {
      Alert.alert(t('common.error', null, 'Error'), e.message);
    } finally {
      setBusy(false);
    }
  };

  if (detail) {
    return (
      <ScreenBackground safeArea={false}>
        <OrgAppHeader
          mode="detail"
          title={
            detail.number ||
            t('org.invoicing.draftTitle', null, 'Invoice draft')
          }
          onBack={onBack}
        />
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: scrollBottomPadding }]}>
          <AppCard style={styles.card}>
            <Text style={styles.section}>{detail.document_title || t('org.invoicing.draftTitle')}</Text>
            <Text style={styles.meta}>
              {t('org.invoicing.billTo', null, 'Bill to')}:{' '}
              {detail.bill_to_company_name || detail.bill_to_name || '—'}
            </Text>
            <Text style={styles.meta}>
              {t('org.invoicing.total', null, 'Total')}:{' '}
              {formatMoneyMinor(detail.total_minor, detail.currency)}
            </Text>
            <Text style={styles.meta}>
              {t('org.invoicing.status', null, 'Status')}: {detail.status}
              {detail.payment_status ? ` · ${detail.payment_status}` : ''}
            </Text>
            {(detail.lines || []).map((line) => (
              <View key={line.id} style={styles.lineRow}>
                <Text style={styles.lineDesc}>{line.description}</Text>
                <Text style={styles.lineAmt}>
                  {formatMoneyMinor(line.line_total_minor, detail.currency)}
                </Text>
              </View>
            ))}
            {detail.status === 'draft' ? (
              <Button mode="contained" loading={busy} disabled={busy} onPress={issueCurrent} style={styles.actionBtn}>
                {t('org.invoicing.issue', null, 'Issue invoice')}
              </Button>
            ) : null}
            {detail.status === 'issued' && detail.payment_status !== 'paid' ? (
              <Button mode="outlined" loading={busy} disabled={busy} onPress={markPaid} style={styles.actionBtn}>
                {t('org.invoicing.markPaid', null, 'Mark paid')}
              </Button>
            ) : null}
          </AppCard>
        </ScrollView>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground safeArea={false}>
      <OrgAppHeader
        mode="detail"
        title={t('org.invoicing.title', null, 'Invoicing')}
        onBack={onBack}
      />
      <View style={styles.tabs}>
        <Pressable
          onPress={() => setTab('uninvoiced')}
          style={[styles.tab, tab === 'uninvoiced' && styles.tabActive]}
        >
          <Text style={[styles.tabLabel, tab === 'uninvoiced' && styles.tabLabelActive]}>
            {t('org.invoicing.tabs.uninvoiced', null, 'Uninvoiced jobs')}
            {uninvoiced.length ? ` (${uninvoiced.length})` : ''}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setTab('invoices')}
          style={[styles.tab, tab === 'invoices' && styles.tabActive]}
        >
          <Text style={[styles.tabLabel, tab === 'invoices' && styles.tabLabelActive]}>
            {t('org.invoicing.tabs.invoices', null, 'Invoices')}
          </Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: scrollBottomPadding }]}>
        {loading ? <ActivityIndicator color="#fff" style={styles.loader} /> : null}
        {error ? (
          <AppCard style={styles.card}>
            <Text style={styles.error}>{error}</Text>
            <Button mode="contained" onPress={load}>
              {t('common.retry', null, 'Retry')}
            </Button>
          </AppCard>
        ) : null}

        {!loading && !error && tab === 'uninvoiced' ? (
          <>
            <AppCard style={styles.card}>
              <Text style={styles.section}>
                {t('org.invoicing.uninvoicedTitle', null, 'Completed jobs ready to invoice')}
              </Text>
              <Text style={styles.hint}>
                {t(
                  'org.invoicing.uninvoicedHint',
                  null,
                  'Select 2 or more jobs from the same project/customer to create one invoice. Example: 4 loads done — pick any 2.',
                )}
              </Text>
            </AppCard>
            {!uninvoiced.length ? (
              <EmptyStateCard
                title={t('org.invoicing.emptyUninvoiced', null, 'No uninvoiced completed jobs')}
                subtitle={t(
                  'org.invoicing.emptyUninvoicedHint',
                  null,
                  'When a job is marked Done, it appears here until invoiced.',
                )}
              />
            ) : (
              uninvoiced.map((row) => {
                const selected = selectedIds.includes(Number(row.id));
                return (
                  <Pressable key={row.id} onPress={() => toggleSelect(row.id)}>
                    <AppCard style={styles.card}>
                      <View style={styles.row}>
                        <Checkbox
                          status={selected ? 'checked' : 'unchecked'}
                          onPress={() => toggleSelect(row.id)}
                        />
                        <View style={styles.rowBody}>
                          <Text style={styles.jobTitle}>{row.title}</Text>
                          <Text style={styles.meta}>
                            {[row.project?.name, row.task_kind, row.ended_at?.slice?.(0, 10)]
                              .filter(Boolean)
                              .join(' · ')}
                          </Text>
                          <Text style={styles.meta}>
                            {formatMoneyMinor(row.suggested_billable_minor, 'BGN')}
                          </Text>
                        </View>
                      </View>
                      <Button
                        compact
                        mode="text"
                        onPress={() => createDraft([row.id])}
                        disabled={busy}
                      >
                        {t('org.invoicing.invoiceOne', null, 'Invoice this job')}
                      </Button>
                    </AppCard>
                  </Pressable>
                );
              })
            )}
          </>
        ) : null}

        {!loading && !error && tab === 'invoices' ? (
          <>
            {!invoices.length ? (
              <EmptyStateCard
                title={t('org.invoicing.emptyInvoices', null, 'No invoices yet')}
                subtitle={t(
                  'org.invoicing.emptyInvoicesHint',
                  null,
                  'Create a draft from completed uninvoiced jobs.',
                )}
              />
            ) : (
              invoices.map((invoice) => (
                <Pressable key={invoice.id} onPress={() => openInvoice(invoice.id)}>
                  <AppCard style={styles.card}>
                    <Text style={styles.jobTitle}>{invoiceDisplayNumber(invoice)}</Text>
                    <Text style={styles.meta}>{invoiceListSubtitle(invoice)}</Text>
                    <Text style={styles.meta}>{invoiceTotalLabel(invoice)}</Text>
                  </AppCard>
                </Pressable>
              ))
            )}
          </>
        ) : null}
      </ScrollView>

      {tab === 'uninvoiced' && selectedIds.length >= 1 ? (
        <View style={styles.fabBar}>
          <Button
            mode="contained"
            loading={busy}
            disabled={busy || selectedIds.length < 1}
            onPress={() => createDraft(selectedIds)}
          >
            {selectedIds.length >= 2
              ? t(
                  'org.invoicing.createCombined',
                  { count: selectedIds.length },
                  `Create invoice for ${selectedIds.length} jobs`,
                )
              : t('org.invoicing.invoiceOne', null, 'Invoice this job')}
          </Button>
        </View>
      ) : null}
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, gap: 12 },
  tabs: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginTop: 8 },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
  },
  tabActive: { backgroundColor: 'rgba(255,255,255,0.92)' },
  tabLabel: { color: '#E2E8F0', fontWeight: '600' },
  tabLabelActive: { color: ON_CARD },
  card: { marginBottom: 0 },
  section: { color: ON_CARD, fontSize: 17, fontWeight: '700', marginBottom: 6 },
  hint: { color: ON_CARD_MUTED, fontSize: 13, lineHeight: 18 },
  error: { color: '#B91C1C', marginBottom: 8 },
  loader: { marginVertical: 24 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  rowBody: { flex: 1 },
  jobTitle: { color: ON_CARD, fontSize: 16, fontWeight: '700' },
  meta: { color: ON_CARD_MUTED, fontSize: 13, marginTop: 2 },
  lineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#CBD5E1',
  },
  lineDesc: { flex: 1, color: ON_CARD, fontSize: 14 },
  lineAmt: { color: ON_CARD, fontWeight: '600' },
  actionBtn: { marginTop: 12 },
  fabBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
  },
});
