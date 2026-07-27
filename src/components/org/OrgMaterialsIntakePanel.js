/**
 * Org materials intake: import invoice/proforma → preview lines → confirm to warehouse SKUs.
 */

import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, Button, TextInput } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';

import AppCard from './ui/AppCard';
import EmptyStateCard from './ui/EmptyStateCard';
import {
  addMaterialsIntakeLine,
  confirmMaterialsIntake,
  getMaterialsIntake,
  listMaterialsIntakes,
  listOrgMaterials,
  uploadMaterialsIntake,
} from '../api/orgWarehouse';
import { pickReceiptOrInvoiceAttachment } from '../utils/pickDocumentFile';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { useTranslation } from '../i18n';

const ON_CARD = '#0F172A';
const ON_CARD_MUTED = '#475569';

function priceLabel(line) {
  if (line?.unit_price != null && line.unit_price !== '') return String(line.unit_price);
  const minor = Number(line?.unit_price_ex_vat_minor || 0);
  return (minor / 100).toFixed(2);
}

export default function OrgMaterialsIntakePanel({ organizationId, canManage }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [intakes, setIntakes] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [activeIntake, setActiveIntake] = useState(null);
  const [manual, setManual] = useState({
    description: '',
    part_number: '',
    quantity: '1',
    unit_code: 'piece',
    unit_price: '',
  });

  const load = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    setError('');
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const [intakeData, matData] = await Promise.all([
        listMaterialsIntakes(token, organizationId),
        listOrgMaterials(token, organizationId),
      ]);
      setIntakes(Array.isArray(intakeData?.results) ? intakeData.results : []);
      setMaterials(Array.isArray(matData?.results) ? matData.results : []);
    } catch (e) {
      setError(e.message || t('org.warehouse.intake.loadError', null, 'Could not load materials intake.'));
    } finally {
      setLoading(false);
    }
  }, [organizationId, t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onUpload = async () => {
    if (!canManage || !organizationId) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const attachment = await pickReceiptOrInvoiceAttachment();
      if (!attachment) return;
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const data = await uploadMaterialsIntake(token, organizationId, {
        file: attachment,
        documentKind: 'invoice',
      });
      setActiveIntake(data);
      const parsed = data?.preview?.lines_parsed ?? data?.lines?.length ?? 0;
      setMessage(
        data?.preview?.message
          || t(
            'org.warehouse.intake.uploaded',
            { count: parsed },
            `Imported — ${parsed} proposed line(s). Review and confirm.`,
          ),
      );
      await load();
    } catch (e) {
      setError(e.message || t('org.warehouse.intake.uploadError', null, 'Upload failed.'));
    } finally {
      setBusy(false);
    }
  };

  const onAddManual = async () => {
    if (!activeIntake?.id || activeIntake.status !== 'draft') return;
    if (!manual.description.trim() && !manual.part_number.trim()) {
      setError(t('org.warehouse.intake.lineRequired', null, 'Enter a material name or part number.'));
      return;
    }
    setBusy(true);
    setError('');
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      await addMaterialsIntakeLine(token, organizationId, activeIntake.id, {
        description: manual.description.trim(),
        part_number: manual.part_number.trim(),
        quantity: manual.quantity || '1',
        unit_code: manual.unit_code || 'piece',
        unit_price: manual.unit_price || '0',
      });
      const refreshed = await getMaterialsIntake(token, organizationId, activeIntake.id);
      setActiveIntake(refreshed);
      setManual({
        description: '',
        part_number: '',
        quantity: '1',
        unit_code: 'piece',
        unit_price: '',
      });
    } catch (e) {
      setError(e.message || t('org.warehouse.intake.lineError', null, 'Could not add line.'));
    } finally {
      setBusy(false);
    }
  };

  const onConfirm = async () => {
    if (!activeIntake?.id || activeIntake.status !== 'draft') return;
    setBusy(true);
    setError('');
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const data = await confirmMaterialsIntake(token, organizationId, activeIntake.id);
      setActiveIntake(data);
      setMessage(
        t(
          'org.warehouse.intake.confirmed',
          null,
          'Confirmed — materials are in warehouse stock and selectable on operations.',
        ),
      );
      await load();
    } catch (e) {
      setError(e.message || t('org.warehouse.intake.confirmError', null, 'Confirm failed.'));
    } finally {
      setBusy(false);
    }
  };

  const openIntake = async (row) => {
    setBusy(true);
    setError('');
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const data = await getMaterialsIntake(token, organizationId, row.id);
      setActiveIntake(data);
    } catch (e) {
      setError(e.message || t('org.warehouse.intake.loadError', null, 'Could not load intake.'));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.lead}>
        {t(
          'org.warehouse.intake.lead',
          null,
          'Import a supplier invoice or proforma PDF. Review proposed lines, then Confirm to add SKUs to warehouse stock.',
        )}
      </Text>

      {canManage ? (
        <Button mode="contained" onPress={onUpload} loading={busy} disabled={busy} style={styles.primaryBtn}>
          {t('org.warehouse.intake.upload', null, 'Import invoice PDF')}
        </Button>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {message ? <Text style={styles.message}>{message}</Text> : null}

      {activeIntake ? (
        <AppCard style={styles.card}>
          <Text style={styles.cardTitle}>
            {activeIntake.document_kind === 'proforma'
              ? t('org.warehouse.intake.proforma', null, 'Proforma')
              : t('org.warehouse.intake.invoice', null, 'Invoice')}
            {activeIntake.invoice_number ? ` #${activeIntake.invoice_number}` : ''}
          </Text>
          <Text style={styles.meta}>
            {activeIntake.supplier_name || t('org.warehouse.intake.unknownSupplier', null, 'Supplier unknown')}
            {' · '}
            {activeIntake.status}
            {activeIntake.linked_proforma_id
              ? ` · ${t('org.warehouse.intake.linkedProforma', null, 'Linked proforma')} #${activeIntake.linked_proforma_id}`
              : ''}
          </Text>

          {(activeIntake.lines || []).length === 0 ? (
            <Text style={styles.helper}>
              {t(
                'org.warehouse.intake.noParsedLines',
                null,
                'No lines parsed from this PDF. Add materials manually below, then Confirm.',
              )}
            </Text>
          ) : (
            (activeIntake.lines || []).map((line) => (
              <View key={line.id} style={styles.lineRow}>
                <Text style={styles.lineName} numberOfLines={2}>
                  {line.description || line.part_number || '—'}
                </Text>
                <Text style={styles.lineMeta}>
                  {line.part_number ? `${line.part_number} · ` : ''}
                  {line.quantity} {line.unit_code || ''} · {priceLabel(line)}
                </Text>
              </View>
            ))
          )}

          {activeIntake.status === 'draft' && canManage ? (
            <View style={styles.manualBox}>
              <Text style={styles.sectionLabel}>
                {t('org.warehouse.intake.addManual', null, 'Add line manually')}
              </Text>
              <TextInput
                label={t('org.warehouse.intake.lineName', null, 'Name / description')}
                value={manual.description}
                onChangeText={(v) => setManual((p) => ({ ...p, description: v }))}
                mode="outlined"
                style={styles.input}
                textColor={ON_CARD}
              />
              <TextInput
                label={t('org.warehouse.intake.partNumber', null, 'Part number / SKU')}
                value={manual.part_number}
                onChangeText={(v) => setManual((p) => ({ ...p, part_number: v }))}
                mode="outlined"
                style={styles.input}
                textColor={ON_CARD}
              />
              <View style={styles.row3}>
                <TextInput
                  label={t('org.warehouse.intake.qty', null, 'Qty')}
                  value={manual.quantity}
                  onChangeText={(v) => setManual((p) => ({ ...p, quantity: v }))}
                  mode="outlined"
                  style={[styles.input, styles.flex1]}
                  keyboardType="decimal-pad"
                  textColor={ON_CARD}
                />
                <TextInput
                  label={t('org.warehouse.intake.unit', null, 'Unit')}
                  value={manual.unit_code}
                  onChangeText={(v) => setManual((p) => ({ ...p, unit_code: v }))}
                  mode="outlined"
                  style={[styles.input, styles.flex1]}
                  textColor={ON_CARD}
                />
                <TextInput
                  label={t('org.warehouse.intake.price', null, 'Price')}
                  value={manual.unit_price}
                  onChangeText={(v) => setManual((p) => ({ ...p, unit_price: v }))}
                  mode="outlined"
                  style={[styles.input, styles.flex1]}
                  keyboardType="decimal-pad"
                  textColor={ON_CARD}
                />
              </View>
              <Button mode="outlined" onPress={onAddManual} disabled={busy} style={styles.secondaryBtn}>
                {t('org.warehouse.intake.addLine', null, 'Add line')}
              </Button>
              <Button mode="contained" onPress={onConfirm} loading={busy} disabled={busy} style={styles.primaryBtn}>
                {t('org.warehouse.intake.confirm', null, 'Confirm → warehouse')}
              </Button>
            </View>
          ) : null}
        </AppCard>
      ) : null}

      <Text style={styles.sectionTitle}>
        {t('org.warehouse.intake.stockTitle', null, 'Warehouse materials')}
      </Text>
      {materials.length === 0 ? (
        <EmptyStateCard
          title={t('org.warehouse.intake.emptyTitle', null, 'No materials yet')}
          subtitle={t(
            'org.warehouse.intake.empty',
            null,
            'Import an invoice to add materials.',
          )}
          icon="package-variant-closed"
        />
      ) : (
        materials.map((row) => (
          <AppCard key={row.stock_id || row.id} style={styles.card}>
            <Text style={styles.lineName}>{row.name}</Text>
            <Text style={styles.lineMeta}>
              {row.part_number ? `${row.part_number} · ` : ''}
              {t('org.warehouse.intake.onHand', null, 'On hand')}: {row.quantity_on_hand}
            </Text>
          </AppCard>
        ))
      )}

      {intakes.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>
            {t('org.warehouse.intake.history', null, 'Recent imports')}
          </Text>
          {intakes.slice(0, 8).map((row) => (
            <Pressable key={row.id} onPress={() => openIntake(row)}>
              <AppCard style={styles.card}>
                <Text style={styles.lineName}>
                  {row.invoice_number || `#${row.id}`} · {row.status}
                </Text>
                <Text style={styles.lineMeta}>
                  {row.supplier_name || '—'} · {row.lines_count || 0}{' '}
                  {t('org.warehouse.intake.lines', null, 'lines')}
                </Text>
              </AppCard>
            </Pressable>
          ))}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  center: { paddingVertical: 40, alignItems: 'center' },
  lead: { color: ON_CARD_MUTED, fontSize: 14, lineHeight: 20 },
  primaryBtn: { marginTop: 4 },
  secondaryBtn: { marginBottom: 8 },
  error: { color: '#B91C1C', fontSize: 13 },
  message: { color: '#15803d', fontSize: 13 },
  card: { padding: 14, gap: 6 },
  cardTitle: { color: ON_CARD, fontSize: 16, fontWeight: '600' },
  meta: { color: ON_CARD_MUTED, fontSize: 12 },
  helper: { color: ON_CARD_MUTED, fontSize: 13, marginTop: 6 },
  lineRow: { paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E2E8F0' },
  lineName: { color: ON_CARD, fontSize: 14, fontWeight: '500' },
  lineMeta: { color: ON_CARD_MUTED, fontSize: 12, marginTop: 2 },
  manualBox: { marginTop: 12, gap: 4 },
  sectionLabel: { color: ON_CARD, fontWeight: '600', marginBottom: 4 },
  sectionTitle: { color: ON_CARD, fontSize: 15, fontWeight: '600', marginTop: 8 },
  input: { backgroundColor: '#fff', marginBottom: 6 },
  row3: { flexDirection: 'row', gap: 8 },
  flex1: { flex: 1 },
});
