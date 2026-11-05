import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Pressable, Linking, Platform, ActivityIndicator } from 'react-native';
import { Text, Button, Chip } from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import FloatingCard from '../ui/FloatingCard';
import { PRIMARY, TEXT_DARK, TEXT_MUTED } from '../../constants/colors';
import { showMessage } from '../../utils/crossPlatformAlert';
import { useTranslation } from '../../i18n';
import useReceivingDocumentUrl from '../../utils/useReceivingDocumentUrl';
import { openReceivingBatchDocument } from '../../utils/receivingDocumentAccess';
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
        {loadError}
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
          maxHeight: 360,
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
          height: 360,
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
            height: 360,
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
  compact = false,
  readOnly = false,
}) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(!compact);
  const resolved = useMemo(
    () => buildInvoicePreviewFromBatch(batch, preview),
    [batch, preview]
  );

  const fileUrl = batch?.source_file_url || '';
  const { displayUrl, loading: previewLoading, error: previewError } = useReceivingDocumentUrl(batch);
  const isPdf = isPdfDocumentUrl(fileUrl) || String(fileUrl).toLowerCase().endsWith('.pdf');
  const isImage = isImageDocumentUrl(fileUrl);
  const hasFile = Boolean(batch?.id && (batch?.source_file_stored || fileUrl));
  const isInvoiceImport = batch?.source_type === 'invoice_upload';
  const linesParsed = resolved?.lines_parsed ?? batch?.line_count ?? 0;

  const openFile = async () => {
    if (!batch?.id && !fileUrl) {
      showMessage(
        t('partnerDashboard.warehouse.receiving.fileUnavailableTitle', null, 'Document'),
        t('partnerDashboard.warehouse.receiving.fileUnavailableBody', null, 'File not available yet.')
      );
      return;
    }
    try {
      const accessUrl = await openReceivingBatchDocument(batch, fileUrl);
      if (Platform.OS !== 'web' && accessUrl) {
        await Linking.openURL(accessUrl);
      }
    } catch (err) {
      showMessage(
        t('partnerDashboard.warehouse.receiving.openFileFailedTitle', null, 'Could not open file'),
        err.message || t('repairs.detail.pleaseTryAgain', null, 'Please try again.')
      );
    }
  };

  if (!isInvoiceImport && !hasFile) {
    return (
      <FloatingCard style={styles.uploadCard}>
        <View style={styles.uploadHeader}>
          <MaterialCommunityIcons name="file-upload-outline" size={28} color={PRIMARY} />
          <View style={styles.uploadBody}>
            <Text style={styles.uploadTitle}>
              {t(
                'partnerDashboard.warehouse.receiving.uploadInvoice',
                null,
                'Upload supplier invoice'
              )}
            </Text>
            <Text style={styles.uploadHint}>
              {t(
                'partnerDashboard.warehouse.receiving.uploadInvoiceHint',
                null,
                'PDF or photo — we read line items when possible.'
              )}
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
          {t(
            'partnerDashboard.warehouse.receiving.chooseInvoiceFile',
            null,
            'Choose invoice file'
          )}
        </Button>
      </FloatingCard>
    );
  }

  const statusLabel =
    linesParsed > 0
      ? t(
          'partnerDashboard.warehouse.receiving.linesParsedChip',
          { count: linesParsed },
          '{count} lines'
        )
      : t('partnerDashboard.warehouse.receiving.noLinesChip', null, 'No lines matched');

  return (
    <FloatingCard style={styles.card}>
      <Pressable onPress={() => setExpanded((v) => !v)} style={styles.header}>
        <MaterialCommunityIcons
          name={hasFile ? 'file-pdf-box' : 'file-alert-outline'}
          size={26}
          color={PRIMARY}
        />
        <View style={styles.headerBody}>
          <Text style={styles.title}>
            {t(
              'partnerDashboard.warehouse.receiving.invoiceFileTitle',
              null,
              'Invoice file'
            )}
          </Text>
          <Text style={styles.meta} numberOfLines={2}>
            {batch?.supplier_name || '—'}
            {batch?.invoice_number ? ` · ${batch.invoice_number}` : ''}
            {batch?.invoice_date ? ` · ${batch.invoice_date}` : ''}
          </Text>
          <Text style={styles.hint}>
            {linesParsed > 0
              ? t(
                  'partnerDashboard.warehouse.receiving.linesParsedHint',
                  { count: linesParsed },
                  '{count} parts read — review the list below.'
                )
              : t(
                  'partnerDashboard.warehouse.receiving.noLinesHint',
                  null,
                  'No lines matched — add parts manually or re-import.'
                )}
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

      {expanded && hasFile ? (
        <View style={styles.previewFrame}>
          <WebDocumentFrame
            url={displayUrl}
            isPdf={isPdf || !isImage}
            isImage={isImage}
            loading={previewLoading}
            loadError={previewError}
          />
        </View>
      ) : null}

      <View style={styles.actions}>
        {hasFile ? (
          <Button mode="contained" icon="open-in-new" onPress={openFile} compact buttonColor={PRIMARY}>
            {t('partnerDashboard.warehouse.receiving.openFile', null, 'Open PDF')}
          </Button>
        ) : null}
        {!readOnly ? (
          <Button
            mode="outlined"
            icon="file-upload"
            onPress={onReupload || onUpload}
            loading={uploading}
            compact
          >
            {isInvoiceImport
              ? t('partnerDashboard.warehouse.receiving.reimport', null, 'Re-import')
              : t('partnerDashboard.warehouse.receiving.upload', null, 'Upload')}
          </Button>
        ) : null}
        {!expanded && hasFile ? (
          <Button mode="text" compact onPress={() => setExpanded(true)}>
            {t('partnerDashboard.warehouse.receiving.showPreview', null, 'Show preview')}
          </Button>
        ) : null}
      </View>
    </FloatingCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 10,
    padding: 14,
    backgroundColor: '#f8fafc',
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
  hint: { fontSize: 12, color: TEXT_DARK, marginTop: 4, lineHeight: 17 },
  statusChip: { backgroundColor: '#dbeafe', maxWidth: 120 },
  statusChipText: { fontSize: 10, color: '#0F4C81' },
  previewFrame: { marginBottom: 10 },
  previewLoading: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  previewError: { fontSize: 12, color: '#b91c1c', paddingVertical: 8, lineHeight: 17 },
  fallbackText: { fontSize: 12, color: TEXT_MUTED, paddingVertical: 8 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
});
