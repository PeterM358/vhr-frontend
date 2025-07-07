// PATH: src/components/client/ClientRepairOffers.js
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
import { FlatList } from 'react-native';
import { Card, Text, ActivityIndicator, useTheme } from 'react-native-paper';

export default function ClientRepairOffers() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bookedRepairIds, setBookedRepairIds] = useState(new Set());
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

      const repairsRes = await fetch(`${API_BASE_URL}/api/repairs/?status=ongoing`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const repairsData = await repairsRes.json();

      setBookedRepairIds(new Set(repairsData.map(r => r.id)));
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

    let opacity = 1;
    if (!isUnread && !isBooked) opacity = 0.4;

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