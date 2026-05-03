import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View,
  Alert,
  RefreshControl,
  StyleSheet,
  FlatList,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme, Text, ActivityIndicator } from 'react-native-paper';

import { WebSocketContext } from '../../context/WebSocketManager';
import { markNotificationRead } from '../../api/notifications';
import { getPromotions, markPromotionSeen } from '../../api/promotions';
import FloatingCard from '../ui/FloatingCard';
import EmptyStateCard from '../ui/EmptyStateCard';
import { COLORS } from '../../constants/colors';

export default function ClientPromotions({ navigation, onUpdateUnseenCount }) {
  const theme = useTheme();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { notifications, setNotifications } = useContext(WebSocketContext);

  const fetchPromotions = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const offersData = await getPromotions(token);
      setOffers(offersData);
      if (onUpdateUnseenCount) {
        const unseen = offersData.filter((p) => !p.is_seen).length;
        onUpdateUnseenCount(unseen);
      }
    } catch (err) {
      console.error('Failed to load promotions', err);
      Alert.alert('Error', 'Could not load promotions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromotions();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchPromotions();
    }, [])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPromotions();
    setRefreshing(false);
  };

  const handlePressPromotion = async (item) => {
    try {
      const token = await AsyncStorage.getItem('@access_token');
      if (!item.is_seen) {
        await markPromotionSeen(token, item.id);

        const matchingNotif = notifications.find(
          (n) => n.promotion_id === item.id && !n.is_read
        );
        if (matchingNotif) {
          await markNotificationRead(token, matchingNotif.id);
          if (setNotifications) {
            setNotifications((prev) =>
              prev.map((n) =>
                n.id === matchingNotif.id ? { ...n, is_read: true } : n
              )
            );
          }
        }
      }
      navigation.navigate('PromotionDetail', { promotion: item }, { merge: true });
    } catch (err) {
      console.error('Error marking promotion notification', err);
      Alert.alert('Error', 'Failed to open promotion.');
    }
  };

  const renderItem = ({ item }) => {
    const isSeen = item.is_seen;
    const isBooked = item.is_booked;

    return (
      <FloatingCard
        accent={!isSeen}
        onPress={() => handlePressPromotion(item)}
        style={{ opacity: isSeen ? 0.9 : 1 }}
      >
        <Text
          style={[styles.typeTitle, !isSeen && styles.typeTitleBold]}
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
          <Text style={[styles.booked, { color: theme.colors.primary }]}>
            Already booked
          </Text>
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
              icon="tag-multiple-outline"
              title="No promotions available"
              subtitle="Pull down to refresh."
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
  booked: {
    marginTop: 8,
    fontWeight: '600',
    fontSize: 13,
  },
});
