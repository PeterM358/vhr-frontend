import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
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
  getPurchaseOrder,
  listWarehouses,
  postGoodsReceipt,
  scanStorageLocation,
} from '../api/erp';
import { useTranslation } from '../i18n';

const STEPS = ['po', 'part', 'qty', 'address', 'finish'];

export default function ShopGoodsReceiptScreen({ navigation, route }) {
  const onBack = () => navigation.goBack();
  const { t } = useTranslation();
  const { loading, shopProfile, membership, shopId, error } = useShopErpContext();
  const [step, setStep] = useState(0);
  const [warehouses, setWarehouses] = useState([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [po, setPo] = useState(null);
  const [poScan, setPoScan] = useState('');
  const [partScan, setPartScan] = useState('');
  const [selectedLine, setSelectedLine] = useState(null);
  const [qty, setQty] = useState('1');
  const [addressScan, setAddressScan] = useState('');
  const [storageLocation, setStorageLocation] = useState(null);
  const [carrier, setCarrier] = useState('');
  const [tracking, setTracking] = useState('');
  const [loadError, setLoadError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const purchaseOrderId = route?.params?.purchaseOrderId;

  const loadWarehouses = useCallback(async () => {
    if (!shopId) return;
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const rows = await listWarehouses(token);
      setWarehouses(rows);
      const defaultWh = rows.find((row) => row.is_default) || rows[0];
      if (defaultWh) setWarehouseId(String(defaultWh.id));
    } catch (e) {
      setLoadError(e.message || t('erp.common.error'));
    }
  }, [shopId, t]);

  const loadPo = useCallback(async (id) => {
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const data = await getPurchaseOrder(token, id);
      setPo(data);
      setStep(1);
    } catch (e) {
      setLoadError(e.message || t('erp.common.error'));
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      loadWarehouses();
      if (purchaseOrderId) loadPo(purchaseOrderId);
    }, [loadWarehouses, loadPo, purchaseOrderId]),
  );

  const resolvePo = async () => {
    setLoadError('');
    const id = Number(poScan || purchaseOrderId);
    if (!Number.isFinite(id)) {
      setLoadError(t('erp.procurement.enterPoId'));
      return;
    }
    await loadPo(id);
  };

  const resolvePart = () => {
    if (!po?.lines?.length) {
      setLoadError(t('erp.procurement.noPoLines'));
      return;
    }
    const line = po.lines.find(
      (row) => String(row.id) === partScan.trim() || String(row.parts_master_id) === partScan.trim(),
    ) || po.lines[0];
    setSelectedLine(line);
    setQty(line.qty_remaining || '1');
    setStep(2);
  };

  const confirmQty = () => {
    if (!qty || Number(qty) <= 0) {
      setLoadError(t('erp.procurement.invalidQty'));
      return;
    }
    setStep(3);
  };

  const resolveAddress = async () => {
    setLoadError('');
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const loc = await scanStorageLocation(token, warehouseId, addressScan);
      setStorageLocation(loc);
      setStep(4);
    } catch (e) {
      setLoadError(e.message || t('erp.procurement.addressNotFound'));
    }
  };

  const finishReceipt = async () => {
    setSubmitting(true);
    setLoadError('');
    try {
      const token = await AsyncStorage.getItem('@access_token');
      await postGoodsReceipt(token, {
        purchase_order_id: po.id,
        warehouse_id: Number(warehouseId),
        carrier,
        tracking_number: tracking,
        lines: [
          {
            shop_part_id: selectedLine.shop_part_id,
            purchase_order_line_id: selectedLine.id,
            qty_received: qty,
            unit_cost_minor: selectedLine.unit_cost_minor,
            storage_location_id: storageLocation?.id,
          },
        ],
      });
      navigation.navigate('ShopPurchaseOrders');
    } catch (e) {
      setLoadError(e.message || t('erp.common.error'));
    } finally {
      setSubmitting(false);
    }
  };

  const currentStep = STEPS[step];

  return (
    <ErpAccessGate
      routeName="ShopGoodsReceipt"
      shopProfile={shopProfile}
      membership={membership}
      loading={loading}
      error={error}
      onBack={onBack}
      title={t('erp.procurement.goodsReceipt')}
    >
      <ScreenBackground>
        <AppNavigationBar title={t('erp.procurement.goodsReceipt')} onBack={onBack} />
        <ScrollView contentContainerStyle={styles.content}>
          <Text>{t('erp.procurement.step')}: {t(`erp.procurement.steps.${currentStep}`)}</Text>
          {loading || submitting ? <ActivityIndicator /> : null}
          {loadError ? <Text style={styles.error}>{loadError}</Text> : null}

          {currentStep === 'po' ? (
            <AppCard>
              <TextInput label={t('erp.procurement.scanPo')} value={poScan} onChangeText={setPoScan} keyboardType="numeric" />
              <Button mode="contained" style={styles.bigButton} onPress={resolvePo}>
                {t('erp.procurement.next')}
              </Button>
            </AppCard>
          ) : null}

          {currentStep === 'part' ? (
            <AppCard>
              <Text>{po?.po_number}</Text>
              <TextInput label={t('erp.procurement.scanPart')} value={partScan} onChangeText={setPartScan} />
              <Button mode="contained" style={styles.bigButton} onPress={resolvePart}>
                {t('erp.procurement.next')}
              </Button>
            </AppCard>
          ) : null}

          {currentStep === 'qty' ? (
            <AppCard>
              <Text>{selectedLine?.parts_master_name}</Text>
              <TextInput label={t('erp.procurement.qtyReceived')} value={qty} onChangeText={setQty} keyboardType="numeric" />
              <Button mode="contained" style={styles.bigButton} onPress={confirmQty}>
                {t('erp.procurement.next')}
              </Button>
            </AppCard>
          ) : null}

          {currentStep === 'address' ? (
            <AppCard>
              <TextInput label={t('erp.procurement.scanAddress')} value={addressScan} onChangeText={setAddressScan} />
              <Button mode="contained" style={styles.bigButton} onPress={resolveAddress}>
                {t('erp.procurement.place')}
              </Button>
            </AppCard>
          ) : null}

          {currentStep === 'finish' ? (
            <AppCard>
              <Text>{storageLocation?.full_code}</Text>
              <TextInput label={t('erp.procurement.carrier')} value={carrier} onChangeText={setCarrier} />
              <TextInput label={t('erp.procurement.tracking')} value={tracking} onChangeText={setTracking} />
              <Button mode="contained" style={styles.bigButton} onPress={finishReceipt}>
                {t('erp.procurement.finishReceipt')}
              </Button>
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
  error: { color: '#b00020' },
});
