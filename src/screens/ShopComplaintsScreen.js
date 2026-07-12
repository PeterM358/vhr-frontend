import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { ActivityIndicator, Button, Text, TextInput } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import ScreenBackground from '../components/ScreenBackground';
import AppCard from '../components/ui/AppCard';
import AppNavigationBar from '../components/common/AppNavigationBar';
import ErpAccessGate from '../components/erp/ErpAccessGate';
import useShopErpContext from '../hooks/useShopErpContext';
import { usePartnerDashboardBack } from '../navigation/appNavBarBack';
import { listShopComplaints, updateShopComplaint } from '../api/erp';
import { complaintStatusLabelKey } from '../utils/shopErpAccess';
import { useTranslation } from '../i18n';

export default function ShopComplaintsScreen() {
  const onBack = usePartnerDashboardBack();
  const { t } = useTranslation();
  const { loading, shopProfile, membership, shopId, error } = useShopErpContext();
  const [rows, setRows] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [notes, setNotes] = useState({});

  const load = useCallback(async () => {
    if (!shopId) return;
    setLoadError('');
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const data = await listShopComplaints(token, shopId);
      setRows(Array.isArray(data) ? data : data.results || []);
    } catch (e) {
      setRows([]);
      setLoadError(e.message || t('erp.common.error'));
    }
  }, [shopId, t]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const resolve = async (complaintId) => {
    const token = await AsyncStorage.getItem('@access_token');
    await updateShopComplaint(token, shopId, complaintId, {
      status: 'resolved',
      resolution_notes: notes[complaintId] || t('erp.complaints.markResolved'),
    });
    load();
  };

  return (
    <ErpAccessGate
      routeName="ShopComplaints"
      shopProfile={shopProfile}
      membership={membership}
      loading={loading}
      error={error}
      onBack={onBack}
      title={t('erp.complaints.title')}
    >
      <ScreenBackground>
        <AppNavigationBar title={t('erp.complaints.title')} onBack={onBack} />
        <ScrollView contentContainerStyle={styles.content}>
          {loading ? <ActivityIndicator /> : null}
          {loadError ? <Text style={styles.error}>{loadError}</Text> : null}
          {!loading && !rows.length ? <Text>{t('erp.common.empty')}</Text> : null}
          {rows.map((row) => (
            <AppCard key={row.id}>
              <Text variant="titleMedium">{row.subject}</Text>
              <Text>{row.description}</Text>
              <Text>
                {t('erp.documentImports.status')}: {t(complaintStatusLabelKey(row.status))}
              </Text>
              {row.status !== 'resolved' ? (
                <>
                  <TextInput
                    label={t('erp.complaints.resolutionNotes')}
                    value={notes[row.id] || ''}
                    onChangeText={(value) => setNotes((prev) => ({ ...prev, [row.id]: value }))}
                  />
                  <Button mode="outlined" onPress={() => resolve(row.id)}>
                    {t('erp.complaints.markResolved')}
                  </Button>
                </>
              ) : null}
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
