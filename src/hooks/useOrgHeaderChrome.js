/**
 * Org workspace header actions: calendar, notifications, profile + unread badge.
 */

import { useCallback, useContext, useState } from 'react';
import { Platform } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { listOrgFleet } from '../api/fleet';
import { WebSocketContext } from '../context/WebSocketManager';
import { STORAGE_KEYS } from '../constants/storageKeys';
import {
  navigateToNotifications,
  navigateToOrgCalendar,
  navigateToProfile,
} from '../navigation/webNavigation';
import {
  organizationMembershipFor,
  readOrganizationMemberships,
  resolveActiveOrganizationId,
} from '../utils/orgWorkspace';
import { isDriverMembership } from '../utils/orgRoleHome';

function urgencyCount(fleetRows) {
  return (Array.isArray(fleetRows) ? fleetRows : []).filter((row) => {
    const status = row?.readiness?.status;
    return status === 'not_ready' || status === 'expiring_soon';
  }).length;
}

export default function useOrgHeaderChrome({ loadCalendarBadge = true } = {}) {
  const navigation = useNavigation();
  const { unreadCount, refreshUnreadFromRest } = useContext(WebSocketContext);
  const [calendarBadgeCount, setCalendarBadgeCount] = useState(0);
  const [isDriver, setIsDriver] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      const load = async () => {
        try {
          const rows = await readOrganizationMemberships();
          const orgId = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_ORGANIZATION_ID);
          const active = organizationMembershipFor(rows, orgId) || rows[0] || null;
          if (!cancelled) setIsDriver(isDriverMembership(active));

          if (loadCalendarBadge) {
            const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
            if (active?.id && token && !isDriverMembership(active)) {
              const resolved = await resolveActiveOrganizationId(active.id);
              const data = await listOrgFleet(token, resolved, {});
              const list = Array.isArray(data?.results)
                ? data.results
                : Array.isArray(data)
                  ? data
                  : [];
              if (!cancelled) setCalendarBadgeCount(urgencyCount(list));
            } else if (!cancelled) {
              setCalendarBadgeCount(0);
            }
          }
        } catch {
          /* keep prior badge */
        }
        if (typeof refreshUnreadFromRest === 'function') {
          refreshUnreadFromRest();
        }
      };

      load();
      return () => {
        cancelled = true;
      };
    }, [loadCalendarBadge, refreshUnreadFromRest]),
  );

  const openCalendar = useCallback(() => {
    navigateToOrgCalendar(navigation);
  }, [navigation]);

  const openNotifications = useCallback(() => {
    navigateToNotifications(navigation, {
      returnTo: 'OrgHome',
      backLabelKey: 'org.home.title',
    });
  }, [navigation]);

  const openProfile = useCallback(() => {
    if (Platform.OS === 'web') {
      navigateToProfile(navigation);
      return;
    }
    const root = navigation.getParent?.() || navigation;
    navigateToProfile(root);
  }, [navigation]);

  const openMenu = useCallback(() => {
    const drawer = navigation.getParent?.() || navigation;
    if (typeof drawer.openDrawer === 'function') {
      drawer.openDrawer();
      return;
    }
    navigation.openDrawer?.();
  }, [navigation]);

  const unread = unreadCount || 0;
  // In Working mode, surface personal unread on the hamburger so drivers open the drawer.
  const menuBadge = isDriver ? unread : 0;

  return {
    unreadCount: unread,
    menuBadge,
    calendarBadgeCount,
    openCalendar,
    openNotifications,
    openProfile,
    openMenu,
  };
}
