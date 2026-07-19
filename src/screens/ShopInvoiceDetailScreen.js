import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, Button, Text } from 'react-native-paper';

import ScreenBackground from '../components/ScreenBackground';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import InvoiceDocumentPreview from '../components/shop/InvoiceDocumentPreview';
import { COLORS } from '../constants/colors';
import { getInvoiceById, issueInvoice, markInvoicePaid } from '../api/billing';
import { navigateToPartnerProfile } from '../navigation/webNavigation';

export default function ShopInvoiceDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const invoiceId = route.params?.invoiceId;
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);
  const [confirmIssue, setConfirmIssue] = useState(false);

  const loadInvoice = useCallback(async () => {
    if (!invoiceId) return;
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const data = await getInvoiceById(token, invoiceId);
      setInvoice(data);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to load invoice', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } finally {
      setLoading(false);
    }
  }, [invoiceId, navigation]);

  useFocusEffect(
    useCallback(() => {
      loadInvoice();
    }, [loadInvoice])
  );

  const openInvoiceSettings = () => {
    navigateToPartnerProfile(navigation, {
      expandSection: 'company',
      returnTo: 'ShopInvoiceDetail',
      invoiceId,
    });
  };

  const handleIssue = async () => {
    setIssuing(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const updated = await issueInvoice(token, invoiceId);
      setInvoice(updated);
      setConfirmIssue(false);
      Alert.alert('Issued', `Tax invoice ${updated.number} is ready.`);
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not issue invoice');
    } finally {
      setIssuing(false);
    }
  };

  const handleMarkPaid = async () => {
    setMarkingPaid(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const updated = await markInvoicePaid(token, invoiceId);
      setInvoice(updated);
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not mark invoice paid');
    } finally {
      setMarkingPaid(false);
    }
  };

  if (loading) {
    return (
      <ScreenBackground>
        <ActivityIndicator style={styles.loader} color={COLORS.PRIMARY} />
      </ScreenBackground>
    );
  }

  if (!invoice) return null;

  const isDraft = invoice.status === 'draft';
  const isIssued = invoice.status === 'issued';
  const isUnpaid = invoice.payment_status !== 'paid';
  const missingIssuer =
    !invoice.issuer_address_line1 ||
    (invoice.issuer_vat_registered !== false
      ? !invoice.issuer_vat_number
      : !invoice.issuer_eik_number && !invoice.issuer_vat_number);

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.screenHint}>
          {isDraft
            ? 'Draft / Proforma — preview only until you issue a numbered tax invoice. Offers stay separate commercial estimates.'
            : 'Issued tax invoice — fiscal document with a number. Offers remain commercial estimates, not invoices.'}
        </Text>

        <InvoiceDocumentPreview invoice={invoice} />

        {missingIssuer ? (
          <View style={styles.warningBox}>
            <Text style={styles.warningTitle}>Complete invoice settings on your center profile</Text>
            <Text style={styles.warningText}>
              Add legal company name, VAT / ДДС number, and invoice address under Center details → Invoice
              settings, then save. Issuing stays blocked until these are filled.
            </Text>
            <Button mode="outlined" onPress={openInvoiceSettings}>
              Open invoice settings
            </Button>
          </View>
        ) : null}

        <View style={styles.actions}>
          {isDraft ? (
            <Button
              mode="contained"
              onPress={() => setConfirmIssue(true)}
              loading={issuing}
              disabled={missingIssuer || issuing}
            >
              Issue tax invoice
            </Button>
          ) : null}
          {isIssued && isUnpaid ? (
            <Button mode="contained-tonal" onPress={handleMarkPaid} loading={markingPaid}>
              Mark as paid
            </Button>
          ) : null}
        </View>

        <Text style={styles.helpText}>
          Draft / Proforma → Issue for a numbered tax invoice. Mark paid when the customer pays on pickup;
          your accountant can also reconcile from the export later.
        </Text>
      </ScrollView>

      <ConfirmDialog
        visible={confirmIssue}
        title="Issue tax invoice?"
        message="This assigns a fiscal number and locks supplier/buyer snapshots. The draft stays a proforma until you issue. The client is notified when linked to this repair."
        confirmLabel="Issue"
        loading={issuing}
        icon="file-document-check-outline"
        onCancel={() => !issuing && setConfirmIssue(false)}
        onConfirm={handleIssue}
      />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 14,
  },
  loader: {
    marginTop: 48,
  },
  screenHint: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 13,
    lineHeight: 18,
  },
  warningBox: {
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  warningTitle: {
    fontWeight: '700',
    color: '#fef3c7',
    fontSize: 14,
  },
  warningText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    lineHeight: 18,
  },
  actions: {
    gap: 8,
  },
  helpText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    lineHeight: 17,
  },
});
