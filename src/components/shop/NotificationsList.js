// PATH: src/components/shop/NotificationsList.js

import React, { useEffect, useState, useContext } from 'react';
import { View, FlatList, Alert, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { getNotifications, markNotificationRead } from '../../api/notifications';
import { WebSocketContext } from '../../context/WebSocketManager';
import { Card, Text, ActivityIndicator } from 'react-native-paper';
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
        if (typeof removeNotification === 'function') removeNotification(item.id);
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

  const mergedMap = new Map();
  [...(remoteNotifications || []), ...(liveNotifications || [])].forEach((n) => {
    if (n?.id != null) mergedMap.set(n.id, n);
  });
  const mergedNotifications = Array.from(mergedMap.values())
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const renderItem = ({ item }) => (
    <Card
      mode="outlined"
      style={[styles.card, item.is_read && { opacity: 0.5 }]}
      onPress={() => handlePress(item)}
    >
      <Card.Title title={item.title || 'Notification'} />
      <Card.Content>
        <Text>{item.body}</Text>
        <Text style={styles.timestamp}>
          {new Date(item.created_at).toLocaleString()}
        </Text>
      </Card.Content>
    </Card>
  );

  return (
    <View style={BASE_STYLES.overlay}>
      {loading ? (
        <ActivityIndicator animating={true} size="large" style={styles.loading} />
      ) : mergedNotifications.length === 0 ? (
        <Text style={styles.emptyText}>No notifications found</Text>
      ) : (
        <FlatList
          data={mergedNotifications}
          keyExtractor={(item) => item.id?.toString() ?? Math.random().toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    marginTop: 50,
  },
  listContent: {
    paddingBottom: 20,
  },
  card: {
    marginVertical: 8,
    marginHorizontal: 16,
  },
  timestamp: {
    marginTop: 4,
    fontSize: 12,
    color: '#666',
  },
  emptyText: {
    textAlign: 'center',
    marginVertical: 20,
  },
});