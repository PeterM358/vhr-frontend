import React, { useEffect, useState, useContext } from 'react';
import {
  View,
  Alert,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { API_BASE_URL } from '../../api/config';
import { WebSocketContext } from '../../context/WebSocketManager';
import { markNotificationRead } from '../../api/notifications';
import { markOfferSeen } from '../../api/offers';
import { FlatList } from 'react-native';
import { Card, Text, ActivityIndicator, useTheme } from 'react-native-paper';

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

      const res = await fetch(`${API_BASE_URL}/api/offers/?is_promotion=0`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setOffers(data);
      const unseen = data.filter(o => !o.is_seen_by_client).length;
      console.log('📤 Offers sent to parent:', data);
      console.log('📤 Unseen offers count sent to OffersScreen:', unseen);
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

      await markOfferSeen(token, item.id);

      setOffers(prev =>
        prev.map(o =>
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

  let opacity = isUnread || isBooked ? 1 : 0.4;

  return (
    <Card
      style={{ marginVertical: 6, opacity, backgroundColor: isBooked ? 'yellow' : theme.colors.surface }}
      onPress={() => handlePressOffer(item)}
    >
      <Card.Title
        title={item.repair_type_name}
        titleStyle={isUnread ? { fontWeight: 'bold' } : {}}
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
        Repair Offers
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
              No repair offers available.
            </Text>
          }
        />
      )}
    </View>
  );
}