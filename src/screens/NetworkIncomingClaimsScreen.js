import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import ScreenBackground from '../components/ScreenBackground';
import AppCard from '../components/ui/AppCard';
import AppNavigationBar from '../components/common/AppNavigationBar';
import { getMyOrganization, listNetworkClaims } from '../api/network';
import { useTranslation } from '../i18n';

export default function NetworkIncomingClaimsScreen({ navigation }) {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const org = await getMyOrganization(token);
      const data = await listNetworkClaims(token, org.id, 'incoming');
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setRows([]);
      setError(e.message || t('network.common.error'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <ScreenBackground>
      <AppNavigationBar title={t('network.claims.incoming')} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? <ActivityIndicator /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {!loading && !rows.length ? <Text>{t('network.common.empty')}</Text> : null}
        {rows.map((row) => (
          <AppCard
            key={row.id}
            onPress={() => navigation.navigate('NetworkClaimDetail', { claimId: row.id, claim: row })}
          >
            <Text variant="titleMedium">{row.hop_payload?.subject || row.id}</Text>
            <Text>{t('network.claims.status')}: {t(`network.claims.statuses.${row.status}`, row.status)}</Text>
            <Text>{t('network.claims.hopRole')}: {t(`network.claims.roles.${row.current_hop_role}`, row.current_hop_role)}</Text>
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
