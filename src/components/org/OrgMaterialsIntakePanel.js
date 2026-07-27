/**
 * Org materials intake: import invoice/proforma → preview lines → confirm to warehouse SKUs.
 * Also supports standalone manual add (no invoice) and draft delete.
 */

import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, Button, TextInput } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';

import AppCard from '../ui/AppCard';
import EmptyStateCard from '../ui/EmptyStateCard';
import {
  addMaterialsIntakeLine,
  confirmMaterialsIntake,
  createOrgMaterial,
  deleteMaterialsIntake,
  getMaterialsIntake,
  listMaterialsIntakes,
  listOrgMaterials,
  uploadMaterialsIntake,
} from '../../api/orgWarehouse';
import { pickReceiptOrInvoiceAttachment } from '../../utils/pickDocumentFile';
import { confirmMessage } from '../../utils/crossPlatformAlert';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import { useTranslation } from '../../i18n';

const ON_CARD = '#0F172A';
const ON_CARD_MUTED = '#475569';

/** Match warehouse / ops unit vocabulary (materials.UnitOfMeasure codes). */
export const MATERIAL_UNIT_OPTIONS = [
  { code: 'piece', labelKey: 'org.warehouse.intake.units.piece', fallback: 'piece' },
  { code: 'kg', labelKey: 'org.warehouse.intake.units.kg', fallback: 'kg' },
  { code: 'L', labelKey: 'org.warehouse.intake.units.L', fallback: 'L' },
  { code: 'm3', labelKey: 'org.warehouse.intake.units.m3', fallback: 'm³' },
  { code: 'ml', labelKey: 'org.warehouse.intake.units.ml', fallback: 'ml' },
  { code: 'g', labelKey: 'org.warehouse.intake.units.g', fallback: 'g' },
  { code: 't', labelKey: 'org.warehouse.intake.units.t', fallback: 't' },
  { code: 'm', labelKey: 'org.warehouse.intake.units.m', fallback: 'm' },
  { code: 'm2', labelKey: 'org.warehouse.intake.units.m2', fallback: 'm²' },
];

function emptyManual() {
  return {
    description: '',
    part_number: '',
    part_number_alias: '',
    quantity: '1',
    unit_code: 'piece',
    unit_price: '',
  };
}

function priceLabel(line) {
  if (line?.unit_price != null && line.unit_price !== '') return String(line.unit_price);
  const minor = Number(line?.unit_price_ex_vat_minor || 0);
  return (minor / 100).toFixed(2);
}

function unitDisplay(code, t) {
  const opt = MATERIAL_UNIT_OPTIONS.find((u) => u.code === code);
  if (!opt) return code || '';
  return t(opt.labelKey, null, opt.fallback);
}

function UnitPicker({ value, onChange, t }) {
  return (
    <View style={styles.unitRow}>
      {MATERIAL_UNIT_OPTIONS.map((opt) => {
        const selected = value === opt.code;
        return (
          <Pressable
            key={opt.code}
            onPress={() => onChange(opt.code)}
            style={[styles.unitChip, selected && styles.unitChipSelected]}
          >
            <Text style={[styles.unitChipText, selected && styles.unitChipTextSelected]}>
              {t(opt.labelKey, null, opt.fallback)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
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
  const [confirmSummary, setConfirmSummary] = useState(null);
  const [manual, setManual] = useState(emptyManual);
  const [standalone, setStandalone] = useState(emptyManual);
  const [showStandalone, setShowStandalone] = useState(false);

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
    setConfirmSummary(null);
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
      if (data?.buyer_vat_matches_organization === false) {
        setError(
          data?.preview?.message
            || t(
              'org.warehouse.intake.vatMismatch',
              null,
              'Invoice buyer VAT does not match this organization. / ДДС номерът на купувача във фактурата не съвпада с тази организация.',
            ),
        );
      }
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
        part_number_alias: manual.part_number_alias.trim(),
        quantity: manual.quantity || '1',
        unit_code: manual.unit_code || 'piece',
        unit_price: manual.unit_price || '0',
      });
      const refreshed = await getMaterialsIntake(token, organizationId, activeIntake.id);
      setActiveIntake(refreshed);
      setManual(emptyManual());
    } catch (e) {
      setError(e.message || t('org.warehouse.intake.lineError', null, 'Could not add line.'));
    } finally {
      setBusy(false);
    }
  };

  const onAddStandalone = async () => {
    if (!canManage || !organizationId) return;
    if (!standalone.description.trim() && !standalone.part_number.trim()) {
      setError(t('org.warehouse.intake.lineRequired', null, 'Enter a material name or part number.'));
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const created = await createOrgMaterial(token, organizationId, {
        description: standalone.description.trim(),
        part_number: standalone.part_number.trim(),
        part_number_alias: standalone.part_number_alias.trim(),
        quantity: standalone.quantity || '0',
        unit_code: standalone.unit_code || 'piece',
        unit_price: standalone.unit_price || '0',
      });
      setConfirmSummary({
        invoice_number: '',
        supplier_name: '',
        source_file_name: '',
        document_kind: 'manual',
        materials_count: 1,
        materials: [
          {
            name: created.name,
            part_number: created.part_number,
            part_number_alias: created.part_number_alias || standalone.part_number_alias,
            quantity_added: created.quantity_added || standalone.quantity,
            quantity_on_hand: created.quantity_on_hand,
            unit_code: created.unit_code || standalone.unit_code,
            created: true,
          },
        ],
      });
      setMessage(
        t(
          'org.warehouse.intake.manualCreated',
          null,
          'Material added to warehouse stock.',
        ),
      );
      setStandalone(emptyManual());
      setShowStandalone(false);
      await load();
    } catch (e) {
      setError(e.message || t('org.warehouse.intake.lineError', null, 'Could not add material.'));
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
      setConfirmSummary(data.confirm_summary || null);
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

  const onDeleteDraft = async (row) => {
    if (!canManage || !row?.id || row.status !== 'draft') return;
    const ok = await confirmMessage(
      t('org.warehouse.intake.deleteDraftTitle', null, 'Delete draft?'),
      t(
        'org.warehouse.intake.deleteDraftBody',
        null,
        'This removes the unfinished import and its lines. Stock is unchanged.',
      ),
      { confirmLabel: t('org.warehouse.intake.delete', null, 'Delete') },
    );
    if (!ok) return;
    setBusy(true);
    setError('');
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      await deleteMaterialsIntake(token, organizationId, row.id);
      if (activeIntake?.id === row.id) {
        setActiveIntake(null);
        setConfirmSummary(null);
      }
      setMessage(t('org.warehouse.intake.draftDeleted', null, 'Draft deleted.'));
      await load();
    } catch (e) {
      setError(e.message || t('org.warehouse.intake.deleteError', null, 'Could not delete draft.'));
    } finally {
      setBusy(false);
    }
  };

  const openIntake = async (row) => {
    setBusy(true);
    setError('');
    setConfirmSummary(null);
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
          'Import a supplier invoice or proforma PDF. Review proposed lines, then Confirm to add SKUs to warehouse stock. Or add a material manually without an invoice.',
        )}
      </Text>

      {canManage ? (
        <View style={styles.actionsRow}>
          <Button mode="contained" onPress={onUpload} loading={busy} disabled={busy} style={styles.flexBtn}>
            {t('org.warehouse.intake.upload', null, 'Import invoice PDF')}
          </Button>
          <Button
            mode="outlined"
            onPress={() => {
              setShowStandalone((v) => !v);
              setConfirmSummary(null);
            }}
            disabled={busy}
            style={styles.flexBtn}
          >
            {t('org.warehouse.intake.addMaterial', null, 'Add material')}
          </Button>
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {message ? <Text style={styles.message}>{message}</Text> : null}

      {confirmSummary ? (
        <AppCard style={[styles.card, styles.summaryCard]}>
          <Text style={styles.cardTitle}>
            {t('org.warehouse.intake.summaryTitle', null, 'Stock update summary')}
          </Text>
          {(confirmSummary.invoice_number || confirmSummary.supplier_name || confirmSummary.source_file_name) ? (
            <Text style={styles.meta}>
              {[
                confirmSummary.supplier_name,
                confirmSummary.invoice_number
                  ? `#${confirmSummary.invoice_number}`
                  : null,
                confirmSummary.source_file_name,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          ) : (
            <Text style={styles.meta}>
              {t('org.warehouse.intake.summaryManual', null, 'Manual material entry')}
            </Text>
          )}
          {(confirmSummary.materials || []).map((m, idx) => (
            <View key={`${m.part_number || m.name}-${idx}`} style={styles.lineRow}>
              <Text style={styles.lineName} numberOfLines={2}>
                {m.name || m.part_number || '—'}
              </Text>
              <Text style={styles.lineMeta}>
                {m.part_number ? `${m.part_number}` : ''}
                {m.part_number_alias ? ` · ${t('org.warehouse.intake.oldSku', null, 'old')} ${m.part_number_alias}` : ''}
                {m.part_number || m.part_number_alias ? ' · ' : ''}
                +{m.quantity_added} {unitDisplay(m.unit_code, t)}
                {' → '}
                {t('org.warehouse.intake.onHand', null, 'On hand')}: {m.quantity_on_hand}
              </Text>
            </View>
          ))}
        </AppCard>
      ) : null}

      {showStandalone && canManage ? (
        <AppCard style={styles.card}>
          <Text style={styles.cardTitle}>
            {t('org.warehouse.intake.addMaterialTitle', null, 'Add material (no invoice)')}
          </Text>
          <TextInput
            label={t('org.warehouse.intake.lineName', null, 'Name / description')}
            value={standalone.description}
            onChangeText={(v) => setStandalone((p) => ({ ...p, description: v }))}
            mode="outlined"
            style={styles.input}
            textColor={ON_CARD}
          />
          <TextInput
            label={t('org.warehouse.intake.partNumber', null, 'Part number / SKU')}
            value={standalone.part_number}
            onChangeText={(v) => setStandalone((p) => ({ ...p, part_number: v }))}
            mode="outlined"
            style={styles.input}
            textColor={ON_CARD}
          />
          <TextInput
            label={t('org.warehouse.intake.oldPartNumber', null, 'Old material number (optional)')}
            value={standalone.part_number_alias}
            onChangeText={(v) => setStandalone((p) => ({ ...p, part_number_alias: v }))}
            mode="outlined"
            style={styles.input}
            textColor={ON_CARD}
          />
          <View style={styles.row2}>
            <TextInput
              label={t('org.warehouse.intake.qty', null, 'Qty')}
              value={standalone.quantity}
              onChangeText={(v) => setStandalone((p) => ({ ...p, quantity: v }))}
              mode="outlined"
              style={[styles.input, styles.flex1]}
              keyboardType="decimal-pad"
              textColor={ON_CARD}
            />
            <TextInput
              label={t('org.warehouse.intake.price', null, 'Price')}
              value={standalone.unit_price}
              onChangeText={(v) => setStandalone((p) => ({ ...p, unit_price: v }))}
              mode="outlined"
              style={[styles.input, styles.flex1]}
              keyboardType="decimal-pad"
              textColor={ON_CARD}
            />
          </View>
          <Text style={styles.sectionLabel}>{t('org.warehouse.intake.unit', null, 'Unit')}</Text>
          <UnitPicker
            value={standalone.unit_code}
            onChange={(code) => setStandalone((p) => ({ ...p, unit_code: code }))}
            t={t}
          />
          <Button mode="contained" onPress={onAddStandalone} loading={busy} disabled={busy} style={styles.primaryBtn}>
            {t('org.warehouse.intake.saveMaterial', null, 'Save to warehouse')}
          </Button>
        </AppCard>
      ) : null}

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
          {activeIntake.buyer_vat_number || activeIntake.organization_vat_number ? (
            <Text
              style={[
                styles.meta,
                activeIntake.buyer_vat_matches_organization === false ? styles.vatWarn : null,
              ]}
            >
              {t('org.warehouse.intake.buyerVat', null, 'Buyer VAT')}:{' '}
              {activeIntake.buyer_vat_number || '—'}
              {activeIntake.organization_vat_number
                ? ` · ${t('org.warehouse.intake.orgVat', null, 'Org VAT')}: ${activeIntake.organization_vat_number}`
                : ''}
              {activeIntake.buyer_vat_matches_organization === false
                ? ` — ${t('org.warehouse.intake.vatMismatchShort', null, 'mismatch')}`
                : ''}
            </Text>
          ) : null}
          {activeIntake.source_file_name ? (
            <Text style={styles.docRef}>
              {t('org.warehouse.intake.documentFile', null, 'Document')}: {activeIntake.source_file_name}
              {activeIntake.layout_id ? ` · ${activeIntake.layout_id}` : ''}
            </Text>
          ) : null}

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
                  {line.part_number_alias
                    ? `${t('org.warehouse.intake.oldSku', null, 'old')} ${line.part_number_alias} · `
                    : ''}
                  {line.quantity} {unitDisplay(line.unit_code, t)} · {priceLabel(line)}
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
              <TextInput
                label={t('org.warehouse.intake.oldPartNumber', null, 'Old material number (optional)')}
                value={manual.part_number_alias}
                onChangeText={(v) => setManual((p) => ({ ...p, part_number_alias: v }))}
                mode="outlined"
                style={styles.input}
                textColor={ON_CARD}
              />
              <View style={styles.row2}>
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
                  label={t('org.warehouse.intake.price', null, 'Price')}
                  value={manual.unit_price}
                  onChangeText={(v) => setManual((p) => ({ ...p, unit_price: v }))}
                  mode="outlined"
                  style={[styles.input, styles.flex1]}
                  keyboardType="decimal-pad"
                  textColor={ON_CARD}
                />
              </View>
              <Text style={styles.sectionLabel}>{t('org.warehouse.intake.unit', null, 'Unit')}</Text>
              <UnitPicker
                value={manual.unit_code}
                onChange={(code) => setManual((p) => ({ ...p, unit_code: code }))}
                t={t}
              />
              <Button mode="outlined" onPress={onAddManual} disabled={busy} style={styles.secondaryBtn}>
                {t('org.warehouse.intake.addLine', null, 'Add line')}
              </Button>
              <Button
                mode="contained"
                onPress={onConfirm}
                loading={busy}
                disabled={busy || activeIntake.buyer_vat_matches_organization === false}
                style={styles.primaryBtn}
              >
                {t('org.warehouse.intake.confirm', null, 'Confirm → warehouse')}
              </Button>
              <Button
                mode="outlined"
                textColor="#B91C1C"
                onPress={() => onDeleteDraft(activeIntake)}
                disabled={busy}
                style={styles.deleteOutlined}
              >
                {t('org.warehouse.intake.delete', null, 'Delete')}
              </Button>
            </View>
          ) : null}
        </AppCard>
      ) : null}

      {intakes.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>
            {t('org.warehouse.intake.history', null, 'Recent imports')}
          </Text>
          {intakes.slice(0, 8).map((row) => (
            <AppCard key={row.id} style={styles.card}>
              <Pressable onPress={() => openIntake(row)}>
                <Text style={styles.lineName}>
                  {row.invoice_number || `#${row.id}`} · {row.status}
                </Text>
                <Text style={styles.lineMeta}>
                  {row.supplier_name || '—'} · {row.lines_count || 0}{' '}
                  {t('org.warehouse.intake.lines', null, 'lines')}
                  {row.source_file_name ? ` · ${row.source_file_name}` : ''}
                </Text>
              </Pressable>
              {row.status === 'draft' && canManage ? (
                <Button
                  mode="outlined"
                  compact
                  textColor="#B91C1C"
                  onPress={() => onDeleteDraft(row)}
                  disabled={busy}
                  style={styles.deleteOutlined}
                >
                  {t('org.warehouse.intake.delete', null, 'Delete')}
                </Button>
              ) : null}
            </AppCard>
          ))}
        </>
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
            'Import an invoice or add a material manually.',
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
              {row.unit_code ? ` ${unitDisplay(row.unit_code, t)}` : ''}
            </Text>
          </AppCard>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  center: { paddingVertical: 40, alignItems: 'center' },
  lead: { color: ON_CARD_MUTED, fontSize: 14, lineHeight: 20 },
  actionsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  flexBtn: { flexGrow: 1 },
  primaryBtn: { marginTop: 4 },
  secondaryBtn: { marginBottom: 8, marginTop: 8 },
  deleteBtn: { alignSelf: 'flex-start', marginTop: 4 },
  deleteOutlined: {
    alignSelf: 'flex-start',
    marginTop: 8,
    borderColor: '#B91C1C',
  },
  vatWarn: { color: '#B91C1C' },
  error: { color: '#B91C1C', fontSize: 13 },
  message: { color: '#15803d', fontSize: 13 },
  card: { padding: 14, gap: 6 },
  summaryCard: { borderLeftWidth: 4, borderLeftColor: '#15803d' },
  cardTitle: { color: ON_CARD, fontSize: 16, fontWeight: '600' },
  meta: { color: ON_CARD_MUTED, fontSize: 12 },
  docRef: { color: ON_CARD_MUTED, fontSize: 12, fontStyle: 'italic' },
  helper: { color: ON_CARD_MUTED, fontSize: 13, marginTop: 6 },
  lineRow: { paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E2E8F0' },
  lineName: { color: ON_CARD, fontSize: 14, fontWeight: '500' },
  lineMeta: { color: ON_CARD_MUTED, fontSize: 12, marginTop: 2 },
  manualBox: { marginTop: 12, gap: 4 },
  sectionLabel: { color: ON_CARD, fontWeight: '600', marginBottom: 4, marginTop: 4 },
  sectionTitle: { color: ON_CARD, fontSize: 15, fontWeight: '600', marginTop: 8 },
  input: { backgroundColor: '#fff', marginBottom: 6 },
  row2: { flexDirection: 'row', gap: 8 },
  flex1: { flex: 1 },
  unitRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  unitChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#fff',
  },
  unitChipSelected: {
    borderColor: '#0F766E',
    backgroundColor: '#CCFBF1',
  },
  unitChipText: { color: ON_CARD_MUTED, fontSize: 12, fontWeight: '500' },
  unitChipTextSelected: { color: '#115E59' },
});
