/**
 * PATH: src/screens/ShopHomeScreen.js
 * Veversal partner platform dashboard — open work first, ERP modules as tiles.
 */

import React, { useContext, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Pressable,
  Platform,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Appbar, Badge, Button } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logout } from '../api/auth';
import { getRepairs, getShopCalendar } from '../api/repairs';
import { getMyOffers } from '../api/offers';
import {
  cacheUnscheduledCount,
  readCachedUnscheduledCount,
  shouldRefreshUnscheduledCount,
} from '../utils/shopCalendarBadge';
import {
  fetchShopProfileCompleteness,
  gateRepairNavigation,
} from '../utils/shopProfileGate';
import { setCachedShopRepairs } from '../utils/shopRepairsPrefetch';
import { navigateToPartnerProfile, navigateToPartnerPublicPreview } from '../navigation/webNavigation';
import ShopProfileSetupBanner from '../components/shop/ShopProfileSetupBanner';
import { getMyShopProfiles } from '../api/profiles';
import { formatShopDisplayName } from '../utils/shopDisplayName';
import { WebSocketContext } from '../context/WebSocketManager';
import { AuthContext } from '../context/AuthManager';
import ScreenBackground from '../components/ScreenBackground';
import FloatingCard from '../components/ui/FloatingCard';
import DashboardHero from '../components/dashboard/DashboardHero';
import DashboardSection from '../components/dashboard/DashboardSection';
import DashboardActionTile from '../components/dashboard/DashboardActionTile';
import DashboardComingSoonSection from '../components/dashboard/DashboardComingSoonSection';
import ReadyToDriveComingSoonCard from '../components/dashboard/ReadyToDriveComingSoonCard';
import PartnerActivationBanner from '../components/dashboard/PartnerActivationBanner';
import PartnerEmptyRequestsState from '../components/dashboard/PartnerEmptyRequestsState';
import { COLORS } from '../constants/colors';
import { todayCalendarRange, isScheduledToday } from '../utils/dashboardDate';
import {
  canSendPartnerOffers,
  isPartnerSubscriptionActive,
} from '../utils/partnerSubscription';
import { showMessage } from '../utils/crossPlatformAlert';
import { resetShopDrawerRepairs } from '../navigation/drawerNavigation';

const SHOP_TOP_BAR = 'rgba(11,18,32,0.92)';

function openPartnerProfile(navigation, params = {}) {
  if (Platform.OS === 'web') {
    navigateToPartnerProfile(navigation, params);
    return;
  }
  navigation.navigate('ShopProfile', params);
}

function openPartnerPublicPreview(navigation, params = {}) {
  if (Platform.OS === 'web') {
    navigateToPartnerPublicPreview(navigation, params);
    return;
  }
  navigation.navigate('ShopProfile', { expandSection: 'public_preview', ...params });
}

export default function ShopHomeScreen() {
  const navigation = useNavigation();
  const { setAuthToken, setIsAuthenticated, setUserEmailOrPhone } = useContext(AuthContext);
  const { notifications } = useContext(WebSocketContext);

  const [loading, setLoading] = useState(true);
  const [shopProfile, setShopProfile] = useState(null);
  const [shopDisplayName, setShopDisplayName] = useState('Service center');
  const [openRepairs, setOpenRepairs] = useState([]);
  const [ongoingRepairs, setOngoingRepairs] = useState([]);
  const [pendingOffers, setPendingOffers] = useState([]);
  const [todayBookings, setTodayBookings] = useState([]);
  const [repairsLoading, setRepairsLoading] = useState(true);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [unscheduledCount, setUnscheduledCount] = useState(0);
  const [profileComplete, setProfileComplete] = useState(true);
  const [missingProfileFields, setMissingProfileFields] = useState([]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const lastRepairNotifIdRef = React.useRef(null);

  const partnerActive = isPartnerSubscriptionActive(shopProfile);
  const canSendOffers = canSendPartnerOffers(shopProfile);

  const loadOpenRepairs = React.useCallback(async ({ background = false } = {}) => {
    if (!background) setRepairsLoading(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const data = await getRepairs(token, 'open');
      const rows = Array.isArray(data) ? data : [];
      setOpenRepairs(rows);
      setCachedShopRepairs('open', rows);
    } catch (err) {
      console.error('Failed to load open repairs', err);
      setOpenRepairs([]);
    } finally {
      if (!background) setRepairsLoading(false);
    }
  }, []);

  const loadDashboardMetrics = React.useCallback(async () => {
    setDashboardLoading(true);
    try {
      const token = await AsyncStorage.getItem('@access_token');
      const shopId = await AsyncStorage.getItem('@current_shop_id');
      const { from, to } = todayCalendarRange();

      const [ongoing, offers, calendar] = await Promise.all([
        getRepairs(token, 'ongoing').catch(() => []),
        getMyOffers(token).catch(() => []),
        getShopCalendar(token, { from, to, shopId }).catch(() => ({ scheduled: [] })),
      ]);

      setOngoingRepairs(Array.isArray(ongoing) ? ongoing : []);
      const offerRows = Array.isArray(offers) ? offers : [];
      setPendingOffers(offerRows.filter((o) => !o.is_booked));
      const scheduled = Array.isArray(calendar?.scheduled) ? calendar.scheduled : [];
      setTodayBookings(scheduled.filter(isScheduledToday));
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!notifications.length) return;
    const latest = notifications[0];
    if (!latest?.id || latest.id === lastRepairNotifIdRef.current) return;
    const eventType = String(
      latest.data?.event_type || latest.event_type || latest.notification_type || ''
    ).toLowerCase();
    if (!eventType.includes('repair_request')) return;
    lastRepairNotifIdRef.current = latest.id;
    loadOpenRepairs({ background: true });
  }, [notifications, loadOpenRepairs]);

  const refreshProfileGate = React.useCallback(async () => {
    try {
      const { isComplete, missingFields } = await fetchShopProfileCompleteness();
      setProfileComplete(isComplete);
      setMissingProfileFields(missingFields);
    } catch (err) {
      console.warn('Shop profile gate check failed', err);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      const loadShopUser = async () => {
        try {
          const profiles = await getMyShopProfiles();
          const profile = profiles?.[0] || null;
          setShopProfile(profile);
          const shopName = profile?.name?.trim();
          if (shopName) {
            setShopDisplayName(formatShopDisplayName(shopName));
          } else {
            const stored = await AsyncStorage.getItem('@user_email_or_phone');
            let display = 'Service center';
            if (stored?.trim()) {
              display = stored.includes('@') ? stored.split('@')[0] : stored;
            }
            setShopDisplayName(display);
          }
        } catch {
          setShopProfile(null);
          setShopDisplayName('Service center');
        } finally {
          setLoading(false);
        }
      };

      const loadUnscheduledBadge = async () => {
        const cached = await readCachedUnscheduledCount();
        setUnscheduledCount(cached);
        const stale = await shouldRefreshUnscheduledCount();
        if (!stale) return;
        try {
          const token = await AsyncStorage.getItem('@access_token');
          const data = await getShopCalendar(token, { badge_only: true });
          const count = data.unscheduled_count ?? 0;
          setUnscheduledCount(count);
          await cacheUnscheduledCount(count);
        } catch {
          /* keep cached */
        }
      };

      refreshProfileGate();
      loadShopUser();
      loadOpenRepairs();
      loadDashboardMetrics();
      loadUnscheduledBadge();
    }, [refreshProfileGate, loadOpenRepairs, loadDashboardMetrics])
  );

  const handleRepairPress = (repairId) => {
    if (
      !gateRepairNavigation(navigation, {
        isComplete: profileComplete,
        missingFields: missingProfileFields,
      })
    ) {
      return;
    }
    navigation.navigate('RepairDetail', { repairId });
  };

  const handleSendOffer = async (repairId) => {
    if (!canSendOffers) {
      showMessage(
        'Partner activation required',
        'Activate your Veversal partner account to send offers to customers.',
        { variant: 'info' }
      );
      openPartnerProfile(navigation, { requireSetup: true });
      return;
    }
    if (
      !gateRepairNavigation(navigation, {
        isComplete: profileComplete,
        missingFields: missingProfileFields,
      })
    ) {
      return;
    }
    const shopId = await AsyncStorage.getItem('@current_shop_id');
    navigation.navigate('CreateOrUpdateOffer', {
      repairId,
      shopId: shopId ? Number(shopId) : undefined,
      selectedOfferParts: [],
    });
  };

  const handleLogout = async () => {
    await logout(navigation, setAuthToken, setIsAuthenticated, setUserEmailOrPhone);
  };

  const operationsTiles = useMemo(
    () => [
      [
        {
          key: 'pending-offers',
          icon: 'file-send-outline',
          title: 'Pending Offers',
          subtitle: 'Sent, awaiting customer acceptance',
          count: pendingOffers.length,
          onPress: () => resetShopDrawerRepairs(navigation),
        },
        {
          key: 'active',
          icon: 'car-wrench',
          title: 'Active Repairs',
          subtitle: 'Jobs currently in progress',
          count: ongoingRepairs.length,
          onPress: () => resetShopDrawerRepairs(navigation),
        },
      ],
      [
        {
          key: 'bookings-calendar',
          icon: 'calendar-month-outline',
          title: 'Bookings / Calendar',
          subtitle: "Today's appointments, schedule and capacity",
          count:
            todayBookings.length > 0
              ? todayBookings.length
              : unscheduledCount > 0
                ? unscheduledCount
                : undefined,
          onPress: () =>
            navigation.navigate('ShopCalendar', {
              returnTo: 'ShopDashboard',
              backLabel: 'Home',
            }),
        },
        {
          key: 'profile',
          icon: 'store-cog-outline',
          title: 'Service Center Profile',
          subtitle: 'Name, location, services, hours and contact',
          onPress: () =>
            openPartnerProfile(navigation, {
              requireSetup: !profileComplete,
            }),
        },
      ],
      [
        {
          key: 'public-preview',
          icon: 'web',
          title: 'Public Page Preview',
          subtitle: 'How clients see your shop on the map and in search',
          onPress: () =>
            openPartnerPublicPreview(navigation, {
              requireSetup: !profileComplete,
            }),
        },
      ],
    ],
    [
      navigation,
      pendingOffers.length,
      todayBookings.length,
      ongoingRepairs.length,
      unscheduledCount,
      profileComplete,
    ]
  );

  const comingSoonItems = useMemo(
    () => [
      {
        key: 'documents',
        icon: 'file-document-outline',
        title: 'Documents',
        subtitle: 'Invoices, repair docs and warranty evidence in one place',
        onPress: () =>
          showMessage('Coming soon', 'Central document import is on the Veversal partner roadmap.', {
            variant: 'info',
          }),
      },
      {
        key: 'inventory',
        icon: 'warehouse',
        title: 'Inventory',
        subtitle: 'Parts, warehouse stock and receiving workflows',
        onPress: () =>
          showMessage('Coming soon', 'Inventory management is planned for a future release.', {
            variant: 'info',
          }),
      },
      {
        key: 'reports',
        icon: 'chart-line',
        title: 'Reports',
        subtitle: 'Revenue, throughput and customer growth snapshots',
        onPress: () =>
          showMessage(
            'Coming soon',
            `Reports are planned for a future release. Snapshot today: ${openRepairs.length} open · ${ongoingRepairs.length} active · ${pendingOffers.length} pending offers.`,
            { variant: 'info' }
          ),
      },
      {
        key: 'customers',
        icon: 'account-group-outline',
        title: 'Customers & Vehicles',
        subtitle: 'Authorized clients and fleet records',
        onPress: () =>
          showMessage(
            'Coming soon',
            'Customer and vehicle CRM tools are planned for a future partner release.',
            { variant: 'info' }
          ),
      },
      {
        key: 'market-intelligence',
        icon: 'chart-timeline-variant',
        title: 'Market Intelligence',
        subtitle:
          'Compare your prices with city averages and understand what services customers are requesting most.',
        onPress: () =>
          showMessage(
            'Market Intelligence',
            'Compare your prices with city averages and understand what services customers are requesting most.',
            { variant: 'info' }
          ),
      },
    ],
    [openRepairs.length, ongoingRepairs.length, pendingOffers.length]
  );

  const renderOpenRepair = (item) => {
    const plate = String(item.vehicle_license_plate || '').trim();
    const title = `${item.vehicle_make || ''} ${item.vehicle_model || ''}`.trim() || 'Vehicle';
    return (
      <FloatingCard key={String(item.id)} onPress={() => handleRepairPress(item.id)} accent>
        <Text style={styles.repairTitle} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.repairMeta}>
          {plate || 'Plate hidden until booking'}
        </Text>
        {item.description ? (
          <Text style={styles.repairDesc} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
        <View style={styles.repairActions}>
          <Button
            mode="contained"
            compact
            onPress={() => handleSendOffer(item.id)}
            style={styles.sendOfferBtn}
          >
            Send Offer
          </Button>
          <Button mode="text" compact onPress={() => handleRepairPress(item.id)} textColor={COLORS.PRIMARY}>
            Details
          </Button>
        </View>
      </FloatingCard>
    );
  };

  if (loading) {
    return (
      <ScreenBackground>
        <View style={styles.loaderCenter}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground safeArea={false}>
      <Appbar.Header style={{ backgroundColor: SHOP_TOP_BAR }}>
        <Appbar.Action icon="menu" onPress={() => navigation.openDrawer()} color="#fff" />
        <Pressable
          onPress={() => openPartnerProfile(navigation, { requireSetup: !profileComplete })}
          style={styles.titlePressable}
          accessibilityRole="button"
          accessibilityLabel="Open center details"
        >
          <Appbar.Content title={shopDisplayName} titleStyle={{ color: '#fff' }} />
        </Pressable>
        <View style={styles.iconWithBadge}>
          <Appbar.Action
            icon="calendar-month-outline"
            onPress={() =>
              navigation.navigate('ShopCalendar', {
                returnTo: 'ShopDashboard',
                backLabel: 'Home',
              })
            }
            color="#fff"
          />
          {unscheduledCount > 0 ? (
            <Badge style={styles.notificationBadge}>{unscheduledCount}</Badge>
          ) : null}
        </View>
        <View style={styles.iconWithBadge}>
          <Appbar.Action
            icon="bell-outline"
            onPress={() => navigation.navigate('ShopNotificationsScreen')}
            color="#fff"
          />
          {unreadCount > 0 ? <Badge style={styles.notificationBadge}>{unreadCount}</Badge> : null}
        </View>
        <Appbar.Action icon="logout" onPress={handleLogout} color="#fff" />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {!profileComplete ? (
          <ShopProfileSetupBanner
            missingFields={missingProfileFields}
            onCompletePress={() => openPartnerProfile(navigation, { requireSetup: true })}
          />
        ) : null}

        {!partnerActive ? (
          <PartnerActivationBanner
            openRequestCount={openRepairs.length}
            onActivatePress={() => openPartnerProfile(navigation, { requireSetup: true })}
          />
        ) : null}

        <DashboardHero
          compact
          title="Veversal Partner Platform"
          subtitle="Open repair requests, send offers, manage bookings, and keep your public service center page up to date."
        />

        <DashboardSection
          title="Open Repair Requests"
          subtitle="New customer repair requests are waiting for your offer."
          actionLabel="View Requests"
          onActionPress={() => resetShopDrawerRepairs(navigation)}
        >
          {repairsLoading ? (
            <ActivityIndicator color="#fff" style={{ marginVertical: 12 }} />
          ) : openRepairs.length === 0 ? (
            <PartnerEmptyRequestsState />
          ) : (
            openRepairs.slice(0, 5).map(renderOpenRepair)
          )}
        </DashboardSection>

        <DashboardSection
          title="Operations"
          subtitle="Daily partner workflows — requests, offers, schedule and your public presence."
        >
          {dashboardLoading ? (
            <ActivityIndicator color="#fff" style={{ marginVertical: 8 }} />
          ) : (
            operationsTiles.map((row, rowIndex) => (
              <View key={`row-${rowIndex}`} style={styles.tileRow}>
                {row.map((tile) => (
                  <DashboardActionTile key={tile.key} {...tile} />
                ))}
                {row.length === 1 ? <View style={styles.tileSpacer} /> : null}
              </View>
            ))
          )}
        </DashboardSection>

        <DashboardComingSoonSection
          featured={<ReadyToDriveComingSoonCard />}
          items={comingSoonItems}
        />
      </ScrollView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  titlePressable: {
    flex: 1,
    justifyContent: 'center',
  },
  iconWithBadge: {
    position: 'relative',
    marginRight: 8,
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'red',
    color: 'white',
  },
  scroll: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 28,
  },
  loaderCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tileRow: {
    flexDirection: 'row',
    gap: 10,
  },
  tileSpacer: {
    flex: 1,
  },
  repairTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.TEXT_DARK,
    marginBottom: 4,
  },
  repairDesc: {
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
    lineHeight: 18,
  },
  repairMeta: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
    marginTop: 2,
  },
  repairActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  sendOfferBtn: {
    borderRadius: 8,
  },
});
