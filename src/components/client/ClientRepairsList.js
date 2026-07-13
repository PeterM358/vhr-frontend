// PATH: src/components/client/ClientRepairsList.js

import React, { useEffect, useMemo, useState } from 'react';
import { View, FlatList, StyleSheet, Pressable, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getRepairs } from '../../api/repairs';
import { Text, ActivityIndicator } from 'react-native-paper';

import ScreenBackground from '../ScreenBackground';
import FloatingCard from '../ui/FloatingCard';
import StatusBadge from '../ui/StatusBadge';
import EmptyStateCard from '../ui/EmptyStateCard';
import ClientRepairOffers from './ClientRepairOffers';
import { COLORS } from '../../constants/colors';
import AppNavigationBar from '../common/AppNavigationBar';
import { useScrollShadow } from '../../hooks/useScrollShadow';
import { useClientDashboardBack, useGoBackOr } from '../../navigation/appNavBarBack';
import { syncWebPath } from '../../navigation/authNavigation';
import { navigateToRepairRequestDetail } from '../../navigation/webNavigation';
import { repairRequests } from '../../navigation/webRoutes';
import { useTranslation } from '../../i18n';

const TAB_KEYS = ['open', 'offers', 'ongoing', 'done'];

const TAB_I18N_KEYS = {
  open: 'repairs.tabs.requests',
  offers: 'repairs.tabs.offers',
  ongoing: 'repairs.tabs.active',
  done: 'repairs.tabs.completed',
};

function resolveInitialTab(route) {
  const tab = route.params?.initialTab || route.params?.tab;
  if (tab && TAB_KEYS.includes(tab)) {
    return tab;
  }
  return 'open';
}

export default function ClientRepairsList({ navigation, route }) {
  const { t } = useTranslation();
  const { scrolled, onScroll, scrollEventThrottle } = useScrollShadow();
  const fromVehicleDetail = !!route.params?.fromVehicleDetail;
  const goBackDefault = useGoBackOr(navigation);
  const goBackDashboard = useClientDashboardBack(navigation);
  const handleBack = fromVehicleDetail ? goBackDefault : goBackDashboard;
  const screenTitle = t('repairs.title');
  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(() => resolveInitialTab(route));
  const scopedVehicleId = route.params?.vehicleId ? Number(route.params.vehicleId) : null;

  useEffect(() => {
    const tab = route.params?.initialTab || route.params?.tab;
    if (tab && TAB_KEYS.includes(tab)) {
      setStatusFilter(tab);
    }
  }, [route.params?.initialTab, route.params?.tab]);

  useEffect(() => {
    if (statusFilter === 'offers') {
      setLoading(false);
      return undefined;
    }

    const fetchRepairs = async () => {
      setLoading(true);
      try {
        const token = await AsyncStorage.getItem('@access_token');
        const data = await getRepairs(token, statusFilter);
        setRepairs(data);
      } catch (err) {
        console.error('Failed to load repairs', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRepairs();
  }, [statusFilter]);

  const selectTab = (tabKey) => {
    setStatusFilter(tabKey);
    if (Platform.OS === 'web' && !route.params?.fromVehicleDetail) {
      const path =
        tabKey === 'offers' ? repairRequests({ tab: 'offers' }) : repairRequests();
      syncWebPath(path);
    }
  };

  const visibleRepairs = useMemo(() => {
    if (!scopedVehicleId) return repairs;
    return repairs.filter((r) => Number(r.vehicle) === scopedVehicleId);
  }, [repairs, scopedVehicleId]);

  const renderRepair = ({ item }) => {
    const title =
      `${item.vehicle_make ?? ''} ${item.vehicle_model ?? ''}`.trim() ||
      'Vehicle';
    const plate = item.vehicle_license_plate;

    return (
      <FloatingCard
        onPress={() =>
          navigateToRepairRequestDetail(navigation, item.id, {
            returnTo: 'ClientRepairs',
            initialTab: statusFilter,
            fromVehicleDetail: route.params?.fromVehicleDetail || false,
          })
        }
      >
        <View style={styles.cardTopRow}>
          <View style={styles.cardTitleWrap}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {title}
            </Text>
            {!!plate && (
              <Text style={styles.cardPlate} numberOfLines={1}>
                {plate}
              </Text>
            )}
          </View>
          <StatusBadge status={item.status} />
        </View>

        {!!item.description && (
          <Text style={styles.cardDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        {item.kilometers != null && item.kilometers !== '' && (
          <Text style={styles.cardMeta}>
            {Number(item.kilometers).toLocaleString()} km
          </Text>
        )}
      </FloatingCard>
    );
  };

  return (
    <ScreenBackground safeArea={false}>
      <AppNavigationBar
        title={screenTitle}
        backLabel={fromVehicleDetail ? t('vehicles.vehicle') : t('navigation.dashboard')}
        onBack={handleBack}
        scrolled={scrolled}
      />
      <View style={styles.container}>
        <View style={styles.tabRow}>
          {TAB_KEYS.map((tabKey) => {
            const active = tabKey === statusFilter;
            return (
              <Pressable
                key={tabKey}
                onPress={() => selectTab(tabKey)}
                style={({ pressed }) => [
                  styles.tab,
                  active ? styles.tabActive : styles.tabInactive,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <Text
                  style={[
                    styles.tabLabel,
                    active ? styles.tabLabelActive : styles.tabLabelInactive,
                  ]}
                >
                  {t(TAB_I18N_KEYS[tabKey])}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {statusFilter === 'offers' ? (
          <View style={styles.offersWrap}>
            <ClientRepairOffers activityReturnTo="ClientRepairs" />
          </View>
        ) : loading ? (
          <ActivityIndicator
            size="large"
            color="#fff"
            style={styles.loading}
          />
        ) : (
          <FlatList
            data={visibleRepairs}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderRepair}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <EmptyStateCard
                icon="wrench-outline"
                title={t('repairs.emptyTitle')}
                subtitle={t('repairs.emptySubtitle', { status: t(TAB_I18N_KEYS[statusFilter]) })}
              />
            }
          />
        )}
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 12,
    backgroundColor: 'transparent',
  },
  offersWrap: {
    flex: 1,
  },
  tabRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 14,
  },
  tab: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
    margin: 4,
    minWidth: 88,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: COLORS.PRIMARY,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
  },
  tabInactive: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  tabLabelActive: {
    color: '#fff',
  },
  tabLabelInactive: {
    color: 'rgba(255,255,255,0.92)',
  },
  loading: {
    marginTop: 24,
  },
  listContent: {
    paddingBottom: 24,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardTitleWrap: {
    flex: 1,
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
  },
  cardPlate: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
    marginTop: 2,
    letterSpacing: 0.4,
  },
  cardDescription: {
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
    marginTop: 2,
    lineHeight: 18,
  },
  cardMeta: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
    marginTop: 6,
  },
});
