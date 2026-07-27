/**
 * Org materials intake: Documents (import/review) + Materials (stock list).
 * Confirm writes SKU + quantity_on_hand; drafts are deletable; confirmed invoices stay.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
  deleteMaterialsIntakeLine,
  getMaterialsIntake,
  listMaterialsIntakes,
  listOrgMaterials,
  updateMaterialsIntake,
  updateMaterialsIntakeLine,
  updateOrgMaterial,
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
  { code: 'piece', labelKey: 'org.warehouse.intake.units.piece', fallback: 'бр' },
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

function moneyFromMinor(minor) {
  const n = Number(minor || 0);
  return (n / 100).toFixed(2);
}

function lineTotalLabel(line) {
  if (line?.line_total_inc_vat != null && line.line_total_inc_vat !== '') {
    return String(line.line_total_inc_vat);
  }
  if (line?.line_total_inc_vat_minor != null) {
    return moneyFromMinor(line.line_total_inc_vat_minor);
  }
  const qty = Number(line?.quantity || 0);
  const ex = Number(line?.unit_price_ex_vat_minor || 0);
  const vat = Number(line?.unit_vat_minor || 0);
  const inc = Number(line?.unit_price_inc_vat_minor || ex + vat);
  return ((qty * inc) / 100).toFixed(2);
}

function unitDisplay(code, t) {
  const opt = MATERIAL_UNIT_OPTIONS.find((u) => u.code === code);
  if (!opt) return code || '';
  return t(opt.labelKey, null, opt.fallback);
}

function UnitPicker({ value, onChange, t, disabled }) {
  return (
    <View style={styles.unitRow}>
      {MATERIAL_UNIT_OPTIONS.map((opt) => {
        const selected = value === opt.code;
        return (
          <Pressable
            key={opt.code}
            disabled={disabled}
            onPress={() => onChange(opt.code)}
            style={[
              styles.unitChip,
              selected && styles.unitChipSelected,
              disabled && styles.unitChipDisabled,
            ]}
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

function EditableLineCard({
  line,
  canEdit,
  busy,
  t,
  onSave,
  onConfirmRow,
  onDeleteLine,
  vatBlocked,
}) {
  const [draft, setDraft] = useState({
    description: line.description || '',
    part_number: line.part_number || '',
    part_number_alias: line.part_number_alias || '',
    quantity: String(line.quantity ?? ''),
    unit_code: line.unit_code || 'piece',
    unit_price: line.unit_price || moneyFromMinor(line.unit_price_ex_vat_minor),
  });

  useEffect(() => {
    setDraft({
      description: line.description || '',
      part_number: line.part_number || '',
      part_number_alias: line.part_number_alias || '',
      quantity: String(line.quantity ?? ''),
      unit_code: line.unit_code || 'piece',
      unit_price: line.unit_price || moneyFromMinor(line.unit_price_ex_vat_minor),
    });
  }, [line]);

  const confirmed = Boolean(line.is_confirmed);
  const editable = canEdit && !confirmed;

  return (
    <View style={[styles.tableRow, confirmed && styles.tableRowConfirmed]}>
      <View style={styles.tableGrid}>
        <TextInput
          label={t('org.warehouse.intake.colSku', null, 'Material #')}
          value={draft.part_number}
          onChangeText={(v) => setDraft((p) => ({ ...p, part_number: v }))}
          mode="outlined"
          dense
          style={[styles.input, styles.colSku]}
          textColor={ON_CARD}
          editable={editable}
        />
        <TextInput
          label={t('org.warehouse.intake.colName', null, 'Name')}
          value={draft.description}
          onChangeText={(v) => setDraft((p) => ({ ...p, description: v }))}
          mode="outlined"
          dense
          style={[styles.input, styles.colName]}
          textColor={ON_CARD}
          editable={editable}
        />
        <TextInput
          label={t('org.warehouse.intake.qty', null, 'Qty')}
          value={draft.quantity}
          onChangeText={(v) => setDraft((p) => ({ ...p, quantity: v }))}
          mode="outlined"
          dense
          style={[styles.input, styles.colQty]}
          keyboardType="decimal-pad"
          textColor={ON_CARD}
          editable={editable}
        />
        <TextInput
          label={t('org.warehouse.intake.colPriceEx', null, 'Unit ex-VAT')}
          value={draft.unit_price}
          onChangeText={(v) => setDraft((p) => ({ ...p, unit_price: v }))}
          mode="outlined"
          dense
          style={[styles.input, styles.colPrice]}
          keyboardType="decimal-pad"
          textColor={ON_CARD}
          editable={editable}
        />
        <TextInput
          label={t('org.warehouse.intake.colVat', null, 'VAT')}
          value={line.unit_vat != null ? String(line.unit_vat) : moneyFromMinor(line.unit_vat_minor)}
          mode="outlined"
          dense
          style={[styles.input, styles.colPrice]}
          textColor={ON_CARD}
          editable={false}
        />
        <TextInput
          label={t('org.warehouse.intake.colPriceInc', null, 'With VAT')}
          value={
            line.unit_price_inc_vat != null
              ? String(line.unit_price_inc_vat)
              : moneyFromMinor(line.unit_price_inc_vat_minor)
          }
          mode="outlined"
          dense
          style={[styles.input, styles.colPrice]}
          textColor={ON_CARD}
          editable={false}
        />
        <TextInput
          label={t('org.warehouse.intake.colTotal', null, 'Line total')}
          value={lineTotalLabel(line)}
          mode="outlined"
          dense
          style={[styles.input, styles.colPrice]}
          textColor={ON_CARD}
          editable={false}
        />
      </View>
      {line.part_number_alias ? (
        <Text style={styles.lineMeta}>
          {t('org.warehouse.intake.oldSku', null, 'old')} {line.part_number_alias}
        </Text>
      ) : null}
      <Text style={styles.sectionLabel}>{t('org.warehouse.intake.unit', null, 'Unit')}</Text>
      <UnitPicker
        value={draft.unit_code}
        onChange={(code) => setDraft((p) => ({ ...p, unit_code: code }))}
        t={t}
        disabled={!editable}
      />
      {confirmed ? (
        <Text style={styles.confirmedBadge}>
          {t('org.warehouse.intake.lineConfirmed', null, 'Confirmed → stock')}
        </Text>
      ) : null}
      {editable ? (
        <View style={styles.lineActions}>
          <Button
            mode="outlined"
            compact
            disabled={busy}
            onPress={() => onSave(line.id, draft)}
          >
            {t('org.warehouse.intake.saveLine', null, 'Save row')}
          </Button>
          <Button
            mode="contained"
            compact
            disabled={busy || vatBlocked}
            onPress={() => onConfirmRow(line.id)}
          >
            {t('org.warehouse.intake.confirmRow', null, 'Confirm row')}
          </Button>
          <Button
            mode="text"
            compact
            textColor="#B91C1C"
            disabled={busy}
            onPress={() => onDeleteLine(line.id)}
          >
            {t('org.warehouse.intake.deleteLine', null, 'Remove')}
          </Button>
        </View>
      ) : null}
    </View>
  );
}

export default function OrgMaterialsIntakePanel({
  organizationId,
  canManage,
  section = 'documents',
}) {
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
  const [supplierDraft, setSupplierDraft] = useState('');
  const [editingMaterial, setEditingMaterial] = useState(null);

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

  useEffect(() => {
    setSupplierDraft(activeIntake?.supplier_name || '');
  }, [activeIntake?.id, activeIntake?.supplier_name]);

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

  const refreshActive = async (token, intakeId) => {
    const refreshed = await getMaterialsIntake(token, organizationId, intakeId);
    setActiveIntake(refreshed);
    return refreshed;
  };

  const onSaveSupplier = async () => {
    if (!activeIntake?.id || activeIntake.status !== 'draft') return;
    setBusy(true);
    setError('');
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const data = await updateMaterialsIntake(token, organizationId, activeIntake.id, {
        supplier_name: supplierDraft.trim(),
      });
      setActiveIntake(data);
      setMessage(t('org.warehouse.intake.supplierSaved', null, 'Supplier saved.'));
    } catch (e) {
      setError(e.message || t('org.warehouse.intake.saveError', null, 'Could not save.'));
    } finally {
      setBusy(false);
    }
  };

  const onSaveLine = async (lineId, draft) => {
    if (!activeIntake?.id) return;
    setBusy(true);
    setError('');
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      await updateMaterialsIntakeLine(token, organizationId, activeIntake.id, lineId, {
        description: draft.description.trim(),
        part_number: draft.part_number.trim(),
        part_number_alias: draft.part_number_alias.trim(),
        quantity: draft.quantity || '1',
        unit_code: draft.unit_code || 'piece',
        unit_price: draft.unit_price || '0',
      });
      await refreshActive(token, activeIntake.id);
      setMessage(t('org.warehouse.intake.lineSaved', null, 'Row saved.'));
    } catch (e) {
      setError(e.message || t('org.warehouse.intake.lineError', null, 'Could not update line.'));
    } finally {
      setBusy(false);
    }
  };

  const onDeleteLine = async (lineId) => {
    if (!activeIntake?.id) return;
    const ok = await confirmMessage(
      t('org.warehouse.intake.deleteLineTitle', null, 'Remove line?'),
      t('org.warehouse.intake.deleteLineBody', null, 'This removes the draft line only.'),
      { confirmLabel: t('org.warehouse.intake.delete', null, 'Delete') },
    );
    if (!ok) return;
    setBusy(true);
    setError('');
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      await deleteMaterialsIntakeLine(token, organizationId, activeIntake.id, lineId);
      await refreshActive(token, activeIntake.id);
    } catch (e) {
      setError(e.message || t('org.warehouse.intake.lineError', null, 'Could not delete line.'));
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
      await refreshActive(token, activeIntake.id);
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
      setMessage(t('org.warehouse.intake.manualCreated', null, 'Material added to warehouse stock.'));
      setStandalone(emptyManual());
      setShowStandalone(false);
      await load();
    } catch (e) {
      setError(e.message || t('org.warehouse.intake.lineError', null, 'Could not add material.'));
    } finally {
      setBusy(false);
    }
  };

  const applyConfirmResult = async (data) => {
    setActiveIntake(data);
    setConfirmSummary(data.confirm_summary || null);
    setMessage(
      t(
        'org.warehouse.intake.confirmed',
        null,
        'Confirmed — materials are in warehouse stock (SKU + on-hand qty).',
      ),
    );
    await load();
  };

  const onConfirmAll = async () => {
    if (!activeIntake?.id || activeIntake.status !== 'draft') return;
    const pending = (activeIntake.lines || []).filter((l) => !l.is_confirmed).length;
    const ok = await confirmMessage(
      t('org.warehouse.intake.confirmAllTitle', null, 'Confirm all lines?'),
      t(
        'org.warehouse.intake.confirmAllBody',
        { count: pending },
        `Writes ${pending} SKU(s) to warehouse and adds quantities on hand. Original invoice stays permanently.`,
      ),
      { confirmLabel: t('org.warehouse.intake.confirm', null, 'Confirm → warehouse') },
    );
    if (!ok) return;
    setBusy(true);
    setError('');
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const data = await confirmMaterialsIntake(token, organizationId, activeIntake.id, {});
      await applyConfirmResult(data);
    } catch (e) {
      setError(e.message || t('org.warehouse.intake.confirmError', null, 'Confirm failed.'));
    } finally {
      setBusy(false);
    }
  };

  const onConfirmRow = async (lineId) => {
    if (!activeIntake?.id) return;
    const ok = await confirmMessage(
      t('org.warehouse.intake.confirmRowTitle', null, 'Confirm this row?'),
      t(
        'org.warehouse.intake.confirmRowBody',
        null,
        'Creates/updates the SKU and adds this quantity to on-hand stock.',
      ),
      { confirmLabel: t('org.warehouse.intake.confirmRow', null, 'Confirm row') },
    );
    if (!ok) return;
    setBusy(true);
    setError('');
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const data = await confirmMaterialsIntake(token, organizationId, activeIntake.id, {
        line_id: lineId,
      });
      await applyConfirmResult(data);
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
        'This removes the unfinished import and its lines. Stock is unchanged. Confirmed invoices are never deleted.',
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

  const onSaveMaterial = async () => {
    if (!editingMaterial?.stock_id) return;
    setBusy(true);
    setError('');
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      await updateOrgMaterial(token, organizationId, editingMaterial.stock_id, {
        name: editingMaterial.name,
        part_number: editingMaterial.part_number,
        description: editingMaterial.description,
      });
      setEditingMaterial(null);
      setMessage(t('org.warehouse.intake.materialUpdated', null, 'Material updated.'));
      await load();
    } catch (e) {
      setError(e.message || t('org.warehouse.intake.saveError', null, 'Could not save.'));
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

  const vatBlocked = activeIntake?.buyer_vat_matches_organization === false;
  const isDocuments = section === 'documents';
  const isMaterials = section === 'materials';

  return (
    <View style={styles.wrap}>
      {isDocuments ? (
        <Text style={styles.lead}>
          {t(
            'org.warehouse.intake.documentsLead',
            null,
            'Import supplier invoices, review lines in the table, then Confirm row or Confirm all. Confirmed invoices stay forever; drafts can be deleted.',
          )}
        </Text>
      ) : (
        <Text style={styles.lead}>
          {t(
            'org.warehouse.intake.materialsLead',
            null,
            'On-hand stock from confirmed imports. Issuing materials to a task will decrease quantity here (next slice).',
          )}
        </Text>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {message ? <Text style={styles.message}>{message}</Text> : null}

      {confirmSummary ? (
        <AppCard style={[styles.card, styles.summaryCard]}>
          <Text style={styles.cardTitle}>
            {t('org.warehouse.intake.summaryTitle', null, 'Stock update summary')}
          </Text>
          <Text style={styles.meta}>
            {t(
              'org.warehouse.intake.confirmWrites',
              null,
              'Wrote SKU + on-hand quantity for each confirmed line.',
            )}
          </Text>
          {(confirmSummary.materials || []).map((m, idx) => (
            <View key={`${m.part_number || m.name}-${idx}`} style={styles.lineRow}>
              <Text style={styles.lineName} numberOfLines={2}>
                {m.name || m.part_number || '—'}
              </Text>
              <Text style={styles.lineMeta}>
                {m.part_number ? `${m.part_number}` : ''}
                {m.part_number_alias
                  ? ` · ${t('org.warehouse.intake.oldSku', null, 'old')} ${m.part_number_alias}`
                  : ''}
                {m.part_number || m.part_number_alias ? ' · ' : ''}
                +{m.quantity_added} {unitDisplay(m.unit_code, t)}
                {' → '}
                {t('org.warehouse.intake.onHand', null, 'On hand')}: {m.quantity_on_hand}
              </Text>
            </View>
          ))}
        </AppCard>
      ) : null}

      {isDocuments && canManage ? (
        <Button mode="contained" onPress={onUpload} loading={busy} disabled={busy}>
          {t('org.warehouse.intake.upload', null, 'Import invoice PDF')}
        </Button>
      ) : null}

      {isMaterials && canManage ? (
        <Button
          mode="outlined"
          onPress={() => {
            setShowStandalone((v) => !v);
            setConfirmSummary(null);
          }}
          disabled={busy}
        >
          {t('org.warehouse.intake.addMaterial', null, 'Add material')}
        </Button>
      ) : null}

      {isMaterials && showStandalone && canManage ? (
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
          <Button mode="contained" onPress={onAddStandalone} loading={busy} disabled={busy}>
            {t('org.warehouse.intake.saveMaterial', null, 'Save to warehouse')}
          </Button>
        </AppCard>
      ) : null}

      {isDocuments && activeIntake ? (
        <AppCard style={styles.card}>
          <Text style={styles.cardTitle}>
            {activeIntake.document_kind === 'proforma'
              ? t('org.warehouse.intake.proforma', null, 'Proforma')
              : t('org.warehouse.intake.invoice', null, 'Invoice')}
            {activeIntake.invoice_number ? ` #${activeIntake.invoice_number}` : ''}
          </Text>
          <Text style={styles.meta}>
            {activeIntake.status}
            {activeIntake.source_file_name ? ` · ${activeIntake.source_file_name}` : ''}
            {activeIntake.layout_id ? ` · ${activeIntake.layout_id}` : ''}
          </Text>

          {activeIntake.status === 'draft' && canManage ? (
            <View style={styles.supplierRow}>
              <TextInput
                label={t('org.warehouse.intake.supplier', null, 'Supplier')}
                value={supplierDraft}
                onChangeText={setSupplierDraft}
                mode="outlined"
                style={[styles.input, styles.flex1]}
                textColor={ON_CARD}
              />
              <Button mode="outlined" onPress={onSaveSupplier} disabled={busy} style={styles.supplierSave}>
                {t('org.warehouse.intake.saveSupplier', null, 'Save supplier')}
              </Button>
            </View>
          ) : (
            <Text style={styles.meta}>
              {activeIntake.supplier_name
                || t('org.warehouse.intake.unknownSupplier', null, 'Supplier unknown')}
            </Text>
          )}

          {activeIntake.buyer_vat_number || activeIntake.organization_vat_number ? (
            <Text style={[styles.meta, vatBlocked ? styles.vatWarn : null]}>
              {t('org.warehouse.intake.buyerVat', null, 'Buyer VAT')}:{' '}
              {activeIntake.buyer_vat_number || '—'}
              {activeIntake.organization_vat_number
                ? ` · ${t('org.warehouse.intake.orgVat', null, 'Org VAT')}: ${activeIntake.organization_vat_number}`
                : ''}
              {vatBlocked
                ? ` — ${t('org.warehouse.intake.vatMismatchShort', null, 'mismatch')}`
                : ''}
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
            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View style={styles.tableWrap}>
                <Text style={styles.tableHint}>
                  {t(
                    'org.warehouse.intake.tableHint',
                    null,
                    'Edit fields, pick unit, Save row, then Confirm row or Confirm all.',
                  )}
                </Text>
                {(activeIntake.lines || []).map((line) => (
                  <EditableLineCard
                    key={line.id}
                    line={line}
                    canEdit={activeIntake.status === 'draft' && canManage}
                    busy={busy}
                    t={t}
                    onSave={onSaveLine}
                    onConfirmRow={onConfirmRow}
                    onDeleteLine={onDeleteLine}
                    vatBlocked={vatBlocked}
                  />
                ))}
              </View>
            </ScrollView>
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
                  label={t('org.warehouse.intake.colPriceEx', null, 'Unit ex-VAT')}
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
              <Text style={styles.helper}>
                {t(
                  'org.warehouse.intake.confirmHint',
                  null,
                  'Confirm writes each line as a warehouse SKU and adds quantity on hand. Original invoice is kept permanently.',
                )}
              </Text>
              <Button
                mode="contained"
                onPress={onConfirmAll}
                loading={busy}
                disabled={busy || vatBlocked}
                style={styles.primaryBtn}
              >
                {t('org.warehouse.intake.confirm', null, 'Confirm all → warehouse')}
              </Button>
              <Button
                mode="outlined"
                textColor="#B91C1C"
                onPress={() => onDeleteDraft(activeIntake)}
                disabled={busy}
                style={styles.deleteOutlined}
              >
                {t('org.warehouse.intake.delete', null, 'Delete draft')}
              </Button>
            </View>
          ) : null}
        </AppCard>
      ) : null}

      {isDocuments && intakes.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>
            {t('org.warehouse.intake.history', null, 'Recent imports')}
          </Text>
          {intakes.slice(0, 12).map((row) => (
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
                  {t('org.warehouse.intake.delete', null, 'Delete draft')}
                </Button>
              ) : row.status === 'confirmed' ? (
                <Text style={styles.keptNote}>
                  {t(
                    'org.warehouse.intake.keptForever',
                    null,
                    'Confirmed — original kept permanently',
                  )}
                </Text>
              ) : null}
            </AppCard>
          ))}
        </>
      ) : null}

      {isMaterials ? (
        <>
          <Text style={styles.sectionTitle}>
            {t('org.warehouse.intake.stockTitle', null, 'Warehouse materials')}
          </Text>
          {editingMaterial ? (
            <AppCard style={styles.card}>
              <Text style={styles.cardTitle}>
                {t('org.warehouse.intake.editMaterial', null, 'Edit material')}
              </Text>
              <TextInput
                label={t('org.warehouse.intake.lineName', null, 'Name / description')}
                value={editingMaterial.name}
                onChangeText={(v) => setEditingMaterial((p) => ({ ...p, name: v }))}
                mode="outlined"
                style={styles.input}
                textColor={ON_CARD}
              />
              <TextInput
                label={t('org.warehouse.intake.partNumber', null, 'Part number / SKU')}
                value={editingMaterial.part_number}
                onChangeText={(v) => setEditingMaterial((p) => ({ ...p, part_number: v }))}
                mode="outlined"
                style={styles.input}
                textColor={ON_CARD}
              />
              <Text style={styles.meta}>
                {t('org.warehouse.intake.onHand', null, 'On hand')}: {editingMaterial.quantity_on_hand}
                {editingMaterial.unit_code
                  ? ` ${unitDisplay(editingMaterial.unit_code, t)}`
                  : ''}
              </Text>
              <View style={styles.lineActions}>
                <Button mode="contained" onPress={onSaveMaterial} loading={busy} disabled={busy}>
                  {t('common.save', null, 'Save')}
                </Button>
                <Button mode="text" onPress={() => setEditingMaterial(null)} textColor={ON_CARD}>
                  {t('common.cancel', null, 'Cancel')}
                </Button>
              </View>
            </AppCard>
          ) : null}
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
              <Pressable
                key={row.stock_id || row.id}
                onPress={() => {
                  if (!canManage) return;
                  setEditingMaterial({
                    stock_id: row.stock_id,
                    name: row.name || '',
                    part_number: row.part_number || '',
                    description: row.description || row.name || '',
                    quantity_on_hand: row.quantity_on_hand,
                    unit_code: row.unit_code,
                  });
                }}
              >
                <AppCard style={styles.card}>
                  <Text style={styles.lineName}>{row.name}</Text>
                  <Text style={styles.lineMeta}>
                    {row.part_number ? `${row.part_number} · ` : ''}
                    {t('org.warehouse.intake.onHand', null, 'On hand')}: {row.quantity_on_hand}
                    {row.unit_code ? ` ${unitDisplay(row.unit_code, t)}` : ''}
                    {canManage
                      ? ` · ${t('org.warehouse.intake.tapToEdit', null, 'Tap to edit')}`
                      : ''}
                  </Text>
                </AppCard>
              </Pressable>
            ))
          )}
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
  secondaryBtn: { marginBottom: 8, marginTop: 8 },
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
  helper: { color: ON_CARD_MUTED, fontSize: 13, marginTop: 6, marginBottom: 6 },
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
  unitChipDisabled: { opacity: 0.55 },
  unitChipText: { color: ON_CARD_MUTED, fontSize: 12, fontWeight: '500' },
  unitChipTextSelected: { color: '#115E59' },
  tableWrap: { minWidth: 720, gap: 10, paddingBottom: 4 },
  tableHint: { color: ON_CARD_MUTED, fontSize: 12, marginBottom: 4 },
  tableRow: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#F8FAFC',
    gap: 4,
  },
  tableRowConfirmed: {
    borderColor: '#86EFAC',
    backgroundColor: '#F0FDF4',
  },
  tableGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colSku: { width: 130 },
  colName: { width: 220 },
  colQty: { width: 90 },
  colPrice: { width: 110 },
  lineActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  confirmedBadge: { color: '#15803d', fontSize: 12, fontWeight: '600' },
  supplierRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' },
  supplierSave: { marginTop: 6 },
  keptNote: { color: ON_CARD_MUTED, fontSize: 11, fontStyle: 'italic', marginTop: 4 },
});
