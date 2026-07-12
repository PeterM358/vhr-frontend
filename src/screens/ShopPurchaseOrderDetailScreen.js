import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
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
  createPurchaseOrder,
  getPurchaseOrder,
  purchaseOrderAction,
  updatePurchaseOrder,
} from '../api/erp';
import { shopHasPermission } from '../utils/shopErpAccess';
import { useTranslation } from '../i18n';

export default function ShopPurchaseOrderDetailScreen({ navigation, route }) {
  const poId = route?.params?.poId;
  const isNew = poId == null;
  const onBack = () => navigation.goBack();
  const { t } = useTranslation();
  const { loading, shopProfile, membership, shopId, error } = useShopErpContext();
  const [po, setPo] = useState(null);
  const [poNumber, setPoNumber] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [partMasterId, setPartMasterId] = useState('');
  const [qtyOrdered, setQtyOrdered] = useState('1');
  const [unitCostMinor, setUnitCostMinor] = useState('0');
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);

  const canCreate = shopHasPermission(membership, 'create_purchase_orders');
  const canApprove = shopHasPermission(membership, 'approve_purchase_orders');

  const load = useCallback(async () => {
    if (!shopId || isNew) return;
    setLoadError('');
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const data = await getPurchaseOrder(token, poId);
      setPo(data);
      setPoNumber(data.po_number || '');
      setSupplierId(String(data.supplier_id || ''));
    } catch (e) {
      setLoadError(e.message || t('erp.common.error'));
    }
  }, [shopId, poId, isNew, t]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const saveDraft = async () => {
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const payload = {
        po_number: poNumber,
        supplier_id: Number(supplierId),
        lines: [
          {
            parts_master_id: Number(partMasterId),
            qty_ordered: qtyOrdered,
            unit_cost_minor: Number(unitCostMinor),
          },
        ],
      };
      const data = isNew
        ? await createPurchaseOrder(token, payload)
        : await updatePurchaseOrder(token, poId, payload);
      if (isNew) {
        navigation.replace('ShopPurchaseOrderDetail', { poId: data.id });
      } else {
        setPo(data);
      }
    } catch (e) {
      setLoadError(e.message || t('erp.common.error'));
    } finally {
      setSaving(false);
    }
  };

  const runAction = async (action) => {
    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const data = await purchaseOrderAction(token, po?.id || poId, action);
      setPo(data);
    } catch (e) {
      setLoadError(e.message || t('erp.common.error'));
    } finally {
      setSaving(false);
    }
  };

  const startReceive = () => {
    navigation.navigate('ShopGoodsReceipt', { purchaseOrderId: po?.id || poId });
  };

  return (
    <ErpAccessGate
      routeName="ShopPurchaseOrders"
      shopProfile={shopProfile}
      membership={membership}
      loading={loading}
      error={error}
      onBack={onBack}
      title={isNew ? t('erp.procurement.createPo') : t('erp.procurement.poDetail')}
    >
      <ScreenBackground>
        <AppNavigationBar
          title={isNew ? t('erp.procurement.createPo') : po?.po_number || t('erp.procurement.poDetail')}
          onBack={onBack}
        />
        <ScrollView contentContainerStyle={styles.content}>
          {loading || saving ? <ActivityIndicator /> : null}
          {loadError ? <Text style={styles.error}>{loadError}</Text> : null}

          {(isNew || po?.status === 'draft') && canCreate ? (
            <AppCard>
              <TextInput label={t('erp.procurement.poNumber')} value={poNumber} onChangeText={setPoNumber} />
              <TextInput label={t('erp.common.supplier')} value={supplierId} onChangeText={setSupplierId} keyboardType="numeric" />
              <TextInput label={t('erp.procurement.partMasterId')} value={partMasterId} onChangeText={setPartMasterId} keyboardType="numeric" />
              <TextInput label={t('erp.procurement.qtyOrdered')} value={qtyOrdered} onChangeText={setQtyOrdered} />
              <TextInput label={t('erp.procurement.unitCostMinor')} value={unitCostMinor} onChangeText={setUnitCostMinor} keyboardType="numeric" />
              <Button mode="contained" style={styles.bigButton} onPress={saveDraft}>
                {t('erp.procurement.saveDraft')}
              </Button>
            </AppCard>
          ) : null}

          {po ? (
            <AppCard>
              <Text variant="titleMedium">{po.po_number}</Text>
              <Text>{po.supplier_name}</Text>
              <Text>{t('erp.common.lifecycleStatus')}: {po.status}</Text>
              {(po.lines || []).map((line) => (
                <View key={line.id} style={styles.lineRow}>
                  <Text>{line.parts_master_name || line.part_number}</Text>
                  <Text>
                    {line.qty_received}/{line.qty_ordered} ({t('erp.procurement.remaining')}: {line.qty_remaining})
                  </Text>
                </View>
              ))}
              {po.status === 'draft' && canApprove ? (
                <Button mode="contained" style={styles.bigButton} onPress={() => runAction('approve')}>
                  {t('erp.procurement.approve')}
                </Button>
              ) : null}
              {po.status === 'approved' && canApprove ? (
                <Button mode="contained" style={styles.bigButton} onPress={() => runAction('sent')}>
                  {t('erp.procurement.markSent')}
                </Button>
              ) : null}
              {['sent', 'acknowledged', 'partially_received'].includes(po.status) ? (
                <>
                  {po.status === 'sent' && canApprove ? (
                    <Button mode="outlined" style={styles.bigButton} onPress={() => runAction('acknowledge')}>
                      {t('erp.procurement.acknowledge')}
                    </Button>
                  ) : null}
                  <Button mode="contained" style={styles.bigButton} onPress={startReceive}>
                    {t('erp.procurement.receiveAgainstPo')}
                  </Button>
                </>
              ) : null}
              {['partially_received', 'fully_received'].includes(po.status) && canApprove ? (
                <Button mode="outlined" style={styles.bigButton} onPress={() => runAction('close')}>
                  {t('erp.procurement.closePo')}
                </Button>
              ) : null}
            </AppCard>
          ) : null}
        </ScrollView>
      </ScreenBackground>
    </ErpAccessGate>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },
  bigButton: { minHeight: 52, justifyContent: 'center', marginTop: 8 },
  lineRow: { marginTop: 8 },
  error: { color: '#b00020' },
});
