import React, { useEffect, useState, useContext } from 'react';
import { View, Alert, RefreshControl, StyleSheet, FlatList } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { API_BASE_URL } from '../../api/config';
import { WebSocketContext } from '../../context/WebSocketManager';
import { markNotificationRead } from '../../api/notifications';
import { markOfferSeen } from '../../api/offers';
import { Text, ActivityIndicator, useTheme } from 'react-native-paper';
import FloatingCard from '../ui/FloatingCard';
import EmptyStateCard from '../ui/EmptyStateCard';
import { COLORS } from '../../constants/colors';

export default function ClientRepairOffers({ onUpdateUnseenOffersCount }) {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const { notifications, setNotifications } = useContext(WebSocketContext);
  const theme = useTheme();

  const fetchRepairOffers = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');

      const res = await fetch(`${API_BASE_URL}/api/offers/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setOffers(data);
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
    const isBooked = item.is_booked;

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
          {item.repair_type_name}
        </Text>
        {!!item.description && (
          <Text style={styles.desc} numberOfLines={3}>
            {item.description}
          </Text>
        )}
        <Text style={styles.priceLine}>
          <Text style={styles.priceLabel}>Price: </Text>
          <Text style={styles.priceValue}>{item.price} BGN</Text>
        </Text>
        <Text style={styles.shopLine}>Shop: {item.shop_name}</Text>
        {isBooked && (
          <View style={styles.bookedPill}>
            <Text style={[styles.bookedText, { color: theme.colors.primary }]}>
              Already booked
            </Text>
          </View>
        )}
      </FloatingCard>
    );
  };

  return (
    <View style={styles.root}>
      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} />
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
              title="No repair offers yet"
              subtitle="When shops send offers, they will appear here."
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
    fontWeight: '600',
    color: COLORS.PRIMARY_DARK,
    marginBottom: 6,
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
  bookedPill: {
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(245,158,11,0.14)',
  },
  bookedText: {
    fontWeight: '700',
    fontSize: 12,
  },
});
