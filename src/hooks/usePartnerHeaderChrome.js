/**
 * Shared partner header actions + badge counts (unread + unscheduled calendar).
 */

import { useCallback, useContext, useState } from 'react';
import { Platform } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getShopCalendar } from '../api/repairs';
import { WebSocketContext } from '../context/WebSocketManager';
import {
  navigateToPartnerCalendar,
  navigateToPartnerNotifications,
} from '../navigation/webNavigation';
import {
  cacheUnscheduledCount,
  readCachedUnscheduledCount,
  shouldRefreshUnscheduledCount,
} from '../utils/shopCalendarBadge';
import { useTranslation } from '../i18n';

export default function usePartnerHeaderChrome({
  loadCalendarBadge = true,
  refreshCalendarBadge = false,
} = {}) {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { unreadCount, refreshUnreadFromRest } = useContext(WebSocketContext);
  const [calendarBadgeCount, setCalendarBadgeCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      const load = async () => {
        if (loadCalendarBadge) {
          const cached = await readCachedUnscheduledCount();
          if (!cancelled) setCalendarBadgeCount(cached);
          const shouldRefresh =
            refreshCalendarBadge || (await shouldRefreshUnscheduledCount());
          if (shouldRefresh) {
            try {
              const token = await AsyncStorage.getItem('@access_token');
              const data = await getShopCalendar(token, { badge_only: true });
              const count = data?.unscheduled_count ?? 0;
              if (!cancelled) setCalendarBadgeCount(count);
              await cacheUnscheduledCount(count);
            } catch {
              /* keep cached */
            }
          }
        }
        if (typeof refreshUnreadFromRest === 'function') {
          refreshUnreadFromRest();
        }
      };

      load();
      return () => {
        cancelled = true;
      };
    }, [loadCalendarBadge, refreshCalendarBadge, refreshUnreadFromRest])
  );

  const openCalendar = useCallback(() => {
    if (Platform.OS === 'web') {
      navigateToPartnerCalendar(navigation);
      return;
    }
    navigation.navigate('ShopCalendar', {
      returnTo: 'ShopDashboard',
      backLabel: t('common.home'),
    });
  }, [navigation, t]);

  const openNotifications = useCallback(() => {
    if (Platform.OS === 'web') {
      navigateToPartnerNotifications(navigation);
      return;
    }
    navigation.navigate('NotificationsList');
  }, [navigation]);

  const openMenu = useCallback(() => {
    navigation.openDrawer?.();
  }, [navigation]);

  return {
    unreadCount: unreadCount || 0,
    calendarBadgeCount,
    openCalendar,
    openNotifications,
    openMenu,
  };
}
