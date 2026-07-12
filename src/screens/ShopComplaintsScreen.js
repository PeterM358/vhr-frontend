import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Text } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import ScreenBackground from '../components/ScreenBackground';
import AppCard from '../components/ui/AppCard';
import AppNavigationBar from '../components/common/AppNavigationBar';
import { usePartnerDashboardBack } from '../navigation/appNavBarBack';
import { listShopComplaints, updateShopComplaint } from '../api/erp';
import { getMyShopProfiles } from '../api/profiles';

export default function ShopComplaintsScreen() {
  const onBack = usePartnerDashboardBack();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [shopId, setShopId] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const shops = await getMyShopProfiles(token);
      const id = shops?.[0]?.id;
      if (!id) throw new Error('No service center selected');
      setShopId(id);
      const data = await listShopComplaints(token, id);
      setRows(Array.isArray(data) ? data : data.results || []);
    } catch (e) {
      setError(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const resolve = async (complaintId) => {
    const token = await AsyncStorage.getItem('@access_token');
    await updateShopComplaint(token, shopId, complaintId, {
      status: 'resolved',
      resolution_notes: 'Resolved from shop console',
    });
    load();
  };

  return (
    <ScreenBackground>
      <AppNavigationBar title="Complaints" onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? <ActivityIndicator /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {rows.map((row) => (
          <AppCard key={row.id}>
            <Text variant="titleMedium">{row.subject}</Text>
            <Text>{row.description}</Text>
            <Text>Status: {row.status}</Text>
            {row.status !== 'resolved' ? (
              <Button mode="outlined" onPress={() => resolve(row.id)}>Mark resolved</Button>
            ) : null}
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
