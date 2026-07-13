import React, { useCallback, useMemo, useState } from 'react';
import { Image, Linking, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Text, TextInput } from 'react-native-paper';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import ScreenBackground from '../components/ScreenBackground';
import AppCard from '../components/ui/AppCard';
import AppNavigationBar from '../components/common/AppNavigationBar';
import ErpAccessGate from '../components/erp/ErpAccessGate';
import useShopErpContext from '../hooks/useShopErpContext';
import { usePartnerDashboardBack } from '../navigation/appNavBarBack';
import {
  confirmDocumentImport,
  getDocumentImportLines,
  listDocumentImports,
} from '../api/erp';
import { showMessage } from '../utils/crossPlatformAlert';
import { useTranslation } from '../i18n';

export default function ShopDocumentImportDetailScreen() {
  const route = useRoute();
  const importId = Number(route.params?.importId);
  const onBack = usePartnerDashboardBack();
  const { t } = useTranslation();
  const { loading, shopProfile, membership, shopId, error } = useShopErpContext();
  const [row, setRow] = useState(null);
  const [lines, setLines] = useState([]);
  const [supplierName, setSupplierName] = useState('');
  const [documentDate, setDocumentDate] = useState('');
  const [totalMinor, setTotalMinor] = useState('');
  const [repairId, setRepairId] = useState('');
  const [loadError, setLoadError] = useState('');
  const [confirming, setConfirming] = useState(false);

  const load = useCallback(async () => {
    if (!shopId || !importId) return;
    setLoadError('');
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const [listData, lineData] = await Promise.all([
        listDocumentImports(token, shopId),
        getDocumentImportLines(token, shopId, importId).catch(() => []),
      ]);
      const rows = Array.isArray(listData) ? listData : listData.results || [];
      const found = rows.find((item) => Number(item.id) === importId) || null;
      setRow(found);
      setLines(Array.isArray(lineData) ? lineData : []);
      const normalized = found?.normalized_fields || found?.raw_extraction || {};
      setSupplierName(String(normalized.supplier_name || ''));
      setDocumentDate(String(normalized.document_date || ''));
      setTotalMinor(
        normalized.total_amount_minor != null
          ? String(normalized.total_amount_minor)
          : found?.total_amount_minor != null
            ? String(found.total_amount_minor)
            : ''
      );
      setRepairId(found?.repair_id != null ? String(found.repair_id) : '');
    } catch (e) {
      setRow(null);
      setLoadError(e.message || t('erp.common.error'));
    }
  }, [importId, shopId, t]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const previewUri = row?.file_url || null;
  const isImage = useMemo(
    () => previewUri && /\.(png|jpe?g|gif|webp)(\?|$)/i.test(previewUri),
    [previewUri]
  );

  const handleConfirm = async (totalOnly = false) => {
    if (!shopId || !importId) return;
    setConfirming(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const fields = {
        supplier_name: supplierName.trim(),
        document_date: documentDate.trim(),
      };
      if (totalMinor.trim()) {
        fields.total_amount_minor = Number(totalMinor);
      }
      if (!totalOnly && repairId.trim()) {
        fields.repair_id = Number(repairId);
      }
      await confirmDocumentImport(token, shopId, importId, fields);
      showMessage(t('erp.documentImports.confirmSuccess'), '', { variant: 'success' });
      await load();
    } catch (e) {
      showMessage(t('erp.common.error'), e.message || '', { variant: 'error' });
    } finally {
      setConfirming(false);
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
      title={t('erp.documentImports.detailTitle')}
    >
      <ScreenBackground>
        <AppNavigationBar title={t('erp.documentImports.detailTitle')} onBack={onBack} />
        <ScrollView contentContainerStyle={styles.content}>
          {loading ? <ActivityIndicator /> : null}
          {loadError ? <Text style={styles.error}>{loadError}</Text> : null}
          {row ? (
            <>
              <AppCard>
                <Text>{t('erp.documentImports.status')}: {row.confirmation_status}</Text>
                <Text>{t('erp.common.provenance')}: {row.raw_extraction?.data_provenance || 'imported'}</Text>
                {previewUri ? (
                  <View style={styles.previewWrap}>
                    {isImage ? (
                      <Image source={{ uri: previewUri }} style={styles.previewImage} resizeMode="contain" />
                    ) : (
                      <Button mode="outlined" onPress={() => Linking.openURL(previewUri)}>
                        {Platform.OS === 'web' ? t('erp.documentImports.detailTitle') : 'Open document'}
                      </Button>
                    )}
                  </View>
                ) : null}
              </AppCard>

              <Text variant="titleMedium">{t('erp.documentImports.manualCorrection')}</Text>
              <TextInput label={t('erp.common.supplier')} value={supplierName} onChangeText={setSupplierName} />
              <TextInput label={t('erp.common.documentDate')} value={documentDate} onChangeText={setDocumentDate} />
              <TextInput
                label={t('erp.common.totalMinor')}
                value={totalMinor}
                onChangeText={setTotalMinor}
                keyboardType="numeric"
              />
              <TextInput
                label={t('erp.common.linkRepair')}
                value={repairId}
                onChangeText={setRepairId}
                keyboardType="numeric"
              />

              <Text variant="titleMedium">{t('erp.documentImports.lines')}</Text>
              {!lines.length ? <Text>{t('erp.common.noLinesExtracted')}</Text> : null}
              {lines.map((line) => (
                <AppCard key={line.id}>
                  <Text>{line.description || '—'}</Text>
                  <Text>Qty: {line.quantity ?? '—'} · {line.line_total_minor ?? '—'}</Text>
                  <Text>{t('erp.common.provenance')}: {line.data_provenance || 'extracted'}</Text>
                </AppCard>
              ))}

              <Button mode="contained" onPress={() => handleConfirm(false)} loading={confirming}>
                {t('erp.common.confirm')}
              </Button>
              <Button mode="outlined" onPress={() => handleConfirm(true)} disabled={confirming}>
                {t('erp.common.totalOnly')}
              </Button>
            </>
          ) : null}
        </ScrollView>
      </ScreenBackground>
    </ErpAccessGate>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  error: { color: '#b00020' },
  previewWrap: { marginTop: 12 },
  previewImage: { width: '100%', height: 220, borderRadius: 8, backgroundColor: '#f1f5f9' },
});
