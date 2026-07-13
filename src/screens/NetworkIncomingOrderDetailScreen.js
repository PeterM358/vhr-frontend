import React, { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Button, Text } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';

import ScreenBackground from '../components/ScreenBackground';
import AppCard from '../components/ui/AppCard';
import AppNavigationBar from '../components/common/AppNavigationBar';
import { getMyOrganization, incomingOrderAction } from '../api/network';
import { useTranslation } from '../i18n';

export default function NetworkIncomingOrderDetailScreen({ navigation, route }) {
  const { t } = useTranslation();
  const order = route.params?.order || {};
  const [error, setError] = useState('');
  const [status, setStatus] = useState(order.acknowledgment_status);

  const act = async (action, partial = false) => {
    setError('');
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const org = await getMyOrganization(token);
      const result = await incomingOrderAction(token, org.id, route.params.documentId, action, { partial });
      setStatus(result.acknowledgment_status);
    } catch (e) {
      setError(e.message || t('network.common.error'));
    }
  };

  return (
    <ScreenBackground>
      <AppNavigationBar title={t('network.incomingOrders.detailTitle')} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <AppCard>
          <Text variant="titleMedium">{order.document_number}</Text>
          <Text>{order.sender_organization_name}</Text>
          <Text>{t('network.incomingOrders.status')}: {status}</Text>
          {(order.traceability_summaries || []).map((summary, idx) => (
            <Text key={`trace-${idx}`} style={styles.traceability}>
              {summary.summary_label || t('network.incomingOrders.traceabilityPending')}
              {summary.country_of_origin ? ` (${summary.country_of_origin})` : ''}
            </Text>
          ))}
        </AppCard>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button mode="contained" onPress={() => act('acknowledge')}>{t('network.incomingOrders.acknowledge')}</Button>
        <Button mode="outlined" onPress={() => act('acknowledge', true)}>{t('network.incomingOrders.partialAck')}</Button>
        <Button mode="outlined" onPress={() => act('reject')}>{t('network.incomingOrders.reject')}</Button>
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  error: { color: '#b00020' },
  traceability: { marginTop: 8, color: '#444' },
});
