// PATH: src/components/client/NotificationsList.js

import React, { useState, useContext, useCallback, useMemo } from 'react';
import { View, FlatList, Alert, StyleSheet, Pressable } from 'react-native';
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
import FloatingCard from '../ui/FloatingCard';
import EmptyStateCard from '../ui/EmptyStateCard';
import {
  PRIMARY,
  TEXT_DARK,
  TEXT_MUTED,
} from '../../constants/colors';
import {
  navigateForClientNotification,
  notificationEventType,
} from '../../utils/clientNotificationRouting';
import {
  translateNotificationBody,
  translateNotificationHint,
  translateNotificationTitle,
} from '../../utils/translateClientNotification';
import { formatNotificationTimestamp } from '../../utils/formatNotificationTimestamp';
import { useTranslation } from '../../i18n';

function notificationUiStyle(item) {
  const explicit = String(
    item?.data?.ui_style || item?.ui_style || item?.data?.severity || '',
  ).toLowerCase();
  if (explicit === 'success' || explicit === 'danger' || explicit === 'warning') {
    return explicit;
  }
  const et = String(notificationEventType(item) || '').toLowerCase();
  if (et === 'work_order_started') return 'success';
  if (
    et === 'work_order_not_started_overdue' ||
    et === 'work_order_start_overdue' ||
    et === 'work_order_end_overdue'
  ) {
    return 'danger';
  }
  return null;
}

const UI_STYLE_BORDER = {
  success: '#16A34A',
  danger: '#DC2626',
  warning: '#D97706',
};

export default function NotificationsList({
  activityReturnTo = 'ClientActivity',
  embedded = false,
  ListFooterComponent = null,
}) {
  const [loading, setLoading] = useState(true);
  const [remoteNotifications, setRemoteNotifications] = useState([]);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const {
    notifications: liveNotifications = [],
    setNotifications,
    refreshUnreadFromRest,
  } = useContext(WebSocketContext);
  const navigation = useNavigation();
  const { t, locale } = useTranslation();

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const data = await getNotifications(token, { force: true });
      setRemoteNotifications(Array.isArray(data) ? data : data?.results ?? []);
      if (typeof refreshUnreadFromRest === 'function') {
        await refreshUnreadFromRest();
      }
    } catch (err) {
      console.error('Failed to load notifications', err);
      Alert.alert(t('common.error'), t('notifications.loadError'));
    } finally {
      setLoading(false);
    }
  }, [refreshUnreadFromRest, t]);

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
      return () => {
        if (typeof refreshUnreadFromRest === 'function') {
          refreshUnreadFromRest();
        }
      };
    }, [fetchNotifications, refreshUnreadFromRest])
  );

  const markReadLocally = async (id) => {
    setRemoteNotifications((prev) => patchNotificationReadInList(prev, id));
    if (typeof setNotifications === 'function') {
      setNotifications((prev) => patchNotificationReadInList(prev, id));
    }
    if (typeof refreshUnreadFromRest === 'function') {
      await refreshUnreadFromRest();
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      await markAllNotificationsRead(token);
      setRemoteNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      if (typeof setNotifications === 'function') {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      }
      if (typeof refreshUnreadFromRest === 'function') {
        await refreshUnreadFromRest();
      }
    } catch (err) {
      console.error('Failed to mark all read', err);
      Alert.alert(t('common.error'), t('notifications.markAllError'));
    } finally {
      setMarkingAll(false);
    }
  };

  const handlePress = async (item) => {
    try {
      const token = await AsyncStorage.getItem('@access_token');
      if (!item.is_read) {
        await markNotificationRead(token, item.id);
        await markReadLocally(item.id);
      }

      if (navigateForClientNotification(navigation, item, { returnTo: activityReturnTo })) {
        return;
      }
      Alert.alert(t('common.notice'), t('notifications.noLinkedDetail'));
    } catch (err) {
      console.error('Error handling notification press', err);
      Alert.alert(t('common.error'), t('notifications.openError'));
    }
  };

  const mergedNotifications = useMemo(() => {
    const mergedMap = new Map();
    [...(remoteNotifications || []), ...(liveNotifications || [])].forEach((n) => {
      if (n?.id != null && !mergedMap.has(n.id)) mergedMap.set(n.id, n);
    });
    const rows = Array.from(mergedMap.values()).sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
    return unreadOnly ? rows.filter((n) => !n.is_read) : rows;
  }, [remoteNotifications, liveNotifications, unreadOnly]);

  const unreadCount = useMemo(() => {
    const seen = new Set();
    let count = 0;
    for (const n of [...(remoteNotifications || []), ...(liveNotifications || [])]) {
      if (n?.id == null || seen.has(n.id)) continue;
      seen.add(n.id);
      if (!n.is_read) count += 1;
    }
    return count;
  }, [remoteNotifications, liveNotifications]);

  const renderItem = ({ item }) => {
    const unread = !item.is_read;
    const hint = translateNotificationHint(item, t);
    const title = translateNotificationTitle(item, t);
    const body = translateNotificationBody(item, t);
    const uiStyle = notificationUiStyle(item);
    const styleBorder = uiStyle
      ? { borderLeftWidth: 4, borderLeftColor: UI_STYLE_BORDER[uiStyle] }
      : null;
    return (
      <FloatingCard
        onPress={() => handlePress(item)}
        accent={unread && !uiStyle}
        style={[!unread && styles.readCard, styleBorder]}
      >
        <View style={styles.titleRow}>
          {unread && <View style={styles.unreadDot} />}
          <Text
            style={[styles.title, unread ? styles.titleUnread : styles.titleRead]}
            numberOfLines={2}
          >
            {title}
          </Text>
        </View>

        {!!body && (
          <Text style={styles.body} numberOfLines={3}>
            {body}
          </Text>
        )}

        {hint ? <Text style={styles.hint}>{hint}</Text> : null}

        <Text style={styles.timestamp}>
          {formatNotificationTimestamp(item.created_at, locale)}
        </Text>
      </FloatingCard>
    );
  };

  const toolbar = (
    <View style={styles.toolbar}>
      <Pressable
        onPress={() => setUnreadOnly((v) => !v)}
        style={[styles.filterChip, unreadOnly && styles.filterChipActive]}
      >
        <Text style={[styles.filterChipText, unreadOnly && styles.filterChipTextActive]}>
          {unreadOnly ? t('notifications.unreadOnly') : t('notifications.all')}
        </Text>
      </Pressable>
      {unreadCount > 0 ? (
        <Pressable
          onPress={handleMarkAllRead}
          disabled={markingAll}
          style={styles.markAllBtn}
        >
          <Text style={styles.markAllText}>
            {markingAll ? t('notifications.markingAll') : t('notifications.markAllRead')}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.center, embedded && styles.embeddedCenter]}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  if (embedded) {
    const rows = mergedNotifications.slice(0, 8);
    return (
      <View style={[styles.container, styles.embeddedContainer]}>
        {toolbar}
        {rows.length === 0 ? (
          <Text style={styles.embeddedEmpty}>
            {unreadOnly ? t('notifications.emptyUnreadTitle') : t('notifications.emptyEmbedded')}
          </Text>
        ) : (
          <View style={styles.embeddedList}>
            {rows.map((item) => (
              <View key={item.id?.toString()}>{renderItem({ item })}</View>
            ))}
          </View>
        )}
        {ListFooterComponent}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {toolbar}
      <FlatList
        data={mergedNotifications}
        keyExtractor={(item) => item.id?.toString() ?? Math.random().toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyStateCard
            icon="bell-outline"
            title={
              unreadOnly
                ? t('notifications.emptyUnreadTitle')
                : t('notifications.emptyTitle')
            }
            subtitle={
              unreadOnly
                ? t('notifications.emptyUnreadSubtitle')
                : t('notifications.emptySubtitle')
            }
          />
        }
        ListFooterComponent={ListFooterComponent}
      />
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
    paddingHorizontal: 0,
    paddingTop: 0,
    backgroundColor: 'transparent',
  },
  embeddedContainer: {
    flex: 0,
  },
  embeddedCenter: {
    minHeight: 80,
  },
  embeddedList: {
    paddingBottom: 8,
  },
  embeddedEmpty: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    paddingVertical: 12,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  filterChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  filterChipActive: {
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  filterChipText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#0f172a',
  },
  markAllBtn: {
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  markAllText: {
    color: '#93c5fd',
    fontSize: 13,
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 28,
    flexGrow: 1,
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
