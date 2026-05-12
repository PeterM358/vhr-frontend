// PATH: src/components/shop/RepairsList.js

import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import {
  Text,
  ActivityIndicator,
} from 'react-native-paper';

import { getRepairs } from '../../api/repairs';
import ScreenBackground from '../ScreenBackground';
import FloatingCard from '../ui/FloatingCard';
import StatusBadge from '../ui/StatusBadge';
import EmptyStateCard from '../ui/EmptyStateCard';
import {
  PRIMARY,
  TEXT_DARK,
  TEXT_MUTED,
} from '../../constants/colors';
import { stackContentPaddingTop } from '../../navigation/stackContentInset';

const TAB_OPTIONS = [
  { key: 'open', label: 'Open' },
  { key: 'ongoing', label: 'Ongoing' },
  { key: 'done', label: 'Done' },
  { key: 'home', label: 'Home', isHome: true },
];

export default function RepairsList() {
  const insets = useSafeAreaInsets();
  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('open');
  const navigation = useNavigation();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const token = await AsyncStorage.getItem('@access_token');
      try {
        const repairsData = await getRepairs(token, selectedTab);
        setRepairs(repairsData);
      } catch (err) {
        console.error('Failed to load data', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedTab]);

  const renderRepair = ({ item }) => {
    const title = `${item.vehicle_make ?? ''} ${item.vehicle_model ?? ''}`.trim() || 'Vehicle';
    const plate = item.vehicle_license_plate;
    const showPlate = selectedTab !== 'open';

    return (
      <FloatingCard
        onPress={() =>
          navigation.navigate('RepairDetail', { repairId: item.id })
        }
      >
        <View style={styles.cardTopRow}>
          <View style={styles.cardTitleWrap}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {title}
            </Text>
            {!!plate && showPlate && (
              <Text style={styles.cardPlate} numberOfLines={1}>
                {plate}
              </Text>
            )}
            {!!plate && !showPlate && (
              <Text style={styles.cardPlate} numberOfLines={1}>
                Plate hidden until booking
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
      <View style={[styles.container, { paddingTop: stackContentPaddingTop(insets, 12) }]}>
        <View style={styles.tabRow}>
          {TAB_OPTIONS.map((tab) => {
            const active = !tab.isHome && tab.key === selectedTab;
            return (
              <Pressable
                key={tab.key}
                onPress={() => {
                  if (tab.isHome) {
                    navigation.dispatch(DrawerActions.jumpTo('ShopDashboard'));
                    return;
                  }
                  setSelectedTab(tab.key);
                }}
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
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {loading ? (
          <ActivityIndicator
            size="large"
            color="#fff"
            style={styles.loading}
          />
        ) : (
          <FlatList
            data={repairs}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderRepair}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <EmptyStateCard
                icon="wrench-outline"
                title={`No ${selectedTab} repairs`}
                subtitle="When repairs match this status, they'll show up here."
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
  tabRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 14,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    margin: 4,
    minWidth: 76,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: PRIMARY,
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
    letterSpacing: 0.6,
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
    paddingBottom: 20,
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
    color: TEXT_DARK,
  },
  cardPlate: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginTop: 2,
    letterSpacing: 0.4,
  },
  cardDescription: {
    fontSize: 13,
    color: TEXT_MUTED,
    marginTop: 2,
    lineHeight: 18,
  },
  cardMeta: {
    fontSize: 12,
    color: TEXT_MUTED,
    marginTop: 6,
  },
});
