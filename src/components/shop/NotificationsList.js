// PATH: src/components/shop/NotificationsList.js

import React, { useEffect, useState, useContext } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { getNotifications, markNotificationRead } from '../../api/notifications';
import { WebSocketContext } from '../../context/WebSocketManager';
import BASE_STYLES from '../../styles/base';

export default function NotificationsList() {
  const [loading, setLoading] = useState(true);
  const [remoteNotifications, setRemoteNotifications] = useState([]);
  const { notifications: liveNotifications = [], removeNotification } = useContext(WebSocketContext);
  const navigation = useNavigation();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const data = await getNotifications(token);

      if (Array.isArray(data)) {
        setRemoteNotifications(data);
      } else if (data && Array.isArray(data.results)) {
        // Handles paginated DRF response
        setRemoteNotifications(data.results);
      } else {
        console.warn('⚠️ Unexpected notifications API shape:', data);
        setRemoteNotifications([]);
      }
    } catch (err) {
      console.error('❌ Failed to load notifications', err);
      Alert.alert('Error', 'Could not load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handlePress = async (item) => {
    try {
      const token = await AsyncStorage.getItem('@access_token');

      if (!item.is_read) {
        await markNotificationRead(token, item.id);

        if (typeof removeNotification === 'function') {
          removeNotification(item.id);
        }

        await fetchNotifications();
      }

      if (item.repair) {
        navigation.navigate('RepairDetail', { repairId: item.repair });
      } else {
        Alert.alert('Info', 'No linked repair for this notification.');
      }
    } catch (err) {
      console.error('❌ Error marking as read or navigating', err);
      Alert.alert('Error', 'Failed to open notification.');
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[
        BASE_STYLES.listItem,
        item.is_read ? { opacity: 0.5 } : { opacity: 1 },
      ]}
      onPress={() => handlePress(item)}
    >
      <Text style={BASE_STYLES.subText}>{item.title}</Text>
      <Text>{item.body}</Text>
      <Text style={{ fontSize: 12, color: '#666' }}>
        {new Date(item.created_at).toLocaleString()}
      </Text>
    </TouchableOpacity>
  );

  // ✅ Defensive merging with checks
  const safeRemote = Array.isArray(remoteNotifications) ? remoteNotifications : [];
  const safeLive = Array.isArray(liveNotifications) ? liveNotifications : [];

  console.log('✅ Merging notifications:', { remote: safeRemote.length, live: safeLive.length });

  const mergedNotificationsMap = new Map();
  [...safeRemote, ...safeLive].forEach((notif) => {
    if (notif && notif.id != null) {
      mergedNotificationsMap.set(notif.id, notif);
    }
  });

  const mergedNotifications = Array.from(mergedNotificationsMap.values()).sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );

  return (
    <View style={BASE_STYLES.overlay}>
      <Text style={BASE_STYLES.title}>Notifications</Text>
      {loading ? (
        <ActivityIndicator size="large" />
      ) : mergedNotifications.length === 0 ? (
        <Text style={{ textAlign: 'center', marginVertical: 20 }}>
          No notifications found
        </Text>
      ) : (
        <FlatList
          data={mergedNotifications}
          keyExtractor={(item) => item.id?.toString() ?? Math.random().toString()}
          renderItem={renderItem}
        />
      )}
    </View>
  );
}