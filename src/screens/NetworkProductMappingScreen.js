import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { ActivityIndicator, Button, Text, TextInput } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import ScreenBackground from '../components/ScreenBackground';
import AppCard from '../components/ui/AppCard';
import AppNavigationBar from '../components/common/AppNavigationBar';
import { createProductMapping, getMyOrganization, listProductMappings } from '../api/network';
import { useTranslation } from '../i18n';

export default function NetworkProductMappingScreen({ navigation }) {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [sellerSku, setSellerSku] = useState('');
  const [buyerSku, setBuyerSku] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const org = await getMyOrganization(token);
      const data = await listProductMappings(token, org.id);
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setRows([]);
      setError(e.message || t('network.common.error'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const create = async () => {
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const org = await getMyOrganization(token);
      await createProductMapping(token, org.id, { seller_sku: sellerSku, buyer_sku: buyerSku });
      setSellerSku('');
      setBuyerSku('');
      await load();
    } catch (e) {
      setError(e.message || t('network.common.error'));
    }
  };

  return (
    <ScreenBackground>
      <AppNavigationBar title={t('network.mapping.title')} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <TextInput label={t('network.mapping.sellerSku')} value={sellerSku} onChangeText={setSellerSku} mode="outlined" />
        <TextInput label={t('network.mapping.buyerSku')} value={buyerSku} onChangeText={setBuyerSku} mode="outlined" />
        <Button mode="contained" onPress={create}>{t('network.mapping.create')}</Button>
        {loading ? <ActivityIndicator /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {rows.map((row) => (
          <AppCard key={row.id}>
            <Text variant="titleMedium">{row.seller_sku}</Text>
            <Text>{row.buyer_sku || '—'}</Text>
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
