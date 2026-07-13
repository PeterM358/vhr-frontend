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
import { listShopDepartments, listShopEmployees } from '../api/erp';
import { useTranslation } from '../i18n';

export default function ShopWorkforceScreen() {
  const onBack = usePartnerDashboardBack();
  const { t } = useTranslation();
  const { loading, shopProfile, membership, shopId, error } = useShopErpContext();
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loadError, setLoadError] = useState('');

  const load = useCallback(async () => {
    if (!shopId) return;
    setLoadError('');
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const [emp, dept] = await Promise.all([
        listShopEmployees(token, shopId),
        listShopDepartments(token, shopId),
      ]);
      setEmployees(Array.isArray(emp) ? emp : emp.results || []);
      setDepartments(Array.isArray(dept) ? dept : dept.results || []);
    } catch (e) {
      setEmployees([]);
      setDepartments([]);
      setLoadError(e.message || t('erp.common.error'));
    }
  }, [shopId, t]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <ErpAccessGate
      routeName="ShopWorkforce"
      shopProfile={shopProfile}
      membership={membership}
      loading={loading}
      error={error}
      onBack={onBack}
      title={t('erp.workforce.title')}
    >
      <ScreenBackground>
        <AppNavigationBar title={t('erp.workforce.title')} onBack={onBack} />
        <ScrollView contentContainerStyle={styles.content}>
          {loading ? <ActivityIndicator /> : null}
          {loadError ? <Text style={styles.error}>{loadError}</Text> : null}
          <Text variant="titleMedium">{t('erp.workforce.departments')}</Text>
          {!departments.length ? <Text>{t('erp.common.empty')}</Text> : null}
          {departments.map((d) => (
            <AppCard key={d.id}><Text>{d.code} — {d.name}</Text></AppCard>
          ))}
          <Text variant="titleMedium">{t('erp.workforce.employees')}</Text>
          {!employees.length ? <Text>{t('erp.common.empty')}</Text> : null}
          {employees.map((e) => (
            <AppCard key={e.id}>
              <Text>{e.display_name}</Text>
              <Text>{t('erp.workforce.billableRate')}: {e.default_customer_billable_rate_minor ?? '—'}</Text>
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
