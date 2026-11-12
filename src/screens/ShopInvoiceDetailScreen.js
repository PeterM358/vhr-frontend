import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, Button, Text } from 'react-native-paper';

import ScreenBackground from '../components/ScreenBackground';
import PartnerAppHeader from '../components/partner/PartnerAppHeader';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import InvoiceDocumentPreview from '../components/shop/InvoiceDocumentPreview';
import { COLORS } from '../constants/colors';
import { getInvoiceById, issueInvoice, markInvoicePaid } from '../api/billing';
import { navigateToPartnerProfile } from '../navigation/webNavigation';
import { useScrollShadow } from '../hooks/useScrollShadow';
import { useTranslation } from '../i18n';

export default function ShopInvoiceDetailScreen() {
  const { t } = useTranslation();
  const route = useRoute();
  const navigation = useNavigation();
  const invoiceId = route.params?.invoiceId;
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);
  const [confirmIssue, setConfirmIssue] = useState(false);
  const { scrolled, onScroll, scrollEventThrottle } = useScrollShadow();

  const loadInvoice = useCallback(async () => {
    if (!invoiceId) return;
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const data = await getInvoiceById(token, invoiceId);
      setInvoice(data);
    } catch (err) {
      Alert.alert(t('common.error'), err.message || t('partnerDashboard.invoiceDetail.loadError'), [
        { text: t('common.ok'), onPress: () => navigation.goBack() },
      ]);
    } finally {
      setLoading(false);
    }
  }, [invoiceId, navigation, t]);

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
      Alert.alert(
        t('partnerDashboard.invoiceDetail.issuedSuccessTitle'),
        t('partnerDashboard.invoiceDetail.issuedSuccessBody', { number: updated.number })
      );
    } catch (err) {
      Alert.alert(t('common.error'), err.message || t('partnerDashboard.invoiceDetail.issueError'));
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
      Alert.alert(
        t('common.error'),
        err.message || t('partnerDashboard.invoiceDetail.markPaidError')
      );
    } finally {
      setMarkingPaid(false);
    }
  };

  if (loading) {
    return (
      <ScreenBackground safeArea={false}>
        <PartnerAppHeader
          title={t('partnerDashboard.invoiceDetail.title')}
          onBack={() => navigation.goBack()}
          iconOnlyBack
        />
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
    <ScreenBackground safeArea={false}>
      <PartnerAppHeader
        title={t('partnerDashboard.invoiceDetail.title')}
        onBack={() => navigation.goBack()}
        iconOnlyBack
        scrolled={scrolled}
      />
      <ScrollView
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        contentContainerStyle={styles.content}
      >
        <View style={styles.hintCard}>
          <Text style={styles.screenHint}>
            {isDraft
              ? t('partnerDashboard.invoiceDetail.draftHint')
              : t('partnerDashboard.invoiceDetail.issuedHint')}
          </Text>
        </View>

        <InvoiceDocumentPreview invoice={invoice} />

        {missingIssuer ? (
          <View style={styles.warningBox}>
            <Text style={styles.warningTitle}>
              {t('partnerDashboard.invoiceDetail.missingIssuerTitle')}
            </Text>
            <Text style={styles.warningText}>
              {t('partnerDashboard.invoiceDetail.missingIssuerBody')}
            </Text>
            <Button mode="outlined" onPress={openInvoiceSettings}>
              {t('partnerDashboard.invoiceDetail.openInvoiceSettings')}
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
              {t('partnerDashboard.invoiceDetail.issueTaxInvoice')}
            </Button>
          ) : null}
          {isIssued && isUnpaid ? (
            <Button mode="contained-tonal" onPress={handleMarkPaid} loading={markingPaid}>
              {t('partnerDashboard.invoiceDetail.markAsPaid')}
            </Button>
          ) : null}
        </View>

        <Text style={styles.helpText}>{t('partnerDashboard.invoiceDetail.helpText')}</Text>
      </ScrollView>

      <ConfirmDialog
        visible={confirmIssue}
        title={t('partnerDashboard.invoiceDetail.confirmIssueTitle')}
        message={t('partnerDashboard.invoiceDetail.confirmIssueBody')}
        confirmLabel={t('partnerDashboard.invoiceDetail.confirmIssue')}
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
  hintCard: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  screenHint: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    lineHeight: 19,
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
