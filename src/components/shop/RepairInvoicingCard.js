import React, { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Button, Text } from 'react-native-paper';

import FloatingCard from '../ui/FloatingCard';
import { COLORS } from '../../constants/colors';
import { draftInvoiceFromRepairs } from '../../api/billing';
import { uploadRepairDocument } from '../../api/documents';
import { pickReceiptOrInvoiceAttachment } from '../../utils/pickDocumentFile';
import { DOCUMENT_TYPE_REPAIR_INVOICE } from '../../utils/vehicleDocumentTypes';
import { useTranslation } from '../../i18n';

export default function RepairInvoicingCard({
  repair,
  onRepairUpdated,
  onOpenInvoice,
  onOpenInvoicingHome,
  embedded = false,
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);

  const hasIssued = Boolean(repair?.has_issued_invoice);
  const vehicleId = repair?.vehicle;

  const handleCreatePlatformInvoice = async () => {
    if (!repair?.id) return;
    setBusy(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const invoice = await draftInvoiceFromRepairs(token, [repair.id]);
      if (onRepairUpdated) {
        onRepairUpdated({ ...repair, has_issued_invoice: false, shop_customer: invoice.shop_customer });
      }
      if (onOpenInvoice && invoice?.id) {
        onOpenInvoice(invoice.id);
      } else {
        Alert.alert(
          t('repairs.invoicing.draftCreatedTitle', null, 'Draft created'),
          t(
            'repairs.invoicing.draftCreatedBody',
            null,
            'Open Invoicing from the menu to review and issue.'
          )
        );
      }
    } catch (err) {
      Alert.alert(
        t('common.error', null, 'Error'),
        err.message || t('repairs.invoicing.createDraftFailed', null, 'Could not create invoice draft')
      );
    } finally {
      setBusy(false);
    }
  };

  const handleUploadExternalPdf = async () => {
    if (!repair?.id || !vehicleId) {
      Alert.alert(
        t('repairs.invoicing.missingDataTitle', null, 'Missing data'),
        t(
          'repairs.invoicing.vehicleRequiredForPdf',
          null,
          'Vehicle is required to attach an external invoice PDF.'
        )
      );
      return;
    }
    setBusy(true);
    try {
      const attachment = await pickReceiptOrInvoiceAttachment();
      if (!attachment) {
        setBusy(false);
        return;
      }
      const token = await AsyncStorage.getItem('@access_token');
      await uploadRepairDocument(token, vehicleId, repair.id, attachment, {
        document_type: DOCUMENT_TYPE_REPAIR_INVOICE,
        title: attachment.fileName || t('repairs.invoicing.externalInvoiceTitle', null, 'External invoice'),
      });
      Alert.alert(
        t('repairs.invoicing.uploadedTitle', null, 'Uploaded'),
        t(
          'repairs.invoicing.uploadedBody',
          null,
          'External invoice PDF attached to this repair. No platform invoice was created.'
        )
      );
    } catch (err) {
      Alert.alert(
        t('common.error', null, 'Error'),
        err.message || t('repairs.invoicing.uploadFailed', null, 'Could not upload invoice PDF')
      );
    } finally {
      setBusy(false);
    }
  };

  const body = (
    <>
      {!embedded ? (
        <Text style={styles.title}>{t('repairs.invoicing.title', null, 'Invoicing')}</Text>
      ) : null}
      <Text style={styles.hint}>
        {t(
          'repairs.invoicing.hint',
          null,
          'Use a platform invoice for numbering and bill-to snapshot, or attach a PDF from your external accounting app — both paths are supported.'
        )}
      </Text>

      {hasIssued ? (
        <View style={styles.issuedBanner}>
          <Text style={styles.issuedText}>
            {t(
              'repairs.invoicing.platformIssued',
              null,
              'Platform invoice issued for this repair.'
            )}
          </Text>
          {onOpenInvoicingHome ? (
            <Button mode="text" compact onPress={onOpenInvoicingHome}>
              {t('repairs.invoicing.openList', null, 'Open invoicing list')}
            </Button>
          ) : null}
        </View>
      ) : (
        <Button
          mode="contained"
          icon="file-plus-outline"
          onPress={handleCreatePlatformInvoice}
          loading={busy}
          disabled={busy}
          style={styles.btn}
        >
          {t('repairs.invoicing.createPlatform', null, 'Create platform invoice')}
        </Button>
      )}

      <Button
        mode="outlined"
        icon="file-upload-outline"
        onPress={handleUploadExternalPdf}
        loading={busy}
        disabled={busy}
        style={styles.btn}
      >
        {t('repairs.invoicing.uploadExternalPdf', null, 'Upload external PDF')}
      </Button>
    </>
  );

  if (embedded) {
    return <View style={styles.embedded}>{body}</View>;
  }

  return (
    <FloatingCard style={styles.card}>
      {body}
    </FloatingCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 8,
  },
  embedded: {
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
  },
  hint: {
    color: COLORS.TEXT_MUTED,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  btn: {
    alignSelf: 'stretch',
  },
  issuedBanner: {
    backgroundColor: 'rgba(16,185,129,0.08)',
    borderRadius: 10,
    padding: 10,
    gap: 4,
  },
  issuedText: {
    color: COLORS.TEXT_DARK,
    fontWeight: '600',
    fontSize: 14,
  },
});
