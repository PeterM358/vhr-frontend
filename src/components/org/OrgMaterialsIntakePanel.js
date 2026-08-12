/**
 * Org materials intake: Documents (import/review) + Materials (stock list).
 * Confirm writes SKU + quantity_on_hand; drafts are deletable; confirmed invoices stay.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, Button, TextInput } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';

import AppCard from '../ui/AppCard';
import EmptyStateCard from '../ui/EmptyStateCard';
import {
  addMaterialsIntakeLine,
  confirmMaterialsIntake,
  createOrgMaterial,
  createMaterialScrap,
  deleteMaterialsIntake,
  deleteMaterialsIntakeLine,
  getMaterialsIntake,
  listMaterialsIntakes,
  listOrgMaterials,
  openMaterialsIntakeFile,
  updateMaterialsIntake,
  updateMaterialsIntakeLine,
  updateOrgMaterial,
  uploadMaterialsIntake,
} from '../../api/orgWarehouse';
import { pickReceiptOrInvoiceAttachment } from '../../utils/pickDocumentFile';
import { confirmMessage } from '../../utils/crossPlatformAlert';
import {
  extractOldMaterialNumber,
  formatMaterialListLabel,
  stripOldMaterialSuffix,
} from '../../utils/materialDisplayLabel';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import { useTranslation } from '../../i18n';
import { fetchUnits } from '../../api/partCatalog';
import UnitOfMeasurePicker from './UnitOfMeasurePicker';
import { navigateToOrgCompanyAccount } from '../../navigation/webNavigation';

/** Text on light AppCard / FloatingCard surfaces. */
const ON_CARD = '#0F172A';
const ON_CARD_MUTED = '#475569';
/** Text on dark org ScreenBackground chrome (outside cards). */
const ON_CHROME = 'rgba(255,255,255,0.92)';
const ON_CHROME_MUTED = 'rgba(255,255,255,0.72)';
const ON_CHROME_SOFT = 'rgba(255,255,255,0.62)';

/** Match warehouse / ops unit vocabulary (materials.UnitOfMeasure codes). */
export const MATERIAL_UNIT_OPTIONS = [
  { code: 'piece', labelKey: 'org.warehouse.intake.units.piece', fallback: 'бр' },
  { code: 'roll', labelKey: 'org.warehouse.intake.units.roll', fallback: 'ролка' },
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
    is_durable_tool: false,
    invoice_number: '',
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

function UnitPicker({ value, onChange, t, disabled, units, locale }) {
  const list = Array.isArray(units) && units.length
    ? units
    : MATERIAL_UNIT_OPTIONS.map((opt) => ({
        id: opt.code,
        code: opt.code,
        symbol: t(opt.labelKey, null, opt.fallback),
        name: t(opt.labelKey, null, opt.fallback),
        name_bg: t(opt.labelKey, null, opt.fallback),
        name_en: t(opt.labelKey, null, opt.fallback),
        is_active: true,
      }));
  return (
    <UnitOfMeasurePicker
      units={list}
      valueCode={value}
      disabled={disabled}
      emptyLabel={t('org.warehouse.intake.unit', null, 'Unit')}
      locale={locale}
      onChange={({ code }) => onChange(code)}
    />
  );
}

function EditableLineCard({
  line,
  canEdit,
  busy,
  t,
  locale,
  onSave,
  onConfirmRow,
  onDeleteLine,
  vatBlocked,
  units,
}) {
  const [draft, setDraft] = useState({
    description: line.description || '',
    part_number: line.part_number || '',
    part_number_alias: line.part_number_alias || '',
    quantity: String(line.quantity ?? ''),
    unit_code: line.unit_code || 'piece',
    unit_price: line.unit_price || moneyFromMinor(line.unit_price_ex_vat_minor),
    is_durable_tool: Boolean(line.is_durable_tool),
  });

  useEffect(() => {
    setDraft({
      description: line.description || '',
      part_number: line.part_number || '',
      part_number_alias: line.part_number_alias || '',
      quantity: String(line.quantity ?? ''),
      unit_code: line.unit_code || 'piece',
      unit_price: line.unit_price || moneyFromMinor(line.unit_price_ex_vat_minor),
      is_durable_tool: Boolean(line.is_durable_tool),
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
        locale={locale}
        disabled={!editable}
        units={units}
      />
      <View style={styles.switchRow}>
        <View style={styles.switchLabelWrap}>
          <Text style={styles.sectionLabel}>
            {t('org.warehouse.intake.durableTool', null, 'Durable tool (hand machine)')}
          </Text>
          <Text style={styles.helper}>
            {t(
              'org.warehouse.intake.durableToolHint',
              null,
              'Drill, grinder, etc. — not consumed on tasks; write off via scrap when broken.',
            )}
          </Text>
        </View>
        <Switch
          value={Boolean(draft.is_durable_tool)}
          disabled={!editable}
          onValueChange={(v) => setDraft((p) => ({ ...p, is_durable_tool: v }))}
        />
      </View>
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
  canPostIntake = null,
  section = 'documents',
  locations = [],
  navigation = null,
  documentsListKey = 0,
}) {
  const { t, locale } = useTranslation();
  const canPost = canPostIntake == null ? Boolean(canManage) : Boolean(canPostIntake);
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
  const [materialQuery, setMaterialQuery] = useState('');
  const [docQuery, setDocQuery] = useState('');
  const [confirmLocationId, setConfirmLocationId] = useState(null);
  const [legalComplete, setLegalComplete] = useState(true);
  const [catalogUnits, setCatalogUnits] = useState([]);

  const activeLocations = useMemo(
    () => (Array.isArray(locations) ? locations.filter((r) => r && r.is_active !== false) : []),
    [locations],
  );

  const load = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    setError('');
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const [intakeData, matData, unitsData] = await Promise.all([
        listMaterialsIntakes(token, organizationId),
        listOrgMaterials(token, organizationId, { limit: 500 }),
        fetchUnits(token).catch(() => []),
      ]);
      setIntakes(Array.isArray(intakeData?.results) ? intakeData.results : []);
      setMaterials(Array.isArray(matData?.results) ? matData.results : []);
      const unitRows = Array.isArray(unitsData)
        ? unitsData
        : Array.isArray(unitsData?.results)
          ? unitsData.results
          : [];
      setCatalogUnits(
        unitRows.map((u) => ({
          id: u.id,
          code: u.code,
          name: u.name || u.symbol || u.code,
          name_bg: u.name_bg || '',
          name_en: u.name_en || u.name || '',
          symbol: u.symbol || u.name || u.code,
          is_active: u.is_active !== false,
        })),
      );
      if (typeof intakeData?.legal_entity_complete === 'boolean') {
        setLegalComplete(intakeData.legal_entity_complete);
      }
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

  useEffect(() => {
    if (section !== 'materials') {
      setMaterialQuery('');
      setShowStandalone(false);
      setEditingMaterial(null);
    }
    if (section !== 'documents') {
      setDocQuery('');
      // Leaving Documents must not leave a stuck detail when returning later.
      setActiveIntake(null);
      setConfirmSummary(null);
    }
  }, [section]);

  // Documents tab press (even when already on Documents) always shows the list.
  useEffect(() => {
    if (section === 'documents' && documentsListKey > 0) {
      setActiveIntake(null);
      setConfirmSummary(null);
      setMessage('');
    }
  }, [documentsListKey, section]);

  useEffect(() => {
    if (!confirmLocationId && activeLocations.length === 1) {
      setConfirmLocationId(activeLocations[0].id);
    }
  }, [activeLocations, confirmLocationId]);

  const filteredMaterials = useMemo(() => {
    const q = materialQuery.trim().toLowerCase();
    if (!q) return materials;
    return materials.filter((row) => {
      const haystack = [
        row.name,
        row.part_number,
        row.org_sku,
        row.description,
        row.brand,
        row.location_name,
        row.location_code,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [materials, materialQuery]);

  const filteredIntakes = useMemo(() => {
    const q = docQuery.trim().toLowerCase();
    if (!q) return intakes;
    return intakes.filter((row) => {
      const haystack = [
        row.invoice_number,
        row.supplier_name,
        row.source_file_name,
        row.status,
        row.buyer_vat_number,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [docQuery, intakes]);

  const locationBlocked = !confirmLocationId;
  const legalBlocked = legalComplete === false
    || activeIntake?.legal_entity_complete === false;

  const onUpload = async () => {
    if (!canPost || !organizationId) return;
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
        is_durable_tool: Boolean(draft.is_durable_tool),
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
      {
        confirmLabel: t('org.warehouse.intake.deleteLine', null, 'Remove'),
        cancelLabel: t('common.cancel', null, 'Cancel'),
        destructive: true,
      },
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
        is_durable_tool: Boolean(manual.is_durable_tool),
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
    const qty = Number(standalone.quantity || 0);
    if (qty > 0 && !confirmLocationId) {
      setError(
        t(
          'org.warehouse.intake.locationRequired',
          null,
          'Select a warehouse location before storing quantity.',
        ),
      );
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const payload = {
        description: standalone.description.trim(),
        part_number: standalone.part_number.trim(),
        part_number_alias: standalone.part_number_alias.trim(),
        quantity: standalone.quantity || '0',
        unit_code: standalone.unit_code || 'piece',
        unit_price: standalone.unit_price || '0',
      };
      if (confirmLocationId) payload.location_id = confirmLocationId;
      payload.is_durable_tool = Boolean(standalone.is_durable_tool);
      if (standalone.invoice_number?.trim()) {
        payload.invoice_number = standalone.invoice_number.trim();
      }
      const created = await createOrgMaterial(token, organizationId, payload);
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
            location_name: created.location_name,
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
        'Confirmed — materials are in warehouse stock (SKU + on-stock qty).',
      ),
    );
    await load();
  };

  const ensureConfirmReady = () => {
    if (legalBlocked) {
      setError(
        t(
          'org.warehouse.intake.legalRequired',
          null,
          'Complete organization legal entity (name, VAT/EIK, address) before confirming.',
        ),
      );
      return false;
    }
    if (!confirmLocationId) {
      setError(
        t(
          'org.warehouse.intake.locationRequired',
          null,
          'Select a warehouse location before confirming into stock.',
        ),
      );
      return false;
    }
    return true;
  };

  const onConfirmAll = async () => {
    if (!activeIntake?.id || activeIntake.status !== 'draft') return;
    if (!ensureConfirmReady()) return;
    const pending = (activeIntake.lines || []).filter((l) => !l.is_confirmed).length;
    const ok = await confirmMessage(
      t('org.warehouse.intake.confirmAllTitle', null, 'Confirm all lines?'),
      t(
        'org.warehouse.intake.confirmAllBody',
        { count: pending },
        `Writes ${pending} SKU(s) to warehouse and adds quantities on stock. Original invoice stays permanently.`,
      ),
      {
        confirmLabel: t('org.warehouse.intake.confirm', null, 'Confirm all → warehouse'),
        cancelLabel: t('common.cancel', null, 'Cancel'),
      },
    );
    if (!ok) return;
    setBusy(true);
    setError('');
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const data = await confirmMaterialsIntake(token, organizationId, activeIntake.id, {
        location_id: confirmLocationId,
      });
      await applyConfirmResult(data);
    } catch (e) {
      setError(e.message || t('org.warehouse.intake.confirmError', null, 'Confirm failed.'));
    } finally {
      setBusy(false);
    }
  };

  const onConfirmRow = async (lineId) => {
    if (!activeIntake?.id) return;
    if (!ensureConfirmReady()) return;
    const ok = await confirmMessage(
      t('org.warehouse.intake.confirmRowTitle', null, 'Confirm this row?'),
      t(
        'org.warehouse.intake.confirmRowBody',
        null,
        'Creates/updates the SKU and adds this quantity to on-stock quantity.',
      ),
      {
        confirmLabel: t('org.warehouse.intake.confirmRow', null, 'Confirm row'),
        cancelLabel: t('common.cancel', null, 'Cancel'),
      },
    );
    if (!ok) return;
    setBusy(true);
    setError('');
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      const data = await confirmMaterialsIntake(token, organizationId, activeIntake.id, {
        line_id: lineId,
        location_id: confirmLocationId,
      });
      await applyConfirmResult(data);
    } catch (e) {
      setError(e.message || t('org.warehouse.intake.confirmError', null, 'Confirm failed.'));
    } finally {
      setBusy(false);
    }
  };

  const onDeleteDraft = async (row) => {
    if (!canPost || !row?.id || row.status !== 'draft') return;
    const ok = await confirmMessage(
      t('org.warehouse.intake.deleteDraftTitle', null, 'Delete draft?'),
      t(
        'org.warehouse.intake.deleteDraftBody',
        null,
        'This removes the unfinished import and its lines. Stock is unchanged. Confirmed invoices are never deleted.',
      ),
      {
        confirmLabel: t('org.warehouse.intake.delete', null, 'Delete'),
        cancelLabel: t('common.cancel', null, 'Cancel'),
        destructive: true,
      },
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
      if (typeof data?.legal_entity_complete === 'boolean') {
        setLegalComplete(data.legal_entity_complete);
      }
    } catch (e) {
      setError(e.message || t('org.warehouse.intake.loadError', null, 'Could not load intake.'));
    } finally {
      setBusy(false);
    }
  };

  const closeDetail = () => {
    setActiveIntake(null);
    setConfirmSummary(null);
    setMessage('');
    setError('');
  };

  const onOpenPdf = async () => {
    if (!activeIntake?.id || !activeIntake.has_source_file) return;
    setBusy(true);
    setError('');
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      await openMaterialsIntakeFile(token, organizationId, activeIntake.id);
    } catch (e) {
      setError(e.message || t('org.warehouse.intake.pdfError', null, 'Could not open PDF.'));
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
        is_durable_tool: Boolean(editingMaterial.is_durable_tool),
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

  const onScrapMaterial = async () => {
    if (!editingMaterial?.stock_id || !canManage) return;
    const qty = String(editingMaterial.scrap_qty || '1').trim() || '1';
    const ok = await confirmMessage(
      t('org.warehouse.intake.scrapMaterialTitle', null, 'Write off from stock?'),
      t(
        'org.warehouse.intake.scrapMaterialBody',
        { qty },
        `Removes ${qty} from on-hand quantity (брак). Use when the tool is broken or worn out.`,
      ),
    );
    if (!ok) return;
    setBusy(true);
    setError('');
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      await createMaterialScrap(token, organizationId, {
        reason: editingMaterial.scrap_reason || 'broken',
        lines: [
          {
            material_id: editingMaterial.material_id || editingMaterial.id,
            quantity: qty,
          },
        ],
      });
      setMessage(
        t('org.warehouse.intake.scrapMaterialDone', null, 'Written off from warehouse stock.'),
      );
      setEditingMaterial(null);
      await load();
    } catch (e) {
      setError(
        e.message || t('org.warehouse.intake.scrapMaterialError', null, 'Could not write off material.'),
      );
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  const vatBlocked = activeIntake?.buyer_vat_matches_organization === false;
  const confirmBlocked = Boolean(vatBlocked || locationBlocked || legalBlocked);
  const isDocuments = section === 'documents';
  const isMaterials = section === 'materials';
  const hasSearch = materialQuery.trim().length > 0;
  const detailOpen = isDocuments && Boolean(activeIntake);

  return (
    <View style={styles.wrap}>
      {isDocuments ? (
        <Text style={styles.chromeLead}>
          {t(
            'org.warehouse.intake.documentsLead',
            null,
            'Import supplier invoices. Open a document for full detail + PDF. Confirm stores stock at a chosen location.',
          )}
        </Text>
      ) : (
        <Text style={styles.chromeLead}>
          {t(
            'org.warehouse.intake.materialsLead',
            null,
            'On-stock materials from confirmed imports. Issuing materials to a task will decrease quantity here (next slice).',
          )}
        </Text>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {message ? <Text style={styles.message}>{message}</Text> : null}

      {legalBlocked ? (
        <AppCard style={[styles.card, styles.warnCard]}>
          <Text style={styles.cardTitle}>
            {t('org.warehouse.intake.legalTitle', null, 'Organization legal entity required')}
          </Text>
          <Text style={styles.meta}>
            {t(
              'org.warehouse.intake.legalBody',
              null,
              'Fill legal name, VAT/EIK and registered address in Organization → Company details before confirming stock.',
            )}
          </Text>
          {navigation ? (
            <Button
              mode="contained"
              onPress={() =>
                navigateToOrgCompanyAccount(navigation, {
                  orgId: organizationId,
                  tab: 'company',
                })
              }
              style={styles.primaryBtn}
            >
              {t('org.warehouse.intake.openLegal', null, 'Open company details')}
            </Button>
          ) : null}
        </AppCard>
      ) : null}

      {confirmSummary ? (
        <AppCard style={[styles.card, styles.summaryCard]}>
          <Text style={styles.cardTitle}>
            {t('org.warehouse.intake.summaryTitle', null, 'Stock update summary')}
          </Text>
          <Text style={styles.meta}>
            {t(
              'org.warehouse.intake.confirmWrites',
              null,
              'Wrote SKU + on-stock quantity for each confirmed line.',
            )}
          </Text>
          {confirmSummary.location_name ? (
            <Text style={styles.meta}>
              {t('org.warehouse.intake.storedAt', null, 'Stored at')}: {confirmSummary.location_name}
              {confirmSummary.location_code ? ` (${confirmSummary.location_code})` : ''}
            </Text>
          ) : null}
          {(confirmSummary.materials || []).map((m, idx) => (
            <View key={`${m.part_number || m.name}-${idx}`} style={styles.lineRow}>
              <Text style={styles.lineName} numberOfLines={2}>
                {formatMaterialListLabel(m, { includeSku: false }) || m.part_number || '—'}
              </Text>
              <Text style={styles.lineMeta}>
                {m.part_number ? `${m.part_number} · ` : ''}
                +{m.quantity_added} {unitDisplay(m.unit_code, t)}
                {' → '}
                {t('org.warehouse.intake.onStock', null, 'On stock')}: {m.quantity_on_hand}
              </Text>
            </View>
          ))}
        </AppCard>
      ) : null}

      {isDocuments && canPost && !detailOpen ? (
        <Button mode="contained" onPress={onUpload} loading={busy} disabled={busy}>
          {t('org.warehouse.intake.upload', null, 'Add invoice')}
        </Button>
      ) : null}

      {isMaterials && canManage ? (
        <Button
          mode="contained"
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
          <TextInput
            label={t('org.warehouse.intake.documentNumber', null, 'Document # (optional)')}
            value={standalone.invoice_number}
            onChangeText={(v) => setStandalone((p) => ({ ...p, invoice_number: v }))}
            mode="outlined"
            style={styles.input}
            textColor={ON_CARD}
          />
          <Text style={styles.helper}>
            {t(
              'org.warehouse.intake.documentNumberHint',
              null,
              'If you are not scanning an invoice, you can still record a paper/doc number for the audit trail.',
            )}
          </Text>
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
              label={t('org.warehouse.intake.priceEur', null, 'Price (EUR)')}
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
            locale={locale}
            units={catalogUnits}
          />
          <View style={styles.switchRow}>
            <View style={styles.switchLabelWrap}>
              <Text style={styles.sectionLabel}>
                {t('org.warehouse.intake.durableTool', null, 'Durable tool (hand machine)')}
              </Text>
              <Text style={styles.helper}>
                {t(
                  'org.warehouse.intake.durableToolHint',
                  null,
                  'Drill, grinder, etc. — not consumed on tasks; write off via scrap when broken.',
                )}
              </Text>
            </View>
            <Switch
              value={Boolean(standalone.is_durable_tool)}
              onValueChange={(v) => setStandalone((p) => ({ ...p, is_durable_tool: v }))}
            />
          </View>
          <Text style={styles.sectionLabel}>
            {t('org.warehouse.intake.storeLocation', null, 'Store into location')}
          </Text>
          {activeLocations.length === 0 ? (
            <Text style={styles.helper}>
              {t(
                'org.warehouse.intake.noLocations',
                null,
                'Add a location under Locations (e.g. Baza / Port 1) before confirming.',
              )}
            </Text>
          ) : (
            <View style={styles.unitRow}>
              {activeLocations.map((loc) => {
                const selected = Number(confirmLocationId) === Number(loc.id);
                return (
                  <Pressable
                    key={loc.id}
                    onPress={() => setConfirmLocationId(loc.id)}
                    style={[styles.unitChip, selected && styles.unitChipSelected]}
                  >
                    <Text style={[styles.unitChipText, selected && styles.unitChipTextSelected]}>
                      {loc.name || loc.code}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
          <Button mode="contained" onPress={onAddStandalone} loading={busy} disabled={busy}>
            {t('org.warehouse.intake.saveMaterial', null, 'Save to warehouse')}
          </Button>
        </AppCard>
      ) : null}

      {detailOpen ? (
        <AppCard style={[styles.card, styles.detailCard]}>
          <View style={styles.detailHeader}>
            <Button mode="text" onPress={closeDetail} textColor={ON_CARD} compact>
              {t('org.warehouse.intake.backToList', null, '← Documents')}
            </Button>
            {activeIntake.has_source_file ? (
              <Button mode="outlined" onPress={onOpenPdf} disabled={busy} compact>
                {t('org.warehouse.intake.viewPdf', null, 'View PDF')}
              </Button>
            ) : null}
          </View>
          <Text style={styles.cardTitle}>
            {activeIntake.document_kind === 'proforma'
              ? t('org.warehouse.intake.proforma', null, 'Proforma')
              : t('org.warehouse.intake.invoice', null, 'Invoice')}
            {activeIntake.invoice_number ? ` #${activeIntake.invoice_number}` : ''}
          </Text>
          <Text style={styles.meta}>
            {t('org.warehouse.intake.status', null, 'Status')}: {activeIntake.status}
            {activeIntake.source_file_name ? ` · ${activeIntake.source_file_name}` : ''}
            {activeIntake.layout_id ? ` · ${activeIntake.layout_id}` : ''}
          </Text>

          {activeIntake.status === 'draft' && canPost ? (
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
              {t('org.warehouse.intake.supplier', null, 'Supplier')}:{' '}
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

          {activeIntake.status === 'draft' && canPost ? (
            <View style={styles.locationBox}>
              <Text style={styles.sectionLabel}>
                {t('org.warehouse.intake.storeLocation', null, 'Store into location')}
              </Text>
              {activeLocations.length === 0 ? (
                <Text style={styles.helper}>
                  {t(
                    'org.warehouse.intake.noLocations',
                    null,
                    'Add a location under Locations (e.g. Baza / Port 1) before confirming.',
                  )}
                </Text>
              ) : (
                <View style={styles.unitRow}>
                  {activeLocations.map((loc) => {
                    const selected = Number(confirmLocationId) === Number(loc.id);
                    return (
                      <Pressable
                        key={loc.id}
                        onPress={() => setConfirmLocationId(loc.id)}
                        style={[styles.unitChip, selected && styles.unitChipSelected]}
                      >
                        <Text style={[styles.unitChipText, selected && styles.unitChipTextSelected]}>
                          {loc.name || loc.code}
                          {loc.code && loc.name !== loc.code ? ` (${loc.code})` : ''}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
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
                    units={catalogUnits}
                    line={line}
                    canEdit={activeIntake.status === 'draft' && canPost}
                    busy={busy}
                    t={t}
                    locale={locale}
                    onSave={onSaveLine}
                    onConfirmRow={onConfirmRow}
                    onDeleteLine={onDeleteLine}
                    vatBlocked={confirmBlocked}
                  />
                ))}
              </View>
            </ScrollView>
          )}

          {activeIntake.status === 'draft' && canPost ? (
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
                  label={t('org.warehouse.intake.priceEur', null, 'Price (EUR)')}
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
                locale={locale}
                units={catalogUnits}
              />
              <View style={styles.switchRow}>
                <View style={styles.switchLabelWrap}>
                  <Text style={styles.sectionLabel}>
                    {t('org.warehouse.intake.durableTool', null, 'Durable tool (hand machine)')}
                  </Text>
                  <Text style={styles.helper}>
                    {t(
                      'org.warehouse.intake.durableToolHint',
                      null,
                      'Drill, grinder, etc. — not consumed on tasks; write off via scrap when broken.',
                    )}
                  </Text>
                </View>
                <Switch
                  value={Boolean(manual.is_durable_tool)}
                  onValueChange={(v) => setManual((p) => ({ ...p, is_durable_tool: v }))}
                />
              </View>
              <Button mode="outlined" onPress={onAddManual} disabled={busy} style={styles.secondaryBtn}>
                {t('org.warehouse.intake.addLine', null, 'Add line')}
              </Button>
              <Text style={styles.helper}>
                {t(
                  'org.warehouse.intake.confirmHint',
                  null,
                  'Pick a location, then Confirm. Writes each line as a warehouse SKU and adds quantity on stock. Original invoice is kept permanently.',
                )}
              </Text>
              <Button
                mode="contained"
                onPress={onConfirmAll}
                loading={busy}
                disabled={busy || confirmBlocked}
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

      {isDocuments && !detailOpen ? (
        <>
          <Text style={styles.chromeSectionTitle}>
            {t('org.warehouse.intake.history', null, 'Recent imports')}
          </Text>
          {intakes.length === 0 ? (
            <EmptyStateCard
              title={t('org.warehouse.intake.docsEmptyTitle', null, 'No imports yet')}
              subtitle={t(
                'org.warehouse.intake.docsEmpty',
                null,
                'Import a supplier invoice PDF to review lines and add stock.',
              )}
              icon="file-document-outline"
            />
          ) : (
            <>
              <TextInput
                label={t(
                  'org.warehouse.intake.searchDocs',
                  null,
                  'Search by number or supplier',
                )}
                value={docQuery}
                onChangeText={setDocQuery}
                mode="outlined"
                style={styles.searchInput}
                textColor={ON_CARD}
                dense
                right={
                  docQuery ? (
                    <TextInput.Icon icon="close" onPress={() => setDocQuery('')} />
                  ) : (
                    <TextInput.Icon icon="magnify" />
                  )
                }
              />
              {filteredIntakes.length === 0 ? (
                <EmptyStateCard
                  title={t('org.warehouse.intake.searchDocsEmptyTitle', null, 'No matching documents')}
                  subtitle={t(
                    'org.warehouse.intake.searchDocsEmpty',
                    { query: docQuery.trim() },
                    `Nothing matched “${docQuery.trim()}”.`,
                  )}
                  icon="magnify"
                />
              ) : (
                filteredIntakes.map((row) => {
                  const when =
                    row.invoice_date || row.confirmed_at || row.created_at || '';
                  const whenLabel = when ? String(when).slice(0, 10) : '';
                  return (
                    <AppCard key={row.id} style={styles.card}>
                      <Pressable onPress={() => openIntake(row)} accessibilityRole="button">
                        <Text style={styles.lineName}>
                          {row.invoice_number
                            ? `${t('org.warehouse.intake.invoice', null, 'Invoice')} #${row.invoice_number}`
                            : `#${row.id}`}
                        </Text>
                        <Text style={styles.lineMeta}>
                          {row.supplier_name
                            || t('org.warehouse.intake.unknownSupplier', null, 'Supplier unknown')}
                          {' · '}
                          {row.status}
                          {' · '}
                          {row.lines_count || 0}{' '}
                          {t('org.warehouse.intake.lines', null, 'lines')}
                          {whenLabel ? ` · ${whenLabel}` : ''}
                        </Text>
                        <Text style={styles.openHint}>
                          {t('org.warehouse.intake.openDetail', null, 'Open document detail')}
                        </Text>
                      </Pressable>
                      {row.status === 'draft' && canPost ? (
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
                  );
                })
              )}
            </>
          )}
        </>
      ) : null}

      {isDocuments && intakes.length === 0 && !activeIntake ? (
        <EmptyStateCard
          title={t('org.warehouse.intake.docsEmptyTitle', null, 'No imports yet')}
          subtitle={t(
            'org.warehouse.intake.docsEmpty',
            null,
            'Import a supplier invoice PDF to review lines and add stock.',
          )}
          icon="file-document-outline"
        />
      ) : null}

      {isMaterials ? (
        <>
          <Text style={styles.chromeSectionTitle}>
            {t('org.warehouse.intake.stockTitle', null, 'Warehouse materials')}
          </Text>
          {materials.length > 0 ? (
            <TextInput
              label={t(
                'org.warehouse.intake.searchMaterials',
                null,
                'Search by name or material # / SKU',
              )}
              value={materialQuery}
              onChangeText={setMaterialQuery}
              mode="outlined"
              style={styles.searchInput}
              textColor={ON_CARD}
              dense
              right={
                materialQuery ? (
                  <TextInput.Icon icon="close" onPress={() => setMaterialQuery('')} />
                ) : (
                  <TextInput.Icon icon="magnify" />
                )
              }
            />
          ) : null}
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
              {editingMaterial.part_number_alias ? (
                <Text style={styles.meta}>
                  {t('org.warehouse.intake.oldPartNumber', null, 'Old material number (optional)')}
                  {': '}
                  {editingMaterial.part_number_alias}
                </Text>
              ) : null}
              <Text style={styles.meta}>
                {t('org.warehouse.intake.onStock', null, 'On stock')}: {editingMaterial.quantity_on_hand}
                {editingMaterial.unit_code
                  ? ` ${unitDisplay(editingMaterial.unit_code, t)}`
                  : ''}
              </Text>
              <View style={styles.switchRow}>
                <Text style={styles.sectionLabel}>
                  {t('org.warehouse.intake.durableTool', null, 'Durable tool (hand machine)')}
                </Text>
                <Switch
                  value={Boolean(editingMaterial.is_durable_tool)}
                  onValueChange={(v) =>
                    setEditingMaterial((p) => ({ ...p, is_durable_tool: v }))
                  }
                />
              </View>
              <View style={styles.lineActions}>
                <Button mode="contained" onPress={onSaveMaterial} loading={busy} disabled={busy}>
                  {t('common.save', null, 'Save')}
                </Button>
                {editingMaterial.is_durable_tool ? (
                  <Button
                    mode="outlined"
                    onPress={onScrapMaterial}
                    loading={busy}
                    disabled={busy}
                    textColor={ON_CARD}
                  >
                    {t('org.warehouse.intake.scrapMaterial', null, 'Write off (scrap)')}
                  </Button>
                ) : null}
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
          ) : filteredMaterials.length === 0 ? (
            <EmptyStateCard
              title={t('org.warehouse.intake.searchEmptyTitle', null, 'No matching materials')}
              subtitle={t(
                'org.warehouse.intake.searchEmpty',
                { query: materialQuery.trim() },
                `Nothing matched “${materialQuery.trim()}”. Try another name or SKU.`,
              )}
              icon="magnify"
            />
          ) : (
            <>
              {hasSearch ? (
                <Text style={styles.chromeMeta}>
                  {t(
                    'org.warehouse.intake.searchCount',
                    { shown: filteredMaterials.length, total: materials.length },
                    `${filteredMaterials.length} of ${materials.length}`,
                  )}
                </Text>
              ) : (
                <Text style={styles.chromeMeta}>
                  {t(
                    'org.warehouse.intake.stockCount',
                    { count: materials.length },
                    `${materials.length} material(s)`,
                  )}
                </Text>
              )}
              {filteredMaterials.map((row) => (
                <Pressable
                  key={row.stock_id || row.id}
                  onPress={() => {
                    if (!canManage) return;
                    const rawName = row.name || '';
                    const rawDesc = row.description || row.name || '';
                    setEditingMaterial({
                      stock_id: row.stock_id,
                      material_id: row.id,
                      name: stripOldMaterialSuffix(rawName) || rawName,
                      part_number: row.part_number || '',
                      description: stripOldMaterialSuffix(rawDesc) || rawDesc,
                      is_durable_tool: Boolean(row.is_durable_tool),
                      scrap_qty: '1',
                      part_number_alias:
                        row.part_number_alias ||
                        extractOldMaterialNumber(rawName) ||
                        extractOldMaterialNumber(rawDesc) ||
                        '',
                      quantity_on_hand: row.quantity_on_hand,
                      unit_code: row.unit_code,
                    });
                  }}
                >
                  <AppCard style={styles.card}>
                    <Text style={styles.lineName}>
                      {formatMaterialListLabel(row, { includeSku: false })}
                    </Text>
                    {row.is_durable_tool ? (
                      <Text style={styles.durableBadge}>
                        {t('org.warehouse.intake.durableTool', null, 'Durable tool (hand machine)')}
                      </Text>
                    ) : null}
                    <Text style={styles.lineMeta}>
                      {row.part_number ? `${row.part_number} · ` : ''}
                      {t('org.warehouse.intake.onStock', null, 'On stock')}: {row.quantity_on_hand}
                      {row.unit_code ? ` ${unitDisplay(row.unit_code, t)}` : ''}
                      {row.location_name
                        ? ` · ${t('org.warehouse.intake.atLocation', null, 'at')} ${row.location_name}`
                        : ''}
                      {canManage
                        ? ` · ${t('org.warehouse.intake.tapToEdit', null, 'Tap to edit')}`
                        : ''}
                    </Text>
                  </AppCard>
                </Pressable>
              ))}
            </>
          )}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  center: { paddingVertical: 40, alignItems: 'center' },
  chromeLead: { color: ON_CHROME_MUTED, fontSize: 14, lineHeight: 20 },
  chromeSectionTitle: { color: ON_CHROME, fontSize: 15, fontWeight: '700', marginTop: 4 },
  chromeMeta: { color: ON_CHROME_SOFT, fontSize: 12, marginTop: -4 },
  primaryBtn: { marginTop: 4 },
  secondaryBtn: { marginBottom: 8, marginTop: 8 },
  deleteOutlined: {
    alignSelf: 'flex-start',
    marginTop: 8,
    borderColor: '#B91C1C',
  },
  vatWarn: { color: '#B91C1C' },
  error: { color: '#FCA5A5', fontSize: 13 },
  message: { color: '#86EFAC', fontSize: 13 },
  card: { padding: 14, gap: 6 },
  summaryCard: { borderLeftWidth: 4, borderLeftColor: '#15803d' },
  warnCard: { borderLeftWidth: 4, borderLeftColor: '#B45309' },
  detailCard: { borderLeftWidth: 4, borderLeftColor: '#0F766E' },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  locationBox: { marginTop: 8, marginBottom: 4 },
  openHint: { color: '#0F766E', fontSize: 12, fontWeight: '600', marginTop: 4 },
  cardTitle: { color: ON_CARD, fontSize: 16, fontWeight: '600' },
  meta: { color: ON_CARD_MUTED, fontSize: 12 },
  helper: { color: ON_CARD_MUTED, fontSize: 13, marginTop: 6, marginBottom: 6 },
  lineRow: { paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E2E8F0' },
  lineName: { color: ON_CARD, fontSize: 14, fontWeight: '500' },
  lineMeta: { color: ON_CARD_MUTED, fontSize: 12, marginTop: 2 },
  manualBox: { marginTop: 12, gap: 4 },
  sectionLabel: { color: ON_CARD, fontWeight: '600', marginBottom: 4, marginTop: 4 },
  input: { backgroundColor: '#fff', marginBottom: 6 },
  searchInput: { backgroundColor: '#fff', marginBottom: 4 },
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
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },
  switchLabelWrap: { flex: 1 },
});
