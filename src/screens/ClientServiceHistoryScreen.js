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

export default function ClientServiceHistoryScreen({ navigation }) {
  const { scrolled, onScroll, scrollEventThrottle } = useScrollShadow();
  const handleBack = useClientDashboardBack(navigation);
  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(true);

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
        <AppNavigationBar title="Service History" backLabel="Dashboard" onBack={handleBack} />
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground safeArea={false}>
      <AppNavigationBar
        title="Service History"
        backLabel="Dashboard"
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
            title="No service history yet"
            body="Completed repairs and logged service records will appear here."
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
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 10,
  },
});
