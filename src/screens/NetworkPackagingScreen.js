import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { ActivityIndicator, Button, Text, TextInput } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import ScreenBackground from '../components/ScreenBackground';
import AppCard from '../components/ui/AppCard';
import AppNavigationBar from '../components/common/AppNavigationBar';
import { createPackaging, listPackaging } from '../api/network';
import { useTranslation } from '../i18n';

export default function NetworkPackagingScreen({ navigation }) {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [shopPartId, setShopPartId] = useState('');
  const [packageUomId, setPackageUomId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [supplierSku, setSupplierSku] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!shopPartId) return;
    setLoading(true);
    setError('');
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const data = await listPackaging(token, shopPartId);
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setRows([]);
      setError(e.message || t('network.common.error'));
    } finally {
      setLoading(false);
    }
  }, [shopPartId, t]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const create = async () => {
    try {
      const token = await AsyncStorage.getItem('@access_token');
      await createPackaging(token, {
        shop_part_id: Number(shopPartId),
        package_uom_id: Number(packageUomId),
        quantity_in_base_uom: quantity,
        supplier_sku: supplierSku,
      });
      await load();
    } catch (e) {
      setError(e.message || t('network.common.error'));
    }
  };

  return (
    <ScreenBackground>
      <AppNavigationBar title={t('network.packaging.title')} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <TextInput label={t('network.packaging.shopPartId')} value={shopPartId} onChangeText={setShopPartId} mode="outlined" keyboardType="numeric" />
        <TextInput label={t('network.packaging.packageUomId')} value={packageUomId} onChangeText={setPackageUomId} mode="outlined" keyboardType="numeric" />
        <TextInput label={t('network.packaging.quantity')} value={quantity} onChangeText={setQuantity} mode="outlined" />
        <TextInput label={t('network.packaging.supplierSku')} value={supplierSku} onChangeText={setSupplierSku} mode="outlined" />
        <Button mode="contained" onPress={create}>{t('network.packaging.create')}</Button>
        <Button mode="outlined" onPress={load}>{t('network.common.refresh')}</Button>
        {loading ? <ActivityIndicator /> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {rows.map((row) => (
          <AppCard key={row.id}>
            <Text variant="titleMedium">{row.supplier_sku || `#${row.id}`}</Text>
            <Text>{t('network.packaging.version')}: {row.version}</Text>
            <Text>{row.quantity_in_base_uom}</Text>
            {row.is_locked ? <Text>{t('network.packaging.locked')}</Text> : null}
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
