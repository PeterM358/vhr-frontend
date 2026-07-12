import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import ScreenBackground from '../components/ScreenBackground';
import AppCard from '../components/ui/AppCard';
import AppNavigationBar from '../components/common/AppNavigationBar';
import { usePartnerDashboardBack } from '../navigation/appNavBarBack';
import { listDocumentImports } from '../api/erp';
import { getMyShopProfiles } from '../api/profiles';

export default function ShopDocumentImportsScreen() {
  const onBack = usePartnerDashboardBack();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const shops = await getMyShopProfiles(token);
      const shopId = shops?.[0]?.id;
      if (!shopId) throw new Error('No service center selected');
      const data = await listDocumentImports(token, shopId);
      setRows(Array.isArray(data) ? data : data.results || []);
    } catch (e) {
      setError(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <ScreenBackground>
      <AppNavigationBar title="Document imports" onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? <ActivityIndicator /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {!loading && !rows.length ? <Text>No imports yet. Upload via API or accountant workspace.</Text> : null}
        {rows.map((row) => (
          <AppCard key={row.id}>
            <Text>Import #{row.id}</Text>
            <Text>Status: {row.confirmation_status}</Text>
            <Text>Total (minor): {row.total_amount_minor ?? '—'}</Text>
          </AppCard>
        ))}
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  error: { color: '#b00020' },
});
