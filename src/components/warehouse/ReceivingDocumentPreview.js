import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Pressable, Linking, Platform, ActivityIndicator } from 'react-native';
import { Text, Button, Chip } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import FloatingCard from '../ui/FloatingCard';
import { PRIMARY, TEXT_DARK, TEXT_MUTED } from '../../constants/colors';
import { showMessage } from '../../utils/crossPlatformAlert';
import useWebDocumentBlobUrl from '../../utils/useWebDocumentBlobUrl';
import { normalizeMediaUrl } from '../../utils/warehouseDocumentUrl';
import {
  buildInvoicePreviewFromBatch,
  isImageDocumentUrl,
  isPdfDocumentUrl,
} from '../../utils/warehouseInvoicePreview';

function WebDocumentFrame({ url, isPdf, isImage, loadError, loading }) {
  if (!url || Platform.OS !== 'web') return null;

  if (loading) {
    return (
      <View style={styles.previewLoading}>
        <ActivityIndicator color={PRIMARY} />
        <Text style={styles.fallbackText}>Loading preview…</Text>
      </View>
    );
  }

  if (loadError) {
    return (
      <Text style={styles.previewError}>
        {loadError} — use Open file to view in a new tab.
      </Text>
    );
  }

  if (isImage) {
    return (
      <img
        src={url}
        alt="Supplier document"
        style={{
          width: '100%',
          maxHeight: 480,
          objectFit: 'contain',
          borderRadius: 8,
          backgroundColor: '#fff',
        }}
      />
    );
  }

  if (isPdf) {
    return (
      <object
        data={url}
        type="application/pdf"
        style={{
          width: '100%',
          height: 480,
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          backgroundColor: '#fff',
        }}
      >
        <iframe
          title="Supplier invoice PDF"
          src={url}
          style={{
            width: '100%',
            height: 480,
            border: 'none',
            borderRadius: 8,
            backgroundColor: '#fff',
          }}
        />
      </object>
    );
  }

  return (
    <Text style={styles.fallbackText}>
      Preview not available for this file type — use Open file.
    </Text>
  );
}

export default function ReceivingDocumentPreview({
  batch,
  preview,
  uploading = false,
  onUpload,
  onReupload,
  onAddManual,
  readOnly = false,
}) {
  const [expanded, setExpanded] = useState(true);
  const resolved = useMemo(
    () => buildInvoicePreviewFromBatch(batch, preview),
    [batch, preview]
  );

  const fileUrl = batch?.source_file_url || '';
  const { displayUrl, loading: previewLoading, error: previewError } = useWebDocumentBlobUrl(fileUrl);
  const isPdf = isPdfDocumentUrl(fileUrl);
  const isImage = isImageDocumentUrl(fileUrl);
  const hasFile = Boolean(batch?.source_file_stored && fileUrl);
  const isInvoiceImport = batch?.source_type === 'invoice_upload';

  const openFile = () => {
    const target = normalizeMediaUrl(fileUrl);
    if (!target) {
      showMessage('Document', 'File not available yet.');
      return;
    }
    if (Platform.OS === 'web') {
      window.open(target, '_blank', 'noopener,noreferrer');
      return;
    }
    Linking.openURL(target).catch(() => showMessage('Document', 'Could not open file.'));
  };

  if (!isInvoiceImport && !hasFile) {
    return (
      <FloatingCard style={styles.uploadCard}>
        <View style={styles.uploadHeader}>
          <MaterialCommunityIcons name="file-upload-outline" size={28} color={PRIMARY} />
          <View style={styles.uploadBody}>
            <Text style={styles.uploadTitle}>Supplier invoice (optional)</Text>
            <Text style={styles.uploadHint}>
              Upload a PDF or photo to parse line items, or add parts manually below.
            </Text>
          </View>
        </View>
        <Button
          mode="contained"
          icon="file-upload"
          onPress={onUpload}
          loading={uploading}
          buttonColor={PRIMARY}
        >
          Choose invoice file
        </Button>
      </FloatingCard>
    );
  }

  const linesParsed = resolved?.lines_parsed ?? batch?.line_count ?? 0;
  const status = resolved?.ocr_status || batch?.ocr_status || 'unknown';
  const statusLabel =
    status === 'ready'
      ? `${linesParsed} line${linesParsed === 1 ? '' : 's'} parsed`
      : status === 'no_text'
        ? 'Scan / image PDF'
        : linesParsed > 0
          ? `${linesParsed} lines`
          : 'No lines matched';

  return (
    <FloatingCard style={styles.card}>
      <Pressable onPress={() => setExpanded((v) => !v)} style={styles.header}>
        <MaterialCommunityIcons
          name={hasFile ? 'file-document-outline' : 'file-alert-outline'}
          size={26}
          color={PRIMARY}
        />
        <View style={styles.headerBody}>
          <Text style={styles.title}>Supplier document</Text>
          <Text style={styles.meta} numberOfLines={2}>
            {batch?.supplier_name || 'Supplier unknown'}
            {batch?.invoice_number ? ` · ${batch.invoice_number}` : ''}
            {batch?.invoice_date ? ` · ${batch.invoice_date}` : ''}
          </Text>
        </View>
        <Chip compact style={styles.statusChip} textStyle={styles.statusChipText}>
          {statusLabel}
        </Chip>
        <MaterialCommunityIcons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={22}
          color={TEXT_MUTED}
        />
      </Pressable>

      {resolved?.message ? <Text style={styles.message}>{resolved.message}</Text> : null}

      {expanded && hasFile ? (
        <View style={styles.previewFrame}>
          <WebDocumentFrame
            url={displayUrl}
            isPdf={isPdf}
            isImage={isImage}
            loading={previewLoading}
            loadError={previewError}
          />
          {Platform.OS !== 'web' ? (
            <View style={styles.nativePreviewHint}>
              <MaterialCommunityIcons name="file-eye-outline" size={20} color={TEXT_MUTED} />
              <Text style={styles.nativePreviewText}>
                {isImage ? 'Image attached' : 'PDF attached'} — open to view side-by-side while
                editing lines.
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.actions}>
        {hasFile ? (
          <Button mode="outlined" icon="open-in-new" onPress={openFile} compact>
            Open file
          </Button>
        ) : null}
        {!readOnly ? (
          <>
            <Button
              mode="outlined"
              icon="file-upload"
              onPress={onReupload || onUpload}
              loading={uploading}
              compact
            >
              {isInvoiceImport ? 'Re-import' : 'Upload'}
            </Button>
            <Button mode="contained" icon="plus" onPress={onAddManual} buttonColor={PRIMARY} compact>
              Add part
            </Button>
          </>
        ) : null}
      </View>
    </FloatingCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 10,
    padding: 14,
    backgroundColor: '#f0f9ff',
    borderLeftWidth: 4,
    borderLeftColor: PRIMARY,
  },
  uploadCard: { marginBottom: 10, padding: 14 },
  uploadHeader: { flexDirection: 'row', gap: 10, marginBottom: 12, alignItems: 'flex-start' },
  uploadBody: { flex: 1 },
  uploadTitle: { fontSize: 16, fontWeight: '700', color: TEXT_DARK },
  uploadHint: { fontSize: 13, color: TEXT_MUTED, marginTop: 4, lineHeight: 18 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  headerBody: { flex: 1 },
  title: { fontSize: 16, fontWeight: '700', color: TEXT_DARK },
  meta: { fontSize: 12, color: TEXT_MUTED, marginTop: 2 },
  statusChip: { backgroundColor: '#dbeafe', maxWidth: 120 },
  statusChipText: { fontSize: 10, color: '#1d4ed8' },
  message: { fontSize: 13, color: TEXT_DARK, lineHeight: 18, marginBottom: 10 },
  previewFrame: { marginBottom: 10 },
  previewLoading: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  previewError: { fontSize: 12, color: '#b91c1c', paddingVertical: 8, lineHeight: 17 },
  fallbackText: { fontSize: 12, color: TEXT_MUTED, paddingVertical: 8 },
  nativePreviewHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  nativePreviewText: { flex: 1, fontSize: 12, color: TEXT_MUTED, lineHeight: 17 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
