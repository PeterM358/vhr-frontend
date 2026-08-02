import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, Button, Checkbox, Text, TextInput } from 'react-native-paper';

import ScreenBackground from '../components/ScreenBackground';
import AppCard from '../components/ui/AppCard';
import EmptyStateCard from '../components/ui/EmptyStateCard';
import OrgAppHeader from '../components/org/OrgAppHeader';
import InvoiceDocumentPreview from '../components/shop/InvoiceDocumentPreview';
import {
  downloadOrgInvoicePdf,
  draftInvoiceFromWorkOrders,
  getOrgInvoice,
  issueOrgInvoice,
  listOrgInvoices,
  listWorkOrders,
  markOrgInvoicePaid,
  sendOrgInvoiceEmail,
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
  invoiceWorkOrderSummary,
} from '../utils/billingInvoices';

const ON_CARD = '#0F172A';
const ON_CARD_MUTED = '#475569';

function majorStringToMinor(raw) {
  const text = String(raw ?? '').trim().replace(',', '.');
  if (!text) return 0;
  const value = Number(text);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

function minorToMajorInput(minor) {
  const n = Number(minor || 0);
  if (!Number.isFinite(n) || n === 0) return '';
  const major = n / 100;
  return Number.isInteger(major) ? String(major) : major.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

function lineDraftKey(draft) {
  const wo = draft?.work_order_id ?? draft?.work_order;
  const op = draft?.operation_id ?? draft?.work_order_operation ?? 'wo';
  return `${wo}:${op}`;
}

function draftsForJob(row) {
  if (Array.isArray(row?.invoice_line_drafts) && row.invoice_line_drafts.length) {
    return row.invoice_line_drafts;
  }
  return [
    {
      work_order_id: row.id,
      operation_id: null,
      description: row.title || `Job #${row.id}`,
      quantity: '1',
      unit_code: '',
      unit_symbol: '',
      unit_price_minor: 0,
      line_total_minor: 0,
      activity_name: '',
    },
  ];
}

function projectRemainingHint(row, t) {
  const remaining = row?.project_remaining_unbilled_minor;
  const expected = row?.project_expected_revenue_minor;
  if (expected == null && remaining == null) return '';
  if (remaining == null) {
    return t(
      'org.invoicing.projectExpectedHint',
      { amount: formatMoneyMinor(expected, 'BGN') },
      `Project expected (hint): ${formatMoneyMinor(expected, 'BGN')}`,
    );
  }
  return t(
    'org.invoicing.projectRemainingHint',
    {
      remaining: formatMoneyMinor(remaining, 'BGN'),
      expected: formatMoneyMinor(expected, 'BGN'),
    },
    `Project remaining unbilled (hint): ${formatMoneyMinor(remaining, 'BGN')} of ${formatMoneyMinor(expected, 'BGN')}`,
  );
}

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
  /** { [lineKey]: { quantity: string, unit_price: string } } */
  const [lineEdits, setLineEdits] = useState({});
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState(null);
  const [emailDraft, setEmailDraft] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);

  const onBack = useCallback(() => {
    if (detail) {
      setDetail(null);
      return;
    }
    navigateToOrgHome(navigation, { orgId: routeOrgId || orgId });
  }, [detail, navigation, orgId, routeOrgId]);

  const seedLineEditsForJobs = useCallback((jobs, ids) => {
    setLineEdits((prev) => {
      const next = { ...prev };
      for (const id of ids) {
        const row = jobs.find((j) => Number(j.id) === Number(id));
        if (!row) continue;
        for (const draft of draftsForJob(row)) {
          const key = lineDraftKey(draft);
          if (next[key]) continue;
          next[key] = {
            quantity: String(draft.quantity ?? '1'),
            unit_price: minorToMajorInput(draft.unit_price_minor),
          };
        }
      }
      return next;
    });
  }, []);

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
        let next;
        if (preselectIds.length) {
          next = preselectIds.filter((id) => jobs.some((row) => Number(row.id) === Number(id)));
        } else {
          next = prev.filter((id) => jobs.some((row) => Number(row.id) === Number(id)));
        }
        seedLineEditsForJobs(jobs, next);
        return next;
      });
    } catch (e) {
      setError(e.message || t('org.invoicing.loadError', null, 'Could not load invoicing.'));
    } finally {
      setLoading(false);
    }
  }, [preselectIds, routeOrgId, seedLineEditsForJobs, t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const toggleSelect = (id) => {
    const num = Number(id);
    setSelectedIds((prev) => {
      if (prev.includes(num)) {
        return prev.filter((row) => row !== num);
      }
      seedLineEditsForJobs(uninvoiced, [num]);
      return [...prev, num];
    });
  };

  const setLineEdit = (key, field, value) => {
    setLineEdits((prev) => ({
      ...prev,
      [key]: {
        quantity: prev[key]?.quantity ?? '1',
        unit_price: prev[key]?.unit_price ?? '',
        [field]: value,
      },
    }));
  };

  const buildLinesPayload = (ids) => {
    const lines = [];
    for (const id of ids) {
      const row = uninvoiced.find((j) => Number(j.id) === Number(id));
      if (!row) continue;
      for (const draft of draftsForJob(row)) {
        const key = lineDraftKey(draft);
        const edit = lineEdits[key] || {};
        const qtyText = String(edit.quantity ?? draft.quantity ?? '1').trim().replace(',', '.');
        const qty = Number(qtyText);
        if (!Number.isFinite(qty) || qty <= 0) {
          return {
            error: t(
              'org.invoicing.qtyInvalid',
              null,
              'Enter a valid positive quantity for each operation line.',
            ),
          };
        }
        const priceInput =
          edit.unit_price != null && String(edit.unit_price).trim() !== ''
            ? edit.unit_price
            : minorToMajorInput(draft.unit_price_minor);
        const unitPriceMinor = majorStringToMinor(priceInput);
        if (unitPriceMinor == null) {
          return {
            error: t(
              'org.invoicing.rateInvalid',
              null,
              'Enter a valid non-negative unit price for each operation line.',
            ),
          };
        }
        const payload = {
          work_order_id: Number(id),
          quantity: qtyText,
          unit_price_minor: unitPriceMinor,
        };
        if (draft.operation_id) payload.operation_id = draft.operation_id;
        if (draft.description) payload.description = draft.description;
        lines.push(payload);
      }
    }
    return { lines };
  };

  const createDraft = async (ids) => {
    if (!orgId || !ids.length) return;
    const built = buildLinesPayload(ids);
    if (built.error) {
      Alert.alert(t('org.invoicing.createErrorTitle', null, 'Invoice'), built.error);
      return;
    }
    setBusy(true);
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const invoice = await draftInvoiceFromWorkOrders(
        token,
        orgId,
        ids,
        '',
        null,
        built.lines,
      );
      setDetail(invoice);
      setTab('invoices');
      setSelectedIds([]);
      setLineEdits({});
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
      setEmailDraft(invoice?.bill_to_email || '');
      setShowEmailForm(false);
    } catch (e) {
      Alert.alert(t('common.error', null, 'Error'), e.message || t('org.invoicing.loadError'));
    } finally {
      setBusy(false);
    }
  };

  const downloadPdf = async () => {
    if (!orgId || !detail?.id) return;
    setBusy(true);
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      await downloadOrgInvoicePdf(token, orgId, detail.id, detail);
    } catch (e) {
      Alert.alert(
        t('org.invoicing.downloadErrorTitle', null, 'Download'),
        e.message || t('org.invoicing.downloadError', null, 'Could not download invoice sheet.'),
      );
    } finally {
      setBusy(false);
    }
  };

  const sendEmail = async () => {
    if (!orgId || !detail?.id) return;
    const target = String(emailDraft || detail.bill_to_email || '').trim();
    if (!target) {
      setShowEmailForm(true);
      Alert.alert(
        t('org.invoicing.emailRequiredTitle', null, 'Email required'),
        t(
          'org.invoicing.emailRequired',
          null,
          'Enter the customer email address to send this invoice.',
        ),
      );
      return;
    }
    setBusy(true);
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const result = await sendOrgInvoiceEmail(token, orgId, detail.id, target);
      setShowEmailForm(false);
      Alert.alert(
        t('org.invoicing.emailSentTitle', null, 'Invoice sent'),
        t(
          'org.invoicing.emailSentBody',
          { email: result?.to || target },
          `Sent to ${result?.to || target}`,
        ),
      );
    } catch (e) {
      setShowEmailForm(true);
      Alert.alert(
        t('org.invoicing.emailErrorTitle', null, 'Send email'),
        e.message || t('org.invoicing.emailError', null, 'Could not send invoice email.'),
      );
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
            {(detail.invoice_work_orders || []).length ? (
              <View style={styles.jobsBlock}>
                <Text style={styles.jobsHeading}>
                  {t('org.invoicing.jobsOnInvoice', null, 'Jobs on this invoice')}
                </Text>
                {(detail.invoice_work_orders || []).map((row) => (
                  <View key={row.id || row.work_order_id} style={styles.jobItem}>
                    <Text style={styles.jobTitle}>{row.title || `Job #${row.work_order_id}`}</Text>
                    <Text style={styles.meta}>
                      {[
                        row.project_name,
                        (row.operation_titles || []).join(', '),
                        row.task_kind && row.task_kind !== 'other' && row.task_kind !== 'mixed'
                          ? row.task_kind.replace(/_/g, ' ')
                          : null,
                      ]
                        .filter(Boolean)
                        .join(' · ') || '—'}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
            {(detail.lines || []).map((line) => {
              const qty = Number(line.quantity || 1);
              const unit = line.unit_symbol || line.unit_code || '';
              const rate = formatMoneyMinor(line.unit_price_minor, detail.currency);
              return (
                <View key={line.id} style={styles.lineRow}>
                  <View style={styles.lineBody}>
                    <Text style={styles.lineDesc}>{line.description}</Text>
                    <Text style={styles.meta}>
                      {t(
                        'org.invoicing.lineQtyRate',
                        { qty, unit: unit ? ` ${unit}` : '', rate },
                        `${qty}${unit ? ` ${unit}` : ''} × ${rate}`,
                      )}
                    </Text>
                  </View>
                  <Text style={styles.lineAmt}>
                    {formatMoneyMinor(line.line_total_minor, detail.currency)}
                  </Text>
                </View>
              );
            })}
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
            <Button mode="outlined" loading={busy} disabled={busy} onPress={downloadPdf} style={styles.actionBtn}>
              {t('org.invoicing.downloadPdf', null, 'Download PDF')}
            </Button>
            <Button
              mode="outlined"
              loading={busy}
              disabled={busy}
              onPress={() => {
                setEmailDraft(detail.bill_to_email || emailDraft || '');
                setShowEmailForm(true);
              }}
              style={styles.actionBtn}
            >
              {t('org.invoicing.sendEmail', null, 'Send email')}
            </Button>
            {showEmailForm ? (
              <View style={styles.emailBox}>
                <Text style={styles.hint}>
                  {t(
                    'org.invoicing.emailHint',
                    null,
                    'Sends the invoice sheet to the bill-to address. Override below if needed.',
                  )}
                </Text>
                <TextInput
                  mode="outlined"
                  label={t('org.invoicing.emailLabel', null, 'Customer email')}
                  value={emailDraft}
                  onChangeText={setEmailDraft}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={styles.emailInput}
                  disabled={busy}
                />
                <Button mode="contained" loading={busy} disabled={busy} onPress={sendEmail}>
                  {t('org.invoicing.sendEmailConfirm', null, 'Send invoice')}
                </Button>
              </View>
            ) : null}
          </AppCard>
          {Platform.OS === 'web' ? (
            <View style={styles.previewWrap}>
              <InvoiceDocumentPreview invoice={detail} />
            </View>
          ) : null}
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
                  'Select jobs from the same project/customer. Edit quantity and unit price per operation — project expected value is only a hint, not an automatic split.',
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
                const drafts = draftsForJob(row);
                const ops = (row.operations || [])
                  .map((op) => op?.activity?.name || op?.name || op?.activity_definition?.name)
                  .filter(Boolean);
                const hint = projectRemainingHint(row, t);
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
                          {ops.length ? (
                            <Text style={styles.meta}>
                              {t('org.invoicing.operationsLabel', null, 'Operations')}:{' '}
                              {ops.join(', ')}
                            </Text>
                          ) : null}
                          {hint ? <Text style={styles.hintInline}>{hint}</Text> : null}
                          {selected
                            ? drafts.map((draft) => {
                                const key = lineDraftKey(draft);
                                const edit = lineEdits[key] || {
                                  quantity: String(draft.quantity ?? '1'),
                                  unit_price: minorToMajorInput(draft.unit_price_minor),
                                };
                                const qty = Number(String(edit.quantity || '0').replace(',', '.'));
                                const rateMinor = majorStringToMinor(edit.unit_price) ?? 0;
                                const lineTotal =
                                  Number.isFinite(qty) && qty > 0
                                    ? Math.round(qty * rateMinor)
                                    : 0;
                                const unit = draft.unit_symbol || draft.unit_code || '';
                                return (
                                  <View key={key} style={styles.opLineBox}>
                                    <Text style={styles.opLineTitle}>
                                      {draft.activity_name ||
                                        draft.description ||
                                        t('org.invoicing.operationsLabel', null, 'Operations')}
                                      {unit ? ` (${unit})` : ''}
                                    </Text>
                                    <View style={styles.opLineInputs}>
                                      <TextInput
                                        mode="outlined"
                                        dense
                                        label={t('org.invoicing.qtyLabel', null, 'Qty')}
                                        value={edit.quantity}
                                        onChangeText={(value) => setLineEdit(key, 'quantity', value)}
                                        keyboardType="decimal-pad"
                                        style={styles.qtyInput}
                                        onPressIn={(e) => e?.stopPropagation?.()}
                                      />
                                      <TextInput
                                        mode="outlined"
                                        dense
                                        label={
                                          unit
                                            ? t(
                                                'org.invoicing.unitPriceLabelWithUnit',
                                                { unit },
                                                `Price / ${unit}`,
                                              )
                                            : t('org.invoicing.unitPriceLabel', null, 'Unit price')
                                        }
                                        value={edit.unit_price}
                                        onChangeText={(value) => setLineEdit(key, 'unit_price', value)}
                                        keyboardType="decimal-pad"
                                        style={styles.rateInput}
                                        placeholder="0"
                                        onPressIn={(e) => e?.stopPropagation?.()}
                                      />
                                    </View>
                                    <Text style={styles.lineTotalPreview}>
                                      {t('org.invoicing.lineTotal', null, 'Line total')}:{' '}
                                      {formatMoneyMinor(lineTotal, 'BGN')}
                                    </Text>
                                  </View>
                                );
                              })
                            : null}
                        </View>
                      </View>
                      <Button
                        compact
                        mode="text"
                        onPress={() => {
                          if (!selected) toggleSelect(row.id);
                          createDraft([row.id]);
                        }}
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
              invoices.map((invoice) => {
                const jobsLine = invoiceWorkOrderSummary(invoice);
                return (
                  <Pressable key={invoice.id} onPress={() => openInvoice(invoice.id)}>
                    <AppCard style={styles.card}>
                      <Text style={styles.jobTitle}>{invoiceDisplayNumber(invoice)}</Text>
                      <Text style={styles.meta}>{invoiceListSubtitle(invoice)}</Text>
                      {jobsLine ? <Text style={styles.meta}>{jobsLine}</Text> : null}
                      <Text style={styles.meta}>{invoiceTotalLabel(invoice)}</Text>
                    </AppCard>
                  </Pressable>
                );
              })
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
  hintInline: { color: ON_CARD_MUTED, fontSize: 12, marginTop: 4, fontStyle: 'italic' },
  opLineBox: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#CBD5E1',
    gap: 6,
  },
  opLineTitle: { color: ON_CARD, fontSize: 13, fontWeight: '600' },
  opLineInputs: { flexDirection: 'row', gap: 8 },
  qtyInput: { flex: 0.4, backgroundColor: '#fff', minWidth: 88 },
  rateInput: { flex: 1, backgroundColor: '#fff' },
  lineTotalPreview: { color: ON_CARD, fontSize: 13, fontWeight: '600' },
  jobsBlock: { marginTop: 12, gap: 8 },
  jobsHeading: { color: ON_CARD, fontSize: 15, fontWeight: '700' },
  jobItem: { gap: 2 },
  lineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#CBD5E1',
  },
  lineBody: { flex: 1 },
  lineDesc: { flex: 1, color: ON_CARD, fontSize: 14 },
  lineAmt: { color: ON_CARD, fontWeight: '600' },
  actionBtn: { marginTop: 12 },
  emailBox: { marginTop: 12, gap: 8 },
  emailInput: { backgroundColor: '#fff' },
  previewWrap: { marginTop: 4 },
  fabBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
  },
});
