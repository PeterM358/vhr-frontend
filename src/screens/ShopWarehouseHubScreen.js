import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';

import ScreenBackground from '../components/ScreenBackground';
import ProTabBar from '../components/ui/ProTabBar';
import ShopWarehouseReceiveScreen from './ShopWarehouseReceiveScreen';
import ShopWarehouseDocumentsPanel from '../components/warehouse/ShopWarehouseDocumentsPanel';
import ShopWarehouseStockPanel from '../components/warehouse/ShopWarehouseStockPanel';
import { useTranslation } from '../i18n';

export default function ShopWarehouseHubScreen({ navigation }) {
  const { t } = useTranslation();
  const hubTabs = [
    { value: 'add', label: t('partnerDashboard.warehouse.addDocument'), icon: 'plus' },
    { value: 'documents', label: t('partnerDashboard.warehouse.documents'), icon: 'file-document-multiple-outline' },
    { value: 'stock', label: t('partnerDashboard.warehouse.stock'), icon: 'warehouse' },
  ];
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

  const onTabChange = (value) => {
    if (value === 'add' && !resumeBatchId) {
      setAddResetKey((k) => k + 1);
    }
    setTab(value);
  };

  return (
    <ScreenBackground>
      <View style={styles.tabsOnly}>
        <ProTabBar tabs={hubTabs} value={tab} onChange={onTabChange} />
      </View>

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
  tabsOnly: { paddingTop: 4 },
  body: { flex: 1, minHeight: 0 },
});
