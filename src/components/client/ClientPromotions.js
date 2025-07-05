import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../../api/config';
import { WebSocketContext } from '../../context/WebSocketManager';
import { markNotificationRead } from '../../api/notifications';
import { getMyBookedPromotionIds } from '../../api/offers';
import BASE_STYLES from '../../styles/base';

export default function ClientPromotions({ navigation }) {
  const [offers, setOffers] = useState([]);
  const [bookedIds, setBookedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { notifications, setNotifications } = useContext(WebSocketContext);

  // ✅ Fetch promotions + booked IDs
  const fetchPromotions = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');

      const [offersRes, bookedRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/offers/?is_promotion=1`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        getMyBookedPromotionIds(token),
      ]);

      if (!offersRes.ok) throw new Error('Failed to fetch promotions');
      const offersData = await offersRes.json();

      setOffers(offersData);
      setBookedIds(new Set(bookedRes));
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

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPromotions();
    setRefreshing(false);
  };

  // ✅ User taps a promotion
  const handlePressPromotion = async (item) => {
    try {
      const token = await AsyncStorage.getItem('@access_token');

      // Find matching unread notifications for this offer
      const unreadNotifs = notifications.filter(
        n => !n.is_read && n.offer === item.id
      );

      for (const notif of unreadNotifs) {
        await markNotificationRead(token, notif.id);
      }

      // Update local notification state
      setNotifications(prev =>
        prev.map(n =>
          n.offer === item.id ? { ...n, is_read: true } : n
        )
      );

      // Navigate to PromotionDetail to book
      navigation.navigate('PromotionDetail', { promotion: item });

    } catch (err) {
      console.error('Error marking promotion notification', err);
      Alert.alert('Error', 'Failed to open promotion.');
    }
  };

  const renderItem = ({ item }) => {
    // Is booked by this user
    const isBooked = bookedIds.has(item.id);

    // Is unread notification present for this promotion
    const hasUnreadNotification = notifications.some(
      n => !n.is_read && n.offer === item.id
    );

    let cardStyle = [BASE_STYLES.offerCard];
    if (isBooked) {
      cardStyle.push(styles.bookedCard);
    } else if (!hasUnreadNotification) {
      cardStyle.push(styles.readCard);
    }

    return (
      <TouchableOpacity
        style={cardStyle}
        onPress={() => handlePressPromotion(item)}
      >
        <Text style={[
          BASE_STYLES.offerTitle,
          hasUnreadNotification ? styles.unreadTitle : {}
        ]}>
          {item.repair_type_name}
        </Text>
        <Text style={BASE_STYLES.offerDetail}>{item.description}</Text>
        <Text style={BASE_STYLES.price}>Price: {item.price} BGN</Text>
        <Text style={BASE_STYLES.offerDetail}>Shop: {item.shop_name}</Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return <ActivityIndicator size="large" />;
  }

  return (
    <View style={BASE_STYLES.overlay}>
      <Text style={BASE_STYLES.title}>Promotions</Text>
      <FlatList
        data={offers}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListEmptyComponent={<Text style={{ textAlign: 'center', marginVertical: 20 }}>No promotions available.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  unreadTitle: {
    fontWeight: 'bold',
  },
  readCard: {
    opacity: 0.4,
  },
  bookedCard: {
    backgroundColor: '#FFFACD',
  },
});