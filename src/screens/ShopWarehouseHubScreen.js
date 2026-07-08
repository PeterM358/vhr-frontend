import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Appbar } from 'react-native-paper';

import ScreenBackground from '../components/ScreenBackground';
import ProTabBar from '../components/ui/ProTabBar';
import ShopWarehouseReceiveScreen from './ShopWarehouseReceiveScreen';
import ShopWarehouseDocumentsPanel from '../components/warehouse/ShopWarehouseDocumentsPanel';
import ShopWarehouseStockPanel from '../components/warehouse/ShopWarehouseStockPanel';
import { useTranslation } from '../i18n';

const SHOP_TOP_BAR = 'rgba(11,18,32,0.92)';

export default function ShopWarehouseHubScreen({ navigation }) {
  const { t } = useTranslation();
  const hubTabs = [
    { value: 'add', label: t('partnerDashboard.warehouse.addDocument'), icon: 'plus' },
    { value: 'documents', label: t('partnerDashboard.warehouse.documents'), icon: 'file-document-multiple-outline' },
    { value: 'stock', label: t('partnerDashboard.warehouse.stock'), icon: 'warehouse' },
  ];
  const insets = useSafeAreaInsets();
  const inDrawer = typeof navigation.openDrawer === 'function';
  const [tab, setTab] = useState('add');
  const [resumeBatchId, setResumeBatchId] = useState(null);
  const [addResetKey, setAddResetKey] = useState(0);

  const openDraft = (batchId) => {
    setResumeBatchId(batchId);
    setTab('add');
  };

  const handleCommitted = () => {
    setResumeBatchId(null);
    setTab('documents');
  };

  return (
    <ScreenBackground>
      {inDrawer ? (
        <View style={styles.headerBlock}>
          <Appbar.Header style={{ backgroundColor: SHOP_TOP_BAR, paddingTop: insets.top, elevation: 0 }}>
            <Appbar.Action
              icon="chevron-left"
              color="#fff"
              onPress={() => navigation.navigate('ShopDashboard')}
            />
            <Appbar.Action icon="menu" onPress={() => navigation.openDrawer()} color="#fff" />
            <Appbar.Content title={t('drawer.partner.warehouse')} titleStyle={{ color: '#fff' }} />
          </Appbar.Header>
          <ProTabBar
            tabs={hubTabs}
            value={tab}
            onChange={(value) => {
              if (value === 'add' && !resumeBatchId) {
                setAddResetKey((k) => k + 1);
              }
              setTab(value);
            }}
          />
        </View>
      ) : (
        <View style={styles.tabsOnly}>
          <ProTabBar
            tabs={hubTabs}
            value={tab}
            onChange={(value) => {
              if (value === 'add' && !resumeBatchId) {
                setAddResetKey((k) => k + 1);
              }
              setTab(value);
            }}
          />
        </View>
      )}

      <View style={styles.body}>
        {tab === 'add' ? (
          <ShopWarehouseReceiveScreen
            key={resumeBatchId ?? `add-${addResetKey}`}
            navigation={navigation}
            embedded
            resumeBatchId={resumeBatchId}
            onCommitted={handleCommitted}
            onResumeConsumed={() => setResumeBatchId(null)}
          />
        ) : tab === 'documents' ? (
          <ShopWarehouseDocumentsPanel onEditDraft={openDraft} />
        ) : (
          <ShopWarehouseStockPanel />
        )}
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  headerBlock: { backgroundColor: SHOP_TOP_BAR },
  tabsOnly: { paddingTop: 4 },
  body: { flex: 1, minHeight: 0 },
});
