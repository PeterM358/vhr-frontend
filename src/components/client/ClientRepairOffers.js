import React, { useEffect, useState, useContext } from 'react';
import { View, Alert, RefreshControl, StyleSheet, FlatList } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { API_BASE_URL } from '../../api/config';
import { WebSocketContext } from '../../context/WebSocketManager';
import { markNotificationRead } from '../../api/notifications';
import { markOfferSeen } from '../../api/offers';
import { getRepairs } from '../../api/repairs';
import { Text, ActivityIndicator } from 'react-native-paper';
import FloatingCard from '../ui/FloatingCard';
import EmptyStateCard from '../ui/EmptyStateCard';
import { COLORS } from '../../constants/colors';

export default function ClientRepairOffers({ onUpdateUnseenOffersCount }) {
  const [offers, setOffers] = useState([]);
  const [repairStatusById, setRepairStatusById] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const { notifications, setNotifications } = useContext(WebSocketContext);

  const fetchRepairOffers = async () => {
    // TODO(activity-filters): add client-side filters for offers/ongoing/completed/canceled states.
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');

      const [offersRes, repairsData] = await Promise.all([
        fetch(`${API_BASE_URL}/api/offers/`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        getRepairs(token).catch(() => []),
      ]);
      const data = await offersRes.json();
      setOffers(data);
      const statusMap = {};
      if (Array.isArray(repairsData)) {
        repairsData.forEach((repair) => {
          if (repair?.id != null && repair?.status) {
            statusMap[String(repair.id)] = repair.status;
          }
        });
      }
      setRepairStatusById(statusMap);
      const unseen = data.filter((o) => !o.is_seen_by_client).length;
      if (typeof onUpdateUnseenOffersCount === 'function') {
        onUpdateUnseenOffersCount(unseen);
      }
    } catch (err) {
      console.error('Failed to load repair offers', err);
      Alert.alert('Error', 'Could not load repair offers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) fetchRepairOffers();
  }, [isFocused]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchRepairOffers();
    setRefreshing(false);
  };

  const handlePressOffer = async (item) => {
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const matchingNotif = notifications.find(
        (n) => !n.is_read && n.repair === item.repair
      );

      if (matchingNotif) {
        await markNotificationRead(token, matchingNotif.id);
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === matchingNotif.id ? { ...n, is_read: true } : n
          )
        );
      }

      await markOfferSeen(token, item.id);

      setOffers((prev) =>
        prev.map((o) =>
          o.id === item.id ? { ...o, is_seen_by_client: true } : o
        )
      );

      navigation.navigate('RepairDetail', { repairId: item.repair });
    } catch (err) {
      Alert.alert('Error', 'Could not open detail');
    }
  };

  const renderItem = ({ item }) => {
    const isUnread = !item.is_seen_by_client;
    const statusFromRepairList = item?.repair != null ? repairStatusById[String(item.repair)] : null;
    const rawRepairStatus =
      item?.repair?.status ??
      item?.repair_status ??
      item?.repairStatus ??
      statusFromRepairList ??
      null;
    const normalizedRepairStatus =
      typeof rawRepairStatus === 'string' ? rawRepairStatus.trim().toLowerCase() : null;
    const repairStatus =
      normalizedRepairStatus === 'cancelled' ? 'canceled' : normalizedRepairStatus;
    const hasRepairStatus = Boolean(repairStatus);
    const isBooked = item.is_booked;
    const shopName = item.shop_name || 'Service center';
    let activityTitle = 'Offer received';
    let activityDescription = `${shopName} sent an offer`;
    let activityLabel = 'NEW OFFER';
    let activityStyle = styles.stateNew;
    if (hasRepairStatus) {
      if (repairStatus === 'done') {
        activityTitle = 'Repair completed';
        activityDescription = `${shopName} completed the repair`;
        activityLabel = 'DONE';
        activityStyle = styles.stateDone;
      } else if (repairStatus === 'ongoing') {
        activityTitle = 'Vehicle in service';
        activityDescription = `Your vehicle is currently being serviced by ${shopName}`;
        activityLabel = 'IN SERVICE';
        activityStyle = styles.stateInService;
      } else if (repairStatus === 'canceled') {
        activityTitle = 'Repair canceled';
        activityDescription = `${shopName} canceled the repair`;
        activityLabel = 'CANCELED';
        activityStyle = styles.stateCanceled;
      } else if (repairStatus === 'open' && isBooked) {
        activityTitle = 'Repair booked';
        activityDescription = `You booked ${shopName}`;
        activityLabel = 'BOOKED';
        activityStyle = styles.stateBooked;
      }
    } else if (isBooked) {
      // Fallback only when linked repair status is unavailable.
      activityTitle = 'Repair booked';
      activityDescription = `You booked ${shopName}`;
      activityLabel = 'BOOKED';
      activityStyle = styles.stateBooked;
    }

    return (
      <FloatingCard
        accent={isUnread}
        onPress={() => handlePressOffer(item)}
        style={{ opacity: isUnread || isBooked ? 1 : 0.88 }}
      >
        <Text
          style={[styles.typeTitle, isUnread && styles.typeTitleBold]}
          numberOfLines={2}
        >
          {activityTitle}
        </Text>
        <Text style={styles.activityLine}>{activityDescription}</Text>
        {!!item.description && (
          <Text style={styles.desc} numberOfLines={3}>
            {item.description}
          </Text>
        )}
        <Text style={styles.priceLine}>
          <Text style={styles.priceLabel}>Price: </Text>
          <Text style={styles.priceValue}>{item.price} BGN</Text>
        </Text>
        <Text style={styles.shopLine}>Service center: {shopName}</Text>
        <View style={[styles.statusPill, activityStyle]}>
          <Text style={styles.statusText}>{activityLabel}</Text>
        </View>
      </FloatingCard>
    );
  };

  return (
    <View style={styles.root}>
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.PRIMARY} />
      ) : (
        <FlatList
          data={offers}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <EmptyStateCard
              icon="handshake-outline"
              title="No activity yet"
              subtitle="Repair updates and offers will appear here."
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 4,
    paddingBottom: 8,
    backgroundColor: 'transparent',
  },
  listContent: {
    paddingBottom: 16,
  },
  typeTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.PRIMARY_DARK,
    marginBottom: 4,
  },
  activityLine: {
    color: COLORS.TEXT_DARK,
    marginBottom: 8,
    fontSize: 13,
    fontWeight: '500',
  },
  typeTitleBold: {
    fontWeight: '700',
  },
  desc: {
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
    lineHeight: 18,
    marginBottom: 8,
  },
  priceLine: {
    fontSize: 14,
    marginBottom: 4,
  },
  priceLabel: {
    color: COLORS.TEXT_MUTED,
  },
  priceValue: {
    fontWeight: '800',
    color: COLORS.PRIMARY,
  },
  shopLine: {
    fontSize: 13,
    color: COLORS.TEXT_DARK,
  },
  statusPill: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: {
    fontWeight: '700',
    fontSize: 12,
    color: '#0f172a',
  },
  stateNew: { backgroundColor: 'rgba(37,99,235,0.15)' },
  stateBooked: { backgroundColor: 'rgba(245,158,11,0.2)' },
  stateInService: { backgroundColor: 'rgba(59,130,246,0.2)' },
  stateDone: { backgroundColor: 'rgba(16,185,129,0.22)' },
  stateCanceled: { backgroundColor: 'rgba(239,68,68,0.2)' },
});
