import React, { useCallback, useState } from 'react';
import { View, FlatList, StyleSheet, Pressable, ScrollView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { Text, ActivityIndicator, Button, Chip, IconButton } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import FloatingCard from '../ui/FloatingCard';
import EmptyStateCard from '../ui/EmptyStateCard';
import ReceivingDocumentPreview from './ReceivingDocumentPreview';
import ReceivingTotalsCard from './ReceivingTotalsCard';
import { PRIMARY, TEXT_DARK, TEXT_MUTED } from '../../constants/colors';
import {
  getPurchaseDocument,
  listPendingReceivingSessions,
  listPurchaseDocuments,
  deleteReceivingSession,
  LINE_ISSUE_LABELS,
} from '../../api/warehouse';
import { useTranslation } from '../../i18n';
import { showMessage, confirmMessage } from '../../utils/crossPlatformAlert';

const DOC_TYPE_LABELS = {
  purchase_invoice: 'Purchase invoice',
  goods_receipt: 'Goods receipt',
  credit_note: 'Credit note',
};

function DraftRow({ batch, onContinue, onDelete, deleting }) {
  const issues = (batch?.header_issues || []).length + (Number(batch?.incomplete_count) || 0);
  return (
    <FloatingCard style={styles.draftCard}>
      <View style={styles.row}>
        <MaterialCommunityIcons name="file-edit-outline" size={22} color="#b45309" />
        <View style={styles.body}>
          <Text style={styles.title}>Draft — {batch.supplier_name || 'No supplier yet'}</Text>
          <Text style={styles.meta}>
            {batch.line_count || 0} lines
            {batch.invoice_number ? ` · ${batch.invoice_number}` : ''}
            {issues > 0 ? ` · ${issues} missing` : ''}
          </Text>
        </View>
        <IconButton
          icon="trash-can-outline"
          size={20}
          iconColor="#dc2626"
          onPress={() => onDelete(batch)}
          disabled={deleting}
        />
        <Button mode="contained" compact onPress={() => onContinue(batch.id)} buttonColor={PRIMARY}>
          Continue
        </Button>
      </View>
    </FloatingCard>
  );
}

function DocumentRow({ doc, onOpen }) {
  const label = doc.supplier_label || doc.supplier_name || 'Supplier unknown';
  const typeLabel = DOC_TYPE_LABELS[doc.document_type] || doc.document_type;
  const total = doc.total_amount_minor
    ? `€${(Number(doc.total_amount_minor) / 100).toFixed(2)}`
    : '';
  return (
    <Pressable onPress={() => onOpen(doc)}>
      <FloatingCard style={styles.docCard}>
        <View style={styles.row}>
          <MaterialCommunityIcons name="file-document-check-outline" size={22} color={PRIMARY} />
          <View style={styles.body}>
            <Text style={styles.title}>{label}</Text>
            <Text style={styles.meta}>
              {doc.external_reference || '—'}
              {doc.document_date ? ` · ${doc.document_date}` : ''}
            </Text>
            <Text style={styles.meta}>
              {typeLabel} · {doc.line_count || 0} lines{total ? ` · ${total}` : ''}
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={22} color={TEXT_MUTED} />
        </View>
      </FloatingCard>
    </Pressable>
  );
}

function LineSummary({ line }) {
  const priceEx = line.unit_price_ex_vat_minor ?? line.unit_price_minor;
  return (
    <View style={styles.lineRow}>
      <Text style={styles.lineTitle} numberOfLines={1}>
        {line.part_type_name || line.description || 'Line'}
      </Text>
      <Text style={styles.lineMeta}>
        {line.part_number || '—'} · {line.quantity} {line.unit_symbol || ''} · ex €
        {priceEx ? (Number(priceEx) / 100).toFixed(2) : '—'}
      </Text>
      {(line.issues || []).length > 0 ? (
        <Text style={styles.lineIssue}>
          {(line.issues || []).map((c) => LINE_ISSUE_LABELS[c] || c).join(', ')}
        </Text>
      ) : null}
    </View>
  );
}

function DocumentDetail({ doc, onBack }) {
  const fileUrl = doc?.file_url;
  return (
    <ScrollView
      style={styles.detailScroll}
      contentContainerStyle={styles.detailScrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator
    >
      <Button icon="arrow-left" mode="text" onPress={onBack} compact>
        All documents
      </Button>
      <FloatingCard style={styles.detailCard}>
        <Text style={styles.detailTitle}>
          {doc.supplier_label || doc.supplier_name || 'Document'}
        </Text>
        <Text style={styles.meta}>
          {doc.external_reference || '—'}
          {doc.document_date ? ` · ${doc.document_date}` : ''}
        </Text>
        <Chip compact style={styles.typeChip}>
          {DOC_TYPE_LABELS[doc.document_type] || doc.document_type}
        </Chip>
      </FloatingCard>

      {fileUrl ? (
        <ReceivingDocumentPreview
          batch={{
            source_type: 'invoice_upload',
            source_file_stored: true,
            source_file_url: fileUrl,
            supplier_name: doc.supplier_label,
            invoice_number: doc.external_reference,
            invoice_date: doc.document_date,
            ocr_status: doc.ocr_status,
            line_count: doc.line_count,
          }}
          preview={{ message: 'Committed document — preview loads below.' }}
          readOnly
          onAddManual={() => {}}
        />
      ) : null}

      <ReceivingTotalsCard totals={doc.totals} lineCount={(doc.lines || []).length} />

      <Text style={styles.linesHeading}>Lines</Text>
      {(doc.lines || []).map((line) => (
        <FloatingCard key={line.id} style={styles.lineCard}>
          <LineSummary line={line} />
        </FloatingCard>
      ))}
    </ScrollView>
  );
}

export default function ShopWarehouseDocumentsPanel({ onEditDraft }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const [draftRows, docRows] = await Promise.all([
        listPendingReceivingSessions(token),
        listPurchaseDocuments(token),
      ]);
      setDrafts(Array.isArray(draftRows) ? draftRows : []);
      setDocuments(Array.isArray(docRows) ? docRows : docRows?.results || []);
    } catch (err) {
      showMessage('Documents', err.message || 'Could not load');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!selectedDoc) load();
    }, [load, selectedDoc])
  );

  const handleDeleteDraft = async (batch) => {
    const ok = await confirmMessage(
      'Delete draft?',
      'This removes the unfinished document and its lines.',
      { confirmLabel: 'Delete' }
    );
    if (!ok) return;
    setDeletingId(batch.id);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      await deleteReceivingSession(token, batch.id);
      setDrafts((rows) => rows.filter((r) => r.id !== batch.id));
    } catch (err) {
      showMessage('Delete', err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const openDocument = async (doc) => {
    setDetailLoading(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const full = await getPurchaseDocument(token, doc.id);
      setSelectedDoc(full);
    } catch (err) {
      showMessage('Document', err.message);
    } finally {
      setDetailLoading(false);
    }
  };

  if (detailLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={PRIMARY} />
      </View>
    );
  }

  if (selectedDoc) {
    return (
      <View style={styles.panelRoot}>
        <DocumentDetail doc={selectedDoc} onBack={() => setSelectedDoc(null)} />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={PRIMARY} />
      </View>
    );
  }

  const listData = [
    ...(drafts.length ? [{ type: 'drafts-header' }] : []),
    ...drafts.map((d) => ({ type: 'draft', batch: d })),
    { type: 'docs-header' },
    ...documents.map((d) => ({ type: 'doc', doc: d })),
  ];

  return (
    <FlatList
      style={styles.panelRoot}
      data={listData}
      keyExtractor={(item, index) =>
        item.type === 'draft'
          ? `draft-${item.batch.id}`
          : item.type === 'doc'
            ? `doc-${item.doc.id}`
            : `${item.type}-${index}`
      }
      contentContainerStyle={styles.list}
      ListEmptyComponent={
        <EmptyStateCard
          icon="file-document-multiple-outline"
          title={t('partnerDashboard.warehouse.noDocumentsTitle')}
          subtitle={t('partnerDashboard.warehouse.noDocumentsSubtitle')}
        />
      }
      renderItem={({ item }) => {
        if (item.type === 'drafts-header') {
          return <Text style={styles.sectionTitle}>Drafts</Text>;
        }
        if (item.type === 'draft') {
          return (
            <DraftRow
              batch={item.batch}
              onContinue={onEditDraft}
              onDelete={handleDeleteDraft}
              deleting={deletingId === item.batch.id}
            />
          );
        }
        if (item.type === 'docs-header') {
          return <Text style={styles.sectionTitle}>Completed documents</Text>;
        }
        if (item.type === 'doc') {
          return <DocumentRow doc={item.doc} onOpen={openDocument} />;
        }
        return null;
      }}
    />
  );
}

const styles = StyleSheet.create({
  panelRoot: { flex: 1, ...(Platform.OS === 'web' ? { minHeight: 0 } : {}) },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  list: { padding: 12, paddingBottom: 40 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.95)',
    marginBottom: 8,
    marginTop: 4,
  },
  draftCard: { marginBottom: 8, padding: 12, borderLeftWidth: 4, borderLeftColor: '#f59e0b' },
  docCard: { marginBottom: 8, padding: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  body: { flex: 1 },
  title: { fontSize: 15, fontWeight: '600', color: TEXT_DARK },
  meta: { fontSize: 12, color: TEXT_MUTED, marginTop: 2 },
  detailScroll: { flex: 1, ...(Platform.OS === 'web' ? { overflow: 'auto' } : {}) },
  detailScrollContent: { padding: 12, paddingBottom: 48 },
  detailCard: { padding: 14, marginBottom: 10 },
  detailTitle: { fontSize: 17, fontWeight: '700', color: TEXT_DARK },
  typeChip: { alignSelf: 'flex-start', marginTop: 8, backgroundColor: '#dbeafe' },
  linesHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.95)',
    marginVertical: 8,
  },
  lineCard: { marginBottom: 6, padding: 10 },
  lineRow: { gap: 2 },
  lineTitle: { fontSize: 14, fontWeight: '600', color: TEXT_DARK },
  lineMeta: { fontSize: 12, color: TEXT_MUTED },
  lineIssue: { fontSize: 11, color: '#b91c1c', fontWeight: '600' },
});
