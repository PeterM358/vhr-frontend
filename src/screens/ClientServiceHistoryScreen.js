/**
 * Cross-vehicle completed service / repair history.
 */

import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Text, ActivityIndicator } from 'react-native-paper';
import { getRepairs } from '../api/repairs';
import ScreenBackground from '../components/ScreenBackground';
import AppNavigationBar from '../components/common/AppNavigationBar';
import FloatingCard from '../components/ui/FloatingCard';
import EmptyStateCard from '../components/ui/EmptyStateCard';
import StatusBadge from '../components/ui/StatusBadge';
import { COLORS } from '../constants/colors';
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
        renderItem={({ item }) => {
          const title =
            `${item.vehicle_make ?? ''} ${item.vehicle_model ?? ''}`.trim() || 'Vehicle';
          return (
            <FloatingCard
              onPress={() =>
                navigation.navigate('RepairDetail', { repairId: item.id, returnTo: 'ClientServiceHistory' })
              }
            >
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {title}
                </Text>
                <StatusBadge status={item.status} />
              </View>
              {item.vehicle_license_plate ? (
                <Text style={styles.meta}>{item.vehicle_license_plate}</Text>
              ) : null}
              {item.description ? (
                <Text style={styles.desc} numberOfLines={2}>
                  {item.description}
                </Text>
              ) : null}
            </FloatingCard>
          );
        }}
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
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
  },
  meta: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
    marginTop: 4,
  },
  desc: {
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
    marginTop: 6,
    lineHeight: 18,
  },
});
