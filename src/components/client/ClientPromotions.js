import { useTheme, Text, Badge } from 'react-native-paper';
import React, { useState, useEffect, useContext } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import {
  View,
  Alert,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FlatList } from 'react-native';
import { Card, ActivityIndicator } from 'react-native-paper';
import { API_BASE_URL } from '../../api/config';
import { WebSocketContext } from '../../context/WebSocketManager';
import { AuthContext } from '../../context/AuthManager';
import { markNotificationRead } from '../../api/notifications';
import { getPromotions, markPromotionSeen, getSeenPromotions } from '../../api/promotions';

export default function ClientPromotions({ navigation, onUpdateUnseenCount }) {
  const theme = useTheme();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { notifications, setNotifications } = useContext(WebSocketContext);
  const { isClient } = useContext(AuthContext);

  const fetchPromotions = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const offersData = await getPromotions(token);
      console.log('📦 Promotions data from API:', offersData);
      setOffers(offersData);
      if (onUpdateUnseenCount) {
        const unseen = offersData.filter(p => !p.is_seen).length;
        console.log('📤 Unseen promotions count sent to OffersScreen:', unseen);
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
    console.log('📡 Initial fetchPromotions called');
    fetchPromotions();
  }, []);

  useFocusEffect(
    useCallback(() => {
      console.log('🔄 Refetch promotions on focus');
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
    const cardStyle = {
      marginVertical: 6,
      borderWidth: isSeen ? 0 : 2,
      borderColor: isSeen ? 'transparent' : theme.colors.secondary,
      backgroundColor: isSeen ? '#f0f0f0' : '#ffffff',
    };
    return (
      <Card style={cardStyle} onPress={() => handlePressPromotion(item)}>
        <Card.Title title={item.repair_type_name} titleStyle={isSeen ? {} : { fontWeight: 'bold' }} />
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

const styles = (theme) => StyleSheet.create({
  promotionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 10,
    backgroundColor: theme.colors.primary,
  },
  promotionsTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
  },
});