import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import ScreenBackground from '../components/ScreenBackground';
import AppCard from '../components/ui/AppCard';
import AppNavigationBar from '../components/common/AppNavigationBar';
import { usePartnerDashboardBack } from '../navigation/appNavBarBack';
import { getOwnerAnalyticsSummary } from '../api/erp';
import { getMyShopProfiles } from '../api/profiles';

export default function ShopAnalyticsScreen() {
  const onBack = usePartnerDashboardBack();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const shops = await getMyShopProfiles(token);
      const shopId = shops?.[0]?.id;
      if (!shopId) throw new Error('No service center selected');
      const data = await getOwnerAnalyticsSummary(token, shopId);
      setSummary(data);
    } catch (e) {
      setError(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <ScreenBackground>
      <AppNavigationBar title="Analytics" onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? <ActivityIndicator /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {summary ? (
          <AppCard>
            <Text>Completed repairs: {summary.completed_repairs}</Text>
            <Text>Labor entries: {summary.labor?.entry_count}</Text>
            <Text>Billable hours: {summary.labor?.billable_hours}</Text>
            <Text>Header revenue (minor): {summary.revenue?.header_total_sales_minor}</Text>
          </AppCard>
        ) : null}
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  error: { color: '#b00020' },
});
