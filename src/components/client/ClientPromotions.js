// PATH: src/components/client/ClientPromotions.js

import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Alert,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FlatList } from 'react-native';
import { Card, Text, ActivityIndicator, useTheme } from 'react-native-paper';
import { API_BASE_URL } from '../../api/config';
import { WebSocketContext } from '../../context/WebSocketManager';
import { markNotificationRead } from '../../api/notifications';
import { getMyBookedPromotionIds } from '../../api/offers';

export default function ClientPromotions({ navigation }) {
  const [offers, setOffers] = useState([]);
  const [bookedIds, setBookedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { notifications, setNotifications } = useContext(WebSocketContext);
  const theme = useTheme();

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

  const handlePressPromotion = async (item) => {
    try {
      const token = await AsyncStorage.getItem('@access_token');

      const unreadNotifs = notifications.filter(
        n => !n.is_read && n.offer === item.id
      );

      for (const notif of unreadNotifs) {
        await markNotificationRead(token, notif.id);
      }

      setNotifications(prev =>
        prev.map(n =>
          n.offer === item.id ? { ...n, is_read: true } : n
        )
      );

      navigation.navigate('PromotionDetail', { promotion: item });
    } catch (err) {
      console.error('Error marking promotion notification', err);
      Alert.alert('Error', 'Failed to open promotion.');
    }
  };

  const renderItem = ({ item }) => {
  const hasUnreadNotification = notifications.some(
    n => !n.is_read && n.offer === item.id
  );

  const isBooked = bookedIds.has(item.id);

  let opacity = hasUnreadNotification || isBooked ? 1 : 0.4;

  return (
    <Card
      style={{ marginVertical: 6, opacity }}
      onPress={() => handlePressPromotion(item)}
    >
      <Card.Title
        title={item.repair_type_name}
        titleStyle={hasUnreadNotification ? { fontWeight: 'bold' } : {}}
      />
      <Card.Content>
        <Text>{item.description}</Text>
        <Text>Price: {item.price} BGN</Text>
        <Text>Shop: {item.shop_name}</Text>
        {isBooked && (
          <Text style={{ color: theme.colors.primary, marginTop: 4 }}>
            ✅ Already booked
          </Text>
        )}
      </Card.Content>
    </Card>
  );
};

  return (
    <View style={{ flex: 1, padding: 10, backgroundColor: theme.colors.background }}>
      <Text variant="headlineSmall" style={{ textAlign: 'center', marginBottom: 10 }}>
        Promotions
      </Text>
      {loading ? (
        <ActivityIndicator size="large" />
      ) : (
        <FlatList
          data={offers}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', marginVertical: 20 }}>
              No promotions available.
            </Text>
          }
        />
      )}
    </View>
  );
}