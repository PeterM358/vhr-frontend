/**
 * Global non-blocking partner in-app banner host.
 * Shows CRITICAL/IMPORTANT notifications while app is focused.
 * Dismissal does NOT mark the inbox notification as read.
 */

import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { WebSocketContext } from '../../context/WebSocketManager';
import { COLORS } from '../../constants/colors';
import {
  hasBannerSeen,
  markBannerSeen,
  markNotificationSeen,
} from '../../notifications/notificationDedup';
import { getNotificationNavigationRef } from '../../notifications/notificationOpenRouting';
import { navigateShopNotification } from '../../utils/shopNotificationRouting';
import {
  notificationEventKey,
  shouldShowPartnerDeliveryBanner,
} from '../../utils/partnerNotificationDelivery';
import { parseStoredBoolean } from '../../utils/partnerSession';
import { STORAGE_KEYS } from '../../constants/storageKeys';

const DISPLAY_MS = 5000;

export default function PartnerInAppBannerHost() {
  const insets = useSafeAreaInsets();
  const { notifications } = useContext(WebSocketContext) || {};
  const [isPartner, setIsPartner] = useState(false);
  const [banner, setBanner] = useState(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef(null);
  const lastHandledKey = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEYS.IS_SHOP);
        if (!cancelled) setIsPartner(parseStoredBoolean(raw));
      } catch {
        if (!cancelled) setIsPartner(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [notifications?.length]);

  const dismiss = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
      setBanner(null);
    });
  }, [opacity]);

  const show = useCallback(
    (item) => {
      const key = notificationEventKey(item);
      if (!key || hasBannerSeen(key)) return;
      markBannerSeen(key);
      markNotificationSeen(item?.id, item?.event_key || item?.data?.event_key);
      setBanner({
        key,
        title: item.title || 'Notification',
        body: item.body || item.message || '',
        item,
      });
      opacity.setValue(0);
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(dismiss, DISPLAY_MS);
    },
    [dismiss, opacity]
  );

  useEffect(() => {
    if (!isPartner) return;
    const latest = Array.isArray(notifications) ? notifications[0] : null;
    if (!latest) return;
    const key = notificationEventKey(latest);
    if (!key || key === lastHandledKey.current) return;
    lastHandledKey.current = key;
    if (!shouldShowPartnerDeliveryBanner(latest)) return;
    if (latest.is_read) return;
    show(latest);
  }, [notifications, show, isPartner]);

  useEffect(
    () => () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    },
    []
  );

  const onPress = () => {
    const item = banner?.item;
    dismiss();
    if (!item) return;
    try {
      const nav = getNotificationNavigationRef()?.current;
      if (nav) navigateShopNotification(nav, item);
    } catch {
      /* routing best-effort */
    }
  };

  if (!banner) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.wrap, { top: Math.max(insets.top, 8) + 4, opacity }]}
    >
      <Pressable onPress={onPress} style={styles.card} accessibilityRole="button">
        <View style={styles.iconWrap}>
          <MaterialCommunityIcons name="bell-ring-outline" size={22} color={COLORS.PRIMARY} />
        </View>
        <View style={styles.textCol}>
          <Text style={styles.title} numberOfLines={1}>
            {banner.title}
          </Text>
          {banner.body ? (
            <Text style={styles.body} numberOfLines={2}>
              {banner.body}
            </Text>
          ) : null}
        </View>
        <Pressable onPress={dismiss} hitSlop={10} accessibilityLabel="Dismiss">
          <MaterialCommunityIcons name="close" size={20} color="#64748b" />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 9999,
    elevation: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(15,23,42,0.08)',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(37,99,235,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: { flex: 1, minWidth: 0 },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
  },
  body: {
    marginTop: 2,
    fontSize: 13,
    lineHeight: 18,
    color: '#475569',
  },
});
