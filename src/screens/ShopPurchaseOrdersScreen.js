import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { ActivityIndicator, Button, Text } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import ScreenBackground from '../components/ScreenBackground';
import AppCard from '../components/ui/AppCard';
import AppNavigationBar from '../components/common/AppNavigationBar';
import ErpAccessGate from '../components/erp/ErpAccessGate';
import useShopErpContext from '../hooks/useShopErpContext';
import { usePartnerDashboardBack } from '../navigation/appNavBarBack';
import { listPurchaseOrders } from '../api/erp';
import { useTranslation } from '../i18n';

const STATUS_KEYS = {
  draft: 'erp.procurement.status.draft',
  approved: 'erp.procurement.status.approved',
  sent: 'erp.procurement.status.sent',
  acknowledged: 'erp.procurement.status.acknowledged',
  partially_received: 'erp.procurement.status.partiallyReceived',
  fully_received: 'erp.procurement.status.fullyReceived',
  cancelled: 'erp.procurement.status.cancelled',
  closed: 'erp.procurement.status.closed',
};

export default function ShopPurchaseOrdersScreen({ navigation }) {
  const onBack = usePartnerDashboardBack();
  const { t } = useTranslation();
  const { loading, shopProfile, membership, shopId, error } = useShopErpContext();
  const [rows, setRows] = useState([]);
  const [loadError, setLoadError] = useState('');

  const load = useCallback(async () => {
    if (!shopId) return;
    setLoadError('');
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const data = await listPurchaseOrders(token);
      setRows(Array.isArray(data) ? data : data.results || []);
    } catch (e) {
      setRows([]);
      setLoadError(e.message || t('erp.common.error'));
    }
  }, [shopId, t]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <ErpAccessGate
      routeName="ShopPurchaseOrders"
      shopProfile={shopProfile}
      membership={membership}
      loading={loading}
      error={error}
      onBack={onBack}
      title={t('erp.procurement.purchaseOrders')}
    >
      <ScreenBackground>
        <AppNavigationBar title={t('erp.procurement.purchaseOrders')} onBack={onBack} />
        <ScrollView contentContainerStyle={styles.content}>
          <Button
            mode="contained"
            style={styles.bigButton}
            onPress={() => navigation.navigate('ShopPurchaseOrderDetail', { poId: null })}
          >
            {t('erp.procurement.createPo')}
          </Button>
          <Button
            mode="outlined"
            style={styles.bigButton}
            onPress={() => navigation.navigate('ShopGoodsReceipt')}
          >
            {t('erp.procurement.goodsReceipt')}
          </Button>
          {loading ? <ActivityIndicator /> : null}
          {loadError ? <Text style={styles.error}>{loadError}</Text> : null}
          {!loading && !rows.length ? <Text>{t('erp.common.empty')}</Text> : null}
          {rows.map((row) => (
            <AppCard key={row.id} onPress={() => navigation.navigate('ShopPurchaseOrderDetail', { poId: row.id })}>
              <Text variant="titleMedium">{row.po_number}</Text>
              <Text>{row.supplier_name}</Text>
              <Text>
                {t('erp.common.lifecycleStatus')}: {t(STATUS_KEYS[row.status] || 'erp.procurement.status.unknown')}
              </Text>
            </AppCard>
          ))}
        </ScrollView>
      </ScreenBackground>
    </ErpAccessGate>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  bigButton: { minHeight: 52, justifyContent: 'center' },
  error: { color: '#b00020' },
});
