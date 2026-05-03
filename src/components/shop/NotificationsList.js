// PATH: src/components/shop/NotificationsList.js

import React, { useEffect, useState, useContext } from 'react';
import { View, FlatList, Alert, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Text, ActivityIndicator } from 'react-native-paper';

import { getNotifications, markNotificationRead } from '../../api/notifications';
import { WebSocketContext } from '../../context/WebSocketManager';
import ScreenBackground from '../ScreenBackground';
import FloatingCard from '../ui/FloatingCard';
import EmptyStateCard from '../ui/EmptyStateCard';
import {
  PRIMARY,
  TEXT_DARK,
  TEXT_MUTED,
} from '../../constants/colors';
import { stackContentPaddingTop } from '../../navigation/stackContentInset';

export default function NotificationsList() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [remoteNotifications, setRemoteNotifications] = useState([]);
  const { notifications: liveNotifications = [], removeNotification } =
    useContext(WebSocketContext);
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
        console.warn('Unexpected notifications API shape:', data);
        setRemoteNotifications([]);
      }
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
        if (typeof removeNotification === 'function') removeNotification(item.id);
        await fetchNotifications();
      }

      const repairId = item?.repair ?? item?.data?.repair_id;
      if (repairId) {
        navigation.navigate('RepairDetail', { repairId });
      } else {
        console.warn('Notification missing repairId', item);
        Alert.alert('Info', 'No linked repair for this notification.');
      }
    } catch (err) {
      console.error('Error marking as read or navigating', err);
      Alert.alert('Error', 'Failed to open notification.');
    }
  };

  const mergedMap = new Map();
  [...(remoteNotifications || []), ...(liveNotifications || [])].forEach((n) => {
    if (n?.id != null) mergedMap.set(n.id, n);
  });
  const mergedNotifications = Array.from(mergedMap.values()).sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );

  const renderItem = ({ item }) => {
    const unread = !item.is_read;
    return (
      <FloatingCard
        onPress={() => handlePress(item)}
        accent={unread}
        style={!unread && styles.readCard}
      >
        <View style={styles.titleRow}>
          {unread && <View style={styles.unreadDot} />}
          <Text
            style={[styles.title, unread ? styles.titleUnread : styles.titleRead]}
            numberOfLines={2}
          >
            {item.title || 'Notification'}
          </Text>
        </View>

        {!!item.body && (
          <Text style={styles.body} numberOfLines={3}>
            {item.body}
          </Text>
        )}

        <Text style={styles.timestamp}>
          {new Date(item.created_at).toLocaleString()}
        </Text>
      </FloatingCard>
    );
  };

  if (loading) {
    return (
      <ScreenBackground safeArea={false}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground safeArea={false}>
      <View style={[styles.container, { paddingTop: stackContentPaddingTop(insets, 12) }]}>
        {mergedNotifications.length === 0 ? (
          <EmptyStateCard
            icon="bell-outline"
            title="No notifications yet"
            subtitle="When something needs your attention, it'll show up here."
          />
        ) : (
          <FlatList
            data={mergedNotifications}
            keyExtractor={(item) =>
              item.id?.toString() ?? Math.random().toString()
            }
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    paddingHorizontal: 12,
    backgroundColor: 'transparent',
  },
  listContent: {
    paddingBottom: 20,
  },
  readCard: {
    opacity: 0.78,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: PRIMARY,
    marginRight: 8,
  },
  title: {
    flex: 1,
    fontSize: 15,
  },
  titleUnread: {
    color: TEXT_DARK,
    fontWeight: '700',
  },
  titleRead: {
    color: TEXT_DARK,
    fontWeight: '600',
  },
  body: {
    fontSize: 13,
    color: TEXT_MUTED,
    lineHeight: 18,
    marginBottom: 6,
  },
  timestamp: {
    fontSize: 11,
    color: TEXT_MUTED,
  },
});
