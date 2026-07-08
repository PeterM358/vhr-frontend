/**
 * Cross-vehicle completed service / repair history.
 */

import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator } from 'react-native-paper';
import { getRepairs } from '../api/repairs';
import ScreenBackground from '../components/ScreenBackground';
import AppNavigationBar from '../components/common/AppNavigationBar';
import ServiceHistorySummaryCard from '../components/repair/ServiceHistorySummaryCard';
import EmptyStateCard from '../components/ui/EmptyStateCard';
import { useScrollShadow } from '../hooks/useScrollShadow';
import { useClientDashboardBack } from '../navigation/appNavBarBack';
import { useTranslation } from '../i18n';

export default function ClientServiceHistoryScreen({ navigation }) {
  const { t } = useTranslation();
  const { scrolled, onScroll, scrollEventThrottle } = useScrollShadow();
  const handleBack = useClientDashboardBack(navigation);
  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const screenTitle = t('repairs.serviceHistoryTitle');

  useEffect(() => {
    const fetchDone = async () => {
      setLoading(true);
      try {
        const token = await AsyncStorage.getItem('@access_token');
        const data = await getRepairs(token, 'done');
        setRepairs(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to load service history', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDone();
  }, []);

  if (loading) {
    return (
      <ScreenBackground safeArea={false}>
        <AppNavigationBar
          title={screenTitle}
          backLabel={t('navigation.dashboard')}
          onBack={handleBack}
        />
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground safeArea={false}>
      <AppNavigationBar
        title={screenTitle}
        backLabel={t('navigation.dashboard')}
        onBack={handleBack}
        scrolled={scrolled}
      />
      <FlatList
        data={repairs}
        keyExtractor={(item) => String(item.id)}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyStateCard
            title={t('repairs.serviceHistoryEmptyTitle')}
            body={t('repairs.serviceHistoryEmptyBody')}
          />
        }
        renderItem={({ item }) => (
          <ServiceHistorySummaryCard
            item={item}
            onPress={() =>
              navigation.navigate('RepairDetail', {
                repairId: item.id,
                returnTo: 'ClientServiceHistory',
              })
            }
          />
        )}
      />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
});
