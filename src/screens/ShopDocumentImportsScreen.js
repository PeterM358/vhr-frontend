import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { ActivityIndicator, Button, Text } from 'react-native-paper';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import ScreenBackground from '../components/ScreenBackground';
import AppCard from '../components/ui/AppCard';
import AppNavigationBar from '../components/common/AppNavigationBar';
import ErpAccessGate from '../components/erp/ErpAccessGate';
import useShopErpContext from '../hooks/useShopErpContext';
import { usePartnerDashboardBack } from '../navigation/appNavBarBack';
import { listDocumentImports, uploadDocumentImport } from '../api/erp';
import { pickReceiptOrInvoiceAttachment } from '../utils/pickDocumentFile';
import { navigateToPartnerDocumentImportDetail } from '../navigation/webNavigation';
import { showMessage } from '../utils/crossPlatformAlert';
import { useTranslation } from '../i18n';

export default function ShopDocumentImportsScreen() {
  const navigation = useNavigation();
  const onBack = usePartnerDashboardBack(navigation);
  const { t } = useTranslation();
  const { loading, shopProfile, membership, shopId, error, reload } = useShopErpContext();
  const [rows, setRows] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    if (!shopId) return;
    setLoadError('');
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const data = await listDocumentImports(token, shopId);
      setRows(Array.isArray(data) ? data : data.results || []);
    } catch (e) {
      setRows([]);
      setLoadError(e.message || t('erp.common.error'));
    }
  }, [shopId, t]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openDetail = (importId) => {
    if (Platform.OS === 'web') {
      navigateToPartnerDocumentImportDetail(navigation, importId);
      return;
    }
    navigation.navigate('ShopDocumentImportDetail', { importId });
  };

  const handleUpload = async () => {
    if (!shopId) return;
    const picked = await pickReceiptOrInvoiceAttachment();
    if (!picked) return;
    setUploading(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const result = await uploadDocumentImport(token, shopId, picked);
      showMessage(t('erp.documentImports.uploadSuccess'), '', { variant: 'success' });
      await load();
      if (result.import_id) {
        openDetail(result.import_id);
      }
    } catch (e) {
      showMessage(t('erp.common.error'), e.message || '', { variant: 'error' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <ErpAccessGate
      routeName="ShopDocumentImports"
      shopProfile={shopProfile}
      membership={membership}
      loading={loading}
      error={error}
      onBack={onBack}
      title={t('erp.documentImports.title')}
    >
      <ScreenBackground>
        <AppNavigationBar title={t('erp.documentImports.title')} onBack={onBack} />
        <ScrollView contentContainerStyle={styles.content}>
          <Button mode="contained" onPress={handleUpload} loading={uploading} disabled={uploading}>
            {t('erp.common.upload')}
          </Button>
          {loading ? <ActivityIndicator /> : null}
          {loadError ? <Text style={styles.error}>{loadError}</Text> : null}
          {!loading && !rows.length ? <Text>{t('erp.documentImports.empty')}</Text> : null}
          {rows.map((row) => (
            <AppCard key={row.id} onPress={() => openDetail(row.id)}>
              <Text>#{row.id}</Text>
              <Text>{t('erp.documentImports.status')}: {row.confirmation_status}</Text>
              <Text>{t('erp.common.totalMinor')}: {row.total_amount_minor ?? '—'}</Text>
            </AppCard>
          ))}
        </ScrollView>
      </ScreenBackground>
    </ErpAccessGate>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  error: { color: '#b00020' },
});
