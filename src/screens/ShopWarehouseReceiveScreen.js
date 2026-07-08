/**
 * Pro warehouse receiving: invoice preview, manual lines, base-unit stock per center.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, FlatList, StyleSheet, Pressable, Platform, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, ActivityIndicator, Button, Appbar, Chip, Switch } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import ScreenBackground from '../components/ScreenBackground';
import AppNavigationBar from '../components/common/AppNavigationBar';
import { usePartnerDashboardBack } from '../navigation/appNavBarBack';
import { useTranslation } from '../i18n';
import FloatingCard from '../components/ui/FloatingCard';
import EmptyStateCard from '../components/ui/EmptyStateCard';
import InvoiceHeaderCard from '../components/warehouse/InvoiceHeaderCard';
import ReceivingDocumentPreview from '../components/warehouse/ReceivingDocumentPreview';
import ManualPartEntryDialog from '../components/warehouse/ManualPartEntryDialog';
import MissingFieldsBanner from '../components/warehouse/MissingFieldsBanner';
import ReceivingTotalsCard from '../components/warehouse/ReceivingTotalsCard';
import { ReceivingInvoiceStartStep, ReceivingCreditNoteStartStep } from '../components/warehouse/ReceivingWizardSteps';
import { PRIMARY, TEXT_DARK, TEXT_MUTED } from '../constants/colors';
import { getMyShopProfiles, updateShopProfile } from '../api/profiles';
import { fetchUnits } from '../api/partCatalog';
import { pickReceiptOrInvoiceAttachment } from '../utils/pickDocumentFile';
import { showMessage, confirmMessage } from '../utils/crossPlatformAlert';
import { buildInvoicePreviewFromBatch } from '../utils/warehouseInvoicePreview';
import {
  HEADER_ISSUE_LABELS,
  LINE_ISSUE_LABELS,
  addReceivingManualLine,
  commitReceivingSession,
  createReceivingSession,
  deleteReceivingLine,
  downloadBillingCsv,
  getReceivingSession,
  importReceivingCsv,
  updateReceivingLine,
  updateReceivingSession,
  uploadReceivingInvoice,
} from '../api/warehouse';

const SHOP_TOP_BAR = 'rgba(11,18,32,0.92)';

function WarehouseStockToggle({ enabled, toggling, onToggle }) {
  return (
    <FloatingCard style={styles.warnCard}>
      <View style={styles.warehouseToggleRow}>
        <View style={styles.warehouseToggleText}>
          <Text style={styles.warehouseToggleTitle}>Stock tracking</Text>
          <Text style={styles.warnText}>
            {enabled
              ? 'Quantities update when you complete receiving documents.'
              : 'Off — you can still build your parts catalog. Turn on to track on-hand stock.'}
          </Text>
        </View>
        <Switch value={enabled} onValueChange={onToggle} disabled={toggling} />
      </View>
    </FloatingCard>
  );
}

function IssueChips({ issues }) {
  if (!issues?.length) {
    return (
      <Chip compact style={styles.okChip} textStyle={styles.okChipText}>
        Ready
      </Chip>
    );
  }
  return (
    <View style={styles.issueRow}>
      {issues.map((code) => (
        <Chip key={code} compact style={styles.issueChip} textStyle={styles.issueChipText}>
          {LINE_ISSUE_LABELS[code] || code}
        </Chip>
      ))}
    </View>
  );
}

function LineRow({ line, onEdit, onDelete }) {
  const priceEx = line.unit_price_ex_vat_minor ?? line.unit_price_minor;
  const priceExEur = priceEx ? (Number(priceEx) / 100).toFixed(2) : '—';
  const priceInc = line.unit_price_inc_vat_minor
    ? (Number(line.unit_price_inc_vat_minor) / 100).toFixed(2)
    : null;
  return (
    <FloatingCard style={[styles.lineCard, line.issues?.length ? styles.lineCardError : null]}>
      <View style={styles.lineRow}>
        <MaterialCommunityIcons
          name={line.is_complete ? 'check-circle' : 'alert-circle'}
          size={22}
          color={line.is_complete ? '#15803d' : '#dc2626'}
        />
        <View style={styles.lineBody}>
          <Text style={styles.lineTitle} numberOfLines={2}>
            {line.part_type_name || line.description || 'Part line'}
          </Text>
          <Text style={styles.lineMeta}>
            {line.part_number || '—'} · Qty {line.quantity} {line.unit_symbol || ''} · ex €{priceExEur}
            {priceInc ? ` · inc €${priceInc}` : ''}
            {line.brand_name ? ` · ${line.brand_name}` : ''}
          </Text>
          {line.stock_display ? (
            <Text style={styles.stockMeta}>In stock: {line.stock_display}</Text>
          ) : null}
          <IssueChips issues={line.issues} />
        </View>
        <View style={styles.lineActions}>
          <Pressable onPress={() => onEdit(line)} hitSlop={8}>
            <Text style={styles.link}>Edit</Text>
          </Pressable>
          <Pressable onPress={() => onDelete(line)} hitSlop={8}>
            <Text style={styles.linkDanger}>Remove</Text>
          </Pressable>
        </View>
      </View>
    </FloatingCard>
  );
}

export default function ShopWarehouseReceiveScreen({
  navigation,
  embedded = false,
  resumeBatchId = null,
  onCommitted,
  onResumeConsumed,
}) {
  const { t } = useTranslation();
  const inDrawer = typeof navigation.openDrawer === 'function';
  const insets = useSafeAreaInsets();
  const handleBack = usePartnerDashboardBack(navigation);
  const showAppNav = !embedded && !inDrawer;

  const [loading, setLoading] = useState(true);
  const [warehouseEnabled, setWarehouseEnabled] = useState(false);
  const [shopId, setShopId] = useState(null);
  const [warehouseToggling, setWarehouseToggling] = useState(false);
  const [batch, setBatch] = useState(null);
  const [committing, setCommitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [importingCsv, setImportingCsv] = useState(false);
  const [batchKind, setBatchKind] = useState('receipt');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingLine, setEditingLine] = useState(null);
  const [saving, setSaving] = useState(false);
  const [invoicePreview, setInvoicePreview] = useState(null);
  const [units, setUnits] = useState([]);
  const headerDraftRef = useRef(null);
  const [phase, setPhase] = useState(resumeBatchId ? 'work' : 'start');
  const [showValidation, setShowValidation] = useState(false);

  const applyBatch = useCallback((session, preview = null) => {
    setBatch(session);
    setInvoicePreview(buildInvoicePreviewFromBatch(session, preview));
  }, []);

  const initShop = useCallback(async () => {
    setLoading(true);
    try {
      const profiles = await getMyShopProfiles();
      const storedShopId = await AsyncStorage.getItem('@current_shop_id');
      const shop = (profiles || []).find((p) => String(p.id) === String(storedShopId)) || profiles?.[0];
      setShopId(shop?.id || null);
      setWarehouseEnabled(Boolean(shop?.warehouse_enabled));
      const token = await AsyncStorage.getItem('@access_token');
      try {
        const unitList = await fetchUnits(token, '');
        setUnits(unitList);
      } catch (catalogErr) {
        console.error(catalogErr);
      }
    } catch (err) {
      console.error(err);
      showMessage('Warehouse', err.message || 'Could not load center');
    } finally {
      setLoading(false);
    }
  }, []);

  const openWorkSession = useCallback(
    async (session, { validate = false } = {}) => {
      setBatchKind(session.batch_kind || 'receipt');
      setShowValidation(
        validate ||
          (session.lines || []).length > 0 ||
          session.source_type === 'invoice_upload'
      );
      applyBatch(session);
      setPhase('work');
    },
    [applyBatch]
  );

  const resumeSession = useCallback(
    async (batchId) => {
      setLoading(true);
      try {
        const token = await AsyncStorage.getItem('@access_token');
        const session = await getReceivingSession(token, batchId);
        await openWorkSession(session, { validate: true });
        onResumeConsumed?.();
      } catch (err) {
        console.error(err);
        showMessage('Warehouse', err.message || 'Could not open draft');
        setPhase('choose-type');
      } finally {
        setLoading(false);
      }
    },
    [onResumeConsumed, openWorkSession]
  );

  const startNewSession = useCallback(
    async (kind, { openUpload = false } = {}) => {
      setLoading(true);
      try {
        const token = await AsyncStorage.getItem('@access_token');
        const session = await createReceivingSession(token, { batchKind: kind });
        await openWorkSession(session, { validate: false });
        if (openUpload) {
          setTimeout(() => triggerInvoicePickerRef.current?.(), 150);
        }
      } catch (err) {
        console.error(err);
        showMessage('Warehouse', err.message || 'Could not start document');
      } finally {
        setLoading(false);
      }
    },
    [openWorkSession]
  );

  const triggerInvoicePickerRef = useRef(null);

  const persistHeaderDraft = useCallback(
    async (payload) => {
      if (!batch?.id) return null;
      headerDraftRef.current = payload;
      try {
        const token = await AsyncStorage.getItem('@access_token');
        const updated = await updateReceivingSession(token, batch.id, payload);
        applyBatch(updated);
        return updated;
      } catch (err) {
        showMessage('Document', err.message || 'Could not save document info');
        return null;
      }
    },
    [applyBatch, batch?.id]
  );

  const toggleWarehouse = async (enabled) => {
    if (!shopId || warehouseToggling) return;
    setWarehouseToggling(true);
    try {
      await updateShopProfile(shopId, { warehouse_enabled: enabled });
      setWarehouseEnabled(enabled);
    } catch (err) {
      showMessage('Warehouse', err.message || 'Could not update stock tracking');
    } finally {
      setWarehouseToggling(false);
    }
  };

  const getCommitBlockers = useCallback((session = batch) => {
    const blockers = [];
    const headerIssues = session?.header_issues || [];
    if (headerIssues.length) {
      blockers.push(
        `Document header missing: ${headerIssues.map((c) => HEADER_ISSUE_LABELS[c] || c).join(', ')}.`
      );
    }
    const incomplete = Number(session?.incomplete_count) || 0;
    if (incomplete > 0) {
      blockers.push(`${incomplete} part line(s) still have red fields to fix.`);
    }
    if ((session?.lines || []).length === 0) {
      blockers.push('Add at least one part line.');
    }
    return blockers;
  }, [batch]);

  useEffect(() => {
    if (resumeBatchId) {
      resumeSession(resumeBatchId);
      return;
    }
    initShop();
  }, [initShop, resumeBatchId, resumeSession]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        if (!batch?.id || phase !== 'work') return;
        try {
          const token = await AsyncStorage.getItem('@access_token');
          const refreshed = await getReceivingSession(token, batch.id);
          if (!cancelled) {
            applyBatch(refreshed);
          }
        } catch (err) {
          console.error(err);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [batch?.id, applyBatch, phase])
  );

  const openEditor = (line = null) => {
    setEditingLine(line);
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingLine(null);
  };

  const handleSaveLine = async (form) => {
    if (!batch?.id) return;
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const payload = {
        part_type_id: form.part_type_id,
        part_brand_id: form.part_brand_id,
        brand_raw: form.brand_raw,
        part_number: form.part_number.trim(),
        quantity: Number(form.quantity) || 1,
        unit_id: form.unit_id,
        unit_price_ex_vat: form.unit_price_ex_vat.trim(),
        unit_vat: form.unit_vat.trim(),
        unit_price_inc_vat: form.unit_price_inc_vat.trim(),
        vat_rate_percent: form.vat_rate_percent.trim(),
      };
      const result = editingLine
        ? await updateReceivingLine(token, batch.id, editingLine.id, payload)
        : await addReceivingManualLine(token, batch.id, payload);
      applyBatch(result.batch);
      closeEditor();
      showMessage('Saved', editingLine ? 'Line updated.' : 'Part line added.');
    } catch (err) {
      showMessage('Save', err.message || 'Could not save line');
    } finally {
      setSaving(false);
    }
  };


  const resetToWizard = () => {
    setBatch(null);
    setInvoicePreview(null);
    setShowValidation(false);
    setPhase('start');
  };

  const handleImportCsv = async () => {
    if (!batch?.id) {
      showMessage('Receiving session', 'No active session — refresh and try again.');
      return;
    }
    const file = await pickReceiptOrInvoiceAttachment();
    if (!file) {
      if (typeof document !== 'undefined') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv,text/csv';
        input.onchange = async () => {
          const picked = input.files?.[0];
          if (!picked) return;
          setImportingCsv(true);
          try {
            const token = await AsyncStorage.getItem('@access_token');
            const result = await importReceivingCsv(
              token,
              { file: picked, fileName: picked.name, mimeType: picked.type },
              { batchId: batch.id, batchKind }
            );
            applyBatch(result.batch);
            showMessage('CSV imported', 'Review lines and fix any red fields.');
          } catch (err) {
            showMessage('Import', err.message);
          } finally {
            setImportingCsv(false);
          }
        };
        input.click();
      }
      return;
    }
    setImportingCsv(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const result = await importReceivingCsv(token, file, { batchId: batch.id, batchKind });
      applyBatch(result.batch);
      showMessage('CSV imported', 'Review lines and fix any red fields.');
    } catch (err) {
      showMessage('Import', err.message);
    } finally {
      setImportingCsv(false);
    }
  };

  const handleExport = async (path, filename) => {
    try {
      const token = await AsyncStorage.getItem('@access_token');
      await downloadBillingCsv(token, path, filename);
    } catch (err) {
      showMessage('Export', err.message);
    }
  };

  const processInvoiceFile = async (picked) => {
    if (!picked || !batch?.id) return;
    setUploading(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const file =
        picked?.file != null
          ? picked
          : {
              file: picked,
              fileName: picked.name || 'invoice.pdf',
              mimeType: picked.type || 'application/pdf',
            };
      const result = await uploadReceivingInvoice(token, batch.id, file);
      applyBatch(result.batch, result.preview || null);
      const parsed = Number(result.preview?.lines_parsed) || 0;
      if (parsed === 0) {
        setShowValidation(true);
      }
      showMessage(
        result.preview?.lines_parsed > 0 ? 'Invoice parsed' : 'Invoice uploaded',
        result.message ||
          (result.preview?.lines_parsed > 0
            ? `${result.preview.lines_parsed} lines ready to review below.`
            : 'No line items read — add parts manually or view the document.')
      );
    } catch (err) {
      setShowValidation(true);
      showMessage('Invoice', err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleUploadInvoice = () => {
    if (!batch?.id) {
      showMessage('Receiving session', 'Pick a document type first.');
      return;
    }
    if (typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.pdf,application/pdf,image/*';
      input.onchange = async () => {
        const picked = input.files?.[0];
        if (!picked) return;
        await processInvoiceFile(picked);
      };
      input.click();
      return;
    }
    pickReceiptOrInvoiceAttachment().then((file) => {
      if (file) processInvoiceFile(file);
    });
  };

  triggerInvoicePickerRef.current = handleUploadInvoice;

  const handleDeleteLine = async (line) => {
    const ok = await confirmMessage('Remove line', 'Remove this row from receiving?', {
      confirmLabel: 'Remove',
    });
    if (!ok) return;
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const updated = await deleteReceivingLine(token, batch.id, line.id);
      applyBatch(updated);
    } catch (err) {
      showMessage('Error', err.message);
    }
  };

  const handleCommit = async () => {
    if (!batch?.id || committing) return;
    setShowValidation(true);
    setCommitting(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      let session = batch;
      const headerPayload =
        headerDraftRef.current || {
          shop_supplier_id: batch.shop_supplier?.id || null,
          supplier_name: batch.supplier_name || '',
          invoice_number: batch.invoice_number || '',
          invoice_date: batch.invoice_date || '',
        };
      const updated = await updateReceivingSession(token, batch.id, headerPayload);
      session = updated;
      applyBatch(updated);
      const blockers = getCommitBlockers(session);
      if (blockers.length) {
        showMessage('Cannot complete yet', blockers.join('\n\n'));
        return;
      }
      await commitReceivingSession(token, session.id);
      showMessage(
        'Done',
        warehouseEnabled
          ? 'Document completed and stock updated.'
          : 'Document completed — catalog saved (enable stock tracking to update quantities).'
      );
      onCommitted?.();
      resetToWizard();
    } catch (err) {
      showMessage('Complete', err.message || 'Could not finish receiving');
    } finally {
      setCommitting(false);
    }
  };

  if (loading) {
    const LoadWrap = embedded ? View : ScreenBackground;
    return (
      <LoadWrap style={embedded ? styles.embeddedRoot : undefined}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      </LoadWrap>
    );
  }

  const Wrapper = embedded ? View : ScreenBackground;

  if (phase === 'start' || phase === 'credit-start') {
    return (
      <Wrapper style={embedded ? styles.embeddedRoot : undefined}>
        {showAppNav ? (
          <AppNavigationBar
            title={t('drawer.partner.warehouse')}
            backLabel={t('navigation.backToDashboard')}
            onBack={handleBack}
          />
        ) : null}
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.container,
            embedded ? styles.embeddedPad : { paddingTop: showAppNav ? 12 : 8 },
            styles.wizardContent,
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <WarehouseStockToggle
            enabled={warehouseEnabled}
            toggling={warehouseToggling}
            onToggle={toggleWarehouse}
          />
          {phase === 'start' ? (
            <ReceivingInvoiceStartStep
              onPick={(entryMode) => startNewSession('receipt', { openUpload: entryMode === 'upload' })}
              onCreditNote={() => setPhase('credit-start')}
            />
          ) : (
            <ReceivingCreditNoteStartStep
              onBack={() => setPhase('start')}
              onPick={(entryMode) =>
                startNewSession('credit_note', { openUpload: entryMode === 'upload' })
              }
            />
          )}
        </ScrollView>
      </Wrapper>
    );
  }

  const lines = batch?.lines || [];
  const incomplete = Number(batch?.incomplete_count) || 0;
  const headerIssues = batch?.header_issues || [];
  const readyToCommit = lines.length > 0 && incomplete === 0 && headerIssues.length === 0;

  const listHeader = (
    <View style={[styles.container, embedded ? styles.embeddedPad : { paddingTop: showAppNav ? 12 : 8 }]}>
      <WarehouseStockToggle
        enabled={warehouseEnabled}
        toggling={warehouseToggling}
        onToggle={toggleWarehouse}
      />

      <Button icon="arrow-left" mode="text" onPress={resetToWizard} compact style={styles.backWizard}>
        New document
      </Button>

      <Chip compact style={styles.kindBadge}>
        {batchKind === 'credit_note' ? 'Supplier return' : 'Purchase invoice'}
      </Chip>

      {batchKind === 'credit_note' ? (
        <FloatingCard style={styles.infoCard}>
          <Text style={styles.infoText}>
            Credit note mode — quantities reduce stock at this center when you complete.
          </Text>
        </FloatingCard>
      ) : null}

      <MissingFieldsBanner batch={batch} visible={showValidation} />

      <ReceivingDocumentPreview
        batch={batch}
        preview={invoicePreview}
        uploading={uploading}
        onUpload={handleUploadInvoice}
        onReupload={handleUploadInvoice}
        onAddManual={() => openEditor(null)}
      />

      <InvoiceHeaderCard
        batch={batch}
        onChange={persistHeaderDraft}
        onDraft={(payload) => {
          headerDraftRef.current = payload;
        }}
        showValidation={showValidation}
      />

      <FloatingCard style={styles.heroCard}>
        <View style={styles.actionRow}>
          <Button
            mode="contained"
            icon="plus"
            onPress={() => openEditor(null)}
            buttonColor={PRIMARY}
            style={styles.actionBtn}
          >
            Add part
          </Button>
          <Button
            mode="outlined"
            icon="file-delimited"
            onPress={handleImportCsv}
            loading={importingCsv}
            style={styles.actionBtn}
          >
            Import CSV
          </Button>
        </View>
        <View style={styles.actionRow}>
          <Button
            compact
            mode="text"
            onPress={() => handleExport('import/catalog-template.csv', 'warehouse-import-template.csv')}
          >
            CSV template
          </Button>
          <Button
            compact
            mode="text"
            onPress={() => handleExport('export/catalog.csv', 'catalog.csv')}
          >
            Export catalog
          </Button>
          <Button
            compact
            mode="text"
            onPress={() => handleExport('export/stock-movements.csv', 'stock.csv')}
          >
            Export stock
          </Button>
          <Button
            compact
            mode="text"
            onPress={() => handleExport('export/receiving-history.csv', 'receiving.csv')}
          >
            Export history
          </Button>
        </View>
      </FloatingCard>

      <View style={styles.summaryRow}>
        <Text style={styles.summaryText}>
          {lines.length} line{lines.length === 1 ? '' : 's'}
          {headerIssues.length ? ` · doc ${headerIssues.length} missing` : ''}
          {showValidation && incomplete > 0 ? ` · ${incomplete} need fix` : ''}
          {readyToCommit ? ' · ready to complete' : ''}
        </Text>
      </View>
    </View>
  );

  const listFooter = (
    <View style={styles.footerSection}>
      <ReceivingTotalsCard totals={batch?.totals} lineCount={lines.length} />
      {batch?.id ? (
        <View style={styles.footer}>
          <Button
            mode="contained"
            icon="check-all"
            onPress={handleCommit}
            loading={committing}
            disabled={committing}
            buttonColor={readyToCommit ? PRIMARY : showValidation ? '#dc2626' : PRIMARY}
          >
            Complete receiving
          </Button>
          {showValidation && !readyToCommit ? (
            <Text style={styles.footerHint}>Fix red fields above before completing.</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );

  return (
    <Wrapper style={embedded ? styles.embeddedRoot : undefined}>
      {showAppNav ? (
        <AppNavigationBar
          title={t('drawer.partner.warehouse')}
          backLabel={t('navigation.backToDashboard')}
          onBack={handleBack}
        />
      ) : null}
      {!embedded && inDrawer ? (
        <Appbar.Header style={{ backgroundColor: SHOP_TOP_BAR, paddingTop: insets.top }}>
          <Appbar.Action
            icon="chevron-left"
            color="#fff"
            onPress={() => navigation.navigate('ShopDashboard')}
          />
          <Appbar.Action icon="menu" onPress={() => navigation.openDrawer()} color="#fff" />
          <Appbar.Content title={t('drawer.partner.warehouse')} titleStyle={{ color: '#fff' }} />
        </Appbar.Header>
      ) : null}

      <FlatList
        style={[styles.flex, Platform.OS === 'web' ? styles.webScroll : null]}
        data={lines}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View style={styles.lineWrap}>
            <LineRow line={item} onEdit={openEditor} onDelete={handleDeleteLine} />
          </View>
        )}
        ListHeaderComponent={listHeader}
        ListFooterComponent={listFooter}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <EmptyStateCard
            icon="package-variant"
            title={t('partnerDashboard.warehouse.noPartsTitle')}
            subtitle={t('partnerDashboard.warehouse.noPartsSubtitle')}
          />
        }
      />

      <ManualPartEntryDialog
        visible={editorOpen}
        editingLine={editingLine}
        units={units}
        onDismiss={closeEditor}
        onSave={handleSaveLine}
        saving={saving}
      />
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  webScroll: { minHeight: 0, overflow: 'auto' },
  embeddedRoot: { flex: 1, minHeight: 0 },
  embeddedPad: { paddingTop: 4 },
  wizardContent: { paddingBottom: 40 },
  backWizard: { alignSelf: 'flex-start', marginBottom: 4 },
  kindBadge: { alignSelf: 'flex-start', marginBottom: 8, backgroundColor: '#dbeafe' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { paddingHorizontal: 12 },
  kindRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  kindChip: { backgroundColor: 'rgba(255,255,255,0.9)' },
  warnCard: { marginBottom: 10, padding: 12 },
  warehouseToggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  warehouseToggleText: { flex: 1 },
  warehouseToggleTitle: { fontSize: 14, fontWeight: '700', color: TEXT_DARK, marginBottom: 4 },
  infoCard: { marginBottom: 10, padding: 12, backgroundColor: '#fff8e6' },
  warnText: { fontSize: 13, color: TEXT_MUTED, lineHeight: 18 },
  infoText: { fontSize: 13, color: '#92400e', lineHeight: 18 },
  heroCard: { marginBottom: 12, padding: 14 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  actionBtn: { marginRight: 4 },
  summaryRow: { marginBottom: 8 },
  summaryText: { color: 'rgba(255,255,255,0.9)', fontWeight: '600', fontSize: 13 },
  listContent: { paddingBottom: 32 },
  lineWrap: { paddingHorizontal: 12 },
  lineCard: { marginBottom: 8, padding: 12 },
  lineCardError: {
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
    backgroundColor: '#fef2f2',
  },
  lineRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  lineBody: { flex: 1 },
  lineTitle: { fontSize: 15, fontWeight: '600', color: TEXT_DARK },
  lineMeta: { fontSize: 12, color: TEXT_MUTED, marginTop: 4 },
  stockMeta: { fontSize: 12, color: '#15803d', marginTop: 2 },
  lineActions: { alignItems: 'flex-end', gap: 6 },
  link: { color: PRIMARY, fontWeight: '700', fontSize: 13 },
  linkDanger: { color: '#b91c1c', fontWeight: '600', fontSize: 12 },
  issueRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  issueChip: { backgroundColor: '#fee2e2' },
  issueChipText: { fontSize: 11, color: '#b91c1c', fontWeight: '600' },
  okChip: { backgroundColor: '#dcfce7', marginTop: 6, alignSelf: 'flex-start' },
  okChipText: { fontSize: 11, color: '#15803d' },
  footerSection: { paddingHorizontal: 12, paddingBottom: 24 },
  footer: {
    backgroundColor: 'rgba(15,23,42,0.92)',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  footerHint: { color: '#fecaca', fontSize: 12, marginTop: 8, textAlign: 'center' },
});
