import React, { useCallback, useState } from 'react';
import { Linking, Platform, ScrollView, StyleSheet } from 'react-native';
import { ActivityIndicator, Button, Text, TextInput } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import ScreenBackground from '../components/ScreenBackground';
import AppCard from '../components/ui/AppCard';
import AppNavigationBar from '../components/common/AppNavigationBar';
import ErpAccessGate from '../components/erp/ErpAccessGate';
import useShopErpContext from '../hooks/useShopErpContext';
import { usePartnerDashboardBack } from '../navigation/appNavBarBack';
import {
  createStorageLocation,
  listStorageLocations,
  listWarehouses,
  storageLocationLabelUrl,
} from '../api/erp';
import { shopHasPermission } from '../utils/shopErpAccess';
import { useTranslation } from '../i18n';

export default function ShopStorageLocationsScreen() {
  const onBack = usePartnerDashboardBack();
  const { t } = useTranslation();
  const { loading, shopProfile, membership, shopId, error } = useShopErpContext();
  const [warehouses, setWarehouses] = useState([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [locations, setLocations] = useState([]);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [loadError, setLoadError] = useState('');

  const canManage = shopHasPermission(membership, 'manage_storage_locations');

  const load = useCallback(async () => {
    if (!shopId) return;
    setLoadError('');
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const whs = await listWarehouses(token);
      setWarehouses(whs);
      const wh = whs.find((row) => row.is_default) || whs[0];
      const whId = warehouseId || String(wh?.id || '');
      if (!warehouseId && whId) setWarehouseId(whId);
      if (whId) {
        const locs = await listStorageLocations(token, whId);
        setLocations(locs);
      }
    } catch (e) {
      setLoadError(e.message || t('erp.common.error'));
    }
  }, [shopId, warehouseId, t]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const addLocation = async () => {
    try {
      const token = await AsyncStorage.getItem('@access_token');
      await createStorageLocation(token, {
        warehouse_id: Number(warehouseId),
        code,
        name: name || code,
      });
      setCode('');
      setName('');
      load();
    } catch (e) {
      setLoadError(e.message || t('erp.common.error'));
    }
  };

  const printLabel = async (locationId) => {
    const token = await AsyncStorage.getItem('@access_token');
    const url = storageLocationLabelUrl(locationId);
    if (Platform.OS === 'web') {
      window.open(url, '_blank');
      return;
    }
    await Linking.openURL(url);
  };

  return (
    <ErpAccessGate
      routeName="ShopStorageLocations"
      shopProfile={shopProfile}
      membership={membership}
      loading={loading}
      error={error}
      onBack={onBack}
      title={t('erp.procurement.storageLocations')}
    >
      <ScreenBackground>
        <AppNavigationBar title={t('erp.procurement.storageLocations')} onBack={onBack} />
        <ScrollView contentContainerStyle={styles.content}>
          {loading ? <ActivityIndicator /> : null}
          {loadError ? <Text style={styles.error}>{loadError}</Text> : null}
          {canManage ? (
            <AppCard>
              <TextInput label={t('erp.procurement.locationCode')} value={code} onChangeText={setCode} />
              <TextInput label={t('erp.procurement.locationName')} value={name} onChangeText={setName} />
              <Button mode="contained" style={styles.bigButton} onPress={addLocation}>
                {t('erp.procurement.addLocation')}
              </Button>
            </AppCard>
          ) : null}
          {!locations.length ? <Text>{t('erp.common.empty')}</Text> : null}
          {locations.map((row) => (
            <AppCard key={row.id}>
              <Text variant="titleMedium">{row.full_code}</Text>
              <Text>{row.name} · {row.level}</Text>
              <Button mode="outlined" style={styles.bigButton} onPress={() => printLabel(row.id)}>
                {t('erp.procurement.printLabel')}
              </Button>
            </AppCard>
          ))}
        </ScrollView>
      </ScreenBackground>
    </ErpAccessGate>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  bigButton: { minHeight: 52, justifyContent: 'center', marginTop: 8 },
  error: { color: '#b00020' },
});
