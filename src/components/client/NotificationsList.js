// PATH: src/components/client/NotificationsList.js
import React, { useEffect, useState, useContext } from 'react';
import { View, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { getNotifications, markNotificationRead } from '../../api/notifications';
import { WebSocketContext } from '../../context/WebSocketManager';
import { FlatList } from 'react-native';
import { Card, Text, ActivityIndicator, useTheme } from 'react-native-paper';

export default function NotificationsList() {
  const [loading, setLoading] = useState(true);
  const [remoteNotifications, setRemoteNotifications] = useState([]);
  const { notifications: liveNotifications, setNotifications } = useContext(WebSocketContext);
  const navigation = useNavigation();
  const theme = useTheme();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const data = await getNotifications(token);
      setRemoteNotifications(data);
    } catch (err) {
      console.error('Failed to load notifications', err);
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
        setNotifications(prev => prev.filter(n => n.id !== item.id));
      }

      if (item.repair) {
        navigation.navigate('RepairChat', { repairId: item.repair });
      } else {
        Alert.alert('Info', 'No linked detail for this notification.');
      }
    } catch (err) {
      console.error('Error handling notification press', err);
      Alert.alert('Error', 'Failed to open notification.');
    }
  };

  const mergedNotificationsMap = new Map();
  [...remoteNotifications, ...liveNotifications].forEach((notif) =>
    mergedNotificationsMap.set(notif.id, notif)
  );
  const mergedNotifications = Array.from(mergedNotificationsMap.values())
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return (
    <View style={{ flex: 1, padding: 10, backgroundColor: theme.colors.background }}>
      <Text variant="headlineSmall" style={{ textAlign: 'center', marginBottom: 10 }}>
        Notifications
      </Text>
      {loading ? (
        <ActivityIndicator size="large" />
      ) : mergedNotifications.length === 0 ? (
        <Text style={{ textAlign: 'center', marginVertical: 20 }}>
          No notifications found
        </Text>
      ) : (
        <FlatList
          data={mergedNotifications}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <Card
              style={{
                marginVertical: 6,
                opacity: item.is_read ? 0.5 : 1,
              }}
              onPress={() => handlePress(item)}
            >
              <Card.Title title={item.title} />
              <Card.Content>
                <Text>{item.body}</Text>
                <Text style={{ fontSize: 12, color: theme.colors.onSurfaceVariant }}>
                  {new Date(item.created_at).toLocaleString()}
                </Text>
              </Card.Content>
            </Card>
          )}
        />
      )}
    </View>
  );
}