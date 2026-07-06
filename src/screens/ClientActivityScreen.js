/**
 * Unified client Activity hub — Inbox (all notifications) | Repairs | Promos.
 */

import React, { useContext, useEffect, useState } from 'react';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, Badge } from 'react-native-paper';
import ClientPromotions from '../components/client/ClientPromotions';
import ClientRepairOffers from '../components/client/ClientRepairOffers';
import NotificationCenterPlaceholder from '../components/client/NotificationCenterPlaceholder';
import { showMessage } from '../utils/crossPlatformAlert';
import ScreenBackground from '../components/ScreenBackground';
import BackHeaderButton from '../components/navigation/BackHeaderButton';
import { navigateToDashboard } from '../navigation/webNavigation';
import { WebSocketContext } from '../context/WebSocketManager';

const TABS = [
  { id: 'inbox', label: 'Alerts' },
  { id: 'repairs', label: 'Offers' },
  { id: 'promos', label: 'Promos' },
];

function resolveInitialTab(route) {
  const param = route.params?.initialTab;
  if (param && TABS.some((t) => t.id === param)) return param;
  if (route.name === 'ClientNotifications') return 'inbox';
  if (route.name === 'OffersScreen') return 'repairs';
  return 'inbox';
}

export default function ClientActivityScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const route = useRoute();
  const { notifications } = useContext(WebSocketContext);

  const returnTo = route.params?.returnTo || 'Home';
  const backLabel = route.params?.backLabel || 'Dashboard';

  const [activeTab, setActiveTab] = useState(() => resolveInitialTab(route));
  const [unseenPromoCount, setUnseenPromoCount] = useState(0);
  const [unseenOffersCount, setUnseenOffersCount] = useState(0);
  const [actionNeededCount, setActionNeededCount] = useState(0);

  const unreadInboxCount = notifications.filter((n) => !n.is_read).length;

  useEffect(() => {
    const next = route.params?.initialTab;
    if (next && TABS.some((t) => t.id === next)) {
      setActiveTab(next);
    }
  }, [route.params?.initialTab]);

  const handleBack = () => {
    if (returnTo === 'Home' || returnTo === 'HomeMain') {
      if (Platform.OS === 'web') {
        navigateToDashboard(navigation);
        return;
      }
    }
    navigation.navigate(returnTo);
  };

  const tabBadge = (tabId) => {
    if (tabId === 'inbox' && unreadInboxCount > 0) return unreadInboxCount;
    if (tabId === 'repairs' && (unseenOffersCount > 0 || actionNeededCount > 0)) {
      return unseenOffersCount + actionNeededCount;
    }
    if (tabId === 'promos' && unseenPromoCount > 0) return unseenPromoCount;
    return 0;
  };

  const topPad = Math.max(insets.top, 10);

  return (
    <ScreenBackground safeArea={false}>
      <View style={[styles.root, { paddingTop: topPad }]}>
        <View style={styles.headerRow}>
          <BackHeaderButton
            onPress={handleBack}
            label={backLabel}
            variant="glass"
            accessibilityLabel={`Back to ${backLabel}`}
          />
          <View pointerEvents="none" style={styles.titleAbsolute}>
            <Text style={styles.screenTitle}>Notifications</Text>
          </View>
          <View style={styles.headerSideSpacer} />
        </View>

        <View style={styles.segmentOuter}>
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
                      <Badge style={[styles.badge, styles.badgeMargin]}>{String(badge)}</Badge>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.content}>
          <View style={[styles.tabContent, activeTab === 'inbox' ? styles.active : styles.inactive]}>
            <NotificationCenterPlaceholder
              onPlaceholderAction={(item) =>
                showMessage(item.title, `${item.description}\n\nLive routing will be added with the notification backend.`, {
                  variant: 'info',
                })
              }
            />
          </View>
          <View style={[styles.tabContent, activeTab === 'repairs' ? styles.active : styles.inactive]}>
            <ClientRepairOffers
              navigation={navigation}
              activityReturnTo="ClientActivity"
              onUpdateUnseenOffersCount={setUnseenOffersCount}
              onUpdateActionNeededCount={setActionNeededCount}
            />
          </View>
          <View style={[styles.tabContent, activeTab === 'promos' ? styles.active : styles.inactive]}>
            <ClientPromotions
              navigation={navigation}
              onUpdateUnseenCount={setUnseenPromoCount}
            />
          </View>
        </View>
      </View>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 12,
    backgroundColor: 'transparent',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    minHeight: 44,
  },
  homeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.88)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
    zIndex: 2,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  homeLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 2,
  },
  pressed: { opacity: 0.88 },
  headerSideSpacer: { minWidth: 96, height: 48 },
  titleAbsolute: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  segmentOuter: { marginBottom: 14 },
  segmentTrack: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 14,
    padding: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  segmentCell: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 4,
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
  badgeMargin: { marginLeft: 4 },
  segmentLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.92)',
    textAlign: 'center',
  },
  segmentLabelActive: { color: '#0f172a' },
  badge: { backgroundColor: '#dc2626' },
  content: { flex: 1, backgroundColor: 'transparent' },
  tabContent: { flex: 1, backgroundColor: 'transparent' },
  active: { display: 'flex' },
  inactive: { display: 'none' },
});
