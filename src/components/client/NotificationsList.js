// PATH: src/components/client/NotificationsList.js

import React, { useState, useContext, useCallback } from 'react';
import { View, FlatList, Alert, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Text, ActivityIndicator } from 'react-native-paper';

import {
  getNotifications,
  markNotificationRead,
  patchNotificationReadInList,
} from '../../api/notifications';
import { WebSocketContext } from '../../context/WebSocketManager';
import FloatingCard from '../ui/FloatingCard';
import EmptyStateCard from '../ui/EmptyStateCard';
import {
  PRIMARY,
  TEXT_DARK,
  TEXT_MUTED,
} from '../../constants/colors';
import {
  navigateForClientNotification,
  notificationActionHint,
} from '../../utils/clientNotificationRouting';

export default function NotificationsList({ activityReturnTo = 'ClientActivity' }) {
  const [loading, setLoading] = useState(true);
  const [remoteNotifications, setRemoteNotifications] = useState([]);
  const { notifications: liveNotifications = [], setNotifications } =
    useContext(WebSocketContext);
  const navigation = useNavigation();

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [])
  );

  const markReadLocally = (id) => {
    setRemoteNotifications((prev) => patchNotificationReadInList(prev, id));
    if (typeof setNotifications === 'function') {
      setNotifications((prev) => patchNotificationReadInList(prev, id));
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const data = await getNotifications(token);
      setRemoteNotifications(Array.isArray(data) ? data : data?.results ?? []);
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
        markReadLocally(item.id);
      }

      if (navigateForClientNotification(navigation, item, { returnTo: activityReturnTo })) {
        return;
      }
      Alert.alert('Info', 'No linked detail for this notification.');
    } catch (err) {
      console.error('Error handling notification press', err);
      Alert.alert('Error', 'Failed to open notification.');
    }
  };

  const mergedMap = new Map();
  [...(remoteNotifications || []), ...(liveNotifications || [])].forEach((n) => {
    if (n?.id != null && !mergedMap.has(n.id)) mergedMap.set(n.id, n);
  });
  const mergedNotifications = Array.from(mergedMap.values()).sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );

  const renderItem = ({ item }) => {
    const unread = !item.is_read;
    const hint = notificationActionHint(item);
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

        {hint ? <Text style={styles.hint}>{hint}</Text> : null}

        <Text style={styles.timestamp}>
          {new Date(item.created_at).toLocaleString()}
        </Text>
      </FloatingCard>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
        {mergedNotifications.length === 0 ? (
          <EmptyStateCard
            icon="bell-outline"
            title="No notifications yet"
            subtitle="Offers, promotions, bookings, and reschedule updates appear here."
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
    paddingTop: 12,
    backgroundColor: 'transparent',
  },
  heading: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
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
  hint: {
    fontSize: 12,
    color: PRIMARY,
    fontWeight: '600',
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 11,
    color: TEXT_MUTED,
  },
});
