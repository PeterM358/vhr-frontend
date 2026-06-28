import React, { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
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
import { COLORS } from '../constants/colors';
import { useStackBodyPaddingTop } from '../navigation/stackContentInset';
import {
  createInvoiceSeries,
  getInvoiceSeries,
  getInvoices,
  getLegalEntitySummary,
  updateInvoiceSeries,
} from '../api/billing';
import { getMyShopProfiles } from '../api/profiles';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { formatMoneyMinor } from '../constants/currency';
import {
  invoiceDisplayNumber,
  invoiceListSubtitle,
  invoiceTotalLabel,
} from '../utils/billingInvoices';

const STATUS_FILTERS = [
  { key: '', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'issued', label: 'Issued' },
];

function SeriesEditor({ series, onSaved }) {
  const [label, setLabel] = useState(series?.label || '');
  const [prefix, setPrefix] = useState(series?.prefix || '01');
  const [width, setWidth] = useState(String(series?.sequence_width ?? 6));
  const [saving, setSaving] = useState(false);
  const locked = series && !series.config_editable;

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const payload = {
        label: label.trim(),
        prefix: prefix.trim(),
        sequence_width: Number(width) || 6,
      };
      const updated = series?.id
        ? await updateInvoiceSeries(token, series.id, payload)
        : await createInvoiceSeries(token, payload);
      onSaved(updated);
      Alert.alert('Saved', 'Invoice numbering updated.');
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not save series');
    } finally {
      setSaving(false);
    }
  };

  return (
    <FloatingCard style={styles.seriesCard}>
      <Text style={styles.sectionTitle}>Numbering series</Text>
      <Text style={styles.sectionHint}>
        {locked
          ? 'Prefix and width are locked after your first issued invoice. Next number advances automatically on issue.'
          : 'Set prefix and zero-pad width before the first issued invoice — e.g. prefix 01 → 01000001.'}
      </Text>
      <TextInput
        mode="outlined"
        label="Label (optional)"
        value={label}
        onChangeText={setLabel}
        style={styles.input}
        disabled={saving}
      />
      <TextInput
        mode="outlined"
        label="Prefix"
        value={prefix}
        onChangeText={setPrefix}
        style={styles.input}
        disabled={locked || saving}
      />
      <TextInput
        mode="outlined"
        label="Sequence width"
        keyboardType="number-pad"
        value={width}
        onChangeText={setWidth}
        style={styles.input}
        disabled={locked || saving}
      />
      {series?.next_sequence != null ? (
        <Text style={styles.metaLine}>Next sequence: {series.next_sequence}</Text>
      ) : null}
      <Button mode="contained" onPress={handleSave} loading={saving} disabled={saving}>
        Save numbering
      </Button>
    </FloatingCard>
  );
}

export default function ShopInvoicingScreen() {
  const navigation = useNavigation();
  const bodyPadTop = useStackBodyPaddingTop(12);
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [series, setSeries] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [erpSummary, setErpSummary] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const [invoiceRows, seriesRows, profiles] = await Promise.all([
        getInvoices(token, { status: statusFilter || undefined }),
        getInvoiceSeries(token),
        getMyShopProfiles().catch(() => []),
      ]);
      setInvoices(Array.isArray(invoiceRows) ? invoiceRows : []);
      const firstSeries = Array.isArray(seriesRows) && seriesRows.length ? seriesRows[0] : null;
      setSeries(firstSeries);

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
    } catch (err) {
      console.error(err);
      Alert.alert('Error', err.message || 'Failed to load invoicing data');
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const openInvoice = (invoiceId) => {
    navigation.navigate('ShopInvoiceDetail', { invoiceId });
  };

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: bodyPadTop }]}>
        <AppCard variant="dark" style={styles.heroCard}>
          <Text style={styles.heroSubtitle}>
            Issue numbered sales invoices from completed repairs, or attach an external PDF on the
            repair when you use another accounting app.
          </Text>
        </AppCard>

        {erpSummary ? (
          <FloatingCard style={styles.erpCard}>
            <Text style={styles.sectionTitle}>Company overview</Text>
            <Text style={styles.sectionHint}>
              {erpSummary.legal_name || 'Your company'} — {erpSummary.branch_count} centers linked.
              Invoices below are for the active center; unpaid issued total across branches:{' '}
              {formatMoneyMinor(erpSummary.totals?.unpaid_issued_minor || 0, 'EUR')}.
            </Text>
            {(erpSummary.branches || []).map((branch) => (
              <Text key={branch.shop_id} style={styles.branchLine}>
                • {branch.shop_name}: {branch.unpaid_issued_count} unpaid issued
              </Text>
            ))}
          </FloatingCard>
        ) : null}

        <SeriesEditor
          series={series}
          onSaved={(updated) => {
            setSeries(updated);
            loadData();
          }}
        />

        <View style={styles.filterRow}>
          {STATUS_FILTERS.map((item) => {
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

        {loading ? (
          <ActivityIndicator style={styles.loader} color={COLORS.PRIMARY} />
        ) : invoices.length === 0 ? (
          <FloatingCard>
            <Text style={styles.emptyTitle}>No invoices yet</Text>
            <Text style={styles.emptyText}>
            Open a completed repair and tap “Create platform invoice”, or on Repairs → Done tap
            the multi-invoice icon to combine several jobs for the same client.
            </Text>
          </FloatingCard>
        ) : (
          invoices.map((invoice) => (
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
