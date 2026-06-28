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

export default function RepairInvoicingCard({
  repair,
  onRepairUpdated,
  onOpenInvoice,
  onOpenInvoicingHome,
}) {
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
        Alert.alert('Draft created', 'Open Invoicing from the menu to review and issue.');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not create invoice draft');
    } finally {
      setBusy(false);
    }
  };

  const handleUploadExternalPdf = async () => {
    if (!repair?.id || !vehicleId) {
      Alert.alert('Missing data', 'Vehicle is required to attach an external invoice PDF.');
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
        title: attachment.fileName || 'External invoice',
      });
      Alert.alert(
        'Uploaded',
        'External invoice PDF attached to this repair. No platform invoice was created.'
      );
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not upload invoice PDF');
    } finally {
      setBusy(false);
    }
  };

  return (
    <FloatingCard style={styles.card}>
      <Text style={styles.title}>Invoicing</Text>
      <Text style={styles.hint}>
        Use a platform invoice for numbering and bill-to snapshot, or attach a PDF from your
        external accounting app — both paths are supported.
      </Text>

      {hasIssued ? (
        <View style={styles.issuedBanner}>
          <Text style={styles.issuedText}>Platform invoice issued for this repair.</Text>
          {onOpenInvoicingHome ? (
            <Button mode="text" compact onPress={onOpenInvoicingHome}>
              Open invoicing list
            </Button>
          ) : null}
        </View>
      ) : (
        <Button
          mode="contained"
          icon="file-document-plus-outline"
          onPress={handleCreatePlatformInvoice}
          loading={busy}
          disabled={busy}
          style={styles.btn}
        >
          Create platform invoice
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
        Upload external PDF
      </Button>
    </FloatingCard>
  );
}

const styles = StyleSheet.create({
  card: {
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
