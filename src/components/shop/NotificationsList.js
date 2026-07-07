// PATH: src/components/shop/NotificationsList.js

import React, { useState, useContext, useCallback, useMemo } from 'react';
import { View, FlatList, Alert, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Text, ActivityIndicator } from 'react-native-paper';

import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  patchNotificationReadInList,
} from '../../api/notifications';
import { WebSocketContext } from '../../context/WebSocketManager';
import ScreenBackground from '../ScreenBackground';
import AppNavigationBar from '../common/AppNavigationBar';
import { usePartnerDashboardBack } from '../../navigation/appNavBarBack';
import FloatingCard from '../ui/FloatingCard';
import EmptyStateCard from '../ui/EmptyStateCard';
import {
  PRIMARY,
  TEXT_DARK,
  TEXT_MUTED,
} from '../../constants/colors';
import {
  navigateShopNotification,
  notificationActionHint,
  shopNotificationCategory,
} from '../../utils/shopNotificationRouting';
import { normalizeNotification } from '../../utils/normalizeNotification';

const TABS = [
  { id: 'alerts', label: 'Alerts' },
  { id: 'repairs', label: 'Repairs' },
  { id: 'offers', label: 'Offers' },
  { id: 'bookings', label: 'Bookings' },
];

export default function NotificationsList() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [remoteNotifications, setRemoteNotifications] = useState([]);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [activeTab, setActiveTab] = useState('alerts');
  const [markingAll, setMarkingAll] = useState(false);
  const { notifications: liveNotifications = [], setNotifications } =
    useContext(WebSocketContext);
  const navigation = useNavigation();
  const handleBack = usePartnerDashboardBack(navigation);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const data = await getNotifications(token);
      const rows = Array.isArray(data) ? data : data?.results ?? [];
      setRemoteNotifications(rows.map(normalizeNotification));
    } catch (err) {
      console.error('Failed to load notifications', err);
      Alert.alert('Error', 'Could not load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [fetchNotifications])
  );

  const markReadLocally = useCallback(
    (id) => {
      setRemoteNotifications((prev) => patchNotificationReadInList(prev, id));
      if (typeof setNotifications === 'function') {
        setNotifications((prev) => patchNotificationReadInList(prev, id));
      }
    },
    [setNotifications]
  );

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      await markAllNotificationsRead(token);
      setRemoteNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      if (typeof setNotifications === 'function') {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      }
    } catch (err) {
      console.error('Failed to mark all read', err);
      Alert.alert('Error', 'Could not mark all as read');
    } finally {
      setMarkingAll(false);
    }
  };

  const handlePress = async (item) => {
    try {
      const token = await AsyncStorage.getItem('@access_token');

      if (!item.is_read) {
        await markNotificationRead(token, item.id);
        markReadLocally(item.id);
      }

      const opened = navigateShopNotification(navigation, item);
      if (!opened) {
        console.warn('Notification missing repairId', item);
        Alert.alert('Info', 'No linked detail for this notification.');
      }
    } catch (err) {
      console.error('Error marking as read or navigating', err);
      Alert.alert('Error', 'Failed to open notification.');
    }
  };

  const mergedNotifications = useMemo(() => {
    const mergedMap = new Map();
    [...(remoteNotifications || []), ...(liveNotifications || [])].forEach((n) => {
      if (n?.id == null) return;
      const normalized = normalizeNotification(n);
      const existing = mergedMap.get(n.id);
      mergedMap.set(
        n.id,
        existing ? normalizeNotification({ ...existing, ...normalized }) : normalized
      );
    });
    const rows = Array.from(mergedMap.values()).sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
    return unreadOnly ? rows.filter((n) => !n.is_read) : rows;
  }, [remoteNotifications, liveNotifications, unreadOnly]);

  const tabbedNotifications = useMemo(() => {
    if (activeTab === 'alerts') return mergedNotifications;
    return mergedNotifications.filter((n) => shopNotificationCategory(n) === activeTab);
  }, [mergedNotifications, activeTab]);

  const tabBadge = useCallback(
    (tabId) => {
      if (tabId === 'alerts') {
        return mergedNotifications.filter((n) => !n.is_read).length;
      }
      return mergedNotifications.filter(
        (n) => !n.is_read && shopNotificationCategory(n) === tabId
      ).length;
    },
    [mergedNotifications]
  );

  const unreadCount = useMemo(
    () =>
      [...(remoteNotifications || []), ...(liveNotifications || [])].filter((n) => !n?.is_read)
        .length,
    [remoteNotifications, liveNotifications]
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
      <ScreenBackground safeArea={false}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground safeArea={false}>
      <AppNavigationBar title="Notifications" backLabel="Dashboard" onBack={handleBack} />
      <View style={styles.container}>
        <View style={styles.toolbar}>
          <Pressable
            onPress={() => setUnreadOnly((v) => !v)}
            style={[styles.filterChip, unreadOnly && styles.filterChipActive]}
          >
            <Text style={[styles.filterChipText, unreadOnly && styles.filterChipTextActive]}>
              {unreadOnly ? 'Unread only' : 'All'}
            </Text>
          </Pressable>
          {unreadCount > 0 ? (
            <Pressable
              onPress={handleMarkAllRead}
              disabled={markingAll}
              style={styles.markAllBtn}
            >
              <Text style={styles.markAllText}>
                {markingAll ? 'Marking…' : 'Mark all read'}
              </Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.segmentTrack}>
          {TABS.map((tab) => {
            const badge = tabBadge(tab.id);
            const selected = activeTab === tab.id;
            return (
              <Pressable
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                style={[styles.segmentCell, selected && styles.segmentCellActive]}
              >
                <View style={styles.segmentLabelRow}>
                  <Text style={[styles.segmentLabel, selected && styles.segmentLabelActive]}>
                    {tab.label}
                  </Text>
                  {badge > 0 ? (
                    <View style={styles.tabBadge}>
                      <Text style={styles.tabBadgeText}>{String(badge)}</Text>
                    </View>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        {tabbedNotifications.length === 0 ? (
          <EmptyStateCard
            icon="bell-outline"
            title={
              unreadOnly
                ? 'No unread notifications'
                : `No ${TABS.find((t) => t.id === activeTab)?.label?.toLowerCase() || 'notifications'} yet`
            }
            subtitle={
              unreadOnly
                ? 'You are all caught up.'
                : "Offers, promotions, bookings, and reschedule updates appear here."
            }
          />
        ) : (
          <FlatList
            data={tabbedNotifications}
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
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  segmentTrack: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 14,
    padding: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.22)',
    marginBottom: 12,
  },
  segmentCell: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 2,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentCellActive: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
  },
  segmentLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.92)',
    textAlign: 'center',
  },
  segmentLabelActive: { color: '#0f172a' },
  tabBadge: {
    marginLeft: 3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  filterChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(15,23,42,0.55)',
  },
  filterChipActive: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderColor: 'rgba(255,255,255,0.92)',
  },
  filterChipText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#0f172a',
  },
  markAllBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  markAllText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    textDecorationLine: 'underline',
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
