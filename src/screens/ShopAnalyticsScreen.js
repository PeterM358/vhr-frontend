import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import ScreenBackground from '../components/ScreenBackground';
import AppCard from '../components/ui/AppCard';
import AppNavigationBar from '../components/common/AppNavigationBar';
import ErpAccessGate from '../components/erp/ErpAccessGate';
import useShopErpContext from '../hooks/useShopErpContext';
import { usePartnerDashboardBack } from '../navigation/appNavBarBack';
import { getOwnerAnalyticsSummary } from '../api/erp';
import { useTranslation } from '../i18n';

export default function ShopAnalyticsScreen() {
  const onBack = usePartnerDashboardBack();
  const { t } = useTranslation();
  const { loading, shopProfile, membership, shopId, error } = useShopErpContext();
  const [summary, setSummary] = useState(null);
  const [loadError, setLoadError] = useState('');

  const load = useCallback(async () => {
    if (!shopId) return;
    setLoadError('');
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const data = await getOwnerAnalyticsSummary(token, shopId);
      setSummary(data);
    } catch (e) {
      setSummary(null);
      setLoadError(e.message || t('erp.common.error'));
    }
  }, [shopId, t]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <ErpAccessGate
      routeName="ShopAnalytics"
      shopProfile={shopProfile}
      membership={membership}
      loading={loading}
      error={error}
      onBack={onBack}
      title={t('erp.analytics.title')}
    >
      <ScreenBackground>
        <AppNavigationBar title={t('erp.analytics.title')} onBack={onBack} />
        <ScrollView contentContainerStyle={styles.content}>
          {loading ? <ActivityIndicator /> : null}
          {loadError ? <Text style={styles.error}>{loadError}</Text> : null}
          {summary ? (
            <AppCard>
              <Text>{t('erp.analytics.completedRepairs')}: {summary.completed_repairs}</Text>
              <Text>{t('erp.analytics.laborEntries')}: {summary.labor?.entry_count}</Text>
              <Text>{t('erp.analytics.billableHours')}: {summary.labor?.billable_hours}</Text>
              <Text>{t('erp.analytics.headerRevenue')}: {summary.revenue?.header_total_sales_minor}</Text>
            </AppCard>
          ) : null}
          {!loading && !summary && !loadError ? (
            <Text>{t('erp.common.empty')}</Text>
          ) : null}
        </ScrollView>
      </ScreenBackground>
    </ErpAccessGate>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  error: { color: '#b00020' },
});
