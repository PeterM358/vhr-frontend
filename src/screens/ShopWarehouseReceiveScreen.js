/**
 * Pro warehouse receiving: invoice preview, manual lines, base-unit stock per center.
 */

import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { View, FlatList, StyleSheet, Pressable, Platform, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, ActivityIndicator, Button, Appbar, Chip, Switch } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import ScreenBackground from '../components/ScreenBackground';
import AppNavigationBar from '../components/common/AppNavigationBar';
import { usePartnerDashboardBack } from '../navigation/appNavBarBack';
import { navigateToShopDashboard } from '../navigation/drawerNavigation';
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

/** Nested RN Modals (repair sheet) often swallow Paper/confirm hosts on web. */
async function confirmDestructiveWebSafe(title, message, options = {}) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.confirm([title, message].filter(Boolean).join('\n\n'));
  }
  return confirmMessage(title, message, options);
}
import { buildInvoicePreviewFromBatch } from '../utils/warehouseInvoicePreview';
import {
  HEADER_ISSUE_LABELS,
  LINE_ISSUE_LABELS,
  addReceivingManualLine,
  commitReceivingSession,
  createReceivingSession,
  deleteReceivingLine,
  deleteReceivingSession,
  downloadBillingCsv,
  getReceivingSession,
  importReceivingCsv,
  listPendingReceivingSessions,
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

const ShopWarehouseReceiveScreen = forwardRef(function ShopWarehouseReceiveScreen({
  navigation,
  embedded = false,
  resumeBatchId = null,
  onCommitted,
  onResumeConsumed,
  /** When true (repair sheet), stay on start after commit so another invoice can be added. */
  stayOpenAfterCommit = false,
}, ref) {
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
  const [actionBanner, setActionBanner] = useState(null);
  const [pendingDrafts, setPendingDrafts] = useState([]);
  const [draftActionBusy, setDraftActionBusy] = useState(false);

  const isDuplicateInvoiceMessage = (msg) =>
    /already received|already open|duplicate/i.test(String(msg || ''));

  const cleanApiMessage = (msg) =>
    String(msg || '')
      .replace(/^invoice[_ ]number:\s*/i, '')
      .replace(/^batch:\s*/i, '')
      .trim();

  const refreshPendingDrafts = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const rows = await listPendingReceivingSessions(token);
      const list = Array.isArray(rows) ? rows : rows?.results || [];
      setPendingDrafts(list.filter((b) => b?.status === 'pending' || !b?.status));
    } catch (err) {
      console.error(err);
    }
  }, []);

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
      await refreshPendingDrafts();
    } catch (err) {
      console.error(err);
      showMessage('Warehouse', err.message || 'Could not load center');
    } finally {
      setLoading(false);
    }
  }, [refreshPendingDrafts]);

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

  const captureHeaderDraft = useCallback((payload) => {
    headerDraftRef.current = payload;
  }, []);

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
      // warehouse_enabled is read-only on the API; uses_inventory is the source of truth.
      const updated = await updateShopProfile(shopId, { uses_inventory: enabled });
      setWarehouseEnabled(
        Boolean(updated?.uses_inventory || updated?.warehouse_enabled || enabled),
      );
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

  // One soft refresh when entering the work phase — not on every batch apply
  // (that re-fetched /receiving/<id>/ in a tight loop with header autosave).
  const focusRefreshDoneRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (!batch?.id || phase !== 'work' || focusRefreshDoneRef.current) {
        return undefined;
      }
      focusRefreshDoneRef.current = true;
      let cancelled = false;
      (async () => {
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

  useEffect(() => {
    if (phase !== 'work') {
      focusRefreshDoneRef.current = false;
    }
  }, [phase]);

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
    setActionBanner(null);
    setPhase('start');
    refreshPendingDrafts();
  };

  const openDraftById = useCallback(
    async (draftId, { discardCurrent = true } = {}) => {
      if (!draftId) return;
      setDraftActionBusy(true);
      try {
        const token = await AsyncStorage.getItem('@access_token');
        if (discardCurrent && batch?.id && Number(batch.id) !== Number(draftId)) {
          try {
            await deleteReceivingSession(token, batch.id);
          } catch (err) {
            // Current empty session may already be gone — continue to the draft.
            console.warn(err);
          }
        }
        const session = await getReceivingSession(token, draftId);
        setActionBanner(null);
        await openWorkSession(session, { validate: true });
        await refreshPendingDrafts();
      } catch (err) {
        showMessage(
          t('partnerDashboard.warehouse.receiving.openDraftFailed', null, 'Could not open draft'),
          err.message || t('repairs.detail.pleaseTryAgain', null, 'Please try again.')
        );
      } finally {
        setDraftActionBusy(false);
      }
    },
    [batch?.id, openWorkSession, refreshPendingDrafts, t]
  );

  const deleteDraftById = useCallback(
    async (
      draftId,
      {
        title = null,
        body = null,
        successBody = null,
      } = {}
    ) => {
      if (!draftId) return false;
      const ok = await confirmDestructiveWebSafe(
        title ||
          t(
            'partnerDashboard.warehouse.receiving.deleteDraftTitle',
            null,
            'Delete this draft?'
          ),
        body ||
          t(
            'partnerDashboard.warehouse.receiving.deleteDraftBody',
            null,
            'The unfinished document and any uploaded file will be removed. Confirmed stock is not affected.'
          ),
        {
          confirmLabel: t('partnerDashboard.warehouse.receiving.discardConfirm', null, 'Discard'),
          cancelLabel: t('common.cancel', null, 'Cancel'),
          destructive: true,
        }
      );
      if (!ok) return false;
      setDraftActionBusy(true);
      try {
        const token = await AsyncStorage.getItem('@access_token');
        await deleteReceivingSession(token, draftId);
        if (batch?.id && Number(batch.id) === Number(draftId)) {
          resetToWizard();
        } else {
          setActionBanner(null);
          await refreshPendingDrafts();
        }
        showMessage(
          t('partnerDashboard.warehouse.receiving.otherDraftDeletedTitle', null, 'Draft deleted'),
          successBody ||
            t(
              'partnerDashboard.warehouse.receiving.draftDeletedBody',
              null,
              'You can start a new invoice upload.'
            ),
          { variant: 'success' }
        );
        return true;
      } catch (err) {
        showMessage(
          t('partnerDashboard.warehouse.receiving.discardFailed', null, 'Could not discard'),
          err.message || t('repairs.detail.pleaseTryAgain', null, 'Please try again.')
        );
        return false;
      } finally {
        setDraftActionBusy(false);
      }
    },
    [batch?.id, refreshPendingDrafts, t]
  );

  const deleteOtherDraft = useCallback(
    (draftId) =>
      deleteDraftById(draftId, {
        title: t(
          'partnerDashboard.warehouse.receiving.deleteOtherDraftTitle',
          null,
          'Delete the other draft?'
        ),
        body: t(
          'partnerDashboard.warehouse.receiving.deleteOtherDraftBody',
          null,
          'Removes the unfinished draft with this invoice number so you can upload again here.'
        ),
        successBody: t(
          'partnerDashboard.warehouse.receiving.otherDraftDeletedBody',
          null,
          'You can upload the invoice file again on this document.'
        ),
      }),
    [deleteDraftById, t]
  );

  const deleteAllPendingDrafts = useCallback(async () => {
    const ids = (pendingDrafts || []).map((d) => d.id).filter(Boolean);
    if (!ids.length) return;
    const ok = await confirmDestructiveWebSafe(
      t(
        'partnerDashboard.warehouse.receiving.deleteAllDraftsTitle',
        null,
        'Delete all unfinished drafts?'
      ),
      t(
        'partnerDashboard.warehouse.receiving.deleteAllDraftsBody',
        { count: ids.length },
        'Removes {count} unfinished receiving draft(s) so you can test from a clean start. Confirmed stock is not affected.'
      ),
      {
        confirmLabel: t(
          'partnerDashboard.warehouse.receiving.deleteAllDraftsConfirm',
          null,
          'Delete all'
        ),
        cancelLabel: t('common.cancel', null, 'Cancel'),
        destructive: true,
      }
    );
    if (!ok) return;
    setDraftActionBusy(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const failures = [];
      for (const id of ids) {
        try {
          await deleteReceivingSession(token, id);
        } catch (err) {
          failures.push(id);
          console.warn(err);
        }
      }
      setActionBanner(null);
      if (batch?.id && ids.some((id) => Number(id) === Number(batch.id))) {
        resetToWizard();
      } else {
        await refreshPendingDrafts();
      }
      if (failures.length) {
        showMessage(
          t('partnerDashboard.warehouse.receiving.discardFailed', null, 'Could not discard'),
          t(
            'partnerDashboard.warehouse.receiving.deleteAllDraftsPartial',
            { failed: failures.length },
            '{failed} draft(s) could not be deleted. Try again.'
          )
        );
      } else {
        showMessage(
          t(
            'partnerDashboard.warehouse.receiving.deleteAllDraftsDoneTitle',
            null,
            'Drafts cleared'
          ),
          t(
            'partnerDashboard.warehouse.receiving.deleteAllDraftsDoneBody',
            null,
            'You can upload invoices from a clean start.'
          ),
          { variant: 'success' }
        );
      }
    } finally {
      setDraftActionBusy(false);
    }
  }, [batch?.id, pendingDrafts, refreshPendingDrafts, t]);

  const discardCurrentDraft = useCallback(async ({
    thenReset = true,
    confirm = true,
    keepLabel = null,
  } = {}) => {
    if (!batch?.id) {
      if (thenReset) resetToWizard();
      return true;
    }
    if (confirm) {
      const ok = await confirmDestructiveWebSafe(
        t('partnerDashboard.warehouse.receiving.discardTitle', null, 'Discard this document?'),
        t(
          'partnerDashboard.warehouse.receiving.discardBody',
          null,
          'The uploaded file and draft lines will be removed. Confirmed stock is not affected.'
        ),
        {
          confirmLabel: t('partnerDashboard.warehouse.receiving.discardConfirm', null, 'Discard'),
          cancelLabel:
            keepLabel ||
            t('common.cancel', null, 'Cancel'),
          destructive: true,
        }
      );
      if (!ok) return false;
    }
    try {
      const token = await AsyncStorage.getItem('@access_token');
      await deleteReceivingSession(token, batch.id);
    } catch (err) {
      showMessage(
        t('partnerDashboard.warehouse.receiving.discardFailed', null, 'Could not discard'),
        err.message || t('repairs.detail.pleaseTryAgain', null, 'Please try again.')
      );
      return false;
    }
    if (thenReset) resetToWizard();
    else await refreshPendingDrafts();
    return true;
  }, [batch?.id, refreshPendingDrafts, t]);

  useImperativeHandle(
    ref,
    () => ({
      /**
       * Cancel / system back: close immediately and keep any unfinished draft
       * under Warehouse → Documents. Use “Back — discard draft” to delete.
       */
      async requestClose() {
        return true;
      },
      hasOpenDraft: () => Boolean(batch?.id && phase === 'work'),
    }),
    [batch?.id, phase]
  );

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
    setActionBanner(null);
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
      setActionBanner(null);
      applyBatch(result.batch, result.preview || null);
      const parsed = Number(result.preview?.lines_parsed) || 0;
      const headerMissing = (result.batch?.header_issues || []).length > 0;
      const incompleteLines = Number(result.batch?.incomplete_count) || 0;
      setShowValidation(parsed === 0 || headerMissing || incompleteLines > 0);
      const parsedCount = Number(result.preview?.lines_parsed) || 0;
      // Never show internal layout ids (qty_unit_label_v1, …) to the client.
      const rawMsg = String(result.message || result.preview?.message || '');
      const safeMsg = rawMsg
        .replace(/\s*using layout\s+[\w.-]+/gi, '')
        .replace(/\b(qty_unit_label_v\d+|stacked_column_v\d+|single_line_row_v\d+|inline_fallback_v\d+)\b/gi, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
      showMessage(
        parsedCount > 0 ? 'Invoice parsed' : 'Invoice uploaded',
        safeMsg ||
          (parsedCount > 0
            ? `${parsedCount} lines ready to review below.`
            : 'No line items read — add parts manually or view the document.')
      );
    } catch (err) {
      const msg = cleanApiMessage(err.message || 'Upload failed');
      if (isDuplicateInvoiceMessage(msg) || err.duplicateInvoice || err.duplicateBatchId) {
        setShowValidation(false);
        setActionBanner({
          tone: 'duplicate',
          title: t(
            'partnerDashboard.warehouse.receiving.duplicateTitle',
            null,
            'Duplicate invoice'
          ),
          body: msg,
          duplicateBatchId: err.duplicateBatchId || null,
        });
        await refreshPendingDrafts();
        showMessage(
          t(
            'partnerDashboard.warehouse.receiving.duplicateTitle',
            null,
            'Duplicate invoice'
          ),
          msg,
          { variant: 'error' }
        );
      } else {
        setShowValidation(true);
        setActionBanner({
          tone: 'error',
          title: t(
            'partnerDashboard.warehouse.receiving.uploadFailedTitle',
            null,
            'Could not read invoice'
          ),
          body: msg,
        });
        showMessage('Invoice', msg, { variant: 'error' });
      }
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
      const committed = await commitReceivingSession(token, session.id);
      showMessage(
        'Done',
        warehouseEnabled
          ? stayOpenAfterCommit
            ? t(
                'partnerDashboard.warehouse.receiving.committedStayOpen',
                null,
                'Stock updated. Upload another invoice, or tap Done to return to the repair.'
              )
            : 'Document completed and stock updated.'
          : 'Document completed — catalog saved (enable stock tracking to update quantities).'
      );
      onCommitted?.({
        stayOpen: stayOpenAfterCommit,
        batch: committed || session,
      });
      resetToWizard();
    } catch (err) {
      const msg = cleanApiMessage(err.message || 'Could not finish receiving');
      if (isDuplicateInvoiceMessage(msg) || err.duplicateInvoice || err.duplicateBatchId) {
        setActionBanner({
          tone: 'duplicate',
          title: t(
            'partnerDashboard.warehouse.receiving.duplicateTitle',
            null,
            'Duplicate invoice'
          ),
          body: msg,
          duplicateBatchId: err.duplicateBatchId || null,
        });
        await refreshPendingDrafts();
        showMessage(
          t(
            'partnerDashboard.warehouse.receiving.duplicateTitle',
            null,
            'Duplicate invoice'
          ),
          msg,
          { variant: 'error' }
        );
      } else {
        showMessage('Complete', msg, { variant: 'error' });
      }
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
          {pendingDrafts.length > 0 ? (
            <FloatingCard style={styles.pendingDraftsCard}>
              <Text style={styles.pendingDraftsTitle}>
                {t(
                  'partnerDashboard.warehouse.receiving.openDraftsTitle',
                  null,
                  'Unfinished drafts'
                )}
              </Text>
              <Text style={styles.pendingDraftsLead}>
                {t(
                  'partnerDashboard.warehouse.receiving.openDraftsLead',
                  null,
                  'Continue here — no need to leave this repair for Warehouse → Documents.'
                )}
              </Text>
              <Button
                mode="outlined"
                compact
                icon="trash-can-outline"
                disabled={draftActionBusy}
                loading={draftActionBusy}
                onPress={deleteAllPendingDrafts}
                textColor="#b91c1c"
                style={styles.deleteAllDraftsBtn}
              >
                {t(
                  'partnerDashboard.warehouse.receiving.deleteAllDrafts',
                  null,
                  'Delete all drafts'
                )}
              </Button>
              {pendingDrafts.map((draft) => (
                <View key={draft.id} style={styles.pendingDraftRow}>
                  <View style={styles.pendingDraftBody}>
                    <Text style={styles.pendingDraftName} numberOfLines={1}>
                      {draft.supplier_name ||
                        draft.shop_supplier?.display_name ||
                        t(
                          'partnerDashboard.warehouse.receiving.draftNoSupplier',
                          null,
                          'No supplier yet'
                        )}
                    </Text>
                    <Text style={styles.pendingDraftMeta} numberOfLines={1}>
                      {draft.invoice_number
                        ? `#${draft.invoice_number}`
                        : t(
                            'partnerDashboard.warehouse.receiving.draftNoNumber',
                            null,
                            'No doc #'
                          )}
                      {` · ${Number(draft.line_count) || (draft.lines || []).length || 0} ${t(
                        'partnerDashboard.warehouse.receiving.draftLines',
                        null,
                        'lines'
                      )}`}
                    </Text>
                  </View>
                  <Button
                    mode="text"
                    compact
                    disabled={draftActionBusy}
                    onPress={() => deleteDraftById(draft.id)}
                    textColor="#b91c1c"
                  >
                    {t(
                      'partnerDashboard.warehouse.receiving.deleteDraft',
                      null,
                      'Delete'
                    )}
                  </Button>
                  <Button
                    mode="contained"
                    compact
                    loading={draftActionBusy}
                    disabled={draftActionBusy}
                    onPress={() => openDraftById(draft.id, { discardCurrent: false })}
                    buttonColor={PRIMARY}
                  >
                    {t(
                      'partnerDashboard.warehouse.receiving.openDraft',
                      null,
                      'Continue draft'
                    )}
                  </Button>
                </View>
              ))}
            </FloatingCard>
          ) : null}
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

  const statusTone = readyToCommit ? 'ok' : showValidation && (incomplete > 0 || headerIssues.length) ? 'warn' : 'neutral';

  const listHeader = (
    <View style={[styles.container, embedded ? styles.embeddedPad : { paddingTop: showAppNav ? 12 : 8 }]}>
      {!embedded ? (
        <WarehouseStockToggle
          enabled={warehouseEnabled}
          toggling={warehouseToggling}
          onToggle={toggleWarehouse}
        />
      ) : null}

      <View style={styles.draftNavRow}>
        <Button
          icon="delete-outline"
          mode="outlined"
          onPress={() => discardCurrentDraft({ thenReset: true })}
          compact
          textColor="#b91c1c"
          style={styles.discardBtn}
        >
          {t(
            'partnerDashboard.warehouse.receiving.backDiscard',
            null,
            'Back — discard draft'
          )}
        </Button>
        <Button mode="text" compact onPress={resetToWizard}>
          {t(
            'partnerDashboard.warehouse.receiving.keepDraftNew',
            null,
            'Keep draft · new doc'
          )}
        </Button>
      </View>

      {actionBanner ? (
        <FloatingCard
          style={[
            styles.actionBannerCard,
            actionBanner.tone === 'duplicate'
              ? styles.actionBannerDuplicate
              : styles.actionBannerError,
          ]}
        >
          <Text style={styles.actionBannerTitle}>{actionBanner.title}</Text>
          <Text style={styles.actionBannerBody}>{actionBanner.body}</Text>
          {actionBanner.tone === 'duplicate' ? (
            <View style={styles.actionBannerActions}>
              {actionBanner.duplicateBatchId ? (
                <>
                  <Button
                    mode="contained"
                    compact
                    loading={draftActionBusy}
                    disabled={draftActionBusy}
                    onPress={() => openDraftById(actionBanner.duplicateBatchId)}
                    buttonColor={PRIMARY}
                  >
                    {t(
                      'partnerDashboard.warehouse.receiving.openDraft',
                      null,
                      'Continue draft'
                    )}
                  </Button>
                  <Button
                    mode="outlined"
                    compact
                    disabled={draftActionBusy}
                    onPress={() => deleteOtherDraft(actionBanner.duplicateBatchId)}
                    textColor="#b91c1c"
                  >
                    {t(
                      'partnerDashboard.warehouse.receiving.deleteOtherDraft',
                      null,
                      'Delete that draft'
                    )}
                  </Button>
                </>
              ) : (
                pendingDrafts
                  .filter((d) => Number(d.id) !== Number(batch?.id))
                  .slice(0, 3)
                  .map((draft) => (
                    <Button
                      key={draft.id}
                      mode="contained"
                      compact
                      loading={draftActionBusy}
                      disabled={draftActionBusy}
                      onPress={() => openDraftById(draft.id)}
                      buttonColor={PRIMARY}
                      style={styles.actionBannerDraftBtn}
                    >
                      {t(
                        'partnerDashboard.warehouse.receiving.openDraftNamed',
                        {
                          name:
                            draft.supplier_name ||
                            draft.invoice_number ||
                            `#${draft.id}`,
                        },
                        'Continue: {name}'
                      )}
                    </Button>
                  ))
              )}
            </View>
          ) : null}
        </FloatingCard>
      ) : null}

      <View
        style={[
          styles.statusStrip,
          statusTone === 'ok' ? styles.statusStripOk : null,
          statusTone === 'warn' ? styles.statusStripWarn : null,
        ]}
      >
        <MaterialCommunityIcons
          name={readyToCommit ? 'check-circle' : 'clipboard-list-outline'}
          size={18}
          color={readyToCommit ? '#15803d' : statusTone === 'warn' ? '#b45309' : '#e2e8f0'}
        />
        <Text style={styles.statusStripText}>
          {t(
            'partnerDashboard.warehouse.receiving.statusParts',
            { count: lines.length },
            '{count} parts'
          )}
          {readyToCommit
            ? ` · ${t('partnerDashboard.warehouse.receiving.statusReady', null, 'ready to complete')}`
            : headerIssues.length
              ? ` · ${t('partnerDashboard.warehouse.receiving.statusHeaderMissing', null, 'document fields missing')}`
              : incomplete > 0
                ? ` · ${t(
                    'partnerDashboard.warehouse.receiving.statusLinesNeedFix',
                    { count: incomplete },
                    '{count} need edit'
                  )}`
                : ''}
        </Text>
      </View>

      <MissingFieldsBanner batch={batch} visible={showValidation && !actionBanner} />

      <Text style={styles.sectionTitle}>
        {t('partnerDashboard.warehouse.receiving.sectionDocument', null, '1. Document')}
      </Text>
      <ReceivingDocumentPreview
        batch={batch}
        preview={invoicePreview}
        uploading={uploading}
        onUpload={handleUploadInvoice}
        onReupload={handleUploadInvoice}
        compact
      />

      <InvoiceHeaderCard
        batch={batch}
        onChange={persistHeaderDraft}
        onDraft={captureHeaderDraft}
        showValidation={showValidation}
      />

      <View style={styles.partsSectionHeader}>
        <Text style={styles.sectionTitle}>
          {t('partnerDashboard.warehouse.receiving.sectionParts', null, '2. Parts to stock')}
        </Text>
        <View style={styles.partsActions}>
          <Button
            mode="contained"
            icon="plus"
            onPress={() => openEditor(null)}
            buttonColor={PRIMARY}
            compact
          >
            {t('partnerDashboard.warehouse.receiving.addPart', null, 'Add part')}
          </Button>
          <Button mode="outlined" icon="file-delimited" onPress={handleImportCsv} loading={importingCsv} compact>
            CSV
          </Button>
        </View>
      </View>
      <Text style={styles.partsLead}>
        {t(
          'partnerDashboard.warehouse.receiving.partsLead',
          null,
          'These lines become stock when you complete receiving. Tap Edit if anything looks wrong.'
        )}
      </Text>
    </View>
  );

  const listFooter = (
    <View style={styles.footerSection}>
      <Text style={[styles.sectionTitle, styles.footerSectionTitle]}>
        {t('partnerDashboard.warehouse.receiving.sectionComplete', null, '3. Complete')}
      </Text>
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
            {t(
              'partnerDashboard.warehouse.receiving.completeReceiving',
              null,
              'Complete receiving'
            )}
          </Button>
          {showValidation && !readyToCommit ? (
            <Text style={styles.footerHint}>
              {t(
                'partnerDashboard.warehouse.receiving.fixBeforeComplete',
                null,
                'Fix red fields above before completing.'
              )}
            </Text>
          ) : (
            <Text style={styles.footerKeepHint}>
              {t(
                'partnerDashboard.warehouse.receiving.fileKeptForever',
                null,
                'The invoice PDF stays on file for this service center after you complete.'
              )}
            </Text>
          )}
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
            onPress={() => navigateToShopDashboard(navigation)}
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
});

export default ShopWarehouseReceiveScreen;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  webScroll: { minHeight: 0, overflow: 'auto' },
  embeddedRoot: { flex: 1, minHeight: 0 },
  embeddedPad: { paddingTop: 4 },
  wizardContent: { paddingBottom: 40 },
  backWizard: { alignSelf: 'flex-start', marginBottom: 0 },
  discardBtn: {
    borderColor: 'rgba(185, 28, 28, 0.45)',
  },
  draftNavRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
    marginBottom: 10,
  },
  statusStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(15,23,42,0.72)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  statusStripOk: {
    backgroundColor: 'rgba(22, 101, 52, 0.35)',
  },
  statusStripWarn: {
    backgroundColor: 'rgba(180, 83, 9, 0.35)',
  },
  statusStripText: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#e2e8f0',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  partsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 4,
    marginBottom: 4,
  },
  partsActions: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  partsLead: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 17,
    marginBottom: 10,
  },
  footerSectionTitle: { paddingHorizontal: 12, marginTop: 8 },
  footerKeepHint: {
    color: '#cbd5e1',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 17,
  },
  duplicateHint: {
    fontSize: 12,
    color: TEXT_MUTED,
    lineHeight: 17,
    marginBottom: 10,
  },
  actionBannerCard: {
    marginBottom: 10,
    padding: 12,
  },
  actionBannerDuplicate: {
    backgroundColor: '#fff7ed',
    borderLeftWidth: 4,
    borderLeftColor: '#ea580c',
  },
  actionBannerError: {
    backgroundColor: '#fef2f2',
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
  },
  actionBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_DARK,
    marginBottom: 4,
  },
  actionBannerBody: {
    fontSize: 13,
    lineHeight: 18,
    color: '#7c2d12',
  },
  actionBannerActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  actionBannerDraftBtn: {
    marginBottom: 4,
  },
  pendingDraftsCard: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#fff7ed',
  },
  pendingDraftsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: TEXT_DARK,
    marginBottom: 4,
  },
  pendingDraftsLead: {
    fontSize: 12,
    color: '#9a3412',
    lineHeight: 17,
    marginBottom: 8,
  },
  deleteAllDraftsBtn: {
    alignSelf: 'flex-start',
    marginBottom: 8,
    borderColor: 'rgba(185, 28, 28, 0.45)',
  },
  pendingDraftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(154, 52, 18, 0.25)',
  },
  pendingDraftBody: { flex: 1, minWidth: 120 },
  pendingDraftName: { fontSize: 14, fontWeight: '600', color: TEXT_DARK },
  pendingDraftMeta: { fontSize: 12, color: TEXT_MUTED, marginTop: 2 },
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
