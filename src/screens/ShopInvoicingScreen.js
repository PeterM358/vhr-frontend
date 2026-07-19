import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Picker } from '@react-native-picker/picker';
import {
  ActivityIndicator,
  Button,
  Text,
  TextInput,
} from 'react-native-paper';

import ScreenBackground from '../components/ScreenBackground';
import FloatingCard from '../components/ui/FloatingCard';
import AppCard from '../components/ui/AppCard';
import StatusBadge from '../components/ui/StatusBadge';
import EmptyStateCard from '../components/ui/EmptyStateCard';
import { COLORS } from '../constants/colors';
import PartnerAppHeader from '../components/partner/PartnerAppHeader';
import { useScrollShadow } from '../hooks/useScrollShadow';
import { usePartnerDashboardBack } from '../navigation/appNavBarBack';
import {
  createInvoiceSeries,
  draftInvoiceFromRepairs,
  getInvoiceSeries,
  getInvoices,
  getLegalEntitySummary,
  updateInvoiceSeries,
} from '../api/billing';
import { getRepairs } from '../api/repairs';
import { getMyShopProfiles } from '../api/profiles';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { formatMoneyMinor } from '../constants/currency';
import {
  invoiceDisplayNumber,
  invoiceListSubtitle,
  invoiceTotalLabel,
} from '../utils/billingInvoices';
import { formatRepairListDate } from '../utils/repairListUtils';
import { useTranslation } from '../i18n';

function buildRecentMonthOptions(count = 18, allMonthsLabel = 'All months') {
  const options = [{ value: MONTH_ALL, label: allMonthsLabel }];
  const now = new Date();
  for (let i = 0; i < count; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    options.push({ value, label });
  }
  return options;
}

function filterInvoices(invoices, { clientSearch, monthKey }) {
  let rows = Array.isArray(invoices) ? invoices : [];
  const query = String(clientSearch || '').trim().toLowerCase();
  if (query) {
    rows = rows.filter((invoice) => {
      const haystack = [
        invoice?.bill_to_name,
        invoice?.bill_to_company_name,
        invoice?.bill_to_email,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }
  if (monthKey) {
    rows = rows.filter((invoice) => {
      const raw = invoice?.issued_at || invoice?.created_at;
      if (!raw) return false;
      const date = new Date(raw);
      if (Number.isNaN(date.getTime())) return false;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      return key === monthKey;
    });
  }
  return rows;
}

function clampSequenceWidth(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return 1;
  if (n > 12) return 12;
  return Math.floor(n);
}

function formatInvoicePreview(prefix, width, sequence) {
  const w = clampSequenceWidth(width);
  const seq = Math.max(1, Number(sequence) || 1);
  return `${String(prefix || '')}${String(seq).padStart(w, '0')}`;
}

function SeriesEditor({ series, onSaved, t }) {
  const locked = Boolean(series && !series.config_editable);
  const [startingNew, setStartingNew] = useState(false);
  const editingNew = !series?.id || startingNew;
  const fieldsEditable = editingNew || !locked;

  const [label, setLabel] = useState(series?.label || '');
  const [prefix, setPrefix] = useState(series?.prefix || '01');
  const [width, setWidth] = useState(String(series?.sequence_width ?? 6));
  const [nextSequence, setNextSequence] = useState(String(series?.next_sequence ?? 1));
  const [saving, setSaving] = useState(false);

  const preview = useMemo(
    () => formatInvoicePreview(prefix, width, nextSequence),
    [prefix, width, nextSequence]
  );
  const activePreview =
    series?.example_number ||
    formatInvoicePreview(series?.prefix, series?.sequence_width, series?.next_sequence);

  const beginNewSeries = () => {
    setStartingNew(true);
    setLabel('');
    setPrefix('02');
    setWidth('10');
    setNextSequence('1');
  };

  const cancelNewSeries = () => {
    setStartingNew(false);
    setLabel(series?.label || '');
    setPrefix(series?.prefix || '01');
    setWidth(String(series?.sequence_width ?? 6));
    setNextSequence(String(series?.next_sequence ?? 1));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const payload = {
        label: label.trim(),
        prefix: prefix.trim(),
        sequence_width: clampSequenceWidth(width),
        next_sequence: Math.max(1, Number(nextSequence) || 1),
      };
      let updated;
      if (editingNew) {
        updated = await createInvoiceSeries(token, { ...payload, is_active: true });
        setStartingNew(false);
      } else {
        updated = await updateInvoiceSeries(token, series.id, payload);
      }
      onSaved(updated);
      Alert.alert(t('common.save'), t('partnerDashboard.invoicing.savedNumbering'));
    } catch (err) {
      Alert.alert(t('common.error'), err.message || t('partnerDashboard.invoicing.seriesSaveError'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <FloatingCard style={styles.seriesCard}>
      <Text style={styles.sectionTitle}>{t('partnerDashboard.invoicing.numberingSeries')}</Text>
      <Text style={styles.sectionHint}>
        {startingNew
          ? t('partnerDashboard.invoicing.numberingNewSeriesHint')
          : locked
            ? t('partnerDashboard.invoicing.numberingLocked')
            : t('partnerDashboard.invoicing.numberingOpen')}
      </Text>

      {locked && !startingNew ? (
        <>
          <Text style={styles.metaLine}>
            {t('partnerDashboard.invoicing.activeSeriesSummary', {
              prefix: series?.prefix || '—',
              width: series?.sequence_width ?? '—',
              next: series?.next_sequence ?? '—',
              example: activePreview || '—',
            })}
          </Text>
          <Button mode="contained" onPress={beginNewSeries} disabled={saving}>
            {t('partnerDashboard.invoicing.startNewSeries')}
          </Button>
        </>
      ) : (
        <>
          <TextInput
            mode="outlined"
            label={t('partnerDashboard.invoicing.labelOptional')}
            value={label}
            onChangeText={setLabel}
            style={styles.input}
            disabled={saving}
          />
          <TextInput
            mode="outlined"
            label={t('partnerDashboard.invoicing.prefix')}
            value={prefix}
            onChangeText={setPrefix}
            style={styles.input}
            disabled={!fieldsEditable || saving}
          />
          <TextInput
            mode="outlined"
            label={t('partnerDashboard.invoicing.sequenceWidth')}
            keyboardType="number-pad"
            value={width}
            onChangeText={setWidth}
            style={styles.input}
            disabled={!fieldsEditable || saving}
          />
          <TextInput
            mode="outlined"
            label={t('partnerDashboard.invoicing.startingSequence')}
            keyboardType="number-pad"
            value={nextSequence}
            onChangeText={setNextSequence}
            style={styles.input}
            disabled={!fieldsEditable || saving}
          />
          <Text style={styles.previewLine}>
            {t('partnerDashboard.invoicing.exampleNumber', { value: preview })}
          </Text>
          <View style={styles.seriesActions}>
            {startingNew ? (
              <Button mode="outlined" onPress={cancelNewSeries} disabled={saving}>
                {t('common.cancel')}
              </Button>
            ) : null}
            <Button mode="contained" onPress={handleSave} loading={saving} disabled={saving}>
              {startingNew
                ? t('partnerDashboard.invoicing.createNewSeries')
                : t('partnerDashboard.invoicing.saveNumbering')}
            </Button>
          </View>
        </>
      )}
    </FloatingCard>
  );
}

const MONTH_ALL = '';

export default function ShopInvoicingScreen() {
  const { t } = useTranslation();
  const sectionTabs = [
    { key: 'invoices', label: t('partnerDashboard.invoicing.tabs.invoices') },
    { key: 'uninvoiced', label: t('partnerDashboard.invoicing.tabs.uninvoiced') },
  ];
  const statusFilters = [
    { key: '', label: t('partnerDashboard.invoicing.statusFilters.all') },
    { key: 'draft', label: t('partnerDashboard.invoicing.statusFilters.draft') },
    { key: 'issued', label: t('partnerDashboard.invoicing.statusFilters.issued') },
  ];
  const monthOptions = useMemo(
    () => buildRecentMonthOptions(18, t('partnerDashboard.invoicing.allMonths')),
    [t]
  );
  const navigation = useNavigation();
  const { scrolled, onScroll, scrollEventThrottle } = useScrollShadow();
  const handleBack = usePartnerDashboardBack(navigation);
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [uninvoicedRepairs, setUninvoicedRepairs] = useState([]);
  const [series, setSeries] = useState(null);
  const [sectionTab, setSectionTab] = useState('invoices');
  const [statusFilter, setStatusFilter] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [monthFilter, setMonthFilter] = useState(MONTH_ALL);
  const [creatingRepairId, setCreatingRepairId] = useState(null);
  const [erpSummary, setErpSummary] = useState(null);

  const loadInvoices = useCallback(async () => {
    const token = await AsyncStorage.getItem('@access_token');
    const [invoiceRows, seriesRows, profiles] = await Promise.all([
      getInvoices(token, { status: statusFilter || undefined }),
      getInvoiceSeries(token),
      getMyShopProfiles().catch(() => []),
    ]);
    setInvoices(Array.isArray(invoiceRows) ? invoiceRows : []);
    const rows = Array.isArray(seriesRows) ? seriesRows : [];
    const activeSeries = rows.find((row) => row?.is_active) || rows[0] || null;
    setSeries(activeSeries);

    const currentId = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_SHOP_ID);
    const profile =
      (Array.isArray(profiles) ? profiles : []).find(
        (row) => String(row.id) === String(currentId)
      ) || profiles?.[0];
    const entityId = profile?.legal_entity || profile?.legal_entity_detail?.id;
    if (entityId && token) {
      const summary = await getLegalEntitySummary(token, entityId);
      setErpSummary(summary?.branch_count > 1 ? summary : null);
    } else {
      setErpSummary(null);
    }
  }, [statusFilter]);

  const loadUninvoicedRepairs = useCallback(async () => {
    const token = await AsyncStorage.getItem('@access_token');
    const rows = await getRepairs(token, { status: 'done', uninvoiced: true }, { force: true });
    setUninvoicedRepairs(Array.isArray(rows) ? rows : []);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (sectionTab === 'invoices') {
        await loadInvoices();
        setUninvoicedRepairs([]);
      } else {
        await loadUninvoicedRepairs();
      }
    } catch (err) {
      console.error(err);
      Alert.alert(t('common.error'), err.message || t('partnerDashboard.invoicing.loadError'));
      if (sectionTab === 'invoices') {
        setInvoices([]);
      } else {
        setUninvoicedRepairs([]);
      }
    } finally {
      setLoading(false);
    }
  }, [sectionTab, loadInvoices, loadUninvoicedRepairs]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const filteredInvoices = useMemo(
    () =>
      filterInvoices(invoices, {
        clientSearch,
        monthKey: monthFilter,
      }),
    [invoices, clientSearch, monthFilter]
  );

  const showInvoiceListFilters = sectionTab === 'invoices' && (statusFilter === '' || statusFilter === 'issued');

  const openInvoice = (invoiceId) => {
    navigation.navigate('ShopInvoiceDetail', { invoiceId });
  };

  const handleCreateInvoiceFromRepair = async (repairId) => {
    setCreatingRepairId(repairId);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const invoice = await draftInvoiceFromRepairs(token, [repairId]);
      navigation.navigate('ShopInvoiceDetail', { invoiceId: invoice.id });
      loadUninvoicedRepairs().catch(() => {});
    } catch (err) {
      Alert.alert(t('common.error'), err.message || t('partnerDashboard.invoicing.createDraftError'));
    } finally {
      setCreatingRepairId(null);
    }
  };

  const renderUninvoicedRepair = (repair) => {
    const title = `${repair.vehicle_make ?? ''} ${repair.vehicle_model ?? ''}`.trim() || t('partnerDashboard.card.vehicleFallback');
    const plate = String(repair.vehicle_license_plate || '').trim();
    const clientName = String(repair.client_display_name || '').trim();
    const completed = formatRepairListDate(repair.completed_at || repair.created_at);
    const total = formatMoneyMinor(
      repair.total_price != null ? Math.round(Number(repair.total_price) * 100) : null,
      repair.currency
    );
    const busy = creatingRepairId === repair.id;

    return (
      <FloatingCard
        key={repair.id}
        onPress={busy ? undefined : () => handleCreateInvoiceFromRepair(repair.id)}
      >
        <View style={styles.invoiceRow}>
          <View style={styles.invoiceMain}>
            <Text style={styles.invoiceNumber}>{title}</Text>
            <Text style={styles.invoiceSub} numberOfLines={2}>
              {[plate, clientName, completed].filter(Boolean).join(' · ') || t('partnerDashboard.invoicing.completedRepair')}
            </Text>
            {total ? <Text style={styles.invoiceTotal}>{total}</Text> : null}
          </View>
          <View style={styles.invoiceAside}>
            {busy ? (
              <ActivityIndicator size="small" color={COLORS.PRIMARY} />
            ) : (
              <>
                <MaterialCommunityIcons
                  name="file-plus-outline"
                  size={20}
                  color={COLORS.PRIMARY}
                />
                <MaterialCommunityIcons name="chevron-right" size={22} color={COLORS.TEXT_MUTED} />
              </>
            )}
          </View>
        </View>
      </FloatingCard>
    );
  };

  return (
    <ScreenBackground safeArea={false}>
      <PartnerAppHeader
        title={t('drawer.partner.invoicing')}
        backLabel={t('navigation.backToDashboard')}
        onBack={handleBack}
        iconOnlyBack
        scrolled={scrolled}
      />
      <ScrollView
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        contentContainerStyle={[styles.content, { paddingTop: 12 }]}
      >
        <AppCard variant="dark" style={styles.heroCard}>
          <Text style={styles.heroSubtitle}>{t('partnerDashboard.invoicing.heroSubtitle')}</Text>
        </AppCard>

        {erpSummary ? (
          <FloatingCard style={styles.erpCard}>
            <Text style={styles.sectionTitle}>{t('partnerDashboard.invoicing.companyOverview')}</Text>
            <Text style={styles.sectionHint}>
              {t('partnerDashboard.invoicing.companyOverviewBody', {
                legalName: erpSummary.legal_name || t('partnerDashboard.invoicing.yourCompany'),
                branchCount: erpSummary.branch_count,
                total: formatMoneyMinor(erpSummary.totals?.unpaid_issued_minor || 0, 'EUR'),
              })}
            </Text>
            {(erpSummary.branches || []).map((branch) => (
              <Text key={branch.shop_id} style={styles.branchLine}>
                {t('partnerDashboard.invoicing.branchUnpaid', {
                  shopName: branch.shop_name,
                  count: branch.unpaid_issued_count,
                })}
              </Text>
            ))}
          </FloatingCard>
        ) : null}

        <SeriesEditor
          key={series?.id || 'new'}
          series={series}
          t={t}
          onSaved={(updated) => {
            setSeries(updated);
            loadInvoices().catch(() => {});
          }}
        />

        <View style={styles.sectionTabRow}>
          {sectionTabs.map((item) => {
            const active = sectionTab === item.key;
            return (
              <Pressable
                key={item.key}
                onPress={() => setSectionTab(item.key)}
                style={[styles.sectionTab, active && styles.sectionTabActive]}
              >
                <Text style={[styles.sectionTabText, active && styles.sectionTabTextActive]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {sectionTab === 'invoices' ? (
          <>
            <View style={styles.filterRow}>
              {statusFilters.map((item) => {
                const active = statusFilter === item.key;
                return (
                  <Pressable
                    key={item.key || 'all'}
                    onPress={() => setStatusFilter(item.key)}
                    style={[styles.filterChip, active && styles.filterChipActive]}
                  >
                    <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {showInvoiceListFilters ? (
              <FloatingCard style={styles.invoiceFiltersCard}>
                <Text style={styles.sectionTitle}>{t('partnerDashboard.invoicing.filterInvoices')}</Text>
                <TextInput
                  mode="outlined"
                  label={t('partnerDashboard.invoicing.clientSearch')}
                  value={clientSearch}
                  onChangeText={setClientSearch}
                  style={styles.input}
                  placeholder={t('partnerDashboard.invoicing.clientSearchPlaceholder')}
                />
                <Text style={styles.pickerLabel}>{t('partnerDashboard.invoicing.monthIssued')}</Text>
                <View style={styles.pickerShell}>
                  <Picker
                    selectedValue={monthFilter}
                    onValueChange={setMonthFilter}
                    style={styles.picker}
                    dropdownIconColor={COLORS.TEXT_MUTED}
                  >
                    {monthOptions.map((option) => (
                      <Picker.Item key={option.value || 'all'} label={option.label} value={option.value} />
                    ))}
                  </Picker>
                </View>
              </FloatingCard>
            ) : null}

            {loading ? (
              <ActivityIndicator style={styles.loader} color={COLORS.PRIMARY} />
            ) : filteredInvoices.length === 0 ? (
              <FloatingCard>
                <Text style={styles.emptyTitle}>
                  {invoices.length === 0
                    ? t('partnerDashboard.invoicing.noInvoices')
                    : t('partnerDashboard.invoicing.noInvoicesFiltered')}
                </Text>
                <Text style={styles.emptyText}>
                  {invoices.length === 0
                    ? t('partnerDashboard.invoicing.noInvoicesHint')
                    : t('partnerDashboard.invoicing.noInvoicesFilterHint')}
                </Text>
              </FloatingCard>
            ) : (
              filteredInvoices.map((invoice) => (
                <FloatingCard key={invoice.id} onPress={() => openInvoice(invoice.id)}>
                  <View style={styles.invoiceRow}>
                    <View style={styles.invoiceMain}>
                      <Text style={styles.invoiceNumber}>{invoiceDisplayNumber(invoice)}</Text>
                      <Text style={styles.invoiceSub} numberOfLines={2}>
                        {invoiceListSubtitle(invoice)}
                      </Text>
                      <Text style={styles.invoiceTotal}>{invoiceTotalLabel(invoice)}</Text>
                    </View>
                    <View style={styles.invoiceAside}>
                      <StatusBadge status={invoice.status} />
                      <MaterialCommunityIcons name="chevron-right" size={22} color={COLORS.TEXT_MUTED} />
                    </View>
                  </View>
                </FloatingCard>
              ))
            )}
          </>
        ) : (
          <>
            <Text style={styles.sectionHint}>{t('partnerDashboard.invoicing.uninvoicedHint')}</Text>
            {loading ? (
              <ActivityIndicator style={styles.loader} color={COLORS.PRIMARY} />
            ) : uninvoicedRepairs.length === 0 ? (
              <EmptyStateCard
                icon="file-document-check-outline"
                title={t('partnerDashboard.invoicing.allCaughtUpTitle')}
                subtitle={t('partnerDashboard.invoicing.allCaughtUpSubtitle')}
              />
            ) : (
              uninvoicedRepairs.map((repair) => renderUninvoicedRepair(repair))
            )}
          </>
        )}
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 12,
  },
  heroCard: {
    marginBottom: 4,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.88)',
    lineHeight: 20,
    fontSize: 14,
  },
  seriesCard: {
    gap: 8,
  },
  previewLine: {
    color: COLORS.TEXT_DARK,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  seriesActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  erpCard: {
    gap: 6,
  },
  branchLine: {
    color: COLORS.TEXT_DARK,
    fontSize: 13,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
  },
  sectionHint: {
    color: COLORS.TEXT_MUTED,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#fff',
  },
  metaLine: {
    color: COLORS.TEXT_MUTED,
    fontSize: 13,
    marginBottom: 4,
  },
  sectionTabRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sectionTab: {
    flexGrow: 1,
    minWidth: 140,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(15,23,42,0.06)',
    alignItems: 'center',
  },
  sectionTabActive: {
    backgroundColor: COLORS.PRIMARY,
  },
  sectionTabText: {
    color: COLORS.TEXT_DARK,
    fontWeight: '700',
    fontSize: 13,
  },
  sectionTabTextActive: {
    color: '#fff',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.06)',
  },
  filterChipActive: {
    backgroundColor: COLORS.PRIMARY,
  },
  filterChipText: {
    color: COLORS.TEXT_DARK,
    fontWeight: '600',
    fontSize: 13,
  },
  filterChipTextActive: {
    color: '#fff',
  },
  invoiceFiltersCard: {
    gap: 8,
  },
  pickerLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
    marginTop: 2,
  },
  pickerShell: {
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.12)',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  picker: {
    height: Platform.OS === 'ios' ? 140 : 44,
  },
  loader: {
    marginTop: 24,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
    marginBottom: 6,
  },
  emptyText: {
    color: COLORS.TEXT_MUTED,
    lineHeight: 20,
  },
  invoiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  invoiceMain: {
    flex: 1,
    minWidth: 0,
  },
  invoiceNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
  },
  invoiceSub: {
    color: COLORS.TEXT_MUTED,
    fontSize: 13,
    marginTop: 2,
  },
  invoiceTotal: {
    color: COLORS.TEXT_DARK,
    fontWeight: '600',
    marginTop: 6,
  },
  invoiceAside: {
    alignItems: 'flex-end',
    gap: 6,
  },
});
