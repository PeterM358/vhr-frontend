import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import ScreenBackground from '../components/ScreenBackground';
import AppCard from '../components/ui/AppCard';
import AppNavigationBar from '../components/common/AppNavigationBar';
import { usePartnerDashboardBack } from '../navigation/appNavBarBack';
import { listShopDepartments, listShopEmployees } from '../api/erp';
import { getMyShopProfiles } from '../api/profiles';

export default function ShopWorkforceScreen() {
  const onBack = usePartnerDashboardBack();
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const shops = await getMyShopProfiles(token);
      const shopId = shops?.[0]?.id;
      if (!shopId) throw new Error('No service center selected');
      const [emp, dept] = await Promise.all([
        listShopEmployees(token, shopId),
        listShopDepartments(token, shopId),
      ]);
      setEmployees(Array.isArray(emp) ? emp : emp.results || []);
      setDepartments(Array.isArray(dept) ? dept : dept.results || []);
    } catch (e) {
      setError(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <ScreenBackground>
      <AppNavigationBar title="Workforce" onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? <ActivityIndicator /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Text variant="titleMedium">Departments</Text>
        {departments.map((d) => (
          <AppCard key={d.id}><Text>{d.code} — {d.name}</Text></AppCard>
        ))}
        <Text variant="titleMedium">Employees</Text>
        {employees.map((e) => (
          <AppCard key={e.id}>
            <Text>{e.display_name}</Text>
            <Text>Billable rate (minor): {e.default_customer_billable_rate_minor ?? '—'}</Text>
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
