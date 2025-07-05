// PATH: src/components/client/ClientRepairOffers.js

import React, { useEffect, useState, useContext } from 'react';
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
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { API_BASE_URL } from '../../api/config';
import { WebSocketContext } from '../../context/WebSocketManager';
import { markNotificationRead } from '../../api/notifications';
import BASE_STYLES from '../../styles/base';

export default function ClientRepairOffers() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bookedRepairIds, setBookedRepairIds] = useState(new Set());
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const { notifications, setNotifications } = useContext(WebSocketContext);

  // 🔄 Fetch offers and booked
  const fetchRepairOffers = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');

      // 1️⃣ All repair offers
      const res = await fetch(`${API_BASE_URL}/api/offers/?is_promotion=0`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      setOffers(data);

      // 2️⃣ Fetch user's booked repairs (repairs with status 'ongoing')
      const repairsRes = await fetch(`${API_BASE_URL}/api/repairs/?status=ongoing`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const repairsData = await repairsRes.json();

      // Collect repair IDs that are "booked"
      const bookedIds = new Set(repairsData.map(r => r.id));
      setBookedRepairIds(bookedIds);

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
        n => !n.is_read && n.repair === item.repair
      );

      if (matchingNotif) {
        await markNotificationRead(token, matchingNotif.id);
        setNotifications(prev =>
          prev.map(n =>
            n.id === matchingNotif.id ? { ...n, is_read: true } : n
          )
        );
      }

      navigation.navigate('RepairDetail', { repairId: item.repair });
    } catch (err) {
      Alert.alert('Error', 'Could not open detail');
    }
  };

  const renderItem = ({ item }) => {
    const isUnread = notifications.some(
      n => !n.is_read && n.repair === item.repair
    );

    const isBooked = bookedRepairIds.has(item.repair);

    const cardStyles = [
      BASE_STYLES.offerCard,
      isBooked && styles.bookedCard,
      !isUnread && !isBooked && { opacity: 0.4 },
    ];

    return (
      <TouchableOpacity
        style={cardStyles}
        onPress={() => handlePressOffer(item)}
      >
        <Text style={[
          BASE_STYLES.offerTitle,
          isUnread ? { fontWeight: 'bold' } : { fontWeight: 'normal' }
        ]}>
          {item.repair_type_name}
        </Text>
        <Text style={BASE_STYLES.offerDetail}>{item.description}</Text>
        <Text style={BASE_STYLES.price}>Price: {item.price} BGN</Text>
        <Text style={BASE_STYLES.offerDetail}>Shop: {item.shop_name}</Text>
      </TouchableOpacity>
    );
  };

  if (loading) return <ActivityIndicator size="large" />;

  return (
    <View style={BASE_STYLES.overlay}>
      <Text style={BASE_STYLES.title}>Repair Offers</Text>
      <FlatList
        data={offers}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', marginVertical: 20 }}>
            No repair offers available.
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bookedCard: {
    backgroundColor: 'yellow',
  },
});